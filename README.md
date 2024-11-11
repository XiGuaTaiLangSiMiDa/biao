# OKX K线数据分析和策略生成系统

## 功能特点

- 使用CCXT库获取OKX交易所的K线数据
- 自动数据验证和修复
- 市场分析和指标计算
- 自动交易策略生成
- 数据本地缓存和增量更新

## 安装

```bash
npm install
```

## 配置

1. 复制`.env.example`为`.env`
2. 填写以下配置：
   - OKX API密钥
   - 交易对设置
   - 其他参数

## 使用方法

### 测试API连接

```bash
npm run test:connection
```

### 更新数据并生成分析报告

```bash
npm run data:update
```

### 训练预测模型

```bash
npm run train
```

## 系统组件

### 数据服务

- CCXTService: 与OKX交易所交互
- CacheService: 本地数据缓存管理
- DataValidator: 数据验证和修复

### 分析服务

- MarketAnalyzer: 市场分析和指标计算
- DataPreprocessor: 数据预处理
- ModelService: 机器学习模型

### 策略生成

- StrategyGenerator: 自动生成交易策略
- 支持的策略类型：
  - 趋势跟踪策略
  - 突破策略
  - 量价策略
  - 形态策略
  - 组合策略

## 数据分析报告

系统生成的分析报告包括：

1. 基础数据统计
   - 数据点数量和完整性
   - 价格统计（最高、最低、平均）
   - 交易量统计

2. 市场分析
   - 价格趋势
   - 波动性分析
   - 支撑和阻力位
   - 交易量分析
   - K线形态识别

3. 策略建议
   - 入场信号
   - 出场信号
   - 风险管理参数

## 开发计划

- [ ] 实时数据更新
- [ ] 回测系统
- [ ] 策略性能评估
- [ ] Web界面
- [ ] 自动交易执行

## 注意事项

1. API限制
   - 请注意OKX API的调用频率限制
   - 建议使用适当的请求间隔

2. 风险提示
   - 本系统生成的策略仅供参考
   - 实际交易请结合其他分析工具
   - 注意控制风险，合理使用杠杆

## 许可证

MIT License
