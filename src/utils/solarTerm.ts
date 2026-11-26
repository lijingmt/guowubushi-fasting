export interface SolarTermInfo {
  index: number;
  nameZh: string;
  nameEn: string;
  /** Approximate Gregorian month (1-12) and day (1-31) */
  month: number;
  day: number;
  tipZh: string;
  tipEn: string;
  quoteZh: string;
  quoteEn: string;
  seasonColor: string;
  sealText: string;
}

export const SOLAR_TERMS: SolarTermInfo[] = [
  { index: 0, nameZh: '小寒', nameEn: 'Minor Cold', month: 1, day: 5, tipZh: '冬藏温润，午后饮热白水护脾阳', tipEn: 'Stay warm inside; sip hot water after noon.', quoteZh: '心静自然温，节食神自宁。', quoteEn: 'Quiet mind warms the winter within.', seasonColor: '#3E6B89', sealText: '小寒安住' },
  { index: 1, nameZh: '大寒', nameEn: 'Major Cold', month: 1, day: 20, tipZh: '早卧晚起，晚间留白让胃腑安眠', tipEn: 'Rest early with a light evening stomach.', quoteZh: '藏锋于静，养气于微。', quoteEn: 'Store strength in stillness.', seasonColor: '#3E6B89', sealText: '大寒清修' },
  { index: 2, nameZh: '立春', nameEn: 'Start of Spring', month: 2, day: 4, tipZh: '阳气初升，饮食清简疏肝理气', tipEn: 'Keep meals light to welcome spring vitality.', quoteZh: '一念清明，万象更新。', quoteEn: 'One clear thought renews the season.', seasonColor: '#3B7A57', sealText: '立春生发' },
  { index: 3, nameZh: '雨水', nameEn: 'Rain Water', month: 2, day: 19, tipZh: '少酸甘润，午后淡茶去湿滞', tipEn: 'Gentle hydration sweeps away heaviness.', quoteZh: '润物无声，自律成诗。', quoteEn: 'Quiet consistency shapes each day.', seasonColor: '#3B7A57', sealText: '雨水润心' },
  { index: 4, nameZh: '惊蛰', nameEn: 'Awakening of Insects', month: 3, day: 5, tipZh: '生机初动，过午轻腹行步三十刻', tipEn: 'Take a mindful walk after a light afternoon.', quoteZh: '闻雷不惊，止食见明。', quoteEn: 'Unshaken clarity beyond distraction.', seasonColor: '#3B7A57', sealText: '惊蛰醒神' },
  { index: 5, nameZh: '春分', nameEn: 'Spring Equinox', month: 3, day: 20, tipZh: '昼夜均平，食饮亦宜中和有度', tipEn: 'Balance nourishment just as day meets night.', quoteZh: '不偏不倚，食止七分。', quoteEn: 'Moderation brings natural harmony.', seasonColor: '#265947', sealText: '春分中和' },
  { index: 6, nameZh: '清明', nameEn: 'Pure Brightness', month: 4, day: 5, tipZh: '天清地明，静坐十五分调匀呼吸', tipEn: 'Sit in stillness for 15 minutes of breath.', quoteZh: '腹空则气清，心澄则神明。', quoteEn: 'A light body clarifies the spirit.', seasonColor: '#265947', sealText: '清明无染' },
  { index: 7, nameZh: '谷雨', nameEn: 'Grain Rain', month: 4, day: 20, tipZh: '谷雨将夏，清饮食少油腻助健脾', tipEn: 'Light meals prevent late-spring sluggishness.', quoteZh: '少食一分浊，多得一分清。', quoteEn: 'Less excess makes room for clarity.', seasonColor: '#265947', sealText: '谷雨清欢' },
  { index: 8, nameZh: '立夏', nameEn: 'Start of Summer', month: 5, day: 5, tipZh: '立夏养心，午后淡饮莫贪冰饮甜食', tipEn: 'Nourish the heart; avoid late sugary drinks.', quoteZh: '心静即凉风，知足无暑气。', quoteEn: 'A calm heart cools the warmest day.', seasonColor: '#B93A32', sealText: '立夏养心' },
  { index: 9, nameZh: '小满', nameEn: 'Grain Buds', month: 5, day: 21, tipZh: '花未全开月未圆，饮食留有三分余地', tipEn: 'Leave gentle space rather than eating to fullness.', quoteZh: '小满者，不满之智慧也。', quoteEn: 'Sufficiency blooms just before excess.', seasonColor: '#C68B33', sealText: '小满有余' },
  { index: 10, nameZh: '芒种', nameEn: 'Grain in Ear', month: 6, day: 5, tipZh: '仲夏湿热，戒夜宵令夜间好眠', tipEn: 'Skip late snacks for restful summer nights.', quoteZh: '忙中守节律，闲处见真章。', quoteEn: 'Hold your rhythm even in busy days.', seasonColor: '#C68B33', sealText: '芒种守一' },
  { index: 11, nameZh: '夏至', nameEn: 'Summer Solstice', month: 6, day: 21, tipZh: '阳极阴生，正午静息以养元气', tipEn: 'Pause at noon to preserve vital energy.', quoteZh: '静以制躁，简以驭繁。', quoteEn: 'Stillness masters intensity.', seasonColor: '#B93A32', sealText: '夏至定心' },
  { index: 12, nameZh: '小暑', nameEn: 'Minor Heat', month: 7, day: 7, tipZh: '小暑莫烦，温水小口常饮防燥热', tipEn: 'Sip water steadily without heavy late meals.', quoteZh: '心定无烦暑，行简自清凉。', quoteEn: 'Simplicity brings cool composure.', seasonColor: '#B93A32', sealText: '小暑清凉' },
  { index: 13, nameZh: '大暑', nameEn: 'Major Heat', month: 7, day: 23, tipZh: '盛夏忌贪冷与晚食，清简最护肠胃', tipEn: 'Protect digestion with simple daytime meals.', quoteZh: '外热不入，内清自生。', quoteEn: 'Unbothered within despite the heat.', seasonColor: '#B93A32', sealText: '大暑澄怀' },
  { index: 14, nameZh: '立秋', nameEn: 'Start of Autumn', month: 8, day: 7, tipZh: '由夏入秋宜平缓减欲，勿急于贴秋膘', tipEn: 'Ease into autumn lightly without overeating.', quoteZh: '一叶知秋意，过午收放心。', quoteEn: 'First autumn breeze invites restraint.', seasonColor: '#C68B33', sealText: '立秋收敛' },
  { index: 15, nameZh: '处暑', nameEn: 'End of Heat', month: 8, day: 23, tipZh: '暑气渐收，夜间微凉助入深眠', tipEn: 'Enjoy crisp evenings with an empty, calm stomach.', quoteZh: '暑去神自爽，夜静梦亦安。', quoteEn: 'Cool nights reward an unburdened body.', seasonColor: '#C68B33', sealText: '处暑安神' },
  { index: 16, nameZh: '白露', nameEn: 'White Dew', month: 9, day: 7, tipZh: '秋燥初起，午后适量饮温水润燥', tipEn: 'Hydrate gently in afternoon as air turns crisp.', quoteZh: '露凝秋水白，心似明镜台。', quoteEn: 'Clear as morning dew on autumn leaves.', seasonColor: '#8A6D3B', sealText: '白露清澄' },
  { index: 17, nameZh: '秋分', nameEn: 'Autumn Equinox', month: 9, day: 23, tipZh: '平分秋色，保持稳态代谢与规律作息', tipEn: 'Steady rhythm anchors body and mind.', quoteZh: '心平无盈亏，节律自天成。', quoteEn: 'Equilibrium comes from daily cadence.', seasonColor: '#8A6D3B', sealText: '秋分平怀' },
  { index: 18, nameZh: '寒露', nameEn: 'Cold Dew', month: 10, day: 8, tipZh: '凉意加重，晨午食温热、晚间清心', tipEn: 'Favor warm daytime meals and quiet nights.', quoteZh: '寒露不惊心，行持见定力。', quoteEn: 'Quiet resolve endures the chill.', seasonColor: '#8A6D3B', sealText: '寒露笃行' },
  { index: 19, nameZh: '霜降', nameEn: 'Frost Descent', month: 10, day: 23, tipZh: '晚秋肃降，正是收敛杂念与口腹之时', tipEn: 'Late autumn favors letting go of excess cravings.', quoteZh: '霜降百草敛，自律见风骨。', quoteEn: 'Discipline shines brightest in stillness.', seasonColor: '#8A6D3B', sealText: '霜降素心' },
  { index: 20, nameZh: '立冬', nameEn: 'Start of Winter', month: 11, day: 7, tipZh: '冬季重藏，适度早食少晚食更养精力', tipEn: 'Early meals and rested nights conserve energy.', quoteZh: '冬藏不妄耗，清静养元真。', quoteEn: 'Conserve vitality in quiet winter stillness.', seasonColor: '#3E6B89', sealText: '立冬蓄元' },
  { index: 21, nameZh: '小雪', nameEn: 'Minor Snow', month: 11, day: 22, tipZh: '围炉可省欲，夜半肠胃空明最益深睡', tipEn: 'Gentle warmth and an empty night stomach bring deep rest.', quoteZh: '雪落无声处，心清万事轻。', quoteEn: 'Quiet snow softens every noisy thought.', seasonColor: '#3E6B89', sealText: '小雪见真' },
  { index: 22, nameZh: '大雪', nameEn: 'Major Snow', month: 12, day: 7, tipZh: '天寒宜静坐观息，切忌无意识宵夜', tipEn: 'Trade mindless winter snacking for warm breathwork.', quoteZh: '千山飞雪静，一念觉照明。', quoteEn: 'Inside stillness, awareness glows.', seasonColor: '#3E6B89', sealText: '大雪照心' },
  { index: 23, nameZh: '冬至', nameEn: 'Winter Solstice', month: 12, day: 21, tipZh: '一阳来复，以清净身心迎岁序新生', tipEn: 'Longest night returns light; begin anew with clarity.', quoteZh: '夜极一阳生，静定返本明。', quoteEn: 'In deepest night, light quietly turns.', seasonColor: '#265947', sealText: '冬至复明' },
];

/**
 * Returns the active Chinese 24 Solar Term for a given local Date.
 */
export function getSolarTermInfo(date: Date = new Date()): SolarTermInfo {
  const mmdd = (date.getMonth() + 1) * 100 + date.getDate();
  let matched = SOLAR_TERMS[SOLAR_TERMS.length - 1];
  for (let i = 0; i < SOLAR_TERMS.length; i++) {
    const term = SOLAR_TERMS[i];
    if (term.month * 100 + term.day <= mmdd) {
      matched = term;
    }
  }
  return matched;
}
