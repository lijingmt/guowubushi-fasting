import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserStats } from '../types';

const USER_ID_KEY = '@guowu_user_id';
const USER_NICKNAME_KEY = '@guowu_nickname';
const USER_LANGUAGE_KEY = '@guowu_language';
const P2P_ENABLED_KEY = '@guowu_p2p_enabled';

// P2P 功能已暂时禁用 - 等待 Firebase 集成
const P2P_DISABLED = true;

// 用户公开数据类型（用于排行榜）
export interface PublicUserData {
  userId: string;
  nickname: string;
  streak: number;
  completedDays: number;
  totalMerit: number;
  lastUpdate: number;
  rank?: number;
}

// 排行榜数据回调类型
export type LeaderboardCallback = (users: PublicUserData[]) => void;

/**
 * 生成或获取用户唯一ID
 * 使用随机UUID，不上传任何个人信息
 */
export const getOrCreateUserId = async (): Promise<string> => {
  const existingId = await AsyncStorage.getItem(USER_ID_KEY);
  if (existingId) {
    return existingId;
  }

  // 生成随机用户ID
  const userId = 'user_' + Math.random().toString(36).substring(2, 15) +
                   '_' + Date.now().toString(36);
  await AsyncStorage.setItem(USER_ID_KEY, userId);
  return userId;
};

/**
 * 设置用户昵称
 */
export const setNickname = async (nickname: string): Promise<void> => {
  await AsyncStorage.setItem(USER_NICKNAME_KEY, nickname);
};

/**
 * 生成基于用户ID的匿名昵称（支持多语言）
 */
const generateAnonymousNickname = async (userId: string): Promise<string> => {
  // 从用户ID生成一个短哈希作为昵称
  const hash = userId.split('_').pop() || userId;
  const shortHash = hash.substring(0, 6).toUpperCase();

  // 获取语言设置
  const language = await AsyncStorage.getItem(USER_LANGUAGE_KEY) || 'zh';

  const prefixes: Record<string, string> = {
    zh: '修行者',
    en: 'Practitioner',
    es: 'Practicante',
  };

  const prefix = prefixes[language] || 'User';
  return `${prefix}${shortHash}`;
};

/**
 * 获取用户昵称（如果没有设置则返回基于ID的匿名昵称）
 */
export const getNickname = async (): Promise<string> => {
  const nickname = await AsyncStorage.getItem(USER_NICKNAME_KEY);
  if (nickname && nickname.trim()) {
    return nickname;
  }
  // 如果没有昵称，基于userId生成匿名昵称
  const userId = await getOrCreateUserId();
  return generateAnonymousNickname(userId);
};

/**
 * 获取显示昵称（用于排行榜显示）
 */
export const getDisplayName = async (userId: string, storedNickname?: string): Promise<string> => {
  if (storedNickname && storedNickname.trim()) {
    return storedNickname;
  }
  return generateAnonymousNickname(userId);
};

/**
 * 检查 P2P 是否已启用
 */
export const isP2PEnabled = async (): Promise<boolean> => {
  if (P2P_DISABLED) {
    return false;
  }
  const enabled = await AsyncStorage.getItem(P2P_ENABLED_KEY);
  return enabled === 'true';
};

/**
 * 启用 P2P 同步
 */
export const enableP2P = async (): Promise<void> => {
  if (P2P_DISABLED) {
    return;
  }
  await AsyncStorage.setItem(P2P_ENABLED_KEY, 'true');
};

/**
 * 禁用 P2P 同步
 */
export const disableP2P = async (): Promise<void> => {
  await AsyncStorage.setItem(P2P_ENABLED_KEY, 'false');
};

/**
 * 发布用户统计数据到 P2P 网络
 * P2P 功能已暂时禁用
 */
export const publishUserStats = async (
  stats: UserStats
): Promise<void> => {
  // P2P 功能已禁用
  return;
};

/**
 * 订阅排行榜数据
 * P2P 功能已暂时禁用
 */
export const subscribeLeaderboard = (
  callback: LeaderboardCallback,
  limit: number = 100
): (() => void) => {
  // 返回空订阅函数
  return () => {};
};

/**
 * 获取用户的当前排名
 * P2P 功能已暂时禁用
 */
export const getUserRank = async (
  stats: UserStats
): Promise<number> => {
  return -1;
};

/**
 * 从 P2P 网络中移除用户数据
 * P2P 功能已暂时禁用
 */
export const removeUserFromP2P = async (): Promise<void> => {
  // P2P 功能已禁用
  return;
};
