#!/bin/bash

# 版本升级脚本
# 用法: ./scripts/bump-version.sh [patch|minor|major]

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 获取当前版本
CURRENT=$(grep '"version"' app.json | head -1 | awk -F'"' '{print $4}')

# 默认升级 patch 版本
TYPE=${1:-patch}

# 计算新版本
if [ "$TYPE" = "major" ]; then
    # 1.0.19 -> 2.0.0
    NEW=$(echo $CURRENT | awk -F. '{$1++; $2=0; $3=0; print $1"."$2"."$3}')
elif [ "$TYPE" = "minor" ]; then
    # 1.0.19 -> 1.1.0
    NEW=$(echo $CURRENT | awk -F. '{$2++; $3=0; print $1"."$2"."$3}')
else
    # patch: 1.0.19 -> 1.0.20
    NEW=$(echo $CURRENT | awk -F. '{$3++; print $1"."$2"."$3}')
fi

echo -e "${GREEN}升级版本:${NC} $CURRENT -> $NEW"

# 计算 Android versionCode (从git获取提交数或手动递增)
ANDROID_VERSION_CODE=$(grep "versionCode" android/app/build.gradle | awk '{print $2}')
NEW_ANDROID_VERSION_CODE=$((ANDROID_VERSION_CODE + 1))

# 计算 iOS CURRENT_PROJECT_VERSION
IOS_VERSION=$(grep "CURRENT_PROJECT_VERSION" ios/app.xcodeproj/project.pbxproj | head -1 | awk '{print $3}' | tr -d ';')
NEW_IOS_VERSION=$((IOS_VERSION + 1))

echo -e "${GREEN}Android versionCode:${NC} $ANDROID_VERSION_CODE -> $NEW_ANDROID_VERSION_CODE"
echo -e "${GREEN}iOS CURRENT_PROJECT_VERSION:${NC} $IOS_VERSION -> $NEW_IOS_VERSION"

# 更新 app.json
sed -i '' "s/\"version\": \"$CURRENT\"/\"version\": \"$NEW\"/" app.json
echo "✓ app.json -> $NEW"

# 更新 package.json
sed -i '' "s/\"version\": \"$CURRENT\"/\"version\": \"$NEW\"/" package.json
echo "✓ package.json -> $NEW"

# 更新 Android build.gradle
sed -i '' "s/versionCode $ANDROID_VERSION_CODE/versionCode $NEW_ANDROID_VERSION_CODE/" android/app/build.gradle
sed -i '' "s/versionName \"$CURRENT\"/versionName \"$NEW\"/" android/app/build.gradle
echo "✓ android/app/build.gradle -> $NEW (code: $NEW_ANDROID_VERSION_CODE)"

# 更新 iOS project.pbxproj
sed -i '' "s/MARKETING_VERSION = $CURRENT/MARKETING_VERSION = $NEW/" ios/app.xcodeproj/project.pbxproj
sed -i '' "s/CURRENT_PROJECT_VERSION = $IOS_VERSION/CURRENT_PROJECT_VERSION = $NEW_IOS_VERSION/" ios/app.xcodeproj/project.pbxproj
echo "✓ ios/app.xcodeproj/project.pbxproj -> $NEW (build: $NEW_IOS_VERSION)"

echo -e "\n${GREEN}✓ 版本升级完成！${NC}"
echo -e "当前版本: ${YELLOW}$NEW${NC}"
