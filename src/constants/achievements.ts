import { Achievement } from '../types';

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first_check',
    title: '初次打卡',
    description: '完成第一次过午不食打卡',
    icon: '🌱',
    condition: (stats) => stats.totalCheckInDays >= 1,
  },
  {
    id: 'first_completed',
    title: '初次完成',
    description: '第一次完成过午不食',
    icon: '✅',
    condition: (stats) => stats.completedDays >= 1,
  },
  {
    id: 'three_days',
    title: '三天坚持',
    description: '连续3天完成过午不食',
    icon: '🌿',
    condition: (stats) => stats.longestStreak >= 3,
  },
  {
    id: 'week_master',
    title: '一周达人',
    description: '连续7天完成过午不食',
    icon: '🌳',
    condition: (stats) => stats.longestStreak >= 7,
  },
  {
    id: 'two_weeks',
    title: '双周挑战',
    description: '连续14天完成过午不食',
    icon: '🏆',
    condition: (stats) => stats.longestStreak >= 14,
  },
  {
    id: 'month_warrior',
    title: '月度勇士',
    description: '连续30天完成过午不食',
    icon: '⚔️',
    condition: (stats) => stats.longestStreak >= 30,
  },
  {
    id: 'hundred_days',
    title: '百日修行',
    description: '累计100天完成过午不食',
    icon: '💎',
    condition: (stats) => stats.completedDays >= 100,
  },
  {
    id: 'meals_skipped_10',
    title: '少吃十顿',
    description: '累计少吃10顿晚饭',
    icon: '🍽️',
    condition: (stats) => stats.totalMealsSkipped >= 10,
  },
  {
    id: 'meals_skipped_100',
    title: '少吃百顿',
    description: '累计少吃100顿晚饭',
    icon: '🍽️🍽️',
    condition: (stats) => stats.totalMealsSkipped >= 100,
  },
  {
    id: 'calorie_saver_10k',
    title: '万卡英雄',
    description: '累计节省10000卡路里',
    icon: '🔥',
    condition: (stats) => stats.totalCaloriesSaved >= 10000,
  },
  {
    id: 'weight_loss_1kg',
    title: '减重起步',
    description: '减重1公斤',
    icon: '⚖️',
    condition: (stats) => stats.totalWeightLost >= 1,
  },
  {
    id: 'weight_loss_5kg',
    title: '减重进阶',
    description: '减重5公斤',
    icon: '⚖️⚖️',
    condition: (stats) => stats.totalWeightLost >= 5,
  },
  {
    id: 'dedicated_user',
    title: '坚持不懈',
    description: '打卡完成率达到80%',
    icon: '💪',
    condition: (stats) => stats.completionRate >= 80,
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
