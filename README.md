# 过午不食 (Fasting Until Morning)

<div align="center">

**一个跨平台的修行健康管理应用**

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![React Native](https://img.shields.io/badge/React%20Native-0.81.5-61dafb.svg)](https://reactnative.dev/)
[![Expo](https://img.shields.io/badge/Expo-54.0-000000.svg)](https://expo.dev/)

[App Store](https://apps.apple.com/us/app/fasting-until-morning/id6762360504) | [GitHub](https://github.com/lijingmt/guowubushi-fasting) | [下载APK](http://192.168.1.205/guowubushi/)

</div>

---

## 项目概述

"过午不食"是一款结合传统修行习惯的健康管理App，帮助用户：
- 🔥 追踪每日"过午不食"打卡
- 🧘 记录打坐、站桩、诵经、听经等修行
- ⏰ 支持单次禁食会话
- 📊 统计连续天数、节省卡路里、功德值
- 💧 饮水记录、体重管理、饮食追踪
- 🌍 支持15种语言

---

## 核心功能

### 📅 每日打卡
- 记录是否完成"过午不食"
- **1天宽限期机制**：中断1天内补打卡，连胜不断
- 支持添加备注（如"禁欲完成"）
- 每日提醒通知

### 🧘 打坐修行
- **打坐**：支持1分钟、15分钟、30分钟、1小时、2小时、3小时、5小时
- **站桩**：记录站桩时长
- **诵经**：+10功德值
- **听经**：+5功德值
- **背景音效**：虫鸣、鸟鸣、雨声、海浪、寺庙钟声
- **结束铃声**：寺庙钟声提示
- **呼吸动画**：帮助调节呼吸节奏
- **分享功能**：生成修行成就卡片

### ⏱️ 单次禁食
- 自定义禁食时长（2-72小时）
- 实时计时器显示
- 完成后自动统计节省卡路里
- 禁食结束通知

### 🍽️ 饮食记录
- 餐食记录（早餐/午餐/晚餐/零食）
- 卡路里追踪
- 记录是否过午后进食

### ⚖️ 体重管理
- 体重记录和追踪
- 体重变化图表
- 计算减重效果

### 💧 饮水记录
- 记录每次饮水量
- 每日饮水统计

### 📊 数据统计
- 禁食连续天数（含宽限期）
- 禁欲连续天数
- 打坐连续天数和总时长
- 节省卡路里和餐数
- 功德值统计
- 单次禁食统计

### ⚙️ 设置
- 过午时间自定义（默认12:00）
- 每日提醒时间
- 主题切换（浅色/深色/自动）
- 15种语言支持
- 健康数据同步（Apple Health / Google Fit）

---

## 技术栈

| 技术 | 版本 | 说明 |
|------|------|------|
| React Native | 0.81.5 | 跨平台框架 |
| Expo | 54.0 | 开发工具链 |
| TypeScript | 5.9 | 类型安全 |
| React Navigation | 7.x | 路由导航 |
| AsyncStorage | 2.2 | 本地存储 |
| Reanimated | 4.x | 动画引擎 |
| Chart Kit | 6.x | 图表组件 |

---

## 项目结构

```
GuowuBushiFasting/
├── src/
│   ├── screens/              # 页面组件
│   │   ├── HomeScreen.tsx           # 首页（打卡）
│   │   ├── FastingScreen.tsx        # 单次禁食
│   │   ├── MeditationScreen.tsx     # 打坐修行
│   │   ├── MealsScreen.tsx          # 饮食记录
│   │   ├── StatsScreen.tsx          # 数据统计
│   │   ├── HistoryScreen.tsx        # 打卡历史
│   │   └── SettingsScreen.tsx       # 设置
│   ├── components/           # UI组件
│   │   ├── Card.tsx
│   │   ├── CheckInCard.tsx
│   │   ├── FastingTimerCard.tsx
│   │   ├── MeditationAnimation.tsx
│   │   ├── MeditationShareCard.tsx
│   │   └── ...
│   ├── context/              # 全局状态
│   │   └── AppContext.tsx
│   ├── services/             # 数据服务
│   │   └── storage.ts
│   ├── i18n/                 # 国际化
│   │   └── translations.ts
│   ├── theme/                # 主题
│   │   ├── colors.ts
│   │   └── responsive.ts
│   ├── types/                # TypeScript类型
│   │   └── index.ts
│   ├── constants/            # 常量
│   │   └── achievements.ts
│   └── navigation/           # 导航
│       └── Tabs.tsx
├── assets/                   # 静态资源
│   ├── sounds/               # 音效文件
│   │   ├── insects.mp3       # 虫鸣
│   │   ├── birds.mp3         # 鸟鸣
│   │   ├── rain.mp3          # 雨声
│   │   ├── ocean.mp3         # 海浪
│   │   └── temple_bell.mp3   # 寺庙钟声
│   └── icon.png
├── website/                  # 下载页面
└── .claude/skills/           # 开发文档
```

---

## 开发指南

### 环境要求
- Node.js >= 18
- Xcode 15+ (iOS开发)
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
# 使用Xcode构建
npx expo run:ios --configuration Release

# 或使用EAS构建
eas build --platform ios
```

#### Android
```bash
# 构建APK
cd android && ./gradlew assembleRelease

# 构建AAB (Google Play)
cd android && ./gradlew bundleRelease
```

---

## 版本发布

详细的发布流程请参考：
- [Android发布流程](.claude/skills/android-release.md)
- [版本升级](.claude/skills/bump-version.md)
- [项目结构文档](.claude/skills/project-structure.md)

---

## 应用信息

### 标识符
| 项目 | 值 |
|------|-----|
| Bundle ID | `com.guowu.fasting` |
| Package Name | `com.guowu.fasting` |
| App Store ID | `6762360504` |

### 权限说明
| 权限 | 用途 |
|------|------|
| 通知 | 每日打卡提醒、禁食完成通知 |
| 健康数据 | 同步到Apple Health/Google Fit |
| 存储 | 保存打卡记录和设置 |

---

## 多语言支持

<details>
<summary>支持的语言（点击展开）</summary>

- 🇨🇳 简体中文 (zh)
- 🇹🇼 繁体中文 (zh-Hant)
- 🇺🇸 英语 (en)
- 🇪🇸 西班牙语 (es)
- 🇯🇵 日语 (ja)
- 🇰🇷 韩语 (ko)
- 🇫🇷 法语 (fr)
- 🇩🇪 德语 (de)
- 🇵🇹 葡萄牙语 (pt)
- 🇷🇺 俄语 (ru)
- 🇸🇦 阿拉伯语 (ar)
- 🇮🇹 意大利语 (it)
- 🇮🇳 印地语 (hi)
- 🇻🇳 越南语 (vi)
- 🇹🇭 泰语 (th)

</details>

---

## 更新日志

### v1.0.18 (最新)
- ✨ 添加视觉晶晶联名品牌标识
- 🐛 修复Samsung设备底部导航栏遮挡问题
- 📱 优化Android权限配置
- 🔒 启用R8混淆减小APK大小

### v1.0.17
- 🌍 完善全部15种语言翻译
- 🎨 更新启动页设计
- 🧘 添加打坐背景音效
- 🔔 添加寺庙钟声提示音

### v1.0.16
- 🧘 添加打坐功能
- ⏰ 添加单次禁食功能
- 🎨 添加启动页和欢迎页

---

## 开发文档

项目包含完整的开发技能文档：

- **[项目结构](.claude/skills/project-structure.md)** - 完整的项目架构和代码逻辑说明
- **[Android发布](.claude/skills/android-release.md)** - Google Play发布流程
- **[版本升级](.claude/skills/bump-version.md)** - 版本号升级流程

---

## 贡献指南

欢迎贡献代码、报告问题或提出建议！

1. Fork 本仓库
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

---

## 许可证

本项目采用 [MIT](LICENSE) 许可证

---

## 联系方式

- GitHub: [lijingmt/guowubushi-fasting](https://github.com/lijingmt/guowubushi-fasting)
- Issues: [问题反馈](https://github.com/lijingmt/guowubushi-fasting/issues)

---

<div align="center">

**纯开源项目，「放心食用」🍵**

Made with ❤️ by [视觉晶晶](https://github.com/lijingmt) × [过午不食](https://github.com/lijingmt/guowubushi-fasting)

</div>
