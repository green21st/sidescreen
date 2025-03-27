<template>
  <div class="dashboard">
    <BackgroundManager 
      :backgroundInterval="settings.backgroundInterval" 
      :backgroundImages="settings.backgroundImages" 
    />
    <div class="dashboard-container">
      <header class="dashboard-header">
        <QuoteManager ref="quoteManager" :quotes="settings.quotes" />
        <div class="header-buttons">
          <button @click="toggleLive2DViewer" class="live2d-button" title="Live2D模型查看器">
            🎭
          </button>
          <button @click="toggleSettings" class="settings-button">
            ⚙️
          </button>
          <button @click="closeWindow" class="close-button">
            ✕
          </button>
        </div>
      </header>
      
      <div class="dashboard-content fixed-widget-layout">
        <ClockWidget />
        <WeatherWidget :location="settings.location" :apiKey="settings.weatherApiKey" />
        <CalendarWidget 
          :events="events" 
          @add-event="handleAddEvent"
          @remove-event="handleRemoveEvent"
          :key="'calendar-' + events.length"
        />
        <NotesWidget 
          :notes="notes" 
          @add-note="addNote" 
          @remove-note="removeNote" 
          :speechConfig="{
            appId: settings.iflytekAppId || '',
            apiKey: settings.iflytekApiKey || '',
            apiSecret: settings.iflytekApiSecret || '',
            enabled: settings.speechEnabled || false
          }"
        />
        <BookmarksWidget />
        <Live2DCharacter />
        <PlayfulCat />
      </div>
      
      <SettingsPanel 
        v-if="showSettings" 
        :settings="settings" 
        @update-settings="handleUpdateSettings"
        @close="toggleSettings" 
      />
      
      <div v-if="showLive2DViewer" class="live2d-viewer-overlay">
        <Live2DModelViewer 
          :isVisible="showLive2DViewer" 
          @close="toggleLive2DViewer" 
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import ClockWidget from './components/ClockWidget.vue';
import WeatherWidget from './components/WeatherWidget.vue';
import NotesWidget from './components/NotesWidget.vue';
import CalendarWidget from './components/CalendarWidget.vue';
import SettingsPanel from './components/SettingsPanel.vue';
import Live2DCharacter from './components/Live2DCharacter.vue';
import Live2DModelViewer from './components/Live2DModelViewer.vue';
import QuoteManager from './components/QuoteManager.vue';
import BackgroundManager from './components/BackgroundManager.vue';
import BookmarksWidget from './components/BookmarksWidget.vue';
import PlayfulCat from './components/PlayfulCat.vue';

// 导入组合式函数
import { useTheme } from './composables/useTheme';
import { useSettings } from './composables/useSettings';
import { useMemory } from './composables/useMemory';
import { useData } from './composables/useData';
import { useWindow } from './composables/useWindow';

// 使用设置管理
const { 
  settings, 
  showSettings, 
  toggleSettings, 
  updateSettings,
  loadSettingsFromLocalStorage 
} = useSettings();

// Live2D模型查看器状态
const showLive2DViewer = ref(false);

// 切换Live2D模型查看器
const toggleLive2DViewer = () => {
  showLive2DViewer.value = !showLive2DViewer.value;
};

// 使用主题管理
const { applyTheme } = useTheme(settings);

// 使用数据管理
const { 
  notes, 
  events, 
  addNote, 
  removeNote, 
  loadNotes, 
  addEvent, 
  removeEvent, 
  loadEvents 
} = useData();

// 使用窗口管理
const { closeWindow } = useWindow();

// 加载设置函数
const loadSettings = () => {
  loadSettingsFromLocalStorage();
  applyTheme();
};

// 使用内存管理
const { 
  setupMemoryManagement,
  restoreResources
} = useMemory(settings, loadSettings);

// 处理设置更新
const handleUpdateSettings = (newSettings: any) => {
  updateSettings(newSettings);
  applyTheme();
};

// 添加事件的处理函数
const handleAddEvent = (eventData: { title: string; date: Date; time?: string }) => {
  addEvent(eventData);
  console.log(`添加了新事件: ${eventData.title}, 当前共有 ${events.value.length} 个事件`);
};

// 删除事件的处理函数
const handleRemoveEvent = (id: number) => {
  removeEvent(id);
  console.log(`删除了事件 ID: ${id}, 当前剩余 ${events.value.length} 个事件`);
};

// 初始化
onMounted(() => {
  // 加载设置
  loadSettings();
  
  // 加载笔记
  loadNotes();
  
  // 加载事件
  loadEvents();
  console.log(`初始化时加载了 ${events.value.length} 个事件`);
  
  // 设置初始主题类名
  document.body.classList.add(`theme-${settings.theme}`);
  
  // 添加内存管理功能
  setupMemoryManagement();
});

// 组件卸载时清除定时器
onUnmounted(() => {
  // 定时器清理已经移到各自的组件中
});
</script>

<style>
/* 导入外部CSS文件 */
@import './assets/styles/main.css';

/* 添加竖屏模式下的固定布局样式 */
@media (orientation: portrait) {
  .fixed-widget-layout .widget {
    width: calc(33.333% - 10px) !important;
    height: calc(50% - 15px) !important;
    min-height: unset !important;
    max-height: unset !important;
    flex: none !important;
    overflow: auto !important;
  }
  
  .fixed-widget-layout {
    display: flex !important;
    flex-wrap: wrap !important;
    justify-content: space-between !important;
  }
}
</style> 