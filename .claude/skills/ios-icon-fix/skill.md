# iOS 图标修复指南

用于解决 iOS 应用图标不显示或 App Store 提交时图标透明度错误的问题。

## 常见问题

### 1. 图标不显示
**症状**: 应用安装后图标是空白或默认图标
**原因**: 使用了错误的图标源文件，或者图标配置不正确

### 2. App Store 提交错误
**错误信息**: `Invalid large app icon. The large app icon can't be transparent or contain an alpha channel.`
**原因**: 1024x1024 图标包含透明通道

## 解决方案

### 1. 确认正确的图标源文件

本项目的正确图标源是 `assets/universal_icon.png`（4267x4267 RGBA PNG）

### 2. 生成所有需要的 iOS 图标尺寸

```bash
cd /usr/local/games/guowubushi/GuowuBushiFasting

# iPhone 图标
sips -z 120 120 assets/universal_icon.png --out ios/app/Images.xcassets/AppIcon.appiconset/AppIcon60x60@2x~iphone.png
sips -z 180 180 assets/universal_icon.png --out ios/app/Images.xcassets/AppIcon.appiconset/AppIcon60x60@3x~iphone.png

# iPad 图标
sips -z 76 76 assets/universal_icon.png --out ios/app/Images.xcassets/AppIcon.appiconset/AppIcon76x76~ipad.png
sips -z 152 152 assets/universal_icon.png --out ios/app/Images.xcassets/AppIcon.appiconset/AppIcon76x76@2x~ipad.png
sips -z 167 167 assets/universal_icon.png --out ios/app/Images.xcassets/AppIcon.appiconset/AppIcon83.5x83.5@2x~ipad.png

# App Store 图标（无透明通道）
convert assets/universal_icon.png -background none -flatten -alpha off -resize 1024x1024 ios/app/Images.xcassets/AppIcon.appiconset/App-Icon-1024x1024@1x.png
```

### 3. 确认 Contents.json 配置

`ios/app/Images.xcassets/AppIcon.appiconset/Contents.json` 应包含：

```json
{
  "images": [
    {
      "filename": "AppIcon60x60@2x~iphone.png",
      "idiom": "iphone",
      "scale": "2x",
      "size": "60x60"
    },
    {
      "filename": "AppIcon60x60@3x~iphone.png",
      "idiom": "iphone",
      "scale": "3x",
      "size": "60x60"
    },
    {
      "filename": "AppIcon76x76~ipad.png",
      "idiom": "ipad",
      "scale": "1x",
      "size": "76x76"
    },
    {
      "filename": "AppIcon76x76@2x~ipad.png",
      "idiom": "ipad",
      "scale": "2x",
      "size": "76x76"
    },
    {
      "filename": "AppIcon83.5x83.5@2x~ipad.png",
      "idiom": "ipad",
      "scale": "2x",
      "size": "83.5x83.5"
    },
    {
      "filename": "App-Icon-1024x1024@1x.png",
      "idiom": "ios-marketing",
      "scale": "1x",
      "size": "1024x1024"
    }
  ],
  "info": {
    "author": "expo",
    "version": 1
  }
}
```

### 4. 构建和安装

```bash
npx expo run:ios --device <DEVICE_ID> --configuration Release
```

## 关键要点

1. **图标命名**: 使用 `~iphone` 和 `~ipad` 后缀区分设备类型
2. **透明度问题**: App Store 的 1024x1024 图标必须去除 alpha 通道
3. **图标源**: 始终使用 `assets/universal_icon.png` 作为源文件
4. **验证图标**: 使用 `file` 命令确认图标格式正确

## 验证步骤

```bash
# 检查图标文件
file ios/app/Images.xcassets/AppIcon.appiconset/*.png

# 检查图标尺寸
sips -g all ios/app/Images.xcassets/AppIcon.appiconset/*.png
```

## 相关文件

- 图标源: `/usr/local/games/guowubushi/GuowuBushiFasting/assets/universal_icon.png`
- 图标目录: `/usr/local/games/guowubushi/GuowuBushiFasting/ios/app/Images.xcassets/AppIcon.appiconset/`
- 配置文件: `app.json`
