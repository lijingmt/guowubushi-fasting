import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  UserSettings,
  DailyCheckIn,
  MealRecord,
  WeightRecord,
  WaterRecord,
  HealthSyncStatus,
  PracticeRecord,
  FastingSession,
  ActiveFastingState,
} from '../types';
import { DEFAULT_SETTINGS } from '../constants/achievements';

const KEYS = {
  SETTINGS: '@guowu_settings',
  CHECKIN_RECORDS: '@guowu_checkin_records',
  MEAL_RECORDS: '@guowu_meal_records',
  WEIGHT_RECORDS: '@guowu_weight_records',
  WATER_RECORDS: '@guowu_water_records',
  HEALTH_SYNC: '@guowu_health_sync',
  PRACTICE_RECORDS: '@guowu_practice_records',
  LAST_WEIGHT: '@guowu_last_weight', // 上次选择的体重
  FASTING_SESSIONS: '@guowu_fasting_sessions', // 单次禁食记录
  ACTIVE_FASTING_STATE: '@guowu_active_fasting_state', // 当前活跃的禁食状态
  FASTING_DISCLAIMER_AGREED: '@guowu_fasting_disclaimer_agreed', // 禁食免责声明同意状态
  LAST_FASTING_DURATION: '@guowu_last_fasting_duration', // 上次选择的禁食时长
};

// 设置相关
export const getSettings = async (): Promise<UserSettings> => {
  try {
    const data = await AsyncStorage.getItem(KEYS.SETTINGS);
    let saved: UserSettings | null = null;
    if (data) {
      saved = JSON.parse(data);
    }

    // 合并默认设置，处理新增字段
    const merged = { ...DEFAULT_SETTINGS, ...saved };

    // 如果没有设置体重单位，根据语言设置默认值
    if (!saved || !saved.weightUnit) {
      merged.weightUnit = merged.language === 'en' ? 'lb' : 'kg';
    }

    return merged;
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

export const deleteWaterRecord = async (id: string): Promise<void> => {
  try {
    const records = await getWaterRecords();
    const filtered = records.filter((r) => r.id !== id);
    await AsyncStorage.setItem(KEYS.WATER_RECORDS, JSON.stringify(filtered));
  } catch (error) {
    console.error('Error deleting water record:', error);
  }
};

export const deleteTodayWaterRecords = async (): Promise<void> => {
  try {
    const records = await getWaterRecords();
    const today = new Date().toISOString().split('T')[0];
    const filtered = records.filter((r) => r.date !== today);
    await AsyncStorage.setItem(KEYS.WATER_RECORDS, JSON.stringify(filtered));
  } catch (error) {
    console.error('Error deleting today water records:', error);
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

// 修行记录相关
export const getPracticeRecords = async (): Promise<PracticeRecord[]> => {
  try {
    const data = await AsyncStorage.getItem(KEYS.PRACTICE_RECORDS);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error getting practice records:', error);
    return [];
  }
};

export const savePracticeRecord = async (record: PracticeRecord): Promise<void> => {
  try {
    const records = await getPracticeRecords();
    const index = records.findIndex((r) => r.id === record.id);
    if (index >= 0) {
      records[index] = record;
    } else {
      records.push(record);
    }
    await AsyncStorage.setItem(KEYS.PRACTICE_RECORDS, JSON.stringify(records));
  } catch (error) {
    console.error('Error saving practice record:', error);
  }
};

export const deletePracticeRecord = async (id: string): Promise<void> => {
  try {
    const records = await getPracticeRecords();
    const filtered = records.filter((r) => r.id !== id);
    await AsyncStorage.setItem(KEYS.PRACTICE_RECORDS, JSON.stringify(filtered));
  } catch (error) {
    console.error('Error deleting practice record:', error);
  }
};

export const deleteTodayPracticeRecords = async (): Promise<void> => {
  try {
    const records = await getPracticeRecords();
    const today = new Date().toISOString().split('T')[0];
    const filtered = records.filter((r) => r.date !== today);
    await AsyncStorage.setItem(KEYS.PRACTICE_RECORDS, JSON.stringify(filtered));
  } catch (error) {
    console.error('Error deleting today practice records:', error);
  }
};

export const getTodayPracticeRecords = async (): Promise<PracticeRecord[]> => {
  try {
    const records = await getPracticeRecords();
    const today = new Date().toISOString().split('T')[0];
    return records.filter((r) => r.date === today);
  } catch (error) {
    console.error('Error getting today practice records:', error);
    return [];
  }
};

// 上次选择的体重
export const getLastWeight = async (): Promise<number | null> => {
  try {
    const data = await AsyncStorage.getItem(KEYS.LAST_WEIGHT);
    return data ? parseFloat(data) : null;
  } catch (error) {
    console.error('Error getting last weight:', error);
    return null;
  }
};

export const saveLastWeight = async (weight: number): Promise<void> => {
  try {
    await AsyncStorage.setItem(KEYS.LAST_WEIGHT, weight.toString());
  } catch (error) {
    console.error('Error saving last weight:', error);
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
      KEYS.PRACTICE_RECORDS,
      KEYS.LAST_WEIGHT,
      KEYS.FASTING_SESSIONS,
      KEYS.ACTIVE_FASTING_STATE,
    ];
    for (const key of keys) {
      await AsyncStorage.removeItem(key);
    }
  } catch (error) {
    console.error('Error clearing data:', error);
  }
};

// ============ 单次禁食相关 ============

// 获取所有禁食会话记录
export const getFastingSessions = async (): Promise<FastingSession[]> => {
  try {
    const data = await AsyncStorage.getItem(KEYS.FASTING_SESSIONS);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error getting fasting sessions:', error);
    return [];
  }
};

// 保存禁食会话记录
export const saveFastingSession = async (session: FastingSession): Promise<void> => {
  try {
    const sessions = await getFastingSessions();
    const existingIndex = sessions.findIndex((s) => s.id === session.id);
    if (existingIndex >= 0) {
      sessions[existingIndex] = session;
    } else {
      sessions.push(session);
    }
    // 按开始时间排序
    sessions.sort((a, b) => a.startTime - b.startTime);
    await AsyncStorage.setItem(KEYS.FASTING_SESSIONS, JSON.stringify(sessions));
  } catch (error) {
    console.error('Error saving fasting session:', error);
  }
};

// 获取今天的禁食会话记录
export const getTodayFastingSessions = async (): Promise<FastingSession[]> => {
  try {
    const sessions = await getFastingSessions();
    const today = new Date().toISOString().split('T')[0];
    return sessions.filter((s) => s.date === today);
  } catch (error) {
    console.error('Error getting today fasting sessions:', error);
    return [];
  }
};

// 获取活跃的禁食状态
export const getActiveFastingState = async (): Promise<ActiveFastingState | null> => {
  try {
    const data = await AsyncStorage.getItem(KEYS.ACTIVE_FASTING_STATE);
    if (!data) return null;
    const state: ActiveFastingState = JSON.parse(data);
    // 检查是否已过期
    if (state.endTime < Date.now()) {
      // 已过期，清除状态但不在这里更新会话状态（让AppContext处理）
      await saveActiveFastingState(null);
      return null;
    }
    return state;
  } catch (error) {
    console.error('Error getting active fasting state:', error);
    return null;
  }
};

// 保存活跃的禁食状态
export const saveActiveFastingState = async (state: ActiveFastingState | null): Promise<void> => {
  try {
    if (state) {
      await AsyncStorage.setItem(KEYS.ACTIVE_FASTING_STATE, JSON.stringify(state));
    } else {
      await AsyncStorage.removeItem(KEYS.ACTIVE_FASTING_STATE);
    }
  } catch (error) {
    console.error('Error saving active fasting state:', error);
  }
};

// 更新禁食会话状态
export const updateFastingSessionStatus = async (
  id: string,
  status: FastingSession['status'],
  completedAt?: number
): Promise<void> => {
  try {
    const sessions = await getFastingSessions();
    const session = sessions.find((s) => s.id === id);
    if (session) {
      session.status = status;
      if (completedAt) {
        session.completedAt = completedAt;
        // 计算实际时长（分钟）
        session.actualDurationMinutes = Math.round((completedAt - session.startTime) / 60000);
      }
      await saveFastingSession(session);
    }
  } catch (error) {
    console.error('Error updating fasting session status:', error);
  }
};

// 计算禁食统计数据
export const calculateFastingStats = async (): Promise<{
  totalSessions: number;
  totalMinutes: number;
  currentStreak: number;
  longestStreak: number;
}> => {
  try {
    const sessions = await getFastingSessions();
    // 只计算已完成的会话
    const completedSessions = sessions.filter((s) => s.status === 'completed');

    // 总次数
    const totalSessions = completedSessions.length;

    // 总分钟数
    const totalMinutes = completedSessions.reduce((sum, s) => {
      return sum + (s.actualDurationMinutes || s.durationHours * 60);
    }, 0);

    // 计算连续天数
    const sessionDates = Array.from(
      new Set(completedSessions.map((s) => s.date))
    ).sort((a, b) => b.localeCompare(a)); // 降序

    const today = new Date().toISOString().split('T')[0];
    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;
    let lastDate: string | null = null;

    for (const date of sessionDates) {
      if (!lastDate) {
        tempStreak = 1;
        lastDate = date;
        // 如果是今天或昨天，开始计算当前连续
        if (date === today || date === getYesterdayDate()) {
          currentStreak = 1;
        }
      } else {
        const daysDiff = getDaysDifference(date, lastDate);
        if (daysDiff === 1) {
          tempStreak++;
          // 如果当前连续还在进行中
          if (currentStreak > 0) {
            currentStreak++;
          }
        } else {
          longestStreak = Math.max(longestStreak, tempStreak);
          tempStreak = 1;
          // 如果断开了，重置当前连续（除非这个新日期是今天或昨天）
          if (date === today || date === getYesterdayDate()) {
            currentStreak = 1;
          } else {
            currentStreak = 0;
          }
        }
        lastDate = date;
      }
    }
    longestStreak = Math.max(longestStreak, tempStreak);

    return {
      totalSessions,
      totalMinutes,
      currentStreak,
      longestStreak,
    };
  } catch (error) {
    console.error('Error calculating fasting stats:', error);
    return {
      totalSessions: 0,
      totalMinutes: 0,
      currentStreak: 0,
      longestStreak: 0,
    };
  }
};

// 辅助函数：获取昨天的日期
const getYesterdayDate = (): string => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return yesterday.toISOString().split('T')[0];
};

// 辅助函数：计算两个日期之间的天数差
const getDaysDifference = (date1: string, date2: string): number => {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  const diffTime = d2.getTime() - d1.getTime();
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
};

// 禁食免责声明相关
export const getFastingDisclaimerAgreed = async (): Promise<boolean> => {
  try {
    const data = await AsyncStorage.getItem(KEYS.FASTING_DISCLAIMER_AGREED);
    return data === 'true';
  } catch (error) {
    console.error('Error getting disclaimer agreement:', error);
    return false;
  }
};

export const saveFastingDisclaimerAgreed = async (agreed: boolean): Promise<void> => {
  try {
    await AsyncStorage.setItem(KEYS.FASTING_DISCLAIMER_AGREED, agreed ? 'true' : 'false');
  } catch (error) {
    console.error('Error saving disclaimer agreement:', error);
  }
};

// 上次禁食时长相关
export const getLastFastingDuration = async (): Promise<number> => {
  try {
    const data = await AsyncStorage.getItem(KEYS.LAST_FASTING_DURATION);
    return data ? parseInt(data, 10) : 8; // 默认8小时
  } catch (error) {
    console.error('Error getting last fasting duration:', error);
    return 8;
  }
};

export const saveLastFastingDuration = async (hours: number): Promise<void> => {
  try {
    await AsyncStorage.setItem(KEYS.LAST_FASTING_DURATION, hours.toString());
  } catch (error) {
    console.error('Error saving last fasting duration:', error);
  }
};
