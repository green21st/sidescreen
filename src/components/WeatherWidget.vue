<template>
  <div class="widget weather-widget" @dblclick="toggleGame">
    <div v-if="loading" class="loading">加载中...</div>
    <div v-else-if="error" class="error">{{ error }}</div>
    <div v-else class="weather-content">
      <template v-if="!showGame">
        <div class="weather-location">{{ props.location }}</div>
        <div class="weather-main">
          <div class="weather-temp">{{ Math.round(weather.temp) }}°C</div>
          <div class="weather-icon">
            <span v-if="!isImageLoaded" class="weather-emoji" :title="weather.description">
              {{ getWeatherEmoji(weather.description) }}
            </span>
            <img 
              v-show="isImageLoaded"
              :src="weather.iconUrl" 
              :alt="weather.description"
              @load="onImageLoaded"
              @error="onImageError"
              class="weather-icon-img"
            >
          </div>
        </div>
        <div class="weather-description">{{ weather.description }}</div>
        <div class="weather-details">
          <div class="weather-detail">
            <span>湿度:</span> {{ weather.humidity }}%
          </div>
          <div class="weather-detail">
            <span>风速:</span> {{ weather.windSpeed }} km/h
          </div>
        </div>
        
        <!-- 未来三天天气预报 -->
        <div v-if="forecast.length > 0" class="weather-forecast">
          <h3 class="forecast-title">未来天气</h3>
          <div class="forecast-container">
            <div v-for="(day, index) in forecast" :key="index" class="forecast-day">
              <div class="forecast-date">{{ formatDate(day.fxDate) }}</div>
              <div class="forecast-icon">
                <span class="forecast-emoji">{{ getWeatherEmoji(day.textDay) }}</span>
              </div>
              <div class="forecast-temp">{{ day.tempMin }}°-{{ day.tempMax }}°</div>
              <div class="forecast-text">{{ day.textDay }}</div>
            </div>
          </div>
        </div>
        
        <div class="weather-actions">
          <button @click="refreshWeather" class="refresh-btn" title="刷新天气">
            <span class="refresh-icon">🔄</span>
          </button>
        </div>
      </template>
      
      <div v-else class="game-wrapper">
        <WeatherFlyingGame @close="showGame = false" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, onUnmounted } from 'vue';
import WeatherFlyingGame from './games/WeatherFlyingGame.vue';

const props = defineProps<{
  location: string;
  apiKey: string;
}>();

// 添加本地存储键名常量
const STORAGE_KEYS = {
  WEATHER_DATA: 'weather_widget_data',
  LAST_UPDATE: 'weather_widget_last_update',
  FORECAST_DATA: 'weather_widget_forecast' // 添加预报数据存储键
};

interface WeatherData {
  temp: number;
  humidity: number;
  windSpeed: number;
  description: string;
  iconUrl: string;
}

interface Coordinates {
  latitude: number;
  longitude: number;
}

// 天气预报数据接口
interface ForecastDay {
  fxDate: string;      // 预报日期
  tempMax: string;     // 最高温度
  tempMin: string;     // 最低温度
  iconDay: string;     // 白天天气图标代码
  textDay: string;     // 白天天气状况文字
  iconNight: string;   // 夜间天气图标代码
  textNight: string;   // 夜间天气状况文字
  humidity: string;    // 相对湿度
  precip: string;      // 降水量
  windSpeed: string;   // 风速
}

// 图片加载状态
const isImageLoaded = ref(false);
// 天气预报数据
const forecast = ref<ForecastDay[]>([]);

// 添加城市坐标缓存
const cityCoordinates = ref<Coordinates | null>(null);

// 获取城市坐标
const fetchCityCoordinates = async (cityName: string) => {
  try {
    // 使用和风天气 API 的城市查询接口
    const baseUrl = 'https://geoapi.qweather.com';
    const geoUrl = `${baseUrl}/v2/city/lookup?location=${encodeURIComponent(cityName)}&key=${props.apiKey}`;
    
    const response = await fetch(geoUrl);
    if (!response.ok) {
      throw new Error(`城市查询失败: ${response.status}`);
    }
    
    const data = await response.json();
    if (data.code === '200' && data.location && data.location.length > 0) {
      const cityInfo = data.location[0];
      cityCoordinates.value = {
        longitude: parseFloat(cityInfo.lon),
        latitude: parseFloat(cityInfo.lat)
      };
      
      // 更新显示的城市名称
      const cityElement = document.querySelector('.weather-location');
      if (cityElement) {
        cityElement.textContent = cityInfo.name;
      }
      
      return true;
    } else {
      throw new Error(`未找到城市: ${cityName}`);
    }
  } catch (err) {
    console.error('获取城市坐标失败:', err);
    error.value = `获取城市坐标失败，使用默认位置`;
    // 使用默认坐标（北京）
    cityCoordinates.value = {
      longitude: 116.41,
      latitude: 39.90
    };
    return false;
  }
};

// 格式化日期显示
const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  // 判断是否是今天或明天
  if (date.toDateString() === today.toDateString()) {
    return '今天';
  } else if (date.toDateString() === tomorrow.toDateString()) {
    return '明天';
  } else {
    // 返回星期几
    const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    return weekdays[date.getDay()];
  }
};

// 图片加载成功处理
const onImageLoaded = () => {
  isImageLoaded.value = true;
  console.log('天气图标加载成功');
};

// 图片加载失败处理
const onImageError = () => {
  isImageLoaded.value = false;
  console.log('天气图标加载失败，使用 emoji 备选图标');
  // 不显示错误信息，直接使用 emoji 显示
};

// 根据天气描述获取对应的emoji
const getWeatherEmoji = (description: string) => {
  const weatherMap: Record<string, string> = {
    '晴': '☀️',
    '晴间多云': '🌤️',
    '多云': '⛅',
    '阴': '☁️',
    '小雨': '🌦️',
    '中雨': '🌧️',
    '大雨': '🌧️',
    '暴雨': '⛈️',
    '雷阵雨': '⛈️',
    '小雪': '🌨️',
    '中雪': '🌨️',
    '大雪': '❄️',
    '雾': '🌫️',
    'Clear': '☀️',
    'Sunny': '☀️',
    'Cloudy': '☁️',
    'Overcast': '☁️',
    'Rain': '🌧️',
    'Snow': '❄️',
    'Fog': '🌫️',
    // 添加更多天气状况的映射
    '阵雨': '🌦️',
    '强阵雨': '⛈️',
    '雨夹雪': '🌨️',
    '阵雪': '🌨️',
    '浮尘': '😷',
    '扬沙': '😷',
    '沙尘暴': '😷',
    '雾霾': '😷',
    '霾': '😷'
  };
  
  return weatherMap[description] || '🌈';
};

// 初始化时尝试从本地存储加载数据
const loadSavedData = () => {
  try {
    // 尝试加载天气数据
    const savedWeatherData = localStorage.getItem(STORAGE_KEYS.WEATHER_DATA);
    if (savedWeatherData) {
      weather.value = JSON.parse(savedWeatherData);
      console.log('从本地存储加载天气数据:', weather.value);
    }
    
    // 尝试加载天气预报数据
    const savedForecast = localStorage.getItem(STORAGE_KEYS.FORECAST_DATA);
    if (savedForecast) {
      forecast.value = JSON.parse(savedForecast);
      console.log('从本地存储加载天气预报数据:', forecast.value);
    }
    
    // 检查数据是否过期（超过1小时）
    const lastUpdate = localStorage.getItem(STORAGE_KEYS.LAST_UPDATE);
    if (lastUpdate) {
      const lastUpdateTime = parseInt(lastUpdate);
      const currentTime = new Date().getTime();
      const oneHour = 60 * 60 * 1000;
      
      if (currentTime - lastUpdateTime > oneHour) {
        console.log('缓存数据已过期，将重新获取');
        return false;
      } else {
        console.log('使用缓存数据，距离上次更新:', Math.round((currentTime - lastUpdateTime) / 60000), '分钟');
        return true;
      }
    }
  } catch (err) {
    console.error('加载本地存储数据失败:', err);
    return false;
  }
  return false;
};

// 保存数据到本地存储
const saveDataToStorage = () => {
  try {
    localStorage.setItem(STORAGE_KEYS.WEATHER_DATA, JSON.stringify(weather.value));
    localStorage.setItem(STORAGE_KEYS.LAST_UPDATE, new Date().getTime().toString());
    
    // 保存天气预报数据
    if (forecast.value.length > 0) {
      localStorage.setItem(STORAGE_KEYS.FORECAST_DATA, JSON.stringify(forecast.value));
    }
    
    console.log('天气数据已保存到本地存储');
  } catch (err) {
    console.error('保存数据到本地存储失败:', err);
  }
};

const weather = ref<WeatherData>({
  temp: 25,
  humidity: 60,
  windSpeed: 3.5,
  description: '晴朗',
  iconUrl: 'https://dev.qweather.com/assets/images/icon/100.png'
});

const loading = ref(true);
const error = ref('');
let refreshTimer: number | null = null;
let retryCount = 0; // 添加重试计数器

// 刷新天气数据
const refreshWeather = () => {
  fetchWeather(true);
};

// 获取天气数据的主函数
const fetchWeather = async (forceRefresh = false) => {
  // 如果不是强制刷新，且能从本地存储加载有效数据，则使用缓存数据
  if (!forceRefresh && loadSavedData()) {
    loading.value = false;
    return;
  }

  if (!props.apiKey) {
    error.value = '请在设置中添加和风天气API密钥';
    loading.value = false;
    return;
  }
  
  // 处理位置参数
  try {
    loading.value = true;
    error.value = '';
    
    // 如果没有城市坐标或城市变更，获取新的坐标
    if (!cityCoordinates.value || props.location !== localStorage.getItem('last-weather-location')) {
      await fetchCityCoordinates(props.location);
      localStorage.setItem('last-weather-location', props.location);
    }
    
    if (!cityCoordinates.value) {
      throw new Error('无法获取城市坐标');
    }
    
    // 根据文档，免费订阅需要使用devapi.qweather.com域名
    const baseUrl = 'https://devapi.qweather.com';
    
    // 使用城市坐标 - 和风天气API要求经度在前，纬度在后
    const longitude = cityCoordinates.value.longitude.toFixed(6);
    const latitude = cityCoordinates.value.latitude.toFixed(6);
    const locationParam = `${longitude},${latitude}`;
    console.log(`使用城市坐标: ${locationParam}`);
    
    // 构建API URL - 使用经纬度
    const weatherUrl = `${baseUrl}/v7/weather/now?location=${encodeURIComponent(locationParam)}&key=${props.apiKey}`;
    const forecastUrl = `${baseUrl}/v7/weather/3d?location=${encodeURIComponent(locationParam)}&key=${props.apiKey}`;
    
    // 使用和风天气API调用
    console.log(`天气API请求: ${weatherUrl}`);
    
    try {
      // 发送请求获取天气数据
      const weatherResponse = await fetch(weatherUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        },
        cache: 'no-cache'
      });
      
      if (!weatherResponse.ok) {
        const errorText = await weatherResponse.text();
        console.error(`天气API响应错误: ${weatherResponse.status} ${weatherResponse.statusText}`, errorText);
        throw new Error(`天气API响应错误: ${weatherResponse.status}`);
      }
      
      const weatherData = await weatherResponse.json();
      console.log('天气API响应:', weatherData);
      
      // 检查API返回的状态码
      if (weatherData.code !== '200') {
        console.error('获取天气数据失败:', weatherData);
        throw new Error(`获取天气数据失败: ${weatherData.code} - ${weatherData.message || '未知错误'}`);
      }
       
      // 根据文档解析返回的天气数据
      weather.value = {
        temp: parseFloat(weatherData.now.temp),
        humidity: parseInt(weatherData.now.humidity),
        windSpeed: parseFloat(weatherData.now.windSpeed),
        description: weatherData.now.text,
        iconUrl: getWeatherIconUrl(weatherData.now.icon)
      };
      
      console.log('成功获取天气数据:', weather.value);
      
      // 获取天气预报数据
      try {
        console.log(`天气预报API请求: ${forecastUrl}`);
        const forecastResponse = await fetch(forecastUrl, {
          method: 'GET',
          headers: {
            'Accept': 'application/json'
          },
          cache: 'no-cache'
        });
        
        if (!forecastResponse.ok) {
          console.error(`天气预报API响应错误: ${forecastResponse.status}`);
          throw new Error(`天气预报API响应错误: ${forecastResponse.status}`);
        }
        
        const forecastData = await forecastResponse.json();
        console.log('天气预报API响应:', forecastData);
        
        if (forecastData.code === '200' && forecastData.daily && forecastData.daily.length > 0) {
          // 解析天气预报数据
          forecast.value = forecastData.daily;
          console.log('成功获取天气预报数据:', forecast.value);
        } else {
          console.error('获取天气预报数据失败:', forecastData);
          throw new Error(`获取天气预报数据失败: ${forecastData.code}`);
        }
      } catch (forecastError) {
        console.error('获取天气预报失败:', forecastError);
        // 预报获取失败不影响当前天气显示
      }
      
      // 重置重试计数器
      retryCount = 0;
      
      // 保存数据到本地存储
      saveDataToStorage();
    } catch (weatherError) {
      console.error('天气API请求失败:', weatherError);
      throw weatherError;
    }
  } catch (err) {
    console.error('天气数据获取失败:', err);
    
    // 如果有缓存数据，使用缓存数据
    if (loadSavedData()) {
      console.log('使用缓存的天气数据');
      error.value = `获取最新天气数据失败，显示缓存数据。`;
    } else {
      // 如果没有缓存数据，尝试重试或使用模拟数据
      if (retryCount < 3) {
        retryCount++;
        console.log(`第${retryCount}次重试获取天气数据...`);
        setTimeout(() => fetchWeather(), 2000); // 2秒后重试
        return;
      } else {
        handleWeatherError(err, `${cityCoordinates.value?.longitude},${cityCoordinates.value?.latitude}`);
      }
    }
  } finally {
    loading.value = false;
  }
};

// 处理天气API错误的函数
const handleWeatherError = (err: any, locationParam: string) => {
  // 显示更详细的错误信息
  let errorMessage = `API调用失败: ${err.message}`;
  if (err.message.includes('401')) {
    errorMessage += '。请检查API密钥是否正确。';
  } else if (err.message.includes('429')) {
    errorMessage += '。API调用次数已达上限。';
  } else if (err.message.includes('400')) {
    errorMessage += '。请求参数有误，请检查位置格式。';
  }
  error.value = `${errorMessage} 使用模拟数据代替。`;
  
  // 使用模拟数据
  generateMockWeatherData(locationParam);
};

// 生成模拟天气数据的函数
const generateMockWeatherData = (locationParam: string) => {
  // 使用位置参数作为随机种子
  const locationSum = [...locationParam].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const randomSeed = locationSum / 100;
  
  // 基于位置的伪随机数生成
  const pseudoRandom = (min: number, max: number) => {
    const rand = Math.sin(randomSeed * 9999) * 10000;
    return min + (Math.abs(rand) % (max - min));
  };
  
  // 根据位置确定天气类型
  const weatherTypes = [
    { code: '100', desc: '晴' },
    { code: '101', desc: '多云' },
    { code: '104', desc: '阴' },
    { code: '300', desc: '小雨' },
    { code: '305', desc: '小雨' },
    { code: '406', desc: '小雪' }
  ];
  
  const weatherIndex = Math.floor(pseudoRandom(0, weatherTypes.length));
  const selectedWeather = weatherTypes[weatherIndex];
  
  // 根据位置生成相对固定的天气数据
  weather.value = {
    temp: Math.round(5 + pseudoRandom(0, 25)),
    humidity: Math.round(40 + pseudoRandom(0, 40)),
    windSpeed: Math.round((1 + pseudoRandom(0, 5)) * 10) / 10,
    description: selectedWeather.desc,
    iconUrl: getWeatherIconUrl(selectedWeather.code)
  };
  
  // 生成模拟的天气预报数据
  const mockForecast: ForecastDay[] = [];
  const today = new Date();
  
  for (let i = 0; i < 3; i++) {
    const forecastDate = new Date(today);
    forecastDate.setDate(today.getDate() + i);
    const dateString = forecastDate.toISOString().split('T')[0];
    
    // 为每天随机选择天气类型，但保持一定的连续性
    const dayIndex = (weatherIndex + Math.floor(pseudoRandom(0, 2))) % weatherTypes.length;
    const dayWeather = weatherTypes[dayIndex];
    
    // 生成温度，保持一定的连续性
    const baseTemp = 5 + pseudoRandom(0, 25);
    const tempMin = Math.round(baseTemp - pseudoRandom(0, 5));
    const tempMax = Math.round(baseTemp + pseudoRandom(0, 8));
    
    mockForecast.push({
      fxDate: dateString,
      tempMax: tempMax.toString(),
      tempMin: tempMin.toString(),
      iconDay: dayWeather.code,
      textDay: dayWeather.desc,
      iconNight: dayWeather.code,
      textNight: dayWeather.desc,
      humidity: Math.round(40 + pseudoRandom(0, 40)).toString(),
      precip: (Math.round(pseudoRandom(0, 10)) / 10).toString(),
      windSpeed: Math.round((1 + pseudoRandom(0, 5)) * 10) / 10 + ''
    });
  }
  
  forecast.value = mockForecast;
};

// 获取天气图标URL的函数
const getWeatherIconUrl = (iconCode: string) => {
  // 使用和风天气新版图标 URL
  return `https://a.hecdn.net/img/common/icon/202106/${iconCode}.png`;
};

// 组件挂载时的初始化
onMounted(() => {
  // 先尝试从本地存储加载数据
  const hasValidCache = loadSavedData();
  
  if (hasValidCache) {
    // 如果有有效缓存，先显示缓存数据，然后在后台刷新
    loading.value = false;
    setTimeout(() => fetchWeather(true), 1000); // 1秒后在后台刷新数据
  } else {
    // 如果没有有效缓存，直接获取天气数据
    fetchWeather();
  }
  
  // 设置定时刷新，每30分钟刷新一次天气数据
  refreshTimer = window.setInterval(() => {
    console.log('定时刷新天气数据');
    fetchWeather(true); // 强制刷新
  }, 30 * 60 * 1000);
});

// 组件卸载时清除定时器
onUnmounted(() => {
  if (refreshTimer !== null) {
    clearInterval(refreshTimer);
    refreshTimer = null;
  }
});

// 监听属性变化
watch(() => props.apiKey, fetchWeather);

// 游戏显示状态
const showGame = ref(false);

// 切换游戏显示
const toggleGame = () => {
  // 如果游戏正在进行中，不允许通过双击退出
  const gameComponent = document.querySelector('.weather-flying-game');
  if (gameComponent && showGame.value) {
    const gameInstance = gameComponent.__vue__;
    if (gameInstance && gameInstance.gameStarted && !gameInstance.gameOver) {
      return;
    }
  }
  showGame.value = !showGame.value;
};

// 添加 location 属性的监听
watch(() => props.location, (newLocation) => {
  console.log('城市变更:', newLocation);
  // 清除坐标缓存，强制刷新天气数据
  cityCoordinates.value = null;
  fetchWeather(true);
});
</script>

<style scoped>
.weather-widget {
  position: relative;
  height: 100%;
  display: flex;
  flex-direction: column;
  min-height: 200px;
  overflow: hidden;
}

.weather-content {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.weather-location {
  font-size: clamp(1.2rem, 2vw, 1.5rem);
  font-weight: bold;
  margin-bottom: 10px;
  color: var(--text-color);
  text-align: center;
}

.weather-main {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-bottom: 10px;
  flex-shrink: 0;
}

.weather-temp {
  font-size: clamp(2rem, 4vw, 3rem);
  font-weight: bold;
  color: var(--text-color);
  margin-right: 15px;
}

.weather-icon {
  font-size: clamp(2rem, 4vw, 3rem);
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 40px;
  min-height: 40px;
}

.weather-icon-img {
  width: clamp(40px, 8vw, 60px);
  height: clamp(40px, 8vw, 60px);
  object-fit: contain;
}

.weather-emoji {
  font-size: clamp(2rem, 4vw, 3rem);
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.weather-description {
  text-align: center;
  margin-bottom: 15px;
  font-size: clamp(0.9rem, 1.5vw, 1.1rem);
  color: var(--text-color);
  flex-shrink: 0;
}

.weather-details {
  display: flex;
  justify-content: space-around;
  background-color: rgba(255, 255, 255, 0.05);
  padding: 10px;
  border-radius: 8px;
  margin-bottom: 15px;
  flex-shrink: 0;
}

.weather-detail {
  display: flex;
  flex-direction: column;
  align-items: center;
  font-size: clamp(0.8rem, 1.2vw, 0.9rem);
  color: var(--text-color);
}

.weather-detail span {
  opacity: 0.8;
  margin-bottom: 5px;
}

.weather-forecast {
  flex: 1;
  display: flex;
  flex-direction: column;
  margin-top: 10px;
  overflow: hidden;
  min-height: 100px;
}

.forecast-title {
  font-size: clamp(0.9rem, 1.5vw, 1.1rem);
  margin-top: 0;
  margin-bottom: 10px;
  color: var(--text-color);
  text-align: center;
  flex-shrink: 0;
}

.forecast-container {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 5px;
  flex: 1;
  height: 130px;
}

.forecast-day {
  flex: 1;
  min-width: 60px;
  max-width: 100px;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 8px;
  background-color: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  transition: all 0.3s ease;
  height: 120px;
  justify-content: space-between;
}

.forecast-day:hover {
  background-color: rgba(255, 255, 255, 0.1);
  transform: translateY(-2px);
}

.forecast-date {
  font-size: clamp(0.7rem, 1vw, 0.9rem);
  margin-bottom: 5px;
  color: var(--text-color);
  text-align: center;
}

.forecast-icon {
  font-size: clamp(1.2rem, 2vw, 1.5rem);
  margin: 5px 0;
}

.forecast-temp {
  font-size: clamp(0.7rem, 1vw, 0.9rem);
  color: var(--text-color);
}

.forecast-text {
  font-size: clamp(0.7rem, 0.9vw, 0.8rem);
  color: var(--text-color);
  opacity: 0.8;
  text-align: center;
  word-break: break-word;
}

.weather-actions {
  display: flex;
  justify-content: center;
  margin-top: 10px;
  flex-shrink: 0;
}

.refresh-btn {
  background: none;
  border: none;
  color: var(--text-color);
  cursor: pointer;
  opacity: 0.7;
  transition: all 0.2s ease;
  font-size: clamp(1rem, 1.5vw, 1.2rem);
  padding: 5px;
}

.refresh-btn:hover {
  opacity: 1;
  transform: rotate(180deg);
}

.loading, .error {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-color);
  font-size: clamp(1rem, 1.5vw, 1.2rem);
  opacity: 0.7;
}

/* 主题适配 */
:deep(.theme-light) .weather-details,
:deep(.theme-github) .weather-details,
:deep(.theme-light) .forecast-day,
:deep(.theme-github) .forecast-day {
  background-color: rgba(0, 0, 0, 0.03);
}

:deep(.theme-light) .forecast-day:hover,
:deep(.theme-github) .forecast-day:hover {
  background-color: rgba(0, 0, 0, 0.05);
}

/* 响应式调整 */
@media (max-width: 768px) {
  .weather-widget {
    min-height: 150px;
  }
  
  .weather-details {
    flex-direction: column;
    gap: 10px;
  }
  
  .forecast-container {
    overflow-x: auto;
    justify-content: flex-start;
  }
  
  .forecast-day {
    min-width: 60px;
    height: 110px;
  }
  
  .forecast-container {
    height: 120px;
  }
}

@media (orientation: portrait) {
  .weather-temp {
    font-size: clamp(2.5rem, 6vw, 3.5rem);
  }
  
  .weather-emoji {
    font-size: clamp(2.5rem, 6vw, 3.5rem);
  }
  
  .weather-icon img {
    width: clamp(50px, 10vw, 70px);
    height: clamp(50px, 10vw, 70px);
  }
  
  .forecast-container {
    justify-content: space-around;
  }
  
  .forecast-day {
    min-width: 25%;
    max-width: 90px;
  }
}

/* 横屏模式特别处理 */
@media (orientation: landscape) {
  .weather-widget {
    min-height: 250px;
    max-height: 100%;
  }
  
  .forecast-container {
    flex-wrap: nowrap;
    justify-content: space-between;
  }
  
  .forecast-day {
    min-width: 25%;
    max-width: 100px;
    margin-bottom: 0;
  }
}

.game-wrapper {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  margin: 0;
  border-radius: 8px;
  overflow: hidden;
  z-index: 10;
}
</style> 