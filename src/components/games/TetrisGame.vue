<template>
  <div class="tetris-game">
    <div class="game-header">
      <div class="score-level-display">
        <span class="score-display">分数: {{ score }}</span>
        <span class="level-display">等级: {{ level }}</span>
      </div>
      <button class="sound-btn" @click="toggleSound" :title="soundEnabled ? '关闭音效' : '开启音效'">
        <span v-if="soundEnabled">🔊</span>
        <span v-else>🔇</span>
      </button>
      <button class="close-btn" @click="closeGame">×</button>
    </div>
    <div class="game-board">
      <canvas ref="gameCanvas" width="240" height="400"></canvas>
    </div>
    <div class="game-info">
      <div class="info-container">
        <div class="controls-info">
          <p>← → : 移动</p>
          <p>↑ : 旋转</p>
          <p>↓ : 加速下落</p>
          <p>空格 : 直接落下</p>
          <p>P : 暂停/继续</p>
        </div>
        <div class="next-piece-container">
          <div class="next-piece-label">下一块:</div>
          <canvas ref="nextPieceCanvas" width="80" height="80" class="next-piece"></canvas>
        </div>
      </div>
    </div>
    <div v-if="gameOver" class="game-over">
      <div class="game-over-content">
        <h3>游戏结束</h3>
        <p>最终分数: {{ score }}</p>
        <button @click="restartGame" class="restart-btn">重新开始</button>
      </div>
    </div>
    <div v-if="isPaused && !gameOver" class="game-paused">
      <div class="pause-content">
        <h3>游戏暂停</h3>
        <button @click="togglePause" class="resume-btn">继续</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue';

const props = defineProps<{
  isVisible: boolean;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
}>();

// 游戏状态
const gameCanvas = ref<HTMLCanvasElement | null>(null);
const nextPieceCanvas = ref<HTMLCanvasElement | null>(null);
const score = ref(0);
const level = ref(1);
const gameOver = ref(false);
const isPaused = ref(false);

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

// 游戏常量
const ROWS = 20;
const COLS = 10;
const BLOCK_SIZE = 35;
const COLORS = [
  '#FF0D72', // 红色 - Z形
  '#0DC2FF', // 青色 - I形
  '#0DFF72', // 绿色 - S形
  '#F538FF', // 紫色 - T形
  '#FF8E0D', // 橙色 - L形
  '#FFE138', // 黄色 - O形
  '#3877FF'  // 蓝色 - J形
];

// 方块形状定义
const SHAPES = [
  // Z形
  [
    [1, 1, 0],
    [0, 1, 1],
    [0, 0, 0]
  ],
  // I形
  [
    [0, 0, 0, 0],
    [1, 1, 1, 1],
    [0, 0, 0, 0],
    [0, 0, 0, 0]
  ],
  // S形
  [
    [0, 1, 1],
    [1, 1, 0],
    [0, 0, 0]
  ],
  // T形
  [
    [0, 1, 0],
    [1, 1, 1],
    [0, 0, 0]
  ],
  // L形
  [
    [0, 0, 1],
    [1, 1, 1],
    [0, 0, 0]
  ],
  // O形
  [
    [1, 1],
    [1, 1]
  ],
  // J形
  [
    [1, 0, 0],
    [1, 1, 1],
    [0, 0, 0]
  ]
];

// 游戏数据
let board: number[][] = [];
let currentPiece: { x: number; y: number; shape: number[][]; color: number } | null = null;
let nextPiece: { shape: number[][]; color: number } | null = null;
let gameInterval: number | null = null;
let dropSpeed = 1000; // 初始下落速度（毫秒）

// 初始化游戏板
const initBoard = () => {
  board = Array(ROWS).fill(null).map(() => Array(COLS).fill(0));
};

// 创建新方块
const createPiece = () => {
  const shapeIndex = Math.floor(Math.random() * SHAPES.length);
  return {
    x: Math.floor(COLS / 2) - Math.floor(SHAPES[shapeIndex][0].length / 2),
    y: 0,
    shape: SHAPES[shapeIndex],
    color: shapeIndex
  };
};

// 绘制游戏板
const drawBoard = () => {
  if (!gameCanvas.value) return;
  
  const ctx = gameCanvas.value.getContext('2d');
  if (!ctx) return;
  
  ctx.clearRect(0, 0, gameCanvas.value.width, gameCanvas.value.height);
  
  // 绘制已固定的方块
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      if (board[y][x]) {
        const colorIndex = board[y][x] - 1;
        if (colorIndex >= 0 && colorIndex < COLORS.length) {
          ctx.fillStyle = COLORS[colorIndex];
          ctx.fillRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
          ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
          ctx.strokeRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
        }
      }
    }
  }
  
  // 绘制当前方块
  if (currentPiece) {
    ctx.fillStyle = COLORS[currentPiece.color];
    for (let y = 0; y < currentPiece.shape.length; y++) {
      for (let x = 0; x < currentPiece.shape[y].length; x++) {
        if (currentPiece.shape[y][x]) {
          ctx.fillRect(
            (currentPiece.x + x) * BLOCK_SIZE,
            (currentPiece.y + y) * BLOCK_SIZE,
            BLOCK_SIZE,
            BLOCK_SIZE
          );
          ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
          ctx.strokeRect(
            (currentPiece.x + x) * BLOCK_SIZE,
            (currentPiece.y + y) * BLOCK_SIZE,
            BLOCK_SIZE,
            BLOCK_SIZE
          );
        }
      }
    }
  }
  
  // 绘制网格线
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
  for (let y = 0; y < ROWS; y++) {
    ctx.beginPath();
    ctx.moveTo(0, y * BLOCK_SIZE);
    ctx.lineTo(COLS * BLOCK_SIZE, y * BLOCK_SIZE);
    ctx.stroke();
  }
  
  for (let x = 0; x < COLS; x++) {
    ctx.beginPath();
    ctx.moveTo(x * BLOCK_SIZE, 0);
    ctx.lineTo(x * BLOCK_SIZE, ROWS * BLOCK_SIZE);
    ctx.stroke();
  }
};

// 绘制下一个方块
const drawNextPiece = () => {
  if (!nextPieceCanvas.value || !nextPiece) return;
  
  const ctx = nextPieceCanvas.value.getContext('2d');
  if (!ctx) return;
  
  ctx.clearRect(0, 0, nextPieceCanvas.value.width, nextPieceCanvas.value.height);
  
  const blockSize = 16;
  const offsetX = (nextPieceCanvas.value.width - nextPiece.shape[0].length * blockSize) / 2;
  const offsetY = (nextPieceCanvas.value.height - nextPiece.shape.length * blockSize) / 2;
  
  ctx.fillStyle = COLORS[nextPiece.color];
  for (let y = 0; y < nextPiece.shape.length; y++) {
    for (let x = 0; x < nextPiece.shape[y].length; x++) {
      if (nextPiece.shape[y][x]) {
        ctx.fillRect(
          offsetX + x * blockSize,
          offsetY + y * blockSize,
          blockSize,
          blockSize
        );
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.strokeRect(
          offsetX + x * blockSize,
          offsetY + y * blockSize,
          blockSize,
          blockSize
        );
      }
    }
  }
};

// 碰撞检测
const isCollision = (x: number, y: number, shape: number[][]) => {
  for (let row = 0; row < shape.length; row++) {
    for (let col = 0; col < shape[row].length; col++) {
      if (shape[row][col]) {
        const newX = x + col;
        const newY = y + row;
        
        // 检查边界
        if (newX < 0 || newX >= COLS || newY >= ROWS) {
          return true;
        }
        
        // 检查已有方块
        if (newY >= 0 && board[newY][newX]) {
          return true;
        }
      }
    }
  }
  return false;
};

// 旋转方块
const rotatePiece = () => {
  if (!currentPiece) return;
  
  const rotated = [];
  for (let i = 0; i < currentPiece.shape[0].length; i++) {
    const row = [];
    for (let j = currentPiece.shape.length - 1; j >= 0; j--) {
      row.push(currentPiece.shape[j][i]);
    }
    rotated.push(row);
  }
  
  // 检查旋转后是否会碰撞
  if (!isCollision(currentPiece.x, currentPiece.y, rotated)) {
    currentPiece.shape = rotated;
    // 播放旋转音效
    playSound(400, 0.05, 0.2);
  } else {
    // 尝试墙踢（wall kick）
    // 向左移动一格尝试
    if (!isCollision(currentPiece.x - 1, currentPiece.y, rotated)) {
      currentPiece.x -= 1;
      currentPiece.shape = rotated;
      playSound(400, 0.05, 0.2);
    } 
    // 向右移动一格尝试
    else if (!isCollision(currentPiece.x + 1, currentPiece.y, rotated)) {
      currentPiece.x += 1;
      currentPiece.shape = rotated;
      playSound(400, 0.05, 0.2);
    }
    // 向上移动一格尝试（针对I形方块）
    else if (!isCollision(currentPiece.x, currentPiece.y - 1, rotated)) {
      currentPiece.y -= 1;
      currentPiece.shape = rotated;
      playSound(400, 0.05, 0.2);
    }
  }
};

// 移动方块
const movePiece = (dx: number, dy: number) => {
  if (!currentPiece || gameOver.value || isPaused.value) return;
  
  if (!isCollision(currentPiece.x + dx, currentPiece.y + dy, currentPiece.shape)) {
    currentPiece.x += dx;
    currentPiece.y += dy;
    return true;
  }
  
  // 如果向下移动失败，则固定方块
  if (dy > 0) {
    lockPiece();
    return false;
  }
  
  return false;
};

// 固定方块到游戏板
const lockPiece = () => {
  if (!currentPiece) return;
  
  // 播放方块锁定音效
  playSound(300, 0.08, 0.2);
  
  for (let y = 0; y < currentPiece.shape.length; y++) {
    for (let x = 0; x < currentPiece.shape[y].length; x++) {
      if (currentPiece.shape[y][x]) {
        const boardY = currentPiece.y + y;
        const boardX = currentPiece.x + x;
        
        // 游戏结束检查
        if (boardY < 0) {
          endGame();
          return;
        }
        
        if (boardY >= 0 && boardY < ROWS && boardX >= 0 && boardX < COLS) {
          board[boardY][boardX] = currentPiece.color + 1;
        }
      }
    }
  }
  
  // 检查并清除完整行
  clearLines();
  
  // 生成新方块
  spawnNextPiece();
  
  // 确保游戏板被正确绘制
  drawBoard();
};

// 清除完整行
const clearLines = () => {
  // 创建一个新的游戏板副本用于检查和修改
  const newBoard = JSON.parse(JSON.stringify(board));
  const clearedRows = [];
  
  // 从底部向上检查每一行
  for (let y = ROWS - 1; y >= 0; y--) {
    // 检查行是否已满
    if (newBoard[y].every(cell => cell !== 0)) {
      clearedRows.push(y);
    }
  }
  
  // 如果没有行需要清除，直接返回
  if (clearedRows.length === 0) {
    return;
  }
  
  // 播放消除音效
  const frequencies = [440, 554.37, 659.25, 880]; // A4, C#5, E5, A5
  frequencies.slice(0, Math.min(clearedRows.length, 4)).forEach((freq, index) => {
    setTimeout(() => playSound(freq, 0.15, 0.3), index * 100);
  });
  
  // 更新分数
  const points = [40, 100, 300, 1200]; // 1, 2, 3, 4行的分数
  score.value += points[Math.min(clearedRows.length - 1, 3)] * level.value;
  
  // 更新等级
  const newLevel = Math.floor(score.value / 1000) + 1;
  if (newLevel > level.value) {
    level.value = newLevel;
    // 播放升级音效
    playSound(523.25, 0.1, 0.3); // C5
    setTimeout(() => playSound(659.25, 0.1, 0.3), 100); // E5
    setTimeout(() => playSound(783.99, 0.2, 0.3), 200); // G5
  }
  
  // 更新下落速度
  updateDropSpeed();
  
  // 保存原始游戏板用于动画
  const tempBoard = JSON.parse(JSON.stringify(board));
  
  // 创建新的游戏板，移除已满的行
  const filteredBoard = [];
  
  // 保留未满的行
  for (let y = 0; y < ROWS; y++) {
    if (!clearedRows.includes(y)) {
      filteredBoard.push([...board[y]]);
    }
  }
  
  // 在顶部添加新的空行
  while (filteredBoard.length < ROWS) {
    filteredBoard.unshift(Array(COLS).fill(0));
  }
  
  // 更新游戏板
  board = filteredBoard;
  
  // 立即重绘游戏板
  drawBoard();
  
  // 消除动画效果
  clearedRows.forEach((row, index) => {
    // 创建发光效果
    const ctx = gameCanvas.value?.getContext('2d');
    if (!ctx) return;
    
    // 保存原始颜色
    const originalColors = tempBoard[row].map((cell, x) => ({
      x,
      color: cell > 0 ? COLORS[cell - 1] : null
    }));
    
    // 动画持续时间
    const animationDuration = 300;
    const startTime = performance.now();
    
    // 发光动画
    const glowAnimation = () => {
      const currentTime = performance.now();
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / animationDuration, 1);
      
      // 绘制发光效果
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      
      // 根据进度调整发光强度
      const glowIntensity = Math.sin(progress * Math.PI);
      
      // 为整行添加发光效果
      ctx.shadowBlur = 20 * glowIntensity;
      ctx.shadowColor = '#fff';
      
      for (let x = 0; x < COLS; x++) {
        const color = originalColors[x].color || '#fff';
        ctx.fillStyle = color;
        // 绘制发光块
        ctx.fillRect(
          x * BLOCK_SIZE,
          row * BLOCK_SIZE,
          BLOCK_SIZE,
          BLOCK_SIZE
        );
      }
      
      ctx.restore();
      
      // 继续动画或结束
      if (progress < 1) {
        requestAnimationFrame(glowAnimation);
      } else {
        // 动画结束后重绘游戏板
        drawBoard();
      }
    };
    
    // 启动发光动画
    setTimeout(() => {
      requestAnimationFrame(glowAnimation);
    }, index * 100); // 错开多行消除的动画时间
  });
};

// 更新下落速度
const updateDropSpeed = () => {
  dropSpeed = Math.max(100, 1000 - (level.value - 1) * 100);
  
  if (gameInterval) {
    clearInterval(gameInterval);
    gameInterval = window.setInterval(dropPiece, dropSpeed);
  }
};

// 生成下一个方块
const spawnNextPiece = () => {
  if (nextPiece) {
    currentPiece = {
      x: Math.floor(COLS / 2) - Math.floor(nextPiece.shape[0].length / 2),
      y: 0,
      shape: nextPiece.shape,
      color: nextPiece.color
    };
  } else {
    currentPiece = createPiece();
  }
  
  nextPiece = {
    shape: SHAPES[Math.floor(Math.random() * SHAPES.length)],
    color: Math.floor(Math.random() * COLORS.length)
  };
  
  drawNextPiece();
  
  // 检查新生成的方块是否立即碰撞（游戏结束条件）
  if (isCollision(currentPiece.x, currentPiece.y, currentPiece.shape)) {
    endGame();
  }
};

// 方块下落
const dropPiece = () => {
  if (gameOver.value || isPaused.value) return;
  movePiece(0, 1);
};

// 快速下落（直接落到底部）
const hardDrop = () => {
  if (!currentPiece || gameOver.value || isPaused.value) return;
  
  while (movePiece(0, 1)) {
    // 继续下落直到不能移动
  }
};

// 游戏结束
const endGame = () => {
  gameOver.value = true;
  // 播放游戏结束音效
  playSound(392.00, 0.2, 0.3); // G4
  setTimeout(() => playSound(349.23, 0.2, 0.3), 200); // F4
  setTimeout(() => playSound(329.63, 0.3, 0.3), 400); // E4
  
  if (gameInterval) {
    clearInterval(gameInterval);
    gameInterval = null;
  }
};

// 重新开始游戏
const restartGame = () => {
  score.value = 0;
  level.value = 1;
  gameOver.value = false;
  isPaused.value = false;
  
  initBoard();
  
  if (gameInterval) {
    clearInterval(gameInterval);
  }
  
  dropSpeed = 1000;
  nextPiece = null;
  spawnNextPiece();
  
  gameInterval = window.setInterval(dropPiece, dropSpeed);
};

// 暂停/继续游戏
const togglePause = () => {
  isPaused.value = !isPaused.value;
};

// 键盘控制
const handleKeydown = (e: KeyboardEvent) => {
  if (!props.isVisible || gameOver.value) return;
  
  switch (e.key) {
    case 'ArrowLeft':
      movePiece(-1, 0);
      break;
    case 'ArrowRight':
      movePiece(1, 0);
      break;
    case 'ArrowDown':
      movePiece(0, 1);
      break;
    case 'ArrowUp':
      rotatePiece();
      break;
    case ' ':
      hardDrop();
      break;
    case 'p':
    case 'P':
      togglePause();
      break;
  }
  
  drawBoard();
};

// 游戏循环
const gameLoop = () => {
  if (!gameOver.value && !isPaused.value) {
    // 检查是否有满行需要清除
    let hasFullRow = false;
    for (let y = ROWS - 1; y >= 0; y--) {
      if (board[y].every(cell => cell !== 0)) {
        hasFullRow = true;
        break;
      }
    }
    
    if (hasFullRow) {
      clearLines();
    }
    
    drawBoard();
  }
  requestAnimationFrame(gameLoop);
};

// 关闭游戏
const closeGame = () => {
  emit('close');
};

// 初始化游戏
const initGame = () => {
  if (!gameCanvas.value || !nextPieceCanvas.value) return;
  
  // 设置画布大小
  gameCanvas.value.width = COLS * BLOCK_SIZE;
  gameCanvas.value.height = ROWS * BLOCK_SIZE;
  
  initBoard();
  spawnNextPiece();
  
  // 开始游戏循环
  gameLoop();
  
  // 设置下落定时器
  if (gameInterval) {
    clearInterval(gameInterval);
  }
  gameInterval = window.setInterval(dropPiece, dropSpeed);
  
  // 添加键盘事件监听
  window.addEventListener('keydown', handleKeydown);
};

// 组件挂载时初始化游戏
onMounted(() => {
  if (props.isVisible) {
    // 创建音频上下文
    if (soundEnabled.value) {
      createAudioContext();
    }
    initGame();
  }
});

// 组件卸载时清理资源
onUnmounted(() => {
  if (gameInterval) {
    clearInterval(gameInterval);
    gameInterval = null;
  }
  
  // 关闭音频上下文
  if (audioContext.value) {
    audioContext.value.close().catch(err => console.error('Error closing AudioContext:', err));
    audioContext.value = null;
  }
  
  window.removeEventListener('keydown', handleKeydown);
});

// 监听可见性变化
watch(() => props.isVisible, (visible) => {
  if (visible) {
    // 游戏变为可见时初始化
    // 如果音频上下文存在且处于暂停状态，则恢复
    if (soundEnabled.value && audioContext.value && audioContext.value.state === 'suspended') {
      audioContext.value.resume();
    }
    initGame();
  } else {
    // 游戏不可见时暂停
    isPaused.value = true;
    if (gameInterval) {
      clearInterval(gameInterval);
      gameInterval = null;
    }
    // 暂停音频上下文
    if (audioContext.value && audioContext.value.state === 'running') {
      audioContext.value.suspend();
    }
  }
});
</script>

<style scoped>
.tetris-game {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--widget-bg-color);
  color: var(--text-color);
  padding: 10px;
  border-radius: 8px;
  overflow: hidden;
}

.game-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.score-level-display {
  display: flex;
  gap: 15px;
  font-size: 0.9rem;
}

.score-display, .level-display {
  font-size: 0.9rem;
  font-weight: bold;
}

.sound-btn {
  background: none;
  border: none;
  color: var(--text-color);
  font-size: 1.2rem;
  line-height: 1;
  padding: 0;
  cursor: pointer;
  opacity: 0.7;
  transition: opacity 0.3s;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 8px;
}

.sound-btn:hover {
  opacity: 1;
}

.close-btn {
  background: none;
  border: none;
  color: var(--text-color);
  font-size: 1.5rem;
  line-height: 1;
  padding: 0;
  cursor: pointer;
  opacity: 0.7;
  transition: opacity 0.3s;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-btn:hover {
  opacity: 1;
}

.game-board {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  margin-bottom: 10px;
  width: 100%;
}

canvas {
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid var(--accent-color);
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.3);
}

.game-info {
  display: flex;
  flex-direction: column;
  padding: 10px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 4px;
  margin-top: auto;
}

.info-container {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.controls-info {
  font-size: 0.8rem;
  opacity: 0.8;
  flex: 1;
}

.controls-info p {
  margin: 3px 0;
}

.next-piece-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-left: 15px;
}

.next-piece-label {
  margin-bottom: 5px;
  font-size: 0.9rem;
  text-align: center;
}

.next-piece {
  width: 80px;
  height: 80px;
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid var(--accent-color);
}

.game-over, .game-paused {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 10;
}

.game-over-content, .pause-content {
  background: var(--widget-bg-color);
  padding: 20px;
  border-radius: 8px;
  text-align: center;
  box-shadow: 0 0 20px rgba(0, 0, 0, 0.5);
}

.restart-btn, .resume-btn {
  background-color: var(--accent-color);
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  margin-top: 15px;
  cursor: pointer;
  transition: background-color 0.3s;
}

.restart-btn:hover, .resume-btn:hover {
  background-color: rgba(var(--accent-rgb), 0.8);
}

/* 主题适配 */
:deep(.theme-light) canvas,
:deep(.theme-github) canvas {
  background: rgba(0, 0, 0, 0.1);
}

:deep(.theme-light) .game-info,
:deep(.theme-github) .game-info {
  background: rgba(0, 0, 0, 0.05);
}

@media (max-width: 768px) {
  .tetris-game {
    padding: 5px;
  }
  
  .score-level-display {
    font-size: 0.8rem;
    gap: 10px;
  }
  
  .controls-info {
    font-size: 0.7rem;
  }
  
  .info-container {
    flex-direction: column;
    align-items: center;
  }
  
  .next-piece-container {
    margin-left: 0;
    margin-top: 10px;
  }
}

@keyframes glow {
  0% {
    filter: brightness(1) drop-shadow(0 0 0px rgba(255, 255, 255, 0));
  }
  50% {
    filter: brightness(1.5) drop-shadow(0 0 10px rgba(255, 255, 255, 0.8));
  }
  100% {
    filter: brightness(1) drop-shadow(0 0 0px rgba(255, 255, 255, 0));
  }
}

.glow {
  animation: glow 0.4s ease-in-out;
}

@keyframes flash {
  0% { 
    opacity: 1;
    filter: brightness(1);
  }
  50% { 
    opacity: 1;
    filter: brightness(2);
  }
  100% { 
    opacity: 1;
    filter: brightness(1);
  }
}

.flash {
  animation: flash 0.4s ease-in-out;
}
</style>