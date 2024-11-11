const tf = require('@tensorflow/tfjs-node');
const fs = require('fs').promises;
const path = require('path');
const config = require('../config');

class PredictionService {
    constructor() {
        this.model = null;
        this.windowSize = 10; // 使用前10个时间点的数据来预测
        this.features = ['open', 'high', 'low', 'close', 'volume'];
        this.cacheDir = config.CACHE_DIR;
    }

    async loadData() {
        // 加载原始数据
        const rawData = JSON.parse(
            await fs.readFile(path.join(this.cacheDir, 'kline_data.json'), 'utf8')
        );

        // 加载标记数据
        const markedData = JSON.parse(
            await fs.readFile(path.join(this.cacheDir, 'kline_data_marked.json'), 'utf8')
        );

        // 转换为数组并排序
        const data = Object.entries(rawData)
            .map(([timestamp, item]) => ({
                timestamp: parseInt(timestamp),
                ...item,
                mark: markedData[timestamp]?.mark || 0
            }))
            .sort((a, b) => a.timestamp - b.timestamp);

        return data;
    }

    preprocessData(data) {
        const windows = [];
        const labels = [];

        // 创建滑动窗口
        for (let i = 0; i < data.length - this.windowSize; i++) {
            const window = data.slice(i, i + this.windowSize);
            const nextPoint = data[i + this.windowSize];

            // 提取特征
            const windowFeatures = window.map(item => 
                this.features.map(feature => parseFloat(item[feature]))
            );

            windows.push(windowFeatures);
            labels.push([
                nextPoint.mark !== 0 ? 1 : 0,  // 是否有标记
                nextPoint.mark || 0            // 标记值
            ]);
        }

        // 转换为张量
        const xs = tf.tensor3d(windows);
        const ys = tf.tensor2d(labels);

        // 标准化
        const normalizedXs = this.normalize(xs);

        return {
            xs: normalizedXs,
            ys
        };
    }

    normalize(tensor) {
        const min = tensor.min();
        const max = tensor.max();
        return tensor.sub(min).div(max.sub(min));
    }

    buildModel() {
        const model = tf.sequential();

        // 添加LSTM层
        model.add(tf.layers.lstm({
            units: 50,
            returnSequences: false,
            inputShape: [this.windowSize, this.features.length]
        }));

        // 添加Dense层
        model.add(tf.layers.dense({
            units: 30,
            activation: 'relu'
        }));

        // 输出层
        model.add(tf.layers.dense({
            units: 2,
            activation: 'linear'
        }));

        // 编译模型
        model.compile({
            optimizer: tf.train.adam(0.001),
            loss: 'meanSquaredError'
        });

        return model;
    }

    async train() {
        console.log('加载数据...');
        const data = await this.loadData();

        console.log('预处理数据...');
        const { xs, ys } = this.preprocessData(data);

        // 分割训练集和验证集
        const splitIndex = Math.floor(xs.shape[0] * 0.8);
        const trainXs = xs.slice([0, 0, 0], [splitIndex, -1, -1]);
        const trainYs = ys.slice([0, 0], [splitIndex, -1]);
        const valXs = xs.slice([splitIndex, 0, 0], [-1, -1, -1]);
        const valYs = ys.slice([splitIndex, 0], [-1, -1]);

        console.log('构建模型...');
        this.model = this.buildModel();

        console.log('开始训练...');
        await this.model.fit(trainXs, trainYs, {
            epochs: 50,
            batchSize: 32,
            validationData: [valXs, valYs],
            callbacks: {
                onEpochEnd: (epoch, logs) => {
                    console.log(`Epoch ${epoch + 1}: loss = ${logs.loss.toFixed(4)}, val_loss = ${logs.val_loss.toFixed(4)}`);
                }
            }
        });

        console.log('训练完成');
    }

    async predict(timepoint) {
        if (!this.model) {
            throw new Error('模型未训练');
        }

        const data = await this.loadData();
        
        // 找到时间点的索引
        const index = data.findIndex(item => item.timestamp === timepoint);
        if (index === -1 || index < this.windowSize) {
            throw new Error('无效的时间点或数据不足');
        }

        // 获取预测窗口
        const window = data.slice(index - this.windowSize, index);
        
        // 提取特征
        const windowFeatures = window.map(item => 
            this.features.map(feature => parseFloat(item[feature]))
        );

        // 转换为张量并标准化
        const input = this.normalize(tf.tensor3d([windowFeatures]));

        // 预测
        const prediction = this.model.predict(input);
        const [hasMarkProb, markValue] = await prediction.data();

        return {
            timestamp: timepoint,
            probability: hasMarkProb,
            predictedMark: markValue
        };
    }

    async validate() {
        if (!this.model) {
            throw new Error('模型未训练');
        }

        const data = await this.loadData();
        const markedPoints = data.filter(item => item.mark !== 0);

        let correct = 0;
        let total = 0;

        for (const point of markedPoints) {
            try {
                const prediction = await this.predict(point.timestamp);
                
                // 如果预测值的符号和实际值的符号相同，认为预测正确
                if (Math.sign(prediction.predictedMark) === Math.sign(point.mark)) {
                    correct++;
                }
                total++;
            } catch (error) {
                console.log(`跳过时间点 ${point.timestamp}: ${error.message}`);
            }
        }

        return {
            accuracy: correct / total,
            total,
            correct
        };
    }
}

module.exports = new PredictionService();
