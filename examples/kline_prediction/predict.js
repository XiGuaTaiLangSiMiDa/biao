const tf = require('@tensorflow/tfjs-node');
const { createFeatures, normalizeFeatures } = require('./feature_engineering');
const { loadData } = require('./data_loader');

let modelInstance = null;

async function loadModel() {
    if (modelInstance) return modelInstance;
    
    try {
        modelInstance = await tf.loadLayersModel('file://./cache/kline_prediction_model/model.json');
        console.log('Model loaded successfully');
        return modelInstance;
    } catch (error) {
        console.error('Error loading model:', error);
        throw error;
    }
}

async function predictMultiple(data, startTimestamp, count = 5) {
    // Load the trained model
    const model = await loadModel();

    // Process the input data
    const { features, timestamps } = createFeatures(data);
    const normalizedFeatures = normalizeFeatures(features);

    // Find the starting index
    const startIndex = timestamps.findIndex(ts => parseInt(ts) >= parseInt(startTimestamp));
    if (startIndex === -1) {
        throw new Error('Start timestamp is beyond available data');
    }

    // Get predictions for the next 'count' periods
    const predictions = [];
    for (let i = 0; i < count && (startIndex + i) < timestamps.length; i++) {
        const index = startIndex + i;
        const inputTensor = tf.tensor3d([normalizedFeatures[index]]);
        const prediction = model.predict(inputTensor);
        const predictionValue = await prediction.data();

        predictions.push({
            timestamp: timestamps[index],
            probability: predictionValue[0],
            prediction: predictionValue[0] >= 0.5 ? 1 : 0
        });

        // Cleanup tensors
        inputTensor.dispose();
        prediction.dispose();
    }

    return predictions;
}

// Main execution if run directly
async function main() {
    try {
        const targetTimestamp = process.argv[2] || Date.now().toString();
        const data = await loadData('./cache/kline_data.json');
        const predictions = await predictMultiple(data, targetTimestamp);
        
        console.log('\nPrediction Results:');
        console.log('==================');
        predictions.forEach(result => {
            const date = new Date(parseInt(result.timestamp));
            console.log(`Time: ${date.toLocaleString()}`);
            console.log(`Probability: ${(result.probability * 100).toFixed(2)}%`);
            console.log(`Prediction: ${result.prediction === 1 ? 'UP' : 'DOWN'}`);
            console.log('------------------');
        });

    } catch (error) {
        console.error('Error during prediction:', error);
    }
}

if (require.main === module) {
    main();
}

module.exports = {
    predictMultiple,
    loadModel
};
