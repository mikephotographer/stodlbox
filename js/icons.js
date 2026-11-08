// Inline-SVG-Icons mit Strich. Keine Emojis im UI.
import { raw } from './html.js';

const svg = (body, size = 20, sw = 2) => raw(
  `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="square" stroke-linejoin="miter" aria-hidden="true" focusable="false">${body}</svg>`
);

export const icons = {
  warn: (s = 22) => svg('<path d="M12 3 2 21h20L12 3z"/><path d="M12 10v5"/><path d="M12 18v.5"/>', s, 2.2),
  calendar: (s) => svg('<rect x="3" y="5" width="18" height="16"/><path d="M3 10h18M8 3v4M16 3v4"/>', s),
  share: (s) => svg('<path d="M12 3v13"/><path d="m7 8 5-5 5 5"/><path d="M5 13v8h14v-8"/>', s),
  play: (s = 18) => svg('<path d="M7 4.5v15l12-7.5z" fill="currentColor" stroke="none"/>', s),
  photo: (s) => svg('<rect x="3" y="6" width="18" height="14"/><circle cx="12" cy="13" r="3.5"/><path d="M8 6l2-3h4l2 3"/>', s),
  user: (s = 16) => svg('<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/>', s),
  chevron: (s = 18) => svg('<path d="m9 5 7 7-7 7"/>', s),
  back: (s = 16) => svg('<path d="m15 5-7 7 7 7"/>', s),
  plus: (s = 26) => svg('<path d="M12 4v16M4 12h16"/>', s, 3),
  close: (s = 20) => svg('<path d="M5 5l14 14M19 5 5 19"/>', s),
  check: (s = 16) => svg('<path d="m4 12 5 5L20 6"/>', s, 3),
  shuffle: (s = 18) => svg('<path d="M16 3h5v5"/><path d="M4 20 21 3"/><path d="M21 16v5h-5"/><path d="M15 15l6 6"/><path d="M4 4l5 5"/>', s),
  refresh: (s = 18) => svg('<path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 4v7h-7"/>', s),
  list: (s = 22) => svg('<path d="M4 6h16M4 12h16M4 18h16"/>', s),
  vote: (s = 22) => svg('<path d="M4 20h16"/><rect x="5" y="11" width="3" height="9"/><rect x="10.5" y="6" width="3" height="14"/><rect x="16" y="14" width="3" height="6"/>', s),
  timer: (s = 22) => svg('<circle cx="12" cy="14" r="7"/><path d="M12 14V10M10 3h4M12 3v4M18 7l1.5-1.5"/>', s),
  trophy: (s = 22) => svg('<path d="M8 4h8v5a4 4 0 0 1-8 0z"/><path d="M8 6H4v1.5A3.5 3.5 0 0 0 8.5 11M16 6h4v1.5a3.5 3.5 0 0 1-4.5 3.5"/><path d="M12 13v4M8 21h8M10 17h4v4"/>', s),
  lock: (s = 16) => svg('<rect x="5" y="11" width="14" height="10"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>', s),
  archive: (s = 22) => svg('<path d="M3 4h18v4H3z"/><path d="M5 8v12h14V8"/><path d="M10 12h4"/>', s),
  doc: (s = 22) => svg('<path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5M9 13h7M9 17h7"/>', s),
  bag: (s = 22) => svg('<path d="M4 8h16l-1 13H5z"/><path d="M9 8V5h6v3"/>', s),
  more: (s = 22) => svg('<circle cx="5" cy="12" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="19" cy="12" r="1.2"/>', s, 2.6),
  download: (s) => svg('<path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M4 21h16"/>', s),
  link: (s) => svg('<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>', s),
  copy: (s) => svg('<rect x="8" y="8" width="13" height="13"/><path d="M16 8V3H3v13h5"/>', s),
  home: (s) => svg('<path d="M3 11 12 3l9 8"/><path d="M5 10v11h14V10"/>', s),
};
