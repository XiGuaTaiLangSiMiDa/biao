class ChartManager {
    constructor() {
        this.chart = null;
        this.candlestickSeries = null;
        this.volumeSeries = null;
        this.markers = [];
        this.selectedTime = null;
        this.onTimeSelected = null;
        this.highlightedBar = null;
    }

    initialize(containerId) {
        const container = document.getElementById(containerId);
        
        // 创建图表
        this.chart = LightweightCharts.createChart(container, {
            width: container.clientWidth,
            height: container.clientHeight || 800,  // 增加默认高度
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
                    top: 0.1,
                    bottom: 0.3  // 为成交量留出更多空间
                }
            },
            timeScale: {
                borderColor: '#dcdee0',
                timeVisible: true,
                secondsVisible: false,
                barSpacing: 12,  // 增加K线间距
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
            priceScaleId: 'volume',
            scaleMargins: {
                top: 0.8,  // 将成交量图表放在底部
                bottom: 0.02,  // 留出一些底部空间
            },
        });

        // 配置成交量价格轴
        this.chart.priceScale('volume').applyOptions({
            scaleMargins: {
                top: 0.8,  // 与volumeSeries的scaleMargins保持一致
                bottom: 0.02,
            },
            visible: true,  // 显示成交量的价格轴
            drawTicks: false,  // 不绘制刻度线
        });

        // 添加点击事件监听
        this.chart.subscribeClick(param => {
            if (param.time) {
                this.selectedTime = param.time * 1000;
                const price = this.candlestickSeries.coordinateToPrice(param.point.y);
                
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
                    this.onTimeSelected(this.selectedTime, price);
                }
            }
        });

        // 添加窗口大小变化监听
        window.addEventListener('resize', () => this.handleResize());
    }

    handleResize() {
        const container = this.chart.chartElement().parentElement;
        const height = container.clientHeight || 800;  // 使用容器高度或默认值
        this.chart.applyOptions({
            width: container.clientWidth,
            height: height
        });
        
        // 调整图表布局
        this.chart.timeScale().fitContent();
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
            color: item.close >= item.open ? 'rgba(38, 166, 154, 0.5)' : 'rgba(239, 83, 80, 0.5)'
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

        // 移除相同时间戳的标记
        this.markers = this.markers.filter(m => m.time !== marker.time);
        this.markers.push(marker);

        // 如果有高亮的K线，保持高亮效果
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
            
            // 如果有高亮的K线，保持高亮效果
            if (this.highlightedBar) {
                this.candlestickSeries.setMarkers([...this.markers, this.highlightedBar]);
            } else {
                this.candlestickSeries.setMarkers(this.markers);
            }
            return true;
        }
        return false;
    }

    clearMarkers() {
        this.markers = [];
        // 如果有高亮的K线，只保留高亮效果
        if (this.highlightedBar) {
            this.candlestickSeries.setMarkers([this.highlightedBar]);
        } else {
            this.candlestickSeries.setMarkers([]);
        }
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

    // 添加技术指标
    addIndicator(type) {
        switch (type) {
            case 'MA':
                // 添加移动平均线
                const ma7 = this.chart.addLineSeries({
                    color: '#2196F3',
                    lineWidth: 1,
                    title: 'MA7',
                    priceScaleId: 'right'
                });
                const ma25 = this.chart.addLineSeries({
                    color: '#FF9800',
                    lineWidth: 1,
                    title: 'MA25',
                    priceScaleId: 'right'
                });
                const ma99 = this.chart.addLineSeries({
                    color: '#E91E63',
                    lineWidth: 1,
                    title: 'MA99',
                    priceScaleId: 'right'
                });
                break;
            // 可以添加其他指标
        }
    }
}

// 导出图表管理器实例
window.chartManager = new ChartManager();
