class PositionsManager {
    constructor() {
        this.positions = [];
        this.onPositionAdded = null;
        this.onPositionRemoved = null;
        this.listElement = document.getElementById('positionsList');
    }

    // 初始化
    async initialize() {
        try {
            // 加载已有的标记位置
            const positions = await window.api.getPositions();
            this.positions = positions;
            this.updatePositionsList();
            this.updateStats();

            // 为每个标记添加到图表
            positions.forEach(position => {
                window.chartManager.addMarker(
                    position.timestamp,
                    position.price,
                    position.action
                );
            });
        } catch (error) {
            console.error('初始化标记位置失败:', error);
        }
    }

    // 添加新的标记位置
    async addPosition(timestamp, price, action) {
        try {
            const position = {
                timestamp,
                price,
                action,
                createdAt: new Date().toISOString()
            };

            // 保存到服务器
            const savedPosition = await window.api.addPosition(position);
            
            // 更新本地数据
            this.positions.push(savedPosition);
            this.updatePositionsList();
            this.updateStats();

            // 添加到图表
            window.chartManager.addMarker(timestamp, price, action);

            // 触发回调
            if (this.onPositionAdded) {
                this.onPositionAdded(savedPosition);
            }

            return savedPosition;
        } catch (error) {
            console.error('添加标记位置失败:', error);
            throw error;
        }
    }

    // 删除标记位置
    async removePosition(id) {
        try {
            // 从服务器删除
            await window.api.deletePosition(id);
            
            // 更新本地数据
            const index = this.positions.findIndex(p => p.id === id);
            if (index !== -1) {
                this.positions.splice(index, 1);
                this.updatePositionsList();
                this.updateStats();

                // 重新绘制所有标记
                window.chartManager.clearMarkers();
                this.positions.forEach(position => {
                    window.chartManager.addMarker(
                        position.timestamp,
                        position.price,
                        position.action
                    );
                });

                // 触发回调
                if (this.onPositionRemoved) {
                    this.onPositionRemoved(id);
                }
            }
        } catch (error) {
            console.error('删除标记位置失败:', error);
            throw error;
        }
    }

    // 更新标记列表显示
    updatePositionsList() {
        if (!this.listElement) return;

        // 清空列表
        this.listElement.innerHTML = '';

        // 按时间倒序排序
        const sortedPositions = [...this.positions].sort((a, b) => 
            new Date(b.createdAt) - new Date(a.createdAt)
        );

        // 创建列表项
        sortedPositions.forEach(position => {
            const item = document.createElement('div');
            item.className = 'position-item';
            
            const actionText = {
                'long': '开多/平空',
                'short': '开空/平多',
                'wait': '观望'
            }[position.action];

            item.innerHTML = `
                <div class="position-info">
                    <div class="position-time">${this.formatDate(position.timestamp)}</div>
                    <div class="position-action ${position.action}">${actionText}</div>
                    <div class="position-price">价格: ${position.price.toFixed(2)}</div>
                </div>
                <button class="delete-btn" data-id="${position.id}">删除</button>
            `;

            // 添加删除按钮事件
            const deleteBtn = item.querySelector('.delete-btn');
            deleteBtn.addEventListener('click', () => this.removePosition(position.id));

            this.listElement.appendChild(item);
        });
    }

    // 更新统计信息
    updateStats() {
        const stats = {
            total: this.positions.length,
            long: this.positions.filter(p => p.action === 'long').length,
            short: this.positions.filter(p => p.action === 'short').length,
            wait: this.positions.filter(p => p.action === 'wait').length
        };

        // 更新DOM
        document.getElementById('totalMarkers').textContent = stats.total;
        document.getElementById('longCount').textContent = stats.long;
        document.getElementById('shortCount').textContent = stats.short;
        document.getElementById('waitCount').textContent = stats.wait;
    }

    // 格式化日期
    formatDate(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        });
    }

    // 导出标记数据
    async exportPositions() {
        try {
            const blob = await window.api.exportPositions();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `positions_${new Date().toISOString().slice(0,10)}.json`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (error) {
            console.error('导出标记数据失败:', error);
            throw error;
        }
    }

    // 导入标记数据
    async importPositions(file) {
        try {
            await window.api.importPositions(file);
            await this.initialize(); // 重新加载所有标记
        } catch (error) {
            console.error('导入标记数据失败:', error);
            throw error;
        }
    }

    // 设置标记添加回调
    setPositionAddedCallback(callback) {
        this.onPositionAdded = callback;
    }

    // 设置标记删除回调
    setPositionRemovedCallback(callback) {
        this.onPositionRemoved = callback;
    }
}

// 导出标记位置管理器实例
window.positionsManager = new PositionsManager();
