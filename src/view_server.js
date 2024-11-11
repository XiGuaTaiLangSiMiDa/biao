const express = require('express');
const path = require('path');

const app = express();
const port = 3003;

// 静态文件服务
app.use(express.static('public'));
app.use('/cache', express.static('cache'));

// 启动服务器
app.listen(port, () => {
    console.log(`查看服务器运行在 http://localhost:${port}/view_marked.html`);
    console.log('按 Ctrl+C 停止服务器');
});
