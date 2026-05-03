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

interface ServerState {
  leaderboard: Record<string, LeaderboardEntry>;
  onlineUsers: Record<string, OnlineUser>;
  chatMessages: ChatMessage[];
  userNicknames: Record<string, string>;
  pendingFriendRequests: Record<string, FriendRequest[]>;
  userStats: Record<string, SharedStats>;
  friendPairs: Set<string>;
  privateMessages: Record<string, PrivateMessage[]>;
}

type LeaderboardCategory = "fasting" | "meditation";
type LeaderboardPeriod = "weekly" | "monthly" | "yearly";

export default class FastingServer implements Party.Server {
  state: ServerState = {
    leaderboard: {},
    onlineUsers: {},
    chatMessages: [],
    userNicknames: {},
    pendingFriendRequests: {},
    userStats: {},
    friendPairs: new Set(),
    privateMessages: {},
  };

  constructor(readonly room: Party.Room) {}

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
        case "publish":
          this.state.leaderboard[data.payload.userId] = data.payload;
          if (data.payload.nickname) {
            this.state.userNicknames[data.payload.userId] = data.payload.nickname;
          }
          // Broadcast updated leaderboards to all clients
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
          break;

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
          break;

        case "online":
          this.state.onlineUsers[data.payload.id] = data.payload;
          if (data.payload.nickname) {
            this.state.userNicknames[data.payload.id] = data.payload.nickname;
          }
          this.broadcastAll(JSON.stringify({
            type: "onlineUpdate",
            onlineCount: Object.keys(this.state.onlineUsers).length,
            onlineUsers: Object.values(this.state.onlineUsers),
          }));
          break;

        case "offline":
          delete this.state.onlineUsers[data.userId];
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
          this.broadcastAll(JSON.stringify({ type: "friendRequestReceived", request: req }));
          break;
        }

        case "friendResponse": {
          const requests = this.state.pendingFriendRequests[data.payload.fromUserId] || [];
          const found = requests.find((r) => r.id === data.payload.requestId);
          if (found) {
            found.status = data.payload.status;
          }
          if (data.payload.status === "accepted") {
            const pairKey = [data.payload.fromUserId, data.payload.toUserId].sort().join(":");
            this.state.friendPairs.add(pairKey);
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

          this.broadcastAll(JSON.stringify({ type: "privateMessageReceived", message: pm }));
          break;
        }
      }
    } catch (err) {
      console.error("[PartyKit] Message error:", err);
    }
  }

  async onClose(connection: Party.Connection) {
    console.log("[PartyKit] Client disconnected:", connection.id);
    this.broadcastAll(JSON.stringify({
      type: "onlineUpdate",
      onlineCount: Object.keys(this.state.onlineUsers).length,
      onlineUsers: Object.values(this.state.onlineUsers),
    }));
  }

  async onRequest(req: Party.Request) {
    if (req.method === "GET") {
      return new Response(
        JSON.stringify({
          status: "ok",
          onlineCount: Object.keys(this.state.onlineUsers).length,
          leaderboardSize: Object.keys(this.state.leaderboard).length,
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

  broadcastAll(message: string) {
    this.room.broadcast(message);
  }
}
