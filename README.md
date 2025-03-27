# Vue 3 副屏软件

一个使用 Vue 3 和 TypeScript 构建的精美副屏应用程序，用于在第二屏幕上显示有用的日常信息。

## 功能特点

- 🕒 **时钟与日期显示**：实时显示当前时间和日期
- 🌤️ **天气信息**：显示当前位置的天气状况
- ✅ **待办事项列表**：管理您的日常任务
- 📝 **笔记功能**：快速记录和保存笔记
- 📅 **日历视图**：查看月历和事件
- 🎨 **自定义背景**：选择您喜欢的背景图片
- 🌙 **深色主题**：保护您的眼睛

## 安装与运行

### 前提条件

- Node.js 16.0 或更高版本
- npm 或 yarn

### 安装步骤

1. 克隆或下载此仓库
2. 安装依赖：

```bash
npm install
# 或
yarn install
```

3. 添加背景图片：
   - 在 `public/backgrounds/` 目录中添加三张图片，命名为 `bg1.jpg`、`bg2.jpg` 和 `bg3.jpg`

4. 运行开发服务器：

```bash
npm run dev
# 或
yarn dev
```

5. 构建生产版本：

```bash
npm run build
# 或
yarn build
```

## 使用说明

- **天气功能**：需要在设置中添加和风天气 API 密钥
- **待办事项**：点击复选框标记完成，点击 × 删除任务
- **笔记**：写入内容后点击"保存"按钮
- **设置**：点击右上角的 ⚙️ 图标打开设置面板

## 技术栈

- Vue 3
- TypeScript
- Composition API
- Local Storage 数据持久化

## 自定义与扩展

您可以通过以下方式自定义应用：

1. 修改 `src/assets/main.css` 中的 CSS 变量更改主题颜色
2. 在 `public/backgrounds/` 中添加更多背景图片
3. 在 `src/components/` 中添加新的小部件组件

## 许可证

MIT
