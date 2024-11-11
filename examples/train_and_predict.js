const app = require('../src');

async function main() {
    try {
        console.log('Starting application...');
        
        // 1. 初始化应用
        await app.initialize();
        console.log('Application initialized');

        // 2. 训练模型
        console.log('\nStarting model training...');
        await app.trainModel();
        console.log('Model training completed');

        // 3. 进行预测
        console.log('\nMaking prediction...');
        const prediction = await app.predict();
        console.log('Prediction result:', prediction);

        // 4. 设置定期更新和预测
        console.log('\nStarting periodic predictions...');
        setInterval(async () => {
            try {
                const newPrediction = await app.updateAndPredict();
                console.log(`[${new Date().toISOString()}] New prediction:`, newPrediction);
            } catch (error) {
                console.error('Error in periodic prediction:', error);
            }
        }, 60 * 60 * 1000); // 每小时更新一次

    } catch (error) {
        console.error('Application error:', error);
        process.exit(1);
    }
}

// 运行示例
main();
