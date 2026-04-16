// 用户设置类型
export interface UserSettings {
  reminderTime: string; // "21:00" - 每日提醒时间
  dailyCalorieGoal: number; // 每日卡路里目标
  enableNotifications: boolean; // 启用通知
  weightUnit: 'kg' | 'lb'; // 体重单位
  theme: 'light' | 'dark' | 'auto'; // 主题
  language: 'zh' | 'en' | 'es'; // 语言
}

// 每日打卡记录类型
export interface DailyCheckIn {
  id: string;
  date: string; // YYYY-MM-DD
  completed: boolean; // 是否完成过午不食
  brokeAfterNoon: boolean; // 是否在过午后进食
  checkInTime: number; // 打卡时间戳
  notes?: string; // 备注
}

// 饮食记录类型
export interface MealRecord {
  id: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  name: string; // 食物名称
  calories: number; // 卡路里
  type: 'breakfast' | 'lunch' | 'dinner' | 'snack'; // 餐型
  notes?: string; // 备注
}

// 体重记录类型
export interface WeightRecord {
  id: string;
  date: string; // YYYY-MM-DD
  weight: number; // 体重
  note?: string; // 备注
}

// 成就类型
export interface Achievement {
  id: string;
  title: string; // 标题
  description: string; // 描述
  icon: string; // 图标
  condition: (stats: UserStats) => boolean; // 解锁条件
  unlockedAt?: number; // 解锁时间
}

// 用户统计类型
export interface UserStats {
  totalCheckInDays: number; // 总打卡天数
  completedDays: number; // 完成过午不食天数
  currentStreak: number; // 当前连续天数
  longestStreak: number; // 最长连续天数
  totalMealsSkipped: number; // 跳过的餐数
  totalCaloriesSaved: number; // 节省的卡路里
  totalWeightLost: number; // 减重的公斤数
  achievements: string[]; // 已解锁的成就
  completionRate: number; // 完成率（百分比）
  totalHoursSaved: number; // 节省的总小时数（每天2小时）
  currentAbstinenceStreak: number; // 当前禁欲连续天数
  longestAbstinenceStreak: number; // 最长禁欲连续天数
}

// 饮水记录类型
export interface WaterRecord {
  id: string;
  date: string; // YYYY-MM-DD
  amount: number; // 毫升
  time: string; // HH:mm
}

// 健康数据同步状态
export interface HealthSyncStatus {
  healthKitEnabled: boolean; // iOS HealthKit
  googleFitEnabled: boolean; // Android Google Fit
  lastSyncTime?: number; // 最后同步时间
}

// 导航类型
export type RootStackParamList = {
  Home: undefined;
  CheckIn: undefined;
  Meals: undefined;
  Stats: undefined;
  Settings: undefined;
  MealDetail: { mealId?: string };
  History: undefined;
  Achievements: undefined;
};

export type TabParamList = {
  Home: undefined;
  CheckIn: undefined;
  Meals: undefined;
  Stats: undefined;
  Settings: undefined;
};
