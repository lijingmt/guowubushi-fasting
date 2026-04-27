#!/bin/bash
# 部署 APK 到远程服务器

set -e

PROJECT_DIR="/usr/local/games/guowubushi/GuowuBushiFasting"
WEBSITE_DIR="/usr/local/games/guowubushi/website"
REMOTE_SERVER="192.168.1.205"
REMOTE_USER="root"
REMOTE_PASS="Palm34cc1122"
REMOTE_PATH="/usr/local/tomcat/webapps/guowubushi"
APK_NAME="guowubushi-$(date +%Y%m%d-%H%M%S).apk"
SSH_KEY="$HOME/.ssh/guowubushi_key"

echo "========================================"
echo "  过午不食 - APK 部署脚本"
echo "========================================"
echo ""

# 1. 构建 APK
echo "📦 [1/4] 构建 Android APK..."
cd "$PROJECT_DIR/android"
./gradlew assembleRelease > /dev/null 2>&1
echo "✅ 构建完成"

# 2. 复制到本地 website 目录
echo ""
echo "📋 [2/4] 复制到本地 website 目录..."
cp "$PROJECT_DIR/android/app/build/outputs/apk/release/app-release.apk" "$WEBSITE_DIR/$APK_NAME"
echo "✅ 已复制到: $WEBSITE_DIR/$APK_NAME"

# 3. 上传到远程服务器 (尝试密钥，失败则用密码)
echo ""
echo "🚀 [3/4] 上传到远程服务器..."
if ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no -o ConnectTimeout=5 "$REMOTE_USER@$REMOTE_SERVER" "echo test" >/dev/null 2>&1; then
    # 使用密钥
    scp -i "$SSH_KEY" -o StrictHostKeyChecking=no "$WEBSITE_DIR/$APK_NAME" "$REMOTE_USER@$REMOTE_SERVER:$REMOTE_PATH/"
    echo "✅ 已上传 (使用SSH密钥)"
else
    # 使用密码
    which sshpass >/dev/null 2>&1 || brew install hudochenkov/sshpass/sshpass >/dev/null 2>&1
    sshpass -p "$REMOTE_PASS" scp -o StrictHostKeyChecking=no "$WEBSITE_DIR/$APK_NAME" "$REMOTE_USER@$REMOTE_SERVER:$REMOTE_PATH/"
    echo "✅ 已上传 (使用密码)"
fi

# 4. 生成下载页面
echo ""
echo "🌐 [4/4] 生成下载页面..."
cat > "$WEBSITE_DIR/index.html" << EOF
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>过午不食 - APK 下载</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #4CAF50 0%, #2E7D32 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        .container {
            background: white;
            border-radius: 20px;
            padding: 40px;
            max-width: 400px;
            text-align: center;
            box-shadow: 0 20px 60px rgba(0,0,0,0.2);
        }
        .icon { font-size: 80px; margin-bottom: 20px; }
        h1 { color: #2E7D32; margin-bottom: 10px; font-size: 28px; }
        .version { color: #666; margin-bottom: 30px; font-size: 14px; }
        .download-btn {
            display: block;
            background: linear-gradient(135deg, #4CAF50 0%, #2E7D32 100%);
            color: white;
            text-decoration: none;
            padding: 15px 30px;
            border-radius: 50px;
            font-size: 18px;
            font-weight: 600;
            transition: transform 0.2s;
            margin: 10px 0;
        }
        .download-btn:hover { transform: scale(1.05); }
        .qr-placeholder {
            margin: 20px 0;
            padding: 20px;
            background: #f5f5f5;
            border-radius: 10px;
            color: #999;
        }
        .footer { margin-top: 20px; color: #999; font-size: 12px; }
        .file-info { font-size: 11px; color: #aaa; margin-top: 10px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="icon">🥗</div>
        <h1>过午不食</h1>
        <p class="version">版本 1.0.17 - 修行自律，健康生活</p>
        <a href="$APK_NAME" class="download-btn">⬇️ 下载 APK</a>
        <div class="file-info">文件: $APK_NAME</div>
        <div class="qr-placeholder">
            📱 扫码下载
            <br><small>(二维码待添加)</small>
        </div>
        <p class="footer">适用于 Android 7.0 及以上版本</p>
    </div>
</body>
</html>
EOF

echo "✅ 下载页面已生成"

echo ""
echo "========================================"
echo "  部署完成！"
echo "========================================"
echo ""
echo "本地文件: $WEBSITE_DIR/$APK_NAME"
echo "远程文件: $REMOTE_SERVER:$REMOTE_PATH/$APK_NAME"
echo ""
echo "下载地址: http://$REMOTE_SERVER/guowubushi/"
echo ""
