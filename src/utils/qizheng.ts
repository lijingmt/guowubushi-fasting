import { getSolarTermInfo, type SolarTermInfo } from './solarTerm';

export type FiveElement = 'wood' | 'fire' | 'earth' | 'metal' | 'water';
export type LuminaryId = 'sun' | 'moon' | 'wood' | 'fire' | 'earth' | 'metal' | 'water';
export type WangXiangState = 'wang' | 'xiang' | 'xiu' | 'qiu' | 'si';
export type QiZhengCycleOrigin = 'sunrise_6' | 'midnight_0';

export interface LuminaryMeta {
  id: LuminaryId;
  glyph: string;
  shortZh: string;
  shortEn: string;
  nameZh: string;
  nameEn: string;
  element: FiveElement;
  organZh: string;
  organEn: string;
  color: string;
  breathCueZh: string;
  breathCueEn: string;
}

export const SEVEN_LUMINARIES: Record<LuminaryId, LuminaryMeta> = {
  sun: {
    id: 'sun',
    glyph: '日',
    shortZh: '太阳',
    shortEn: 'Sun',
    nameZh: '太阳真阳 · 日曜',
    nameEn: 'Sun · Yang Luminary',
    element: 'fire',
    organZh: '督脉 · 心阳之火',
    organEn: 'Du Meridian & Heart Yang',
    color: '#C84B31',
    breathCueZh: '面向光明挺直脊柱，吸气提神、呼气温通心肾（呼气宜舒缓）。',
    breathCueEn: 'Sit tall, inhale clarity, exhale warmth down the spine.',
  },
  moon: {
    id: 'moon',
    glyph: '月',
    shortZh: '太阴',
    shortEn: 'Moon',
    nameZh: '太阴真阴 · 月曜',
    nameEn: 'Moon · Yin Luminary',
    element: 'water',
    organZh: '任脉 · 津液藏精',
    organEn: 'Ren Meridian & Vital Yin',
    color: '#3B6E8C',
    breathCueZh: '唇微闭、舌抵上腭，细匀绵长呼吸，涵养真阴津液。',
    breathCueEn: 'Rest tongue gently on palate; breathe softly to nourish yin.',
  },
  wood: {
    id: 'wood',
    glyph: '木',
    shortZh: '岁星木',
    shortEn: 'Wood',
    nameZh: '东方岁星 · 木曜',
    nameEn: 'Jupiter · Wood Luminary',
    element: 'wood',
    organZh: '肝胆 · 疏泄条达',
    organEn: 'Liver & Gallbladder Flow',
    color: '#2E7D5B',
    breathCueZh: '轻轻展肩舒肋，嘘字诀轻呼气（无声），疏通两肋郁结之气。',
    breathCueEn: 'Relax shoulders and ribs; lengthen exhalation to ease tension.',
  },
  fire: {
    id: 'fire',
    glyph: '火',
    shortZh: '荧惑火',
    shortEn: 'Fire',
    nameZh: '南方荧惑 · 火曜',
    nameEn: 'Mars · Fire Luminary',
    element: 'fire',
    organZh: '心与小肠 · 君火明照',
    organEn: 'Heart & Small Intestine',
    color: '#B93A32',
    breathCueZh: '垂帘闭目收神，呵字诀微呼（心火降、肾水上济，心平无燥）。',
    breathCueEn: 'Soften gaze inward; steady exhale calms mental restlessness.',
  },
  earth: {
    id: 'earth',
    glyph: '土',
    shortZh: '镇星土',
    shortEn: 'Earth',
    nameZh: '中央镇星 · 土曜',
    nameEn: 'Saturn · Earth Luminary',
    element: 'earth',
    organZh: '脾胃 · 中焦运化',
    organEn: 'Spleen & Stomach Center',
    color: '#B57C2E',
    breathCueZh: '掌心叠放丹田（脐周），呼字诀腹式呼吸，厚培中焦脾胃正气。',
    breathCueEn: 'Place warm palms below navel; slow belly breaths ground digestion.',
  },
  metal: {
    id: 'metal',
    glyph: '金',
    shortZh: '太白金',
    shortEn: 'Metal',
    nameZh: '西方太白 · 金曜',
    nameEn: 'Venus · Metal Luminary',
    element: 'metal',
    organZh: '肺与大肠 · 肃降宣发',
    organEn: 'Lung & Large Intestine',
    color: '#7B6D4E',
    breathCueZh: '鼻吸清气入肺、呬字诀徐徐呼出浊气，助气机清肃下行。',
    breathCueEn: 'Inhale deeply into upper ribs; release crisp tension on exhale.',
  },
  water: {
    id: 'water',
    glyph: '水',
    shortZh: '辰星水',
    shortEn: 'Water',
    nameZh: '北方辰星 · 水曜',
    nameEn: 'Mercury · Water Luminary',
    element: 'water',
    organZh: '肾与膀胱 · 封藏真元',
    organEn: 'Kidney & Bladder Essence',
    color: '#2C5364',
    breathCueZh: '轻意守腰眼（命门），吹字诀微柔长呼，温水小口缓饮以固肾气。',
    breathCueEn: 'Bring awareness to lower back; sip warm water and exhale slowly.',
  },
};

/**
 * Classical 7-Luminary planetary hour sequence (slowest outer orb to fastest):
 * Saturn(Earth) -> Jupiter(Wood) -> Mars(Fire) -> Sun -> Venus(Metal) -> Mercury(Water) -> Moon.
 * Because 24 mod 7 = 3, stepping 24 hours seamlessly lands on the next weekday's ruler.
 */
export const CHALDEAN_ORDER: LuminaryId[] = [
  'earth',
  'wood',
  'fire',
  'sun',
  'metal',
  'water',
  'moon',
];

/** JS Date.getDay(): 0=Sun..6=Sat */
export const WEEKDAY_RULER: Record<number, LuminaryId> = {
  0: 'sun',
  1: 'moon',
  2: 'fire',
  3: 'water',
  4: 'wood',
  5: 'metal',
  6: 'earth',
};

export interface MeridianSlot {
  shichenZh: string;
  shichenEn: string;
  branchZh: string;
  organZh: string;
  organShortZh: string;
  organEn: string;
  element: FiveElement;
  hourRangeZh: string;
  qiFlowZh: string;
  qiFlowEn: string;
  fastingActionZh: string;
  fastingActionEn: string;
}

export const MERIDIAN_SLOTS: MeridianSlot[] = [
  {
    shichenZh: '子时',
    shichenEn: 'Zi (23–01)',
    branchZh: '子',
    organZh: '足少阳胆经',
    organShortZh: '胆经',
    organEn: 'Gallbladder Meridian',
    element: 'wood',
    hourRangeZh: '23:00 - 01:00',
    qiFlowZh: '一阳初生，胆气升发，阳气归根养胆汁清净。',
    qiFlowEn: 'Gallbladder regenerates and early yang turns quietly.',
    fastingActionZh: '子时前务必入睡，空腹安眠不耗肝胆真气。',
    fastingActionEn: 'Sleep deeply before 23:00 on a calm, light stomach.',
  },
  {
    shichenZh: '丑时',
    shichenEn: 'Chou (01–03)',
    branchZh: '丑',
    organZh: '足厥阴肝经',
    organShortZh: '肝经',
    organEn: 'Liver Meridian',
    element: 'wood',
    hourRangeZh: '01:00 - 03:00',
    qiFlowZh: '人卧血归于肝，推陈出新、养血藏魂。',
    qiFlowEn: 'Blood returns to the liver for deep restoration.',
    fastingActionZh: '深睡阶段，胃空无积滞最助肝血归元解乏。',
    fastingActionEn: 'Overnight fasting lets liver recovery run unburdened.',
  },
  {
    shichenZh: '寅时',
    shichenEn: 'Yin (03–05)',
    branchZh: '寅',
    organZh: '手太阴肺经',
    organShortZh: '肺经',
    organEn: 'Lung Meridian',
    element: 'metal',
    hourRangeZh: '03:00 - 05:00',
    qiFlowZh: '肺朝百脉，宗气布散全身气血津液。',
    qiFlowEn: 'Lung meridian distributes fresh vital qi across vessels.',
    fastingActionZh: '深度休息或早起微伸展，感受呼吸深匀畅顺。',
    fastingActionEn: 'Deep breath cycles; early risers may sit quietly.',
  },
  {
    shichenZh: '卯时',
    shichenEn: 'Mao (05–07)',
    branchZh: '卯',
    organZh: '手阳明大肠经',
    organShortZh: '大肠经',
    organEn: 'Large Intestine Meridian',
    element: 'metal',
    hourRangeZh: '05:00 - 07:00',
    qiFlowZh: '天门开而腑气通，排泄宿浊、迎来晨清。',
    qiFlowEn: 'Morning elimination clears stale waste for clarity.',
    fastingActionZh: '晨起先饮一杯温开水 250ml，顺通腑气后再进早餐。',
    fastingActionEn: 'Drink 250ml warm water upon waking to awaken digestion.',
  },
  {
    shichenZh: '辰时',
    shichenEn: 'Chen (07–09)',
    branchZh: '辰',
    organZh: '足阳明胃经',
    organShortZh: '胃经',
    organEn: 'Stomach Meridian',
    element: 'earth',
    hourRangeZh: '07:00 - 09:00',
    qiFlowZh: '阳明胃气最旺，腐熟水谷、受纳精微之时。',
    qiFlowEn: 'Stomach fire peaks to receive and warm nourishment.',
    fastingActionZh: '温和复食黄金期：高蛋白搭配温热粗粮，全天平稳。',
    fastingActionEn: 'Ideal window for a warm, protein-rich breakfast.',
  },
  {
    shichenZh: '巳时',
    shichenEn: 'Si (09–11)',
    branchZh: '巳',
    organZh: '足太阴脾经',
    organShortZh: '脾经',
    organEn: 'Spleen Meridian',
    element: 'earth',
    hourRangeZh: '09:00 - 11:00',
    qiFlowZh: '脾主运化升清，将饮食精微上输心肺化生真气。',
    qiFlowEn: 'Spleen transforms nutrients into steady daytime energy.',
    fastingActionZh: '精神饱满宜专注工作；少冰饮冷物免伤脾阳。',
    fastingActionEn: 'High mental clarity; avoid iced drinks to protect digestion.',
  },
  {
    shichenZh: '午时',
    shichenEn: 'Wu (11–13)',
    branchZh: '午',
    organZh: '手少阴心经',
    organShortZh: '心经',
    organEn: 'Heart Meridian',
    element: 'fire',
    hourRangeZh: '11:00 - 13:00',
    qiFlowZh: '阳极阴生，心神当令，心肾相交之枢纽。',
    qiFlowEn: 'Midday yang crests; heart spirit benefits from a calm pause.',
    fastingActionZh: '正午七八分饱即可，饭后闭目静养 15 分钟开启过午清修。',
    fastingActionEn: 'Eat 70-80% full; pause calmly to enter afternoon fasting.',
  },
  {
    shichenZh: '未时',
    shichenEn: 'Wei (13–15)',
    branchZh: '未',
    organZh: '手太阳小肠经',
    organShortZh: '小肠经',
    organEn: 'Small Intestine Meridian',
    element: 'fire',
    hourRangeZh: '13:00 - 15:00',
    qiFlowZh: '分清泌浊，吸收水谷精微而通调水道。',
    qiFlowEn: 'Small intestine separates clear essence and stabilizes fluids.',
    fastingActionZh: '进入午后止食区，可饮温水或淡茶帮助中焦消化。',
    fastingActionEn: 'Sip warm water or light tea cleanly after your midday meal.',
  },
  {
    shichenZh: '申时',
    shichenEn: 'Shen (15–17)',
    branchZh: '申',
    organZh: '足太阳膀胱经',
    organShortZh: '膀胱经',
    organEn: 'Bladder Meridian',
    element: 'water',
    hourRangeZh: '15:00 - 17:00',
    qiFlowZh: '清阳上达头目，全身最长阳经气血充沛。',
    qiFlowEn: 'Taiyang meridian refreshes mental alertness & fluid balance.',
    fastingActionZh: '最宜主动喝水 +250ml，微饿时轻起身伸展舒背。',
    fastingActionEn: 'Great afternoon window to hydrate +250ml and stretch spine.',
  },
  {
    shichenZh: '酉时',
    shichenEn: 'You (17–19)',
    branchZh: '酉',
    organZh: '足少阴肾经',
    organShortZh: '肾经',
    organEn: 'Kidney Meridian',
    element: 'water',
    hourRangeZh: '17:00 - 19:00',
    qiFlowZh: '肾藏先天真元，诸气收敛入藏之刻。',
    qiFlowEn: 'Kidney meridian stores vital reserves as dusk arrives.',
    fastingActionZh: '傍晚馋嘴波动易起，喝杯热白水配合 4-4-6 深呼吸平稳渡过。',
    fastingActionEn: 'Trade evening snack urges for warm water and 4-4-6 breathing.',
  },
  {
    shichenZh: '戌时',
    shichenEn: 'Xu (19–21)',
    branchZh: '戌',
    organZh: '手厥阴心包经',
    organShortZh: '心包经',
    organEn: 'Pericardium Meridian',
    element: 'fire',
    hourRangeZh: '19:00 - 21:00',
    qiFlowZh: '护卫心君、喜乐散忧，气血渐静准备入夜。',
    qiFlowEn: 'Pericardium shields calm composure and unwinds daily stress.',
    fastingActionZh: '极佳的晚间静坐打坐/听雨冥想时段，勿进夜宵扰心神。',
    fastingActionEn: 'Prime window for evening meditation; keep stomach peaceful.',
  },
  {
    shichenZh: '亥时',
    shichenEn: 'Hai (21–23)',
    branchZh: '亥',
    organZh: '手少阳三焦经',
    organShortZh: '三焦经',
    organEn: 'Triple Burner Meridian',
    element: 'fire',
    hourRangeZh: '21:00 - 23:00',
    qiFlowZh: '百脉通调、三焦休养，百神安舍准备入眠。',
    qiFlowEn: 'Triple Burner harmonizes all pathways for restorative sleep.',
    fastingActionZh: '完成今日打卡与身心体感记录，安心入睡，让自噬与深眠同行。',
    fastingActionEn: 'Log daily check-in & wellness, then rest deeply for sleep.',
  },
];

const ELEMENT_LABELS: Record<FiveElement, { zh: string; en: string }> = {
  wood: { zh: '木', en: 'Wood' },
  fire: { zh: '火', en: 'Fire' },
  earth: { zh: '土', en: 'Earth' },
  metal: { zh: '金', en: 'Metal' },
  water: { zh: '水', en: 'Water' },
};

const SHENG_MAP: Record<FiveElement, FiveElement> = {
  wood: 'fire',
  fire: 'earth',
  earth: 'metal',
  metal: 'water',
  water: 'wood',
};

const KE_MAP: Record<FiveElement, FiveElement> = {
  wood: 'earth',
  earth: 'water',
  water: 'fire',
  fire: 'metal',
  metal: 'wood',
};

export interface WangXiangStatus {
  state: WangXiangState;
  labelZh: string;
  labelEn: string;
  color: string;
  guidanceZh: string;
  guidanceEn: string;
}

export function getSeasonalElement(date: Date = new Date()): {
  element: FiveElement;
  labelZh: string;
  labelEn: string;
  solarTerm: SolarTermInfo;
} {
  const solarTerm = getSolarTermInfo(date);
  let element: FiveElement = 'water';
  let labelZh = '冬令水旺';
  let labelEn = 'Winter Water';

  // End-of-season earth transitions: Major Cold (1), Grain Rain (7), Major Heat (13), Frost Descent (19)
  if (solarTerm.index === 1 || solarTerm.index === 7 || solarTerm.index === 13 || solarTerm.index === 19) {
    element = 'earth';
    labelZh = '季末土旺';
    labelEn = 'Seasonal Earth';
  } else if (solarTerm.index >= 2 && solarTerm.index <= 6) {
    element = 'wood';
    labelZh = '春令木旺';
    labelEn = 'Spring Wood';
  } else if (solarTerm.index >= 8 && solarTerm.index <= 12) {
    element = 'fire';
    labelZh = '夏令火旺';
    labelEn = 'Summer Fire';
  } else if (solarTerm.index >= 14 && solarTerm.index <= 18) {
    element = 'metal';
    labelZh = '秋令金旺';
    labelEn = 'Autumn Metal';
  }

  return { element, labelZh, labelEn, solarTerm };
}

/**
 * Evaluates Five-Element seasonal prosperity (旺/相/休/囚/死) of a Luminary or Organ against the active season.
 */
export function getWangXiangStatus(target: FiveElement, season: FiveElement): WangXiangStatus {
  if (target === season) {
    return {
      state: 'wang',
      labelZh: '旺',
      labelEn: 'Peak (Wang)',
      color: '#C84B31',
      guidanceZh: `${ELEMENT_LABELS[target].zh}气当令正旺，宜清简调达、切忌亢盛过劳`,
      guidanceEn: `${ELEMENT_LABELS[target].en} energy peaks cleanly; channel with gentle moderation`,
    };
  }
  if (SHENG_MAP[season] === target) {
    return {
      state: 'xiang',
      labelZh: '相',
      labelEn: 'Rising (Xiang)',
      color: '#3B7A57',
      guidanceZh: `得天时相生而气充，最宜顺势吐纳导引、疏通真气`,
      guidanceEn: `Supported by the season; ideal for mindful breathwork & movement`,
    };
  }
  if (SHENG_MAP[target] === season) {
    return {
      state: 'xiu',
      labelZh: '休',
      labelEn: 'Resting (Xiu)',
      color: '#3E6B89',
      guidanceZh: `生发之余宜休息生津，喝温水轻静养神为佳`,
      guidanceEn: `Nurturing phase; favor warm hydration and quiet rest`,
    };
  }
  if (KE_MAP[target] === season) {
    return {
      state: 'qiu',
      labelZh: '囚',
      labelEn: 'Contained (Qiu)',
      color: '#B57C2E',
      guidanceZh: `气机略敛，守一静坐、莫贪生冷厚味耗散正气`,
      guidanceEn: `Qi is contained; stay warm and keep digestion gentle`,
    };
  }
  return {
    state: 'si',
    labelZh: '死',
    labelEn: 'Quiet (Si)',
    color: '#6E7A73',
    guidanceZh: `藏静蓄元之时，减少消耗与躁动，安住调息养本`,
    guidanceEn: `Deeply recessed energy; conserve strength and prioritize calm`,
  };
}

export function getMeridianForHour(hour: number): MeridianSlot {
  const h = ((Math.floor(hour) % 24) + 24) % 24;
  // 23,0 -> index 0 (Zi); 1,2 -> index 1 (Chou); ... ; 21,22 -> index 11 (Hai)
  const slotIndex = Math.floor(((h + 1) % 24) / 2);
  return MERIDIAN_SLOTS[slotIndex];
}

export interface QiZhengHourSnapshot {
  hour: number;
  hourLabel: string;
  luminary: LuminaryMeta;
  wangXiang: WangXiangStatus;
  seasonElement: FiveElement;
  seasonLabelZh: string;
  seasonLabelEn: string;
  meridian: MeridianSlot;
  dayRuler: LuminaryMeta;
  resonanceZh: string;
  resonanceEn: string;
}

/**
 * Computes the Seven Luminaries planetary duty hour, seasonal prosperity (旺相休囚死),
 * and 12-Shichen meridian organ alignment for any timestamp.
 */
export function getQiZhengHourSnapshot(
  date: Date = new Date(),
  origin: QiZhengCycleOrigin = 'sunrise_6'
): QiZhengHourSnapshot {
  const hour = ((date.getHours() % 24) + 24) % 24;
  const weekday = date.getDay();

  let effectiveDay = weekday;
  let cycleStep = hour;
  if (origin === 'sunrise_6') {
    if (hour < 6) {
      effectiveDay = (weekday + 6) % 7;
      cycleStep = hour + 18;
    } else {
      effectiveDay = weekday;
      cycleStep = hour - 6;
    }
  }

  const dayRulerId = WEEKDAY_RULER[effectiveDay];
  const startIdx = CHALDEAN_ORDER.indexOf(dayRulerId);
  const luminaryId = CHALDEAN_ORDER[(startIdx + cycleStep) % 7];
  const luminary = SEVEN_LUMINARIES[luminaryId];

  const season = getSeasonalElement(date);
  const wangXiang = getWangXiangStatus(luminary.element, season.element);
  const meridian = getMeridianForHour(hour);

  let resonanceZh = `${luminary.shortZh}值时通${meridian.organShortZh}：顺应自然作息，静心少念则气血自和。`;
  let resonanceEn = `${luminary.shortEn} aligns with ${meridian.organEn}: steady breath keeps qi balanced.`;

  if (luminary.element === meridian.element) {
    resonanceZh = `✨ 同气共振：${luminary.shortZh}与${meridian.organShortZh}同属${ELEMENT_LABELS[luminary.element].zh}行，此时调息最为得力。`;
    resonanceEn = `✨ Element Resonance: ${luminary.shortEn} & ${meridian.organEn} share ${ELEMENT_LABELS[luminary.element].en} energy.`;
  } else if (SHENG_MAP[luminary.element] === meridian.element) {
    resonanceZh = `🌱 相生濡养：${luminary.shortZh}（${ELEMENT_LABELS[luminary.element].zh}）生旺${meridian.organShortZh}（${ELEMENT_LABELS[meridian.element].zh}），宜舒缓吐纳导引。`;
    resonanceEn = `🌱 Supportive Flow: ${luminary.shortEn} nourishes ${meridian.organEn} cleanly.`;
  } else if (SHENG_MAP[meridian.element] === luminary.element) {
    resonanceZh = `💧 子母相应：${meridian.organShortZh}助${luminary.shortZh}流布，过午轻腹、多饮温水最养真气。`;
    resonanceEn = `💧 Gentle Flow: ${meridian.organEn} feeds ${luminary.shortEn}; stay hydrated and calm.`;
  } else if (KE_MAP[luminary.element] === meridian.element || KE_MAP[meridian.element] === luminary.element) {
    resonanceZh = `🪷 制约归平：星曜与经气相制，宜放慢节奏、深长呼气而不强行用事。`;
    resonanceEn = `🪷 Balancing Phase: slow down, breathe gently, and avoid overexertion.`;
  }

  return {
    hour,
    hourLabel: `${String(hour).padStart(2, '0')}:00`,
    luminary,
    wangXiang,
    seasonElement: season.element,
    seasonLabelZh: season.labelZh,
    seasonLabelEn: season.labelEn,
    meridian,
    dayRuler: SEVEN_LUMINARIES[dayRulerId],
    resonanceZh,
    resonanceEn,
  };
}

/**
 * Generates the complete 24-hour (00:00..23:00) Seven Luminaries + Meridian schedule for a given date.
 */
export function getQiZheng24HourSchedule(
  date: Date = new Date(),
  origin: QiZhengCycleOrigin = 'sunrise_6'
): QiZhengHourSnapshot[] {
  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();
  return Array.from({ length: 24 }, (_, h) =>
    getQiZhengHourSnapshot(new Date(year, month, day, h, 0, 0), origin)
  );
}
