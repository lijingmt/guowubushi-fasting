import { useState, useRef, useCallback, useEffect } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
  friendRequests: FriendRequest[];
  leaderboardData: LeaderboardData;
  friendEncouragements: FriendEncouragement[];
  friendStatsMap: Record<string, SharedStats>;
  remoteFriends: Friend[];
  totalParticipants: number;
  silentRoomCounts: SilentRoomCounts;
  silentRoomTodayCounts: SilentRoomCounts;
  recentSilentGestures: SilentGestureEvent[];
  buddyChallenges: BuddyChallenge[];
  pendingRepairGifts: RepairCardGift[];
  connect: (userId: string, nickname: string) => void;
  disconnect: () => void;
  sendOnline: (userId: string, nickname: string, activity: OnlineUser['activity']) => void;
  sendOffline: (userId: string) => void;
  updateNickname: (userId: string, nickname: string) => void;
  shareStats: (stats: SharedStats) => void;
  getStats: (userId: string) => void;
  sendFriendRequest: (fromUserId: string, fromNickname: string, toUserId: string) => void;
  respondToFriendRequest: (requestId: string, fromUserId: string, toUserId: string, accept: boolean) => void;
  requestFriends: (userId: string) => void;
  publishLeaderboardStats: (entry: LeaderboardEntry) => void;
  requestLeaderboard: (category: 'fasting' | 'meditation', period: 'weekly' | 'monthly' | 'yearly') => void;
  sendFriendEncouragement: (
    fromUserId: string,
    fromNickname: string,
    toUserId: string,
    toNickname: string,
    kind: FriendEncouragement['kind'],
    text?: string
  ) => void;
  sendSilentGesture: (userId: string, nickname: string, gesture: SilentGestureType) => void;
  startBuddyChallenge: (
    fromUserId: string,
    fromNickname: string,
    toUserId: string,
    toNickname: string,
    durationDays: 7 | 21,
    startDate: string
  ) => void;
  lightBuddyLamp: (userId: string, partnerUserId: string, date: string) => void;
  giftRepairCard: (fromUserId: string, fromNickname: string, toUserId: string) => void;
  claimRepairCardGifts: (userId: string) => void;
}

export function usePartyKit(): UsePartyKitReturn {
  const wsRef = useRef<WebSocket | null>(null);
  const userIdRef = useRef<string>('');
  const pendingOnlineRef = useRef<{ userId: string; nickname: string; activity: OnlineUser['activity'] } | null>(null);
  const lastOnlineRef = useRef<{ userId: string; nickname: string; activity: OnlineUser['activity'] } | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectDelayRef = useRef(1000);

  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [onlineCount, setOnlineCount] = useState(0);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardData>(emptyLeaderboard);
  const [friendEncouragements, setFriendEncouragements] = useState<FriendEncouragement[]>([]);
  const [friendStatsMap, setFriendStatsMap] = useState<Record<string, SharedStats>>({});
  const [remoteFriends, setRemoteFriends] = useState<Friend[]>([]);
  const [totalParticipants, setTotalParticipants] = useState(0);
  const [silentRoomCounts, setSilentRoomCounts] = useState<SilentRoomCounts>({ bow: 0, lamp: 0, bell: 0 });
  const [silentRoomTodayCounts, setSilentRoomTodayCounts] = useState<SilentRoomCounts>({ bow: 0, lamp: 0, bell: 0 });
  const [recentSilentGestures, setRecentSilentGestures] = useState<SilentGestureEvent[]>([]);
  const [buddyChallenges, setBuddyChallenges] = useState<BuddyChallenge[]>([]);
  const [pendingRepairGifts, setPendingRepairGifts] = useState<RepairCardGift[]>([]);

  // Load cached leaderboard on mount
  useEffect(() => {
    (async () => {
      try {
        const cached = await AsyncStorage.getItem('@guowu_leaderboard_cache');
        if (cached) {
          setLeaderboardData(JSON.parse(cached));
        }
        const cachedEncouragements = await AsyncStorage.getItem('@guowu_friend_encouragements');
        if (cachedEncouragements) {
          setFriendEncouragements(JSON.parse(cachedEncouragements));
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
        ws.send(JSON.stringify({ type: 'getFriendEncouragements', userId }));
        ws.send(JSON.stringify({ type: 'getBuddyState', userId }));
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          switch (data.type) {
            case 'init':
              setOnlineUsers(data.onlineUsers || []);
              setOnlineCount(data.onlineCount || 0);
              if (data.leaderboard) {
                setLeaderboardData((prev) => ({
                  ...prev,
                  fasting: { ...prev.fasting, weekly: data.leaderboard },
                }));
              }
              if (data.silentRoomCounts) {
                setSilentRoomCounts(data.silentRoomCounts);
              }
              if (data.silentRoomTodayCounts) {
                setSilentRoomTodayCounts(data.silentRoomTodayCounts);
              }
              if (Array.isArray(data.recentSilentGestures)) {
                setRecentSilentGestures(data.recentSilentGestures);
              }
              break;

            case 'onlineUpdate':
              setOnlineUsers(data.onlineUsers || []);
              setOnlineCount(data.onlineCount || 0);
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
              if (data.stats && data.stats.userId) {
                setFriendStatsMap((prev) => ({
                  ...prev,
                  [data.stats.userId]: data.stats,
                }));
              }
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

            case 'friendEncouragementReceived':
              if (
                data.encouragement &&
                (data.encouragement.toUserId === userIdRef.current || data.encouragement.fromUserId === userIdRef.current)
              ) {
                setFriendEncouragements((prev) => {
                  if (prev.find((item) => item.id === data.encouragement.id)) return prev;
                  return [data.encouragement, ...prev].slice(0, 100);
                });
              }
              break;

            case 'friendEncouragementHistory':
              if (Array.isArray(data.encouragements)) {
                setFriendEncouragements((prev) => {
                  const existingIds = new Set(prev.map((item) => item.id));
                  const next = [
                    ...data.encouragements.filter((item: FriendEncouragement) => !existingIds.has(item.id)),
                    ...prev,
                  ];
                  return next.sort((a, b) => b.timestamp - a.timestamp).slice(0, 100);
                });
              }
              break;

            case 'silentRoomUpdate':
              if (data.counts) {
                setSilentRoomCounts(data.counts);
              }
              if (data.todayCounts) {
                setSilentRoomTodayCounts(data.todayCounts);
              }
              if (Array.isArray(data.recentEvents)) {
                setRecentSilentGestures(data.recentEvents);
              }
              break;

            case 'buddyChallengesUpdate':
              if (Array.isArray(data.challenges)) {
                setBuddyChallenges(data.challenges);
              }
              break;

            case 'pendingRepairGifts':
              if (Array.isArray(data.gifts)) {
                setPendingRepairGifts(data.gifts);
              }
              break;

            case 'repairCardGiftReceived':
              if (data.gift && data.gift.toUserId === userIdRef.current) {
                setPendingRepairGifts((prev) => {
                  if (prev.some((g) => g.id === data.gift.id)) return prev;
                  return [...prev, data.gift];
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

  const sendFriendEncouragement = useCallback((
    fromUserId: string,
    fromNickname: string,
    toUserId: string,
    toNickname: string,
    kind: FriendEncouragement['kind'],
    text?: string
  ) => {
    send({ type: 'friendEncouragement', payload: { fromUserId, fromNickname, toUserId, toNickname, kind, text } });
  }, [send]);

  const sendSilentGesture = useCallback((userId: string, nickname: string, gesture: SilentGestureType) => {
    send({ type: 'silentGesture', payload: { userId, nickname, gesture } });
  }, [send]);

  const startBuddyChallenge = useCallback((
    fromUserId: string,
    fromNickname: string,
    toUserId: string,
    toNickname: string,
    durationDays: 7 | 21,
    startDate: string
  ) => {
    send({
      type: 'startBuddyChallenge',
      payload: { fromUserId, fromNickname, toUserId, toNickname, durationDays, startDate },
    });
  }, [send]);

  const lightBuddyLamp = useCallback((userId: string, partnerUserId: string, date: string) => {
    send({ type: 'lightBuddyLamp', payload: { userId, partnerUserId, date } });
  }, [send]);

  const giftRepairCard = useCallback((fromUserId: string, fromNickname: string, toUserId: string) => {
    send({ type: 'giftRepairCard', payload: { fromUserId, fromNickname, toUserId } });
  }, [send]);

  const claimRepairCardGifts = useCallback((userId: string) => {
    send({ type: 'claimRepairCardGifts', userId });
    setPendingRepairGifts([]);
  }, [send]);

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

  useEffect(() => {
    if (friendEncouragements.length > 0) {
      AsyncStorage.setItem('@guowu_friend_encouragements', JSON.stringify(friendEncouragements.slice(0, 100))).catch(() => {});
    }
  }, [friendEncouragements]);

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
    friendRequests,
    leaderboardData,
    friendEncouragements,
    friendStatsMap,
    remoteFriends,
    totalParticipants,
    silentRoomCounts,
    silentRoomTodayCounts,
    recentSilentGestures,
    buddyChallenges,
    pendingRepairGifts,
    connect,
    disconnect,
    sendOnline,
    sendOffline,
    updateNickname,
    shareStats,
    getStats,
    sendFriendRequest,
    respondToFriendRequest,
    requestFriends,
    publishLeaderboardStats,
    requestLeaderboard,
    sendFriendEncouragement,
    sendSilentGesture,
    startBuddyChallenge,
    lightBuddyLamp,
    giftRepairCard,
    claimRepairCardGifts,
  };
}
