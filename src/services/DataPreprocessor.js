const tf = require('@tensorflow/tfjs-node');

class DataPreprocessor {
    constructor() {
        this.scalers = {
            features: null,
            labels: null
        };
    }

    // 创建滑动窗口序列
    createSequences(data, windowSize = 24) { // 默认24小时为一个窗口
        const sequences = [];
        const targets = [];

        for (let i = windowSize; i < data.length; i++) {
            // 获取特征窗口
            const sequence = data.slice(i - windowSize, i).map(d => d.features);
            sequences.push(sequence);

            // 使用下一个收盘价作为目标
            targets.push([data[i].features[3]]); // 收盘价索引为3
        }

        return {
            sequences,
            targets
        };
    }

    // 标准化数据
    fitTransform(sequences, targets) {
        // 将序列展平为2D数组进行缩放
        const flatSequences = sequences.reduce((acc, seq) => [...acc, ...seq], []);
        
        // 创建特征缩放器
        this.scalers.features = {
            min: tf.min(flatSequences, 0).arraySync(),
            max: tf.max(flatSequences, 0).arraySync()
        };

        // 创建标签缩放器
        this.scalers.labels = {
            min: tf.min(targets, 0).arraySync(),
            max: tf.max(targets, 0).arraySync()
        };

        // 应用缩放
        return {
            sequences: this.transformSequences(sequences),
            targets: this.transformTargets(targets)
        };
    }

    // 转换新数据
    transform(sequences, targets = null) {
        if (!this.scalers.features || (targets && !this.scalers.labels)) {
            throw new Error('Scalers not initialized. Call fitTransform first.');
        }

        const result = {
            sequences: this.transformSequences(sequences)
        };

        if (targets) {
            result.targets = this.transformTargets(targets);
        }

        return result;
    }

    // 反转标准化
    inverseTransform(predictions) {
        if (!this.scalers.labels) {
            throw new Error('Labels scaler not initialized');
        }

        const [min, max] = [this.scalers.labels.min[0], this.scalers.labels.max[0]];
        return predictions.map(pred => pred * (max - min) + min);
    }

    // 私有方法：转换序列
    transformSequences(sequences) {
        return sequences.map(sequence =>
            sequence.map(features =>
                features.map((value, i) => {
                    const min = this.scalers.features.min[i];
                    const max = this.scalers.features.max[i];
                    return (value - min) / (max - min);
                })
            )
        );
    }

    // 私有方法：转换目标值
    transformTargets(targets) {
        return targets.map(target =>
            target.map((value, i) => {
                const min = this.scalers.labels.min[i];
                const max = this.scalers.labels.max[i];
                return (value - min) / (max - min);
            })
        );
    }

    // 保存缩放器状态
    getScalerState() {
        return this.scalers;
    }

    // 加载缩放器状态
    loadScalerState(state) {
        this.scalers = state;
    }
}

module.exports = new DataPreprocessor();
