const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');

class PositionsService {
    constructor() {
        this.dataDir = path.join(process.cwd(), 'data');
        this.positionsFile = path.join(this.dataDir, 'positions.json');
        this.positions = [];
    }

    async initialize() {
        try {
            // 确保数据目录存在
            await fs.mkdir(this.dataDir, { recursive: true });

            // 加载现有数据
            try {
                const data = await fs.readFile(this.positionsFile, 'utf8');
                this.positions = JSON.parse(data);
            } catch (error) {
                if (error.code === 'ENOENT') {
                    // 文件不存在，创建空数组
                    this.positions = [];
                    await this.savePositions();
                } else {
                    throw error;
                }
            }
        } catch (error) {
            console.error('初始化标记服务失败:', error);
            throw error;
        }
    }

    async savePositions() {
        try {
            await fs.writeFile(
                this.positionsFile,
                JSON.stringify(this.positions, null, 2),
                'utf8'
            );
        } catch (error) {
            console.error('保存标记数据失败:', error);
            throw error;
        }
    }

    async getPositions() {
        return this.positions;
    }

    async addPosition(position) {
        try {
            const newPosition = {
                id: uuidv4(),
                ...position,
                createdAt: new Date().toISOString()
            };

            this.positions.push(newPosition);
            await this.savePositions();
            return newPosition;
        } catch (error) {
            console.error('添加标记失败:', error);
            throw error;
        }
    }

    async deletePosition(id) {
        try {
            const index = this.positions.findIndex(p => p.id === id);
            if (index === -1) {
                throw new Error('标记不存在');
            }

            const deletedPosition = this.positions.splice(index, 1)[0];
            await this.savePositions();
            return deletedPosition;
        } catch (error) {
            console.error('删除标记失败:', error);
            throw error;
        }
    }

    async getStats() {
        const stats = {
            total: this.positions.length,
            byAction: {
                long: this.positions.filter(p => p.action === 'long').length,
                short: this.positions.filter(p => p.action === 'short').length,
                wait: this.positions.filter(p => p.action === 'wait').length
            },
            byTimeframe: {}
        };

        // 按时间段统计
        const timeframes = {
            '1h': 60 * 60 * 1000,
            '4h': 4 * 60 * 60 * 1000,
            '1d': 24 * 60 * 60 * 1000
        };

        for (const [timeframe, ms] of Object.entries(timeframes)) {
            const now = Date.now();
            stats.byTimeframe[timeframe] = this.positions.filter(p => 
                now - new Date(p.timestamp).getTime() <= ms
            ).length;
        }

        return stats;
    }

    async exportPositions() {
        return this.positions;
    }

    async importPositions(positions) {
        try {
            // 验证数据格式
            if (!Array.isArray(positions)) {
                throw new Error('无效的数据格式');
            }

            // 验证每个标记的必要字段
            positions.forEach(position => {
                if (!position.timestamp || !position.price || !position.action) {
                    throw new Error('标记数据缺少必要字段');
                }
            });

            // 为导入的数据添加新的ID和时间戳
            this.positions = positions.map(position => ({
                id: uuidv4(),
                ...position,
                createdAt: position.createdAt || new Date().toISOString()
            }));

            await this.savePositions();
            return this.positions;
        } catch (error) {
            console.error('导入标记数据失败:', error);
            throw error;
        }
    }

    // 获取训练数据
    async getTrainingData() {
        // 按时间戳排序
        const sortedPositions = [...this.positions].sort((a, b) => 
            new Date(a.timestamp) - new Date(b.timestamp)
        );

        // 转换为训练数据格式
        return sortedPositions.map(position => ({
            timestamp: position.timestamp,
            price: position.price,
            action: position.action,
            features: [] // 这里可以添加其他特征
        }));
    }

    // 验证标记数据
    validatePosition(position) {
        const requiredFields = ['timestamp', 'price', 'action'];
        const validActions = ['long', 'short', 'wait'];

        // 检查必要字段
        for (const field of requiredFields) {
            if (!(field in position)) {
                throw new Error(`缺少必要字段: ${field}`);
            }
        }

        // 验证时间戳
        if (isNaN(new Date(position.timestamp).getTime())) {
            throw new Error('无效的时间戳');
        }

        // 验证价格
        if (typeof position.price !== 'number' || position.price <= 0) {
            throw new Error('无效的价格');
        }

        // 验证操作类型
        if (!validActions.includes(position.action)) {
            throw new Error('无效的操作类型');
        }

        return true;
    }
}

module.exports = new PositionsService();
