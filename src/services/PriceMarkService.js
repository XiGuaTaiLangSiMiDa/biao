const fs = require('fs').promises;
const path = require('path');
const config = require('../config');

class PriceMarkService {
    constructor() {
        this.cacheDir = config.CACHE_DIR;
        this.sourceFile = 'kline_data.json';
        this.markedFile = 'kline_data_marked.json';
    }

    getMarkForChange(change) {
        const absChange = Math.abs(change);
        if (absChange < 0.01) return 0;
        const mark = Math.ceil(absChange / 0.01);
        return change >= 0 ? mark : -mark;
    }

    async markPriceChanges() {
        try {
            // 读取原始数据
            const sourceData = await this.readSourceData();
            if (!sourceData) {
                throw new Error('无效的K线数据');
            }

            // 将对象格式转换为数组格式
            const dataArray = Object.entries(sourceData).map(([timestamp, data]) => ({
                timestamp: parseInt(timestamp),
                ...data
            }));

            // 按时间排序
            const sortedData = dataArray.sort((a, b) => a.timestamp - b.timestamp);

            // 初始化结果对象
            const results = {};

            // 初始化所有点的mark为0
            sortedData.forEach(item => {
                results[item.timestamp] = {
                    ...item,
                    mark: 0
                };
            });

            // 遍历每个点
            let startIndex = 0;
            let currentDirection = 0;

            for (let i = 1; i < sortedData.length; i++) {
                const startPrice = sortedData[startIndex].close;
                const currentPrice = sortedData[i].close;
                const priceChange = (currentPrice - startPrice) / startPrice;
                const direction = priceChange > 0 ? 1 : priceChange < 0 ? -1 : 0;

                // 如果方向改变或者没有变动
                if (direction === 0 || (currentDirection !== 0 && direction !== currentDirection)) {
                    startIndex = i;
                    currentDirection = 0;
                    continue;
                }

                // 更新当前方向
                if (currentDirection === 0) {
                    currentDirection = direction;
                }

                // 标记当前点
                const mark = this.getMarkForChange(priceChange);
                if (mark !== 0) {
                    results[sortedData[i].timestamp].mark = mark;
                    startIndex = i;
                    currentDirection = 0;
                }
            }

            // 保存标记结果
            await this.saveMarkedData(results);

            return Object.values(results);
        } catch (error) {
            console.error('标记价格变动失败:', error);
            throw error;
        }
    }

    async readSourceData() {
        try {
            const filePath = path.join(this.cacheDir, this.sourceFile);
            const data = await fs.readFile(filePath, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            console.error('读取K线数据失败:', error);
            throw error;
        }
    }

    async saveMarkedData(data) {
        try {
            const filePath = path.join(this.cacheDir, this.markedFile);
            await fs.writeFile(filePath, JSON.stringify(data, null, 2));
            console.log(`标记数据已保存到: ${filePath}`);
        } catch (error) {
            console.error('保存标记数据失败:', error);
            throw error;
        }
    }
}

module.exports = new PriceMarkService();
