<template>
  <div class="live2d-model-viewer">
    <div class="model-viewer-header">
      <h3>Live2D 模型查看器</h3>
      <div class="model-controls">
        <button @click="openLocalFolder" class="local-folder-btn" title="打开本地文件夹">
          📂 本地模型
        </button>
        <button @click="refreshRepository" class="refresh-btn" title="刷新模型列表">
          🔄
        </button>
        <button @click="closeViewer" class="close-btn">&times;</button>
      </div>
    </div>
    
    <div class="model-browser">
      <div class="model-browser-header">
        <div class="model-browser-title">Select a Model</div>
        <div class="browser-controls">
          <select v-model="selectedRepoName" @change="changeRepository" class="repo-select">
            <option value="Eikanya/Live2d-model">Eikanya/Live2d-model</option>
            <option value="guansss/pixi-live2d-display">guansss/pixi-live2d-display</option>
            <option value="liked-models">喜欢的模型</option>
            <option value="custom">自定义仓库</option>
          </select>
          <div v-if="selectedRepoName === 'custom'" class="custom-repo-input-container">
            <input 
              v-model="customRepoName" 
              type="text" 
              placeholder="输入仓库路径，例如：用户名/仓库名" 
              class="custom-repo-input"
              @keyup.enter="loadCustomRepository"
            />
            <button @click="loadCustomRepository" class="load-repo-btn">加载</button>
          </div>
          <button @click="toggleCdnInput" class="cdn-btn" title="直接输入CDN URL">
            {{ showCdnInput ? '返回列表' : 'CDN URL' }}
          </button>
          <button @click="refreshRepository" class="refresh-icon">⟳</button>
        </div>
      </div>
      
      <div v-if="showCdnInput" class="cdn-input-container">
        <div class="cdn-input-header">直接输入CDN URL加载模型</div>
        <input 
          v-model="cdnUrl" 
          type="text" 
          placeholder="输入CDN URL，例如：https://cdn.jsdelivr.net/gh/Eikanya/Live2d-model/path/to/model.json" 
          class="cdn-input"
          @keyup.enter="loadModelFromCdn"
        />
        <div class="cdn-examples">
          <div class="example-header">快速选择:</div>
          <div class="example-buttons">
            <button 
              v-for="(example, index) in cdnExamples" 
              :key="index" 
              @click="selectCdnExample(example.url)"
              class="example-btn"
            >
              {{ example.name }}
            </button>
          </div>
        </div>
        <div class="cdn-actions">
          <button @click="loadModelFromCdn" class="load-cdn-btn">加载模型</button>
          <button @click="toggleCdnInput" class="cancel-btn">返回列表</button>
        </div>
      </div>
      
      <div v-else class="model-browser-content">
        <div class="directory-tree">
          <div v-if="loading" class="loading-indicator">
            <div class="loading-spinner"></div>
            <div class="loading-text">加载中...</div>
          </div>
          
          <div v-else-if="error" class="error-message">
            {{ error }}
          </div>
          
          <div v-else class="tree-container">
            <div class="scroll-hint">滚动查看更多文件夹 ↓</div>
            <div v-for="(repo, repoIndex) in repositories" :key="repoIndex" class="repo-item">
              <div 
                class="repo-header" 
                @click="toggleRepo(repoIndex)"
                :class="{ 'expanded': repo.expanded }"
              >
                <span class="toggle-icon">{{ repo.expanded ? '▼' : '▶' }}</span>
                <span class="repo-name">{{ repo.name }}</span>
                <span class="item-count">{{ repo.count }}</span>
              </div>
              
              <div v-if="repo.expanded" class="repo-content">
                <div 
                  v-for="(folder, folderIndex) in repo.folders" 
                  :key="folderIndex"
                  class="folder-item"
                >
                  <div 
                    class="folder-header" 
                    @click="selectFolder(repo, folder)"
                    :class="{ 'selected': selectedFolder === folder }"
                  >
                    <span class="folder-name">{{ folder.name }}</span>
                    <span class="item-count">{{ folder.count }}</span>
                  </div>
                </div>
                <div v-if="repo.folders.length > 10" class="scroll-hint bottom">继续滚动查看更多 ↓</div>
              </div>
            </div>
          </div>
        </div>
        
        <div class="model-files">
          <div v-if="selectedFolder">
            <div class="model-files-header">
              <span class="selected-folder-name">{{ selectedFolder.name }}</span>
              <span class="model-count">{{ selectedFolder.models.length }} 个模型</span>
            </div>
            <div class="model-files-list">
              <div 
                v-for="(model, index) in selectedFolder.models" 
                :key="index"
                class="model-file-item"
                @click="selectModel(model)"
                :class="{ 'selected': selectedModel && selectedModel.path === model.path }"
              >
                {{ getModelDisplayName(model) }}
              </div>
            </div>
            
            <div v-if="selectedModel && modelLoaded" class="model-actions">
              <button @click="setAsDefaultModel" class="set-default-btn">设为默认模型</button>
            </div>
          </div>
          <div v-else class="no-folder-selected">
            请选择一个文件夹查看模型
          </div>
        </div>
      </div>
    </div>
    
    <div ref="modelContainer" class="model-container">
      <div v-if="!modelLoaded && !loadingModel" class="model-placeholder">
        <div v-if="selectedModel">
          <button @click="loadSelectedModel" class="load-model-btn">加载模型</button>
          <div class="selected-model-info">
            <div>已选择: {{ getModelDisplayName(selectedModel) }}</div>
            <div class="model-path">{{ selectedModel.path }}</div>
          </div>
        </div>
        <div v-else class="no-model-selected">
          请选择一个模型
        </div>
      </div>
      
      <div v-if="loadingModel" class="loading-model">
        <div class="loading-spinner"></div>
        <div class="loading-text">加载模型中...</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, computed } from 'vue';

// 定义属性和事件
const props = defineProps<{
  isVisible: boolean;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
}>();

// 状态变量
const modelContainer = ref<HTMLElement | null>(null);
const loading = ref(false);
const error = ref('');
const repositories = ref<any[]>([]);
const modelFolders = ref<any[]>([]); // 添加模型文件夹列表
const selectedModel = ref<any>(null);
const selectedFolder = ref<any>(null);
const modelLoaded = ref(false);
const loadingModel = ref(false);
const showCdnInput = ref(false);
const cdnUrl = ref('');
const selectedRepoName = ref('Eikanya/Live2d-model');
const customRepoName = ref('');
const cdnExamples = ref([
  { 
    name: '七大罪 - 魔王觉醒 (xch001)', 
    url: 'https://cdn.jsdelivr.net/gh/Eikanya/Live2d-model/sin 七大罪 - 魔王觉醒/xch001_01/xch001_01.model3.json' 
  },
  { 
    name: '七大罪 - 魔王觉醒 (xch002)', 
    url: 'https://cdn.jsdelivr.net/gh/Eikanya/Live2d-model/sin 七大罪 - 魔王觉醒/xch002_01/xch002_01.model3.json' 
  },
  { 
    name: '七大罪 - 魔王觉醒 (xch003)', 
    url: 'https://cdn.jsdelivr.net/gh/Eikanya/Live2d-model/sin 七大罪 - 魔王觉醒/xch003_01/xch003_01.model3.json' 
  },
  { 
    name: '七大罪 - 魔王觉醒 (xch004)', 
    url: 'https://cdn.jsdelivr.net/gh/Eikanya/Live2d-model/sin 七大罪 - 魔王觉醒/xch004_01/xch004_01.model3.json' 
  },
  { 
    name: '七大罪 - 魔王觉醒 (xch005)', 
    url: 'https://cdn.jsdelivr.net/gh/Eikanya/Live2d-model/sin 七大罪 - 魔王觉醒/xch005_01/xch005_01.model3.json' 
  }
]);
let app: any = null;
let currentModel: any = null;

// CDN基础URL
const CDN_BASE_URL = 'https://cdn.jsdelivr.net/gh/';

// 添加新的函数和状态
const localModels = ref<any[]>([]);
const forceRefresh = ref(false); // 是否强制刷新

// 添加喜欢的模型列表相关状态和方法
const likedModels = ref<any[]>([]);

// 打开本地文件夹
const openLocalFolder = async () => {
  try {
    console.log('Opening local folder...');
    console.log('Window object:', window);
    console.log('electronAPI available:', !!window.electronAPI);
    console.log('electronAPI methods:', window.electronAPI ? Object.keys(window.electronAPI) : 'not available');
    
    if (!window.electronAPI) {
      throw new Error('Electron API is not available');
    }
    
    console.log('Calling openDirectory...');
    // 使用 electron 的 dialog 来选择文件夹
    const result = await window.electronAPI.openDirectory();
    console.log('openDirectory result:', result);
    
    if (!result.canceled && result.filePaths.length > 0) {
      const folderPath = result.filePaths[0];
      console.log('Selected folder:', folderPath);
      await loadLocalModels(folderPath);
    }
  } catch (error) {
    console.error('打开文件夹失败:', error);
    error.value = `打开文件夹失败: ${error.message}`;
  }
};

// 加载本地模型
const loadLocalModels = async (folderPath: string) => {
  try {
    loading.value = true;
    error.value = '';
    
    // 使用 electron 的 fs 模块来读取文件夹内容
    const files = await window.electronAPI.readDirectory(folderPath);
    console.log('Read directory files:', files);
    
    // 过滤出 .model3.json 和 model.json 文件
    const modelFiles = files.filter(file => 
      file.endsWith('.model3.json') || 
      file.endsWith('model.json') ||
      file.endsWith('index.json')
    );
    console.log('Filtered model files:', modelFiles);

    // 创建本地模型文件夹
    const localFolder = {
      name: '本地模型',
      expanded: true,
      count: modelFiles.length,
      models: modelFiles.map(file => ({
        name: file.split(/[/\\]/).pop() || file,
        path: file,
        url: `file:///${file.replace(/\\/g, '/')}`,
        isLocal: true
      }))
    };
    console.log('Created local folder:', localFolder);

    // 更新仓库列表
    const existingLocalIndex = repositories.value.findIndex(repo => repo.name === '本地模型');
    if (existingLocalIndex !== -1) {
      repositories.value[existingLocalIndex] = {
        ...localFolder,
        folders: [localFolder]
      };
    } else {
      repositories.value.unshift({
        name: '本地模型',
        expanded: true,
        count: modelFiles.length,
        folders: [localFolder]
      });
    }

    // 自动选择本地模型文件夹
    const repo = repositories.value[existingLocalIndex !== -1 ? existingLocalIndex : 0];
    selectFolder(repo, repo.folders[0]);
    
  } catch (error) {
    console.error('加载本地模型失败:', error);
    error.value = `加载本地模型失败: ${error.message || '未知错误'}`;
  } finally {
    loading.value = false;
  }
};

// 关闭查看器
const closeViewer = () => {
  emit('close');
};

// 切换仓库展开状态
const toggleRepo = (repoIndex: number) => {
  repositories.value[repoIndex].expanded = !repositories.value[repoIndex].expanded;
};

// 切换文件夹展开状态
const toggleFolder = (repoIndex: number, folderIndex: number) => {
  const folder = repositories.value[repoIndex].folders[folderIndex];
  folder.expanded = !folder.expanded;
  
  if (folder.expanded) {
    selectedFolder.value = folder;
  }
};

// 切换子文件夹展开状态
const toggleSubFolder = (repoIndex: number, folderIndex: number, subFolderIndex: number) => {
  const subFolder = repositories.value[repoIndex].folders[folderIndex].subFolders[subFolderIndex];
  subFolder.expanded = !subFolder.expanded;
  
  if (subFolder.expanded) {
    selectedFolder.value = subFolder;
  }
};

// 选择模型
const selectModel = async (model: any) => {
  console.log('选择模型:', model);
  selectedModel.value = model;
  modelLoaded.value = false; // 重置加载状态
  
  // 自动加载模型
  await loadSelectedModel();
};

// 设置为默认模型
const setAsDefaultModel = () => {
  if (!selectedModel.value) return;
  
  // 保存模型信息到本地存储
  const modelInfo = {
    name: selectedModel.value.name,
    path: selectedModel.value.path,
    url: selectedModel.value.url,
    isLocal: selectedModel.value.isLocal,
    timestamp: Date.now()
  };
  
  localStorage.setItem('default-live2d-model', JSON.stringify(modelInfo));
  
  // 手动触发 storage 事件以通知其他组件
  window.dispatchEvent(new StorageEvent('storage', {
    key: 'default-live2d-model',
    newValue: JSON.stringify(modelInfo),
    storageArea: localStorage
  }));
};

// 刷新模型列表
const refreshRepository = () => {
  forceRefresh.value = true;
  loadModelStructure();
};

// 切换仓库
const changeRepository = () => {
  console.log('切换仓库:', selectedRepoName.value);
  
  // 清空当前模型列表
  repositories.value = [];
  
  if (selectedRepoName.value === 'liked-models') {
    console.log('准备显示喜欢的模型列表，当前有', likedModels.value.length, '个喜欢的模型');
    // 显示喜欢的模型列表
    displayLikedModels();
    return;
  }
  
  if (selectedRepoName.value !== 'custom') {
    loadRepository(selectedRepoName.value);
  }
};

// 加载自定义仓库
const loadCustomRepository = () => {
  if (customRepoName.value) {
    loadRepository(customRepoName.value);
  }
};

// 加载仓库
const loadRepository = async (repoPath: string) => {
  loading.value = true;
  error.value = '';
  
  try {
    // 检查本地存储中是否有缓存的仓库数据
    const cacheKey = `repo_cache_${repoPath}`;
    const cachedData = localStorage.getItem(cacheKey);
    
    // 如果有缓存且不是强制刷新，则使用缓存数据
    if (cachedData && !forceRefresh.value) {
      console.log(`Loading repository data from cache for ${repoPath}`);
      const parsedData = JSON.parse(cachedData);
      
      // 检查缓存是否过期（默认7天）
      const cacheTime = parsedData.timestamp || 0;
      const now = Date.now();
      const cacheAge = now - cacheTime;
      const cacheMaxAge = 7 * 24 * 60 * 60 * 1000; // 7天
      
      if (cacheAge < cacheMaxAge) {
        repositories.value = [parsedData.repo];
        
        // 默认选择第一个文件夹
        if (parsedData.repo.folders && parsedData.repo.folders.length > 0) {
          selectFolder(parsedData.repo, parsedData.repo.folders[0]);
        }
        
        loading.value = false;
        console.log('Repository loaded from cache successfully');
        return;
      } else {
        console.log('Cache expired, fetching fresh data');
      }
    }
    
    // 创建仓库结构
    const repo = {
      name: repoPath,
      expanded: true,
      count: 0,
      folders: [] as any[]
    };
    
    // 实时获取目录结构
    const baseUrl = `https://cdn.jsdelivr.net/gh/${repoPath}/`;
    
    // 尝试使用目录列表方法（这是最可靠的方法）
    const directoryListingSuccess = await loadFromDirectoryListing(repo, repoPath, baseUrl);
    
    // 如果目录列表方法失败，尝试其他方法
    if (!directoryListingSuccess || repo.folders.length === 0) {
      try {
        // 尝试使用GitHub API
        console.log('Attempting to load repository using GitHub API');
        await loadFromGitHubAPI(repo, repoPath, baseUrl);
        console.log('Successfully loaded repository using GitHub API');
      } catch (err) {
        console.error('GitHub API failed:', err);
        
        try {
          // 如果GitHub API失败，尝试使用jsdelivr API
          console.log('Attempting to load repository using jsdelivr API');
          await loadFromJsdelivrAPI(repo, repoPath, baseUrl);
          console.log('Successfully loaded repository using jsdelivr API');
        } catch (err2) {
          console.error('jsdelivr API failed:', err2);
          
          // 如果所有方法都失败，尝试使用预定义的模型列表
          if (repoPath === 'Eikanya/Live2d-model') {
            console.warn('Using predefined models for Eikanya/Live2d-model');
            usePredefinedModelsForEikanya(repo);
          } else {
            throw new Error('无法获取仓库内容，请尝试使用CDN URL直接加载模型');
          }
        }
      }
    }
    
    // 按名称排序文件夹
    repo.folders.sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'));
    
    // 调试信息：打印所有文件夹名称
    console.log('All folders found:', repo.folders.map(f => f.name));
    
    // 添加仓库到列表
    if (repo.folders.length > 0) {
      repositories.value = [repo];
      
      // 将仓库数据保存到本地存储
      const cacheData = {
        repo: repo,
        timestamp: Date.now()
      };
      localStorage.setItem(cacheKey, JSON.stringify(cacheData));
      console.log(`Repository data cached for ${repoPath}`);
      
      // 默认选择第一个文件夹
      if (repo.folders.length > 0) {
        selectFolder(repo, repo.folders[0]);
      }
    } else {
      error.value = '未找到任何模型文件';
    }
    
  } catch (err: any) {
    console.error('加载仓库失败:', err);
    error.value = `加载失败: ${err.message}`;
  } finally {
    loading.value = false;
    forceRefresh.value = false; // 重置强制刷新标志
  }
};

// 使用GitHub API加载仓库内容
const loadFromGitHubAPI = async (repo: any, repoPath: string, baseUrl: string) => {
  const [owner, repoName] = repoPath.split('/');
  
  // 首先尝试获取仓库的默认分支
  const repoInfoUrl = `https://api.github.com/repos/${owner}/${repoName}`;
  console.log('Fetching repository info from:', repoInfoUrl);
  
  const repoInfoResponse = await fetch(repoInfoUrl);
  
  if (!repoInfoResponse.ok) {
    throw new Error(`获取仓库信息失败: ${repoInfoResponse.status}`);
  }
  
  const repoInfo = await repoInfoResponse.json();
  const defaultBranch = repoInfo.default_branch || 'master';
  
  console.log(`Repository default branch: ${defaultBranch}`);
  
  // 首先只获取根目录结构，不使用recursive参数
  const rootTreeUrl = `https://api.github.com/repos/${owner}/${repoName}/git/trees/${defaultBranch}`;
  console.log('Fetching root directory structure from:', rootTreeUrl);
  
  const rootResponse = await fetch(rootTreeUrl);
  
  if (!rootResponse.ok) {
    throw new Error(`获取根目录结构失败: ${rootResponse.status}`);
  }
  
  const rootData = await rootResponse.json();
  const rootItems = rootData.tree || [];
  
  console.log(`Found ${rootItems.length} items in root directory`);
  
  // 过滤出所有文件夹，并排除包含指定字符串的文件夹
  const excludePatterns = ["宝石", "Nerco", "方舟指令", "美好的世界", "战舰少女", "Brige", "恋心"];
  const folders = rootItems.filter(item => {
    // 首先确保是文件夹
    if (item.type !== 'tree') return false;
    
    // 检查文件夹名称是否包含任何排除的字符串
    const folderName = item.path;
    return !excludePatterns.some(pattern => folderName.includes(pattern));
  });
  
  console.log(`Found ${folders.length} folders in root directory after filtering:`, folders.map(f => f.path));
  
  // 为每个文件夹创建一个条目
  for (const folder of folders) {
    const folderName = folder.path;
    const folderEntry = {
      name: folderName,
      expanded: false,
      count: 0,
      models: [],
      subFolders: []
    };
    
    // 将文件夹添加到仓库
    repo.folders.push(folderEntry);
    
    // 保存文件夹信息到本地存储
    const folderCacheKey = `live2d-folder-${repoPath}-${folderName}`;
    const cachedFolder = localStorage.getItem(folderCacheKey);
    
    if (cachedFolder && !forceRefresh.value) {
      try {
        // 使用缓存的文件夹内容
        const folderData = JSON.parse(cachedFolder);
        if (folderData.models && folderData.models.length > 0) {
          folderEntry.models = folderData.models;
          folderEntry.count = folderData.models.length;
          folderEntry.subFolders = folderData.subFolders || [];
          console.log(`Loaded ${folderEntry.count} models from cache for folder ${folderName}`);
          continue; // 跳过此文件夹的API请求
        }
      } catch (err) {
        console.error(`Error parsing cached folder data for ${folderName}:`, err);
        // 缓存解析失败，继续获取新数据
      }
    }
    
    // 获取此文件夹的内容
    try {
      const folderUrl = `https://api.github.com/repos/${owner}/${repoName}/git/trees/${folder.sha}?recursive=1`;
      console.log(`Fetching content for folder ${folderName} from:`, folderUrl);
      
      const folderResponse = await fetch(folderUrl);
      
      if (!folderResponse.ok) {
        console.error(`获取文件夹 ${folderName} 内容失败: ${folderResponse.status}`);
        continue; // 跳过此文件夹，继续处理下一个
      }
      
      const folderData = await folderResponse.json();
      
      // 检查是否截断
      if (folderData.truncated) {
        console.warn(`警告: 文件夹 ${folderName} 内容被截断，可能无法获取所有文件`);
      }
      
      const folderFiles = folderData.tree || [];
      console.log(`Found ${folderFiles.length} files in folder ${folderName}`);
      
      // 查找模型文件
      for (const file of folderFiles) {
        const path = file.path;
        if (!path || file.type !== 'blob') continue;
        if (!path.endsWith('.json') && !path.endsWith('.model3.json')) continue;
        
        // 只添加模型文件（model.json 或 *.model3.json 或 index.json）
        if (path.endsWith('/model.json') || 
            path.endsWith('.model3.json') || 
            path.endsWith('/index.json')) {
          
          // 构建完整路径
          const fullPath = `${folderName}/${path}`;
          
          // 构建URL时正确编码路径，确保中文字符被正确处理
          const encodedPath = `${encodeURIComponent(folderName)}/${path.split('/').map(part => encodeURIComponent(part)).join('/')}`;
          
          folderEntry.models.push({
            name: path.split('/').pop() || path,
            path: fullPath,
            url: `${baseUrl}${encodedPath}`
          });
          
          folderEntry.count++;
        }
      }
      
      // 保存文件夹内容到本地存储
      localStorage.setItem(folderCacheKey, JSON.stringify({
        models: folderEntry.models,
        subFolders: folderEntry.subFolders,
        timestamp: Date.now()
      }));
      
      console.log(`Cached ${folderEntry.count} models for folder ${folderName}`);
      
    } catch (err) {
      console.error(`Error fetching content for folder ${folderName}:`, err);
    }
  }
  
  // 移除没有模型的文件夹
  repo.folders = repo.folders.filter(folder => folder.count > 0);
  
  // 计算总模型数
  repo.count = repo.folders.reduce((total, folder) => total + folder.count, 0);
  
  console.log(`Added ${repo.folders.length} folders with ${repo.count} models to repository via GitHub API`);
  console.log('Folder names:', repo.folders.map(f => f.name));
  
  // 确保按原始名称排序，不受编码影响
  repo.folders.sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'));
};

// 使用jsdelivr API加载仓库内容
const loadFromJsdelivrAPI = async (repo: any, repoPath: string, baseUrl: string) => {
  // 使用jsdelivr API获取文件列表
  const jsdelivrUrl = `https://data.jsdelivr.com/v1/package/gh/${repoPath}`;
  console.log('Fetching repository structure from jsdelivr:', jsdelivrUrl);
  
  const response = await fetch(jsdelivrUrl);
  if (!response.ok) {
    throw new Error(`jsdelivr API错误: ${response.status}`);
  }
  
  const data = await response.json();
  
  // 获取文件列表
  const fileListUrl = `https://data.jsdelivr.com/v1/package/gh/${repoPath}@${data.default}/flat`;
  console.log('Fetching file list from jsdelivr:', fileListUrl);
  
  const fileListResponse = await fetch(fileListUrl);
  
  if (!fileListResponse.ok) {
    throw new Error(`获取文件列表失败: ${fileListResponse.status}`);
  }
  
  const fileListData = await fileListResponse.json();
  const files = fileListData.files || [];
  
  console.log(`Found ${files.length} files in repository via jsdelivr API`);
  
  // 构建目录树
  const dirMap = new Map();
  
  // 首先收集所有目录
  for (const file of files) {
    const path = file.name;
    if (!path) continue;
    
    const parts = path.split('/');
    if (parts.length <= 1) continue;
    
    const dirName = parts[0];
    if (!dirMap.has(dirName)) {
      dirMap.set(dirName, {
        name: dirName,
        expanded: false,
        count: 0,
        models: [],
        subFolders: []
      });
    }
  }
  
  // 然后为每个目录收集模型文件
  for (const file of files) {
    const path = file.name;
    if (!path) continue;
    if (!path.endsWith('.json') && !path.endsWith('.model3.json')) continue;
    
    const parts = path.split('/');
    if (parts.length <= 1) continue;
    
    const dirName = parts[0];
    const dir = dirMap.get(dirName);
    if (!dir) continue;
    
    // 只添加模型文件（model.json 或 *.model3.json）
    if (parts[parts.length - 1] === 'model.json' || 
        parts[parts.length - 1].endsWith('.model3.json') || 
        parts[parts.length - 1] === 'index.json') {
      const modelFileName = parts[parts.length - 1];
      
      // 构建URL时正确编码路径，确保中文字符被正确处理
      const encodedPath = path.split('/').map(part => encodeURIComponent(part)).join('/');
      
      dir.models.push({
        name: modelFileName,
        path: path,
        url: `${baseUrl}${encodedPath}`
      });
      
      dir.count++;
    }
  }
  
  // 将目录添加到仓库
  for (const dir of dirMap.values()) {
    repo.folders.push(dir);
    repo.count += dir.models.length;
  }
  
  console.log(`Added ${repo.folders.length} folders to repository via jsdelivr API`);
  console.log('Folder names:', repo.folders.map(f => f.name));
  
  // 确保按原始名称排序，不受编码影响
  repo.folders.sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'));
};

// 使用直接目录列表方法获取仓库内容
const loadFromDirectoryListing = async (repo: any, repoPath: string, baseUrl: string) => {
  console.log('Attempting to load repository using directory listing method');
  
  // 使用jsdelivr的目录浏览功能
  const browseUrl = `https://cdn.jsdelivr.net/gh/${repoPath}/`;
  console.log('Browsing repository at:', browseUrl);
  
  try {
    // 获取仓库根目录的HTML内容
    const response = await fetch(browseUrl);
    if (!response.ok) {
      throw new Error(`获取目录列表失败: ${response.status}`);
    }
    
    const html = await response.text();
    
    // 解析HTML以提取目录
    const dirRegex = /<a href="([^"]+)\/"[^>]*>([^<]+)<\/a>/g;
    const dirs = new Set();
    let match;
    
    while ((match = dirRegex.exec(html)) !== null) {
      const dirName = match[1];
      if (dirName !== '..') {
        dirs.add(dirName);
      }
    }
    
    console.log(`Found ${dirs.size} directories via directory listing`);
    console.log('Directory names:', Array.from(dirs));
    
    // 为每个目录创建一个文件夹
    for (const dirName of dirs) {
      // 检查这个目录是否包含模型文件
      const dirUrl = `${browseUrl}${dirName}/`;
      const dirResponse = await fetch(dirUrl);
      
      if (!dirResponse.ok) continue;
      
      const dirHtml = await dirResponse.text();
      
      // 查找模型文件
      const modelRegex = /<a href="([^"]+\.(?:json|model3\.json))"[^>]*>([^<]+)<\/a>/g;
      const models = [];
      let modelMatch;
      
      while ((modelMatch = modelRegex.exec(dirHtml)) !== null) {
        const modelFileName = modelMatch[1];
        
        // 只添加模型文件
        if (modelFileName === 'model.json' || 
            modelFileName.endsWith('.model3.json') || 
            modelFileName === 'index.json') {
          
          const modelPath = `${dirName}/${modelFileName}`;
          const encodedPath = encodeURIComponent(dirName) + '/' + encodeURIComponent(modelFileName);
          
          models.push({
            name: modelFileName,
            path: modelPath,
            url: `${baseUrl}${encodedPath}`
          });
        }
      }
      
      // 如果找到了模型文件，添加这个目录
      if (models.length > 0) {
        repo.folders.push({
          name: dirName,
          expanded: false,
          count: models.length,
          models: models,
          subFolders: []
        });
        
        repo.count += models.length;
      }
    }
    
    console.log(`Added ${repo.folders.length} folders to repository via directory listing`);
    
    // 确保按原始名称排序，不受编码影响
    repo.folders.sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'));
    
    return true;
  } catch (err) {
    console.error('Directory listing failed:', err);
    return false;
  }
};

// 为Eikanya/Live2d-model仓库使用预定义的模型列表
const usePredefinedModelsForEikanya = (repo: any) => {
  const predefinedFolders = [
    {
      name: "少女前线 girls Frontline",
      models: [
        "97type/normal/model.json",
        "Alchemist/normal/model.json",
        "AN94/model.json",
        "ART556/model.json",
        "Carcano1891/model.json",
        "Carcano1938/model.json",
        "CETME556/model.json",
        "DSR50/model.json",
        "Destroyer/normal/model.json",
        "Gager/model.json",
        "Intruder/model.json",
        "M1903/model.json",
        "M950A/model.json",
        "NTW20/model.json",
        "Ouroboros/model.json",
        "RFB/model.json",
        "SSG69/model.json",
        "Scarecrow/normal/model.json",
        "WA2000/model.json",
        "Weaver/model.json",
        "contender/model.json",
        "fn57/model.json",
        "g36c/model.json",
        "gelina/model.json",
        "grizzly/model.json",
        "kp31/model.json",
        "mlemk1/model.json",
        "px4storm/model.json",
        "rfb_1809/model.json",
        "sat8_2801/model.json",
        "sat8_3101/model.json",
        "type64-AR/model.json",
        "vector/model.json",
        "welrod/model.json"
      ]
    },
    {
      name: "少女咖啡枪 girls cafe gun",
      models: [
        "Ameli/model.json",
        "Bren Ten/model.json",
        "CZ75/model.json",
        "Groza/model.json",
        "M1918/model.json",
        "M1928A1/model.json",
        "M37/model.json",
        "P99/model.json",
        "SVD/model.json",
        "Welrod/model.json",
        "hk416/model.json"
      ]
    },
    {
      name: "少女次元",
      models: [
        "Diana/model.json",
        "Hecate/model.json",
        "Yuki/model.json"
      ]
    },
    {
      name: "崩坏学园2",
      models: [
        "seele/model.json",
        "theresa/model.json",
        "theresa_1/model.json",
        "yae/model.json"
      ]
    },
    {
      name: "东京Nerco/l2d",
      models: [
        "Aya/model.json",
        "Ichi/model.json",
        "Jin/model.json",
        "Karasu/model.json",
        "Sora/model.json"
      ]
    },
    {
      name: "宝石研物语",
      models: [
        "diamond/model.json",
        "peridot/model.json"
      ]
    },
    {
      name: "sin 七大罪 - 魔王觉醒",
      models: [
        "xch001_01/xch001_01.model3.json",
        "xch001b_01/xch001b_01.model3.json",
        "xch002_01/xch002_01.model3.json",
        "xch003_01/xch003_01.model3.json",
        "xch004_01/xch004_01.model3.json",
        "xch004a_01/xch004a_01.model3.json",
        "xch005_01/xch005_01.model3.json",
        "xch006_01/xch006_01.model3.json",
        "xch007_01/xch007_01.model3.json",
        "xch007a_01/xch007a_01.model3.json",
        "xch009_01/xch009_01.model3.json",
        "xch010_01/xch010_01.model3.json",
        "xch011_01/xch011_01.model3.json",
        "xch012_01/xch012_01.model3.json",
        "xch013_01/xch013_01.model3.json",
        "xch014_01/xch014_01.model3.json",
        "xch015_01/xch015_01.model3.json"
      ]
    }
  ];
  
  const baseUrl = `https://cdn.jsdelivr.net/gh/Eikanya/Live2d-model/`;
  
  // 添加预定义的文件夹
  for (const folderInfo of predefinedFolders) {
    const folder = {
      name: folderInfo.name,
      expanded: false,
      count: folderInfo.models.length,
      models: [] as any[],
      subFolders: [] as any[]
    };
    
    // 添加模型文件
    for (const modelPath of folderInfo.models) {
      const modelFileName = modelPath.split('/').pop() || modelPath;
      const fullPath = `${folderInfo.name}/${modelPath}`;
      
      // 使用encodeURIComponent处理URL中的特殊字符
      const encodedPath = encodeURIComponent(folderInfo.name) + '/' + encodeURIComponent(modelPath);
      
      folder.models.push({
        name: modelFileName,
        path: fullPath,
        url: `${baseUrl}${encodedPath}`
      });
    }
    
    // 添加到仓库
    if (folder.count > 0) {
      repo.folders.push(folder);
      repo.count += folder.count;
    }
  }
};

// 加载模型结构
const loadModelStructure = async () => {
  await loadRepository(selectedRepoName.value !== 'custom' ? selectedRepoName.value : customRepoName.value || 'Eikanya/Live2d-model');
};

// 等待Live2D初始化
const waitForLive2D = () => {
  return new Promise((resolve) => {
    const checkLive2D = () => {
      // 检查 PIXI 和 Live2DCubismCore 是否都已加载
      if (window.PIXI && window.PIXI.live2d && window.Live2DCubismCore) {
        window.Live2DModel = PIXI.live2d.Live2DModel;
        console.log('Live2D initialized with Cubism Core');
        
        // 添加WebGL错误抑制
        suppressWebGLErrors();
        
        resolve(true);
      } else {
        console.log('Waiting for Live2D and Cubism Core...', {
          PIXI: !!window.PIXI,
          live2d: !!(window.PIXI && window.PIXI.live2d),
          cubismCore: !!window.Live2DCubismCore
        });
        setTimeout(checkLive2D, 100);
      }
    };
    checkLive2D();
  });
};

// 添加WebGL错误抑制函数
const suppressWebGLErrors = () => {
  // 保存原始的console.error方法
  const originalConsoleError = console.error;
  
  // 重写console.error以过滤掉特定的WebGL错误
  console.error = function(...args) {
    // 检查是否是我们想要忽略的WebGL错误
    const errorMsg = args.join(' ');
    if (
      errorMsg.includes('WebGL: INVALID_OPERATION: bindTexture: object does not belong to this context') ||
      errorMsg.includes('WebGL: INVALID_OPERATION: bindBuffer: object does not belong to this context') ||
      errorMsg.includes('WebGL: INVALID_OPERATION: drawElements: no valid shader program in use') ||
      errorMsg.includes('WebGL: too many errors, no more errors will be reported to the console for this context')
    ) {
      // 忽略这些特定的WebGL错误
      return;
    }
    
    // 对于其他错误，使用原始的console.error方法
    originalConsoleError.apply(console, args);
  };
};

// 清理现有模型
const cleanupCurrentModel = () => {
  if (app) {
    if (currentModel) {
      app.stage.removeChild(currentModel);
      currentModel = null;
    }
    app.destroy(true);
    app = null;
  }
  modelLoaded.value = false;
};

// 加载选中的模型
const loadSelectedModel = async () => {
  if (!selectedModel.value || loadingModel.value) return;
  
  loadingModel.value = true;
  modelLoaded.value = false;  // 重置加载状态
  error.value = '';
  
  // 清理现有模型
  cleanupCurrentModel();
  
  if (!modelContainer.value) {
    loadingModel.value = false;
    error.value = '模型容器不存在';
    return;
  }

  try {
    console.log('Waiting for Live2D initialization...');
    await waitForLive2D();
    console.log('Live2D initialized');

    // 创建 PIXI 应用
    app = new window.PIXI.Application({
      width: modelContainer.value.clientWidth,
      height: modelContainer.value.clientHeight,
      transparent: true,
      antialias: true
    });

    modelContainer.value.appendChild(app.view);
    console.log('PIXI Application created');
    
    const modelUrl = selectedModel.value.url;
    console.log('Loading model from:', modelUrl);

    // 加载模型
    console.log('Loading model...');
    const model = await window.Live2DModel.from(modelUrl, {
      motionPreload: "ALL", // 预加载所有动作
      idleMotionPriority: 1 // 设置空闲动作优先级
    });
    console.log('Model loaded successfully');
    currentModel = model;

    // 调整模型大小和位置
    const scale = Math.min(
      app.screen.width / model.width,
      app.screen.height / model.height
    ) * 0.8;
    
    model.scale.set(scale);
    model.x = app.screen.width / 2;
    model.y = app.screen.height / 2;
    model.anchor.set(0.5, 0.5);

    // 添加到舞台
    app.stage.addChild(model);
    console.log('Model added to stage');

    // 启用交互
    model.interactive = true;
    
    // 添加点击事件
    model.on('pointerdown', () => {
      console.log('Model clicked');
      const motionManager = model.internalModel.motionManager;
      console.log('Motion manager on click:', motionManager);
      
      // 获取所有可用的动作组
      const motionGroups = motionManager.definitions;
      console.log('Available motion groups:', motionGroups);
      
      if (motionGroups) {
        let availableMotions = [];
        
        // 处理不同格式的动作定义
        if (Array.isArray(motionGroups)) {
          availableMotions = motionGroups.filter(def => def && typeof def === 'object' && def.group);
        } else if (typeof motionGroups === 'object') {
          availableMotions = Object.keys(motionGroups).map(key => ({ group: key }));
        }
        
        if (availableMotions.length > 0) {
          const randomMotion = availableMotions[Math.floor(Math.random() * availableMotions.length)];
          console.log('Playing random motion:', randomMotion);
          model.motion(randomMotion.group);
        }
      }
    });

    // 自动播放 idle 动作
    const startIdleAnimation = () => {
      const motionManager = model.internalModel.motionManager;
      console.log('Motion manager:', motionManager);
      
      // 检查是否是旧版本模型（通过检查 motions 属性）
      const modelSettings = model.internalModel.settings;
      console.log('Model settings:', modelSettings);
      
      if (modelSettings && modelSettings.motions) {
        // 旧版本模型的动作处理
        console.log('Old version model detected');
        const motions = modelSettings.motions;
        console.log('Available motions:', motions);
        
        // 尝试获取 idle 动作组
        if (motions.idle && Array.isArray(motions.idle) && motions.idle.length > 0) {
          console.log('Found idle motions:', motions.idle);
          // 随机选择一个 idle 动作
          const randomIdle = motions.idle[Math.floor(Math.random() * motions.idle.length)];
          console.log('Playing idle motion:', randomIdle);
          
          // 使用 motion 方法播放动作
          model.motion('idle', randomIdle.file, () => {
            startIdleAnimation();
          });
          return;
        }
      }
      
      // 新版本模型的动作处理
      const definitions = motionManager?.definitions;
      console.log('Motion definitions:', definitions);
      
      if (!definitions) {
        console.warn('No motion definitions found');
        return;
      }
      
      // 处理数组形式的 definitions
      if (Array.isArray(definitions)) {
        const idleMotions = definitions.filter(def => def && typeof def === 'object' && def.group === 'idle');
        console.log('Idle motions:', idleMotions);
        
        if (idleMotions.length > 0) {
          const randomIdle = idleMotions[Math.floor(Math.random() * idleMotions.length)];
          model.motion(randomIdle.group, undefined, () => {
            startIdleAnimation();
          });
        } else {
          // 如果没有找到 idle 动作，尝试获取第一个可用的动作组
          const firstMotion = definitions[0];
          if (firstMotion && firstMotion.group) {
            console.log('No idle motions found, playing first available motion:', firstMotion);
            model.motion(firstMotion.group);
          }
        }
      } 
      // 处理对象形式的 definitions
      else if (typeof definitions === 'object') {
        const motionGroups = Object.keys(definitions);
        console.log('Motion groups:', motionGroups);
        
        if (motionGroups.includes('idle')) {
          model.motion('idle', 0, () => {
            startIdleAnimation();
          });
        } else if (motionGroups.length > 0) {
          // 如果没有 idle 动作，使用第一个可用的动作组
          const firstGroup = motionGroups[0];
          console.log('No idle motions found, playing first group:', firstGroup);
          model.motion(firstGroup);
        }
      }
    };

    // 开始播放 idle 动作
    startIdleAnimation();

    // 添加呼吸效果
    let t = 0;
    const updateModel = () => {
      t += 0.01;
      model.scale.set(scale + Math.sin(t) * scale * 0.01);
    };
    app.ticker.add(updateModel);
    
    // 设置加载完成状态
    modelLoaded.value = true;
    console.log('Model loading complete, modelLoaded set to true');
    
  } catch (error: any) {
    console.error('Error loading model:', error);
    error.value = `加载模型失败: ${error.message || '未知错误'}`;
    modelLoaded.value = false;
    
    // 清理资源
    if (app) {
      app.destroy(true);
      app = null;
    }
  } finally {
    loadingModel.value = false;
  }
};

// 处理窗口大小变化
const handleResize = () => {
  if (!app || !modelContainer.value) return;
  
  app.renderer.resize(
    modelContainer.value.clientWidth,
    modelContainer.value.clientHeight
  );
  
  if (currentModel) {
    const scale = Math.min(
      app.screen.width / currentModel.width,
      app.screen.height / currentModel.height
    ) * 0.8;
    
    currentModel.scale.set(scale);
    currentModel.x = app.screen.width / 2;
    currentModel.y = app.screen.height / 2;
  }
};

// 组件挂载时
onMounted(() => {
  // 检查 electronAPI 是否可用
  console.log('Checking electronAPI availability:', {
    electronAPI: !!window.electronAPI,
    methods: window.electronAPI ? Object.keys(window.electronAPI) : 'not available'
  });
  
  // 加载模型结构
  loadModelStructure();
  
  // 监听窗口大小变化
  window.addEventListener('resize', handleResize);
  
  // 加载喜欢的模型列表
  loadLikedModels();
  console.log('组件挂载时加载了喜欢的模型列表，数量:', likedModels.value.length);
  
  // 设置存储监听器
  setupStorageListener();
});

// 组件卸载前清理
onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize);
  
  if (app) {
    app.destroy(true);
    app = null;
  }
});

// 切换CDN输入状态
const toggleCdnInput = () => {
  showCdnInput.value = !showCdnInput.value;
};

// 从CDN加载模型
const loadModelFromCdn = async () => {
  if (!cdnUrl.value) return;
  
  try {
    // 清理之前的模型
    if (app) {
      app.destroy(true);
      app = null;
    }

    // 创建 PIXI 应用
    app = new window.PIXI.Application({
      width: modelContainer.value?.clientWidth || 800,
      height: modelContainer.value?.clientHeight || 600,
      transparent: true,
      antialias: true
    });

    modelContainer.value?.appendChild(app.view);
    console.log('PIXI Application created');
    
    const modelUrl = cdnUrl.value;
    console.log('Loading model from:', modelUrl);

    // 加载模型
    console.log('Loading model...');
    try {
      const model = await window.Live2DModel.from(modelUrl);
      console.log('Model loaded');
      currentModel = model;

      // 调整模型大小和位置
      const scale = Math.min(
        app.screen.width / model.width,
        app.screen.height / model.height
      ) * 0.8;
      
      model.scale.set(scale);
      model.x = app.screen.width / 2;
      model.y = app.screen.height / 2;
      model.anchor.set(0.5, 0.5);

      // 添加到舞台
      app.stage.addChild(model);
      console.log('Model added to stage');

      // 启用交互
      model.interactive = true;
      
      // 添加点击事件
      model.on('pointerdown', () => {
        console.log('Model clicked');
        const motionManager = model.internalModel.motionManager;
        const definitions = motionManager?.definitions;
        
        if (!definitions || !Array.isArray(definitions)) {
          console.warn('No valid motion definitions found for click animation');
          return;
        }
        
        if (definitions.length > 0) {
          const availableMotions = definitions.filter(def => def && typeof def === 'object' && def.group);
          if (availableMotions.length > 0) {
            const randomMotion = availableMotions[Math.floor(Math.random() * availableMotions.length)];
            model.motion(randomMotion.group);
          }
        }
      });

      // 自动播放 idle 动作
      const startIdleAnimation = () => {
        const motionManager = model.internalModel.motionManager;
        console.log('Motion manager:', motionManager);
        
        // 检查 definitions 是否存在且是数组
        const definitions = motionManager?.definitions;
        console.log('Motion definitions:', definitions);
        
        if (!definitions || !Array.isArray(definitions)) {
          console.warn('No valid motion definitions found');
          return;
        }
        
        // 查找 idle 动作组
        const idleMotions = definitions.filter(def => def && typeof def === 'object' && def.group === 'idle');
        console.log('Idle motions:', idleMotions);
        
        if (idleMotions.length > 0) {
          // 随机选择一个 idle 动作
          const randomIdle = idleMotions[Math.floor(Math.random() * idleMotions.length)];
          // 播放动作，并在结束时重新开始
          model.motion(randomIdle.group, undefined, () => {
            startIdleAnimation();
          });
        } else {
          // 如果没有找到 idle 动作，尝试获取第一个可用的动作组
          const firstMotion = definitions[0];
          if (firstMotion && firstMotion.group) {
            console.log('No idle motions found, playing first available motion:', firstMotion);
            model.motion(firstMotion.group);
          }
        }
      };

      // 开始播放 idle 动作
      startIdleAnimation();

      // 添加呼吸效果
      let t = 0;
      const updateModel = () => {
        t += 0.01;
        model.scale.set(scale + Math.sin(t) * scale * 0.01);
      };
      app.ticker.add(updateModel);
      
      modelLoaded.value = true;
    } catch (error) {
      console.error('Error loading model:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error:', error);
    error.value = `加载模型失败: ${error}`;
  } finally {
    loadingModel.value = false;
  }
};

// 选择CDN示例
const selectCdnExample = (url: string) => {
  cdnUrl.value = url;
};

// 选择文件夹
const selectFolder = (repo: any, folder: any) => {
  console.log('Selecting folder:', folder);
  // 如果已经选择了这个文件夹，不做任何操作
  if (selectedFolder.value === folder) return;
  
  // 取消之前选择的文件夹的展开状态
  if (selectedFolder.value) {
    selectedFolder.value.expanded = false;
  }
  
  // 设置新选择的文件夹
  selectedFolder.value = folder;
  
  // 展开仓库
  repo.expanded = true;
  
  // 确保 models 数组存在
  if (!selectedFolder.value.models) {
    selectedFolder.value.models = [];
  }
};

// 加载喜欢的模型列表
const loadLikedModels = () => {
  try {
    const likedModelsJson = localStorage.getItem('liked-live2d-models');
    console.log('从本地存储加载喜欢的模型列表:', likedModelsJson);
    
    if (likedModelsJson) {
      likedModels.value = JSON.parse(likedModelsJson);
      console.log(`加载了 ${likedModels.value.length} 个喜欢的模型:`, likedModels.value);
    } else {
      likedModels.value = [];
      console.log('没有找到喜欢的模型列表');
    }
  } catch (error) {
    console.error('加载喜欢的模型列表失败:', error);
    likedModels.value = [];
  }
};

// 监听本地存储变化
const setupStorageListener = () => {
  window.addEventListener('storage', (event) => {
    if (event.key === 'liked-live2d-models') {
      console.log('检测到喜欢的模型列表变化，重新加载');
      loadLikedModels();
      
      // 如果当前正在查看喜欢的模型列表，则刷新显示
      if (selectedRepoName.value === 'liked-models') {
        displayLikedModels();
      }
    }
  });
};

// 显示喜欢的模型列表
const displayLikedModels = () => {
  loading.value = true;
  
  try {
    if (likedModels.value.length === 0) {
      console.log('没有喜欢的模型');
      repositories.value = [];
      loading.value = false;
      return;
    }
    
    // 创建一个虚拟文件夹来显示所有喜欢的模型
    const folder = {
      name: '喜欢的模型',
      expanded: true,
      models: likedModels.value.map(model => ({
        name: model.name || '未命名模型',
        url: model.url,
        path: model.url, // 添加path属性，用于显示和选择
        timestamp: model.timestamp
      }))
    };
    
    // 创建一个虚拟仓库来包含喜欢的模型文件夹
    const likedRepo = {
      name: '喜欢的模型',
      expanded: true,
      folders: [folder]
    };
    
    repositories.value = [likedRepo];
    
    // 自动选择文件夹
    if (repositories.value.length > 0 && repositories.value[0].folders.length > 0) {
      selectFolder(repositories.value[0], repositories.value[0].folders[0]);
    }
    
    console.log('显示喜欢的模型列表:', repositories.value);
  } catch (error) {
    console.error('显示喜欢的模型列表失败:', error);
  } finally {
    loading.value = false;
  }
};

// 获取模型显示名称
const getModelDisplayName = (model: any) => {
  if (model.name && model.name !== 'model.json' && model.name !== 'index.json') {
    return model.name;
  }
  
  // 从URL或路径中提取文件名
  const path = model.path || model.url || '';
  const urlParts = path.split('/');
  const fileName = urlParts[urlParts.length - 1];
  
  // 如果文件名是常见的模型文件名，尝试使用上一级目录名
  if (fileName === 'model.json' || fileName === 'index.json' || fileName.endsWith('.model3.json')) {
    if (urlParts.length > 1) {
      return urlParts[urlParts.length - 2] || fileName;
    }
  }
  
  return fileName;
};
</script>

<style scoped>
.live2d-model-viewer {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: rgba(0, 0, 0, 0.1);
  border-radius: 0.5rem;
  overflow: hidden;
}

.model-viewer-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.625rem;
  background-color: rgba(0, 0, 0, 0.2);
  backdrop-filter: blur(5px);
}

.model-viewer-header h3 {
  margin: 0;
  color: var(--text-color);
  font-size: 1rem;
}

.model-controls {
  display: flex;
  gap: 0.625rem;
}

.local-folder-btn {
  background-color: rgba(var(--accent-color-rgb, 52, 152, 219), 0.8);
  color: white;
  border: none;
  border-radius: 0.25rem;
  padding: 0.25rem 0.5rem;
  font-size: 0.75rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.25rem;
  transition: background-color 0.2s;
}

.local-folder-btn:hover {
  background-color: rgba(var(--accent-color-rgb, 52, 152, 219), 1);
}

.refresh-btn {
  background: none;
  border: none;
  color: var(--text-color);
  font-size: 1rem;
  cursor: pointer;
  opacity: 0.7;
  transition: opacity 0.2s;
}

.refresh-btn:hover {
  opacity: 1;
}

.close-btn {
  background-color: rgba(255, 255, 255, 0.2);
  border: none;
  border-radius: 50%;
  width: 1.5rem;
  height: 1.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-color);
  font-size: 1.125rem;
  cursor: pointer;
  transition: background-color 0.2s;
}

.close-btn:hover {
  background-color: rgba(255, 255, 255, 0.3);
}

.model-browser {
  background-color: #1e1e1e;
  color: white;
  height: 40%;
  min-height: 15rem;
  max-height: 25rem;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.model-browser-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0.75rem;
  background-color: #007acc;
  color: white;
}

.model-browser-title {
  font-weight: bold;
}

.browser-controls {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.repo-select {
  background-color: #333;
  color: white;
  border: 1px solid #555;
  border-radius: 0.25rem;
  padding: 0.25rem 0.5rem;
  font-size: 0.75rem;
  cursor: pointer;
  margin-right: 0.5rem;
}

.repo-select:focus {
  outline: none;
  border-color: #007acc;
}

.custom-repo-input-container {
  display: flex;
  align-items: center;
  margin-right: 0.5rem;
}

.custom-repo-input {
  background-color: #333;
  color: white;
  border: 1px solid #555;
  border-radius: 0.25rem;
  padding: 0.25rem 0.5rem;
  font-size: 0.75rem;
  width: 11.25rem;
}

.custom-repo-input:focus {
  outline: none;
  border-color: #007acc;
}

.load-repo-btn {
  background-color: #333;
  color: white;
  border: 1px solid #555;
  border-radius: 0.25rem;
  padding: 0.25rem 0.5rem;
  font-size: 0.75rem;
  cursor: pointer;
  margin-left: 0.25rem;
}

.load-repo-btn:hover {
  background-color: #444;
}

.cdn-btn {
  background-color: rgba(var(--accent-color-rgb, 52, 152, 219), 0.8);
  color: white;
  border: none;
  border-radius: 0.25rem;
  padding: 0.25rem 0.5rem;
  font-size: 0.75rem;
  cursor: pointer;
  transition: background-color 0.2s;
}

.cdn-btn:hover {
  background-color: rgba(var(--accent-color-rgb, 52, 152, 219), 1);
}

.refresh-icon {
  background: none;
  border: none;
  color: white;
  cursor: pointer;
  font-size: 1rem;
  width: 1.5rem;
  height: 1.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: background-color 0.2s;
}

.refresh-icon:hover {
  background-color: rgba(255, 255, 255, 0.1);
}

.model-browser-content {
  display: flex;
  flex: 1;
  overflow: hidden;
  height: calc(100% - 2.5rem);
}

.directory-tree {
  width: 40%;
  height: 100%;
  overflow-y: auto;
  border-right: 1px solid #333;
  padding: 0;
  background-color: #252526;
  scrollbar-width: thin;
  scrollbar-color: #555 #333;
}

.directory-tree::-webkit-scrollbar {
  width: 0.625rem;
}

.directory-tree::-webkit-scrollbar-track {
  background: #333;
}

.directory-tree::-webkit-scrollbar-thumb {
  background: #555;
  border-radius: 0.25rem;
}

.directory-tree::-webkit-scrollbar-thumb:hover {
  background: #777;
}

.model-files {
  width: 60%;
  height: 100%;
  overflow-y: auto;
  padding: 0;
  background-color: #1e1e1e;
  scrollbar-width: thin;
  scrollbar-color: #555 #333;
}

.model-files::-webkit-scrollbar {
  width: 0.625rem;
}

.model-files::-webkit-scrollbar-track {
  background: #333;
}

.model-files::-webkit-scrollbar-thumb {
  background: #555;
  border-radius: 0.25rem;
}

.model-files::-webkit-scrollbar-thumb:hover {
  background: #777;
}

.repo-item, .folder-item {
  margin-bottom: 0.25rem;
}

.scroll-hint {
  text-align: center;
  padding: 0.3125rem;
  background-color: rgba(0, 122, 204, 0.2);
  color: #ccc;
  font-size: 0.75rem;
  margin: 0.3125rem 0;
  border-radius: 0.25rem;
  position: sticky;
  top: 0;
  z-index: 10;
}

.scroll-hint.bottom {
  bottom: 0;
  top: auto;
  background-color: rgba(0, 122, 204, 0.1);
}

.tree-container {
  padding: 0.5rem;
  width: 100%;
  position: relative;
}

.repo-item {
  margin-bottom: 0.5rem;
  width: 100%;
  border: 1px solid #333;
  border-radius: 0.25rem;
  overflow: hidden;
}

.repo-header, .folder-header {
  display: flex;
  align-items: center;
  cursor: pointer;
  transition: background-color 0.2s;
}

.repo-header {
  padding: 0.625rem 0.75rem;
  background-color: #333;
  border-bottom: 1px solid #444;
  font-weight: bold;
}

.repo-header:hover, .folder-header:hover {
  background-color: #2a2d2e;
}

.repo-header.expanded, .folder-header.expanded {
  background-color: #37373d;
}

.folder-header {
  padding: 0.5rem 0.75rem 0.5rem 1.5rem;
  border-bottom: 1px solid #2d2d2d;
}

.toggle-icon {
  margin-right: 0.375rem;
  font-size: 0.625rem;
  width: 0.625rem;
}

.repo-name, .folder-name {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  padding-right: 0.3125rem;
}

.item-count {
  background-color: #4d4d4d;
  border-radius: 0.625rem;
  padding: 0.125rem 0.375rem;
  font-size: 0.625rem;
  margin-left: 0.5rem;
}

.repo-content {
  padding-left: 1rem;
}

.subfolder-item {
  margin-left: 0.5rem;
  border-left: 1px dotted #444;
  padding-left: 0.5rem;
}

.model-item, .model-file-item {
  padding: 0.25rem 0.5rem 0.25rem 1.5rem;
  cursor: pointer;
  transition: background-color 0.2s;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.model-item:hover, .model-file-item:hover {
  background-color: #2a2d2e;
}

.model-item.selected, .model-file-item.selected {
  background-color: #094771;
}

.folder-header.selected {
  background-color: #094771;
}

.no-folder-selected {
  padding: 1rem;
  color: #888;
  text-align: center;
}

.loading-indicator, .loading-model {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 1.25rem;
}

.loading-spinner {
  width: 1.875rem;
  height: 1.875rem;
  border: 0.1875rem solid rgba(var(--accent-color-rgb, 52, 152, 219), 0.3);
  border-radius: 50%;
  border-top-color: rgba(var(--accent-color-rgb, 52, 152, 219), 1);
  animation: spin 1s linear infinite;
  margin-bottom: 0.625rem;
}

.loading-text {
  color: var(--text-color);
  font-size: 0.875rem;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.error-message {
  padding: 1.25rem;
  text-align: center;
  color: #e74c3c;
}

.model-container {
  flex: 1;
  position: relative;
  overflow: hidden;
}

.model-placeholder {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background-color: rgba(0, 0, 0, 0.1);
}

.load-model-btn {
  background-color: rgba(var(--accent-color-rgb, 52, 152, 219), 0.8);
  color: white;
  border: none;
  border-radius: 0.25rem;
  padding: 0.625rem 1.25rem;
  font-size: 1rem;
  cursor: pointer;
  transition: background-color 0.2s;
  margin-bottom: 0.625rem;
}

.load-model-btn:hover {
  background-color: rgba(var(--accent-color-rgb, 52, 152, 219), 1);
}

.selected-model-info {
  text-align: center;
  color: var(--text-color);
  margin-top: 0.625rem;
}

.no-model-selected {
  color: var(--text-color);
  opacity: 0.7;
}

.cdn-input-container {
  padding: 0.9375rem;
  background-color: #2a2d2e;
  border-top: 1px solid #333;
  height: 100%;
  overflow-y: auto;
}

.cdn-input-header {
  font-weight: bold;
  margin-bottom: 0.9375rem;
  font-size: 1rem;
  color: #e6e6e6;
  border-bottom: 1px solid #444;
  padding-bottom: 0.5rem;
}

.cdn-input {
  width: 100%;
  padding: 0.625rem;
  margin-bottom: 0.9375rem;
  background-color: #333;
  color: white;
  border: 1px solid #444;
  border-radius: 0.25rem;
  font-size: 0.875rem;
}

.cdn-input:focus {
  outline: none;
  border-color: #007acc;
  box-shadow: 0 0 0 0.125rem rgba(0, 122, 204, 0.3);
}

.cdn-examples {
  margin-bottom: 1.25rem;
}

.example-header {
  font-weight: bold;
  margin-bottom: 0.625rem;
  color: #e6e6e6;
}

.example-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.example-btn {
  background-color: #3a3a3a;
  color: #e6e6e6;
  border: 1px solid #555;
  border-radius: 0.25rem;
  padding: 0.375rem 0.625rem;
  font-size: 0.75rem;
  cursor: pointer;
  transition: all 0.2s;
}

.example-btn:hover {
  background-color: #4a4a4a;
  border-color: #007acc;
}

.cdn-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 1.25rem;
}

.load-cdn-btn {
  background-color: #007acc;
  color: white;
  border: none;
  border-radius: 0.25rem;
  padding: 0.625rem 1.25rem;
  font-size: 0.875rem;
  cursor: pointer;
  transition: background-color 0.2s;
}

.load-cdn-btn:hover {
  background-color: #0098ff;
}

.cancel-btn {
  background-color: transparent;
  border: 1px solid #555;
  border-radius: 0.25rem;
  padding: 0.625rem 1.25rem;
  font-size: 0.875rem;
  color: #e6e6e6;
  cursor: pointer;
  transition: all 0.2s;
}

.cancel-btn:hover {
  background-color: rgba(255, 255, 255, 0.1);
  border-color: #777;
}

.model-files-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0.75rem;
  background-color: #333;
  color: white;
  border-bottom: 1px solid #444;
}

.selected-folder-name {
  font-weight: bold;
  font-size: 0.875rem;
}

.model-count {
  background-color: #4d4d4d;
  border-radius: 0.625rem;
  padding: 0.125rem 0.375rem;
  font-size: 0.625rem;
}

.model-files-list {
  max-height: none;
  overflow-y: auto;
  padding: 0;
}

.model-file-item {
  padding: 0.5rem 0.75rem;
  cursor: pointer;
  transition: background-color 0.2s;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  border-bottom: 1px solid #333;
}

.model-file-item:hover {
  background-color: #2a2d2e;
}

.model-file-item.selected {
  background-color: #094771;
}

.model-actions {
  padding: 0.625rem;
  display: flex;
  justify-content: center;
  border-top: 1px solid #444;
  background-color: #2a2d2e;
  position: sticky;
  bottom: 0;
  z-index: 1;
}

.set-default-btn {
  background-color: #007acc;
  color: white;
  border: none;
  border-radius: 0.25rem;
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
  cursor: pointer;
  transition: background-color 0.2s;
  width: 100%;
  max-width: 12.5rem;
}

.set-default-btn:hover {
  background-color: #0098ff;
}

@media (max-width: 768px) {
  .model-browser {
    height: 50%;
    max-height: 30rem;
  }
  
  .browser-controls {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .repo-select, .custom-repo-input-container {
    width: 100%;
    margin-right: 0;
    margin-bottom: 0.5rem;
  }
  
  .custom-repo-input {
    width: 100%;
  }
  
  .model-browser-content {
    flex-direction: column;
  }
  
  .directory-tree, .model-files {
    width: 100%;
    height: 50%;
  }
  
  .directory-tree {
    border-right: none;
    border-bottom: 1px solid #333;
  }
}

@media (max-height: 600px) {
  .model-browser {
    height: 50%;
    min-height: 12rem;
  }
}
</style> 