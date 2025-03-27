import { ref, computed } from 'vue';

// 书签数据结构
export interface Bookmark {
  name: string;
  url: string;
  color: string;
}

export function useBookmarks() {
  // 书签数据
  const bookmarks = ref<Bookmark[]>([]);
  const isEditMode = ref(false);
  const currentPage = ref(1);
  
  // 分页相关
  const itemsPerPage = ref(24); // 默认每页24个书签
  
  // 计算总页数
  const totalPages = computed(() => {
    return Math.ceil(bookmarks.value.length / itemsPerPage.value);
  });
  
  // 计算当前页的起始索引
  const currentPageStartIndex = computed(() => {
    return (currentPage.value - 1) * itemsPerPage.value;
  });
  
  // 计算当前页显示的书签
  const currentPageBookmarks = computed(() => {
    const startIndex = currentPageStartIndex.value;
    return bookmarks.value.slice(startIndex, startIndex + itemsPerPage.value);
  });
  
  // 翻页函数
  const nextPage = () => {
    if (currentPage.value < totalPages.value) {
      currentPage.value++;
    }
  };
  
  const prevPage = () => {
    if (currentPage.value > 1) {
      currentPage.value--;
    }
  };
  
  // 验证并修正当前页码
  const validateCurrentPage = () => {
    if (totalPages.value === 0) {
      currentPage.value = 1;
    } else if (currentPage.value > totalPages.value) {
      currentPage.value = totalPages.value;
    } else if (currentPage.value < 1) {
      currentPage.value = 1;
    }
  };
  
  // 打开网站
  const openBookmark = (url: string) => {
    if (isEditMode.value) return;
    
    // 确保URL有协议前缀
    if (!/^https?:\/\//i.test(url)) {
      url = 'https://' + url;
    }
    
    window.open(url, '_blank');
  };
  
  // 添加新书签
  const addBookmark = (newBookmark: Bookmark) => {
    bookmarks.value.push(newBookmark);
    
    // 如果添加了新书签，可能需要增加页数，自动跳转到最后一页
    if (bookmarks.value.length > currentPageStartIndex.value + itemsPerPage.value) {
      currentPage.value = totalPages.value;
    }
    
    // 保存到本地存储
    saveBookmarks();
  };
  
  // 删除书签
  const removeBookmark = (index: number) => {
    // 确保索引有效
    if (index < 0 || index >= bookmarks.value.length) {
      console.error('Invalid bookmark index:', index);
      return;
    }
    
    // 删除书签
    bookmarks.value.splice(index, 1);
    
    // 如果当前页没有内容了，且不是第一页，则返回上一页
    if (currentPageBookmarks.value.length === 0 && currentPage.value > 1) {
      currentPage.value--;
    }
    
    // 立即保存到本地存储
    saveBookmarks();
    
    console.log(`Deleted bookmark at index ${index}, ${bookmarks.value.length} bookmarks remaining`);
  };
  
  // 保存书签到本地存储
  const saveBookmarks = () => {
    try {
      // 确保书签数据是有效的
      if (!Array.isArray(bookmarks.value)) {
        console.error('Bookmark data is not an array, cannot save');
        return;
      }
      
      // 将书签数据转换为JSON字符串
      const bookmarksJson = JSON.stringify(bookmarks.value);
      
      // 保存到本地存储
      localStorage.setItem('dashboard-bookmarks', bookmarksJson);
      
      console.log(`Successfully saved ${bookmarks.value.length} bookmarks to local storage`);
    } catch (error) {
      console.error('Failed to save bookmarks:', error);
    }
  };
  
  // 从本地存储加载书签
  const loadBookmarks = () => {
    try {
      // 清除之前的数据
      bookmarks.value = [];
      
      const savedBookmarks = localStorage.getItem('dashboard-bookmarks');
      if (savedBookmarks) {
        try {
          const parsed = JSON.parse(savedBookmarks);
          // 确保数据是数组
          if (Array.isArray(parsed) && parsed.length > 0) {
            // 验证每个书签对象的结构
            const validBookmarks = parsed.filter(item => 
              item && typeof item === 'object' && 
              typeof item.name === 'string' && 
              typeof item.url === 'string'
            );
            
            if (validBookmarks.length > 0) {
              bookmarks.value = validBookmarks;
            } else {
              console.warn('No valid bookmark data, loading defaults');
              loadDefaultBookmarks();
            }
          } else {
            console.warn('Bookmark data is not a valid array or is empty, loading defaults');
            loadDefaultBookmarks();
          }
        } catch (e) {
          console.error('Failed to parse bookmark data:', e);
          loadDefaultBookmarks();
        }
      } else {
        console.log('No saved bookmark data found, loading defaults');
        loadDefaultBookmarks();
      }
    } catch (e) {
      console.error('Error during bookmark loading:', e);
      loadDefaultBookmarks();
    }
    
    // 确保当前页码有效
    validateCurrentPage();
  };
  
  // 加载默认书签
  const loadDefaultBookmarks = () => {
    // 检查是否已经加载过默认书签
    const hasLoadedDefault = localStorage.getItem('has-loaded-default-bookmarks');
    
    // 如果已经加载过默认书签，则不再重复加载
    if (hasLoadedDefault === 'true') {
      console.log('Default bookmarks already loaded, not loading again');
      bookmarks.value = [];
      return;
    }
    
    // 默认书签
    const defaultBookmarks: Bookmark[] = [
      { name: '百度', url: 'https://www.baidu.com', color: '#3498db' },
      { name: '哔哩哔哩', url: 'https://www.bilibili.com', color: '#e74c3c' },
      { name: '知乎', url: 'https://www.zhihu.com', color: '#2ecc71' },
      { name: '淘宝', url: 'https://www.taobao.com', color: '#f39c12' },
      { name: '京东', url: 'https://www.jd.com', color: '#e74c3c' },
      { name: '微博', url: 'https://weibo.com', color: '#e74c3c' },
      { name: '网易', url: 'https://www.163.com', color: '#e74c3c' },
      { name: '腾讯', url: 'https://www.qq.com', color: '#3498db' },
      { name: 'GitHub', url: 'https://github.com', color: '#34495e' },
      { name: '掘金', url: 'https://juejin.cn', color: '#1abc9c' },
      { name: 'CSDN', url: 'https://www.csdn.net', color: '#e74c3c' },
      { name: '简书', url: 'https://www.jianshu.com', color: '#e74c3c' }
    ];
    
    bookmarks.value = defaultBookmarks;
    
    // 标记已加载默认书签
    localStorage.setItem('has-loaded-default-bookmarks', 'true');
    
    // 保存默认书签到本地存储
    saveBookmarks();
  };
  
  return {
    bookmarks,
    isEditMode,
    currentPage,
    itemsPerPage,
    totalPages,
    currentPageStartIndex,
    currentPageBookmarks,
    nextPage,
    prevPage,
    validateCurrentPage,
    openBookmark,
    addBookmark,
    removeBookmark,
    saveBookmarks,
    loadBookmarks,
    loadDefaultBookmarks
  };
} 