export function useWindow() {
  // 关闭窗口函数
  const closeWindow = () => {
    try {
      // 判断是否在开发环境
      const isDev = process.env.NODE_ENV === 'development';
      
      if (isDev) {
        console.log('Development mode, close window not supported');
        // 在开发模式下，可以尝试使用window.close()，但可能会被浏览器阻止
        window.close();
      } else {
        // 在生产环境中，使用IPC通信关闭窗口
        if (window.electronAPI) {
          window.electronAPI.closeWindow();
        } else {
          console.error('Electron API not available');
        }
      }
    } catch (error) {
      console.error('Error closing window:', error);
    }
  };

  return {
    closeWindow
  };
} 