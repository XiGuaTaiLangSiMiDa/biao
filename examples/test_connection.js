const CCXTService = require('../src/services/CCXTService');
const config = require('../src/config');

async function testConnection() {
    console.log('Testing Exchange API connection...');
    console.log('Configuration:');
    console.log('- Trading Symbol:', config.SYMBOL);
    console.log('- Interval:', config.INTERVAL);
    console.log('- API Key exists:', !!config.API_KEY);
    console.log('- Secret Key exists:', !!config.SECRET_KEY);
    console.log('- Passphrase exists:', !!config.PASSPHRASE);
    
    try {
        // 初始化CCXT
        console.log('\nInitializing CCXT...');
        await CCXTService.initialize();

        // 测试API连接
        console.log('\nChecking API connection...');
        const isConnected = await CCXTService.checkConnection();
        console.log('API Connection:', isConnected ? 'Success' : 'Failed');

        if (isConnected) {
            // 获取账户信息
            console.log('\nFetching account information...');
            const balance = await CCXTService.getAccountBalance();
            console.log('Account Balance:', JSON.stringify(balance, null, 2));

            // 获取市场信息
            console.log('\nFetching market information...');
            const marketInfo = await CCXTService.getMarketInfo();
            console.log('Market Info:', JSON.stringify(marketInfo, null, 2));

            // 获取最新K线数据
            console.log('\nFetching latest kline data...');
            const latestKline = await CCXTService.getLatestKline();
            console.log('Latest Kline:', latestKline);
        }
    } catch (error) {
        console.error('\nError during connection test:', error.message);
        if (error.response) {
            console.error('API Response:', error.response.data);
        }
    }
}

// 运行测试
testConnection().catch(console.error);
