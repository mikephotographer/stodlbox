// Datum und Zeit, immer in Europe/Vienna.

export const TZ = 'Europe/Vienna';

const WD_LONG = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];
const WD_SHORT = ['MO', 'DI', 'MI', 'DO', 'FR', 'SA', 'SO'];
const MON_LONG = ['Jänner', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
const MON_SHORT = ['JÄN', 'FEB', 'MÄR', 'APR', 'MAI', 'JUN', 'JUL', 'AUG', 'SEP', 'OKT', 'NOV', 'DEZ'];
const WD_EN = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };

const partsFmt = new Intl.DateTimeFormat('en-US', {
  timeZone: TZ, hourCycle: 'h23',
  year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', weekday: 'short',
});

/** Zerlegt einen Zeitpunkt in Wiener Ortszeit. wd: 0 = Montag */
export function vienna(input) {
  const d = input instanceof Date ? input : new Date(input);
  const p = {};
  for (const { type, value } of partsFmt.formatToParts(d)) p[type] = value;
  return {
    y: +p.year, m: +p.month, d: +p.day, hh: +p.hour % 24, mm: +p.minute, ss: +p.second,
    wd: WD_EN[p.weekday],
  };
}

const pad = (n) => String(n).padStart(2, '0');

export const hhmm = (t) => { const v = vienna(t); return `${pad(v.hh)}:${pad(v.mm)}`; };
export const dayNum = (t) => String(vienna(t).d);
/** SA 14.11. · 09:00 */
export function short(t) {
  const v = vienna(t);
  return `${WD_SHORT[v.wd]} ${pad(v.d)}.${pad(v.m)}. · ${pad(v.hh)}:${pad(v.mm)}`;
}
/** SA 14.11. */
export function shortDate(t) {
  const v = vienna(t);
  return `${WD_SHORT[v.wd]} ${pad(v.d)}.${pad(v.m)}.`;
}
/** SAMSTAG · NOV · 09:00 */
export function heroMeta(t) {
  const v = vienna(t);
  return `${WD_LONG[v.wd].toUpperCase()} · ${MON_SHORT[v.m - 1]} · ${pad(v.hh)}:${pad(v.mm)}`;
}
/** Samstag, 14. November */
export function long(t) {
  const v = vienna(t);
  return `${WD_LONG[v.wd]}, ${v.d}. ${MON_LONG[v.m - 1]}`;
}
/** Sa 14.11. (für Share-Texte) */
export function shareDate(t) {
  const v = vienna(t);
  const wd = WD_SHORT[v.wd];
  return `${wd[0]}${wd[1].toLowerCase()} ${pad(v.d)}.${pad(v.m)}.`;
}
/** FR 20:00 */
export function deadline(t) {
  const v = vienna(t);
  return `${WD_SHORT[v.wd]} ${pad(v.d)}.${pad(v.m)}. ${pad(v.hh)}:${pad(v.mm)}`;
}

/** Für <input type=date> / <input type=time> in Wiener Zeit */
export function toDateInput(t) { const v = vienna(t); return `${v.y}-${pad(v.m)}-${pad(v.d)}`; }
export function toTimeInput(t) { const v = vienna(t); return `${pad(v.hh)}:${pad(v.mm)}`; }

/** Wiener Ortszeit (YYYY-MM-DD, HH:MM) → ISO-Zeitpunkt (UTC). Berücksichtigt Sommerzeit. */
export function viennaToISO(dateStr, timeStr = '00:00') {
  const [y, m, d] = dateStr.split('-').map(Number);
  const [hh, mm] = timeStr.split(':').map(Number);
  const wanted = Date.UTC(y, m - 1, d, hh, mm);
  let guess = wanted;
  for (let i = 0; i < 3; i++) {
    const v = vienna(new Date(guess));
    const shown = Date.UTC(v.y, v.m - 1, v.d, v.hh, v.mm);
    const diff = shown - wanted;
    if (diff === 0) break;
    guess -= diff;
  }
  return new Date(guess).toISOString();
}

/** Heute in Wien als YYYY-MM-DD */
export const todayInput = () => toDateInput(new Date());

/** Tage zwischen heute (Wien) und dem Termin */
export function relDay(t) {
  const a = toDateInput(new Date());
  const b = toDateInput(t);
  const diff = Math.round((Date.parse(b) - Date.parse(a)) / 86400000);
  if (diff === 0) return 'HEUTE';
  if (diff === 1) return 'MORGEN';
  if (diff > 1 && diff < 7) return `IN ${diff} TAGEN`;
  return '';
}

export const WEEKDAYS = WD_LONG;
