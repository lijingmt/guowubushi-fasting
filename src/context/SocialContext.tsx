import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import type {
  OnlineUser,
  ChatMessage,
  FriendRequest,
  Friend,
  SharedStats,
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

interface SocialContextType {
  // Connection
  isConnected: boolean;
  userId: string;
  nickname: string;

  // Online
  onlineUsers: OnlineUser[];
  onlineCount: number;

  // Chat
  chatMessages: ChatMessage[];
  sendChat: (text: string) => void;

  // Nickname
  updateNickname: (name: string) => void;

  // Friends
  friends: Friend[];
  friendRequests: FriendRequest[];
  sendFriendRequest: (toUserId: string) => void;
  respondToFriendRequest: (requestId: string, fromUserId: string, accept: boolean) => void;
  removeFriend: (userId: string) => void;

  // Stats
  shareMyStats: (stats: SharedStats) => void;
  getFriendStats: (userId: string) => void;

  // Connection lifecycle
  connect: () => void;
  disconnect: () => void;
  goOnline: (activity: OnlineUser['activity']) => void;
  goOffline: () => void;
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

  // Load persisted data on mount
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

  // Connect/disconnect
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

  // Chat
  const sendChat = useCallback((text: string) => {
    partykit.sendChat(userId, nickname, text);
  }, [userId, nickname, partykit]);

  // Nickname
  const updateNickname = useCallback(async (name: string) => {
    setNickname(name);
    await storageSaveNickname(name);
    if (userId) {
      partykit.updateNickname(userId, name);
    }
  }, [userId, partykit]);

  // Friends
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

  // Stats
  const shareMyStats = useCallback((stats: SharedStats) => {
    partykit.shareStats(stats);
  }, [partykit]);

  const getFriendStats = useCallback((friendUserId: string) => {
    partykit.getStats(friendUserId);
  }, [partykit]);

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
  };

  return (
    <SocialContext.Provider value={value}>
      {children}
    </SocialContext.Provider>
  );
}
