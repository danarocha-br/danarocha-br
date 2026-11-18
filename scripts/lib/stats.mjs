// Numbers derived from the raw contribution days.

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export const monthLong = (iso) => MONTHS[Number(iso.slice(5, 7)) - 1];
export const monthName = (iso) => monthLong(iso).slice(0, 3);
export const shortDate = (iso) => `${monthName(iso)} ${Number(iso.slice(8, 10))}`;

export function computeStats(days) {
  const total = days.reduce((sum, d) => sum + d.count, 0);
  const activeDays = days.filter((d) => d.count > 0).length;
  const best = days.reduce((a, b) => (b.count > a.count ? b : a), days[0]);

  // Streaks. Today is not over yet, so an empty last day does not break the current streak.
  let longest = 0;
  let run = 0;
  for (const d of days) {
    run = d.count > 0 ? run + 1 : 0;
    longest = Math.max(longest, run);
  }
  let current = 0;
  for (let i = days.length - 1; i >= 0; i -= 1) {
    if (days[i].count > 0) current += 1;
    else if (i !== days.length - 1) break;
  }

  // Busiest calendar month in the window.
  const byMonth = new Map();
  for (const d of days) byMonth.set(d.date.slice(0, 7), (byMonth.get(d.date.slice(0, 7)) ?? 0) + d.count);
  const [bestMonthKey, bestMonthTotal] = [...byMonth].reduce((a, b) => (b[1] > a[1] ? b : a));
  const bestMonth = { key: bestMonthKey, name: monthLong(`${bestMonthKey}-01`), year: bestMonthKey.slice(0, 4), total: bestMonthTotal };

  return { total, activeDays, totalDays: days.length, best, bestMonth, current, longest };
}

/** Smallest round number of stars one mark can stand for so `max` fits in `capacity` marks. */
export function unitFor(max, capacity) {
  for (let pow = 1; ; pow *= 10) {
    for (const m of [1, 2, 5]) if (max / (m * pow) <= capacity) return m * pow;
  }
}
