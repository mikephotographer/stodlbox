// Untere Leiste (Freunde und Admin): schwarz wie der Kopf, gelbe Markierung beim aktiven Punkt.
import { html, mount } from '../html.js';

/** tabs: [[href, label, icon, key]], active: key */
export function tabbar(tabs, active, label) {
  document.querySelector('.tabbar')?.remove();
  const el = document.createElement('div');
  el.className = 'tabbar band';
  mount(el, html`<nav aria-label="${label}">${tabs.map(([href, text, icon, key]) => html`<a href="${href}"
    ${key === active ? html`aria-current="page"` : ''}>${icon(22)}<span>${text}</span></a>`)}</nav>`);
  document.getElementById('app').after(el);
  document.getElementById('app').classList.add('has-tabbar');
}
