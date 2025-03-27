# Live2DModelViewer 组件说明文档

## 功能概述

Live2DModelViewer 是一个功能强大的 Live2D 模型查看器组件，提供了丰富的模型浏览、加载和管理功能。该组件支持从多个来源加载模型，包括在线仓库、本地文件夹和 CDN，并提供了直观的用户界面来浏览和管理模型。

## 主要功能模块

### 1. 模型源管理
- **在线仓库支持**
  - 预设仓库（如 Eikanya/Live2d-model）
  - 自定义仓库支持
  - 仓库缓存管理
  - 自动刷新机制

- **本地模型管理**
  - 本地文件夹浏览
  - 文件系统集成
  - 模型文件过滤
  - 自动扫描更新

- **CDN 直接加载**
  - URL 直接输入
  - 快速示例选择
  - 预设模型列表
  - 加载状态反馈

### 2. 模型浏览器
- **文件夹结构**
  - 树形目录展示
  - 文件夹展开/折叠
  - 模型计数显示
  - 滚动提示

- **模型列表**
  - 模型文件过滤
  - 选择状态管理
  - 预览功能
  - 默认模型设置

### 3. 模型预览
- **预览窗口**
  - 实时渲染
  - 动作播放
  - 大小自适应
  - 加载状态显示

## 使用方法

### 基本使用
```vue
<template>
  <Live2DModelViewer :isVisible="showViewer" @close="closeViewer" />
</template>

<script setup lang="ts">
import Live2DModelViewer from './components/Live2DModelViewer.vue';
import { ref } from 'vue';

const showViewer = ref(false);
const closeViewer = () => {
  showViewer.value = false;
};
</script>
```

### 组件属性
```typescript
interface Props {
  isVisible: boolean; // 控制查看器的显示/隐藏
}

interface Emits {
  close: () => void; // 关闭查看器的事件
}
```

## 功能特性

### 1. 仓库管理
- 支持多种仓库源（GitHub、jsdelivr）
- 本地缓存机制
- 自动更新检测
- 错误处理和重试

### 2. 模型加载
- 多格式支持（model3.json、model.json、index.json）
- 加载状态可视化
- 错误处理机制
- 自动重试功能

### 3. 界面交互
- 响应式设计
- 拖拽支持
- 快捷操作
- 主题适配

## 技术实现

### 1. 仓库加载
```typescript
const loadRepository = async (repoPath: string) => {
  // 检查缓存
  const cacheKey = `repo_cache_${repoPath}`;
  const cachedData = localStorage.getItem(cacheKey);
  
  // 处理缓存数据或获取新数据
  // ...
};
```

### 2. 模型加载
```typescript
const loadSelectedModel = async () => {
  const model = await window.Live2DModel.from(modelUrl, {
    motionPreload: "ALL",
    idleMotionPriority: 1
  });
  // 设置模型属性和动画
  // ...
};
```

## 配置选项

### 1. 仓库设置
```typescript
const repositories = [
  'Eikanya/Live2d-model',
  'guansss/pixi-live2d-display',
  'liked-models',
  'custom'
];
```

### 2. CDN 配置
```typescript
const CDN_BASE_URL = 'https://cdn.jsdelivr.net/gh/';
```

## 样式定制

### 1. 主题定制
```css
.live2d-model-viewer {
  --accent-color-rgb: 52, 152, 219;
  --text-color: #ffffff;
  // ... 其他主题变量
}
```

### 2. 布局适配
```css
.model-browser {
  height: 40%;
  min-height: 15rem;
  max-height: 25rem;
}
```

## 性能优化

1. 仓库数据缓存
2. 模型预加载
3. 懒加载优化
4. 资源释放管理

## 最佳实践

1. 使用缓存机制减少加载时间
2. 定期清理过期缓存
3. 合理设置刷新间隔
4. 优化模型文件大小

## 注意事项

1. 网络连接要求
2. 浏览器兼容性
3. 文件格式限制
4. 内存使用考虑

## 错误处理

1. 网络错误重试
2. 加载失败提示
3. 格式验证
4. 用户反馈

## 兼容性

- 现代浏览器支持
- Electron 环境适配
- 响应式布局
- 触摸设备支持

## 示例代码

### 加载本地模型
```typescript
const loadLocalModels = async (folderPath: string) => {
  const files = await window.electronAPI.readDirectory(folderPath);
  const modelFiles = files.filter(file => 
    file.endsWith('.model3.json') || 
    file.endsWith('model.json') ||
    file.endsWith('index.json')
  );
  // 处理模型文件
  // ...
};
```

### 设置默认模型
```typescript
const setAsDefaultModel = () => {
  if (!selectedModel.value) return;
  
  const modelInfo = {
    name: selectedModel.value.name,
    path: selectedModel.value.path,
    url: selectedModel.value.url,
    isLocal: selectedModel.value.isLocal,
    timestamp: Date.now()
  };
  
  localStorage.setItem('default-live2d-model', JSON.stringify(modelInfo));
  // 触发更新事件
  // ...
};
```

## 扩展功能

1. 模型预览增强
2. 批量导入支持
3. 模型分类管理
4. 搜索功能优化
5. 自定义主题
6. 快捷键支持

## 常见问题解决

1. 模型加载失败
   - 检查网络连接
   - 验证文件格式
   - 清理缓存重试

2. 仓库访问问题
   - 使用备用 API
   - 检查访问权限
   - 更新缓存数据

3. 性能优化建议
   - 减少同时加载的模型数量
   - 使用合适的图片格式
   - 优化动画效果 