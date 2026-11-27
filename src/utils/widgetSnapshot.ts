import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ActiveFastingState, FastingTier, ThemeSkinId } from '../types';
import { getChineseShichen, getSundialRhythmState } from './fastingRhythm';
import { getSolarTermInfo } from './solarTerm';
import { pushWidgetAndLiveActivitySnapshot } from '../services/widgetBridge';

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
  shichenZh: string;
  shichenEn: string;
  solarTermZh: string;
  solarTermEn: string;
  solarTermSeal: string;
  solarTermQuoteZh: string;
  solarTermQuoteEn: string;
  fastStartEpochMs: number | null;
  fastEndEpochMs: number | null;
  targetDurationHours: number;
  currentStreak: number;
  hasCheckedToday: boolean;
  language: string;
  themeSkin: ThemeSkinId;
}

/**
 * Persists a lightweight snapshot and pushes it to iOS App Group UserDefaults + WidgetKit + Dynamic Island.
 */
export async function saveWidgetSnapshot(params: {
  tier: FastingTier;
  activeFasting: ActiveFastingState | null;
  currentStreak: number;
  hasCheckedToday: boolean;
  language?: string;
  themeSkin?: ThemeSkinId;
}): Promise<WidgetSnapshot> {
  const now = new Date();
  const state = getSundialRhythmState(now, params.tier, params.activeFasting);
  const shichen = getChineseShichen(now.getHours());
  const solarTerm = getSolarTermInfo(now);

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
    shichenZh: shichen.nameZh,
    shichenEn: shichen.nameEn,
    solarTermZh: solarTerm.nameZh,
    solarTermEn: solarTerm.nameEn,
    solarTermSeal: solarTerm.sealText,
    solarTermQuoteZh: solarTerm.quoteZh,
    solarTermQuoteEn: solarTerm.quoteEn,
    fastStartEpochMs: params.activeFasting ? params.activeFasting.startTime : null,
    fastEndEpochMs: params.activeFasting ? params.activeFasting.endTime : null,
    targetDurationHours: params.activeFasting ? params.activeFasting.durationHours : 16,
    currentStreak: params.currentStreak,
    hasCheckedToday: params.hasCheckedToday,
    language: params.language || 'zh',
    themeSkin: params.themeSkin || 'bamboo',
  };

  await AsyncStorage.setItem(WIDGET_SNAPSHOT_KEY, JSON.stringify(snapshot)).catch(() => {});
  void pushWidgetAndLiveActivitySnapshot(snapshot);
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
