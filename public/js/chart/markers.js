import ChartConfig from './config.js';

class ChartMarkers {
    constructor(candlestickSeries) {
        this.candlestickSeries = candlestickSeries;
        this.markers = [];
        this.highlightedBar = null;
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
        this.refreshMarkers();
    }

    getMarkerConfig(action) {
        const colors = ChartConfig.getMarkerColors();
        const shapes = ChartConfig.getMarkerShapes();
        const texts = ChartConfig.getMarkerTexts();

        return {
            position: action === 'short' ? 'aboveBar' : 
                     action === 'long' ? 'belowBar' : 'inBar',
            color: colors[action] || colors.default,
            shape: shapes[action] || shapes.default,
            text: texts[action] || texts.default
        };
    }

    removeLastMarker() {
        if (this.markers.length > 0) {
            this.markers.pop();
            this.refreshMarkers();
            return true;
        }
        return false;
    }

    clearMarkers() {
        this.markers = [];
        this.refreshMarkers();
    }

    setHighlight(time) {
        if (time) {
            this.highlightedBar = {
                time,
                position: 'inBar',
                color: ChartConfig.getMarkerColors().highlight,
                shape: ChartConfig.getMarkerShapes().default,
                size: 1
            };
        } else {
            this.highlightedBar = null;
        }
        this.refreshMarkers();
    }

    clearHighlight() {
        this.highlightedBar = null;
        this.refreshMarkers();
    }

    refreshMarkers() {
        if (this.highlightedBar) {
            this.candlestickSeries.setMarkers([...this.markers, this.highlightedBar]);
        } else {
            this.candlestickSeries.setMarkers(this.markers);
        }
    }

    getMarkers() {
        return this.markers;
    }

    setMarkers(markers) {
        this.markers = markers;
        this.refreshMarkers();
    }
}

export default ChartMarkers;
