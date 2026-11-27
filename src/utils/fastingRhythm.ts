import type { ActiveFastingState, FastingGoal, FastingTier, PauseReason, UserSettings } from '../types';
import { addLocalDays, getLocalDateString, isValidDateString, parseLocalDate } from './date';

export interface FastingTierMeta {
  id: FastingTier;
  cutoffHour: number;
  fastingHours: number;
  eatingHours: number;
  ratio: string;
  unlockDays: number;
  nameZh: string;
  nameEn: string;
  windowZh: string;
  windowEn: string;
  descZh: string;
  descEn: string;
}

export const FASTING_TIERS: Record<FastingTier, FastingTierMeta> = {
  beginner: {
    id: 'beginner',
    cutoffHour: 18,
    fastingHours: 14,
    eatingHours: 10,
    ratio: '14:10',
    unlockDays: 0,
    nameZh: '初阶·晚清',
    nameEn: 'Gentle Dusk',
    windowZh: '18:00 止食',
    windowEn: 'Stop by 18:00',
    descZh: '温和适应轻断食节律，戒掉夜宵与晚间高热饮食',
    descEn: 'Ease into rhythmic fasting by finishing dinner by 18:00',
  },
  intermediate: {
    id: 'intermediate',
    cutoffHour: 15,
    fastingHours: 16,
    eatingHours: 8,
    ratio: '16:8',
    unlockDays: 7,
    nameZh: '中阶·申时',
    nameEn: 'Afternoon Balance',
    windowZh: '15:00 止食',
    windowEn: 'Stop by 15:00',
    descZh: '经典 16:8 代谢区间，平衡燃脂与日常精力（建议满7天进阶）',
    descEn: 'Balanced 16:8 metabolic window for steady fat burn',
  },
  classic: {
    id: 'classic',
    cutoffHour: 13,
    fastingHours: 18,
    eatingHours: 6,
    ratio: '18:6',
    unlockDays: 14,
    nameZh: '高阶·过午',
    nameEn: 'Classic Noon',
    windowZh: '13:00 止食',
    windowEn: 'Stop by 13:00',
    descZh: '古法过午不食，午时后仅饮清水清茶，身轻神明（建议满14天）',
    descEn: 'Traditional post-noon fasting for deep clarity and lightness',
  },
};

export interface FastingGoalMeta {
  id: FastingGoal;
  icon: string;
  titleZh: string;
  titleEn: string;
  subtitleZh: string;
  subtitleEn: string;
  recommendedTier: FastingTier;
  traditionalMode: boolean;
}

export const FASTING_GOALS: FastingGoalMeta[] = [
  {
    id: 'weight_loss',
    icon: '🍃',
    titleZh: '轻体减脂',
    titleEn: 'Light & Lean',
    subtitleZh: '温和控食，降低晚间热量盈余',
    subtitleEn: 'Gentle calorie control and evening deficit',
    recommendedTier: 'beginner',
    traditionalMode: false,
  },
  {
    id: 'gut_sleep',
    icon: '🌙',
    titleZh: '调理肠胃与睡眠',
    titleEn: 'Gut & Deep Sleep',
    subtitleZh: '睡前轻腹休养，次日神清气爽',
    subtitleEn: 'Give digestion evening rest for deeper sleep',
    recommendedTier: 'intermediate',
    traditionalMode: false,
  },
  {
    id: 'mindful_discipline',
    icon: '🧭',
    titleZh: '戒晚食自律',
    titleEn: 'Mindful Discipline',
    subtitleZh: '顺应昼夜节律，建立日常掌控感',
    subtitleEn: 'Build calm daily structure around meals',
    recommendedTier: 'intermediate',
    traditionalMode: false,
  },
  {
    id: 'traditional_practice',
    icon: '🪷',
    titleZh: '传统过午修行',
    titleEn: 'Traditional Noon Fast',
    subtitleZh: '严守午后不食、静坐观息与云行脚',
    subtitleEn: 'Classic post-noon discipline, meditation & pilgrimage',
    recommendedTier: 'classic',
    traditionalMode: true,
  },
];

export type PhysiologicalStageId = 'digestion' | 'steady_glucose' | 'fat_burn' | 'autophagy';

export interface PhysiologicalStageInfo {
  id: PhysiologicalStageId;
  index: number;
  minHours: number;
  maxHours: number;
  titleZh: string;
  titleEn: string;
  shortZh: string;
  shortEn: string;
  detailZh: string;
  detailEn: string;
  color: string;
  stageProgress: number;
  overallProgress: number;
}

const STAGE_DEFS: Omit<PhysiologicalStageInfo, 'index' | 'stageProgress' | 'overallProgress'>[] = [
  {
    id: 'digestion',
    minHours: 0,
    maxHours: 4,
    titleZh: '消化蓄能',
    titleEn: 'Digestion',
    shortZh: '消化期',
    shortEn: 'Digest',
    detailZh: '胃部正在消化最近一餐，适度饮温水有助于平稳过渡',
    detailEn: 'Body is finishing digestion; warm water keeps transitions gentle.',
    color: '#6E8F7B',
  },
  {
    id: 'steady_glucose',
    minHours: 4,
    maxHours: 12,
    titleZh: '血糖平稳',
    titleEn: 'Balanced Glucose',
    shortZh: '稳糖期',
    shortEn: 'Steady',
    detailZh: '胰岛素逐渐回落，身体开始动用肝糖原，肠胃进入休整',
    detailEn: 'Insulin eases down as your digestive tract rests comfortably.',
    color: '#3E6B89',
  },
  {
    id: 'fat_burn',
    minHours: 12,
    maxHours: 16,
    titleZh: '脂肪代谢',
    titleEn: 'Fat Burning',
    shortZh: '燃脂期',
    shortEn: 'Burn',
    detailZh: '代谢逐步切换至脂肪供能，身轻不倦，专注度提升',
    detailEn: 'Metabolism shifts toward fat oxidation with steady energy.',
    color: '#C68B33',
  },
  {
    id: 'autophagy',
    minHours: 16,
    maxHours: 24,
    titleZh: '细胞焕新',
    titleEn: 'Deep Renewal',
    shortZh: '清明期',
    shortEn: 'Clear',
    detailZh: '进入深度轻盈节律与温和自噬整理，神清意明',
    detailEn: 'Entered deep cellular housekeeping and calm mental clarity.',
    color: '#265947',
  },
];

/**
 * Returns physiological fasting stage metadata and progress percentages for elapsed hours.
 */
export function getPhysiologicalStage(elapsedHours: number): PhysiologicalStageInfo {
  const safeHours = Number.isFinite(elapsedHours) ? Math.max(0, elapsedHours) : 0;
  let index = 0;
  if (safeHours >= 16) {
    index = 3;
  } else if (safeHours >= 12) {
    index = 2;
  } else if (safeHours >= 4) {
    index = 1;
  }

  const def = STAGE_DEFS[index];
  const span = Math.max(1, def.maxHours - def.minHours);
  const stageProgress = Math.min(1, Math.max(0, (safeHours - def.minHours) / span));
  const overallProgress = Math.min(1, safeHours / 18);

  return {
    ...def,
    index,
    stageProgress,
    overallProgress,
  };
}

export interface ShichenInfo {
  index: number;
  nameZh: string;
  nameEn: string;
  range: string;
}

const SHICHEN_LIST: ShichenInfo[] = [
  { index: 0, nameZh: '子时', nameEn: 'Zi Hour', range: '23:00-01:00' },
  { index: 1, nameZh: '丑时', nameEn: 'Chou Hour', range: '01:00-03:00' },
  { index: 2, nameZh: '寅时', nameEn: 'Yin Hour', range: '03:00-05:00' },
  { index: 3, nameZh: '卯时', nameEn: 'Mao Hour', range: '05:00-07:00' },
  { index: 4, nameZh: '辰时', nameEn: 'Chen Hour', range: '07:00-09:00' },
  { index: 5, nameZh: '巳时', nameEn: 'Si Hour', range: '09:00-11:00' },
  { index: 6, nameZh: '午时', nameEn: 'Wu Hour', range: '11:00-13:00' },
  { index: 7, nameZh: '未时', nameEn: 'Wei Hour', range: '13:00-15:00' },
  { index: 8, nameZh: '申时', nameEn: 'Shen Hour', range: '15:00-17:00' },
  { index: 9, nameZh: '酉时', nameEn: 'You Hour', range: '17:00-19:00' },
  { index: 10, nameZh: '戌时', nameEn: 'Xu Hour', range: '19:00-21:00' },
  { index: 11, nameZh: '亥时', nameEn: 'Hai Hour', range: '21:00-23:00' },
];

/**
 * Maps a 0-23 hour to its traditional Chinese 2-hour Shichen.
 */
export function getChineseShichen(hour: number): ShichenInfo {
  const normalized = ((Math.floor(hour) % 24) + 24) % 24;
  if (normalized === 23 || normalized === 0) return SHICHEN_LIST[0];
  const idx = Math.floor((normalized + 1) / 2);
  return SHICHEN_LIST[idx] || SHICHEN_LIST[0];
}

export interface SundialRhythmState {
  tier: FastingTierMeta;
  shichen: ShichenInfo;
  mode: 'eating' | 'fasting';
  /** Remaining minutes until cutoff when eating, or remaining minutes when active timer is running */
  countdownMinutes: number;
  /** Elapsed fasting minutes since cutoff (or since activeFasting startTime) */
  fastingElapsedMinutes: number;
  /** Dial completion ratio 0..1 */
  dialProgress: number;
  stage: PhysiologicalStageInfo;
  hasActiveTimer: boolean;
}

const EATING_START_HOUR = 7;

/**
 * Computes real-time sundial state using active fasting timer if running, else daily circadian tier schedule.
 */
export function getSundialRhythmState(
  now: Date,
  tierId: FastingTier = 'classic',
  activeFasting?: ActiveFastingState | null
): SundialRhythmState {
  const tier = FASTING_TIERS[tierId] || FASTING_TIERS.classic;
  const shichen = getChineseShichen(now.getHours());

  if (activeFasting && activeFasting.startTime > 0 && activeFasting.endTime > activeFasting.startTime) {
    const nowMs = now.getTime();
    const totalMs = activeFasting.endTime - activeFasting.startTime;
    const elapsedMs = Math.max(0, nowMs - activeFasting.startTime);
    const remainingMs = Math.max(0, activeFasting.endTime - nowMs);
    const elapsedHours = elapsedMs / (1000 * 60 * 60);

    return {
      tier,
      shichen,
      mode: 'fasting',
      countdownMinutes: Math.ceil(remainingMs / 60000),
      fastingElapsedMinutes: Math.floor(elapsedMs / 60000),
      dialProgress: Math.min(1, Math.max(0, elapsedMs / totalMs)),
      stage: getPhysiologicalStage(elapsedHours),
      hasActiveTimer: true,
    };
  }

  const minutesNow = now.getHours() * 60 + now.getMinutes();
  const eatStartMinutes = EATING_START_HOUR * 60;
  const cutoffMinutes = tier.cutoffHour * 60;

  // Eating window: 07:00 -> cutoffHour
  if (minutesNow >= eatStartMinutes && minutesNow < cutoffMinutes) {
    const totalEatMinutes = Math.max(1, cutoffMinutes - eatStartMinutes);
    const remainingToCutoff = cutoffMinutes - minutesNow;
    return {
      tier,
      shichen,
      mode: 'eating',
      countdownMinutes: remainingToCutoff,
      fastingElapsedMinutes: 0,
      dialProgress: Math.min(1, Math.max(0, (minutesNow - eatStartMinutes) / totalEatMinutes)),
      stage: getPhysiologicalStage(0),
      hasActiveTimer: false,
    };
  }

  // Fasting window: either after cutoff today or before 07:00 (continuing from yesterday's cutoff)
  const elapsedMinutes =
    minutesNow >= cutoffMinutes
      ? minutesNow - cutoffMinutes
      : (24 * 60 - cutoffMinutes) + minutesNow;
  const targetFastMinutes = Math.max(1, tier.fastingHours * 60);
  const elapsedHours = elapsedMinutes / 60;

  return {
    tier,
    shichen,
    mode: 'fasting',
    countdownMinutes: Math.max(0, targetFastMinutes - elapsedMinutes),
    fastingElapsedMinutes: elapsedMinutes,
    dialProgress: Math.min(1, Math.max(0, elapsedMinutes / targetFastMinutes)),
    stage: getPhysiologicalStage(elapsedHours),
    hasActiveTimer: false,
  };
}

/**
 * Recommends the highest unlocked tier for the user's completed days.
 */
export function getRecommendedTier(completedDays: number): FastingTier {
  if (completedDays >= FASTING_TIERS.classic.unlockDays) return 'classic';
  if (completedDays >= FASTING_TIERS.intermediate.unlockDays) return 'intermediate';
  return 'beginner';
}

export function formatMinutesHm(totalMinutes: number, zh: boolean): string {
  const safe = Math.max(0, Math.floor(totalMinutes));
  const h = Math.floor(safe / 60);
  const m = safe % 60;
  if (zh) {
    return `${h}小时${String(m).padStart(2, '0')}分`;
  }
  return `${h}h ${String(m).padStart(2, '0')}m`;
}

export interface PauseReasonMeta {
  id: PauseReason;
  icon: string;
  labelZh: string;
  labelEn: string;
}

export const PAUSE_REASONS: PauseReasonMeta[] = [
  { id: 'social', icon: '🍲', labelZh: '聚餐应酬', labelEn: 'Social Meal' },
  { id: 'period', icon: '🌸', labelZh: '生理期休养', labelEn: 'Cycle Rest' },
  { id: 'travel', icon: '🧳', labelZh: '差旅奔波', labelEn: 'Travel' },
  { id: 'recovery', icon: '🌿', labelZh: '身体调养', labelEn: 'Recovery' },
];

export interface EffectiveDaySchedule {
  status: 'paused' | 'rest' | 'active';
  tierId: FastingTier;
  pauseReason?: PauseReason;
}

/**
 * Resolves whether a given calendar day is under a Pause Pass, scheduled Rest Day, or active Fasting Tier.
 */
export function getEffectiveDaySchedule(
  date: Date,
  settings: Pick<UserSettings, 'fastingTier' | 'weeklySchedule' | 'pausePass'>
): EffectiveDaySchedule {
  const fallbackTier: FastingTier = settings.fastingTier || 'classic';
  const dateStr = getLocalDateString(date);

  const pausePass = settings.pausePass;
  if (
    pausePass &&
    pausePass.active &&
    isValidDateString(pausePass.startDate) &&
    isValidDateString(pausePass.endDate) &&
    dateStr >= pausePass.startDate &&
    dateStr <= pausePass.endDate
  ) {
    return {
      status: 'paused',
      tierId: fallbackTier,
      pauseReason: pausePass.reason,
    };
  }

  const weekday = date.getDay();
  const scheduled = settings.weeklySchedule?.[weekday];
  if (scheduled === 'rest') {
    return { status: 'rest', tierId: fallbackTier };
  }
  if (scheduled === 'beginner' || scheduled === 'intermediate' || scheduled === 'classic') {
    return { status: 'active', tierId: scheduled };
  }

  return { status: 'active', tierId: fallbackTier };
}

/**
 * Expands active Pause Pass date range and scheduled weekly 'rest' weekdays into YYYY-MM-DD protected dates.
 */
export function getProtectedDates(
  settings: Pick<UserSettings, 'pausePass' | 'weeklySchedule'>,
  referenceToday: string = getLocalDateString(),
  lookbackDays: number = 400
): string[] {
  const protectedSet = new Set<string>();
  const startBoundary = addLocalDays(referenceToday, -Math.max(1, lookbackDays));

  const pausePass = settings.pausePass;
  if (
    pausePass &&
    pausePass.active &&
    isValidDateString(pausePass.startDate) &&
    isValidDateString(pausePass.endDate) &&
    pausePass.startDate <= pausePass.endDate
  ) {
    let cur = pausePass.startDate < startBoundary ? startBoundary : pausePass.startDate;
    const cap = pausePass.endDate > referenceToday ? referenceToday : pausePass.endDate;
    let guard = 0;
    while (cur <= cap && guard < 420) {
      protectedSet.add(cur);
      cur = addLocalDays(cur, 1);
      guard += 1;
    }
  }

  const weekly = settings.weeklySchedule;
  if (weekly) {
    const restWeekdays = new Set<number>(
      Object.entries(weekly)
        .filter(([, val]) => val === 'rest')
        .map(([k]) => Number(k))
    );
    if (restWeekdays.size > 0) {
      for (let i = 0; i <= lookbackDays; i++) {
        const dStr = addLocalDays(referenceToday, -i);
        const day = parseLocalDate(dStr).getDay();
        if (restWeekdays.has(day)) {
          protectedSet.add(dStr);
        }
      }
    }
  }

  return Array.from(protectedSet).sort();
}
