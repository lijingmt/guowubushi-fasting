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

// 浅色主题
export const lightColors: Colors = {
  background: '#F5F5F5',
  backgroundSecondary: '#FFFFFF',
  card: '#FFFFFF',

  text: '#333333',
  textSecondary: '#666666',
  textLight: '#999999',

  primary: '#FF5722',
  primaryLight: '#FF8A65',
  primaryDark: '#E64A19',

  success: '#4CAF50',
  warning: '#FF9800',
  error: '#F44336',
  info: '#2196F3',

  border: '#E0E0E0',
  divider: '#EEEEEE',

  tabBar: '#FFFFFF',
  tabBarActive: '#FF5722',
  tabBarInactive: '#999999',
};

// 深色主题
export const darkColors: Colors = {
  background: '#121212',
  backgroundSecondary: '#1E1E1E',
  card: '#2C2C2C',

  text: '#FFFFFF',
  textSecondary: '#B0B0B0',
  textLight: '#808080',

  primary: '#FF6B3D',
  primaryLight: '#FF8A65',
  primaryDark: '#E64A19',

  success: '#66BB6A',
  warning: '#FFB74D',
  error: '#EF5350',
  info: '#42A5F5',

  border: '#3C3C3C',
  divider: '#2A2A2A',

  tabBar: '#1E1E1E',
  tabBarActive: '#FF6B3D',
  tabBarInactive: '#808080',
};

// 获取当前主题颜色
export const getColors = (scheme: 'light' | 'dark'): Colors => {
  return scheme === 'dark' ? darkColors : lightColors;
};
