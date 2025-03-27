<template>
  <div class="snake-game" v-if="isVisible">
    <div class="game-header">
      <h3>贪吃蛇</h3>
      <div class="game-stats">
        <span>得分: {{ score }}</span>
        <span>最高分: {{ highScore }}</span>
      </div>
      <button class="sound-btn" @click="toggleSound" :title="soundEnabled ? '关闭音效' : '开启音效'">
        <span v-if="soundEnabled">🔊</span>
        <span v-else>🔇</span>
      </button>
      <button class="close-btn" @click="closeGame">&times;</button>
    </div>
    
    <div class="canvas-container" ref="canvasContainer">
      <canvas ref="gameCanvas" :width="canvasWidth" :height="canvasHeight"></canvas>
    </div>
    
    <div class="game-controls">
      <button @click="startGame" v-if="!gameStarted">开始游戏</button>
      <button @click="pauseGame" v-if="gameStarted && !gamePaused">暂停</button>
      <button @click="resumeGame" v-if="gameStarted && gamePaused">继续</button>
      <button @click="restartGame" v-if="gameOver">重新开始</button>
    </div>
    
    <div class="game-message" v-if="gameOver">
      游戏结束! 最终得分: {{ score }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick, onBeforeUnmount } from 'vue';

// 定义属性和事件
const props = defineProps<{
  isVisible: boolean;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
}>();

// 游戏状态
const gameCanvas = ref<HTMLCanvasElement | null>(null);
const canvasContainer = ref<HTMLDivElement | null>(null);
const gameStarted = ref(false);
const gamePaused = ref(false);
const gameOver = ref(false);
const score = ref(0);
const highScore = ref(0);

// 音效相关
const soundEnabled = ref(true);
const audioContext = ref<AudioContext | null>(null);

// 创建音频上下文
function createAudioContext() {
  try {
    audioContext.value = new (window.AudioContext || (window as any).webkitAudioContext)();
    return true;
  } catch (e) {
    console.error('Web Audio API is not supported in this browser');
    return false;
  }
}

// 播放音效
function playSound(frequency: number, duration: number = 0.1, volume: number = 0.5) {
  if (!soundEnabled.value || !audioContext.value) return;
  
  try {
    const oscillator = audioContext.value.createOscillator();
    const gainNode = audioContext.value.createGain();
    
    oscillator.type = 'sine';
    oscillator.frequency.value = frequency;
    
    gainNode.gain.value = volume;
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.value.destination);
    
    oscillator.start();
    
    // 设置音量渐变
    gainNode.gain.exponentialRampToValueAtTime(
      0.001, audioContext.value.currentTime + duration
    );
    
    // 停止振荡器
    setTimeout(() => {
      oscillator.stop();
    }, duration * 1000);
  } catch (e) {
    console.error('Error playing sound:', e);
  }
}

// 切换音效开关
function toggleSound() {
  soundEnabled.value = !soundEnabled.value;
  
  // 如果开启音效且音频上下文未创建，则创建
  if (soundEnabled.value && !audioContext.value) {
    createAudioContext();
  }
  
  // 如果音频上下文处于暂停状态，则恢复
  if (soundEnabled.value && audioContext.value && audioContext.value.state === 'suspended') {
    audioContext.value.resume();
  }
}

// 画布尺寸
const canvasWidth = 400;
const canvasHeight = 900;

// 游戏元素
let ctx: CanvasRenderingContext2D | null = null;
let animationFrameId: number | null = null;
let resizeObserver: ResizeObserver | null = null;
let gameInterval: number | null = null;

// 蛇的属性
const gridSize = 16; // 减小网格大小，使游戏场景更大
const initialSnakeLength = 3; // 初始蛇的长度
let snake: {x: number, y: number}[] = []; // 蛇的身体
let direction = 'right'; // 初始方向
let nextDirection = 'right'; // 下一步方向
let food = {x: 0, y: 0}; // 食物位置
let speed = 150; // 初始速度（毫秒）

// 初始化蛇
function initSnake() {
  snake = [];
  // 计算网格中心位置
  const gridWidth = Math.floor(canvasWidth / gridSize);
  const gridHeight = Math.floor(canvasHeight / gridSize);
  const centerX = Math.floor(gridWidth / 2);
  const centerY = Math.floor(gridHeight / 2);
  
  // 创建初始蛇身，从中心位置开始
  for (let i = 0; i < initialSnakeLength; i++) {
    snake.push({x: centerX - i, y: centerY});
  }
  direction = 'right';
  nextDirection = 'right';
}

// 生成食物
function generateFood() {
  // 计算可用的网格数
  const gridWidth = Math.floor(canvasWidth / gridSize);
  const gridHeight = Math.floor(canvasHeight / gridSize);
  
  // 随机生成食物位置
  let newFood;
  let foodOnSnake;
  
  do {
    foodOnSnake = false;
    newFood = {
      x: Math.floor(Math.random() * gridWidth),
      y: Math.floor(Math.random() * gridHeight)
    };
    
    // 检查食物是否在蛇身上
    for (let i = 0; i < snake.length; i++) {
      if (snake[i].x === newFood.x && snake[i].y === newFood.y) {
        foodOnSnake = true;
        break;
      }
    }
  } while (foodOnSnake);
  
  food = newFood;
}

// 绘制蛇
function drawSnake() {
  if (!ctx) return;
  
  // 绘制蛇身
  for (let i = 0; i < snake.length; i++) {
    const segment = snake[i];
    
    // 蛇头和蛇身使用不同颜色
    if (i === 0) {
      // 蛇头
      ctx.fillStyle = "#4CAF50"; // 蛇头颜色
      ctx.shadowColor = "#4CAF50";
      ctx.shadowBlur = 10;
    } else {
      // 渐变色蛇身
      const colorValue = 100 - (i * 2);
      ctx.fillStyle = `rgb(76, ${175 - i * 5}, 80)`;
      ctx.shadowBlur = 0;
    }
    
    // 绘制圆角矩形作为蛇身
    const radius = 4; // 圆角半径
    const x = segment.x * gridSize;
    const y = segment.y * gridSize;
    const width = gridSize;
    const height = gridSize;
    
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + width, y, x + width, y + height, radius);
    ctx.arcTo(x + width, y + height, x, y + height, radius);
    ctx.arcTo(x, y + height, x, y, radius);
    ctx.arcTo(x, y, x + width, y, radius);
    ctx.closePath();
    ctx.fill();
    
    // 绘制蛇身边框
    ctx.strokeStyle = "rgba(0, 0, 0, 0.2)";
    ctx.lineWidth = 1;
    ctx.stroke();
    
    // 如果是蛇头，添加眼睛
    if (i === 0) {
      const eyeSize = gridSize / 5;
      const eyeOffset = gridSize / 3;
      
      // 根据方向调整眼睛位置
      let eyeX1, eyeY1, eyeX2, eyeY2;
      
      switch (direction) {
        case 'up':
          eyeX1 = x + eyeOffset;
          eyeY1 = y + eyeOffset;
          eyeX2 = x + width - eyeOffset;
          eyeY2 = y + eyeOffset;
          break;
        case 'down':
          eyeX1 = x + eyeOffset;
          eyeY1 = y + height - eyeOffset;
          eyeX2 = x + width - eyeOffset;
          eyeY2 = y + height - eyeOffset;
          break;
        case 'left':
          eyeX1 = x + eyeOffset;
          eyeY1 = y + eyeOffset;
          eyeX2 = x + eyeOffset;
          eyeY2 = y + height - eyeOffset;
          break;
        case 'right':
        default:
          eyeX1 = x + width - eyeOffset;
          eyeY1 = y + eyeOffset;
          eyeX2 = x + width - eyeOffset;
          eyeY2 = y + height - eyeOffset;
          break;
      }
      
      // 绘制眼睛
      ctx.fillStyle = "#000";
      ctx.beginPath();
      ctx.arc(eyeX1, eyeY1, eyeSize, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.beginPath();
      ctx.arc(eyeX2, eyeY2, eyeSize, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  
  // 重置阴影
  ctx.shadowBlur = 0;
}

// 绘制食物
function drawFood() {
  if (!ctx) return;
  
  // 食物位置
  const x = food.x * gridSize + gridSize / 2;
  const y = food.y * gridSize + gridSize / 2;
  const radius = gridSize / 2 - 2;
  
  // 添加光晕效果
  ctx.shadowColor = "#FF5252";
  ctx.shadowBlur = 15;
  
  // 绘制食物
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fillStyle = "#FF5252";
  ctx.fill();
  
  // 添加高光
  ctx.beginPath();
  ctx.arc(x - radius / 3, y - radius / 3, radius / 4, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
  ctx.fill();
  
  // 重置阴影
  ctx.shadowBlur = 0;
}

// 绘制网格
function drawGrid() {
  if (!ctx) return;
  
  // 绘制内部网格线
  ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
  ctx.lineWidth = 0.5;
  
  // 绘制垂直线
  for (let x = gridSize; x < canvasWidth; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvasHeight);
    ctx.stroke();
  }
  
  // 绘制水平线
  for (let y = gridSize; y < canvasHeight; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvasWidth, y);
    ctx.stroke();
  }
  
  // 绘制边界
  ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
  ctx.lineWidth = 2;
  ctx.strokeRect(0, 0, canvasWidth, canvasHeight);
}

// 绘制分数
function drawScore() {
  if (!ctx) return;
  
  ctx.font = "16px Arial";
  ctx.fillStyle = "#ffffff";
  ctx.fillText("分数: " + score.value, 10, 20);
}

// 移动蛇
function moveSnake() {
  if (gamePaused.value || gameOver.value) return;
  
  // 更新方向
  direction = nextDirection;
  
  // 获取蛇头
  const head = {x: snake[0].x, y: snake[0].y};
  
  // 根据方向移动蛇头
  switch (direction) {
    case 'up':
      head.y--;
      break;
    case 'down':
      head.y++;
      break;
    case 'left':
      head.x--;
      break;
    case 'right':
      head.x++;
      break;
  }
  
  // 检查是否撞墙
  const gridWidth = Math.floor(canvasWidth / gridSize);
  const gridHeight = Math.floor(canvasHeight / gridSize);
  
  if (head.x < 0 || head.x >= gridWidth || head.y < 0 || head.y >= gridHeight) {
    gameOver.value = true;
    playSound(150, 0.3, 0.4); // 游戏结束音效
    return;
  }
  
  // 检查是否撞到自己
  for (let i = 0; i < snake.length; i++) {
    if (snake[i].x === head.x && snake[i].y === head.y) {
      gameOver.value = true;
      playSound(150, 0.3, 0.4); // 游戏结束音效
      return;
    }
  }
  
  // 在蛇头前添加新的头部
  snake.unshift(head);
  
  // 检查是否吃到食物
  if (head.x === food.x && head.y === food.y) {
    // 吃到食物，增加分数
    score.value += 10;
    
    // 更新最高分
    if (score.value > highScore.value) {
      highScore.value = score.value;
      // 保存最高分到本地存储
      localStorage.setItem('snakeHighScore', highScore.value.toString());
    }
    
    // 播放吃食物音效
    playSound(600, 0.1, 0.3);
    
    // 生成新的食物
    generateFood();
    
    // 增加速度
    if (speed > 50) {
      speed = Math.max(50, speed - 5);
      // 重新设置游戏间隔
      if (gameInterval) {
        clearInterval(gameInterval);
        gameInterval = window.setInterval(moveSnake, speed);
      }
    }
  } else {
    // 没吃到食物，移除尾部
    snake.pop();
  }
}

// 绘制游戏
function draw() {
  if (!ctx || !gameCanvas.value) return;
  
  // 清除画布
  ctx.clearRect(0, 0, canvasWidth, canvasHeight);
  
  // 绘制网格
  drawGrid();
  
  // 绘制食物
  drawFood();
  
  // 绘制蛇
  drawSnake();
  
  // 绘制分数
  drawScore();
  
  // 继续动画
  if (gameStarted.value && !gamePaused.value && !gameOver.value) {
    animationFrameId = requestAnimationFrame(draw);
  }
}

// 键盘事件处理
function keyDownHandler(e: KeyboardEvent) {
  // 防止方向键滚动页面
  if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(e.code)) {
    e.preventDefault();
  }
  
  // 如果游戏未开始或已结束，忽略按键
  if (!gameStarted.value || gameOver.value) return;
  
  // 暂停/继续游戏
  if (e.code === "Space") {
    if (gamePaused.value) {
      resumeGame();
    } else {
      pauseGame();
    }
    return;
  }
  
  // 更新方向（防止180度转弯）
  switch (e.code) {
    case "ArrowUp":
      if (direction !== 'down') nextDirection = 'up';
      break;
    case "ArrowDown":
      if (direction !== 'up') nextDirection = 'down';
      break;
    case "ArrowLeft":
      if (direction !== 'right') nextDirection = 'left';
      break;
    case "ArrowRight":
      if (direction !== 'left') nextDirection = 'right';
      break;
  }
}

// 触摸事件处理
let touchStartX = 0;
let touchStartY = 0;

function touchStartHandler(e: TouchEvent) {
  touchStartX = e.touches[0].clientX;
  touchStartY = e.touches[0].clientY;
  e.preventDefault();
}

function touchMoveHandler(e: TouchEvent) {
  if (!gameStarted.value || gameOver.value || gamePaused.value) return;
  
  e.preventDefault();
  
  const touchEndX = e.touches[0].clientX;
  const touchEndY = e.touches[0].clientY;
  
  const dx = touchEndX - touchStartX;
  const dy = touchEndY - touchStartY;
  
  // 需要一定的滑动距离才触发方向变化
  const minSwipeDistance = 30;
  
  if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > minSwipeDistance) {
    // 水平滑动
    if (dx > 0 && direction !== 'left') {
      nextDirection = 'right';
    } else if (dx < 0 && direction !== 'right') {
      nextDirection = 'left';
    }
  } else if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > minSwipeDistance) {
    // 垂直滑动
    if (dy > 0 && direction !== 'up') {
      nextDirection = 'down';
    } else if (dy < 0 && direction !== 'down') {
      nextDirection = 'up';
    }
  }
  
  // 更新起始点，使滑动更流畅
  touchStartX = touchEndX;
  touchStartY = touchEndY;
}

// 调整画布大小
function resizeCanvas() {
  if (!canvasContainer.value || !gameCanvas.value || !ctx) return;
  
  const containerWidth = canvasContainer.value.clientWidth;
  const containerHeight = canvasContainer.value.clientHeight;
  
  // 计算缩放比例，保持画布比例
  const scale = Math.min(
    containerWidth / canvasWidth,
    containerHeight / canvasHeight
  );
  
  // 设置画布CSS尺寸
  gameCanvas.value.style.width = `${canvasWidth * scale}px`;
  gameCanvas.value.style.height = `${canvasHeight * scale}px`;
  
  // 重新绘制游戏
  draw();
}

// 设置调整大小观察器
function setupResizeObserver() {
  if (resizeObserver) {
    resizeObserver.disconnect();
  }
  
  if (canvasContainer.value) {
    resizeObserver = new ResizeObserver(() => {
      resizeCanvas();
    });
    
    resizeObserver.observe(canvasContainer.value);
  }
}

// 游戏控制函数
function startGame() {
  if (gameStarted.value) return;
  
  // 初始化游戏状态
  gameStarted.value = true;
  gamePaused.value = false;
  gameOver.value = false;
  score.value = 0;
  speed = 150;
  
  // 初始化蛇和食物
  initSnake();
  generateFood();
  
  // 确保音频上下文已创建
  if (soundEnabled.value && !audioContext.value) {
    createAudioContext();
  }
  
  // 如果音频上下文处于暂停状态，则恢复
  if (soundEnabled.value && audioContext.value && audioContext.value.state === 'suspended') {
    audioContext.value.resume();
  }
  
  // 播放开始游戏音效
  playSound(523.25, 0.1, 0.3); // C5
  setTimeout(() => playSound(659.25, 0.1, 0.3), 100); // E5
  setTimeout(() => playSound(783.99, 0.1, 0.3), 200); // G5
  
  // 开始游戏循环
  animationFrameId = requestAnimationFrame(draw);
  gameInterval = window.setInterval(moveSnake, speed);
}

function pauseGame() {
  if (!gameStarted.value || gameOver.value) return;
  
  gamePaused.value = true;
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
  }
  if (gameInterval) {
    clearInterval(gameInterval);
  }
}

function resumeGame() {
  if (!gameStarted.value || gameOver.value || !gamePaused.value) return;
  
  gamePaused.value = false;
  animationFrameId = requestAnimationFrame(draw);
  gameInterval = window.setInterval(moveSnake, speed);
}

function restartGame() {
  // 停止当前游戏循环
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
  }
  if (gameInterval) {
    clearInterval(gameInterval);
  }
  
  // 重置游戏状态
  gameStarted.value = false;
  gamePaused.value = false;
  gameOver.value = false;
  
  // 启动新游戏
  startGame();
}

function closeGame() {
  // 停止游戏
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
  }
  if (gameInterval) {
    clearInterval(gameInterval);
  }
  
  // 重置游戏状态
  gameStarted.value = false;
  gamePaused.value = false;
  gameOver.value = false;
  
  // 发送关闭事件
  emit('close');
}

// 初始化游戏
function initGame() {
  if (!gameCanvas.value) return;
  
  // 设置画布实际尺寸
  gameCanvas.value.width = canvasWidth;
  gameCanvas.value.height = canvasHeight;
  
  ctx = gameCanvas.value.getContext('2d');
  if (!ctx) return;
  
  // 从本地存储加载最高分
  const savedHighScore = localStorage.getItem('snakeHighScore');
  if (savedHighScore) {
    highScore.value = parseInt(savedHighScore);
  }
  
  // 初始化蛇和食物
  initSnake();
  generateFood();
  
  // 调整画布大小
  nextTick(() => {
    resizeCanvas();
  });
}

// 监听组件可见性变化
watch(() => props.isVisible, (newValue) => {
  if (newValue) {
    // 组件显示时初始化游戏
    nextTick(() => {
      initGame();
      setupResizeObserver();
    });
  } else {
    // 组件隐藏时停止游戏
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
    }
    if (gameInterval) {
      clearInterval(gameInterval);
    }
  }
});

// 组件挂载时添加事件监听
onMounted(() => {
  document.addEventListener('keydown', keyDownHandler);
  
  if (gameCanvas.value) {
    gameCanvas.value.addEventListener('touchstart', touchStartHandler, { passive: false });
    gameCanvas.value.addEventListener('touchmove', touchMoveHandler, { passive: false });
    
    // 初始化游戏
    if (props.isVisible) {
      nextTick(() => {
        initGame();
        setupResizeObserver();
        
        // 创建音频上下文
        if (soundEnabled.value) {
          createAudioContext();
        }
      });
    }
  }
});

// 组件卸载前清理
onBeforeUnmount(() => {
  if (resizeObserver) {
    resizeObserver.disconnect();
    resizeObserver = null;
  }
  
  // 关闭音频上下文
  if (audioContext.value) {
    audioContext.value.close().catch(err => console.error('Error closing AudioContext:', err));
    audioContext.value = null;
  }
});

// 组件卸载时移除事件监听
onUnmounted(() => {
  document.removeEventListener('keydown', keyDownHandler);
  
  if (gameCanvas.value) {
    gameCanvas.value.removeEventListener('touchstart', touchStartHandler);
    gameCanvas.value.removeEventListener('touchmove', touchMoveHandler);
  }
  
  // 停止游戏循环
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
  }
  if (gameInterval) {
    clearInterval(gameInterval);
  }
});
</script>

<style scoped>
.snake-game {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: transparent;
  border-radius: 8px;
  padding: 5px;
  gap: 5px;
  overflow: hidden;
}

.game-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-shrink: 0;
  background-color: rgba(0, 0, 0, 0.2);
  backdrop-filter: blur(5px);
  border-radius: 4px;
  padding: 5px 10px;
  z-index: 10;
}

.game-header h3 {
  margin: 0;
  color: var(--text-color);
  font-size: 14px;
}

.game-stats {
  display: flex;
  gap: 10px;
  color: var(--text-color);
  font-size: 12px;
}

.sound-btn, .close-btn {
  background: none;
  border: none;
  color: var(--text-color);
  cursor: pointer;
  font-size: 16px;
  padding: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0.8;
  transition: opacity 0.2s;
}

.sound-btn:hover, .close-btn:hover {
  opacity: 1;
}

.close-btn {
  background-color: rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  font-size: 18px;
}

.canvas-container {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  overflow: hidden;
  border-radius: 4px;
  position: relative;
  background-color: rgba(0, 0, 0, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.1);
  margin: 0 5px;
  padding: 5px;
}

.game-controls {
  display: flex;
  justify-content: center;
  gap: 10px;
  margin-top: 5px;
  flex-shrink: 0;
}

.game-controls button {
  background-color: rgba(0, 0, 0, 0.2);
  backdrop-filter: blur(5px);
  border: none;
  border-radius: 4px;
  color: var(--text-color);
  cursor: pointer;
  padding: 5px 15px;
  font-size: 14px;
  transition: background-color 0.2s;
}

.game-controls button:hover {
  background-color: rgba(0, 0, 0, 0.3);
}

.game-message {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background-color: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(5px);
  color: white;
  padding: 15px 20px;
  border-radius: 8px;
  text-align: center;
  font-size: 16px;
  z-index: 20;
}

/* 响应式调整 */
@media (max-width: 768px) {
  .game-header h3 {
    font-size: 12px;
  }
  
  .game-stats {
    font-size: 10px;
  }
  
  .game-controls button {
    font-size: 12px;
    padding: 4px 10px;
  }
}
</style> 