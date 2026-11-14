/**
 * Mes recettes — partie privée (Google Apps Script lié à un Google Sheet)
 *
 * - Lit les recettes : un Google Doc par recette dans le dossier Drive « Recettes ».
 * - Importe une recette depuis un lien (Cookomix, Marmiton, blogs…).
 * - Gère le planning des repas, partagé entre tous ceux qui ont le code,
 *   et le recopie dans l'agenda Google « Repas ».
 *
 * Installation : voir README.md (fonction `installer` à exécuter une fois).
 */

const FEUILLE_REGLAGES = 'Réglages';
const FEUILLE_PLANNING = 'Planning';
const FEUILLE_INDEX = 'Index';
const NOM_DOSSIER = 'Recettes';
const NOM_AGENDA = 'Repas';
// Version du script (affichée dans les Réglages de l'appli)
const VERSION = '1.5 · 14/11/2026';
const HEURES = { Midi: [12, 0, 13, 0], Soir: [19, 30, 20, 30] };

/* ------------------------------------------------------------------ */
/*  Installation                                                       */
/* ------------------------------------------------------------------ */

function installer() {
  const ss = SpreadsheetApp.getActive();

  // Réglages
  let reg = ss.getSheetByName(FEUILLE_REGLAGES);
  if (!reg) reg = ss.insertSheet(FEUILLE_REGLAGES);
  const r = lireReglages_();

  if (!r['Code secret']) r['Code secret'] = codeAleatoire_();

  // Dossier « Recettes »
  let dossier = null;
  if (r['Dossier recettes (ID)']) {
    try { dossier = DriveApp.getFolderById(r['Dossier recettes (ID)']); } catch (e) { dossier = null; }
  }
  if (!dossier) {
    const it = DriveApp.getFoldersByName(NOM_DOSSIER);
    dossier = it.hasNext() ? it.next() : DriveApp.createFolder(NOM_DOSSIER);
  }
  r['Dossier recettes (ID)'] = dossier.getId();

  // Agenda « Repas »
  let agenda = null;
  if (r['Agenda (ID)']) {
    try { agenda = CalendarApp.getCalendarById(r['Agenda (ID)']); } catch (e) { agenda = null; }
  }
  if (!agenda) {
    const existants = CalendarApp.getCalendarsByName(NOM_AGENDA);
    agenda = existants.length ? existants[0]
      : CalendarApp.createCalendar(NOM_AGENDA, { summary: 'Repas planifiés depuis « Mes recettes »' });
  }
  r['Agenda (ID)'] = agenda.getId();

  ecrireReglages_(r);

  // Planning
  let pl = ss.getSheetByName(FEUILLE_PLANNING);
  if (!pl) pl = ss.insertSheet(FEUILLE_PLANNING);
  if (pl.getLastRow() === 0) {
    pl.appendRow(['ID', 'Date', 'Moment', 'Recette (ID)', 'Titre', 'Par', 'Événement agenda', 'Créé le']);
    pl.setFrozenRows(1);
    pl.getRange('B:B').setNumberFormat('@');
  }

  // Index (cache des recettes lues, géré automatiquement)
  let ix = ss.getSheetByName(FEUILLE_INDEX);
  if (!ix) ix = ss.insertSheet(FEUILLE_INDEX);
  if (ix.getLastRow() === 0) {
    ix.appendRow(['Doc (ID)', 'Modifié le', 'Données (ne pas modifier)']);
    ix.setFrozenRows(1);
  }

  // Recette exemple si le dossier est vide
  if (!dossier.getFilesByType(MimeType.GOOGLE_DOCS).hasNext()) {
    creerDoc_(dossier, exempleRecette_());
  }

  // Supprime la feuille vide par défaut
  const vide = ss.getSheetByName('Feuille 1') || ss.getSheetByName('Sheet1');
  if (vide && ss.getSheets().length > 1 && vide.getLastRow() === 0) ss.deleteSheet(vide);

  Logger.log('Installation terminée. Code secret : ' + r['Code secret']);
}

function codeAleatoire_() {
  const c = 'abcdefghjkmnpqrstuvwxyz23456789';
  let s = '';
  for (let i = 0; i < 8; i++) s += c.charAt(Math.floor(Math.random() * c.length));
  return s;
}

function lireReglages_() {
  const sh = SpreadsheetApp.getActive().getSheetByName(FEUILLE_REGLAGES);
  const r = {};
  if (!sh || sh.getLastRow() === 0) return r;
  sh.getRange(1, 1, sh.getLastRow(), 2).getValues().forEach(function (l) {
    if (l[0]) r[String(l[0]).trim()] = String(l[1]).trim();
  });
  return r;
}

function ecrireReglages_(r) {
  const sh = SpreadsheetApp.getActive().getSheetByName(FEUILLE_REGLAGES);
  const ordre = ['Code secret', 'Dossier recettes (ID)', 'Agenda (ID)'];
  const lignes = ordre.map(function (k) { return [k, r[k] || '']; });
  Object.keys(r).forEach(function (k) { if (ordre.indexOf(k) < 0) lignes.push([k, r[k]]); });
  sh.clear();
  sh.getRange(1, 1, lignes.length, 2).setValues(lignes);
  sh.getRange(1, 1, lignes.length, 1).setFontWeight('bold');
  sh.autoResizeColumns(1, 2);
}

/* ------------------------------------------------------------------ */
/*  Point d'entrée web                                                 */
/* ------------------------------------------------------------------ */

function doGet(e) {
  const p = (e && e.parameter) || {};
  let res;
  try {
    const r = lireReglages_();
    if (!p.code || p.code !== r['Code secret']) {
      res = { ok: false, erreur: 'code' };
    } else {
      switch (p.action || 'recettes') {
        case 'recettes': res = actionRecettes_(r, p.forcer === '1'); break;
        case 'planning': res = actionPlanning_(p); break;
        case 'planifier': res = actionPlanifier_(r, p); break;
        case 'retirer': res = actionRetirer_(r, p); break;
        case 'importer': res = actionImporter_(r, p); break;
        case 'nouvelle': res = actionNouvelle_(r, p); break;
        default: res = { ok: false, erreur: 'Action inconnue' };
      }
    }
  } catch (err) {
    res = { ok: false, erreur: String(err && err.message || err) };
  }
  return ContentService.createTextOutput(JSON.stringify(res)).setMimeType(ContentService.MimeType.JSON);
}

/* ------------------------------------------------------------------ */
/*  Recettes                                                           */
/* ------------------------------------------------------------------ */

function actionRecettes_(r, forcer) {
  const dossier = DriveApp.getFolderById(r['Dossier recettes (ID)']);
  const recettes = synchroniserIndex_(dossier, forcer);
  return { ok: true, recettes: recettes, dossierUrl: dossier.getUrl(), version: VERSION };
}

/** Relit uniquement les Docs modifiés depuis la dernière fois. */
function synchroniserIndex_(dossier, forcer) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const sh = SpreadsheetApp.getActive().getSheetByName(FEUILLE_INDEX);
    const n = sh.getLastRow() - 1;
    const anciennes = {};
    if (n > 0) {
      sh.getRange(2, 1, n, 3).getValues().forEach(function (l) {
        anciennes[l[0]] = { maj: String(l[1]), json: l[2] };
      });
    }
    const lignes = [];
    const recettes = [];
    const it = dossier.getFilesByType(MimeType.GOOGLE_DOCS);
    while (it.hasNext()) {
      const f = it.next();
      const maj = String(f.getLastUpdated().getTime());
      const a = anciennes[f.getId()];
      let rec;
      if (!forcer && a && a.maj === maj) {
        try { rec = JSON.parse(a.json); } catch (e) { rec = null; }
      }
      if (!rec) {
        try { rec = lireDoc_(f); } catch (e) { continue; }
      }
      lignes.push([f.getId(), maj, JSON.stringify(rec)]);
      recettes.push(rec);
    }
    if (n > 0) sh.getRange(2, 1, n, 3).clearContent();
    if (lignes.length) sh.getRange(2, 1, lignes.length, 3).setValues(lignes);
    recettes.sort(function (a, b) { return a.titre.localeCompare(b.titre, 'fr'); });
    return recettes;
  } finally {
    lock.releaseLock();
  }
}

function sansAccents_(s) {
  return String(s).normalize('NFD').replace(/[̀-ͯ]/g, '');
}

const CLES_ENTETE = {
  'titre': 'titre', 'nom': 'titre',
  'categorie': 'categorie', 'type': 'categorie',
  'appareil': 'appareil', 'robot': 'appareil',
  'portions': 'portions', 'personnes': 'portions', 'pour': 'portions',
  'preparation': 'prepa', 'prepa': 'prepa',
  'cuisson': 'cuisson',
  'repos': 'repos',
  'temps': 'total', 'temps total': 'total', 'total': 'total',
  'source': 'source', 'lien': 'source', 'url': 'source',
  'photo': 'photo', 'image': 'photo',
  'poids portion': 'poids', 'poids': 'poids', 'poids par portion': 'poids',
  'calories': 'calories', 'kcal': 'calories', 'energie': 'calories',
  'lipides': 'lipides', 'matieres grasses': 'lipides',
  'glucides': 'glucides',
  'proteines': 'proteines'
};

/** Transforme un Google Doc (modèle de recette) en objet. */
function lireDoc_(fichier) {
  const doc = DocumentApp.openById(fichier.getId());
  const body = doc.getBody();
  const rec = {
    id: fichier.getId(), titre: fichier.getName(), categorie: '', appareil: '',
    portions: '', prepa: '', cuisson: '', repos: '', total: '', source: '', photo: '',
    calories: '', lipides: '', glucides: '', proteines: '', poids: '',
    ingredients: [], etapes: [], notes: '', maj: fichier.getLastUpdated().getTime()
  };
  let section = 'entete';
  const nb = body.getNumChildren();
  for (let i = 0; i < nb; i++) {
    const el = body.getChild(i);
    const type = el.getType();
    if (type !== DocumentApp.ElementType.PARAGRAPH && type !== DocumentApp.ElementType.LIST_ITEM) continue;
    const txt = el.asText().getText().replace(/\s+/g, ' ').trim();
    if (!txt) continue;
    const estListe = type === DocumentApp.ElementType.LIST_ITEM;
    const titreSection = sansAccents_(txt).toUpperCase().replace(/[\s:]+$/, '');

    if (/^INGREDIENTS?$/.test(titreSection)) { section = 'ing'; continue; }
    if (/^(ETAPES?|PREPARATION|INSTRUCTIONS|DEROULEMENT)$/.test(titreSection)) { section = 'etapes'; continue; }
    if (/^(NOTES?|ASTUCES?|CONSEILS?)$/.test(titreSection)) { section = 'notes'; continue; }

    if (section === 'entete') {
      const m = txt.match(/^([^:]{2,20}?)\s*:\s*(.+)$/);
      if (m) {
        const cle = CLES_ENTETE[sansAccents_(m[1]).toLowerCase().trim()];
        if (cle) rec[cle] = m[2].trim();
      }
      continue;
    }

    if (section === 'ing') {
      if (estListe || /^[-•*–]/.test(txt)) {
        const v = txt.replace(/^[-•*–]\s*/, '');
        if (v) rec.ingredients.push({ t: v });
      } else {
        rec.ingredients.push({ section: txt.replace(/\s*:\s*$/, '') });
      }
      continue;
    }

    if (section === 'etapes') {
      if (!estListe && /:\s*$/.test(txt) && txt.length < 40) {
        rec.etapes.push({ section: txt.replace(/\s*:\s*$/, '') });
        continue;
      }
      let t = txt.replace(/^(\d+|étape\s*\d+)\s*[.)\-:]\s*/i, '');
      let reglages = [];
      const idx = t.search(/\s[—–]\s|\s--\s/);
      if (idx > 0) {
        reglages = t.slice(idx).replace(/^\s*(—|–|--)\s*/, '').split('/').map(function (s) { return s.trim(); }).filter(String);
        t = t.slice(0, idx).trim();
      }
      if (!t || /^\d+\s*[.)]?$/.test(t)) continue;
      rec.etapes.push({ t: t, reglages: reglages });
      continue;
    }

    if (section === 'notes') rec.notes += (rec.notes ? '\n' : '') + txt;
  }
  if (!rec.appareil) rec.appareil = 'Classique';
  if (!rec.categorie) rec.categorie = 'Plat';
  return rec;
}

/* ------------------------------------------------------------------ */
/*  Création de Docs                                                   */
/* ------------------------------------------------------------------ */

function creerDoc_(dossier, rec) {
  const doc = DocumentApp.create(rec.titre || 'Nouvelle recette');
  const body = doc.getBody();
  body.clear();
  const entete = [
    ['Titre', rec.titre], ['Catégorie', rec.categorie], ['Appareil', rec.appareil],
    ['Portions', rec.portions], ['Préparation', rec.prepa], ['Cuisson', rec.cuisson],
    ['Source', rec.source], ['Photo', rec.photo],
    ['Poids portion', rec.poids || undefined], ['Calories', rec.calories || undefined], ['Lipides', rec.lipides || undefined],
    ['Glucides', rec.glucides || undefined], ['Protéines', rec.proteines || undefined]
  ];
  let premier = true;
  entete.forEach(function (l) {
    if (l[1] === undefined || l[1] === null) return;
    const texte = l[0] + ' : ' + l[1];
    if (premier) { body.getParagraphs()[0].setText(texte); premier = false; }
    else body.appendParagraph(texte);
  });
  body.appendParagraph('');
  body.appendParagraph('INGRÉDIENTS').setHeading(DocumentApp.ParagraphHeading.HEADING2);
  (rec.ingredients || []).forEach(function (i) {
    body.appendParagraph(i.section ? i.section + ' :' : '- ' + i.t);
  });
  body.appendParagraph('');
  body.appendParagraph('ÉTAPES').setHeading(DocumentApp.ParagraphHeading.HEADING2);
  let n = 0;
  (rec.etapes || []).forEach(function (e) {
    if (e.section) { body.appendParagraph(e.section + ' :'); return; }
    n++;
    const reg = (e.reglages && e.reglages.length) ? ' — ' + e.reglages.join(' / ') : '';
    body.appendParagraph(n + '. ' + e.t + reg);
  });
  if (rec.notes) {
    body.appendParagraph('');
    body.appendParagraph('NOTES').setHeading(DocumentApp.ParagraphHeading.HEADING2);
    body.appendParagraph(rec.notes);
  }
  doc.saveAndClose();
  const f = DriveApp.getFileById(doc.getId());
  f.moveTo(dossier);
  return f;
}

function exempleRecette_() {
  return {
    titre: 'Velouté de potiron (exemple)', categorie: 'Entrée', appareil: 'Thermomix',
    portions: '4', prepa: '10 min', cuisson: '30 min', source: '', photo: '',
    ingredients: [
      { t: '800 g potiron en morceaux' }, { t: '1 oignon' }, { t: '1 pomme de terre' },
      { t: '600 g eau' }, { t: '1 cube de bouillon' }, { t: '10 cl crème liquide' }
    ],
    etapes: [
      { t: "Mettre l'oignon dans le bol et mixer.", reglages: ['5 sec', 'vitesse 5'] },
      { t: 'Ajouter le potiron, la pomme de terre, l’eau et le bouillon.', reglages: ['25 min', '100 °C', 'vitesse 1'] },
      { t: 'Ajouter la crème puis mixer progressivement.', reglages: ['1 min', 'vitesse 5-10'] }
    ],
    notes: 'Recette exemple : tu peux la supprimer quand tu auras ajouté les tiennes.'
  };
}

function actionNouvelle_(r, p) {
  const dossier = DriveApp.getFolderById(r['Dossier recettes (ID)']);
  const f = creerDoc_(dossier, {
    titre: p.titre || 'Nouvelle recette', categorie: 'Plat', appareil: 'Thermomix',
    portions: '4', prepa: '', cuisson: '', source: '', photo: '',
    ingredients: [{ t: '' }], etapes: [{ t: '', reglages: [] }]
  });
  return { ok: true, id: f.getId(), url: f.getUrl() };
}

/* ------------------------------------------------------------------ */
/*  Import depuis un lien                                              */
/* ------------------------------------------------------------------ */

function actionImporter_(r, p) {
  const url = String(p.url || '').trim();
  if (!/^https?:\/\//i.test(url)) return { ok: false, erreur: 'Lien invalide' };
  const dossier = DriveApp.getFolderById(r['Dossier recettes (ID)']);

  // Déjà importée ?
  const deja = synchroniserIndex_(dossier, false).filter(function (x) {
    return x.source && x.source.replace(/[?#].*$/, '') === url.replace(/[?#].*$/, '');
  });
  if (deja.length) return { ok: true, recette: deja[0], deja: true };

  const rep = UrlFetchApp.fetch(url, {
    muteHttpExceptions: true, followRedirects: true,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Linux; Android 14; SM-S921B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36',
      'Accept-Language': 'fr-FR,fr;q=0.9'
    }
  });
  if (rep.getResponseCode() >= 400) return { ok: false, erreur: 'Le site a refusé la lecture (' + rep.getResponseCode() + ')' };
  const html = rep.getContentText();
  const rec = extraireRecette_(html, url);
  if (!rec) return { ok: false, erreur: "Pas de recette lisible sur cette page. Envoie le lien ou une capture à Claude." };
  if (!rec.etapes.some(function (e) { return e.t; })) {
    return { ok: false, erreur: "Cette page ne donne pas les étapes (Cookidoo les réserve aux abonnés connectés). Envoie la photo de la recette à Claude." };
  }

  const f = creerDoc_(dossier, rec);
  const lue = lireDoc_(f);
  synchroniserIndex_(dossier, false);
  return { ok: true, recette: lue };
}

function extraireRecette_(html, url) {
  const re = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m, recette = null;
  while ((m = re.exec(html)) && !recette) {
    try { recette = trouverRecette_(JSON.parse(m[1].trim())); } catch (e) { /* JSON invalide : on continue */ }
  }
  if (!recette) return null;

  const texte = function (s) { return nettoyer_(s); };
  const ingredients = (recette.recipeIngredient || recette.ingredients || []).map(function (i) { return { t: ingredient_(texte(i)) }; })
    .filter(function (i) { return i.t; });

  // Les étapes de la page (avec les icônes Thermomix : cuillère, sens inverse…) sont
  // plus complètes que celles du JSON-LD quand elles existent (Cookomix notamment).
  const nutri = nutrition_(recette, html);
  let etapes = etapesDepuisHtml_(html);
  if (!etapes.length) aplatirInstructions_(recette.recipeInstructions, etapes);
  const astuces = [];
  const reA = /<div[^>]*class="[^"]*msgbox-astuce[^"]*"[^>]*>([\s\S]*?)<\/div>/gi;
  let a;
  while ((a = reA.exec(html))) { const t = nettoyer_(a[1]); if (t) astuces.push('Astuce : ' + t); }

  let image = recette.image;
  if (Array.isArray(image)) image = image[0];
  if (image && typeof image === 'object') image = image.url || image.contentUrl || '';

  let portions = recette.recipeYield;
  if (Array.isArray(portions)) portions = portions[0];
  const mp = String(portions || '').match(/\d+/);

  const tout = (ingredients.map(function (i) { return i.t; }).join(' ') + ' ' +
    etapes.map(function (e) { return e.t || ''; }).join(' ')).toLowerCase();
  let appareil = 'Classique';
  if (/cookomix|thermomix|cookidoo|recettes-thermomix/i.test(url) || /vitesse\s*\d|varoma|sens inverse/.test(tout)) appareil = 'Thermomix';
  else if (/cookeo/i.test(url) || /cookeo|cuisson sous pression|mode dorer/.test(tout)) appareil = 'Cookeo';
  else if (/air-?fryer|airfryer|friteuse-sans-huile|cosori|ninja/i.test(url) || /air ?fryer|friteuse sans huile|panier de l.air/.test(tout)) appareil = 'Air fryer';

  return {
    titre: (texte(recette.name) || 'Recette importée').replace(/\s+(au|avec le|avec la|version)\s+(thermomix|tm\d+|cookeo|companion)\s*$/i, ''),
    categorie: categorie_(recette.recipeCategory, recette.name),
    appareil: appareil,
    portions: mp ? mp[0] : '',
    prepa: duree_(recette.prepTime),
    cuisson: duree_(recette.cookTime),
    source: url,
    photo: image ? String(image) : '',
    ingredients: ingredients,
    etapes: etapes.map(function (e) { return e.section ? e : { t: e.t, reglages: e.reglages || [] }; }),
    notes: astuces.join('\n'),
    poids: nutri.poids, calories: nutri.calories, lipides: nutri.lipides, glucides: nutri.glucides, proteines: nutri.proteines
  };
}

/** Valeurs nutritionnelles par portion : JSON-LD (schema.org) puis tableau de la page (Cookomix). */
function nutrition_(recette, html) {
  const n = recette.nutrition || {};
  const val = function (v, unite) {
    const s = nettoyer_(Array.isArray(v) ? v[0] : v);
    const m = s.match(/\d+(?:[.,]\d+)?/);
    return m ? m[0].replace('.', ',') + ' ' + unite : '';
  };
  const depuisHtml = function (libelle) {
    const re = new RegExp('<dt[^>]*>\\s*' + libelle + '[\\s\\S]{0,80}?<\\/dt>\\s*<dd[^>]*>([\\s\\S]*?)<\\/dd>', 'i');
    const m = html.match(re);
    return m ? nettoyer_(m[1]) : '';
  };
  // Poids d'une portion : « Calories par portion (982 g) » sur Cookomix, ou servingSize
  const mp = html.match(/Calories par portion\s*(?:<[^>]+>\s*)*\(\s*(\d+(?:[.,]\d+)?)\s*g\s*\)/i);
  const ss = String(n.servingSize || '').match(/(\d+(?:[.,]\d+)?)\s*g\b/i);
  return {
    poids: mp ? mp[1] + ' g' : ss ? ss[1] + ' g' : '',
    calories: val(n.calories || depuisHtml('Calories par portion'), 'kcal'),
    lipides: val(n.fatContent || depuisHtml('Lipides'), 'g'),
    glucides: val(n.carbohydrateContent || depuisHtml('Glucides'), 'g'),
    proteines: val(n.proteinContent || depuisHtml('Prot[ée]ines'), 'g')
  };
}

/** « Eau - 50 grammes » (format Cookomix) → « 50 g d'eau ». */
function ingredient_(s) {
  const m = s.match(/^(.+?)\s+-\s+(\d[\s\S]*)$/);
  if (!m) return s;
  const q = m[2].trim().replace(/\bgrammes?\b/i, 'g').replace(/\bkilogrammes?\b/i, 'kg');
  let n = m[1].trim();
  n = n.charAt(0).toLowerCase() + n.slice(1);
  if (/^[\d.,\/\s]+$/.test(q)) return q + ' ' + n;              // « 2 échalotes »
  return q + (/^[aeiouyhéèêàâîôû]/i.test(n) ? " d'" : ' de ') + n; // « 1 pincée de sel »
}

const ICONES_ = { step_spoon: 'vitesse cuillère', rotate_cw_2: 'sens inverse', rotate_ccw: 'sens inverse' };
function icone_(n) {
  if (ICONES_[n]) return ICONES_[n];
  if (/rotate|reverse|inverse/.test(n)) return 'sens inverse';
  if (/spoon|cuill/.test(n)) return 'vitesse cuillère';
  if (/knead|petrin/.test(n)) return 'mode pétrin';
  if (/turbo/.test(n)) return 'turbo';
  return n.replace(/^step_/, '').replace(/_\d+$/, '').replace(/_/g, ' ');
}

/** Étapes lues dans la liste HTML de la page, réglages Thermomix séparés. */
function etapesDepuisHtml_(html) {
  const m = html.match(/<div[^>]*class="[^"]*\binstructions\b[^"]*"[^>]*>\s*<ol[^>]*>([\s\S]*?)<\/ol>/i);
  if (!m || !/<b>/.test(m[1])) return [];
  const sortie = [];
  const reLi = /<li[^>]*>([\s\S]*?)<\/li>/gi;
  let li;
  while ((li = reLi.exec(m[1]))) {
    let c = li[1].replace(/<i[^>]*class="[^"]*icon-([a-z0-9_]+)[^"]*"[^>]*>\s*<\/i>/gi, function (_, n) { return ' ' + icone_(n) + ' '; });
    let reglages = [];
    c = c.replace(/<span[^>]*>((?:\s*<b>[\s\S]*?<\/b>\s*\/?)+)\s*<\/span>/i, function (_, inner) {
      reglages = nettoyer_(inner).split('/').map(function (x) { return x.trim(); }).filter(String);
      return ' ';
    });
    const t = nettoyer_(c).replace(/\s+([.,;!])/g, '$1');
    if (t || reglages.length) sortie.push({ t: t || 'Programmer le Thermomix', reglages: reglages });
  }
  return sortie;
}

function trouverRecette_(o) {
  if (!o) return null;
  if (Array.isArray(o)) {
    for (let i = 0; i < o.length; i++) { const r = trouverRecette_(o[i]); if (r) return r; }
    return null;
  }
  if (typeof o !== 'object') return null;
  const t = o['@type'];
  if (t === 'Recipe' || (Array.isArray(t) && t.indexOf('Recipe') >= 0)) return o;
  if (o['@graph']) return trouverRecette_(o['@graph']);
  if (o.mainEntity) return trouverRecette_(o.mainEntity);
  return null;
}

function aplatirInstructions_(ins, sortie) {
  if (!ins) return;
  if (typeof ins === 'string') {
    nettoyer_(ins, true).split(/\n+|(?<=\.)\s+(?=\d+[.)]\s)/).forEach(function (s) {
      s = s.replace(/^\d+[.)]\s*/, '').trim();
      if (s) sortie.push({ t: s });
    });
    return;
  }
  if (Array.isArray(ins)) { ins.forEach(function (x) { aplatirInstructions_(x, sortie); }); return; }
  if (typeof ins === 'object') {
    const t = ins['@type'];
    if (t === 'HowToSection') {
      if (ins.name) sortie.push({ section: nettoyer_(ins.name) });
      aplatirInstructions_(ins.itemListElement, sortie);
    } else if (ins.itemListElement) {
      aplatirInstructions_(ins.itemListElement, sortie);
    } else {
      const s = nettoyer_(ins.text || ins.name || '');
      if (s) sortie.push({ t: s });
    }
  }
}

function nettoyer_(s, garderLignes) {
  if (s === undefined || s === null) return '';
  let t = String(s)
    .replace(/<br\s*\/?>/gi, '\n').replace(/<\/p>/gi, '\n').replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;|&rsquo;/g, '’').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&deg;/g, '°').replace(/&#(\d+);/g, function (_, n) { return String.fromCharCode(+n); });
  t = garderLignes ? t.replace(/[ \t]+/g, ' ') : t.replace(/\s+/g, ' ');
  return t.trim();
}

function duree_(iso) {
  if (!iso) return '';
  const m = String(iso).match(/P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?)?/);
  if (!m) return '';
  const h = (+(m[1] || 0)) * 24 + (+(m[2] || 0));
  const min = +(m[3] || 0);
  if (!h && !min) return '';
  if (!h) return min + ' min';
  return h + ' h' + (min ? ' ' + (min < 10 ? '0' : '') + min : '');
}

function categorie_(cat, nom) {
  const s = sansAccents_([].concat(cat || []).join(' ') + ' ' + (nom || '')).toLowerCase();
  if (/cocktail|boisson|smoothie|jus |limonade|sirop|drink|mojito|punch|sangria/.test(s)) return 'Boisson';
  if (/dessert|gateau|patisserie|tarte sucree|cookie|biscuit|creme dessert|mousse au chocolat/.test(s)) return 'Dessert';
  if (/apero|aperitif|amuse|tapas|dip/.test(s)) return 'Apéro';
  if (/entree|soupe|veloute|salade/.test(s)) return 'Entrée';
  if (/pain|brioche|viennoiserie/.test(s)) return 'Boulangerie';
  return 'Plat';
}

/* ------------------------------------------------------------------ */
/*  Planning partagé + agenda                                          */
/* ------------------------------------------------------------------ */

function lignesPlanning_() {
  const sh = SpreadsheetApp.getActive().getSheetByName(FEUILLE_PLANNING);
  const n = sh.getLastRow() - 1;
  if (n <= 0) return { sh: sh, lignes: [] };
  return { sh: sh, lignes: sh.getRange(2, 1, n, 8).getDisplayValues() };
}

function actionPlanning_(p) {
  const du = p.du || '0000-00-00';
  const au = p.au || '9999-99-99';
  const items = lignesPlanning_().lignes
    .filter(function (l) { return l[0] && l[1] >= du && l[1] <= au; })
    .map(function (l) { return { id: l[0], date: l[1], moment: l[2], recetteId: l[3], titre: l[4], par: l[5] }; });
  items.sort(function (a, b) { return (a.date + (a.moment === 'Midi' ? 0 : 1)).localeCompare(b.date + (b.moment === 'Midi' ? 0 : 1)); });
  return { ok: true, planning: items };
}

function actionPlanifier_(r, p) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(p.date || '')) return { ok: false, erreur: 'Date invalide' };
  const moment = p.moment === 'Midi' ? 'Midi' : 'Soir';
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const id = Utilities.getUuid().slice(0, 8);
    let idEvenement = '';
    try {
      const agenda = CalendarApp.getCalendarById(r['Agenda (ID)']);
      const d = p.date.split('-').map(Number);
      const h = HEURES[moment];
      const debut = new Date(d[0], d[1] - 1, d[2], h[0], h[1]);
      const fin = new Date(d[0], d[1] - 1, d[2], h[2], h[3]);
      let description = 'Planifié par ' + (p.par || '?') + ' depuis « Mes recettes ».';
      if (p.app) description += '\n' + p.app + '#/r/' + p.recetteId;
      idEvenement = agenda.createEvent(p.titre || 'Repas', debut, fin, { description: description }).getId();
    } catch (e) { idEvenement = ''; }
    const sh = SpreadsheetApp.getActive().getSheetByName(FEUILLE_PLANNING);
    sh.appendRow([id, p.date, moment, p.recetteId || '', p.titre || '', p.par || '', idEvenement, new Date()]);
    return { ok: true, id: id, agenda: !!idEvenement };
  } finally {
    lock.releaseLock();
  }
}

function actionRetirer_(r, p) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const t = lignesPlanning_();
    for (let i = 0; i < t.lignes.length; i++) {
      if (t.lignes[i][0] === p.id) {
        const idEv = t.lignes[i][6];
        if (idEv) {
          try { const ev = CalendarApp.getCalendarById(r['Agenda (ID)']).getEventById(idEv); if (ev) ev.deleteEvent(); } catch (e) { /* déjà supprimé */ }
        }
        t.sh.deleteRow(i + 2);
        return { ok: true };
      }
    }
    return { ok: true };
  } finally {
    lock.releaseLock();
  }
}
