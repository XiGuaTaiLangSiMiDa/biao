class API {
    constructor() {
        this.baseUrl = '/api';
    }

    // 获取K线数据
    async getKlineData(timeframe = '1h', start = null, end = null) {
        const params = new URLSearchParams();
        if (start) params.append('start', start);
        if (end) params.append('end', end);
        params.append('timeframe', timeframe);

        try {
            const response = await fetch(`${this.baseUrl}/klines?${params.toString()}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error('获取K线数据失败:', error);
            throw error;
        }
    }

    // 获取所有标记位置
    async getPositions() {
        try {
            const response = await fetch(`${this.baseUrl}/positions`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error('获取标记位置失败:', error);
            throw error;
        }
    }

    // 添加新的标记位置
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
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error('添加标记位置失败:', error);
            throw error;
        }
    }

    // 删除标记位置
    async deletePosition(id) {
        try {
            const response = await fetch(`${this.baseUrl}/positions/${id}`, {
                method: 'DELETE'
            });
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error('删除标记位置失败:', error);
            throw error;
        }
    }

    // 获取统计信息
    async getStats() {
        try {
            const response = await fetch(`${this.baseUrl}/stats`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error('获取统计信息失败:', error);
            throw error;
        }
    }

    // 更新K线数据
    async updateKlineData() {
        try {
            const response = await fetch(`${this.baseUrl}/klines/update`, {
                method: 'POST'
            });
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error('更新K线数据失败:', error);
            throw error;
        }
    }

    // 导出标记数据
    async exportPositions() {
        try {
            const response = await fetch(`${this.baseUrl}/positions/export`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.blob();
        } catch (error) {
            console.error('导出标记数据失败:', error);
            throw error;
        }
    }

    // 导入标记数据
    async importPositions(file) {
        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await fetch(`${this.baseUrl}/positions/import`, {
                method: 'POST',
                body: formData
            });
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error('导入标记数据失败:', error);
            throw error;
        }
    }
}

// 导出API实例
window.api = new API();
