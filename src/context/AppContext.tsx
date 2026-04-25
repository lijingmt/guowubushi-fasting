import React, { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { useColorScheme, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { getLocales } from 'expo-localization';
import {
  UserSettings,
  DailyCheckIn,
  MealRecord,
  WeightRecord,
  WaterRecord,
  UserStats,
  HealthSyncStatus,
  PracticeRecord,
  MeditationType,
  FastingSession,
  ActiveFastingState,
} from '../types';
import { DEFAULT_SETTINGS, DINNER_CALORIES } from '../constants/achievements';
import {
  getSettings,
  saveSettings,
  getCheckInRecords,
  saveCheckInRecord,
  getTodayCheckIn,
  isTodayCheckedIn,
  getMealRecords,
  saveMealRecord,
  deleteMealRecord,
  getTodayMeals,
  getTodayCalories,
  getWeightRecords,
  saveWeightRecord,
  getWaterRecords,
  saveWaterRecord,
  deleteTodayWaterRecords,
  getTodayWaterIntake,
  getHealthSyncStatus,
  saveHealthSyncStatus,
  getPracticeRecords,
  savePracticeRecord,
  deleteTodayPracticeRecords,
  getFastingSessions,
  saveFastingSession,
  getActiveFastingState,
  saveActiveFastingState,
  updateFastingSessionStatus,
  calculateFastingStats,
} from '../services/storage';
import { translations } from '../i18n/translations';
import { Colors, lightColors, darkColors } from '../theme/colors';

// 检测设备语言并返回对应的应用语言
const detectDeviceLanguage = (): 'zh' | 'en' | 'es' => {
  const deviceLocales = getLocales();
  if (deviceLocales && deviceLocales.length > 0) {
    const deviceLanguage = deviceLocales[0].languageCode?.toLowerCase() || '';

    // 英文设备 → 英文
    if (deviceLanguage === 'en') {
      return 'en';
    }

    // 西班牙语设备 → 西班牙语
    if (deviceLanguage === 'es') {
      return 'es';
    }

    // 中文设备（包括 zh-CN, zh-TW, zh-HK 等）→ 中文
    if (deviceLanguage.startsWith('zh')) {
      return 'zh';
    }

    // 其他语言默认中文
    return 'zh';
  }
  return 'zh';
};

// 配置通知行为
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

interface AppContextType {
  // 主题
  colors: Colors;
  isDarkMode: boolean;
  toggleTheme: () => void;

  // 设置
  settings: UserSettings;
  updateSettings: (settings: Partial<UserSettings>) => Promise<void>;
  language: 'zh' | 'en' | 'es';
  t: typeof translations.zh;

  // 打卡
  checkInRecords: DailyCheckIn[];
  todayCheckIn: DailyCheckIn | null;
  hasCheckedToday: boolean;
  dailyCheckIn: (completed: boolean, notes?: string) => Promise<void>;

  // 饮食
  mealRecords: MealRecord[];
  todayMeals: MealRecord[];
  todayCalories: number;
  addMeal: (meal: Omit<MealRecord, 'id' | 'date'>) => Promise<void>;
  removeMeal: (id: string) => Promise<void>;

  // 体重
  weightRecords: WeightRecord[];
  addWeight: (weight: number, date?: string, note?: string) => Promise<void>;
  removeWeight: (id: string) => Promise<void>;

  // 饮水
  waterRecords: WaterRecord[];
  todayWater: number;
  addWater: (amount: number) => Promise<void>;

  // 统计
  stats: UserStats;
  refreshStats: () => Promise<void>;

  // 健康同步
  healthSync: HealthSyncStatus;
  updateHealthSync: (status: Partial<HealthSyncStatus>) => Promise<void>;

  // 修行
  practiceRecords: PracticeRecord[];
  addPractice: (
    type: 'meditation' | 'standing_meditation' | 'scripture_chanting' | 'scripture_listening',
    duration?: number,
    subtype?: MeditationType
  ) => Promise<void>;
  deleteTodayPracticeAndWater: () => Promise<void>;

  // 单次禁食
  activeFasting: ActiveFastingState | null;
  fastingSessions: FastingSession[];
  startFastingSession: (durationHours: number) => Promise<void>;
  cancelFastingSession: () => Promise<void>;
  completeFastingSession: () => Promise<void>;

  // 加载状态
  isLoading: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // 主题
  const systemColorScheme = useColorScheme();
  const [isDarkMode, setIsDarkMode] = useState(false);

  // 设置
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [language, setLanguage] = useState<'zh' | 'en' | 'es'>('zh');

  // 根据主题设置确定颜色
  const colors: Colors = (() => {
    if (settings.theme === 'auto') {
      return systemColorScheme === 'dark' ? darkColors : lightColors;
    }
    return settings.theme === 'dark' ? darkColors : lightColors;
  })();

  // 打卡
  const [checkInRecords, setCheckInRecords] = useState<DailyCheckIn[]>([]);
  const [todayCheckIn, setTodayCheckIn] = useState<DailyCheckIn | null>(null);
  const [hasCheckedToday, setHasCheckedToday] = useState(false);

  // 饮食
  const [mealRecords, setMealRecords] = useState<MealRecord[]>([]);
  const [todayMeals, setTodayMeals] = useState<MealRecord[]>([]);
  const [todayCalories, setTodayCalories] = useState(0);

  // 体重
  const [weightRecords, setWeightRecords] = useState<WeightRecord[]>([]);

  // 饮水
  const [waterRecords, setWaterRecords] = useState<WaterRecord[]>([]);
  const [todayWater, setTodayWater] = useState(0);

  // 修行
  const [practiceRecords, setPracticeRecords] = useState<PracticeRecord[]>([]);

  // 单次禁食
  const [activeFasting, setActiveFasting] = useState<ActiveFastingState | null>(null);
  const [fastingSessions, setFastingSessions] = useState<FastingSession[]>([]);

  // 统计
  const [stats, setStats] = useState<UserStats>({
    totalCheckInDays: 0,
    completedDays: 0,
    currentStreak: 0,
    longestStreak: 0,
    totalMealsSkipped: 0,
    totalCaloriesSaved: 0,
    totalWeightLost: 0,
    achievements: [],
    completionRate: 0,
    totalHoursSaved: 0,
    currentAbstinenceStreak: 0,
    longestAbstinenceStreak: 0,
    streakInGracePeriod: false,
    totalMeditationMinutes: 0,
    totalMeditationDays: 0,
    longestMeditationStreak: 0,
    totalStandingMeditationMinutes: 0,
    totalStandingMeditationDays: 0,
    totalMerit: 0,
    totalSingleFastingSessions: 0,
    totalSingleFastingMinutes: 0,
    currentSingleFastingStreak: 0,
    longestSingleFastingStreak: 0,
    fastingCaloriesSaved: 0,
    fastingEstimatedWeightLoss: 0,
  });

  // 健康同步
  const [healthSync, setHealthSync] = useState<HealthSyncStatus>({
    healthKitEnabled: false,
    googleFitEnabled: false,
  });

  const [isLoading, setIsLoading] = useState(true);

  // 初始化数据
  useEffect(() => {
    initializeData();
    setupNotifications();
    scheduleDailyReminder();
  }, []);

  // 计算统计数据
  useEffect(() => {
    calculateStats();
  }, [checkInRecords, weightRecords, practiceRecords, fastingSessions]);

  // 统计数据变化时重新调度提醒（用于宽限期通知）
  useEffect(() => {
    if (stats.streakInGracePeriod && settings.enableNotifications) {
      scheduleDailyReminder();
    }
  }, [stats.streakInGracePeriod]);

  // 设置改变时重新调度提醒
  useEffect(() => {
    if (settings.enableNotifications) {
      scheduleDailyReminder();
    }
  }, [settings.reminderTime, settings.enableNotifications]);

  const initializeData = async () => {
    try {
      // 检查是否首次启动
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      const settingsData = await AsyncStorage.getItem('@guowu_settings');
      const isFirstLaunch = settingsData === null;

      // 加载设置
      let savedSettings = await getSettings();

      // 首次启动时自动检测设备语言
      if (isFirstLaunch) {
        const detectedLanguage = detectDeviceLanguage();
        savedSettings.language = detectedLanguage;
        await saveSettings(savedSettings);
      }

      setSettings(savedSettings);
      setLanguage(savedSettings.language);

      // 加载打卡记录
      const savedCheckIns = await getCheckInRecords();
      setCheckInRecords(savedCheckIns);
      const todayRecord = await getTodayCheckIn();
      setTodayCheckIn(todayRecord);
      setHasCheckedToday(todayRecord?.completed || false);

      // 加载饮食记录
      const savedMeals = await getMealRecords();
      setMealRecords(savedMeals);
      const todayMealList = await getTodayMeals();
      setTodayMeals(todayMealList);
      const calories = await getTodayCalories();
      setTodayCalories(calories);

      // 加载体重记录
      const savedWeights = await getWeightRecords();
      setWeightRecords(savedWeights);

      // 加载饮水记录
      const savedWater = await getWaterRecords();
      setWaterRecords(savedWater);
      const water = await getTodayWaterIntake();
      setTodayWater(water);

      // 加载修行记录
      const savedPractices = await getPracticeRecords();
      setPracticeRecords(savedPractices);

      // 加载禁食会话记录
      const savedFastingSessions = await getFastingSessions();
      setFastingSessions(savedFastingSessions);

      // 加载活跃的禁食状态
      const savedActiveFasting = await getActiveFastingState();
      if (savedActiveFasting) {
        // 检查是否已过期
        if (savedActiveFasting.endTime > Date.now()) {
          setActiveFasting(savedActiveFasting);
        } else {
          // 已过期，清除状态但不标记为完成（可能用户主动取消的）
          await saveActiveFastingState(null);
          // 只会话已开始了很久才标记为完成（超过1小时）
          const hoursSinceEnd = (Date.now() - savedActiveFasting.endTime) / (1000 * 60 * 60);
          if (hoursSinceEnd < 1) {
            // 如果刚过期不久（1小时内），标记为完成
            await updateFastingSessionStatus(savedActiveFasting.sessionId, 'completed', savedActiveFasting.endTime);
          } else {
            // 否则标记为取消
            await updateFastingSessionStatus(savedActiveFasting.sessionId, 'cancelled', Date.now());
          }
          const updatedSessions = await getFastingSessions();
          setFastingSessions(updatedSessions);
        }
      }

      // 加载健康同步状态
      const savedHealthSync = await getHealthSyncStatus();
      setHealthSync(savedHealthSync);
    } catch (error) {
      console.error('Error initializing data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const setupNotifications = async () => {
    // Web 平台不支持通知
    if (Platform.OS === 'web') return;

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    if (existingStatus !== 'granted') {
      await Notifications.requestPermissionsAsync();
    }

    // 清除所有遗留的通知，防止之前测试的通知被触发
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      console.log('Cleared all scheduled notifications on startup');
    } catch (error) {
      console.error('Error clearing notifications:', error);
    }
  };

  const scheduleDailyReminder = async () => {
    if (!settings.enableNotifications) return;
    // Web 平台不支持通知
    if (Platform.OS === 'web') return;

    // 取消所有已安排的通知
    await Notifications.cancelAllScheduledNotificationsAsync();

    const [hours, minutes] = settings.reminderTime.split(':').map(Number);

    // 根据宽限期状态决定通知内容
    const isInGracePeriod = stats.streakInGracePeriod;
    const getNotificationMessage = () => {
      if (isInGracePeriod) {
        // 宽限期状态的特殊消息
        if (language === 'zh') {
          return '今天过午不食完成了吗？火苗已冰冻！赶快打卡，击碎冰冻火苗！';
        } else if (language === 'es') {
          return '¿Completaste el ayuno de hoy? ¡La llama está congelada! ¡Regístrate ahora para romper el hielo!';
        }
        return 'Did you complete your fasting today? Flame is frozen! Check in now to break the ice!';
      }
      // 正常消息
      if (language === 'zh') {
        return '今天过午不食完成了吗？快来打卡吧！';
      } else if (language === 'es') {
        return '¿Completaste el ayuno de hoy? ¡Regístrate ahora!';
      }
      return 'Did you complete your fasting today? Check in now!';
    };

    // 安排每日重复提醒
    await Notifications.scheduleNotificationAsync({
      content: {
        title: language === 'zh' ? '过午不食打卡' : 'Daily Check-In',
        body: getNotificationMessage(),
        sound: 'default',
        priority: Notifications.AndroidNotificationPriority.HIGH,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: hours,
        minute: minutes,
      } as any,
    });
  };

  const calculateStats = async () => {
    const totalDays = checkInRecords.length;
    const completedDays = checkInRecords.filter((r) => r.completed).length;

    // 计算连续天数（带1天宽限期）
    let currentStreak = 0;
    let longestStreak = 0;

    // 计算禁欲连续天数（带1天宽限期）
    let currentAbstinenceStreak = 0;
    let longestAbstinenceStreak = 0;

    const sortedRecords = [...checkInRecords].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    const today = new Date().toISOString().split('T')[0];
    let checkingDate = new Date(today);
    let abstinenceDate = new Date(today);
    let graceDaysUsed = 0; // 已使用的宽限天数
    const GRACE_PERIOD = 1; // 宽限期天数

    for (const record of sortedRecords) {
      const recordDate = record.date;
      if (record.completed) {
        const checkDateStr = checkingDate.toISOString().split('T')[0];
        const daysDiff = Math.floor(
          (new Date(checkDateStr).getTime() - new Date(recordDate).getTime()) / (1000 * 60 * 60 * 24)
        );

        if (recordDate === checkDateStr) {
          // 日期匹配，增加连胜
          currentStreak++;
          checkingDate.setDate(checkingDate.getDate() - 1);
          graceDaysUsed = 0; // 重置宽限期使用天数
        } else if (daysDiff === 1 + graceDaysUsed) {
          // 在宽限期内（跳过1天）
          currentStreak++;
          checkingDate = new Date(recordDate);
          checkingDate.setDate(checkingDate.getDate() - 1);
          graceDaysUsed++; // 增加已使用的宽限天数
        } else if (daysDiff > 1 + graceDaysUsed) {
          // 超过宽限期，重置连胜
          longestStreak = Math.max(longestStreak, currentStreak);
          currentStreak = 1;
          checkingDate = new Date(recordDate);
          checkingDate.setDate(checkingDate.getDate() - 1);
          graceDaysUsed = 0;
        } else {
          // daysDiff < 1，说明记录顺序有问题，跳过
          continue;
        }

        // 检查是否禁欲完成
        const hasAbstinence = record.notes && record.notes.includes('禁欲完成');
        if (hasAbstinence) {
          const abstinenceDateStr = abstinenceDate.toISOString().split('T')[0];
          const abstinenceDaysDiff = Math.floor(
            (new Date(abstinenceDateStr).getTime() - new Date(recordDate).getTime()) / (1000 * 60 * 60 * 24)
          );

          if (recordDate === abstinenceDateStr) {
            currentAbstinenceStreak++;
            abstinenceDate.setDate(abstinenceDate.getDate() - 1);
          } else if (abstinenceDaysDiff === 1) {
            // 禁欲也支持1天宽限期
            currentAbstinenceStreak++;
            abstinenceDate = new Date(recordDate);
            abstinenceDate.setDate(abstinenceDate.getDate() - 1);
          } else {
            longestAbstinenceStreak = Math.max(longestAbstinenceStreak, currentAbstinenceStreak);
            currentAbstinenceStreak = 1;
            abstinenceDate = new Date(recordDate);
            abstinenceDate.setDate(abstinenceDate.getDate() - 1);
          }
        } else {
          // 如果当天没有禁欲，重置当前禁欲连胜
          longestAbstinenceStreak = Math.max(longestAbstinenceStreak, currentAbstinenceStreak);
          currentAbstinenceStreak = 0;
        }
      }
    }

    longestStreak = Math.max(longestStreak, currentStreak);
    longestAbstinenceStreak = Math.max(longestAbstinenceStreak, currentAbstinenceStreak);

    // 判断是否处于宽限期状态：今天没打卡，且昨天也没打卡，但有连胜记录
    const todayRecord = sortedRecords.find(r => r.date === today);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    const yesterdayRecord = sortedRecords.find(r => r.date === yesterdayStr);

    // 如果今天没打卡（或没完成），且昨天也没完成打卡，但有连胜记录，说明处于宽限期
    const streakInGracePeriod = currentStreak > 0 &&
      (!todayRecord || !todayRecord.completed) &&
      (!yesterdayRecord || !yesterdayRecord.completed);

    // 计算节省的卡路里、少吃顿数和时间
    const totalCaloriesSaved = completedDays * DINNER_CALORIES;
    const totalMealsSkipped = completedDays;

    // 每天节约：吃饭1小时 + 做饭1小时 = 2小时
    const totalHoursSaved = completedDays * 2;

    // 计算减重
    let weightLoss = 0;
    if (weightRecords.length >= 2) {
      const firstWeight = weightRecords[0].weight;
      const lastWeight = weightRecords[weightRecords.length - 1].weight;
      weightLoss = firstWeight - lastWeight;
    }

    // 计算完成率
    const completionRate = totalDays > 0 ? Math.round((completedDays / totalDays) * 100) : 0;

    // 计算修行统计
    let totalMeditationMinutes = 0;
    let totalMeditationDays = 0;
    let longestMeditationStreak = 0;
    let currentMeditationStreak = 0;

    let totalStandingMeditationMinutes = 0;
    let totalStandingMeditationDays = 0;

    let totalMerit = 0;

    // 统计打坐记录
    const meditationRecords = practiceRecords.filter((r) => r.type === 'meditation');
    const meditationDates = [...new Set(meditationRecords.map((r) => r.date))];
    totalMeditationDays = meditationDates.length;
    totalMeditationMinutes = meditationRecords.reduce((sum, r) => sum + (r.duration || 0), 0);

    // 计算打坐连续天数
    const sortedMeditationDates = meditationDates.sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
    let meditationCheckDate = new Date(today);
    for (const dateStr of sortedMeditationDates) {
      if (dateStr === meditationCheckDate.toISOString().split('T')[0]) {
        currentMeditationStreak++;
        meditationCheckDate.setDate(meditationCheckDate.getDate() - 1);
      } else {
        longestMeditationStreak = Math.max(longestMeditationStreak, currentMeditationStreak);
        currentMeditationStreak = 1;
        meditationCheckDate = new Date(dateStr);
        meditationCheckDate.setDate(meditationCheckDate.getDate() - 1);
      }
    }
    longestMeditationStreak = Math.max(longestMeditationStreak, currentMeditationStreak);

    // 统计站桩记录
    const standingRecords = practiceRecords.filter((r) => r.type === 'standing_meditation');
    totalStandingMeditationDays = [...new Set(standingRecords.map((r) => r.date))].length;
    totalStandingMeditationMinutes = standingRecords.reduce((sum, r) => sum + (r.duration || 0), 0);

    // 计算功德值：诵经+10，听经+5
    totalMerit = practiceRecords.reduce((sum, r) => {
      if (r.type === 'scripture_chanting') return sum + 10;
      if (r.type === 'scripture_listening') return sum + 5;
      return sum;
    }, 0);

    // 计算单次禁食统计
    const fastingStats = await calculateFastingStats();

    setStats({
      totalCheckInDays: totalDays,
      completedDays,
      currentStreak,
      longestStreak,
      totalMealsSkipped,
      totalCaloriesSaved,
      totalWeightLost: weightLoss > 0 ? weightLoss : 0,
      achievements: [],
      completionRate,
      totalHoursSaved,
      currentAbstinenceStreak,
      longestAbstinenceStreak,
      streakInGracePeriod,
      totalMeditationMinutes,
      totalMeditationDays,
      longestMeditationStreak,
      totalStandingMeditationMinutes,
      totalStandingMeditationDays,
      totalMerit,
      totalSingleFastingSessions: fastingStats.totalSessions,
      totalSingleFastingMinutes: fastingStats.totalMinutes,
      currentSingleFastingStreak: fastingStats.currentStreak,
      longestSingleFastingStreak: fastingStats.longestStreak,
      // 计算禁食节省的卡路里
      // 假设：每小时禁食节省约70卡路里（相当于一顿轻食）
      fastingCaloriesSaved: Math.round(fastingStats.totalMinutes * (70 / 60)),
      // 计算预计体重减少
      // 假设：7700卡路里 ≈ 1公斤体重
      fastingEstimatedWeightLoss: parseFloat((fastingStats.totalMinutes * (70 / 60) / 7700).toFixed(2)),
    });
  };

  const updateSettings = async (newSettings: Partial<UserSettings>) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    await saveSettings(updated);
    if (newSettings.language) {
      setLanguage(newSettings.language);
    }
  };

  const toggleTheme = async () => {
    const themeCycle: Record<'light' | 'dark' | 'auto', 'light' | 'dark' | 'auto'> = {
      light: 'dark',
      dark: 'auto',
      auto: 'light',
    };
    const newTheme = themeCycle[settings.theme];
    await updateSettings({ theme: newTheme });
  };

  const dailyCheckIn = async (completed: boolean, notes?: string) => {
    const today = new Date().toISOString().split('T')[0];

    // Check if there's already a check-in for today
    const existingRecord = todayCheckIn || checkInRecords.find(r => r.date === today);

    if (existingRecord) {
      // Update existing record
      const updatedRecord: DailyCheckIn = {
        ...existingRecord,
        completed,
        brokeAfterNoon: !completed,
        notes,
        // Keep original checkInTime but update the check-in time on edit
        checkInTime: Date.now(),
      };

      await saveCheckInRecord(updatedRecord);
      setTodayCheckIn(updatedRecord);
      setHasCheckedToday(completed);

      const updatedRecords = await getCheckInRecords();
      setCheckInRecords(updatedRecords);
    } else {
      // Create new record
      const record: DailyCheckIn = {
        id: `checkin_${Date.now()}`,
        date: today,
        completed,
        brokeAfterNoon: !completed,
        checkInTime: Date.now(),
        notes,
      };

      await saveCheckInRecord(record);
      setTodayCheckIn(record);
      setHasCheckedToday(true);

      const updatedRecords = await getCheckInRecords();
      setCheckInRecords(updatedRecords);
    }
  };

  const addMeal = async (meal: Omit<MealRecord, 'id' | 'date'>) => {
    const today = new Date().toISOString().split('T')[0];
    const newMeal: MealRecord = {
      ...meal,
      id: `meal_${Date.now()}`,
      date: today,
    };

    await saveMealRecord(newMeal);
    const updatedRecords = await getMealRecords();
    setMealRecords(updatedRecords);
    const todayMealList = await getTodayMeals();
    setTodayMeals(todayMealList);
    const calories = await getTodayCalories();
    setTodayCalories(calories);
  };

  const removeMeal = async (id: string) => {
    await deleteMealRecord(id);
    const updatedRecords = await getMealRecords();
    setMealRecords(updatedRecords);
    const todayMealList = await getTodayMeals();
    setTodayMeals(todayMealList);
    const calories = await getTodayCalories();
    setTodayCalories(calories);
  };

  const addWeight = async (weight: number, date?: string, note?: string) => {
    const recordDate = date || new Date().toISOString().split('T')[0];
    const newRecord: WeightRecord = {
      id: `weight_${Date.now()}`,
      date: recordDate,
      weight,
      note,
    };
    await saveWeightRecord(newRecord);
    const updatedRecords = await getWeightRecords();
    setWeightRecords(updatedRecords);
  };

  const removeWeight = async (id: string) => {
    const updatedRecords = weightRecords.filter((r) => r.id !== id);
    setWeightRecords(updatedRecords);
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    await AsyncStorage.setItem(
      '@guowu_weight_records',
      JSON.stringify(updatedRecords)
    );
  };

  const addWater = async (amount: number) => {
    const today = new Date().toISOString().split('T')[0];
    const now = new Date();
    const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const newRecord: WaterRecord = {
      id: `water_${Date.now()}`,
      date: today,
      amount,
      time,
    };

    await saveWaterRecord(newRecord);
    const updatedRecords = await getWaterRecords();
    setWaterRecords(updatedRecords);
    const water = await getTodayWaterIntake();
    setTodayWater(water);
  };

  const addPractice = async (
    type: 'meditation' | 'standing_meditation' | 'scripture_chanting' | 'scripture_listening',
    duration?: number,
    subtype?: MeditationType
  ) => {
    const today = new Date().toISOString().split('T')[0];

    // 计算功德值
    let merit = 0;
    if (type === 'scripture_chanting') merit = 10;
    if (type === 'scripture_listening') merit = 5;

    const newRecord: PracticeRecord = {
      id: `practice_${type}_${Date.now()}`,
      date: today,
      type,
      duration,
      subtype,
      merit,
      timestamp: Date.now(),
    };

    await savePracticeRecord(newRecord);
    const updatedRecords = await getPracticeRecords();
    setPracticeRecords(updatedRecords);
  };

  const deleteTodayPracticeAndWater = async () => {
    await deleteTodayPracticeRecords();
    await deleteTodayWaterRecords();
    const updatedPractices = await getPracticeRecords();
    const updatedWater = await getWaterRecords();
    setPracticeRecords(updatedPractices);
    setWaterRecords(updatedWater);
  };

  const refreshStats = async () => {
    await calculateStats();
  };

  const updateHealthSync = async (status: Partial<HealthSyncStatus>) => {
    const updated = { ...healthSync, ...status, lastSyncTime: Date.now() };
    setHealthSync(updated);
    await saveHealthSyncStatus(updated);
  };

  // 开始单次禁食会话
  const startFastingSession = async (durationHours: number) => {
    const now = Date.now();
    const endTime = now + durationHours * 60 * 60 * 1000;
    const sessionId = `fasting_${now}`;
    const today = new Date().toISOString().split('T')[0];

    console.log('Starting fasting session:', { durationHours, startTime: now, endTime });

    // 创建会话记录
    const session: FastingSession = {
      id: sessionId,
      startTime: now,
      endTime,
      durationHours,
      status: 'active',
      date: today,
    };

    // 创建活跃状态
    const activeState: ActiveFastingState = {
      sessionId,
      startTime: now,
      endTime,
      durationHours,
    };

    // 保存到存储
    await saveFastingSession(session);
    await saveActiveFastingState(activeState);

    // 调度完成通知
    if (settings.enableNotifications && Platform.OS !== 'web') {
      try {
        const triggerDate = new Date(endTime);
        console.log('Scheduling notification at:', triggerDate.toISOString());
        console.log('Current time:', new Date().toISOString());

        const identifier = await Notifications.scheduleNotificationAsync({
          content: {
            title: language === 'zh' ? '🎉 禁食结束！' : language === 'es' ? '¡Ayuno terminado!' : 'Fasting Complete!',
            body: language === 'zh'
              ? `恭喜！你已完成${durationHours}小时禁食`
              : language === 'es'
              ? `¡Felicidades! Has completado ${durationHours} horas de ayuno`
              : `Congratulations! You've completed ${durationHours} hours of fasting`,
            sound: 'default',
            priority: Notifications.AndroidNotificationPriority.HIGH,
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: triggerDate,
          },
        });
        console.log('Fasting completion notification scheduled with ID:', identifier);

        // 调试：列出所有已调度的通知
        const scheduled = await Notifications.getAllScheduledNotificationsAsync();
        console.log('All scheduled notifications:', scheduled.length);
        scheduled.forEach(n => {
          console.log('- ID:', n.identifier, 'Trigger:', JSON.stringify(n.trigger));
        });
      } catch (error) {
        console.error('Error scheduling notification:', error);
      }
    }

    // 更新状态
    setActiveFasting(activeState);
    const updatedSessions = await getFastingSessions();
    setFastingSessions(updatedSessions);
  };

  // 取消禁食会话
  const cancelFastingSession = async () => {
    if (!activeFasting) return;

    // 更新会话状态为取消
    await updateFastingSessionStatus(activeFasting.sessionId, 'cancelled', Date.now());
    await saveActiveFastingState(null);

    // 取消通知
    if (Platform.OS !== 'web') {
      try {
        await Notifications.cancelAllScheduledNotificationsAsync();
        // 重新调度每日提醒
        await scheduleDailyReminder();
      } catch (error) {
        console.error('Error cancelling notifications:', error);
      }
    }

    // 更新状态
    setActiveFasting(null);
    const updatedSessions = await getFastingSessions();
    setFastingSessions(updatedSessions);
  };

  // 完成禁食会话
  const completeFastingSession = async () => {
    if (!activeFasting) return;

    // 更新会话状态为完成
    await updateFastingSessionStatus(activeFasting.sessionId, 'completed', Date.now());
    await saveActiveFastingState(null);

    // 立即显示完成通知
    if (settings.enableNotifications && Platform.OS !== 'web') {
      try {
        await Notifications.presentNotificationAsync({
          title: language === 'zh' ? '🎉 禁食结束！' : language === 'es' ? '¡Ayuno terminado!' : 'Fasting Complete!',
          body: language === 'zh'
            ? `恭喜！你已完成${activeFasting.durationHours}小时禁食`
            : language === 'es'
            ? `¡Felicidades! Has completado ${activeFasting.durationHours} horas de ayuno`
            : `Congratulations! You've completed ${activeFasting.durationHours} hours of fasting`,
          sound: 'default',
          priority: Notifications.AndroidNotificationPriority.HIGH,
        });
        console.log('Fasting completion notification presented immediately');

        // 取消其他已调度的通知
        await Notifications.cancelAllScheduledNotificationsAsync();
        // 重新调度每日提醒
        await scheduleDailyReminder();
      } catch (error) {
        console.error('Error presenting completion notification:', error);
      }
    } else {
      // 如果没有启用通知，仍然需要清理已调度的通知
      if (Platform.OS !== 'web') {
        try {
          await Notifications.cancelAllScheduledNotificationsAsync();
          await scheduleDailyReminder();
        } catch (error) {
          console.error('Error cancelling scheduled notification:', error);
        }
      }
    }

    // 更新状态
    setActiveFasting(null);
    const updatedSessions = await getFastingSessions();
    setFastingSessions(updatedSessions);
  };

  const t = translations[language];

  return (
    <AppContext.Provider
      value={{
        colors,
        isDarkMode,
        toggleTheme,
        settings,
        updateSettings,
        language,
        t,
        checkInRecords,
        todayCheckIn,
        hasCheckedToday,
        dailyCheckIn,
        mealRecords,
        todayMeals,
        todayCalories,
        addMeal,
        removeMeal,
        weightRecords,
        addWeight,
        removeWeight,
        waterRecords,
        todayWater,
        addWater,
        stats,
        refreshStats,
        healthSync,
        updateHealthSync,
        practiceRecords,
        addPractice,
        deleteTodayPracticeAndWater,
        activeFasting,
        fastingSessions,
        startFastingSession,
        cancelFastingSession,
        completeFastingSession,
        isLoading,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
};
