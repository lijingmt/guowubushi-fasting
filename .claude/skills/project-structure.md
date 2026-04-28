---
name: project-structure
description: 过午不食项目完整结构和代码逻辑文档
---

# 过午不食 - 项目结构文档

## 项目概述

**项目名称**: 过午不食 (Fasting Until Morning)
**技术栈**: React Native + Expo + TypeScript
**平台**: iOS, Android
**包名**: `com.guowu.fasting`
**Bundle ID**: `com.guowu.fasting`

## 核心功能

1. **每日打卡** - 记录是否过午不食，支持1天宽限期
2. **饮食记录** - 记录每餐内容和卡路里
3. **体重管理** - 记录和追踪体重变化
4. **饮水记录** - 记录每日饮水量
5. **修行记录** - 打坐、站桩、诵经、听经
6. **单次禁食** - 自定义时长的禁食会话
7. **数据统计** - 连续天数、节省卡路里、功德值等
8. **健康同步** - Apple Health / Google Fit
9. **多语言** - 支持15种语言
10. **通知提醒** - 每日打卡提醒、禁食完成通知

## 目录结构

```
GuowuBushiFasting/
├── src/
│   ├── screens/           # 页面组件
│   │   ├── HomeScreen.tsx           # 首页
│   │   ├── FastingScreen.tsx        # 单次禁食
│   │   ├── MeditationScreen.tsx     # 打坐
│   │   ├── MealsScreen.tsx          # 饮食记录
│   │   ├── StatsScreen.tsx          # 数据统计
│   │   ├── HistoryScreen.tsx        # 打卡历史
│   │   └── SettingsScreen.tsx       # 设置
│   ├── components/        # UI组件
│   │   ├── Card.tsx                   # 卡片容器
│   │   ├── CheckInCard.tsx           # 打卡卡片
│   │   ├── FastingTimerCard.tsx      # 禁食计时器
│   │   ├── StatCard.tsx              # 统计卡片
│   │   ├── MeditationAnimation.tsx   # 打坐动画
│   │   ├── MeditationShareCard.tsx   # 打坐分享卡片
│   │   ├── AchievementShareCard.tsx  # 成就分享卡片
│   │   ├── WelcomeScreen.tsx         # 欢迎页
│   │   └── SplashScreen.tsx          # 启动页
│   ├── context/           # 全局状态
│   │   └── AppContext.tsx            # 核心上下文
│   ├── services/          # 数据服务
│   │   └── storage.ts                 # AsyncStorage封装
│   ├── i18n/              # 国际化
│   │   └── translations.ts            # 15种语言翻译
│   ├── theme/             # 主题
│   │   ├── colors.ts                  # 颜色定义
│   │   └── responsive.ts              # 响应式尺寸
│   ├── types/             # TypeScript类型
│   │   └── index.ts
│   ├── constants/         # 常量
│   │   └── achievements.ts            # 成就和设置常量
│   └── navigation/        # 导航
│       └── Tabs.tsx                   # 底部Tab导航
├── assets/                # 静态资源
│   ├── icon.png
│   ├── sounds/           # 音效文件
│   └── ...
├── android/               # Android原生代码 (gitignore)
├── ios/                   # iOS原生代码
└── website/               # 下载页面
```

## 核心数据结构

### UserSettings 用户设置
```typescript
{
  theme: 'light' | 'dark' | 'auto'
  language: 'zh' | 'en' | 'es' | ... (15种)
  reminderTime: string  // "18:00"
  enableNotifications: boolean
  dinnerTime: string    // "12:00"
}
```

### DailyCheckIn 打卡记录
```typescript
{
  id: string
  date: string           // YYYY-MM-DD
  completed: boolean     // 是否完成过午不食
  brokeAfterNoon: boolean
  checkInTime: number    // timestamp
  notes?: string         // 备注（禁欲完成等）
}
```

### PracticeRecord 修行记录
```typescript
{
  id: string
  date: string
  type: 'meditation' | 'standing_meditation' | 'scripture_chanting' | 'scripture_listening'
  duration?: number      // 分钟
  subtype?: MeditationType
  merit?: number         // 功德值
  timestamp: number
}
```

### FastingSession 禁食会话
```typescript
{
  id: string
  startTime: number
  endTime: number
  durationHours: number
  status: 'active' | 'completed' | 'cancelled'
  date: string
}
```

## 核心业务逻辑

### 1. 宽限期机制 (Grace Period)

打卡支持1天宽限期：
- 今天没打卡，明天补打卡 → 连胜不断
- 超过1天没补打卡 → 连胜重置

```typescript
// 计算连胜时检查宽限期
if (daysDiff === 1 + graceDaysUsed) {
  currentStreak++;
  graceDaysUsed++;
}
```

### 2. 功德值计算

- 诵经 (scripture_chanting): +10功德
- 听经 (scripture_listening): +5功德
- 打坐/站桩: 记录时长，不计算功德

### 3. 禁食状态管理

```typescript
// 开始禁食
- 创建FastingSession记录
- 创建ActiveFastingState (用于恢复)
- 调度完成通知

// App启动时恢复
- 检查ActiveFastingState
- 如果endTime已过：自动完成/取消
- 如果未过：恢复计时器

// 完成禁食
- 更新session状态为completed
- 清除ActiveFastingState
- 计算节省卡路里和预计减重
```

### 4. 通知调度

```typescript
// 每日提醒
- 根据streakInGracePeriod状态显示不同文案
- 宽限期: "火苗已冰冻！"
- 正常: "快来打卡吧！"

// 禁食完成通知
- 在endTime触发
- 显示禁食时长
```

## 状态管理 (AppContext)

所有全局状态通过`AppContext`管理：

```typescript
const {
  // 主题
  colors, isDarkMode, toggleTheme
  
  // 设置
  settings, updateSettings, language, t
  
  // 打卡
  checkInRecords, todayCheckIn, hasCheckedToday, dailyCheckIn
  
  // 饮食
  mealRecords, todayMeals, todayCalories, addMeal, removeMeal
  
  // 体重
  weightRecords, addWeight, removeWeight
  
  // 饮水
  waterRecords, todayWater, addWater
  
  // 统计
  stats, refreshStats
  
  // 修行
  practiceRecords, addPractice, deleteTodayPracticeAndWater
  
  // 禁食
  activeFasting, fastingSessions
  startFastingSession, cancelFastingSession, completeFastingSession
  
  // 健康同步
  healthSync, updateHealthSync
} = useApp()
```

## 多语言支持

支持15种语言，代码：
- `zh` - 简体中文
- `zh-Hant` - 繁体中文
- `en` - 英语
- `es` - 西班牙语
- `ja` - 日语
- `ko` - 韩语
- `fr` - 法语
- `de` - 德语
- `pt` - 葡萄牙语
- `ru` - 俄语
- `ar` - 阿拉伯语
- `it` - 意大利语
- `hi` - 印地语
- `vi` - 越南语
- `th` - 泰语

首次启动自动检测设备语言。

## 数据持久化

使用 `@react-native-async-storage/async-storage`:

```typescript
// 存储键
@guowu_settings           // 用户设置
@guowu_checkin_records    // 打卡记录
@guowu_meal_records       // 饮食记录
@guowu_weight_records     // 体重记录
@guowu_water_records      // 饮水记录
@guowu_practice_records   // 修行记录
@guowu_fasting_sessions   // 禁食会话
@guowu_active_fasting     // 活跃禁食状态
@guowu_health_sync        // 健康同步状态
```

## 通知配置

```typescript
// 通知权限
Notifications.requestPermissionsAsync()

// 通知处理器
Notifications.setNotificationHandler({
  shouldShowAlert: true,
  shouldPlaySound: true,
  shouldSetBadge: true,
})

// 调度通知
Notifications.scheduleNotificationAsync({
  content: { title, body, sound },
  trigger: { type: 'DAILY', hour, minute }
})
```

## 导航结构

```
TabNavigator (底部导航)
├── Home          首页
├── Fasting       单次禁食
├── Meditation    打坐
└── Settings      设置

StackNavigator
├── Main          TabNavigator
├── Stats         数据统计
├── History       打卡历史
└── Meals         饮食记录
```

## 重要配置文件

### app.json
- Expo配置
- 版本号
- 图标和启动页
- 权限配置

### android/app/build.gradle
- 版本号配置
- 签名配置
- R8混淆

### ios/app.xcodeproj/project.pbxproj
- iOS版本号
- Bundle ID
- 图标配置

## 常见开发任务

### 添加新语言
1. 在 `src/i18n/translations.ts` 添加翻译
2. 在 `AppContext.tsx` 的 `supportedLanguages` 添加映射

### 添加新功能
1. 定义类型在 `src/types/index.ts`
2. 添加storage方法在 `src/services/storage.ts`
3. 在AppContext添加状态和方法
4. 创建对应Screen组件
5. 更新导航配置

### 版本发布
见 `.claude/skills/android-release.md`

## Git提交历史总结

### 最新版本 (v1.0.18)
- e4ac5d4 feat: add visual jingjing co-branded logo
- 8578ba8 docs: add bump version skill
- 21f37c3 docs: add Android release workflow skill
- f6fedeb chore: bump version to 1.0.18
- 20e55d9 feat: add deployment script and download page
- 8f77252 fix: increase bottom tab padding for Samsung
- 5b308b6 feat: add bell sound effect
- 9abe302 feat: add complete translations for 15 languages

### 打坐功能
- db29334 feat: add splash screen, meditation features
- 93ea5cd feat: add 2h, 3h, 5h meditation options
- 5225eef feat: add background sound option
- 731d8b9 feat: add bell sound when meditation completes

### UI改进
- 0446eca feat: update splash screen design
- d1577f1 feat: add navigation headers
- 56fef7a fix: use card color for header
- 9c17324 fix: set header background color

### 其他功能
- 684ede3 feat: add 1 minute meditation option
- 82541c2 feat: add 'Agree All' to disclaimer
- 44b0f63 feat: add welcome screen and TOS
- 93f6fb9 feat: add Traditional Chinese support
