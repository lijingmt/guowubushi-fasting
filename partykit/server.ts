/**
 * PartyKit Server for Fasting App
 * Uses Party.Server class API with scoped notifications and sender binding.
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

interface FriendEncouragement {
  id: string;
  fromUserId: string;
  fromNickname: string;
  toUserId: string;
  toNickname: string;
  kind: "like" | "cheer" | "streak";
  text?: string;
  timestamp: number;
}

interface FriendPair {
  users: [string, string];
  addedAt: number;
}

type SilentGestureType = "bow" | "lamp" | "bell";

interface SilentRoomCounts {
  bow: number;
  lamp: number;
  bell: number;
}

interface SilentGestureEvent {
  id: string;
  userId: string;
  nickname: string;
  gesture: SilentGestureType;
  timestamp: number;
}

interface BuddyChallenge {
  id: string;
  users: [string, string];
  nicknames: Record<string, string>;
  durationDays: 7 | 21;
  startDate: string;
  litDates: Record<string, string[]>;
  createdAt: number;
}

interface RepairCardGift {
  id: string;
  fromUserId: string;
  fromNickname: string;
  toUserId: string;
  timestamp: number;
}

interface ServerState {
  leaderboard: Record<string, LeaderboardEntry>;
  onlineUsers: Record<string, OnlineUser>;
  userNicknames: Record<string, string>;
  pendingFriendRequests: Record<string, FriendRequest[]>;
  userStats: Record<string, SharedStats>;
  friendPairs: Record<string, FriendPair>;
  friendEncouragements: Record<string, FriendEncouragement[]>;
  connectionUsers: Record<string, string>;
  silentRoomCounts: SilentRoomCounts;
  silentRoomTodayDate: string;
  silentRoomTodayCounts: SilentRoomCounts;
  recentSilentGestures: SilentGestureEvent[];
  buddyChallenges: Record<string, BuddyChallenge>;
  pendingRepairCardGifts: Record<string, RepairCardGift[]>;
}

type LeaderboardCategory = "fasting" | "meditation";
type LeaderboardPeriod = "weekly" | "monthly" | "yearly";
const LEADERBOARD_KEY_PREFIX = "leaderboard:";
const FRIEND_PAIR_KEY_PREFIX = "friendPair:";
const FRIEND_REQUEST_KEY_PREFIX = "friendRequest:";
const FRIEND_ENCOURAGEMENT_KEY_PREFIX = "friendEncouragements:";
const USER_STATS_KEY_PREFIX = "userStats:";
const SILENT_ROOM_COUNTS_KEY = "silentRoom:counts";
const SILENT_ROOM_TODAY_KEY = "silentRoom:today";
const BUDDY_CHALLENGE_KEY_PREFIX = "buddyChallenge:";
const REPAIR_GIFT_KEY_PREFIX = "repairGift:";
const MAX_FRIEND_ENCOURAGEMENTS_PER_USER = 100;
const MAX_SILENT_EVENTS = 20;
const MAX_REPAIR_GIFTS_PER_USER = 20;
const SILENT_GESTURE_COOLDOWN_MS = 1000;
const ONLINE_STALE_MS = 5 * 60 * 1000;
const LEADERBOARD_BROADCAST_DELAY_MS = 1000;
const ONLINE_BROADCAST_DELAY_MS = 500;
const SILENT_ROOM_BROADCAST_DELAY_MS = 500;

export default class FastingServer implements Party.Server {
  state: ServerState = {
    leaderboard: {},
    onlineUsers: {},
    userNicknames: {},
    pendingFriendRequests: {},
    userStats: {},
    friendPairs: {},
    friendEncouragements: {},
    connectionUsers: {},
    silentRoomCounts: { bow: 0, lamp: 0, bell: 0 },
    silentRoomTodayDate: new Date().toISOString().slice(0, 10),
    silentRoomTodayCounts: { bow: 0, lamp: 0, bell: 0 },
    recentSilentGestures: [],
    buddyChallenges: {},
    pendingRepairCardGifts: {},
  };

  private leaderboardBroadcastTimer: ReturnType<typeof setTimeout> | null = null;
  private onlineBroadcastTimer: ReturnType<typeof setTimeout> | null = null;
  private silentRoomBroadcastTimer: ReturnType<typeof setTimeout> | null = null;
  private connectionLastGestureAt: Record<string, number> = {};

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

      if (key.startsWith(FRIEND_ENCOURAGEMENT_KEY_PREFIX)) {
        const encouragements = value as FriendEncouragement[];
        if (!Array.isArray(encouragements)) continue;
        const userId = key.substring(FRIEND_ENCOURAGEMENT_KEY_PREFIX.length);
        this.state.friendEncouragements[userId] = encouragements.slice(-MAX_FRIEND_ENCOURAGEMENTS_PER_USER);
        continue;
      }

      if (key.startsWith(USER_STATS_KEY_PREFIX)) {
        const stats = value as SharedStats;
        if (stats && stats.userId) {
          this.state.userStats[stats.userId] = stats;
        }
        continue;
      }

      if (key === SILENT_ROOM_COUNTS_KEY) {
        const counts = value as Partial<SilentRoomCounts>;
        if (counts && typeof counts === "object") {
          this.state.silentRoomCounts = {
            bow: this.toNumber(counts.bow, 0),
            lamp: this.toNumber(counts.lamp, 0),
            bell: this.toNumber(counts.bell, 0),
          };
        }
        continue;
      }

      if (key === SILENT_ROOM_TODAY_KEY) {
        const todayData = value as { date?: string; counts?: Partial<SilentRoomCounts> } | undefined;
        const todayKey = new Date().toISOString().slice(0, 10);
        if (todayData && todayData.date === todayKey && todayData.counts) {
          this.state.silentRoomTodayDate = todayKey;
          this.state.silentRoomTodayCounts = {
            bow: this.toNumber(todayData.counts.bow, 0),
            lamp: this.toNumber(todayData.counts.lamp, 0),
            bell: this.toNumber(todayData.counts.bell, 0),
          };
        }
        continue;
      }

      if (key.startsWith(BUDDY_CHALLENGE_KEY_PREFIX)) {
        const challenge = value as BuddyChallenge;
        if (challenge && Array.isArray(challenge.users) && challenge.users.length === 2) {
          this.state.buddyChallenges[this.getPairKey(challenge.users[0], challenge.users[1])] = challenge;
        }
        continue;
      }

      if (key.startsWith(REPAIR_GIFT_KEY_PREFIX)) {
        const gifts = value as RepairCardGift[];
        if (Array.isArray(gifts)) {
          const toUserId = key.substring(REPAIR_GIFT_KEY_PREFIX.length);
          this.state.pendingRepairCardGifts[toUserId] = gifts.slice(-MAX_REPAIR_GIFTS_PER_USER);
        }
      }
    }
  }

  async onConnect(connection: Party.Connection, _ctx: Party.ConnectionContext) {
    this.ensureSilentRoomToday();
    connection.send(
      JSON.stringify({
        type: "init",
        leaderboard: this.getLeaderboard("fasting", "weekly"),
        onlineCount: Object.keys(this.state.onlineUsers).length,
        onlineUsers: Object.values(this.state.onlineUsers),
        silentRoomCounts: this.state.silentRoomCounts,
        silentRoomTodayCounts: this.state.silentRoomTodayCounts,
        recentSilentGestures: this.state.recentSilentGestures,
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
          if (!this.bindOrVerifySender(sender, entry.userId)) break;

          this.state.leaderboard[entry.userId] = entry;
          if (entry.nickname) {
            this.state.userNicknames[entry.userId] = entry.nickname;
          }
          await this.room.storage.put(`${LEADERBOARD_KEY_PREFIX}${entry.userId}`, entry);

          this.scheduleLeaderboardBroadcast();
          break;
        }

        case "getLeaderboard": {
          const category: LeaderboardCategory = data.category === "meditation" ? "meditation" : "fasting";
          const period: LeaderboardPeriod =
            data.period === "monthly" || data.period === "yearly" ? data.period : "weekly";
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

        case "removeUser": {
          const targetUserId = typeof data.userId === "string" ? data.userId : "";
          if (!targetUserId || this.state.connectionUsers[sender.id] !== targetUserId) {
            break;
          }
          delete this.state.leaderboard[targetUserId];
          await this.room.storage.delete(`${LEADERBOARD_KEY_PREFIX}${targetUserId}`);
          break;
        }

        case "online": {
          const userId = typeof data.payload?.id === "string" ? data.payload.id.trim() : "";
          if (!userId || !this.bindOrVerifySender(sender, userId)) break;

          this.cleanupStaleOnlineUsers();
          const nickname = typeof data.payload?.nickname === "string" ? data.payload.nickname.substring(0, 40) : "";
          const activity: OnlineUser["activity"] =
            data.payload?.activity === "fasting" || data.payload?.activity === "checkin"
              ? data.payload.activity
              : "meditation";

          this.state.onlineUsers[userId] = {
            id: userId,
            nickname,
            activity,
            startedAt: this.toNumber(data.payload?.startedAt, Date.now()),
          };
          if (nickname) {
            this.state.userNicknames[userId] = nickname;
          }
          this.sendPendingFriendRequests(sender, userId);
          this.sendFriendEncouragementHistory(sender, userId);
          this.scheduleOnlineBroadcast();
          break;
        }

        case "offline": {
          const userId = typeof data.userId === "string" ? data.userId : "";
          if (!userId || !this.verifyBoundSender(sender, userId)) break;

          delete this.state.onlineUsers[userId];
          delete this.state.connectionUsers[sender.id];
          this.scheduleOnlineBroadcast();
          break;
        }

        case "updateNickname": {
          const userId = typeof data.userId === "string" ? data.userId : "";
          const nickname = typeof data.nickname === "string" ? data.nickname.substring(0, 40) : "";
          if (!userId || !this.bindOrVerifySender(sender, userId)) break;

          this.state.userNicknames[userId] = nickname;
          if (this.state.onlineUsers[userId]) {
            this.state.onlineUsers[userId].nickname = nickname;
            this.scheduleOnlineBroadcast();
          }
          this.broadcastAll(JSON.stringify({ type: "nicknameUpdate", userId, nickname }));
          break;
        }

        case "shareStats": {
          const payload = data.payload as Partial<SharedStats> | undefined;
          const userId = typeof payload?.userId === "string" ? payload.userId.trim() : "";
          if (!userId || !this.bindOrVerifySender(sender, userId)) break;

          const normalizedStats: SharedStats = {
            userId: userId.substring(0, 100),
            nickname: typeof payload?.nickname === "string" ? payload.nickname.substring(0, 40) : "",
            streak: this.clampNumber(payload?.streak, 36500),
            totalMeditationMinutes: this.clampNumber(payload?.totalMeditationMinutes, 10_000_000),
            totalMerit: this.clampNumber(payload?.totalMerit, 10_000_000),
            meditationSessionCount: this.clampNumber(payload?.meditationSessionCount, 1_000_000),
            longestMeditationSession: this.clampNumber(payload?.longestMeditationSession, 1440),
            totalMeditationDays: this.clampNumber(payload?.totalMeditationDays, 36500),
          };

          this.state.userStats[normalizedStats.userId] = normalizedStats;
          await this.room.storage.put(`${USER_STATS_KEY_PREFIX}${normalizedStats.userId}`, normalizedStats);
          break;
        }

        case "getStats": {
          const targetUserId = typeof data.userId === "string" ? data.userId : "";
          const stats = targetUserId ? this.state.userStats[targetUserId] : undefined;
          if (stats) {
            sender.send(JSON.stringify({ type: "userStats", stats }));
          }
          break;
        }

        case "friendRequest": {
          const fromUserId = typeof data.payload?.fromUserId === "string" ? data.payload.fromUserId.trim() : "";
          const toUserId = typeof data.payload?.toUserId === "string" ? data.payload.toUserId.trim() : "";
          if (!fromUserId || !toUserId || fromUserId === toUserId) break;
          if (!this.bindOrVerifySender(sender, fromUserId)) break;

          const req: FriendRequest = {
            id: Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
            fromUserId,
            fromNickname: typeof data.payload?.fromNickname === "string" ? data.payload.fromNickname.substring(0, 40) : "",
            toUserId,
            status: "pending",
            timestamp: Date.now(),
          };
          if (!this.state.pendingFriendRequests[toUserId]) {
            this.state.pendingFriendRequests[toUserId] = [];
          }
          this.state.pendingFriendRequests[toUserId].push(req);
          if (req.fromNickname) {
            this.state.userNicknames[req.fromUserId] = req.fromNickname;
          }
          await this.room.storage.put(`${FRIEND_REQUEST_KEY_PREFIX}${req.toUserId}:${req.id}`, req);
          this.sendToUser(req.toUserId, JSON.stringify({ type: "friendRequestReceived", request: req }));
          break;
        }

        case "friendResponse": {
          const toUserId = typeof data.payload?.toUserId === "string" ? data.payload.toUserId : "";
          const fromUserId = typeof data.payload?.fromUserId === "string" ? data.payload.fromUserId : "";
          const requestId = typeof data.payload?.requestId === "string" ? data.payload.requestId : "";
          if (!toUserId || !fromUserId || !requestId) break;
          if (!this.bindOrVerifySender(sender, toUserId)) break;

          const status: FriendRequest["status"] = data.payload?.status === "accepted" ? "accepted" : "rejected";
          const requests = this.state.pendingFriendRequests[toUserId] || [];
          const found = requests.find((r) => r.id === requestId);
          if (found) {
            found.status = status;
            await this.room.storage.put(`${FRIEND_REQUEST_KEY_PREFIX}${found.toUserId}:${found.id}`, found);
          }
          if (status === "accepted") {
            const pairKey = this.getPairKey(fromUserId, toUserId);
            const pair: FriendPair = {
              users: [fromUserId, toUserId].sort() as [string, string],
              addedAt: Date.now(),
            };
            this.state.friendPairs[pairKey] = pair;
            await this.room.storage.put(`${FRIEND_PAIR_KEY_PREFIX}${pairKey}`, pair);
            const friendshipPayload = JSON.stringify({
              type: "friendshipUpdate",
              users: pair.users,
            });
            this.sendToUser(pair.users[0], friendshipPayload);
            this.sendToUser(pair.users[1], friendshipPayload);
          }
          const resolvedPayload = JSON.stringify({
            type: "friendRequestResolved",
            requestId,
            fromUserId,
            toUserId,
            status,
          });
          this.sendToUser(fromUserId, resolvedPayload);
          this.sendToUser(toUserId, resolvedPayload);
          break;
        }

        case "getFriends": {
          const userId = typeof data.userId === "string" ? data.userId : this.state.connectionUsers[sender.id];
          if (!userId || !this.bindOrVerifySender(sender, userId)) break;
          sender.send(JSON.stringify({
            type: "friendsList",
            friends: this.getFriendsForUser(userId),
          }));
          break;
        }

        case "friendEncouragement": {
          const fromUserId = typeof data.payload?.fromUserId === "string" ? data.payload.fromUserId.trim() : "";
          const toUserId = typeof data.payload?.toUserId === "string" ? data.payload.toUserId.trim() : "";
          if (!fromUserId || !toUserId || fromUserId === toUserId) break;
          if (!this.bindOrVerifySender(sender, fromUserId)) break;

          const kind: FriendEncouragement["kind"] = ["like", "cheer", "streak"].includes(data.payload.kind)
            ? data.payload.kind
            : "cheer";
          const encouragement: FriendEncouragement = {
            id: Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
            fromUserId,
            fromNickname: typeof data.payload.fromNickname === "string" ? data.payload.fromNickname.substring(0, 40) : "Anonymous",
            toUserId,
            toNickname: typeof data.payload.toNickname === "string" ? data.payload.toNickname.substring(0, 40) : "Anonymous",
            kind,
            text: typeof data.payload.text === "string" ? data.payload.text.substring(0, 100) : undefined,
            timestamp: Date.now(),
          };

          const existing = this.state.friendEncouragements[toUserId] || [];
          const next = [encouragement, ...existing].slice(0, MAX_FRIEND_ENCOURAGEMENTS_PER_USER);
          this.state.friendEncouragements[toUserId] = next;
          await this.room.storage.put(`${FRIEND_ENCOURAGEMENT_KEY_PREFIX}${toUserId}`, next);

          const payload = JSON.stringify({ type: "friendEncouragementReceived", encouragement });
          this.sendToUser(toUserId, payload);
          this.sendToUser(fromUserId, payload);
          break;
        }

        case "getFriendEncouragements": {
          const userId = typeof data.userId === "string" ? data.userId : this.state.connectionUsers[sender.id];
          if (!userId || !this.bindOrVerifySender(sender, userId)) break;
          this.sendFriendEncouragementHistory(sender, userId);
          break;
        }

        case "silentGesture": {
          const userId = typeof data.payload?.userId === "string" ? data.payload.userId.trim() : "";
          const rawGesture = data.payload?.gesture;
          if (
            !userId ||
            (rawGesture !== "bow" && rawGesture !== "lamp" && rawGesture !== "bell") ||
            !this.bindOrVerifySender(sender, userId)
          ) {
            break;
          }
          const gesture: SilentGestureType = rawGesture;
          const now = Date.now();
          const lastAt = this.connectionLastGestureAt[sender.id] || 0;
          if (now - lastAt < SILENT_GESTURE_COOLDOWN_MS) {
            break;
          }
          this.connectionLastGestureAt[sender.id] = now;
          this.ensureSilentRoomToday();

          this.state.silentRoomCounts[gesture] += 1;
          this.state.silentRoomTodayCounts[gesture] += 1;
          const event: SilentGestureEvent = {
            id: now.toString(36) + Math.random().toString(36).substring(2, 6),
            userId: userId.substring(0, 100),
            nickname:
              typeof data.payload?.nickname === "string" && data.payload.nickname.trim()
                ? data.payload.nickname.substring(0, 40)
                : "Anonymous",
            gesture,
            timestamp: now,
          };
          this.state.recentSilentGestures = [event, ...this.state.recentSilentGestures].slice(0, MAX_SILENT_EVENTS);
          await this.room.storage.put(SILENT_ROOM_COUNTS_KEY, this.state.silentRoomCounts);
          await this.room.storage.put(SILENT_ROOM_TODAY_KEY, {
            date: this.state.silentRoomTodayDate,
            counts: this.state.silentRoomTodayCounts,
          });
          this.scheduleSilentRoomBroadcast();
          break;
        }

        case "startBuddyChallenge": {
          const fromUserId = typeof data.payload?.fromUserId === "string" ? data.payload.fromUserId.trim() : "";
          const toUserId = typeof data.payload?.toUserId === "string" ? data.payload.toUserId.trim() : "";
          if (!fromUserId || !toUserId || fromUserId === toUserId) break;
          if (!this.bindOrVerifySender(sender, fromUserId)) break;
          const pairKey = this.getPairKey(fromUserId, toUserId);
          if (!this.state.friendPairs[pairKey]) break;

          const durationDays: 7 | 21 = data.payload?.durationDays === 21 ? 21 : 7;
          const startDate =
            typeof data.payload?.startDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(data.payload.startDate)
              ? data.payload.startDate
              : new Date().toISOString().slice(0, 10);
          const fromNickname =
            typeof data.payload?.fromNickname === "string" ? data.payload.fromNickname.substring(0, 40) : "";
          const toNickname =
            typeof data.payload?.toNickname === "string" ? data.payload.toNickname.substring(0, 40) : "";

          const users = [fromUserId, toUserId].sort() as [string, string];
          const challenge: BuddyChallenge = {
            id: `buddy_${pairKey}_${Date.now()}`,
            users,
            nicknames: {
              [fromUserId]: fromNickname || this.state.userNicknames[fromUserId] || "",
              [toUserId]: toNickname || this.state.userNicknames[toUserId] || "",
            },
            durationDays,
            startDate,
            litDates: { [fromUserId]: [startDate], [toUserId]: [] },
            createdAt: Date.now(),
          };

          this.state.buddyChallenges[pairKey] = challenge;
          await this.room.storage.put(`${BUDDY_CHALLENGE_KEY_PREFIX}${pairKey}`, challenge);
          this.sendBuddyChallengesToUser(fromUserId);
          this.sendBuddyChallengesToUser(toUserId);
          break;
        }

        case "lightBuddyLamp": {
          const userId = typeof data.payload?.userId === "string" ? data.payload.userId.trim() : "";
          const partnerUserId =
            typeof data.payload?.partnerUserId === "string" ? data.payload.partnerUserId.trim() : "";
          const date = typeof data.payload?.date === "string" ? data.payload.date.trim() : "";
          if (!userId || !partnerUserId || !/^\d{4}-\d{2}-\d{2}$/.test(date)) break;
          if (!this.bindOrVerifySender(sender, userId)) break;

          const pairKey = this.getPairKey(userId, partnerUserId);
          const challenge = this.state.buddyChallenges[pairKey];
          if (!challenge || !challenge.users.includes(userId)) break;

          const currentDates = challenge.litDates[userId] || [];
          if (!currentDates.includes(date)) {
            challenge.litDates[userId] = [...currentDates, date].slice(-30);
            await this.room.storage.put(`${BUDDY_CHALLENGE_KEY_PREFIX}${pairKey}`, challenge);
          }
          this.sendBuddyChallengesToUser(challenge.users[0]);
          this.sendBuddyChallengesToUser(challenge.users[1]);
          break;
        }

        case "getBuddyState": {
          const userId = typeof data.userId === "string" ? data.userId : this.state.connectionUsers[sender.id];
          if (!userId || !this.bindOrVerifySender(sender, userId)) break;
          sender.send(
            JSON.stringify({
              type: "buddyChallengesUpdate",
              challenges: this.getBuddyChallengesForUser(userId),
            })
          );
          const pendingGifts = this.state.pendingRepairCardGifts[userId] || [];
          if (pendingGifts.length > 0) {
            sender.send(JSON.stringify({ type: "pendingRepairGifts", gifts: pendingGifts }));
          }
          break;
        }

        case "giftRepairCard": {
          const fromUserId = typeof data.payload?.fromUserId === "string" ? data.payload.fromUserId.trim() : "";
          const toUserId = typeof data.payload?.toUserId === "string" ? data.payload.toUserId.trim() : "";
          if (!fromUserId || !toUserId || fromUserId === toUserId) break;
          if (!this.bindOrVerifySender(sender, fromUserId)) break;
          if (!this.state.friendPairs[this.getPairKey(fromUserId, toUserId)]) break;

          const gift: RepairCardGift = {
            id: Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
            fromUserId: fromUserId.substring(0, 100),
            fromNickname:
              typeof data.payload?.fromNickname === "string" ? data.payload.fromNickname.substring(0, 40) : "",
            toUserId: toUserId.substring(0, 100),
            timestamp: Date.now(),
          };
          const existing = this.state.pendingRepairCardGifts[toUserId] || [];
          const next = [...existing, gift].slice(-MAX_REPAIR_GIFTS_PER_USER);
          this.state.pendingRepairCardGifts[toUserId] = next;
          await this.room.storage.put(`${REPAIR_GIFT_KEY_PREFIX}${toUserId}`, next);
          this.sendToUser(toUserId, JSON.stringify({ type: "repairCardGiftReceived", gift }));
          break;
        }

        case "claimRepairCardGifts": {
          const userId = typeof data.userId === "string" ? data.userId.trim() : this.state.connectionUsers[sender.id];
          if (!userId || !this.bindOrVerifySender(sender, userId)) break;
          delete this.state.pendingRepairCardGifts[userId];
          await this.room.storage.delete(`${REPAIR_GIFT_KEY_PREFIX}${userId}`);
          break;
        }
      }
    } catch (err) {
      console.error("[PartyKit] Message error:", err);
    }
  }

  async onClose(connection: Party.Connection) {
    const userId = this.state.connectionUsers[connection.id];
    delete this.state.connectionUsers[connection.id];
    delete this.connectionLastGestureAt[connection.id];
    if (userId && !this.hasActiveConnectionForUser(userId)) {
      delete this.state.onlineUsers[userId];
    }
    this.scheduleOnlineBroadcast();
  }

  async onRequest(req: Party.Request) {
    if (req.method === "GET") {
      this.cleanupStaleOnlineUsers();
      this.ensureSilentRoomToday();
      return new Response(
        JSON.stringify({
          status: "ok",
          onlineCount: Object.keys(this.state.onlineUsers).length,
          leaderboardSize: Object.keys(this.state.leaderboard).length,
          silentRoomCounts: this.state.silentRoomCounts,
          silentRoomTodayCounts: this.state.silentRoomTodayCounts,
          roomId: this.room.id,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }
    return new Response("Method not allowed", { status: 405 });
  }

  bindOrVerifySender(connection: Party.Connection, userId: string): boolean {
    const existing = this.state.connectionUsers[connection.id];
    if (existing) {
      return existing === userId;
    }
    this.state.connectionUsers[connection.id] = userId;
    return true;
  }

  verifyBoundSender(connection: Party.Connection, userId: string): boolean {
    const existing = this.state.connectionUsers[connection.id];
    return !existing || existing === userId;
  }

  sendToUser(userId: string, message: string) {
    for (const connection of this.room.getConnections()) {
      if (this.state.connectionUsers[connection.id] === userId) {
        connection.send(message);
      }
    }
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
    if (!raw.userId || typeof raw.userId !== "string" || !raw.userId.trim()) return null;

    return {
      userId: raw.userId.trim().substring(0, 100),
      nickname: typeof raw.nickname === "string" ? raw.nickname.substring(0, 40) : "",
      lastUpdate: this.toNumber(raw.lastUpdate, Date.now()),
      currentStreak: this.clampNumber(raw.currentStreak, 36500),
      fastingDaysThisWeek: this.clampNumber(raw.fastingDaysThisWeek, 7),
      fastingDaysThisMonth: this.clampNumber(raw.fastingDaysThisMonth, 31),
      fastingDaysThisYear: this.clampNumber(raw.fastingDaysThisYear, 366),
      meditationMinutesThisWeek: this.clampNumber(raw.meditationMinutesThisWeek, 10080),
      meditationMinutesThisMonth: this.clampNumber(raw.meditationMinutesThisMonth, 44640),
      meditationMinutesThisYear: this.clampNumber(raw.meditationMinutesThisYear, 527040),
      meditationDaysThisMonth: this.clampNumber(raw.meditationDaysThisMonth, 31),
      meditationDaysThisYear: this.clampNumber(raw.meditationDaysThisYear, 366),
      sessionCountThisWeek: this.clampNumber(raw.sessionCountThisWeek, 500),
    };
  }

  toNumber(value: unknown, fallback = 0): number {
    return typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.floor(value)) : fallback;
  }

  clampNumber(value: unknown, max: number, fallback = 0): number {
    return Math.min(max, this.toNumber(value, fallback));
  }

  broadcastOnlineUsers() {
    this.broadcastAll(JSON.stringify({
      type: "onlineUpdate",
      onlineCount: Object.keys(this.state.onlineUsers).length,
      onlineUsers: Object.values(this.state.onlineUsers),
    }));
  }

  scheduleLeaderboardBroadcast() {
    if (this.leaderboardBroadcastTimer) return;
    this.leaderboardBroadcastTimer = setTimeout(() => {
      this.leaderboardBroadcastTimer = null;
      this.broadcastLeaderboards();
    }, LEADERBOARD_BROADCAST_DELAY_MS);
    (this.leaderboardBroadcastTimer as unknown as { unref?: () => void })?.unref?.();
  }

  scheduleOnlineBroadcast() {
    if (this.onlineBroadcastTimer) return;
    this.onlineBroadcastTimer = setTimeout(() => {
      this.onlineBroadcastTimer = null;
      this.broadcastOnlineUsers();
    }, ONLINE_BROADCAST_DELAY_MS);
    (this.onlineBroadcastTimer as unknown as { unref?: () => void })?.unref?.();
  }

  flushPendingBroadcasts() {
    if (this.leaderboardBroadcastTimer) {
      clearTimeout(this.leaderboardBroadcastTimer);
      this.leaderboardBroadcastTimer = null;
      this.broadcastLeaderboards();
    }
    if (this.onlineBroadcastTimer) {
      clearTimeout(this.onlineBroadcastTimer);
      this.onlineBroadcastTimer = null;
      this.broadcastOnlineUsers();
    }
    if (this.silentRoomBroadcastTimer) {
      clearTimeout(this.silentRoomBroadcastTimer);
      this.silentRoomBroadcastTimer = null;
      this.broadcastSilentRoom();
    }
  }

  scheduleSilentRoomBroadcast() {
    if (this.silentRoomBroadcastTimer) return;
    this.silentRoomBroadcastTimer = setTimeout(() => {
      this.silentRoomBroadcastTimer = null;
      this.broadcastSilentRoom();
    }, SILENT_ROOM_BROADCAST_DELAY_MS);
    (this.silentRoomBroadcastTimer as unknown as { unref?: () => void })?.unref?.();
  }

  ensureSilentRoomToday() {
    const today = new Date().toISOString().slice(0, 10);
    if (this.state.silentRoomTodayDate !== today) {
      this.state.silentRoomTodayDate = today;
      this.state.silentRoomTodayCounts = { bow: 0, lamp: 0, bell: 0 };
    }
  }

  broadcastSilentRoom() {
    this.ensureSilentRoomToday();
    this.broadcastAll(
      JSON.stringify({
        type: "silentRoomUpdate",
        counts: this.state.silentRoomCounts,
        todayCounts: this.state.silentRoomTodayCounts,
        recentEvents: this.state.recentSilentGestures,
      })
    );
  }

  getBuddyChallengesForUser(userId: string): BuddyChallenge[] {
    return Object.values(this.state.buddyChallenges).filter((c) => c.users.includes(userId));
  }

  sendBuddyChallengesToUser(userId: string) {
    this.sendToUser(
      userId,
      JSON.stringify({
        type: "buddyChallengesUpdate",
        challenges: this.getBuddyChallengesForUser(userId),
      })
    );
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
      this.scheduleOnlineBroadcast();
    }
  }

  sendPendingFriendRequests(connection: Party.Connection, userId: string) {
    const requests = (this.state.pendingFriendRequests[userId] || []).filter((r) => r.status === "pending");
    for (const request of requests) {
      connection.send(JSON.stringify({ type: "friendRequestReceived", request }));
    }
  }

  sendFriendEncouragementHistory(connection: Party.Connection, userId: string) {
    connection.send(JSON.stringify({
      type: "friendEncouragementHistory",
      encouragements: this.state.friendEncouragements[userId] || [],
    }));
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
}
