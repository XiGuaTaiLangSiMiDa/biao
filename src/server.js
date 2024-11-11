const express = require('express');
const cors = require('cors');
const CCXTService = require('./services/CCXTService');
const KlineService = require('./services/KlineService');
const PositionsService = require('./services/PositionsService');

const app = express();
const port = 3001;

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// 初始化服务
async function initializeServices() {
    try {
        await CCXTService.initialize();
        console.log('CCXT初始化成功');
        
        await KlineService.initialize();
        console.log('K线服务初始化成功');
        
        await PositionsService.initialize();
        console.log('标记服务初始化成功');
    } catch (error) {
        console.error('服务初始化失败:', error);
        process.exit(1);
    }
}

// K线数据路由
app.get('/klines', async (req, res) => {
    try {
        const { timeframe, start, end } = req.query;
        const data = await KlineService.getKlines(timeframe, parseInt(start), parseInt(end));
        res.json(data);
    } catch (error) {
        console.error('获取K线数据失败:', error);
        res.status(500).json({ error: '获取K线数据失败', details: error.message });
    }
});

app.post('/update-klines', async (req, res) => {
    try {
        console.log('开始加载历史数据...');
        await CCXTService.loadHistoricalData();
        res.json({ message: '数据更新成功' });
    } catch (error) {
        console.error('更新K线数据失败:', error);
        res.status(500).json({ error: '更新K线数据失败', details: error.message });
    }
});

// 标记位置路由
app.get('/positions', async (req, res) => {
    try {
        const positions = await PositionsService.getPositions();
        res.json(positions);
    } catch (error) {
        console.error('获取标记位置失败:', error);
        res.status(500).json({ error: '获取标记位置失败', details: error.message });
    }
});

app.post('/positions', async (req, res) => {
    try {
        const position = await PositionsService.addPosition(req.body);
        res.status(201).json(position);
    } catch (error) {
        console.error('添加标记位置失败:', error);
        res.status(500).json({ error: '添加标记位置失败', details: error.message });
    }
});

app.delete('/positions/:id', async (req, res) => {
    try {
        const position = await PositionsService.deletePosition(req.params.id);
        res.json(position);
    } catch (error) {
        console.error('删除标记位置失败:', error);
        res.status(500).json({ error: '删除标记位置失败', details: error.message });
    }
});

app.put('/positions/:id', async (req, res) => {
    try {
        const position = await PositionsService.updatePosition(req.params.id, req.body);
        res.json(position);
    } catch (error) {
        console.error('更新标记位置失败:', error);
        res.status(500).json({ error: '更新标记位置失败', details: error.message });
    }
});

// 启动服务器
initializeServices().then(() => {
    app.listen(port, () => {
        console.log(`服务器运行在 http://localhost:${port}`);
        console.log('按 Ctrl+C 停止服务器');
    });
});

// 优雅退出
process.on('SIGINT', () => {
    console.log('\n正在关闭服务器...');
    process.exit(0);
});
