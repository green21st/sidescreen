const { app, BrowserWindow, screen, protocol, ipcMain, Tray, Menu, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');
const url = require('url');
const remoteMain = require('@electron/remote/main');
const os = require('os');

// 性能优化：添加命令行开关
app.commandLine.appendSwitch('disable-http-cache', 'true');
app.commandLine.appendSwitch('ignore-gpu-blacklist');
app.commandLine.appendSwitch('enable-gpu-rasterization');
app.commandLine.appendSwitch('enable-zero-copy'); // 启用零拷贝
app.commandLine.appendSwitch('disable-software-rasterizer'); // 禁用软件光栅化
app.commandLine.appendSwitch('enable-native-gpu-memory-buffers'); // 启用原生GPU内存缓冲区
app.commandLine.appendSwitch('enable-accelerated-video-decode'); // 启用加速视频解码
app.commandLine.appendSwitch('enable-features', 'MemoryPressureBasedSourceBufferGC'); // 基于内存压力的垃圾回收

// 添加垃圾回收支持
app.commandLine.appendSwitch('js-flags', '--expose-gc');

// 初始化 remote 模块
remoteMain.initialize();

// 判断是否是开发环境
const isDev = process.env.NODE_ENV === 'development';

// 全局变量存储主窗口引用，避免被垃圾回收
let mainWindow = null;
let loadingWindow = null;
let tray = null;

// 内存监控和垃圾回收
let memoryTimer = null;
const MEMORY_MONITOR_INTERVAL = 30000; // 30秒检查一次内存使用情况
const MEMORY_LIMIT_PERCENT = 70; // 内存使用超过70%时触发垃圾回收

// 强制启用手动垃圾回收
console.log('Manual garbage collection enabled in optimized build');
global.gc = global.gc || (() => {
  console.warn('GC function not available despite --expose-gc flag');
});

// 检测是否支持垃圾回收
function isGCAvailable() {
  return typeof global.gc === 'function';
}

// 修改内存监控函数，添加更多错误处理
function startMemoryMonitoring() {
  console.log('Starting memory monitoring (optimized version)...');
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
          console.warn('Garbage collection not available despite optimization flags');
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

function createLoadingWindow() {
  loadingWindow = new BrowserWindow({
    width: 400,
    height: 300,
    visibleOnAllWorkspaces: true,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    minimizable: false,
    skipTaskbar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false
    }
  });

  // 立即显示窗口，不等待ready-to-show事件
  loadingWindow.show();
  
  // 将加载窗口移动到屏幕中央
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  const x = Math.floor((width - 400) / 2);
  const y = Math.floor((height - 300) / 2);
  loadingWindow.setPosition(x, y);

  // 加载加载页面
  loadingWindow.loadFile(path.join(__dirname, '../loading.html'));

  // 窗口关闭时清除引用
  loadingWindow.on('closed', () => {
    loadingWindow = null;
  });
}

function createTray() {
  try {
    // 根据环境选择正确的图标路径
    let iconPath;
    if (isDev) {
      iconPath = path.join(__dirname, '../build/icons/icon.png');
    } else {
      // 在生产环境中，图标文件会被打包到 resources 目录
      iconPath = path.join(process.resourcesPath, 'build/icons/icon.png');
    }

    console.log('Loading tray icon from:', iconPath);

    // 确保图标文件存在
    if (!fs.existsSync(iconPath)) {
      console.error('Tray icon not found at:', iconPath);
      // 尝试其他可能的路径
      const alternativePaths = [
        path.join(__dirname, '../build/icons/icon.ico'),
        path.join(process.resourcesPath, 'build/icons/icon.ico'),
        path.join(__dirname, 'icon.png'),
        path.join(__dirname, 'icon.ico')
      ];

      for (const altPath of alternativePaths) {
        if (fs.existsSync(altPath)) {
          console.log('Using alternative icon path:', altPath);
          iconPath = altPath;
          break;
        }
      }
    }

    // 创建托盘图标
    const trayIcon = nativeImage.createFromPath(iconPath);
    // 调整图标大小
    const resizedIcon = trayIcon.resize({ width: 16, height: 16 });
    tray = new Tray(resizedIcon);

    // 设置托盘图标提示文本
    tray.setToolTip('SideScreen');

    // 创建托盘菜单
    const contextMenu = Menu.buildFromTemplate([
      {
        label: '显示主窗口',
        click: () => {
          if (mainWindow) {
            mainWindow.show();
            mainWindow.focus();
          }
        }
      },
      {
        label: '隐藏主窗口',
        click: () => {
          if (mainWindow) {
            mainWindow.hide();
          }
        }
      },
      { type: 'separator' },
      {
        label: '退出',
        click: () => {
          app.quit();
        }
      }
    ]);

    // 设置托盘的上下文菜单
    tray.setContextMenu(contextMenu);

    // 点击托盘图标时切换窗口显示状态
    tray.on('click', () => {
      if (mainWindow) {
        if (mainWindow.isVisible()) {
          mainWindow.hide();
        } else {
          mainWindow.show();
          mainWindow.focus();
        }
      }
    });

    console.log('Tray created successfully');
  } catch (error) {
    console.error('Error creating tray:', error);
  }
}

function createWindow() {
  // 获取所有显示器
  const displays = screen.getAllDisplays();
  const externalDisplay = displays.find((display) => {
    return display.bounds.x !== 0 || display.bounds.y !== 0;
  });

  // 如果有外接显示器，在外接显示器上创建窗口
  const targetDisplay = externalDisplay || displays[0];

  // 创建浏览器窗口
  mainWindow = new BrowserWindow({
    x: targetDisplay.bounds.x,
    y: targetDisplay.bounds.y,
    width: targetDisplay.bounds.width,
    height: targetDisplay.bounds.height,
    visibleOnAllWorkspaces: true,
    alwaysOnTop: true,
    minimizable: false,
    skipTaskbar: true,
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
  mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));

  // 内容加载完成后再显示窗口
  mainWindow.webContents.on('did-finish-load', () => {
    // 等待一小段时间再关闭加载窗口，确保主窗口完全准备好
    setTimeout(() => {
      mainWindow.show();
      if (loadingWindow && !loadingWindow.isDestroyed()) {
        loadingWindow.close();
      }
    }, 800);
  });

  // 在开发环境下打开开发者工具
  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  // 优化：监听渲染进程崩溃事件
  mainWindow.webContents.on('crashed', (event) => {
    console.error('Renderer process crashed, attempting to restart...');
    // 可以在这里添加日志记录或崩溃报告
    mainWindow.destroy();
    createWindow();
  });

  // 优化：监听窗口未响应事件
  mainWindow.on('unresponsive', () => {
    console.error('Window is unresponsive, attempting to restart...');
    mainWindow.destroy();
    createWindow();
  });

  // 优化：当窗口关闭时释放资源
  mainWindow.on('closed', () => {
    clearInterval(memoryTimer);
    memoryTimer = null;
    mainWindow = null;
  });
  
  mainWindow.on('minimize', () => {
    console.log('最小化');
    mainWindow.restore();
    mainWindow.moveTop();
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

  // 监听窗口关闭事件，改为隐藏窗口而不是退出应用
  mainWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
    return false;
  });
}

// 修改应用启动逻辑
app.whenReady().then(() => {
  // 创建系统托盘
  createTray();
  
  // 首先创建加载窗口
  createLoadingWindow();
  
  // 注册自定义协议
  protocol.registerFileProtocol('app', (request, callback) => {
    const requestPath = request.url.slice('app://'.length);
    const filePath = isDev
      ? path.join(__dirname, '..', 'public', requestPath)
      : path.join(process.resourcesPath, requestPath);
    
    if (fs.existsSync(filePath)) {
      callback({ path: filePath });
    } else {
      console.error(`File not found: ${filePath}`);
      callback({ error: -6 });
    }
  });

  // 设置IPC处理
  setupIPC();

  // 启动内存监控
  startMemoryMonitoring();

  // 延迟一小段时间再创建主窗口，确保加载窗口已显示
  setTimeout(createWindow, 300);
});

// 处理IPC请求
function setupIPC() {
  // 处理打开目录对话框的请求
  ipcMain.handle('open-directory', async () => {
    const { dialog } = require('electron');
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory']
    });
    return result;
  });

  // 处理选择文件对话框的请求
  ipcMain.handle('select-file', async () => {
    const { dialog } = require('electron');
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [
        { name: 'Text Files', extensions: ['txt'] }
      ]
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

  // 处理读取文本文件的请求
  ipcMain.handle('read-text-file', async (event, filePath) => {
    try {
      const content = await fs.promises.readFile(filePath, 'utf-8');
      return content;
    } catch (error) {
      console.error('读取文件失败:', error);
      throw error;
    }
  });

  // 处理关闭窗口请求
  ipcMain.on('close-window', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) {
      win.close();
    }
  });
}

// 优化：添加IPC通信处理
ipcMain.on('renderer-ready', () => {
  console.log('Renderer process is ready');
});

// 优化：处理渲染进程请求的垃圾回收
ipcMain.on('request-gc', () => {
  if (global.gc) {
    try {
      global.gc();
      console.log('Garbage collection executed per renderer request');
    } catch (e) {
      console.error('Garbage collection failed:', e);
    }
  }
});

// 优化：处理低内存模式切换
ipcMain.on('low-memory-mode', (event, enabled) => {
  console.log(`Low memory mode: ${enabled ? 'enabled' : 'disabled'}`);
  // 可以在这里添加额外的内存优化措施
});

// 当所有窗口关闭时退出应用
app.on('window-all-closed', () => {
  clearInterval(memoryTimer);
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  } else {
    mainWindow.show();
  }
});

// 优化：处理应用即将退出事件，进行清理
app.on('before-quit', () => {
  console.log('Application is about to exit, performing cleanup...');
  clearInterval(memoryTimer);
  app.isQuitting = true;
});

// 优化：处理渲染进程内存不足警告
app.on('render-process-gone', (event, webContents, details) => {
  console.error('Renderer process exited abnormally:', details.reason);
  if (details.reason === 'crashed' || details.reason === 'killed') {
    console.log('Attempting to restart application...');
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