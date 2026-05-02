/**
 * PartyKit Server for Fasting App
 * Real-time leaderboard + online meditation counter
 */

import type { Party, PartyServer } from "partykit/server";

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

export default class FastingServer implements PartyServer {
  // In-memory state
  leaderboard: Record<string, LeaderboardEntry> = {};
  onlineUsers: Record<string, OnlineUser> = {};

  constructor(readonly party: Party) {}

  async onConnect(ws: WebSocket) {
    console.log("[PartyKit] Client connected");

    // Send current state to newly connected client
    const top1000 = this.getTop1000();
    const onlineList = Object.values(this.onlineUsers);

    ws.send(
      JSON.stringify({
        type: "init",
        leaderboard: top1000,
        onlineCount: onlineList.length,
        onlineUsers: onlineList,
      })
    );
  }

  async onMessage(ws: WebSocket, message: string) {
    try {
      const data = JSON.parse(message);

      switch (data.type) {
        case "publish":
          this.handlePublish(data.payload);
          break;

        case "getLeaderboard":
          this.sendLeaderboard(ws);
          break;

        case "removeUser":
          this.handleRemoveUser(data.userId);
          break;

        case "online":
          this.handleOnline(ws, data.payload);
          break;

        case "offline":
          this.handleOffline(data.userId);
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
    this.broadcastLeaderboard();
  }

  handleRemoveUser(userId: string) {
    delete this.leaderboard[userId];
    this.broadcastLeaderboard();
  }

  sendLeaderboard(ws: WebSocket) {
    ws.send(
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
    const top1000 = this.getTop1000();
    this.party.broadcast(
      JSON.stringify({
        type: "leaderboardUpdate",
        payload: top1000,
      })
    );
  }

  // --- Online users ---

  handleOnline(ws: WebSocket, payload: OnlineUser) {
    this.onlineUsers[payload.id] = payload;
    this.broadcastOnline();
  }

  handleOffline(userId: string) {
    delete this.onlineUsers[userId];
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
}
