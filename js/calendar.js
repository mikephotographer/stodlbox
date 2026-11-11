// Kalender-Export: .ics (Apple/Outlook) und Google-Kalender-Link.
import { vienna, TZ } from './format.js';

const pad = (n) => String(n).padStart(2, '0');
const localStamp = (t) => { const v = vienna(t); return `${v.y}${pad(v.m)}${pad(v.d)}T${pad(v.hh)}${pad(v.mm)}00`; };
const utcStamp = (t) => new Date(t).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

function endOf(e) {
  return new Date(Date.parse(e.starts_at) + (e.duration_min || 90) * 60000).toISOString();
}

function icsEscape(s) {
  return String(s || '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
}

// Zeilen > 75 Oktette falten (RFC 5545)
function fold(line) {
  const bytes = new TextEncoder().encode(line);
  if (bytes.length <= 75) return line;
  const out = [];
  let cur = '';
  let len = 0;
  for (const ch of line) {
    const l = new TextEncoder().encode(ch).length;
    if (len + l > (out.length ? 74 : 75)) { out.push(cur); cur = ''; len = 0; }
    cur += ch;
    len += l;
  }
  out.push(cur);
  return out.join('\r\n ');
}

const VTIMEZONE = [
  'BEGIN:VTIMEZONE', `TZID:${TZ}`,
  'BEGIN:DAYLIGHT', 'TZOFFSETFROM:+0100', 'TZOFFSETTO:+0200', 'TZNAME:CEST', 'DTSTART:19700329T020000', 'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU', 'END:DAYLIGHT',
  'BEGIN:STANDARD', 'TZOFFSETFROM:+0200', 'TZOFFSETTO:+0100', 'TZNAME:CET', 'DTSTART:19701025T030000', 'RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU', 'END:STANDARD',
  'END:VTIMEZONE',
];

export function eventDescription(e, link) {
  const parts = [];
  if (e.workout) parts.push(e.workout_title ? `${e.workout_title}\n${e.workout}` : e.workout);
  else if (e.workout_mode === 'vote') parts.push('WOD wird abgestimmt.');
  if (e.note) parts.push(e.note);
  if (link) parts.push(link);
  return parts.join('\n\n');
}

export function buildIcs(e, link) {
  const lines = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//STODLBOX//DE', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    ...VTIMEZONE,
    'BEGIN:VEVENT',
    `UID:${e.id}@stodlbox`,
    `DTSTAMP:${utcStamp(new Date())}`,
    `DTSTART;TZID=${TZ}:${localStamp(e.starts_at)}`,
    `DTEND;TZID=${TZ}:${localStamp(endOf(e))}`,
    `SUMMARY:${icsEscape('Stodlbox: ' + e.title)}`,
    `DESCRIPTION:${icsEscape(eventDescription(e, link))}`,
    link ? `URL:${link}` : null,
    e.status === 'cancelled' ? 'STATUS:CANCELLED' : 'STATUS:CONFIRMED',
    'END:VEVENT', 'END:VCALENDAR',
  ].filter(Boolean);
  return lines.map(fold).join('\r\n') + '\r\n';
}

export function downloadIcs(e, link) {
  const ics = buildIcs(e, link);
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  if (isIOS) {
    // iOS öffnet text/calendar direkt im Kalender-Dialog
    window.location.href = 'data:text/calendar;charset=utf-8,' + encodeURIComponent(ics);
    return;
  }
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `stodlbox-${e.starts_at.slice(0, 10)}.ics`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

export function googleLink(e, link) {
  const q = new URLSearchParams({
    action: 'TEMPLATE',
    text: 'Stodlbox: ' + e.title,
    dates: `${utcStamp(e.starts_at)}/${utcStamp(endOf(e))}`,
    details: eventDescription(e, link),
    ctz: TZ,
  });
  return 'https://calendar.google.com/calendar/render?' + q.toString();
}
