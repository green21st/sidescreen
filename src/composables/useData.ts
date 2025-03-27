import { ref } from 'vue';

// 笔记接口
export interface Note {
  id: number;
  content: string;
  timestamp: Date;
}

// 事件接口
export interface Event {
  id: number;
  title: string;
  date: Date;
  time?: string;
}

export function useData() {
  // 笔记
  const notes = ref<Note[]>([]);
  
  // 日历事件
  const events = ref<Event[]>([]);

  // 添加笔记
  const addNote = (content: string) => {
    notes.value.push({
      id: Date.now(),
      content,
      timestamp: new Date()
    });
    saveNotes();
  };

  // 删除笔记
  const removeNote = (id: number) => {
    notes.value = notes.value.filter(n => n.id !== id);
    saveNotes();
  };

  // 保存笔记到本地存储
  const saveNotes = () => {
    localStorage.setItem('dashboard-notes', JSON.stringify(notes.value));
  };

  // 加载笔记
  const loadNotes = () => {
    const savedNotes = localStorage.getItem('dashboard-notes');
    if (savedNotes) {
      try {
        notes.value = JSON.parse(savedNotes);
        return true;
      } catch (error) {
        console.error('Failed to load notes:', error);
        return false;
      }
    }
    return false;
  };

  // 添加事件
  const addEvent = (eventData: { title: string; date: Date; time?: string }) => {
    events.value.push({
      id: Date.now(),
      title: eventData.title,
      date: eventData.date,
      time: eventData.time
    });
    saveEvents();
  };

  // 删除事件
  const removeEvent = (id: number) => {
    events.value = events.value.filter(e => e.id !== id);
    saveEvents();
  };

  // 保存事件到本地存储
  const saveEvents = () => {
    try {
      const eventsToSave = events.value.map(event => ({
        ...event,
        date: event.date.toISOString()
      }));
      localStorage.setItem('dashboard-events', JSON.stringify(eventsToSave));
    } catch (error) {
      console.error('Failed to save events:', error);
    }
  };

  // 加载事件
  const loadEvents = () => {
    const savedEvents = localStorage.getItem('dashboard-events');
    if (savedEvents) {
      try {
        const parsedEvents = JSON.parse(savedEvents);
        events.value = parsedEvents.map((event: any) => ({
          ...event,
          date: new Date(event.date)
        }));
        console.log(`成功加载 ${events.value.length} 个事件`);
        return true;
      } catch (error) {
        console.error('Failed to load events:', error);
        events.value = []; // 确保在加载失败时重置为空数组
        return false;
      }
    }
    console.log('没有找到保存的事件，使用空数组');
    events.value = []; // 确保在没有保存的事件时初始化为空数组
    return false;
  };

  return {
    notes,
    events,
    addNote,
    removeNote,
    saveNotes,
    loadNotes,
    addEvent,
    removeEvent,
    saveEvents,
    loadEvents
  };
} 