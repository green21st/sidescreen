<template>
  <div class="settings-overlay" @click.self="$emit('close')">
    <div class="settings-panel">
      <div class="settings-header">
        <h2>设置</h2>
        <button @click="$emit('close')" class="close-btn">&times;</button>
      </div>
      
      <div class="settings-content">
        <div class="settings-group">
          <h3>常规设置</h3>
          
          <div class="settings-item">
            <label for="location">位置</label>
            <input 
              id="location" 
              v-model="localSettings.location" 
              placeholder="例如：北京"
            />
          </div>
          
          <div class="settings-item">
            <label for="weatherApiKey">天气 API 密钥</label>
            <input 
              id="weatherApiKey" 
              v-model="localSettings.weatherApiKey" 
              placeholder="和风天气 API 密钥"
            />
            <div class="settings-help">
              从 <a href="https://dev.qweather.com/" target="_blank">和风天气开发平台</a> 获取免费 API 密钥
            </div>
          </div>
        </div>
        
        <!-- 语音识别设置 -->
        <div class="settings-group">
          <h3>语音识别</h3>
          
          <div class="settings-item">
            <label for="iflytekAppId">讯飞 App ID</label>
            <input 
              id="iflytekAppId" 
              v-model="localSettings.iflytekAppId" 
              placeholder="科大讯飞 App ID"
            />
          </div>
          
          <div class="settings-item">
            <label for="iflytekApiKey">讯飞 API Key</label>
            <input 
              id="iflytekApiKey" 
              v-model="localSettings.iflytekApiKey" 
              placeholder="科大讯飞 API Key"
            />
          </div>
          
          <div class="settings-item">
            <label for="iflytekApiSecret">讯飞 API Secret</label>
            <input 
              id="iflytekApiSecret" 
              v-model="localSettings.iflytekApiSecret" 
              placeholder="科大讯飞 API Secret"
            />
          </div>
          
          <div class="settings-item checkbox">
            <input 
              type="checkbox" 
              id="speechEnabled" 
              v-model="localSettings.speechEnabled"
            />
            <label for="speechEnabled">启用语音识别</label>
          </div>
          
          <div class="settings-help">
            从 <a href="https://www.xfyun.cn/" target="_blank">科大讯飞开放平台</a> 申请语音识别服务，获取相关密钥
          </div>
        </div>
        
        <!-- 名人名言设置 -->
        <div class="settings-group">
          <h3>名人名言</h3>
          
          <div class="settings-item">
            <label>名人名言文件</label>
            <div class="file-upload-container">
              <button @click="handleQuotesFileSelect" class="file-select-btn">选择名言文件</button>
              <span v-if="quotesFileName" class="selected-files-info">
                已选择: {{ quotesFileName }}
              </span>
              <span v-else class="selected-files-info">
                未选择文件
              </span>
            </div>
            <div class="settings-help">
              选择包含名人名言的文本文件，每行一句名言
            </div>
          </div>
        </div>
        
        <div class="settings-group">
          <h3>外观</h3>
          
          <div class="settings-item">
            <label>主题</label>
            <div class="theme-options">
              <div 
                v-for="theme in themes" 
                :key="theme.id"
                class="theme-option"
                :class="{ 'selected': localSettings.theme === theme.id }"
                :style="{ 
                  backgroundColor: theme.containerColor,
                  borderColor: theme.accentColor
                }"
                @click="selectTheme(theme.id)"
              >
                <div class="theme-preview-header" :style="{ backgroundColor: theme.headerColor }"></div>
                <div class="theme-preview-content" :style="{ backgroundColor: theme.containerColor }">
                  <div class="theme-preview-widget" :style="{ backgroundColor: theme.widgetColor }"></div>
                  <div class="theme-preview-widget" :style="{ backgroundColor: theme.widgetColor }"></div>
                </div>
                <div class="theme-name" :style="{ color: theme.textColor, backgroundColor: theme.headerColor }">
                  {{ theme.name }}
                </div>
              </div>
            </div>
          </div>
          
          <div class="settings-item">
            <label>背景图片</label>
            <div class="file-upload-container">
              <button @click="triggerFileInput" class="file-select-btn">选择背景图片</button>
              <input 
                type="file" 
                ref="fileInput" 
                @change="handleFileSelect" 
                multiple 
                accept="image/*" 
                style="display: none"
              />
              <span v-if="selectedFiles.length > 0" class="selected-files-info">
                已选择 {{ selectedFiles.length }} 张图片
              </span>
              <span v-else class="selected-files-info">
                未选择图片
              </span>
            </div>
            <div class="settings-help">
              选择多张图片作为背景，系统将随机显示
            </div>
          </div>
          
          <div class="settings-item">
            <label>背景更新频率（分钟）</label>
            <input 
              type="number" 
              v-model.number="localSettings.backgroundInterval" 
              min="1" 
              max="60"
            />
          </div>
        </div>
      </div>
      
      <div class="settings-footer">
        <div class="settings-actions">
          <button @click="resetSettings" class="reset-btn">重置设置</button>
          <button @click="saveSettings" class="save-btn">保存设置</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { defaultSettings } from '../composables/useSettings';

// 主题定义
const themes = [
  {
    id: 'dark',
    name: '深色',
    containerColor: '#2c3e50',
    widgetColor: '#34495e',
    headerColor: '#1a2530',
    textColor: '#ffffff',
    accentColor: '#3498db'
  },
  {
    id: 'light',
    name: '浅色',
    containerColor: '#ecf0f1',
    widgetColor: '#ffffff',
    headerColor: '#bdc3c7',
    textColor: '#2c3e50',
    accentColor: '#3498db'
  },
  {
    id: 'nord',
    name: 'Nord',
    containerColor: '#2e3440',
    widgetColor: '#3b4252',
    headerColor: '#242933',
    textColor: '#e5e9f0',
    accentColor: '#88c0d0'
  },
  {
    id: 'solarized',
    name: 'Solarized',
    containerColor: '#002b36',
    widgetColor: '#073642',
    headerColor: '#001e26',
    textColor: '#839496',
    accentColor: '#2aa198'
  },
  {
    id: 'dracula',
    name: 'Dracula',
    containerColor: '#282a36',
    widgetColor: '#44475a',
    headerColor: '#1d1e26',
    textColor: '#f8f8f2',
    accentColor: '#bd93f9'
  },
  {
    id: 'github',
    name: 'GitHub',
    containerColor: '#ffffff',
    widgetColor: '#f6f8fa',
    headerColor: '#24292e',
    textColor: '#24292e',
    accentColor: '#0366d6'
  }
];

// 图片压缩函数
const compressImage = (dataUrl: string, maxWidth = 1920, maxHeight = 1080, quality = 0.7): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      // 计算新的尺寸
      let width = img.width;
      let height = img.height;
      
      if (width > maxWidth) {
        height = Math.round(height * (maxWidth / width));
        width = maxWidth;
      }
      
      if (height > maxHeight) {
        width = Math.round(width * (maxHeight / height));
        height = maxHeight;
      }
      
      // 创建canvas并绘制压缩后的图片
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('无法创建canvas上下文'));
        return;
      }
      
      ctx.drawImage(img, 0, 0, width, height);
      
      // 转换为dataURL
      const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
      resolve(compressedDataUrl);
    };
    
    img.onerror = () => reject(new Error('图片加载失败'));
    img.src = dataUrl;
  });
};

const props = defineProps<{
  settings: {
    location: string;
    weatherApiKey: string;
    backgroundInterval: number;
    backgroundImages?: string[];
    theme?: string;
    iflytekAppId?: string;
    iflytekApiKey?: string;
    iflytekApiSecret?: string;
    speechEnabled?: boolean;
    quotes?: string[];
  }
}>();

const emit = defineEmits<{
  (e: 'update-settings', settings: any): void;
  (e: 'close'): void;
}>();

const fileInput = ref<HTMLInputElement | null>(null);
const quotesFileInput = ref<HTMLInputElement | null>(null);
const selectedFiles = ref<File[]>([]);
const quotesFileName = ref<string>('');
const imagePreviewUrls = ref<string[]>([]);

const localSettings = reactive({
  location: props.settings.location || '',
  weatherApiKey: props.settings.weatherApiKey || '',
  backgroundInterval: props.settings.backgroundInterval || 10,
  backgroundImages: props.settings.backgroundImages || [],
  theme: props.settings.theme || 'dark',
  iflytekAppId: props.settings.iflytekAppId || '',
  iflytekApiKey: props.settings.iflytekApiKey || '',
  iflytekApiSecret: props.settings.iflytekApiSecret || '',
  speechEnabled: props.settings.speechEnabled || false,
  quotes: props.settings.quotes || []
});

const selectTheme = (themeId: string) => {
  localSettings.theme = themeId;
};

const triggerFileInput = () => {
  fileInput.value?.click();
};

const handleFileSelect = async (event: Event) => {
  const input = event.target as HTMLInputElement;
  if (!input.files || input.files.length === 0) return;
  
  selectedFiles.value = Array.from(input.files);
  console.log(`已选择 ${selectedFiles.value.length} 张图片`);
  
  // 清除之前的预览
  imagePreviewUrls.value.forEach(url => {
    if (url.startsWith('blob:')) {
      URL.revokeObjectURL(url);
    }
  });
  imagePreviewUrls.value = [];
  
  // 读取文件并转换为base64
  try {
    // 显示处理中的提示
    const processingMessage = document.createElement('div');
    processingMessage.textContent = '正在处理图片，请稍候...';
    processingMessage.style.color = 'white';
    processingMessage.style.padding = '10px';
    processingMessage.style.textAlign = 'center';
    document.querySelector('.file-upload-container')?.appendChild(processingMessage);
    
    const imagePromises = Array.from(input.files).map(file => {
      return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
          if (e.target?.result) {
            try {
              // 压缩图片
              const compressedImage = await compressImage(e.target.result as string);
              resolve(compressedImage);
            } catch (error) {
              console.error('图片压缩失败:', error);
              // 如果压缩失败，使用原始图片
              resolve(e.target.result as string);
            }
          } else {
            reject(new Error('读取文件失败'));
          }
        };
        reader.onerror = () => reject(new Error('读取文件失败'));
        reader.readAsDataURL(file);
      });
    });
    
    const images = await Promise.all(imagePromises);
    console.log(`成功读取并处理 ${images.length} 张图片`);
    
    // 检查图片大小
    let totalSize = 0;
    images.forEach(img => {
      totalSize += img.length;
    });
    console.log(`图片总大小: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
    
    // 如果总大小超过4MB，可能会超出localStorage限制
    if (totalSize > 4 * 1024 * 1024) {
      console.warn('警告: 图片总大小超过4MB，可能会超出localStorage限制');
      alert('警告: 选择的图片总大小较大，可能会导致保存失败。建议选择更少或更小的图片。');
    }
    
    localSettings.backgroundImages = images;
    
    // 移除处理中的提示
    processingMessage.remove();
  } catch (error) {
    console.error('处理图片文件失败:', error);
    alert('处理图片失败，请重试或选择其他图片。');
  }
};

const handleQuotesFileSelect = () => {
  // 创建一个隐藏的文件输入元素
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.txt';
  
  input.onchange = async (event) => {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    
    try {
      quotesFileName.value = file.name;
      
      // 使用 FileReader 读取文件内容
      const text = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.onerror = (e) => reject(new Error('读取文件失败'));
        reader.readAsText(file, 'UTF-8');
      });
      
      // 将文本按行分割，过滤掉空行
      const quotes = text.split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);
      
      if (quotes.length === 0) {
        alert('文件内容为空或格式不正确！');
        return;
      }
      
      localSettings.quotes = quotes;
      console.log(`成功读取 ${quotes.length} 条名言`);
    } catch (error) {
      console.error('读取文件失败:', error);
      alert('读取文件失败，请确保文件格式正确。');
    }
  };
  
  // 触发文件选择对话框
  input.click();
};

const saveSettings = () => {
  console.log('保存设置:', {
    location: localSettings.location,
    backgroundInterval: localSettings.backgroundInterval,
    backgroundImagesCount: localSettings.backgroundImages.length,
    theme: localSettings.theme,
    speechEnabled: localSettings.speechEnabled,
    quotesCount: localSettings.quotes.length
  });
  
  emit('update-settings', { 
    location: localSettings.location,
    weatherApiKey: localSettings.weatherApiKey,
    backgroundInterval: localSettings.backgroundInterval,
    backgroundImages: localSettings.backgroundImages,
    theme: localSettings.theme,
    iflytekAppId: localSettings.iflytekAppId,
    iflytekApiKey: localSettings.iflytekApiKey,
    iflytekApiSecret: localSettings.iflytekApiSecret,
    speechEnabled: localSettings.speechEnabled,
    quotes: localSettings.quotes
  });
  
  emit('close');
};

const resetSettings = () => {
  if (confirm('确定要重置所有设置吗？这将清除所有已保存的数据，包括背景图片、名人名言等。')) {
    // 重置本地设置状态
    Object.assign(localSettings, {
      location: defaultSettings.location,
      weatherApiKey: defaultSettings.weatherApiKey,
      backgroundInterval: defaultSettings.backgroundInterval,
      backgroundImages: [],
      theme: defaultSettings.theme,
      iflytekAppId: '',
      iflytekApiKey: '',
      iflytekApiSecret: '',
      speechEnabled: false,
      quotes: []
    });
    
    // 重置文件相关状态
    selectedFiles.value = [];
    quotesFileName.value = '';
    imagePreviewUrls.value = [];
    
    // 清除 localStorage 中的所有数据
    localStorage.removeItem('dashboard-settings');
    localStorage.removeItem('baiduSpeechConfig');
    
    console.log('已重置所有设置到默认状态');
    
    // 发送更新事件
    emit('update-settings', { ...localSettings });
    
    // 关闭设置面板
    emit('close');
  }
};

onMounted(() => {
  // 复制设置到本地状态
  if (props.settings) {
    localSettings.location = props.settings.location || '';
    localSettings.weatherApiKey = props.settings.weatherApiKey || '';
    localSettings.backgroundInterval = props.settings.backgroundInterval || 10;
    localSettings.backgroundImages = props.settings.backgroundImages || [];
    localSettings.theme = props.settings.theme || 'dark';
    localSettings.iflytekAppId = props.settings.iflytekAppId || '';
    localSettings.iflytekApiKey = props.settings.iflytekApiKey || '';
    localSettings.iflytekApiSecret = props.settings.iflytekApiSecret || '';
    localSettings.speechEnabled = props.settings.speechEnabled || false;
    localSettings.quotes = props.settings.quotes || [];
    
    // 如果有已保存的背景图片，显示数量
    if (localSettings.backgroundImages && localSettings.backgroundImages.length > 0) {
      console.log(`已加载 ${localSettings.backgroundImages.length} 张背景图片`);
      selectedFiles.value = new Array(localSettings.backgroundImages.length);
    }
    
    // 如果有已保存的名言，显示一个默认的文件名
    if (localSettings.quotes.length > 0) {
      quotesFileName.value = '已保存的名言文件';
    }
  }
});
</script>

<style scoped>
.settings-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.settings-panel {
  width: 500px;
  max-width: 90%;
  background-color: var(--container-color);
  border-radius: 10px;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.5);
  display: flex;
  flex-direction: column;
  max-height: 90vh;
  color: var(--text-color);
}

.settings-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 20px;
  background-color: var(--header-color);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px 10px 0 0;
}

.settings-header h2 {
  margin: 0;
  color: var(--text-color);
}

.close-btn {
  background: none;
  border: none;
  color: var(--text-color);
  font-size: 1.5rem;
  cursor: pointer;
}

.settings-content {
  padding: 20px;
  overflow-y: auto;
}

.settings-group {
  margin-bottom: 20px;
}

.settings-group h3 {
  margin-top: 0;
  margin-bottom: 15px;
  border-bottom: 1px solid var(--accent-color);
  padding-bottom: 5px;
  color: var(--text-color);
}

.settings-item {
  margin-bottom: 15px;
}

.settings-item label {
  display: block;
  margin-bottom: 5px;
  font-weight: bold;
  color: var(--text-color);
}

.settings-item input,
.settings-item select {
  width: 100%;
  padding: 8px;
  background-color: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 4px;
  color: var(--text-color);
}

.settings-help {
  font-size: 0.8rem;
  margin-top: 5px;
  color: var(--text-color);
  opacity: 0.7;
}

.settings-help a {
  color: var(--accent-color);
}

.settings-footer {
  padding: 15px 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  text-align: right;
  background-color: var(--header-color);
  border-radius: 0 0 10px 10px;
}

.settings-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.reset-btn {
  padding: 8px 20px;
  background-color: #e74c3c;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: filter 0.2s;
}

.reset-btn:hover {
  filter: brightness(1.1);
}

.save-btn {
  padding: 8px 20px;
  background-color: var(--accent-color);
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.save-btn:hover {
  filter: brightness(1.1);
}

.file-upload-container {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}

.file-select-btn {
  padding: 8px 16px;
  background-color: var(--accent-color);
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.file-select-btn:hover {
  filter: brightness(1.1);
}

.selected-files-info {
  color: var(--text-color);
  opacity: 0.7;
  font-size: 0.9rem;
}

.theme-options {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 15px;
  margin-bottom: 15px;
}

.theme-option {
  border: 2px solid transparent;
  border-radius: 6px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  flex-direction: column;
  height: 100px;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
}

.theme-option:hover {
  transform: translateY(-3px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
}

.theme-option.selected {
  border-width: 2px;
  transform: scale(1.05);
}

.theme-preview-header {
  height: 15px;
}

.theme-preview-content {
  flex: 1;
  padding: 5px;
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.theme-preview-widget {
  height: 15px;
  border-radius: 3px;
}

.theme-name {
  text-align: center;
  padding: 5px;
  font-size: 0.8rem;
  font-weight: bold;
}

.checkbox {
  display: flex;
  align-items: center;
  margin-bottom: 15px;
}

.checkbox input[type="checkbox"] {
  margin-right: 10px;
}

.checkbox label {
  margin-bottom: 0;
}
</style> 