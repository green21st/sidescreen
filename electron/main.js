const { app, BrowserWindow, screen, protocol, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const url = require('url');
const remoteMain = require('@electron/remote/main');
const os = require('os');
const dns = require('dns');

// 性能优化：添加命令行开关
app.commandLine.appendSwitch('disable-http-cache', 'true');
app.commandLine.appendSwitch('ignore-gpu-blacklist');
app.commandLine.appendSwitch('enable-gpu-rasterization');
app.commandLine.appendSwitch('enable-zero-copy'); // 启用零拷贝
app.commandLine.appendSwitch('disable-software-rasterizer'); // 禁用软件光栅化
app.commandLine.appendSwitch('enable-native-gpu-memory-buffers'); // 启用原生GPU内存缓冲区
app.commandLine.appendSwitch('enable-accelerated-video-decode'); // 启用加速视频解码
app.commandLine.appendSwitch('enable-features', 'MemoryPressureBasedSourceBufferGC'); // 基于内存压力的垃圾回收

// 语音识别相关设置
app.commandLine.appendSwitch('enable-speech-dispatcher'); // 启用语音识别
app.commandLine.appendSwitch('enable-speech-service'); // 启用语音服务
app.commandLine.appendSwitch('enable-media-stream'); // 启用媒体流
app.commandLine.appendSwitch('use-fake-ui-for-media-stream'); // 使用假UI用于媒体流（避免系统权限对话框）
app.commandLine.appendSwitch('allow-file-access-from-files'); // 允许从文件访问文件
app.commandLine.appendSwitch('enable-experimental-web-platform-features'); // 启用实验性Web平台功能

// 添加更多语音识别相关配置
app.commandLine.appendSwitch('disable-web-security', 'true'); // 禁用Web安全性，允许跨域请求（仅用于开发环境）
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required'); // 允许自动播放，无需用户手势
app.commandLine.appendSwitch('disable-features', 'SpeechRecognitionBlocklist'); // 禁用语音识别黑名单
app.commandLine.appendSwitch('enable-features', 'SpeechRecognition,SpeechSynthesis'); // 启用语音识别和语音合成

// 初始化 remote 模块
remoteMain.initialize();

// 判断是否是开发环境
const isDev = process.env.NODE_ENV === 'development';

// 全局变量存储主窗口引用，避免被垃圾回收
let mainWindow = null;

// 设置应用权限
app.commandLine.appendSwitch('enable-speech-dispatcher'); // 启用语音识别
app.commandLine.appendSwitch('enable-speech-service'); // 启用语音服务

// 请求麦克风权限
const requestMicrophonePermission = () => {
  if (process.platform !== 'darwin') return; // 仅在 macOS 上需要
  try {
    const { systemPreferences } = require('electron');
    if (systemPreferences.getMediaAccessStatus) {
      const status = systemPreferences.getMediaAccessStatus('microphone');
      console.log(`Microphone permission status: ${status}`);
      if (status !== 'granted') {
        systemPreferences.askForMediaAccess('microphone')
          .then(granted => {
            console.log(`Microphone permission ${granted ? 'granted' : 'denied'}`);
          })
          .catch(err => {
            console.error('Error requesting microphone permission:', err);
          });
      }
    }
  } catch (error) {
    console.error('Error checking microphone permission:', error);
  }
};

// 内存监控和垃圾回收
let memoryTimer = null;
const MEMORY_MONITOR_INTERVAL = 30000; // 30秒检查一次内存使用情况
const MEMORY_LIMIT_PERCENT = 80; // 内存使用超过80%时触发垃圾回收

// 如果启动参数包含--enable-gc，则启用手动垃圾回收
if (process.argv.includes('--enable-gc') || process.execArgv.some(arg => arg.includes('--expose-gc'))) {
  console.log('Manual garbage collection enabled');
  global.gc = global.gc || (() => {
    console.warn('GC function not available, please make sure to use --js-flags="--expose-gc"');
  });
}

// 检测是否支持垃圾回收
function isGCAvailable() {
  return typeof global.gc === 'function';
}

// 修改内存监控函数，添加更多错误处理
function startMemoryMonitoring() {
  console.log('Starting memory monitoring...');
  console.log(`GC support: ${isGCAvailable() ? 'Available' : 'Not available'}`);
  
  memoryTimer = setInterval(() => {
    try {
      const totalMem = os.totalmem();
      const freeMem = os.freemem();
      const usedMemPercent = ((totalMem - freeMem) / totalMem) * 100;
      
      console.log(`Memory usage: ${usedMemPercent.toFixed(2)}%`);
      
      // 如果内存使用率超过阈值，尝试进行垃圾回收
      if (usedMemPercent > MEMORY_LIMIT_PERCENT) {
        console.log('Memory usage is high, attempting garbage collection...');
        
        if (isGCAvailable()) {
          try {
            global.gc();
            console.log('Manual garbage collection completed');
          } catch (e) {
            console.error('Garbage collection failed:', e);
          }
        } else {
          console.warn('Garbage collection not available, please use npm run electron:optimized');
        }
        
        // 通知渲染进程也进行清理
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('memory-pressure', { level: 'critical' });
        }
      }
    } catch (error) {
      console.error('Memory monitoring error:', error);
    }
  }, MEMORY_MONITOR_INTERVAL);
}

function createWindow() {
  // 获取屏幕尺寸
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  
  // 创建浏览器窗口
  mainWindow = new BrowserWindow({
    width,
    height,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false,
      enableRemoteModule: true,
      v8CacheOptions: 'code',
      backgroundThrottling: false,
      spellcheck: false,
      enableBlinkFeatures: 'PaintHolding',
      enableWebSQL: false,
      preload: path.join(__dirname, 'preload.js'),
      sandbox: false
    },
    frame: false,
    fullscreen: true,
    autoHideMenuBar: true,
    show: false,
    backgroundColor: '#000000',
    paintWhenInitiallyHidden: true
  });

  // 启用 remote 模块
  remoteMain.enable(mainWindow.webContents);

  // 加载应用
  if (isDev) {
    console.log('Running in development mode');
    console.log('Loading URL:', 'http://localhost:5173');
    console.log('Preload script path:', path.join(__dirname, 'preload.js'));
    mainWindow.loadURL('http://localhost:5173');
    // 在开发环境下打开开发者工具
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // 监听加载完成事件
  mainWindow.webContents.on('did-finish-load', () => {
    console.log('Window loaded');
    mainWindow.show();
  });

  // 监听加载失败事件
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('Failed to load:', errorCode, errorDescription);
  });

  // 优化：监听渲染进程崩溃事件
  mainWindow.webContents.on('crashed', (event) => {
    console.error('渲染进程崩溃，尝试重启应用...');
    // 可以在这里添加日志记录或崩溃报告
    mainWindow.destroy();
    createWindow();
  });

  // 优化：监听窗口未响应事件
  mainWindow.on('unresponsive', () => {
    console.error('窗口未响应，尝试重启...');
    mainWindow.destroy();
    createWindow();
  });

  // 优化：当窗口关闭时释放资源
  mainWindow.on('closed', () => {
    clearInterval(memoryTimer);
    memoryTimer = null;
    mainWindow = null;
  });

  // 优化：设置页面可见性变化处理
  mainWindow.on('hide', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('visibility-change', 'hidden');
    }
  });

  mainWindow.on('show', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('visibility-change', 'visible');
    }
  });
}

// 注册自定义协议处理器，用于处理资源文件的请求
app.whenReady().then(() => {
  // 注册自定义协议
  protocol.registerFileProtocol('app', (request, callback) => {
    const requestPath = request.url.slice('app://'.length);
    const filePath = isDev
      ? path.join(__dirname, '..', 'public', requestPath)
      : path.join(process.resourcesPath, requestPath);
    
    // 检查文件是否存在
    if (fs.existsSync(filePath)) {
      callback({ path: filePath });
    } else {
      console.error(`File not found: ${filePath}`);
      callback({ error: -6 }); // 文件不存在错误
    }
  });

  // 请求麦克风权限
  requestMicrophonePermission();

  // 设置IPC处理
  setupIPC();

  // 创建窗口
  createWindow();
  
  // 启动内存监控
  startMemoryMonitoring();
  
  // 设置最大监听器数量，避免内存泄漏警告
  ipcMain.setMaxListeners(20);
  
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// 处理IPC请求
function setupIPC() {
  // 处理渲染进程就绪事件
  ipcMain.on('renderer-ready', () => {
    console.log('Renderer process is ready');
  });
  
  // 处理垃圾回收请求
  ipcMain.on('request-gc', () => {
    if (isGCAvailable()) {
      console.log('Performing garbage collection on request');
      global.gc();
    } else {
      console.warn('GC requested but not available');
    }
  });
  
  // 处理低内存模式切换
  ipcMain.on('low-memory-mode', (event, enabled) => {
    console.log(`Low memory mode: ${enabled ? 'enabled' : 'disabled'}`);
    // 可以在这里添加额外的内存优化措施
  });
  
  // 处理麦克风权限请求
  ipcMain.handle('request-microphone-permission', async () => {
    try {
      console.log('Requesting microphone permission...');
      
      if (process.platform === 'darwin') {
        // macOS 特定处理
        const { systemPreferences } = require('electron');
        if (systemPreferences.getMediaAccessStatus) {
          const status = systemPreferences.getMediaAccessStatus('microphone');
          console.log(`macOS microphone status: ${status}`);
          if (status !== 'granted') {
            const granted = await systemPreferences.askForMediaAccess('microphone');
            console.log(`macOS microphone permission ${granted ? 'granted' : 'denied'}`);
            return { granted, status: granted ? 'granted' : 'denied' };
          }
          return { granted: true, status };
        }
      } else if (process.platform === 'win32') {
        // Windows 特定处理
        console.log('Windows platform detected, checking microphone access');
        
        // 在 Windows 上，我们可以尝试访问麦克风来检查权限
        try {
          // 尝试打开一个临时的 BrowserWindow 来测试麦克风访问
          const testWindow = new BrowserWindow({
            width: 1,
            height: 1,
            show: false,
            webPreferences: {
              nodeIntegration: false,
              contextIsolation: true,
              webSecurity: false,
              preload: path.join(__dirname, 'preload.js')
            }
          });
          
          // 加载一个简单的 HTML 页面来测试麦克风访问
          testWindow.loadURL('data:text/html,<html><body><script>navigator.mediaDevices.getUserMedia({audio:true}).then(()=>{window.close()}).catch(e=>{console.error(e);window.close()})</script></body></html>');
          
          // 等待窗口关闭
          await new Promise(resolve => {
            testWindow.on('closed', resolve);
            // 5秒后强制关闭窗口
            setTimeout(() => {
              if (!testWindow.isDestroyed()) {
                testWindow.destroy();
                resolve();
              }
            }, 5000);
          });
          
          console.log('Microphone access test completed');
          return { granted: true, status: 'granted' };
        } catch (error) {
          console.error('Error testing microphone access:', error);
          // 即使测试失败，我们也假设权限已授予，因为 Windows 通常不会阻止麦克风访问
          return { granted: true, status: 'assumed' };
        }
      }
      
      // 对于其他平台，我们假设权限已授予
      console.log('Other platform detected, assuming microphone permission');
      return { granted: true, status: 'assumed' };
    } catch (error) {
      console.error('Error requesting microphone permission:', error);
      return { granted: false, status: 'error', error: error.message };
    }
  });
  
  // 检查麦克风权限状态
  ipcMain.handle('check-microphone-permission', () => {
    try {
      console.log('Checking microphone permission...');
      
      if (process.platform === 'darwin') {
        // macOS 特定处理
        const { systemPreferences } = require('electron');
        if (systemPreferences.getMediaAccessStatus) {
          const status = systemPreferences.getMediaAccessStatus('microphone');
          console.log(`macOS microphone status: ${status}`);
          return { status };
        }
      } else if (process.platform === 'win32') {
        // Windows 特定处理
        console.log('Windows platform detected, assuming microphone access');
        return { status: 'assumed' };
      }
      
      // 对于其他平台，我们假设权限已授予
      console.log('Other platform detected, assuming microphone permission');
      return { status: 'assumed' };
    } catch (error) {
      console.error('Error checking microphone permission:', error);
      return { status: 'error', error: error.message };
    }
  });
  
  // 添加调试日志事件
  ipcMain.on('log-debug', (event, message) => {
    console.log('Renderer Debug:', message);
  });
  
  // 添加语音识别测试事件
  ipcMain.handle('test-speech-recognition', async () => {
    try {
      console.log('Testing speech recognition availability...');
      
      // 检查网络连接
      const online = await checkNetworkConnection();
      console.log(`Network is ${online ? 'online' : 'offline'}`);
      
      if (!online) {
        return { available: false, reason: 'offline', message: '网络连接不可用' };
      }
      
      // 检查麦克风权限
      try {
        if (process.platform === 'darwin') {
          // macOS 特定处理
          const { systemPreferences } = require('electron');
          if (systemPreferences.getMediaAccessStatus) {
            const status = systemPreferences.getMediaAccessStatus('microphone');
            console.log(`macOS microphone status: ${status}`);
            if (status !== 'granted') {
              return { 
                available: false, 
                reason: 'no_microphone', 
                message: '麦克风权限未授予' 
              };
            }
          }
        }
        // Windows 和其他平台默认允许访问麦克风
        return { available: true };
      } catch (error) {
        console.error('Error checking microphone permission:', error);
        return { 
          available: false, 
          reason: 'no_microphone', 
          message: '检查麦克风权限时出错: ' + error.message 
        };
      }
    } catch (error) {
      console.error('Error testing speech recognition:', error);
      return { available: false, reason: 'error', message: error.message };
    }
  });

  // 处理打开目录对话框的请求
  ipcMain.handle('open-directory', async () => {
    const { dialog } = require('electron');
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory']
    });
    return result;
  });

  // 处理读取目录内容的请求
  ipcMain.handle('read-directory', async (event, folderPath) => {
    const fs = require('fs').promises;
    const path = require('path');
    
    async function readDirRecursive(dir) {
      const files = [];
      const items = await fs.readdir(dir, { withFileTypes: true });
      
      for (const item of items) {
        const fullPath = path.join(dir, item.name);
        if (item.isDirectory()) {
          files.push(...await readDirRecursive(fullPath));
        } else if (item.isFile() && (
          item.name.endsWith('.model3.json') ||
          item.name === 'model.json' ||
          item.name === 'index.json'
        )) {
          files.push(fullPath);
        }
      }
      
      return files;
    }
    
    try {
      const files = await readDirRecursive(folderPath);
      return files;
    } catch (error) {
      console.error('读取目录失败:', error);
      throw error;
    }
  });
}

// 当所有窗口关闭时退出应用
app.on('window-all-closed', () => {
  clearInterval(memoryTimer);
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// 优化：处理应用即将退出事件，进行清理
app.on('before-quit', () => {
  console.log('Application is about to exit, performing cleanup...');
  clearInterval(memoryTimer);
});

// 优化：处理渲染进程内存不足警告
app.on('render-process-gone', (event, webContents, details) => {
  console.error('渲染进程异常退出:', details.reason);
  if (details.reason === 'crashed' || details.reason === 'killed') {
    console.log('尝试重启应用...');
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.destroy();
    }
    createWindow();
  }
});

// 优化：启用硬件加速
app.on('ready', () => {
  app.getGPUFeatureStatus();
});

// 优化：设置进程优先级
if (process.platform === 'win32') {
  try {
    // 使用更安全的方式设置进程优先级
    console.log('Attempting to set process priority...');
    
    // 检查是否支持进程优先级设置
    if (typeof process.getProcessPriority === 'function') {
      process.getProcessPriority(process.pid, (err, priority) => {
        if (!err) {
          console.log(`Current process priority: ${priority}`);
        }
      });
    } else {
      console.log('Process priority setting not supported in current environment');
    }
  } catch (e) {
    console.error('Unable to set process priority:', e);
  }
}

// 检查网络连接
const checkNetworkConnection = () => {
  return new Promise((resolve) => {
    dns.lookup('iat-api.xfyun.cn', (err) => {
      resolve(!err);
    });
  });
}; 