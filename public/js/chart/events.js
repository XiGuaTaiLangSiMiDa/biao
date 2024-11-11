class ChartEvents {
    constructor(chart, candlestickSeries, data) {
        this.chart = chart;
        this.candlestickSeries = candlestickSeries;
        this.data = data;
        this.onTimeSelected = null;
        this.lastClickTime = 0;
        this.clickDelay = 300; // 防止重复点击的延迟时间（毫秒）
    }

    initialize() {
        this.setupClickHandler();
        this.setupScaleHandler();
        this.setupResizeHandler();
    }

    setupClickHandler() {
        this.chart.subscribeClick(param => {
            // 防止重复点击
            const now = Date.now();
            if (now - this.lastClickTime < this.clickDelay) {
                return;
            }
            this.lastClickTime = now;

            if (!this.isValidClick(param)) {
                return;
            }

            const kline = this.findKlineAtTime(param.time);
            if (kline && this.onTimeSelected) {
                this.onTimeSelected(kline.timestamp, kline.close, kline);
            }
        });
    }

    setupScaleHandler() {
        this.chart.timeScale().subscribeVisibleTimeRangeChange(() => {
            // 触发缩放事件回调
            if (this.onScaleChanged) {
                this.onScaleChanged();
            }
        });
    }

    setupResizeHandler() {
        window.addEventListener('resize', () => {
            // 触发调整大小事件回调
            if (this.onResize) {
                this.onResize();
            }
        });
    }

    isValidClick(param) {
        if (!param.time || !param.point) {
            return false;
        }

        // 检查点击是否在价格范围内
        const price = this.candlestickSeries.coordinateToPrice(param.point.y);
        if (!price) {
            return false;
        }

        const kline = this.findKlineAtTime(param.time);
        if (!kline) {
            return false;
        }

        // 检查点击是否在K线的合理范围内
        const priceRange = Math.abs(kline.high - kline.low);
        const tolerance = priceRange * 0.1; // 10%的容差
        if (price < kline.low - tolerance || price > kline.high + tolerance) {
            return false;
        }

        return true;
    }

    findKlineAtTime(time) {
        return this.data.find(k => k.timestamp / 1000 === time);
    }

    setTimeSelectedCallback(callback) {
        this.onTimeSelected = callback;
    }

    setScaleChangedCallback(callback) {
        this.onScaleChanged = callback;
    }

    setResizeCallback(callback) {
        this.onResize = callback;
    }

    setData(data) {
        this.data = data;
    }
}

export default ChartEvents;
