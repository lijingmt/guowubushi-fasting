import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ActiveFastingState, FastingTier } from '../types';
import { getSundialRhythmState } from './fastingRhythm';

const WIDGET_SNAPSHOT_KEY = '@guowu_widget_snapshot';

export interface WidgetSnapshot {
  updatedAt: number;
  tier: FastingTier;
  mode: 'eating' | 'fasting';
  cutoffHour: number;
  countdownMinutes: number;
  fastingElapsedMinutes: number;
  stageId: string;
  stageTitleZh: string;
  stageTitleEn: string;
  currentStreak: number;
  hasCheckedToday: boolean;
}

/**
 * Persists a lightweight snapshot for future iOS WidgetKit / Live Activity bridges.
 */
export async function saveWidgetSnapshot(params: {
  tier: FastingTier;
  activeFasting: ActiveFastingState | null;
  currentStreak: number;
  hasCheckedToday: boolean;
}): Promise<WidgetSnapshot> {
  const state = getSundialRhythmState(new Date(), params.tier, params.activeFasting);
  const snapshot: WidgetSnapshot = {
    updatedAt: Date.now(),
    tier: state.tier.id,
    mode: state.mode,
    cutoffHour: state.tier.cutoffHour,
    countdownMinutes: state.countdownMinutes,
    fastingElapsedMinutes: state.fastingElapsedMinutes,
    stageId: state.stage.id,
    stageTitleZh: state.stage.titleZh,
    stageTitleEn: state.stage.titleEn,
    currentStreak: params.currentStreak,
    hasCheckedToday: params.hasCheckedToday,
  };
  await AsyncStorage.setItem(WIDGET_SNAPSHOT_KEY, JSON.stringify(snapshot)).catch(() => {});
  return snapshot;
}

export async function getWidgetSnapshot(): Promise<WidgetSnapshot | null> {
  try {
    const raw = await AsyncStorage.getItem(WIDGET_SNAPSHOT_KEY);
    return raw ? (JSON.parse(raw) as WidgetSnapshot) : null;
  } catch {
    return null;
  }
}
