<template>
  <div class="widget clock-widget">
    <div v-if="!showGame" class="clock-container" @dblclick="toggleGame">
      <div class="time">{{ time }}</div>
      <div class="date">{{ date }}</div>
    </div>
    
    <!-- 打砖块游戏组件 -->
    <div v-if="showGame" class="game-container">
      <BreakoutGame 
        :isVisible="showGame" 
        @close="closeGame" 
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import BreakoutGame from './games/BreakoutGame.vue';

const time = ref('00:00:00');
const date = ref('');
let timerInterval: number | null = null;
const showGame = ref(false);

const updateTime = () => {
  const now = new Date();
  
  // 格式化时间
  time.value = now.toLocaleTimeString('zh-CN', { 
    hour: '2-digit', 
    minute: '2-digit',
    second: '2-digit'
  });
  
  // 格式化日期
  date.value = now.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long'
  });
};

// 切换游戏显示状态
const toggleGame = () => {
  showGame.value = !showGame.value;
};

// 关闭游戏
const closeGame = () => {
  showGame.value = false;
};

onMounted(() => {
  updateTime();
  timerInterval = window.setInterval(updateTime, 1000);
});

onUnmounted(() => {
  if (timerInterval) {
    clearInterval(timerInterval);
  }
});
</script>

<style scoped>
.clock-widget {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 10px;
  min-height: 150px;
  border-radius: 8px;
  overflow: hidden;
}

.clock-container {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  flex: 1;
  width: 100%;
  height: 100%;
  cursor: pointer;
  transition: all 0.3s ease;
}

.clock-container:hover .game-hint {
  opacity: 0.8;
}

.time {
  font-size: clamp(2rem, 5vw, 4rem);
  font-weight: bold;
  margin-bottom: 10px;
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
  letter-spacing: 2px;
  color: var(--text-color);
  transition: all 0.3s ease;
  text-align: center;
  width: 100%;
}

.date {
  font-size: clamp(0.9rem, 2vw, 1.4rem);
  opacity: 0.9;
  text-shadow: 0 1px 5px rgba(0, 0, 0, 0.3);
  color: var(--text-color);
  transition: all 0.3s ease;
  text-align: center;
  width: 100%;
}

:deep(.theme-light) .time,
:deep(.theme-github) .time {
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
  color: #333;
}

:deep(.theme-light) .date,
:deep(.theme-github) .date {
  text-shadow: 0 1px 5px rgba(0, 0, 0, 0.2);
  color: #333;
}

@media (max-width: 768px) {
  .clock-widget {
    padding: 5px;
    min-height: 120px;
  }
}

@media (orientation: portrait) {
  .time {
    font-size: clamp(2.5rem, 8vw, 4rem);
  }
  
  .date {
    font-size: clamp(1rem, 3vw, 1.4rem);
  }
}

.game-container {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 0;
  margin: 0;
}

.game-hint {
  font-size: clamp(0.7rem, 1.5vw, 0.9rem);
  opacity: 0.5;
  color: var(--text-color);
  margin-top: 10px;
  text-align: center;
  transition: opacity 0.3s ease;
}
</style> 