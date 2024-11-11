const axios = require('axios');
const crypto = require('crypto');
const config = require('../config');
const KlineData = require('../models/KlineData');

class OKXService {
    constructor() {
        const axiosConfig = {
            baseURL: config.API_URL,
            timeout: config.REQUEST_TIMEOUT,
            headers: {
                'Content-Type': 'application/json',
                'OK-ACCESS-KEY': config.API_KEY,
                'OK-ACCESS-PASSPHRASE': config.PASSPHRASE,
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
            },
            validateStatus: function (status) {
                return status >= 200 && status < 300;
            }
        };

        this.client = axios.create(axiosConfig);

        // 添加请求拦截器
        this.client.interceptors.request.use(
            config => {
                console.log(`发送请求: ${config.method.toUpperCase()} ${config.url}`);
                return config;
            },
            error => {
                console.error('请求错误:', error.message);
                return Promise.reject(error);
            }
        );

        // 添加响应拦截器
        this.client.interceptors.response.use(
            response => {
                console.log('API响应:', JSON.stringify(response.data, null, 2));
                if (response.data && response.data.code === '0') {
                    return response;
                }
                throw new Error(`API错误: ${response.data.msg || '未知错误'}`);
            },
            error => {
                if (error.response) {
                    console.error('API响应错误:', {
                        status: error.response.status,
                        data: error.response.data
                    });
                } else if (error.request) {
                    console.error('未收到响应:', error.message);
                } else {
                    console.error('请求配置错误:', error.message);
                }
                return Promise.reject(error);
            }
        );
    }

    // 生成签名
    generateSignature(timestamp, method, requestPath, body = '') {
        const message = timestamp + method + requestPath + body;
        return crypto
            .createHmac('sha256', config.SECRET_KEY)
            .update(message)
            .digest('base64');
    }

    // 添加认证头
    getAuthHeaders(method, requestPath, body = '') {
        const timestamp = new Date().toISOString();
        const signature = this.generateSignature(timestamp, method, requestPath, body);

        return {
            'OK-ACCESS-SIGN': signature,
            'OK-ACCESS-TIMESTAMP': timestamp
        };
    }

    // 带重试的请求方法
    async requestWithRetry(method, path, options = {}) {
        let lastError;
        for (let i = 0; i < config.MAX_RETRIES; i++) {
            try {
                const response = await this.client.request({
                    method,
                    url: path,
                    ...options
                });

                return response.data;
            } catch (error) {
                lastError = error;
                console.error(`请求失败 (尝试 ${i + 1}/${config.MAX_RETRIES}):`, error.message);
                
                if (i < config.MAX_RETRIES - 1) {
                    console.log(`等待 ${config.RETRY_DELAY}ms 后重试...`);
                    await new Promise(resolve => setTimeout(resolve, config.RETRY_DELAY));
                }
            }
        }
        throw lastError;
    }

    async fetchKlineData(start, end) {
        try {
            // 确保时间戳是整数并转换为秒
            start = Math.floor(start);
            end = Math.floor(end);

            console.log(`获取K线数据: ${config.SYMBOL}`);
            console.log(`开始时间: ${new Date(start * 1000).toISOString()}`);
            console.log(`结束时间: ${new Date(end * 1000).toISOString()}`);
            
            // OKX API要求after参数是较大的时间戳（更近的时间）
            const params = {
                instId: config.SYMBOL,
                bar: config.INTERVAL,
                limit: '100'             // OKX API的限制
            };

            // 根据OKX文档，after和before参数是可选的
            if (start) {
                params.start = start.toString();
            }
            if (end) {
                params.end = end.toString();
            }

            const queryString = Object.entries(params)
                .map(([key, value]) => `${key}=${value}`)
                .join('&');
            
            const requestPath = `${config.KLINE_ENDPOINT}?${queryString}`;
            const headers = this.getAuthHeaders('GET', requestPath);

            const response = await this.requestWithRetry('GET', requestPath, { headers });

            if (!response.data || !Array.isArray(response.data)) {
                console.error('无效的K线数据响应:', response);
                return [];
            }

            // 转换为KlineData对象数组
            const klineData = response.data.map(candle => {
                const [timestamp, open, high, low, close, vol] = candle;
                return new KlineData(
                    parseInt(timestamp) * 1000,  // 转换为毫秒
                    parseFloat(open),
                    parseFloat(high),
                    parseFloat(low),
                    parseFloat(close),
                    parseFloat(vol)
                );
            });

            console.log(`成功获取 ${klineData.length} 条K线数据`);
            
            // 按时间戳排序
            return klineData.sort((a, b) => a.timestamp - b.timestamp);

        } catch (error) {
            console.error('获取K线数据失败:', error.message);
            throw error;
        }
    }

    // 获取最新的K线数据
    async getLatestKline() {
        try {
            const now = Math.floor(Date.now() / 1000);
            const oneHourAgo = now - 3600; // 1小时前
            
            const data = await this.fetchKlineData(oneHourAgo, now);
            return data.length > 0 ? data[0] : null;
        } catch (error) {
            console.error('获取最新K线数据失败:', error.message);
            throw error;
        }
    }

    // 检查API连接状态
    async checkConnection() {
        try {
            console.log('检查API连接...');
            const response = await this.requestWithRetry('GET', '/api/v5/public/time');
            console.log('API连接正常');
            return true;
        } catch (error) {
            console.error('API连接检查失败:', error.message);
            return false;
        }
    }

    // 获取账户余额信息
    async getAccountBalance() {
        try {
            const requestPath = '/api/v5/account/balance';
            const headers = this.getAuthHeaders('GET', requestPath);
            
            const response = await this.requestWithRetry('GET', requestPath, { headers });
            return response.data[0];
        } catch (error) {
            console.error('获取账户余额失败:', error.message);
            throw error;
        }
    }

    // 获取交易对信息
    async getInstrumentInfo() {
        try {
            const requestPath = `/api/v5/public/instruments?instType=SWAP&instId=${config.SYMBOL}`;
            const headers = this.getAuthHeaders('GET', requestPath);
            
            const response = await this.requestWithRetry('GET', requestPath, { headers });
            return response.data[0];
        } catch (error) {
            console.error('获取交易对信息失败:', error.message);
            throw error;
        }
    }
}

module.exports = new OKXService();
