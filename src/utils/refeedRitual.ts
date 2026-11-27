import { getSeasonalNutritionGuide, getSolarTermInfo } from './solarTerm';

export interface RefeedStep {
  id: string;
  order: number;
  icon: string;
  waitMinutes: number;
  titleZh: string;
  titleEn: string;
  titleEs: string;
  descZh: string;
  descEn: string;
  descEs: string;
}

export interface RefeedRitualPlan {
  fastingHours: number;
  intensity: 'short' | 'standard' | 'extended';
  solarTermZh: string;
  solarTermEn: string;
  solarTermColor: string;
  headlineZh: string;
  headlineEn: string;
  headlineEs: string;
  suggestedMealZh: string;
  suggestedMealEn: string;
  suggestedMealEs: string;
  suggestedCalories: number;
  steps: RefeedStep[];
}

/**
 * Generates an adaptive 3-step Mindful Refeed Ritual combining completed fasting duration
 * with the current 24 Solar Term nutrition guidance so opening a fast stays calm and gentle.
 */
export function buildRefeedRitual(
  fastingHours: number,
  date: Date = new Date()
): RefeedRitualPlan {
  const safeHours = Math.max(1, Math.round(fastingHours * 10) / 10);
  const intensity: RefeedRitualPlan['intensity'] =
    safeHours < 14 ? 'short' : safeHours < 18 ? 'standard' : 'extended';
  const term = getSolarTermInfo(date);
  const guide = getSeasonalNutritionGuide(date);

  const liquidStep =
    intensity === 'extended'
      ? {
          waitMinutes: 10,
          titleZh: '温润米汤或清蔬汤打底',
          titleEn: 'Gentle Broth or Warm Congee',
          titleEs: 'Caldo Suave o Crema Tibia',
          descZh: `${safeHours}h 深度空腹后肠胃更敏锐，先饮半碗清淡米汤/菌菇清汤唤醒脾胃。`,
          descEn: `After a ${safeHours}h fast, wake digestion gently with half a bowl of clear veggie broth or warm oats.`,
          descEs: `Tras ${safeHours}h de ayuno, despierta tu digestión con medio bol de caldo claro tibio.`,
        }
      : {
          waitMinutes: 5,
          titleZh: '应季温食轻启脾胃',
          titleEn: 'Seasonal Warm Starter',
          titleEs: 'Entrada Tibia de Temporada',
          descZh: `${term.nameZh}推荐：${guide.refeedFirstBiteZh}`,
          descEn: `${term.nameEn}: ${guide.refeedFirstBiteEn}`,
          descEs: `${term.nameEn}: comienza con caldo tibio o proteína suave y vegetales.`,
        };

  const mainCalories = intensity === 'extended' ? 220 : intensity === 'standard' ? 320 : 380;

  return {
    fastingHours: safeHours,
    intensity,
    solarTermZh: term.nameZh,
    solarTermEn: term.nameEn,
    solarTermColor: term.seasonColor,
    headlineZh:
      intensity === 'extended'
        ? `${safeHours}h 深度修整圆满 · 慢开食护脾胃`
        : `${safeHours}h 节律圆满 · 温润开启第一餐`,
    headlineEn:
      intensity === 'extended'
        ? `${safeHours}h Deep Reset Complete · Gentle Refeed`
        : `${safeHours}h Window Complete · Mindful First Bite`,
    headlineEs:
      intensity === 'extended'
        ? `${safeHours}h Completadas · Reapertura Suave`
        : `${safeHours}h Completadas · Primer Bocado Consciente`,
    suggestedMealZh:
      intensity === 'extended'
        ? `温小米粥与水波蛋（${term.nameZh}开食）`
        : `${term.nameZh}应季温食首餐`,
    suggestedMealEn:
      intensity === 'extended'
        ? `Warm Broth & Soft Egg (${term.nameEn})`
        : `Mindful First Meal (${term.nameEn})`,
    suggestedMealEs:
      intensity === 'extended'
        ? `Caldo Tibio y Huevo Pochado (${term.nameEn})`
        : `Primera Comida Consciente (${term.nameEn})`,
    suggestedCalories: mainCalories,
    steps: [
      {
        id: 'hydrate',
        order: 1,
        icon: '🍵',
        waitMinutes: 3,
        titleZh: '三口温水 · 先润喉胃',
        titleEn: 'Sip Warm Water First',
        titleEs: 'Bebe Agua Tibia Primero',
        descZh: '小口慢饮 150–200ml 温开水或淡陈皮茶，静候 3 分钟，避免冷饮急食。',
        descEn: 'Take slow sips of 150–200 ml warm water or herbal tea for 3 minutes before any solid food.',
        descEs: 'Bebe 150–200 ml de agua tibia o infusión en sorbos lentos durante 3 minutos.',
      },
      {
        id: 'starter',
        order: 2,
        icon: '🥣',
        waitMinutes: liquidStep.waitMinutes,
        titleZh: liquidStep.titleZh,
        titleEn: liquidStep.titleEn,
        titleEs: liquidStep.titleEs,
        descZh: liquidStep.descZh,
        descEn: liquidStep.descEn,
        descEs: liquidStep.descEs,
      },
      {
        id: 'bite',
        order: 3,
        icon: '🥢',
        waitMinutes: 10,
        titleZh: '细嚼七分饱 · 稳住血糖曲线',
        titleEn: 'Chew Slowly · 70% Satisfied',
        titleEs: 'Mastica Despacio · 70% Saciedad',
        descZh: `优先优质蛋白与温热蔬菜，每口咀嚼 15 次，远离高糖冷饮，吃至七八分饱最清朗。`,
        descEn: `Prioritize clean protein & warm greens before refined carbs, and stop comfortably at ~70% full.`,
        descEs: `Prioriza proteína limpia y verdura tibia antes de harinas, y detente al 70% de saciedad.`,
      },
    ],
  };
}
