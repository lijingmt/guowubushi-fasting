---
name: android-release
description: Android应用发布到Google Play的完整流程
---

# Android应用发布到Google Play

## 准备工作

确保以下文件存在：
- `android/app/release.keystore` - Release签名密钥
- `assets/icon.png` - 应用图标

## 发布流程

### 1. 版本号升级

更新以下文件的版本号：
- `app.json` - `"version": "x.y.z"`
- `package.json` - `"version": "x.y.z"`
- `android/app/build.gradle` - `versionCode` 和 `versionName`
- `ios/app.xcodeproj/project.pbxproj` - `MARKETING_VERSION` 和 `CURRENT_PROJECT_VERSION`

```bash
# 获取当前版本
CURRENT_VERSION=$(grep '"version"' app.json | head -1 | awk -F'"' '{print $4}')

# 示例：1.0.17 -> 1.0.18
NEW_VERSION=$(echo $CURRENT_VERSION | awk -F. '{$3++; print $1"."$2"."$3}')
```

### 2. 权限配置检查

确保 `android/app/src/main/AndroidManifest.xml` 包含以下配置：

```xml
<uses-permission android:name="android.permission.CAMERA" tools:node="remove"/>
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" android:maxSdkVersion="32"/>
<uses-permission android:name="android.permission.SYSTEM_ALERT_WINDOW" tools:node="remove"/>
```

### 3. R8混淆配置

确保 `android/app/build.gradle` release配置：

```gradle
release {
    signingConfig signingConfigs.release
    shrinkResources true
    minifyEnabled true
}
```

### 4. 音频文件检查

检查 `assets/sounds/` 目录下是否有超大文件：

```bash
ls -lh assets/sounds/*.mp3
```

如果单个MP3超过50MB，考虑压缩或替换。

### 5. 构建AAB

```bash
cd android
./gradlew bundleRelease
```

### 6. 复制输出文件

```bash
# AAB文件
cp android/app/build/outputs/bundle/release/app-release.aab \
   "/Users/jingli/Documents/过午不食app/FastingUntilMorning-v${NEW_VERSION}-release.aab"

# Mapping文件
cp android/app/build/outputs/mapping/release/mapping.txt \
   "/Users/jingli/Documents/过午不食app/mapping-v${NEW_VERSION}.txt"
```

### 7. 生成Google Play素材

#### 应用图标 (512x512)
```bash
sips -z 512 512 assets/icon.png \
  --out "/Users/jingli/Documents/过午不食app/store-icon-512.png"
```

#### Feature Graphic (1024x500)
```bash
convert \
  "/Users/jingli/Documents/过午不食app/6.7 iPhone English/"*.png \
  -resize 340x500! +append \
  -gravity center -background '#4CAF50' -extent 1024x500 \
  "/Users/jingli/Documents/过午不食app/feature-graphic-1024x500.png"
```

### 8. Git提交

```bash
git add app.json package.json ios/app.xcodeproj/project.pbxproj
git commit -m "chore: bump version to ${NEW_VERSION}"
git push
```

## Google Play上传清单

- [ ] AAB文件
- [ ] Mapping文件
- [ ] 应用图标 (512x512)
- [ ] Feature graphic (1024x500)
- [ ] 手机截图 (2-8张, 9:16比例)

## 常见问题

### Base模块超过200MB
检查 `assets/sounds/` 目录，压缩大音频文件。

### CAMERA/RECORD_AUDIO权限警告
在 `AndroidManifest.xml` 中添加 `tools:node="remove"`。

### Version code已使用
增加 `android/app/build.gradle` 中的 `versionCode`。

### 缺少deobfuscation文件
确保启用了R8混淆 (`minifyEnabled true`)，上传mapping.txt文件。
