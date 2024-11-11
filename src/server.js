const express = require('express');
const path = require('path');
const multer = require('multer');
const DataManager = require('./services/DataManager');
const PositionsService = require('./services/PositionsService');

const app = express();
const port = process.env.PORT || 3001; // 修改默认端口为3001

// 配置multer用于处理文件上传
const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024 // 限制5MB
    }
});

// 中间件
app.use(express.json());
app.use(express.static('public'));

// API路由
// 获取K线数据
app.get('/api/klines', async (req, res) => {
    try {
        const { timeframe, start, end } = req.query;
        const data = await DataManager.loadHistoricalData();
        
        // 根据时间范围过滤数据
        let filteredData = data;
        if (start) {
            filteredData = filteredData.filter(k => k.timestamp >= parseInt(start));
        }
        if (end) {
            filteredData = filteredData.filter(k => k.timestamp <= parseInt(end));
        }

        res.json(filteredData);
    } catch (error) {
        console.error('获取K线数据失败:', error);
        res.status(500).json({ error: '获取K线数据失败' });
    }
});

// 更新K线数据
app.post('/api/klines/update', async (req, res) => {
    try {
        const data = await DataManager.updateData();
        res.json({ success: true, count: data.length });
    } catch (error) {
        console.error('更新K线数据失败:', error);
        res.status(500).json({ error: '更新K线数据失败' });
    }
});

// 获取所有标记位置
app.get('/api/positions', async (req, res) => {
    try {
        const positions = await PositionsService.getPositions();
        res.json(positions);
    } catch (error) {
        console.error('获取标记位置失败:', error);
        res.status(500).json({ error: '获取标记位置失败' });
    }
});

// 添加标记位置
app.post('/api/positions', async (req, res) => {
    try {
        const position = req.body;
        // 验证数据
        PositionsService.validatePosition(position);
        // 保存标记
        const savedPosition = await PositionsService.addPosition(position);
        res.json(savedPosition);
    } catch (error) {
        console.error('添加标记位置失败:', error);
        res.status(400).json({ error: error.message });
    }
});

// 删除标记位置
app.delete('/api/positions/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const deletedPosition = await PositionsService.deletePosition(id);
        res.json(deletedPosition);
    } catch (error) {
        console.error('删除标记位置失败:', error);
        res.status(404).json({ error: error.message });
    }
});

// 获取统计信息
app.get('/api/stats', async (req, res) => {
    try {
        const stats = await PositionsService.getStats();
        res.json(stats);
    } catch (error) {
        console.error('获取统计信息失败:', error);
        res.status(500).json({ error: '获取统计信息失败' });
    }
});

// 导出标记数据
app.get('/api/positions/export', async (req, res) => {
    try {
        const positions = await PositionsService.exportPositions();
        res.json(positions);
    } catch (error) {
        console.error('导出标记数据失败:', error);
        res.status(500).json({ error: '导出标记数据失败' });
    }
});

// 导入标记数据
app.post('/api/positions/import', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            throw new Error('没有上传文件');
        }

        const positions = JSON.parse(req.file.buffer.toString());
        const importedPositions = await PositionsService.importPositions(positions);
        res.json(importedPositions);
    } catch (error) {
        console.error('导入标记数据失败:', error);
        res.status(400).json({ error: error.message });
    }
});

// 获取训练数据
app.get('/api/training-data', async (req, res) => {
    try {
        const trainingData = await PositionsService.getTrainingData();
        res.json(trainingData);
    } catch (error) {
        console.error('获取训练数据失败:', error);
        res.status(500).json({ error: '获取训练数据失败' });
    }
});

// 启动服务器
async function startServer() {
    try {
        // 初始化服务
        await PositionsService.initialize();
        await DataManager.initialize();

        // 启动服务器
        app.listen(port, () => {
            console.log(`服务器运行在 http://localhost:${port}`);
            console.log('按 Ctrl+C 停止服务器');
        });
    } catch (error) {
        console.error('启动服务器失败:', error);
        process.exit(1);
    }
}

// 启动应用
startServer();
