const express = require('express');
const path = require('path');
const tf = require('@tensorflow/tfjs-node');
const { createFeatures, normalizeFeatures } = require('./feature_engineering');
const { loadData } = require('./data_loader');

const app = express();
const port = 3000;

app.use(express.json());
app.use(express.static('public'));

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
    const model = await loadModel();
    const { features, timestamps } = createFeatures(data);
    const normalizedFeatures = normalizeFeatures(features);

    const startIndex = timestamps.findIndex(ts => parseInt(ts) >= parseInt(startTimestamp));
    if (startIndex === -1) {
        throw new Error('Start timestamp is beyond available data');
    }

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

        inputTensor.dispose();
        prediction.dispose();
    }

    return predictions;
}

// Prediction endpoint
app.post('/predict', async (req, res) => {
    try {
        const { timestamp } = req.body;
        const data = await loadData('./cache/kline_data.json');
        const predictions = await predictMultiple(data, timestamp);
        res.json(predictions);
    } catch (error) {
        console.error('Prediction error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Serve the prediction page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../../public/predict.html'));
});

// Start server
app.listen(port, () => {
    console.log(`Prediction server running at http://localhost:${port}`);
    console.log('Loading model...');
    loadModel().then(() => {
        console.log('Ready to make predictions!');
    }).catch(err => {
        console.error('Error loading model:', err);
    });
});
