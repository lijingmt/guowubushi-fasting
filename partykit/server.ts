/**
 * PartyKit Server for Fasting App
 * Uses Party.Server class API with correct parameter order
 */
import type * as Party from "partykit/server";

interface LeaderboardEntry {
  userId: string;
  nickname: string;
  streak: number;
  completedDays: number;
  totalMerit: number;
  lastUpdate: number;
  rank?: number;
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

interface ServerState {
  leaderboard: Record<string, LeaderboardEntry>;
  onlineUsers: Record<string, OnlineUser>;
  chatMessages: ChatMessage[];
  userNicknames: Record<string, string>;
  pendingFriendRequests: Record<string, FriendRequest[]>;
  userStats: Record<string, SharedStats>;
}

export default class FastingServer implements Party.Server {
  state: ServerState = {
    leaderboard: {},
    onlineUsers: {},
    chatMessages: [],
    userNicknames: {},
    pendingFriendRequests: {},
    userStats: {},
  };

  constructor(readonly room: Party.Room) {}

  async onConnect(connection: Party.Connection, ctx: Party.ConnectionContext) {
    console.log("[PartyKit] Client connected:", connection.id);

    connection.send(
      JSON.stringify({
        type: "init",
        leaderboard: this.getTop1000(),
        onlineCount: Object.keys(this.state.onlineUsers).length,
        onlineUsers: Object.values(this.state.onlineUsers),
        chatHistory: this.state.chatMessages.slice(-50),
      })
    );
  }

  // NOTE: message comes FIRST, sender comes SECOND
  async onMessage(message: string | ArrayBuffer, sender: Party.Connection) {
    try {
      const data = JSON.parse(typeof message === "string" ? message : new TextDecoder().decode(message));

      switch (data.type) {
        case "publish":
          this.state.leaderboard[data.payload.userId] = data.payload;
          if (data.payload.nickname) {
            this.state.userNicknames[data.payload.userId] = data.payload.nickname;
          }
          this.broadcastAll(JSON.stringify({ type: "leaderboardUpdate", payload: this.getTop1000() }));
          break;

        case "getLeaderboard":
          sender.send(JSON.stringify({ type: "leaderboardUpdate", payload: this.getTop1000() }));
          break;

        case "removeUser":
          delete this.state.leaderboard[data.userId];
          this.broadcastAll(JSON.stringify({ type: "leaderboardUpdate", payload: this.getTop1000() }));
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
          this.broadcastAll(JSON.stringify({
            type: "friendRequestResolved",
            requestId: data.payload.requestId,
            fromUserId: data.payload.fromUserId,
            toUserId: data.payload.toUserId,
            status: data.payload.status,
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
    // Remove user by connection id
    for (const [userId, user] of Object.entries(this.state.onlineUsers)) {
      // We don't have a direct mapping, so just check all
    }
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

  getTop1000(): LeaderboardEntry[] {
    return Object.values(this.state.leaderboard)
      .sort((a, b) => b.streak - a.streak || b.completedDays - a.completedDays)
      .slice(0, 1000)
      .map((user, index) => ({ ...user, rank: index + 1 }));
  }

  broadcastAll(message: string) {
    // broadcast without exclude = sends to ALL connections
    this.room.broadcast(message);
  }
}
