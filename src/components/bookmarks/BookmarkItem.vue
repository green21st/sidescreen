<template>
  <div 
    class="bookmark-item"
    @click="onClick"
    :style="{ backgroundColor: bookmark.color }"
    :class="{ 'edit-mode': isEditMode }"
  >
    <div class="bookmark-icon">{{ getInitials(bookmark.name) }}</div>
    <div class="bookmark-name">{{ bookmark.name }}</div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { Bookmark } from '../../composables/useBookmarks';

// 定义属性
const props = defineProps<{
  bookmark: Bookmark;
  isEditMode: boolean;
  index: number;
}>();

// 定义事件
const emit = defineEmits<{
  (e: 'open', url: string): void;
  (e: 'remove', index: number): void;
}>();

// 获取网站名称的首字母作为图标
function getInitials(name: string): string {
  if (!name) return '';
  
  // 提取首字母或前两个字符
  if (/^[a-zA-Z]/.test(name)) {
    // 英文名取首字母
    return name.charAt(0).toUpperCase();
  } else {
    // 中文名取第一个字
    return name.charAt(0);
  }
}

// 处理点击事件
function onClick() {
  if (props.isEditMode) {
    emit('remove', props.index);
  } else {
    emit('open', props.bookmark.url);
  }
}
</script>

<style scoped>
.bookmark-item {
  background-color: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  padding: 4px 2px;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
  aspect-ratio: 1;
  min-height: 0;
  overflow: hidden;
}

.bookmark-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.bookmark-icon {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background-color: rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  font-weight: bold;
  color: white;
  margin-top: 8px;
}

.bookmark-name {
  font-size: 12px;
  margin-top: 8px;
  text-align: center;
  width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  padding: 0 4px;
  color: white;
}

.edit-mode {
  position: relative;
}

.edit-mode::before {
  content: "×";
  position: absolute;
  top: 0;
  right: 0;
  background-color: rgba(231, 76, 60, 0.8);
  color: white;
  width: 20px;
  height: 20px;
  border-radius: 0 8px 0 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: bold;
}
</style> 