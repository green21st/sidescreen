<template>
  <div class="bookmarks-container" @dblclick="onDoubleClick">
    <BookmarkItem 
      v-for="(bookmark, index) in bookmarks" 
      :key="index"
      :bookmark="bookmark"
      :isEditMode="isEditMode"
      :index="startIndex + index"
      @open="onOpenBookmark"
      @remove="onRemoveBookmark"
    />
    
    <!-- 添加按钮不受编辑模式影响，始终显示 -->
    <div class="bookmark-item add-bookmark" @click="onAddClick">
      <div class="bookmark-icon">+</div>
      <div class="bookmark-name">添加</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import BookmarkItem from './BookmarkItem.vue';
import BookmarkPagination from './BookmarkPagination.vue';
import { Bookmark } from '../../composables/useBookmarks';

// 定义属性
const props = defineProps<{
  bookmarks: Bookmark[];
  isEditMode: boolean;
  startIndex?: number;
}>();

// 定义事件
const emit = defineEmits<{
  (e: 'open-bookmark', bookmark: Bookmark): void;
  (e: 'remove', id: string): void;
  (e: 'add'): void;
  (e: 'dblclick'): void;
}>();

function onOpenBookmark(url: string) {
  emit('open-bookmark', url);
}

function onRemoveBookmark(index: number) {
  emit('remove', index.toString());
}

function onAddClick() {
  emit('add');
}

function onDoubleClick() {
  // 只有在非编辑模式下才触发游戏
  if (!props.isEditMode) {
    emit('dblclick');
  }
}
</script>

<style scoped>
.bookmarks-container {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  grid-template-rows: repeat(6, 1fr);
  gap: 4px;
  padding: 4px;
  width: 100%;
  height: calc(100% - 40px);
  overflow-y: auto;
}

.add-bookmark {
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

.add-bookmark:hover {
  background-color: rgba(255, 255, 255, 0.1);
  transform: translateY(-2px);
}

.add-bookmark .bookmark-icon {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background-color: rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  color: white;
  margin-top: 8px;
}

.add-bookmark .bookmark-name {
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

/* 响应式布局 */
@media (max-width: 768px) {
  .bookmarks-container {
    grid-template-columns: repeat(3, 1fr);
    grid-template-rows: repeat(8, 1fr);
  }
}

@media (min-width: 1200px) {
  .bookmarks-container {
    grid-template-columns: repeat(6, 1fr);
    grid-template-rows: repeat(4, 1fr);
  }
}
</style> 