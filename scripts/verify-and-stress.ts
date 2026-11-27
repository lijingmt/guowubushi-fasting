import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import {
  addLocalDays,
  diffLocalDays,
  formatClockHour,
  getLocalDateString,
  getLocalWeekKey,
  parseLocalDate,
} from '../src/utils/date';
import { computeUserStats, isAbstinenceCompleted } from '../src/utils/stats';
import { CALORIE_REFERENCES_EN, CALORIE_REFERENCES_ES } from '../src/constants/achievements';
import { translations } from '../src/i18n/translations';
import { resolveDeviceLocale } from '../src/utils/locale';
import {
  DEFAULT_RETENTION_STATE,
  buildDailyTasks,
  buildGrowthProfile,
  buildWeeklySummary,
  calculateDailyRating,
  canRepairYesterday,
} from '../src/utils/retention';
import { calculatePeriodStats } from '../src/utils/leaderboardStats';
import {
  FASTING_GOALS,
  FASTING_TIERS,
  PAUSE_REASONS,
  getChineseShichen,
  getEffectiveDaySchedule,
  getPhysiologicalStage,
  getProtectedDates,
  getRecommendedTier,
  getSundialRhythmState,
} from '../src/utils/fastingRhythm';
import { SOLAR_TERMS, getSeasonalNutritionGuide, getSolarTermInfo } from '../src/utils/solarTerm';
import { PILGRIMAGE_ROUTES, calculatePilgrimageKm, computePilgrimageProgress } from '../src/utils/pilgrimage';
import { SACRED_SITES } from '../src/data/sacredSites';
import {
  MAP_WIDTH,
  MAP_HEIGHT,
  projectLonLat,
  WORLD_LAND_PATHS,
  WORLD_LAKE_PATHS,
} from '../src/data/worldMapPaths';
import {
  computeWellnessSummary,
  parseAndValidateBackupPayload,
  serializeBackupPayload,
} from '../src/utils/backup';
import { computeResponsiveLayout } from '../src/utils/responsiveLayout';
import {
  CHALDEAN_ORDER,
  WEEKDAY_RULER,
  getQiZheng24HourSchedule,
  getQiZhengHourSnapshot,
  getSeasonalElement,
  getWangXiangStatus,
  type FiveElement,
} from '../src/utils/qizheng';
import FastingServer from '../partykit/server';
import type {
  DailyCheckIn,
  FastingSession,
  MealRecord,
  PracticeRecord,
  UserSettings,
  WaterRecord,
  WeightRecord,
  WellnessRecord,
} from '../src/types';

function runSection(name: string, fn: () => Promise<void> | void) {
  return Promise.resolve()
    .then(fn)
    .then(() => console.log(`PASS: ${name}`));
}

class MockConnection {
  id: string;
  sent: any[] = [];
  captureBroadcasts = true;
  broadcastReceived = 0;
  constructor(id: string, captureBroadcasts = true) {
    this.id = id;
    this.captureBroadcasts = captureBroadcasts;
  }
  send(msg: string, isBroadcast = false) {
    if (isBroadcast) {
      this.broadcastReceived += 1;
      if (!this.captureBroadcasts) return;
    }
    this.sent.push(JSON.parse(msg));
  }
}

class MockStorage {
  private map = new Map<string, any>();
  async list() {
    return new Map(this.map);
  }
  async get(key: string) {
    return this.map.get(key);
  }
  async put(key: string, value: any) {
    this.map.set(key, value);
  }
  async delete(key: string) {
    this.map.delete(key);
  }
}

class MockRoom {
  id = 'meditation-room-test';
  storage = new MockStorage();
  connections = new Map<string, MockConnection>();
  broadcastCalls = 0;

  addConnection(conn: MockConnection) {
    this.connections.set(conn.id, conn);
  }
  removeConnection(connId: string) {
    this.connections.delete(connId);
  }
  getConnections() {
    return this.connections.values();
  }
  broadcast(msg: string) {
    this.broadcastCalls += 1;
    for (const conn of this.connections.values()) {
      conn.send(msg, true);
    }
  }
}

async function main() {
  await runSection('1. Local calendar date helpers (DST, leap year, year boundary)', () => {
    const sampleDate = new Date(2026, 2, 8, 23, 45, 0); // US DST spring forward evening
    assert.equal(getLocalDateString(sampleDate), '2026-03-08');
    assert.equal(addLocalDays('2024-02-28', 1), '2024-02-29'); // leap year
    assert.equal(addLocalDays('2024-02-28', 2), '2024-03-01');
    assert.equal(addLocalDays('2025-12-31', 1), '2026-01-01'); // year boundary
    assert.equal(addLocalDays('2026-01-01', -1), '2025-12-31');
    assert.equal(diffLocalDays('2026-03-10', '2026-03-07'), 3);
    assert.equal(diffLocalDays('2026-11-03', '2026-11-01'), 2); // US DST fall back
    assert.equal(getLocalWeekKey('2026-11-29'), '2026-11-23'); // Sunday -> Monday
    assert.equal(getLocalWeekKey('2026-11-23'), '2026-11-23'); // Monday -> Monday
    const parsed = parseLocalDate('2026-11-26');
    assert.equal(parsed.getFullYear(), 2026);
    assert.equal(parsed.getMonth(), 10);
    assert.equal(parsed.getDate(), 26);
  });

  await runSection('2. Regression: historical streak does NOT overwrite currentStreak', () => {
    const today = '2026-11-26';
    const checkIns: DailyCheckIn[] = [];
    // Current 3-day streak: 24, 25, 26
    for (let i = 0; i < 3; i++) {
      const date = addLocalDays(today, -i);
      checkIns.push({ id: `c_${date}`, date, completed: true, brokeAfterNoon: false, checkInTime: 1 });
    }
    // Gap of 4 days, then older 10-day streak: 10..19
    for (let i = 7; i < 17; i++) {
      const date = addLocalDays(today, -i);
      checkIns.push({ id: `c_${date}`, date, completed: true, brokeAfterNoon: false, checkInTime: 1 });
    }
    const stats = computeUserStats({
      checkInRecords: checkIns,
      weightRecords: [],
      practiceRecords: [],
      fastingStats: { totalSessions: 0, totalMinutes: 0, currentStreak: 0, longestStreak: 0 },
      today,
    });
    assert.equal(stats.currentStreak, 3);
    assert.equal(stats.longestStreak, 10);
    assert.equal(stats.streakInGracePeriod, false);
  });

  await runSection('3. Grace period active vs expired & multilingual abstinence & achievements', () => {
    const today = '2026-11-26';
    // Completed 2 days ago (24) and 3 days ago (23) -> 1-day grace active on 26
    const graceCheckIns: DailyCheckIn[] = [
      { id: '1', date: '2026-11-24', completed: true, brokeAfterNoon: false, checkInTime: 1, notes: '🙏 Abstinence Completed' },
      { id: '2', date: '2026-11-23', completed: true, brokeAfterNoon: false, checkInTime: 1, notes: '🙏 Abstinencia Completada' },
      { id: '3', date: '2026-11-22', completed: true, brokeAfterNoon: false, checkInTime: 1, notes: '🙏 禁欲完成' },
    ];
    assert.equal(isAbstinenceCompleted('🙏 Abstinence Completed'), true);
    assert.equal(isAbstinenceCompleted('🙏 Abstinencia Completada'), true);
    assert.equal(isAbstinenceCompleted('🙏 禁慾完成'), true);

    const graceStats = computeUserStats({
      checkInRecords: graceCheckIns,
      weightRecords: [
        { id: 'w2', date: '2026-11-24', weight: 68.5 },
        { id: 'w1', date: '2026-11-20', weight: 70.0 },
      ],
      practiceRecords: [
        { id: 'p1', date: '2026-11-24', type: 'meditation', duration: 30, timestamp: 1 },
        { id: 'p2', date: '2026-11-23', type: 'scripture_chanting', merit: 10, timestamp: 2 },
      ],
      fastingStats: { totalSessions: 1, totalMinutes: 720, currentStreak: 1, longestStreak: 1 },
      today,
    });
    assert.equal(graceStats.currentStreak, 3);
    assert.equal(graceStats.streakInGracePeriod, true);
    assert.equal(graceStats.currentAbstinenceStreak, 3);
    assert.equal(graceStats.totalWeightLost, 1.5);
    assert.ok(graceStats.achievements.includes('three_days'));
    assert.ok(graceStats.achievements.includes('weight_loss_1kg'));
    assert.ok(graceStats.achievements.includes('fasting_12h_session'));

    // Missed 2 full days before today (latest completed = 23) -> broken
    const brokenStats = computeUserStats({
      checkInRecords: [
        { id: '1', date: '2026-11-23', completed: true, brokeAfterNoon: false, checkInTime: 1 },
        { id: '2', date: '2026-11-22', completed: true, brokeAfterNoon: false, checkInTime: 1 },
      ],
      weightRecords: [],
      practiceRecords: [],
      fastingStats: { totalSessions: 0, totalMinutes: 0, currentStreak: 0, longestStreak: 0 },
      today,
    });
    assert.equal(brokenStats.currentStreak, 0);
    assert.equal(brokenStats.streakInGracePeriod, false);
  });

  await runSection('4. Retention tasks, daily rating, weekly summary & repair card', () => {
    const today = getLocalDateString();
    const yesterday = addLocalDays(today, -1);
    const checkIns: DailyCheckIn[] = [
      { id: '1', date: today, completed: true, brokeAfterNoon: false, checkInTime: 1 },
    ];
    const tasks = buildDailyTasks({
      date: today,
      language: 'zh',
      settings: {
        reminderTime: '21:00',
        dailyCalorieGoal: 2000,
        dailyWaterGoal: 2000,
        enableNotifications: true,
        weightUnit: 'kg',
        theme: 'auto',
        language: 'zh',
      },
      checkInRecords: checkIns,
      mealRecords: [{ id: 'm1', date: today, time: '11:30', name: 'Lunch', calories: 600, type: 'lunch' }],
      waterRecords: [{ id: 'w1', date: today, amount: 2000, time: '10:00' }],
      practiceRecords: [{ id: 'p1', date: today, type: 'meditation', duration: 15, timestamp: 1 }],
      fastingSessions: [],
      activeFasting: null,
      retentionState: DEFAULT_RETENTION_STATE,
    });
    const rating = calculateDailyRating(tasks, today);
    assert.ok(rating.stars >= 3);
    assert.equal(canRepairYesterday(checkIns).canRepair, true);
    assert.equal(canRepairYesterday(checkIns).date, yesterday);

    const weekly = buildWeeklySummary({
      language: 'zh',
      settings: {
        reminderTime: '21:00',
        dailyCalorieGoal: 2000,
        dailyWaterGoal: 2000,
        enableNotifications: true,
        weightUnit: 'kg',
        theme: 'auto',
        language: 'zh',
      },
      checkInRecords: checkIns,
      mealRecords: [],
      waterRecords: [],
      practiceRecords: [],
      fastingSessions: [],
      activeFasting: null,
      retentionState: DEFAULT_RETENTION_STATE,
      endDate: today,
    });
    assert.equal(weekly.checkInDays, 1);
  });

  await runSection('5. PartyKit server security, chat removal, scoped routing & friend stats', async () => {
    const room = new MockRoom();
    const server = new FastingServer(room as any);
    await server.onStart();

    const connA = new MockConnection('connA');
    const connB = new MockConnection('connB');
    const connC = new MockConnection('connC'); // bystander
    room.addConnection(connA);
    room.addConnection(connB);
    room.addConnection(connC);

    await server.onConnect(connA as any, {} as any);
    await server.onConnect(connB as any, {} as any);
    await server.onConnect(connC as any, {} as any);
    assert.equal('chatHistory' in connA.sent[0], false);

    await server.onMessage(JSON.stringify({ type: 'online', payload: { id: 'userA', nickname: 'Alice', activity: 'meditation', startedAt: Date.now() } }), connA as any);
    await server.onMessage(JSON.stringify({ type: 'online', payload: { id: 'userB', nickname: 'Bob', activity: 'fasting', startedAt: Date.now() } }), connB as any);
    await server.onMessage(JSON.stringify({ type: 'online', payload: { id: 'userC', nickname: 'Eve', activity: 'checkin', startedAt: Date.now() } }), connC as any);

    connA.sent.length = 0;
    connB.sent.length = 0;
    connC.sent.length = 0;

    // Legacy chat & privateMessage must be completely ignored
    await server.onMessage(JSON.stringify({ type: 'chat', payload: { userId: 'userA', nickname: 'Alice', text: 'hi' } }), connA as any);
    await server.onMessage(JSON.stringify({ type: 'privateMessage', payload: { fromUserId: 'userA', toUserId: 'userB', text: 'secret' } }), connA as any);
    assert.equal(connA.sent.length + connB.sent.length + connC.sent.length, 0);

    // Publish with inflated stats -> must be clamped
    await server.onMessage(
      JSON.stringify({
        type: 'publish',
        payload: {
          userId: 'userA',
          nickname: 'Alice',
          currentStreak: 5,
          fastingDaysThisWeek: 9999,
          fastingDaysThisMonth: 500,
          meditationMinutesThisWeek: 999999,
        },
      }),
      connA as any,
    );
    assert.equal(server.state.leaderboard['userA'].fastingDaysThisWeek, 7);
    assert.equal(server.state.leaderboard['userA'].fastingDaysThisMonth, 31);
    assert.equal(server.state.leaderboard['userA'].meditationMinutesThisWeek, 10080);

    // Spoofed removeUser from connB targeting userA must fail
    await server.onMessage(JSON.stringify({ type: 'removeUser', userId: 'userA' }), connB as any);
    assert.ok(server.state.leaderboard['userA']);

    // Scoped friend request & encouragement must NOT leak to bystander connC
    connA.sent.length = 0;
    connB.sent.length = 0;
    connC.sent.length = 0;
    await server.onMessage(
      JSON.stringify({ type: 'friendRequest', payload: { fromUserId: 'userA', fromNickname: 'Alice', toUserId: 'userB' } }),
      connA as any,
    );
    await server.onMessage(
      JSON.stringify({ type: 'friendEncouragement', payload: { fromUserId: 'userA', fromNickname: 'Alice', toUserId: 'userB', toNickname: 'Bob', kind: 'cheer' } }),
      connA as any,
    );
    assert.equal(connB.sent.some((m) => m.type === 'friendRequestReceived'), true);
    assert.equal(connB.sent.some((m) => m.type === 'friendEncouragementReceived'), true);
    assert.equal(connC.sent.length, 0, 'Bystander must receive zero friend requests or encouragements');

    // shareStats + getStats
    await server.onMessage(
      JSON.stringify({
        type: 'shareStats',
        payload: {
          userId: 'userA',
          nickname: 'Alice',
          streak: 12,
          totalMeditationMinutes: 300,
          totalMerit: 50,
          meditationSessionCount: 10,
          longestMeditationSession: 60,
          totalMeditationDays: 8,
        },
      }),
      connA as any,
    );
    connB.sent.length = 0;
    await server.onMessage(JSON.stringify({ type: 'getStats', userId: 'userA' }), connB as any);
    assert.equal(connB.sent[0]?.type, 'userStats');
    assert.equal(connB.sent[0]?.stats?.streak, 12);
    server.flushPendingBroadcasts();
  });

  await runSection('6. Stress Test A: computeUserStats on 10,000 days + 20,000 practices', () => {
    const today = '2026-11-26';
    const checkIns: DailyCheckIn[] = [];
    for (let i = 0; i < 10000; i++) {
      const date = addLocalDays(today, -i);
      checkIns.push({
        id: `c_${i}`,
        date,
        completed: i % 15 !== 0,
        brokeAfterNoon: i % 15 === 0,
        checkInTime: 1000 + i,
        notes: i % 2 === 0 ? '🙏 禁欲完成' : 'Abstinence Completed',
      });
    }
    const practices: PracticeRecord[] = [];
    for (let i = 0; i < 20000; i++) {
      practices.push({
        id: `p_${i}`,
        date: addLocalDays(today, -(i % 5000)),
        type: i % 2 === 0 ? 'meditation' : 'scripture_chanting',
        duration: i % 2 === 0 ? 15 : undefined,
        merit: i % 2 === 1 ? 10 : 0,
        timestamp: 1000 + i,
      });
    }
    const weights: WeightRecord[] = [];
    for (let i = 0; i < 2000; i++) {
      weights.push({ id: `w_${i}`, date: addLocalDays(today, -i), weight: 75 - i * 0.002 });
    }

    const t0 = performance.now();
    let result: any;
    for (let iter = 0; iter < 20; iter++) {
      result = computeUserStats({
        checkInRecords: checkIns,
        weightRecords: weights,
        practiceRecords: practices,
        fastingStats: { totalSessions: 500, totalMinutes: 45000, currentStreak: 12, longestStreak: 30 },
        today,
      });
    }
    const avgMs = (performance.now() - t0) / 20;
    console.log(`   -> computeUserStats avg latency (20 runs): ${avgMs.toFixed(2)} ms | completedDays=${result.completedDays}`);
    assert.ok(avgMs < 150, `computeUserStats too slow: ${avgMs.toFixed(2)} ms`);
    assert.ok(Number.isFinite(result.currentStreak) && !Number.isNaN(result.completionRate));
  });

  await runSection('7. Stress Test B: Retention + Leaderboard stats (5,000+ records)', () => {
    const today = getLocalDateString();
    const checkIns: DailyCheckIn[] = [];
    const meals: MealRecord[] = [];
    const water: WaterRecord[] = [];
    const practices: PracticeRecord[] = [];
    const sessions: FastingSession[] = [];

    for (let i = 0; i < 5000; i++) {
      const date = addLocalDays(today, -(i % 365));
      checkIns.push({ id: `c_${i}`, date, completed: true, brokeAfterNoon: false, checkInTime: i });
      meals.push({ id: `m_${i}`, date, time: '11:00', name: 'Lunch', calories: 550, type: 'lunch' });
      water.push({ id: `wa1_${i}`, date, amount: 500, time: '09:00' });
      water.push({ id: `wa2_${i}`, date, amount: 500, time: '14:00' });
      practices.push({ id: `p_${i}`, date, type: 'meditation', duration: 20, timestamp: i });
      if (i < 2000) {
        sessions.push({ id: `f_${i}`, startTime: 1, endTime: 2, durationHours: 16, status: 'completed', date });
      }
    }

    const t0 = performance.now();
    const weekly = buildWeeklySummary({
      language: 'zh',
      settings: {
        reminderTime: '21:00',
        dailyCalorieGoal: 2000,
        dailyWaterGoal: 2000,
        enableNotifications: true,
        weightUnit: 'kg',
        theme: 'auto',
        language: 'zh',
      },
      checkInRecords: checkIns,
      mealRecords: meals,
      waterRecords: water,
      practiceRecords: practices,
      fastingSessions: sessions,
      activeFasting: null,
      retentionState: DEFAULT_RETENTION_STATE,
      endDate: today,
    });
    const stats = computeUserStats({
      checkInRecords: checkIns,
      weightRecords: [],
      practiceRecords: practices,
      fastingStats: { totalSessions: 2000, totalMinutes: 1920000, currentStreak: 30, longestStreak: 60 },
      today,
    });
    const growth = buildGrowthProfile(stats, DEFAULT_RETENTION_STATE, weekly, 'zh');
    const lbEntry = calculatePeriodStats('u1', 'Tester', checkIns, practices, stats.currentStreak);
    const elapsed = performance.now() - t0;
    console.log(`   -> Retention + Leaderboard total latency: ${elapsed.toFixed(2)} ms | level=${growth.level} | lbWeek=${lbEntry.fastingDaysThisWeek}`);
    assert.ok(elapsed < 250, `Retention/leaderboard pipeline too slow: ${elapsed.toFixed(2)} ms`);
  });

  await runSection('8. Stress Test C: PartyKit Server 500 concurrent users concurrency + security blast', async () => {
    const room = new MockRoom();
    const server = new FastingServer(room as any);
    await server.onStart();

    const bystander = new MockConnection('bystander');
    room.addConnection(bystander);
    await server.onMessage(
      JSON.stringify({ type: 'online', payload: { id: 'bystander_user', nickname: 'Bystander', activity: 'checkin', startedAt: Date.now() } }),
      bystander as any,
    );
    bystander.sent.length = 0;

    const conns: MockConnection[] = [];
    for (let i = 0; i < 500; i++) {
      const c = new MockConnection(`c_${i}`, false);
      room.addConnection(c);
      conns.push(c);
    }

    const t0 = performance.now();
    // 500 online + 500 publish + 500 getLeaderboard + 500 friendRequests + 500 encouragements + 100 spoofed removeUser
    for (let i = 0; i < 500; i++) {
      const userId = `u_${i}`;
      const targetUserId = `u_${(i + 1) % 500}`;
      await server.onMessage(
        JSON.stringify({ type: 'online', payload: { id: userId, nickname: `User${i}`, activity: 'meditation', startedAt: Date.now() } }),
        conns[i] as any,
      );
      await server.onMessage(
        JSON.stringify({
          type: 'publish',
          payload: {
            userId,
            nickname: `User${i}`,
            currentStreak: i % 100,
            fastingDaysThisWeek: i % 8,
            fastingDaysThisMonth: i % 32,
            fastingDaysThisYear: i % 366,
            meditationMinutesThisWeek: i * 10,
            meditationMinutesThisMonth: i * 30,
            meditationMinutesThisYear: i * 100,
            meditationDaysThisMonth: i % 31,
            meditationDaysThisYear: i % 366,
            sessionCountThisWeek: i % 20,
          },
        }),
        conns[i] as any,
      );
      await server.onMessage(
        JSON.stringify({ type: 'friendRequest', payload: { fromUserId: userId, fromNickname: `User${i}`, toUserId: targetUserId } }),
        conns[i] as any,
      );
      await server.onMessage(
        JSON.stringify({ type: 'friendEncouragement', payload: { fromUserId: userId, fromNickname: `User${i}`, toUserId: targetUserId, toNickname: `User${(i + 1) % 500}`, kind: 'cheer' } }),
        conns[i] as any,
      );
      await server.onMessage(
        JSON.stringify({ type: 'getLeaderboard', category: 'meditation', period: 'weekly' }),
        conns[i] as any,
      );
      if (i < 100) {
        await server.onMessage(
          JSON.stringify({ type: 'removeUser', userId: targetUserId }),
          conns[i] as any,
        );
      }
    }
    const burstBroadcastCalls = room.broadcastCalls;
    assert.ok(burstBroadcastCalls < 20, `Broadcast storm detected: ${burstBroadcastCalls} calls`);
    server.flushPendingBroadcasts();
    const elapsedMs = performance.now() - t0;
    const totalOps = 500 * 5 + 100;
    const opsPerSec = Math.round((totalOps / elapsedMs) * 1000);

    // Check invariants
    assert.equal(Object.keys(server.state.leaderboard).length, 500);
    const top100 = server.getLeaderboard('meditation', 'weekly');
    assert.equal(top100.length, 100);
    for (let i = 1; i < top100.length; i++) {
      assert.ok(top100[i - 1].meditationMinutesThisWeek >= top100[i].meditationMinutesThisWeek);
    }

    const leakedToBystander = bystander.sent.filter(
      (m) => m.type === 'friendRequestReceived' || m.type === 'friendEncouragementReceived',
    );
    assert.equal(leakedToBystander.length, 0, 'Bystander leaked private friend events');

    console.log(`   -> PartyKit 500-user blast (${totalOps} ops): ${elapsedMs.toFixed(2)} ms (${opsPerSec} ops/sec) | burstBroadcasts=${burstBroadcastCalls} | totalBroadcasts=${room.broadcastCalls} | leaderboard=500 | leaks=0`);
  });

  await runSection('9. Fasting rhythm tiers, 4 physiological stages, 12 shichen & sundial state', () => {
    assert.equal(FASTING_TIERS.beginner.cutoffHour, 18);
    assert.equal(FASTING_TIERS.intermediate.cutoffHour, 15);
    assert.equal(FASTING_TIERS.classic.cutoffHour, 13);

    assert.equal(getRecommendedTier(0), 'beginner');
    assert.equal(getRecommendedTier(7), 'intermediate');
    assert.equal(getRecommendedTier(14), 'classic');

    assert.equal(getPhysiologicalStage(0).id, 'digestion');
    assert.equal(getPhysiologicalStage(2).id, 'digestion');
    assert.equal(getPhysiologicalStage(4).id, 'steady_glucose');
    assert.equal(getPhysiologicalStage(11.9).id, 'steady_glucose');
    assert.equal(getPhysiologicalStage(12).id, 'fat_burn');
    assert.equal(getPhysiologicalStage(15.9).id, 'fat_burn');
    assert.equal(getPhysiologicalStage(16).id, 'autophagy');
    assert.equal(getPhysiologicalStage(20).id, 'autophagy');

    const shichens = new Set<number>();
    for (let h = 0; h < 24; h++) {
      const sc = getChineseShichen(h);
      assert.ok(sc.nameZh && sc.nameEn);
      shichens.add(sc.index);
    }
    assert.equal(shichens.size, 12);

    const eatingNow = new Date(2026, 10, 26, 11, 30, 0);
    const eatState = getSundialRhythmState(eatingNow, 'classic', null);
    assert.equal(eatState.mode, 'eating');
    assert.equal(eatState.countdownMinutes, 90);

    const fastingNow = new Date(2026, 10, 26, 20, 0, 0);
    const fastState = getSundialRhythmState(fastingNow, 'classic', null);
    assert.equal(fastState.mode, 'fasting');
    assert.equal(fastState.fastingElapsedMinutes, 7 * 60);
    assert.equal(fastState.stage.id, 'steady_glucose');
  });

  await runSection('10. Solar terms 24-term full-year calendar resolution', () => {
    assert.equal(SOLAR_TERMS.length, 24);
    const seen = new Set<number>();
    for (let d = 0; d < 365; d++) {
      const dt = new Date(2026, 0, 1 + d);
      const info = getSolarTermInfo(dt);
      assert.ok(info.nameZh.length > 0 && info.quoteZh.length > 0 && info.sealText.length > 0);
      seen.add(info.index);
    }
    assert.equal(seen.size, 24);
  });

  await runSection('11. Cloud pilgrimage routes, valid sacredSites mapping & km milestones', () => {
    const validSiteIds = new Set(SACRED_SITES.map((s) => s.id));
    for (const route of PILGRIMAGE_ROUTES) {
      assert.ok(route.stops.length >= 5);
      for (const stop of route.stops) {
        assert.ok(validSiteIds.has(stop.siteId), `Missing SACRED_SITE id: ${stop.siteId}`);
      }
      const prog = computePilgrimageProgress(
        { completedDays: 5, totalMeditationMinutes: 150, totalSingleFastingSessions: 2 },
        route.id
      );
      assert.equal(prog.totalKm, calculatePilgrimageKm({ completedDays: 5, totalMeditationMinutes: 150, totalSingleFastingSessions: 2 }));
      assert.equal(prog.totalKm, 5 * 12 + 10 * 3 + 2 * 5);
      assert.ok(prog.unlockedStamps.length >= PILGRIMAGE_ROUTES.length);
      if (prog.nextStop) {
        assert.equal(prog.daysToNextStop, Math.ceil(prog.kmToNextStop / 12));
      }
    }
  });

  await runSection('12. PartyKit 500-user concurrency & security for Silent Room, Buddy Pact & Repair Gifts', async () => {
    const room = new MockRoom();
    const server = new FastingServer(room as any);
    await server.onStart();

    const aliceConn = new MockConnection('aliceConn');
    const bobConn = new MockConnection('bobConn');
    const eveConn = new MockConnection('eveConn');
    room.addConnection(aliceConn);
    room.addConnection(bobConn);
    room.addConnection(eveConn);

    await server.onMessage(
      JSON.stringify({ type: 'online', payload: { id: 'alice', nickname: 'Alice', activity: 'meditation', startedAt: Date.now() } }),
      aliceConn as any
    );
    await server.onMessage(
      JSON.stringify({ type: 'online', payload: { id: 'bob', nickname: 'Bob', activity: 'meditation', startedAt: Date.now() } }),
      bobConn as any
    );
    await server.onMessage(
      JSON.stringify({ type: 'online', payload: { id: 'eve', nickname: 'Eve', activity: 'meditation', startedAt: Date.now() } }),
      eveConn as any
    );

    aliceConn.sent.length = 0;
    bobConn.sent.length = 0;
    eveConn.sent.length = 0;

    // Arbitrary / free-text gesture must be rejected cleanly
    await server.onMessage(
      JSON.stringify({ type: 'silentGesture', payload: { userId: 'alice', nickname: 'Alice', gesture: 'free_text_chat' } }),
      aliceConn as any
    );
    assert.deepEqual(server.state.silentRoomCounts, { bow: 0, lamp: 0, bell: 0 });
    assert.deepEqual(server.state.silentRoomTodayCounts, { bow: 0, lamp: 0, bell: 0 });

    // Non-friend attempts must be rejected before friendship is established
    await server.onMessage(
      JSON.stringify({
        type: 'startBuddyChallenge',
        payload: { fromUserId: 'eve', fromNickname: 'Eve', toUserId: 'bob', toNickname: 'Bob', durationDays: 7, startDate: '2026-11-26' },
      }),
      eveConn as any
    );
    await server.onMessage(
      JSON.stringify({ type: 'giftRepairCard', payload: { fromUserId: 'eve', fromNickname: 'Eve', toUserId: 'bob' } }),
      eveConn as any
    );
    assert.equal(bobConn.sent.some((m) => m.type === 'buddyChallengesUpdate' || m.type === 'repairCardGiftReceived'), false);

    // Establish accepted friendship between alice and bob
    await server.onMessage(
      JSON.stringify({ type: 'friendRequest', payload: { fromUserId: 'alice', fromNickname: 'Alice', toUserId: 'bob' } }),
      aliceConn as any
    );
    const reqMsg = bobConn.sent.find((m) => m.type === 'friendRequestReceived');
    assert.ok(reqMsg?.request?.id);
    await server.onMessage(
      JSON.stringify({
        type: 'friendResponse',
        payload: { requestId: reqMsg.request.id, fromUserId: 'alice', toUserId: 'bob', status: 'accepted' },
      }),
      bobConn as any
    );
    bobConn.sent.length = 0;

    // Start 7-day buddy challenge + light lamp + gift repair card (must stay private to Alice/Bob)
    await server.onMessage(
      JSON.stringify({
        type: 'startBuddyChallenge',
        payload: { fromUserId: 'alice', fromNickname: 'Alice', toUserId: 'bob', toNickname: 'Bob', durationDays: 7, startDate: '2026-11-26' },
      }),
      aliceConn as any
    );
    await server.onMessage(
      JSON.stringify({ type: 'lightBuddyLamp', payload: { userId: 'bob', partnerUserId: 'alice', date: '2026-11-26' } }),
      bobConn as any
    );
    await server.onMessage(
      JSON.stringify({ type: 'giftRepairCard', payload: { fromUserId: 'alice', fromNickname: 'Alice', toUserId: 'bob' } }),
      aliceConn as any
    );
    // Spoofed gift pretending to be from alice sent on eveConn must be dropped
    await server.onMessage(
      JSON.stringify({ type: 'giftRepairCard', payload: { fromUserId: 'alice', fromNickname: 'Fake', toUserId: 'eve' } }),
      eveConn as any
    );

    assert.equal(bobConn.sent.some((m) => m.type === 'buddyChallengesUpdate'), true);
    assert.equal(bobConn.sent.some((m) => m.type === 'repairCardGiftReceived'), true);
    assert.equal(eveConn.sent.some((m) => m.type === 'buddyChallengesUpdate' || m.type === 'repairCardGiftReceived'), false);

    // Claim repair gifts by bob
    await server.onMessage(JSON.stringify({ type: 'claimRepairCardGifts', userId: 'bob' }), bobConn as any);
    assert.equal(server.state.pendingRepairCardGifts['bob'], undefined);

    // 500 concurrent silent gestures across 500 connections -> throttled broadcast + exact counter
    const blastConns: MockConnection[] = [];
    for (let i = 0; i < 500; i++) {
      const c = new MockConnection(`sg_${i}`, false);
      room.addConnection(c);
      blastConns.push(c);
    }
    const gestures = ['bow', 'lamp', 'bell'] as const;
    const t0 = performance.now();
    for (let i = 0; i < 500; i++) {
      await server.onMessage(
        JSON.stringify({
          type: 'silentGesture',
          payload: { userId: `suser_${i}`, nickname: `Zen${i}`, gesture: gestures[i % 3] },
        }),
        blastConns[i] as any
      );
      // Duplicate rapid click inside cooldown must be throttled per connection
      await server.onMessage(
        JSON.stringify({
          type: 'silentGesture',
          payload: { userId: `suser_${i}`, nickname: `Zen${i}`, gesture: gestures[i % 3] },
        }),
        blastConns[i] as any
      );
    }
    server.flushPendingBroadcasts();
    const elapsedMs = performance.now() - t0;
    const totalCounted =
      server.state.silentRoomCounts.bow +
      server.state.silentRoomCounts.lamp +
      server.state.silentRoomCounts.bell;
    const todayCounted =
      server.state.silentRoomTodayCounts.bow +
      server.state.silentRoomTodayCounts.lamp +
      server.state.silentRoomTodayCounts.bell;
    assert.equal(totalCounted, 500, `Expected 500 after per-connection cooldown, got ${totalCounted}`);
    assert.equal(todayCounted, 500, `Expected today 500, got ${todayCounted}`);
    console.log(`   -> Silent Room 500-user burst + cooldown (${elapsedMs.toFixed(2)} ms): total=${totalCounted}, today=${todayCounted}, recentEvents=${server.state.recentSilentGestures.length}`);
  });

  await runSection('13. Flexible weekly schedule, Pause Pass, and streak protection', () => {
    assert.equal(PAUSE_REASONS.length, 4);
    const flexSettings: Pick<UserSettings, 'fastingTier' | 'weeklySchedule' | 'pausePass'> = {
      fastingTier: 'classic',
      weeklySchedule: {
        0: 'rest',
        1: 'classic',
        2: 'intermediate',
        3: 'rest',
        4: 'beginner',
        5: 'classic',
        6: 'classic',
      },
      pausePass: {
        active: true,
        reason: 'travel',
        startDate: '2026-11-23',
        endDate: '2026-11-25',
      },
    };

    const pausedDay = getEffectiveDaySchedule(parseLocalDate('2026-11-24'), flexSettings);
    assert.equal(pausedDay.status, 'paused');
    assert.equal(pausedDay.pauseReason, 'travel');

    const sundayRest = getEffectiveDaySchedule(parseLocalDate('2026-11-22'), flexSettings);
    assert.equal(sundayRest.status, 'rest');

    const tuesdayLight = getEffectiveDaySchedule(parseLocalDate('2026-11-17'), flexSettings);
    assert.equal(tuesdayLight.status, 'active');
    assert.equal(tuesdayLight.tierId, 'intermediate');

    const thursdayBeginner = getEffectiveDaySchedule(parseLocalDate('2026-11-19'), flexSettings);
    assert.equal(thursdayBeginner.tierId, 'beginner');

    const protectedDates = getProtectedDates(flexSettings, '2026-11-27', 14);
    assert.ok(protectedDates.includes('2026-11-23'));
    assert.ok(protectedDates.includes('2026-11-24'));
    assert.ok(protectedDates.includes('2026-11-25'));
    assert.ok(protectedDates.includes('2026-11-22')); // Sunday rest day

    const records: DailyCheckIn[] = [
      { id: 'c1', date: '2026-11-20', completed: true, brokeAfterNoon: false, checkInTime: 1 },
      { id: 'c2', date: '2026-11-21', completed: true, brokeAfterNoon: false, checkInTime: 2 },
      // 2026-11-22 = Sunday rest, 23..25 = travel Pause Pass (0 check-ins)
      { id: 'c3', date: '2026-11-26', completed: true, brokeAfterNoon: false, checkInTime: 3 },
      { id: 'c4', date: '2026-11-27', completed: true, brokeAfterNoon: false, checkInTime: 4 },
    ];

    const protectedStats = computeUserStats({
      checkInRecords: records,
      weightRecords: [],
      practiceRecords: [],
      fastingStats: {
        totalSessions: 0,
        totalMinutes: 0,
        currentStreak: 0,
        longestStreak: 0,
      },
      today: '2026-11-27',
      protectedDates,
    });
    assert.equal(protectedStats.completedDays, 4, 'Protected days must not inflate completedDays');
    assert.equal(protectedStats.currentStreak, 4, 'Pause Pass + weekly rest days preserve currentStreak');
    assert.equal(protectedStats.longestStreak, 4);
  });

  await runSection('14. 4-dim wellness averages, waist delta & fasting-day comparison', () => {
    const wellness: WellnessRecord[] = [
      { id: 'w1', date: '2026-11-20', energy: 4, hunger: 3, mood: 4, sleep: 5, waistCm: 84.5, timestamp: 1 },
      { id: 'w2', date: '2026-11-22', energy: 3, hunger: 2, mood: 3, sleep: 3, timestamp: 2 },
      { id: 'w3', date: '2026-11-25', energy: 5, hunger: 4, mood: 5, sleep: 4, timestamp: 3 },
      { id: 'w4', date: '2026-11-27', energy: 4, hunger: 5, mood: 4, sleep: 5, waistCm: 82.0, timestamp: 4 },
    ];
    const checkIns: DailyCheckIn[] = [
      { id: 'f1', date: '2026-11-20', completed: true, brokeAfterNoon: false, checkInTime: 1 },
      { id: 'f2', date: '2026-11-27', completed: true, brokeAfterNoon: false, checkInTime: 2 },
      { id: 'f3', date: '2026-11-22', completed: false, brokeAfterNoon: true, checkInTime: 3 },
    ];

    const summary = computeWellnessSummary(wellness, checkIns, '2026-11-27');
    assert.equal(summary.totalRecords, 4);
    assert.equal(summary.recent7DaysCount, 3);
    assert.equal(summary.latestWaistCm, 82);
    assert.equal(summary.waistDeltaCm, 2.5);
    assert.equal(summary.fastingDaySleepAvg, 5);
    assert.equal(summary.nonFastingDaySleepAvg, 3.5);
    assert.equal(summary.fastingDayEnergyAvg, 4);
    assert.equal(summary.nonFastingDayEnergyAvg, 4);
  });

  await runSection('15. Seasonal Nutrition & Refeed Guide across all 24 solar terms', () => {
    const monthSamples = Array.from({ length: 12 }, (_, m) => [5, 20].map((d) => new Date(2026, m, d))).flat();
    const seenTerms = new Set<string>();
    const seenSeasons = new Set<string>();
    for (const date of monthSamples) {
      const guide = getSeasonalNutritionGuide(date);
      seenTerms.add(guide.solarTerm.nameZh);
      seenSeasons.add(guide.seasonZh);
      assert.ok(guide.mealCombosZh.length >= 2);
      assert.ok(guide.mealCombosEn.length >= 2);
      assert.ok(guide.refeedFirstBiteZh.length > 5);
      assert.ok(guide.afternoonDrinksZh.length >= 3);
    }
    assert.equal(seenSeasons.size, 4, 'All 4 seasonal nutrition profiles must be reachable');
    assert.ok(seenTerms.size >= 20, `Expected broad 24 solar-term coverage, got ${seenTerms.size}`);
  });

  await runSection('16. JSON Backup serialization & strict validation', () => {
    const json = serializeBackupPayload(
      {
        checkInRecords: [{ id: 'c1', date: '2026-11-27', completed: true, brokeAfterNoon: false, checkInTime: 100 }],
        mealRecords: [{ id: 'm1', date: '2026-11-27', time: '11:30', type: 'lunch', name: '杂粮饭', calories: 420 }],
        weightRecords: [{ id: 'wt1', date: '2026-11-27', weight: 65.2 }],
        waterRecords: [{ id: 'wa1', date: '2026-11-27', time: '15:00', amount: 250 }],
        practiceRecords: [],
        fastingSessions: [{ id: 'fs1', startTime: 1000, endTime: 58600000, durationHours: 16, status: 'completed', completedAt: 58600000, date: '2026-11-26' }],
        sacredSiteCheckIns: [],
        wellnessRecords: [{ id: 'w1', date: '2026-11-27', energy: 5, hunger: 4, mood: 5, sleep: 5, waistCm: 81.5, timestamp: 500 }],
        hungerRescueCount: 3,
      },
      '1.0.38'
    );

    const valid = parseAndValidateBackupPayload(json);
    assert.equal(valid.ok, true);
    if (valid.ok) {
      assert.equal(valid.summary.checkIns, 1);
      assert.equal(valid.summary.meals, 1);
      assert.equal(valid.summary.weights, 1);
      assert.equal(valid.summary.fastingSessions, 1);
      assert.equal(valid.summary.wellnessRecords, 1);
      assert.equal(valid.payload.data.hungerRescueCount, 3);
    }

    assert.equal(parseAndValidateBackupPayload('{bad json').ok, false);
    assert.equal(parseAndValidateBackupPayload(JSON.stringify({ schemaVersion: 99, data: {} })).ok, false);
    assert.equal(
      parseAndValidateBackupPayload(JSON.stringify({ schemaVersion: 1, data: { checkInRecords: 'not-array' } })).ok,
      false
    );
  });

  await runSection('17. iPhone Duo cover/unfolded & multi-form-factor responsive layout', () => {
    const standardPhone = computeResponsiveLayout(390, 844);
    assert.equal(standardPhone.formFactor, 'compact');
    assert.equal(standardPhone.isDualColumn, false);
    assert.equal(standardPhone.hingeGutter, 0);

    const proMax = computeResponsiveLayout(440, 956);
    assert.equal(proMax.formFactor, 'compact');
    assert.equal(proMax.isCompactHeight, false);

    // iPhone Duo Outer Cover Display (~466x678 pt, passport 1:1.45)
    const duoCover = computeResponsiveLayout(466, 678);
    assert.equal(duoCover.formFactor, 'duo_cover');
    assert.equal(duoCover.isDuoCover, true);
    assert.equal(duoCover.isDualColumn, false);
    assert.equal(duoCover.isCompactHeight, true);
    assert.equal(duoCover.hingeGutter, 0);
    assert.ok(duoCover.verticalScale < 1, 'Short cover screen should compact vertical rhythm');

    // iPhone Duo Unfolded Inner Display (~890x626 pt landscape foldable canvas)
    const duoUnfolded = computeResponsiveLayout(890, 626);
    assert.equal(duoUnfolded.formFactor, 'duo_unfolded');
    assert.equal(duoUnfolded.isDuoUnfolded, true);
    assert.equal(duoUnfolded.isFoldableExpanded, true);
    assert.equal(duoUnfolded.isDualColumn, true);
    assert.equal(duoUnfolded.isCompactHeight, true);
    assert.equal(duoUnfolded.hingeGutter, 28);
    assert.ok(duoUnfolded.columnWidth >= 380 && duoUnfolded.columnWidth < 460);
    assert.ok(duoUnfolded.chartWidth <= 720);

    const ipad = computeResponsiveLayout(820, 1180);
    assert.equal(ipad.formFactor, 'tablet');
    assert.equal(ipad.isDualColumn, true);
    assert.equal(ipad.hingeGutter, 20);
  });

  await runSection('18. Seven Luminaries 24h duty cycle, WangXiang & 12-Shichen meridian flow', () => {
    for (const origin of ['sunrise_6', 'midnight_0'] as const) {
      const seenHours: string[] = [];
      for (let d = 0; d < 7; d++) {
        for (let h = 0; h < 24; h++) {
          const dt = new Date(2026, 10, 22 + d, h, 0, 0); // 2026-11-22 is Sunday
          const snap = getQiZhengHourSnapshot(dt, origin);
          seenHours.push(snap.luminary.id);
          if ((origin === 'sunrise_6' && h === 6) || (origin === 'midnight_0' && h === 0)) {
            assert.equal(
              snap.luminary.id,
              WEEKDAY_RULER[dt.getDay()],
              `Day ${dt.getDay()} start hour must belong to weekday ruler (${origin})`
            );
          }
        }
      }
      // Every consecutive hour across 168h advances strictly by +1 mod 7 in CHALDEAN_ORDER
      for (let i = 1; i < seenHours.length; i++) {
        const prevIdx = CHALDEAN_ORDER.indexOf(seenHours[i - 1] as any);
        const curIdx = CHALDEAN_ORDER.indexOf(seenHours[i] as any);
        assert.equal(curIdx, (prevIdx + 1) % 7, `Continuity broken at step ${i} (${origin})`);
      }
    }

    const season = getSeasonalElement(new Date(2026, 10, 27, 15, 0, 0));
    const allElements: FiveElement[] = ['wood', 'fire', 'earth', 'metal', 'water'];
    const states = new Set(allElements.map((el) => getWangXiangStatus(el, season.element).state));
    assert.equal(states.size, 5, 'All 5 Wang/Xiang/Xiu/Qiu/Si states must exist in every season');

    const schedule24 = getQiZheng24HourSchedule(new Date(2026, 10, 27), 'sunrise_6');
    assert.equal(schedule24.length, 24);
    const uniqueMeridians = new Set(schedule24.map((s) => s.meridian.organZh));
    assert.equal(uniqueMeridians.size, 12, '24h schedule must traverse all 12 meridian organs');
  });

  await runSection('19. English & Western localization parity, 12h clock, QiZheng clean EN, and zero leaks', () => {
    const cjkRegex = /[\u4e00-\u9fff]/;

    assert.equal(formatClockHour(0, false), '12:00 AM');
    assert.equal(formatClockHour(13, false), '1:00 PM');
    assert.equal(formatClockHour(18, false, true), '6 PM');
    assert.equal(formatClockHour(18, true), '18:00');

    const schedule = getQiZheng24HourSchedule(new Date(2026, 10, 27), 'sunrise_6');
    for (const slot of schedule) {
      const enFields = [
        slot.hourLabelEn,
        slot.luminary.shortEn,
        slot.luminary.nameEn,
        slot.luminary.organEn,
        slot.luminary.breathCueEn,
        slot.wangXiang.shortEn,
        slot.wangXiang.labelEn,
        slot.wangXiang.guidanceEn,
        slot.meridian.organEn,
        slot.meridian.organShortEn,
        slot.meridian.hourRangeEn,
        slot.meridian.qiFlowEn,
        slot.meridian.fastingActionEn,
        slot.resonanceEn,
      ];
      for (const val of enFields) {
        assert.ok(val && val.length > 0, 'All English QiZheng fields must be non-empty');
        assert.equal(cjkRegex.test(val), false, `Unexpected CJK character in EN field: "${val}"`);
      }
    }

    assert.equal(isAbstinenceCompleted('🙏 Mindful Restraint Completed'), true);
    assert.equal(isAbstinenceCompleted('Abstinence Completed'), true);

    const foodEntries = Object.entries(CALORIE_REFERENCES_EN);
    assert.ok(foodEntries.length >= 10, `Expected >= 10 EN food presets, got ${foodEntries.length}`);
    for (const [name, kcal] of foodEntries) {
      assert.equal(cjkRegex.test(name), false, `Unexpected CJK in CALORIE_REFERENCES_EN key: "${name}"`);
      assert.ok(Number.isFinite(kcal) && kcal >= 0, `Invalid kcal for "${name}": ${kcal}`);
    }

    const enValues = Object.values(translations.en).join('\n');
    assert.equal(/WeChat/i.test(enValues), false, 'translations.en must not mention WeChat');
    assert.equal(/\bMoments\b/.test(enValues), false, 'translations.en must not mention WeChat Moments');
  });

  await runSection('20. OS locale auto-detection (EN/ES/ZH-Hans/ZH-Hant) & Spanish localization parity', () => {
    const cjkRegex = /[\u4e00-\u9fff]/;

    assert.deepEqual(
      resolveDeviceLocale([{ languageCode: 'en', languageTag: 'en-US', regionCode: 'US', measurementSystem: 'us' }]),
      { language: 'en', weightUnit: 'lb' }
    );
    assert.deepEqual(
      resolveDeviceLocale([{ languageCode: 'en', languageTag: 'en-GB', regionCode: 'GB', measurementSystem: 'uk' }]),
      { language: 'en', weightUnit: 'kg' }
    );
    assert.deepEqual(
      resolveDeviceLocale([{ languageCode: 'es', languageTag: 'es-ES', regionCode: 'ES', measurementSystem: 'metric' }]),
      { language: 'es', weightUnit: 'kg' }
    );
    assert.deepEqual(
      resolveDeviceLocale([{ languageCode: 'es', languageTag: 'es-MX', regionCode: 'MX', measurementSystem: 'metric' }]),
      { language: 'es', weightUnit: 'kg' }
    );
    assert.deepEqual(
      resolveDeviceLocale([{ languageCode: 'es', languageTag: 'es-US', regionCode: 'US', measurementSystem: 'us' }]),
      { language: 'es', weightUnit: 'lb' }
    );
    assert.deepEqual(
      resolveDeviceLocale([{ languageCode: 'zh', languageTag: 'zh-Hans-CN', languageScriptCode: 'Hans', regionCode: 'CN', measurementSystem: 'metric' }]),
      { language: 'zh', weightUnit: 'kg' }
    );
    assert.deepEqual(
      resolveDeviceLocale([{ languageCode: 'zh', languageTag: 'zh-Hant-TW', languageScriptCode: 'Hant', regionCode: 'TW', measurementSystem: 'metric' }]),
      { language: 'zh-Hant', weightUnit: 'kg' }
    );
    assert.deepEqual(
      resolveDeviceLocale([{ languageCode: 'zh', languageTag: 'zh-HK', regionCode: 'HK' }]),
      { language: 'zh-Hant', weightUnit: 'kg' }
    );
    assert.equal(resolveDeviceLocale([{ languageCode: 'fr', languageTag: 'fr-FR' }]).language, 'fr');
    assert.equal(resolveDeviceLocale([{ languageCode: 'de', languageTag: 'de-DE' }]).language, 'de');
    assert.deepEqual(resolveDeviceLocale([{ languageCode: 'xx', languageTag: 'xx-ZZ' }]), { language: 'en', weightUnit: 'kg' });
    assert.deepEqual(resolveDeviceLocale([]), { language: 'en', weightUnit: 'lb' });

    const esFoodEntries = Object.entries(CALORIE_REFERENCES_ES);
    assert.ok(esFoodEntries.length >= 12, `Expected >= 12 ES food presets, got ${esFoodEntries.length}`);
    for (const [name, kcal] of esFoodEntries) {
      assert.equal(cjkRegex.test(name), false, `Unexpected CJK in CALORIE_REFERENCES_ES key: "${name}"`);
      assert.ok(Number.isFinite(kcal) && kcal >= 0);
    }

    const esValues = Object.values(translations.es).join('\n');
    assert.equal(/WeChat/i.test(esValues), false, 'translations.es must not mention WeChat');
    assert.equal(/\bDharma\b/i.test(esValues), false, 'translations.es must not use raw Dharma jargon');

    assert.equal(isAbstinenceCompleted('🙏 Autocontrol Consciente'), true);

    for (const g of FASTING_GOALS) {
      assert.ok(g.titleEs && g.titleEs.length > 0 && g.subtitleEs && g.subtitleEs.length > 0);
    }
    for (const tier of Object.values(FASTING_TIERS)) {
      assert.ok(tier.nameEs && tier.windowEs && tier.descEs);
    }
  });

  await runSection('21. World map Natural Earth geometry, Robinson projection & 1x default view', () => {
    assert.equal(MAP_WIDTH, 720);
    assert.equal(MAP_HEIGHT, 400);
    assert.ok(WORLD_LAND_PATHS.length >= 80, `Expected >= 80 land paths, got ${WORLD_LAND_PATHS.length}`);
    assert.ok(WORLD_LAKE_PATHS.length >= 10, `Expected >= 10 lake paths, got ${WORLD_LAKE_PATHS.length}`);

    const origin = projectLonLat(0, 0);
    assert.equal(Math.round(origin.x), 360);
    assert.equal(Math.round(origin.y), 200);

    const landmarks: Array<[string, number, number]> = [
      ['Beijing', 116.4074, 39.9042],
      ['Kyoto', 135.7681, 35.0116],
      ['New York', -74.006, 40.7128],
      ['London', -0.1276, 51.5072],
      ['Sydney', 151.2093, -33.8688],
    ];
    for (const [label, lon, lat] of landmarks) {
      const pt = projectLonLat(lon, lat);
      assert.ok(pt.x > 0 && pt.x < MAP_WIDTH, `${label} x out of bounds: ${pt.x}`);
      assert.ok(pt.y > 0 && pt.y < MAP_HEIGHT, `${label} y out of bounds: ${pt.y}`);
    }

    const templeMapSrc = fs.readFileSync(
      path.resolve(__dirname, '../src/screens/TempleMapScreen.tsx'),
      'utf8'
    );
    assert.equal(templeMapSrc.includes('DEFAULT_CHINA_MAP_ZOOM = 20'), false, 'Must not force 20x default zoom');
    assert.ok(templeMapSrc.includes('DEFAULT_MAP_ZOOM = MIN_MAP_ZOOM'), 'Default map zoom must be 1x');
    assert.ok(templeMapSrc.includes("useState<MapRegionFilter>('all')"), 'Default region filter must show global world view');
  });

  console.log('\nALL VERIFICATION & STRESS TESTS PASSED');
}

main().catch((err) => {
  console.error('TEST FAILED:', err);
  process.exit(1);
});
