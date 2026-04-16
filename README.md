# 过午不食 (Intermittent Fasting App)

一个跨平台的禁食追踪移动应用，支持iOS和Android。

## 项目概述

"过午不食"是一款基于传统饮食习惯的健康管理App，帮助用户追踪禁食时间、记录饮食摄入、监控体重变化，并提供丰富的统计和成就系统。

## 技术栈

- **框架**: React Native + Expo
- **语言**: TypeScript
- **状态管理**: React Context API
- **数据存储**: AsyncStorage
- **导航**: React Navigation 6
- **图表**: React Native Chart Kit
- **通知**: Expo Notifications

## 项目结构

```
GuowuBushiFasting/
├── src/
│   ├── components/       # 可复用组件
│   │   ├── Card.tsx
│   │   ├── FastingTimer.tsx
│   │   └── StatCard.tsx
│   ├── screens/          # 页面组件
│   │   ├── HomeScreen.tsx
│   │   ├── FastingScreen.tsx
│   │   ├── MealsScreen.tsx
│   │   ├── StatsScreen.tsx
│   │   └── SettingsScreen.tsx
│   ├── navigation/       # 导航配置
│   │   └── Tabs.tsx
│   ├── context/          # 全局状态管理
│   │   └── AppContext.tsx
│   ├── services/         # 数据服务
│   │   └── storage.ts
│   ├── i18n/             # 国际化
│   │   └── translations.ts
│   ├── constants/        # 常量配置
│   │   └── achievements.ts
│   └── types/            # TypeScript类型定义
│       └── index.ts
├── App.tsx               # 应用入口
├── app.json              # Expo配置
└── package.json
```

## 核心功能

### 1. 禁食计时器
- 开始/结束禁食
- 实时计时显示
- 过午时间自定义
- 状态提醒

### 2. 饮食记录
- 餐食记录（早/午/晚/零食）
- 卡路里追踪
- 常见食物热量参考
- 每日卡路里目标

### 3. 数据统计
- 禁食天数统计
- 连续天数追踪
- 体重变化图表
- 每周/月报告

### 4. 成就系统
- 12种成就类型
- 解锁进度追踪
- 成就徽章展示

### 5. 用户设置
- 过午时间设置
- 卡路里目标
- 通知提醒
- 主题切换
- 语言切换（中文/英文）
- 健康数据同步

## 开发指南

### 环境要求
- Node.js >= 18
- Xcode (iOS开发)
- Android Studio (Android开发)

### 安装依赖
```bash
npm install
```

### 运行开发服务器
```bash
# iOS
npm run ios

# Android
npm run android

# Web
npm run web
```

### 构建生产版本

#### iOS
```bash
# 使用EAS构建
eas build --platform ios

# 或使用本地构建
eas build --platform ios --local
```

#### Android
```bash
# 使用EAS构建
eas build --platform android

# 或使用本地构建
eas build --platform android --local
```

## 发布流程

### iOS App Store

1. **配置证书**
   - 在Apple Developer创建App ID
   - 配置推送通知证书

2. **更新app.json**
   - 设置正确的bundleIdentifier
   - 更新版本号

3. **构建**
   ```bash
   eas build --platform ios --profile production
   ```

4. **提交到App Store**
   - 使用EAS Submit
   - 或手动上传到App Store Connect

### Android Play Store

1. **配置签名**
   - 创建keystore文件
   - 配置app.json中的android属性

2. **构建**
   ```bash
   eas build --platform android --profile production
   ```

3. **提交到Google Play**
   - 使用EAS Submit
   - 或手动上传到Google Play Console

## 应用配置

### Bundle ID
- iOS: `com.guowu.fasting`
- Android: `com.guowu.fasting`

### 权限说明
- **通知权限**: 用于禁食提醒
- **健康数据**: 用于同步禁食和饮食记录到HealthKit/Google Fit

## 贡献指南

1. Fork本仓库
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启Pull Request

## 许可证

本项目采用 MIT 许可证

## 联系方式

- 项目主页: [GitHub URL]
- 问题反馈: [Issues URL]
