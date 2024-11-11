const tf = require('@tensorflow/tfjs-node');
const path = require('path');
const { loadData, prepareDataset } = require('./data_loader');
const { createFeatures, normalizeFeatures } = require('./feature_engineering');
const { buildModel, trainingConfig, earlyStoppingConfig } = require('./model_builder');

async function evaluateModel(model, xTest, yTest) {
    const evaluation = await model.evaluate(xTest, yTest);
    const predictions = model.predict(xTest);
    
    // Convert predictions to binary (0 or 1)
    const binaryPredictions = predictions.dataSync().map(p => p > 0.5 ? 1 : 0);
    const actualValues = yTest.dataSync();
    
    // Calculate metrics
    let truePositives = 0;
    let falsePositives = 0;
    let trueNegatives = 0;
    let falseNegatives = 0;
    
    binaryPredictions.forEach((pred, i) => {
        if (pred === 1 && actualValues[i] === 1) truePositives++;
        if (pred === 1 && actualValues[i] === 0) falsePositives++;
        if (pred === 0 && actualValues[i] === 0) trueNegatives++;
        if (pred === 0 && actualValues[i] === 1) falseNegatives++;
    });
    
    const accuracy = (truePositives + trueNegatives) / actualValues.length;
    const precision = truePositives / (truePositives + falsePositives) || 0;
    const recall = truePositives / (truePositives + falseNegatives) || 0;
    const f1Score = 2 * (precision * recall) / (precision + recall) || 0;
    
    return {
        loss: evaluation[0],
        accuracy,
        precision,
        recall,
        f1Score,
        confusionMatrix: {
            truePositives,
            falsePositives,
            trueNegatives,
            falseNegatives
        }
    };
}

async function trainModel() {
    try {
        // Load data
        console.log('Loading data...');
        const trainingData = await loadData(path.join(__dirname, '../../cache/kline_data.json'));
        const markedData = await loadData(path.join(__dirname, '../../cache/kline_data_marked.json'));
        
        // Create features
        console.log('Creating features...');
        const { features, timestamps } = createFeatures(trainingData);
        
        // Prepare labels
        const labels = prepareDataset(trainingData, markedData, timestamps);
        
        // Normalize features
        console.log('Normalizing features...');
        const normalizedFeatures = normalizeFeatures(features);
        
        // Split data into training and testing sets
        const splitIndex = Math.floor(normalizedFeatures.length * 0.8);
        
        const xTrain = tf.tensor3d(normalizedFeatures.slice(0, splitIndex));
        const yTrain = tf.tensor2d(labels.slice(0, splitIndex), [splitIndex, 1]);
        
        const xTest = tf.tensor3d(normalizedFeatures.slice(splitIndex));
        const yTest = tf.tensor2d(labels.slice(splitIndex), [labels.length - splitIndex, 1]);
        
        // Build and compile model
        console.log('Building model...');
        const model = buildModel();
        
        // Train model
        console.log('Training model...');
        await model.fit(xTrain, yTrain, {
            ...trainingConfig,
            validationData: [xTest, yTest]
        });
        
        // Evaluate model
        console.log('Evaluating model...');
        const evaluation = await evaluateModel(model, xTest, yTest);
        
        console.log('\nModel Evaluation:');
        console.log('=================');
        console.log(`Loss: ${evaluation.loss.toFixed(4)}`);
        console.log(`Accuracy: ${(evaluation.accuracy * 100).toFixed(2)}%`);
        console.log(`Precision: ${(evaluation.precision * 100).toFixed(2)}%`);
        console.log(`Recall: ${(evaluation.recall * 100).toFixed(2)}%`);
        console.log(`F1 Score: ${(evaluation.f1Score * 100).toFixed(2)}%`);
        
        console.log('\nConfusion Matrix:');
        console.log('=================');
        console.log(`True Positives: ${evaluation.confusionMatrix.truePositives}`);
        console.log(`False Positives: ${evaluation.confusionMatrix.falsePositives}`);
        console.log(`True Negatives: ${evaluation.confusionMatrix.trueNegatives}`);
        console.log(`False Negatives: ${evaluation.confusionMatrix.falseNegatives}`);
        
        // Save model
        console.log('\nSaving model...');
        await model.save('file://./cache/kline_prediction_model');
        
        // Cleanup
        xTrain.dispose();
        yTrain.dispose();
        xTest.dispose();
        yTest.dispose();
        
        console.log('\nTraining complete! Model saved to cache/kline_prediction_model');
        
    } catch (error) {
        console.error('Error during training:', error);
        throw error;
    }
}

// Run training if this file is executed directly
if (require.main === module) {
    trainModel().catch(console.error);
}

module.exports = {
    trainModel,
    evaluateModel
};
