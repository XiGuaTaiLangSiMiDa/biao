const moment = require('moment');
const config = require('../config');

class DataValidator {
    constructor() {
        this.timeframeMs = this.parseTimeframe(config.INTERVAL);
    }

    // 解析时间间隔字符串为毫秒数
    parseTimeframe(timeframe) {
        const unit = timeframe.slice(-1);
        const value = parseInt(timeframe.slice(0, -1));
        
        switch (unit) {
            case 'm': return value * 60 * 1000;
            case 'h': return value * 60 * 60 * 1000;
            case 'd': return value * 24 * 60 * 60 * 1000;
            default: throw new Error(`Unsupported timeframe unit: ${unit}`);
        }
    }

    validateData(data) {
        if (!Array.isArray(data) || data.length === 0) {
            return {
                isValid: false,
                errors: ['Empty or invalid data array']
            };
        }

        const errors = [];
        const gaps = [];
        let previousTimestamp = null;

        // 按时间戳排序
        data.sort((a, b) => a.timestamp - b.timestamp);

        for (let i = 0; i < data.length; i++) {
            const kline = data[i];
            
            // 验证数据结构
            if (!this.validateKlineStructure(kline)) {
                errors.push(`Invalid kline structure at index ${i}`);
                continue;
            }

            // 验证时间戳对齐
            if (!this.isTimestampAligned(kline.timestamp)) {
                errors.push(`Misaligned timestamp at ${new Date(kline.timestamp).toISOString()}`);
            }

            // 检查时间间隔
            if (previousTimestamp !== null) {
                const expectedTimestamp = previousTimestamp + this.timeframeMs;
                if (kline.timestamp !== expectedTimestamp) {
                    gaps.push({
                        start: new Date(previousTimestamp).toISOString(),
                        end: new Date(kline.timestamp).toISOString(),
                        missing: (kline.timestamp - previousTimestamp) / this.timeframeMs - 1
                    });
                }
            }

            // 验证价格和交易量
            if (!this.validatePriceVolume(kline)) {
                errors.push(`Invalid price/volume values at ${new Date(kline.timestamp).toISOString()}`);
            }

            previousTimestamp = kline.timestamp;
        }

        // 计算数据完整性
        const timeRange = data[data.length - 1].timestamp - data[0].timestamp;
        const expectedPoints = Math.floor(timeRange / this.timeframeMs) + 1;
        const completeness = (data.length / expectedPoints * 100).toFixed(2);

        return {
            isValid: errors.length === 0,
            errors,
            gaps,
            stats: {
                totalPoints: data.length,
                expectedPoints,
                completeness: parseFloat(completeness),
                timeRange: {
                    start: new Date(data[0].timestamp).toISOString(),
                    end: new Date(data[data.length - 1].timestamp).toISOString(),
                    duration: moment.duration(timeRange).humanize()
                }
            }
        };
    }

    validateKlineStructure(kline) {
        return kline 
            && typeof kline.timestamp === 'number'
            && typeof kline.open === 'number'
            && typeof kline.high === 'number'
            && typeof kline.low === 'number'
            && typeof kline.close === 'number'
            && typeof kline.volume === 'number';
    }

    isTimestampAligned(timestamp) {
        return timestamp % this.timeframeMs === 0;
    }

    validatePriceVolume(kline) {
        return kline.open > 0 
            && kline.high > 0 
            && kline.low > 0 
            && kline.close > 0
            && kline.volume >= 0
            && kline.high >= kline.low
            && kline.high >= kline.open
            && kline.high >= kline.close
            && kline.low <= kline.open
            && kline.low <= kline.close;
    }

    // 获取缺失的时间戳
    getMissingTimestamps(data) {
        const missingTimestamps = [];
        
        if (data.length < 2) return missingTimestamps;

        data.sort((a, b) => a.timestamp - b.timestamp);
        
        for (let i = 1; i < data.length; i++) {
            const expectedTimestamp = data[i-1].timestamp + this.timeframeMs;
            while (expectedTimestamp < data[i].timestamp) {
                missingTimestamps.push(expectedTimestamp);
                expectedTimestamp += this.timeframeMs;
            }
        }

        return missingTimestamps;
    }

    // 插值填充缺失数据
    interpolateData(data, missingTimestamps) {
        if (missingTimestamps.length === 0) return data;

        const interpolated = [...data];
        
        missingTimestamps.forEach(timestamp => {
            // 找到最近的前后数据点
            const prev = data.find(k => k.timestamp < timestamp);
            const next = data.find(k => k.timestamp > timestamp);

            if (prev && next) {
                const ratio = (timestamp - prev.timestamp) / (next.timestamp - prev.timestamp);
                
                // 线性插值
                const interpolatedKline = {
                    timestamp,
                    open: prev.close,
                    high: this.lerp(prev.high, next.high, ratio),
                    low: this.lerp(prev.low, next.low, ratio),
                    close: this.lerp(prev.close, next.close, ratio),
                    volume: this.lerp(prev.volume, next.volume, ratio)
                };

                interpolated.push(interpolatedKline);
            }
        });

        return interpolated.sort((a, b) => a.timestamp - b.timestamp);
    }

    // 线性插值
    lerp(start, end, ratio) {
        return start + (end - start) * ratio;
    }
}

module.exports = new DataValidator();
