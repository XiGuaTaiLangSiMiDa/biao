const fs = require('fs').promises;
const path = require('path');
const config = require('../config');
const KlineData = require('../models/KlineData');

class CacheService {
    constructor() {
        this.ensureCacheDir();
    }

    async ensureCacheDir() {
        try {
            await fs.mkdir(config.CACHE_DIR, { recursive: true });
        } catch (error) {
            console.error('Error creating cache directory:', error);
        }
    }

    async loadCache() {
        try {
            const cacheFile = path.join(config.CACHE_DIR, config.CACHE_FILE);
            const data = await fs.readFile(cacheFile, 'utf8');
            const parsedData = JSON.parse(data);
            
            // 转换回KlineData对象
            return Object.fromEntries(
                Object.entries(parsedData).map(([timestamp, data]) => [
                    timestamp,
                    new KlineData(
                        data.timestamp,
                        data.open,
                        data.high,
                        data.low,
                        data.close,
                        data.volume
                    )
                ])
            );
        } catch (error) {
            return {};
        }
    }

    async saveCache(data) {
        try {
            const cacheFile = path.join(config.CACHE_DIR, config.CACHE_FILE);
            await fs.writeFile(cacheFile, JSON.stringify(data, null, 2));
        } catch (error) {
            console.error('Error saving cache:', error);
        }
    }

    async cleanOldData(cachedData, beforeTimestamp) {
        const filteredData = Object.fromEntries(
            Object.entries(cachedData).filter(([timestamp]) => 
                Number(timestamp) >= beforeTimestamp
            )
        );
        await this.saveCache(filteredData);
        return filteredData;
    }

    getLastTimestamp(cachedData) {
        const timestamps = Object.keys(cachedData).map(Number);
        return timestamps.length > 0 ? Math.max(...timestamps) : 0;
    }
}

module.exports = new CacheService();
