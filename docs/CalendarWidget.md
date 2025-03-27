# CalendarWidget 日历组件说明文档

## 功能概述

CalendarWidget 是一个功能完整的日历组件，提供日期查看、事件管理和游戏功能。组件支持响应式设计，具有直观的用户界面和丰富的交互功能。

## 主要功能模块

### 1. 日历显示
- **月份导航**
  - 上一月/下一月切换
  - 当前月份和年份显示
  - 星期标题显示（日-六）

- **日期网格**
  - 完整的月份视图（6x7 网格）
  - 当前月份日期高亮
  - 今天日期特殊标记
  - 其他月份日期半透明显示

### 2. 事件管理
- **事件添加**
  - 支持添加带时间的事件
  - 快速添加功能（回车键添加）
  - 时间选择器集成

- **事件显示**
  - 日期上的事件指示器
  - 多事件数量显示
  - 按时间排序的事件列表
  - 事件时间和标题显示

- **事件操作**
  - 删除单个事件
  - 查看特定日期的所有事件

### 3. 游戏功能
- **贪吃蛇游戏**
  - 双击触发游戏模式
  - 游戏窗口的显示与隐藏
  - 集成 SnakeGame 组件

## 使用方法

### 基本使用
```vue
<template>
  <CalendarWidget 
    :events="events"
    @add-event="handleAddEvent"
    @remove-event="handleRemoveEvent"
  />
</template>

<script setup lang="ts">
import CalendarWidget from './components/CalendarWidget.vue';
import { ref } from 'vue';

const events = ref([
  {
    id: 1,
    title: "会议",
    date: new Date(),
    time: "14:00"
  }
]);
</script>
```

### 属性说明
```typescript
interface Event {
  id: number;         // 事件唯一标识
  title: string;      // 事件标题
  date: Date;         // 事件日期
  time?: string;      // 事件时间（可选）
}

interface Props {
  events: Event[];    // 事件数组
}
```

### 事件
- `add-event`: 添加新事件时触发
  - 参数：`{ title: string; date: Date; time?: string }`
- `remove-event`: 删除事件时触发
  - 参数：`id: number`

## 功能特性

### 1. 日期选择
- 点击日期可选择特定日期
- 自动切换月份视图
- 今天日期特殊标记
- 事件日期视觉提示

### 2. 事件管理
- 支持时间排序
- 事件数量统计
- 快速添加功能
- 简单删除操作

### 3. 视觉反馈
- 事件指示器
- 选中状态高亮
- 今日日期突出显示
- 平滑的动画过渡

## 样式特性

### 1. 响应式设计
- 自适应布局
- 移动设备优化
- 横竖屏适配
- 字体大小自动调整

### 2. 主题支持
- 深色/浅色主题
- 自定义颜色变量
- 统一的视觉风格
- 无缝主题切换

## 技术实现

### 1. 日历算法
```typescript
const calendarDays = computed(() => {
  const days: CalendarDay[] = [];
  const firstDay = new Date(currentYear.value, currentMonth.value, 1);
  const lastDay = new Date(currentYear.value, currentMonth.value + 1, 0);
  // ... 日历日期计算逻辑
  return days;
});
```

### 2. 事件处理
```typescript
function addEvent() {
  if (newEventTitle.value.trim()) {
    emit('add-event', {
      title: newEventTitle.value.trim(),
      date: selectedDate.value,
      time: newEventTime.value || undefined
    });
  }
}
```

## 性能优化
1. 使用计算属性缓存日历数据
2. 事件列表虚拟滚动
3. 条件渲染优化
4. 防抖处理

## 最佳实践
1. 定期清理过期事件
2. 合理使用事件时间
3. 避免过多事件堆积
4. 保持界面整洁

## 注意事项
1. 事件数据的本地存储
2. 日期选择范围限制
3. 时间格式统一
4. 性能考虑

## 兼容性
- 支持现代浏览器
- 移动设备友好
- 触摸屏支持
- 键盘操作支持

## 未来优化方向
1. 添加拖拽功能
2. 支持重复事件
3. 添加事件分类
4. 导入/导出功能
5. 日历视图切换
6. 多语言支持

## 示例代码

### 事件处理示例
```typescript
// 添加事件
function handleAddEvent(event: { title: string; date: Date; time?: string }) {
  events.value.push({
    id: Date.now(),
    ...event
  });
}

// 删除事件
function handleRemoveEvent(id: number) {
  const index = events.value.findIndex(e => e.id === id);
  if (index !== -1) {
    events.value.splice(index, 1);
  }
}
```

### 样式定制示例
```css
.calendar-widget {
  --calendar-bg: var(--widget-bg, #ffffff);
  --calendar-text: var(--text-color, #333333);
  --calendar-accent: var(--accent-color, #3498db);
  // ... 其他自定义变量
}
``` 