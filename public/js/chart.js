class ChartManager {
    constructor() {
        this.chart = null;
        this.candlestickSeries = null;
        this.volumeSeries = null;
        this.markers = [];
        this.selectedTime = null;
        this.onTimeSelected = null;
        this.highlightedBar = null;
        this.data = [];
    }

    initialize(containerId) {
        const container = document.getElementById(containerId);
        
        // 创建图表
        this.chart = LightweightCharts.createChart(container, {
            width: container.clientWidth,
            height: container.clientHeight || 800,
            layout: {
                background: { color: '#ffffff' },
                textColor: '#333333',
                fontSize: 12,
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
            if (param.time) {
                const kline = this.data.find(k => k.timestamp / 1000 === param.time);
                if (kline) {
                    this.selectedTime = kline.timestamp;
                    
                    // 移除之前的高亮
                    if (this.highlightedBar) {
                        this.candlestickSeries.setMarkers(this.markers);
                    }

                    // 添加高亮效果
                    const highlightMarker = {
                        time: param.time,
                        position: 'inBar',
                        color: 'rgba(255, 255, 0, 0.3)',
                        shape: 'square',
                        size: 1
                    };

                    this.highlightedBar = highlightMarker;
                    this.candlestickSeries.setMarkers([...this.markers, highlightMarker]);

                    if (this.onTimeSelected) {
                        this.onTimeSelected(kline.timestamp, kline.close, kline);
                    }
                }
            }
        });

        // 添加缩放事件监听，确保标记始终显示
        this.chart.timeScale().subscribeVisibleLogicalRangeChange(() => {
            this.candlestickSeries.setMarkers(this.markers);
        });

        // 添加窗口大小变化监听
        window.addEventListener('resize', () => this.handleResize());
    }

    handleResize() {
        const container = this.chart.chartElement().parentElement;
        const height = container.clientHeight || 800;
        this.chart.applyOptions({
            width: container.clientWidth,
            height: height
        });
        // 重新设置标记确保显示
        this.candlestickSeries.setMarkers(this.markers);
    }

    setData(data) {
        if (!data || data.length === 0) return;

        this.data = data;

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
            color: item.close >= item.open ? 'rgba(38, 166, 154, 0.5)' : 'rgba(239, 83, 80, 0.5)'
        }));

        this.candlestickSeries.setData(candleData);
        this.volumeSeries.setData(volumeData);
        this.chart.timeScale().fitContent();
        
        // 重新设置标记确保显示
        this.candlestickSeries.setMarkers(this.markers);
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

        // 移除相同时间戳的标记
        this.markers = this.markers.filter(m => m.time !== marker.time);
        this.markers.push(marker);
        
        // 立即更新标记显示
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

    clearHighlight() {
        this.highlightedBar = null;
        this.candlestickSeries.setMarkers(this.markers);
    }
}

// 导出图表管理器实例
window.chartManager = new ChartManager();
