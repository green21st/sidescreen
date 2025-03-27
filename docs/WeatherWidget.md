# WeatherWidget 组件说明文档

## 功能概述

WeatherWidget 是一个功能丰富的天气组件，提供实时天气信息和未来三天天气预报显示。该组件使用和风天气 API 获取数据，支持本地数据缓存，并内置了一个隐藏的飞行小游戏。组件采用响应式设计，支持多主题适配，并具有优秀的错误处理和离线功能。

## 主要功能模块

### 1. 天气信息显示
- **实时天气**
  - 温度显示
  - 天气状况
  - 湿度信息
  - 风速数据
  - 天气图标

- **天气预报**
  - 未来三天预报
  - 每日温度范围
  - 天气状况预测
  - 图标显示

### 2. 数据管理
- **API 集成**
  - 和风天气 API 对接
  - 自动数据更新
  - 错误处理机制
  - 模拟数据支持

- **本地存储**
  - 数据缓存
  - 自动过期处理
  - 离线支持
  - 定时更新

### 3. 游戏功能
- **隐藏游戏**
  - 双击触发
  - 飞行游戏
  - 独立游戏空间
  - 状态管理

## 使用方法

### 基本使用
```vue
<template>
  <WeatherWidget 
    :location="location"
    :apiKey="apiKey"
  />
</template>

<script setup lang="ts">
import WeatherWidget from './components/WeatherWidget.vue';
import { ref } from 'vue';

const location = ref('南京');
const apiKey = ref('your-qweather-api-key');
</script>
```

### 组件属性
```typescript
interface Props {
  location: string;    // 位置信息
  apiKey: string;      // 和风天气 API 密钥
}

interface WeatherData {
  temp: number;        // 温度
  humidity: number;    // 湿度
  windSpeed: number;   // 风速
  description: string; // 天气描述
  iconUrl: string;     // 天气图标 URL
}

interface ForecastDay {
  fxDate: string;      // 预报日期
  tempMax: string;     // 最高温度
  tempMin: string;     // 最低温度
  iconDay: string;     // 白天天气图标代码
  textDay: string;     // 白天天气状况文字
  humidity: string;    // 相对湿度
  precip: string;      // 降水量
  windSpeed: string;   // 风速
}
```

## 功能特性

### 1. 天气显示
- 实时温度和天气状况
- 湿度和风速信息
- 天气图标（在线/离线）
- 三天天气预报
- 响应式布局

### 2. 数据管理
- API 数据获取
- 本地数据缓存
- 自动数据更新
- 错误恢复机制
- 离线模式支持

### 3. 界面交互
- 刷新按钮
- 加载状态
- 错误提示
- 动画效果
- 主题适配

## 技术实现

### 1. 天气数据获取
```typescript
const fetchWeather = async (forceRefresh = false) => {
  // 检查缓存
  if (!forceRefresh && loadSavedData()) {
    loading.value = false;
    return;
  }

  try {
    const baseUrl = 'https://devapi.qweather.com';
    const weatherUrl = `${baseUrl}/v7/weather/now?location=${locationParam}&key=${apiKey}`;
    const forecastUrl = `${baseUrl}/v7/weather/3d?location=${locationParam}&key=${apiKey}`;
    
    // 获取数据并处理...
  } catch (err) {
    handleWeatherError(err, locationParam);
  }
};
```

### 2. 本地存储管理
```typescript
const STORAGE_KEYS = {
  WEATHER_DATA: 'weather_widget_data',
  LAST_UPDATE: 'weather_widget_last_update',
  FORECAST_DATA: 'weather_widget_forecast'
};

const saveDataToStorage = () => {
  try {
    localStorage.setItem(STORAGE_KEYS.WEATHER_DATA, JSON.stringify(weather.value));
    localStorage.setItem(STORAGE_KEYS.LAST_UPDATE, new Date().getTime().toString());
    if (forecast.value.length > 0) {
      localStorage.setItem(STORAGE_KEYS.FORECAST_DATA, JSON.stringify(forecast.value));
    }
  } catch (err) {
    console.error('保存数据到本地存储失败:', err);
  }
};
```

## 配置选项

### 1. API 配置
```typescript
const apiConfig = {
  baseUrl: 'https://devapi.qweather.com',
  version: 'v7',
  updateInterval: 30 * 60 * 1000, // 30分钟更新一次
  cacheExpiration: 60 * 60 * 1000  // 1小时缓存过期
};
```

### 2. 模拟数据配置
```typescript
const mockConfig = {
  enabled: true,      // 是否启用模拟数据
  retryCount: 3,      // API 重试次数
  retryDelay: 2000    // 重试延迟时间
};
```

## 样式定制

### 1. 主题变量
```css
.weather-widget {
  --text-color: #ffffff;
  --widget-bg: rgba(255, 255, 255, 0.05);
  --forecast-bg: rgba(255, 255, 255, 0.05);
  --hover-bg: rgba(255, 255, 255, 0.1);
}
```

### 2. 响应式设计
```css
@media (max-width: 768px) {
  .weather-widget {
    min-height: 150px;
  }
  
  .weather-details {
    flex-direction: column;
    gap: 10px;
  }
}
```

## 性能优化

1. 数据缓存策略
2. 图片懒加载
3. 定时更新优化
4. 错误重试机制

## 最佳实践

1. 合理配置 API 密钥
2. 适当的缓存时间
3. 错误提示友好化
4. 定期检查数据更新

## 注意事项

1. API 调用限制
2. 数据缓存管理
3. 网络状态处理
4. 错误恢复机制

## 错误处理

1. API 错误
   - 网络错误重试
   - 密钥验证失败
   - 请求限制处理
   - 参数错误处理

2. 数据错误
   - 数据格式验证
   - 缓存数据恢复
   - 模拟数据降级
   - 用户提示展示

## 兼容性

- 现代浏览器支持
- 移动设备适配
- 离线功能支持
- 主题切换适配

## 扩展功能

1. 多城市支持
2. 详细天气信息
3. 天气预警
4. 空气质量
5. 生活指数
6. 历史数据

## 常见问题解决

1. API 访问问题
   - 检查 API 密钥
   - 验证请求参数
   - 确认网络状态
   - 查看使用配额

2. 显示问题
   - 检查数据格式
   - 验证图标加载
   - 确认主题适配
   - 响应式布局

3. 性能问题
   - 优化更新频率
   - 合理使用缓存
   - 控制重试次数
   - 管理内存使用 