<!-- 调皮猫咪组件 -->
<template>
  <div class="playful-cat" :style="catStyle" @click="startNewAction">
    <div class="cat-body" :class="currentAction">
      <div class="cat-head">
        <div class="cat-ears">
          <div class="ear left"></div>
          <div class="ear right"></div>
        </div>
        <div class="cat-face">
          <div class="eyes">
            <div class="eye left" :class="{ blink: isBlinking }"></div>
            <div class="eye right" :class="{ blink: isBlinking }"></div>
          </div>
          <div class="nose"></div>
          <div class="mouth"></div>
          <div class="whiskers">
            <div class="whisker-group left">
              <div class="whisker"></div>
              <div class="whisker"></div>
              <div class="whisker"></div>
            </div>
            <div class="whisker-group right">
              <div class="whisker"></div>
              <div class="whisker"></div>
              <div class="whisker"></div>
            </div>
          </div>
        </div>
      </div>
      <div class="cat-tail"></div>
      <div class="cat-paws">
        <div class="paw front-left"></div>
        <div class="paw front-right"></div>
        <div class="paw back-left"></div>
        <div class="paw back-right"></div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';

const catStyle = ref({
  left: '50%',
  top: '50%',
  transform: 'translate(-50%, -50%)',
  zIndex: 1000
});

const currentAction = ref('idle');
const isBlinking = ref(false);

// 可用的动作列表
const actions = [
  'walk-left',
  'walk-right',
  'peek',
  'jump',
  'sleep',
  'stretch',
  'play',
  'hide'
];

// 随机位置生成
const getRandomPosition = () => {
  const x = Math.random() * (window.innerWidth - 100);
  const y = Math.random() * (window.innerHeight - 100);
  return { x, y };
};

// 开始新动作
const startNewAction = () => {
  const newAction = actions[Math.floor(Math.random() * actions.length)];
  currentAction.value = newAction;
  
  // 根据动作设置位置和动画
  const newPos = getRandomPosition();
  
  // 设置新位置，添加过渡效果
  catStyle.value = {
    left: `${newPos.x}px`,
    top: `${newPos.y}px`,
    transform: 'translate(0, 0)',
    transition: 'all 1s ease-in-out',
    zIndex: Math.random() > 0.5 ? 1000 : 0 // 随机在组件前后
  };
  
  // 3-7秒后自动开始新动作
  setTimeout(() => {
    startNewAction();
  }, 3000 + Math.random() * 4000);
};

// 眨眼动画
const startBlinking = () => {
  const blinkInterval = setInterval(() => {
    isBlinking.value = true;
    setTimeout(() => {
      isBlinking.value = false;
    }, 200);
  }, 3000 + Math.random() * 2000);
  
  return blinkInterval;
};

let blinkInterval: number;

onMounted(() => {
  startNewAction();
  blinkInterval = startBlinking();
});

onUnmounted(() => {
  clearInterval(blinkInterval);
});
</script>

<style scoped>
.playful-cat {
  position: fixed;
  width: 60px;
  height: 60px;
  cursor: pointer;
  pointer-events: all;
}

.cat-body {
  position: relative;
  width: 100%;
  height: 100%;
}

.cat-head {
  position: absolute;
  width: 40px;
  height: 35px;
  background: #4a4a4a;
  border-radius: 50% 50% 45% 45%;
  top: 0;
  left: 10px;
}

.cat-ears {
  position: absolute;
  width: 100%;
  height: 20px;
  top: -10px;
}

.ear {
  position: absolute;
  width: 0;
  height: 0;
  border-left: 10px solid transparent;
  border-right: 10px solid transparent;
  border-bottom: 20px solid #4a4a4a;
}

.ear.left {
  left: 0;
  transform: rotate(-30deg);
}

.ear.right {
  right: 0;
  transform: rotate(30deg);
}

.cat-face {
  position: relative;
  height: 100%;
}

.eyes {
  position: absolute;
  width: 100%;
  top: 40%;
  display: flex;
  justify-content: space-around;
}

.eye {
  width: 8px;
  height: 8px;
  background: #fff;
  border-radius: 50%;
  position: relative;
}

.eye::after {
  content: '';
  position: absolute;
  width: 4px;
  height: 4px;
  background: #000;
  border-radius: 50%;
  top: 2px;
  left: 2px;
}

.eye.blink {
  height: 1px;
  background: #333;
}

.eye.blink::after {
  display: none;
}

.nose {
  position: absolute;
  width: 6px;
  height: 4px;
  background: #ff9999;
  border-radius: 50%;
  top: 60%;
  left: 50%;
  transform: translateX(-50%);
}

.mouth {
  position: absolute;
  width: 8px;
  height: 4px;
  border-bottom: 2px solid #666;
  border-radius: 50%;
  top: 70%;
  left: 50%;
  transform: translateX(-50%);
}

.whiskers {
  position: absolute;
  width: 100%;
  top: 60%;
}

.whisker-group {
  position: absolute;
  width: 20px;
  height: 15px;
}

.whisker-group.left {
  left: -20px;
  transform: rotate(10deg);
}

.whisker-group.right {
  right: -20px;
  transform: rotate(-10deg);
}

.whisker {
  width: 20px;
  height: 1px;
  background: #666;
  margin: 3px 0;
}

.cat-tail {
  position: absolute;
  width: 30px;
  height: 3px;
  background: #4a4a4a;
  bottom: 10px;
  right: -20px;
  border-radius: 3px;
  transform-origin: left center;
  animation: tail-wag 2s infinite;
}

.cat-paws {
  position: absolute;
  width: 100%;
  bottom: 0;
}

.paw {
  position: absolute;
  width: 10px;
  height: 5px;
  background: #4a4a4a;
  border-radius: 5px;
}

.paw.front-left {
  left: 10px;
  bottom: 0;
}

.paw.front-right {
  left: 25px;
  bottom: 0;
}

.paw.back-left {
  left: 15px;
  bottom: 0;
}

.paw.back-right {
  left: 30px;
  bottom: 0;
}

/* 动作动画 */
@keyframes tail-wag {
  0%, 100% { transform: rotate(0deg); }
  50% { transform: rotate(30deg); }
}

.walk-left {
  animation: walk-left 0.5s infinite;
}

.walk-right {
  animation: walk-right 0.5s infinite;
}

.peek {
  animation: peek 2s;
}

.jump {
  animation: jump 1s;
}

.sleep {
  animation: sleep 3s infinite;
}

.stretch {
  animation: stretch 2s;
}

.play {
  animation: play 1s infinite;
}

.hide {
  animation: hide 1s;
}

@keyframes walk-left {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-5px); }
}

@keyframes walk-right {
  0%, 100% { transform: translateY(0) scaleX(-1); }
  50% { transform: translateY(-5px) scaleX(-1); }
}

@keyframes peek {
  0% { transform: scale(1); }
  50% { transform: scale(1.1) translateY(-5px); }
  100% { transform: scale(1); }
}

@keyframes jump {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-30px); }
}

@keyframes sleep {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(0.9); }
}

@keyframes stretch {
  0% { transform: scaleY(1); }
  50% { transform: scaleY(1.2); }
  100% { transform: scaleY(1); }
}

@keyframes play {
  0% { transform: rotate(0); }
  25% { transform: rotate(20deg); }
  75% { transform: rotate(-20deg); }
  100% { transform: rotate(0); }
}

@keyframes hide {
  0% { transform: scale(1); opacity: 1; }
  100% { transform: scale(0.5); opacity: 0.5; }
}
</style> 