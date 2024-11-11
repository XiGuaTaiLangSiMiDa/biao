require('dotenv').config();

module.exports = {
    // OKX API configuration
    API_URL: 'https://aws.okx.com',
    API_KEY: process.env.OKX_API_KEY,
    SECRET_KEY: process.env.OKX_SECRET_KEY,
    PASSPHRASE: process.env.OKX_PASSPHRASE,
    
    // Trading configuration
    SYMBOL: process.env.TRADING_SYMBOL || 'SOL-USDT-SWAP',
    INTERVAL: process.env.TRADING_INTERVAL || '1h',  // CCXT格式: 1m, 1h, 1d
    
    // Cache settings
    CACHE_DIR: process.env.CACHE_DIR || './cache',
    CACHE_FILE: process.env.CACHE_FILE || 'kline_data.json',
    
    // Time settings
    ONE_YEAR_MS: 365 * 24 * 60 * 60 * 1000,
    ONE_HOUR_MS: 60 * 60 * 1000,

    // Model configuration
    WINDOW_SIZE: parseInt(process.env.WINDOW_SIZE) || 24,
    FEATURES_COUNT: parseInt(process.env.FEATURES_COUNT) || 5,
    EPOCHS: parseInt(process.env.EPOCHS) || 50,
    BATCH_SIZE: parseInt(process.env.BATCH_SIZE) || 32,
    VALIDATION_SPLIT: parseFloat(process.env.VALIDATION_SPLIT) || 0.2,

    // Request configuration
    REQUEST_TIMEOUT: parseInt(process.env.REQUEST_TIMEOUT) || 30000,
    MAX_RETRIES: parseInt(process.env.MAX_RETRIES) || 3,
    RETRY_DELAY: parseInt(process.env.RETRY_DELAY) || 1000,

    // API Limits
    MAX_CANDLES_PER_REQUEST: 100,  // OKX API限制每次请求最多返回100条数据
    RATE_LIMIT_PER_SECOND: 20      // API速率限制
};
