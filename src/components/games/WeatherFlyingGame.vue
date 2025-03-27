<template>
  <div class="weather-flying-game">
    <button class="close-button" @click="closeGame" title="关闭游戏">×</button>

    <div class="game-header" v-if="!gameStarted">
      <h3>Weather Flying Game</h3>
      <p class="game-tip">长按鼠标控制飞行</p>
      <button @click="startGame">Start Game</button>
    </div>

    <div class="game-container" ref="gameContainer">
      <canvas ref="gameCanvas" 
        @mousedown="startFlying" 
        @mouseup="stopFlying"
        @mouseleave="stopFlying"
        @touchstart="startFlying"
        @touchend="stopFlying"></canvas>
      <div class="game-message" v-if="gameOver">
        <h3>Game Over!</h3>
        <p>Score: {{ score }}</p>
        <div class="button-group">
          <button @click="restartGame">重试</button>
          <button @click="closeGame" class="close-btn">关闭</button>
        </div>
      </div>
    </div>

    <div class="game-controls">
      <div class="score">Score: {{ score }}</div>
      <button class="sound-toggle" @click="toggleSound">
        {{ soundEnabled ? '🔊' : '🔇' }}
      </button>
    </div>
  </div>
</template>

<script>
export default {
  name: 'WeatherFlyingGame',
  emits: ['close'],  // 声明组件事件
  data() {
    return {
      gameStarted: false,
      gameOver: false,
      score: 0,
      soundEnabled: true,
      canvas: null,
      ctx: null,
      player: {
        x: 50,
        y: 150,
        width: 30,
        height: 30,
        velocity: 0,
        gravity: 0.25,
        liftForce: -0.5,  // 上升力
        maxVelocity: 5    // 最大速度限制
      },
      isFlying: false,    // 是否正在飞行（按住鼠标）
      obstacles: [],
      weatherElements: [],
      animationFrame: null,
      lastTimestamp: 0,
      audioContext: null,
      lastObstacleTime: 0,  // 新增：记录上一次生成障碍物的时间
      minObstacleInterval: 2000  // 新增：障碍物生成的最小时间间隔（毫秒）
    }
  },
  mounted() {
    this.initializeCanvas()
    this.setupAudio()
    this.$el.addEventListener('dblclick', this.handleDoubleClick)
  },
  beforeUnmount() {
    this.stopGame()
    if (this.audioContext) {
      this.audioContext.close()
    }
    this.$el.removeEventListener('dblclick', this.handleDoubleClick)
  },
  methods: {
    initializeCanvas() {
      this.canvas = this.$refs.gameCanvas
      this.ctx = this.canvas.getContext('2d')
      this.resizeCanvas()
      window.addEventListener('resize', this.resizeCanvas)
    },
    resizeCanvas() {
      const container = this.$refs.gameContainer
      this.canvas.width = container.clientWidth
      this.canvas.height = container.clientHeight
    },
    setupAudio() {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)()
    },
    playSound(frequency, duration = 0.1, volume = 0.1) {
      if (!this.soundEnabled || !this.audioContext) return

      const oscillator = this.audioContext.createOscillator()
      const gainNode = this.audioContext.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(this.audioContext.destination)

      oscillator.type = 'sine'
      oscillator.frequency.value = frequency
      gainNode.gain.value = volume

      oscillator.start()
      oscillator.stop(this.audioContext.currentTime + duration)
    },
    startGame() {
      this.gameStarted = true
      this.gameOver = false
      this.score = 0
      this.player.y = 150
      this.player.velocity = 0
      this.obstacles = []
      this.weatherElements = []
      this.lastTimestamp = performance.now()
      this.animate()
      this.playStartSound()
    },
    stopGame() {
      if (this.animationFrame) {
        cancelAnimationFrame(this.animationFrame)
      }
    },
    restartGame() {
      this.startGame()
    },
    startFlying(event) {
      event.preventDefault(); // 防止触摸设备上的默认行为
      if (!this.gameOver) {
        this.isFlying = true;
        this.playSound(400, 0.1);
      }
    },
    stopFlying() {
      this.isFlying = false;
    },
    toggleSound() {
      this.soundEnabled = !this.soundEnabled
    },
    playStartSound() {
      if (!this.soundEnabled) return
      const notes = [400, 500, 600, 700]
      notes.forEach((freq, i) => {
        setTimeout(() => this.playSound(freq, 0.1), i * 100)
      })
    },
    animate(timestamp) {
      if (!this.gameStarted || this.gameOver) return

      const deltaTime = timestamp - this.lastTimestamp
      this.lastTimestamp = timestamp

      // Clear canvas
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)

      // Update player
      if (this.isFlying) {
        // 持续施加向上的力
        this.player.velocity += this.player.liftForce;
      } else {
        // 正常下落
        this.player.velocity += this.player.gravity;
      }

      // 限制最大速度
      this.player.velocity = Math.max(
        Math.min(this.player.velocity, this.player.maxVelocity),
        -this.player.maxVelocity
      );

      this.player.y += this.player.velocity;

      // Draw player
      this.ctx.fillStyle = '#3498db'
      this.ctx.fillRect(
        this.player.x,
        this.player.y,
        this.player.width,
        this.player.height
      )

      // Check boundaries
      if (this.player.y > this.canvas.height - this.player.height) {
        this.gameOver = true
        this.playSound(200, 0.3)
        return
      }

      if (this.player.y < 0) {
        this.player.y = 0
        this.player.velocity = 0
      }

      // Update and spawn obstacles
      this.updateObstacles()
      this.updateWeatherElements()

      // Request next frame
      this.animationFrame = requestAnimationFrame((t) => this.animate(t))
    },
    updateObstacles() {
      const currentTime = performance.now();
      const timeSinceLastObstacle = currentTime - this.lastObstacleTime;
      
      // 降低生成频率，但增加难度随分数提高
      const baseSpawnRate = 0.01;
      const spawnRateIncrease = Math.min(this.score / 1000, 0.01);
      
      // 确保障碍物之间有足够的时间间隔
      if (timeSinceLastObstacle >= this.minObstacleInterval && Math.random() < (baseSpawnRate + spawnRateIncrease)) {
        const minGap = 300; // 增加最小通过空间
        const maxHeight = this.canvas.height - minGap;
        
        // 确保上下障碍物之间有足够的空间
        const gapPosition = Math.random() * (this.canvas.height - minGap - 100) + 50; // 确保缝隙不会太靠近顶部或底部
        const topHeight = gapPosition;
        const bottomHeight = this.canvas.height - (gapPosition + minGap);

        // 添加上方障碍物
        if (topHeight > 0) {
          this.obstacles.push({
            x: this.canvas.width,
            y: 0,
            width: 30,
            height: topHeight
          });
        }

        // 添加下方障碍物
        if (bottomHeight > 0) {
          this.obstacles.push({
            x: this.canvas.width,
            y: gapPosition + minGap,
            width: 30,
            height: bottomHeight
          });
        }

        // 更新最后生成障碍物的时间
        this.lastObstacleTime = currentTime;
        
        // 根据分数调整下一次障碍物生成的时间间隔
        const minInterval = Math.max(1200, 2000 - this.score); // 随分数增加缩短间隔，但不少于1.2秒
        this.minObstacleInterval = minInterval;
      }

      // 更新和绘制障碍物
      this.obstacles = this.obstacles.filter(obstacle => {
        // 移动速度随分数增加，但设置上限
        const baseSpeed = 2;
        const maxSpeedIncrease = 1.5; // 最大速度增加限制
        const speedIncrease = Math.min(this.score / 300, maxSpeedIncrease);
        obstacle.x -= (baseSpeed + speedIncrease);

        if (this.checkCollision(this.player, obstacle)) {
          this.gameOver = true;
          this.playSound(200, 0.3);
          return false;
        }

        this.ctx.fillStyle = '#e74c3c';
        this.ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);

        return obstacle.x > -obstacle.width;
      });
    },
    updateWeatherElements() {
      if (Math.random() < 0.03) {
        this.weatherElements.push({
          x: this.canvas.width,
          y: Math.random() * (this.canvas.height - 20),
          size: 20,
          collected: false
        })
      }

      this.weatherElements = this.weatherElements.filter(element => {
        element.x -= 1.5

        if (!element.collected && this.checkCollision(this.player, {
          x: element.x,
          y: element.y,
          width: element.size,
          height: element.size
        })) {
          element.collected = true
          this.score += 10
          this.playSound(600, 0.1)
          return false
        }

        if (!element.collected) {
          this.ctx.fillStyle = '#f1c40f'
          this.ctx.beginPath()
          this.ctx.arc(
            element.x + element.size/2,
            element.y + element.size/2,
            element.size/2,
            0,
            Math.PI * 2
          )
          this.ctx.fill()
        }

        return element.x > -element.size
      })
    },
    checkCollision(rect1, rect2) {
      return rect1.x < rect2.x + rect2.width &&
             rect1.x + rect1.width > rect2.x &&
             rect1.y < rect2.y + rect2.height &&
             rect1.y + rect1.height > rect2.y
    },
    handleDoubleClick(event) {
      if (this.gameStarted) {
        event.stopPropagation()
      }
    },
    closeGame() {
      this.stopGame();
      this.$emit('close');  // 触发关闭事件
    }
  }
}
</script>

<style scoped>
.weather-flying-game {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  position: relative;
}

.game-container {
  flex: 1;
  position: relative;
  overflow: hidden;
  border-radius: 4px;
}

.game-header {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  padding: 20px;
  text-align: center;
  background: rgba(0, 0, 0, 0.2);
  backdrop-filter: blur(8px);
  border-radius: 8px;
  z-index: 2;
  color: var(--text-color);
}

.game-controls {
  position: absolute;
  top: 10px;
  left: 10px;
  display: flex;
  gap: 10px;
  padding: 5px 10px;
  background: rgba(0, 0, 0, 0.2);
  backdrop-filter: blur(4px);
  border-radius: 20px;
  z-index: 2;
  align-items: center;
}

.game-message {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(0, 0, 0, 0.2);
  backdrop-filter: blur(8px);
  color: var(--text-color);
  padding: 20px;
  border-radius: 8px;
  text-align: center;
  z-index: 2;
}

button {
  padding: 8px 16px;
  border: none;
  border-radius: 20px;
  background: #3498db;
  color: white;
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 14px;
}

button:hover {
  background: #2980b9;
  transform: scale(1.05);
}

.sound-toggle {
  background: none;
  padding: 4px 8px;
  font-size: 20px;
}

.sound-toggle:hover {
  background: none;
}

.score {
  font-weight: bold;
  color: var(--text-color);
  font-size: 16px;
  display: flex;
  align-items: center;
}

.game-tip {
  color: var(--text-color);
  font-size: 14px;
  margin: 10px 0;
  opacity: 0.8;
}

canvas {
  width: 100%;
  height: 100%;
  background: transparent;
  touch-action: none; /* 防止触摸设备上的默认滚动行为 */
}

.button-group {
  display: flex;
  gap: 10px;
  justify-content: center;
  margin-top: 15px;
}

.close-btn {
  background: #e74c3c;
  padding: 8px 16px;
}

.close-btn:hover {
  background: #c0392b;
}

.close-button {
  position: absolute;
  top: 5px;
  right: 5px;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.2);
  backdrop-filter: blur(4px);
  border: none;
  color: var(--text-color);
  font-size: 20px;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  z-index: 100;
  transition: all 0.3s ease;
}

.close-button:hover {
  background: rgba(0, 0, 0, 0.3);
  transform: scale(1.1);
}
</style> 