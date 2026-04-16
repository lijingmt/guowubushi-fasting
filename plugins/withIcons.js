const { withAppBuildGradle } = require('@expo/config-plugins');

module.exports = function withCustomIcons(config) {
  return withAppBuildGradle(config, (config) => {
    return config;
  });
};
