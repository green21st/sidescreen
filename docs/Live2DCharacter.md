# Live2DCharacter 组件说明文档

## 功能概述

Live2DCharacter 是一个功能丰富的 Live2D 模型展示组件，支持模型加载、交互动画、拖拽定位、缩放控制等功能。组件提供了完整的模型管理系统，包括模型收藏、随机切换、自动播放等特性。

## 主要功能模块

### 1. 模型展示与控制
- **基础展示**
  - Live2D 模型加载和渲染
  - 自动播放 idle 动作
  - 呼吸效果动画
  - 加载状态指示

- **交互控制**
  - 拖拽移动位置
  - 鼠标滚轮缩放
  - 点击触发随机动作
  - 控制面板显示/隐藏

### 2. 模型管理
- **模型收藏系统**
  - 添加喜欢的模型
  - 移除不喜欢的模型
  - 本地存储持久化
  - 模型偏好同步

- **自动切换功能**
  - 定时随机更换模型
  - 排除不喜欢的模型
  - 自动加载机制
  - 空闲时加载优化

## 使用方法

### 基本使用
```vue
<template>
  <Live2DCharacter />
</template>

<script setup lang="ts">
import Live2DCharacter from './components/Live2DCharacter.vue';
</script>
```

### 组件状态
```typescript
interface ModelInfo {
  name: string;      // 模型名称
  url: string;       // 模型路径
  path?: string;     // 模型路径（用于显示和选择）
  timestamp: number; // 时间戳
}
```

## 功能特性

### 1. 模型加载
- 支持多种模型格式（model3.json, model.json, index.json）
- 自动处理开发和生产环境路径
- 加载状态可视化
- 错误处理和重试机制

### 2. 交互功能
- 模型拖拽定位
- 缩放控制（Ctrl + 滚轮）
- 点击触发动作
- 控制面板自动显示/隐藏

### 3. 动画系统
- 自动播放 idle 动作
- 随机动作触发
- 呼吸效果动画
- 平滑过渡效果

### 4. 模型管理
- 收藏夹功能
- 模型黑名单
- 定时切换系统
- 本地存储持久化

## 技术实现

### 1. 核心渲染
```typescript
const app = new window.PIXI.Application({
  width: 800,
  height: 800,
  transparent: true,
  antialias: false,
  powerPreference: 'low-power'
});
```

### 2. 模型加载
```typescript
const model = await window.Live2DModel.from(modelUrl);
model.scale.set(currentScale.value);
model.x = app.screen.width / 2;
model.y = app.screen.height;
model.anchor.set(0.5, 1);
```

### 3. 动作管理
```typescript
const startIdleAnimation = () => {
  const motionManager = model.internalModel.motionManager;
  // ... 动作处理逻辑
};
```

## 配置选项

### 1. 缩放范围
```typescript
const minScale = 0.1;  // 最小缩放比例
const maxScale = 2.0;  // 最大缩放比例
const baseScale = 0.4; // 默认缩放比例
```

### 2. 自动加载
```typescript
const autoLoadDelay = 10000; // 自动加载延迟（毫秒）
const modelChangeInterval = 10 * 60 * 1000; // 模型切换间隔
```

## 样式定制

### 1. 容器样式
```css
.live2d-container {
  position: fixed;
  width: 600px;
  height: 600px;
  pointer-events: auto;
  z-index: 1000;
}
```

### 2. 控制面板
```css
.model-controls {
  position: absolute;
  top: 10px;
  right: 10px;
  display: flex;
  flex-direction: column;
}
```

## 性能优化

1. 使用 `powerPreference: 'low-power'` 优化性能
2. 条件渲染优化加载
3. requestIdleCallback 空闲加载
4. 资源释放和清理

## 最佳实践

1. 合理设置模型大小和位置
2. 定期清理无效模型缓存
3. 使用合适的模型格式
4. 注意内存管理

## 注意事项

1. Live2D 核心库依赖
2. 模型文件格式要求
3. 浏览器兼容性
4. 内存占用管理

## 兼容性

- 支持现代浏览器
- Electron 环境适配
- 触摸屏支持
- 不同分辨率适配

## 未来优化方向

1. 添加模型预加载功能
2. 支持模型换装系统
3. 添加语音系统支持
4. 优化动作过渡效果
5. 添加模型表情系统
6. 支持自定义动作触发

## 示例代码

### 模型加载示例
```typescript
async function loadModel() {
  if (isLoading.value || isModelLoaded.value) return;
  isLoading.value = true;
  
  try {
    await waitForLive2D();
    const modelUrl = getModelPath();
    const model = await window.Live2DModel.from(modelUrl);
    // ... 模型初始化
  } catch (error) {
    console.error('Error:', error);
    isLoading.value = false;
    showLoadButton.value = true;
  }
}
```

### 动作处理示例
```typescript
model.on('pointerdown', () => {
  const motionManager = model.internalModel.motionManager;
  const motionGroups = motionManager.definitions;
  
  if (motionGroups) {
    let availableMotions = [];
    // ... 动作选择逻辑
    if (availableMotions.length > 0) {
      const randomMotion = availableMotions[Math.floor(Math.random() * availableMotions.length)];
      model.motion(randomMotion.group);
    }
  }
});
``` 