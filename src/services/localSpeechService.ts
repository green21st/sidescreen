/**
 * 本地录音服务
 * 提供录音、播放和停止功能
 */

// 录音状态
export interface RecordingState {
  isRecording: boolean;
  audioBlob: Blob | null;
  audioUrl: string | null;
}

// 回调函数
export interface RecordingCallbacks {
  onStart: () => void;
  onStop: (state: RecordingState) => void;
  onError: (error: string) => void;
}

// 录音状态
let state: RecordingState = {
  isRecording: false,
  audioBlob: null,
  audioUrl: null
};

// 录音相关变量
let mediaRecorder: MediaRecorder | null = null;
let audioChunks: Blob[] = [];
let audioPlayer: HTMLAudioElement | null = null;

/**
 * 开始录音
 * @param callbacks 回调函数
 */
export async function startRecording(callbacks: RecordingCallbacks): Promise<void> {
  try {
    // 检查是否已经在录音
    if (state.isRecording) {
      callbacks.onError('已经在录音中');
      return;
    }
    
    // 重置状态
    state = {
      isRecording: true,
      audioBlob: null,
      audioUrl: null
    };
    
    audioChunks = [];
    
    // 请求麦克风权限
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    
    // 创建 MediaRecorder
    mediaRecorder = new MediaRecorder(stream, {
      mimeType: 'audio/webm'
    });
    
    // 设置数据可用事件
    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        audioChunks.push(event.data);
      }
    };
    
    // 设置录音停止事件
    mediaRecorder.onstop = () => {
      // 停止所有音轨
      stream.getTracks().forEach(track => track.stop());
      
      // 创建音频 Blob
      const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
      const audioUrl = URL.createObjectURL(audioBlob);
      
      // 更新状态
      state = {
        isRecording: false,
        audioBlob,
        audioUrl
      };
      
      // 调用回调
      callbacks.onStop(state);
    };
    
    // 设置错误事件
    mediaRecorder.onerror = (event) => {
      state.isRecording = false;
      callbacks.onError(`录音错误: ${event.error}`);
    };
    
    // 开始录音
    mediaRecorder.start();
    callbacks.onStart();
    
    // 设置自动停止（60秒）
    setTimeout(() => {
      if (state.isRecording) {
        stopRecording();
      }
    }, 60000);
  } catch (error) {
    state.isRecording = false;
    callbacks.onError(`无法访问麦克风: ${error}`);
  }
}

/**
 * 停止录音
 */
export function stopRecording(): void {
  if (mediaRecorder && state.isRecording) {
    mediaRecorder.stop();
    state.isRecording = false;
  }
}

/**
 * 播放录音
 * @param blob 音频 Blob
 */
export function playRecording(blob?: Blob): HTMLAudioElement | null {
  try {
    // 停止当前播放
    if (audioPlayer) {
      audioPlayer.pause();
      audioPlayer.currentTime = 0;
    }
    
    // 使用提供的 Blob 或状态中的 Blob
    const audioBlob = blob || state.audioBlob;
    if (!audioBlob) {
      console.error('No recording to play');
      return null;
    }
    
    // 创建音频 URL
    const audioUrl = URL.createObjectURL(audioBlob);
    
    // 创建音频播放器
    audioPlayer = new Audio(audioUrl);
    audioPlayer.onended = () => {
      if (audioPlayer && audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
    
    // 播放音频
    audioPlayer.play();
    return audioPlayer;
  } catch (error) {
    console.error('Error playing recording:', error);
    return null;
  }
}

/**
 * 获取录音状态
 */
export function getRecordingState(): RecordingState {
  return { ...state };
}

/**
 * 检查麦克风权限
 */
export async function checkMicrophonePermission(): Promise<boolean> {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const hasAudioInput = devices.some(device => device.kind === 'audioinput');
    
    if (!hasAudioInput) {
      return false;
    }
    
    // 尝试获取麦克风权限
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    
    // 停止所有音轨
    stream.getTracks().forEach(track => track.stop());
    
    return true;
  } catch (error) {
    console.error('Microphone permission check failed:', error);
    return false;
  }
}

/**
 * 转换音频格式
 * 将 webm 格式转换为 pcm 格式
 * 注意：此功能需要 Web Audio API 支持
 * @param blob 音频 Blob
 */
export async function convertToPCM(blob: Blob): Promise<Blob> {
  return new Promise((resolve, reject) => {
    try {
      const fileReader = new FileReader();
      
      fileReader.onloadend = async () => {
        try {
          const arrayBuffer = fileReader.result as ArrayBuffer;
          
          // 创建音频上下文
          const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
          
          // 解码音频数据
          const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
          
          // 获取音频数据
          const numberOfChannels = audioBuffer.numberOfChannels;
          const length = audioBuffer.length;
          const sampleRate = audioBuffer.sampleRate;
          
          // 创建 PCM 数据
          const pcmData = new Float32Array(length * numberOfChannels);
          
          // 提取音频数据
          for (let channel = 0; channel < numberOfChannels; channel++) {
            const channelData = audioBuffer.getChannelData(channel);
            for (let i = 0; i < length; i++) {
              pcmData[i * numberOfChannels + channel] = channelData[i];
            }
          }
          
          // 转换为 16 位整数
          const pcm16Data = new Int16Array(pcmData.length);
          for (let i = 0; i < pcmData.length; i++) {
            pcm16Data[i] = Math.max(-1, Math.min(1, pcmData[i])) * 0x7FFF;
          }
          
          // 创建 PCM Blob
          const pcmBlob = new Blob([pcm16Data], { type: 'audio/pcm' });
          resolve(pcmBlob);
        } catch (error) {
          reject(`音频转换错误: ${error}`);
        }
      };
      
      fileReader.onerror = () => {
        reject('文件读取错误');
      };
      
      fileReader.readAsArrayBuffer(blob);
    } catch (error) {
      reject(`音频转换错误: ${error}`);
    }
  });
} 