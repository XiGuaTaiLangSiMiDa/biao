import App from './app.js';

// 当页面加载完成时初始化应用
document.addEventListener('DOMContentLoaded', async () => {
    try {
        const app = new App();
        await app.initialize();
        console.log('Application initialized successfully');
    } catch (error) {
        console.error('Failed to initialize application:', error);
    }
});
