import Gun from 'gun';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserStats } from '../types';

const USER_ID_KEY = '@guowu_user_id';
const USER_NICKNAME_KEY = '@guowu_nickname';
const USER_LANGUAGE_KEY = '@guowu_language';
const P2P_ENABLED_KEY = '@guowu_p2p_enabled';

// 免费的公共 GunDB 中继节点
const PEERS = [
  'https://gun-manhattan.herokuapp.com/gun',
  'https://gun-us.herokuapp.com/gun',
  'https://gun-eu.herokuapp.com/gun',
];

// 初始化 GunDB
export const gun = Gun({
  peers: PEERS,
  localStorage: false, // 不使用 localStorage，用 AsyncStorage
});

// 用户公开数据类型（用于排行榜）
export interface PublicUserData {
  userId: string;
  nickname: string;
  streak: number;
  completedDays: number;
  totalMerit: number;
  lastUpdate: number;
  rank?: number; // 排名（仅在Top 1000榜单中使用）
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
  const enabled = await AsyncStorage.getItem(P2P_ENABLED_KEY);
  return enabled === 'true';
};

/**
 * 启用 P2P 同步
 */
export const enableP2P = async (): Promise<void> => {
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
 * 只发布公开的排行榜数据，隐私数据（体重、禁欲等）不同步
 */
export const publishUserStats = async (
  stats: UserStats
): Promise<void> => {
  const enabled = await isP2PEnabled();
  if (!enabled) {
    return;
  }

  const userId = await getOrCreateUserId();
  const storedNickname = await AsyncStorage.getItem(USER_NICKNAME_KEY);
  // 使用生成的匿名昵称（如果没有设置昵称）
  const nickname = await getDisplayName(userId, storedNickname || undefined);

  const publicData: PublicUserData = {
    userId,
    nickname,
    streak: stats.currentStreak,
    completedDays: stats.completedDays,
    totalMerit: stats.totalMerit,
    lastUpdate: Date.now(),
  };

  // 发布到 GunDB 网络
  gun.get('fasting_leaderboard')
     .get(userId)
     .put(publicData);

  // 同时更新 Top 1000 榜单
  updateTop1000(publicData);
};

/**
 * 更新 Top 1000 榜单
 */
const updateTop1000 = async (userData: PublicUserData): Promise<void> => {
  const TOP1000_KEY = 'fasting_top1000';

  gun.get(TOP1000_KEY).once((data: any) => {
    const currentTop1000: PublicUserData[] = data
      ? Object.values(data as Record<string, PublicUserData>)
      : [];

    // 合并当前用户数据
    const updated = currentTop1000.filter(u => u.userId !== userData.userId);
    updated.push(userData);

    // 按 streak 排序，取 Top 1000
    const sorted = updated
      .sort((a, b) => b.streak - a.streak || b.completedDays - a.completedDays)
      .slice(0, 1000);

    // 存储为对象格式 (GunDB 更好处理)
    const top1000Obj: Record<string, PublicUserData> = {};
    sorted.forEach((user, index) => {
      top1000Obj[user.userId] = { ...user, rank: index + 1 };
    });

    gun.get(TOP1000_KEY).put(top1000Obj);
  });
};

/**
 * 订阅排行榜数据
 * @param callback 接收排行榜数据的回调
 * @param limit 返回前N名，默认100
 */
export const subscribeLeaderboard = (
  callback: LeaderboardCallback,
  limit: number = 100
): (() => void) => {
  const TOP1000_KEY = 'fasting_top1000';

  const listener = gun.get(TOP1000_KEY).on((data: any, key: string) => {
    if (data) {
      const top1000 = Object.values(data as Record<string, any>)
        .filter((u: any) => u.userId) // 过滤掉元数据
        .sort((a: any, b: any) =>
          (b.streak || 0) - (a.streak || 0) ||
          (b.completedDays || 0) - (a.completedDays || 0)
        )
        .slice(0, limit);

      callback(top1000);
    }
  });

  // 返回取消订阅函数
  return () => {
    listener.off();
  };
};

/**
 * 获取用户的当前排名
 */
export const getUserRank = async (
  stats: UserStats
): Promise<number> => {
  const userId = await getOrCreateUserId();
  const userStreak = stats.currentStreak;

  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      resolve(-1); // 超时返回-1
    }, 3000);

    // 使用 any 避免 GunDB 类型问题
    const mapCallback: any = (data: any, id: string) => {
      if (id && data && id !== 'fasting_leaderboard') {
        const users: PublicUserData[] = Object.values(data as Record<string, PublicUserData>)
          .filter(u => u.userId);

        // 找出 streak 比当前用户多的数量
        const betterCount = users.filter(u => u.streak > userStreak).length;
        clearTimeout(timeout);
        resolve(betterCount + 1);
      }
    };
    gun.get('fasting_leaderboard').map(mapCallback);
  });
};

/**
 * 从 P2P 网络中移除用户数据（数据删除功能）
 */
export const removeUserFromP2P = async (): Promise<void> => {
  const userId = await getOrCreateUserId();

  gun.get('fasting_leaderboard').get(userId).put(null);

  // 从 Top 1000 中移除
  gun.get('fasting_top1000').once((data: any) => {
    if (data) {
      const top1000Obj: Record<string, any> = { ...data };
      delete top1000Obj[userId];
      gun.get('fasting_top1000').put(top1000Obj);
    }
  });
};
