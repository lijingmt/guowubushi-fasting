import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  UserSettings,
  DailyCheckIn,
  MealRecord,
  WeightRecord,
  WaterRecord,
  HealthSyncStatus,
} from '../types';
import { DEFAULT_SETTINGS } from '../constants/achievements';

const KEYS = {
  SETTINGS: '@guowu_settings',
  CHECKIN_RECORDS: '@guowu_checkin_records',
  MEAL_RECORDS: '@guowu_meal_records',
  WEIGHT_RECORDS: '@guowu_weight_records',
  WATER_RECORDS: '@guowu_water_records',
  HEALTH_SYNC: '@guowu_health_sync',
};

// 设置相关
export const getSettings = async (): Promise<UserSettings> => {
  try {
    const data = await AsyncStorage.getItem(KEYS.SETTINGS);
    if (!data) return DEFAULT_SETTINGS;
    const saved = JSON.parse(data);
    // 合并默认设置，处理新增字段
    return { ...DEFAULT_SETTINGS, ...saved };
  } catch (error) {
    console.error('Error getting settings:', error);
    return DEFAULT_SETTINGS;
  }
};

export const saveSettings = async (settings: UserSettings): Promise<void> => {
  try {
    await AsyncStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));
  } catch (error) {
    console.error('Error saving settings:', error);
  }
};

// 打卡记录相关
export const getCheckInRecords = async (): Promise<DailyCheckIn[]> => {
  try {
    const data = await AsyncStorage.getItem(KEYS.CHECKIN_RECORDS);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error getting checkin records:', error);
    return [];
  }
};

export const saveCheckInRecord = async (record: DailyCheckIn): Promise<void> => {
  try {
    const records = await getCheckInRecords();
    const existingIndex = records.findIndex((r) => r.date === record.date);
    if (existingIndex >= 0) {
      records[existingIndex] = record;
    } else {
      records.push(record);
    }
    await AsyncStorage.setItem(KEYS.CHECKIN_RECORDS, JSON.stringify(records));
  } catch (error) {
    console.error('Error saving checkin record:', error);
  }
};

export const getTodayCheckIn = async (): Promise<DailyCheckIn | null> => {
  try {
    const records = await getCheckInRecords();
    const today = new Date().toISOString().split('T')[0];
    return records.find((r) => r.date === today) || null;
  } catch (error) {
    console.error('Error getting today checkin:', error);
    return null;
  }
};

export const isTodayCheckedIn = async (): Promise<boolean> => {
  const todayRecord = await getTodayCheckIn();
  return todayRecord !== null;
};

// 饮食记录相关
export const getMealRecords = async (): Promise<MealRecord[]> => {
  try {
    const data = await AsyncStorage.getItem(KEYS.MEAL_RECORDS);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error getting meal records:', error);
    return [];
  }
};

export const saveMealRecord = async (record: MealRecord): Promise<void> => {
  try {
    const records = await getMealRecords();
    const index = records.findIndex((r) => r.id === record.id);
    if (index >= 0) {
      records[index] = record;
    } else {
      records.push(record);
    }
    await AsyncStorage.setItem(KEYS.MEAL_RECORDS, JSON.stringify(records));
  } catch (error) {
    console.error('Error saving meal record:', error);
  }
};

export const deleteMealRecord = async (id: string): Promise<void> => {
  try {
    const records = await getMealRecords();
    const filtered = records.filter((r) => r.id !== id);
    await AsyncStorage.setItem(KEYS.MEAL_RECORDS, JSON.stringify(filtered));
  } catch (error) {
    console.error('Error deleting meal record:', error);
  }
};

export const getTodayMeals = async (): Promise<MealRecord[]> => {
  try {
    const records = await getMealRecords();
    const today = new Date().toISOString().split('T')[0];
    return records.filter((r) => r.date === today);
  } catch (error) {
    console.error('Error getting today meals:', error);
    return [];
  }
};

export const getTodayCalories = async (): Promise<number> => {
  try {
    const meals = await getTodayMeals();
    return meals.reduce((sum, meal) => sum + meal.calories, 0);
  } catch (error) {
    console.error('Error getting today calories:', error);
    return 0;
  }
};

// 体重记录相关
export const getWeightRecords = async (): Promise<WeightRecord[]> => {
  try {
    const data = await AsyncStorage.getItem(KEYS.WEIGHT_RECORDS);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error getting weight records:', error);
    return [];
  }
};

export const saveWeightRecord = async (record: WeightRecord): Promise<void> => {
  try {
    const records = await getWeightRecords();
    const index = records.findIndex((r) => r.id === record.id);
    if (index >= 0) {
      records[index] = record;
    } else {
      records.push(record);
    }
    // 按日期排序
    records.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    await AsyncStorage.setItem(KEYS.WEIGHT_RECORDS, JSON.stringify(records));
  } catch (error) {
    console.error('Error saving weight record:', error);
  }
};

export const deleteWeightRecord = async (id: string): Promise<void> => {
  try {
    const records = await getWeightRecords();
    const filtered = records.filter((r) => r.id !== id);
    await AsyncStorage.setItem(KEYS.WEIGHT_RECORDS, JSON.stringify(filtered));
  } catch (error) {
    console.error('Error deleting weight record:', error);
  }
};

// 饮水记录相关
export const getWaterRecords = async (): Promise<WaterRecord[]> => {
  try {
    const data = await AsyncStorage.getItem(KEYS.WATER_RECORDS);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error getting water records:', error);
    return [];
  }
};

export const saveWaterRecord = async (record: WaterRecord): Promise<void> => {
  try {
    const records = await getWaterRecords();
    const index = records.findIndex((r) => r.id === record.id);
    if (index >= 0) {
      records[index] = record;
    } else {
      records.push(record);
    }
    await AsyncStorage.setItem(KEYS.WATER_RECORDS, JSON.stringify(records));
  } catch (error) {
    console.error('Error saving water record:', error);
  }
};

export const getTodayWaterIntake = async (): Promise<number> => {
  try {
    const records = await getWaterRecords();
    const today = new Date().toISOString().split('T')[0];
    return records
      .filter((r) => r.date === today)
      .reduce((sum, record) => sum + record.amount, 0);
  } catch (error) {
    console.error('Error getting today water intake:', error);
    return 0;
  }
};

// 健康同步状态相关
export const getHealthSyncStatus = async (): Promise<HealthSyncStatus> => {
  try {
    const data = await AsyncStorage.getItem(KEYS.HEALTH_SYNC);
    if (!data) {
      return {
        healthKitEnabled: false,
        googleFitEnabled: false,
      };
    }
    return JSON.parse(data);
  } catch (error) {
    console.error('Error getting health sync status:', error);
    return {
      healthKitEnabled: false,
      googleFitEnabled: false,
    };
  }
};

export const saveHealthSyncStatus = async (status: HealthSyncStatus): Promise<void> => {
  try {
    await AsyncStorage.setItem(KEYS.HEALTH_SYNC, JSON.stringify(status));
  } catch (error) {
    console.error('Error saving health sync status:', error);
  }
};

// 清除所有数据
export const clearAllData = async (): Promise<void> => {
  try {
    const keys = [
      KEYS.SETTINGS,
      KEYS.CHECKIN_RECORDS,
      KEYS.MEAL_RECORDS,
      KEYS.WEIGHT_RECORDS,
      KEYS.WATER_RECORDS,
      KEYS.HEALTH_SYNC,
    ];
    for (const key of keys) {
      await AsyncStorage.removeItem(key);
    }
  } catch (error) {
    console.error('Error clearing data:', error);
  }
};
