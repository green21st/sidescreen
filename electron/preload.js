// 预加载脚本，用于处理主进程和渲染进程之间的通信
const { ipcRenderer, contextBridge } = require('electron');

// 定义暴露给渲染进程的API
const electronAPI = {
  // 通知主进程渲染进程已准备就绪
  sendReady: () => {
    ipcRenderer.send('renderer-ready');
  },
  
  // 请求主进程执行垃圾回收
  requestGC: () => {
    ipcRenderer.send('request-gc');
  },
  
  // 设置低内存模式
  setLowMemoryMode: (enabled) => {
    ipcRenderer.send('low-memory-mode', enabled);
  },
  
  // 监听内存压力事件
  onMemoryPressure: (callback) => {
    ipcRenderer.on('memory-pressure', (event, data) => {
      callback(data);
    });
  },
  
  // 监听可见性变化事件
  onVisibilityChange: (callback) => {
    ipcRenderer.on('visibility-change', (event, state) => {
      callback(state);
    });
  },
  
  // 获取系统信息
  getSystemInfo: () => {
    return {
      platform: process.platform,
      arch: process.arch,
      version: process.version,
      versions: process.versions,
      memoryUsage: process.memoryUsage()
    };
  },
  
  // 请求麦克风权限
  requestMicrophonePermission: () => {
    return new Promise((resolve, reject) => {
      ipcRenderer.invoke('request-microphone-permission')
        .then(result => resolve(result))
        .catch(error => reject(error));
    });
  },
  
  // 检查麦克风权限状态
  checkMicrophonePermission: () => {
    return new Promise((resolve, reject) => {
      ipcRenderer.invoke('check-microphone-permission')
        .then(result => resolve(result))
        .catch(error => reject(error));
    });
  },
  
  // 测试语音识别可用性
  testSpeechRecognition: () => {
    return new Promise((resolve, reject) => {
      ipcRenderer.invoke('test-speech-recognition')
        .then(result => resolve(result))
        .catch(error => reject(error));
    });
  },
  
  // 发送调试日志到主进程
  logDebug: (message) => {
    ipcRenderer.send('log-debug', message);
  },
  
  // 打开目录选择对话框
  openDirectory: () => {
    return ipcRenderer.invoke('open-directory');
  },
  
  // 读取目录内容
  readDirectory: (folderPath) => {
    return ipcRenderer.invoke('read-directory', folderPath);
  },

  // 关闭窗口
  closeWindow: () => {
    ipcRenderer.send('close-window');
  },

  // 读取文本文件
  readTextFile: (filePath) => {
    return ipcRenderer.invoke('read-text-file', filePath);
  },

  // 选择文件
  selectFile: () => {
    return ipcRenderer.invoke('select-file');
  }
};

// 使用contextBridge安全地暴露API给渲染进程
contextBridge.exposeInMainWorld('electronAPI', electronAPI);

// 在DOM加载完成后通知主进程
window.addEventListener('DOMContentLoaded', () => {
  // 通知主进程渲染进程已准备就绪
  ipcRenderer.send('renderer-ready');
  
  // 添加内存管理功能
  setupMemoryManagement();
  
  // 设置语音识别支持
  setupSpeechRecognition();
  
  // 记录日志
  ipcRenderer.send('log-debug', 'DOM content loaded, preload script executed');
});

// 设置语音识别支持
function setupSpeechRecognition() {
  try {
    ipcRenderer.send('log-debug', 'Setting up speech recognition support');
    
    // 确保 window.navigator.mediaDevices 存在
    if (!navigator.mediaDevices) {
      ipcRenderer.send('log-debug', 'mediaDevices not found, creating polyfill');
      navigator.mediaDevices = {};
    }
    
    // 如果 getUserMedia 不存在，创建一个 polyfill
    if (!navigator.mediaDevices.getUserMedia) {
      ipcRenderer.send('log-debug', 'getUserMedia not found, creating polyfill');
      navigator.mediaDevices.getUserMedia = function(constraints) {
        // 首先尝试使用 webkitGetUserMedia
        const getUserMedia = navigator.webkitGetUserMedia || navigator.mozGetUserMedia;
        
        if (!getUserMedia) {
          ipcRenderer.send('log-debug', 'No getUserMedia implementation found');
          return Promise.reject(new Error('getUserMedia is not implemented in this browser'));
        }
        
        // 将老式的 getUserMedia 转换为 Promise
        return new Promise(function(resolve, reject) {
          getUserMedia.call(navigator, constraints, resolve, reject);
        });
      };
    }
    
    // 检查 SpeechRecognition 支持
    const hasSpeechRecognition = !!(window.SpeechRecognition || window.webkitSpeechRecognition);
    ipcRenderer.send('log-debug', `SpeechRecognition support: ${hasSpeechRecognition}`);
    
    // 如果没有原生支持，尝试添加 polyfill
    if (!hasSpeechRecognition) {
      ipcRenderer.send('log-debug', 'No native SpeechRecognition support, attempting to add polyfill');
      
      // 添加 webkitSpeechRecognition 作为 SpeechRecognition 的别名
      if (typeof window.webkitSpeechRecognition === 'function') {
        window.SpeechRecognition = window.webkitSpeechRecognition;
        ipcRenderer.send('log-debug', 'Added webkitSpeechRecognition as SpeechRecognition');
      } else {
        ipcRenderer.send('log-debug', 'Cannot add SpeechRecognition polyfill, no implementation available');
      }
    }
    
    // 尝试创建一个 SpeechRecognition 实例来测试
    try {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        const testRecognition = new SpeechRecognition();
        ipcRenderer.send('log-debug', 'Successfully created SpeechRecognition instance');
        
        // 测试属性和方法
        ipcRenderer.send('log-debug', `Recognition properties: continuous=${typeof testRecognition.continuous}, interimResults=${typeof testRecognition.interimResults}`);
        
        // 测试是否可以设置语言
        try {
          testRecognition.lang = 'zh-CN';
          ipcRenderer.send('log-debug', `Set language to zh-CN: ${testRecognition.lang === 'zh-CN' ? 'success' : 'failed'}`);
        } catch (error) {
          ipcRenderer.send('log-debug', `Error setting language: ${error.message}`);
        }
        
        // 测试事件处理器
        try {
          testRecognition.onstart = () => {};
          testRecognition.onresult = () => {};
          testRecognition.onerror = () => {};
          testRecognition.onend = () => {};
          ipcRenderer.send('log-debug', 'Successfully set event handlers');
        } catch (error) {
          ipcRenderer.send('log-debug', `Error setting event handlers: ${error.message}`);
        }
        
        // 尝试启动和停止识别
        try {
          // 只尝试启动，不实际进行识别
          // testRecognition.start();
          // setTimeout(() => {
          //   testRecognition.stop();
          // }, 100);
          ipcRenderer.send('log-debug', 'SpeechRecognition instance ready for use');
        } catch (error) {
          ipcRenderer.send('log-debug', `Error testing start/stop: ${error.message}`);
        }
      }
    } catch (error) {
      ipcRenderer.send('log-debug', `Error creating SpeechRecognition instance: ${error.message}`);
    }
    
    // 测试麦克风访问
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(stream => {
        ipcRenderer.send('log-debug', 'Microphone access test successful');
        // 停止流，我们只是为了测试
        stream.getTracks().forEach(track => track.stop());
      })
      .catch(error => {
        ipcRenderer.send('log-debug', `Microphone access test failed: ${error.message}`);
      });
      
    // 检查网络连接
    ipcRenderer.send('log-debug', `Network status: ${navigator.onLine ? 'online' : 'offline'}`);
    
    // 添加网络状态变化监听器
    window.addEventListener('online', () => {
      ipcRenderer.send('log-debug', 'Network is now online');
    });
    
    window.addEventListener('offline', () => {
      ipcRenderer.send('log-debug', 'Network is now offline');
    });
    
    // 测试语音识别可用性
    electronAPI.testSpeechRecognition()
      .then(result => {
        ipcRenderer.send('log-debug', `Speech recognition availability test: ${JSON.stringify(result)}`);
      })
      .catch(error => {
        ipcRenderer.send('log-debug', `Speech recognition availability test error: ${error.message}`);
      });
  } catch (error) {
    ipcRenderer.send('log-debug', `Error in setupSpeechRecognition: ${error.message}`);
  }
}

// 设置内存管理
function setupMemoryManagement() {
  // 监听内存压力事件
  ipcRenderer.on('memory-pressure', (event, data) => {
    console.log('Received memory pressure event:', data);
    
    // 执行紧急内存清理
    performMemoryCleanup(data.level === 'critical');
  });
  
  // 定期清理内存
  const CLEANUP_INTERVAL = 5 * 60 * 1000; // 5分钟
  setInterval(() => {
    performMemoryCleanup(false);
  }, CLEANUP_INTERVAL);
  
  // 页面可见性变化时的处理
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      // 页面不可见时执行更积极的内存清理
      performMemoryCleanup(true);
    }
  });
}

// 执行内存清理
function performMemoryCleanup(aggressive) {
  console.log(`Performing ${aggressive ? 'aggressive' : 'regular'} memory cleanup...`);
  
  // 清除未使用的图像缓存
  if (window.performance && window.performance.memory) {
    console.log('Current memory usage:', window.performance.memory);
  }
  
  // 尝试清除一些缓存
  if (window.caches) {
    caches.keys().then(cacheNames => {
      cacheNames.forEach(cacheName => {
        if (aggressive || cacheName.includes('temp')) {
          caches.delete(cacheName);
        }
      });
    });
  }
  
  // 如果是积极清理模式，可以执行更多操作
  if (aggressive) {
    // 请求主进程执行垃圾回收
    ipcRenderer.send('request-gc');
    
    // 清除不必要的DOM元素引用
    clearDOMReferences();
  }
}

// 清除DOM引用
function clearDOMReferences() {
  // 查找可能的内存泄漏点
  const elements = document.querySelectorAll('[data-cleanup="true"]');
  elements.forEach(el => {
    // 移除事件监听器
    el.replaceWith(el.cloneNode(true));
  });
  
  // 清除控制台
  if (console && console.clear) {
    console.clear();
  }
} 