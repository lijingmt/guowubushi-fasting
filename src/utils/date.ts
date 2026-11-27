const DATE_REGEX = /^(\d{4})-(\d{2})-(\d{2})$/;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Formats a Date into local calendar YYYY-MM-DD (avoiding UTC day shifts).
 */
export function getLocalDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Checks whether a string is a valid YYYY-MM-DD calendar date.
 */
export function isValidDateString(dateStr: string): boolean {
  const match = DATE_REGEX.exec(dateStr);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(year, month - 1, day, 12, 0, 0, 0);
  return (
    parsed.getFullYear() === year &&
    parsed.getMonth() === month - 1 &&
    parsed.getDate() === day
  );
}

/**
 * Parses YYYY-MM-DD into local noon to avoid DST midnight shifts.
 */
export function parseLocalDate(dateStr: string): Date {
  const match = DATE_REGEX.exec(dateStr);
  if (!match) {
    return new Date(dateStr);
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  return new Date(year, month - 1, day, 12, 0, 0, 0);
}

/**
 * Adds a signed integer number of calendar days to a YYYY-MM-DD date.
 */
export function addLocalDays(dateStr: string, days: number): string {
  const date = parseLocalDate(dateStr);
  date.setDate(date.getDate() + days);
  return getLocalDateString(date);
}

/**
 * Returns the exact signed calendar day difference: laterDateStr - earlierDateStr.
 */
export function diffLocalDays(laterDateStr: string, earlierDateStr: string): number {
  const m1 = DATE_REGEX.exec(laterDateStr);
  const m2 = DATE_REGEX.exec(earlierDateStr);
  if (!m1 || !m2) {
    return Math.round((parseLocalDate(laterDateStr).getTime() - parseLocalDate(earlierDateStr).getTime()) / MS_PER_DAY);
  }
  const utc1 = Date.UTC(Number(m1[1]), Number(m1[2]) - 1, Number(m1[3]));
  const utc2 = Date.UTC(Number(m2[1]), Number(m2[2]) - 1, Number(m2[3]));
  return Math.round((utc1 - utc2) / MS_PER_DAY);
}

/**
 * Returns the local Monday YYYY-MM-DD key for the week containing dateStr.
 */
export function getLocalWeekKey(dateStr: string = getLocalDateString()): string {
  const date = parseLocalDate(dateStr);
  const day = date.getDay() || 7; // Sunday=7, Monday=1
  return addLocalDays(dateStr, -(day - 1));
}

/**
 * Checks whether the active UI language is Simplified or Traditional Chinese.
 */
export function isChineseLanguage(lang?: string): boolean {
  return lang === 'zh' || lang === 'zh-Hant';
}
