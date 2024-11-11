const moment = require('moment');

class MarketAnalyzer {
    constructor() {
        this.resetStats();
    }

    resetStats() {
        this.stats = {
            price: {
                trends: {
                    uptrend: 0,
                    downtrend: 0,
                    sideways: 0
                },
                volatility: {
                    daily: [],
                    weekly: [],
                    monthly: []
                },
                support: [],
                resistance: [],
                averages: {
                    ma7: [],
                    ma25: [],
                    ma99: []
                }
            },
            volume: {
                trends: {
                    increasing: 0,
                    decreasing: 0,
                    stable: 0
                },
                spikes: [],
                averages: {
                    daily: [],
                    weekly: [],
                    monthly: []
                }
            },
            patterns: {
                bullish: [],
                bearish: []
            }
        };
    }

    analyze(data) {
        this.resetStats();
        if (!data || data.length === 0) return null;

        // 按时间戳排序
        data.sort((a, b) => a.timestamp - b.timestamp);

        // 分析价格趋势
        this.analyzePriceTrends(data);

        // 分析波动性
        this.analyzeVolatility(data);

        // 分析支撑和阻力位
        this.analyzeSupportResistance(data);

        // 计算移动平均线
        this.calculateMovingAverages(data);

        // 分析交易量
        this.analyzeVolume(data);

        // 识别价格模式
        this.identifyPatterns(data);

        return this.generateReport(data);
    }

    analyzePriceTrends(data) {
        let uptrend = 0, downtrend = 0, sideways = 0;
        const threshold = 0.005; // 0.5%的变化阈值

        for (let i = 1; i < data.length; i++) {
            const priceChange = (data[i].close - data[i-1].close) / data[i-1].close;
            if (priceChange > threshold) uptrend++;
            else if (priceChange < -threshold) downtrend++;
            else sideways++;
        }

        this.stats.price.trends = {
            uptrend,
            downtrend,
            sideways,
            dominant: Math.max(uptrend, downtrend, sideways) === uptrend ? 'uptrend' :
                     Math.max(uptrend, downtrend, sideways) === downtrend ? 'downtrend' : 'sideways'
        };
    }

    analyzeVolatility(data) {
        // 日波动率
        this.stats.price.volatility.daily = data.map(k => ({
            timestamp: k.timestamp,
            volatility: (k.high - k.low) / k.low * 100
        }));

        // 周波动率
        const weeklyData = this.groupDataByTimeframe(data, 7 * 24 * 60 * 60 * 1000);
        this.stats.price.volatility.weekly = weeklyData.map(week => ({
            timestamp: week[0].timestamp,
            volatility: (Math.max(...week.map(k => k.high)) - Math.min(...week.map(k => k.low))) /
                       Math.min(...week.map(k => k.low)) * 100
        }));

        // 月波动率
        const monthlyData = this.groupDataByTimeframe(data, 30 * 24 * 60 * 60 * 1000);
        this.stats.price.volatility.monthly = monthlyData.map(month => ({
            timestamp: month[0].timestamp,
            volatility: (Math.max(...month.map(k => k.high)) - Math.min(...month.map(k => k.low))) /
                       Math.min(...month.map(k => k.low)) * 100
        }));
    }

    analyzeSupportResistance(data) {
        const windowSize = 20;
        const threshold = 0.02; // 2%的价格变化阈值

        for (let i = windowSize; i < data.length - windowSize; i++) {
            const currentLow = data[i].low;
            const currentHigh = data[i].high;

            // 检查支撑位
            let isSupport = true;
            for (let j = i - windowSize; j < i + windowSize; j++) {
                if (j === i) continue;
                if (data[j].low < currentLow) {
                    isSupport = false;
                    break;
                }
            }

            // 检查阻力位
            let isResistance = true;
            for (let j = i - windowSize; j < i + windowSize; j++) {
                if (j === i) continue;
                if (data[j].high > currentHigh) {
                    isResistance = false;
                    break;
                }
            }

            if (isSupport) {
                this.stats.price.support.push({
                    timestamp: data[i].timestamp,
                    price: currentLow
                });
            }

            if (isResistance) {
                this.stats.price.resistance.push({
                    timestamp: data[i].timestamp,
                    price: currentHigh
                });
            }
        }
    }

    calculateMovingAverages(data) {
        [7, 25, 99].forEach(period => {
            const ma = [];
            for (let i = period - 1; i < data.length; i++) {
                const sum = data.slice(i - period + 1, i + 1).reduce((acc, k) => acc + k.close, 0);
                ma.push({
                    timestamp: data[i].timestamp,
                    value: sum / period
                });
            }
            this.stats.price.averages[`ma${period}`] = ma;
        });
    }

    analyzeVolume(data) {
        const volumeChanges = [];
        for (let i = 1; i < data.length; i++) {
            const change = (data[i].volume - data[i-1].volume) / data[i-1].volume;
            volumeChanges.push(change);
        }

        // 分析交易量趋势
        const threshold = 0.1; // 10%的变化阈值
        this.stats.volume.trends = {
            increasing: volumeChanges.filter(c => c > threshold).length,
            decreasing: volumeChanges.filter(c => c < -threshold).length,
            stable: volumeChanges.filter(c => Math.abs(c) <= threshold).length
        };

        // 识别交易量异常
        const meanVolume = data.reduce((acc, k) => acc + k.volume, 0) / data.length;
        const stdVolume = Math.sqrt(data.reduce((acc, k) => acc + Math.pow(k.volume - meanVolume, 2), 0) / data.length);
        
        this.stats.volume.spikes = data.filter(k => k.volume > meanVolume + 2 * stdVolume)
            .map(k => ({
                timestamp: k.timestamp,
                volume: k.volume,
                deviation: (k.volume - meanVolume) / stdVolume
            }));
    }

    identifyPatterns(data) {
        // 这里可以添加更多模式识别逻辑
        for (let i = 2; i < data.length; i++) {
            // 锤子线形态
            if (this.isHammer(data[i])) {
                this.stats.patterns.bullish.push({
                    type: 'hammer',
                    timestamp: data[i].timestamp
                });
            }

            // 吊人形态
            if (this.isHangingMan(data[i])) {
                this.stats.patterns.bearish.push({
                    type: 'hanging_man',
                    timestamp: data[i].timestamp
                });
            }

            // 启明星形态
            if (this.isMorningStar(data.slice(i-2, i+1))) {
                this.stats.patterns.bullish.push({
                    type: 'morning_star',
                    timestamp: data[i].timestamp
                });
            }

            // 黄昏星形态
            if (this.isEveningStar(data.slice(i-2, i+1))) {
                this.stats.patterns.bearish.push({
                    type: 'evening_star',
                    timestamp: data[i].timestamp
                });
            }
        }
    }

    isHammer(candle) {
        const body = Math.abs(candle.close - candle.open);
        const upperShadow = candle.high - Math.max(candle.open, candle.close);
        const lowerShadow = Math.min(candle.open, candle.close) - candle.low;
        return lowerShadow > 2 * body && upperShadow < body;
    }

    isHangingMan(candle) {
        const body = Math.abs(candle.close - candle.open);
        const upperShadow = candle.high - Math.max(candle.open, candle.close);
        const lowerShadow = Math.min(candle.open, candle.close) - candle.low;
        return upperShadow > 2 * body && lowerShadow < body;
    }

    isMorningStar(candles) {
        if (candles.length !== 3) return false;
        const [first, second, third] = candles;
        return first.close < first.open && // 第一根是阴线
               Math.abs(second.close - second.open) < Math.abs(first.close - first.open) * 0.3 && // 第二根是十字星
               third.close > third.open && // 第三根是阳线
               third.close > first.open; // 收盘价高于第一根开盘价
    }

    isEveningStar(candles) {
        if (candles.length !== 3) return false;
        const [first, second, third] = candles;
        return first.close > first.open && // 第一根是阳线
               Math.abs(second.close - second.open) < Math.abs(first.close - first.open) * 0.3 && // 第二根是十字星
               third.close < third.open && // 第三根是阴线
               third.close < first.open; // 收盘价低于第一根开盘价
    }

    groupDataByTimeframe(data, timeframe) {
        const groups = [];
        let currentGroup = [];
        let currentTimestamp = data[0].timestamp;

        for (const candle of data) {
            if (candle.timestamp - currentTimestamp >= timeframe) {
                if (currentGroup.length > 0) {
                    groups.push(currentGroup);
                }
                currentGroup = [candle];
                currentTimestamp = candle.timestamp;
            } else {
                currentGroup.push(candle);
            }
        }

        if (currentGroup.length > 0) {
            groups.push(currentGroup);
        }

        return groups;
    }

    generateReport(data) {
        const latestPrice = data[data.length - 1].close;
        const startPrice = data[0].close;
        const priceChange = ((latestPrice - startPrice) / startPrice * 100).toFixed(2);

        return {
            period: {
                start: moment(data[0].timestamp).format('YYYY-MM-DD HH:mm:ss'),
                end: moment(data[data.length - 1].timestamp).format('YYYY-MM-DD HH:mm:ss'),
                duration: moment.duration(data[data.length - 1].timestamp - data[0].timestamp).humanize()
            },
            price: {
                start: startPrice,
                end: latestPrice,
                change: `${priceChange}%`,
                trend: this.stats.price.trends.dominant,
                volatility: {
                    daily: {
                        avg: this.average(this.stats.price.volatility.daily.map(v => v.volatility)),
                        max: Math.max(...this.stats.price.volatility.daily.map(v => v.volatility))
                    },
                    weekly: {
                        avg: this.average(this.stats.price.volatility.weekly.map(v => v.volatility)),
                        max: Math.max(...this.stats.price.volatility.weekly.map(v => v.volatility))
                    }
                },
                support: this.stats.price.support.slice(-5), // 最近5个支撑位
                resistance: this.stats.price.resistance.slice(-5) // 最近5个阻力位
            },
            volume: {
                trend: Object.entries(this.stats.volume.trends)
                    .sort((a, b) => b[1] - a[1])[0][0],
                spikes: this.stats.volume.spikes.length,
                significant_spikes: this.stats.volume.spikes
                    .filter(s => s.deviation > 3).length // 超过3个标准差的显著放量
            },
            patterns: {
                bullish: this.stats.patterns.bullish.length,
                bearish: this.stats.patterns.bearish.length,
                recent: [...this.stats.patterns.bullish, ...this.stats.patterns.bearish]
                    .sort((a, b) => b.timestamp - a.timestamp)
                    .slice(0, 5) // 最近5个形态
            }
        };
    }

    average(arr) {
        return arr.reduce((a, b) => a + b, 0) / arr.length;
    }
}

module.exports = new MarketAnalyzer();
