<template>
  <div 
    ref="live2dContainer" 
    class="live2d-container"
    :style="containerStyle"
    @mousedown="startDrag"
    @wheel="handleWheel"
    @mouseover="showControls = true"
    @mouseleave="showControls = false"
    :class="{ 'dragging': isDragging }"
  >
    <div v-if="!isModelLoaded && showLoadButton" class="load-model-button" @click="loadModel">
      <span>加载Live2D模型</span>
    </div>
    <div v-if="isLoading" class="loading-indicator">
      <div class="loading-spinner"></div>
      <div class="loading-text">加载中...</div>
    </div>
    <div v-if="isModelLoaded" class="model-controls" :class="{ 'visible': showControls }" @mousedown.stop>
      <div class="model-actions">
        <div class="animation-selector" v-if="availableMotions.length > 0">
          <select 
            v-model="selectedIdleMotion" 
            @change="changeIdleMotion"
            class="motion-select"
          >
            <option :value="null">默认动画</option>
            <option 
              v-for="motion in availableMotions" 
              :key="`${motion.group}-${motion.index}`"
              :value="motion"
            >
              {{ motion.name || `动作${motion.index + 1}` }}
            </option>
          </select>
        </div>
        <button 
          class="like-btn" 
          @click="likeCurrentModel" 
          title="喜欢这个模型"
          :class="{ 'liked': likedModels.includes(currentModelInfo?.url) }"
        >
          <span>❤️</span>
        </button>
        <button class="dislike-btn" @click="dislikeCurrentModel" title="不喜欢这个模型">
          <span>👎</span>
        </button>
        <button class="pin-btn" @click="togglePin" :title="isPinned ? '取消固定' : '固定模型'" :class="{ 'pinned': isPinned }">
          <span>📌</span>
        </button>
        <div class="refresh-control" title="更换模型" @click="changeRandomModel">
          <span>🔄</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch, computed } from 'vue'

declare global {
  interface Window {
    PIXI: any;
    Live2DModel: any;
    electron: any;
    electronAPI: any;
  }
}

const live2dContainer = ref<HTMLElement | null>(null)
let app: any = null
const isModelLoaded = ref(false)
const isLoading = ref(false)
const showLoadButton = ref(false)
const showControls = ref(false) // 控制面板显示状态
const availableMotions = ref<{group: string; name: string; index?: number}[]>([]) // 添加可用动画列表
const selectedIdleMotion = ref<{group: string; name: string; index?: number} | null>(null) // 当前选择的idle动画

// 拖动相关状态
const isDragging = ref(false)
const position = ref({ x: 200, y: 200 }) // 默认位置
const dragOffset = ref({ x: 0, y: 0 })

// 添加模型缩放相关的状态
const baseScale = ref(0.4); // 基础缩放比例
const currentScale = ref(0.4); // 当前缩放比例
const minScale = 0.1; // 最小缩放
const maxScale = 2.0; // 最大缩放

// 添加随机模型相关状态
const randomModelTimer = ref<number | null>(null);
const availableModels = ref<any[]>([]);

// 添加喜欢和不喜欢模型相关状态
const currentModelInfo = ref<any>(null);
const likedModels = ref<any[]>([]);
const dislikedModels = ref<string[]>([]);

// 添加固定状态
const isPinned = ref(false);

// 计算容器样式
const containerStyle = computed(() => {
  return {
    right: `${position.value.x}px`,
    bottom: `${position.value.y}px`
  }
})

// 开始拖动
const startDrag = (event: MouseEvent) => {
  // 如果点击的是控制面板或其子元素，不启动拖动
  if ((event.target as HTMLElement).closest('.model-controls')) {
    return;
  }
  
  isDragging.value = true;
  dragOffset.value = {
    x: event.clientX + position.value.x,
    y: event.clientY + position.value.y
  };
  
  // 添加全局事件监听
  document.addEventListener('mousemove', onDrag);
  document.addEventListener('mouseup', stopDrag);
  
  // 防止文本选择
  event.preventDefault();
};

// 拖动中
const onDrag = (event: MouseEvent) => {
  if (!isDragging.value) return
  
  position.value = {
    x: dragOffset.value.x - event.clientX,
    y: dragOffset.value.y - event.clientY
  }
}

// 停止拖动
const stopDrag = () => {
  if (isDragging.value) {
    isDragging.value = false
    
    // 保存位置到本地存储
    savePosition()
  }
  
  // 移除全局事件监听
  document.removeEventListener('mousemove', onDrag)
  document.removeEventListener('mouseup', stopDrag)
}

// 保存位置到本地存储
const savePosition = () => {
  localStorage.setItem('live2d-position', JSON.stringify({
    x: position.value.x,
    y: position.value.y
  }));
  console.log('保存位置:', position.value);
}

// 从本地存储加载位置
const loadPosition = () => {
  const savedPosition = localStorage.getItem('live2d-position');
  if (savedPosition) {
    try {
      const pos = JSON.parse(savedPosition);
      position.value = {
        x: pos.x,
        y: pos.y
      };
      console.log('加载保存的位置:', position.value);
    } catch (error) {
      console.error('解析保存的位置失败:', error);
    }
  }
}

// 保存缩放比例到本地存储
const saveScale = () => {
  localStorage.setItem('live2d-scale', currentScale.value.toString());
  console.log('保存缩放比例:', currentScale.value);
}

// 从本地存储加载缩放比例
const loadScale = () => {
  const savedScale = localStorage.getItem('live2d-scale');
  if (savedScale) {
    try {
      const scale = parseFloat(savedScale);
      if (!isNaN(scale) && scale >= minScale && scale <= maxScale) {
        currentScale.value = scale;
        console.log('加载保存的缩放比例:', scale);
      }
    } catch (error) {
      console.error('解析保存的缩放比例失败:', error);
    }
  }
}

// 等待Live2D初始化
const waitForLive2D = () => {
  return new Promise((resolve) => {
    const checkLive2D = () => {
      if (window.PIXI && window.PIXI.live2d) {
        window.Live2DModel = PIXI.live2d.Live2DModel;
        
        // 禁用全局音频功能
        if (window.PIXI.live2d.SoundManager) {
          window.PIXI.live2d.SoundManager.volume = 0;
          window.PIXI.live2d.SoundManager.enabled = false;
        }
        
        // 设置全局配置
        if (window.PIXI.live2d.config) {
          window.PIXI.live2d.config.sound = false;
          window.PIXI.live2d.config.motionSync = false;
        }
        
        resolve(true);
      } else {
        setTimeout(checkLive2D, 100);
      }
    };
    checkLive2D();
  });
};

// 加载喜欢和不喜欢的模型列表
const loadModelPreferences = () => {
  try {
    // 加载喜欢的模型
    const likedModelsJson = localStorage.getItem('liked-live2d-models');
    if (likedModelsJson) {
      likedModels.value = JSON.parse(likedModelsJson);
      console.log(`加载了 ${likedModels.value.length} 个喜欢的模型`);
    }
    
    // 加载不喜欢的模型
    const dislikedModelsJson = localStorage.getItem('disliked-live2d-models');
    if (dislikedModelsJson) {
      dislikedModels.value = JSON.parse(dislikedModelsJson);
      console.log(`加载了 ${dislikedModels.value.length} 个不喜欢的模型`);
    }
  } catch (error) {
    console.error('加载模型偏好失败:', error);
  }
};

// 保存喜欢的模型
const saveLikedModels = () => {
  try {
    localStorage.setItem('liked-live2d-models', JSON.stringify(likedModels.value));
    console.log(`保存了 ${likedModels.value.length} 个喜欢的模型`);
    
    // 触发存储事件通知其他组件
    window.dispatchEvent(new StorageEvent('storage', {
      key: 'liked-live2d-models',
      newValue: JSON.stringify(likedModels.value),
      storageArea: localStorage
    }));
  } catch (error) {
    console.error('保存喜欢的模型失败:', error);
  }
};

// 保存不喜欢的模型
const saveDislikedModels = () => {
  try {
    localStorage.setItem('disliked-live2d-models', JSON.stringify(dislikedModels.value));
    console.log(`保存了 ${dislikedModels.value.length} 个不喜欢的模型`);
    
    // 触发存储事件通知其他组件
    window.dispatchEvent(new StorageEvent('storage', {
      key: 'disliked-live2d-models',
      newValue: JSON.stringify(dislikedModels.value),
      storageArea: localStorage
    }));
  } catch (error) {
    console.error('保存不喜欢的模型失败:', error);
  }
};

// 喜欢当前模型
const likeCurrentModel = () => {
  if (!currentModelInfo.value) {
    console.log('没有当前模型信息，无法添加到喜欢列表');
    return;
  }
  
  // 检查是否已经在喜欢列表中
  const existingIndex = likedModels.value.findIndex(model => model.url === currentModelInfo.value.url);
  if (existingIndex >= 0) {
    console.log('模型已经在喜欢列表中');
    return;
  }
  
  // 从不喜欢列表中移除（如果存在）
  const dislikeIndex = dislikedModels.value.indexOf(currentModelInfo.value.url);
  if (dislikeIndex >= 0) {
    dislikedModels.value.splice(dislikeIndex, 1);
    saveDislikedModels();
  }
  
  // 提取模型文件名作为名称（如果当前名称不存在或为默认值）
  let modelName = currentModelInfo.value.name;
  if (!modelName || modelName === '未命名模型' || modelName === '默认模型') {
    const urlParts = currentModelInfo.value.url.split('/');
    const fileName = urlParts[urlParts.length - 1];
    modelName = fileName.replace(/\.(model3?\.json|json)$/i, '');
  }
  
  // 添加到喜欢列表
  likedModels.value.push({
    name: modelName,
    url: currentModelInfo.value.url,
    path: currentModelInfo.value.url,
    timestamp: Date.now()
  });
  
  // 保存喜欢列表
  saveLikedModels();
  
  // 添加动画效果
  const likeBtn = document.querySelector('.like-btn');
  if (likeBtn) {
    likeBtn.classList.add('liked');
    setTimeout(() => {
      likeBtn.classList.remove('liked');
    }, 1000);
  }
};

// 不喜欢当前模型
const dislikeCurrentModel = () => {
  if (!currentModelInfo.value) {
    console.log('没有当前模型信息，无法添加到不喜欢列表');
    return;
  }
  
  // 检查是否已经在不喜欢列表中
  if (dislikedModels.value.includes(currentModelInfo.value.url)) {
    console.log('模型已经在不喜欢列表中');
    return;
  }
  
  // 从喜欢列表中移除（如果存在）
  const likeIndex = likedModels.value.findIndex(model => model.url === currentModelInfo.value.url);
  if (likeIndex >= 0) {
    likedModels.value.splice(likeIndex, 1);
    saveLikedModels();
  }
  
  // 添加到不喜欢列表
  dislikedModels.value.push(currentModelInfo.value.url);
  
  // 保存不喜欢列表
  saveDislikedModels();
  
  // 显示提示
  //alert('已添加到不喜欢的模型列表，下次不会再随机到此模型');
  
  // 立即更换模型
  changeRandomModel();
};

// 修改获取模型路径函数，排除不喜欢的模型
const getModelPath = () => {
  try {
    console.log('获取模型路径');
    
    // 检查是否有默认模型
    const defaultModelJson = localStorage.getItem('default-live2d-model');
    if (defaultModelJson) {
      try {
        const defaultModel = JSON.parse(defaultModelJson);
        console.log('找到默认模型:', defaultModel);
        
        // 使用默认模型的URL
        if (defaultModel.url) {
          console.log('使用默认模型URL:', defaultModel.url);
          // 保存当前模型信息
          currentModelInfo.value = defaultModel;
          return defaultModel.url;
        }
      } catch (e) {
        console.error('解析默认模型信息失败:', e);
      }
    } else {
      console.log('没有找到默认模型');
    }
    
    // 如果有可用的随机模型，随机选择一个
    if (availableModels.value.length > 0) {
      console.log(`有 ${availableModels.value.length} 个可用模型，随机选择一个`);
      
      // 过滤掉不喜欢的模型
      const filteredModels = availableModels.value.filter(model => 
        !dislikedModels.value.includes(model.url)
      );
      
      if (filteredModels.length === 0) {
        console.log('过滤后没有可用模型，使用所有模型');
        // 如果过滤后没有模型，则使用所有模型
        const randomIndex = Math.floor(Math.random() * availableModels.value.length);
        const randomModel = availableModels.value[randomIndex];
        console.log('随机选择的模型:', randomModel);
        
        if (randomModel.url) {
          console.log('使用随机模型URL:', randomModel.url);
          // 保存当前模型信息
          currentModelInfo.value = randomModel;
          return randomModel.url;
        }
      } else {
        console.log(`过滤后有 ${filteredModels.length} 个可用模型`);
        const randomIndex = Math.floor(Math.random() * filteredModels.length);
        const randomModel = filteredModels[randomIndex];
        console.log('随机选择的模型:', randomModel);
        
        if (randomModel.url) {
          console.log('使用随机模型URL:', randomModel.url);
          // 保存当前模型信息
          currentModelInfo.value = randomModel;
          return randomModel.url;
        }
      }
    } else {
      console.log('没有可用的随机模型');
    }
    
    // 如果没有默认模型和随机模型，使用原来的逻辑
    console.log('使用默认内置模型');
    
    // 判断是否在开发环境
    const isDev = process.env.NODE_ENV === 'development';
    
    if (isDev) {
      // 在开发环境中，直接使用相对路径
      console.log('开发环境，使用相对路径');
      //return '/live2d/leila/model.model.json';
      const defaultUrl = '/live2d/kaguya/model.json';
      // 保存当前模型信息
      currentModelInfo.value = {
        name: '默认模型',
        url: defaultUrl,
        timestamp: Date.now()
      };
      return defaultUrl;
    } else {
      // 在生产环境中，使用绝对路径
      const fs = require('fs');
      const path = require('path');
      const { app } = require('@electron/remote');
      
      const modelPath = path.join(process.resourcesPath, 'live2d', 'leila', 'model.model.json');
      console.log('生产环境，使用绝对路径:', modelPath);
      
      // 检查文件是否存在
      if (fs.existsSync(modelPath)) {
        console.log('模型文件存在');
        // 使用 file:/// 协议并确保路径使用正斜杠
        const fileUrl = `file:///${modelPath.replace(/\\/g, '/')}`;
        // 保存当前模型信息
        currentModelInfo.value = {
          name: '默认模型',
          url: fileUrl,
          timestamp: Date.now()
        };
        return fileUrl;
      } else {
        console.error('模型文件不存在:', modelPath);
        return null;
      }
    }
  } catch (error) {
    console.error('获取模型路径失败:', error);
    return null;
  }
};

// 在 setup 中定义 startIdleAnimation
const startIdleAnimation = () => {
  if (!app?.stage?.children[0]) {
    console.log('没有可用的模型，跳过动画播放');
    return;
  }
  
  try {
    const model = app.stage.children[0];
    const motionManager = model.internalModel.motionManager;
    
    if (!motionManager) {
      console.log('动画管理器不可用');
      return;
    }
    
    // 播放动画逻辑
    if (selectedIdleMotion.value) {
      const group = selectedIdleMotion.value.group;
      const index = selectedIdleMotion.value.index ?? 0;
      
      // 检查动画管理器状态
      if (!motionManager.isFinished()) {
        // 如果当前动画未结束，等待下一次循环
        setTimeout(() => startIdleAnimation(), 1000);
        return;
      }
      
      try {
        // 使用 startMotion 播放动画
        motionManager.startMotion(group, index);
        
        // 设置循环播放
        setTimeout(() => {
          if (selectedIdleMotion.value) {
            startIdleAnimation();
          }
        }, 3000);
      } catch (error) {
        console.error('播放指定动画失败:', error);
      }
      return;
    }
    
    // 如果没有选择动画，随机播放一个
    if (availableMotions.value.length > 0) {
      const randomMotion = availableMotions.value[Math.floor(Math.random() * availableMotions.value.length)];
      
      // 检查动画管理器状态
      if (!motionManager.isFinished()) {
        // 如果当前动画未结束，等待下一次循环
        setTimeout(() => startIdleAnimation(), 1000);
        return;
      }
      
      try {
        motionManager.startMotion(randomMotion.group, randomMotion.index ?? 0);
        
        // 设置循环播放
        setTimeout(() => {
          if (!selectedIdleMotion.value) {
            startIdleAnimation();
          }
        }, 3000);
      } catch (error) {
        console.error('播放随机动画失败:', error);
      }
    }
  } catch (error) {
    console.error('动画播放过程中发生错误:', error);
  }
};

// 添加动画收集函数
const collectMotions = (model: any) => {
  try {
    const motionManager = model.internalModel.motionManager;
    console.log('Motion manager:', motionManager);
    
    // 清空现有动画列表
    availableMotions.value = [];
    
    // 检查动画定义
    const definitions = motionManager?.definitions;
    console.log('Motion definitions:', definitions);
    
    // 处理动画定义
    if (definitions) {
      // 处理空字符串键下的动画数组
      if (definitions[''] && Array.isArray(definitions[''])) {
        console.log('Found base motions:', definitions['']);
        definitions[''].forEach((motion: any, index: number) => {
          if (motion && typeof motion === 'object') {
            availableMotions.value.push({
              group: '',
              name: `动作${index + 1}`,
              index: index
            });
          }
        });
      }
      
      // 处理其他动画组
      Object.entries(definitions).forEach(([group, motions]: [string, any]) => {
        if (group !== '' && Array.isArray(motions)) {
          motions.forEach((motion: any, index: number) => {
            if (motion && typeof motion === 'object') {
              availableMotions.value.push({
                group: group,
                name: `${group}动作${index + 1}`,
                index: index
              });
            }
          });
        }
      });
    }
    
    console.log('收集到的动画列表:', availableMotions.value);
    
    // 开始播放动画
    startIdleAnimation();
    
  } catch (error) {
    console.error('收集动画列表时发生错误:', error);
  }
};

// 修改 loadModel 函数
const loadModel = async () => {
  if (isLoading.value || isModelLoaded.value) return;
  
  isLoading.value = true;
  showLoadButton.value = false;
  
  if (!live2dContainer.value) {
    isLoading.value = false;
    return;
  }

  try {
    await waitForLive2D();
    
    // 清理现有模型
    if (app) {
      app.destroy(true);
      app = null;
    }
    
    // 创建 PIXI 应用
    app = new window.PIXI.Application({
      width: 800,
      height: 800,
      transparent: true,
      antialias: false,
      powerPreference: 'low-power'
    });

    live2dContainer.value.appendChild(app.view);
    
    const modelUrl = getModelPath();
    if (!modelUrl) {
      throw new Error('Invalid model URL');
    }

    // 简化模型加载选项
    const modelOptions = {
      autoLoad: true,
      autoUpdate: true,
      motionPreload: "NONE",
      idleMotionPriority: 1
    };

    console.log('Loading model with URL:', modelUrl);
    console.log('Model options:', modelOptions);

    // 加载模型
    const model = await window.Live2DModel.from(modelUrl, modelOptions);
    
    // 设置模型基本属性
    model.scale.set(currentScale.value);
    model.x = app.screen.width / 2;
    model.y = app.screen.height;
    model.anchor.set(0.5, 1);
    model.interactive = true;

    // 添加到舞台
    app.stage.addChild(model);
    
    // 收集动画列表
    collectMotions(model);
    
    // 添加点击事件处理
    setupModelInteraction(model);
    
    // 添加呼吸效果
    setupBreathingEffect(model);
    
    isModelLoaded.value = true;
    showLoadButton.value = false;
    
  } catch (error) {
    console.error('Error loading model:', error);
    showLoadButton.value = true;
    isModelLoaded.value = false;
  } finally {
    isLoading.value = false;
  }
};

// 添加新的辅助函数
const setupModelInteraction = (model: any) => {
  model.on('pointerdown', () => {
    if (selectedIdleMotion.value) return;
    
    if (availableMotions.value.length > 0) {
      const randomMotion = availableMotions.value[Math.floor(Math.random() * availableMotions.value.length)];
      try {
        model.internalModel.motionManager.startMotion(randomMotion.group, randomMotion.index ?? 0);
      } catch (error) {
        console.error('点击播放动画失败:', error);
      }
    }
  });
};

const setupBreathingEffect = (model: any) => {
  let t = 0;
  const updateModel = () => {
    t += 0.01;
    model.scale.set(currentScale.value + Math.sin(t) * currentScale.value * 0.01);
  };
  app.ticker.add(updateModel);
};

// 从本地存储加载可用模型列表
const loadAvailableModels = () => {
  try {
    console.log('开始加载可用模型列表');
    // 尝试从本地存储加载缓存的仓库数据
    const repoKeys = Object.keys(localStorage).filter(key => key.startsWith('repo_cache_'));
    console.log('找到仓库缓存键:', repoKeys);
    
    if (repoKeys.length === 0) {
      console.log('No cached repositories found');
      return;
    }
    
    const allModels: any[] = [];
    
    // 遍历所有缓存的仓库
    for (const key of repoKeys) {
      try {
        const cachedData = localStorage.getItem(key);
        if (!cachedData) {
          console.log(`仓库缓存 ${key} 为空`);
          continue;
        }
        
        console.log(`解析仓库缓存 ${key}`);
        const parsedData = JSON.parse(cachedData);
        const repo = parsedData.repo;
        
        if (!repo || !repo.folders) {
          console.log(`仓库 ${key} 没有有效的文件夹结构`);
          continue;
        }
        
        console.log(`仓库 ${key} 包含 ${repo.folders.length} 个文件夹`);
        
        // 遍历仓库中的所有文件夹
        for (const folder of repo.folders) {
          if (!folder.models) {
            console.log(`文件夹 ${folder.name} 没有模型`);
            continue;
          }
          
          console.log(`文件夹 ${folder.name} 包含 ${folder.models.length} 个模型`);
          
          // 添加文件夹中的所有模型
          for (const model of folder.models) {
            if (model.url && (model.url.endsWith('.model3.json') || 
                              model.url.endsWith('model.json') || 
                              model.url.endsWith('index.json'))) {
              allModels.push(model);
            }
          }
        }
      } catch (error) {
        console.error(`解析仓库缓存 ${key} 失败:`, error);
      }
    }
    
    console.log(`加载了 ${allModels.length} 个可用模型`);
    availableModels.value = allModels;
    
    // 如果有模型但之前没有，且当前没有正在加载或已加载的模型，触发一次随机模型选择
    if (allModels.length > 0 && !isModelLoaded.value && !isLoading.value) {
      console.log('找到可用模型，准备加载随机模型');
      // 使用较短的延迟，确保在 autoLoadAfterDelay 之前触发
      setTimeout(() => {
        // 再次检查状态，避免状态已经改变
        if (!isModelLoaded.value && !isLoading.value) {
          console.log('触发随机模型加载');
          changeRandomModel();
        } else {
          console.log('模型已经在加载中或已加载，跳过随机模型加载');
        }
      }, 500);
    }
  } catch (error) {
    console.error('加载可用模型失败:', error);
  }
};

// 切换固定状态
const togglePin = () => {
  isPinned.value = !isPinned.value;
  // 保存固定状态到本地存储
  localStorage.setItem('live2d-pinned', isPinned.value.toString());
  
  // 如果取消固定，启动随机切换定时器
  if (!isPinned.value) {
    startRandomModelTimer();
  } else {
    // 如果固定，清除定时器
    if (randomModelTimer.value !== null) {
      clearInterval(randomModelTimer.value);
      randomModelTimer.value = null;
    }
  }
};

// 修改 startRandomModelTimer 函数
const startRandomModelTimer = () => {
  console.log('启动随机模型定时器');
  
  // 如果模型被固定，不启动定时器
  if (isPinned.value) {
    console.log('模型已固定，不启动定时器');
    return;
  }
  
  // 清除现有定时器
  if (randomModelTimer.value !== null) {
    console.log('清除现有定时器');
    clearInterval(randomModelTimer.value);
    randomModelTimer.value = null;
  }
  
  // 设置新的定时器，每10分钟更换一次模型
  randomModelTimer.value = window.setInterval(() => {
    // 如果模型被固定，清除定时器
    if (isPinned.value) {
      clearInterval(randomModelTimer.value);
      randomModelTimer.value = null;
      return;
    }
    
    console.log('定时器触发，准备更换模型...');
    
    // 确保有可用模型
    if (availableModels.value.length === 0) {
      console.log('没有可用模型，重新加载模型列表');
      loadAvailableModels();
      
      // 如果加载后仍然没有模型，则退出
      if (availableModels.value.length === 0) {
        console.log('仍然没有可用模型，取消更换');
        return;
      }
    }
    
    // 更换模型
    changeRandomModel();
  }, 10 * 60 * 1000); // 10分钟
  
  console.log('随机模型定时器已启动，ID:', randomModelTimer.value);
};

// 随机更换模型
const changeRandomModel = () => {
  console.log('尝试随机更换模型，当前状态：', { 
    isModelLoaded: isModelLoaded.value, 
    isLoading: isLoading.value,
    availableModelsCount: availableModels.value.length 
  });
  
  if (isLoading.value) {
    console.log('模型正在加载中，跳过更换');
    return;
  }
  
  if (availableModels.value.length === 0) {
    console.log('No available models to change to');
    return;
  }
  
  // 选择一个随机模型
  const randomIndex = Math.floor(Math.random() * availableModels.value.length);
  const randomModel = availableModels.value[randomIndex];
  console.log('选择随机模型:', randomModel);
  
  // 将选中的随机模型设置为临时默认模型
  const modelInfo = {
    name: randomModel.name,
    url: randomModel.url,
    timestamp: Date.now()
  };
  localStorage.setItem('default-live2d-model', JSON.stringify(modelInfo));
  
  // 清理现有模型
  if (app) {
    console.log('清理现有模型');
    app.destroy(true, true);
    app = null;
  }
  isModelLoaded.value = false;
  
  // 重新加载模型
  console.log('开始加载新选择的模型');
  loadModel();
  
  // 手动触发 storage 事件以通知其他组件
  window.dispatchEvent(new StorageEvent('storage', {
    key: 'default-live2d-model',
    newValue: JSON.stringify(modelInfo),
    storageArea: localStorage
  }));
};

// 添加 reloadModel 函数
const reloadModel = () => {
  if (isModelLoaded.value) {
    // 清理现有模型
    if (app) {
      app.destroy(true, true);
      app = null;
    }
    isModelLoaded.value = false;
    
    // 重新加载
    loadModel();
  }
};

// 修改 setupStorageListener 函数
const setupStorageListener = () => {
  window.addEventListener('storage', (event) => {
    if (event.key === 'default-live2d-model') {
      console.log('检测到默认模型变化，重新加载模型');
      // 即使当前没有加载模型也尝试加载
      if (app) {
        app.destroy(true, true);
        app = null;
      }
      isModelLoaded.value = false;
      loadModel();
    } else if (event.key && event.key.startsWith('repo_cache_')) {
      console.log('检测到仓库缓存变化，重新加载可用模型');
      loadAvailableModels();
    } else if (event.key === 'liked-live2d-models') {
      console.log('检测到喜欢的模型列表变化，重新加载');
      loadModelPreferences();
    } else if (event.key === 'disliked-live2d-models') {
      console.log('检测到不喜欢的模型列表变化，重新加载');
      loadModelPreferences();
    }
  });
};

// 处理鼠标滚轮事件
const handleWheel = (event: WheelEvent) => {
  if (!isModelLoaded.value) return;
  
  // 按住 Ctrl 键时才调整大小
  if (!event.ctrlKey) return;
  
  event.preventDefault();
  
  const delta = event.deltaY > 0 ? -0.03 : 0.03;//缩放步长
  const newScale = Math.max(minScale, Math.min(maxScale, currentScale.value + delta));
  
  if (newScale !== currentScale.value) {
    currentScale.value = newScale;
    updateModelScale();
  }
};

// 更新模型缩放
const updateModelScale = () => {
  if (!app || !app.stage || !app.stage.children[0]) return;
  
  const model = app.stage.children[0];
  model.scale.set(currentScale.value);
  
  // 保存新的缩放比例
  saveScale();
};

// 修改动画切换函数
const changeIdleMotion = () => {
  console.log('Changing idle motion to:', selectedIdleMotion.value);
  // 保存选择到本地存储
  if (selectedIdleMotion.value) {
    localStorage.setItem('live2d-idle-motion', JSON.stringify(selectedIdleMotion.value));
  } else {
    localStorage.removeItem('live2d-idle-motion');
  }
  // 立即重新开始动画
  if (app && app.stage && app.stage.children[0]) {
    startIdleAnimation();
  }
};

onMounted(() => {
  console.log('Live2DCharacter组件挂载');
  
  // 加载基础配置
  loadPosition();
  loadScale();
  loadModelPreferences();
  
  // 加载固定状态
  const savedPinned = localStorage.getItem('live2d-pinned');
  if (savedPinned !== null) {
    isPinned.value = savedPinned === 'true';
  }
  
  // 加载可用模型列表并直接初始化模型
  console.log('开始加载可用模型列表');
  loadAvailableModels();
  
  // 设置本地存储监听器
  setupStorageListener();
  
  // 只有在未固定时才启动定时更换模型
  if (!isPinned.value) {
    startRandomModelTimer();
  }
  
  // 直接加载模型，无需延迟
  if (!isModelLoaded.value && !isLoading.value) {
    loadModel();
  }
  
  // 简化页面可见性处理
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && !isModelLoaded.value && !isLoading.value) {
      loadModel();
    }
  });
  
  // 加载保存的idle动画选择
  const savedIdleMotion = localStorage.getItem('live2d-idle-motion');
  if (savedIdleMotion) {
    try {
      selectedIdleMotion.value = JSON.parse(savedIdleMotion);
      console.log('Loaded saved idle motion:', selectedIdleMotion.value);
    } catch (error) {
      console.error('Error loading saved idle motion:', error);
    }
  }
})

onBeforeUnmount(() => {
  // 清理拖动事件监听器
  document.removeEventListener('mousemove', onDrag)
  document.removeEventListener('mouseup', stopDrag)
  
  // 清理定时器
  if (randomModelTimer.value !== null) {
    clearInterval(randomModelTimer.value);
    randomModelTimer.value = null;
  }
  
  if (app) {
    app.destroy(true)
    app = null
  }
})
</script>

<style scoped>
.live2d-container {
  position: fixed;
  width: 600px;  /* 增加容器宽度 */
  height: 600px; /* 增加容器高度 */
  pointer-events: auto;
  z-index: 1000;
  background-color: rgba(0, 0, 0, 0);
  display: flex;
  justify-content: center;
  align-items: center;
  transition: filter 0.2s ease;
  cursor: move;
}

.live2d-container.dragging {
  filter: brightness(1.1);
}

.live2d-container canvas {
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
}

.load-model-button {
  background-color: rgba(0, 0, 0, 0.5);
  color: white;
  padding: 10px 20px;
  border-radius: 5px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.load-model-button:hover {
  background-color: rgba(0, 0, 0, 0.7);
}

.loading-indicator {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.loading-spinner {
  width: 30px;
  height: 30px;
  border: 3px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  border-top-color: white;
  animation: spin 1s linear infinite;
  margin-bottom: 10px;
}

.loading-text {
  color: white;
  font-size: 14px;
  text-shadow: 0 0 5px rgba(0, 0, 0, 0.5);
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.model-controls {
  position: absolute;
  top: 10px;
  right: 10px;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 10px;
  z-index: 1001;
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.3s ease, visibility 0.3s ease;
  background-color: rgba(0, 0, 0, 0.3);
  padding: 8px;
  border-radius: 8px;
  pointer-events: auto;
}

.model-controls.visible {
  opacity: 1;
  visibility: visible;
}

.drag-handle {
  background-color: rgba(0, 0, 0, 0);
  color: white;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: move;
  transition: background-color 0.2s;
}

.drag-handle:hover {
  background-color: rgba(0, 0, 0, 0);
}

.scale-control {
  background-color: rgba(0, 0, 0, 0);
  color: white;
  padding: 5px 10px;
  border-radius: 15px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.scale-slider {
  width: 100px;
  cursor: pointer;
}

.scale-value {
  min-width: 40px;
  text-align: center;
  font-size: 12px;
}

.model-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  padding: 0;
  pointer-events: auto;
}

.like-btn, .dislike-btn, .pin-btn, .refresh-control {
  background-color: rgba(0, 0, 0, 0.5);
  color: white;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;
  margin: 0;
  padding: 0;
  pointer-events: auto;
}

.like-btn:hover, .dislike-btn:hover, .pin-btn:hover, .refresh-control:hover {
  background-color: rgba(0, 0, 0, 0.7);
  transform: scale(1.1);
}

.animation-selector {
  margin-right: 8px;
  width: 120px;
  position: relative;
  z-index: 1002;
  pointer-events: auto;
}

.motion-select {
  width: 100%;
  height: 30px;
  padding: 0 24px 0 8px;
  background-color: rgba(0, 0, 0, 0.5);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 15px;
  cursor: pointer;
  font-size: 12px;
  outline: none;
  pointer-events: auto;
}

.pin-btn.pinned {
  background-color: rgba(255, 165, 0, 0.5);
}

.pin-btn.pinned:hover {
  background-color: rgba(255, 165, 0, 0.7);
}

.like-btn {
  background-color: rgba(0, 0, 0, 0.5);
  color: white;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border: none;
  margin: 0;
  padding: 0;
  pointer-events: auto;
  position: relative;
  overflow: hidden;
}

.like-btn:hover {
  background-color: rgba(255, 105, 180, 0.3);
  transform: scale(1.1);
}

.like-btn.liked {
  animation: likeEffect 1s cubic-bezier(0.4, 0, 0.2, 1);
  background-color: rgba(255, 105, 180, 0.5);
}

@keyframes likeEffect {
  0% {
    transform: scale(1);
  }
  25% {
    transform: scale(1.2);
  }
  50% {
    transform: scale(0.95);
  }
  75% {
    transform: scale(1.1);
  }
  100% {
    transform: scale(1);
  }
}

.like-btn::before {
  content: '';
  position: absolute;
  width: 100%;
  height: 100%;
  background: radial-gradient(circle, rgba(255,192,203,0.8) 0%, rgba(255,192,203,0) 70%);
  opacity: 0;
  transform: scale(0);
  transition: all 0.3s ease;
}

.like-btn.liked::before {
  opacity: 1;
  transform: scale(1.5);
  animation: ripple 1s cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes ripple {
  0% {
    opacity: 1;
    transform: scale(0);
  }
  100% {
    opacity: 0;
    transform: scale(2);
  }
}
</style> 