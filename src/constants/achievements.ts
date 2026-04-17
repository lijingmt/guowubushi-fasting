import { Achievement } from '../types';

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first_check',
    titleKey: 'achievement_first_check_title',
    descriptionKey: 'achievement_first_check_desc',
    icon: '🌱',
    condition: (stats) => stats.totalCheckInDays >= 1,
  },
  {
    id: 'first_completed',
    titleKey: 'achievement_first_completed_title',
    descriptionKey: 'achievement_first_completed_desc',
    icon: '✅',
    condition: (stats) => stats.completedDays >= 1,
  },
  {
    id: 'three_days',
    titleKey: 'achievement_three_days_title',
    descriptionKey: 'achievement_three_days_desc',
    icon: '🌿',
    condition: (stats) => stats.longestStreak >= 3,
  },
  {
    id: 'week_master',
    titleKey: 'achievement_week_master_title',
    descriptionKey: 'achievement_week_master_desc',
    icon: '🌳',
    condition: (stats) => stats.longestStreak >= 7,
  },
  {
    id: 'two_weeks',
    titleKey: 'achievement_two_weeks_title',
    descriptionKey: 'achievement_two_weeks_desc',
    icon: '🏆',
    condition: (stats) => stats.longestStreak >= 14,
  },
  {
    id: 'month_warrior',
    titleKey: 'achievement_month_warrior_title',
    descriptionKey: 'achievement_month_warrior_desc',
    icon: '⚔️',
    condition: (stats) => stats.longestStreak >= 30,
  },
  {
    id: 'hundred_days',
    titleKey: 'achievement_hundred_days_title',
    descriptionKey: 'achievement_hundred_days_desc',
    icon: '💎',
    condition: (stats) => stats.completedDays >= 100,
  },
  {
    id: 'meals_skipped_10',
    titleKey: 'achievement_meals_skipped_10_title',
    descriptionKey: 'achievement_meals_skipped_10_desc',
    icon: '🍽️',
    condition: (stats) => stats.totalMealsSkipped >= 10,
  },
  {
    id: 'meals_skipped_100',
    titleKey: 'achievement_meals_skipped_100_title',
    descriptionKey: 'achievement_meals_skipped_100_desc',
    icon: '🍽️🍽️',
    condition: (stats) => stats.totalMealsSkipped >= 100,
  },
  {
    id: 'calorie_saver_10k',
    titleKey: 'achievement_calorie_saver_10k_title',
    descriptionKey: 'achievement_calorie_saver_10k_desc',
    icon: '🔥',
    condition: (stats) => stats.totalCaloriesSaved >= 10000,
  },
  {
    id: 'weight_loss_1kg',
    titleKey: 'achievement_weight_loss_1kg_title',
    descriptionKey: 'achievement_weight_loss_1kg_desc',
    icon: '⚖️',
    condition: (stats) => stats.totalWeightLost >= 1,
  },
  {
    id: 'weight_loss_5kg',
    titleKey: 'achievement_weight_loss_5kg_title',
    descriptionKey: 'achievement_weight_loss_5kg_desc',
    icon: '⚖️⚖️',
    condition: (stats) => stats.totalWeightLost >= 5,
  },
  {
    id: 'dedicated_user',
    titleKey: 'achievement_dedicated_user_title',
    descriptionKey: 'achievement_dedicated_user_desc',
    icon: '💪',
    condition: (stats) => stats.completionRate >= 80,
  },
  {
    id: 'hundred_abstinence',
    titleKey: 'achievement_hundred_abstinence_title',
    descriptionKey: 'achievement_hundred_abstinence_desc',
    icon: '🧘',
    condition: (stats) => stats.longestAbstinenceStreak >= 100,
  },
  // 打坐成就
  {
    id: 'meditation_first',
    titleKey: 'achievement_meditation_first_title',
    descriptionKey: 'achievement_meditation_first_desc',
    icon: '🧘',
    condition: (stats) => stats.totalMeditationDays >= 1,
  },
  {
    id: 'meditation_week',
    titleKey: 'achievement_meditation_week_title',
    descriptionKey: 'achievement_meditation_week_desc',
    icon: '🧘🧘',
    condition: (stats) => stats.longestMeditationStreak >= 7,
  },
  {
    id: 'meditation_100min',
    titleKey: 'achievement_meditation_100min_title',
    descriptionKey: 'achievement_meditation_100min_desc',
    icon: '⏰',
    condition: (stats) => stats.totalMeditationMinutes >= 100,
  },
  {
    id: 'meditation_1000min',
    titleKey: 'achievement_meditation_1000min_title',
    descriptionKey: 'achievement_meditation_1000min_desc',
    icon: '⏰⏰',
    condition: (stats) => stats.totalMeditationMinutes >= 1000,
  },
  // 站桩成就
  {
    id: 'standing_first',
    titleKey: 'achievement_standing_first_title',
    descriptionKey: 'achievement_standing_first_desc',
    icon: '🧍',
    condition: (stats) => stats.totalStandingMeditationDays >= 1,
  },
  {
    id: 'standing_100min',
    titleKey: 'achievement_standing_100min_title',
    descriptionKey: 'achievement_standing_100min_desc',
    icon: '🧍⏰',
    condition: (stats) => stats.totalStandingMeditationMinutes >= 100,
  },
  {
    id: 'standing_500min',
    titleKey: 'achievement_standing_500min_title',
    descriptionKey: 'achievement_standing_500min_desc',
    icon: '🧍⏰⏰',
    condition: (stats) => stats.totalStandingMeditationMinutes >= 500,
  },
  // 功德成就
  {
    id: 'merit_10',
    titleKey: 'achievement_merit_10_title',
    descriptionKey: 'achievement_merit_10_desc',
    icon: '📿',
    condition: (stats) => stats.totalMerit >= 10,
  },
  {
    id: 'merit_100',
    titleKey: 'achievement_merit_100_title',
    descriptionKey: 'achievement_merit_100_desc',
    icon: '📿📿',
    condition: (stats) => stats.totalMerit >= 100,
  },
  {
    id: 'merit_1000',
    titleKey: 'achievement_merit_1000_title',
    descriptionKey: 'achievement_merit_1000_desc',
    icon: '✨',
    condition: (stats) => stats.totalMerit >= 1000,
  },
];

// 食物卡路里参考数据
export const CALORIE_REFERENCES = {
  // 主食类
  '米饭（一碗）': 200,
  '面条（一碗）': 250,
  '馒头（一个）': 180,
  '面包（一片）': 80,
  '燕麦粥（一碗）': 150,

  // 蛋白质类
  '鸡蛋（一个）': 70,
  '鸡胸肉（100g）': 165,
  '牛肉（100g）': 250,
  '猪肉（100g）': 240,
  '鱼（100g）': 140,
  '豆腐（100g）': 76,

  // 蔬菜类
  '西兰花（100g）': 34,
  '菠菜（100g）': 23,
  '胡萝卜（100g）': 41,
  '黄瓜（一根）': 16,
  '西红柿（一个）': 18,

  // 水果类
  '苹果（一个）': 95,
  '香蕉（一根）': 105,
  '橙子（一个）': 62,
  '葡萄（一杯）': 62,
  '西瓜（一杯）': 46,

  // 饮料类
  '牛奶（一杯）': 150,
  '豆浆（一杯）': 100,
  '果汁（一杯）': 120,
  '可乐（罐）': 140,
  '水（杯）': 0,

  // 零食类
  '薯片（包）': 160,
  '巧克力（块）': 235,
  '饼干（块）': 50,
  '坚果（一把）': 170,
};

// 默认设置
export const DEFAULT_SETTINGS = {
  reminderTime: '21:00', // 每天晚上9点提醒
  dailyCalorieGoal: 2000,
  enableNotifications: true,
  weightUnit: 'kg' as const,
  theme: 'auto' as const,
  language: 'zh' as const,
};

// 每天少吃晚饭节省的卡路里（约500卡）
export const DINNER_CALORIES = 500;
