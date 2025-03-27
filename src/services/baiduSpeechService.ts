/**
 * 百度语音识别服务
 * 使用百度智能云语音识别 API
 * 需要在百度智能云平台申请 API Key 和 Secret Key
 * https://ai.baidu.com/tech/speech
 */

// 录音相关
import * as localSpeech from './localSpeechService';

// 百度语音识别配置
export interface BaiduSpeechConfig {
  apiKey: string;
  secretKey: string;
  appId?: string;
  enabled: boolean;
}

// 回调函数
export interface BaiduSpeechCallbacks {
  onStart: () => void;
  onStop: () => void;
  onResult: (text: string, isFinal: boolean) => void;
  onError: (error: string) => void;
}

// 默认配置
let config: BaiduSpeechConfig = {
  apiKey: '',
  secretKey: '',
  appId: '',
  enabled: false
};

// 存储访问令牌
let accessToken = '';
let tokenExpireTime = 0;
let isRecording = false;
let recordingBlob: Blob | null = null;

/**
 * 初始化百度语音识别服务
 * @param newConfig 配置信息
 */
export async function initBaiduSpeech(newConfig?: Partial<BaiduSpeechConfig>): Promise<boolean> {
  try {
    // 如果提供了新配置，则合并
    if (newConfig) {
      config = { ...config, ...newConfig };
    }
    
    // 从本地存储加载配置
    const savedConfig = localStorage.getItem('baiduSpeechConfig');
    if (savedConfig) {
      try {
        const parsedConfig = JSON.parse(savedConfig);
        config = { ...config, ...parsedConfig };
      } catch (e) {
        console.error('Failed to parse saved Baidu speech config:', e);
      }
    }
    
    // 如果没有配置 API Key 或 Secret Key，则返回 false
    if (!config.apiKey || !config.secretKey || !config.enabled) {
      console.log('[BaiduSpeech] Service not configured or disabled');
      return false;
    }
    
    // 获取访问令牌
    if (!accessToken || Date.now() > tokenExpireTime) {
      const tokenResult = await getAccessToken(config.apiKey, config.secretKey);
      if (!tokenResult.success) {
        console.error('[BaiduSpeech] Failed to get access token:', tokenResult.error);
        return false;
      }
      
      accessToken = tokenResult.token!;
      // 令牌有效期为30天，我们设置为29天以确保安全
      tokenExpireTime = Date.now() + 29 * 24 * 60 * 60 * 1000;
    }
    
    console.log('[BaiduSpeech] Service initialized successfully');
    return true;
  } catch (error) {
    console.error('[BaiduSpeech] Initialization error:', error);
    return false;
  }
}

/**
 * 保存百度语音识别配置
 * @param newConfig 配置信息
 */
export function saveBaiduSpeechConfig(newConfig: Partial<BaiduSpeechConfig>): void {
  config = { ...config, ...newConfig };
  localStorage.setItem('baiduSpeechConfig', JSON.stringify(config));
}

/**
 * 获取百度语音识别配置
 */
export function getBaiduSpeechConfig(): BaiduSpeechConfig {
  return { ...config };
}

/**
 * 获取百度 AI 平台访问令牌
 */
async function getAccessToken(apiKey: string, secretKey: string): Promise<{ success: boolean; token?: string; error?: string }> {
  try {
    const url = `https://aip.baidubce.com/oauth/2.0/token?grant_type=client_credentials&client_id=${apiKey}&client_secret=${secretKey}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      return {
        success: false,
        error: `HTTP error: ${response.status}`
      };
    }
    
    const data = await response.json();
    if (data.access_token) {
      return {
        success: true,
        token: data.access_token
      };
    } else {
      return {
        success: false,
        error: 'No access token in response'
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * 开始语音识别
 * @param callbacks 回调函数
 */
export async function startRecognition(callbacks: BaiduSpeechCallbacks): Promise<{ stop: () => void }> {
  // 检查是否已初始化
  if (!accessToken) {
    const initialized = await initBaiduSpeech();
    if (!initialized) {
      callbacks.onError('百度语音识别服务未初始化或配置不正确');
      return { stop: () => {} };
    }
  }
  
  // 检查是否已经在录音
  if (isRecording) {
    callbacks.onError('已经在录音中');
    return { stop: () => {} };
  }
  
  isRecording = true;
  recordingBlob = null;
  
  // 开始录音
  await localSpeech.startRecording({
    onStart: () => {
      callbacks.onStart();
    },
    onStop: async (state) => {
      isRecording = false;
      
      // 如果有录音数据，则发送到百度 API 进行识别
      if (state.audioBlob) {
        recordingBlob = state.audioBlob;
        try {
          const result = await recognizeSpeech(state.audioBlob);
          if (result.success && result.result) {
            callbacks.onResult(result.result, true);
          } else {
            callbacks.onError(result.error || '语音识别失败');
          }
        } catch (error) {
          callbacks.onError(`语音识别错误: ${error}`);
        }
      }
      
      callbacks.onStop();
    },
    onError: (error) => {
      isRecording = false;
      callbacks.onError(error);
    }
  });
  
  return {
    stop: () => {
      if (isRecording) {
        localSpeech.stopRecording();
        isRecording = false;
      }
    }
  };
}

/**
 * 识别语音
 * @param audioBlob 音频数据
 */
async function recognizeSpeech(audioBlob: Blob): Promise<{ success: boolean; result?: string; error?: string }> {
  try {
    // 将 Blob 转换为 Base64
    const base64Data = await blobToBase64(audioBlob);
    
    // 发送到百度 API
    const url = `https://vop.baidu.com/server_api`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        format: 'pcm',
        rate: 16000,
        channel: 1,
        token: accessToken,
        cuid: 'sidescreen_app',
        speech: base64Data.split(',')[1],
        len: audioBlob.size
      })
    });
    
    if (!response.ok) {
      return {
        success: false,
        error: `HTTP error: ${response.status}`
      };
    }
    
    const data = await response.json();
    if (data.err_no === 0 && data.result) {
      return {
        success: true,
        result: data.result[0]
      };
    } else {
      return {
        success: false,
        error: `识别错误: ${data.err_msg || '未知错误'}`
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * 将 Blob 转换为 Base64
 * @param blob Blob 对象
 */
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * 检查百度语音识别服务是否可用
 */
export function isBaiduSpeechAvailable(): boolean {
  return !!accessToken && Date.now() < tokenExpireTime && config.enabled;
}

/**
 * 获取录音 Blob
 */
export function getRecordingBlob(): Blob | null {
  return recordingBlob;
}

/**
 * 播放录音
 */
export function playRecording(): HTMLAudioElement | null {
  if (recordingBlob) {
    return localSpeech.playRecording(recordingBlob);
  }
  return null;
} 