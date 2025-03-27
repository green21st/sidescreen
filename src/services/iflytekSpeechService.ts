import { ref } from 'vue';
import CryptoJS from 'crypto-js';

interface SpeechConfig {
  appId: string;
  apiKey: string;
  apiSecret: string;
  enabled: boolean;
}

interface RecognitionCallbacks {
  onStart: () => void;
  onStop: () => void;
  onResult: (text: string, isFinal: boolean) => void;
  onError: (error: string) => void;
}

let currentConfig: SpeechConfig | null = null;
let isInitialized = false;
let websocket: WebSocket | null = null;
let mediaRecorder: MediaRecorder | null = null;
let audioContext: AudioContext | null = null;
let audioInput: MediaStreamAudioSourceNode | null = null;
let processor: ScriptProcessorNode | null = null;
let stream: MediaStream | null = null;

// 初始化讯飞语音识别服务
export const init = async (config: SpeechConfig): Promise<boolean> => {
  try {
    console.log('Initializing iFlytek speech service');
    
    if (!config.enabled || !config.appId || !config.apiKey || !config.apiSecret) {
      console.log('iFlytek speech service not properly configured');
      return false;
    }
    
    currentConfig = config;
    
    // 检查浏览器是否支持必要的API
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      console.error('Browser does not support getUserMedia');
      return false;
    }
    
    try {
      // 测试获取麦克风权限
      await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (error) {
      console.error('Failed to get microphone permission:', error);
      return false;
    }
    
    isInitialized = true;
    console.log('iFlytek speech service initialized successfully');
    return true;
  } catch (error) {
    console.error('Failed to initialize iFlytek speech service:', error);
    return false;
  }
};

// 创建WebSocket连接
const createWebSocket = (callbacks: RecognitionCallbacks) => {
  if (!currentConfig) {
    callbacks.onError('Speech service not configured');
    return null;
  }
  
  try {
    // 生成鉴权参数
    const url = 'wss://iat-api.xfyun.cn/v2/iat';
    const host = 'iat-api.xfyun.cn';
    const date = new Date().toUTCString();
    const algorithm = 'hmac-sha256';
    const headers = 'host date request-line';
    const signatureOrigin = `host: ${host}\ndate: ${date}\nGET /v2/iat HTTP/1.1`;
    const signatureSha = CryptoJS.HmacSHA256(signatureOrigin, currentConfig!.apiSecret);
    const signature = CryptoJS.enc.Base64.stringify(signatureSha);
    const authorizationOrigin = `api_key="${currentConfig!.apiKey}", algorithm="${algorithm}", headers="${headers}", signature="${signature}"`;
    const authorization = btoa(authorizationOrigin);

    // 构建连接URL
    const websocketUrl = `${url}?authorization=${authorization}&date=${encodeURI(date)}&host=${host}`;
    
    // 创建WebSocket连接
    const websocket = new WebSocket(websocketUrl);
    
    websocket.onopen = () => {
      console.log('WebSocket connected');
      // 发送开始参数
      if (!currentConfig) {
        callbacks.onError('Speech service not configured');
        websocket.close();
        return;
      }
      
      const params = {
        common: {
          app_id: currentConfig.appId,
        },
        business: {
          language: "zh_cn",
          domain: "iat",
          accent: "mandarin",
          vad_eos: 1000,         // 设置静音检测时长为1秒
          dwa: "wpgs",           // 开启动态修正功能
          pd: "edu",             // 教育领域
          ptt: 1,               // 开启标点符号
          rlang: "zh-cn",       // 识别语言
          vinfo: 1,             // 返回音频信息
          nunum: 0,             // 规范数字格式
          speex_size: 60,       // 音频发送间隔帧数
          nbest: 1,             // 返回结果个数
          wbest: 1              // 返回最优候选结果
        },
        data: {
          status: 0,
          format: "audio/L16;rate=16000",
          encoding: "raw"
        }
      };
      
      websocket.send(JSON.stringify(params));
    };
    
    websocket.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.code !== 0) {
          console.error('Recognition error:', data);
          callbacks.onError(`Error: ${data.message || '未知错误'}`);
          return;
        }
        
        if (data.data && data.data.result) {
          const result = data.data.result;
          let text = '';
          
          // 处理每个词
          if (result.ws) {
            text = result.ws.map((ws: any) => {
              // 获取这个词的所有候选结果中的第一个
              const words = ws.cw.map((cw: any) => cw.w).join('');
              return words;
            }).join('');
          }
          
          // 判断是否是最终结果
          const isFinal = data.data.status === 2;
          
          if (text.trim()) {
            console.log(`Recognition result: ${text} (${isFinal ? 'final' : 'interim'})`);
            callbacks.onResult(text, isFinal);
          }
        }
      } catch (error) {
        console.error('Error parsing message:', error, e.data);
      }
    };
    
    websocket.onerror = (e) => {
      console.error('WebSocket error:', e);
      callbacks.onError('WebSocket connection error');
    };
    
    websocket.onclose = (e) => {
      console.log('WebSocket closed:', e.code, e.reason);
      callbacks.onStop();
    };
    
    return websocket;
  } catch (error) {
    console.error('Error creating WebSocket:', error);
    callbacks.onError(`Failed to create WebSocket: ${error}`);
    return null;
  }
};

// 开始语音识别
export const startRecognition = async (callbacks: RecognitionCallbacks) => {
  if (!isInitialized || !currentConfig) {
    throw new Error('iFlytek speech service not initialized');
  }
  
  try {
    // 获取麦克风权限
    stream = await navigator.mediaDevices.getUserMedia({ 
      audio: {
        sampleRate: 16000,
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      } 
    });
    
    // 创建音频上下文
    audioContext = new AudioContext({
      sampleRate: 16000,
      latencyHint: 'interactive'
    });
    
    audioInput = audioContext.createMediaStreamSource(stream);
    processor = audioContext.createScriptProcessor(16384, 1, 1);
    
    // 创建WebSocket连接
    websocket = createWebSocket(callbacks);
    if (!websocket) {
      throw new Error('Failed to create WebSocket connection');
    }
    
    // 处理音频数据
    processor.onaudioprocess = (e) => {
      if (websocket && websocket.readyState === WebSocket.OPEN) {
        const audioData = e.inputBuffer.getChannelData(0);
        // 将音频数据转换为16位整数
        const pcmData = new Int16Array(audioData.length);
        for (let i = 0; i < audioData.length; i++) {
          pcmData[i] = Math.max(-1, Math.min(1, audioData[i])) * 0x7FFF;
        }
        
        // 发送音频数据
        if (pcmData.length > 0) {
          // 将音频数据转换为 Base64 字符串
          const base64Audio = arrayBufferToBase64(pcmData.buffer);
          const params = {
            data: {
              status: 1,
              format: "audio/L16;rate=16000",
              encoding: "raw",
              audio: base64Audio
            }
          };
          websocket.send(JSON.stringify(params));
        }
      }
    };
    
    // 连接音频节点
    audioInput.connect(processor);
    processor.connect(audioContext.destination);
    
    callbacks.onStart();
    
    return {
      stop: () => {
        // 发送结束帧
        if (websocket && websocket.readyState === WebSocket.OPEN) {
          const params = {
            data: {
              status: 2,
              format: "audio/L16;rate=16000",
              encoding: "raw",
              audio: ""
            }
          };
          websocket.send(JSON.stringify(params));
          
          // 添加一个小延迟再关闭连接，确保最后的数据被处理
          setTimeout(() => {
            if (websocket) {
              websocket.close();
              websocket = null;
            }
          }, 500);
        }
        
        // 清理资源
        if (processor) {
          processor.disconnect();
          processor = null;
        }
        
        if (audioInput) {
          audioInput.disconnect();
          audioInput = null;
        }
        
        if (audioContext) {
          audioContext.close();
          audioContext = null;
        }
        
        if (stream) {
          stream.getTracks().forEach(track => track.stop());
          stream = null;
        }
        
        callbacks.onStop();
      }
    };
  } catch (error) {
    callbacks.onError(String(error));
    throw error;
  }
};

// 检查服务是否已初始化
export const isServiceInitialized = () => {
  return isInitialized;
};

// 获取当前配置
export const getCurrentConfig = () => {
  return currentConfig;
};

// 重置服务
export const reset = () => {
  if (websocket) {
    websocket.close();
    websocket = null;
  }
  
  if (processor) {
    processor.disconnect();
    processor = null;
  }
  
  if (audioInput) {
    audioInput.disconnect();
    audioInput = null;
  }
  
  if (audioContext) {
    audioContext.close();
    audioContext = null;
  }
  
  if (stream) {
    stream.getTracks().forEach(track => track.stop());
    stream = null;
  }
  
  currentConfig = null;
  isInitialized = false;
};

// 辅助函数：将 ArrayBuffer 转换为 Base64 字符串
const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  let binary = '';
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}; 