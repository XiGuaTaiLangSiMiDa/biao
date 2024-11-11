const DataManager = require('../src/services/DataManager');
const MarketAnalyzer = require('../src/services/MarketAnalyzer');
const StrategyGenerator = require('../src/services/StrategyGenerator');
const moment = require('moment');

function formatNumber(num) {
    return num.toLocaleString('en-US', { maximumFractionDigits: 2 });
}

function calculateStats(data) {
    if (!data || data.length === 0) return null;

    const opens = data.map(k => k.open);
    const highs = data.map(k => k.high);
    const lows = data.map(k => k.low);
    const closes = data.map(k => k.close);
    const volumes = data.map(k => k.volume);

    return {
        count: data.length,
        startTime: moment(data[0].timestamp).format('YYYY-MM-DD HH:mm:ss'),
        endTime: moment(data[data.length - 1].timestamp).format('YYYY-MM-DD HH:mm:ss'),
        timeRange: moment.duration(data[data.length - 1].timestamp - data[0].timestamp).humanize(),
        price: {
            open: {
                min: Math.min(...opens),
                max: Math.max(...opens),
                avg: opens.reduce((a, b) => a + b, 0) / opens.length
            },
            high: {
                min: Math.min(...highs),
                max: Math.max(...highs),
                avg: highs.reduce((a, b) => a + b, 0) / highs.length
            },
            low: {
                min: Math.min(...lows),
                max: Math.max(...lows),
                avg: lows.reduce((a, b) => a + b, 0) / lows.length
            },
            close: {
                min: Math.min(...closes),
                max: Math.max(...closes),
                avg: closes.reduce((a, b) => a + b, 0) / closes.length
            }
        },
        volume: {
            min: Math.min(...volumes),
            max: Math.max(...volumes),
            avg: volumes.reduce((a, b) => a + b, 0) / volumes.length,
            total: volumes.reduce((a, b) => a + b, 0)
        }
    };
}

async function updateData() {
    try {
        console.log('正在初始化数据管理器...');
        await DataManager.initialize();

        console.log(`\n交易对: ${process.env.TRADING_SYMBOL}`);
        console.log(`时间间隔: ${process.env.TRADING_INTERVAL}`);

        // 加载历史数据
        console.log('\n正在获取历史数据...');
        const historicalData = await DataManager.loadHistoricalData();
        
        // 显示基础数据统计
        const stats = calculateStats(historicalData);
        if (stats) {
            console.log('\n基础数据统计:');
            console.log(`- 数据点数量: ${formatNumber(stats.count)}`);
            console.log(`- 开始时间: ${stats.startTime}`);
            console.log(`- 结束时间: ${stats.endTime}`);
            console.log(`- 时间范围: ${stats.timeRange}`);
            
            // 计算数据完整性
            const expectedPoints = Math.floor((moment(stats.endTime).diff(moment(stats.startTime)) / (60 * 60 * 1000))) + 1;
            const completeness = (stats.count / expectedPoints * 100).toFixed(2);
            console.log(`- 数据完整性: ${completeness}%`);

            console.log('\n价格统计:');
            console.log('开盘价:');
            console.log(`  最低: ${formatNumber(stats.price.open.min)}`);
            console.log(`  最高: ${formatNumber(stats.price.open.max)}`);
            console.log(`  平均: ${formatNumber(stats.price.open.avg)}`);
            
            console.log('收盘价:');
            console.log(`  最低: ${formatNumber(stats.price.close.min)}`);
            console.log(`  最高: ${formatNumber(stats.price.close.max)}`);
            console.log(`  平均: ${formatNumber(stats.price.close.avg)}`);

            console.log('\n交易量统计:');
            console.log(`  最低: ${formatNumber(stats.volume.min)}`);
            console.log(`  最高: ${formatNumber(stats.volume.max)}`);
            console.log(`  平均: ${formatNumber(stats.volume.avg)}`);
            console.log(`  总量: ${formatNumber(stats.volume.total)}`);
        }

        // 市场分析
        console.log('\n正在进行市场分析...');
        const marketAnalysis = MarketAnalyzer.analyze(historicalData);
        
        console.log('\n市场分析报告:');
        console.log(`时间周期: ${marketAnalysis.period.start} -> ${marketAnalysis.period.end} (${marketAnalysis.period.duration})`);
        
        console.log('\n价格趋势:');
        console.log(`- 总体趋势: ${marketAnalysis.price.trend}`);
        console.log(`- 价格变化: ${marketAnalysis.price.change}`);
        console.log('波动性:');
        console.log(`- 日均波动率: ${formatNumber(marketAnalysis.price.volatility.daily.avg)}%`);
        console.log(`- 最大日波动: ${formatNumber(marketAnalysis.price.volatility.daily.max)}%`);
        console.log(`- 周均波动率: ${formatNumber(marketAnalysis.price.volatility.weekly.avg)}%`);
        
        console.log('\n支撑位和阻力位:');
        if (marketAnalysis.price.support.length > 0) {
            console.log('最近支撑位:');
            marketAnalysis.price.support.forEach(s => 
                console.log(`  ${moment(s.timestamp).format('YYYY-MM-DD HH:mm:ss')}: ${formatNumber(s.price)}`)
            );
        }
        if (marketAnalysis.price.resistance.length > 0) {
            console.log('最近阻力位:');
            marketAnalysis.price.resistance.forEach(r => 
                console.log(`  ${moment(r.timestamp).format('YYYY-MM-DD HH:mm:ss')}: ${formatNumber(r.price)}`)
            );
        }

        console.log('\n交易量分析:');
        console.log(`- 交易量趋势: ${marketAnalysis.volume.trend}`);
        console.log(`- 显著放量次数: ${marketAnalysis.volume.significant_spikes}`);

        console.log('\n形态分析:');
        console.log(`- 看涨形态: ${marketAnalysis.patterns.bullish}`);
        console.log(`- 看跌形态: ${marketAnalysis.patterns.bearish}`);
        if (marketAnalysis.patterns.recent.length > 0) {
            console.log('最近形态:');
            marketAnalysis.patterns.recent.forEach(p => 
                console.log(`  ${moment(p.timestamp).format('YYYY-MM-DD HH:mm:ss')}: ${p.type}`)
            );
        }

        // 生成交易策略
        console.log('\n正在生成交易策略...');
        const strategyResult = StrategyGenerator.generateStrategies(marketAnalysis);
        
        console.log('\n交易策略建议:');
        strategyResult.strategies.forEach(strategy => {
            console.log(`\n${strategy.name} (${strategy.type}):`);
            console.log(`描述: ${strategy.description}`);
            
            console.log('入场信号:');
            strategy.signals.entry.forEach(signal => console.log(`- ${signal}`));
            
            console.log('出场信号:');
            strategy.signals.exit.forEach(signal => console.log(`- ${signal}`));
            
            console.log('风险管理:');
            console.log(`- 止损: ${strategy.riskManagement.stopLoss}%`);
            console.log(`- 止盈: ${strategy.riskManagement.takeProfit}%`);
        });

        // 更新数据
        console.log('\n正在检查更新...');
        const updatedData = await DataManager.updateData();
        
        // 显示新增数据统计
        if (updatedData.length > historicalData.length) {
            const newDataPoints = updatedData.length - historicalData.length;
            console.log(`\n新增数据点: ${newDataPoints}`);
            
            // 显示最新数据点
            const latestPoint = updatedData[updatedData.length - 1];
            console.log('\n最新数据点:');
            console.log(`- 时间: ${moment(latestPoint.timestamp).format('YYYY-MM-DD HH:mm:ss')}`);
            console.log(`- 开盘价: ${formatNumber(latestPoint.open)}`);
            console.log(`- 最高价: ${formatNumber(latestPoint.high)}`);
            console.log(`- 最低价: ${formatNumber(latestPoint.low)}`);
            console.log(`- 收盘价: ${formatNumber(latestPoint.close)}`);
            console.log(`- 交易量: ${formatNumber(latestPoint.volume)}`);
        } else {
            console.log('\n数据已是最新');
        }

    } catch (error) {
        console.error('更新数据时发生错误:', error);
        throw error;
    }
}

// 如果直接运行此文件
if (require.main === module) {
    updateData().catch(error => {
        console.error('程序执行错误:', error);
        process.exit(1);
    });
}

module.exports = updateData;
