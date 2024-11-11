const tf = require('@tensorflow/tfjs-node');
const path = require('path');
const { loadData, prepareDataset } = require('./data_loader');
const { createFeatures, normalizeFeatures } = require('./feature_engineering');
const { 
    buildModel, 
    trainingConfig, 
    calculatePrecision, 
    calculateRecall 
} = require('./model_builder');

async function evaluateModel(model, xTest, yTest) {
    const evaluation = await model.evaluate(xTest, yTest);
    const predictions = model.predict(xTest);
    
    // Get raw predictions and labels
    const predictionValues = predictions.dataSync();
    const actualValues = yTest.dataSync();
    
    // Calculate metrics
    const precision = calculatePrecision(predictionValues, actualValues);
    const recall = calculateRecall(predictionValues, actualValues);
    const f1Score = 2 * (precision * recall) / (precision + recall) || 0;
    
    // Calculate confusion matrix
    let truePositives = 0;
    let falsePositives = 0;
    let trueNegatives = 0;
    let falseNegatives = 0;
    
    predictionValues.forEach((pred, i) => {
        const binaryPred = pred >= 0.5 ? 1 : 0;
        if (binaryPred === 1 && actualValues[i] === 1) truePositives++;
        if (binaryPred === 1 && actualValues[i] === 0) falsePositives++;
        if (binaryPred === 0 && actualValues[i] === 0) trueNegatives++;
        if (binaryPred === 0 && actualValues[i] === 1) falseNegatives++;
    });
    
    // Cleanup
    predictions.dispose();
    
    return {
        loss: evaluation[0].dataSync()[0],
        accuracy: evaluation[1].dataSync()[0],
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
        const history = await model.fit(xTrain, yTrain, {
            ...trainingConfig,
            validationData: [xTest, yTest]
        });
        
        // Evaluate model
        console.log('\nEvaluating model...');
        const evaluation = await evaluateModel(model, xTest, yTest);
        
        // Print training history
        console.log('\nTraining History:');
        console.log('================');
        console.log('Final training metrics:');
        console.log(`Loss: ${history.history.loss[history.history.loss.length - 1].toFixed(4)}`);
        console.log(`Accuracy: ${(history.history.acc[history.history.acc.length - 1] * 100).toFixed(2)}%`);
        
        console.log('\nModel Evaluation:');
        console.log('================');
        console.log(`Test Loss: ${evaluation.loss.toFixed(4)}`);
        console.log(`Test Accuracy: ${(evaluation.accuracy * 100).toFixed(2)}%`);
        console.log(`Test Precision: ${(evaluation.precision * 100).toFixed(2)}%`);
        console.log(`Test Recall: ${(evaluation.recall * 100).toFixed(2)}%`);
        console.log(`Test F1 Score: ${(evaluation.f1Score * 100).toFixed(2)}%`);
        
        console.log('\nConfusion Matrix:');
        console.log('================');
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
