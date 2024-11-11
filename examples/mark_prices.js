const PriceMarkService = require('../src/services/PriceMarkService');

async function markPrices() {
    try {
        console.log('开始标记价格变动...');
        const results = await PriceMarkService.markPriceChanges();
        
        // 统计标记结果
        const stats = {
            total: results.length,
            marked: results.filter(r => r.mark !== 0).length,
            marks: {}
        };

        // 统计各类标记的数量
        results.forEach(r => {
            if (r.mark !== 0) {
                stats.marks[r.mark] = (stats.marks[r.mark] || 0) + 1;
            }
        });

        console.log('\n标记统计:');
        console.log(`- 总数据点: ${stats.total}`);
        console.log(`- 标记点数: ${stats.marked}`);
        console.log('\n各类标记数量:');
        Object.entries(stats.marks)
            .sort((a, b) => b[0] - a[0])
            .forEach(([mark, count]) => {
                const type = mark > 0 ? '上涨' : '下跌';
                const percent = Math.abs(mark);
                console.log(`- ${type}${percent}%: ${count}个`);
            });

        console.log('\n标记完成');
    } catch (error) {
        console.error('标记失败:', error);
        process.exit(1);
    }
}

markPrices();
