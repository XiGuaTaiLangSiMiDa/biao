class KlineData {
    constructor(timestamp, open, high, low, close, volume) {
        this.timestamp = timestamp;
        this.open = parseFloat(open);
        this.high = parseFloat(high);
        this.low = parseFloat(low);
        this.close = parseFloat(close);
        this.volume = parseFloat(volume);
    }

    static fromOKXResponse(data) {
        const [timestamp, open, high, low, close, volume] = data;
        return new KlineData(
            timestamp * 1000, // 转换为毫秒
            open,
            high,
            low,
            close,
            volume
        );
    }

    toJSON() {
        return {
            timestamp: this.timestamp,
            open: this.open,
            high: this.high,
            low: this.low,
            close: this.close,
            volume: this.volume
        };
    }
}

module.exports = KlineData;
