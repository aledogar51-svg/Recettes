/* Mes recettes — appli (partie publique, sans aucune recette dedans).
 * Les recettes et le planning sont lus depuis le Google Sheet privé (Apps Script).
 */
'use strict';

// ⬇️ Colle ici l'URL de ton Apps Script (elle se termine par /exec)
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwsEE9Biy4Qr8ACN5_fiCnqlCLURvxTCUuu3qHHo6X2zCCrcKOjFArArxASQK0k8AkW/exec';

/* ------------------------------------------------------------------ */
/*  Outils                                                             */
/* ------------------------------------------------------------------ */
const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const lire = (k, d) => { try { const v = localStorage.getItem('rec:' + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } };
const ecrire = (k, v) => { try { localStorage.setItem('rec:' + k, JSON.stringify(v)); } catch (e) { /* stockage plein */ } };
const norm = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const plusJours = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const urlImage = (u) => (/^https?:\/\//i.test(u || '') ? u.replace(/[\s"'()\\]/g, (c) => '%' + c.charCodeAt(0).toString(16).padStart(2, '0')) : '');

const PASTELS = ['#E9C9A8', '#CFE0C8', '#F2DE9E', '#F2D2C4', '#D9E4C9', '#E8D9B5', '#D6E2EA', '#EAD4E0'];
function couleur(t) { let h = 0; for (const c of String(t)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return PASTELS[h % PASTELS.length]; }
function fondImage(r) {
  const u = urlImage(r.photo);
  return `background-color:${couleur(r.titre)};${u ? `background-image:url("${u}")` : ''}`;
}
const initiale = (r) => (urlImage(r.photo) ? '' : esc((r.titre || '?').trim().charAt(0).toUpperCase()));

const I = {
  retour: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg>',
  suivant: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>',
  fermer: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>',
  loupe: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#55615B" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
  synchro: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a9 9 0 1 1-3-6.7"/><path d="M21 4v5h-5"/></svg>',
  reglages: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>',
  coeurPlein: '<svg width="22" height="22" viewBox="0 0 24 24" fill="#C2410C" stroke="#C2410C" stroke-width="2" stroke-linejoin="round" aria-hidden="true"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/></svg>',
  coeurVide: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#8A948F" stroke-width="2" stroke-linejoin="round" aria-hidden="true"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/></svg>',
  livre: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M4 19V5"/></svg>',
  coeurNav: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" aria-hidden="true"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/></svg>',
  agenda: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>',
  plus: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
  panier: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 4h2l2.4 11h11L21 7H6.2"/><circle cx="9" cy="19" r="1.5"/><circle cx="17" cy="19" r="1.5"/></svg>',
  toque: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 13.9A4 4 0 0 1 7 6a5 5 0 0 1 10 0 4 4 0 0 1 1 7.9V20H6z"/><path d="M6 17h12"/></svg>',
  doc: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6M8 13h8M8 17h5"/></svg>',
  lien: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/></svg>',
  photo: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>',
  crayon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>',
  dossier: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>',
  chrono: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2.5M9 2h6"/></svg>',
  soleil: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2"/></svg>',
  inverse: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/></svg>',
  partager: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4"/></svg>'
};

/* ------------------------------------------------------------------ */
/*  État                                                               */
/* ------------------------------------------------------------------ */
const S = {
  code: lire('code', ''),
  prenom: lire('prenom', ''),
  recettes: lire('cache-recettes', []),
  planning: lire('cache-planning', []),
  dossierUrl: lire('dossier', ''),
  favoris: new Set(lire('favoris', [])),
  filtre: { q: '', cat: 'Tout', app: 'Tous' },
  portions: {},      // id → nombre de personnes choisi
  coches: {},        // id → Set d'index d'ingrédients cochés
  onglet: 'ing',
  choix: null,       // { date, moment } quand on choisit une recette depuis le planning
  chargement: false,
  erreur: '',
  lienPartage: '',
  minuteur: null
};

// Code passé dans l'adresse (#code=…) : on le mémorise puis on l'efface de l'URL
(function () {
  const m = location.hash.match(/code=([^&]+)/);
  if (m) { S.code = decodeURIComponent(m[1]); ecrire('code', S.code); history.replaceState(null, '', location.pathname + '#/'); }
  // Partage Android (« Partager » → Mes recettes) : ?url=…&text=…
  const q = new URLSearchParams(location.search);
  const partage = q.get('url') || (q.get('text') || '').match(/https?:\/\/\S+/)?.[0] || '';
  if (partage) { S.lienPartage = partage; history.replaceState(null, '', location.pathname + '#/ajouter'); }
})();

const recette = (id) => S.recettes.find((r) => r.id === id);

/* ------------------------------------------------------------------ */
/*  Serveur                                                            */
/* ------------------------------------------------------------------ */
async function api(action, params = {}) {
  const u = new URL(SCRIPT_URL);
  u.searchParams.set('code', S.code);
  u.searchParams.set('action', action);
  Object.entries(params).forEach(([k, v]) => u.searchParams.set(k, v));
  const r = await fetch(u.toString());
  const j = await r.json();
  if (!j.ok) {
    if (j.erreur === 'code') { S.code = ''; ecrire('code', ''); rendre(); throw new Error('Code incorrect'); }
    throw new Error(j.erreur || 'Erreur');
  }
  return j;
}

async function charger(forcer) {
  if (!SCRIPT_URL || !S.code) return;
  S.chargement = true; S.erreur = ''; majBoutonSynchro();
  try {
    const [j] = await Promise.all([api('recettes', forcer ? { forcer: 1 } : {}), chargerPlanning(true).catch(() => {})]);
    // On n'affiche que les Docs qui ressemblent à une recette (ingrédients ou étapes)
    S.recettes = (j.recettes || []).filter((r) => (r.ingredients || []).some((i) => i.t) || (r.etapes || []).some((e) => e.t));
    S.dossierUrl = j.dossierUrl || '';
    ecrire('cache-recettes', S.recettes);
    ecrire('dossier', S.dossierUrl);
  } catch (e) {
    S.erreur = navigator.onLine === false || e instanceof TypeError
      ? 'Pas de connexion : ce sont les recettes enregistrées sur le téléphone.'
      : e.message;
  }
  S.chargement = false;
  rendre();
}

async function chargerPlanning(silencieux) {
  const auj = new Date();
  const j = await api('planning', { du: iso(plusJours(auj, -1)), au: iso(plusJours(auj, 45)) });
  S.planning = j.planning || [];
  ecrire('cache-planning', S.planning);
  if (!silencieux) rendre();
}

/* ------------------------------------------------------------------ */
/*  Quantités, réglages, minuteur                                      */
/* ------------------------------------------------------------------ */
const FRACTIONS = { '½': 0.5, '¼': 0.25, '¾': 0.75, '⅓': 1 / 3, '⅔': 2 / 3 };

function nbPortions(r) { const m = String(r.portions || '').match(/\d+/); return m ? +m[0] : 0; }

function formatNombre(v) {
  if (v >= 100) return String(Math.round(v / 5) * 5);
  if (v >= 10) return String(Math.round(v));
  const arr = Math.round(v * 4) / 4;
  const ent = Math.floor(arr), reste = arr - ent;
  const f = { 0.25: '¼', 0.5: '½', 0.75: '¾' }[reste];
  if (!f) return String(ent || arr);
  return (ent ? ent + ' ' : '') + f;
}

function ajuster(t, ratio) {
  if (ratio === 1) return t;
  return t.replace(/^(\d+\s+\d\/\d|\d+\s*\/\s*\d+|\d+(?:[.,]\d+)?|[½¼¾⅓⅔])/, (m) => {
    let v;
    if (FRACTIONS[m] !== undefined) v = FRACTIONS[m];
    else if (/\d+\s+\d\/\d/.test(m)) { const [e, f] = m.trim().split(/\s+/); const [a, b] = f.split('/'); v = +e + a / b; }
    else if (m.includes('/')) { const [a, b] = m.split('/'); v = a / b; }
    else v = parseFloat(m.replace(',', '.'));
    if (!isFinite(v)) return m;
    return formatNombre(v * ratio);
  });
}

const MOTS_VIDES = new Set(['de', 'du', 'des', 'la', 'le', 'les', 'et', 'ou', 'en', 'au', 'aux', 'un', 'une', 'pour', 'avec', 'sans', 'petit', 'petite', 'gros', 'grosse', 'bien']);
function motCle(ing) {
  const s = norm(ing)
    .replace(/^[\d.,\/½¼¾⅓⅔\s-]+/, '')
    .replace(/^(g|kg|mg|ml|cl|dl|l|cs|cc|c\.?\s?a\s?s\.?|c\.?\s?a\s?c\.?|cuill?eres?\s+a\s+(soupe|cafe)|pincees?|gousses?|tranches?|sachets?|boites?|verres?|bouquets?|brins?|feuilles?|morceaux?|pots?|briques?|filets?|tasses?|noix|noisettes?)\b\.?\s*/, '')
    .replace(/^(de |d'|d’|du |des )/, '');
  const mot = s.split(/[^a-z]+/).find((w) => w.length >= 3 && !MOTS_VIDES.has(w));
  return mot ? mot.replace(/(s|x)$/, '') : '';
}
// L'ingrédient est-il cité dans le texte de l'étape ? (mot entier, singulier ou pluriel)
function citeDans(ing, texteNorm) {
  const m = motCle(ing);
  return !!m && new RegExp(`(^|[^a-z])${m}(s|x)?([^a-z]|$)`).test(texteNorm);
}

function analyserReglages(e, appareil) {
  const res = { temps: '', temp: '', vitesse: '', extra: [] };
  const app = norm(appareil);
  if (e.reglages && e.reglages.length) {
    e.reglages.forEach((s) => {
      const l = norm(s);
      if (!res.vitesse && /vitesse|turbo|mijotage|cuill|^v\s?\d/.test(l)) res.vitesse = s.replace(/^vitesse\s*/i, '').replace(/^v\s?(?=\d)/i, '');
      else if (!res.temp && /°|varoma/.test(l)) res.temp = s;
      else if (!res.temps && /^\d+([.,]\d+)?\s*(h|min|mn|sec|s)\b/.test(l)) res.temps = s;
      else res.extra.push(s);
    });
  } else if (/thermomix|cookeo/.test(app)) {
    const t = e.t;
    const mT = t.match(/\d+(?:[.,]\d+)?\s*(?:min|mn|sec|s|h)\b(?:\s*\d+\s*(?:sec|s|min)\b)?/i);
    const mC = t.match(/\d{2,3}\s*°\s*C?|varoma/i);
    const mV = t.match(/vitesse\s*(\d+(?:[.,]\d+)?(?:\s*(?:-|à)\s*\d+)?|cuill[eè]re|mijotage|turbo)/i);
    if (mT) res.temps = mT[0];
    if (mC) res.temp = mC[0];
    if (mV) res.vitesse = mV[1];
    // Étape sans vitesse ni Varoma (four, poêle…) : on garde le temps pour le minuteur
    if (/thermomix/.test(app) && !mV && !/varoma|sens inverse/i.test(t)) res.horsRobot = true;
    const mK = t.match(/cuisson sous pression|mode dorer|dorer|mijoter|maintien au chaud|cuisson douce/i);
    if (/cookeo/.test(app) && mK) res.extra.push(mK[0].charAt(0).toUpperCase() + mK[0].slice(1));
  }
  if (/sens inverse/i.test(e.t) && !res.extra.some((x) => /inverse/i.test(x))) res.extra.push('Sens inverse');
  res.extra = res.extra.map((x) => x.charAt(0).toUpperCase() + x.slice(1));
  return res;
}

function secondes(txt) {
  const m = String(txt || '').match(/(\d+(?:[.,]\d+)?)\s*(h|min|mn|sec|s)\b(?:\s*(\d+)\s*(min|sec|s)?\b)?/i);
  if (!m) return 0;
  const v = parseFloat(m[1].replace(',', '.'));
  const u = m[2].toLowerCase();
  let s = u === 'h' ? v * 3600 : (u === 'min' || u === 'mn') ? v * 60 : v;
  if (m[3]) s += u === 'h' ? +m[3] * 60 : +m[3];
  return Math.round(s);
}

const mmss = (s) => { s = Math.max(0, Math.ceil(s)); const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60; return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(x).padStart(2, '0'); };
const libDuree = (s) => (s >= 3600 ? `${Math.floor(s / 3600)} h ${String(Math.round((s % 3600) / 60)).padStart(2, '0')}` : s >= 60 ? `${Math.round(s / 60)} min` : `${s} s`);

let audio = null;
function bip() {
  try {
    audio = audio || new (window.AudioContext || window.webkitAudioContext)();
    [0, 0.35, 0.7].forEach((t) => {
      const o = audio.createOscillator(), g = audio.createGain();
      o.frequency.value = 880; o.connect(g); g.connect(audio.destination);
      g.gain.setValueAtTime(0.0001, audio.currentTime + t);
      g.gain.exponentialRampToValueAtTime(0.4, audio.currentTime + t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + t + 0.25);
      o.start(audio.currentTime + t); o.stop(audio.currentTime + t + 0.3);
    });
  } catch (e) { /* pas de son */ }
}

function demarrerMinuteur(sec, label) {
  arreterMinuteur();
  try { audio = audio || new (window.AudioContext || window.webkitAudioContext)(); audio.resume(); } catch (e) { /* */ }
  S.minuteur = { fin: Date.now() + sec * 1000, label, fini: false, rappels: 0 };
  S.minuteur.int = setInterval(tic, 500);
  tic();
}
function arreterMinuteur() { if (S.minuteur) clearInterval(S.minuteur.int); S.minuteur = null; majMinuteur(); }
function tic() {
  const m = S.minuteur; if (!m) return;
  const reste = (m.fin - Date.now()) / 1000;
  if (reste <= 0 && !m.fini) { m.fini = true; }
  if (m.fini && m.rappels < 6 && (m.rappels === 0 || Date.now() - m.dernier > 4000)) {
    m.rappels++; m.dernier = Date.now(); bip();
    if (navigator.vibrate) navigator.vibrate([400, 150, 400, 150, 400]);
  }
  majMinuteur();
}
function majMinuteur() {
  const b = $('#btn-minuteur'); if (!b) return;
  const m = S.minuteur;
  b.classList.toggle('actif', !!m && !m.fini);
  b.classList.toggle('fini', !!m && m.fini);
  const l = b.querySelector('span');
  if (!m) l.textContent = b.dataset.texte;
  else if (m.fini) l.textContent = 'Terminé ! Touche pour arrêter';
  else l.textContent = `${mmss((m.fin - Date.now()) / 1000)} · touche pour arrêter`;
}

let verrou = null;
async function garderEcran(on) {
  try {
    if (on && !verrou && 'wakeLock' in navigator) {
      verrou = await navigator.wakeLock.request('screen');
      verrou.addEventListener('release', () => { verrou = null; });
    } else if (!on && verrou) { await verrou.release(); verrou = null; }
  } catch (e) { /* refusé */ }
}
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && route().vue === 'cuisine') garderEcran(true);
});

/* ------------------------------------------------------------------ */
/*  Routage                                                            */
/* ------------------------------------------------------------------ */
function route() {
  const h = location.hash.replace(/^#\/?/, '');
  const [chemin] = h.split('?');
  const p = chemin.split('/').filter(Boolean);
  if (p[0] === 'r' && p[1]) return p[2] === 'cuisine' ? { vue: 'cuisine', id: p[1], n: Math.max(0, (+p[3] || 1) - 1) } : { vue: 'recette', id: p[1] };
  if (['favoris', 'planning', 'ajouter', 'reglages'].includes(p[0])) return { vue: p[0] };
  return { vue: 'accueil' };
}

function rendre() {
  const r = route();
  document.body.classList.toggle('cuisine', r.vue === 'cuisine');
  document.body.classList.toggle('sans-nav', r.vue === 'recette' || r.vue === 'cuisine');
  if (r.vue !== 'cuisine') garderEcran(false);

  let html;
  if (!SCRIPT_URL) html = vueSansServeur();
  else if (!S.code) html = vueCode();
  else if (r.vue === 'recette') html = vueRecette(r.id);
  else if (r.vue === 'cuisine') html = vueCuisine(r.id, r.n);
  else if (r.vue === 'favoris') html = vueFavoris();
  else if (r.vue === 'planning') html = vuePlanning();
  else if (r.vue === 'ajouter') html = vueAjouter();
  else if (r.vue === 'reglages') html = vueReglages();
  else html = vueAccueil();

  $('#app').innerHTML = html;
  $('#nav').innerHTML = (SCRIPT_URL && S.code && !['recette', 'cuisine'].includes(r.vue)) ? navHtml(r.vue) : '';
  $('#nav').hidden = !$('#nav').innerHTML;
  if (r.vue === 'cuisine') { garderEcran(true); majMinuteur(); }
}

function navHtml(v) {
  const l = (href, id, ico, txt) => `<a href="${href}" class="${v === id ? 'actif' : ''}" ${v === id ? 'aria-current="page"' : ''}>${ico}${txt}</a>`;
  return l('#/', 'accueil', I.livre, 'Recettes') + l('#/favoris', 'favoris', I.coeurNav, 'Favoris') +
    l('#/planning', 'planning', I.agenda, 'Planning') + l('#/ajouter', 'ajouter', I.plus, 'Ajouter');
}

/* ------------------------------------------------------------------ */
/*  Vues                                                               */
/* ------------------------------------------------------------------ */
function vueSansServeur() {
  return `<div class="entete"><h1 class="grand-titre">Mes recettes</h1>
    <p class="texte">L'appli n'est pas encore reliée à ton Google Sheet privé. Colle l'URL de l'Apps Script dans <b>app.js</b> (ligne <code>SCRIPT_URL</code>), comme indiqué dans le README.</p></div>`;
}

function vueCode() {
  return `<div class="entete"><span class="sur-titre">Bienvenue</span><h1 class="grand-titre">Mes recettes</h1>
    <p class="texte">Entre le code secret (il se trouve dans l'onglet « Réglages » du Google Sheet).</p>
    <form id="form-code" class="champ">
      <label for="code">Code secret</label>
      <input id="code" name="code" autocomplete="off" autocapitalize="none" required>
      <button class="btn-plein" type="submit">Entrer</button>
    </form></div>`;
}

const CATEGORIES = ['Plat', 'Entrée', 'Dessert', 'Boisson', 'Apéro', 'Boulangerie'];
const APPAREILS = ['Tous', 'Thermomix', 'Cookeo', 'Classique'];

function filtrees() {
  const { q, cat, app } = S.filtre;
  const nq = norm(q).trim();
  return S.recettes.filter((r) =>
    (cat === 'Tout' || r.categorie === cat) &&
    (app === 'Tous' || norm(r.appareil).includes(norm(app))) &&
    (!nq || norm(r.titre).includes(nq) || r.ingredients.some((i) => i.t && norm(i.t).includes(nq))));
}

function metaRecette(r) {
  const parts = [r.categorie, r.appareil, r.total || [r.prepa, r.cuisson].filter(Boolean).join(' + ')].filter(Boolean);
  return parts.join(' · ');
}

function ligneRecette(r) {
  const fav = S.favoris.has(r.id);
  return `<div class="ligne-recette">
    <a class="ligne-lien" href="#/r/${esc(r.id)}" data-rid="${esc(r.id)}">
      <span class="vignette" style="${fondImage(r)}">${initiale(r)}</span>
      <span class="ligne-texte"><b>${esc(r.titre)}</b><span class="meta">${esc(metaRecette(r))}</span></span>
    </a>
    <button class="coeur" data-act="fav" data-id="${esc(r.id)}" aria-label="${fav ? 'Retirer des favoris' : 'Ajouter aux favoris'}" aria-pressed="${fav}">${fav ? I.coeurPlein : I.coeurVide}</button>
  </div>`;
}

function htmlListe(liste) {
  if (!S.recettes.length) return `<p class="vide">${S.chargement ? 'Chargement des recettes…' : 'Aucune recette pour l’instant. Ajoute la première avec le bouton +.'}</p>`;
  if (!liste.length) return '<p class="vide">Aucune recette ne correspond.</p>';
  return liste.map(ligneRecette).join('');
}

function libJour(isoDate, court) {
  const auj = iso(new Date()), dem = iso(plusJours(new Date(), 1));
  if (isoDate === auj) return "Aujourd'hui";
  if (isoDate === dem) return 'Demain';
  const [y, m, d] = isoDate.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('fr-FR', court ? { weekday: 'short', day: 'numeric' } : { weekday: 'long', day: 'numeric', month: 'long' });
}
function libQuand(p) {
  const j = libJour(p.date, true);
  if (j === "Aujourd'hui") return p.moment === 'Soir' ? 'Ce soir' : 'Ce midi';
  return `${j} ${p.moment.toLowerCase()}`;
}

function bandeauChoix() {
  if (!S.choix) return '';
  return `<div class="bandeau"><span>Choisis une recette pour <b>${esc(libJour(S.choix.date).toLowerCase())} ${esc(S.choix.moment.toLowerCase())}</b></span><button data-act="annuler-choix">Annuler</button></div>`;
}

function vueAccueil() {
  const cats = ['Tout', ...CATEGORIES.filter((c) => S.recettes.some((r) => r.categorie === c)),
    ...[...new Set(S.recettes.map((r) => r.categorie))].filter((c) => c && !CATEGORIES.includes(c))];
  const auj = iso(new Date());
  const prochains = S.planning.filter((p) => p.date >= auj).slice(0, 8);
  return `
  <div class="entete">
    <div class="entete-ligne">
      <div><div class="sur-titre">Qu'est-ce qu'on mange ?</div><h1 class="grand-titre">Mes recettes</h1></div>
      <div style="display:flex;gap:8px">
        <button id="btn-synchro" class="btn-rond${S.chargement ? ' tourne' : ''}" data-act="rafraichir" aria-label="Actualiser depuis Google Drive">${I.synchro}</button>
        <a class="btn-rond" href="#/reglages" aria-label="Réglages">${I.reglages}</a>
      </div>
    </div>
    <label class="recherche" for="q">${I.loupe}<span class="sr">Rechercher</span>
      <input id="q" type="search" placeholder="Une recette, un ingrédient…" value="${esc(S.filtre.q)}" autocomplete="off">
    </label>
    <div class="puces" role="group" aria-label="Catégories">${cats.map((c) => `<button class="puce${S.filtre.cat === c ? ' actif' : ''}" data-act="cat" data-v="${esc(c)}" aria-pressed="${S.filtre.cat === c}">${esc(c)}</button>`).join('')}</div>
    <div class="segments" role="group" aria-label="Appareil">${APPAREILS.map((a) => `<button class="${S.filtre.app === a ? 'actif' : ''}" data-act="app" data-v="${a}" aria-pressed="${S.filtre.app === a}">${a}</button>`).join('')}</div>
  </div>
  ${bandeauChoix()}
  ${S.erreur ? `<div class="erreur">${esc(S.erreur)}</div>` : ''}
  ${prochains.length && !S.choix ? `<section class="section">
    <div class="section-titre"><h2>Au programme</h2><a class="lien" href="#/planning">Planning</a></div>
    <div class="prog">${prochains.map((p) => { const r = recette(p.recetteId) || { titre: p.titre, photo: '' }; return `
      <a class="carte-prog" href="#/r/${esc(p.recetteId)}"><span class="img" style="${fondImage(r)}">${initiale(r)}</span>
      <span class="txt"><span class="quand">${esc(libQuand(p))}</span><b>${esc(p.titre)}</b></span></a>`; }).join('')}</div>
  </section>` : ''}
  <section class="section">
    <div class="section-titre"><h2>${S.filtre.cat === 'Tout' ? 'Toutes les recettes' : esc(S.filtre.cat)}</h2><span class="meta" id="compte">${filtrees().length}</span></div>
    <div id="liste" style="display:flex;flex-direction:column;gap:10px">${htmlListe(filtrees())}</div>
  </section>
  <a class="fab" href="#/ajouter" aria-label="Ajouter une recette">${I.plus}</a>`;
}

function vueFavoris() {
  const liste = S.recettes.filter((r) => S.favoris.has(r.id));
  return `<div class="entete"><h1 class="grand-titre">Favoris</h1></div>
  ${bandeauChoix()}
  <section class="section">${liste.length ? liste.map(ligneRecette).join('') : '<p class="vide">Touche le cœur d’une recette pour la retrouver ici.</p>'}</section>`;
}

function vueRecette(id) {
  const r = recette(id);
  if (!r) return `<div class="entete"><a class="btn-rond" href="#/" aria-label="Retour">${I.retour}</a><p class="vide">${S.chargement ? 'Chargement…' : 'Recette introuvable.'}</p></div>`;
  const base = nbPortions(r);
  const n = S.portions[id] || base;
  const ratio = base ? n / base : 1;
  const coches = S.coches[id] || new Set();
  const fav = S.favoris.has(id);
  let idx = -1;
  const ingHtml = r.ingredients.map((i) => {
    if (i.section) return `<div class="sous-titre">${esc(i.section)}</div>`;
    idx++;
    const c = coches.has(idx);
    return `<label class="${c ? 'coche' : ''}"><input type="checkbox" data-coche="${idx}" ${c ? 'checked' : ''}><span>${esc(ajuster(i.t, ratio))}</span></label>`;
  }).join('');
  let num = 0;
  const etHtml = r.etapes.map((e) => {
    if (e.section) return `<li class="sous-titre">${esc(e.section)}</li>`;
    num++;
    const g = analyserReglages(e, r.appareil);
    const chips = [g.temps, g.temp, g.vitesse && 'Vitesse ' + g.vitesse, ...g.extra].filter(Boolean);
    return `<li class="etape"><span class="num">${num}</span><div><p>${esc(e.t)}</p>${chips.length ? `<div class="chips">${chips.map((c) => `<span class="chip">${esc(c)}</span>`).join('')}</div>` : ''}</div></li>`;
  }).join('');
  const bring = r.source && /^https?:/.test(r.source)
    ? `<a class="btn-carre" href="https://api.getbring.com/rest/bringrecipes/deeplink?url=${encodeURIComponent(r.source)}&source=web&baseQuantity=${base || 4}&requestedQuantity=${n || 4}" target="_blank" rel="noopener" aria-label="Envoyer les ingrédients dans Bring!">${I.panier}</a>`
    : `<button class="btn-carre" data-act="partager" data-id="${esc(id)}" aria-label="Partager la liste d’ingrédients (vers Bring!)">${I.panier}</button>`;
  const infos = [['Préparation', r.prepa], ['Cuisson', r.cuisson], ['Repos', r.repos], ['Total', r.total]].filter((x) => x[1]).slice(0, 3);
  return `
  <div class="hero" style="${fondImage(r)}">${initiale(r)}
    <a class="btn-rond g" href="#/" aria-label="Retour">${I.retour}</a>
    <button class="btn-rond d" data-act="fav" data-id="${esc(id)}" aria-label="${fav ? 'Retirer des favoris' : 'Ajouter aux favoris'}" aria-pressed="${fav}">${fav ? I.coeurPlein : I.coeurVide}</button>
  </div>
  <div class="corps">
    <div style="display:flex;flex-direction:column;gap:6px">
      <span class="kicker">${esc([r.categorie, r.appareil].filter(Boolean).join(' · '))}</span>
      <h1 class="titre-recette">${esc(r.titre)}</h1>
    </div>
    ${infos.length ? `<div class="infos">${infos.map(([k, v]) => `<div class="info"><span>${k}</span><b>${esc(v)}</b></div>`).join('')}</div>` : ''}
    ${base ? `<div class="portions"><b>Pour ${n} personne${n > 1 ? 's' : ''}</b>
      <div class="stepper"><button data-act="portions" data-d="-1" aria-label="Moins de personnes">−</button><output>${n}</output><button data-act="portions" data-d="1" aria-label="Plus de personnes">+</button></div></div>` : ''}
    <div class="segments" role="tablist">
      <button role="tab" class="${S.onglet === 'ing' ? 'actif' : ''}" aria-selected="${S.onglet === 'ing'}" data-act="onglet" data-v="ing">Ingrédients (${r.ingredients.filter((i) => !i.section).length})</button>
      <button role="tab" class="${S.onglet === 'etapes' ? 'actif' : ''}" aria-selected="${S.onglet === 'etapes'}" data-act="onglet" data-v="etapes">Étapes (${num})</button>
    </div>
    ${S.onglet === 'ing' ? `<div class="ingr">${ingHtml || '<p class="vide">Pas d’ingrédients.</p>'}</div>` : `<ol class="etapes">${etHtml || '<p class="vide">Pas d’étapes.</p>'}</ol>`}
    ${r.notes ? `<div class="notes">${esc(r.notes)}</div>` : ''}
    <div class="actions">
      <button class="action" data-act="planifier" data-id="${esc(id)}">${I.agenda}Planifier</button>
      <a class="action" href="https://docs.google.com/document/d/${esc(id)}/edit" target="_blank" rel="noopener">${I.doc}Modifier</a>
      ${/^https?:\/\//i.test(r.source || '') ? `<a class="action" href="${esc(r.source)}" target="_blank" rel="noopener">${I.lien}Recette d’origine</a>` : ''}
      <button class="action" data-act="partager" data-id="${esc(id)}">${I.partager}Partager la liste</button>
    </div>
  </div>
  <div class="barre-bas">${bring}
    <a class="btn-plein" href="#/r/${esc(id)}/cuisine/1">${I.toque}Lancer le mode cuisine</a>
  </div>`;
}

function vueCuisine(id, n) {
  const r = recette(id);
  if (!r) return `<div class="cuisine-v"><a class="btn-rond" href="#/">${I.fermer}</a><p>Recette introuvable.</p></div>`;
  const etapes = r.etapes.filter((e) => !e.section);
  if (!etapes.length) return `<div class="cuisine-v"><a class="btn-rond" href="#/r/${esc(id)}" aria-label="Quitter">${I.fermer}</a><p class="texte-etape">Cette recette n’a pas encore d’étapes.</p></div>`;
  n = Math.min(n, etapes.length - 1);
  const e = etapes[n];
  const g = analyserReglages(e, r.appareil);
  const base = nbPortions(r);
  const ratio = base ? (S.portions[id] || base) / base : 1;
  const mots = norm(e.t);
  const utiles = r.ingredients.filter((i) => i.t && citeDans(i.t, mots)).map((i) => ajuster(i.t, ratio));
  const sec = secondes(g.temps) || (g.temps ? 0 : secondes(e.t));
  const nomApp = g.horsRobot ? '' : /thermomix/i.test(r.appareil) ? 'Thermomix' : /cookeo/i.test(r.appareil) ? 'Cookeo' : '';
  const grille = [['Temps', g.temps], ['Température', g.temp], ['Vitesse', g.vitesse]].filter((x) => x[1]);
  return `<div class="cuisine-v" id="cuisine">
    <div class="haut">
      <a class="btn-rond" href="#/r/${esc(id)}" aria-label="Quitter le mode cuisine">${I.fermer}</a>
      <span class="nom">${esc(r.titre)}</span>
      ${'wakeLock' in navigator ? `<span class="eveil">${I.soleil}Écran allumé</span>` : '<span style="width:44px"></span>'}
    </div>
    <div style="display:flex;flex-direction:column;gap:10px">
      <span class="num-etape">Étape ${n + 1} sur ${etapes.length}</span>
      <div class="progres">${etapes.map((_, i) => `<i class="${i <= n ? 'ok' : ''}"></i>`).join('')}</div>
    </div>
    <p class="texte-etape">${esc(e.t)}</p>
    ${grille.length || g.extra.length ? `<div class="reglages">
      <span class="lbl">Réglages${nomApp ? ' ' + nomApp : ''}</span>
      ${grille.length ? `<div class="grille">${grille.map(([k, v]) => `<div><span>${k}</span><b>${esc(v)}</b></div>`).join('')}</div>` : ''}
      ${g.extra.length ? `<div class="extra">${g.extra.map((x) => `<span>${/inverse/i.test(x) ? I.inverse + ' ' : ''}${esc(x)}</span>`).join('')}</div>` : ''}
    </div>` : ''}
    ${utiles.length ? `<div class="pour-etape">${utiles.map(esc).join(' · ')}</div>` : ''}
    ${sec >= 60 || (S.minuteur) ? `<button id="btn-minuteur" class="minuteur" data-act="minuteur" data-s="${sec}" data-texte="${sec >= 60 ? 'Minuteur ' + libDuree(sec) : 'Minuteur en cours'}">${I.chrono}<span>${sec >= 60 ? 'Minuteur ' + libDuree(sec) : ''}</span></button>` : ''}
    <div class="nav-etapes">
      <button data-act="etape" data-n="${n}" ${n === 0 ? 'disabled' : ''}>${I.retour}Précédent</button>
      ${n < etapes.length - 1
    ? `<button class="suiv" data-act="etape" data-n="${n + 2}">Suivant${I.suivant}</button>`
    : `<button class="suiv" data-act="terminer" data-id="${esc(id)}">Terminé</button>`}
    </div>
  </div>`;
}

function vuePlanning() {
  const auj = new Date();
  const jours = Array.from({ length: 14 }, (_, i) => iso(plusJours(auj, i)));
  return `<div class="entete"><div class="entete-ligne"><div><div class="sur-titre">Partagé avec ta famille</div><h1 class="grand-titre">Planning</h1></div>
    <button class="btn-rond" data-act="rafraichir-planning" aria-label="Actualiser le planning">${I.synchro}</button></div></div>
  ${S.erreur ? `<div class="erreur">${esc(S.erreur)}</div>` : ''}
  <section class="section">${jours.map((j, i) => `
    <div class="jour${i === 0 ? ' aujourdhui' : ''}"><h3>${esc(libJour(j))}</h3>
      ${['Midi', 'Soir'].map((m) => {
    const items = S.planning.filter((p) => p.date === j && p.moment === m);
    return `<div class="creneau"><span class="moment">${m}</span>${items.length ? items.map((p) => `
          <a class="plat" href="#/r/${esc(p.recetteId)}">${esc(p.titre)}${p.par ? `<small>par ${esc(p.par)}</small>` : ''}</a>
          <button class="suppr" data-act="retirer" data-id="${esc(p.id)}" aria-label="Retirer ${esc(p.titre)} du planning">${I.fermer}</button>`).join('</div><div class="creneau"><span class="moment"></span>')
      : `<button class="ajout" data-act="creneau" data-date="${j}" data-moment="${m}">+ Choisir une recette</button>`}</div>`;
  }).join('')}
    </div>`).join('')}
  </section>`;
}

function vueAjouter() {
  const lien = S.lienPartage; S.lienPartage = '';
  return `<div class="entete"><h1 class="grand-titre">Ajouter</h1>
    <p class="texte">Chaque recette est un Google Doc rangé dans ton dossier « Recettes » sur Drive.</p></div>
  <section class="section">
    <form id="form-import" class="champ">
      <label for="url">Depuis un lien (Cookomix, Marmiton, blog…)</label>
      <input id="url" name="url" type="url" inputmode="url" placeholder="https://…" value="${esc(lien)}" required>
      <button class="btn-plein" type="submit" id="btn-import">${I.lien}Importer la recette</button>
    </form>
    <p class="texte" style="font-size:13px">Astuce : sur ton téléphone, depuis la page de la recette, touche « Partager » puis « Recettes ».</p>
  </section>
  <section class="section">
    <button class="option" data-act="nouvelle">
      <span class="ico" style="background:#F2DDD3;color:#9A3412">${I.crayon}</span>
      <span><b>Écrire une recette</b><small>Crée un Google Doc prêt à remplir, avec le bon modèle</small></span>
    </button>
    <div class="option">
      <span class="ico" style="background:#F6EBCB;color:#7A5E10">${I.photo}</span>
      <span><b>Une page de ton carnet</b><small>Prends-la en photo et envoie-la à Claude : il la range dans le dossier au bon format</small></span>
    </div>
    ${S.dossierUrl ? `<a class="option" href="${esc(S.dossierUrl)}" target="_blank" rel="noopener">
      <span class="ico" style="background:var(--vert-pale);color:var(--vert)">${I.dossier}</span>
      <span><b>Ouvrir le dossier « Recettes »</b><small>Sur Google Drive</small></span></a>` : ''}
  </section>`;
}

function vueReglages() {
  return `<div class="entete"><div class="entete-ligne"><h1 class="grand-titre">Réglages</h1><a class="btn-rond" href="#/" aria-label="Retour">${I.retour}</a></div></div>
  <section class="section">
    <form id="form-prenom" class="champ">
      <label for="prenom">Ton prénom (affiché dans le planning)</label>
      <input id="prenom" name="prenom" value="${esc(S.prenom)}" autocomplete="given-name">
      <button class="btn-plein" type="submit">Enregistrer</button>
    </form>
  </section>
  <section class="section">
    <button class="action" data-act="forcer">${I.synchro}Tout relire depuis Drive</button>
    <button class="action" data-act="deconnexion">Changer de code</button>
    <p class="texte" style="font-size:13px">${S.recettes.length} recette${S.recettes.length > 1 ? 's' : ''} enregistrée${S.recettes.length > 1 ? 's' : ''} sur ce téléphone.</p>
  </section>`;
}

/* ------------------------------------------------------------------ */
/*  Feuille « Planifier »                                              */
/* ------------------------------------------------------------------ */
function ouvrirFeuille(html) {
  const f = $('#feuille');
  f.innerHTML = `<div class="feuille" role="dialog" aria-modal="true">${html}</div>`;
  f.hidden = false;
  const champ = f.querySelector('input'); if (champ) setTimeout(() => champ.focus(), 50);
}
function fermerFeuille() { const f = $('#feuille'); f.hidden = true; f.innerHTML = ''; }

function feuillePlanifier(id) {
  const r = recette(id);
  ouvrirFeuille(`<h2>Planifier « ${esc(r.titre)} »</h2>
    <form id="form-planifier" data-id="${esc(id)}" style="display:flex;flex-direction:column;gap:16px">
      <div class="champ"><label for="p-date">Jour</label><input id="p-date" name="date" type="date" value="${iso(new Date())}" min="${iso(new Date())}" required></div>
      <div class="champ"><span class="lbl">Moment</span>
        <div class="segments" role="radiogroup">
          <label style="display:contents"><input class="sr" type="radio" name="moment" value="Midi"><button type="button" data-act="moment" data-v="Midi">Midi</button></label>
          <label style="display:contents"><input class="sr" type="radio" name="moment" value="Soir" checked><button type="button" class="actif" data-act="moment" data-v="Soir">Soir</button></label>
        </div></div>
      ${S.prenom ? '' : '<div class="champ"><label for="p-prenom">Ton prénom</label><input id="p-prenom" name="prenom" required autocomplete="given-name"></div>'}
      <div style="display:flex;gap:10px"><button type="button" class="action" style="flex:1" data-act="fermer">Annuler</button>
      <button type="submit" class="btn-plein" style="flex:2">Planifier</button></div>
    </form>`);
}

async function planifier(id, date, moment) {
  const r = recette(id);
  try {
    const j = await api('planifier', { recetteId: id, titre: r.titre, date, moment, par: S.prenom || '', app: location.origin + location.pathname });
    toast(j.agenda ? 'Ajouté au planning et à l’agenda « Repas »' : 'Ajouté au planning');
    await chargerPlanning(true);
  } catch (e) { toast('Impossible de planifier : ' + e.message); }
  rendre();
}

/* ------------------------------------------------------------------ */
/*  Partage de la liste d'ingrédients                                  */
/* ------------------------------------------------------------------ */
async function partagerListe(id) {
  const r = recette(id);
  const base = nbPortions(r); const n = S.portions[id] || base; const ratio = base ? n / base : 1;
  const lignes = r.ingredients.filter((i) => i.t).map((i) => ajuster(i.t, ratio));
  const texte = lignes.join('\n');
  try {
    if (navigator.share) { await navigator.share({ title: r.titre, text: texte }); return; }
  } catch (e) { if (e.name === 'AbortError') return; }
  try { await navigator.clipboard.writeText(texte); toast('Liste copiée : colle-la dans Bring!'); } catch (e) { toast('Copie impossible'); }
}

let toastTimer;
function toast(t) {
  const el = $('#toast'); el.textContent = t; el.hidden = false;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => { el.hidden = true; }, 3200);
}
function majBoutonSynchro() { const b = $('#btn-synchro'); if (b) b.classList.toggle('tourne', S.chargement); }

/* ------------------------------------------------------------------ */
/*  Événements                                                         */
/* ------------------------------------------------------------------ */
document.addEventListener('click', async (ev) => {
  // Choix d'une recette pour un créneau du planning
  const lienRec = ev.target.closest('a[data-rid]');
  if (lienRec && S.choix) {
    ev.preventDefault();
    const { date, moment } = S.choix; S.choix = null;
    if (!S.prenom) { location.hash = '#/reglages'; toast('Indique d’abord ton prénom'); return; }
    location.hash = '#/planning';
    await planifier(lienRec.dataset.rid, date, moment);
    return;
  }
  if (ev.target === $('#feuille')) { fermerFeuille(); return; }

  const b = ev.target.closest('[data-act]');
  if (!b) return;
  const act = b.dataset.act;
  const id = b.dataset.id;

  switch (act) {
    case 'fav':
      S.favoris.has(id) ? S.favoris.delete(id) : S.favoris.add(id);
      ecrire('favoris', [...S.favoris]); rendre(); break;
    case 'cat': S.filtre.cat = b.dataset.v; rendre(); break;
    case 'app': S.filtre.app = b.dataset.v; rendre(); break;
    case 'rafraichir': charger(false); break;
    case 'forcer': toast('Relecture de toutes les recettes…'); charger(true); break;
    case 'rafraichir-planning':
      try { await chargerPlanning(false); toast('Planning à jour'); } catch (e) { toast(e.message); } break;
    case 'portions': {
      const r = recette(route().id); const base = nbPortions(r);
      S.portions[r.id] = Math.max(1, Math.min(30, (S.portions[r.id] || base) + +b.dataset.d)); rendre(); break;
    }
    case 'onglet': S.onglet = b.dataset.v; rendre(); break;
    case 'planifier': feuillePlanifier(id); break;
    case 'moment':
      b.parentElement.parentElement.querySelectorAll('button').forEach((x) => x.classList.toggle('actif', x === b));
      b.previousElementSibling.checked = true; break;
    case 'fermer': fermerFeuille(); break;
    case 'partager': partagerListe(id); break;
    case 'retirer':
      b.disabled = true;
      try { await api('retirer', { id }); S.planning = S.planning.filter((p) => p.id !== id); ecrire('cache-planning', S.planning); toast('Retiré du planning'); } catch (e) { toast(e.message); }
      rendre(); break;
    case 'creneau':
      S.choix = { date: b.dataset.date, moment: b.dataset.moment }; location.hash = '#/'; rendre(); window.scrollTo(0, 0); break;
    case 'annuler-choix': S.choix = null; rendre(); break;
    case 'etape': location.replace(`#/r/${route().id}/cuisine/${b.dataset.n}`); window.scrollTo(0, 0); break;
    case 'terminer': arreterMinuteur(); location.hash = `#/r/${id}`; break;
    case 'minuteur':
      if (S.minuteur) arreterMinuteur(); else if (+b.dataset.s) demarrerMinuteur(+b.dataset.s, b.dataset.texte);
      break;
    case 'nouvelle': {
      const fen = window.open('', '_blank');
      b.disabled = true;
      try {
        const j = await api('nouvelle', { titre: 'Nouvelle recette' });
        if (fen) fen.location = j.url; else location.href = j.url;
        toast('Recette créée : remplis le Doc, puis actualise l’appli (elle apparaît dès qu’elle a un ingrédient)');
      } catch (e) { if (fen) fen.close(); toast(e.message); }
      b.disabled = false; break;
    }
    case 'deconnexion': S.code = ''; ecrire('code', ''); location.hash = '#/'; rendre(); break;
  }
});

document.addEventListener('change', (ev) => {
  const c = ev.target.closest('[data-coche]');
  if (!c) return;
  const id = route().id;
  const set = S.coches[id] || (S.coches[id] = new Set());
  const i = +c.dataset.coche;
  c.checked ? set.add(i) : set.delete(i);
  c.closest('label').classList.toggle('coche', c.checked);
});

document.addEventListener('input', (ev) => {
  if (ev.target.id !== 'q') return;
  S.filtre.q = ev.target.value;
  const l = filtrees();
  $('#liste').innerHTML = htmlListe(l);
  $('#compte').textContent = l.length;
});

document.addEventListener('submit', async (ev) => {
  ev.preventDefault();
  const f = ev.target;
  if (f.id === 'form-code') {
    S.code = f.code.value.trim(); ecrire('code', S.code); rendre(); charger(false);
  } else if (f.id === 'form-prenom') {
    S.prenom = f.prenom.value.trim(); ecrire('prenom', S.prenom); toast('Enregistré'); location.hash = '#/';
  } else if (f.id === 'form-planifier') {
    if (f.prenom) { S.prenom = f.prenom.value.trim(); ecrire('prenom', S.prenom); }
    const id = f.dataset.id, date = f.date.value, moment = f.moment.value;
    fermerFeuille();
    await planifier(id, date, moment);
  } else if (f.id === 'form-import') {
    const btn = $('#btn-import'); btn.disabled = true; btn.lastChild.textContent = 'Import en cours…';
    try {
      const j = await api('importer', { url: f.url.value.trim() });
      const r = j.recette;
      S.recettes = S.recettes.filter((x) => x.id !== r.id).concat(r).sort((a, b) => a.titre.localeCompare(b.titre, 'fr'));
      ecrire('cache-recettes', S.recettes);
      toast(j.deja ? 'Cette recette est déjà dans ton livre' : 'Recette importée');
      location.hash = '#/r/' + r.id;
    } catch (e) {
      toast(e.message); btn.disabled = false; btn.lastChild.textContent = 'Importer la recette';
    }
  }
});

// Glisser à gauche / à droite en mode cuisine
let x0 = null;
document.addEventListener('touchstart', (e) => { if (route().vue === 'cuisine') x0 = e.touches[0].clientX; }, { passive: true });
document.addEventListener('touchend', (e) => {
  if (x0 === null) return;
  const dx = e.changedTouches[0].clientX - x0; x0 = null;
  if (Math.abs(dx) < 70) return;
  const btn = dx < 0 ? document.querySelector('.nav-etapes .suiv[data-act="etape"]') : document.querySelector('.nav-etapes button[data-act="etape"]:not(.suiv)');
  if (btn && !btn.disabled) btn.click();
}, { passive: true });

window.addEventListener('hashchange', () => { fermerFeuille(); rendre(); if (!['cuisine'].includes(route().vue)) window.scrollTo(0, 0); });

if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});

rendre();
charger(false);
