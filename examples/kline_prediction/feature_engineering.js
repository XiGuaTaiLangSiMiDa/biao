const tf = require('@tensorflow/tfjs-node');

// Calculate Simple Moving Average
function calculateSMA(prices, period) {
    const sma = [];
    for (let i = 0; i < prices.length; i++) {
        if (i < period - 1) {
            sma.push(null);
            continue;
        }
        const sum = prices.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
        sma.push(sum / period);
    }
    return sma;
}

// Calculate Relative Strength Index
function calculateRSI(prices, period = 14) {
    const changes = prices.slice(1).map((price, i) => price - prices[i]);
    const gains = changes.map(change => change > 0 ? change : 0);
    const losses = changes.map(change => change < 0 ? -change : 0);

    const avgGain = calculateSMA(gains, period);
    const avgLoss = calculateSMA(losses, period);

    const rsi = avgGain.map((gain, i) => {
        if (gain === null) return null;
        const loss = avgLoss[i];
        if (loss === 0) return 100;
        const rs = gain / loss;
        return 100 - (100 / (1 + rs));
    });

    return rsi;
}

// Calculate MACD
function calculateMACD(prices, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
    const fastEMA = calculateEMA(prices, fastPeriod);
    const slowEMA = calculateEMA(prices, slowPeriod);
    const macdLine = fastEMA.map((fast, i) => {
        if (fast === null || slowEMA[i] === null) return null;
        return fast - slowEMA[i];
    });
    
    const signalLine = calculateEMA(macdLine.filter(x => x !== null), signalPeriod);
    return { macdLine, signalLine };
}

// Calculate Exponential Moving Average
function calculateEMA(prices, period) {
    const multiplier = 2 / (period + 1);
    const ema = [];
    
    for (let i = 0; i < prices.length; i++) {
        if (i < period - 1) {
            ema.push(null);
            continue;
        }
        if (i === period - 1) {
            const sma = prices.slice(0, period).reduce((a, b) => a + b, 0) / period;
            ema.push(sma);
            continue;
        }
        ema.push((prices[i] - ema[i-1]) * multiplier + ema[i-1]);
    }
    return ema;
}

// Calculate Bollinger Bands
function calculateBollingerBands(prices, period = 20, stdDev = 2) {
    const sma = calculateSMA(prices, period);
    const bands = sma.map((ma, i) => {
        if (ma === null) return { upper: null, middle: null, lower: null };
        
        const slice = prices.slice(i - period + 1, i + 1);
        const std = Math.sqrt(slice.reduce((sum, price) => {
            return sum + Math.pow(price - ma, 2);
        }, 0) / period);
        
        return {
            upper: ma + (stdDev * std),
            middle: ma,
            lower: ma - (stdDev * std)
        };
    });
    
    return bands;
}

function createFeatures(data) {
    const timestamps = Object.keys(data).sort();
    const features = [];
    const lookback = 10;

    // Extract price and volume data
    const closes = timestamps.map(t => data[t].close);
    const volumes = timestamps.map(t => data[t].volume);

    // Calculate technical indicators
    const rsi = calculateRSI(closes);
    const { macdLine, signalLine } = calculateMACD(closes);
    const bollingerBands = calculateBollingerBands(closes);
    const sma5 = calculateSMA(closes, 5);
    const sma10 = calculateSMA(closes, 10);

    for (let i = lookback; i < timestamps.length; i++) {
        const window = [];
        
        // Get previous lookback candles with technical indicators
        for (let j = i - lookback; j < i; j++) {
            const candle = data[timestamps[j]];
            const bb = bollingerBands[j];
            
            window.push([
                candle.open,
                candle.high,
                candle.low,
                candle.close,
                candle.volume,
                rsi[j] || 0,
                macdLine[j] || 0,
                signalLine[j] || 0,
                bb ? bb.upper : 0,
                bb ? bb.lower : 0,
                sma5[j] || 0,
                sma10[j] || 0,
                // Price changes
                j > 0 ? (candle.close - data[timestamps[j-1]].close) / data[timestamps[j-1]].close : 0,
                // Volume changes
                j > 0 ? (candle.volume - data[timestamps[j-1]].volume) / data[timestamps[j-1]].volume : 0
            ]);
        }
        features.push(window);
    }

    return {
        features: features,
        timestamps: timestamps.slice(lookback)
    };
}

function normalizeFeatures(features) {
    return tf.tidy(() => {
        // Convert to tensor
        const featuresTensor = tf.tensor3d(features);
        
        // Calculate statistics along time and batch dimensions
        const meanTensor = tf.mean(featuresTensor, [0, 1]);
        const squaredDiffs = tf.square(tf.sub(featuresTensor, meanTensor));
        const variance = tf.mean(squaredDiffs, [0, 1]);
        const stdTensor = tf.sqrt(tf.add(variance, tf.scalar(1e-8)));
        
        // Get the values as arrays
        const means = meanTensor.arraySync();
        const stds = stdTensor.arraySync();
        
        // Normalize features
        const normalizedFeatures = features.map(window => {
            return window.map(candle => {
                return candle.map((value, index) => {
                    return (value - means[index]) / stds[index];
                });
            });
        });
        
        // Cleanup tensors
        meanTensor.dispose();
        variance.dispose();
        stdTensor.dispose();
        squaredDiffs.dispose();
        featuresTensor.dispose();
        
        return normalizedFeatures;
    });
}

module.exports = {
    createFeatures,
    normalizeFeatures,
    calculateRSI,
    calculateMACD,
    calculateBollingerBands,
    calculateSMA,
    calculateEMA
};
