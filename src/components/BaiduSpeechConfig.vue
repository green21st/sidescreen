<!-- 百度语音识别配置组件 -->
<template>
  <div class="baidu-speech-config">
    <h3>百度语音识别配置</h3>
    
    <div class="form-group">
      <label for="apiKey">API Key</label>
      <input 
        type="text" 
        id="apiKey" 
        v-model="config.apiKey" 
        placeholder="请输入百度 API Key"
      />
    </div>
    
    <div class="form-group">
      <label for="secretKey">Secret Key</label>
      <input 
        type="text" 
        id="secretKey" 
        v-model="config.secretKey" 
        placeholder="请输入百度 Secret Key"
      />
    </div>
    
    <div class="form-group">
      <label for="appId">App ID (可选)</label>
      <input 
        type="text" 
        id="appId" 
        v-model="config.appId" 
        placeholder="请输入百度 App ID (可选)"
      />
    </div>
    
    <div class="form-group checkbox">
      <input 
        type="checkbox" 
        id="enabled" 
        v-model="config.enabled"
      />
      <label for="enabled">启用百度语音识别</label>
    </div>
    
    <div class="actions">
      <button 
        @click="saveConfig" 
        :disabled="!isValid"
        class="save-button"
      >
        保存配置
      </button>
      <button 
        @click="testConfig" 
        :disabled="!isValid || isTesting"
        class="test-button"
      >
        {{ isTesting ? '测试中...' : '测试连接' }}
      </button>
    </div>
    
    <div v-if="message" :class="['message', messageType]">
      {{ message }}
    </div>
    
    <div class="help-text">
      <p>请在<a href="https://ai.baidu.com/tech/speech" target="_blank">百度智能云</a>申请语音识别服务，获取 API Key 和 Secret Key。</p>
      <p>注意：百度语音识别服务为付费服务，请注意使用额度。</p>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, reactive, computed, ref } from 'vue';
import * as baiduSpeech from '../services/baiduSpeechService';

export default defineComponent({
  name: 'BaiduSpeechConfig',
  
  setup() {
    // 加载配置
    const savedConfig = baiduSpeech.getBaiduSpeechConfig();
    
    // 配置状态
    const config = reactive({
      apiKey: savedConfig.apiKey || '',
      secretKey: savedConfig.secretKey || '',
      appId: savedConfig.appId || '',
      enabled: savedConfig.enabled || false
    });
    
    // 消息状态
    const message = ref('');
    const messageType = ref('');
    const isTesting = ref(false);
    
    // 验证配置是否有效
    const isValid = computed(() => {
      return config.apiKey.trim() !== '' && config.secretKey.trim() !== '';
    });
    
    // 保存配置
    const saveConfig = async () => {
      if (!isValid.value) {
        showMessage('请填写必要的配置信息', 'error');
        return;
      }
      
      try {
        baiduSpeech.saveBaiduSpeechConfig({
          apiKey: config.apiKey.trim(),
          secretKey: config.secretKey.trim(),
          appId: config.appId.trim(),
          enabled: config.enabled
        });
        
        showMessage('配置已保存', 'success');
        
        // 初始化百度语音识别服务
        if (config.enabled) {
          const initialized = await baiduSpeech.initBaiduSpeech();
          if (!initialized) {
            showMessage('配置已保存，但初始化服务失败', 'warning');
          }
        }
      } catch (error) {
        showMessage(`保存配置失败: ${error}`, 'error');
      }
    };
    
    // 测试配置
    const testConfig = async () => {
      if (!isValid.value) {
        showMessage('请填写必要的配置信息', 'error');
        return;
      }
      
      isTesting.value = true;
      showMessage('正在测试连接...', 'info');
      
      try {
        const initialized = await baiduSpeech.initBaiduSpeech({
          apiKey: config.apiKey.trim(),
          secretKey: config.secretKey.trim(),
          appId: config.appId.trim(),
          enabled: true
        });
        
        if (initialized) {
          showMessage('连接测试成功！', 'success');
        } else {
          showMessage('连接测试失败，请检查配置信息', 'error');
        }
      } catch (error) {
        showMessage(`连接测试失败: ${error}`, 'error');
      } finally {
        isTesting.value = false;
      }
    };
    
    // 显示消息
    const showMessage = (text: string, type: 'success' | 'error' | 'warning' | 'info') => {
      message.value = text;
      messageType.value = type;
      
      // 3秒后清除成功消息
      if (type === 'success' || type === 'info') {
        setTimeout(() => {
          if (message.value === text) {
            message.value = '';
          }
        }, 3000);
      }
    };
    
    return {
      config,
      isValid,
      message,
      messageType,
      isTesting,
      saveConfig,
      testConfig
    };
  }
});
</script>

<style scoped>
.baidu-speech-config {
  padding: 15px;
  background-color: #f5f5f5;
  border-radius: 8px;
  margin-bottom: 20px;
}

h3 {
  margin-top: 0;
  margin-bottom: 15px;
  color: #333;
}

.form-group {
  margin-bottom: 15px;
}

label {
  display: block;
  margin-bottom: 5px;
  font-weight: 500;
  color: #555;
}

input[type="text"] {
  width: 100%;
  padding: 8px 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.checkbox {
  display: flex;
  align-items: center;
}

.checkbox label {
  margin-bottom: 0;
  margin-left: 8px;
}

.actions {
  display: flex;
  gap: 10px;
  margin-top: 20px;
}

button {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
  transition: background-color 0.2s;
}

button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.save-button {
  background-color: #4caf50;
  color: white;
}

.save-button:hover:not(:disabled) {
  background-color: #45a049;
}

.test-button {
  background-color: #2196f3;
  color: white;
}

.test-button:hover:not(:disabled) {
  background-color: #0b7dda;
}

.message {
  margin-top: 15px;
  padding: 10px;
  border-radius: 4px;
  font-size: 14px;
}

.success {
  background-color: #dff0d8;
  color: #3c763d;
}

.error {
  background-color: #f2dede;
  color: #a94442;
}

.warning {
  background-color: #fcf8e3;
  color: #8a6d3b;
}

.info {
  background-color: #d9edf7;
  color: #31708f;
}

.help-text {
  margin-top: 20px;
  font-size: 13px;
  color: #666;
}

.help-text a {
  color: #2196f3;
  text-decoration: none;
}

.help-text a:hover {
  text-decoration: underline;
}
</style> 