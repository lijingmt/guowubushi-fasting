const { withInfoPlist } = require('@expo/config-plugins');

module.exports = function withIconsInfoPlist(config) {
  return withInfoPlist(config, (config) => {
    const modConfig = config.modResults;
    
    // Ensure all icon sizes are in CFBundleIcons
    modConfig.CFBundleIcons = {
      CFBundlePrimaryIcon: {
        CFBundleIconFiles: [
          'AppIcon20x20',
          'AppIcon29x29',
          'AppIcon40x40',
          'AppIcon60x60'
        ],
        CFBundleIconName: 'AppIcon'
      }
    };
    
    modConfig['CFBundleIcons~ipad'] = {
      CFBundlePrimaryIcon: {
        CFBundleIconFiles: [
          'AppIcon20x20',
          'AppIcon29x29',
          'AppIcon40x40',
          'AppIcon60x60',
          'AppIcon76x76'
        ],
        CFBundleIconName: 'AppIcon'
      }
    };
    
    return config;
  });
};
