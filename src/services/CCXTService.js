const ccxt = require('ccxt');
const fs = require('fs').promises;
const path = require('path');
const config = require('../config');
const KlineData = require('../models/KlineData');

class CCXTService {
    constructor() {
        this.exchange = new ccxt.okx({
            apiKey: config.API_KEY,
            secret: config.SECRET_KEY,
            password: config.PASSPHRASE,
            enableRateLimit: true,
            timeout: 30000,
            options: {
                defaultType: 'swap',
                adjustForTimeDifference: true,
                recvWindow: 60000,
            },
            urls: {
                api: {
                    rest: 'https://www.okx.com'
                }
            }
        });

        this.exchange.rateLimit = 250;
        this.exchange.options['warnOnFetchOHLCVLimitArgument'] = false;
    }

    async initialize() {
        try {
            for (let i = 0; i < 3; i++) {
                try {
                    await this.exchange.loadMarkets();
                    console.log('CCXT初始化成功');
                    return true;
                } catch (error) {
                    console.error(`CCXT初始化尝试 ${i + 1}/3 失败:`, error.message);
                    if (i < 2) {
                        console.log('等待5秒后重试...');
                        await new Promise(resolve => setTimeout(resolve, 5000));
                    }
                }
            }
            throw new Error('CCXT初始化失败，已达到最大重试次数');
        } catch (error) {
            console.error('CCXT初始化失败:', error.message);
            return false;
        }
    }

    async loadHistoricalData() {
        try {
            // 确保缓存目录存在
            const cacheDir = path.join(process.cwd(), config.CACHE_DIR);
            await fs.mkdir(cacheDir, { recursive: true });

            // 获取一年的数据
            const now = Math.floor(Date.now() / 1000);
            const oneYearAgo = now - config.ONE_YEAR_MS / 1000;

            console.log('开始获取历史数据...');
            const data = await this.fetchKlineData(oneYearAgo, now);

            // 保存到缓存文件
            const cacheFile = path.join(cacheDir, config.CACHE_FILE);
            await fs.writeFile(cacheFile, JSON.stringify(data, null, 2));
            console.log(`历史数据已保存到: ${cacheFile}`);

            return data;
        } catch (error) {
            console.error('加载历史数据失败:', error);
            throw error;
        }
    }

    async fetchKlineData(start, end) {
        try {
            // 确保时间戳是整数并转换为毫秒
            start = Math.floor(start) * 1000;
            end = Math.floor(end) * 1000;

            console.log(`获取K线数据: ${config.SYMBOL}`);
            console.log(`开始时间: ${new Date(start).toISOString()}`);
            console.log(`结束时间: ${new Date(end).toISOString()}`);

            // 计算时间范围
            const timeRange = end - start;
            const maxDataPoints = 100; // OKX API限制
            const timeframeMs = this.parseTimeframe(config.INTERVAL);
            const batchSize = Math.min(maxDataPoints * timeframeMs, timeRange);

            let allData = [];
            let currentStart = start;
            let retryCount = 0;
            const maxRetries = 3;

            while (currentStart < end) {
                try {
                    const batchEnd = Math.min(currentStart + batchSize, end);
                    
                    const ohlcv = await this.exchange.fetchOHLCV(
                        config.SYMBOL,
                        config.INTERVAL,
                        currentStart,
                        maxDataPoints,
                        {
                            endTime: batchEnd
                        }
                    );

                    if (ohlcv && ohlcv.length > 0) {
                        const klineData = ohlcv.map(data => KlineData.fromOKXResponse(data));
                        allData = [...allData, ...klineData];
                        currentStart = batchEnd;
                        retryCount = 0;

                        await new Promise(resolve => setTimeout(resolve, this.exchange.rateLimit));
                    } else {
                        retryCount++;
                        if (retryCount >= maxRetries) {
                            console.log('连续获取空数据，跳过当前时间段');
                            currentStart = batchEnd;
                            retryCount = 0;
                        } else {
                            console.log(`获取空数据，等待后重试 (${retryCount}/${maxRetries})`);
                            await new Promise(resolve => setTimeout(resolve, 2000));
                        }
                    }
                } catch (error) {
                    console.error(`批次数据获取失败: ${error.message}`);
                    retryCount++;
                    if (retryCount >= maxRetries) {
                        console.log('达到最大重试次数，跳过当前时间段');
                        currentStart += batchSize;
                        retryCount = 0;
                    } else {
                        console.log(`等待后重试 (${retryCount}/${maxRetries})`);
                        await new Promise(resolve => setTimeout(resolve, 5000));
                    }
                }
            }

            console.log(`成功获取 ${allData.length} 条K线数据`);
            
            // 按时间戳排序并去重
            return Array.from(new Map(
                allData.map(item => [item.timestamp, item])
            ).values()).sort((a, b) => a.timestamp - b.timestamp);

        } catch (error) {
            console.error('获取K线数据失败:', error.message);
            throw error;
        }
    }

    parseTimeframe(timeframe) {
        const unit = timeframe.slice(-1);
        const value = parseInt(timeframe.slice(0, -1));
        
        switch (unit) {
            case 'm': return value * 60 * 1000;
            case 'h': return value * 60 * 60 * 1000;
            case 'd': return value * 24 * 60 * 60 * 1000;
            default: throw new Error(`Unsupported timeframe unit: ${unit}`);
        }
    }

    async getLatestKline() {
        try {
            const now = Date.now();
            const oneHourAgo = now - 3600000;
            
            const data = await this.fetchKlineData(
                Math.floor(oneHourAgo / 1000),
                Math.floor(now / 1000)
            );
            return data.length > 0 ? data[0] : null;
        } catch (error) {
            console.error('获取最新K线数据失败:', error.message);
            throw error;
        }
    }

    async checkConnection() {
        try {
            console.log('检查API连接...');
            await this.exchange.fetchTime();
            console.log('API连接正常');
            return true;
        } catch (error) {
            console.error('API连接检查失败:', error.message);
            return false;
        }
    }

    async getAccountBalance() {
        try {
            const balance = await this.exchange.fetchBalance();
            return balance;
        } catch (error) {
            console.error('获取账户余额失败:', error.message);
            throw error;
        }
    }

    async getMarketInfo() {
        try {
            const market = await this.exchange.market(config.SYMBOL);
            return market;
        } catch (error) {
            console.error('获取市场信息失败:', error.message);
            throw error;
        }
    }
}

module.exports = new CCXTService();
