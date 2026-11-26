import { SACRED_SITES } from '../data/sacredSites';
import type { SacredSite, UserStats } from '../types';

export interface PilgrimageStopDef {
  siteId: string;
  distanceKm: number;
  stampId: string;
  stampTextZh: string;
  stampTextEn: string;
}

export interface PilgrimageRouteDef {
  id: string;
  nameZh: string;
  nameEn: string;
  subtitleZh: string;
  subtitleEn: string;
  accentColor: string;
  stops: PilgrimageStopDef[];
}

export const PILGRIMAGE_ROUTES: PilgrimageRouteDef[] = [
  {
    id: 'jiangnan-zen',
    nameZh: '江南禅意线',
    nameEn: 'Jiangnan Zen Trail',
    subtitleZh: '上海 · 苏州 · 南京 · 杭州 · 天台 · 普陀',
    subtitleEn: 'Shanghai · Suzhou · Nanjing · Hangzhou · Tiantai · Putuo',
    accentColor: '#265947',
    stops: [
      { siteId: 'jade-buddha-temple', distanceKm: 0, stampId: 'stamp_yufoshi', stampTextZh: '玉佛清印', stampTextEn: 'JADE ZEN' },
      { siteId: 'hanshan-temple', distanceKm: 24, stampId: 'stamp_hanshan', stampTextZh: '寒山钟印', stampTextEn: 'HANSHAN' },
      { siteId: 'qixia-temple', distanceKm: 60, stampId: 'stamp_qixia', stampTextZh: '栖霞枫印', stampTextEn: 'QIXIA' },
      { siteId: 'lingyin-temple', distanceKm: 108, stampId: 'stamp_lingyin', stampTextZh: '灵隐云印', stampTextEn: 'LINGYIN' },
      { siteId: 'guoqing-temple', distanceKm: 168, stampId: 'stamp_guoqing', stampTextZh: '天台清印', stampTextEn: 'TIANTAI' },
      { siteId: 'puji-temple-putuo', distanceKm: 240, stampId: 'stamp_putuo', stampTextZh: '南海莲印', stampTextEn: 'PUTUO' },
    ],
  },
  {
    id: 'zhongnan-hermitage',
    nameZh: '终南清修线',
    nameEn: 'Zhongnan Hermitage',
    subtitleZh: '长安 · 终南 · 楼观台 · 法门 · 华山 · 少林',
    subtitleEn: 'Xi’an · Zhongnan · Louguantai · Famen · Huashan · Shaolin',
    accentColor: '#8A6D3B',
    stops: [
      { siteId: 'daci-en-temple', distanceKm: 0, stampId: 'stamp_dacien', stampTextZh: '雁塔清风', stampTextEn: 'DACIEN' },
      { siteId: 'zhongnan-chongyang-palace', distanceKm: 30, stampId: 'stamp_zhongnan', stampTextZh: '终南隐印', stampTextEn: 'ZHONGNAN' },
      { siteId: 'louguantai', distanceKm: 72, stampId: 'stamp_louguan', stampTextZh: '楼观道德', stampTextEn: 'LOUGUAN' },
      { siteId: 'famen-temple', distanceKm: 120, stampId: 'stamp_famen', stampTextZh: '法门寂照', stampTextEn: 'FAMEN' },
      { siteId: 'huashan-yuquan-yuan', distanceKm: 180, stampId: 'stamp_huashan', stampTextZh: '华山玉泉', stampTextEn: 'HUASHAN' },
      { siteId: 'shaolin-temple', distanceKm: 264, stampId: 'stamp_shaolin', stampTextZh: '嵩山少林', stampTextEn: 'SHAOLIN' },
    ],
  },
  {
    id: 'mountain-peaks',
    nameZh: '名山问道线',
    nameEn: 'Sacred Peaks Trail',
    subtitleZh: '洛阳 · 武当 · 五台 · 峨眉 · 青城 · 拉萨',
    subtitleEn: 'Luoyang · Wudang · Wutai · Emei · Qingcheng · Lhasa',
    accentColor: '#3E6B89',
    stops: [
      { siteId: 'white-horse-temple', distanceKm: 0, stampId: 'stamp_baima', stampTextZh: '白马初传', stampTextEn: 'BAIMA' },
      { siteId: 'wudang-golden-hall', distanceKm: 36, stampId: 'stamp_wudang', stampTextZh: '武当金顶', stampTextEn: 'WUDANG' },
      { siteId: 'xiantong-temple-wutai', distanceKm: 96, stampId: 'stamp_wutai', stampTextZh: '清凉五台', stampTextEn: 'WUTAI' },
      { siteId: 'baoguo-temple-emei', distanceKm: 168, stampId: 'stamp_emei', stampTextZh: '峨眉月印', stampTextEn: 'EMEI' },
      { siteId: 'qingcheng-jianfu-palace', distanceKm: 228, stampId: 'stamp_qingcheng', stampTextZh: '青城幽居', stampTextEn: 'QINGCHENG' },
      { siteId: 'jokhang-temple', distanceKm: 324, stampId: 'stamp_jokhang', stampTextZh: '雪域大昭', stampTextEn: 'LHASA' },
    ],
  },
  {
    id: 'east-asia-zen',
    nameZh: '东亚禅庭线',
    nameEn: 'East Asia Zen Gardens',
    subtitleZh: '京都 · 奈良 · 永平 · 首尔',
    subtitleEn: 'Kyoto · Nara · Eiheiji · Seoul',
    accentColor: '#6D4C7D',
    stops: [
      { siteId: 'kiyomizu-dera', distanceKm: 0, stampId: 'stamp_kiyomizu', stampTextZh: '清水音羽', stampTextEn: 'KIYOMIZU' },
      { siteId: 'kinkakuji', distanceKm: 24, stampId: 'stamp_kinkaku', stampTextZh: '鹿苑静水', stampTextEn: 'KINKAKU' },
      { siteId: 'ryoanji', distanceKm: 60, stampId: 'stamp_ryoanji', stampTextZh: '龙安枯山', stampTextEn: 'RYOANJI' },
      { siteId: 'todai-ji', distanceKm: 108, stampId: 'stamp_todai', stampTextZh: '奈良东大', stampTextEn: 'TODAIJI' },
      { siteId: 'eiheiji', distanceKm: 180, stampId: 'stamp_eiheiji', stampTextZh: '越前永平', stampTextEn: 'EIHEIJI' },
      { siteId: 'jogyesa', distanceKm: 264, stampId: 'stamp_jogyesa', stampTextZh: '曹溪清钟', stampTextEn: 'JOGYESA' },
    ],
  },
];

export interface ResolvedPilgrimageStop extends PilgrimageStopDef {
  site: SacredSite;
  unlocked: boolean;
}

export interface PilgrimageProgress {
  totalKm: number;
  route: PilgrimageRouteDef;
  stops: ResolvedPilgrimageStop[];
  currentStop: ResolvedPilgrimageStop;
  nextStop: ResolvedPilgrimageStop | null;
  kmToNextStop: number;
  daysToNextStop: number;
  progress: number;
  unlockedStamps: PilgrimageStopDef[];
}

const SITE_BY_ID = new Map<string, SacredSite>(SACRED_SITES.map((s) => [s.id, s]));

/**
 * Calculates cumulative Cloud Pilgrimage distance (km) from fasting & meditation practice.
 * Every completed fasting day grants 12 km; every 15 min meditation grants 3 km; each single fast grants 5 km.
 */
export function calculatePilgrimageKm(
  stats: Pick<UserStats, 'completedDays' | 'totalMeditationMinutes' | 'totalSingleFastingSessions'>
): number {
  const daysKm = Math.max(0, stats.completedDays || 0) * 12;
  const meditationKm = Math.floor(Math.max(0, stats.totalMeditationMinutes || 0) / 15) * 3;
  const sessionKm = Math.max(0, stats.totalSingleFastingSessions || 0) * 5;
  return daysKm + meditationKm + sessionKm;
}

export function computePilgrimageProgress(
  stats: Pick<UserStats, 'completedDays' | 'totalMeditationMinutes' | 'totalSingleFastingSessions'>,
  routeId: string = PILGRIMAGE_ROUTES[0].id
): PilgrimageProgress {
  const route = PILGRIMAGE_ROUTES.find((r) => r.id === routeId) || PILGRIMAGE_ROUTES[0];
  const totalKm = calculatePilgrimageKm(stats);

  const stops: ResolvedPilgrimageStop[] = route.stops.map((stop) => {
    const site = SITE_BY_ID.get(stop.siteId);
    if (!site) {
      throw new Error(`Invalid pilgrimage siteId "${stop.siteId}" in route "${route.id}"`);
    }
    return {
      ...stop,
      site,
      unlocked: totalKm >= stop.distanceKm,
    };
  });

  const unlockedStops = stops.filter((s) => s.unlocked);
  const currentStop = unlockedStops[unlockedStops.length - 1] || stops[0];
  const nextStop = stops.find((s) => !s.unlocked) || null;
  const kmToNextStop = nextStop ? Math.max(0, nextStop.distanceKm - totalKm) : 0;
  const daysToNextStop = kmToNextStop > 0 ? Math.ceil(kmToNextStop / 12) : 0;
  const maxKm = Math.max(1, stops[stops.length - 1]?.distanceKm || 1);
  const progress = Math.min(1, totalKm / maxKm);

  const unlockedStamps: PilgrimageStopDef[] = [];
  for (const r of PILGRIMAGE_ROUTES) {
    for (const s of r.stops) {
      if (totalKm >= s.distanceKm) {
        unlockedStamps.push(s);
      }
    }
  }

  return {
    totalKm,
    route,
    stops,
    currentStop,
    nextStop,
    kmToNextStop,
    daysToNextStop,
    progress,
    unlockedStamps,
  };
}

export function getStampById(stampId?: string): PilgrimageStopDef | undefined {
  if (!stampId) return undefined;
  for (const r of PILGRIMAGE_ROUTES) {
    const found = r.stops.find((s) => s.stampId === stampId);
    if (found) return found;
  }
  return undefined;
}
