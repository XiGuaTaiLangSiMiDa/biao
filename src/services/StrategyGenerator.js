const moment = require('moment');

class StrategyGenerator {
    constructor() {
        this.strategies = {
            trend: this.generateTrendStrategy.bind(this),
            breakout: this.generateBreakoutStrategy.bind(this),
            volumeBased: this.generateVolumeStrategy.bind(this),
            pattern: this.generatePatternStrategy.bind(this)
        };
    }

    generateStrategies(marketAnalysis) {
        const strategies = [];
        
        // 生成各类策略
        for (const [type, generator] of Object.entries(this.strategies)) {
            const strategy = generator(marketAnalysis);
            if (strategy) {
                strategies.push(strategy);
            }
        }

        // 生成组合策略
        const combinedStrategy = this.generateCombinedStrategy(strategies);
        strategies.push(combinedStrategy);

        return {
            timestamp: new Date().toISOString(),
            market: marketAnalysis.period,
            strategies: strategies
        };
    }

    generateTrendStrategy(analysis) {
        const strategy = {
            name: '趋势跟踪策略',
            type: 'trend',
            timeframe: '1h',
            description: '',
            signals: {
                entry: [],
                exit: []
            },
            riskManagement: {
                stopLoss: 0,
                takeProfit: 0
            }
        };

        // 基于波动率设置止损和止盈
        const dailyVolatility = analysis.price.volatility.daily.avg;
        strategy.riskManagement.stopLoss = Math.round(dailyVolatility * 1.5 * 100) / 100;
        strategy.riskManagement.takeProfit = Math.round(dailyVolatility * 3 * 100) / 100;

        // 根据趋势设置策略
        if (analysis.price.trend === 'uptrend') {
            strategy.description = '上升趋势策略：在回调时买入，顺势做多';
            strategy.signals.entry.push(
                '价格回调到7日均线支撑位',
                '日K线收阳且收盘价高于开盘价1%以上',
                '交易量大于3日平均交易量'
            );
            strategy.signals.exit.push(
                '价格跌破7日均线',
                '出现看跌形态',
                '交易量异常放大但价格未上涨'
            );
        } else if (analysis.price.trend === 'downtrend') {
            strategy.description = '下降趋势策略：在反弹时做空，顺势做空';
            strategy.signals.entry.push(
                '价格反弹到7日均线阻力位',
                '日K线收阴且收盘价低于开盘价1%以上',
                '交易量大于3日平均交易量'
            );
            strategy.signals.exit.push(
                '价格突破7日均线',
                '出现看涨形态',
                '交易量异常放大但价格未下跌'
            );
        } else {
            strategy.description = '震荡市策略：在支撑位买入，阻力位卖出';
            strategy.signals.entry.push(
                '价格触及近期支撑位',
                '出现看涨形态',
                'RSI低于30'
            );
            strategy.signals.exit.push(
                '价格触及近期阻力位',
                '出现看跌形态',
                'RSI高于70'
            );
        }

        return strategy;
    }

    generateBreakoutStrategy(analysis) {
        const strategy = {
            name: '突破策略',
            type: 'breakout',
            timeframe: '1h',
            description: '基于支撑位和阻力位的突破交易策略',
            signals: {
                entry: [],
                exit: []
            },
            riskManagement: {
                stopLoss: 0,
                takeProfit: 0
            }
        };

        // 设置止损和止盈
        const weeklyVolatility = analysis.price.volatility.weekly.avg;
        strategy.riskManagement.stopLoss = Math.round(weeklyVolatility * 0.5 * 100) / 100;
        strategy.riskManagement.takeProfit = Math.round(weeklyVolatility * 1.5 * 100) / 100;

        // 获取最近的支撑位和阻力位
        const recentSupport = analysis.price.support[analysis.price.support.length - 1];
        const recentResistance = analysis.price.resistance[analysis.price.resistance.length - 1];

        if (recentSupport && recentResistance) {
            strategy.signals.entry.push(
                `价格突破${recentResistance.price}阻力位，且成交量增加50%以上`,
                `价格回踩${recentSupport.price}支撑位，且出现看涨形态`
            );
            strategy.signals.exit.push(
                '价格跌破前期支撑位',
                '出现连续3根看跌K线',
                '交易量萎缩超过50%'
            );
        }

        return strategy;
    }

    generateVolumeStrategy(analysis) {
        const strategy = {
            name: '量价策略',
            type: 'volume',
            timeframe: '1h',
            description: '基于交易量和价格关系的交易策略',
            signals: {
                entry: [],
                exit: []
            },
            riskManagement: {
                stopLoss: 0,
                takeProfit: 0
            }
        };

        // 设置止损和止盈
        const dailyVolatility = analysis.price.volatility.daily.avg;
        strategy.riskManagement.stopLoss = Math.round(dailyVolatility * 2 * 100) / 100;
        strategy.riskManagement.takeProfit = Math.round(dailyVolatility * 4 * 100) / 100;

        if (analysis.volume.trend === 'increasing') {
            strategy.description += ' - 交易量上升趋势';
            strategy.signals.entry.push(
                '交易量较前一周期增加30%以上',
                '价格创新高且成交量配合',
                '连续3个周期交易量增加'
            );
        } else if (analysis.volume.trend === 'decreasing') {
            strategy.description += ' - 交易量下降趋势';
            strategy.signals.entry.push(
                '交易量触底反弹',
                '价格在支撑位企稳',
                '出现放量阳线'
            );
        }

        strategy.signals.exit.push(
            '交易量持续萎缩3个周期',
            '价格创新高但成交量未配合',
            '出现巨量阴线'
        );

        return strategy;
    }

    generatePatternStrategy(analysis) {
        const strategy = {
            name: '形态策略',
            type: 'pattern',
            timeframe: '1h',
            description: '基于K线形态的交易策略',
            signals: {
                entry: [],
                exit: []
            },
            riskManagement: {
                stopLoss: 0,
                takeProfit: 0
            }
        };

        // 设置止损和止盈
        const dailyVolatility = analysis.price.volatility.daily.avg;
        strategy.riskManagement.stopLoss = Math.round(dailyVolatility * 2 * 100) / 100;
        strategy.riskManagement.takeProfit = Math.round(dailyVolatility * 5 * 100) / 100;

        // 分析最近的形态
        const recentPatterns = analysis.patterns.recent;
        const bullishPatterns = recentPatterns.filter(p => 
            ['hammer', 'morning_star'].includes(p.type)
        );
        const bearishPatterns = recentPatterns.filter(p => 
            ['hanging_man', 'evening_star'].includes(p.type)
        );

        if (bullishPatterns.length > bearishPatterns.length) {
            strategy.description += ' - 偏向看涨形态';
            strategy.signals.entry.push(
                '出现锤子线形态',
                '出现启明星形态',
                '连续两根阳线且收盘价走高'
            );
        } else {
            strategy.description += ' - 偏向看跌形态';
            strategy.signals.entry.push(
                '出现吊人线形态',
                '出现黄昏星形态',
                '连续两根阴线且收盘价走低'
            );
        }

        strategy.signals.exit.push(
            '形态破坏',
            '与当前持仓方向相反的形态出现',
            '价格突破前期高点/低点但未能持续'
        );

        return strategy;
    }

    generateCombinedStrategy(strategies) {
        const combined = {
            name: '组合策略',
            type: 'combined',
            timeframe: '1h',
            description: '综合多个策略信号的交易策略',
            signals: {
                entry: [],
                exit: []
            },
            riskManagement: {
                stopLoss: 0,
                takeProfit: 0
            }
        };

        // 汇总所有策略的止损止盈
        const allStopLosses = strategies.map(s => s.riskManagement.stopLoss);
        const allTakeProfits = strategies.map(s => s.riskManagement.takeProfit);
        
        combined.riskManagement.stopLoss = Math.round(
            allStopLosses.reduce((a, b) => a + b, 0) / allStopLosses.length * 100
        ) / 100;
        
        combined.riskManagement.takeProfit = Math.round(
            allTakeProfits.reduce((a, b) => a + b, 0) / allTakeProfits.length * 100
        ) / 100;

        // 组合入场信号
        combined.signals.entry.push(
            '至少两个子策略同时出现买入信号',
            '价格位于支撑位且出现看涨形态',
            '交易量配合价格走势'
        );

        // 组合出场信号
        combined.signals.exit.push(
            '任一子策略出现强烈卖出信号',
            '价格突破支撑位/阻力位',
            '交易量不配合价格走势'
        );

        return combined;
    }
}

module.exports = new StrategyGenerator();
