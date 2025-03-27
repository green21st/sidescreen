<template>
  <div class="pagination-controls" v-if="totalPages > 1">
    <button 
      @click="onPrev" 
      class="pagination-btn" 
      :disabled="currentPage === 1"
      :class="{ 'disabled': currentPage === 1 }"
    >
      &lt;
    </button>
    <span class="page-indicator">{{ currentPage }} / {{ totalPages }}</span>
    <button 
      @click="onNext" 
      class="pagination-btn" 
      :disabled="currentPage === totalPages"
      :class="{ 'disabled': currentPage === totalPages }"
    >
      &gt;
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';

// 定义属性
const props = defineProps<{
  totalItems: number;
  itemsPerPage: number;
  currentPage: number;
}>();

// 定义事件
const emit = defineEmits<{
  (e: 'page-change', page: number): void;
}>();

// 计算总页数
const totalPages = computed(() => {
  return Math.ceil(props.totalItems / props.itemsPerPage);
});

function onPrev() {
  if (props.currentPage > 1) {
    emit('page-change', props.currentPage - 1);
  }
}

function onNext() {
  if (props.currentPage < totalPages.value) {
    emit('page-change', props.currentPage + 1);
  }
}
</script>

<style scoped>
.pagination-controls {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 10px;
  margin-top: 10px;
  padding: 5px 0;
}

.pagination-btn {
  background-color: rgba(255, 255, 255, 0.1);
  color: var(--text-color);
  border: none;
  border-radius: 4px;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
}

.pagination-btn:hover:not(.disabled) {
  background-color: rgba(255, 255, 255, 0.2);
}

.pagination-btn.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.page-indicator {
  font-size: 12px;
  color: var(--text-color);
}
</style> 