import { useState, useRef, useCallback, useEffect } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  OnlineUser,
  ChatMessage,
  FriendRequest,
  Friend,
  SharedStats,
  LeaderboardEntry,
  PrivateMessage,
} from '../types';

const PARTYKIT_URL = 'wss://partykit.guowubushi.net/party/meditation-room';
const debugLog = (...args: unknown[]) => {
  if (__DEV__) {
    console.log(...args);
  }
};

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

const emptyLeaderboard: LeaderboardData = {
  fasting: { weekly: [], monthly: [], yearly: [] },
  meditation: { weekly: [], monthly: [], yearly: [] },
};

interface UsePartyKitReturn {
  isConnected: boolean;
  onlineUsers: OnlineUser[];
  onlineCount: number;
  chatMessages: ChatMessage[];
  friendRequests: FriendRequest[];
  leaderboardData: LeaderboardData;
  privateMessages: PrivateMessage[];
  remoteFriends: Friend[];
  totalParticipants: number;
  connect: (userId: string, nickname: string) => void;
  disconnect: () => void;
  sendOnline: (userId: string, nickname: string, activity: OnlineUser['activity']) => void;
  sendOffline: (userId: string) => void;
  sendChat: (userId: string, nickname: string, text: string) => void;
  updateNickname: (userId: string, nickname: string) => void;
  shareStats: (stats: SharedStats) => void;
  getStats: (userId: string) => void;
  sendFriendRequest: (fromUserId: string, fromNickname: string, toUserId: string) => void;
  respondToFriendRequest: (requestId: string, fromUserId: string, toUserId: string, accept: boolean) => void;
  requestFriends: (userId: string) => void;
  publishLeaderboardStats: (entry: LeaderboardEntry) => void;
  requestLeaderboard: (category: 'fasting' | 'meditation', period: 'weekly' | 'monthly' | 'yearly') => void;
  sendPrivateMessage: (fromUserId: string, fromNickname: string, toUserId: string, toNickname: string, text: string) => void;
  getPrivateMessages: (fromUserId: string, toUserId: string) => void;
  markMessagesAsRead: (withUserId: string) => void;
  getUnreadMessages: () => PrivateMessage[];
}

export function usePartyKit(): UsePartyKitReturn {
  const wsRef = useRef<WebSocket | null>(null);
  const userIdRef = useRef<string>('');
  const pendingOnlineRef = useRef<{ userId: string; nickname: string; activity: OnlineUser['activity'] } | null>(null);
  const lastOnlineRef = useRef<{ userId: string; nickname: string; activity: OnlineUser['activity'] } | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectDelayRef = useRef(1000);
  const readMessageIdsRef = useRef<Set<string>>(new Set());

  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [onlineCount, setOnlineCount] = useState(0);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardData>(emptyLeaderboard);
  const [privateMessages, setPrivateMessages] = useState<PrivateMessage[]>([]);
  const [remoteFriends, setRemoteFriends] = useState<Friend[]>([]);
  const [totalParticipants, setTotalParticipants] = useState(0);

  // Load cached leaderboard on mount
  useEffect(() => {
    (async () => {
      try {
        const cached = await AsyncStorage.getItem('@guowu_leaderboard_cache');
        if (cached) {
          setLeaderboardData(JSON.parse(cached));
        }
        const cachedMessages = await AsyncStorage.getItem('@guowu_private_messages');
        if (cachedMessages) {
          setPrivateMessages(JSON.parse(cachedMessages));
        }
      } catch (e) { /* ignore */ }
    })();
  }, []);

  // Save leaderboard to cache whenever it changes
  const saveLeaderboardCache = useCallback(async (data: LeaderboardData) => {
    try {
      await AsyncStorage.setItem('@guowu_leaderboard_cache', JSON.stringify(data));
    } catch (e) { /* ignore */ }
  }, []);

  const clearReconnect = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
  }, []);

  const connect = useCallback((userId: string, _nickname: string) => {
    userIdRef.current = userId;
    clearReconnect();

    if (wsRef.current) {
      wsRef.current.close();
    }

    try {
      const ws = new WebSocket(PARTYKIT_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        debugLog('[PartyKit] Connected');
        setIsConnected(true);
        reconnectDelayRef.current = 1000;

        // Restore online status on reconnect
        const online = pendingOnlineRef.current || lastOnlineRef.current;
        if (online) {
          ws.send(JSON.stringify({
            type: 'online',
            payload: { id: online.userId, nickname: online.nickname, activity: online.activity, startedAt: Date.now() },
          }));
          pendingOnlineRef.current = null;
        }

        // Request default leaderboards
        ws.send(JSON.stringify({ type: 'getLeaderboard', category: 'fasting', period: 'weekly' }));
        ws.send(JSON.stringify({ type: 'getLeaderboard', category: 'fasting', period: 'monthly' }));
        ws.send(JSON.stringify({ type: 'getLeaderboard', category: 'fasting', period: 'yearly' }));
        ws.send(JSON.stringify({ type: 'getLeaderboard', category: 'meditation', period: 'weekly' }));
        ws.send(JSON.stringify({ type: 'getLeaderboard', category: 'meditation', period: 'monthly' }));
        ws.send(JSON.stringify({ type: 'getLeaderboard', category: 'meditation', period: 'yearly' }));
        ws.send(JSON.stringify({ type: 'getFriends', userId }));
        ws.send(JSON.stringify({ type: 'getPrivateMessages', userId }));
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          switch (data.type) {
            case 'init':
              setOnlineUsers(data.onlineUsers || []);
              setOnlineCount(data.onlineCount || 0);
              if (data.chatHistory) {
                setChatMessages(data.chatHistory);
              }
              if (data.leaderboard) {
                setLeaderboardData((prev) => ({
                  ...prev,
                  fasting: { ...prev.fasting, weekly: data.leaderboard },
                }));
              }
              break;

            case 'onlineUpdate':
              setOnlineUsers(data.onlineUsers || []);
              setOnlineCount(data.onlineCount || 0);
              break;

            case 'chatMessage':
              setChatMessages((prev) => {
                const next = [...prev, data.message];
                return next.length > 50 ? next.slice(-50) : next;
              });
              break;

            case 'chatHistory':
              setChatMessages(data.messages || []);
              break;

            case 'nicknameUpdate':
              setOnlineUsers((prev) =>
                prev.map((u) =>
                  u.id === data.userId ? { ...u, nickname: data.nickname } : u
                )
              );
              break;

            case 'friendRequestReceived':
              // Only process if this request is for me
              if (data.request.toUserId === userIdRef.current) {
                setFriendRequests((prev) => {
                  if (prev.find((r) => r.id === data.request.id)) return prev;
                  return [...prev, data.request];
                });
              }
              break;

            case 'friendRequestResolved':
              setFriendRequests((prev) => prev.filter((r) => r.id !== data.requestId));
              break;

            case 'friendshipUpdate':
              if (Array.isArray(data.users) && data.users.includes(userIdRef.current)) {
                wsRef.current?.send(JSON.stringify({ type: 'getFriends', userId: userIdRef.current }));
              }
              break;

            case 'friendsList':
              setRemoteFriends(data.friends || []);
              break;

            case 'userStats':
              break;

            case 'leaderboardUpdate':
              if (data.category && data.period) {
                setLeaderboardData((prev) => {
                  const updated = {
                    ...prev,
                    [data.category]: {
                      ...prev[data.category as 'fasting' | 'meditation'],
                      [data.period]: data.entries || [],
                    },
                  };
                  saveLeaderboardCache(updated);
                  return updated;
                });
                if (data.totalParticipants !== undefined) {
                  setTotalParticipants(data.totalParticipants);
                }
              }
              break;

            case 'privateMessageReceived':
              debugLog('[PartyKit] PM received:', data.message?.id, 'to:', data.message?.toUserId, 'from:', data.message?.fromUserId, 'myId:', userIdRef.current);
              if (data.message.toUserId === userIdRef.current || data.message.fromUserId === userIdRef.current) {
                setPrivateMessages((prev) => {
                  if (prev.find((m) => m.id === data.message.id)) return prev;
                  const next = [...prev, data.message];
                  return next.length > 200 ? next.slice(-200) : next;
                });
              } else {
                debugLog('[PartyKit] PM filtered out - not for me');
              }
              break;

            case 'privateMessagesHistory':
              if (data.messages) {
                setPrivateMessages((prev) => {
                  // Merge with existing, dedup by id
                  const existingIds = new Set(prev.map((m) => m.id));
                  const newMsgs = data.messages.filter((m: PrivateMessage) => !existingIds.has(m.id));
                  return [...prev, ...newMsgs]
                    .sort((a, b) => a.timestamp - b.timestamp)
                    .slice(-200);
                });
              }
              break;
          }
        } catch (e) {
          // ignore parse errors
        }
      };

      ws.onclose = () => {
        debugLog('[PartyKit] Disconnected');
        setIsConnected(false);
        wsRef.current = null;

        const delay = reconnectDelayRef.current;
        reconnectTimerRef.current = setTimeout(() => {
          reconnectDelayRef.current = Math.min(delay * 2, 30000);
          connect(userIdRef.current, '');
        }, delay);
      };

      ws.onerror = () => {
        // onclose will fire after onerror
      };
    } catch (err) {
      console.error('[PartyKit] Connection error:', err);
    }
  }, [clearReconnect]);

  const disconnect = useCallback(() => {
    clearReconnect();
    reconnectDelayRef.current = 30000;
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConnected(false);
  }, [clearReconnect]);

  const send = useCallback((data: object) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    }
  }, []);

  const sendOnline = useCallback((userId: string, nickname: string, activity: OnlineUser['activity']) => {
    lastOnlineRef.current = { userId, nickname, activity };
    const data = {
      type: 'online',
      payload: { id: userId, nickname, activity, startedAt: Date.now() },
    };
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    } else {
      pendingOnlineRef.current = { userId, nickname, activity };
    }
  }, []);

	  const sendOffline = useCallback((userId: string) => {
	    lastOnlineRef.current = null;
	    pendingOnlineRef.current = null;
	    send({ type: 'offline', userId });
	  }, [send]);

  const sendChat = useCallback((userId: string, nickname: string, text: string) => {
    send({ type: 'chat', payload: { userId, nickname, text } });
  }, [send]);

  const updateNickname = useCallback((userId: string, nickname: string) => {
    send({ type: 'updateNickname', userId, nickname });
  }, [send]);

  const shareStats = useCallback((stats: SharedStats) => {
    send({ type: 'shareStats', payload: stats });
  }, [send]);

  const getStats = useCallback((userId: string) => {
    send({ type: 'getStats', userId });
  }, [send]);

  const sendFriendRequest = useCallback((fromUserId: string, fromNickname: string, toUserId: string) => {
    send({ type: 'friendRequest', payload: { fromUserId, fromNickname, toUserId } });
  }, [send]);

	  const respondToFriendRequest = useCallback((requestId: string, fromUserId: string, toUserId: string, accept: boolean) => {
	    const status = accept ? 'accepted' : 'rejected';
	    send({ type: 'friendResponse', payload: { requestId, fromUserId, toUserId, status } });
	    setFriendRequests((prev) => prev.filter((r) => r.id !== requestId));
	  }, [send]);

	  const requestFriends = useCallback((userId: string) => {
	    send({ type: 'getFriends', userId });
	  }, [send]);

  const publishLeaderboardStats = useCallback((entry: LeaderboardEntry) => {
    send({ type: 'publish', payload: entry });
  }, [send]);

  const requestLeaderboard = useCallback((category: 'fasting' | 'meditation', period: 'weekly' | 'monthly' | 'yearly') => {
    send({ type: 'getLeaderboard', category, period });
  }, [send]);

  const sendPrivateMessage = useCallback((fromUserId: string, fromNickname: string, toUserId: string, toNickname: string, text: string) => {
    debugLog('[PartyKit] Sending PM from:', fromUserId, 'to:', toUserId, 'wsState:', wsRef.current?.readyState);
    send({ type: 'privateMessage', payload: { fromUserId, fromNickname, toUserId, toNickname, text } });
  }, [send]);

  const getPrivateMessages = useCallback((fromUserId: string, toUserId: string) => {
    send({ type: 'getPrivateMessages', fromUserId, toUserId });
  }, [send]);

  const markMessagesAsRead = useCallback((withUserId: string) => {
    privateMessages.forEach((m) => {
      if (m.fromUserId === withUserId || m.toUserId === withUserId) {
        readMessageIdsRef.current.add(m.id);
      }
    });
    setPrivateMessages((prev) => [...prev]); // trigger re-render
  }, [privateMessages]);

  const getUnreadMessages = useCallback((): PrivateMessage[] => {
    return privateMessages.filter(
      (m) => m.toUserId === userIdRef.current && !readMessageIdsRef.current.has(m.id)
    );
  }, [privateMessages]);

  useEffect(() => {
    const handleAppState = (nextState: string) => {
      if (nextState === 'background') {
        // Don't send offline - user is still meditating/fasting
        // Just close the WebSocket silently to save battery
        if (wsRef.current) {
          wsRef.current.close();
          wsRef.current = null;
          setIsConnected(false);
        }
      } else if (nextState === 'active') {
        // Reconnect and re-send online status automatically
        if (userIdRef.current && !wsRef.current) {
          reconnectDelayRef.current = 1000;
          connect(userIdRef.current, '');
        }
      }
    };

    const sub = AppState.addEventListener('change', handleAppState);
    return () => sub.remove();
  }, [connect, send]);

  // Save private messages to local storage when they change
  useEffect(() => {
    if (privateMessages.length > 0) {
      AsyncStorage.setItem('@guowu_private_messages', JSON.stringify(privateMessages.slice(-200))).catch(() => {});
    }
  }, [privateMessages]);

  useEffect(() => {
    return () => {
      clearReconnect();
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [clearReconnect]);

  return {
    isConnected,
    onlineUsers,
    onlineCount,
    chatMessages,
    friendRequests,
	    leaderboardData,
	    privateMessages,
	    remoteFriends,
	    totalParticipants,
    connect,
    disconnect,
    sendOnline,
    sendOffline,
    sendChat,
    updateNickname,
    shareStats,
    getStats,
	    sendFriendRequest,
	    respondToFriendRequest,
	    requestFriends,
    publishLeaderboardStats,
    requestLeaderboard,
    sendPrivateMessage,
    getPrivateMessages,
    markMessagesAsRead,
    getUnreadMessages,
  };
}
