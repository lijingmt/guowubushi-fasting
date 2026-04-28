---
name: bump-version
description: 升级应用版本号（iOS + Android + package.json）
---

# 版本升级脚本

## 使用方法

运行此命令升级版本号：

```bash
# 在项目根目录执行
npm run bump
```

## 或手动升级

升级版本号需要同时更新以下文件：

### 1. app.json
```json
"version": "1.0.18"  // 从 1.0.17 升级
```

### 2. package.json
```json
"version": "1.0.18"
```

### 3. android/app/build.gradle
```gradle
versionCode 2          // 每次发布递增
versionName "1.0.18"
```

### 4. ios/app.xcodeproj/project.pbxproj
```gradle
MARKETING_VERSION = 1.0.18
CURRENT_PROJECT_VERSION = 2
```

## 版本号规则

- **versionName**: 如 "1.0.18"，用户可见版本号
- **versionCode**: 整数，每次发布递增，用于Google Play判断版本新旧
- **MARKETING_VERSION**: iOS的显示版本号
- **CURRENT_PROJECT_VERSION**: iOS的内部版本号，每次递增

## 快速升级命令

```bash
# 获取当前版本
CURRENT=$(grep '"version"' app.json | head -1 | awk -F'"' '{print $4}')

# 升级补丁版本 (1.0.17 -> 1.0.18)
NEW=$(echo $CURRENT | awk -F. '{$3++; print $1"."$2"."$3}')

# 应用到所有文件
sed -i '' "s/\"version\": \"$CURRENT\"/\"version\": \"$NEW\"/" app.json package.json
sed -i '' "s/versionName \"$CURRENT\"/versionName \"$NEW\"/" android/app/build.gradle
sed -i '' "s/versionCode [0-9]*/versionCode $((NEW_CODE + 1))/" android/app/build.gradle
sed -i '' "s/MARKETING_VERSION = [0-9.]*/MARKETING_VERSION = $NEW/" ios/app.xcodeproj/project.pbxproj
```

## Git提交

```bash
git add app.json package.json android/app/build.gradle ios/app.xcodeproj/project.pbxproj
git commit -m "chore: bump version to $NEW"
git push
```
