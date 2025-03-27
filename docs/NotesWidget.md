# NotesWidget 组件说明文档

## 功能概述

NotesWidget 是一个功能丰富的笔记组件，支持文本输入和语音识别，提供了便捷的笔记管理功能。该组件集成了多种语音识别服务，包括 Web Speech API、讯飞语音识别和本地录音功能，并内置了一个隐藏的俄罗斯方块小游戏。

## 主要功能模块

### 1. 笔记管理
- **笔记创建与编辑**
  - 文本输入
  - 语音输入
  - 实时保存
  - 时间戳记录

- **笔记列表**
  - 按时间排序
  - 删除功能
  - 动画效果
  - 空状态提示

### 2. 语音识别功能
- **多平台支持**
  - Web Speech API
  - 讯飞语音识别服务
  - 本地录音功能
  - 自动平台切换

- **语音交互**
  - 录音状态显示
  - 时长计时
  - 错误处理
  - 权限管理

### 3. 游戏功能
- **隐藏游戏**
  - 双击触发
  - 俄罗斯方块游戏
  - 独立游戏空间
  - 快速切换

## 使用方法

### 基本使用
```vue
<template>
  <NotesWidget 
    :notes="notes"
    :speechConfig="speechConfig"
    @add-note="handleAddNote"
    @remove-note="handleRemoveNote"
  />
</template>

<script setup lang="ts">
import NotesWidget from './components/NotesWidget.vue';
import { ref } from 'vue';

interface Note {
  id: number;
  content: string;
  timestamp: Date;
}

const notes = ref<Note[]>([]);
const speechConfig = ref({
  appId: 'your-app-id',
  apiKey: 'your-api-key',
  apiSecret: 'your-api-secret',
  enabled: true
});

const handleAddNote = (content: string) => {
  notes.value.push({
    id: Date.now(),
    content,
    timestamp: new Date()
  });
};

const handleRemoveNote = (id: number) => {
  notes.value = notes.value.filter(note => note.id !== id);
};
</script>
```

### 组件属性
```typescript
interface Props {
  notes: Note[]; // 笔记数据数组
  speechConfig: SpeechConfig; // 语音识别配置
}

interface Note {
  id: number;
  content: string;
  timestamp: Date;
}

interface SpeechConfig {
  appId: string;
  apiKey: string;
  apiSecret: string;
  enabled: boolean;
}

interface Emits {
  'add-note': (content: string) => void;
  'remove-note': (id: number) => void;
}
```

## 功能特性

### 1. 笔记管理
- 支持文本和语音输入
- 实时保存笔记
- 时间戳显示
- 删除确认
- 动画过渡效果

### 2. 语音识别
- 多平台自适应
- 实时语音转文字
- 录音时长限制
- 错误恢复机制
- 权限管理系统

### 3. 界面交互
- 响应式设计
- 主题适配
- 状态反馈
- 加载动画

## 技术实现

### 1. 语音识别初始化
```typescript
const initSpeechRecognition = () => {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) return false;
  
  recognition = new SpeechRecognition();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = 'zh-CN';
  
  // 配置事件处理...
  return true;
};
```

### 2. 笔记管理
```typescript
const addNote = () => {
  if (newNote.value.trim()) {
    emit('add-note', newNote.value.trim());
    newNote.value = '';
    if (isRecording.value) {
      stopRecording();
    }
  }
};
```

## 配置选项

### 1. 语音识别配置
```typescript
const speechConfig = {
  appId: 'your-app-id',
  apiKey: 'your-api-key',
  apiSecret: 'your-api-secret',
  enabled: true
};
```

### 2. 录音设置
```typescript
const recordingConfig = {
  maxDuration: 60, // 最大录音时长（秒）
  autoStop: true,  // 自动停止
  format: 'audio/webm' // 录音格式
};
```

## 样式定制

### 1. 主题变量
```css
.notes-widget {
  --accent-color: #3498db;
  --text-color: #ffffff;
  --widget-bg: rgba(0, 0, 0, 0.1);
  --border-color: rgba(255, 255, 255, 0.3);
}
```

### 2. 响应式设计
```css
@media (max-width: 768px) {
  .notes-widget {
    padding: 5px;
    min-height: 150px;
  }
  
  .notes-input {
    height: 60px;
  }
}
```

## 性能优化

1. 语音识别服务懒加载
2. 录音资源及时释放
3. 动画性能优化
4. 内存管理

## 最佳实践

1. 合理配置语音识别服务
2. 定期清理笔记数据
3. 注意录音时长限制
4. 提供适当的用户反馈

## 注意事项

1. 麦克风权限管理
2. 网络连接要求
3. 浏览器兼容性
4. 内存使用考虑

## 错误处理

1. 语音识别错误
   - 网络错误重试
   - 权限请求提示
   - 服务不可用切换
   - 用户反馈展示

2. 录音错误
   - 设备检查
   - 格式兼容性
   - 存储空间检查
   - 错误恢复机制

## 兼容性

- 现代浏览器支持
- Electron 环境适配
- 移动设备支持
- 触摸屏优化

## 扩展功能

1. 笔记分类管理
2. 标签系统
3. 搜索功能
4. 导入导出
5. 云同步
6. 快捷键支持

## 常见问题解决

1. 语音识别不可用
   - 检查网络连接
   - 验证浏览器支持
   - 确认权限设置
   - 尝试备用服务

2. 录音问题
   - 检查麦克风设备
   - 验证权限状态
   - 确认格式支持
   - 清理缓存数据

3. 性能问题
   - 限制笔记数量
   - 优化动画效果
   - 及时释放资源
   - 使用虚拟滚动 