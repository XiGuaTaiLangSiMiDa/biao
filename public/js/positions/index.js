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
            // 验证数据
            if (!this.validatePosition(timestamp, price, action)) {
                throw new Error('无效的标记数据');
            }

            // 检查是否已存在相同时间戳的标记
            const existingPosition = this.positions.find(p => p.timestamp === timestamp);
            if (existingPosition) {
                // 如果存在，先删除旧的
                await this.removePosition(existingPosition.id);
            }

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

    // 验证标记数据
    validatePosition(timestamp, price, action) {
        // 验证时间戳
        if (!timestamp || isNaN(timestamp) || timestamp <= 0) {
            console.error('无效的时间戳:', timestamp);
            return false;
        }

        // 验证价格
        if (!price || isNaN(price) || price <= 0) {
            console.error('无效的价格:', price);
            return false;
        }

        // 验证操作类型
        const validActions = ['long', 'short', 'wait'];
        if (!validActions.includes(action)) {
            console.error('无效的操作类型:', action);
            return false;
        }

        return true;
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
            new Date(b.timestamp) - new Date(a.timestamp)
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
                    <div class="position-price">价格: ${position.price.toFixed(3)}</div>
                </div>
                <button class="delete-btn" data-id="${position.id}">删除</button>
            `;

            // 添加删除按钮事件
            const deleteBtn = item.querySelector('.delete-btn');
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation(); // 阻止事件冒泡
                this.removePosition(position.id);
            });

            // 添加点击事件以高亮对应的K线
            item.addEventListener('click', () => {
                // 清除其他项的选中状态
                this.listElement.querySelectorAll('.position-item').forEach(p => 
                    p.classList.remove('selected')
                );
                // 添加选中状态
                item.classList.add('selected');
                
                // 在图表上高亮对应的K线
                const time = position.timestamp / 1000;
                window.chartManager.chart.timeScale().scrollToPosition(time, 0.5);
                
                // 添加高亮标记
                window.chartManager.highlightedBar = {
                    time: time,
                    position: 'inBar',
                    color: 'rgba(255, 255, 0, 0.3)',
                    shape: 'square',
                    size: 1
                };
                window.chartManager.refreshMarkers();
            });

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
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${month}-${day} ${hours}:${minutes}`;
    }
}

// 创建全局实例
window.positionsManager = new PositionsManager();

export default PositionsManager;
