const config = require('../config');
const CacheService = require('./CacheService');
const CCXTService = require('./CCXTService');

class DataManager {
    constructor() {
        this.cacheService = CacheService;
        this.exchangeService = CCXTService;
        this.initialized = false;
    }

    async initialize() {
        try {
            // 检查API连接
            const isConnected = await this.exchangeService.initialize();
            if (!isConnected) {
                console.warn('无法连接到交易所API，将使用缓存数据');
                // 尝试加载缓存数据
                const cachedData = await this.cacheService.loadCache();
                if (Object.keys(cachedData).length > 0) {
                    console.log('成功加载缓存数据');
                    this.initialized = true;
                    return true;
                }
                console.warn('没有可用的缓存数据');
                return false;
            }
            this.initialized = true;
            return true;
        } catch (error) {
            console.error('初始化数据管理器失败:', error);
            return false;
        }
    }

    async loadHistoricalData() {
        try {
            // 如果未初始化，尝试重新初始化
            if (!this.initialized) {
                await this.initialize();
            }

            console.log('开始加载历史数据...');
            const now = Date.now();
            const oneYearAgo = now - config.ONE_YEAR_MS;
            
            // 加载缓存数据
            let cachedData = await this.cacheService.loadCache();
            let lastTimestamp = this.cacheService.getLastTimestamp(cachedData);
            
            // 如果缓存为空或最后时间戳太旧，获取新数据
            if (Object.keys(cachedData).length === 0 || lastTimestamp < oneYearAgo) {
                console.log('缓存为空或过期，正在获取完整历史数据...');
                try {
                    // 分批获取数据，每次获取7天的数据
                    const batchSize = 7 * 24 * 60 * 60 * 1000; // 7天的毫秒数
                    let currentEnd = now;
                    let currentStart = Math.max(oneYearAgo, currentEnd - batchSize);
                    let allData = [];
                    let retryCount = 0;
                    const maxRetries = 3;

                    while (currentStart >= oneYearAgo && currentEnd > oneYearAgo) {
                        try {
                            console.log(`获取时间段: ${new Date(currentStart).toISOString()} -> ${new Date(currentEnd).toISOString()}`);
                            const batchData = await this.exchangeService.fetchKlineData(
                                Math.floor(currentStart / 1000),
                                Math.floor(currentEnd / 1000)
                            );
                            
                            if (batchData.length > 0) {
                                allData = [...allData, ...batchData];
                                // 更新时间范围
                                currentEnd = currentStart;
                                currentStart = Math.max(oneYearAgo, currentEnd - batchSize);
                                retryCount = 0; // 重置重试计数
                            } else {
                                retryCount++;
                                if (retryCount >= maxRetries) {
                                    console.log('连续多次获取空数据，跳过当前时间段');
                                    currentEnd = currentStart;
                                    currentStart = Math.max(oneYearAgo, currentEnd - batchSize);
                                    retryCount = 0;
                                }
                            }

                            // 等待一秒以避免触发速率限制
                            await new Promise(resolve => setTimeout(resolve, 1000));
                        } catch (error) {
                            console.error(`获取数据失败: ${error.message}`);
                            retryCount++;
                            if (retryCount >= maxRetries) {
                                console.log('达到最大重试次数，跳过当前时间段');
                                currentEnd = currentStart;
                                currentStart = Math.max(oneYearAgo, currentEnd - batchSize);
                                retryCount = 0;
                            }
                            await new Promise(resolve => setTimeout(resolve, 2000)); // 出错时等待更长时间
                        }
                    }

                    // 更新缓存
                    cachedData = {};
                    for (const kline of allData) {
                        cachedData[kline.timestamp] = kline;
                    }
                    
                    console.log(`成功获取 ${allData.length} 条历史数据`);
                    await this.cacheService.saveCache(cachedData);
                } catch (error) {
                    console.error('获取历史数据失败:', error);
                    // 如果获取新数据失败，但有缓存数据，则使用缓存数据
                    if (Object.keys(cachedData).length > 0) {
                        console.log('使用缓存数据作为备选');
                    } else {
                        throw error;
                    }
                }
            }
            
            return this.getFormattedData(cachedData);
        } catch (error) {
            console.error('加载历史数据失败:', error);
            return [];
        }
    }

    async updateData() {
        try {
            // 如果未初始化，尝试重新初始化
            if (!this.initialized) {
                await this.initialize();
            }

            console.log('开始更新数据...');
            const now = Date.now();
            let cachedData = await this.cacheService.loadCache();
            const lastTimestamp = this.cacheService.getLastTimestamp(cachedData);
            
            // 如果没有缓存数据，获取完整历史数据
            if (Object.keys(cachedData).length === 0) {
                return this.loadHistoricalData();
            }
            
            // 如果距离上次更新超过1小时，获取新数据
            if (now - lastTimestamp >= config.ONE_HOUR_MS) {
                console.log('正在获取增量数据...');
                try {
                    const newData = await this.exchangeService.fetchKlineData(
                        Math.floor(lastTimestamp / 1000),
                        Math.floor(now / 1000)
                    );
                    
                    // 更新缓存
                    for (const kline of newData) {
                        cachedData[kline.timestamp] = kline;
                    }
                    
                    if (newData.length > 0) {
                        console.log(`成功获取 ${newData.length} 条新数据`);
                    }
                    
                    // 清理旧数据并保存
                    const oneYearAgo = now - config.ONE_YEAR_MS;
                    cachedData = await this.cacheService.cleanOldData(cachedData, oneYearAgo);
                } catch (error) {
                    console.error('获取增量数据失败:', error);
                }
            }
            
            return this.getFormattedData(cachedData);
        } catch (error) {
            console.error('更新数据失败:', error);
            return [];
        }
    }

    getFormattedData(cachedData) {
        // 返回排序后的数据数组
        return Object.values(cachedData)
            .sort((a, b) => a.timestamp - b.timestamp);
    }

    // 获取用于训练的数据格式
    getTrainingData(data) {
        return data.map(kline => ({
            timestamp: kline.timestamp,
            features: [
                kline.open,
                kline.high,
                kline.low,
                kline.close,
                kline.volume
            ]
        }));
    }
}

module.exports = new DataManager();
