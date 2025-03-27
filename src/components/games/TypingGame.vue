<template>
  <div class="typing-game" v-if="isVisible">
    <div class="game-header">
      <h3>单词雨</h3>
      <div class="game-stats">
        <span>得分: {{ score }}</span>
        <span>生命: {{ lives }}</span>
        <span>等级: {{ level }}</span>
        <span>难度: {{ difficultyNames[difficulty] }}</span>
      </div>
      <button class="sound-btn" @click="toggleSound" :title="soundEnabled ? '关闭音效' : '开启音效'">
        <span v-if="soundEnabled">🔊</span>
        <span v-else>🔇</span>
      </button>
      <button class="close-btn" @click="closeGame">&times;</button>
    </div>
    
    <div class="game-content">
      <div class="word-rain-container" ref="gameContainer" :class="{ 'game-over': gameOver, 'game-paused': gamePaused }">
        <div v-if="!gameStarted && !gameOver" class="start-message">
          <h3>准备好挑战单词雨了吗？</h3>
          <div class="difficulty-selector">
            <h4>选择难度:</h4>
            <div class="difficulty-options">
              <button 
                v-for="(name, index) in difficultyNames" 
                :key="index"
                @click="setDifficulty(index)"
                :class="{ 'selected': difficulty === index }"
              >
                {{ name }}
              </button>
            </div>
          </div>
          
          <div class="font-size-selector">
            <h4>字体大小:</h4>
            <div class="font-size-controls">
              <button @click="decreaseFontSize" :disabled="fontSize <= 12">-</button>
              <span>{{ fontSize }}px</span>
              <button @click="increaseFontSize" :disabled="fontSize >= 30">+</button>
            </div>
          </div>
        </div>
        <div v-else-if="gameOver" class="game-over-message">
          游戏结束! 最终得分: {{ score }}
        </div>
        <div v-else-if="gamePaused" class="pause-message">
          游戏已暂停
        </div>
        <div v-else>
          <div 
            v-for="(word, index) in fallingWords" 
            :key="index" 
            class="falling-word"
            :class="{ 
              'active': activeWordIndex === index,
              'exploding': word.exploding
            }"
            :style="{ 
              left: word.x + 'px', 
              top: word.y + 'px',
              fontSize: fontSize + 'px',
              color: word.matched ? '#2ecc71' : (activeWordIndex === index ? '#f1c40f' : 'white')
            }"
          >
            {{ word.text }}
            <div v-if="word.exploding" class="explosion">
              <div v-for="i in 10" :key="i" class="particle" :style="getParticleStyle(i)"></div>
            </div>
          </div>
        </div>
      </div>
      
      <div class="typed-text-container">
        <input 
          ref="inputField"
          type="text" 
          v-model="typedText" 
          @input="checkInput"
          @keydown.enter="clearInput"
          :disabled="!gameStarted || gameOver || gamePaused"
          placeholder="在这里输入单词..."
          autocomplete="off"
          autocorrect="off"
          autocapitalize="off"
          spellcheck="false"
        />
      </div>
    </div>
    
    <div class="game-controls">
      <button @click="startGame" v-if="!gameStarted && !gameOver">开始游戏</button>
      <button @click="pauseGame" v-if="gameStarted && !gamePaused && !gameOver">暂停</button>
      <button @click="resumeGame" v-if="gameStarted && gamePaused && !gameOver">继续</button>
      <button @click="restartGame" v-if="gameOver">重新开始</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue';

// 定义属性和事件
const props = defineProps<{
  isVisible: boolean;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
}>();

// 游戏状态
const gameStarted = ref(false);
const gamePaused = ref(false);
const gameOver = ref(false);
const score = ref(0);
const lives = ref(3);
const level = ref(1);
const typedText = ref('');
const inputField = ref<HTMLInputElement | null>(null);
const gameContainer = ref<HTMLDivElement | null>(null);

// 单词雨相关
interface FallingWord {
  text: string;
  x: number;
  y: number;
  speed: number;
  matched: boolean;
  exploding?: boolean;
}

const fallingWords = ref<FallingWord[]>([]);
const activeWordIndex = ref<number | null>(null);
let animationFrameId: number | null = null;
let lastWordTime = 0;
let containerWidth = 0;
let containerHeight = 0;

// 音效相关
const soundEnabled = ref(true);
const audioContext = ref<AudioContext | null>(null);

// 单词列表 - 常用英语单词
const wordList = [
  'apple', 'banana', 'orange', 'grape', 'lemon',
  'computer', 'keyboard', 'mouse', 'monitor', 'laptop',
  'programming', 'javascript', 'typescript', 'vue', 'react',
  'function', 'variable', 'constant', 'array', 'object',
  'string', 'number', 'boolean', 'null', 'undefined',
  'interface', 'class', 'method', 'property', 'component',
  'template', 'style', 'script', 'import', 'export',
  'async', 'await', 'promise', 'callback', 'event',
  'router', 'state', 'store', 'mutation', 'action',
  'directive', 'computed', 'watch', 'lifecycle', 'mounted',
  'created', 'updated', 'destroyed', 'ref', 'reactive',
  'composition', 'option', 'mixin', 'plugin', 'filter',
  'transition', 'animation', 'transform', 'responsive', 'mobile',
  'desktop', 'tablet', 'browser', 'server', 'client',
  'database', 'storage', 'cache', 'memory', 'disk',
  'network', 'request', 'response', 'header', 'body',
  'parameter', 'argument', 'return', 'value', 'type',
  'error', 'exception', 'try', 'catch', 'finally',
  'debug', 'test', 'unit', 'integration', 'end-to-end',
  'build', 'deploy', 'release', 'version', 'update'
];

// 难度选择
const difficulty = ref(0);
const difficultyNames = ['简单', '中等', '困难'];

// 字体大小设置
const fontSize = ref(18);

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

// 播放正确音效
function playCorrectSound() {
  playSound(880.00); // A5
}

// 播放错误音效
function playWrongSound() {
  playSound(440.00, 0.2, 0.3); // A4
}

// 播放游戏结束音效
function playGameOverSound() {
  playSound(523.25, 0.1, 0.5); // C5
  setTimeout(() => playSound(392.00, 0.1, 0.5), 150); // G4
  setTimeout(() => playSound(329.63, 0.3, 0.5), 300); // E4
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

// 随机获取单词
function getRandomWord() {
  const randomIndex = Math.floor(Math.random() * wordList.length);
  return wordList[randomIndex];
}

// 创建新的下落单词
function createFallingWord() {
  if (!gameContainer.value) return;
  
  // 获取容器尺寸
  containerWidth = gameContainer.value.clientWidth;
  containerHeight = gameContainer.value.clientHeight;
  
  // 根据等级调整单词生成速度和下落速度
  const baseSpeed = 0.1 + (level.value * 0.5);
  const speedVariation = Math.random() * 0.5;
  
  // 根据难度调整单词生成速度和下落速度
  let difficultyMultiplier = 1;
  switch (difficulty.value) {
    case 1:
      difficultyMultiplier = 1.5;
      break;
    case 2:
      difficultyMultiplier = 2;
      break;
  }
  
  // 创建新单词
  const word: FallingWord = {
    text: getRandomWord(),
    x: Math.random() * (containerWidth - 100), // 防止单词超出右边界
    y: -30, // 从容器顶部上方开始
    speed: (baseSpeed + speedVariation) * difficultyMultiplier,
    matched: false
  };
  
  fallingWords.value.push(word);
}

// 更新下落单词位置
function updateFallingWords() {
  if (fallingWords.value.length === 0) {
    // 如果没有单词，创建一个
    createFallingWord();
    lastWordTime = Date.now();
  }
  
  // 根据等级和难度决定生成新单词的频率
  let wordGenerationInterval = 3000 - (level.value * 300);
  
  // 根据难度调整生成频率
  switch (difficulty.value) {
    case 0: // 简单
      wordGenerationInterval *= 1.5; // 更慢的生成频率
      break;
    case 1: // 中等
      // 保持默认
      break;
    case 2: // 困难
      wordGenerationInterval *= 0.6; // 更快的生成频率
      break;
  }
  
  const now = Date.now();
  
  if (now - lastWordTime > wordGenerationInterval) {
    // 根据难度限制同时出现的单词数量
    let maxWords;
    switch (difficulty.value) {
      case 0: // 简单
        maxWords = 2 + Math.min(level.value, 3);
        break;
      case 1: // 中等
        maxWords = 3 + Math.min(level.value, 5);
        break;
      case 2: // 困难
        maxWords = 4 + Math.min(level.value, 7);
        break;
      default:
        maxWords = 3 + Math.min(level.value, 5);
    }
    
    if (fallingWords.value.filter(w => !w.matched).length < maxWords) {
      createFallingWord();
      lastWordTime = now;
    }
  }
  
  // 更新所有单词的位置
  fallingWords.value.forEach((word, index) => {
    if (!word.matched) {
      word.y += word.speed;
      
      // 检查是否触底
      if (word.y > containerHeight) {
        // 单词触底，玩家失去一条生命
        if (lives.value > 0) {
          lives.value--;
          playWrongSound();
        }
        
        // 移除该单词
        fallingWords.value.splice(index, 1);
        
        // 如果当前激活的是这个单词，重置激活状态
        if (activeWordIndex.value === index) {
          activeWordIndex.value = null;
          typedText.value = ''; // 清空输入框
        }
        
        // 调整其他单词的索引
        if (activeWordIndex.value !== null && activeWordIndex.value > index) {
          activeWordIndex.value--;
        }
        
        // 检查游戏是否结束
        if (lives.value <= 0) {
          endGame();
        }
      }
    }
  });
  
  // 移除已匹配的单词
  const matchedIndices = [];
  for (let i = fallingWords.value.length - 1; i >= 0; i--) {
    if (fallingWords.value[i].matched) {
      matchedIndices.push(i);
      // 等待短暂时间后移除，以便显示匹配效果
      setTimeout(() => {
        if (fallingWords.value.length > i) {
          fallingWords.value.splice(i, 1);
          
          // 调整激活单词索引
          if (activeWordIndex.value !== null) {
            if (activeWordIndex.value === i) {
              activeWordIndex.value = null;
              typedText.value = ''; // 清空输入框
            } else if (activeWordIndex.value > i) {
              activeWordIndex.value--;
            }
          }
        }
      }, 300);
    }
  }
}

// 游戏主循环
function gameLoop() {
  if (gameStarted.value && !gamePaused.value && !gameOver.value) {
    updateFallingWords();
    
    // 检查是否需要升级
    checkLevelUp();
    
    // 继续下一帧
    animationFrameId = requestAnimationFrame(gameLoop);
  }
}

// 检查输入
function checkInput() {
  const text = typedText.value.trim().toLowerCase();
  
  if (!text) {
    // 如果输入为空，重置激活单词
    activeWordIndex.value = null;
    return;
  }
  
  // 如果没有激活的单词，查找匹配的单词
  if (activeWordIndex.value === null) {
    for (let i = 0; i < fallingWords.value.length; i++) {
      const word = fallingWords.value[i];
      if (!word.matched && word.text.toLowerCase().startsWith(text)) {
        activeWordIndex.value = i;
        break;
      }
    }
  }
  
  // 检查激活单词是否完全匹配
  if (activeWordIndex.value !== null) {
    const activeWord = fallingWords.value[activeWordIndex.value];
    
    if (text === activeWord.text.toLowerCase()) {
      // 单词匹配成功
      activeWord.matched = true;
      
      // 添加爆炸效果
      activeWord.exploding = true;
      setTimeout(() => {
        if (fallingWords.value[activeWordIndex.value]) {
          fallingWords.value[activeWordIndex.value].exploding = false;
        }
      }, 600);
      
      // 计算得分 - 根据单词长度和下落速度给分
      const wordScore = Math.ceil(activeWord.text.length * (1 + activeWord.speed / 2));
      score.value += wordScore;
      
      // 播放正确音效
      playCorrectSound();
      
      // 根据分数调整等级
      updateLevel();
      
      // 重置输入
      typedText.value = ''; // 清空输入框
      activeWordIndex.value = null;
    } else if (!activeWord.text.toLowerCase().startsWith(text)) {
      // 如果输入不再匹配当前激活单词，重新查找匹配
      activeWordIndex.value = null;
      checkInput(); // 递归调用以查找新的匹配
    }
  }
}

// 检查是否需要升级
function checkLevelUp() {
  // 每100分升一级
  const newLevel = Math.floor(score.value / 100) + 1;
  if (newLevel > level.value) {
    level.value = newLevel;
    // 升级奖励：增加一条生命（最多5条）
    if (lives.value < 5) {
      lives.value++;
    }
    // 播放升级音效
    playSound(659.25, 0.1, 0.5); // E5
    setTimeout(() => playSound(783.99, 0.1, 0.5), 100); // G5
    setTimeout(() => playSound(1046.50, 0.3, 0.5), 200); // C6
  }
}

// 开始游戏
function startGame() {
  if (!gameStarted.value) {
    // 根据难度调整初始生命值
    switch (difficulty.value) {
      case 0: // 简单
        lives.value = 5;
        break;
      case 1: // 中等
        lives.value = 3;
        break;
      case 2: // 困难
        lives.value = 2;
        break;
    }
    
    // 重置游戏状态
    score.value = 0;
    level.value = 1;
    fallingWords.value = [];
    activeWordIndex.value = null;
    typedText.value = '';
    gameStarted.value = true;
    gameOver.value = false;
    gamePaused.value = false;
    lastWordTime = 0;
    
    // 创建音频上下文（如果启用了音效）
    if (soundEnabled.value && !audioContext.value) {
      createAudioContext();
    }
    
    // 获取容器尺寸
    if (gameContainer.value) {
      containerWidth = gameContainer.value.clientWidth;
      containerHeight = gameContainer.value.clientHeight;
    }
    
    // 启动游戏循环
    animationFrameId = requestAnimationFrame(gameLoop);
    
    // 聚焦输入框
    nextTick(() => {
      if (inputField.value) {
        inputField.value.focus();
      }
    });
  }
}

// 暂停游戏
function pauseGame() {
  if (gameStarted.value && !gamePaused.value) {
    gamePaused.value = true;
    
    // 暂停游戏循环
    if (animationFrameId !== null) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
  }
}

// 继续游戏
function resumeGame() {
  if (gameStarted.value && gamePaused.value) {
    gamePaused.value = false;
    
    // 重新启动游戏循环
    animationFrameId = requestAnimationFrame(gameLoop);
    
    // 聚焦输入框
    nextTick(() => {
      if (inputField.value) {
        inputField.value.focus();
      }
    });
  }
}

// 重新开始游戏
function restartGame() {
  // 根据难度调整初始生命值
  switch (difficulty.value) {
    case 0: // 简单
      lives.value = 5;
      break;
    case 1: // 中等
      lives.value = 3;
      break;
    case 2: // 困难
      lives.value = 2;
      break;
  }
  
  // 重置游戏状态
  score.value = 0;
  level.value = 1;
  fallingWords.value = [];
  activeWordIndex.value = null;
  typedText.value = '';
  gameStarted.value = false;
  gameOver.value = false;
  gamePaused.value = false;
  
  // 启动游戏
  startGame();
}

// 结束游戏
function endGame() {
  gameStarted.value = false;
  gameOver.value = true;
  
  // 停止游戏循环
  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }
  
  // 播放游戏结束音效
  playGameOverSound();
}

// 关闭游戏
function closeGame() {
  // 停止游戏循环
  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }
  
  // 关闭音频上下文
  if (audioContext.value && audioContext.value.state !== 'closed') {
    audioContext.value.close().catch(console.error);
  }
  
  // 发出关闭事件
  emit('close');
}

// 处理窗口大小变化
function handleResize() {
  if (gameContainer.value) {
    containerWidth = gameContainer.value.clientWidth;
    containerHeight = gameContainer.value.clientHeight;
  }
}

// 监听组件可见性变化
watch(() => props.isVisible, (newValue) => {
  if (newValue) {
    // 组件显示时，如果音频上下文存在且处于暂停状态，则恢复
    if (soundEnabled.value && audioContext.value && audioContext.value.state === 'suspended') {
      audioContext.value.resume();
    }
    
    // 添加窗口大小变化监听
    window.addEventListener('resize', handleResize);
  } else {
    // 组件隐藏时暂停游戏
    if (gameStarted.value && !gamePaused.value) {
      pauseGame();
    }
    
    // 暂停音频上下文
    if (audioContext.value && audioContext.value.state === 'running') {
      audioContext.value.suspend();
    }
    
    // 移除窗口大小变化监听
    window.removeEventListener('resize', handleResize);
  }
});

// 组件挂载时初始化
onMounted(() => {
  // 如果启用了音效，创建音频上下文
  if (soundEnabled.value) {
    createAudioContext();
  }
  
  // 获取容器尺寸
  if (gameContainer.value) {
    containerWidth = gameContainer.value.clientWidth;
    containerHeight = gameContainer.value.clientHeight;
  }
  
  // 添加窗口大小变化监听
  window.addEventListener('resize', handleResize);
});

// 组件卸载时清理
onUnmounted(() => {
  // 停止游戏循环
  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }
  
  // 关闭音频上下文
  if (audioContext.value && audioContext.value.state !== 'closed') {
    audioContext.value.close().catch(console.error);
  }
  
  // 移除窗口大小变化监听
  window.removeEventListener('resize', handleResize);
});

// 设置难度
function setDifficulty(index: number) {
  difficulty.value = index;
}

// 增加字体大小
function increaseFontSize() {
  if (fontSize.value < 30) {
    fontSize.value += 2;
  }
}

// 减小字体大小
function decreaseFontSize() {
  if (fontSize.value > 12) {
    fontSize.value -= 2;
  }
}

// 获取粒子样式
function getParticleStyle(index: number) {
  const hue = Math.random() * 360;
  const size = 3 + Math.random() * 5;
  const angle = (index / 10) * Math.PI * 2;
  const distance = 10 + Math.random() * 20;
  const x = Math.cos(angle) * distance;
  const y = Math.sin(angle) * distance;
  const delay = Math.random() * 0.2;
  
  return {
    backgroundColor: `hsl(${hue}, 100%, 60%)`,
    width: `${size}px`,
    height: `${size}px`,
    transform: `translate(${x}px, ${y}px)`,
    animationDelay: `${delay}s`
  };
}

// 清空输入框
function clearInput() {
  typedText.value = '';
}
</script>

<style scoped>
.typing-game {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  background-color: var(--widget-bg);
  border-radius: 8px;
  overflow: hidden;
  position: relative;
}

.game-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background-color: rgba(0, 0, 0, 0.1);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.game-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--text-color);
}

.game-stats {
  display: flex;
  gap: 12px;
  font-size: 14px;
  color: var(--text-color);
}

.sound-btn, .close-btn {
  background: none;
  border: none;
  color: var(--text-color);
  cursor: pointer;
  font-size: 16px;
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0.8;
  transition: opacity 0.2s;
}

.sound-btn:hover, .close-btn:hover {
  opacity: 1;
}

.game-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 16px;
  overflow: hidden;
}

.word-rain-container {
  flex: 1;
  position: relative;
  background-color: rgba(0, 0, 0, 0.2);
  border-radius: 8px;
  overflow: hidden;
  margin-bottom: 16px;
  transition: all 0.3s ease;
}

.word-rain-container.game-over {
  background-color: rgba(231, 76, 60, 0.2);
}

.word-rain-container.game-paused {
  background-color: rgba(241, 196, 15, 0.2);
}

.start-message, .game-over-message, .pause-message {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 18px;
  color: var(--text-color);
  text-align: center;
  width: 80%;
}

.difficulty-selector {
  margin-top: 16px;
}

.font-size-selector {
  margin-top: 16px;
}

.font-size-controls {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-top: 8px;
}

.font-size-controls button {
  width: 30px;
  height: 30px;
  background-color: var(--accent-color);
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.font-size-controls button:hover:not(:disabled) {
  background-color: var(--accent-color-hover, var(--accent-color));
  transform: translateY(-2px);
}

.font-size-controls button:active:not(:disabled) {
  transform: translateY(0);
}

.font-size-controls button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.difficulty-options {
  display: flex;
  gap: 12px;
  margin-top: 8px;
}

.difficulty-options button {
  padding: 8px 16px;
  background-color: var(--accent-color);
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.difficulty-options button:hover {
  background-color: var(--accent-color-hover, var(--accent-color));
  transform: translateY(-2px);
}

.difficulty-options button:active {
  transform: translateY(0);
}

.difficulty-options button.selected {
  background-color: var(--accent-color-selected, var(--accent-color));
}

.falling-word {
  position: absolute;
  font-weight: bold;
  text-shadow: 0 0 5px rgba(0, 0, 0, 0.5);
  transition: color 0.3s ease;
  user-select: none;
}

.falling-word.active {
  text-shadow: 0 0 10px rgba(241, 196, 15, 0.8);
}

.falling-word.exploding {
  z-index: 10;
}

.explosion {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 0;
  height: 0;
  pointer-events: none;
}

.particle {
  position: absolute;
  top: 0;
  left: 0;
  border-radius: 50%;
  animation: explode 0.6s ease-out forwards;
}

@keyframes explode {
  0% {
    opacity: 1;
    transform: translate(0, 0) scale(1);
  }
  100% {
    opacity: 0;
    transform: translate(var(--x, 30px), var(--y, 30px)) scale(0);
  }
}

.typed-text-container {
  width: 100%;
  margin-bottom: 8px;
}

.typed-text-container input {
  width: 100%;
  padding: 8px 12px;
  font-size: 16px;
  border: 2px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  background-color: rgba(255, 255, 255, 0.05);
  color: var(--text-color);
  transition: all 0.3s ease;
}

.typed-text-container input:focus {
  outline: none;
  border-color: var(--accent-color);
  background-color: rgba(255, 255, 255, 0.1);
}

.typed-text-container input:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.game-controls {
  display: flex;
  justify-content: center;
  gap: 12px;
  padding: 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.game-controls button {
  padding: 8px 16px;
  background-color: var(--accent-color);
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.game-controls button:hover {
  background-color: var(--accent-color-hover, var(--accent-color));
  transform: translateY(-2px);
}

.game-controls button:active {
  transform: translateY(0);
}

@media (max-width: 480px) {
  .falling-word {
    font-size: 16px;
  }
  
  .typed-text-container input {
    font-size: 14px;
  }
  
  .game-controls button {
    padding: 6px 12px;
    font-size: 12px;
  }
}
</style>
