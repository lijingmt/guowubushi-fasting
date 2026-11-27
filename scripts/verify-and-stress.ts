import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import {
  addLocalDays,
  diffLocalDays,
  getLocalDateString,
  getLocalWeekKey,
  parseLocalDate,
} from '../src/utils/date';
import { computeUserStats, isAbstinenceCompleted } from '../src/utils/stats';
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
  FASTING_TIERS,
  getChineseShichen,
  getPhysiologicalStage,
  getRecommendedTier,
  getSundialRhythmState,
} from '../src/utils/fastingRhythm';
import { SOLAR_TERMS, getSolarTermInfo } from '../src/utils/solarTerm';
import { PILGRIMAGE_ROUTES, calculatePilgrimageKm, computePilgrimageProgress } from '../src/utils/pilgrimage';
import { SACRED_SITES } from '../src/data/sacredSites';
import FastingServer from '../partykit/server';
import type {
  DailyCheckIn,
  FastingSession,
  MealRecord,
  PracticeRecord,
  WaterRecord,
  WeightRecord,
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

  console.log('\nALL VERIFICATION & STRESS TESTS PASSED');
}

main().catch((err) => {
  console.error('TEST FAILED:', err);
  process.exit(1);
});
