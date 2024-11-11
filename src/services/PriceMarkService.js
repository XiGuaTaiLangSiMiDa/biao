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
        const mark = Math.round(absChange * 100);  // 直接转换为百分比
        return change >= 0 ? mark : -mark;
    }

    findMaxConsecutiveChange(data, startIndex) {
        const startPrice = data[startIndex].close;
        let maxChange = 0;
        let lastChange = 0;
        let direction = null;

        for (let i = startIndex + 1; i < data.length; i++) {
            const currentPrice = data[i].close;
            const priceChange = (currentPrice - startPrice) / startPrice;
            
            // 确定初始方向
            if (direction === null) {
                if (priceChange > 0) direction = 1;
                else if (priceChange < 0) direction = -1;
                else continue;
            }

            // 如果方向改变或变动减小，停止检查
            if ((direction === 1 && priceChange <= lastChange) ||
                (direction === -1 && priceChange >= lastChange)) {
                break;
            }

            // 更新最大变动
            if (Math.abs(priceChange) > Math.abs(maxChange)) {
                maxChange = priceChange;
                lastChange = priceChange;
            }
        }

        return maxChange;
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
            for (let i = 0; i < sortedData.length; i++) {
                // 找出从当前点开始的最大连续变动
                const maxChange = this.findMaxConsecutiveChange(sortedData, i);
                
                // 如果变动超过阈值，标记当前点
                if (Math.abs(maxChange) >= 0.01) {
                    const mark = this.getMarkForChange(maxChange);
                    results[sortedData[i].timestamp].mark = mark;
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
