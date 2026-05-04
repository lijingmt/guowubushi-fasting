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
    NEW=$(echo $CURRENT | awk -F. '{$1++; $2=0; $3=0; print $1"."$2"."$3}')
elif [ "$TYPE" = "minor" ]; then
    NEW=$(echo $CURRENT | awk -F. '{$2++; $3=0; print $1"."$2"."$3}')
else
    NEW=$(echo $CURRENT | awk -F. '{$3++; print $1"."$2"."$3}')
fi

echo -e "${GREEN}升级版本:${NC} $CURRENT -> $NEW"

# 计算 Android versionCode
ANDROID_VERSION_CODE=$(grep "versionCode" android/app/build.gradle | head -1 | awk '{print $2}')
NEW_ANDROID_VERSION_CODE=$((ANDROID_VERSION_CODE + 1))

# 计算 iOS CURRENT_PROJECT_VERSION
IOS_BUILD=$(grep "CURRENT_PROJECT_VERSION" ios/app.xcodeproj/project.pbxproj | head -1 | awk '{print $3}' | tr -d ';')
NEW_IOS_BUILD=$((IOS_BUILD + 1))

echo -e "${GREEN}Android versionCode:${NC} $ANDROID_VERSION_CODE -> $NEW_ANDROID_VERSION_CODE"
echo -e "${GREEN}iOS build number:${NC} $IOS_BUILD -> $NEW_IOS_BUILD"

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

# 更新 iOS project.pbxproj (MARKETING_VERSION + CURRENT_PROJECT_VERSION)
sed -i '' "s/MARKETING_VERSION = $CURRENT/MARKETING_VERSION = $NEW/g" ios/app.xcodeproj/project.pbxproj
sed -i '' "s/CURRENT_PROJECT_VERSION = $IOS_BUILD/CURRENT_PROJECT_VERSION = $NEW_IOS_BUILD/g" ios/app.xcodeproj/project.pbxproj
echo "✓ ios/app.xcodeproj/project.pbxproj -> $NEW (build: $NEW_IOS_BUILD)"

# 确保 Info.plist 使用 Xcode 变量而非硬编码版本号
if grep -q 'CFBundleShortVersionString' ios/app/Info.plist; then
    if ! grep -A1 'CFBundleShortVersionString' ios/app/Info.plist | grep -q '$(MARKETING_VERSION)'; then
        sed -i '' '/CFBundleShortVersionString/{n;s/<string>.*<\/string>/<string>$(MARKETING_VERSION)<\/string>/}' ios/app/Info.plist
        echo "✓ ios/app/Info.plist CFBundleShortVersionString -> \$(MARKETING_VERSION)"
    else
        echo "✓ ios/app/Info.plist already uses \$(MARKETING_VERSION)"
    fi
fi

if grep -q 'CFBundleVersion' ios/app/Info.plist; then
    if ! grep -A1 'CFBundleVersion' ios/app/Info.plist | head -2 | grep -q '$(CURRENT_PROJECT_VERSION)'; then
        sed -i '' '/CFBundleVersion/{n;s/<string>.*<\/string>/<string>$(CURRENT_PROJECT_VERSION)<\/string>/}' ios/app/Info.plist
        echo "✓ ios/app/Info.plist CFBundleVersion -> \$(CURRENT_PROJECT_VERSION)"
    else
        echo "✓ ios/app/Info.plist already uses \$(CURRENT_PROJECT_VERSION)"
    fi
fi

echo -e "\n${GREEN}✓ 版本升级完成！${NC}"
echo -e "当前版本: ${YELLOW}$NEW${NC}"
