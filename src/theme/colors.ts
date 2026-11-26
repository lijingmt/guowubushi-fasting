// 主题颜色配置
export interface Colors {
  // 背景色
  background: string;
  backgroundSecondary: string;
  card: string;

  // 文字色
  text: string;
  textSecondary: string;
  textLight: string;
  textTertiary: string;

  // 主色调
  primary: string;
  primaryLight: string;
  primaryDark: string;

  // 功能色
  success: string;
  warning: string;
  error: string;
  info: string;

  // 分隔线
  border: string;
  divider: string;

  // 特殊
  tabBar: string;
  tabBarActive: string;
  tabBarInactive: string;
}

// 浅色主题：宣纸米白 × 竹墨青 × 暖琥珀金
export const lightColors: Colors = {
  background: '#F6F2E9',
  backgroundSecondary: '#EFE9DC',
  card: '#FFFDF8',

  text: '#1F2A24',
  textSecondary: '#5A675F',
  textLight: '#85918A',
  textTertiary: '#A3ADA7',

  primary: '#265947',
  primaryLight: '#3D7B65',
  primaryDark: '#1A4032',

  success: '#3B7A57',
  warning: '#C68B33',
  error: '#B93A32',
  info: '#3E6B89',

  border: '#E4DDD0',
  divider: '#ECE6DA',

  tabBar: '#FFFDF8',
  tabBarActive: '#265947',
  tabBarInactive: '#8B9690',
};

// 深色主题：深黛禅夜
export const darkColors: Colors = {
  background: '#111715',
  backgroundSecondary: '#18211E',
  card: '#1E2925',

  text: '#EEF2EE',
  textSecondary: '#A8B5AE',
  textLight: '#7A8881',
  textTertiary: '#5C6963',

  primary: '#52A382',
  primaryLight: '#73BC9E',
  primaryDark: '#367A5F',

  success: '#5FB887',
  warning: '#E0A84E',
  error: '#D9665B',
  info: '#6299BD',

  border: '#2B3A34',
  divider: '#23302B',

  tabBar: '#161F1C',
  tabBarActive: '#52A382',
  tabBarInactive: '#75847D',
};

// 获取当前主题颜色
export const getColors = (scheme: 'light' | 'dark'): Colors => {
  return scheme === 'dark' ? darkColors : lightColors;
};
