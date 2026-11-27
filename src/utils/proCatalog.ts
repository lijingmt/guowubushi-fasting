import type { PosterStyleId, ThemeSkinId } from '../types';

export type SubscriptionTier = 'free' | 'lite' | 'pro';
export type PaidTier = 'lite' | 'pro';

export const LITE_MONTHLY_ID = 'com.guowu.fasting.lite.monthly';
export const LITE_YEARLY_ID = 'com.guowu.fasting.lite.yearly';
export const PRO_MONTHLY_ID = 'com.guowu.fasting.pro.monthly';
export const PRO_YEARLY_ID = 'com.guowu.fasting.pro.yearly';

export const LITE_SUBSCRIPTION_IDS = [LITE_YEARLY_ID, LITE_MONTHLY_ID] as const;
export const PRO_SUBSCRIPTION_IDS = [PRO_YEARLY_ID, PRO_MONTHLY_ID] as const;
export const ALL_SUBSCRIPTION_IDS = [
  ...PRO_SUBSCRIPTION_IDS,
  ...LITE_SUBSCRIPTION_IDS,
] as const;

export const TEA_TIP_6_ID = 'com.guowu.fasting.tip.tea6';
export const TEA_TIP_18_ID = 'com.guowu.fasting.tip.tea18';
export const TEA_TIP_68_ID = 'com.guowu.fasting.tip.tea68';

export const TEA_TIP_IDS = [TEA_TIP_6_ID, TEA_TIP_18_ID, TEA_TIP_68_ID] as const;

export const ALL_IAP_PRODUCT_IDS = [
  ...ALL_SUBSCRIPTION_IDS,
  ...TEA_TIP_IDS,
] as const;

export const APPLE_EULA_URL = 'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/';
export const PRIVACY_POLICY_URL = 'https://github.com/lijingmt/guowubushi-fasting/blob/main/PRIVACY_POLICY.md';
export const APPLE_MANAGE_SUBS_URL = 'https://apps.apple.com/account/subscriptions';

export interface ProductCatalogFallback {
  id: string;
  tier?: PaidTier;
  titleZh: string;
  titleEn: string;
  titleEs: string;
  descZh: string;
  descEn: string;
  descEs: string;
  fallbackPriceZh: string;
  fallbackPriceEn: string;
  periodLabelZh?: string;
  periodLabelEn?: string;
  periodLabelEs?: string;
  icon: string;
  badgeZh?: string;
  badgeEn?: string;
  badgeEs?: string;
}

export const LITE_PRODUCT_FALLBACKS: Record<string, ProductCatalogFallback> = {
  [LITE_YEARLY_ID]: {
    id: LITE_YEARLY_ID,
    tier: 'lite',
    titleZh: '雅致清修 年卡',
    titleEn: 'Guowu Lite Yearly',
    titleEs: 'Guowu Lite Anual',
    descZh: '年度雅致：解锁全部东方皮肤、节气日签与双轨混音。',
    descEn: 'Yearly themes, Zen posters & dual ambient mixer.',
    descEs: 'Temas, pósters Zen y mezclador dual por un año.',
    fallbackPriceZh: '¥28',
    fallbackPriceEn: '$3.99',
    periodLabelZh: '1 年 · 约 ¥2.3/月',
    periodLabelEn: '1 Year',
    periodLabelEs: '1 Año',
    icon: '🎋',
    badgeZh: '雅致性价比 · 省 61%',
    badgeEn: 'Save 61%',
    badgeEs: 'Ahorra 61%',
  },
  [LITE_MONTHLY_ID]: {
    id: LITE_MONTHLY_ID,
    tier: 'lite',
    titleZh: '雅致清修 月卡',
    titleEn: 'Guowu Lite Monthly',
    titleEs: 'Guowu Lite Mensual',
    descZh: '月度雅致：解锁东方美学皮肤、节气日签与双轨混音。',
    descEn: 'Monthly themes, Zen posters & dual sound mixer.',
    descEs: 'Temas, pósters Zen y mezclador dual al mes.',
    fallbackPriceZh: '¥6',
    fallbackPriceEn: '$0.99',
    periodLabelZh: '1 个月 · 轻量入门',
    periodLabelEn: '1 Month',
    periodLabelEs: '1 Mes',
    icon: '🍃',
  },
};

export const PRO_PRODUCT_FALLBACKS: Record<string, ProductCatalogFallback> = {
  [PRO_YEARLY_ID]: {
    id: PRO_YEARLY_ID,
    tier: 'pro',
    titleZh: '清修 Pro 年卡',
    titleEn: 'Guowu Pro Yearly',
    titleEs: 'Guowu Pro Anual',
    descZh: '年度会员：解锁全部皮肤日签、深析与无限暂停券。',
    descEn: 'Yearly access to all Pro themes, stats & pass.',
    descEs: 'Acceso anual a temas, gráficos y pases ilimitados.',
    fallbackPriceZh: '¥48',
    fallbackPriceEn: '$6.99',
    periodLabelZh: '1 年 · 约 ¥4/月',
    periodLabelEn: '1 Year',
    periodLabelEs: '1 Año',
    icon: '🪷',
    badgeZh: '推荐 · 省 67%',
    badgeEn: 'Best Value · Save 67%',
    badgeEs: 'Recomendado · -67%',
  },
  [PRO_MONTHLY_ID]: {
    id: PRO_MONTHLY_ID,
    tier: 'pro',
    titleZh: '清修 Pro 月卡',
    titleEn: 'Guowu Pro Monthly',
    titleEs: 'Guowu Pro Mensual',
    descZh: '月度会员：解锁美学皮肤、节气日签与双轨混音。',
    descEn: 'Monthly access to skins, posters & sound mixer.',
    descEs: 'Acceso mensual a temas, pósters y mezclador.',
    fallbackPriceZh: '¥12',
    fallbackPriceEn: '$1.99',
    periodLabelZh: '1 个月 · 随用随停',
    periodLabelEn: '1 Month',
    periodLabelEs: '1 Mes',
    icon: '🌙',
  },
};

export const ALL_SUBSCRIPTION_FALLBACKS: Record<string, ProductCatalogFallback> = {
  ...LITE_PRODUCT_FALLBACKS,
  ...PRO_PRODUCT_FALLBACKS,
};

export const TEA_TIP_FALLBACKS: ProductCatalogFallback[] = [
  {
    id: TEA_TIP_6_ID,
    titleZh: '一杯清茶',
    titleEn: 'Cup of Tea',
    titleEs: 'Taza de Té',
    descZh: '请独立开发者喝一杯清茶，支持《过午不食》更新。',
    descEn: 'Buy the indie developer a cup of tea.',
    descEs: 'Invita al creador a una taza de té.',
    fallbackPriceZh: '¥6',
    fallbackPriceEn: '$0.99',
    icon: '🍵',
  },
  {
    id: TEA_TIP_18_ID,
    titleZh: '一壶好茶',
    titleEn: 'Pot of Tea',
    titleEs: 'Tetera',
    descZh: '请开发者喝一壶好茶，支持清净无广告开源项目。',
    descEn: 'Treat the developer to a pot of tea.',
    descEs: 'Apoya el proyecto libre de anuncios.',
    fallbackPriceZh: '¥18',
    fallbackPriceEn: '$2.99',
    icon: '🫖',
  },
  {
    id: TEA_TIP_68_ID,
    titleZh: '一席茶礼',
    titleEn: 'Tea Ceremony Gift',
    titleEs: 'Ceremonia de Té',
    descZh: '诚挚感谢您的慷慨赞赏，助力《过午不食》长久陪伴。',
    descEn: 'Generous supporter tip for Guowu Fasting.',
    descEs: 'Generoso apoyo para Guowu Fasting.',
    fallbackPriceZh: '¥68',
    fallbackPriceEn: '$9.99',
    icon: '🏮',
  },
];

export const FREE_MONTHLY_PAUSE_PASS_LIMIT = 1;

export function resolveSubscriptionTier(activeProductIds: readonly string[]): SubscriptionTier {
  if (activeProductIds.some((id) => (PRO_SUBSCRIPTION_IDS as readonly string[]).includes(id))) {
    return 'pro';
  }
  if (activeProductIds.some((id) => (LITE_SUBSCRIPTION_IDS as readonly string[]).includes(id))) {
    return 'lite';
  }
  return 'free';
}

export function hasTierAccess(
  currentTier: SubscriptionTier,
  requiredTier: PaidTier
): boolean {
  if (requiredTier === 'lite') {
    return currentTier === 'lite' || currentTier === 'pro';
  }
  return currentTier === 'pro';
}

export function isProSkin(skin: ThemeSkinId | undefined): boolean {
  return skin === 'celadon' || skin === 'dunhuang' || skin === 'ink';
}

export function isProPosterStyle(style: PosterStyleId | undefined): boolean {
  return style === 'song_celadon' || style === 'vermilion_gilt' || style === 'midnight_ink';
}

export function isProWellnessWindow(days: 7 | 30 | 90): boolean {
  return days === 30 || days === 90;
}

export function resolveEffectiveThemeSkin(
  skin: ThemeSkinId | undefined,
  hasLiteOrProAccess: boolean
): ThemeSkinId {
  if (!skin || (isProSkin(skin) && !hasLiteOrProAccess)) {
    return 'bamboo';
  }
  return skin;
}

export function resolveEffectivePosterStyle(
  style: PosterStyleId | undefined,
  hasLiteOrProAccess: boolean
): PosterStyleId {
  if (!style || (isProPosterStyle(style) && !hasLiteOrProAccess)) {
    return 'xuan_paper';
  }
  return style;
}

export function getCurrentYearMonth(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

export function canUsePausePassThisMonth(params: {
  isProUnlocked: boolean;
  usageMonth?: string;
  monthlyCount?: number;
  now?: Date;
}): boolean {
  if (params.isProUnlocked) return true;
  const currentMonth = getCurrentYearMonth(params.now);
  if (params.usageMonth !== currentMonth) return true;
  return (params.monthlyCount || 0) < FREE_MONTHLY_PAUSE_PASS_LIMIT;
}

export function getTeaSupporterBadge(
  teaTipsCount: number
): { titleZh: string; titleEn: string; titleEs: string } | null {
  if (!Number.isFinite(teaTipsCount) || teaTipsCount <= 0) return null;
  if (teaTipsCount >= 3) {
    return {
      titleZh: '🍵 同修护持',
      titleEn: '🍵 Zen Patron',
      titleEs: '🍵 Mecenas Zen',
    };
  }
  return {
    titleZh: '🍵 清茶知音',
    titleEn: '🍵 Tea Supporter',
    titleEs: '🍵 Amigo del Té',
  };
}
