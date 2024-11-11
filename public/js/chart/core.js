import ChartConfig from './config.js';
import ChartMarkers from './markers.js';
import ChartEvents from './events.js';

class ChartCore {
    constructor() {
        this.chart = null;
        this.candlestickSeries = null;
        this.volumeSeries = null;
        this.markers = null;
        this.events = null;
        this.data = [];
    }

    initialize(containerId) {
        const container = document.getElementById(containerId);
        if (!container) {
            throw new Error(`Container element with id "${containerId}" not found`);
        }

        // 创建图表
        this.chart = LightweightCharts.createChart(
            container, 
            ChartConfig.getChartOptions(container)
        );

        // 创建K线图
        this.candlestickSeries = this.chart.addCandlestickSeries(
            ChartConfig.getCandlestickSeriesOptions()
        );

        // 创建成交量图
        this.volumeSeries = this.chart.addHistogramSeries(
            ChartConfig.getVolumeSeriesOptions()
        );

        // 初始化标记管理器
        this.markers = new ChartMarkers(this.candlestickSeries);

        // 初始化事件管理器
        this.events = new ChartEvents(this.chart, this.candlestickSeries, this.data);
        this.events.initialize();

        // 设置事件回调
        this.events.setScaleChangedCallback(() => {
            this.markers.refreshMarkers();
        });

        this.events.setResizeCallback(() => {
            this.handleResize(container);
        });
    }

    setData(data) {
        if (!data || data.length === 0) return;

        this.data = data;
        this.events.setData(data);

        const candleData = data.map(item => ({
            time: item.timestamp / 1000,
            open: item.open,
            high: item.high,
            low: item.low,
            close: item.close
        }));

        const volumeData = data.map(item => {
            const colors = ChartConfig.getVolumeColors();
            return {
                time: item.timestamp / 1000,
                value: item.volume,
                color: item.close >= item.open ? colors.up : colors.down
            };
        });

        this.candlestickSeries.setData(candleData);
        this.volumeSeries.setData(volumeData);
        this.chart.timeScale().fitContent();
    }

    handleResize(container) {
        const { width, height } = container.getBoundingClientRect();
        this.chart.applyOptions({
            width: width,
            height: height
        });
        this.markers.refreshMarkers();
    }

    // 标记相关方法
    addMarker(timestamp, price, action) {
        this.markers.addMarker(timestamp, price, action);
    }

    removeLastMarker() {
        return this.markers.removeLastMarker();
    }

    clearMarkers() {
        this.markers.clearMarkers();
    }

    clearHighlight() {
        this.markers.clearHighlight();
    }

    // 事件相关方法
    setTimeSelectedCallback(callback) {
        this.events.setTimeSelectedCallback(callback);
    }

    // 数据相关方法
    getData() {
        return this.data;
    }

    getSelectedTime() {
        return this.events.selectedTime;
    }

    // 图表控制方法
    fitContent() {
        this.chart.timeScale().fitContent();
    }

    resize() {
        const container = this.chart.chartElement().parentElement;
        this.handleResize(container);
    }
}

export default ChartCore;
