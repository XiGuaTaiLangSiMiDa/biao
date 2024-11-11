const PredictionService = require('../src/services/PredictionService');

async function trainAndValidate() {
    try {
        console.log('开始训练模型...');
        await PredictionService.train();

        console.log('\n验证模型...');
        const validation = await PredictionService.validate();
        console.log(`验证结果:
- 总测试点数: ${validation.total}
- 正确预测数: ${validation.correct}
- 准确率: ${(validation.accuracy * 100).toFixed(2)}%`);

        // 预测最近的几个时间点
        console.log('\n预测示例:');
        const data = await PredictionService.loadData();
        const recentPoints = data.slice(-5);  // 最后5个时间点

        for (const point of recentPoints) {
            const prediction = await PredictionService.predict(point.timestamp);
            const date = new Date(point.timestamp);
            console.log(`
时间点: ${date.toLocaleString()}
- 实际标记: ${point.mark || '无标记'}
- 预测概率: ${(prediction.probability * 100).toFixed(2)}%
- 预测标记: ${prediction.predictedMark.toFixed(2)}`);
        }

    } catch (error) {
        console.error('训练或验证过程出错:', error);
    }
}

trainAndValidate();
