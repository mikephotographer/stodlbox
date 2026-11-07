// Gerätespeicher: Gruppen-Code, Member, Board-Cache, Hinweise. Alles mit try/catch.

const KEY = 'stodlbox.v1';

function load() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || {};
  } catch {
    return {};
  }
}

let data = load();

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    /* privater Modus o. ä. – dann eben nur für diese Sitzung */
  }
}

export const state = {
  get code() { return data.code || null; },
  set code(v) { data.code = v || null; save(); },

  get member() { return data.member || null; }, // { id, name }
  set member(v) { data.member = v || null; save(); },

  get board() { return data.board || null; },
  set board(v) { data.board = v || null; save(); },

  flag(name) { return !!(data.flags && data.flags[name]); },
  setFlag(name, v = true) {
    data.flags = { ...(data.flags || {}), [name]: v };
    save();
  },

  reset() {
    data = { flags: data.flags };
    save();
  },
};

export const normCode = (c) => String(c || '').trim().toUpperCase();
