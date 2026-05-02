import { useState, useRef, useCallback, useEffect } from 'react';
import { AppState } from 'react-native';
import type {
  OnlineUser,
  ChatMessage,
  FriendRequest,
  SharedStats,
  LeaderboardEntry,
  PrivateMessage,
} from '../types';

const PARTYKIT_URL = 'wss://partykit.guowubushi.net/party/meditation-room';

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
  publishLeaderboardStats: (entry: LeaderboardEntry) => void;
  requestLeaderboard: (category: 'fasting' | 'meditation', period: 'weekly' | 'monthly' | 'yearly') => void;
  sendPrivateMessage: (fromUserId: string, fromNickname: string, toUserId: string, toNickname: string, text: string) => void;
  getPrivateMessages: (fromUserId: string, toUserId: string) => void;
}

export function usePartyKit(): UsePartyKitReturn {
  const wsRef = useRef<WebSocket | null>(null);
  const userIdRef = useRef<string>('');
  const pendingOnlineRef = useRef<{ userId: string; nickname: string; activity: OnlineUser['activity'] } | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectDelayRef = useRef(1000);

  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [onlineCount, setOnlineCount] = useState(0);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardData>(emptyLeaderboard);
  const [privateMessages, setPrivateMessages] = useState<PrivateMessage[]>([]);
  const [totalParticipants, setTotalParticipants] = useState(0);

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
        console.log('[PartyKit] Connected');
        setIsConnected(true);
        reconnectDelayRef.current = 1000;

        if (pendingOnlineRef.current) {
          const p = pendingOnlineRef.current;
          ws.send(JSON.stringify({
            type: 'online',
            payload: { id: p.userId, nickname: p.nickname, activity: p.activity, startedAt: Date.now() },
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
              setFriendRequests((prev) => {
                if (prev.find((r) => r.id === data.request.id)) return prev;
                return [...prev, data.request];
              });
              break;

            case 'userStats':
              break;

            case 'leaderboardUpdate':
              if (data.category && data.period) {
                setLeaderboardData((prev) => ({
                  ...prev,
                  [data.category]: {
                    ...prev[data.category as 'fasting' | 'meditation'],
                    [data.period]: data.entries || [],
                  },
                }));
                if (data.totalParticipants !== undefined) {
                  setTotalParticipants(data.totalParticipants);
                }
              }
              break;

            case 'privateMessageReceived':
              setPrivateMessages((prev) => {
                const next = [...prev, data.message];
                return next.length > 200 ? next.slice(-200) : next;
              });
              break;

            case 'privateMessagesHistory':
              if (data.messages) {
                setPrivateMessages((prev) => {
                  // Merge with existing, dedup by id
                  const existingIds = new Set(prev.map((m) => m.id));
                  const newMsgs = data.messages.filter((m: PrivateMessage) => !existingIds.has(m.id));
                  return [...prev, ...newMsgs];
                });
              }
              break;
          }
        } catch (e) {
          // ignore parse errors
        }
      };

      ws.onclose = () => {
        console.log('[PartyKit] Disconnected');
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

  const publishLeaderboardStats = useCallback((entry: LeaderboardEntry) => {
    send({ type: 'publish', payload: entry });
  }, [send]);

  const requestLeaderboard = useCallback((category: 'fasting' | 'meditation', period: 'weekly' | 'monthly' | 'yearly') => {
    send({ type: 'getLeaderboard', category, period });
  }, [send]);

  const sendPrivateMessage = useCallback((fromUserId: string, fromNickname: string, toUserId: string, toNickname: string, text: string) => {
    send({ type: 'privateMessage', payload: { fromUserId, fromNickname, toUserId, toNickname, text } });
  }, [send]);

  const getPrivateMessages = useCallback((fromUserId: string, toUserId: string) => {
    send({ type: 'getPrivateMessages', fromUserId, toUserId });
  }, [send]);

  useEffect(() => {
    const handleAppState = (nextState: string) => {
      if (nextState === 'background') {
        if (wsRef.current) {
          send({ type: 'offline', userId: userIdRef.current });
          wsRef.current.close();
          wsRef.current = null;
          setIsConnected(false);
        }
      } else if (nextState === 'active') {
        if (userIdRef.current && !wsRef.current) {
          reconnectDelayRef.current = 1000;
          connect(userIdRef.current, '');
        }
      }
    };

    const sub = AppState.addEventListener('change', handleAppState);
    return () => sub.remove();
  }, [connect, send]);

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
    publishLeaderboardStats,
    requestLeaderboard,
    sendPrivateMessage,
    getPrivateMessages,
  };
}
