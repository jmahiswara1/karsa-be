/**
 * Parse relative date (Indonesia/English) ke ISO date string.
 * Mirror dari ai-karsa/app/utils/date_parser.py untuk backend-side parsing.
 */
const INDONESIAN_DAYS: Record<string, number> = {
  senin: 0,
  selasa: 1,
  rabu: 2,
  kamis: 3,
  jumat: 4,
  sabtu: 5,
  minggu: 6,
};

const ENGLISH_DAYS: Record<string, number> = {
  monday: 0,
  tuesday: 1,
  wednesday: 2,
  thursday: 3,
  friday: 4,
  saturday: 5,
  sunday: 6,
};

const INDONESIAN_MONTHS: Record<string, number> = {
  januari: 1,
  februari: 2,
  maret: 3,
  april: 4,
  mei: 5,
  juni: 6,
  juli: 7,
  agustus: 8,
  september: 9,
  oktober: 10,
  november: 11,
  desember: 12,
};

function toIsoDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Return the next occurrence of a weekday (0=Monday ... 6=Sunday)
 * strictly after base (at least 1 day forward).
 */
function nextWeekday(base: Date, targetWeekday: number): Date {
  // JS getDay: 0=Sunday, 1=Monday, ... 6=Saturday
  // Our mapping: 0=Monday ... 6=Sunday
  const jsTarget = (targetWeekday + 1) % 7;
  const jsBase = base.getDay();
  let diff = jsTarget - jsBase;
  if (diff <= 0) diff += 7;
  const result = new Date(base);
  result.setDate(base.getDate() + diff);
  return result;
}

export function parseDate(
  text: string | null | undefined,
  baseDate?: Date,
): string | null {
  if (!text) return null;
  const base = baseDate || new Date();
  const lower = text.toLowerCase().trim();

  // ISO passthrough
  if (/^\d{4}-\d{2}-\d{2}$/.test(lower)) return lower;

  // Relative: besok / tomorrow
  if (lower === 'besok' || lower === 'tomorrow') {
    const d = new Date(base);
    d.setDate(base.getDate() + 1);
    return toIsoDate(d);
  }

  // Relative: lusa / day after tomorrow
  if (lower === 'lusa') {
    const d = new Date(base);
    d.setDate(base.getDate() + 2);
    return toIsoDate(d);
  }

  // Relative: hari ini / today
  if (lower === 'hari ini' || lower === 'today') {
    return toIsoDate(base);
  }

  // Relative: minggu depan / next week
  if (lower === 'minggu depan' || lower === 'next week') {
    return toIsoDate(nextWeekday(base, 0));
  }

  // Relative: bulan depan / next month
  if (lower === 'bulan depan' || lower === 'next month') {
    const d = new Date(base);
    d.setMonth(d.getMonth() + 1);
    return toIsoDate(d);
  }

  // Relative: akhir bulan / end of month
  if (lower === 'akhir bulan' || lower === 'end of month') {
    const d = new Date(base.getFullYear(), base.getMonth() + 1, 0);
    return toIsoDate(d);
  }

  // Indonesian weekday: "senin", "rabu", etc.
  for (const [day, num] of Object.entries(INDONESIAN_DAYS)) {
    if (lower === day || lower === `${day} depan`) {
      return toIsoDate(nextWeekday(base, num));
    }
  }

  // English weekday: "monday", "next monday", etc.
  for (const [day, num] of Object.entries(ENGLISH_DAYS)) {
    if (lower === day || lower === `next ${day}`) {
      return toIsoDate(nextWeekday(base, num));
    }
  }

  // "tanggal N" - specific date (rolls to next month if past)
  const tanggalMatch = lower.match(/^tanggal\s+(\d{1,2})$/);
  if (tanggalMatch) {
    const dayNum = parseInt(tanggalMatch[1], 10);
    const candidate = new Date(base.getFullYear(), base.getMonth(), dayNum);
    if (candidate < base) {
      candidate.setMonth(candidate.getMonth() + 1);
    }
    return toIsoDate(candidate);
  }

  // "N <month_name>" e.g. "15 juni"
  const monthMatch = lower.match(/^(\d{1,2})\s+([a-z]+)$/);
  if (monthMatch) {
    const dayNum = parseInt(monthMatch[1], 10);
    const monthName = monthMatch[2];
    const monthNum = INDONESIAN_MONTHS[monthName];
    if (monthNum) {
      const candidate = new Date(base.getFullYear(), monthNum - 1, dayNum);
      if (candidate < base) {
        candidate.setFullYear(candidate.getFullYear() + 1);
      }
      return toIsoDate(candidate);
    }
  }

  return null;
}
