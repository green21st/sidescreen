import { computed, reactive } from 'vue';

// 主题定义
export const themes = {
  dark: {
    containerColor: '#2c3e50',
    widgetColor: '#34495e',
    headerColor: '#1a2530',
    textColor: '#ffffff',
    accentColor: '#3498db'
  },
  light: {
    containerColor: '#ecf0f1',
    widgetColor: '#ffffff',
    headerColor: '#bdc3c7',
    textColor: '#000000',
    accentColor: '#3498db'
  },
  nord: {
    containerColor: '#2e3440',
    widgetColor: '#3b4252',
    headerColor: '#242933',
    textColor: '#e5e9f0',
    accentColor: '#88c0d0'
  },
  solarized: {
    containerColor: '#002b36',
    widgetColor: '#073642',
    headerColor: '#001e26',
    textColor: '#839496',
    accentColor: '#2aa198'
  },
  dracula: {
    containerColor: '#282a36',
    widgetColor: '#44475a',
    headerColor: '#1d1e26',
    textColor: '#f8f8f2',
    accentColor: '#bd93f9'
  },
  github: {
    containerColor: '#ffffff',
    widgetColor: '#f6f8fa',
    headerColor: '#24292e',
    textColor: '#000000',
    accentColor: '#0366d6'
  }
};

export type ThemeName = keyof typeof themes;

export interface ThemeSettings {
  theme: ThemeName;
}

// 辅助函数：将十六进制颜色转换为RGB格式
export const hexToRgb = (hex: string): string | null => {
  // 移除可能的#前缀
  hex = hex.replace(/^#/, '');
  
  // 解析十六进制颜色
  const bigint = parseInt(hex, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  
  return `${r}, ${g}, ${b}`;
};

export function useTheme(themeSettings: { theme: ThemeName }) {
  // 主题类名
  const themeClass = computed(() => {
    return `theme-${themeSettings.theme}`;
  });

  // 应用主题
  const applyTheme = () => {
    const theme = themes[themeSettings.theme] || themes.dark;
    
    // 设置CSS变量
    document.documentElement.style.setProperty('--container-color', theme.containerColor);
    document.documentElement.style.setProperty('--widget-color', theme.widgetColor);
    document.documentElement.style.setProperty('--header-color', theme.headerColor);
    document.documentElement.style.setProperty('--text-color', theme.textColor);
    document.documentElement.style.setProperty('--accent-color', theme.accentColor);
    
    // 添加RGB格式的accent-color变量，用于支持透明度设置
    const accentColorRgb = hexToRgb(theme.accentColor);
    if (accentColorRgb) {
      document.documentElement.style.setProperty('--accent-color-rgb', accentColorRgb);
    }
    
    // 强制重新应用样式
    document.body.classList.remove('theme-dark', 'theme-light', 'theme-nord', 'theme-solarized', 'theme-dracula', 'theme-github');
    document.body.classList.add(`theme-${themeSettings.theme}`);
    
    console.log(`Applied theme: ${themeSettings.theme}`);
  };

  return {
    themeClass,
    applyTheme
  };
} 