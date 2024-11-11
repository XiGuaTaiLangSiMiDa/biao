const tf = require('@tensorflow/tfjs-node');
const path = require('path');
const fs = require('fs').promises;
const config = require('../config');

class ModelService {
    constructor() {
        this.model = null;
        this.modelPath = path.join(config.CACHE_DIR, 'model');
    }

    // 创建LSTM模型
    createModel(windowSize = config.WINDOW_SIZE, features = config.FEATURES_COUNT) {
        this.model = tf.sequential();

        // 添加LSTM层
        this.model.add(tf.layers.lstm({
            units: 50,
            returnSequences: true,
            inputShape: [windowSize, features]
        }));

        this.model.add(tf.layers.dropout(0.2));

        this.model.add(tf.layers.lstm({
            units: 30,
            returnSequences: false
        }));

        this.model.add(tf.layers.dropout(0.2));

        // 添加密集层
        this.model.add(tf.layers.dense({
            units: 1,
            activation: 'linear'
        }));

        // 编译模型
        this.model.compile({
            optimizer: tf.train.adam(0.001),
            loss: 'meanSquaredError',
            metrics: ['mse']
        });

        return this.model;
    }

    // 训练模型
    async trainModel(sequences, targets, validationSplit = config.VALIDATION_SPLIT, 
                    epochs = config.EPOCHS, batchSize = config.BATCH_SIZE) {
        if (!this.model) {
            throw new Error('Model not created. Call createModel first.');
        }

        // 确保数据维度正确
        const shape = [sequences.length, config.WINDOW_SIZE, config.FEATURES_COUNT];
        
        // 转换为张量并指定形状
        const xs = tf.tensor3d(sequences.flat(), shape);
        const ys = tf.tensor2d(targets);

        // 训练模型
        const history = await this.model.fit(xs, ys, {
            epochs,
            batchSize,
            validationSplit,
            shuffle: true,
            callbacks: {
                onEpochEnd: (epoch, logs) => {
                    console.log(`Epoch ${epoch + 1}: loss = ${logs.loss.toFixed(4)}, val_loss = ${logs.val_loss.toFixed(4)}`);
                }
            }
        });

        // 释放张量
        xs.dispose();
        ys.dispose();

        return history;
    }

    // 预测
    async predict(sequences) {
        if (!this.model) {
            throw new Error('Model not created or loaded');
        }

        const shape = [sequences.length, config.WINDOW_SIZE, config.FEATURES_COUNT];
        const xs = tf.tensor3d(sequences.flat(), shape);
        const predictions = await this.model.predict(xs).array();
        xs.dispose();

        return predictions;
    }

    // 保存模型
    async saveModel() {
        if (!this.model) {
            throw new Error('No model to save');
        }

        try {
            await fs.mkdir(this.modelPath, { recursive: true });
            await this.model.save(`file://${this.modelPath}`);
            console.log('Model saved successfully');
        } catch (error) {
            console.error('Error saving model:', error);
            throw error;
        }
    }

    // 加载模型
    async loadModel() {
        try {
            this.model = await tf.loadLayersModel(`file://${this.modelPath}/model.json`);
            console.log('Model loaded successfully');
            
            // 重新编译模型
            this.model.compile({
                optimizer: tf.train.adam(0.001),
                loss: 'meanSquaredError',
                metrics: ['mse']
            });
        } catch (error) {
            console.error('Error loading model:', error);
            throw error;
        }
    }

    // 评估模型
    async evaluate(testSequences, testTargets) {
        if (!this.model) {
            throw new Error('Model not created or loaded');
        }

        const shape = [testSequences.length, config.WINDOW_SIZE, config.FEATURES_COUNT];
        const xs = tf.tensor3d(testSequences.flat(), shape);
        const ys = tf.tensor2d(testTargets);

        const evaluation = await this.model.evaluate(xs, ys);
        const loss = await evaluation[0].data();
        const mse = await evaluation[1].data();

        // 释放张量
        xs.dispose();
        ys.dispose();
        evaluation[0].dispose();
        evaluation[1].dispose();

        return {
            loss: loss[0],
            mse: mse[0]
        };
    }
}

module.exports = new ModelService();
