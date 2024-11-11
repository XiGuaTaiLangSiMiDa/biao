const tf = require('@tensorflow/tfjs-node');
const { createFeatures, normalizeFeatures } = require('./feature_engineering');
const { loadData } = require('./data_loader');

async function loadModel() {
    try {
        const model = await tf.loadLayersModel('file://./cache/kline_prediction_model/model.json');
        console.log('Model loaded successfully');
        return model;
    } catch (error) {
        console.error('Error loading model:', error);
        throw error;
    }
}

async function predict(data, targetTimestamp) {
    // Load the trained model
    const model = await loadModel();

    // Process the input data
    const { features, timestamps } = createFeatures(data);
    const normalizedFeatures = normalizeFeatures(features);

    // Find the index of the target timestamp
    const targetIndex = timestamps.findIndex(ts => parseInt(ts) >= parseInt(targetTimestamp));
    if (targetIndex === -1) {
        throw new Error('Target timestamp is beyond available data');
    }

    // Convert to tensor and make prediction for the specific timestamp
    const inputTensor = tf.tensor3d([normalizedFeatures[targetIndex]]);
    const prediction = model.predict(inputTensor);
    const predictionValue = await prediction.data();

    // Cleanup tensors
    inputTensor.dispose();
    prediction.dispose();

    // Format result
    const result = {
        timestamp: timestamps[targetIndex],
        probability: predictionValue[0],
        prediction: predictionValue[0] >= 0.5 ? 1 : 0
    };

    return result;
}

// Main execution
async function main() {
    try {
        // Get timestamp from command line argument or use current time
        const targetTimestamp = process.argv[2] || Date.now().toString();
        
        // Load the kline data
        const data = await loadData('./cache/kline_data.json');
        
        // Make prediction for the specific timestamp
        const result = await predict(data, targetTimestamp);
        
        // Display result
        console.log('\nPrediction Result:');
        console.log('=================');
        const date = new Date(parseInt(result.timestamp));
        console.log(`Time: ${date.toLocaleString()}`);
        console.log(`Probability: ${(result.probability * 100).toFixed(2)}%`);
        console.log(`Prediction: ${result.prediction === 1 ? 'UP' : 'DOWN'}`);

    } catch (error) {
        console.error('Error during prediction:', error);
    }
}

// Run if called directly
if (require.main === module) {
    main();
}

module.exports = {
    predict,
    loadModel
};
