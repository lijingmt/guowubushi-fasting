import type { Language } from '../i18n/translations';

export interface DeviceLocaleInput {
  languageCode?: string | null;
  languageTag?: string | null;
  languageScriptCode?: string | null;
  regionCode?: string | null;
  measurementSystem?: string | null;
}

const SUPPORTED_LANGUAGE_CODES: Record<string, Language> = {
  en: 'en',
  es: 'es',
  ja: 'ja',
  ko: 'ko',
  fr: 'fr',
  de: 'de',
  pt: 'pt',
  ru: 'ru',
  ar: 'ar',
  it: 'it',
  hi: 'hi',
  vi: 'vi',
  th: 'th',
};

const TRADITIONAL_CHINESE_REGIONS = new Set(['TW', 'HK', 'MO']);

/**
 * Resolves the device OS locale list into the initial app UI language and weight unit.
 * Checks Chinese script/region variants before mapping 2-letter codes so zh-Hant is reachable.
 */
export function resolveDeviceLocale(
  locales?: readonly DeviceLocaleInput[] | null
): { language: Language; weightUnit: 'kg' | 'lb' } {
  const primary = locales && locales.length > 0 ? locales[0] : null;
  if (!primary) {
    return { language: 'en', weightUnit: 'lb' };
  }

  const code = (primary.languageCode || '').trim().toLowerCase();
  const tag = (primary.languageTag || '').trim().toLowerCase();
  const script = (primary.languageScriptCode || '').trim().toLowerCase();
  const region = (primary.regionCode || '').trim().toUpperCase();
  const ms = (primary.measurementSystem || '').trim().toLowerCase();

  let language: Language = 'en';

  if (code === 'zh' || code.startsWith('zh') || tag.startsWith('zh')) {
    const isTraditional =
      script === 'hant' ||
      tag.includes('hant') ||
      TRADITIONAL_CHINESE_REGIONS.has(region) ||
      tag.includes('-tw') ||
      tag.includes('-hk') ||
      tag.includes('-mo') ||
      tag.includes('_tw') ||
      tag.includes('_hk') ||
      tag.includes('_mo');
    language = isTraditional ? 'zh-Hant' : 'zh';
  } else {
    const baseTag = tag.split(/[-_]/)[0];
    const lookup = SUPPORTED_LANGUAGE_CODES[code] || SUPPORTED_LANGUAGE_CODES[baseTag];
    if (lookup) {
      language = lookup;
    }
  }

  const weightUnit: 'kg' | 'lb' = ms === 'us' || region === 'US' ? 'lb' : 'kg';
  return { language, weightUnit };
}

/**
 * Picks localized copy for Simplified/Traditional Chinese, Spanish, or English fallback.
 */
export function pickLocalized<T>(
  language: string,
  copy: { zh: T; en: T; es?: T }
): T {
  if (language === 'zh' || language === 'zh-Hant') {
    return copy.zh;
  }
  if (language === 'es') {
    return copy.es ?? copy.en;
  }
  return copy.en;
}
