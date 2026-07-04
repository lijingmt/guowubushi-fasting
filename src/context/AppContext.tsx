import React, { useState, useEffect, useMemo, useRef, createContext, useContext, ReactNode } from 'react';
import { useColorScheme, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { getLocales } from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
  DailyTask,
  DailyRating,
  RetentionState,
  GrowthProfile,
  WeeklySummary,
  RetentionMilestone,
  DailyRewardResult,
  FriendEncouragement,
} from '../types';
import { DEFAULT_SETTINGS, DINNER_CALORIES } from '../constants/achievements';
import {
  getSettings,
  saveSettings,
  getCheckInRecords,
  saveCheckInRecord,
  getMealRecords,
  saveMealRecord,
  deleteMealRecord,
  getWeightRecords,
  saveWeightRecord,
  getWaterRecords,
  saveWaterRecord,
  deleteTodayWaterRecords,
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
  getRetentionState,
  saveRetentionState,
} from '../services/storage';
import {
  DEFAULT_RETENTION_STATE,
  buildDailyTasks,
  buildGrowthProfile,
  buildMilestoneRewards,
  buildWeeklySummary,
  calculateDailyRating,
  canRepairYesterday,
  countPerfectRewardDays,
  getDateString,
  normalizeRetentionState,
} from '../utils/retention';
import { getTranslations, type Language, type TranslationStrings } from '../i18n/translations';
import { Colors, lightColors, darkColors } from '../theme/colors';

const DAILY_REMINDER_NOTIFICATION_ID_KEY = '@guowu_daily_reminder_notification_id';
const FASTING_NOTIFICATION_ID_KEY = '@guowu_fasting_notification_id';
const DAILY_REMINDER_NOTIFICATION_KIND = 'dailyReminder';
const LEGACY_DAILY_REMINDER_TITLES = ['过午不食打卡', 'Daily Check-In'];

const isDailyReminderRequest = (request: Notifications.NotificationRequest) => {
  const requestData = (request.content.data || {}) as Record<string, unknown>;
  if (requestData.kind === DAILY_REMINDER_NOTIFICATION_KIND) {
    return true;
  }

  const title = typeof request.content.title === 'string' ? request.content.title : '';
  const trigger = (request.trigger || {}) as Record<string, unknown>;
  const triggerType = typeof trigger.type === 'string' ? trigger.type.toLowerCase() : '';
  const looksLikeDailyTrigger = triggerType.includes('daily')
    || (typeof trigger.hour === 'number' && typeof trigger.minute === 'number' && !('date' in trigger));

  return looksLikeDailyTrigger && LEGACY_DAILY_REMINDER_TITLES.includes(title);
};

// 检测设备语言并返回对应的应用语言
const detectDeviceLanguage = (): Language => {
  const deviceLocales = getLocales();
  if (deviceLocales && deviceLocales.length > 0) {
    const deviceLanguage = deviceLocales[0].languageCode?.toLowerCase() || '';

    // 支持的语言映射
    const supportedLanguages: Record<string, Language> = {
      'zh': 'zh',  // 中文
      'en': 'en',  // 英文
      'es': 'es',  // 西班牙语
      'ja': 'ja',  // 日语
      'ko': 'ko',  // 韩语
      'fr': 'fr',  // 法语
      'de': 'de',  // 德语
      'pt': 'pt',  // 葡萄牙语
      'ru': 'ru',  // 俄语
      'ar': 'ar',  // 阿拉伯语
      'it': 'it',  // 意大利语
      'hi': 'hi',  // 印地语
      'vi': 'vi',  // 越南语
      'th': 'th',  // 泰语
    };

    // 检查是否支持设备语言
    if (deviceLanguage in supportedLanguages) {
      return supportedLanguages[deviceLanguage];
    }

    // 中文设备（包括 zh-CN, zh-TW, zh-HK 等）→ 简体/繁体中文
    if (deviceLanguage.startsWith('zh')) {
      // zh-TW, zh-HK, zh-MO → 繁体中文
      if (deviceLanguage.includes('tw') || deviceLanguage.includes('hk') || deviceLanguage.includes('mo')) {
        return 'zh-Hant';
      }
      // zh-CN, zh-SG → 简体中文
      return 'zh';
    }
  }
  // 默认英文
  return 'en';
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
  language: Language;
  t: TranslationStrings;

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

  // 留存激励
  retentionState: RetentionState;
  dailyTasks: DailyTask[];
  dailyRating: DailyRating;
  growthProfile: GrowthProfile;
  weeklySummary: WeeklySummary;
  milestoneRewards: RetentionMilestone[];
  claimDailyReward: () => Promise<DailyRewardResult>;
  useStreakRepairCard: () => Promise<{ success: boolean; message: string }>;
  claimMilestoneReward: (milestoneId: string) => Promise<{ success: boolean; message: string }>;
  recordShareAction: (kind?: 'daily' | 'weekly') => Promise<void>;
  recordFriendEncouragement: (toUserId: string) => Promise<void>;
  recordReceivedFriendEncouragement: (encouragement: FriendEncouragement) => Promise<void>;

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
  const [language, setLanguage] = useState<Language>('zh');
  const dailyReminderScheduleTokenRef = useRef(0);

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
    meditationSessionCount: 0,
    longestMeditationSession: 0,
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

  // 留存激励
  const [retentionState, setRetentionState] = useState<RetentionState>(DEFAULT_RETENTION_STATE);
  const retentionStateRef = useRef<RetentionState>(DEFAULT_RETENTION_STATE);

  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    retentionStateRef.current = retentionState;
  }, [retentionState]);

  const todayDate = getDateString();

  const dailyTasks = useMemo(
    () =>
      buildDailyTasks({
        date: todayDate,
        language,
        settings,
        checkInRecords,
        mealRecords,
        waterRecords,
        practiceRecords,
        fastingSessions,
        activeFasting,
        retentionState,
      }),
    [
      todayDate,
      language,
      settings,
      checkInRecords,
      mealRecords,
      waterRecords,
      practiceRecords,
      fastingSessions,
      activeFasting,
      retentionState,
    ]
  );

  const dailyRating = useMemo(
    () => calculateDailyRating(dailyTasks, todayDate),
    [dailyTasks, todayDate]
  );

  const weeklySummary = useMemo(
    () =>
      buildWeeklySummary({
        language,
        settings,
        checkInRecords,
        mealRecords,
        waterRecords,
        practiceRecords,
        fastingSessions,
        activeFasting,
        retentionState,
        endDate: todayDate,
      }),
    [
      todayDate,
      language,
      settings,
      checkInRecords,
      mealRecords,
      waterRecords,
      practiceRecords,
      fastingSessions,
      activeFasting,
      retentionState,
    ]
  );

  const growthProfile = useMemo(
    () => buildGrowthProfile(stats, retentionState, weeklySummary, language),
    [stats, retentionState, weeklySummary, language]
  );

  const milestoneRewards = useMemo(
    () => buildMilestoneRewards(stats, weeklySummary, retentionState, language),
    [stats, weeklySummary, retentionState, language]
  );

  // 初始化数据
  useEffect(() => {
    initializeData();
    setupNotifications();
  }, []);

  // 计算统计数据
  useEffect(() => {
    calculateStats();
  }, [checkInRecords, weightRecords, practiceRecords, fastingSessions]);

  // 只在加载完成、提醒开关、提醒时间或语言改变时调度一次每日提醒。
  useEffect(() => {
    if (isLoading) return;
    if (settings.enableNotifications) {
      scheduleDailyReminder();
    } else {
      cancelDailyReminderNotifications();
    }
  }, [isLoading, settings.reminderTime, settings.enableNotifications, language]);

  const initializeData = async () => {
    try {
      // 检查是否首次启动
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

      const [
        savedCheckIns,
        savedMeals,
        savedWeights,
        savedWater,
        savedPractices,
        savedFastingSessions,
        savedActiveFasting,
        savedHealthSync,
        savedRetentionState,
      ] = await Promise.all([
        getCheckInRecords(),
        getMealRecords(),
        getWeightRecords(),
        getWaterRecords(),
        getPracticeRecords(),
        getFastingSessions(),
        getActiveFastingState(),
        getHealthSyncStatus(),
        getRetentionState(),
      ]);
      const today = new Date().toISOString().split('T')[0];

      // 加载打卡记录
      setCheckInRecords(savedCheckIns);
      const todayRecord = savedCheckIns.find((r) => r.date === today) || null;
      setTodayCheckIn(todayRecord);
      setHasCheckedToday(todayRecord?.completed || false);

      // 加载饮食记录
      setMealRecords(savedMeals);
      const todayMealList = savedMeals.filter((r) => r.date === today);
      setTodayMeals(todayMealList);
      const calories = todayMealList.reduce((sum, meal) => sum + meal.calories, 0);
      setTodayCalories(calories);

      // 加载体重记录
      setWeightRecords(savedWeights);

      // 加载饮水记录
      setWaterRecords(savedWater);
      const water = savedWater
        .filter((r) => r.date === today)
        .reduce((sum, record) => sum + record.amount, 0);
      setTodayWater(water);

      // 加载修行记录
      setPracticeRecords(savedPractices);

      // 加载禁食会话记录
      setFastingSessions(savedFastingSessions);

      // 加载活跃的禁食状态
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
      setHealthSync(savedHealthSync);

      // 加载留存激励状态
      retentionStateRef.current = savedRetentionState;
      setRetentionState(savedRetentionState);
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

    // 不在启动时全量清空通知，避免每日提醒和禁食完成提醒互相覆盖。
  };

  const scheduleDailyReminder = async () => {
    const scheduleToken = dailyReminderScheduleTokenRef.current + 1;
    dailyReminderScheduleTokenRef.current = scheduleToken;

    if (!settings.enableNotifications) {
      await cancelDailyReminderNotifications();
      return;
    }
    // Web 平台不支持通知
    if (Platform.OS === 'web') return;

    await cancelDailyReminderNotifications();
    if (dailyReminderScheduleTokenRef.current !== scheduleToken) {
      return;
    }

    const [hours, minutes] = settings.reminderTime.split(':').map(Number);

    // 根据宽限期和今日任务状态决定通知内容
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
      const pendingTasks = dailyTasks.filter((task) => !task.completed);
      const nextTask = pendingTasks[0];
      if (dailyRating.stars >= 5) {
        if (language === 'zh') return `今天已满星，连续${stats.currentStreak}天。睡前看一眼周总结，保持节奏。`;
        if (language === 'es') return `Hoy ya tienes 5 estrellas. Revisa tu resumen semanal y mantén el ritmo.`;
        return `Today is already 5-star. Review your weekly summary and keep the rhythm.`;
      }
      if (dailyRating.stars > 0 && nextTask) {
        if (language === 'zh') return `今日${dailyRating.stars}星，还差「${nextTask.title}」就更稳了。`;
        if (language === 'es') return `Hoy tienes ${dailyRating.stars} estrellas. Completa: ${nextTask.title}.`;
        return `You have ${dailyRating.stars} stars today. Next: ${nextTask.title}.`;
      }
      if (stats.currentStreak >= 6) {
        if (language === 'zh') return `连续${stats.currentStreak}天了，今天补上主线打卡，不要让节奏断掉。`;
        if (language === 'es') return `Llevas ${stats.currentStreak} días. Completa el check-in principal.`;
        return `${stats.currentStreak}-day streak. Complete the main check-in today.`;
      }
      // 正常消息
      if (language === 'zh') {
        return '今天过午不食完成了吗？先完成主线打卡，再补一个小目标。';
      } else if (language === 'es') {
        return '¿Completaste el ayuno de hoy? ¡Regístrate ahora!';
      }
      return 'Did you complete your fasting today? Check in now!';
    };

    // 安排每日重复提醒
    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title: language === 'zh' ? '过午不食打卡' : 'Daily Check-In',
        body: getNotificationMessage(),
        data: { kind: DAILY_REMINDER_NOTIFICATION_KIND },
        sound: 'default',
        priority: Notifications.AndroidNotificationPriority.HIGH,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: hours,
        minute: minutes,
      } as any,
    });

    if (dailyReminderScheduleTokenRef.current !== scheduleToken) {
      await Notifications.cancelScheduledNotificationAsync(identifier);
      return;
    }

    await AsyncStorage.setItem(DAILY_REMINDER_NOTIFICATION_ID_KEY, identifier);
  };

  const cancelDailyReminderNotifications = async () => {
    if (Platform.OS === 'web') return;

    try {
      const identifiers = new Set<string>();
      const storedIdentifier = await AsyncStorage.getItem(DAILY_REMINDER_NOTIFICATION_ID_KEY);
      if (storedIdentifier) {
        identifiers.add(storedIdentifier);
      }

      const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
      scheduledNotifications.forEach((request) => {
        if (isDailyReminderRequest(request)) {
          identifiers.add(request.identifier);
        }
      });

      await Promise.all(
        Array.from(identifiers).map(async (identifier) => {
          try {
            await Notifications.cancelScheduledNotificationAsync(identifier);
          } catch (error) {
            console.error('Error cancelling daily reminder notification:', error);
          }
        })
      );
      await AsyncStorage.removeItem(DAILY_REMINDER_NOTIFICATION_ID_KEY);
    } catch (error) {
      console.error('Error cancelling daily reminder notifications:', error);
    }
  };

  const cancelStoredNotification = async (storageKey: string) => {
    if (Platform.OS === 'web') return;
    try {
      const identifier = await AsyncStorage.getItem(storageKey);
      if (identifier) {
        await Notifications.cancelScheduledNotificationAsync(identifier);
        await AsyncStorage.removeItem(storageKey);
      }
    } catch (error) {
      console.error('Error cancelling stored notification:', error);
    }
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
    const meditationSessionCount = meditationRecords.length;
    const longestMeditationSession = meditationRecords.length > 0
      ? Math.max(...meditationRecords.map((r) => r.duration || 0))
      : 0;

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
      meditationSessionCount,
      longestMeditationSession,
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
    const todayMealList = updatedRecords.filter((r) => r.date === today);
    setTodayMeals(todayMealList);
    const calories = todayMealList.reduce((sum, item) => sum + item.calories, 0);
    setTodayCalories(calories);
  };

  const removeMeal = async (id: string) => {
    await deleteMealRecord(id);
    const updatedRecords = await getMealRecords();
    setMealRecords(updatedRecords);
    const today = new Date().toISOString().split('T')[0];
    const todayMealList = updatedRecords.filter((r) => r.date === today);
    setTodayMeals(todayMealList);
    const calories = todayMealList.reduce((sum, item) => sum + item.calories, 0);
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
    const water = updatedRecords
      .filter((r) => r.date === today)
      .reduce((sum, record) => sum + record.amount, 0);
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
    const today = new Date().toISOString().split('T')[0];
    setPracticeRecords(updatedPractices);
    setWaterRecords(updatedWater);
    setTodayWater(
      updatedWater
        .filter((r) => r.date === today)
        .reduce((sum, record) => sum + record.amount, 0)
    );
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

    if (__DEV__) {
      console.log('Starting fasting session:', { durationHours, startTime: now, endTime });
    }

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
        if (__DEV__) {
          console.log('Scheduling notification at:', triggerDate.toISOString());
          console.log('Current time:', new Date().toISOString());
        }

        await cancelStoredNotification(FASTING_NOTIFICATION_ID_KEY);
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
        activeState.notificationId = identifier;
        await saveActiveFastingState(activeState);
        await AsyncStorage.setItem(FASTING_NOTIFICATION_ID_KEY, identifier);
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
        await cancelStoredNotification(FASTING_NOTIFICATION_ID_KEY);
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
        await cancelStoredNotification(FASTING_NOTIFICATION_ID_KEY);
        await Notifications.scheduleNotificationAsync({
          content: {
            title: language === 'zh' ? '🎉 禁食结束！' : language === 'es' ? '¡Ayuno terminado!' : 'Fasting Complete!',
            body: language === 'zh'
              ? `恭喜！你已完成${activeFasting.durationHours}小时禁食`
              : language === 'es'
              ? `¡Felicidades! Has completado ${activeFasting.durationHours} horas de ayuno`
              : `Congratulations! You've completed ${activeFasting.durationHours} hours of fasting`,
            sound: true,
          },
          trigger: null, // Show immediately
        });
        // 重新调度每日提醒
        await scheduleDailyReminder();
      } catch (error) {
        console.error('Error presenting completion notification:', error);
      }
    } else {
      // 如果没有启用通知，仍然需要清理已调度的通知
      if (Platform.OS !== 'web') {
        try {
          await cancelStoredNotification(FASTING_NOTIFICATION_ID_KEY);
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

  const updateRetentionState = async (
    updater: (current: RetentionState) => RetentionState
  ): Promise<RetentionState> => {
    const next = normalizeRetentionState(updater(normalizeRetentionState(retentionStateRef.current)));
    retentionStateRef.current = next;
    setRetentionState(next);
    await saveRetentionState(next);
    return next;
  };

  const claimDailyReward = async (): Promise<DailyRewardResult> => {
    const today = getDateString();
    const previousStars = retentionState.claimedDailyRewards[today] || 0;

    if (dailyRating.stars <= 0) {
      return {
        claimed: false,
        stars: 0,
        energy: 0,
        repairCards: 0,
        message: language === 'zh' ? '先完成一个今日目标，再领取修行力。' : 'Complete one daily task first.',
      };
    }

    if (previousStars >= dailyRating.stars) {
      return {
        claimed: false,
        stars: dailyRating.stars,
        energy: 0,
        repairCards: 0,
        message: language === 'zh' ? '今日星级奖励已经领取。' : 'Today reward is already claimed.',
      };
    }

    const starDelta = dailyRating.stars - previousStars;
    const energy = starDelta * 12 + (previousStars === 0 ? dailyRating.completedCount * 2 : 0);
    const perfectDaysBefore = countPerfectRewardDays(retentionState);
    const repairCards = dailyRating.stars >= 5 && previousStars < 5 && (perfectDaysBefore + 1) % 7 === 0 ? 1 : 0;

    await updateRetentionState((current) => ({
      ...current,
      totalEnergy: current.totalEnergy + energy,
      repairCards: current.repairCards + repairCards,
      claimedDailyRewards: {
        ...current.claimedDailyRewards,
        [today]: dailyRating.stars,
      },
    }));

    return {
      claimed: true,
      stars: dailyRating.stars,
      energy,
      repairCards,
      message: language === 'zh'
        ? `领取成功：+${energy}修行力${repairCards > 0 ? `，+${repairCards}张补签卡` : ''}`
        : `Claimed: +${energy} energy${repairCards > 0 ? `, +${repairCards} repair card` : ''}`,
    };
  };

  const useStreakRepairCard = async (): Promise<{ success: boolean; message: string }> => {
    const repair = canRepairYesterday(checkInRecords);
    if (retentionState.repairCards <= 0) {
      return {
        success: false,
        message: language === 'zh' ? '补签卡不足，先完成里程碑或满星周目标。' : 'No repair cards available.',
      };
    }
    if (!repair.canRepair) {
      return {
        success: false,
        message: language === 'zh' ? '昨天已经完成打卡，不需要补签。' : 'Yesterday is already checked in.',
      };
    }

    const repairedRecord: DailyCheckIn = {
      id: `checkin_repair_${Date.now()}`,
      date: repair.date,
      completed: true,
      brokeAfterNoon: false,
      checkInTime: Date.now(),
      notes: language === 'zh' ? '补签卡恢复连续' : 'Streak repaired with repair card',
    };

    await saveCheckInRecord(repairedRecord);
    const updatedRecords = await getCheckInRecords();
    setCheckInRecords(updatedRecords);
    await updateRetentionState((current) => ({
      ...current,
      repairCards: Math.max(0, current.repairCards - 1),
    }));

    return {
      success: true,
      message: language === 'zh' ? `已补签 ${repair.date}，连续记录已恢复。` : `Repaired ${repair.date}.`,
    };
  };

  const claimMilestoneReward = async (milestoneId: string): Promise<{ success: boolean; message: string }> => {
    const milestone = milestoneRewards.find((item) => item.id === milestoneId);
    if (!milestone) {
      return { success: false, message: language === 'zh' ? '未找到该里程碑。' : 'Milestone not found.' };
    }
    if (!milestone.reached) {
      return { success: false, message: language === 'zh' ? '里程碑还未达成。' : 'Milestone is not reached yet.' };
    }
    if (milestone.claimed) {
      return { success: false, message: language === 'zh' ? '该里程碑奖励已领取。' : 'Milestone already claimed.' };
    }

    await updateRetentionState((current) => ({
      ...current,
      totalEnergy: current.totalEnergy + milestone.rewardEnergy,
      repairCards: current.repairCards + milestone.rewardRepairCards,
      claimedMilestones: [...current.claimedMilestones, milestone.id],
    }));

    return {
      success: true,
      message: language === 'zh'
        ? `领取成功：+${milestone.rewardEnergy}修行力${milestone.rewardRepairCards > 0 ? `，+${milestone.rewardRepairCards}张补签卡` : ''}`
        : `Claimed: +${milestone.rewardEnergy} energy${milestone.rewardRepairCards > 0 ? `, +${milestone.rewardRepairCards} repair card` : ''}`,
    };
  };

  const recordShareAction = async (kind: 'daily' | 'weekly' = 'daily'): Promise<void> => {
    const today = getDateString();
    await updateRetentionState((current) => ({
      ...current,
      shareDates: {
        ...current.shareDates,
        [today]: (current.shareDates[today] || 0) + 1,
      },
      weeklyShareDates: kind === 'weekly'
        ? {
          ...current.weeklyShareDates,
          [weeklySummary.weekKey]: (current.weeklyShareDates[weeklySummary.weekKey] || 0) + 1,
        }
        : current.weeklyShareDates,
    }));
  };

  const recordFriendEncouragement = async (toUserId: string): Promise<void> => {
    const today = getDateString();
    await updateRetentionState((current) => {
      const users = current.friendEncouragementsSent[today] || [];
      const nextUsers = users.includes(toUserId) ? users : [...users, toUserId];
      return {
        ...current,
        friendEncouragementsSent: {
          ...current.friendEncouragementsSent,
          [today]: nextUsers,
        },
      };
    });
  };

  const recordReceivedFriendEncouragement = async (encouragement: FriendEncouragement): Promise<void> => {
    if (retentionStateRef.current.friendEncouragementsReceived.some((item) => item.id === encouragement.id)) {
      return;
    }
    await updateRetentionState((current) => {
      return {
        ...current,
        friendEncouragementsReceived: [encouragement, ...current.friendEncouragementsReceived].slice(0, 50),
      };
    });
  };

  const t = getTranslations(language);

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
        retentionState,
        dailyTasks,
        dailyRating,
        growthProfile,
        weeklySummary,
        milestoneRewards,
        claimDailyReward,
        useStreakRepairCard,
        claimMilestoneReward,
        recordShareAction,
        recordFriendEncouragement,
        recordReceivedFriendEncouragement,
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
