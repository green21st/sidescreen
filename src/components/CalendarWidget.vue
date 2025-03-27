<template>
  <div class="widget calendar-widget">
    <div v-if="!showGame" class="calendar-content" @dblclick="toggleGame">
      <h2>日历</h2>
      
      <div class="calendar-header">
        <button @click="prevMonth" class="calendar-nav-btn">&lt;</button>
        <div class="calendar-title">{{ currentMonthName }} {{ currentYear }}</div>
        <button @click="nextMonth" class="calendar-nav-btn">&gt;</button>
      </div>
      
      <div class="calendar-weekdays">
        <div v-for="day in weekdays" :key="day" class="calendar-weekday">
          {{ day }}
        </div>
      </div>
      
      <div class="calendar-days">
        <div 
          v-for="day in calendarDays" 
          :key="day.date" 
          class="calendar-day"
          :class="{
            'other-month': !day.currentMonth,
            'today': day.isToday,
            'has-events': day.hasEvents,
            'selected': isSelectedDay(day.date)
          }"
          @click="selectDay(day)"
        >
          <span class="day-number">{{ day.date.getDate() }}</span>
          <div v-if="day.hasEvents" class="event-indicator">
            <span class="event-dot"></span>
            <span v-if="countEventsOnDay(day.date) > 1" class="event-count">{{ countEventsOnDay(day.date) }}</span>
          </div>
        </div>
      </div>
      
      <div v-if="selectedDate" class="calendar-event-form">
        <h3>{{ formatSelectedDate }}</h3>
        <div class="event-input-group">
          <input 
            v-model="newEventTitle"
            type="text"
            placeholder="添加提醒事项..."
            class="event-input"
            @keyup.enter="addEvent"
          />
          <input 
            v-model="newEventTime"
            type="time"
            class="event-time-input"
          />
          <button @click="addEvent" class="event-add-btn">添加</button>
        </div>
      </div>
      
      <div v-if="selectedDayEvents.length > 0" class="calendar-events">
        <div 
          v-for="event in selectedDayEvents" 
          :key="event.id" 
          class="calendar-event"
        >
          <div class="event-time" v-if="event.time">{{ event.time }}</div>
          <div class="event-content">
            <div class="event-title">{{ event.title }}</div>
            <button @click="removeEvent(event.id)" class="event-delete-btn">&times;</button>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 贪吃蛇游戏组件 -->
    <div v-if="showGame" class="game-container">
      <SnakeGame 
        :isVisible="showGame" 
        @close="closeGame" 
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import SnakeGame from './games/SnakeGame.vue';

interface Event {
  id: number;
  title: string;
  date: Date;
  time?: string;
}

interface CalendarDay {
  date: Date;
  currentMonth: boolean;
  isToday: boolean;
  hasEvents: boolean;
}

const props = defineProps<{
  events: Event[];
}>();

const emit = defineEmits<{
  (e: 'add-event', event: { title: string; date: Date; time?: string }): void;
  (e: 'remove-event', id: number): void;
}>();

const currentDate = ref(new Date());
const selectedDate = ref(new Date());
const newEventTitle = ref('');
const newEventTime = ref('');
const showGame = ref(false);

const weekdays = ['日', '一', '二', '三', '四', '五', '六'];

const currentYear = computed(() => currentDate.value.getFullYear());
const currentMonth = computed(() => currentDate.value.getMonth());
const currentMonthName = computed(() => {
  return currentDate.value.toLocaleString('zh-CN', { month: 'long' });
});

const calendarDays = computed(() => {
  const days: CalendarDay[] = [];
  
  // 获取当月第一天
  const firstDay = new Date(currentYear.value, currentMonth.value, 1);
  // 获取当月最后一天
  const lastDay = new Date(currentYear.value, currentMonth.value + 1, 0);
  
  // 获取当月第一天是星期几
  const firstDayOfWeek = firstDay.getDay();
  
  // 添加上个月的日期
  const prevMonthLastDay = new Date(currentYear.value, currentMonth.value, 0).getDate();
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    const date = new Date(currentYear.value, currentMonth.value - 1, prevMonthLastDay - i);
    days.push({
      date,
      currentMonth: false,
      isToday: isSameDay(date, new Date()),
      hasEvents: hasEventsOnDay(date)
    });
  }
  
  // 添加当月的日期
  for (let i = 1; i <= lastDay.getDate(); i++) {
    const date = new Date(currentYear.value, currentMonth.value, i);
    days.push({
      date,
      currentMonth: true,
      isToday: isSameDay(date, new Date()),
      hasEvents: hasEventsOnDay(date)
    });
  }
  
  // 添加下个月的日期
  const remainingDays = 42 - days.length; // 6行7列 = 42
  for (let i = 1; i <= remainingDays; i++) {
    const date = new Date(currentYear.value, currentMonth.value + 1, i);
    days.push({
      date,
      currentMonth: false,
      isToday: isSameDay(date, new Date()),
      hasEvents: hasEventsOnDay(date)
    });
  }
  
  return days;
});

const selectedDayEvents = computed(() => {
  return props.events.filter(event => isSameDay(new Date(event.date), selectedDate.value))
    .sort((a, b) => {
      if (!a.time) return 1;
      if (!b.time) return -1;
      return a.time.localeCompare(b.time);
    });
});

const formatSelectedDate = computed(() => {
  return selectedDate.value.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long'
  });
});

function prevMonth() {
  currentDate.value = new Date(currentYear.value, currentMonth.value - 1, 1);
}

function nextMonth() {
  currentDate.value = new Date(currentYear.value, currentMonth.value + 1, 1);
}

function selectDay(day: CalendarDay) {
  selectedDate.value = new Date(day.date);
  newEventTitle.value = '';
  newEventTime.value = '';
  
  // 如果选择的是其他月份的日期，切换到该月
  if (!day.currentMonth) {
    currentDate.value = new Date(day.date.getFullYear(), day.date.getMonth(), 1);
  }
}

function isSameDay(date1: Date, date2: Date): boolean {
  return date1.getDate() === date2.getDate() &&
         date1.getMonth() === date2.getMonth() &&
         date1.getFullYear() === date2.getFullYear();
}

function hasEventsOnDay(date: Date): boolean {
  // 确保日期比较正确，只比较年月日，忽略时间部分
  return props.events.some(event => {
    const eventDate = new Date(event.date);
    return date.getDate() === eventDate.getDate() &&
           date.getMonth() === eventDate.getMonth() &&
           date.getFullYear() === eventDate.getFullYear();
  });
}

function isSelectedDay(date: Date): boolean {
  return isSameDay(date, selectedDate.value);
}

function addEvent() {
  if (newEventTitle.value.trim()) {
    emit('add-event', {
      title: newEventTitle.value.trim(),
      date: selectedDate.value,
      time: newEventTime.value || undefined
    });
    newEventTitle.value = '';
    newEventTime.value = '';
  }
}

function removeEvent(id: number) {
  emit('remove-event', id);
}

function countEventsOnDay(date: Date): number {
  return props.events.filter(event => isSameDay(new Date(event.date), date)).length;
}

// 监听事件变化
watch(() => props.events, (newEvents) => {
  console.log(`日历组件接收到 ${newEvents.length} 个事件`);
}, { deep: true });

// 组件挂载时
onMounted(() => {
  console.log(`日历组件挂载，当前有 ${props.events.length} 个事件`);
  // 设置当前日期为今天
  currentDate.value = new Date();
  selectedDate.value = new Date();
});

// 切换游戏显示状态
const toggleGame = () => {
  showGame.value = !showGame.value;
};

// 关闭游戏
const closeGame = () => {
  showGame.value = false;
};
</script>

<style scoped>
.calendar-widget {
  display: flex;
  flex-direction: column;
  height: 100%;
  gap: 10px;
  position: relative;
  overflow: hidden;
}

.calendar-content {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  gap: 10px;
  cursor: pointer;
}

.calendar-widget h2 {
  margin-top: 0;
  margin-bottom: 10px;
  font-size: clamp(1rem, 1.5vw, 1.2rem);
  border-bottom: 1px solid var(--accent-color);
  padding-bottom: 5px;
  flex-shrink: 0;
}

.calendar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
  flex-shrink: 0;
}

.calendar-title {
  font-size: clamp(1rem, 1.5vw, 1.2rem);
  font-weight: bold;
  color: var(--text-color);
}

.calendar-nav-btn {
  background: none;
  border: none;
  color: var(--text-color);
  cursor: pointer;
  opacity: 0.7;
  transition: opacity 0.2s;
  font-size: clamp(1rem, 1.5vw, 1.2rem);
  padding: 5px;
}

.calendar-nav-btn:hover {
  opacity: 1;
}

.calendar-weekdays {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 5px;
  margin-bottom: 5px;
  flex-shrink: 0;
}

.calendar-weekday {
  text-align: center;
  font-size: clamp(0.8rem, 1.2vw, 0.9rem);
  color: var(--text-color);
  opacity: 0.8;
  padding: 5px 0;
}

.calendar-days {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 1px;
  width: 100%;
}

.calendar-day {
  position: relative;
  width: 100%;
  padding-bottom: 100%; /* 保持正方形比例 */
  background-color: rgba(255, 255, 255, 0.05);
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  overflow: hidden;
}

.calendar-day .day-number {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 100%;
  text-align: center;
  font-size: clamp(0.7rem, 1vw, 0.9rem);
}

.event-indicator {
  position: absolute;
  bottom: 5px;
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  z-index: 2; /* 确保事件指示器在最上层 */
}

.event-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background-color: #e74c3c;
  display: inline-block;
  margin: 0 1px;
  box-shadow: 0 0 3px rgba(255, 255, 255, 0.5);
}

.event-count {
  font-size: 0.6rem;
  margin-left: 3px;
  background-color: #e74c3c;
  color: white;
  border-radius: 50%;
  width: 14px;
  height: 14px;
  display: inline-flex;
  justify-content: center;
  align-items: center;
  box-shadow: 0 0 3px rgba(0, 0, 0, 0.3);
}

.calendar-day.today {
  background-color: var(--accent-color);
  color: white;
}

.calendar-day.selected {
  border: 2px solid var(--accent-color);
}

.calendar-day.other-month {
  opacity: 0.5;
}

.calendar-day:hover {
  background-color: rgba(255, 255, 255, 0.1);
}

/* 确保有事件的日期样式正确显示 */
.calendar-day.has-events {
  background-color: rgba(231, 76, 60, 0.15);
  border: 1px solid rgba(231, 76, 60, 0.3);
  position: relative; /* 确保相对定位 */
}

.calendar-day.has-events .event-indicator {
  opacity: 1;
  visibility: visible;
}

.calendar-day.has-events.today {
  background-color: var(--accent-color);
  box-shadow: 0 0 5px #e74c3c;
}

.calendar-day.has-events:hover {
  background-color: rgba(231, 76, 60, 0.25);
}

.calendar-event-form {
  margin-top: 15px;
  padding-top: 10px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  flex-shrink: 0;
}

.calendar-event-form h3 {
  margin-top: 0;
  margin-bottom: 10px;
  font-size: clamp(0.8rem, 1.2vw, 1rem);
  font-weight: normal;
  color: var(--text-color);
}

.event-input-group {
  display: flex;
  gap: 10px;
  margin-bottom: 10px;
}

.event-input {
  flex: 1;
  padding: 5px 10px;
  border-radius: 4px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background-color: rgba(255, 255, 255, 0.1);
  color: var(--text-color);
  font-size: clamp(0.8rem, 1.2vw, 0.9rem);
}

.event-time-input {
  width: 100px;
  padding: 5px;
  border-radius: 4px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background-color: rgba(255, 255, 255, 0.1);
  color: var(--text-color);
  font-size: clamp(0.8rem, 1.2vw, 0.9rem);
}

.event-add-btn {
  padding: 5px 15px;
  border-radius: 4px;
  border: none;
  background-color: var(--accent-color);
  color: white;
  cursor: pointer;
  transition: opacity 0.2s;
  font-size: clamp(0.8rem, 1.2vw, 0.9rem);
}

.event-add-btn:hover {
  opacity: 0.9;
}

.calendar-events {
  flex: 1; /* 让事项列表占据剩余空间 */
  overflow-y: auto;
  max-height: none; /* 移除最大高度限制 */
  min-height: 100px; /* 设置最小高度 */
}

.calendar-event {
  display: flex;
  flex-direction: column;
  padding: 8px;
  margin-bottom: 5px;
  background-color: rgba(255, 255, 255, 0.05);
  border-radius: 4px;
  transition: all 0.3s ease;
}

.calendar-event:hover {
  background-color: rgba(255, 255, 255, 0.1);
}

.event-time {
  font-size: clamp(0.7rem, 1vw, 0.8rem);
  opacity: 0.8;
  margin-bottom: 3px;
  color: var(--text-color);
}

.event-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.event-title {
  font-size: clamp(0.8rem, 1.1vw, 0.9rem);
  word-break: break-word;
  color: var(--text-color);
}

.event-delete-btn {
  background: none;
  border: none;
  color: var(--text-color);
  cursor: pointer;
  opacity: 0.7;
  transition: opacity 0.2s;
  font-size: clamp(1rem, 1.5vw, 1.2rem);
  padding: 0 5px;
}

.event-delete-btn:hover {
  opacity: 1;
}

/* 响应式调整 */
@media (max-width: 768px) {
  .calendar-widget {
    min-height: 200px;
  }
  
  .calendar-days {
    min-height: 150px;
  }
  
  .calendar-day {
    font-size: clamp(0.7rem, 1.2vw, 0.9rem);
  }
  
  .event-input-group {
    flex-direction: column;
  }
  
  .event-time-input {
    width: 100%;
  }
}

/* 竖屏模式特别处理 */
@media (orientation: portrait) {
  .calendar-widget {
    gap: 5px;
  }
  
  .calendar-widget h2 {
    margin-bottom: 5px;
    font-size: 1rem;
  }
  
  .calendar-header {
    margin-bottom: 5px;
  }
  
  .calendar-title {
    font-size: 0.9rem;
  }
  
  .calendar-nav-btn {
    font-size: 0.9rem;
    padding: 3px;
  }
  
  .calendar-weekdays {
    gap: 1px;
    margin-bottom: 1px;
  }
  
  .calendar-weekday {
    font-size: 0.8rem;
    padding: 1px 0;
  }
  
  .calendar-days {
    width: 100%;
  }
  
  .calendar-day {
    position: relative;
    width: 100%;
    padding-bottom: 100%;
    font-size: 1.2rem;
    border-radius: 2px;
  }
  
  .calendar-day > span {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 100%;
    text-align: center;
  }
  
  .calendar-event-form {
    margin-top: 5px;
    padding-top: 5px;
  }
  
  .calendar-event-form h3 {
    font-size: 0.8rem;
    margin-bottom: 5px;
  }
  
  .event-input-group {
    flex-direction: column;
    gap: 5px;
  }
  
  .event-input, .event-time-input {
    width: 100%;
    padding: 6px;
    font-size: 0.8rem;
  }
  
  .event-add-btn {
    width: 100%;
    padding: 6px;
    font-size: 0.8rem;
  }
  
  .calendar-events {
    min-height: 80px;
  }
  
  .calendar-event {
    padding: 5px;
    margin-bottom: 3px;
  }
  
  .event-time {
    font-size: 0.7rem;
    margin-bottom: 2px;
  }
  
  .event-title {
    font-size: 0.8rem;
  }
  
  .event-delete-btn {
    font-size: 0.9rem;
    padding: 0 3px;
  }
  
  .calendar-day.has-events::after {
    width: 3px;
    height: 3px;
    bottom: 2px;
  }
}

/* 横屏模式特别处理 */
@media (orientation: landscape) {
  .calendar-content {
    display: flex;
    flex-direction: column;
    height: 100%;
    width: 100%;
    gap: 5px;
  }
  
  .calendar-widget {
    gap: 5px;
    display: flex;
    flex-direction: column;
    height: 100%;
  }
  
  .calendar-widget h2 {
    margin: 0;
    padding: 4px 0;
    font-size: clamp(0.9rem, 1.2vw, 1.1rem);
  }
  
  .calendar-header {
    margin: 0;
    padding: 4px 0;
  }
  
  .calendar-title {
    font-size: clamp(0.8rem, 1.1vw, 1rem);
  }
  
  .calendar-days {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    grid-template-rows: repeat(6, 1fr);
    gap: 2px;
    flex: 0.6; /* 减少日历网格的比例 */
    min-height: 0;
    max-height: none;
  }
  
  .calendar-day {
    position: relative;
    width: 100%;
    padding-bottom: 100%;
    font-size: clamp(0.8rem, 1.1vw, 0.9rem);
    height: 0;
  }
  
  .calendar-day .day-number {
    font-size: clamp(0.6rem, 0.9vw, 0.8rem);
  }
  
  .calendar-weekdays {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 2px;
    margin-bottom: 2px;
  }
  
  .calendar-weekday {
    font-size: clamp(0.7rem, 1vw, 0.8rem);
    padding: 2px 0;
    text-align: center;
  }
  
  .calendar-event-form {
    padding: 4px 0;
    margin-top: 5px;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
  }
  
  .calendar-event-form h3 {
    font-size: clamp(0.8rem, 1.1vw, 0.9rem);
    margin: 0 0 4px 0;
  }
  
  .event-input-group {
    flex-direction: row;
    align-items: center;
    gap: 4px;
    margin-bottom: 5px;
  }
  
  .event-input {
    flex: 1;
    min-width: 0;
    font-size: clamp(0.7rem, 1vw, 0.8rem);
    padding: 4px;
  }
  
  .event-time-input {
    width: 90px;
    font-size: clamp(0.7rem, 1vw, 0.8rem);
    padding: 4px;
  }
  
  .event-add-btn {
    padding: 4px 8px;
    font-size: clamp(0.7rem, 1vw, 0.8rem);
  }
  
  .calendar-events {
    min-height: 120px; /* 增加最小高度 */
    max-height: none; /* 移除最大高度限制 */
    flex: 0.4; /* 增加事项列表的比例 */
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding-right: 4px; /* 为滚动条留出空间 */
  }
  
  .calendar-events::-webkit-scrollbar {
    width: 4px;
  }
  
  .calendar-events::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.05);
    border-radius: 4px;
  }
  
  .calendar-events::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.2);
    border-radius: 4px;
  }
  
  .calendar-events::-webkit-scrollbar-thumb:hover {
    background: rgba(255, 255, 255, 0.3);
  }
  
  .calendar-event {
    padding: 6px;
    margin-bottom: 0;
    background-color: rgba(255, 255, 255, 0.05);
    border-radius: 4px;
    border-left: 2px solid var(--accent-color);
    transition: background-color 0.2s ease;
  }
  
  .calendar-event:hover {
    background-color: rgba(255, 255, 255, 0.1);
  }
  
  .event-time {
    font-size: clamp(0.6rem, 0.9vw, 0.7rem);
    margin-bottom: 2px;
  }
  
  .event-title {
    font-size: clamp(0.7rem, 1vw, 0.8rem);
  }
  
  .event-delete-btn {
    font-size: clamp(0.8rem, 1.1vw, 0.9rem);
    padding: 0 4px;
  }
}

/* 主题适配 */
:deep(.theme-light) .calendar-day,
:deep(.theme-github) .calendar-day {
  background-color: rgba(0, 0, 0, 0.03);
}

:deep(.theme-light) .calendar-day:hover,
:deep(.theme-github) .calendar-day:hover {
  background-color: rgba(0, 0, 0, 0.05);
}

:deep(.theme-light) .event-input,
:deep(.theme-github) .event-input,
:deep(.theme-light) .event-time-input,
:deep(.theme-github) .event-time-input {
  background-color: white;
  border: 1px solid #ddd;
  color: #000000;
}

.game-container {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 0;
  margin: 0;
  position: absolute;
  top: 0;
  left: 0;
  z-index: 10;
}

.game-hint {
  font-size: clamp(0.7rem, 1.5vw, 0.9rem);
  opacity: 0.5;
  color: var(--text-color);
  margin-top: auto;
  margin-bottom: 5px;
  text-align: center;
  transition: opacity 0.3s ease;
}

.calendar-content:hover .game-hint {
  opacity: 0.8;
}
</style>