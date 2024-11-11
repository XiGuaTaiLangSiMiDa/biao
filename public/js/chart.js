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
        this.lastVisibleRange = null;
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
                vertLine: {
                    color: '#9B7DFF',
                    width: 1,
                    style: 1,
                    labelBackgroundColor: '#9B7DFF',
                },
                horzLine: {
                    color: '#9B7DFF',
                    width: 1,
                    style: 1,
                    labelBackgroundColor: '#9B7DFF',
                },
            },
            rightPriceScale: {
                borderColor: '#dcdee0',
                scaleMargins: {
                    top: 0.1,    // K线图顶部边距
                    bottom: 0.4  // 增加底部边距，为成交量图留出更多空间
                }
            },
            timeScale: {
                borderColor: '#dcdee0',
                timeVisible: true,
                secondsVisible: false,
                barSpacing: 12,
                fixLeftEdge: true,
                fixRightEdge: true,
            },
        });

        // 创建K线图
        this.candlestickSeries = this.chart.addCandlestickSeries({
            upColor: '#26a69a',
            downColor: '#ef5350',
            borderVisible: false,
            wickUpColor: '#26a69a',
            wickDownColor: '#ef5350',
            priceScaleId: 'right',
            priceFormat: {
                type: 'price',
                precision: 3,
                minMove: 0.001,
            },
        });

        // 创建成交量图
        this.volumeSeries = this.chart.addHistogramSeries({
            priceFormat: {
                type: 'volume',
            },
            priceScaleId: 'volume',  // 使用独立的价格轴
            scaleMargins: {
                top: 0.7,    // 成交量图顶部位置
                bottom: 0.05 // 底部边距
            },
            color: 'rgba(0, 0, 0, 0.2)',  // 降低默认颜色的不透明度
        });

        // 配置成交量价格轴
        this.chart.priceScale('volume').applyOptions({
            scaleMargins: {
                top: 0.7,    // 与volumeSeries保持一致
                bottom: 0.05
            },
            drawTicks: false,  // 不绘制刻度线
            borderVisible: false,  // 不显示边框
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

        // 添加缩放和滚动事件监听
        this.chart.timeScale().subscribeVisibleLogicalRangeChange(logicalRange => {
            if (logicalRange === null) return;
            
            // 保存当前可见范围
            this.lastVisibleRange = logicalRange;
            
            // 确保标记在可见范围内
            this.ensureMarkersVisible();
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
        this.ensureMarkersVisible();
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
            color: item.close >= item.open ? 
                'rgba(38, 166, 154, 0.3)' :  // 降低上涨成交量的不透明度
                'rgba(239, 83, 80, 0.3)'     // 降低下跌成交量的不透明度
        }));

        this.candlestickSeries.setData(candleData);
        this.volumeSeries.setData(volumeData);
        this.chart.timeScale().fitContent();
        
        // 设置初始标记
        this.ensureMarkersVisible();
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
        this.ensureMarkersVisible();
    }

    ensureMarkersVisible() {
        if (this.markers.length === 0) return;

        // 设置所有标记
        if (this.highlightedBar) {
            this.candlestickSeries.setMarkers([...this.markers, this.highlightedBar]);
        } else {
            this.candlestickSeries.setMarkers(this.markers);
        }
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
            this.ensureMarkersVisible();
            return true;
        }
        return false;
    }

    clearMarkers() {
        this.markers = [];
        this.ensureMarkersVisible();
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
        this.ensureMarkersVisible();
    }
}

// 导出图表管理器实例
window.chartManager = new ChartManager();
