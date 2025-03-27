<template>
  <div class="breakout-game" v-if="isVisible">
    <div class="game-header">
      <h3>打砖块</h3>
      <div class="game-stats">
        <span>得分: {{ score }}</span>
        <span>生命: {{ lives }}</span>
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
const lives = ref(3);

// 音效相关
const soundEnabled = ref(true); // 控制音效开关
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

// 根据颜色播放不同音效
function playSoundByColor(color: string) {
  switch (color) {
    case '#e74c3c': // 红色
      playSound(523.25); // C5
      break;
    case '#f39c12': // 橙色
      playSound(587.33); // D5
      break;
    case '#f1c40f': // 黄色
      playSound(659.25); // E5
      break;
    case '#2ecc71': // 绿色
      playSound(698.46); // F5
      break;
    case '#3498db': // 蓝色
      playSound(783.99); // G5
      break;
    case '#9b59b6': // 紫色
      playSound(880.00); // A5
      break;
    default:
      playSound(987.77); // B5
      break;
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

// 画布尺寸 - 固定比例，但更接近时钟组件的比例
const canvasWidth = 400;
const canvasHeight = 1000; // 增加高度，使画布更高

// 游戏元素
let ctx: CanvasRenderingContext2D | null = null;
let ballRadius = 6;
let x = 0;
let y = 0;
let dx = 2;
let dy = -2;
let paddleHeight = 8;
let paddleWidth = 70;
let paddleX = 0;
let rightPressed = false;
let leftPressed = false;
let brickRowCount = 12; // 增加更多行砖块
let brickColumnCount = 8;
let brickWidth = 40;
let brickHeight = 15;
let brickPadding = 4;
let brickOffsetTop = 40; // 从顶部留出一些空间给标题
let brickOffsetLeft = 20;
let animationFrameId: number | null = null;
let resizeObserver: ResizeObserver | null = null;

// 砖块数组
let bricks: { x: number; y: number; status: number; color: string }[][] = [];

// 初始化砖块
function initBricks() {
  bricks = [];
  for (let c = 0; c < brickColumnCount; c++) {
    bricks[c] = [];
    for (let r = 0; r < brickRowCount; r++) {
      // 根据行数设置不同的颜色
      let color;
      switch (r % 6) { // 使用模运算循环颜色
        case 0: color = '#e74c3c'; break; // 红色
        case 1: color = '#f39c12'; break; // 橙色
        case 2: color = '#f1c40f'; break; // 黄色
        case 3: color = '#2ecc71'; break; // 绿色
        case 4: color = '#3498db'; break; // 蓝色
        case 5: color = '#9b59b6'; break; // 紫色
        default: color = '#ffffff'; break; // 白色
      }
      
      bricks[c][r] = { x: 0, y: 0, status: 1, color };
    }
  }
}

// 调整画布大小以保持比例
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
  if (gameStarted.value && !gamePaused.value && !gameOver.value) {
    draw();
  } else {
    drawBricks();
    drawBall();
    drawPaddle();
    drawScore();
    drawLives();
  }
}

// 绘制球
function drawBall() {
  if (!ctx) return;
  
  ctx.beginPath();
  ctx.arc(x, y, ballRadius, 0, Math.PI * 2);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  ctx.closePath();
}

// 绘制挡板
function drawPaddle() {
  if (!ctx) return;
  
  ctx.beginPath();
  ctx.rect(paddleX, gameCanvas.value!.height - paddleHeight - 5, paddleWidth, paddleHeight);
  ctx.fillStyle = "#3498db";
  ctx.fill();
  ctx.closePath();
}

// 绘制砖块
function drawBricks() {
  if (!ctx) return;
  
  for (let c = 0; c < brickColumnCount; c++) {
    for (let r = 0; r < brickRowCount; r++) {
      if (bricks[c][r].status === 1) {
        let brickX = (c * (brickWidth + brickPadding)) + brickOffsetLeft;
        let brickY = (r * (brickHeight + brickPadding)) + brickOffsetTop;
        bricks[c][r].x = brickX;
        bricks[c][r].y = brickY;
        
        ctx.beginPath();
        ctx.rect(brickX, brickY, brickWidth, brickHeight);
        ctx.fillStyle = bricks[c][r].color;
        ctx.fill();
        ctx.closePath();
      }
    }
  }
}

// 绘制分数
function drawScore() {
  if (!ctx) return;
  
  ctx.font = "12px Arial";
  ctx.fillStyle = "#ffffff";
  ctx.fillText("Score: " + score.value, 8, 20);
}

// 绘制生命值
function drawLives() {
  if (!ctx) return;
  
  ctx.font = "12px Arial";
  ctx.fillStyle = "#ffffff";
  ctx.fillText("Lives: " + lives.value, gameCanvas.value!.width - 65, 20);
}

// 碰撞检测
function collisionDetection() {
  for (let c = 0; c < brickColumnCount; c++) {
    for (let r = 0; r < brickRowCount; r++) {
      let b = bricks[c][r];
      if (b.status === 1) {
        if (x > b.x && x < b.x + brickWidth && y > b.y && y < b.y + brickHeight) {
          dy = -dy;
          b.status = 0;
          score.value += 10;
          
          // 播放对应颜色的音效
          playSoundByColor(b.color);
          
          // 检查是否所有砖块都被击中
          if (score.value === brickRowCount * brickColumnCount * 10) {
            // 游戏胜利
            gameOver.value = true;
            gameStarted.value = false;
            cancelAnimationFrame(animationFrameId!);
            
            // 播放胜利音效
            if (audioContext.value) {
              // 播放一个简短的胜利旋律
              setTimeout(() => playSound(523.25, 0.2, 0.3), 0);    // C5
              setTimeout(() => playSound(659.25, 0.2, 0.3), 200);  // E5
              setTimeout(() => playSound(783.99, 0.2, 0.3), 400);  // G5
              setTimeout(() => playSound(1046.50, 0.4, 0.3), 600); // C6
            }
          }
        }
      }
    }
  }
}

// 绘制游戏
function draw() {
  if (!ctx || !gameCanvas.value) return;
  
  // 清除画布
  ctx.clearRect(0, 0, gameCanvas.value.width, gameCanvas.value.height);
  
  // 绘制游戏元素
  drawBricks();
  drawBall();
  drawPaddle();
  drawScore();
  drawLives();
  collisionDetection();
  
  // 边界检测 - 左右墙壁
  if (x + dx > gameCanvas.value.width - ballRadius || x + dx < ballRadius) {
    dx = -dx;
    // 播放墙壁碰撞音效
    playSound(200, 0.05, 0.2);
  }
  
  // 边界检测 - 上墙壁
  if (y + dy < ballRadius) {
    dy = -dy;
    // 播放墙壁碰撞音效
    playSound(200, 0.05, 0.2);
  } else if (y + dy > gameCanvas.value.height - ballRadius - 5) { // 调整底部边界，留出空间给挡板
    // 检测挡板碰撞
    if (x > paddleX && x < paddleX + paddleWidth) {
      // 根据击中挡板的位置改变反弹角度
      let hitPosition = (x - paddleX) / paddleWidth;
      dx = 6 * (hitPosition - 0.5); // -3 到 3 的范围
      dy = -Math.abs(dy); // 确保向上反弹
      
      // 播放挡板碰撞音效
      playSound(300, 0.1, 0.3);
    } else {
      // 失去一条生命
      lives.value--;
      
      // 播放失去生命音效
      playSound(150, 0.3, 0.4);
      
      if (lives.value === 0) {
        // 游戏结束
        gameOver.value = true;
        gameStarted.value = false;
        cancelAnimationFrame(animationFrameId!);
        
        // 播放游戏结束音效
        if (audioContext.value) {
          setTimeout(() => playSound(493.88, 0.2, 0.3), 0);   // B4
          setTimeout(() => playSound(440.00, 0.2, 0.3), 200); // A4
          setTimeout(() => playSound(392.00, 0.2, 0.3), 400); // G4
          setTimeout(() => playSound(349.23, 0.4, 0.3), 600); // F4
        }
      } else {
        // 重置球和挡板位置
        x = gameCanvas.value.width / 2;
        y = gameCanvas.value.height - 30;
        dx = 2;
        dy = -2;
        paddleX = (gameCanvas.value.width - paddleWidth) / 2;
      }
    }
  }
  
  // 移动挡板
  if (rightPressed && paddleX < gameCanvas.value.width - paddleWidth) {
    paddleX += 5;
  } else if (leftPressed && paddleX > 0) {
    paddleX -= 5;
  }
  
  // 移动球
  x += dx;
  y += dy;
  
  // 继续动画
  if (gameStarted.value && !gamePaused.value && !gameOver.value) {
    animationFrameId = requestAnimationFrame(draw);
  }
}

// 键盘事件处理
function keyDownHandler(e: KeyboardEvent) {
  if (e.key === "Right" || e.key === "ArrowRight") {
    rightPressed = true;
  } else if (e.key === "Left" || e.key === "ArrowLeft") {
    leftPressed = true;
  }
}

function keyUpHandler(e: KeyboardEvent) {
  if (e.key === "Right" || e.key === "ArrowRight") {
    rightPressed = false;
  } else if (e.key === "Left" || e.key === "ArrowLeft") {
    leftPressed = false;
  }
}

// 鼠标移动处理
function mouseMoveHandler(e: MouseEvent) {
  if (!gameCanvas.value) return;
  
  const rect = gameCanvas.value.getBoundingClientRect();
  const scaleX = gameCanvas.value.width / rect.width;
  const relativeX = (e.clientX - rect.left) * scaleX;
  
  if (relativeX > 0 && relativeX < gameCanvas.value.width) {
    paddleX = relativeX - paddleWidth / 2;
  }
}

// 触摸移动处理
function touchMoveHandler(e: TouchEvent) {
  if (!gameCanvas.value) return;
  
  const rect = gameCanvas.value.getBoundingClientRect();
  const scaleX = gameCanvas.value.width / rect.width;
  const relativeX = (e.touches[0].clientX - rect.left) * scaleX;
  
  if (relativeX > 0 && relativeX < gameCanvas.value.width) {
    paddleX = relativeX - paddleWidth / 2;
  }
  
  // 防止触摸滚动页面
  e.preventDefault();
}

// 游戏控制函数
function startGame() {
  if (gameStarted.value) return;
  
  // 初始化游戏状态
  gameStarted.value = true;
  gamePaused.value = false;
  gameOver.value = false;
  score.value = 0;
  lives.value = 3;
  
  // 初始化砖块
  initBricks();
  
  // 初始化球和挡板位置
  if (gameCanvas.value) {
    x = gameCanvas.value.width / 2;
    y = gameCanvas.value.height - 30;
    paddleX = (gameCanvas.value.width - paddleWidth) / 2;
  }
  
  // 确保音频上下文已创建
  if (soundEnabled.value && !audioContext.value) {
    createAudioContext();
  }
  
  // 如果音频上下文处于暂停状态，则恢复
  if (soundEnabled.value && audioContext.value && audioContext.value.state === 'suspended') {
    audioContext.value.resume();
  }
  
  // 播放开始游戏音效
  if (soundEnabled.value && audioContext.value) {
    playSound(523.25, 0.1, 0.3); // C5
    setTimeout(() => playSound(659.25, 0.1, 0.3), 100); // E5
    setTimeout(() => playSound(783.99, 0.1, 0.3), 200); // G5
  }
  
  // 开始游戏循环
  animationFrameId = requestAnimationFrame(draw);
}

function pauseGame() {
  if (!gameStarted.value || gameOver.value) return;
  
  gamePaused.value = true;
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
  }
}

function resumeGame() {
  if (!gameStarted.value || gameOver.value || !gamePaused.value) return;
  
  gamePaused.value = false;
  animationFrameId = requestAnimationFrame(draw);
}

function restartGame() {
  startGame();
}

function closeGame() {
  // 停止游戏
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
  }
  
  // 重置游戏状态
  gameStarted.value = false;
  gamePaused.value = false;
  gameOver.value = false;
  
  // 发送关闭事件
  emit('close');
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
  }
});

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

// 初始化游戏
function initGame() {
  if (!gameCanvas.value) return;
  
  // 设置画布实际尺寸
  gameCanvas.value.width = canvasWidth;
  gameCanvas.value.height = canvasHeight;
  
  ctx = gameCanvas.value.getContext('2d');
  if (!ctx) return;
  
  // 初始化砖块
  initBricks();
  
  // 初始化球和挡板位置
  x = gameCanvas.value.width / 2;
  y = gameCanvas.value.height - 30;
  paddleX = (gameCanvas.value.width - paddleWidth) / 2;
  
  // 调整画布大小
  nextTick(() => {
    resizeCanvas();
  });
}

// 组件挂载时添加事件监听
onMounted(() => {
  document.addEventListener('keydown', keyDownHandler);
  document.addEventListener('keyup', keyUpHandler);
  
  if (gameCanvas.value) {
    gameCanvas.value.addEventListener('mousemove', mouseMoveHandler);
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
  document.removeEventListener('keyup', keyUpHandler);
  
  if (gameCanvas.value) {
    gameCanvas.value.removeEventListener('mousemove', mouseMoveHandler);
    gameCanvas.value.removeEventListener('touchmove', touchMoveHandler);
  }
  
  // 停止游戏循环
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
  }
});
</script>

<style scoped>
.breakout-game {
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

.sound-btn {
  background: none;
  border: none;
  color: var(--text-color);
  font-size: 16px;
  cursor: pointer;
  padding: 0 8px;
  line-height: 1;
  margin-right: 5px;
}

.sound-btn:hover {
  opacity: 0.8;
}

.close-btn {
  background: none;
  border: none;
  color: var(--text-color);
  font-size: 16px;
  cursor: pointer;
  padding: 0;
  line-height: 1;
}

.canvas-container {
  display: flex;
  justify-content: center;
  align-items: center;
  flex: 1;
  overflow: hidden;
  border-radius: 4px;
  position: relative;
}

canvas {
  display: block;
  image-rendering: pixelated;
  image-rendering: crisp-edges;
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  margin: auto;
  max-width: 100%;
  max-height: 100%;
}

.game-controls {
  display: flex;
  justify-content: center;
  gap: 8px;
  flex-shrink: 0;
  padding: 5px 0;
  z-index: 10;
}

.game-controls button {
  padding: 5px 10px;
  background-color: var(--accent-color);
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.2s;
}

.game-controls button:hover {
  filter: brightness(1.1);
}

.game-message {
  text-align: center;
  color: var(--text-color);
  font-size: 12px;
  font-weight: bold;
  flex-shrink: 0;
  background-color: rgba(0, 0, 0, 0.2);
  border-radius: 4px;
  padding: 5px;
  z-index: 10;
}

/* 响应式调整 */
@media (max-width: 500px) {
  .game-header h3 {
    font-size: 12px;
  }
  
  .game-stats {
    font-size: 10px;
    gap: 6px;
  }
  
  .game-controls button {
    padding: 4px 8px;
    font-size: 10px;
  }
}
</style> 