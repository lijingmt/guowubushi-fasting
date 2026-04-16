const { withDangerousMod, withInfoPlist, withXcodeProject } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

// All required iOS icon sizes
const ICONS = [
  { size: 20, scale: 2, idiom: 'iphone', filename: 'AppIcon20x20@2x.png' },
  { size: 20, scale: 3, idiom: 'iphone', filename: 'AppIcon20x20@3x.png' },
  { size: 29, scale: 2, idiom: 'iphone', filename: 'AppIcon29x29@2x.png' },
  { size: 29, scale: 3, idiom: 'iphone', filename: 'AppIcon29x29@3x.png' },
  { size: 40, scale: 2, idiom: 'iphone', filename: 'AppIcon40x40@2x.png' },
  { size: 40, scale: 3, idiom: 'iphone', filename: 'AppIcon40x40@3x.png' },
  { size: 60, scale: 2, idiom: 'iphone', filename: 'AppIcon60x60@2x.png' },
  { size: 60, scale: 3, idiom: 'iphone', filename: 'AppIcon60x60@3x.png' },
  { size: 20, scale: 2, idiom: 'ipad', filename: 'AppIcon20x20@2x~ipad.png' },
  { size: 29, scale: 2, idiom: 'ipad', filename: 'AppIcon29x29@2x~ipad.png' },
  { size: 40, scale: 2, idiom: 'ipad', filename: 'AppIcon40x40@2x~ipad.png' },
  { size: 76, scale: 2, idiom: 'ipad', filename: 'AppIcon76x76@2x~ipad.png' },
];

// Generate icon using sharp
function generateIcon(sourcePath, targetPath, size) {
  const sharp = require('sharp');
  return sharp(sourcePath)
    .resize(size, size, { fit: 'cover' })
    .toFile(targetPath);
}

module.exports = function withCompleteIcons(config) {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const { platformProjectRoot, projectRoot } = config.modRequest;
      const sourceIcon = path.resolve(projectRoot, 'assets/icon.png');
      const appBundlePath = path.join(platformProjectRoot, 'app.app');
      
      console.log('=== Generating iOS icons ===');
      console.log('Source icon:', sourceIcon);
      console.log('Target bundle:', appBundlePath);
      
      // Generate all icons
      for (const icon of ICONS) {
        const size = icon.size * icon.scale;
        const targetPath = path.join(appBundlePath, icon.filename);
        
        try {
          await generateIcon(sourceIcon, targetPath, size);
          console.log(`Generated ${icon.filename} (${size}x${size})`);
        } catch (err) {
          console.error(`Error generating ${icon.filename}:`, err.message);
        }
      }
      
      console.log('=== Icon generation complete ===');
      return config;
    },
  ]);
};
