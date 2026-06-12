#!/bin/bash

# 版本升级脚本
# 用法: ./scripts/bump-version.sh [patch|minor|major]

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 确保在项目根目录执行
cd "$(dirname "$0")/.."

# 获取当前版本
CURRENT=$(grep '"version"' app.json | head -1 | awk -F'"' '{print $4}')

if [ -z "$CURRENT" ]; then
    echo -e "${RED}错误: 无法从 app.json 获取当前版本${NC}"
    exit 1
fi

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

echo ""
echo "=== 更新文件 ==="

# 1. app.json / package.json / package-lock.json
node - "$NEW" "$NEW_ANDROID_VERSION_CODE" "$NEW_IOS_BUILD" <<'NODE'
const fs = require('fs');

const [version, androidVersionCode, iosBuildNumber] = process.argv.slice(2);

function readJson(path) {
  return JSON.parse(fs.readFileSync(path, 'utf8'));
}

function writeJson(path, data) {
  fs.writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`);
}

const appJson = readJson('app.json');
appJson.expo.version = version;
appJson.expo.android = appJson.expo.android || {};
appJson.expo.android.versionCode = Number(androidVersionCode);
appJson.expo.ios = appJson.expo.ios || {};
appJson.expo.ios.buildNumber = String(iosBuildNumber);
writeJson('app.json', appJson);

if (fs.existsSync('package.json')) {
  const packageJson = readJson('package.json');
  packageJson.version = version;
  writeJson('package.json', packageJson);
}

if (fs.existsSync('package-lock.json')) {
  const lockJson = readJson('package-lock.json');
  lockJson.version = version;
  if (lockJson.packages && lockJson.packages['']) {
    lockJson.packages[''].version = version;
  }
  writeJson('package-lock.json', lockJson);
}
NODE
echo "✓ app.json/package.json/package-lock.json -> $NEW"

# 3. Android build.gradle
sed -i '' "s/versionCode $ANDROID_VERSION_CODE/versionCode $NEW_ANDROID_VERSION_CODE/" android/app/build.gradle
sed -i '' "s/versionName \"$CURRENT\"/versionName \"$NEW\"/" android/app/build.gradle
echo "✓ android/app/build.gradle -> $NEW (code: $NEW_ANDROID_VERSION_CODE)"

# 4. iOS project.pbxproj
PBXPROJ="ios/app.xcodeproj/project.pbxproj"
if [ -f "$PBXPROJ" ]; then
    # 匹配带引号和不带引号的 MARKETING_VERSION
    sed -i '' "s/MARKETING_VERSION = $CURRENT/MARKETING_VERSION = $NEW/g" "$PBXPROJ"
    sed -i '' "s/MARKETING_VERSION = \"$CURRENT\"/MARKETING_VERSION = \"$NEW\"/g" "$PBXPROJ" 2>/dev/null || true
    sed -i '' "s/CURRENT_PROJECT_VERSION = $IOS_BUILD/CURRENT_PROJECT_VERSION = $NEW_IOS_BUILD/g" "$PBXPROJ"
    echo "✓ ios/app.xcodeproj/project.pbxproj -> $NEW (build: $NEW_IOS_BUILD)"
fi

# 5. 确保 Info.plist 使用 Xcode 变量
INFO_PLIST="ios/app/Info.plist"
if [ -f "$INFO_PLIST" ]; then
    if grep -q 'CFBundleShortVersionString' "$INFO_PLIST"; then
        if ! grep -A1 'CFBundleShortVersionString' "$INFO_PLIST" | grep -q '$(MARKETING_VERSION)'; then
            sed -i '' '/CFBundleShortVersionString/{n;s/<string>.*<\/string>/<string>$(MARKETING_VERSION)<\/string>/}' "$INFO_PLIST"
            echo "✓ ios/app/Info.plist CFBundleShortVersionString -> \$(MARKETING_VERSION)"
        else
            echo "✓ ios/app/Info.plist CFBundleShortVersionString OK"
        fi
    fi

    if grep -q 'CFBundleVersion' "$INFO_PLIST"; then
        if ! grep -A1 'CFBundleVersion' "$INFO_PLIST" | head -2 | grep -q '$(CURRENT_PROJECT_VERSION)'; then
            sed -i '' '/CFBundleVersion/{n;s/<string>.*<\/string>/<string>$(CURRENT_PROJECT_VERSION)<\/string>/}' "$INFO_PLIST"
            echo "✓ ios/app/Info.plist CFBundleVersion -> \$(CURRENT_PROJECT_VERSION)"
        else
            echo "✓ ios/app/Info.plist CFBundleVersion OK"
        fi
    fi
fi

# 6. 验证所有文件版本一致
echo ""
echo "=== 验证 ==="
APP_JSON_VER=$(grep '"version"' app.json | head -1 | awk -F'"' '{print $4}')
GRADLE_VER=$(grep "versionName" android/app/build.gradle | awk -F'"' '{print $2}')
PBX_VER=$(grep "MARKETING_VERSION" "$PBXPROJ" | head -1 | sed 's/.*= //;s/;//;s/ //g' | tr -d '"')

if [ "$APP_JSON_VER" = "$NEW" ] && [ "$GRADLE_VER" = "$NEW" ] && [ "$PBX_VER" = "$NEW" ]; then
    echo -e "${GREEN}✓ 所有文件版本一致: $NEW${NC}"
else
    echo -e "${RED}⚠ 版本不一致!${NC}"
    echo "  app.json: $APP_JSON_VER"
    echo "  build.gradle: $GRADLE_VER"
    echo "  project.pbxproj: $PBX_VER"
fi

echo ""
echo -e "${GREEN}✓ 版本升级完成！${NC}"
echo -e "当前版本: ${YELLOW}$NEW${NC}"
echo -e "Android versionCode: ${YELLOW}$NEW_ANDROID_VERSION_CODE${NC}"
echo -e "iOS build: ${YELLOW}$NEW_IOS_BUILD${NC}"
