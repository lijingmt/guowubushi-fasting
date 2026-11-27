import type { ThemeSkinId } from '../types';

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

export interface ThemeSkinMeta {
  id: ThemeSkinId;
  nameZh: string;
  nameEn: string;
  nameEs: string;
  swatchPrimary: string;
  swatchBg: string;
}

export const THEME_SKINS: ThemeSkinMeta[] = [
  {
    id: 'bamboo',
    nameZh: '宣纸竹青',
    nameEn: 'Xuan Bamboo',
    nameEs: 'Bambú Xuan',
    swatchPrimary: '#265947',
    swatchBg: '#F6F2E9',
  },
  {
    id: 'celadon',
    nameZh: '宋瓷天青',
    nameEn: 'Song Celadon',
    nameEs: 'Celadón Song',
    swatchPrimary: '#2E6A73',
    swatchBg: '#F2F6F6',
  },
  {
    id: 'dunhuang',
    nameZh: '敦煌泥金',
    nameEn: 'Dunhuang Ochre',
    nameEs: 'Ocre Dunhuang',
    swatchPrimary: '#9B6523',
    swatchBg: '#F8F2E7',
  },
  {
    id: 'ink',
    nameZh: '水墨清秋',
    nameEn: 'Hui Ink',
    nameEs: 'Tinta Hui',
    swatchPrimary: '#34404A',
    swatchBg: '#F4F4F1',
  },
];

const SKIN_PALETTES: Record<ThemeSkinId, { light: Colors; dark: Colors }> = {
  bamboo: {
    light: lightColors,
    dark: darkColors,
  },
  celadon: {
    light: {
      background: '#F2F6F6',
      backgroundSecondary: '#E5EFEF',
      card: '#FAFCFC',
      text: '#1B2B2E',
      textSecondary: '#51696D',
      textLight: '#7D9397',
      textTertiary: '#9EB1B4',
      primary: '#2E6A73',
      primaryLight: '#4A8992',
      primaryDark: '#1F4B52',
      success: '#347A68',
      warning: '#C1883A',
      error: '#B94740',
      info: '#3E6B89',
      border: '#D3E1E2',
      divider: '#E2ECEC',
      tabBar: '#FAFCFC',
      tabBarActive: '#2E6A73',
      tabBarInactive: '#7E9396',
    },
    dark: {
      background: '#10191B',
      backgroundSecondary: '#172326',
      card: '#1D2C30',
      text: '#EAF2F3',
      textSecondary: '#A1B6B9',
      textLight: '#738A8E',
      textTertiary: '#54696D',
      primary: '#5CB2BE',
      primaryLight: '#7DC6D0',
      primaryDark: '#3B848E',
      success: '#5AB698',
      warning: '#DFAA58',
      error: '#DE6E66',
      info: '#6CA3C9',
      border: '#2A3D42',
      divider: '#213135',
      tabBar: '#141F22',
      tabBarActive: '#5CB2BE',
      tabBarInactive: '#73898C',
    },
  },
  dunhuang: {
    light: {
      background: '#F8F2E7',
      backgroundSecondary: '#EFE3CE',
      card: '#FFFCF5',
      text: '#2B2118',
      textSecondary: '#6B5947',
      textLight: '#97846F',
      textTertiary: '#B5A592',
      primary: '#9B6523',
      primaryLight: '#BD833A',
      primaryDark: '#734814',
      success: '#467A57',
      warning: '#C68B33',
      error: '#B23E30',
      info: '#3E6B89',
      border: '#E6D6BC',
      divider: '#EFE3CE',
      tabBar: '#FFFCF5',
      tabBarActive: '#9B6523',
      tabBarInactive: '#93816D',
    },
    dark: {
      background: '#1A1510',
      backgroundSecondary: '#241D16',
      card: '#2D241C',
      text: '#F5EDE1',
      textSecondary: '#BCA995',
      textLight: '#8E7C69',
      textTertiary: '#6B5B4B',
      primary: '#DCA14D',
      primaryLight: '#EAB971',
      primaryDark: '#B37C31',
      success: '#62B381',
      warning: '#E5AE58',
      error: '#DF6B5B',
      info: '#6E9FC2',
      border: '#3E3227',
      divider: '#32281F',
      tabBar: '#1F1812',
      tabBarActive: '#DCA14D',
      tabBarInactive: '#8A7865',
    },
  },
  ink: {
    light: {
      background: '#F4F4F1',
      backgroundSecondary: '#E8E8E3',
      card: '#FCFBF8',
      text: '#1C2226',
      textSecondary: '#58626B',
      textLight: '#848E96',
      textTertiary: '#A3ACB3',
      primary: '#34404A',
      primaryLight: '#50606E',
      primaryDark: '#20282F',
      success: '#3B7A57',
      warning: '#C68B33',
      error: '#B43E36',
      info: '#3E6B89',
      border: '#DCDBD4',
      divider: '#E6E5DF',
      tabBar: '#FCFBF8',
      tabBarActive: '#34404A',
      tabBarInactive: '#828B93',
    },
    dark: {
      background: '#121518',
      backgroundSecondary: '#191D22',
      card: '#20252B',
      text: '#EDF0F2',
      textSecondary: '#A4AEB8',
      textLight: '#76818C',
      textTertiary: '#58626B',
      primary: '#8BA0B2',
      primaryLight: '#A8BAC9',
      primaryDark: '#63788A',
      success: '#5FB887',
      warning: '#E0A84E',
      error: '#DA675D',
      info: '#6CA2C7',
      border: '#2E353E',
      divider: '#252B32',
      tabBar: '#161A1E',
      tabBarActive: '#8BA0B2',
      tabBarInactive: '#747F8A',
    },
  },
};

/**
 * Returns the light or dark color palette for the selected Eastern aesthetic skin.
 */
export const getThemeColors = (scheme: 'light' | 'dark', skin: ThemeSkinId = 'bamboo'): Colors => {
  const palette = SKIN_PALETTES[skin] || SKIN_PALETTES.bamboo;
  return scheme === 'dark' ? palette.dark : palette.light;
};

// 获取当前主题颜色
export const getColors = (scheme: 'light' | 'dark'): Colors => {
  return scheme === 'dark' ? darkColors : lightColors;
};
