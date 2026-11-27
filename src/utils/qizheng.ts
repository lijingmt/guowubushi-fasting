import { getSolarTermInfo, type SolarTermInfo } from './solarTerm';
import { formatClockHour } from './date';

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
    nameEn: 'Sun · Yang Rhythm',
    element: 'fire',
    organZh: '督脉 · 心阳之火',
    organEn: 'Governing Vessel · Daytime Vitality',
    color: '#C84B31',
    breathCueZh: '面向光明挺直脊柱，吸气提神、呼气温通心肾（呼气宜舒缓）。',
    breathCueEn: 'Sit tall with bright posture; inhale clarity, exhale warmth smoothly.',
  },
  moon: {
    id: 'moon',
    glyph: '月',
    shortZh: '太阴',
    shortEn: 'Moon',
    nameZh: '太阴真阴 · 月曜',
    nameEn: 'Moon · Yin Rhythm',
    element: 'water',
    organZh: '任脉 · 津液藏精',
    organEn: 'Conception Vessel · Restorative Calm',
    color: '#3B6E8C',
    breathCueZh: '唇微闭、舌抵上腭，细匀绵长呼吸，涵养真阴津液。',
    breathCueEn: 'Soften your jaw, touch tongue lightly to palate, and breathe unhurriedly.',
  },
  wood: {
    id: 'wood',
    glyph: '木',
    shortZh: '岁星木',
    shortEn: 'Wood',
    nameZh: '东方岁星 · 木曜',
    nameEn: 'Jupiter · Wood Element',
    element: 'wood',
    organZh: '肝胆 · 疏泄条达',
    organEn: 'Liver & Gallbladder Flow (Qi Release)',
    color: '#2E7D5B',
    breathCueZh: '轻轻展肩舒肋，嘘字诀轻呼气（无声），疏通两肋郁结之气。',
    breathCueEn: 'Drop shoulders, open side ribs, and sigh gently to unwind tension.',
  },
  fire: {
    id: 'fire',
    glyph: '火',
    shortZh: '荧惑火',
    shortEn: 'Fire',
    nameZh: '南方荧惑 · 火曜',
    nameEn: 'Mars · Fire Element',
    element: 'fire',
    organZh: '心与小肠 · 君火明照',
    organEn: 'Heart & Small Intestine (Warm Focus)',
    color: '#B93A32',
    breathCueZh: '垂帘闭目收神，呵字诀微呼（心火降、肾水上济，心平无燥）。',
    breathCueEn: 'Soften gaze inward; steady, unhurried exhales quiet mental noise.',
  },
  earth: {
    id: 'earth',
    glyph: '土',
    shortZh: '镇星土',
    shortEn: 'Earth',
    nameZh: '中央镇星 · 土曜',
    nameEn: 'Saturn · Earth Element',
    element: 'earth',
    organZh: '脾胃 · 中焦运化',
    organEn: 'Spleen & Stomach Center (Grounding)',
    color: '#B57C2E',
    breathCueZh: '掌心叠放丹田（脐周），呼字诀腹式呼吸，厚培中焦脾胃正气。',
    breathCueEn: 'Rest warm palms below the navel; slow belly breaths anchor calm.',
  },
  metal: {
    id: 'metal',
    glyph: '金',
    shortZh: '太白金',
    shortEn: 'Metal',
    nameZh: '西方太白 · 金曜',
    nameEn: 'Venus · Metal Element',
    element: 'metal',
    organZh: '肺与大肠 · 肃降宣发',
    organEn: 'Lung & Large Intestine (Crisp Breath)',
    color: '#7B6D4E',
    breathCueZh: '鼻吸清气入肺、呬字诀徐徐呼出浊气，助气机清肃下行。',
    breathCueEn: 'Draw crisp air into the upper chest; let go cleanly on a long exhale.',
  },
  water: {
    id: 'water',
    glyph: '水',
    shortZh: '辰星水',
    shortEn: 'Water',
    nameZh: '北方辰星 · 水曜',
    nameEn: 'Mercury · Water Element',
    element: 'water',
    organZh: '肾与膀胱 · 封藏真元',
    organEn: 'Kidney & Bladder (Deep Reserves)',
    color: '#2C5364',
    breathCueZh: '轻意守腰眼（命门），吹字诀微柔长呼，温水小口缓饮以固肾气。',
    breathCueEn: 'Notice warmth in your lower back; sip warm water and breathe slowly.',
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
  organShortEn: string;
  element: FiveElement;
  hourRangeZh: string;
  hourRangeEn: string;
  qiFlowZh: string;
  qiFlowEn: string;
  fastingActionZh: string;
  fastingActionEn: string;
}

export const MERIDIAN_SLOTS: MeridianSlot[] = [
  {
    shichenZh: '子时',
    shichenEn: 'Zi (11 PM–1 AM)',
    branchZh: '子',
    organZh: '足少阳胆经',
    organShortZh: '胆经',
    organEn: 'Gallbladder Meridian',
    organShortEn: 'Gallbladder',
    element: 'wood',
    hourRangeZh: '23:00 - 01:00',
    hourRangeEn: '11 PM–1 AM',
    qiFlowZh: '一阳初生，胆气升发，阳气归根养胆汁清净。',
    qiFlowEn: 'Traditional transition hour when stillness helps early overnight renewal.',
    fastingActionZh: '子时前务必入睡，空腹安眠不耗肝胆真气。',
    fastingActionEn: 'Wind down before 11:00 PM on an empty, comfortable stomach.',
  },
  {
    shichenZh: '丑时',
    shichenEn: 'Chou (1–3 AM)',
    branchZh: '丑',
    organZh: '足厥阴肝经',
    organShortZh: '肝经',
    organEn: 'Liver Meridian',
    organShortEn: 'Liver',
    element: 'wood',
    hourRangeZh: '01:00 - 03:00',
    hourRangeEn: '1–3 AM',
    qiFlowZh: '人卧血归于肝，推陈出新、养血藏魂。',
    qiFlowEn: 'Deep sleep window associated in TCM with overnight restoration.',
    fastingActionZh: '深睡阶段，胃空无积滞最助肝血归元解乏。',
    fastingActionEn: 'Overnight fasting lets rest run unburdened by late-night digestion.',
  },
  {
    shichenZh: '寅时',
    shichenEn: 'Yin (3–5 AM)',
    branchZh: '寅',
    organZh: '手太阴肺经',
    organShortZh: '肺经',
    organEn: 'Lung Meridian',
    organShortEn: 'Lung',
    element: 'metal',
    hourRangeZh: '03:00 - 05:00',
    hourRangeEn: '3–5 AM',
    qiFlowZh: '肺朝百脉，宗气布散全身气血津液。',
    qiFlowEn: 'Quiet pre-dawn breath cycle preparing the body for the day ahead.',
    fastingActionZh: '深度休息或早起微伸展，感受呼吸深匀畅顺。',
    fastingActionEn: 'Keep resting deeply; early risers may practice slow breathing.',
  },
  {
    shichenZh: '卯时',
    shichenEn: 'Mao (5–7 AM)',
    branchZh: '卯',
    organZh: '手阳明大肠经',
    organShortZh: '大肠经',
    organEn: 'Large Intestine Meridian',
    organShortEn: 'Large Int.',
    element: 'metal',
    hourRangeZh: '05:00 - 07:00',
    hourRangeEn: '5–7 AM',
    qiFlowZh: '天门开而腑气通，排泄宿浊、迎来晨清。',
    qiFlowEn: 'Sunrise awakening hour paired in TCM with morning rhythm & clarity.',
    fastingActionZh: '晨起先饮一杯温开水 250ml，顺通腑气后再进早餐。',
    fastingActionEn: 'Drink 8 oz (250 ml) warm water upon waking to refresh hydration.',
  },
  {
    shichenZh: '辰时',
    shichenEn: 'Chen (7–9 AM)',
    branchZh: '辰',
    organZh: '足阳明胃经',
    organShortZh: '胃经',
    organEn: 'Stomach Meridian',
    organShortEn: 'Stomach',
    element: 'earth',
    hourRangeZh: '07:00 - 09:00',
    hourRangeEn: '7–9 AM',
    qiFlowZh: '阳明胃气最旺，腐熟水谷、受纳精微之时。',
    qiFlowEn: 'Classic morning nourishment window aligned with rising daylight.',
    fastingActionZh: '温和复食黄金期：高蛋白搭配温热粗粮，全天平稳。',
    fastingActionEn: 'Ideal window for a warm, protein-rich breakfast to break your fast.',
  },
  {
    shichenZh: '巳时',
    shichenEn: 'Si (9–11 AM)',
    branchZh: '巳',
    organZh: '足太阴脾经',
    organShortZh: '脾经',
    organEn: 'Spleen Meridian',
    organShortEn: 'Spleen',
    element: 'earth',
    hourRangeZh: '09:00 - 11:00',
    hourRangeEn: '9–11 AM',
    qiFlowZh: '脾主运化升清，将饮食精微上输心肺化生真气。',
    qiFlowEn: 'Peak late-morning window linked with steady focus and energy.',
    fastingActionZh: '精神饱满宜专注工作；少冰饮冷物免伤脾阳。',
    fastingActionEn: 'Great time for deep work; sip warm tea instead of iced sugary drinks.',
  },
  {
    shichenZh: '午时',
    shichenEn: 'Wu (11 AM–1 PM)',
    branchZh: '午',
    organZh: '手少阴心经',
    organShortZh: '心经',
    organEn: 'Heart Meridian',
    organShortEn: 'Heart',
    element: 'fire',
    hourRangeZh: '11:00 - 13:00',
    hourRangeEn: '11 AM–1 PM',
    qiFlowZh: '阳极阴生，心神当令，心肾相交之枢纽。',
    qiFlowEn: 'Solar noon crest — a calm midday pause before afternoon stillness.',
    fastingActionZh: '正午七八分饱即可，饭后闭目静养 15 分钟开启过午清修。',
    fastingActionEn: 'Eat 70–80% full at lunch, then pause calmly to start your post-noon fast.',
  },
  {
    shichenZh: '未时',
    shichenEn: 'Wei (1–3 PM)',
    branchZh: '未',
    organZh: '手太阳小肠经',
    organShortZh: '小肠经',
    organEn: 'Small Intestine Meridian',
    organShortEn: 'Small Int.',
    element: 'fire',
    hourRangeZh: '13:00 - 15:00',
    hourRangeEn: '1–3 PM',
    qiFlowZh: '分清泌浊，吸收水谷精微而通调水道。',
    qiFlowEn: 'Quiet afternoon sorting phase as active daytime digestion wraps up.',
    fastingActionZh: '进入午后止食区，可饮温水或淡茶帮助中焦消化。',
    fastingActionEn: 'Enter your clean fasting hours with plain water, herbal tea, or black coffee.',
  },
  {
    shichenZh: '申时',
    shichenEn: 'Shen (3–5 PM)',
    branchZh: '申',
    organZh: '足太阳膀胱经',
    organShortZh: '膀胱经',
    organEn: 'Bladder Meridian',
    organShortEn: 'Bladder',
    element: 'water',
    hourRangeZh: '15:00 - 17:00',
    hourRangeEn: '3–5 PM',
    qiFlowZh: '清阳上达头目，全身最长阳经气血充沛。',
    qiFlowEn: 'Late-afternoon hydration & stretch window for clear afternoon alertness.',
    fastingActionZh: '最宜主动喝水 +250ml，微饿时轻起身伸展舒背。',
    fastingActionEn: 'Drink 8 oz (250 ml) water and take a brief posture stretch.',
  },
  {
    shichenZh: '酉时',
    shichenEn: 'You (5–7 PM)',
    branchZh: '酉',
    organZh: '足少阴肾经',
    organShortZh: '肾经',
    organEn: 'Kidney Meridian',
    organShortEn: 'Kidney',
    element: 'water',
    hourRangeZh: '17:00 - 19:00',
    hourRangeEn: '5–7 PM',
    qiFlowZh: '肾藏先天真元，诸气收敛入藏之刻。',
    qiFlowEn: 'Dusk transition when energy turns inward and cravings may briefly peak.',
    fastingActionZh: '傍晚馋嘴波动易起，喝杯热白水配合 4-4-6 深呼吸平稳渡过。',
    fastingActionEn: 'Surf dinner-time urges with warm herbal tea and 4-4-6 breathing.',
  },
  {
    shichenZh: '戌时',
    shichenEn: 'Xu (7–9 PM)',
    branchZh: '戌',
    organZh: '手厥阴心包经',
    organShortZh: '心包经',
    organEn: 'Pericardium Meridian',
    organShortEn: 'Pericardium',
    element: 'fire',
    hourRangeZh: '19:00 - 21:00',
    hourRangeEn: '7–9 PM',
    qiFlowZh: '护卫心君、喜乐散忧，气血渐静准备入夜。',
    qiFlowEn: 'Evening unwinding hour suited for calm presence and light movement.',
    fastingActionZh: '极佳的晚间静坐打坐/听雨冥想时段，勿进夜宵扰心神。',
    fastingActionEn: 'Prime window for evening Zen meditation — skip late snacks for better sleep.',
  },
  {
    shichenZh: '亥时',
    shichenEn: 'Hai (9–11 PM)',
    branchZh: '亥',
    organZh: '手少阳三焦经',
    organShortZh: '三焦经',
    organEn: 'Triple Burner Meridian',
    organShortEn: 'San Jiao',
    element: 'fire',
    hourRangeZh: '21:00 - 23:00',
    hourRangeEn: '9–11 PM',
    qiFlowZh: '百脉通调、三焦休养，百神安舍准备入眠。',
    qiFlowEn: 'San Jiao harmony hour signaling the body to dim lights and rest.',
    fastingActionZh: '完成今日打卡与身心体感记录，安心入睡，让自噬与深眠同行。',
    fastingActionEn: 'Log your daily check-in & wellness reflection, then prepare for sleep.',
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
  shortEn: string;
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
  let labelEn = 'Winter · Water';

  // End-of-season earth transitions: Major Cold (1), Grain Rain (7), Major Heat (13), Frost Descent (19)
  if (solarTerm.index === 1 || solarTerm.index === 7 || solarTerm.index === 13 || solarTerm.index === 19) {
    element = 'earth';
    labelZh = '季末土旺';
    labelEn = 'Seasonal Transition · Earth';
  } else if (solarTerm.index >= 2 && solarTerm.index <= 6) {
    element = 'wood';
    labelZh = '春令木旺';
    labelEn = 'Spring · Wood';
  } else if (solarTerm.index >= 8 && solarTerm.index <= 12) {
    element = 'fire';
    labelZh = '夏令火旺';
    labelEn = 'Summer · Fire';
  } else if (solarTerm.index >= 14 && solarTerm.index <= 18) {
    element = 'metal';
    labelZh = '秋令金旺';
    labelEn = 'Autumn · Metal';
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
      shortEn: 'Peak',
      color: '#C84B31',
      guidanceZh: `${ELEMENT_LABELS[target].zh}气当令正旺，宜清简调达、切忌亢盛过劳`,
      guidanceEn: `${ELEMENT_LABELS[target].en} energy peaks cleanly; channel it with calm moderation`,
    };
  }
  if (SHENG_MAP[season] === target) {
    return {
      state: 'xiang',
      labelZh: '相',
      labelEn: 'Rising (Xiang)',
      shortEn: 'Rising',
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
      shortEn: 'Resting',
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
      shortEn: 'Calm',
      color: '#B57C2E',
      guidanceZh: `气机略敛，守一静坐、莫贪生冷厚味耗散正气`,
      guidanceEn: `Energy turns gentle and inward; stay warm and keep meals simple`,
    };
  }
  return {
    state: 'si',
    labelZh: '死',
    labelEn: 'Quiet (Si)',
    shortEn: 'Still',
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
  hourLabelEn: string;
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
    hourLabelEn: formatClockHour(hour, false),
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
