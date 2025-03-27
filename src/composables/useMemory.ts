import { ref } from 'vue';
import { Settings } from './useSettings';

export function useMemory(settings: Settings, loadSettings: () => void) {
  // 内存管理相关
  const isLowMemoryMode = ref(false);

  // 设置内存管理
  const setupMemoryManagement = () => {
    // 检查是否在Electron环境中
    if (window.electronAPI) {
      // 监听内存压力事件
      window.electronAPI.onMemoryPressure((data) => {
        console.log('Received memory pressure event:', data);
        if (data.level === 'critical') {
          enableLowMemoryMode();
        }
      });
      
      // 监听可见性变化
      window.electronAPI.onVisibilityChange((state) => {
        if (state === 'hidden') {
          // 应用不可见时释放资源
          releaseUnusedResources();
        } else if (state === 'visible') {
          // 应用可见时恢复必要资源
          restoreResources();
        }
      });
      
      // 通知主进程渲染进程已准备就绪
      window.electronAPI.sendReady();
    }
    
    // 监听页面可见性变化
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        releaseUnusedResources();
      } else if (document.visibilityState === 'visible') {
        restoreResources();
      }
    });
    
    // 监听内存不足事件
    if ('onmemorywarning' in window) {
      (window as any).addEventListener('memorywarning', () => {
        console.warn('Received memory warning');
        enableLowMemoryMode();
      });
    }
    
    // 定期检查内存使用情况
    setInterval(checkMemoryUsage, 60000); // 每分钟检查一次
  };

  // 检查内存使用情况
  const checkMemoryUsage = () => {
    if (window.performance && (window.performance as any).memory) {
      const memoryInfo = (window.performance as any).memory;
      const usedJSHeapSize = memoryInfo.usedJSHeapSize;
      const jsHeapSizeLimit = memoryInfo.jsHeapSizeLimit;
      
      // 如果使用的堆内存超过限制的70%，启用低内存模式
      if (usedJSHeapSize > jsHeapSizeLimit * 0.7) {
        console.warn(`High memory usage: ${Math.round(usedJSHeapSize / jsHeapSizeLimit * 100)}%`);
        enableLowMemoryMode();
      } else if (isLowMemoryMode.value && usedJSHeapSize < jsHeapSizeLimit * 0.5) {
        // 如果内存使用率降至50%以下，可以禁用低内存模式
        disableLowMemoryMode();
      }
    }
  };

  // 启用低内存模式
  const enableLowMemoryMode = () => {
    if (isLowMemoryMode.value) return;
    
    console.log('Enabling low memory mode');
    isLowMemoryMode.value = true;
    
    // 通知主进程
    if (window.electronAPI) {
      window.electronAPI.setLowMemoryMode(true);
    }
    
    // 执行内存优化措施
    // 1. 减少背景图片更新频率
    if (settings.backgroundInterval < 30) {
      settings.backgroundInterval = 30;
    }
    
    // 2. 释放不必要的资源
    releaseUnusedResources();
    
    // 3. 清除缓存的大型对象
    clearImageCache();
  };

  // 禁用低内存模式
  const disableLowMemoryMode = () => {
    if (!isLowMemoryMode.value) return;
    
    console.log('Disabling low memory mode');
    isLowMemoryMode.value = false;
    
    // 通知主进程
    if (window.electronAPI) {
      window.electronAPI.setLowMemoryMode(false);
    }
    
    // 恢复正常设置
    loadSettings();
  };

  // 释放未使用的资源
  const releaseUnusedResources = () => {
    console.log('Releasing unused resources');
    
    // 清除不必要的缓存
    clearImageCache();
    
    // 请求垃圾回收
    if (window.electronAPI) {
      window.electronAPI.requestGC();
    }
  };

  // 恢复资源
  const restoreResources = () => {
    console.log('Restoring resources');
  };

  // 清除图片缓存
  const clearImageCache = () => {
    // 这里可以实现清除应用中缓存的图片资源
    console.log('Clearing image cache');
    
    // 示例：如果有图片缓存对象，可以清空它
    // imageCache = {};
  };

  return {
    isLowMemoryMode,
    setupMemoryManagement,
    checkMemoryUsage,
    enableLowMemoryMode,
    disableLowMemoryMode,
    releaseUnusedResources,
    restoreResources,
    clearImageCache
  };
}

// 声明全局类型
declare global {
  interface Window {
    electronAPI?: {
      sendReady: () => void;
      requestGC: () => void;
      setLowMemoryMode: (enabled: boolean) => void;
      onMemoryPressure: (callback: (data: any) => void) => void;
      onVisibilityChange: (callback: (state: string) => void) => void;
      getSystemInfo: () => any;
    };
  }
} 