<template>
  <div class="widget notes-widget" @dblclick="handleWidgetDoubleClick">
    <h2 v-if="!showGame" class="widget-header">笔记</h2>
    <div class="widget-content">
      <div v-if="!showGame" class="notes-content">
        <div class="notes-form">
          <div class="input-container">
            <textarea 
              v-model="newNote" 
              placeholder="写点什么..." 
              class="notes-input"
              ref="notesTextarea"
              @dblclick.stop
            ></textarea>
            <button 
              @click="toggleSpeechRecognition" 
              class="speech-btn"
              :class="{ 
                'recording': isRecording, 
                'disabled': !speechRecognitionAvailable && !useLocalRecording && !useSpeechService
              }"
              :title="getSpeechButtonTitle()"
            >
              <span v-if="isRecording" class="recording-indicator"></span>
              🎤
            </button>
          </div>
          <div class="form-actions">
            <div class="speech-status" v-if="isRecording">
              正在录音... <span class="recording-time">{{ recordingTime }}s</span>
            </div>
            <div class="speech-error" v-if="recognitionError && !isRecording">
              {{ getErrorMessage(recognitionError) }}
            </div>
            <div class="action-buttons">
              <button @click="addNote" class="notes-add-btn primary-btn">保存</button>
            </div>
          </div>
        </div>
        
        <div class="notes-list" v-if="notes.length > 0">
          <div 
            v-for="note in notes" 
            :key="note.id" 
            class="note-item fade-in"
            @dblclick.stop
          >
            <div class="note-content">{{ note.content }}</div>
            <div class="note-footer">
              <div class="note-timestamp">{{ formatDate(note.timestamp) }}</div>
              <button @click="removeNote(note.id)" class="note-delete-btn danger-btn">
                删除
              </button>
            </div>
          </div>
        </div>
        
        <div v-else class="notes-empty">
          <div class="empty-icon">📋</div>
          <div>没有笔记</div>
        </div>
      </div>
      
      <!-- 俄罗斯方块游戏组件 -->
      <div v-if="showGame" class="game-container">
        <TetrisGame 
          :isVisible="showGame" 
          @close="closeGame" 
        />
      </div>
    </div>
    
    <!-- 语音识别不可用时的提示 -->
    <div v-if="showSpeechUnavailableModal" class="speech-unavailable-modal">
      <div class="modal-content">
        <h3>语音识别服务不可用</h3>
        <p>{{ speechUnavailableReason }}</p>
        <div class="modal-actions">
          <button @click="showSpeechUnavailableModal = false" class="primary-btn">确定</button>
        </div>
      </div>
    </div>
    
    <!-- 录音完成后的提示 -->
    <div v-if="showRecordingModal" class="speech-unavailable-modal">
      <div class="modal-content">
        <h3>录音完成</h3>
        <p>由于语音识别服务不可用，您可以：</p>
        <div class="recording-actions">
          <button @click="playRecording" class="secondary-btn">
            <span>🔊</span> 播放录音
          </button>
          <button @click="saveRecordingToNote" class="primary-btn">
            手动输入文字
          </button>
        </div>
        <div class="modal-actions">
          <button @click="showRecordingModal = false" class="danger-btn">关闭</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch } from 'vue';
// 导入讯飞语音识别服务
import * as iflytekSpeech from '../services/iflytekSpeechService';
// 导入本地语音输入服务
import * as localSpeech from '../services/localSpeechService';
// 导入俄罗斯方块游戏组件
import TetrisGame from './games/TetrisGame.vue';

// 语音识别接口声明
declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
    electronAPI?: {
      requestMicrophonePermission: () => Promise<boolean>;
      checkMicrophonePermission: () => Promise<boolean>;
      testSpeechRecognition: () => Promise<{ available: boolean; message?: string; reason?: string }>;
      logDebug: (message: string) => void;
    };
  }
}

interface Note {
  id: number;
  content: string;
  timestamp: Date;
}

interface SpeechConfig {
  appId: string;
  apiKey: string;
  apiSecret: string;
  enabled: boolean;
}

const props = defineProps<{
  notes: Note[];
  speechConfig: SpeechConfig;
}>();

const emit = defineEmits<{
  (e: 'add-note', content: string): void;
  (e: 'remove-note', id: number): void;
}>();

const newNote = ref('');
const notesTextarea = ref<HTMLTextAreaElement | null>(null);
const isRecording = ref(false);
const recordingTime = ref(0);
const recordingTimer = ref<number | null>(null);
const recognitionError = ref<string | null>(null);
const isNetworkAvailable = ref(navigator.onLine);
const speechRecognitionAvailable = ref(true);
const speechUnavailableReason = ref('');
const showSpeechUnavailableModal = ref(false);
const speechRecognitionTested = ref(false);
const useLocalRecording = ref(false);
const recordingBlob = ref<Blob | null>(null);
const showRecordingModal = ref(false);

// 语音识别相关
let recognition: SpeechRecognition | null = null;
let recognitionTimeout: number | null = null;
let speechRecognitionInstance: { stop: () => void } | null = null;
let useSpeechService = false; // 是否使用语音识别服务

// 游戏相关状态
const showGame = ref(false);

// 检查是否在 Electron 环境中
const isElectron = () => {
  return window && (window.process?.type || window.electronAPI);
};

// 记录调试信息
const logDebug = (message: string) => {
  console.log(`[NotesWidget] ${message}`);
  if (window.electronAPI?.logDebug) {
    window.electronAPI.logDebug(`[NotesWidget] ${message}`);
  }
};

// 获取语音按钮提示文本
const getSpeechButtonTitle = () => {
  if (!speechRecognitionAvailable.value && !useLocalRecording.value && !useSpeechService) {
    return '语音识别不可用';
  }
  return isRecording.value ? '停止录音' : '语音输入';
};

// 获取错误消息
const getErrorMessage = (error: string) => {
  switch (error) {
    case 'network':
      return '网络错误，语音识别服务不可用';
    case 'not-allowed':
      return '麦克风访问被拒绝';
    case 'audio-capture':
      return '无法捕获音频，请检查麦克风设备';
    case 'aborted':
      return '语音识别已中止';
    case 'no-speech':
      return '未检测到语音';
    default:
      return `语音识别错误: ${error}`;
  }
};

// 测试语音识别可用性
const testSpeechRecognition = async () => {
  if (speechRecognitionTested.value) {
    return;
  }
  
  logDebug('Testing speech recognition availability');
  speechRecognitionTested.value = true;
  
  // 检查是否支持本地录音
  const localRecordingSupported = localSpeech.checkMicrophonePermission();
  logDebug(`Local recording supported: ${localRecordingSupported}`);
  
  // 如果支持本地录音，即使语音识别不可用，也可以使用麦克风按钮
  if (await localRecordingSupported) {
    useLocalRecording.value = true;
  }
  
  // 检查网络连接
  if (!navigator.onLine) {
    logDebug('Network is offline, speech recognition unavailable');
    speechRecognitionAvailable.value = false;
    speechUnavailableReason.value = '网络连接不可用，语音识别需要网络连接';
    return;
  }
  
  // 在 Electron 环境中使用主进程测试
  if (isElectron() && window.electronAPI?.testSpeechRecognition) {
    try {
      const result = await window.electronAPI.testSpeechRecognition();
      logDebug(`Speech recognition test result: ${JSON.stringify(result)}`);
      
      if (!result.available) {
        speechRecognitionAvailable.value = false;
        speechUnavailableReason.value = result.message || '语音识别服务不可用';
        
        if (result.reason === 'google_blocked') {
          logDebug('Google services blocked, speech recognition unavailable');
          speechUnavailableReason.value = '在中国大陆地区，谷歌语音识别服务可能无法访问。请使用讯飞语音识别服务。';
        }
      }
    } catch (error) {
      logDebug(`Speech recognition test error: ${error}`);
      speechRecognitionAvailable.value = true; // 假设可用，避免误报
    }
  } else {
    // 在浏览器环境中尝试创建实例测试
    try {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) {
        logDebug('SpeechRecognition API not supported');
        speechRecognitionAvailable.value = false;
        speechUnavailableReason.value = '您的浏览器不支持语音识别功能';
        return;
      }
      
      // 尝试创建实例
      const testRecognition = new SpeechRecognition();
      testRecognition.lang = 'zh-CN';
      
      // 设置超时
      const timeout = setTimeout(() => {
        logDebug('Speech recognition test timed out');
        speechRecognitionAvailable.value = true; // 假设可用，避免误报
      }, 3000);
      
      // 设置错误处理
      testRecognition.onerror = (event) => {
        clearTimeout(timeout);
        logDebug(`Speech recognition test error: ${event.error}`);
        
        if (event.error === 'network') {
          speechRecognitionAvailable.value = false;
          speechUnavailableReason.value = '网络错误，语音识别服务不可用。在中国大陆地区，此功能可能受限。请使用讯飞语音识别服务。';
        } else if (event.error === 'not-allowed') {
          speechRecognitionAvailable.value = false;
          speechUnavailableReason.value = '麦克风访问被拒绝，请检查权限设置';
        } else {
          // 其他错误暂时认为可用，避免误报
          speechRecognitionAvailable.value = true;
        }
      };
      
      // 设置结束处理
      testRecognition.onend = () => {
        clearTimeout(timeout);
        logDebug('Speech recognition test ended');
      };
      
      // 尝试启动
      try {
        testRecognition.start();
        setTimeout(() => {
          try {
            testRecognition.stop();
          } catch (e) {
            // 忽略停止错误
          }
        }, 1000);
      } catch (error) {
        clearTimeout(timeout);
        logDebug(`Error starting test recognition: ${error}`);
        // 启动失败，但仍然假设可用，避免误报
        speechRecognitionAvailable.value = true;
      }
    } catch (error) {
      logDebug(`Error in speech recognition test: ${error}`);
      speechRecognitionAvailable.value = true; // 假设可用，避免误报
    }
  }
};

// 使用 Electron API 请求麦克风权限
const requestElectronMicrophonePermission = async () => {
  logDebug('Requesting Electron microphone permission');
  if (window.electronAPI && window.electronAPI.requestMicrophonePermission) {
    try {
      const result = await window.electronAPI.requestMicrophonePermission();
      logDebug(`Electron microphone permission result: ${JSON.stringify(result)}`);
      return result.granted;
    } catch (error) {
      logDebug(`Electron microphone permission request failed: ${error}`);
      return false;
    }
  }
  return false;
};

// 检查 Electron 麦克风权限
const checkElectronMicrophonePermission = async () => {
  logDebug('Checking Electron microphone permission');
  if (window.electronAPI && window.electronAPI.checkMicrophonePermission) {
    try {
      const result = await window.electronAPI.checkMicrophonePermission();
      logDebug(`Electron microphone permission status: ${JSON.stringify(result)}`);
      return result.status === 'granted';
    } catch (error) {
      logDebug(`Electron microphone permission check failed: ${error}`);
      return false;
    }
  }
  return false;
};

// 初始化语音识别
const initSpeechRecognition = () => {
  try {
    logDebug('Initializing speech recognition');
    
    // 检查浏览器是否支持语音识别
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      logDebug('SpeechRecognition API not supported');
      return false;
    }
    
    logDebug('Creating SpeechRecognition instance');
    recognition = new SpeechRecognition();
    
    // 配置语音识别
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'zh-CN'; // 设置语言为中文
    recognition.maxAlternatives = 1;
    
    // 处理识别结果
    recognition.onresult = (event) => {
      logDebug(`Recognition result received: ${event.results.length} results`);
      let interimTranscript = '';
      let finalTranscript = '';
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        logDebug(`Transcript ${i}: ${transcript} (confidence: ${event.results[i][0].confidence})`);
        
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }
      
      // 将识别结果添加到文本框
      if (finalTranscript) {
        logDebug(`Adding final transcript to note: ${finalTranscript}`);
        newNote.value += finalTranscript;
      }
    };
    
    // 处理错误
    recognition.onerror = (event) => {
      logDebug(`Speech recognition error: ${event.error}`);
      recognitionError.value = event.error;
      
      if (event.error === 'not-allowed') {
        alert('麦克风访问被拒绝，请检查权限设置');
      } else if (event.error === 'no-speech') {
        logDebug('No speech detected');
        // 无语音输入，可能是麦克风没有接收到声音
        // 不需要停止录音，继续等待
        return;
      } else if (event.error === 'audio-capture') {
        alert('无法捕获音频，请检查麦克风设备');
      } else if (event.error === 'network') {
        // 网络错误处理改进
        logDebug('Network error detected, speech recognition service unavailable');
        
        // 显示错误提示模态框
        speechUnavailableReason.value = '网络错误，语音识别服务不可用。\n在中国大陆地区，此功能可能受限。';
        showSpeechUnavailableModal.value = true;
        
        // 检查是否在线
        if (!navigator.onLine) {
          speechUnavailableReason.value = '您当前处于离线状态，语音识别需要网络连接';
        }
        
        // 尝试切换到备用服务
        // if (!useSpeechService) {
        //   logDebug('Attempting to switch to iFlytek speech service');
        //   useSpeechService = true;
        //   stopRecording();
        //   setTimeout(() => {
        //     startRecording();
        //   }, 500);
        //   return;
        // }
      } else if (event.error === 'aborted') {
        logDebug('Speech recognition aborted');
        // 用户或系统中止了语音识别，不需要显示错误
      } else {
        // 显示错误提示模态框
        speechUnavailableReason.value = `语音识别错误: ${event.error}`;
        showSpeechUnavailableModal.value = true;
      }
      
      stopRecording();
    };
    
    // 处理识别开始
    recognition.onstart = () => {
      logDebug('Speech recognition started');
      isRecording.value = true;
      recognitionError.value = null;
    };
    
    // 处理识别结束
    recognition.onend = () => {
      logDebug('Speech recognition ended');
      
      // 如果是主动停止，则不重新开始
      if (!isRecording.value || recognitionError.value) {
        stopRecording();
        return;
      }
      
      // 设置一个短暂的延迟，避免立即重启可能导致的问题
      if (recognitionTimeout) {
        clearTimeout(recognitionTimeout);
      }
      
      recognitionTimeout = window.setTimeout(() => {
        try {
          if (isRecording.value && recognition) {
            recognition.start();
            logDebug('Recognition restarted');
          }
        } catch (error) {
          logDebug(`Error restarting recognition: ${error}`);
          stopRecording();
        }
      }, 300);
    };
    
    logDebug('Speech recognition initialized successfully');
    return true;
  } catch (error) {
    logDebug(`Error initializing speech recognition: ${error}`);
    return false;
  }
};

// 开始本地录音
const startLocalRecording = async () => {
  logDebug('Starting local recording');
  
  try {
    await localSpeech.startRecording({
      onStart: () => {
        isRecording.value = true;
        recordingTime.value = 0;
        
        // 开始计时
        if (recordingTimer.value) {
          clearInterval(recordingTimer.value);
        }
        
        recordingTimer.value = window.setInterval(() => {
          recordingTime.value++;
          
          // 如果录音时间超过60秒，自动停止
          if (recordingTime.value >= 60) {
            logDebug('Recording time limit reached (60s), stopping');
            stopLocalRecording();
          }
        }, 1000);
      },
      onStop: (state) => {
        isRecording.value = false;
        
        // 清除计时器
        if (recordingTimer.value) {
          clearInterval(recordingTimer.value);
          recordingTimer.value = null;
        }
        
        // 保存录音 Blob
        if (state.audioBlob) {
          recordingBlob.value = state.audioBlob;
          showRecordingModal.value = true;
        }
      },
      onError: (error) => {
        logDebug(`Local recording error: ${error}`);
        recognitionError.value = 'local-recording-error';
        
        // 显示错误提示
        speechUnavailableReason.value = error;
        showSpeechUnavailableModal.value = true;
        
        stopLocalRecording();
      }
    });
  } catch (error) {
    logDebug(`Error starting local recording: ${error}`);
    recognitionError.value = 'local-recording-error';
    
    // 显示错误提示
    speechUnavailableReason.value = `启动录音失败: ${error}`;
    showSpeechUnavailableModal.value = true;
  }
};

// 停止本地录音
const stopLocalRecording = () => {
  logDebug('Stopping local recording');
  
  localSpeech.stopRecording();
  
  isRecording.value = false;
  
  // 清除计时器
  if (recordingTimer.value) {
    clearInterval(recordingTimer.value);
    recordingTimer.value = null;
  }
};

// 播放录音
const playRecording = () => {
  if (recordingBlob.value) {
    localSpeech.playRecording(recordingBlob.value);
  }
};

// 保存录音
const saveRecordingToNote = () => {
  // 这里我们只是提示用户手动输入，因为我们没有实际的语音识别功能
  showRecordingModal.value = false;
};

// 开始讯飞语音识别
const startSpeechRecognition = async () => {
  try {
    logDebug('Starting iFlytek speech recognition');
    isRecording.value = true;
    recordingTime.value = 0;
    recognitionError.value = null;
    
    // 开始计时
    if (recordingTimer.value) {
      clearInterval(recordingTimer.value);
    }
    
    recordingTimer.value = window.setInterval(() => {
      recordingTime.value++;
      
      // 如果录音时间超过60秒，自动停止
      if (recordingTime.value >= 60) {
        logDebug('Recording time limit reached (60s), stopping');
        stopRecording();
      }
    }, 1000);
    
    // 开始讯飞语音识别
    speechRecognitionInstance = await iflytekSpeech.startRecognition({
      onStart: () => {
        logDebug('iFlytek speech recognition started');
      },
      onStop: () => {
        logDebug('iFlytek speech recognition stopped');
        stopRecording();
      },
      onResult: (text, isFinal) => {
        logDebug(`Received recognition result: ${text} (${isFinal ? 'final' : 'interim'})`);
        // 不管是否是最终结果，都更新输入框
        const textarea = notesTextarea.value;
        if (textarea) {
          const start = textarea.selectionStart || 0;
          const end = textarea.selectionEnd || 0;
          const content = newNote.value;
          newNote.value = content.substring(0, start) + text + content.substring(end);
          // 更新光标位置
          setTimeout(() => {
            textarea.selectionStart = textarea.selectionEnd = start + text.length;
            textarea.focus();
          }, 0);
        } else {
          // 如果无法获取光标位置，直接追加到末尾
          newNote.value += text;
        }
      },
      onError: (error) => {
        logDebug(`iFlytek speech recognition error: ${error}`);
        recognitionError.value = error;
        stopRecording();
      }
    });
  } catch (error) {
    logDebug(`Error in startSpeechRecognition: ${error}`);
    recognitionError.value = String(error);
    stopRecording();
  }
};

// 开始录音
const startRecording = async () => {
  logDebug('Starting recording');
  
  // 如果使用本地录音
  if (useLocalRecording.value && !speechRecognitionAvailable.value) {
    startLocalRecording();
    return;
  }
  
  // 如果使用讯飞语音识别服务
  if (useSpeechService) {
    logDebug('Using iFlytek speech service');
    if (props.speechConfig.enabled && props.speechConfig.appId && props.speechConfig.apiKey) {
      await startSpeechRecognition();
      return;
    } else {
      logDebug('iFlytek speech service is not available');
      useSpeechService = false;
    }
  }
  
  // 如果语音识别不可用，显示提示
  if (!speechRecognitionAvailable.value) {
    logDebug('Speech recognition not available');
    showSpeechUnavailableModal.value = true;
    return;
  }
  
  // 检查网络连接
  if (!navigator.onLine) {
    speechUnavailableReason.value = '您当前处于离线状态，语音识别需要网络连接';
    showSpeechUnavailableModal.value = true;
    logDebug('Cannot start recording: offline');
    return;
  }
  
  // 使用 Web Speech API
  if (!recognition && !initSpeechRecognition()) {
    speechUnavailableReason.value = '您的浏览器不支持语音识别功能或麦克风访问被拒绝';
    showSpeechUnavailableModal.value = true;
    logDebug('Failed to initialize speech recognition');
    return;
  }
  
  try {
    // 在 Electron 环境中，先确保有麦克风权限
    if (isElectron() && window.electronAPI) {
      const hasPermission = await requestElectronMicrophonePermission();
      if (!hasPermission) {
        recognitionError.value = 'not-allowed';
        logDebug('Microphone permission denied in Electron');
        return;
      }
    }
    
    // 开始语音识别
    startSpeechRecognition();
  } catch (error) {
    logDebug(`Error starting recording: ${error}`);
    speechUnavailableReason.value = '启动语音识别失败，请检查麦克风权限';
    showSpeechUnavailableModal.value = true;
  }
};

// 停止录音
const stopRecording = () => {
  logDebug('Stopping recording');
  
  // 防止重复执行
  if (!isRecording.value) {
    return;
  }
  
  isRecording.value = false;
  
  // 清除计时器
  if (recordingTimer.value) {
    clearInterval(recordingTimer.value);
    recordingTimer.value = null;
  }
  
  // 根据当前使用的服务来停止
  if (useSpeechService && speechRecognitionInstance) {
    try {
      speechRecognitionInstance.stop();
      speechRecognitionInstance = null;
    } catch (error) {
      logDebug(`Error stopping iFlytek speech recognition: ${error}`);
    }
  } else if (recognition) {
    try {
      recognition.stop();
    } catch (error) {
      logDebug(`Error stopping Web Speech API recording: ${error}`);
    }
  } else if (useLocalRecording.value) {
    stopLocalRecording();
  }
};

// 切换语音识别状态
const toggleSpeechRecognition = () => {
  // 如果既不支持语音识别也不支持本地录音
  if (!speechRecognitionAvailable.value && !useLocalRecording.value && !useSpeechService) {
    showSpeechUnavailableModal.value = true;
    return;
  }
  
  if (isRecording.value) {
    logDebug('Toggling speech recognition: stopping');
    stopRecording();
  } else {
    logDebug('Toggling speech recognition: starting');
    startRecording();
  }
};

const addNote = () => {
  if (newNote.value.trim()) {
    emit('add-note', newNote.value.trim());
    newNote.value = '';
    
    // 如果正在录音，停止录音
    if (isRecording.value) {
      stopRecording();
    }
  }
};

const removeNote = (id: number) => {
  emit('remove-note', id);
};

const formatDate = (date: Date) => {
  return new Date(date).toLocaleString('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// 监听语音识别配置变化
watch(() => props.speechConfig, async (newConfig) => {
  if (newConfig) {
    logDebug(`Speech config changed: enabled=${newConfig.enabled}`);
    
    // 初始化讯飞语音识别服务
    if (newConfig.enabled && newConfig.appId && newConfig.apiKey) {
      try {
        const initialized = await iflytekSpeech.init({
          appId: newConfig.appId,
          apiKey: newConfig.apiKey,
          apiSecret: newConfig.apiSecret,
          enabled: newConfig.enabled
        });
        useSpeechService = initialized;
        logDebug(`iFlytek speech service initialized: ${initialized}`);
      } catch (error) {
        logDebug(`Error initializing iFlytek speech service: ${error}`);
        useSpeechService = false;
      }
    } else {
      useSpeechService = false;
    }
  }
}, { immediate: true, deep: true });

// 切换游戏显示状态
const toggleGame = () => {
  showGame.value = !showGame.value;
};

// 处理组件双击事件
const handleWidgetDoubleClick = (event) => {
  // 检查事件源是否是文本区域或笔记项
  const isTextarea = event.target.tagName === 'TEXTAREA';
  const isNoteItem = event.target.closest('.note-item');
  
  // 如果双击的是文本区域或笔记项，不触发游戏
  if (isTextarea || isNoteItem) {
    return;
  }
  
  // 切换游戏显示
  toggleGame();
};

// 关闭游戏
const closeGame = () => {
  showGame.value = false;
};

// 组件挂载时检查麦克风权限
onMounted(async () => {
  logDebug('Component mounted');
  
  // 设置网络监听
  setupNetworkListeners();
  
  // 测试语音识别可用性
  await testSpeechRecognition();
  
  // 在 Electron 环境中，预先检查麦克风权限
  if (isElectron()) {
    logDebug('In Electron environment, checking microphone permission');
    
    if (window.electronAPI) {
      // 使用 Electron API 检查权限
      const hasPermission = await checkElectronMicrophonePermission();
      logDebug(`Electron microphone permission check result: ${hasPermission}`);
    } else {
      // 回退到标准 Web API
      try {
        const permissionStatus = await navigator.permissions?.query({ name: 'microphone' as PermissionName });
        logDebug(`Web API microphone permission status: ${permissionStatus?.state}`);
      } catch (err) {
        logDebug(`Error querying microphone permission: ${err}`);
      }
    }
  }
  
  // 预初始化语音识别
  try {
    const initialized = initSpeechRecognition();
    logDebug(`Speech recognition pre-initialization: ${initialized ? 'successful' : 'failed'}`);
  } catch (error) {
    logDebug(`Error pre-initializing speech recognition: ${error}`);
  }
});

// 组件卸载时清理资源
onUnmounted(() => {
  logDebug('Component unmounting, cleaning up resources');
  
  if (isRecording.value) {
    stopRecording();
  }
  
  if (recordingTimer.value) {
    clearInterval(recordingTimer.value);
    recordingTimer.value = null;
  }
  
  if (recognitionTimeout) {
    clearTimeout(recognitionTimeout);
    recognitionTimeout = null;
  }
  
  // 确保释放语音识别资源
  if (recognition) {
    try {
      recognition.abort();
      logDebug('Recognition aborted');
    } catch (error) {
      logDebug(`Error aborting recognition: ${error}`);
    }
    recognition = null;
  }
  
  // 移除网络监听器
  window.removeEventListener('online', () => {});
  window.removeEventListener('offline', () => {});
});
</script>

<style scoped>
.notes-widget {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 10px;
  min-height: 200px;
  position: relative;
  cursor: default;
}

.widget-header {
  margin-top: 0;
  margin-bottom: 10px;
  font-size: clamp(1rem, 1.5vw, 1.2rem);
  border-bottom: 1px solid var(--accent-color);
  padding-bottom: 5px;
  flex-shrink: 0;
}

.widget-content {
  display: flex;
  flex-direction: column;
  flex: 1;
  overflow: hidden;
}

.notes-content {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
}

.notes-form {
  display: flex;
  flex-direction: column;
  margin-bottom: 10px;
  flex-shrink: 0;
}

.input-container {
  position: relative;
  width: 100%;
  margin-bottom: 5px;
}

.notes-input {
  width: 100%;
  height: clamp(50px, 10vh, 80px);
  padding: 8px;
  padding-right: 40px; /* 为语音按钮留出空间 */
  border: 1px solid rgba(255, 255, 255, 0.3);
  background-color: rgba(var(--widget-rgb), 0.3);
  color: var(--text-color);
  border-radius: 4px;
  resize: vertical;
  font-size: clamp(0.8rem, 1.2vw, 0.9rem);
  box-sizing: border-box;
}

.notes-input::placeholder {
  color: rgba(255, 255, 255, 0.6);
}

.speech-btn {
  position: absolute;
  right: 8px;
  top: 8px;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background-color: rgba(255, 255, 255, 0.1);
  border: none;
  color: var(--text-color);
  font-size: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
}

.speech-btn:hover {
  background-color: rgba(255, 255, 255, 0.2);
}

.speech-btn.recording {
  background-color: rgba(231, 76, 60, 0.7);
  animation: pulse 1.5s infinite;
}

.recording-indicator {
  position: absolute;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: #e74c3c;
  top: 0;
  right: 0;
}

.form-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 5px;
}

.action-buttons {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-left: auto;
}

.speech-status {
  font-size: 12px;
  color: var(--text-color);
  display: flex;
  align-items: center;
}

.recording-time {
  margin-left: 5px;
  font-weight: bold;
  color: #e74c3c;
}

.notes-add-btn {
  padding: 8px 15px;
  background-color: var(--accent-color);
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: clamp(0.8rem, 1vw, 0.9rem);
}

.notes-list {
  flex: 1;
  overflow-y: auto;
  padding-right: 5px;
  min-height: 50px;
}

.note-item {
  padding: 12px;
  margin-bottom: 12px;
  background-color: rgba(255, 255, 255, 0.05);
  border-radius: 4px;
  transition: all 0.3s ease;
  border-left: 3px solid var(--accent-color);
  height: fit-content;
}

.note-item:hover {
  background-color: rgba(255, 255, 255, 0.1);
  transform: translateX(2px);
}

.note-content {
  margin-bottom: 10px;
  white-space: pre-wrap;
  line-height: 1.4;
  color: var(--text-color);
  font-size: clamp(0.8rem, 1.2vw, 0.9rem);
  word-break: break-word;
}

.note-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: clamp(0.7rem, 1vw, 0.8rem);
  color: var(--text-color);
  opacity: 0.7;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  padding-top: 8px;
}

.note-delete-btn {
  background: none;
  border: none;
  color: #ff6b6b;
  cursor: pointer;
  font-size: clamp(0.7rem, 1vw, 0.8rem);
  padding: 4px 8px;
}

.notes-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  color: var(--text-color);
  opacity: 0.6;
}

.empty-icon {
  font-size: clamp(1.5rem, 3vw, 2rem);
  margin-bottom: 10px;
  opacity: 0.7;
}

.game-hint {
  margin-top: 10px;
  font-size: 0.8rem;
  opacity: 0.7;
  color: var(--accent-color);
}

/* 游戏容器 */
.game-container {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 0;
  margin: 0;
}

/* 录音动画 */
@keyframes pulse {
  0% {
    box-shadow: 0 0 0 0 rgba(231, 76, 60, 0.4);
  }
  70% {
    box-shadow: 0 0 0 10px rgba(231, 76, 60, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(231, 76, 60, 0);
  }
}

/* 主题适配 */
:deep(.theme-light) .notes-input,
:deep(.theme-github) .notes-input {
  background-color: rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(0, 0, 0, 0.1);
  color: #000000;
}

:deep(.theme-light) .notes-input::placeholder,
:deep(.theme-github) .notes-input::placeholder {
  color: #666;
}

:deep(.theme-light) .note-item,
:deep(.theme-github) .note-item {
  background-color: rgba(0, 0, 0, 0.03);
  color: #000000;
}

:deep(.theme-light) .note-content,
:deep(.theme-github) .note-content {
  color: #000000;
}

:deep(.theme-light) .note-footer,
:deep(.theme-github) .note-footer {
  color: #000000;
}

:deep(.theme-light) .notes-empty,
:deep(.theme-github) .notes-empty {
  color: #000000;
}

:deep(.theme-light) .speech-btn,
:deep(.theme-github) .speech-btn {
  background-color: rgba(0, 0, 0, 0.1);
  color: #000000;
}

:deep(.theme-light) .speech-status,
:deep(.theme-github) .speech-status {
  color: #000000;
}

/* 响应式调整 */
@media (max-width: 768px) {
  .notes-widget {
    padding: 5px;
    min-height: 150px;
  }
  
  .notes-input {
    height: 50px;
  }
}

@media (orientation: portrait) {
  .notes-widget {
    min-height: 300px;
  }
  
  .notes-input {
    height: clamp(50px, 10vh, 70px);
  }
  
  .notes-list {
    min-height: 100px;
  }
}

/* 横屏模式特别处理 */
@media (orientation: landscape) {
  .notes-widget {
    min-height: 250px;
    max-height: 100%;
  }
  
  .notes-list {
    overflow-y: auto;
  }
}

.speech-btn.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.speech-error {
  font-size: 12px;
  color: #e74c3c;
  margin-right: 10px;
}

/* 语音识别不可用模态框 */
.speech-unavailable-modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background-color: var(--widget-bg-color);
  border-radius: 8px;
  padding: 20px;
  width: 80%;
  max-width: 400px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
}

.modal-content h3 {
  margin-top: 0;
  color: var(--text-color);
  border-bottom: 1px solid var(--accent-color);
  padding-bottom: 10px;
}

.modal-content p {
  margin: 15px 0;
  color: var(--text-color);
  line-height: 1.5;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 20px;
}

.modal-actions button {
  padding: 8px 15px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.recording-actions {
  display: flex;
  justify-content: space-between;
  margin: 20px 0;
}

.recording-actions button {
  padding: 8px 15px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.recording-actions button span {
  margin-right: 5px;
}

.secondary-btn {
  background-color: rgba(var(--accent-rgb), 0.2);
  color: var(--accent-color);
}

.secondary-btn:hover {
  background-color: rgba(var(--accent-rgb), 0.3);
}
</style>

<script lang="ts">
// 为TypeScript添加SpeechRecognition类型声明
declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
    electronAPI?: {
      sendReady: () => void;
      requestGC: () => void;
      setLowMemoryMode: (enabled: boolean) => void;
      onMemoryPressure: (callback: (data: any) => void) => void;
      onVisibilityChange: (callback: (state: string) => void) => void;
      getSystemInfo: () => any;
      requestMicrophonePermission: () => Promise<{granted: boolean, status: string}>;
      checkMicrophonePermission: () => Promise<{status: string}>;
      testSpeechRecognition: () => Promise<{available: boolean, reason?: string, message?: string}>;
      logDebug: (message: string) => void;
    };
    process?: {
      type: string;
    };
  }
}
</script> 