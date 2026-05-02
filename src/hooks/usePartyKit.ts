import { useState, useRef, useCallback, useEffect } from 'react';
import { AppState } from 'react-native';
import type {
  OnlineUser,
  ChatMessage,
  FriendRequest,
  SharedStats,
} from '../types';

const PARTYKIT_URL = 'wss://partykit.guowubushi.net/party/meditation-room';

interface UsePartyKitReturn {
  isConnected: boolean;
  onlineUsers: OnlineUser[];
  onlineCount: number;
  chatMessages: ChatMessage[];
  friendRequests: FriendRequest[];
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

        // Send pending online message if any
        if (pendingOnlineRef.current) {
          const p = pendingOnlineRef.current;
          ws.send(JSON.stringify({
            type: 'online',
            payload: { id: p.userId, nickname: p.nickname, activity: p.activity, startedAt: Date.now() },
          }));
          pendingOnlineRef.current = null;
        }
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
              // Handled by caller via callback if needed
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

        // Auto-reconnect with backoff
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
    reconnectDelayRef.current = 30000; // prevent quick reconnect after manual disconnect
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
      // Save for when connection opens
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

    // Remove from local pending list
    setFriendRequests((prev) => prev.filter((r) => r.id !== requestId));
  }, [send]);

  // AppState handling: disconnect on background, reconnect on foreground
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

  // Cleanup on unmount
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
  };
}
