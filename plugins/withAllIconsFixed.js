const fs = require('fs');
const path = require('path');
const { withXcodeProject, withInfoPlist, withDangerousMod } = require('@expo/config-plugins');

// All required iOS icon sizes
const ICONS = [
  { size: 20, scale: 2, filename: 'AppIcon20x20@2x.png' },
  { size: 20, scale: 3, filename: 'AppIcon20x20@3x.png' },
  { size: 29, scale: 2, filename: 'AppIcon29x29@2x.png' },
  { size: 29, scale: 3, filename: 'AppIcon29x29@3x.png' },
  { size: 40, scale: 2, filename: 'AppIcon40x40@2x.png' },
  { size: 40, scale: 3, filename: 'AppIcon40x40@3x.png' },
  { size: 60, scale: 2, filename: 'AppIcon60x60@2x.png' },
  { size: 60, scale: 3, filename: 'AppIcon60x60@3x.png' },
  { size: 20, scale: 2, filename: 'AppIcon20x20@2x~ipad.png' },
  { size: 29, scale: 2, filename: 'AppIcon29x29@2x~ipad.png' },
  { size: 40, scale: 2, filename: 'AppIcon40x40@2x~ipad.png' },
  { size: 76, scale: 2, filename: 'AppIcon76x76@2x~ipad.png' },
];

module.exports = function withAllIconsFixed(config) {
  // Generate icons locally during config resolution
  const sharp = require('sharp');
  const projectRoot = process.env.EXPO_PROJECT_ROOT || config.modRequest?.projectRoot || __dirname;
  const sourceIcon = path.join(projectRoot, 'assets/icon.png');
  const assetsDir = path.join(projectRoot, 'assets');
  
  // Generate icons and save to assets/
  if (fs.existsSync(sourceIcon)) {
    ICONS.forEach(icon => {
      const size = icon.size * icon.scale;
      const targetPath = path.join(assetsDir, icon.filename);
      
      if (!fs.existsSync(targetPath)) {
        sharp(sourceIcon)
          .resize(size, size, { fit: 'cover' })
          .toFile(targetPath)
          .then(() => console.log(`Generated ${icon.filename}`))
          .catch(err => console.error(`Error:`, err.message));
      }
    });
  }
  
  return config;
};
