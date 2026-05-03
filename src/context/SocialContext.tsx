import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import type {
  OnlineUser,
  ChatMessage,
  FriendRequest,
  Friend,
  SharedStats,
  LeaderboardEntry,
  PrivateMessage,
} from '../types';
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

  chatMessages: ChatMessage[];
  sendChat: (text: string) => void;

  updateNickname: (name: string) => void;

  friends: Friend[];
  friendRequests: FriendRequest[];
  sendFriendRequest: (toUserId: string) => void;
  respondToFriendRequest: (requestId: string, fromUserId: string, accept: boolean) => void;
  removeFriend: (userId: string) => void;

  shareMyStats: (stats: SharedStats) => void;
  getFriendStats: (userId: string) => void;

  connect: () => void;
  disconnect: () => void;
  goOnline: (activity: OnlineUser['activity']) => void;
  goOffline: () => void;

  leaderboardData: LeaderboardData;
  totalParticipants: number;
  publishLeaderboardStats: (entry: LeaderboardEntry) => void;
  requestLeaderboard: (category: 'fasting' | 'meditation', period: 'weekly' | 'monthly' | 'yearly') => void;

  privateMessages: PrivateMessage[];
  sendPrivateMessage: (toUserId: string, toNickname: string, text: string) => void;
  getPrivateMessages: (withUserId: string) => void;
  getConversationMessages: (withUserId: string) => PrivateMessage[];
}

const SocialContext = createContext<SocialContextType | null>(null);

export function useSocial(): SocialContextType {
  const ctx = useContext(SocialContext);
  if (!ctx) throw new Error('useSocial must be used within SocialProvider');
  return ctx;
}

export function SocialProvider({ children }: { children: ReactNode }) {
  const partykit = usePartyKit();

  const [userId, setUserId] = useState('');
  const [nickname, setNickname] = useState('');
  const [friends, setFriends] = useState<Friend[]>([]);

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

  const sendChat = useCallback((text: string) => {
    partykit.sendChat(userId, nickname, text);
  }, [userId, nickname, partykit]);

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

  const sendPrivateMessage = useCallback((toUserId: string, toNickname: string, text: string) => {
    partykit.sendPrivateMessage(userId, nickname, toUserId, toNickname, text);
  }, [userId, nickname, partykit]);

  const getPrivateMessages = useCallback((withUserId: string) => {
    partykit.getPrivateMessages(userId, withUserId);
  }, [userId, partykit]);

  const getConversationMessages = useCallback((withUserId: string) => {
    return partykit.privateMessages.filter(
      (m) =>
        (m.fromUserId === userId && m.toUserId === withUserId) ||
        (m.fromUserId === withUserId && m.toUserId === userId)
    ).sort((a, b) => a.timestamp - b.timestamp);
  }, [userId, partykit.privateMessages]);

  const isFriend = useCallback((otherUserId: string) => {
    return friends.some((f) => f.userId === otherUserId);
  }, [friends]);

  const value: SocialContextType = {
    isConnected: partykit.isConnected,
    userId,
    nickname,
    onlineUsers: partykit.onlineUsers,
    onlineCount: partykit.onlineCount,
    chatMessages: partykit.chatMessages,
    friendRequests: partykit.friendRequests,
    friends,
    sendChat,
    updateNickname,
    sendFriendRequest: handleSendFriendRequest,
    respondToFriendRequest: handleRespondToFriendRequest,
    removeFriend: handleRemoveFriend,
    shareMyStats,
    getFriendStats,
    connect,
    disconnect,
    goOnline,
    goOffline,
    leaderboardData: partykit.leaderboardData,
    totalParticipants: partykit.totalParticipants,
    publishLeaderboardStats,
    requestLeaderboard,
    privateMessages: partykit.privateMessages,
    sendPrivateMessage,
    getPrivateMessages,
    getConversationMessages,
  };

  return (
    <SocialContext.Provider value={value}>
      {children}
    </SocialContext.Provider>
  );
}
