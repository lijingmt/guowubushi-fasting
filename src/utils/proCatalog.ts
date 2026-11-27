import type { PosterStyleId, ThemeSkinId } from '../types';

export const PRO_MONTHLY_ID = 'com.guowu.fasting.pro.monthly';
export const PRO_YEARLY_ID = 'com.guowu.fasting.pro.yearly';

export const PRO_SUBSCRIPTION_IDS = [PRO_YEARLY_ID, PRO_MONTHLY_ID] as const;

export const TEA_TIP_6_ID = 'com.guowu.fasting.tip.tea6';
export const TEA_TIP_18_ID = 'com.guowu.fasting.tip.tea18';
export const TEA_TIP_68_ID = 'com.guowu.fasting.tip.tea68';

export const TEA_TIP_IDS = [TEA_TIP_6_ID, TEA_TIP_18_ID, TEA_TIP_68_ID] as const;

export const ALL_IAP_PRODUCT_IDS = [...PRO_SUBSCRIPTION_IDS, ...TEA_TIP_IDS] as const;

export const APPLE_EULA_URL = 'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/';
export const PRIVACY_POLICY_URL = 'https://github.com/lijingmt/guowubushi-fasting/blob/main/PRIVACY_POLICY.md';
export const APPLE_MANAGE_SUBS_URL = 'https://apps.apple.com/account/subscriptions';

export interface ProductCatalogFallback {
  id: string;
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

export const PRO_PRODUCT_FALLBACKS: Record<string, ProductCatalogFallback> = {
  [PRO_YEARLY_ID]: {
    id: PRO_YEARLY_ID,
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
  isProUnlocked: boolean
): ThemeSkinId {
  if (!skin || (isProSkin(skin) && !isProUnlocked)) {
    return 'bamboo';
  }
  return skin;
}

export function resolveEffectivePosterStyle(
  style: PosterStyleId | undefined,
  isProUnlocked: boolean
): PosterStyleId {
  if (!style || (isProPosterStyle(style) && !isProUnlocked)) {
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
