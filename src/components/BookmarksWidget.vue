<template>
  <div class="widget bookmarks-widget" :class="{ 'edit-mode': isEditMode }">
    <div v-if="!showGame" class="bookmarks-content">
      <div class="widget-header">
        <h2 class="widget-title">常用网站</h2>
        
        <div class="bookmarks-actions">
          <button @click="toggleEditMode" class="action-btn">
            <span v-if="isEditMode">✓</span>
            <span v-else>✎</span>
          </button>
        </div>
      </div>
      
      <BookmarkList 
        :bookmarks="currentPageBookmarks" 
        :isEditMode="isEditMode"
        :startIndex="currentPageStartIndex"
        @open-bookmark="openBookmark"
        @remove="removeBookmark"
        @add="showAddForm = true"
        @dblclick="toggleGame"
      />
      
      <BookmarkPagination 
        v-if="totalPages > 1"
        :currentPage="currentPage"
        :totalPages="totalPages"
        @prev="prevPage"
        @next="nextPage"
      />
      
      <BookmarkForm 
        v-if="showAddForm" 
        @save="handleAddBookmark"
        @cancel="showAddForm = false"
      />
    </div>
    
    <!-- 英文打字游戏组件 -->
    <div v-if="showGame" class="game-container">
      <TypingGame 
        :isVisible="showGame" 
        @close="closeGame" 
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import BookmarkList from './bookmarks/BookmarkList.vue';
import BookmarkPagination from './bookmarks/BookmarkPagination.vue';
import BookmarkForm from './bookmarks/BookmarkForm.vue';
import TypingGame from './games/TypingGame.vue';
import { useBookmarks, Bookmark } from '../composables/useBookmarks';

// 使用书签管理组合式函数
const { 
  bookmarks,
  isEditMode,
  currentPage,
  totalPages,
  currentPageStartIndex,
  currentPageBookmarks,
  nextPage,
  prevPage,
  openBookmark,
  addBookmark,
  removeBookmark,
  loadBookmarks
} = useBookmarks();

// 表单显示状态
const showAddForm = ref(false);
// 游戏显示状态
const showGame = ref(false);

// 切换编辑模式
function toggleEditMode() {
  isEditMode.value = !isEditMode.value;
}

// 处理添加书签
function handleAddBookmark(bookmark: Bookmark) {
  addBookmark(bookmark);
  showAddForm.value = false;
}

// 切换游戏显示状态
const toggleGame = () => {
  showGame.value = !showGame.value;
};

// 关闭游戏
const closeGame = () => {
  showGame.value = false;
};

// 初始化
onMounted(() => {
  // 加载书签
  loadBookmarks();
});
</script>

<style scoped>
.bookmarks-widget {
  position: relative;
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.bookmarks-content {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.widget-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.widget-title {
  margin: 0;
  font-size: 16px;
  color: var(--text-color);
}

.bookmarks-actions {
  display: flex;
  gap: 4px;
}

.action-btn {
  background-color: rgba(255, 255, 255, 0.1);
  color: var(--text-color);
  border: none;
  border-radius: 6px;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 12px;
  padding: 0;
}

.action-btn:hover {
  background-color: rgba(255, 255, 255, 0.2);
}

.edit-mode .action-btn {
  background-color: var(--accent-color);
}

.game-container {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 0;
  margin: 0;
}

.game-hint {
  font-size: clamp(0.7rem, 1.5vw, 0.9rem);
  opacity: 0.5;
  color: var(--text-color);
  margin-top: 10px;
  text-align: center;
  transition: opacity 0.3s ease;
}

.bookmarks-content:hover .game-hint {
  opacity: 0.8;
}
</style> 