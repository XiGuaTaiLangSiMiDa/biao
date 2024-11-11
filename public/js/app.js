class App {
    constructor() {
        this.timeframe = '15m';
        this.selectedKline = null;
        this.modal = null;
        this.modalTimeElement = null;
        this.modalPriceElement = null;
        this.modalVolumeElement = null;
    }

    async initialize() {
        // 初始化图表
        window.chartManager.initialize('chart');

        // 初始化弹窗
        this.initializeModal();

        // 设置事件监听器
        this.setupEventListeners();

        // 加载初始数据
        await this.loadData();

        // 初始化标记位置管理器
        await window.positionsManager.initialize();
    }

    initializeModal() {
        this.modal = document.getElementById('markerModal');
        this.modalTimeElement = this.modal.querySelector('.kline-info .time');
        this.modalPriceElement = this.modal.querySelector('.kline-info .price');
        this.modalVolumeElement = this.modal.querySelector('.kline-info .volume');

        // 关闭按钮事件
        this.modal.querySelector('.close-btn').addEventListener('click', () => {
            this.closeModal();
        });

        // 点击弹窗外部关闭
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.closeModal();
            }
        });

        // ESC键关闭弹窗
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.modal.classList.contains('active')) {
                this.closeModal();
            }
        });

        // 操作按钮事件
        this.modal.querySelectorAll('.action-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const action = btn.dataset.action;
                await this.addMarker(action);
            });
        });
    }

    setupEventListeners() {
        // 时间周期选择
        const timeframeSelect = document.getElementById('timeframeSelect');
        timeframeSelect.value = this.timeframe;
        timeframeSelect.addEventListener('change', async (e) => {
            this.timeframe = e.target.value;
            await this.loadData();
        });

        // 刷新按钮
        const refreshBtn = document.getElementById('refreshBtn');
        refreshBtn.addEventListener('click', async () => {
            await this.loadData(true);
        });

        // 图表点击事件
        window.chartManager.setTimeSelectedCallback((timestamp, price, kline) => {
            this.selectedKline = kline;
            this.showModal(kline);
        });

        // 窗口大小改变事件
        window.addEventListener('resize', () => {
            window.chartManager.resize();
        });
    }

    showModal(kline) {
        // 更新弹窗信息
        this.modalTimeElement.textContent = this.formatDateTime(kline.timestamp);
        this.modalPriceElement.textContent = `价格: ${kline.close.toFixed(3)}`;
        this.modalVolumeElement.textContent = `成交量: ${kline.volume.toFixed(3)}`;
        
        // 显示弹窗
        this.modal.classList.add('active');
    }

    closeModal() {
        this.modal.classList.remove('active');
        this.selectedKline = null;
        window.chartManager.clearHighlight();
    }

    async addMarker(action) {
        if (!this.selectedKline) return;

        try {
            await window.positionsManager.addPosition(
                this.selectedKline.timestamp,
                this.selectedKline.close,
                action
            );

            // 关闭弹窗
            this.closeModal();

            // 显示成功提示
            this.showToast(`成功添加${this.getActionText(action)}标记`);

        } catch (error) {
            console.error('添加标记失败:', error);
            this.showToast('添加标记失败，请重试', 'error');
        }
    }

    showToast(message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `floating-tooltip ${type}`;
        toast.textContent = message;
        document.body.appendChild(toast);

        setTimeout(() => {
            toast.remove();
        }, 2000);
    }

    getActionText(action) {
        return {
            'long': '开多/平空',
            'short': '开空/平多',
            'wait': '观望'
        }[action] || '';
    }

    formatDateTime(timestamp) {
        const date = new Date(timestamp);
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${month}-${day} ${hours}:${minutes}`;
    }

    async loadData(forceUpdate = false) {
        try {
            // 显示加载状态
            document.body.classList.add('loading');
            this.showToast('正在加载数据...', 'info');

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

            // 显示成功提示
            this.showToast('数据加载完成');

        } catch (error) {
            console.error('加载数据失败:', error);
            this.showToast('加载数据失败，请检查网络连接后重试', 'error');
        } finally {
            // 隐藏加载状态
            document.body.classList.remove('loading');
        }
    }
}

// 当页面加载完成时初始化应用
document.addEventListener('DOMContentLoaded', async () => {
    const app = new App();
    await app.initialize();
});
