/**
 * Locale-aware date formatting for reservation views.
 *
 * Azerbaijani (`az`) month/weekday names are spelled out explicitly because the
 * ICU data bundled with Node is not guaranteed to carry the `az` locale — when it
 * is missing, `Intl.DateTimeFormat('az-AZ', { month: 'long' })` silently falls back
 * to the root locale and renders placeholders such as "M08 13, Thu".
 * en / ru / tr are well covered by ICU, so they go through Intl.
 */

const AZ_MONTHS = [
  'yanvar',
  'fevral',
  'mart',
  'aprel',
  'may',
  'iyun',
  'iyul',
  'avqust',
  'sentyabr',
  'oktyabr',
  'noyabr',
  'dekabr',
] as const;

/** Index 0 = Sunday, matching Date#getDay(). */
const AZ_WEEKDAYS = [
  'Bazar',
  'Bazar ertəsi',
  'Çərşənbə axşamı',
  'Çərşənbə',
  'Cümə axşamı',
  'Cümə',
  'Şənbə',
] as const;

interface Parts {
  year: number;
  month: number; // 1-12
  day: number;
  weekday: number; // 0-6, Sunday = 0
  hour: string;
  minute: string;
}

/** Extract calendar parts of an instant as seen in `timeZone`. */
function partsInZone(date: Date, timeZone: string | undefined): Parts {
  const fmt = new Intl.DateTimeFormat('en-US', {
    ...(timeZone ? { timeZone } : {}),
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const map: Record<string, string> = {};
  for (const p of fmt.formatToParts(date)) map[p.type] = p.value;
  const weekdayIndex = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(
    map.weekday ?? 'Sun',
  );
  return {
    year: Number(map.year ?? '1970'),
    month: Number(map.month ?? '1'),
    day: Number(map.day ?? '1'),
    weekday: weekdayIndex < 0 ? 0 : weekdayIndex,
    // Intl renders midnight as "24" in some hour12:false configurations.
    hour: (map.hour ?? '00') === '24' ? '00' : (map.hour ?? '00'),
    minute: map.minute ?? '00',
  };
}

function isAz(locale: string): boolean {
  return locale.toLowerCase().startsWith('az');
}

/** e.g. az -> "8 avqust 2026, Cümə"; en -> "Friday, 8 August 2026" */
export function formatLongDate(value: string | Date, locale: string, timeZone?: string): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return '';
  if (isAz(locale)) {
    const p = partsInZone(date, timeZone);
    return `${p.day} ${AZ_MONTHS[p.month - 1]} ${p.year}, ${AZ_WEEKDAYS[p.weekday]}`;
  }
  return new Intl.DateTimeFormat(locale, {
    ...(timeZone ? { timeZone } : {}),
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

/** e.g. az -> "8 avqust 2026" */
export function formatDateOnly(value: string | Date, locale: string, timeZone?: string): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return '';
  if (isAz(locale)) {
    const p = partsInZone(date, timeZone);
    return `${p.day} ${AZ_MONTHS[p.month - 1]} ${p.year}`;
  }
  return new Intl.DateTimeFormat(locale, {
    ...(timeZone ? { timeZone } : {}),
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

/** 24-hour clock, e.g. "14:30". */
export function formatTime(value: string | Date, locale: string, timeZone?: string): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return '';
  const p = partsInZone(date, timeZone);
  return `${p.hour}:${p.minute}`;
}

/** e.g. az -> "8 avqust 2026, Cümə · 14:30" */
export function formatLongDateTime(
  value: string | Date,
  locale: string,
  timeZone?: string,
): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return '';
  return `${formatLongDate(date, locale, timeZone)} · ${formatTime(date, locale, timeZone)}`;
}

/** Long month + year for calendar headers, e.g. az -> "avqust 2026". */
export function formatMonthYear(date: Date, locale: string): string {
  if (isAz(locale)) {
    return `${AZ_MONTHS[date.getMonth()]} ${date.getFullYear()}`;
  }
  return new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(date);
}
