#!/bin/bash

# Bump version for iOS app
# Usage: ./scripts/bump.sh [version]  (e.g., ./scripts/bump.sh 1.0.4)

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Get current version
CURRENT_VERSION=$(grep '"version"' app.json | sed 's/.*"version": "\([^"]*\)".*/\1/')
echo -e "${YELLOW}Current Version: $CURRENT_VERSION${NC}"

# Get custom version from argument or auto-increment patch
if [ -n "$1" ]; then
  NEW_VERSION="$1"
else
  # Auto-increment patch version (1.0.3 -> 1.0.4)
  IFS='.' read -r MAJOR MINOR PATCH <<< "$CURRENT_VERSION"
  PATCH=$((PATCH + 1))
  NEW_VERSION="$MAJOR.$MINOR.$PATCH"
fi

echo -e "${GREEN}New Version: $NEW_VERSION${NC}"

# Update app.json
sed -i '' "s/\"version\": \"$CURRENT_VERSION\"/\"version\": \"$NEW_VERSION\"/" app.json
echo "✓ Updated app.json"

# Update iOS project MARKETING_VERSION
sed -i '' "s/MARKETING_VERSION = $CURRENT_VERSION/MARKETING_VERSION = $NEW_VERSION/" ios/app.xcodeproj/project.pbxproj
echo "✓ Updated iOS MARKETING_VERSION"

# Increment build number
CURRENT_BUILD=$(grep "CURRENT_PROJECT_VERSION" ios/app.xcodeproj/project.pbxproj | head -1 | sed 's/.*CURRENT_PROJECT_VERSION = \([0-9]*\).*/\1/')
NEW_BUILD=$((CURRENT_BUILD + 1))
sed -i '' "s/CURRENT_PROJECT_VERSION = $CURRENT_BUILD/CURRENT_PROJECT_VERSION = $NEW_BUILD/" ios/app.xcodeproj/project.pbxproj
echo "✓ Updated iOS Build number: $CURRENT_BUILD → $NEW_BUILD"

# Verify and fix Info.plist
INFO_VERSION=$(grep -A1 "CFBundleShortVersionString" ios/app/Info.plist | tail -1 | sed 's/.*<string>\([^<]*\)<\/string>.*/\1/')
INFO_BUILD=$(grep -A1 "CFBundleVersion" ios/app/Info.plist | tail -1 | sed 's/.*<string>\([^<]*\)<\/string>.*/\1/')

# Check if Info.plist uses variables
if [[ "$INFO_VERSION" == *"$"* ]] || [[ "$INFO_BUILD" == *"$"* ]]; then
  echo "✓ Info.plist uses Xcode variables (good)"
else
  echo -e "${RED}! Info.plist has hardcoded values, fixing...${NC}"
  sed -i '' 's/<key>CFBundleShortVersionString<\/key>/<key>CFBundleShortVersionString<\/key>/\
<string>$(MARKETING_VERSION)<\/string>/d' ios/app/Info.plist
  sed -i '' '/<key>CFBundleShortVersionString<\/key>/a\
  <string>$(MARKETING_VERSION)<\/string>' ios/app/Info.plist

  sed -i '' 's/<key>CFBundleVersion<\/key>/<key>CFBundleVersion<\/key>/\
<string>$(CURRENT_PROJECT_VERSION)<\/string>/d' ios/app/Info.plist
  sed -i '' '/<key>CFBundleVersion<\/key>/a\
  <string>$(CURRENT_PROJECT_VERSION)<\/string>' ios/app/Info.plist
  echo "✓ Fixed Info.plist to use Xcode variables"
fi

echo ""
echo -e "${GREEN}✅ Done! Version bumped to $NEW_VERSION (Build $NEW_BUILD)${NC}"
echo ""
echo "Commit with:"
echo "  git add app.json ios/app.xcodeproj/project.pbxproj ios/app/Info.plist"
echo "  git commit -m \"chore: bump version to $NEW_VERSION\""
echo ""
