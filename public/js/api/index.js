class ApiService {
    constructor() {
        this.baseUrl = 'http://localhost:3001';
        this.maxRetries = 3;
        this.retryDelay = 1000;
    }

    async getKlineData(timeframe, startTime, endTime) {
        let retries = 0;
        while (retries < this.maxRetries) {
            try {
                const response = await fetch(
                    `${this.baseUrl}/klines?timeframe=${timeframe}&start=${startTime}&end=${endTime}`
                );
                
                if (!response.ok) {
                    const error = await response.json();
                    if (error.details && error.details.includes('K线数据未下载')) {
                        // 如果数据未下载，先尝试下载
                        await this.updateKlineData();
                        // 重新请求数据
                        continue;
                    }
                    throw new Error(error.details || '获取K线数据失败');
                }

                return await response.json();
            } catch (error) {
                retries++;
                if (retries === this.maxRetries) {
                    throw error;
                }
                console.log(`获取K线数据失败，${this.maxRetries - retries}次重试机会`, error);
                await new Promise(resolve => setTimeout(resolve, this.retryDelay));
            }
        }
    }

    async updateKlineData() {
        try {
            const response = await fetch(`${this.baseUrl}/update-klines`, {
                method: 'POST'
            });
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.details || '更新K线数据失败');
            }
            return await response.json();
        } catch (error) {
            console.error('更新K线数据失败:', error);
            throw error;
        }
    }

    async getPositions() {
        try {
            const response = await fetch(`${this.baseUrl}/positions`);
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.details || '获取标记位置失败');
            }
            return await response.json();
        } catch (error) {
            console.error('获取标记位置失败:', error);
            throw error;
        }
    }

    async addPosition(position) {
        try {
            const response = await fetch(`${this.baseUrl}/positions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(position)
            });
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.details || '添加标记位置失败');
            }
            return await response.json();
        } catch (error) {
            console.error('添加标记位置失败:', error);
            throw error;
        }
    }

    async deletePosition(id) {
        try {
            const response = await fetch(`${this.baseUrl}/positions/${id}`, {
                method: 'DELETE'
            });
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.details || '删除标记位置失败');
            }
            return await response.json();
        } catch (error) {
            console.error('删除标记位置失败:', error);
            throw error;
        }
    }
}

// 创建全局实例
window.api = new ApiService();

export default ApiService;
