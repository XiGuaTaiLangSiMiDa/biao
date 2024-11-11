const fs = require('fs').promises;
const path = require('path');

class PositionsService {
    constructor() {
        this.dataPath = path.join(__dirname, '../../data/positions.json');
        this.positions = [];
        this.nextId = 1;
    }

    async initialize() {
        try {
            // 确保data目录存在
            await fs.mkdir(path.dirname(this.dataPath), { recursive: true });
            
            // 尝试读取现有数据
            try {
                const data = await fs.readFile(this.dataPath, 'utf8');
                this.positions = JSON.parse(data);
                // 找到最大ID
                if (this.positions.length > 0) {
                    this.nextId = Math.max(...this.positions.map(p => p.id)) + 1;
                }
            } catch (error) {
                if (error.code !== 'ENOENT') {
                    throw error;
                }
                // 如果文件不存在，使用空数组
                this.positions = [];
                await this.savePositions();
            }
        } catch (error) {
            console.error('初始化标记服务失败:', error);
            throw error;
        }
    }

    async savePositions() {
        try {
            await fs.writeFile(this.dataPath, JSON.stringify(this.positions, null, 2));
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
                id: this.nextId++,
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
            const index = this.positions.findIndex(p => p.id === parseInt(id));
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

    async updatePosition(id, updates) {
        try {
            const position = this.positions.find(p => p.id === parseInt(id));
            if (!position) {
                throw new Error('标记不存在');
            }
            Object.assign(position, updates);
            await this.savePositions();
            return position;
        } catch (error) {
            console.error('更新标记失败:', error);
            throw error;
        }
    }
}

module.exports = new PositionsService();
