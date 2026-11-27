import { ACHIEVEMENTS, DINNER_CALORIES } from '../constants/achievements';
import type { DailyCheckIn, PracticeRecord, UserStats, WeightRecord } from '../types';
import { addLocalDays, diffLocalDays, getLocalDateString, isValidDateString } from './date';

export interface FastingStatsInput {
  totalSessions: number;
  totalMinutes: number;
  currentStreak: number;
  longestStreak: number;
}

const ABSTINENCE_MARKERS = [
  '禁欲完成',
  '禁慾完成',
  'abstinence completed',
  'mindful restraint',
  'abstinencia completada',
  'autocontrol consciente',
];

/**
 * Detects whether check-in notes record completed abstinence in any supported language.
 */
export function isAbstinenceCompleted(notes?: string): boolean {
  if (!notes) return false;
  const normalized = notes.toLowerCase();
  return ABSTINENCE_MARKERS.some((marker) => normalized.includes(marker));
}

function countUnprotectedGapDays(
  newerDate: string,
  olderDate: string,
  protectedDates: Set<string>,
  inclusiveToday = false
): number {
  const diff = diffLocalDays(newerDate, olderDate);
  if (diff <= (inclusiveToday ? 0 : 1)) return 0;
  let unprotected = 0;
  const maxOffset = inclusiveToday ? diff - 1 : diff - 1;
  const startOffset = inclusiveToday ? 0 : 1;
  for (let offset = startOffset; offset <= maxOffset; offset++) {
    const gapDate = addLocalDays(newerDate, -offset);
    if (!protectedDates.has(gapDate)) {
      unprotected += 1;
    }
  }
  return unprotected;
}

function computeStreakWithGrace(
  descendingDates: string[],
  today: string,
  gracePeriod: number,
  protectedDates: Set<string> = new Set(),
): { currentStreak: number; longestStreak: number; inGracePeriod: boolean } {
  if (descendingDates.length === 0) {
    return { currentStreak: 0, longestStreak: 0, inGracePeriod: false };
  }

  // Compute longest streak across full history.
  let longestStreak = 1;
  let run = 1;
  let graceUsed = 0;

  for (let i = 1; i < descendingDates.length; i++) {
    const unprotectedGap = countUnprotectedGapDays(descendingDates[i - 1], descendingDates[i], protectedDates);
    if (unprotectedGap === 0) {
      run += 1;
      graceUsed = 0;
    } else if (unprotectedGap + graceUsed <= gracePeriod) {
      run += 1;
      graceUsed += unprotectedGap;
    } else {
      if (run > longestStreak) longestStreak = run;
      run = 1;
      graceUsed = 0;
    }
  }
  if (run > longestStreak) longestStreak = run;

  // Compute current streak anchored at `today` without overwriting from older runs.
  const pastDates = descendingDates.filter((d) => d <= today);
  if (pastDates.length === 0) {
    return { currentStreak: 0, longestStreak, inGracePeriod: false };
  }

  // Gap from yesterday down to pastDates[0] determines whether grace/pause covers missing days before today.
  const gapBeforeToday =
    pastDates[0] === today
      ? 0
      : 1 + countUnprotectedGapDays(addLocalDays(today, -1), pastDates[0], protectedDates, true);
  // Actually count unprotected missed days strictly in (pastDates[0], today):
  const unprotectedFromYesterday =
    pastDates[0] === today
      ? 0
      : (protectedDates.has(addLocalDays(today, -1)) ? 0 : (pastDates[0] === addLocalDays(today, -1) ? 0 : 1)) +
        countUnprotectedGapDays(today, pastDates[0], protectedDates, false) * 0;
  // Clean exact count of unprotected days between (pastDates[0], today):
  let missedBeforeToday = 0;
  if (pastDates[0] < today) {
    const yesterday = addLocalDays(today, -1);
    let cursor = yesterday;
    let steps = 0;
    while (cursor > pastDates[0] && steps < 420) {
      if (!protectedDates.has(cursor)) {
        missedBeforeToday += 1;
      }
      cursor = addLocalDays(cursor, -1);
      steps += 1;
    }
    // If today itself is not completed and neither today nor yesterday broke grace:
  }
  void gapBeforeToday;
  void unprotectedFromYesterday;

  // Gap rule matching original semantics:
  // gapFromToday = (today completed ? 0 : (yesterday completed or protected? check unprotected days since pastDates[0]))
  // Specifically: count unprotected days in [pastDates[0]+1 .. today-1]; if today not completed, user still has today open unless yesterday was ALSO missed & unprotected!
  if (missedBeforeToday > gracePeriod) {
    return { currentStreak: 0, longestStreak, inGracePeriod: false };
  }

  let currentStreak = 1;
  let currentGraceUsed = missedBeforeToday;

  for (let i = 1; i < pastDates.length; i++) {
    const unprotectedGap = countUnprotectedGapDays(pastDates[i - 1], pastDates[i], protectedDates);
    if (unprotectedGap === 0) {
      currentStreak += 1;
      currentGraceUsed = 0;
    } else if (unprotectedGap + currentGraceUsed <= gracePeriod) {
      currentStreak += 1;
      currentGraceUsed += unprotectedGap;
    } else {
      break;
    }
  }

  const inGracePeriod = currentStreak > 0 && pastDates[0] < today && missedBeforeToday === gracePeriod && gracePeriod > 0;
  return { currentStreak, longestStreak, inGracePeriod };
}

function getUniqueSortedDatesDesc(dates: string[]): string[] {
  return Array.from(new Set(dates.filter(isValidDateString))).sort((a, b) => b.localeCompare(a));
}

/**
 * Pure statistics calculation engine for check-ins, practice, weight, fasting, and achievements.
 */
export function computeUserStats({
  checkInRecords,
  weightRecords,
  practiceRecords,
  fastingStats,
  today = getLocalDateString(),
  protectedDates = [],
}: {
  checkInRecords: DailyCheckIn[];
  weightRecords: WeightRecord[];
  practiceRecords: PracticeRecord[];
  fastingStats: FastingStatsInput;
  today?: string;
  protectedDates?: string[];
}): UserStats {
  const protectedSet = new Set(protectedDates.filter(isValidDateString));
  const totalCheckInDays = checkInRecords.length;
  const completedRecords = checkInRecords.filter((r) => r.completed);
  const completedDays = completedRecords.length;

  const completedDatesDesc = getUniqueSortedDatesDesc(completedRecords.map((r) => r.date));
  const fastingStreak = computeStreakWithGrace(completedDatesDesc, today, 1, protectedSet);

  const abstinenceDatesDesc = getUniqueSortedDatesDesc(
    completedRecords.filter((r) => isAbstinenceCompleted(r.notes)).map((r) => r.date),
  );
  const abstinenceStreak = computeStreakWithGrace(abstinenceDatesDesc, today, 1, protectedSet);

  const totalCaloriesSaved = completedDays * DINNER_CALORIES;
  const totalMealsSkipped = completedDays;
  const totalHoursSaved = completedDays * 2;

  let totalWeightLost = 0;
  if (weightRecords.length >= 2) {
    const sortedWeights = [...weightRecords].sort((a, b) => a.date.localeCompare(b.date));
    const diff = sortedWeights[0].weight - sortedWeights[sortedWeights.length - 1].weight;
    totalWeightLost = diff > 0 ? Number(diff.toFixed(2)) : 0;
  }

  const completionRate = totalCheckInDays > 0 ? Math.round((completedDays / totalCheckInDays) * 100) : 0;

  const meditationRecords = practiceRecords.filter((r) => r.type === 'meditation');
  const meditationDatesDesc = getUniqueSortedDatesDesc(meditationRecords.map((r) => r.date));
  const totalMeditationDays = meditationDatesDesc.length;
  const totalMeditationMinutes = meditationRecords.reduce((sum, r) => sum + (r.duration || 0), 0);
  const meditationSessionCount = meditationRecords.length;
  const longestMeditationSession = meditationRecords.length > 0
    ? Math.max(...meditationRecords.map((r) => r.duration || 0))
    : 0;
  const meditationStreak = computeStreakWithGrace(meditationDatesDesc, today, 0);

  const standingRecords = practiceRecords.filter((r) => r.type === 'standing_meditation');
  const totalStandingMeditationDays = new Set(standingRecords.map((r) => r.date)).size;
  const totalStandingMeditationMinutes = standingRecords.reduce((sum, r) => sum + (r.duration || 0), 0);

  const totalMerit = practiceRecords.reduce((sum, r) => {
    if (r.type === 'scripture_chanting') return sum + 10;
    if (r.type === 'scripture_listening') return sum + 5;
    return sum;
  }, 0);

  const fastingCaloriesSaved = Math.round(fastingStats.totalMinutes * (70 / 60));
  const fastingEstimatedWeightLoss = parseFloat((fastingCaloriesSaved / 7700).toFixed(2));

  const baseStats: UserStats = {
    totalCheckInDays,
    completedDays,
    currentStreak: fastingStreak.currentStreak,
    longestStreak: fastingStreak.longestStreak,
    totalMealsSkipped,
    totalCaloriesSaved,
    totalWeightLost,
    achievements: [],
    completionRate,
    totalHoursSaved,
    currentAbstinenceStreak: abstinenceStreak.currentStreak,
    longestAbstinenceStreak: abstinenceStreak.longestStreak,
    streakInGracePeriod: fastingStreak.inGracePeriod,
    totalMeditationMinutes,
    totalMeditationDays,
    longestMeditationStreak: meditationStreak.longestStreak,
    meditationSessionCount,
    longestMeditationSession,
    totalStandingMeditationMinutes,
    totalStandingMeditationDays,
    totalMerit,
    totalSingleFastingSessions: fastingStats.totalSessions,
    totalSingleFastingMinutes: fastingStats.totalMinutes,
    currentSingleFastingStreak: fastingStats.currentStreak,
    longestSingleFastingStreak: fastingStats.longestStreak,
    fastingCaloriesSaved,
    fastingEstimatedWeightLoss,
  };

  baseStats.achievements = ACHIEVEMENTS.filter((achievement) => achievement.condition(baseStats)).map(
    (achievement) => achievement.id,
  );

  return baseStats;
}
