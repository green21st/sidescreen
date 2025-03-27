import { reactive, ref } from 'vue';
import { ThemeName } from './useTheme';

export interface Settings {
  location: string;
  weatherApiKey: string;
  backgroundInterval: number;
  backgroundImages: string[];
  theme: ThemeName;
  iflytekAppId?: string;
  iflytekApiKey?: string;
  iflytekApiSecret?: string;
  speechEnabled?: boolean;
  quotes?: string[];
}

// 默认设置
export const defaultSettings: Settings = {
  location: '北京',
  weatherApiKey: '1234567890abcdef1234567890abcdef',
  backgroundInterval: 10,
  backgroundImages: [],
  theme: 'dark',
  iflytekAppId: '',
  iflytekApiKey: '',
  iflytekApiSecret: '',
  speechEnabled: false,
  quotes: []
};

export function useSettings() {
  // 设置
  const showSettings = ref(false);
  const settings = reactive<Settings>({
    ...defaultSettings
  });

  // 方法
  const toggleSettings = () => {
    showSettings.value = !showSettings.value;
  };

  const saveSettingsToLocalStorage = () => {
    try {
      // 创建一个副本以避免循环引用问题
      const settingsToSave = {
        location: settings.location,
        weatherApiKey: settings.weatherApiKey,
        backgroundInterval: settings.backgroundInterval,
        backgroundImages: settings.backgroundImages,
        theme: settings.theme,
        iflytekAppId: settings.iflytekAppId,
        iflytekApiKey: settings.iflytekApiKey,
        iflytekApiSecret: settings.iflytekApiSecret,
        speechEnabled: settings.speechEnabled,
        quotes: settings.quotes
      };
      
      const settingsJson = JSON.stringify(settingsToSave);
      localStorage.setItem('dashboard-settings', settingsJson);
      
      console.log(`Settings saved, background images count: ${settings.backgroundImages.length}, theme: ${settings.theme}, speechEnabled: ${settings.speechEnabled}, quotes count: ${settings.quotes?.length || 0}`);
      
      // 如果启用了语音识别，保存配置到本地存储
      if (settings.speechEnabled && settings.iflytekAppId && settings.iflytekApiKey) {
        try {
          // 保存到本地存储，供语音识别服务使用
          const speechConfig = {
            appId: settings.iflytekAppId,
            apiKey: settings.iflytekApiKey,
            apiSecret: settings.iflytekApiSecret,
            enabled: settings.speechEnabled
          };
          localStorage.setItem('speechConfig', JSON.stringify(speechConfig));
        } catch (error) {
          console.error('Failed to save speech config:', error);
        }
      }
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  };

  const updateSettings = (newSettings: Partial<Settings>) => {
    console.log('Updating settings:', JSON.stringify({
      location: newSettings.location,
      backgroundInterval: newSettings.backgroundInterval,
      hasBackgroundImages: newSettings.backgroundImages && newSettings.backgroundImages.length > 0,
      backgroundImagesCount: newSettings.backgroundImages ? newSettings.backgroundImages.length : 0,
      theme: newSettings.theme,
      speechEnabled: newSettings.speechEnabled,
      quotesCount: newSettings.quotes ? newSettings.quotes.length : 0
    }));
    
    // 确保设置对象的结构正确
    const updatedSettings = {
      ...newSettings,
      backgroundImages: newSettings.backgroundImages || [],
      backgroundInterval: newSettings.backgroundInterval || 10,
      theme: newSettings.theme || 'dark',
      quotes: newSettings.quotes || []
    };
    
    Object.assign(settings, updatedSettings);
    
    // 保存设置到本地存储
    saveSettingsToLocalStorage();
    
    // 关闭设置面板
    showSettings.value = false;
    
    return settings;
  };

  const resetSettings = () => {
    // 重置所有设置到默认值
    Object.assign(settings, defaultSettings);
    
    // 清除本地存储
    localStorage.removeItem('dashboard-settings');
    localStorage.removeItem('speechConfig');
    
    console.log('Settings reset to defaults');
    
    return settings;
  };

  const loadSettingsFromLocalStorage = () => {
    // 加载设置
    const savedSettings = localStorage.getItem('dashboard-settings');
    if (savedSettings) {
      try {
        const parsedSettings = JSON.parse(savedSettings);
        
        // 确保设置对象的结构正确
        const validatedSettings = {
          ...parsedSettings,
          backgroundImages: parsedSettings.backgroundImages || [],
          backgroundInterval: parsedSettings.backgroundInterval || 10,
          theme: parsedSettings.theme || 'dark',
          iflytekAppId: parsedSettings.iflytekAppId || '',
          iflytekApiKey: parsedSettings.iflytekApiKey || '',
          iflytekApiSecret: parsedSettings.iflytekApiSecret || '',
          speechEnabled: parsedSettings.speechEnabled || false,
          quotes: Array.isArray(parsedSettings.quotes) ? parsedSettings.quotes : []
        };
        
        // 检查背景图片数据是否存在且有效
        if (validatedSettings.backgroundImages && validatedSettings.backgroundImages.length > 0) {
          console.log(`Restored ${validatedSettings.backgroundImages.length} background images from storage`);
          // 检查第一张图片的格式，确认数据是否完整
          const firstImage = validatedSettings.backgroundImages[0];
          if (firstImage && (firstImage.startsWith('data:image') || firstImage.startsWith('/'))) {
            console.log('Background image data format is correct');
          } else {
            console.warn('Background image data format may be incorrect:', firstImage ? firstImage.substring(0, 20) + '...' : 'undefined');
          }
        }
        
        // 检查名人名言数据是否存在且有效
        if (validatedSettings.quotes && validatedSettings.quotes.length > 0) {
          console.log(`Restored ${validatedSettings.quotes.length} quotes from storage`);
          // 检查第一条名言的格式
          const firstQuote = validatedSettings.quotes[0];
          if (typeof firstQuote === 'string' && firstQuote.length > 0) {
            console.log('Quotes data format is correct');
          } else {
            console.warn('Quotes data format may be incorrect');
            validatedSettings.quotes = [];
          }
        }
        
        // 将验证后的设置应用到当前设置对象
        Object.assign(settings, validatedSettings);
        
        console.log('Settings loaded:', JSON.stringify({
          location: settings.location,
          backgroundInterval: settings.backgroundInterval,
          hasBackgroundImages: settings.backgroundImages && settings.backgroundImages.length > 0,
          backgroundImagesCount: settings.backgroundImages ? settings.backgroundImages.length : 0,
          theme: settings.theme,
          speechEnabled: settings.speechEnabled,
          quotesCount: settings.quotes ? settings.quotes.length : 0
        }));
        
        // 如果启用了语音识别，保存配置到本地存储
        if (settings.speechEnabled && settings.iflytekAppId && settings.iflytekApiKey) {
          try {
            // 保存到本地存储，供语音识别服务使用
            const speechConfig = {
              appId: settings.iflytekAppId,
              apiKey: settings.iflytekApiKey,
              apiSecret: settings.iflytekApiSecret,
              enabled: settings.speechEnabled
            };
            localStorage.setItem('speechConfig', JSON.stringify(speechConfig));
          } catch (error) {
            console.error('Failed to save speech config:', error);
          }
        }
        
        return true;
      } catch (error) {
        console.error('Failed to parse saved settings:', error);
        return false;
      }
    }
    return false;
  };

  return {
    settings,
    showSettings,
    toggleSettings,
    updateSettings,
    saveSettingsToLocalStorage,
    loadSettingsFromLocalStorage,
    resetSettings
  };
} 