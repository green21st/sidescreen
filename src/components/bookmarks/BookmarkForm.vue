<template>
  <div class="add-bookmark-form">
    <h3 class="form-title">添加新网站</h3>
    
    <div class="form-group">
      <label>网站名称</label>
      <input 
        v-model="form.name" 
        type="text" 
        placeholder="例如：百度"
      />
    </div>
    
    <div class="form-group">
      <label>网站地址</label>
      <input 
        v-model="form.url" 
        type="text" 
        placeholder="例如：https://www.baidu.com"
      />
    </div>
    
    <div class="form-group">
      <label>图标颜色</label>
      <div class="color-picker">
        <div 
          v-for="color in predefinedColors" 
          :key="color"
          class="color-option"
          :style="{ backgroundColor: color }"
          :class="{ selected: form.color === color }"
          @click="form.color = color"
        ></div>
      </div>
    </div>
    
    <div class="form-actions">
      <button @click="onCancel" class="cancel-btn">取消</button>
      <button @click="onSave" class="save-btn" :disabled="!isFormValid">添加</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { Bookmark } from '../../composables/useBookmarks';

// 预定义的颜色选项
const predefinedColors = [
  '#3498db', // 蓝色
  '#2ecc71', // 绿色
  '#e74c3c', // 红色
  '#f39c12', // 橙色
  '#9b59b6', // 紫色
  '#1abc9c', // 青绿色
  '#34495e', // 深蓝灰色
  '#e67e22', // 橙黄色
  '#27ae60', // 深绿色
  '#d35400', // 深橙色
  '#8e44ad', // 深紫色
  '#16a085', // 深青色
  '#2980b9', // 深蓝色
  '#c0392b', // 深红色
  '#f1c40f', // 黄色
  '#7f8c8d', // 灰色
];

// 定义事件
const emit = defineEmits<{
  (e: 'save', bookmark: Bookmark): void;
  (e: 'cancel'): void;
}>();

// 表单数据
const form = ref<Bookmark>({
  name: '',
  url: '',
  color: predefinedColors[0]
});

// 表单验证
const isFormValid = computed(() => {
  return form.value.name.trim() !== '' && 
         form.value.url.trim() !== '' &&
         isValidUrl(form.value.url);
});

// 验证URL格式
function isValidUrl(url: string): boolean {
  try {
    // 如果没有协议，添加 https://
    if (!/^https?:\/\//i.test(url)) {
      url = 'https://' + url;
    }
    new URL(url);
    return true;
  } catch (e) {
    return false;
  }
}

// 保存书签
function onSave() {
  if (!isFormValid.value) return;
  
  // 确保URL有协议前缀
  let url = form.value.url;
  if (!/^https?:\/\//i.test(url)) {
    url = 'https://' + url;
  }
  
  // 发送保存事件
  emit('save', {
    name: form.value.name,
    url: url,
    color: form.value.color
  });
  
  // 重置表单
  form.value = {
    name: '',
    url: '',
    color: predefinedColors[0]
  };
}

// 取消添加
function onCancel() {
  emit('cancel');
}
</script>

<style scoped>
.add-bookmark-form {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 90%;
  max-width: 320px;
  max-height: 90%;
  background-color: var(--widget-color);
  z-index: 10;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 15px;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  overflow-y: auto;
}

.form-title {
  margin: 0;
  padding-bottom: 10px;
  font-size: 16px;
  color: var(--text-color);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  flex-shrink: 0;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex-shrink: 0;
}

.form-group label {
  font-size: 14px;
  color: var(--text-color);
}

.form-group input {
  padding: 8px 12px;
  border-radius: 4px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background-color: rgba(255, 255, 255, 0.1);
  color: var(--text-color);
  font-size: 14px;
}

.form-group input:focus {
  outline: none;
  border-color: var(--accent-color);
  box-shadow: 0 0 0 2px rgba(52, 152, 219, 0.2);
}

.color-picker {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(24px, 1fr));
  gap: 8px;
  margin-top: 5px;
  padding: 8px;
  background-color: rgba(255, 255, 255, 0.05);
  border-radius: 4px;
}

.color-option {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 2px solid transparent;
}

.color-option:hover {
  transform: scale(1.1);
}

.color-option.selected {
  border-color: white;
  transform: scale(1.1);
  box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.2);
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 15px;
  padding-top: 15px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  flex-shrink: 0;
}

.cancel-btn, .save-btn {
  padding: 8px 20px;
  border-radius: 4px;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 14px;
  min-width: 80px;
}

.cancel-btn {
  background-color: rgba(255, 255, 255, 0.1);
  color: var(--text-color);
}

.save-btn {
  background-color: var(--accent-color);
  color: white;
  font-weight: 500;
}

.save-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.cancel-btn:hover {
  background-color: rgba(255, 255, 255, 0.2);
}

.save-btn:not(:disabled):hover {
  filter: brightness(1.1);
}

/* 响应式调整 */
@media (max-width: 480px) {
  .add-bookmark-form {
    width: 95%;
    padding: 15px;
  }

  .form-actions {
    margin-top: 10px;
    padding-top: 10px;
  }

  .cancel-btn, .save-btn {
    padding: 8px 15px;
    min-width: 70px;
  }
}

/* 添加遮罩层 */
.add-bookmark-form::before {
  content: '';
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: -1;
}
</style> 