import { Dimensions, Platform, PixelRatio } from 'react-native';

// 获取设备尺寸
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// 标准设备尺寸 (iPhone 13/14 - 基准)
const BASE_WIDTH = 390;
const BASE_HEIGHT = 844;

// 设备类型检测
export enum DeviceType {
  Phone = 'phone',
  Tablet = 'tablet',
  Watch = 'watch',
}

// 获取设备类型
export const getDeviceType = (): DeviceType => {
  if (Platform.OS === 'ios') {
    // Apple Watch 检测 (非常小的屏幕)
    if (SCREEN_WIDTH < 250) {
      return DeviceType.Watch;
    }
    // iPad 检测
    if (SCREEN_WIDTH >= 768) {
      return DeviceType.Tablet;
    }
  }
  return DeviceType.Phone;
};

// 设备类型
export const deviceType = getDeviceType();

// 屏幕尺寸分类
export enum ScreenSize {
  Compact = 'compact',      // iPhone SE, iPhone 8
  Small = 'small',          // iPhone 13/14 (390x844)
  Medium = 'medium',        // iPhone 14 Plus/15 Plus (428x926)
  Large = 'large',          // iPhone 14 Pro Max/15 Pro Max (430x932)
  XLarge = 'xlarge',        // iPhone 16 Pro Max (440x956)
  Tablet = 'tablet',        // iPad (768x1024+)
  TabletLarge = 'tablet-large', // iPad Pro 11"/12.9"
}

// 获取屏幕尺寸类型
export const getScreenSize = (): ScreenSize => {
  if (deviceType === DeviceType.Tablet) {
    return SCREEN_WIDTH >= 1024 ? ScreenSize.TabletLarge : ScreenSize.Tablet;
  }
  if (SCREEN_WIDTH < 375) return ScreenSize.Compact;
  if (SCREEN_WIDTH < 400) return ScreenSize.Small;
  if (SCREEN_WIDTH < 420) return ScreenSize.Medium;
  if (SCREEN_WIDTH < 430) return ScreenSize.Large;
  return ScreenSize.XLarge;
};

export const screenSize = getScreenSize();

// 基础缩放比例
const getScaleFactor = (): number => {
  if (deviceType === DeviceType.Watch) return 0.6;
  if (deviceType === DeviceType.Tablet) {
    // iPad 使用适中的缩放
    return Math.min(SCREEN_WIDTH / BASE_WIDTH, 1.3);
  }
  // iPhone 根据宽度缩放
  return SCREEN_WIDTH / BASE_WIDTH;
};

const horizontalScale = (size: number): number => {
  return PixelRatio.roundToNearestPixel(size * getScaleFactor());
};

const verticalScale = (size: number): number => {
  return PixelRatio.roundToNearestPixel(size * getScaleFactor());
};

const fontScale = (size: number): number => {
  // 字体使用更温和的缩放
  const factor = deviceType === DeviceType.Watch ? 0.7 :
                 deviceType === DeviceType.Tablet ? 1.1 :
                 Math.min(getScaleFactor(), 1.15);
  return PixelRatio.roundToNearestPixel(size * factor);
};

// 响应式尺寸函数
export const rs = (size: number): number => horizontalScale(size);
export const vs = (size: number): number => verticalScale(size);
export const fs = (size: number): number => fontScale(size);

// 响应式尺寸对象
export const responsiveSize = {
  // 字体大小
  fontSize: {
    xs: fs(10),
    sm: fs(12),
    base: fs(14),
    lg: fs(16),
    xl: fs(18),
    '2xl': fs(20),
    '3xl': fs(24),
    '4xl': fs(28),
    '5xl': fs(32),
    '6xl': fs(36),
  },
  // 间距
  spacing: {
    xs: rs(4),
    sm: rs(8),
    md: rs(12),
    lg: rs(16),
    xl: rs(20),
    '2xl': rs(24),
    '3xl': rs(32),
    '4xl': rs(40),
    '5xl': rs(48),
  },
  // 圆角
  borderRadius: {
    sm: rs(8),
    md: rs(12),
    lg: rs(16),
    xl: rs(20),
    '2xl': rs(24),
    full: 9999,
  },
  // 图标大小
  iconSize: {
    sm: rs(16),
    md: rs(20),
    lg: rs(24),
    xl: rs(32),
    '2xl': rs(40),
    '3xl': rs(48),
  },
};

// 响应式值 (根据屏幕类型返回不同值)
type ResponsiveValue<T> = {
  compact?: T;
  small?: T;
  medium?: T;
  large?: T;
  xlarge?: T;
  tablet?: T;
  tabletLarge?: T;
  default: T;
};

export const responsive = <T>(config: ResponsiveValue<T>): T => {
  switch (screenSize) {
    case ScreenSize.Compact:
      return config.compact ?? config.small ?? config.default;
    case ScreenSize.Small:
      return config.small ?? config.default;
    case ScreenSize.Medium:
      return config.medium ?? config.large ?? config.default;
    case ScreenSize.Large:
      return config.large ?? config.xlarge ?? config.default;
    case ScreenSize.XLarge:
      return config.xlarge ?? config.large ?? config.default;
    case ScreenSize.Tablet:
      return config.tablet ?? config.default;
    case ScreenSize.TabletLarge:
      return config.tabletLarge ?? config.tablet ?? config.default;
    default:
      return config.default;
  }
};

// 布局相关
export const layout = {
  // 屏幕宽度
  screenWidth: SCREEN_WIDTH,
  screenHeight: SCREEN_HEIGHT,
  // 是否横屏
  isLandscape: SCREEN_WIDTH > SCREEN_HEIGHT,
  // 容器最大宽度 (iPad上限制内容宽度)
  maxWidth: deviceType === DeviceType.Tablet ? 600 : SCREEN_WIDTH,
  // 内容水平内边距
  contentPadding: responsive({
    small: rs(16),
    medium: rs(20),
    large: rs(20),
    tablet: rs(32),
    default: rs(16),
  }),
  // 卡片内边距
  cardPadding: responsive({
    small: rs(12),
    tablet: rs(20),
    default: rs(16),
  }),
  // 模态框宽度
  modalWidth: responsive({
    small: '90%',
    medium: '85%',
    large: '85%',
    tablet: 500,
    default: '85%',
  }),
  // 模态框最大宽度
  modalMaxWidth: responsive({
    small: 340,
    medium: 380,
    tablet: 500,
    default: 360,
  }),
};

// 获取响应式宽度 (用于Grid布局)
export const getResponsiveColumns = (minWidth: number): number => {
  const availableWidth = layout.maxWidth - layout.contentPadding * 2;
  const columns = Math.floor(availableWidth / minWidth);
  return Math.max(1, columns);
};

// 导出设备信息
export const deviceInfo = {
  type: deviceType,
  screenSize,
  width: SCREEN_WIDTH,
  height: SCREEN_HEIGHT,
  scale: PixelRatio.get(),
  isTablet: deviceType === DeviceType.Tablet,
  isPhone: deviceType === DeviceType.Phone,
  isWatch: deviceType === DeviceType.Watch,
};

// 监听尺寸变化
Dimensions.addEventListener('change', ({ window }) => {
  // 这里可以添加尺寸变化处理逻辑
  // 比如重新计算布局等
});
