<template>
  <div class="background-container" :style="backgroundStyle"></div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';

const props = defineProps({
  backgroundInterval: {
    type: Number,
    default: 10 // 默认10分钟
  },
  backgroundImages: {
    type: Array as () => string[],
    default: () => []
  }
});

// 背景图片
const defaultBackgrounds = [
  '/backgrounds/bg1.png',
  '/backgrounds/bg2.png',
  '/backgrounds/bg3.png',
];
const currentBackground = ref(defaultBackgrounds[0]);

// 背景图片定时器
let backgroundTimer: number | null = null;

// 计算背景样式
const backgroundStyle = computed(() => {
  // 判断是否在开发环境
  const isDev = process.env.NODE_ENV === 'development';
  
  // 获取当前背景图片路径
  let bgPath = currentBackground.value;
  
  // 如果是用户自定义的背景图片（以data:开头的base64编码图片），直接使用
  if (bgPath.startsWith('data:')) {
    return {
      backgroundImage: `url(${bgPath})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat'
    };
  }
  
  // 否则，根据环境构建路径
  if (isDev) {
    // 开发环境，使用相对路径
    return {
      backgroundImage: `url(${bgPath})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat'
    };
  } else {
    // 生产环境，使用app://协议
    // 移除开头的斜杠，因为app://协议不需要
    if (bgPath.startsWith('/')) {
      bgPath = bgPath.substring(1);
    }
    return {
      backgroundImage: `url(app://${bgPath})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat'
    };
  }
});

// 更换背景图片
const changeBackground = () => {
  // 获取可用的背景图片列表
  const availableBackgrounds = props.backgroundImages.length > 0 
    ? props.backgroundImages 
    : defaultBackgrounds;
  
  if (availableBackgrounds.length === 0) {
    return;
  }
  
  // 随机选择一张背景图片
  let newIndex;
  if (availableBackgrounds.length === 1) {
    newIndex = 0;
  } else {
    // 避免连续显示相同的背景
    let currentIndex = availableBackgrounds.indexOf(currentBackground.value);
    if (currentIndex === -1) currentIndex = 0;
    
    do {
      newIndex = Math.floor(Math.random() * availableBackgrounds.length);
    } while (newIndex === currentIndex && availableBackgrounds.length > 1);
  }
  
  currentBackground.value = availableBackgrounds[newIndex];
};

// 启动背景图片定时器
const startBackgroundTimer = () => {
  changeBackground();
  // 根据设置的间隔时间更新背景
  backgroundTimer = window.setInterval(changeBackground, props.backgroundInterval * 60 * 1000);
};

// 监听背景间隔变化
watch(() => props.backgroundInterval, (newInterval) => {
  if (backgroundTimer !== null) {
    clearInterval(backgroundTimer);
    backgroundTimer = window.setInterval(changeBackground, newInterval * 60 * 1000);
  }
});

// 监听背景图片列表变化
watch(() => props.backgroundImages, () => {
  changeBackground();
});

onMounted(() => {
  startBackgroundTimer();
});

onUnmounted(() => {
  if (backgroundTimer !== null) {
    clearInterval(backgroundTimer);
    backgroundTimer = null;
  }
});
</script>

<style scoped>
.background-container {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: -1;
}
</style> 