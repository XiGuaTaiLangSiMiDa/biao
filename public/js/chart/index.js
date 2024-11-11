import ChartCore from './core.js';

class Chart extends ChartCore {
    constructor() {
        super();
        this.version = '1.0.0';
    }

    // 这里可以添加额外的方法或覆盖父类方法
    initialize(containerId) {
        try {
            super.initialize(containerId);
            console.log(`Chart initialized (v${this.version})`);
        } catch (error) {
            console.error('Failed to initialize chart:', error);
            throw error;
        }
    }
}

// 创建全局实例
window.chartManager = new Chart();

export default Chart;
