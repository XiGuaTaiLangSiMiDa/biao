const DataManager = require('./services/DataManager');
const DataPreprocessor = require('./services/DataPreprocessor');
const ModelService = require('./services/ModelService');

class Application {
    constructor() {
        this.dataManager = DataManager;
        this.preprocessor = DataPreprocessor;
        this.modelService = ModelService;
    }

    async initialize() {
        try {
            console.log('Initializing application...');
            await this.dataManager.initialize();
            console.log('Data manager initialized successfully');
        } catch (error) {
            console.error('Failed to initialize application:', error);
            throw error;
        }
    }

    async trainModel() {
        try {
            console.log('Starting model training process...');

            // 1. 获取历史数据
            console.log('Loading historical data...');
            const historicalData = await this.dataManager.loadHistoricalData();
            const trainingData = this.dataManager.getTrainingData(historicalData);

            // 2. 创建序列数据
            console.log('Creating sequences...');
            const { sequences, targets } = this.preprocessor.createSequences(trainingData);

            // 3. 数据预处理
            console.log('Preprocessing data...');
            const { sequences: scaledSequences, targets: scaledTargets } = 
                this.preprocessor.fitTransform(sequences, targets);

            // 4. 创建模型
            console.log('Creating model...');
            this.modelService.createModel();

            // 5. 训练模型
            console.log('Training model...');
            await this.modelService.trainModel(scaledSequences, scaledTargets);

            // 6. 保存模型
            console.log('Saving model...');
            await this.modelService.saveModel();

            console.log('Model training completed successfully');
        } catch (error) {
            console.error('Error during model training:', error);
            throw error;
        }
    }

    async predict() {
        try {
            // 1. 获取最新数据
            const data = await this.dataManager.updateData();
            const trainingData = this.dataManager.getTrainingData(data);

            // 2. 创建预测序列
            const { sequences } = this.preprocessor.createSequences(trainingData);
            const lastSequence = [sequences[sequences.length - 1]];

            // 3. 缩放数据
            const { sequences: scaledSequence } = this.preprocessor.transform(lastSequence);

            // 4. 预测
            const predictions = await this.modelService.predict(scaledSequence);

            // 5. 反转缩放
            const unscaledPredictions = this.preprocessor.inverseTransform(predictions);

            return {
                timestamp: Date.now(),
                predictedClose: unscaledPredictions[0]
            };
        } catch (error) {
            console.error('Error during prediction:', error);
            throw error;
        }
    }

    async updateAndPredict() {
        try {
            // 1. 更新数据
            await this.dataManager.updateData();

            // 2. 进行预测
            const prediction = await this.predict();

            return prediction;
        } catch (error) {
            console.error('Error during update and prediction:', error);
            throw error;
        }
    }
}

// 创建应用实例并导出
const app = new Application();
module.exports = app;

// 如果直接运行此文件
if (require.main === module) {
    (async () => {
        try {
            // 初始化应用
            await app.initialize();

            // 训练模型
            await app.trainModel();

            // 进行预测
            const prediction = await app.predict();
            console.log('Prediction:', prediction);

        } catch (error) {
            console.error('Application error:', error);
            process.exit(1);
        }
    })();
}
