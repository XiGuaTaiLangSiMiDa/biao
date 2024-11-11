const tf = require('@tensorflow/tfjs-node');

// Custom attention layer
class AttentionLayer {
    constructor(units) {
        this.units = units;
    }

    apply(inputs) {
        const [sequence, state] = inputs;
        
        // Create attention weights
        const weights = tf.tidy(() => {
            const scoreLayer = tf.layers.dense({units: this.units, activation: 'tanh'});
            const scores = scoreLayer.apply(sequence);
            const attention = tf.layers.dense({units: 1, activation: 'softmax'}).apply(scores);
            return attention;
        });

        // Apply attention weights to sequence
        const context = tf.mul(sequence, weights);
        const attended = tf.sum(context, 1);

        return attended;
    }
}

function buildModel(config = {}) {
    const {
        lookback = 10,
        featureCount = 14,  // Updated for new features
        lstmUnits = 64,
        denseUnits = 32,
        dropoutRate = 0.2
    } = config;

    const model = tf.sequential();

    // First LSTM layer with return sequences
    model.add(tf.layers.lstm({
        units: lstmUnits,
        returnSequences: true,
        inputShape: [lookback, featureCount]
    }));
    
    model.add(tf.layers.dropout({ rate: dropoutRate }));

    // Second LSTM layer with return sequences
    model.add(tf.layers.lstm({
        units: lstmUnits,
        returnSequences: true
    }));
    
    model.add(tf.layers.dropout({ rate: dropoutRate }));

    // Third LSTM layer
    model.add(tf.layers.lstm({
        units: lstmUnits,
        returnSequences: false
    }));

    // Dense layers for feature extraction
    model.add(tf.layers.dense({
        units: denseUnits,
        activation: 'relu'
    }));
    
    model.add(tf.layers.dropout({ rate: dropoutRate }));

    // Additional dense layer for better feature abstraction
    model.add(tf.layers.dense({
        units: Math.floor(denseUnits / 2),
        activation: 'relu'
    }));

    // Output layer
    model.add(tf.layers.dense({
        units: 1,
        activation: 'sigmoid'
    }));

    // Compile model with custom metrics
    model.compile({
        optimizer: tf.train.adam(0.001),
        loss: 'binaryCrossentropy',
        metrics: ['accuracy', 'precision', 'recall']
    });

    return model;
}

// Custom training configuration
const trainingConfig = {
    batchSize: 32,
    epochs: 50,
    validationSplit: 0.2,
    shuffle: true,
    callbacks: {
        onEpochEnd: (epoch, logs) => {
            console.log(
                `Epoch ${epoch + 1}: ` +
                `loss = ${logs.loss.toFixed(4)}, ` +
                `acc = ${logs.acc.toFixed(4)}, ` +
                `val_loss = ${logs.val_loss.toFixed(4)}, ` +
                `val_acc = ${logs.val_acc.toFixed(4)}`
            );
        }
    }
};

// Early stopping configuration
const earlyStoppingConfig = {
    monitor: 'val_loss',
    minDelta: 0.001,
    patience: 5,
    verbose: 1,
    mode: 'min'
};

module.exports = {
    buildModel,
    trainingConfig,
    earlyStoppingConfig
};
