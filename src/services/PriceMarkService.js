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
        // 检查上升趋势（用当前low比较后续high）
        const startLow = data[startIndex].low;
        let maxUpChange = 0;
        let lastUpChange = 0;

        for (let i = startIndex + 1; i < data.length; i++) {
            const currentHigh = data[i].high;
            const upChange = (currentHigh - startLow) / startLow;
            
            // 如果变动减小，停止检查
            if (upChange <= lastUpChange) {
                break;
            }

            // 更新最大上升变动
            if (upChange > maxUpChange) {
                maxUpChange = upChange;
                lastUpChange = upChange;
            }
        }

        // 检查下降趋势（用当前high比较后续low）
        const startHigh = data[startIndex].high;
        let maxDownChange = 0;
        let lastDownChange = 0;

        for (let i = startIndex + 1; i < data.length; i++) {
            const currentLow = data[i].low;
            const downChange = (currentLow - startHigh) / startHigh;
            
            // 如果变动增加，停止检查
            if (downChange >= lastDownChange) {
                break;
            }

            // 更新最大下降变动
            if (downChange < maxDownChange) {
                maxDownChange = downChange;
                lastDownChange = downChange;
            }
        }

        // 返回绝对值较大的变动
        if (Math.abs(maxUpChange) > Math.abs(maxDownChange)) {
            return { maxChange: maxUpChange };
        } else {
            return { maxChange: maxDownChange };
        }
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
                const { maxChange } = this.findMaxConsecutiveChange(sortedData, i);
                
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
