import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import type {
  OnlineUser,
  FriendRequest,
  Friend,
  SharedStats,
  LeaderboardEntry,
  FriendEncouragement,
  SilentGestureType,
  SilentRoomCounts,
  SilentGestureEvent,
  BuddyChallenge,
  RepairCardGift,
} from '../types';
import { getLocalDateString } from '../utils/date';
import { usePartyKit } from '../hooks/usePartyKit';
import {
  getOrCreateUserId,
  getNickname,
  saveNickname as storageSaveNickname,
  getFriendsList,
  saveFriend as storageSaveFriend,
  removeFriend as storageRemoveFriend,
} from '../services/storage';
import { calculatePeriodStats } from '../utils/leaderboardStats';
import { useApp } from './AppContext';

interface LeaderboardData {
  fasting: {
    weekly: LeaderboardEntry[];
    monthly: LeaderboardEntry[];
    yearly: LeaderboardEntry[];
  };
  meditation: {
    weekly: LeaderboardEntry[];
    monthly: LeaderboardEntry[];
    yearly: LeaderboardEntry[];
  };
}

interface SocialContextType {
  isConnected: boolean;
  userId: string;
  nickname: string;

  onlineUsers: OnlineUser[];
  onlineCount: number;

  updateNickname: (name: string) => void;

  friends: Friend[];
  friendRequests: FriendRequest[];
  friendEncouragements: FriendEncouragement[];
  sendFriendRequest: (toUserId: string) => void;
  respondToFriendRequest: (requestId: string, fromUserId: string, accept: boolean) => void;
  removeFriend: (userId: string) => void;
  sendFriendEncouragement: (toUserId: string, toNickname: string, kind?: FriendEncouragement['kind']) => Promise<void>;

  shareMyStats: (stats: SharedStats) => void;
  getFriendStats: (userId: string) => void;
  friendStatsMap: Record<string, SharedStats>;

  connect: () => void;
  disconnect: () => void;
  goOnline: (activity: OnlineUser['activity']) => void;
  goOffline: () => void;

  leaderboardData: LeaderboardData;
  totalParticipants: number;
  publishLeaderboardStats: (entry: LeaderboardEntry) => void;
  requestLeaderboard: (category: 'fasting' | 'meditation', period: 'weekly' | 'monthly' | 'yearly') => void;

  silentRoomCounts: SilentRoomCounts;
  silentRoomTodayCounts: SilentRoomCounts;
  recentSilentGestures: SilentGestureEvent[];
  sendSilentGesture: (gesture: SilentGestureType) => void;

  buddyChallenges: BuddyChallenge[];
  pendingRepairGifts: RepairCardGift[];
  startBuddyChallenge: (toUserId: string, toNickname: string, durationDays: 7 | 21) => void;
  lightBuddyLamp: (partnerUserId: string, date?: string) => void;
  giftRepairCard: (toUserId: string) => Promise<boolean>;
}

const SocialContext = createContext<SocialContextType | null>(null);

export function useSocial(): SocialContextType {
  const ctx = useContext(SocialContext);
  if (!ctx) throw new Error('useSocial must be used within SocialProvider');
  return ctx;
}

export function SocialProvider({ children }: { children: ReactNode }) {
  const partykit = usePartyKit();
  const publishLeaderboard = partykit.publishLeaderboardStats;
  const shareStatsToServer = partykit.shareStats;
  const requestFriends = partykit.requestFriends;
  const remoteFriends = partykit.remoteFriends;
  const {
    isLoading,
    stats,
    checkInRecords,
    practiceRecords,
    recordFriendEncouragement,
    recordReceivedFriendEncouragement,
    consumeRepairCardForGift,
    receiveRepairCardGifts,
  } = useApp();

  const [userId, setUserId] = useState('');
  const [nickname, setNickname] = useState('');
  const [friends, setFriends] = useState<Friend[]>([]);
  const lastLeaderboardPublishRef = useRef('');
  const lastSharedStatsRef = useRef('');

  useEffect(() => {
    (async () => {
      const id = await getOrCreateUserId();
      setUserId(id);

      const name = await getNickname();
      setNickname(name);

      const list = await getFriendsList();
      setFriends(list);
    })();
  }, []);

  // Auto-connect when userId is loaded
  useEffect(() => {
    if (userId) {
      partykit.connect(userId, nickname);
    }
  }, [userId]);

  useEffect(() => {
    if (partykit.isConnected && userId) {
      requestFriends(userId);
    }
  }, [partykit.isConnected, userId, requestFriends]);

  useEffect(() => {
    if (remoteFriends.length === 0) return;

    const missing = remoteFriends.filter(
      (remote) => remote.userId && !friends.some((local) => local.userId === remote.userId)
    );
    if (missing.length === 0) return;

    setFriends((prev) => [...prev, ...missing]);
    missing.forEach((friend) => {
      void storageSaveFriend(friend);
    });
  }, [remoteFriends, friends]);

  const connect = useCallback(() => {
    if (userId) {
      partykit.connect(userId, nickname);
    }
  }, [userId, nickname, partykit]);

  const disconnect = useCallback(() => {
    partykit.disconnect();
  }, [partykit]);

  const goOnline = useCallback((activity: OnlineUser['activity']) => {
    partykit.sendOnline(userId, nickname, activity);
  }, [userId, nickname, partykit]);

  const goOffline = useCallback(() => {
    partykit.sendOffline(userId);
  }, [userId, partykit]);

  const updateNickname = useCallback(async (name: string) => {
    setNickname(name);
    await storageSaveNickname(name);
    if (userId) {
      partykit.updateNickname(userId, name);
    }
  }, [userId, partykit]);

  const handleSendFriendRequest = useCallback((toUserId: string) => {
    partykit.sendFriendRequest(userId, nickname, toUserId);
  }, [userId, nickname, partykit]);

  const handleRespondToFriendRequest = useCallback(async (requestId: string, fromUserId: string, accept: boolean) => {
    partykit.respondToFriendRequest(requestId, fromUserId, userId, accept);

    if (accept) {
      const existing = friends.find((f) => f.userId === fromUserId);
      if (!existing) {
        const request = partykit.friendRequests.find((r) => r.id === requestId);
        const newFriend: Friend = {
          userId: fromUserId,
          nickname: request?.fromNickname || 'Anonymous',
          addedAt: Date.now(),
        };
        const updated = [...friends, newFriend];
        setFriends(updated);
        await storageSaveFriend(newFriend);
      }
    }
  }, [userId, friends, partykit]);

  const handleRemoveFriend = useCallback(async (friendUserId: string) => {
    const updated = friends.filter((f) => f.userId !== friendUserId);
    setFriends(updated);
    await storageRemoveFriend(friendUserId);
  }, [friends]);

  const handleSendFriendEncouragement = useCallback(async (
    toUserId: string,
    toNickname: string,
    kind: FriendEncouragement['kind'] = 'cheer',
  ) => {
    partykit.sendFriendEncouragement(
      userId,
      nickname,
      toUserId,
      toNickname,
      kind,
      kind === 'streak' ? 'Keep the streak going' : 'Practice together today'
    );
    await recordFriendEncouragement(toUserId);
  }, [userId, nickname, partykit, recordFriendEncouragement]);

  const shareMyStats = useCallback((stats: SharedStats) => {
    partykit.shareStats(stats);
  }, [partykit]);

  const getFriendStats = useCallback((friendUserId: string) => {
    partykit.getStats(friendUserId);
  }, [partykit]);

  const publishLeaderboardStats = useCallback((entry: LeaderboardEntry) => {
    partykit.publishLeaderboardStats(entry);
  }, [partykit]);

  const requestLeaderboard = useCallback((category: 'fasting' | 'meditation', period: 'weekly' | 'monthly' | 'yearly') => {
    partykit.requestLeaderboard(category, period);
  }, [partykit]);

  const sendSilentGesture = useCallback((gesture: SilentGestureType) => {
    if (!userId) return;
    partykit.sendSilentGesture(userId, nickname, gesture);
  }, [userId, nickname, partykit]);

  const startBuddyChallenge = useCallback((toUserId: string, toNickname: string, durationDays: 7 | 21) => {
    if (!userId) return;
    partykit.startBuddyChallenge(userId, nickname, toUserId, toNickname, durationDays, getLocalDateString());
  }, [userId, nickname, partykit]);

  const lightBuddyLamp = useCallback((partnerUserId: string, date?: string) => {
    if (!userId) return;
    partykit.lightBuddyLamp(userId, partnerUserId, date || getLocalDateString());
  }, [userId, partykit]);

  const giftRepairCard = useCallback(async (toUserId: string): Promise<boolean> => {
    if (!userId) return false;
    const consumed = await consumeRepairCardForGift();
    if (!consumed) return false;
    partykit.giftRepairCard(userId, nickname, toUserId);
    return true;
  }, [userId, nickname, partykit, consumeRepairCardForGift]);

  const processedGiftIdsRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!userId || partykit.pendingRepairGifts.length === 0) return;
    const unclaimed = partykit.pendingRepairGifts.filter((g) => !processedGiftIdsRef.current.has(g.id));
    if (unclaimed.length === 0) return;
    unclaimed.forEach((g) => processedGiftIdsRef.current.add(g.id));
    void (async () => {
      await receiveRepairCardGifts(unclaimed.length);
      partykit.claimRepairCardGifts(userId);
    })();
  }, [userId, partykit.pendingRepairGifts, partykit, receiveRepairCardGifts]);

  useEffect(() => {
    if (isLoading || !partykit.isConnected || !userId) return;

    const entry = calculatePeriodStats(
      userId,
      nickname,
      checkInRecords,
      practiceRecords,
      stats.currentStreak,
    );
    const publishKey = JSON.stringify({
      userId: entry.userId,
      nickname: entry.nickname,
      currentStreak: entry.currentStreak,
      fastingDaysThisWeek: entry.fastingDaysThisWeek,
      fastingDaysThisMonth: entry.fastingDaysThisMonth,
      fastingDaysThisYear: entry.fastingDaysThisYear,
      meditationMinutesThisWeek: entry.meditationMinutesThisWeek,
      meditationMinutesThisMonth: entry.meditationMinutesThisMonth,
      meditationMinutesThisYear: entry.meditationMinutesThisYear,
      meditationDaysThisMonth: entry.meditationDaysThisMonth,
      meditationDaysThisYear: entry.meditationDaysThisYear,
      sessionCountThisWeek: entry.sessionCountThisWeek,
    });
    if (publishKey === lastLeaderboardPublishRef.current) return;

    lastLeaderboardPublishRef.current = publishKey;
    publishLeaderboard(entry);
  }, [
    isLoading,
    partykit.isConnected,
    userId,
    nickname,
    checkInRecords,
    practiceRecords,
    stats.currentStreak,
    publishLeaderboard,
  ]);

  useEffect(() => {
    if (isLoading || !partykit.isConnected || !userId) return;

    const sharedPayload: SharedStats = {
      userId,
      nickname,
      streak: stats.currentStreak,
      totalMeditationMinutes: stats.totalMeditationMinutes,
      totalMerit: stats.totalMerit,
      meditationSessionCount: stats.meditationSessionCount,
      longestMeditationSession: stats.longestMeditationSession,
      totalMeditationDays: stats.totalMeditationDays,
    };
    const sharedKey = JSON.stringify(sharedPayload);
    if (sharedKey === lastSharedStatsRef.current) return;

    lastSharedStatsRef.current = sharedKey;
    shareStatsToServer(sharedPayload);
  }, [
    isLoading,
    partykit.isConnected,
    userId,
    nickname,
    stats.currentStreak,
    stats.totalMeditationMinutes,
    stats.totalMerit,
    stats.meditationSessionCount,
    stats.longestMeditationSession,
    stats.totalMeditationDays,
    shareStatsToServer,
  ]);

  useEffect(() => {
    if (!userId || partykit.friendEncouragements.length === 0) return;
    partykit.friendEncouragements
      .filter((item) => item.toUserId === userId)
      .forEach((item) => {
        void recordReceivedFriendEncouragement(item);
      });
  }, [userId, partykit.friendEncouragements, recordReceivedFriendEncouragement]);

  const isFriend = useCallback((otherUserId: string) => {
    return friends.some((f) => f.userId === otherUserId);
  }, [friends]);

  const value: SocialContextType = {
    isConnected: partykit.isConnected,
    userId,
    nickname,
    onlineUsers: partykit.onlineUsers,
    onlineCount: partykit.onlineCount,
    friendRequests: partykit.friendRequests,
    friendEncouragements: partykit.friendEncouragements,
    friends,
    updateNickname,
    sendFriendRequest: handleSendFriendRequest,
    respondToFriendRequest: handleRespondToFriendRequest,
    removeFriend: handleRemoveFriend,
    sendFriendEncouragement: handleSendFriendEncouragement,
    shareMyStats,
    getFriendStats,
    friendStatsMap: partykit.friendStatsMap,
    connect,
    disconnect,
    goOnline,
    goOffline,
    leaderboardData: partykit.leaderboardData,
    totalParticipants: partykit.totalParticipants,
    publishLeaderboardStats,
    requestLeaderboard,
    silentRoomCounts: partykit.silentRoomCounts,
    silentRoomTodayCounts: partykit.silentRoomTodayCounts,
    recentSilentGestures: partykit.recentSilentGestures,
    sendSilentGesture,
    buddyChallenges: partykit.buddyChallenges,
    pendingRepairGifts: partykit.pendingRepairGifts,
    startBuddyChallenge,
    lightBuddyLamp,
    giftRepairCard,
  };

  return (
    <SocialContext.Provider value={value}>
      {children}
    </SocialContext.Provider>
  );
}
