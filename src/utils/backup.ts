import type { BackupPayload, DailyCheckIn, WellnessRecord } from '../types';
import { addLocalDays, getLocalDateString } from './date';

export interface BackupSummary {
  checkIns: number;
  meals: number;
  weights: number;
  practices: number;
  fastingSessions: number;
  wellnessRecords: number;
  sacredCheckIns: number;
}

export type BackupParseResult =
  | { ok: true; payload: BackupPayload; summary: BackupSummary }
  | { ok: false; error: string };

/**
 * Serializes local user records into a portable versioned JSON backup string.
 */
export function serializeBackupPayload(
  data: BackupPayload['data'],
  appVersion: string = '1.0.38'
): string {
  const payload: BackupPayload = {
    schemaVersion: 1,
    exportedAt: Date.now(),
    appVersion,
    data,
  };
  return JSON.stringify(payload, null, 2);
}

/**
 * Parses and strictly validates a JSON backup string before touching local storage.
 */
export function parseAndValidateBackupPayload(rawJson: string): BackupParseResult {
  if (!rawJson || typeof rawJson !== 'string' || !rawJson.trim()) {
    return { ok: false, error: 'Backup JSON is empty.' };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJson.trim());
  } catch {
    return { ok: false, error: 'Invalid JSON syntax.' };
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { ok: false, error: 'Backup root must be a JSON object.' };
  }

  const candidate = parsed as Partial<BackupPayload>;
  if (candidate.schemaVersion !== 1) {
    return { ok: false, error: `Unsupported schemaVersion: ${String(candidate.schemaVersion)}` };
  }
  if (!candidate.data || typeof candidate.data !== 'object' || Array.isArray(candidate.data)) {
    return { ok: false, error: 'Missing valid data object in backup.' };
  }

  const d = candidate.data;
  const arrayFields: (keyof BackupPayload['data'])[] = [
    'checkInRecords',
    'mealRecords',
    'weightRecords',
    'waterRecords',
    'practiceRecords',
    'fastingSessions',
    'sacredSiteCheckIns',
    'wellnessRecords',
  ];
  for (const field of arrayFields) {
    if (d[field] !== undefined && !Array.isArray(d[field])) {
      return { ok: false, error: `Invalid array field: ${field}` };
    }
  }

  const payload: BackupPayload = {
    schemaVersion: 1,
    exportedAt: typeof candidate.exportedAt === 'number' ? candidate.exportedAt : Date.now(),
    appVersion: typeof candidate.appVersion === 'string' ? candidate.appVersion.slice(0, 32) : '1.0.38',
    data: {
      settings: d.settings,
      checkInRecords: d.checkInRecords || [],
      mealRecords: d.mealRecords || [],
      weightRecords: d.weightRecords || [],
      waterRecords: d.waterRecords || [],
      practiceRecords: d.practiceRecords || [],
      fastingSessions: d.fastingSessions || [],
      retentionState: d.retentionState,
      sacredSiteCheckIns: d.sacredSiteCheckIns || [],
      wellnessRecords: d.wellnessRecords || [],
      hungerRescueCount: typeof d.hungerRescueCount === 'number' ? Math.max(0, Math.floor(d.hungerRescueCount)) : 0,
    },
  };

  const summary: BackupSummary = {
    checkIns: payload.data.checkInRecords?.length || 0,
    meals: payload.data.mealRecords?.length || 0,
    weights: payload.data.weightRecords?.length || 0,
    practices: payload.data.practiceRecords?.length || 0,
    fastingSessions: payload.data.fastingSessions?.length || 0,
    wellnessRecords: payload.data.wellnessRecords?.length || 0,
    sacredCheckIns: payload.data.sacredSiteCheckIns?.length || 0,
  };

  return { ok: true, payload, summary };
}

export interface WellnessSummary {
  totalRecords: number;
  recent7DaysCount: number;
  avgEnergy: number;
  avgHunger: number;
  avgMood: number;
  avgSleep: number;
  latestWaistCm: number | null;
  waistDeltaCm: number | null; // Positive means waist reduced (firstWaist - latestWaist)
  fastingDaySleepAvg: number | null;
  nonFastingDaySleepAvg: number | null;
  fastingDayEnergyAvg: number | null;
  nonFastingDayEnergyAvg: number | null;
}

const avg = (nums: number[]): number =>
  nums.length === 0 ? 0 : Number((nums.reduce((s, n) => s + n, 0) / nums.length).toFixed(1));

/**
 * Computes 7-day wellness averages, waist delta, and fasting-day vs ordinary-day comparison.
 */
export function computeWellnessSummary(
  records: WellnessRecord[],
  checkIns: DailyCheckIn[],
  today: string = getLocalDateString()
): WellnessSummary {
  if (!records || records.length === 0) {
    return {
      totalRecords: 0,
      recent7DaysCount: 0,
      avgEnergy: 0,
      avgHunger: 0,
      avgMood: 0,
      avgSleep: 0,
      latestWaistCm: null,
      waistDeltaCm: null,
      fastingDaySleepAvg: null,
      nonFastingDaySleepAvg: null,
      fastingDayEnergyAvg: null,
      nonFastingDayEnergyAvg: null,
    };
  }

  const cutoff7d = addLocalDays(today, -6);
  const recent7 = records.filter((r) => r.date >= cutoff7d && r.date <= today);
  const sample = recent7.length > 0 ? recent7 : records;

  const waistRecords = [...records]
    .filter((r) => typeof r.waistCm === 'number' && Number.isFinite(r.waistCm) && r.waistCm > 0)
    .sort((a, b) => a.date.localeCompare(b.date));
  const latestWaistCm = waistRecords.length > 0 ? Number(waistRecords[waistRecords.length - 1].waistCm!.toFixed(1)) : null;
  const waistDeltaCm =
    waistRecords.length >= 2
      ? Number((waistRecords[0].waistCm! - waistRecords[waistRecords.length - 1].waistCm!).toFixed(1))
      : null;

  const completedDates = new Set(checkIns.filter((c) => c.completed).map((c) => c.date));
  const fastingWellness = records.filter((r) => completedDates.has(r.date));
  const nonFastingWellness = records.filter((r) => !completedDates.has(r.date));

  return {
    totalRecords: records.length,
    recent7DaysCount: recent7.length,
    avgEnergy: avg(sample.map((r) => r.energy)),
    avgHunger: avg(sample.map((r) => r.hunger)),
    avgMood: avg(sample.map((r) => r.mood)),
    avgSleep: avg(sample.map((r) => r.sleep)),
    latestWaistCm,
    waistDeltaCm,
    fastingDaySleepAvg: fastingWellness.length > 0 ? avg(fastingWellness.map((r) => r.sleep)) : null,
    nonFastingDaySleepAvg: nonFastingWellness.length > 0 ? avg(nonFastingWellness.map((r) => r.sleep)) : null,
    fastingDayEnergyAvg: fastingWellness.length > 0 ? avg(fastingWellness.map((r) => r.energy)) : null,
    nonFastingDayEnergyAvg: nonFastingWellness.length > 0 ? avg(nonFastingWellness.map((r) => r.energy)) : null,
  };
}
