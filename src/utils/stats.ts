import { ACHIEVEMENTS, DINNER_CALORIES } from '../constants/achievements';
import type { DailyCheckIn, PracticeRecord, UserStats, WeightRecord } from '../types';
import { diffLocalDays, getLocalDateString, isValidDateString } from './date';

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
  'abstinencia completada',
];

/**
 * Detects whether check-in notes record completed abstinence in any supported language.
 */
export function isAbstinenceCompleted(notes?: string): boolean {
  if (!notes) return false;
  const normalized = notes.toLowerCase();
  return ABSTINENCE_MARKERS.some((marker) => normalized.includes(marker));
}

function computeStreakWithGrace(
  descendingDates: string[],
  today: string,
  gracePeriod: number,
): { currentStreak: number; longestStreak: number; inGracePeriod: boolean } {
  if (descendingDates.length === 0) {
    return { currentStreak: 0, longestStreak: 0, inGracePeriod: false };
  }

  // Compute longest streak across full history.
  let longestStreak = 1;
  let run = 1;
  let graceUsed = 0;

  for (let i = 1; i < descendingDates.length; i++) {
    const diff = diffLocalDays(descendingDates[i - 1], descendingDates[i]);
    if (diff === 1) {
      run += 1;
      graceUsed = 0;
    } else if (diff > 1 && diff - 1 + graceUsed <= gracePeriod) {
      run += 1;
      graceUsed += diff - 1;
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

  const gapFromToday = diffLocalDays(today, pastDates[0]);
  if (gapFromToday > gracePeriod + 1) {
    return { currentStreak: 0, longestStreak, inGracePeriod: false };
  }

  let currentStreak = 1;
  let currentGraceUsed = gapFromToday > 1 ? gapFromToday - 1 : 0;

  for (let i = 1; i < pastDates.length; i++) {
    const diff = diffLocalDays(pastDates[i - 1], pastDates[i]);
    if (diff === 1) {
      currentStreak += 1;
      currentGraceUsed = 0;
    } else if (diff > 1 && diff - 1 + currentGraceUsed <= gracePeriod) {
      currentStreak += 1;
      currentGraceUsed += diff - 1;
    } else {
      break;
    }
  }

  const inGracePeriod = currentStreak > 0 && gapFromToday === gracePeriod + 1;
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
}: {
  checkInRecords: DailyCheckIn[];
  weightRecords: WeightRecord[];
  practiceRecords: PracticeRecord[];
  fastingStats: FastingStatsInput;
  today?: string;
}): UserStats {
  const totalCheckInDays = checkInRecords.length;
  const completedRecords = checkInRecords.filter((r) => r.completed);
  const completedDays = completedRecords.length;

  const completedDatesDesc = getUniqueSortedDatesDesc(completedRecords.map((r) => r.date));
  const fastingStreak = computeStreakWithGrace(completedDatesDesc, today, 1);

  const abstinenceDatesDesc = getUniqueSortedDatesDesc(
    completedRecords.filter((r) => isAbstinenceCompleted(r.notes)).map((r) => r.date),
  );
  const abstinenceStreak = computeStreakWithGrace(abstinenceDatesDesc, today, 1);

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
