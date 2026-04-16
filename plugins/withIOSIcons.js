const fs = require('fs');
const path = require('path');

module.exports = function withIOSIcons(config) {
  // Copy icon files to iOS bundle during build
  const icons = [
    'assets/AppIcon20x20@2x.png',
    'assets/AppIcon20x20@3x.png',
    'assets/AppIcon29x29@2x.png',
    'assets/AppIcon29x29@3x.png',
    'assets/AppIcon40x40@2x.png',
    'assets/AppIcon40x40@3x.png',
    'assets/AppIcon60x60@2x.png',
    'assets/AppIcon60x60@3x.png',
    'assets/AppIcon20x20@2x~ipad.png',
    'assets/AppIcon29x29@2x~ipad.png',
    'assets/AppIcon40x40@2x~ipad.png',
    'assets/AppIcon76x76@2x~ipad.png',
  ];
  
  // Return config with icons as bundle resources
  config.extra = config.extra || {};
  config.extra.iosIcons = icons;
  
  return config;
};
