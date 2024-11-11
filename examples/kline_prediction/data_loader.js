const fs = require('fs');
const path = require('path');

async function loadData(filePath) {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    return data;
}

function prepareDataset(trainingData, markedData, timestamps) {
    const labels = timestamps.map(timestamp => {
        const marked = markedData[timestamp];
        return marked && marked.mark ? 1 : 0;
    });
    
    return labels;
}

module.exports = {
    loadData,
    prepareDataset
};
