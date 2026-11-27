import type { CravingEvent, CravingTrigger } from '../types';
import { getChineseShichen } from './fastingRhythm';

export interface CravingTriggerMeta {
  id: CravingTrigger;
  icon: string;
  zh: string;
  en: string;
  es: string;
}

export const CRAVING_TRIGGERS: CravingTriggerMeta[] = [
  { id: 'physical', icon: '🍲', zh: '生理真饿', en: 'Physical', es: 'Física' },
  { id: 'stress', icon: '🌊', zh: '压力情绪', en: 'Stress', es: 'Estrés' },
  { id: 'habit', icon: '🌙', zh: '深夜习惯', en: 'Habit', es: 'Hábito' },
  { id: 'social', icon: '🥂', zh: '社交馋嘴', en: 'Social', es: 'Social' },
];

export interface ShichenTideBucket {
  shichenIndex: number;
  nameZh: string;
  nameEn: string;
  shortEn: string;
  range: string;
  count: number;
  survivedCount: number;
}

export interface CravingTideAnalysis {
  totalEvents: number;
  survivedCount: number;
  survivalRatePct: number;
  buckets: ShichenTideBucket[];
  peakBucket: ShichenTideBucket | null;
  peakSharePct: number;
  dominantTrigger: CravingTriggerMeta | null;
  insightZh: string;
  insightEn: string;
  insightEs: string;
}

const SHICHEN_SAMPLE_HOURS = [23, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21];

/**
 * Maps any logged CravingEvent[] onto the 12 traditional Chinese Shichen windows
 * to surface peak craving hours, dominant psychological triggers, and actionable prep tips.
 */
export function analyzeCravingTide(events: CravingEvent[]): CravingTideAnalysis {
  const buckets: ShichenTideBucket[] = SHICHEN_SAMPLE_HOURS.map((sampleHour) => {
    const sc = getChineseShichen(sampleHour);
    return {
      shichenIndex: sc.index,
      nameZh: sc.nameZh,
      nameEn: sc.nameEn,
      shortEn: sc.nameEn.split(' ')[0] || sc.nameEn,
      range: sc.range,
      count: 0,
      survivedCount: 0,
    };
  });

  if (!events || events.length === 0) {
    return {
      totalEvents: 0,
      survivedCount: 0,
      survivalRatePct: 0,
      buckets,
      peakBucket: null,
      peakSharePct: 0,
      dominantTrigger: null,
      insightZh: '在首页「抗饿冲浪」中顺手标记触发原因后，这里会自动绘出你的十二时辰欲念潮汐。',
      insightEn: 'Tag what sparked your craving in Craving Rescue to map your 12-Shichen craving tide.',
      insightEs: 'Etiqueta la causa en Rescate de Antojo para ver tu marea circadiana de 12 tramos.',
    };
  }

  const triggerCounts: Record<CravingTrigger, number> = {
    physical: 0,
    stress: 0,
    habit: 0,
    social: 0,
  };
  let survivedCount = 0;

  for (const ev of events) {
    const safeHour = Number.isFinite(ev.hour) ? ((Math.floor(ev.hour) % 24) + 24) % 24 : 20;
    const sc = getChineseShichen(safeHour);
    const idx =
      typeof ev.shichenIndex === 'number' && ev.shichenIndex >= 0 && ev.shichenIndex < 12
        ? ev.shichenIndex
        : sc.index;
    const bucket = buckets[idx];
    if (bucket) {
      bucket.count += 1;
      if (ev.survived) bucket.survivedCount += 1;
    }
    if (ev.survived) survivedCount += 1;
    if (ev.trigger && triggerCounts[ev.trigger] !== undefined) {
      triggerCounts[ev.trigger] += 1;
    }
  }

  const totalEvents = events.length;
  const survivalRatePct = Math.round((survivedCount / totalEvents) * 100);

  let peakBucket: ShichenTideBucket | null = null;
  for (const b of buckets) {
    if (b.count > 0 && (!peakBucket || b.count > peakBucket.count)) {
      peakBucket = b;
    }
  }
  const peakSharePct = peakBucket ? Math.round((peakBucket.count / totalEvents) * 100) : 0;

  let topTriggerId: CravingTrigger | null = null;
  let topTriggerCount = 0;
  for (const [key, count] of Object.entries(triggerCounts) as Array<[CravingTrigger, number]>) {
    if (count > topTriggerCount) {
      topTriggerCount = count;
      topTriggerId = key;
    }
  }
  const dominantTrigger =
    CRAVING_TRIGGERS.find((t) => t.id === topTriggerId) || CRAVING_TRIGGERS[0];

  const peakLabelZh = peakBucket ? `${peakBucket.nameZh}（${peakBucket.range}）` : '';
  const peakLabelEn = peakBucket ? `${peakBucket.nameEn} (${peakBucket.range})` : '';

  return {
    totalEvents,
    survivedCount,
    survivalRatePct,
    buckets,
    peakBucket,
    peakSharePct,
    dominantTrigger,
    insightZh: peakBucket
      ? `${peakSharePct}% 的食欲波动集中在 ${peakLabelZh}，主要诱因为「${dominantTrigger.zh}」。建议提前 30 分钟泡杯温茶稳住心神。`
      : '继续记录抗饿冲浪，发现你的高峰时段。',
    insightEn: peakBucket
      ? `${peakSharePct}% of cravings peak during ${peakLabelEn} · Trigger: ${dominantTrigger.en}. Brew warm tea 30m ahead.`
      : 'Keep logging Craving Rescue sessions to spot your peak window.',
    insightEs: peakBucket
      ? `El ${peakSharePct}% de los antojos ocurren en ${peakLabelEn} · Causa: ${dominantTrigger.es}. Prepara té tibio 30 min antes.`
      : 'Sigue registrando para detectar tu franja pico.',
  };
}
