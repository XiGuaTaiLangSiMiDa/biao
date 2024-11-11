const fs = require('fs').promises;
const path = require('path');
const config = require('../config');
const KlineData = require('../models/KlineData');

class KlineService {
    constructor() {
        this.symbol = config.SYMBOL;
        this.cacheDir = config.CACHE_DIR;
        this.cacheFile = config.CACHE_FILE;
        this.timeframes = {
            '15m': '15m',
            '1h': '1h',
            '4h': '4h',
            '1d': '1d'
        };
    }

    async initialize() {
        try {
            // 检查缓存目录是否存在
            try {
                await fs.access(this.cacheDir);
            } catch (error) {
                if (error.code === 'ENOENT') {
                    console.warn('缓存目录不存在，等待CCXTService创建');
                }
            }
        } catch (error) {
            console.error('初始化K线服务失败:', error);
            throw error;
        }
    }

    async getKlines(timeframe, startTime, endTime) {
        try {
            if (!this.timeframes[timeframe]) {
                throw new Error('无效的时间周期');
            }

            // 读取缓存文件
            const cacheFile = path.join(this.cacheDir, this.cacheFile);
            
            try {
                const data = await fs.readFile(cacheFile, 'utf8');
                let klines = JSON.parse(data);

                // 检查数据是否为数组
                if (!Array.isArray(klines)) {
                    throw new Error('缓存数据格式错误，请重新下载数据');
                }

                // 确保数据是KlineData对象数组
                klines = klines.map(k => {
                    if (k instanceof KlineData) {
                        return k;
                    }
                    return new KlineData(
                        k.timestamp,
                        k.open,
                        k.high,
                        k.low,
                        k.close,
                        k.volume
                    );
                });

                // 按时间过滤
                return klines.filter(k => 
                    k.timestamp >= startTime && k.timestamp <= endTime
                );
            } catch (error) {
                if (error.code === 'ENOENT') {
                    throw new Error('K线数据未下载，请先调用update-klines接口下载数据');
                }
                throw error;
            }
        } catch (error) {
            console.error('获取K线数据失败:', error);
            throw error;
        }
    }

    async close() {
        // 无需清理资源
    }
}

module.exports = new KlineService();
