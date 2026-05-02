import type { DailyCheckIn, PracticeRecord, LeaderboardEntry } from '../types';

export function calculatePeriodStats(
  userId: string,
  nickname: string,
  checkInRecords: DailyCheckIn[],
  practiceRecords: PracticeRecord[],
  currentStreak: number,
): LeaderboardEntry {
  const now = new Date();
  const today = now.toISOString().split('T')[0];

  // Week: Monday to Sunday
  const weekStart = getStartOfWeek(now);
  const weekStartStr = formatDate(weekStart);

  // Month: 1st to end
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthStartStr = formatDate(monthStart);

  // Year: Jan 1
  const yearStart = new Date(now.getFullYear(), 0, 1);
  const yearStartStr = formatDate(yearStart);

  // Fasting days in each period
  const fastingDaysThisWeek = checkInRecords.filter(
    (r) => r.completed && r.date >= weekStartStr && r.date <= today
  ).length;

  const fastingDaysThisMonth = checkInRecords.filter(
    (r) => r.completed && r.date >= monthStartStr && r.date <= today
  ).length;

  const fastingDaysThisYear = checkInRecords.filter(
    (r) => r.completed && r.date >= yearStartStr && r.date <= today
  ).length;

  // Meditation records in each period
  const meditationRecords = practiceRecords.filter(
    (r) => r.type === 'meditation'
  );

  const weekMeditation = meditationRecords.filter(
    (r) => r.date >= weekStartStr && r.date <= today
  );
  const monthMeditation = meditationRecords.filter(
    (r) => r.date >= monthStartStr && r.date <= today
  );
  const yearMeditation = meditationRecords.filter(
    (r) => r.date >= yearStartStr && r.date <= today
  );

  const meditationMinutesThisWeek = weekMeditation.reduce(
    (sum, r) => sum + (r.duration || 0), 0
  );
  const meditationMinutesThisMonth = monthMeditation.reduce(
    (sum, r) => sum + (r.duration || 0), 0
  );
  const meditationMinutesThisYear = yearMeditation.reduce(
    (sum, r) => sum + (r.duration || 0), 0
  );

  const meditationDaysThisMonth = new Set(monthMeditation.map((r) => r.date)).size;
  const meditationDaysThisYear = new Set(yearMeditation.map((r) => r.date)).size;
  const sessionCountThisWeek = weekMeditation.length;

  return {
    userId,
    nickname,
    lastUpdate: Date.now(),
    currentStreak,
    fastingDaysThisWeek,
    fastingDaysThisMonth,
    fastingDaysThisYear,
    meditationMinutesThisWeek,
    meditationMinutesThisMonth,
    meditationMinutesThisYear,
    meditationDaysThisMonth,
    meditationDaysThisYear,
    sessionCountThisWeek,
  };
}

function getStartOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
