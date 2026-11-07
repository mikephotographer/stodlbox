// Mini-Templating mit automatischem Escaping.
// html`…${wert}…` escapt jeden Wert, außer er stammt selbst aus html`` oder raw().

class Raw {
  constructor(s) { this.s = s; }
  toString() { return this.s; }
}

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ESC[c]);

export const raw = (s) => new Raw(String(s));

function part(v) {
  if (v == null || v === false || v === true) return '';
  if (v instanceof Raw) return v.s;
  if (Array.isArray(v)) return v.map(part).join('');
  return esc(v);
}

export function html(strings, ...vals) {
  let out = strings[0];
  for (let i = 0; i < vals.length; i++) out += part(vals[i]) + strings[i + 1];
  return new Raw(out);
}

/** Setzt gerendertes Markup in ein Element. Nur Raw-Objekte aus html`` sind erlaubt. */
export function mount(el, view) {
  if (!(view instanceof Raw)) throw new Error('mount() erwartet html``');
  el.innerHTML = view.s;
}
