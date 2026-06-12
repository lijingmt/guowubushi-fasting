/**
 * PartyKit Server for Fasting App
 * Uses Party.Server class API with correct parameter order
 */
import type * as Party from "partykit/server";

interface LeaderboardEntry {
  userId: string;
  nickname: string;
  rank?: number;
  lastUpdate: number;
  currentStreak: number;
  fastingDaysThisWeek: number;
  fastingDaysThisMonth: number;
  fastingDaysThisYear: number;
  meditationMinutesThisWeek: number;
  meditationMinutesThisMonth: number;
  meditationMinutesThisYear: number;
  meditationDaysThisMonth: number;
  meditationDaysThisYear: number;
  sessionCountThisWeek: number;
}

interface OnlineUser {
  id: string;
  nickname: string;
  activity: "meditation" | "fasting" | "checkin";
  startedAt: number;
}

interface ChatMessage {
  id: string;
  userId: string;
  nickname: string;
  text: string;
  timestamp: number;
}

interface FriendRequest {
  id: string;
  fromUserId: string;
  fromNickname: string;
  toUserId: string;
  status: "pending" | "accepted" | "rejected";
  timestamp: number;
}

interface SharedStats {
  userId: string;
  nickname: string;
  streak: number;
  totalMeditationMinutes: number;
  totalMerit: number;
  meditationSessionCount: number;
  longestMeditationSession: number;
  totalMeditationDays: number;
}

interface PrivateMessage {
  id: string;
  fromUserId: string;
  fromNickname: string;
  toUserId: string;
  toNickname: string;
  text: string;
  timestamp: number;
}

interface FriendPair {
  users: [string, string];
  addedAt: number;
}

interface ServerState {
  leaderboard: Record<string, LeaderboardEntry>;
  onlineUsers: Record<string, OnlineUser>;
  chatMessages: ChatMessage[];
  userNicknames: Record<string, string>;
  pendingFriendRequests: Record<string, FriendRequest[]>;
  userStats: Record<string, SharedStats>;
  friendPairs: Record<string, FriendPair>;
  privateMessages: Record<string, PrivateMessage[]>;
  connectionUsers: Record<string, string>;
}

type LeaderboardCategory = "fasting" | "meditation";
type LeaderboardPeriod = "weekly" | "monthly" | "yearly";
const LEADERBOARD_KEY_PREFIX = "leaderboard:";
const FRIEND_PAIR_KEY_PREFIX = "friendPair:";
const FRIEND_REQUEST_KEY_PREFIX = "friendRequest:";
const PRIVATE_MESSAGE_KEY_PREFIX = "privateMessages:";
const MAX_PRIVATE_MESSAGES_PER_THREAD = 200;
const ONLINE_STALE_MS = 5 * 60 * 1000;

export default class FastingServer implements Party.Server {
  state: ServerState = {
    leaderboard: {},
    onlineUsers: {},
    chatMessages: [],
    userNicknames: {},
    pendingFriendRequests: {},
    userStats: {},
    friendPairs: {},
    privateMessages: {},
    connectionUsers: {},
  };

  constructor(readonly room: Party.Room) {}

  async onStart() {
    const items = await this.room.storage.list();
    for (const [key, value] of items) {
      if (key.startsWith(LEADERBOARD_KEY_PREFIX)) {
        const entry = value as LeaderboardEntry;
        if (!entry || !entry.userId) continue;

        this.state.leaderboard[entry.userId] = entry;
        if (entry.nickname) {
          this.state.userNicknames[entry.userId] = entry.nickname;
        }
        continue;
      }

      if (key.startsWith(FRIEND_PAIR_KEY_PREFIX)) {
        const pair = value as FriendPair;
        if (!pair || !Array.isArray(pair.users) || pair.users.length !== 2) continue;
        this.state.friendPairs[this.getPairKey(pair.users[0], pair.users[1])] = pair;
        continue;
      }

      if (key.startsWith(FRIEND_REQUEST_KEY_PREFIX)) {
        const request = value as FriendRequest;
        if (!request || !request.id || !request.toUserId) continue;
        if (!this.state.pendingFriendRequests[request.toUserId]) {
          this.state.pendingFriendRequests[request.toUserId] = [];
        }
        this.state.pendingFriendRequests[request.toUserId].push(request);
        if (request.fromNickname) {
          this.state.userNicknames[request.fromUserId] = request.fromNickname;
        }
        continue;
      }

      if (key.startsWith(PRIVATE_MESSAGE_KEY_PREFIX)) {
        const messages = value as PrivateMessage[];
        if (!Array.isArray(messages)) continue;
        const pairKey = key.substring(PRIVATE_MESSAGE_KEY_PREFIX.length);
        this.state.privateMessages[pairKey] = messages.slice(-MAX_PRIVATE_MESSAGES_PER_THREAD);
      }
    }
  }

  async onConnect(connection: Party.Connection, ctx: Party.ConnectionContext) {
    console.log("[PartyKit] Client connected:", connection.id);

    connection.send(
      JSON.stringify({
        type: "init",
        leaderboard: this.getLeaderboard("fasting", "weekly"),
        onlineCount: Object.keys(this.state.onlineUsers).length,
        onlineUsers: Object.values(this.state.onlineUsers),
        chatHistory: this.state.chatMessages.slice(-50),
      })
    );
  }

  async onMessage(message: string | ArrayBuffer, sender: Party.Connection) {
    try {
      const data = JSON.parse(typeof message === "string" ? message : new TextDecoder().decode(message));

      switch (data.type) {
        case "publish": {
          const entry = this.normalizeLeaderboardEntry(data.payload);
          if (!entry) break;

          this.state.leaderboard[entry.userId] = entry;
          if (entry.nickname) {
            this.state.userNicknames[entry.userId] = entry.nickname;
          }
          await this.room.storage.put(`${LEADERBOARD_KEY_PREFIX}${entry.userId}`, entry);

          // Broadcast updated leaderboards to all clients
          this.broadcastLeaderboards();
          break;
        }

        case "getLeaderboard": {
          const category: LeaderboardCategory = data.category || "fasting";
          const period: LeaderboardPeriod = data.period || "weekly";
          const entries = this.getLeaderboard(category, period);
          sender.send(JSON.stringify({
            type: "leaderboardUpdate",
            category,
            period,
            entries,
            totalParticipants: Object.keys(this.state.leaderboard).length,
          }));
          break;
        }

        case "removeUser":
          delete this.state.leaderboard[data.userId];
          await this.room.storage.delete(`${LEADERBOARD_KEY_PREFIX}${data.userId}`);
          break;

        case "online":
          this.cleanupStaleOnlineUsers();
          this.state.onlineUsers[data.payload.id] = data.payload;
          this.state.connectionUsers[sender.id] = data.payload.id;
          if (data.payload.nickname) {
            this.state.userNicknames[data.payload.id] = data.payload.nickname;
          }
          this.sendPendingFriendRequests(sender, data.payload.id);
          this.broadcastAll(JSON.stringify({
            type: "onlineUpdate",
            onlineCount: Object.keys(this.state.onlineUsers).length,
            onlineUsers: Object.values(this.state.onlineUsers),
          }));
          break;

        case "offline":
          delete this.state.onlineUsers[data.userId];
          delete this.state.connectionUsers[sender.id];
          this.broadcastAll(JSON.stringify({
            type: "onlineUpdate",
            onlineCount: Object.keys(this.state.onlineUsers).length,
            onlineUsers: Object.values(this.state.onlineUsers),
          }));
          break;

        case "chat": {
          const msg: ChatMessage = {
            id: Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
            userId: data.payload.userId,
            nickname: data.payload.nickname || "Anonymous",
            text: data.payload.text.substring(0, 200),
            timestamp: Date.now(),
          };
          this.state.chatMessages.push(msg);
          if (this.state.chatMessages.length > 100) {
            this.state.chatMessages = this.state.chatMessages.slice(-100);
          }
          this.broadcastAll(JSON.stringify({ type: "chatMessage", message: msg }));
          break;
        }

        case "getChatHistory":
          sender.send(JSON.stringify({ type: "chatHistory", messages: this.state.chatMessages.slice(-50) }));
          break;

        case "updateNickname":
          this.state.userNicknames[data.userId] = data.nickname;
          if (this.state.onlineUsers[data.userId]) {
            this.state.onlineUsers[data.userId].nickname = data.nickname;
            this.broadcastAll(JSON.stringify({
              type: "onlineUpdate",
              onlineCount: Object.keys(this.state.onlineUsers).length,
              onlineUsers: Object.values(this.state.onlineUsers),
            }));
          }
          this.broadcastAll(JSON.stringify({ type: "nicknameUpdate", userId: data.userId, nickname: data.nickname }));
          break;

        case "shareStats":
          this.state.userStats[data.payload.userId] = data.payload;
          break;

        case "getStats": {
          const stats = this.state.userStats[data.userId];
          if (stats) {
            sender.send(JSON.stringify({ type: "userStats", stats }));
          }
          break;
        }

        case "friendRequest": {
          const req: FriendRequest = {
            id: Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
            fromUserId: data.payload.fromUserId,
            fromNickname: data.payload.fromNickname,
            toUserId: data.payload.toUserId,
            status: "pending",
            timestamp: Date.now(),
          };
          if (!this.state.pendingFriendRequests[data.payload.toUserId]) {
            this.state.pendingFriendRequests[data.payload.toUserId] = [];
          }
          this.state.pendingFriendRequests[data.payload.toUserId].push(req);
          if (req.fromNickname) {
            this.state.userNicknames[req.fromUserId] = req.fromNickname;
          }
          await this.room.storage.put(`${FRIEND_REQUEST_KEY_PREFIX}${req.toUserId}:${req.id}`, req);
          this.broadcastAll(JSON.stringify({ type: "friendRequestReceived", request: req }));
          break;
        }

        case "friendResponse": {
          const requests = this.state.pendingFriendRequests[data.payload.toUserId] || [];
          const found = requests.find((r) => r.id === data.payload.requestId);
          if (found) {
            found.status = data.payload.status;
            await this.room.storage.put(`${FRIEND_REQUEST_KEY_PREFIX}${found.toUserId}:${found.id}`, found);
          }
          if (data.payload.status === "accepted") {
            const pairKey = this.getPairKey(data.payload.fromUserId, data.payload.toUserId);
            const pair: FriendPair = {
              users: [data.payload.fromUserId, data.payload.toUserId].sort() as [string, string],
              addedAt: Date.now(),
            };
            this.state.friendPairs[pairKey] = pair;
            await this.room.storage.put(`${FRIEND_PAIR_KEY_PREFIX}${pairKey}`, pair);
            this.broadcastAll(JSON.stringify({
              type: "friendshipUpdate",
              users: pair.users,
            }));
          }
          this.broadcastAll(JSON.stringify({
            type: "friendRequestResolved",
            requestId: data.payload.requestId,
            fromUserId: data.payload.fromUserId,
            toUserId: data.payload.toUserId,
            status: data.payload.status,
          }));
          break;
        }

        case "getFriends": {
          const userId = typeof data.userId === "string" ? data.userId : this.state.connectionUsers[sender.id];
          if (!userId) break;
          sender.send(JSON.stringify({
            type: "friendsList",
            friends: this.getFriendsForUser(userId),
          }));
          break;
        }

        case "privateMessage": {
          const fromUserId = data.payload.fromUserId;
          const toUserId = data.payload.toUserId;

          console.log("[PartyKit] PM from:", fromUserId, "to:", toUserId, "connections:", this.room.connections.size);

          const pm: PrivateMessage = {
            id: Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
            fromUserId,
            fromNickname: data.payload.fromNickname || "Anonymous",
            toUserId,
            toNickname: data.payload.toNickname || "Anonymous",
            text: data.payload.text.substring(0, 200),
            timestamp: Date.now(),
          };

          const pairKey = this.getPairKey(fromUserId, toUserId);
          const messages = this.state.privateMessages[pairKey] || [];
          const nextMessages = [...messages, pm].slice(-MAX_PRIVATE_MESSAGES_PER_THREAD);
          this.state.privateMessages[pairKey] = nextMessages;
          await this.room.storage.put(`${PRIVATE_MESSAGE_KEY_PREFIX}${pairKey}`, nextMessages);

          this.broadcastAll(JSON.stringify({ type: "privateMessageReceived", message: pm }));
          break;
        }

        case "getPrivateMessages": {
          const messages = this.getPrivateMessagesForRequest(data, sender);
          sender.send(JSON.stringify({
            type: "privateMessagesHistory",
            messages,
          }));
          break;
        }
      }
    } catch (err) {
      console.error("[PartyKit] Message error:", err);
    }
  }

  async onClose(connection: Party.Connection) {
    console.log("[PartyKit] Client disconnected:", connection.id);
    const userId = this.state.connectionUsers[connection.id];
    delete this.state.connectionUsers[connection.id];
    if (userId && !this.hasActiveConnectionForUser(userId)) {
      delete this.state.onlineUsers[userId];
    }
    this.broadcastAll(JSON.stringify({
      type: "onlineUpdate",
      onlineCount: Object.keys(this.state.onlineUsers).length,
      onlineUsers: Object.values(this.state.onlineUsers),
    }));
  }

  async onRequest(req: Party.Request) {
    if (req.method === "GET") {
      this.cleanupStaleOnlineUsers();
      return new Response(
        JSON.stringify({
          status: "ok",
          onlineCount: Object.keys(this.state.onlineUsers).length,
          leaderboardSize: Object.keys(this.state.leaderboard).length,
          roomId: this.room.id,
          chatMessages: this.state.chatMessages.length,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }
    return new Response("Method not allowed", { status: 405 });
  }

  getLeaderboard(category: LeaderboardCategory, period: LeaderboardPeriod): LeaderboardEntry[] {
    const entries = Object.values(this.state.leaderboard);

    const sorted = entries.sort((a, b) => {
      const { primary: aPrimary, secondary: aSecondary } = this.getSortValues(a, category, period);
      const { primary: bPrimary, secondary: bSecondary } = this.getSortValues(b, category, period);
      if (bPrimary !== aPrimary) return bPrimary - aPrimary;
      return bSecondary - aSecondary;
    });

    return sorted.slice(0, 100).map((entry, index) => ({ ...entry, rank: index + 1 }));
  }

  getSortValues(entry: LeaderboardEntry, category: LeaderboardCategory, period: LeaderboardPeriod): { primary: number; secondary: number } {
    if (category === "fasting") {
      switch (period) {
        case "weekly": return { primary: entry.fastingDaysThisWeek, secondary: entry.currentStreak };
        case "monthly": return { primary: entry.fastingDaysThisMonth, secondary: entry.currentStreak };
        case "yearly": return { primary: entry.fastingDaysThisYear, secondary: entry.currentStreak };
      }
    } else {
      switch (period) {
        case "weekly": return { primary: entry.meditationMinutesThisWeek, secondary: entry.sessionCountThisWeek };
        case "monthly": return { primary: entry.meditationMinutesThisMonth, secondary: entry.meditationDaysThisMonth };
        case "yearly": return { primary: entry.meditationMinutesThisYear, secondary: entry.meditationDaysThisYear };
      }
    }
  }

  normalizeLeaderboardEntry(payload: unknown): LeaderboardEntry | null {
    if (!payload || typeof payload !== "object") return null;
    const raw = payload as Partial<LeaderboardEntry>;
    if (!raw.userId || typeof raw.userId !== "string") return null;

    return {
      userId: raw.userId.substring(0, 100),
      nickname: typeof raw.nickname === "string" ? raw.nickname.substring(0, 40) : "",
      lastUpdate: this.toNumber(raw.lastUpdate, Date.now()),
      currentStreak: this.toNumber(raw.currentStreak),
      fastingDaysThisWeek: this.toNumber(raw.fastingDaysThisWeek),
      fastingDaysThisMonth: this.toNumber(raw.fastingDaysThisMonth),
      fastingDaysThisYear: this.toNumber(raw.fastingDaysThisYear),
      meditationMinutesThisWeek: this.toNumber(raw.meditationMinutesThisWeek),
      meditationMinutesThisMonth: this.toNumber(raw.meditationMinutesThisMonth),
      meditationMinutesThisYear: this.toNumber(raw.meditationMinutesThisYear),
      meditationDaysThisMonth: this.toNumber(raw.meditationDaysThisMonth),
      meditationDaysThisYear: this.toNumber(raw.meditationDaysThisYear),
      sessionCountThisWeek: this.toNumber(raw.sessionCountThisWeek),
    };
  }

  toNumber(value: unknown, fallback = 0): number {
    return typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.floor(value)) : fallback;
  }

  broadcastLeaderboards() {
    for (const cat of ["fasting", "meditation"] as LeaderboardCategory[]) {
      for (const per of ["weekly", "monthly", "yearly"] as LeaderboardPeriod[]) {
        const entries = this.getLeaderboard(cat, per);
        this.broadcastAll(JSON.stringify({
          type: "leaderboardUpdate",
          category: cat,
          period: per,
          entries,
          totalParticipants: Object.keys(this.state.leaderboard).length,
        }));
      }
    }
  }

  broadcastAll(message: string) {
    this.room.broadcast(message);
  }

  getPairKey(userA: string, userB: string): string {
    return [userA, userB].sort().join(":");
  }

  hasActiveConnectionForUser(userId: string): boolean {
    return Object.values(this.state.connectionUsers).includes(userId);
  }

  cleanupStaleOnlineUsers() {
    const now = Date.now();
    let changed = false;
    for (const [userId, user] of Object.entries(this.state.onlineUsers)) {
      if (now - user.startedAt > ONLINE_STALE_MS && !this.hasActiveConnectionForUser(userId)) {
        delete this.state.onlineUsers[userId];
        changed = true;
      }
    }
    if (changed) {
      this.broadcastAll(JSON.stringify({
        type: "onlineUpdate",
        onlineCount: Object.keys(this.state.onlineUsers).length,
        onlineUsers: Object.values(this.state.onlineUsers),
      }));
    }
  }

  sendPendingFriendRequests(connection: Party.Connection, userId: string) {
    const requests = (this.state.pendingFriendRequests[userId] || []).filter((r) => r.status === "pending");
    for (const request of requests) {
      connection.send(JSON.stringify({ type: "friendRequestReceived", request }));
    }
  }

  getFriendsForUser(userId: string) {
    return Object.values(this.state.friendPairs)
      .filter((pair) => pair.users.includes(userId))
      .map((pair) => {
        const friendId = pair.users[0] === userId ? pair.users[1] : pair.users[0];
        return {
          userId: friendId,
          nickname: this.state.userNicknames[friendId] || "",
          addedAt: pair.addedAt,
        };
      });
  }

  getPrivateMessagesForRequest(data: any, sender: Party.Connection): PrivateMessage[] {
    const userId = typeof data.userId === "string" ? data.userId : this.state.connectionUsers[sender.id];
    const fromUserId = typeof data.fromUserId === "string" ? data.fromUserId : userId;
    const toUserId = typeof data.toUserId === "string" ? data.toUserId : "";

    if (fromUserId && toUserId) {
      return (this.state.privateMessages[this.getPairKey(fromUserId, toUserId)] || []).slice(-MAX_PRIVATE_MESSAGES_PER_THREAD);
    }

    if (!userId) return [];
    return Object.entries(this.state.privateMessages)
      .filter(([pairKey]) => pairKey.split(":").includes(userId))
      .flatMap(([, messages]) => messages)
      .sort((a, b) => a.timestamp - b.timestamp)
      .slice(-MAX_PRIVATE_MESSAGES_PER_THREAD);
  }
}
