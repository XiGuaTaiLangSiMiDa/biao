class ChartManager {
    constructor() {
        this.chart = null;
        this.candlestickSeries = null;
        this.volumeSeries = null;
        this.markers = [];
        this.selectedTime = null;
        this.onTimeSelected = null;
    }

    initialize(containerId) {
        const container = document.getElementById(containerId);
        
        // 创建图表
        this.chart = LightweightCharts.createChart(container, {
            width: container.clientWidth,
            height: 600,
            layout: {
                background: { color: '#ffffff' },
                textColor: '#333333',
            },
            grid: {
                vertLines: { color: '#f0f0f0' },
                horzLines: { color: '#f0f0f0' },
            },
            crosshair: {
                mode: LightweightCharts.CrosshairMode.Normal,
            },
            rightPriceScale: {
                borderColor: '#dcdee0',
            },
            timeScale: {
                borderColor: '#dcdee0',
                timeVisible: true,
                secondsVisible: false,
            },
            handleScroll: {
                mouseWheel: true,
                pressedMouseMove: true,
                horzTouchDrag: true,
                vertTouchDrag: true,
            },
            handleScale: {
                axisPressedMouseMove: true,
                mouseWheel: true,
                pinch: true,
            },
        });

        // 创建K线图
        this.candlestickSeries = this.chart.addCandlestickSeries({
            upColor: '#26a69a',
            downColor: '#ef5350',
            borderVisible: false,
            wickUpColor: '#26a69a',
            wickDownColor: '#ef5350',
        });

        // 创建成交量图
        this.volumeSeries = this.chart.addHistogramSeries({
            color: '#26a69a',
            priceFormat: {
                type: 'volume',
            },
            priceScaleId: '',
            scaleMargins: {
                top: 0.8,
                bottom: 0,
            },
        });

        // 添加点击事件监听
        this.chart.subscribeClick(param => {
            if (param.time && this.onTimeSelected) {
                this.selectedTime = param.time * 1000;
                const price = this.candlestickSeries.coordinateToPrice(param.point.y);
                this.onTimeSelected(this.selectedTime, price);
            }
        });

        // 添加窗口大小变化监听
        window.addEventListener('resize', () => this.handleResize());
    }

    handleResize() {
        const container = this.chart.chartElement().parentElement;
        this.chart.applyOptions({
            width: container.clientWidth,
            height: container.clientHeight
        });
    }

    setData(data) {
        if (!data || data.length === 0) return;

        const candleData = data.map(item => ({
            time: item.timestamp / 1000,
            open: item.open,
            high: item.high,
            low: item.low,
            close: item.close
        }));

        const volumeData = data.map(item => ({
            time: item.timestamp / 1000,
            value: item.volume,
            color: item.close >= item.open ? '#26a69a' : '#ef5350'
        }));

        this.candlestickSeries.setData(candleData);
        this.volumeSeries.setData(volumeData);

        // 设置时间范围
        this.chart.timeScale().fitContent();
    }

    addMarker(timestamp, price, action) {
        const markerConfig = this.getMarkerConfig(action);
        const marker = {
            time: timestamp / 1000,
            position: markerConfig.position,
            color: markerConfig.color,
            shape: markerConfig.shape,
            text: markerConfig.text,
            size: 2
        };

        this.markers.push(marker);
        this.candlestickSeries.setMarkers(this.markers);
    }

    getMarkerConfig(action) {
        switch (action) {
            case 'long':
                return {
                    position: 'belowBar',
                    color: '#26a69a',
                    shape: 'arrowUp',
                    text: '多'
                };
            case 'short':
                return {
                    position: 'aboveBar',
                    color: '#ef5350',
                    shape: 'arrowDown',
                    text: '空'
                };
            case 'wait':
                return {
                    position: 'inBar',
                    color: '#ffb74d',
                    shape: 'circle',
                    text: '观'
                };
            default:
                return {
                    position: 'inBar',
                    color: '#95a5a6',
                    shape: 'square',
                    text: '?'
                };
        }
    }

    removeLastMarker() {
        if (this.markers.length > 0) {
            this.markers.pop();
            this.candlestickSeries.setMarkers(this.markers);
            return true;
        }
        return false;
    }

    clearMarkers() {
        this.markers = [];
        this.candlestickSeries.setMarkers([]);
    }

    setTimeSelectedCallback(callback) {
        this.onTimeSelected = callback;
    }

    getSelectedTime() {
        return this.selectedTime;
    }

    resize() {
        this.handleResize();
    }

    // 添加技术指标
    addIndicator(type) {
        switch (type) {
            case 'MA':
                // 添加移动平均线
                const ma7 = this.chart.addLineSeries({
                    color: '#2196F3',
                    lineWidth: 1,
                    title: 'MA7'
                });
                const ma25 = this.chart.addLineSeries({
                    color: '#FF9800',
                    lineWidth: 1,
                    title: 'MA25'
                });
                const ma99 = this.chart.addLineSeries({
                    color: '#E91E63',
                    lineWidth: 1,
                    title: 'MA99'
                });
                break;
            // 可以添加其他指标
        }
    }
}

// 导出图表管理器实例
window.chartManager = new ChartManager();
