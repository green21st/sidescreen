# SettingsPanel 设置面板组件说明文档

## 功能概述

SettingsPanel 是一个功能丰富的设置面板组件，提供了多个设置分类和选项，用于配置应用程序的各项功能。

## 主要功能模块

### 1. 常规设置
- **位置设置**
  - 用于设置天气显示的城市位置
  - 输入框支持中文城市名称（例如：北京、上海等）

- **天气 API 设置**
  - 和风天气 API 密钥配置
  - 提供和风天气开发平台链接，方便用户获取 API 密钥

### 2. 语音识别设置
- **讯飞语音识别配置**
  - App ID 配置
  - API Key 配置
  - API Secret 配置
  - 语音识别开关
  - 提供科大讯飞开放平台链接

### 3. 名人名言设置
- **名言文件管理**
  - 支持导入文本文件（.txt 格式）
  - 每行一条名言的格式要求
  - 显示已导入文件名称

### 4. 外观设置
- **主题选择**
  - 提供 6 种预设主题：
    - 深色（Dark）
    - 浅色（Light）
    - Nord
    - Solarized
    - Dracula
    - GitHub
  - 主题预览功能
  - 实时切换效果

- **背景图片管理**
  - 支持多图片上传
  - 自动压缩优化（最大尺寸 1920x1080）
  - 显示已选择图片数量
  - 背景更新频率设置（1-60分钟）

## 使用方法

### 基本使用
```vue
<template>
  <SettingsPanel 
    :settings="currentSettings"
    @update-settings="handleSettingsUpdate"
    @close="closeSettings"
  />
</template>
```

### 属性说明
- `settings`: Object (必需)
  ```typescript
  interface Settings {
    location: string;              // 位置
    weatherApiKey: string;         // 天气 API 密钥
    backgroundInterval: number;    // 背景更新间隔
    backgroundImages?: string[];   // 背景图片列表
    theme?: string;               // 主题
    iflytekAppId?: string;        // 讯飞 App ID
    iflytekApiKey?: string;       // 讯飞 API Key
    iflytekApiSecret?: string;    // 讯飞 API Secret
    speechEnabled?: boolean;       // 语音识别开关
    quotes?: string[];            // 名人名言列表
  }
  ```

### 事件
- `update-settings`: 当设置更新时触发
  - 参数：更新后的设置对象
- `close`: 当设置面板关闭时触发

## 数据存储
- 所有设置数据使用 localStorage 持久化存储
- 图片数据经过压缩处理后存储
- 支持重置所有设置到默认值

## 性能优化
- 图片自动压缩（最大尺寸限制）
- 延迟加载和防抖处理
- 主题切换的平滑过渡
- 文件选择的异步处理

## 注意事项
1. 背景图片总大小建议控制在 4MB 以内，避免存储限制
2. API 密钥等敏感信息仅存储在本地
3. 重置设置将清除所有自定义配置，包括背景图片
4. 名人名言文件需要是 UTF-8 编码的文本文件

## 最佳实践
1. 定期备份重要设置
2. 使用适当大小的背景图片
3. 合理设置背景更新频率
4. 及时更新过期的 API 密钥

## 错误处理
- 图片加载失败时提供友好提示
- API 密钥验证失败时显示具体错误信息
- 文件格式不正确时提供清晰的错误提示
- 存储空间不足时提供警告信息

## 兼容性
- 支持所有主流现代浏览器
- 适配深色/浅色模式
- 响应式设计，支持不同屏幕尺寸

## 未来优化方向
1. 添加更多主题选项
2. 支持自定义主题
3. 增加设置导入/导出功能
4. 添加更多个性化选项 