import React from 'react';
import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';

interface TabIconProps {
  color: string;
  focused: boolean;
  size?: number;
}

/**
 * 日晷/节律图标：代表"今日"断食节律罗盘
 */
export const SundialTabIcon: React.FC<TabIconProps> = ({ color, focused, size = 24 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle
      cx={12}
      cy={12}
      r={9}
      stroke={color}
      strokeWidth={focused ? 2.1 : 1.7}
      fill={focused ? color + '18' : 'none'}
    />
    <Circle cx={12} cy={12} r={1.8} fill={color} />
    <Line x1={12} y1={12} x2={12} y2={6.2} stroke={color} strokeWidth={focused ? 2 : 1.7} strokeLinecap="round" />
    <Line x1={12} y1={12} x2={16.5} y2={14.5} stroke={color} strokeWidth={1.7} strokeLinecap="round" />
    <Line x1={12} y1={3} x2={12} y2={4.4} stroke={color} strokeWidth={1.6} strokeLinecap="round" />
  </Svg>
);

/**
 * 莲华静坐图标：代表"静心"打坐与心灯共修
 */
export const LotusTabIcon: React.FC<TabIconProps> = ({ color, focused, size = 24 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M12 4.5C9.6 8 8.8 11.4 12 15.5C15.2 11.4 14.4 8 12 4.5Z"
      stroke={color}
      strokeWidth={focused ? 2 : 1.65}
      fill={focused ? color + '22' : 'none'}
      strokeLinejoin="round"
    />
    <Path
      d="M12 15.5C8.5 14.2 6.2 11.2 5.2 8.2C3.6 11.8 5.2 16 9.8 17.5"
      stroke={color}
      strokeWidth={focused ? 1.9 : 1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M12 15.5C15.5 14.2 17.8 11.2 18.8 8.2C20.4 11.8 18.8 16 14.2 17.5"
      stroke={color}
      strokeWidth={focused ? 1.9 : 1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path d="M4.5 19.2C7.2 18.4 9.5 18.4 12 19.2C14.5 18.4 16.8 18.4 19.5 19.2" stroke={color} strokeWidth={1.6} strokeLinecap="round" />
  </Svg>
);

/**
 * 山岳云路图标：代表"行脚"圣地云行脚、榜单与搭子
 */
export const MountainTabIcon: React.FC<TabIconProps> = ({ color, focused, size = 24 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M3.5 18.5L9.5 7.5L13.5 14L16.2 10.2L20.5 18.5H3.5Z"
      stroke={color}
      strokeWidth={focused ? 2 : 1.65}
      fill={focused ? color + '18' : 'none'}
      strokeLinejoin="round"
    />
    <Circle cx={17.5} cy={6} r={1.6} stroke={color} strokeWidth={1.6} />
  </Svg>
);

/**
 * 印章图标：代表"我的"修行档案与设置
 */
export const SealTabIcon: React.FC<TabIconProps> = ({ color, focused, size = 24 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Rect
      x={4.5}
      y={4.5}
      width={15}
      height={15}
      rx={3.5}
      stroke={color}
      strokeWidth={focused ? 2.1 : 1.7}
      fill={focused ? color + '18' : 'none'}
    />
    <Circle cx={12} cy={10} r={2.3} stroke={color} strokeWidth={1.6} />
    <Path d="M8.2 16.5C9.1 14.8 10.4 14.1 12 14.1C13.6 14.1 14.9 14.8 15.8 16.5" stroke={color} strokeWidth={1.6} strokeLinecap="round" />
  </Svg>
);
