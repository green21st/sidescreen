<template>
  <div class="quote-container" @dblclick="updateQuote">
    <h1 :class="{ 'fade-in': shouldAnimate }">{{ quote }}</h1>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue';

const props = defineProps<{
  quotes?: string[];
}>();

const quote = ref('加载中...');
const shouldAnimate = ref(false);
let quoteTimer: number | null = null;

// 从名言数组中获取随机名言
const getRandomQuote = (quotes: string[]) => {
  if (!quotes || quotes.length === 0) return '智慧源于学习';
  const randomIndex = Math.floor(Math.random() * quotes.length);
  return quotes[randomIndex];
};

// 更新名言
const updateQuote = () => {
  if (props.quotes && props.quotes.length > 0) {
    shouldAnimate.value = false; // 重置动画状态
    // 使用 nextTick 确保动画状态被重置
    requestAnimationFrame(() => {
      quote.value = getRandomQuote(props.quotes!);
      shouldAnimate.value = true;
    });
  } else {
    quote.value = '智慧源于学习';
  }
};

// 定时更换名言
const startQuoteTimer = () => {
  updateQuote();
  // 每小时更新一次名言
  quoteTimer = window.setInterval(updateQuote, 60 * 60 * 1000);
};

// 监听名言变化
watch(() => props.quotes, (newQuotes) => {
  if (newQuotes && newQuotes.length > 0) {
    updateQuote();
  } else {
    quote.value = '智慧源于学习';
  }
}, { deep: true, immediate: true });

onMounted(() => {
  // 启动定时器
  startQuoteTimer();
});

onUnmounted(() => {
  if (quoteTimer !== null) {
    clearInterval(quoteTimer);
    quoteTimer = null;
  }
});

defineExpose({
  quote
});
</script>

<style scoped>
.quote-container {
  text-align: center;
  margin-bottom: 1rem;
  width: 100%;
  max-width: 90%;
  margin-left: auto;
  margin-right: auto;
  cursor: pointer; /* 添加指针样式提示可点击 */
  transition: opacity 0.2s ease; /* 添加过渡效果 */
}

.quote-container:hover {
  opacity: 0.8; /* 添加悬停效果 */
}

h1 {
  font-size: 1.5rem;
  font-weight: 400;
  color: inherit;
  margin: 0;
  padding: 0;
  white-space: normal;
  overflow: visible;
  line-height: 1.4;
  max-height: none;
  user-select: none; /* 防止文字被选中 */
}

/* 添加淡入动画 */
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.fade-in {
  animation: fadeIn 0.3s ease-out;
}
</style> 