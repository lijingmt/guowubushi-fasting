# 过午不食 App 开发指南

## 项目概述

这是一个使用 React Native + Expo 开发的间歇性禁食追踪 App，支持 iOS 平台。

**项目地址：** `https://github.com/lijingmt/guowubushifasting`

---

## 项目结构

```
GuowuBushiFasting/
├── src/
│   ├── components/          # 可复用组件
│   │   ├── Card.tsx         # 卡片容器（响应式）
│   │   ├── StatCard.tsx     # 统计卡片（渐变背景）
│   │   └── CheckInCard.tsx  # 打卡卡片（模态框）
│   ├── screens/             # 页面组件
│   │   ├── HomeScreen.tsx   # 首页（响应式布局）
│   │   ├── MealsScreen.tsx  # 饮食记录
│   │   ├── StatsScreen.tsx  # 统计页面
│   │   ├── SettingsScreen.tsx # 设置页面
│   │   └── HistoryScreen.tsx # 历史记录
│   ├── navigation/          # 导航配置
│   │   └── Tabs.tsx         # 底部标签栏（响应式高度）
│   ├── context/             # 全局状态管理
│   │   └── AppContext.tsx   # App状态、语言、主题
│   ├── services/            # 数据存储服务
│   │   └── storage.ts       # AsyncStorage封装
│   ├── i18n/                # 国际化
│   │   └── translations.ts  # 中/英/西翻译
│   ├── theme/               # 主题配置
│   │   ├── colors.ts        # 颜色定义
│   │   └── responsive.ts    # 响应式工具（重要！）
│   ├── types/               # TypeScript类型定义
│   └── constants/           # 常量定义
├── ios/                     # iOS原生代码
│   └── app/Images.xcassets/AppIcon.appiconset/ # App图标
├── assets/                  # 静态资源
├── app.json                 # Expo配置
├── package.json             # 依赖配置
└── eas.json                 # EAS Build配置
```

---

## 响应式设计系统

### 核心工具 (`src/theme/responsive.ts`)

```typescript
// 水平缩放（宽度、边距、圆角）
rs(size: number): number

// 垂直缩放（高度、内边距）
vs(size: number): number

// 字体缩放（更温和）
fs(size: number): number

// 响应式值（根据设备类型返回不同值）
responsive<T>(config: ResponsiveValue<T>): T

// 预定义的响应式尺寸
responsiveSize.fontSize    // 字体大小
responsiveSize.spacing     // 间距
responsiveSize.borderRadius // 圆角
responsiveSize.iconSize    // 图标大小

// 布局配置
layout.screenWidth          // 屏幕宽度
layout.screenHeight         // 屏幕高度
layout.maxWidth             // 最大内容宽度（iPad限制）
layout.contentPadding       // 内容内边距
layout.cardPadding          // 卡片内边距
layout.modalWidth           // 模态框宽度
layout.modalMaxWidth        // 模态框最大宽度

// 设备信息
deviceInfo.type             // 设备类型 (phone/tablet/watch)
deviceInfo.isTablet         // 是否iPad
deviceInfo.isPhone          // 是否iPhone
```

### 支持的设备尺寸

| 设备 | 尺寸 | 屏幕类型 |
|------|------|---------|
| iPhone SE/8 | Compact | 小屏手机 |
| iPhone 13/14 | 390x844 | 标准屏 |
| iPhone 14 Plus/15 Plus | 428x926 | 大屏手机 |
| iPhone 14 Pro Max/15 Pro Max | 430x932 | 超大屏 |
| iPhone 16 Pro Max | 440x956 | 最大iPhone |
| iPad 10.9" | 2048x2732 | 标准iPad |
| iPad Pro 12.9" | 2732x2048 | 大屏iPad |

### 响应式样式示例

```typescript
import { responsiveSize, fs, rs, vs, layout, responsive } from '../theme/responsive';

const styles = StyleSheet.create({
  title: {
    fontSize: responsive({
      small: fs(24),
      tablet: fs(36),
      default: fs(28),
    }),
  },
  card: {
    padding: layout.cardPadding,
    borderRadius: responsiveSize.borderRadius.lg,
    marginHorizontal: rs(16),
    marginBottom: vs(16),
  },
});
```

---

## App图标完整指南

### 所需图标尺寸

| 文件名 | 尺寸 | 用途 | 必需 |
|--------|------|------|------|
| AppIcon20x20@2x.png | 40x40 | iPhone通知 | ✅ |
| AppIcon20x20@3x.png | 60x60 | iPhone通知 | ✅ |
| AppIcon29x29@2x.png | 58x58 | iPhone设置 | ✅ |
| AppIcon29x29@3x.png | 87x87 | iPhone设置 | ✅ |
| AppIcon40x40@2x.png | 80x80 | iPhone Spotlight | ✅ |
| AppIcon40x40@3x.png | 120x120 | iPhone Spotlight | ✅ |
| AppIcon60x60@2x.png | 120x120 | iPhone App图标 | ✅ |
| AppIcon60x60@3x.png | 180x180 | iPhone App图标 | ✅ |
| AppIcon20x20@2x~ipad.png | 40x40 | iPad通知 | ✅ |
| AppIcon29x29@2x~ipad.png | 58x58 | iPad设置 | ✅ |
| AppIcon40x40@2x~ipad.png | 80x80 | iPad Spotlight | ✅ |
| AppIcon76x76@2x~ipad.png | 152x152 | iPad App图标 | ✅ |
| AppIcon83.5x83.5@2x~ipad.png | 167x167 | iPad Pro图标 | ✅ |
| AppIcon1024x1024@1x.png | 1024x1024 | App Store营销图 | ✅ |

### 图标生成脚本

```bash
# 使用Sharp生成所有图标尺寸
node -e "
const sharp = require('sharp');

const sourceIcon = 'assets/your_icon.png';
const outputDir = 'ios/app/Images.xcassets/AppIcon.appiconset/';

const sizes = [
  { name: 'AppIcon20x20@2x.png', size: 40 },
  { name: 'AppIcon20x20@3x.png', size: 60 },
  { name: 'AppIcon29x29@2x.png', size: 58 },
  { name: 'AppIcon29x29@3x.png', size: 87 },
  { name: 'AppIcon40x40@2x.png', size: 80 },
  { name: 'AppIcon40x40@3x.png', size: 120 },
  { name: 'AppIcon60x60@2x.png', size: 120 },
  { name: 'AppIcon60x60@3x.png', size: 180 },
  { name: 'AppIcon20x20@2x~ipad.png', size: 40 },
  { name: 'AppIcon29x29@2x~ipad.png', size: 58 },
  { name: 'AppIcon40x40@2x~ipad.png', size: 80 },
  { name: 'AppIcon76x76@2x~ipad.png', size: 152 },
  { name: 'AppIcon83.5x83.5@2x~ipad.png', size: 167 },
  { name: 'AppIcon1024x1024@1x.png', size: 1024 },
];

(async () => {
  for (const { name, size } of sizes) {
    await sharp(sourceIcon)
      .resize(size, size, { fit: 'cover' })
      .toFile(outputDir + name);
    console.log(\`Generated: \${name}\`);
  }
})();
"
```

### Contents.json配置

位置：`ios/app/Images.xcassets/AppIcon.appiconset/Contents.json`

```json
{
  "images": [
    {
      "filename": "AppIcon20x20@2x.png",
      "idiom": "iphone",
      "scale": "2x",
      "size": "20x20"
    },
    // ... 其他iPhone图标
    {
      "filename": "AppIcon20x20@2x~ipad.png",
      "idiom": "ipad",
      "scale": "2x",
      "size": "20x20"
    },
    // ... 其他iPad图标
    {
      "filename": "AppIcon1024x1024@1x.png",
      "idiom": "ios-marketing",
      "scale": "1x",
      "size": "1024x1024"
    }
  ],
  "info": {
    "version": 1,
    "author": "expo"
  }
}
```

### 图标设计要点

1. **1024x1024营销图标必须是不透明的** - 不能有alpha通道
2. **使用SVG生成图标** - 可以用Sharp + SVG代码绘制
3. **中英文通用** - 避免使用文字，使用图形化设计

### 生成不透明图标

```bash
# 方法1：使用flatten填充背景色
sharp('source.png')
  .flatten({ background: { r: 91, g: 154, b: 160, alpha: 1 } })
  .resize(1024, 1024, { fit: 'cover' })
  .toFile('AppIcon1024x1024@1x.png');

# 方法2：创建带背景的新图标
sharp({
  create: {
    width: 1024,
    height: 1024,
    channels: 4,
    background: { r: 91, g: 154, b: 160, alpha: 1 }
  }
})
  .composite([{ input: 'source.png', blend: 'over' }])
  .toFile('AppIcon1024x1024@1x.png');
```

---

## EAS Build 完整流程

### 配置文件

**eas.json**
```json
{
  "cli": {
    "version": ">= 5.2.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal",
      "ios": {
        "simulator": true
      }
    },
    "production": {
      "ios": {
        "autoIncrement": true
      }
    }
  }
}
```

### 构建命令

```bash
# 安装EAS CLI
npm install -g eas-cli

# 登录Expo
eas login

# 查看构建列表
eas build:list

# 提交生产环境构建
eas build --platform ios --profile production

# 非交互式构建（CI/CD）
eas build --platform ios --profile production --non-interactive
```

### 常见错误与解决

#### 1. 缺少167x167 iPad Pro图标
**错误：**
```
Missing required icon file. The bundle does not contain an app icon
for iPad of exactly '167x167' pixels
```
**解决：** 添加 `AppIcon83.5x83.5@2x~ipad.png` (167x167)

#### 2. 缺少1024x1024营销图标
**错误：**
```
Missing app icon. Include a large app icon as a 1024 by 1024 pixel PNG
```
**解决：** 添加 `AppIcon1024x1024@1x.png`，idiom设为 `"ios-marketing"`

#### 3. 图标有透明通道
**错误：**
```
Invalid large app icon. The large app icon can't be transparent
or contain an alpha channel
```
**解决：** 使用 `flatten()` 或创建带不透明背景的图标

#### 4. 图标在App Store Connect不显示
**原因：** Apple服务器处理延迟（正常现象）
**解决：** 等待几小时到1-2天，不影响审核

---

## App Store Connect 截图要求

### iPhone截图尺寸

| 类型 | 尺寸 |
|------|------|
| 6.5" (iPhone 8 Plus) | 1242 x 2688 |
| 6.7" (iPhone 14 Pro Max) | 1290 x 2796 |
| 6.9" (iPhone 16 Pro Max) | 1320 x 2868 |

### iPad截图尺寸

| 类型 | 尺寸 |
|------|------|
| iPad 11" (10.9") | 1668 x 2420 |
| iPad Pro 11" | 2048 x 2732 |
| iPad Pro 12.9" | 2048 x 2732 |

### Apple Watch截图

| 类型 | 尺寸 |
|------|------|
| Apple Watch | 396 x 484 |

### 批量生成截图脚本

```bash
node -e "
const sharp = require('sharp');

const sourceDir = '/path/to/screenshots';
const outputDir = './screenshots/6.7 iPhone';
const targetSize = { width: 1290, height: 2796 };

const files = fs.readdirSync(sourceDir).filter(f => f.endsWith('.png'));

(async () => {
  for (let i = 0; i < files.length; i++) {
    await sharp(sourceDir + '/' + files[i])
      .resize(targetSize.width, targetSize.height, { fit: 'fill', background: '#000' })
      .toFile(outputDir + '/6.7-en-' + String(i + 1).padStart(2, '0') + '.png');
  }
})();
"
```

---

## 多语言自动检测

### 实现方式

使用 `expo-localization` 检测设备语言：

```typescript
import { getLocales } from 'expo-localization';

const detectDeviceLanguage = (): 'zh' | 'en' | 'es' => {
  const deviceLocales = getLocales();
  if (deviceLocales && deviceLocales.length > 0) {
    const deviceLanguage = deviceLocales[0].languageCode?.toLowerCase() || '';

    if (deviceLanguage === 'en') return 'en';
    if (deviceLanguage === 'es') return 'es';
    if (deviceLanguage.startsWith('zh')) return 'zh';
  }
  return 'zh'; // 默认中文
};

// 首次启动时自动检测
const initializeData = async () => {
  const settingsData = await AsyncStorage.getItem('@guowu_settings');
  const isFirstLaunch = settingsData === null;

  let savedSettings = await getSettings();

  if (isFirstLaunch) {
    const detectedLanguage = detectDeviceLanguage();
    savedSettings.language = detectedLanguage;
    await saveSettings(savedSettings);
  }

  setSettings(savedSettings);
  setLanguage(savedSettings.language);
};
```

---

## 审核时间

| 类型 | 时间 |
|------|------|
| 首次提交 | 1-3个工作日 |
| 常规更新 | 1-2个工作日 |
| 加急审核 | 几小时到1天 |

---

## 有用的命令

### 验证IPA图标

```bash
# 下载IPA
curl -L -o build.ipa "https://expo.dev/artifacts/eas/..."

# 解压并查看Assets.car
unzip -q build.ipa -d /tmp/ipa
xcrun assetutil --info /tmp/ipa/Payload/app.app/Assets.car

# 提取图标
xcrun assetutil --extract /tmp/ipa/Payload/app.app/Assets.car /tmp/extracted

# 检查1024x1024图标是否不透明
xcrun assetutil --info Assets.car | grep -A2 "AppIcon1024x1024"
```

### Git常用命令

```bash
# 查看修改
git status

# 提交更改
git add .
git commit -m "message"
git push

# 克隆到新位置
git clone https://github.com/lijingmt/guowubushifasting.git
```

---

## 注意事项

1. **图标不显示**：Apple服务器需要时间处理，正常现象
2. **1024x1024必须不透明**：这是Apple的硬性要求
3. **所有14个图标尺寸都必须有**：缺一不可
4. **审核时图标不显示不影响审核**：审核团队看到的是IPA中的实际图标
5. **中英文通用图标**：避免使用文字，使用图形化设计

---

## 更新日志

- 2026-04-17: 添加响应式设计系统
- 2026-04-17: 更新为冥想主题图标（中英文通用）
- 2026-04-17: 添加自动语言检测功能
- 2026-04-17: 修复1024x1024图标透明通道问题
