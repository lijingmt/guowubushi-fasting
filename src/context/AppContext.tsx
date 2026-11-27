import React, { useState, useEffect, useMemo, useRef, createContext, useContext, ReactNode } from 'react';
import { Alert, AppState, useColorScheme, Platform } from 'react-native';
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
  WellnessRecord,
  CravingEvent,
  CravingTrigger,
} from '../types';
import Constants from 'expo-constants';
import { DEFAULT_SETTINGS } from '../constants/achievements';
import { getLocalDateString, isChineseLanguage } from '../utils/date';
import { resolveDeviceLocale, type DeviceLocaleInput } from '../utils/locale';
import { FASTING_TIERS, getChineseShichen, getProtectedDates } from '../utils/fastingRhythm';
import { computeUserStats } from '../utils/stats';
import { parseAndValidateBackupPayload, type BackupSummary } from '../utils/backup';
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
  getWellnessRecords,
  saveWellnessRecord,
  getCravingEvents,
  saveCravingEvent,
  getHungerRescueCount,
  incrementHungerRescueCount,
  exportAllLocalData,
  restoreAllLocalData,
} from '../services/storage';
import {
  syncAppleHealthMetrics,
  type NativeHealthMetrics,
} from '../services/nativeHealth';
import {
  getICloudStatus,
  pullBackupFromICloud,
  pushBackupToICloud,
  type CloudSyncStatus,
} from '../services/cloudSync';
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
import { Colors, getThemeColors } from '../theme/colors';
import { saveWidgetSnapshot } from '../utils/widgetSnapshot';
import {
  DEFAULT_PRO_STATE,
  fetchStoreKitProducts,
  incrementMonthlyPausePassUsage,
  loadProState,
  purchaseNativeProduct,
  restoreNativePurchases,
  syncNativeEntitlements,
  type ProEntitlementState,
  type StoreKitProductInfo,
} from '../services/iap';
import {
  canUsePausePassThisMonth,
  resolveEffectiveThemeSkin,
  TEA_TIP_IDS,
} from '../utils/proCatalog';

const DAILY_REMINDER_NOTIFICATION_ID_KEY = '@guowu_daily_reminder_notification_id';
const CUTOFF_REMINDER_NOTIFICATION_ID_KEY = '@guowu_cutoff_reminder_notification_id';
const FASTING_NOTIFICATION_ID_KEY = '@guowu_fasting_notification_id';
const DAILY_REMINDER_NOTIFICATION_KIND = 'dailyReminder';
const DAILY_REMINDER_IDENTIFIER = 'guowu-daily-reminder';
const CUTOFF_REMINDER_IDENTIFIER = 'guowu-cutoff-reminder';
const LEGACY_DAILY_REMINDER_TITLES = ['过午不食打卡', 'Daily Check-In'];

const isDailyReminderRequest = (request: Notifications.NotificationRequest) => {
  const requestData = (request.content.data || {}) as Record<string, unknown>;
  if (requestData.kind === DAILY_REMINDER_NOTIFICATION_KIND) {
    return true;
  }

  // 旧版本注册的通知没有 data.kind，且 Android 上读回的 trigger 形态不可靠，
  // 只按标题识别即可覆盖旧版本积累的重复每日提醒。
  const title = typeof request.content.title === 'string' ? request.content.title : '';
  return LEGACY_DAILY_REMINDER_TITLES.includes(title);
};

// 检测设备语言与单位并返回对应的应用设置
const detectDeviceLocale = () => {
  try {
    return resolveDeviceLocale(getLocales() as readonly DeviceLocaleInput[]);
  } catch {
    return resolveDeviceLocale(null);
  }
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
  adjustActiveFastingStartTime: (newStartTime: number) => Promise<void>;
  logManualFastingSession: (startTime: number, endTime: number) => Promise<void>;
  cancelFastingSession: () => Promise<void>;
  completeFastingSession: () => Promise<void>;

  // 身心体感与抗饿急救 & 原生健康/iCloud 同步
  wellnessRecords: WellnessRecord[];
  todayWellness: WellnessRecord | null;
  saveDailyWellness: (input: Omit<WellnessRecord, 'id' | 'date' | 'timestamp'>) => Promise<void>;
  cravingEvents: CravingEvent[];
  recordCravingEvent: (input: { trigger: CravingTrigger; survived: boolean; durationSec?: number }) => Promise<void>;
  hungerRescueCount: number;
  recordHungerRescue: () => Promise<number>;
  healthMetrics: NativeHealthMetrics | null;
  syncAppleHealth: () => Promise<NativeHealthMetrics>;
  cloudSyncStatus: CloudSyncStatus;
  syncToICloud: () => Promise<{ success: boolean; message: string }>;
  restoreFromICloud: () => Promise<{ success: boolean; message: string }>;
  exportBackupJson: () => Promise<string>;
  importBackupJson: (rawJson: string) => Promise<{ success: boolean; message: string; summary?: BackupSummary }>;

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
  consumeRepairCardForGift: () => Promise<boolean>;
  receiveRepairCardGifts: (count: number) => Promise<void>;

  // Pro 会员与随喜奉茶
  proState: ProEntitlementState;
  isProUnlocked: boolean;
  proProducts: StoreKitProductInfo[];
  proStoreVisible: boolean;
  proStoreHint: string | null;
  proBusy: boolean;
  teaThankYouProductId: string | null;
  openProStore: (hint?: string) => void;
  closeProStore: () => void;
  dismissTeaThankYou: () => void;
  refreshProEntitlements: () => Promise<void>;
  purchaseProProduct: (productId: string) => Promise<void>;
  restoreProPurchases: () => Promise<void>;
  canActivatePausePassThisMonth: boolean;
  recordPausePassUsage: () => Promise<void>;

  // 加载状态
  isLoading: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // 主题
  const systemColorScheme = useColorScheme();
  const [isDarkMode, setIsDarkMode] = useState(false);

  // 设置（首帧即按系统语言初始化，避免英文/西语设备闪现中文）
  const [initialDeviceLocale] = useState(() => detectDeviceLocale());
  const [settings, setSettings] = useState<UserSettings>(() => ({
    ...DEFAULT_SETTINGS,
    language: initialDeviceLocale.language,
    weightUnit: initialDeviceLocale.weightUnit,
    languageManuallySelected: false,
  }));
  const [language, setLanguage] = useState<Language>(initialDeviceLocale.language);
  const dailyReminderScheduleTokenRef = useRef(0);

  const [proState, setProState] = useState<ProEntitlementState>(DEFAULT_PRO_STATE);
  const proStateRef = useRef<ProEntitlementState>(DEFAULT_PRO_STATE);
  const [proProducts, setProProducts] = useState<StoreKitProductInfo[]>([]);
  const [proStoreVisible, setProStoreVisible] = useState(false);
  const [proStoreHint, setProStoreHint] = useState<string | null>(null);
  const [proBusy, setProBusy] = useState(false);
  const [teaThankYouProductId, setTeaThankYouProductId] = useState<string | null>(null);
  const isProUnlocked = Platform.OS === 'ios' ? proState.isPro : true;

  // 根据主题设置 + 东方美学皮肤确定颜色（非 Pro 平滑回落默认青竹主题）
  const resolvedScheme: 'light' | 'dark' =
    settings.theme === 'auto'
      ? systemColorScheme === 'dark'
        ? 'dark'
        : 'light'
      : settings.theme === 'dark'
      ? 'dark'
      : 'light';
  const colors: Colors = getThemeColors(
    resolvedScheme,
    resolveEffectiveThemeSkin(settings.themeSkin || 'bamboo', isProUnlocked)
  );

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

  // 身心体感与抗饿急救 & Apple Health / iCloud 状态
  const [wellnessRecords, setWellnessRecords] = useState<WellnessRecord[]>([]);
  const [cravingEvents, setCravingEvents] = useState<CravingEvent[]>([]);
  const [hungerRescueCount, setHungerRescueCount] = useState(0);
  const [healthMetrics, setHealthMetrics] = useState<NativeHealthMetrics | null>(null);
  const [cloudSyncStatus, setCloudSyncStatus] = useState<CloudSyncStatus>({
    available: false,
    hasBackup: false,
    lastSyncedAt: null,
  });

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

  // 计算统计数据（设置中的周休假/暂停护航变化也需重算连胜保护）
  useEffect(() => {
    calculateStats();
  }, [checkInRecords, weightRecords, practiceRecords, fastingSessions, settings.pausePass, settings.weeklySchedule]);

  // 只在加载完成、提醒开关、提醒时间、断食阶梯或语言改变时调度一次每日提醒。
  useEffect(() => {
    if (isLoading) return;
    if (settings.enableNotifications) {
      scheduleDailyReminder();
    } else {
      cancelDailyReminderNotifications();
    }
  }, [isLoading, settings.reminderTime, settings.fastingTier, settings.enableNotifications, language]);

  const initializeData = async () => {
    try {
      // 检查是否首次启动
      const settingsData = await AsyncStorage.getItem('@guowu_settings');
      const isFirstLaunch = settingsData === null;

      // 加载设置
      let savedSettings = await getSettings();
      const detected = detectDeviceLocale();

      // 首次启动按设备系统语言+计量单位初始化；非手动切换时跟随系统语言变更
      if (isFirstLaunch) {
        savedSettings = {
          ...savedSettings,
          language: detected.language,
          weightUnit: detected.weightUnit,
          languageManuallySelected: false,
        };
        await saveSettings(savedSettings);
      } else if (savedSettings.languageManuallySelected === false && savedSettings.language !== detected.language) {
        savedSettings = {
          ...savedSettings,
          language: detected.language,
        };
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
        savedWellness,
        savedCravings,
        savedRescueCount,
        initialCloudStatus,
        savedProState,
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
        getWellnessRecords(),
        getCravingEvents(),
        getHungerRescueCount(),
        getICloudStatus(),
        loadProState(),
      ]);
      const today = getLocalDateString();

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
          // 已达到计划结束时间，清除活跃状态并标记为已完成
          await saveActiveFastingState(null);
          await updateFastingSessionStatus(savedActiveFasting.sessionId, 'completed', savedActiveFasting.endTime);
          const updatedSessions = await getFastingSessions();
          setFastingSessions(updatedSessions);
        }
      }

      // 加载健康同步状态
      setHealthSync(savedHealthSync);

      // 加载留存激励状态
      retentionStateRef.current = savedRetentionState;
      setRetentionState(savedRetentionState);

      // 加载身心体感与抗饿统计
      setWellnessRecords(savedWellness);
      setCravingEvents(savedCravings);
      setHungerRescueCount(savedRescueCount);
      setCloudSyncStatus(initialCloudStatus);
      proStateRef.current = savedProState;
      setProState(savedProState);

      if (Platform.OS === 'ios') {
        void fetchStoreKitProducts().then((items) => {
          if (items.length > 0) setProProducts(items);
        });
        void syncNativeEntitlements(savedProState).then((synced) => {
          proStateRef.current = synced;
          setProState(synced);
        });
      }

      if (savedSettings.appleHealthEnabled && Platform.OS === 'ios') {
        void syncAppleHealthMetrics().then((metrics) => {
          if (metrics.authorized) {
            setHealthMetrics(metrics);
          }
        });
      }
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
    const isZh = isChineseLanguage(language);

    // 根据宽限期和今日任务状态决定通知内容
    const isInGracePeriod = stats.streakInGracePeriod;
    const getNotificationMessage = () => {
      if (isInGracePeriod) {
        // 宽限期状态的特殊消息
        if (isZh) {
          return '今天过午不食完成了吗？火苗已冰冻！赶快打卡，击碎冰冻火苗！';
        } else if (language === 'es') {
          return '¿Completaste el ayuno de hoy? ¡La llama está congelada! ¡Regístrate ahora para romper el hielo!';
        }
        return 'Did you complete your fasting today? Flame is frozen! Check in now to break the ice!';
      }
      const pendingTasks = dailyTasks.filter((task) => !task.completed);
      const nextTask = pendingTasks[0];
      if (dailyRating.stars >= 5) {
        if (isZh) return `今天已满星，连续${stats.currentStreak}天。睡前看一眼周总结，保持节奏。`;
        if (language === 'es') return `Hoy ya tienes 5 estrellas. Revisa tu resumen semanal y mantén el ritmo.`;
        return `Today is already 5-star. Review your weekly summary and keep the rhythm.`;
      }
      if (dailyRating.stars > 0 && nextTask) {
        if (isZh) return `今日${dailyRating.stars}星，还差「${nextTask.title}」就更稳了。`;
        if (language === 'es') return `Hoy tienes ${dailyRating.stars} estrellas. Completa: ${nextTask.title}.`;
        return `You have ${dailyRating.stars} stars today. Next: ${nextTask.title}.`;
      }
      if (stats.currentStreak >= 6) {
        if (isZh) return `连续${stats.currentStreak}天了，今天补上主线打卡，不要让节奏断掉。`;
        if (language === 'es') return `Llevas ${stats.currentStreak} días. Completa el check-in principal.`;
        return `${stats.currentStreak}-day streak. Complete the main check-in today.`;
      }
      // 正常消息
      if (isZh) {
        return '今天过午不食完成了吗？先完成主线打卡，再补一个小目标。';
      } else if (language === 'es') {
        return '¿Completaste el ayuno de hoy? ¡Regístrate ahora!';
      }
      return 'Did you complete your fasting today? Check in now!';
    };

    // 安排每日重复提醒。固定 identifier 可确保重复调度时替换旧通知，而非新增。
    const identifier = await Notifications.scheduleNotificationAsync({
      identifier: DAILY_REMINDER_IDENTIFIER,
      content: {
        title: isZh ? '过午不食打卡' : 'Daily Check-In',
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

    // 止食前 30 分钟智能预告提醒（联动所选过午阶梯 18:00 / 15:00 / 13:00）
    const activeTier = FASTING_TIERS[settings.fastingTier || 'classic'] || FASTING_TIERS.classic;
    const preCutoffHour = Math.max(0, activeTier.cutoffHour - 1);
    const cutoffIdentifier = await Notifications.scheduleNotificationAsync({
      identifier: CUTOFF_REMINDER_IDENTIFIER,
      content: {
        title: isZh ? `即将进入${activeTier.nameZh}止食窗` : `${activeTier.nameEn} Window Approaching`,
        body: isZh
          ? `30分钟后（${activeTier.cutoffHour}:00）开始净空轻断，记得适度补充温水。`
          : `Fasting begins in 30m at ${activeTier.cutoffHour}:00. Hydrate well!`,
        data: { kind: DAILY_REMINDER_NOTIFICATION_KIND },
        sound: 'default',
        priority: Notifications.AndroidNotificationPriority.DEFAULT,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: preCutoffHour,
        minute: 30,
      } as any,
    });
    if (dailyReminderScheduleTokenRef.current !== scheduleToken) {
      await Notifications.cancelScheduledNotificationAsync(cutoffIdentifier);
      return;
    }
    await AsyncStorage.setItem(CUTOFF_REMINDER_NOTIFICATION_ID_KEY, cutoffIdentifier);
  };

  const cancelDailyReminderNotifications = async () => {
    if (Platform.OS === 'web') return;

    try {
      const identifiers = new Set<string>([DAILY_REMINDER_IDENTIFIER, CUTOFF_REMINDER_IDENTIFIER]);
      const storedIdentifier = await AsyncStorage.getItem(DAILY_REMINDER_NOTIFICATION_ID_KEY);
      if (storedIdentifier) {
        identifiers.add(storedIdentifier);
      }
      const storedCutoffIdentifier = await AsyncStorage.getItem(CUTOFF_REMINDER_NOTIFICATION_ID_KEY);
      if (storedCutoffIdentifier) {
        identifiers.add(storedCutoffIdentifier);
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
      await AsyncStorage.removeItem(CUTOFF_REMINDER_NOTIFICATION_ID_KEY);
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
    const fastingStats = await calculateFastingStats();
    const today = getLocalDateString();
    const protectedDates = getProtectedDates(settings, today, 400);
    setStats(
      computeUserStats({
        checkInRecords,
        weightRecords,
        practiceRecords,
        fastingStats,
        today,
        protectedDates,
      })
    );
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
    const today = getLocalDateString();

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
      setHasCheckedToday(completed);

      const updatedRecords = await getCheckInRecords();
      setCheckInRecords(updatedRecords);
    }
  };

  const addMeal = async (meal: Omit<MealRecord, 'id' | 'date'>) => {
    const today = getLocalDateString();
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
    const today = getLocalDateString();
    const todayMealList = updatedRecords.filter((r) => r.date === today);
    setTodayMeals(todayMealList);
    const calories = todayMealList.reduce((sum, item) => sum + item.calories, 0);
    setTodayCalories(calories);
  };

  const addWeight = async (weight: number, date?: string, note?: string) => {
    const recordDate = date || getLocalDateString();
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
    const today = getLocalDateString();
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
    const today = getLocalDateString();

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
    const today = getLocalDateString();
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
    const today = getLocalDateString();

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
            title: (language === 'zh' || language === 'zh-Hant') ? '🎉 禁食结束！' : language === 'es' ? '¡Ayuno terminado!' : 'Fasting Complete!',
            body: (language === 'zh' || language === 'zh-Hant')
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
            title: (language === 'zh' || language === 'zh-Hant') ? '🎉 禁食结束！' : language === 'es' ? '¡Ayuno terminado!' : 'Fasting Complete!',
            body: (language === 'zh' || language === 'zh-Hant')
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

  // 补改当前活跃断食的开始时间（防忘记点击"开始断食"）
  const adjustActiveFastingStartTime = async (newStartTime: number) => {
    if (!activeFasting) return;
    const now = Date.now();
    const clampedStart = Math.min(now - 60000, newStartTime);
    const newEnd = clampedStart + activeFasting.durationHours * 60 * 60 * 1000;
    const updatedActive: ActiveFastingState = {
      ...activeFasting,
      startTime: clampedStart,
      endTime: newEnd,
    };

    const sessions = await getFastingSessions();
    const existing = sessions.find((s) => s.id === activeFasting.sessionId);
    if (existing) {
      await saveFastingSession({
        ...existing,
        startTime: clampedStart,
        endTime: newEnd,
        date: getLocalDateString(new Date(clampedStart)),
      });
    }

    if (newEnd <= now) {
      await updateFastingSessionStatus(activeFasting.sessionId, 'completed', now);
      await saveActiveFastingState(null);
      setActiveFasting(null);
    } else {
      await saveActiveFastingState(updatedActive);
      setActiveFasting(updatedActive);
    }
    setFastingSessions(await getFastingSessions());
  };

  // 补录已完成的历史单次断食记录
  const logManualFastingSession = async (startTime: number, endTime: number) => {
    const safeEnd = Math.min(Date.now(), Math.max(startTime + 60000, endTime));
    const durationMinutes = Math.round((safeEnd - startTime) / 60000);
    const durationHours = Math.max(1, Math.round(durationMinutes / 60));
    const session: FastingSession = {
      id: `fasting_manual_${Date.now()}`,
      startTime,
      endTime: safeEnd,
      durationHours,
      actualDurationMinutes: durationMinutes,
      status: 'completed',
      completedAt: safeEnd,
      date: getLocalDateString(new Date(safeEnd)),
    };
    await saveFastingSession(session);
    setFastingSessions(await getFastingSessions());
  };

  const saveDailyWellness = async (input: Omit<WellnessRecord, 'id' | 'date' | 'timestamp'>) => {
    const today = getLocalDateString();
    const existing = wellnessRecords.find((r) => r.date === today);
    const record: WellnessRecord = {
      id: existing?.id || `wellness_${today}`,
      date: today,
      energy: Math.min(5, Math.max(1, Math.round(input.energy))),
      hunger: Math.min(5, Math.max(1, Math.round(input.hunger))),
      mood: Math.min(5, Math.max(1, Math.round(input.mood))),
      sleep: Math.min(5, Math.max(1, Math.round(input.sleep))),
      waistCm: typeof input.waistCm === 'number' && input.waistCm > 20 && input.waistCm < 250 ? Number(input.waistCm.toFixed(1)) : undefined,
      note: input.note?.trim() || undefined,
      timestamp: Date.now(),
    };
    const next = await saveWellnessRecord(record);
    setWellnessRecords(next);
  };

  const recordCravingEvent = async (input: {
    trigger: CravingTrigger;
    survived: boolean;
    durationSec?: number;
  }): Promise<void> => {
    const now = new Date();
    const shichen = getChineseShichen(now.getHours());
    const event: CravingEvent = {
      id: `craving_${Date.now()}`,
      date: getLocalDateString(now),
      hour: now.getHours(),
      shichenIndex: shichen.index,
      trigger: input.trigger,
      survived: input.survived,
      durationSec: Math.max(0, Math.round(input.durationSec || 0)),
      timestamp: Date.now(),
    };
    const next = await saveCravingEvent(event);
    setCravingEvents(next);
  };

  const recordHungerRescue = async (): Promise<number> => {
    const next = await incrementHungerRescueCount();
    setHungerRescueCount(next);
    return next;
  };

  const syncAppleHealth = async (): Promise<NativeHealthMetrics> => {
    const metrics = await syncAppleHealthMetrics();
    setHealthMetrics(metrics);
    if (metrics.authorized) {
      await updateHealthSync({ healthKitEnabled: true });
      await updateSettings({ appleHealthEnabled: true });
    }
    return metrics;
  };

  const exportBackupJson = async (): Promise<string> => {
    const version = Constants.expoConfig?.version || '1.0.44';
    return exportAllLocalData(version);
  };

  const syncToICloud = async (): Promise<{ success: boolean; message: string }> => {
    const isZh = isChineseLanguage(language);
    const json = await exportBackupJson();
    const res = await pushBackupToICloud(json);
    if (res.success) {
      const nextStatus: CloudSyncStatus = {
        available: true,
        hasBackup: true,
        lastSyncedAt: res.lastSyncedAt || Date.now(),
      };
      setCloudSyncStatus(nextStatus);
      return {
        success: true,
        message: isZh ? '已加密同步至您的 iCloud 私有账户。' : 'Encrypted backup synced to your iCloud.',
      };
    }
    return {
      success: false,
      message: isZh ? '当前设备暂未开启 iCloud 云同步或处于离线状态。' : 'iCloud sync is unavailable or offline on this device.',
    };
  };

  const restoreFromICloud = async (): Promise<{ success: boolean; message: string }> => {
    const isZh = isChineseLanguage(language);
    const pulled = await pullBackupFromICloud();
    if (!pulled.found || !pulled.jsonString) {
      return {
        success: false,
        message: isZh ? '您的 iCloud 中暂无可恢复的过午不食备份。' : 'No Guowu Fasting backup found in iCloud.',
      };
    }
    const res = await importBackupJson(pulled.jsonString);
    if (res.success && pulled.lastSyncedAt) {
      setCloudSyncStatus({
        available: true,
        hasBackup: true,
        lastSyncedAt: pulled.lastSyncedAt,
      });
    }
    return { success: res.success, message: res.message };
  };

  const importBackupJson = async (
    rawJson: string
  ): Promise<{ success: boolean; message: string; summary?: BackupSummary }> => {
    const isZh = isChineseLanguage(language);
    const parsed = parseAndValidateBackupPayload(rawJson);
    if (!parsed.ok) {
      return {
        success: false,
        message: isZh ? `备份格式无效：${parsed.error}` : `Invalid backup: ${parsed.error}`,
      };
    }
    await restoreAllLocalData(parsed.payload);
    await initializeData();
    return {
      success: true,
      summary: parsed.summary,
      message: isZh
        ? `恢复成功：${parsed.summary.checkIns} 条打卡、${parsed.summary.fastingSessions} 条断食、${parsed.summary.wellnessRecords} 条体感记录`
        : `Restored ${parsed.summary.checkIns} check-ins, ${parsed.summary.fastingSessions} fasts, ${parsed.summary.wellnessRecords} wellness logs.`,
    };
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
        message: (language === 'zh' || language === 'zh-Hant') ? '先完成一个今日目标，再领取修行力。' : 'Complete one daily task first.',
      };
    }

    if (previousStars >= dailyRating.stars) {
      return {
        claimed: false,
        stars: dailyRating.stars,
        energy: 0,
        repairCards: 0,
        message: (language === 'zh' || language === 'zh-Hant') ? '今日星级奖励已经领取。' : 'Today reward is already claimed.',
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
      message: (language === 'zh' || language === 'zh-Hant')
        ? `领取成功：+${energy}修行力${repairCards > 0 ? `，+${repairCards}张补签卡` : ''}`
        : `Claimed: +${energy} energy${repairCards > 0 ? `, +${repairCards} repair card` : ''}`,
    };
  };

  const useStreakRepairCard = async (): Promise<{ success: boolean; message: string }> => {
    const repair = canRepairYesterday(checkInRecords);
    if (retentionState.repairCards <= 0) {
      return {
        success: false,
        message: (language === 'zh' || language === 'zh-Hant') ? '补签卡不足，先完成里程碑或满星周目标。' : 'No repair cards available.',
      };
    }
    if (!repair.canRepair) {
      return {
        success: false,
        message: (language === 'zh' || language === 'zh-Hant') ? '昨天已经完成打卡，不需要补签。' : 'Yesterday is already checked in.',
      };
    }

    const repairedRecord: DailyCheckIn = {
      id: `checkin_repair_${Date.now()}`,
      date: repair.date,
      completed: true,
      brokeAfterNoon: false,
      checkInTime: Date.now(),
      notes: (language === 'zh' || language === 'zh-Hant') ? '补签卡恢复连续' : 'Streak repaired with repair card',
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
      message: (language === 'zh' || language === 'zh-Hant') ? `已补签 ${repair.date}，连续记录已恢复。` : `Repaired ${repair.date}.`,
    };
  };

  const claimMilestoneReward = async (milestoneId: string): Promise<{ success: boolean; message: string }> => {
    const milestone = milestoneRewards.find((item) => item.id === milestoneId);
    if (!milestone) {
      return { success: false, message: (language === 'zh' || language === 'zh-Hant') ? '未找到该里程碑。' : 'Milestone not found.' };
    }
    if (!milestone.reached) {
      return { success: false, message: (language === 'zh' || language === 'zh-Hant') ? '里程碑还未达成。' : 'Milestone is not reached yet.' };
    }
    if (milestone.claimed) {
      return { success: false, message: (language === 'zh' || language === 'zh-Hant') ? '该里程碑奖励已领取。' : 'Milestone already claimed.' };
    }

    await updateRetentionState((current) => ({
      ...current,
      totalEnergy: current.totalEnergy + milestone.rewardEnergy,
      repairCards: current.repairCards + milestone.rewardRepairCards,
      claimedMilestones: [...current.claimedMilestones, milestone.id],
    }));

    return {
      success: true,
      message: (language === 'zh' || language === 'zh-Hant')
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

  const consumeRepairCardForGift = async (): Promise<boolean> => {
    if (retentionStateRef.current.repairCards <= 0) {
      return false;
    }
    await updateRetentionState((current) => ({
      ...current,
      repairCards: Math.max(0, current.repairCards - 1),
    }));
    return true;
  };

  const receiveRepairCardGifts = async (count: number): Promise<void> => {
    if (count <= 0) return;
    await updateRetentionState((current) => ({
      ...current,
      repairCards: current.repairCards + count,
    }));
  };

  useEffect(() => {
    proStateRef.current = proState;
  }, [proState]);

  const refreshProEntitlements = async (): Promise<void> => {
    if (Platform.OS !== 'ios') return;
    const synced = await syncNativeEntitlements(proStateRef.current);
    proStateRef.current = synced;
    setProState(synced);
    if (proProducts.length === 0) {
      const items = await fetchStoreKitProducts();
      if (items.length > 0) setProProducts(items);
    }
  };

  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    const sub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        void refreshProEntitlements();
      }
    });
    return () => sub.remove();
  }, []);

  const openProStore = (hint?: string) => {
    setProStoreHint(hint || null);
    setProStoreVisible(true);
    if (Platform.OS === 'ios' && proProducts.length === 0) {
      void fetchStoreKitProducts().then((items) => {
        if (items.length > 0) setProProducts(items);
      });
    }
  };

  const closeProStore = () => {
    setProStoreVisible(false);
    setProStoreHint(null);
  };

  const dismissTeaThankYou = () => setTeaThankYouProductId(null);

  const purchaseProProduct = async (productId: string): Promise<void> => {
    const isZhLang = isChineseLanguage(language);
    if (Platform.OS !== 'ios') {
      Alert.alert(
        isZhLang ? '提示' : 'Notice',
        isZhLang
          ? 'Android 版所有功能目前完全免费开放，无需内购。'
          : 'All features are currently unlocked for free on this platform.'
      );
      return;
    }
    setProBusy(true);
    try {
      const { result, state } = await purchaseNativeProduct(productId, proStateRef.current);
      proStateRef.current = state;
      setProState(state);

      if (result.status === 'purchased') {
        const isTeaTip = (TEA_TIP_IDS as readonly string[]).includes(productId);
        if (isTeaTip) {
          setProStoreVisible(false);
          setTeaThankYouProductId(productId);
        } else {
          setProStoreVisible(false);
          setProStoreHint(null);
          Alert.alert(
            isZhLang ? '🪷 已解锁清修 Pro' : '🪷 Guowu Pro Unlocked',
            isZhLang
              ? '感谢支持！已解锁全部东方美学皮肤、节气日签、双轨混音、30/90日深析与无限护航暂停券。'
              : 'Thank you! All themes, poster templates, dual sound mixer, 30/90d charts, and unlimited Pause Passes are now unlocked.'
          );
        }
      } else if (result.status === 'pending') {
        Alert.alert(
          isZhLang ? '等待确认' : 'Purchase Pending',
          isZhLang
            ? '您的购买正在等待家庭或系统授权，批准后将自动生效。'
            : 'Your purchase is awaiting approval and will unlock automatically.'
        );
      } else if (result.status === 'unavailable') {
        Alert.alert(
          isZhLang ? '商品暂未就绪' : 'Product Unavailable',
          isZhLang
            ? '未从 App Store 获取到此商品信息，请确认网络及沙盒账号后重试。'
            : 'Unable to load product from App Store. Check network or Sandbox account and try again.'
        );
      } else if (result.status === 'error' || result.status === 'unverified') {
        Alert.alert(
          isZhLang ? '购买未完成' : 'Purchase Failed',
          result.errorMessage || (isZhLang ? '交易验证未通过，请稍后重试。' : 'Transaction could not be verified.')
        );
      }
    } finally {
      setProBusy(false);
    }
  };

  const restoreProPurchases = async (): Promise<void> => {
    const isZhLang = isChineseLanguage(language);
    if (Platform.OS !== 'ios') return;
    setProBusy(true);
    try {
      const { state, ok, error } = await restoreNativePurchases(proStateRef.current);
      proStateRef.current = state;
      setProState(state);
      if (!ok) {
        Alert.alert(
          isZhLang ? '恢复失败' : 'Restore Failed',
          error || (isZhLang ? '无法连接 App Store，请稍后重试。' : 'Could not sync with App Store.')
        );
        return;
      }
      if (state.isPro) {
        setProStoreVisible(false);
        Alert.alert(
          isZhLang ? '✓ 恢复成功' : '✓ Restored',
          isZhLang ? '已为您恢复「清修 Pro」订阅权益。' : 'Your Guowu Pro subscription has been restored.'
        );
      } else {
        Alert.alert(
          isZhLang ? '未发现有效订阅' : 'No Active Subscription',
          isZhLang
            ? '当前 Apple ID 名下暂无生效中的「清修 Pro」订阅。'
            : 'No active Guowu Pro subscription was found for this Apple ID.'
        );
      }
    } finally {
      setProBusy(false);
    }
  };

  const canActivatePausePassThisMonth = useMemo(
    () =>
      canUsePausePassThisMonth({
        isProUnlocked,
        usageMonth: proState.pausePassUsageMonth,
        monthlyCount: proState.pausePassMonthlyCount,
      }),
    [isProUnlocked, proState.pausePassUsageMonth, proState.pausePassMonthlyCount]
  );

  const recordPausePassUsage = async (): Promise<void> => {
    const next = await incrementMonthlyPausePassUsage(proStateRef.current);
    proStateRef.current = next;
    setProState(next);
  };

  useEffect(() => {
    void saveWidgetSnapshot({
      tier: settings.fastingTier || 'classic',
      activeFasting,
      currentStreak: stats.currentStreak,
      hasCheckedToday,
      language,
      themeSkin: resolveEffectiveThemeSkin(settings.themeSkin || 'bamboo', isProUnlocked),
    });
  }, [settings.fastingTier, settings.themeSkin, isProUnlocked, activeFasting, stats.currentStreak, hasCheckedToday, language]);

  useEffect(() => {
    if (isLoading || !settings.iCloudAutoSync || Platform.OS !== 'ios') return;
    const timer = setTimeout(() => {
      void syncToICloud();
    }, 3500);
    return () => clearTimeout(timer);
  }, [
    isLoading,
    settings.iCloudAutoSync,
    checkInRecords.length,
    fastingSessions.length,
    wellnessRecords.length,
    weightRecords.length,
    practiceRecords.length,
  ]);

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
        adjustActiveFastingStartTime,
        logManualFastingSession,
        cancelFastingSession,
        completeFastingSession,
        wellnessRecords,
        todayWellness: wellnessRecords.find((r) => r.date === todayDate) || null,
        saveDailyWellness,
        cravingEvents,
        recordCravingEvent,
        hungerRescueCount,
        recordHungerRescue,
        healthMetrics,
        syncAppleHealth,
        cloudSyncStatus,
        syncToICloud,
        restoreFromICloud,
        exportBackupJson,
        importBackupJson,
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
        consumeRepairCardForGift,
        receiveRepairCardGifts,
        proState,
        isProUnlocked,
        proProducts,
        proStoreVisible,
        proStoreHint,
        proBusy,
        teaThankYouProductId,
        openProStore,
        closeProStore,
        dismissTeaThankYou,
        refreshProEntitlements,
        purchaseProProduct,
        restoreProPurchases,
        canActivatePausePassThisMonth,
        recordPausePassUsage,
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
