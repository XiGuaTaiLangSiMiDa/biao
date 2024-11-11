class ChartConfig {
    static getChartOptions(container) {
        return {
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
                    top: 0.1,
                    bottom: 0.3
                }
            },
            timeScale: {
                borderColor: '#dcdee0',
                timeVisible: true,
                secondsVisible: false,
                barSpacing: 12,
            },
            handleScroll: {
                mouseWheel: true,
                pressedMouseMove: true,
                horzTouchDrag: true,
                vertTouchDrag: true,
            },
            handleScale: {
                mouseWheel: true,
                pinch: true,
            },
        };
    }

    static getCandlestickSeriesOptions() {
        return {
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
        };
    }

    static getVolumeSeriesOptions() {
        return {
            priceFormat: {
                type: 'volume',
            },
            priceScaleId: 'volume',
            scaleMargins: {
                top: 0.8,
                bottom: 0.02,
            },
        };
    }

    static getMarkerColors() {
        return {
            long: '#26a69a',    // 绿色
            short: '#ef5350',   // 红色
            wait: '#ffb74d',    // 橙色
            default: '#95a5a6', // 灰色
            highlight: 'rgba(255, 255, 0, 0.3)' // 黄色半透明
        };
    }

    static getVolumeColors() {
        return {
            up: 'rgba(38, 166, 154, 0.5)',   // 绿色半透明
            down: 'rgba(239, 83, 80, 0.5)'    // 红色半透明
        };
    }

    static getMarkerShapes() {
        return {
            long: 'arrowUp',
            short: 'arrowDown',
            wait: 'circle',
            default: 'square'
        };
    }

    static getMarkerTexts() {
        return {
            long: '多',
            short: '空',
            wait: '观',
            default: '?'
        };
    }
}

export default ChartConfig;
