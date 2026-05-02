/**
 * PartyKit Server for Fasting App
 * Real-time: leaderboard, online meditation, chat, friends, stats sharing
 */

import type { Party, PartyServer, Connection } from "partykit/server";

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

export default class FastingServer implements PartyServer {
  leaderboard: Record<string, LeaderboardEntry> = {};
  onlineUsers: Record<string, OnlineUser> = {};
  chatMessages: ChatMessage[] = [];
  userConnections: Record<string, Connection> = {};
  userNicknames: Record<string, string> = {};
  pendingFriendRequests: Record<string, FriendRequest[]> = {};
  userStats: Record<string, SharedStats> = {};

  constructor(readonly party: Party) {}

  async onConnect(conn: Connection) {
    console.log("[PartyKit] Client connected:", conn.id);

    const onlineList = Object.values(this.onlineUsers);
    const recentChat = this.chatMessages.slice(-50);

    conn.send(
      JSON.stringify({
        type: "init",
        leaderboard: this.getTop1000(),
        onlineCount: onlineList.length,
        onlineUsers: onlineList,
        chatHistory: recentChat,
      })
    );
  }

  async onClose(conn: Connection) {
    console.log("[PartyKit] Client disconnected:", conn.id);

    // Remove from connections
    for (const [userId, c] of Object.entries(this.userConnections)) {
      if (c.id === conn.id) {
        delete this.userConnections[userId];
        delete this.onlineUsers[userId];
        break;
      }
    }

    this.broadcastOnline();
  }

  async onMessage(conn: Connection, message: string) {
    try {
      const data = JSON.parse(message);

      switch (data.type) {
        case "publish":
          this.handlePublish(data.payload);
          break;

        case "getLeaderboard":
          this.sendLeaderboard(conn);
          break;

        case "removeUser":
          this.handleRemoveUser(data.userId);
          break;

        case "online":
          this.handleOnline(conn, data.payload);
          break;

        case "offline":
          this.handleOffline(data.userId);
          break;

        case "chat":
          this.handleChat(data.payload);
          break;

        case "getChatHistory":
          conn.send(
            JSON.stringify({
              type: "chatHistory",
              messages: this.chatMessages.slice(-50),
            })
          );
          break;

        case "updateNickname":
          this.handleUpdateNickname(data.userId, data.nickname);
          break;

        case "shareStats":
          this.userStats[data.payload.userId] = data.payload;
          break;

        case "getStats":
          this.sendUserStats(conn, data.userId);
          break;

        case "friendRequest":
          this.handleFriendRequest(conn, data.payload);
          break;

        case "friendResponse":
          this.handleFriendResponse(data.payload);
          break;
      }
    } catch (err) {
      console.error("[PartyKit] Message error:", err);
    }
  }

  async onRequest(req: Request) {
    if (req.method === "GET") {
      const onlineList = Object.values(this.onlineUsers);
      return new Response(
        JSON.stringify({
          status: "ok",
          onlineCount: onlineList.length,
          leaderboardSize: Object.keys(this.leaderboard).length,
          chatMessages: this.chatMessages.length,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
    return new Response("Method not allowed", { status: 405 });
  }

  // --- Leaderboard ---

  handlePublish(payload: LeaderboardEntry) {
    this.leaderboard[payload.userId] = payload;
    if (payload.nickname) {
      this.userNicknames[payload.userId] = payload.nickname;
    }
    this.broadcastLeaderboard();
  }

  handleRemoveUser(userId: string) {
    delete this.leaderboard[userId];
    this.broadcastLeaderboard();
  }

  sendLeaderboard(conn: Connection) {
    conn.send(
      JSON.stringify({
        type: "leaderboardUpdate",
        payload: this.getTop1000(),
      })
    );
  }

  getTop1000(): LeaderboardEntry[] {
    return Object.values(this.leaderboard)
      .sort(
        (a, b) =>
          b.streak - a.streak || b.completedDays - a.completedDays
      )
      .slice(0, 1000)
      .map((user, index) => ({ ...user, rank: index + 1 }));
  }

  broadcastLeaderboard() {
    this.party.broadcast(
      JSON.stringify({
        type: "leaderboardUpdate",
        payload: this.getTop1000(),
      })
    );
  }

  // --- Online users ---

  handleOnline(conn: Connection, payload: OnlineUser) {
    this.onlineUsers[payload.id] = payload;
    this.userConnections[payload.id] = conn;
    if (payload.nickname) {
      this.userNicknames[payload.id] = payload.nickname;
    }
    this.broadcastOnline();
  }

  handleOffline(userId: string) {
    delete this.onlineUsers[userId];
    delete this.userConnections[userId];
    this.broadcastOnline();
  }

  broadcastOnline() {
    const onlineList = Object.values(this.onlineUsers);
    this.party.broadcast(
      JSON.stringify({
        type: "onlineUpdate",
        onlineCount: onlineList.length,
        onlineUsers: onlineList,
      })
    );
  }

  // --- Chat ---

  handleChat(payload: { userId: string; nickname: string; text: string }) {
    const msg: ChatMessage = {
      id: Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
      userId: payload.userId,
      nickname: payload.nickname || "Anonymous",
      text: payload.text.substring(0, 200),
      timestamp: Date.now(),
    };

    this.chatMessages.push(msg);
    if (this.chatMessages.length > 100) {
      this.chatMessages = this.chatMessages.slice(-100);
    }

    this.party.broadcast(
      JSON.stringify({
        type: "chatMessage",
        message: msg,
      })
    );
  }

  // --- Nickname ---

  handleUpdateNickname(userId: string, nickname: string) {
    this.userNicknames[userId] = nickname;

    // Update online user entry if present
    if (this.onlineUsers[userId]) {
      this.onlineUsers[userId].nickname = nickname;
      this.broadcastOnline();
    }

    this.party.broadcast(
      JSON.stringify({
        type: "nicknameUpdate",
        userId,
        nickname,
      })
    );
  }

  // --- Stats sharing ---

  sendUserStats(conn: Connection, userId: string) {
    const stats = this.userStats[userId];
    if (stats) {
      conn.send(
        JSON.stringify({
          type: "userStats",
          stats,
        })
      );
    }
  }

  // --- Friends ---

  handleFriendRequest(
    conn: Connection,
    payload: {
      fromUserId: string;
      fromNickname: string;
      toUserId: string;
    }
  ) {
    const request: FriendRequest = {
      id: Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
      fromUserId: payload.fromUserId,
      fromNickname: payload.fromNickname,
      toUserId: payload.toUserId,
      status: "pending",
      timestamp: Date.now(),
    };

    if (!this.pendingFriendRequests[payload.toUserId]) {
      this.pendingFriendRequests[payload.toUserId] = [];
    }
    this.pendingFriendRequests[payload.toUserId].push(request);

    // Try to send directly to recipient
    const recipientConn = this.userConnections[payload.toUserId];
    if (recipientConn) {
      recipientConn.send(
        JSON.stringify({
          type: "friendRequestReceived",
          request,
        })
      );
    }
  }

  handleFriendResponse(payload: {
    requestId: string;
    fromUserId: string;
    toUserId: string;
    status: "accepted" | "rejected";
  }) {
    // Update pending request
    const requests = this.pendingFriendRequests[payload.fromUserId] || [];
    const req = requests.find((r) => r.id === payload.requestId);
    if (req) {
      req.status = payload.status;
    }

    // Notify requester
    const requesterConn = this.userConnections[payload.fromUserId];
    if (requesterConn) {
      requesterConn.send(
        JSON.stringify({
          type: "friendRequestResolved",
          requestId: payload.requestId,
          fromUserId: payload.fromUserId,
          toUserId: payload.toUserId,
          status: payload.status,
        })
      );
    }
  }
}
