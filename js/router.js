// Hash-Router (#/, #/t/:id, #/archiv, #/admin/...), weil GitHub Pages keine SPA-Rewrites kann.

let routes = [];
let notFound = null;
let current = { path: '/', params: [], query: new URLSearchParams() };

export function parseHash(hash = location.hash) {
  const h = hash.replace(/^#/, '') || '/';
  const [path, q = ''] = h.split('?');
  return { path: path || '/', query: new URLSearchParams(q) };
}

export function navigate(path, { replace = false } = {}) {
  const target = '#' + path;
  if (location.hash === target) {
    render();
    return;
  }
  if (replace) {
    history.replaceState(null, '', location.pathname + location.search + target);
    render();
  } else {
    location.hash = target;
  }
}

export const route = () => current;

export async function render() {
  const { path, query } = parseHash();
  for (const [re, view] of routes) {
    const m = path.match(re);
    if (m) {
      current = { path, params: m.slice(1), query };
      await view(...m.slice(1));
      return;
    }
  }
  current = { path, params: [], query };
  if (notFound) await notFound(path);
}

export function startRouter(table, fallback) {
  routes = table;
  notFound = fallback;
  window.addEventListener('hashchange', () => render());
  return render();
}
