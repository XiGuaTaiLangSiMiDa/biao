class App {
    constructor() {
        this.timeframe = '15m';  // 更新默认时间间隔为15分钟
        this.isMarkerMode = false;
        this.currentAction = null;
    }

    async initialize() {
        // 初始化图表
        window.chartManager.initialize('chart');

        // 初始化标记位置管理器
        await window.positionsManager.initialize();

        // 设置事件监听器
        this.setupEventListeners();

        // 加载初始数据
        await this.loadData();
    }

    setupEventListeners() {
        // 时间周期选择
        const timeframeSelect = document.getElementById('timeframeSelect');
        timeframeSelect.value = this.timeframe; // 设置默认选中值
        timeframeSelect.addEventListener('change', async (e) => {
            this.timeframe = e.target.value;
            await this.loadData();
        });

        // 刷新按钮
        const refreshBtn = document.getElementById('refreshBtn');
        refreshBtn.addEventListener('click', async () => {
            await this.loadData(true);
        });

        // 标记按钮
        const markerBtns = document.querySelectorAll('.marker-btn');
        markerBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const action = btn.dataset.action;
                if (this.currentAction === action) {
                    // 取消选中状态
                    this.currentAction = null;
                    this.isMarkerMode = false;
                    btn.classList.remove('active');
                    // 清除高亮
                    window.chartManager.clearHighlight();
                } else {
                    // 设置新的选中状态
                    markerBtns.forEach(b => b.classList.remove('active'));
                    this.currentAction = action;
                    this.isMarkerMode = true;
                    btn.classList.add('active');
                }
            });
        });

        // 撤销按钮
        const undoBtn = document.getElementById('undoBtn');
        undoBtn.addEventListener('click', () => {
            window.chartManager.removeLastMarker();
        });

        // 图表点击事件
        window.chartManager.setTimeSelectedCallback(async (timestamp, price) => {
            if (this.isMarkerMode && this.currentAction) {
                try {
                    await window.positionsManager.addPosition(
                        timestamp,
                        price,
                        this.currentAction
                    );

                    // 重置标记模式和高亮
                    this.isMarkerMode = false;
                    this.currentAction = null;
                    document.querySelectorAll('.marker-btn').forEach(btn => 
                        btn.classList.remove('active')
                    );
                    window.chartManager.clearHighlight();
                } catch (error) {
                    console.error('添加标记失败:', error);
                    alert('添加标记失败，请重试');
                }
            }
        });

        // 窗口大小改变事件
        window.addEventListener('resize', () => {
            window.chartManager.resize();
        });

        // 键盘事件监听
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                // 取消标记模式和高亮
                this.isMarkerMode = false;
                this.currentAction = null;
                document.querySelectorAll('.marker-btn').forEach(btn => 
                    btn.classList.remove('active')
                );
                window.chartManager.clearHighlight();
            }
        });
    }

    async loadData(forceUpdate = false) {
        try {
            // 显示加载状态
            document.body.classList.add('loading');

            if (forceUpdate) {
                // 强制更新数据
                await window.api.updateKlineData();
            }

            // 获取K线数据
            const now = Date.now();
            const oneYearAgo = now - 365 * 24 * 60 * 60 * 1000;
            const data = await window.api.getKlineData(this.timeframe, oneYearAgo, now);

            // 更新图表
            window.chartManager.setData(data);

            // 重新加载标记
            await window.positionsManager.initialize();

        } catch (error) {
            console.error('加载数据失败:', error);
            alert('加载数据失败，请检查网络连接后重试');
        } finally {
            // 隐藏加载状态
            document.body.classList.remove('loading');
        }
    }

    // 导出标记数据
    async exportData() {
        try {
            await window.positionsManager.exportPositions();
        } catch (error) {
            console.error('导出数据失败:', error);
            alert('导出数据失败，请重试');
        }
    }

    // 导入标记数据
    async importData(file) {
        try {
            await window.positionsManager.importPositions(file);
        } catch (error) {
            console.error('导入数据失败:', error);
            alert('导入数据失败，请检查文件格式是否正确');
        }
    }
}

// 当页面加载完成时初始化应用
document.addEventListener('DOMContentLoaded', async () => {
    const app = new App();
    await app.initialize();
});
