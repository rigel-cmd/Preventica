// Préventica Lyon 2026 — publie les données du salon dans le dossier donnees/.
// À partir de la sauvegarde complète la plus récente (donnees/sauvegarde*.json, exportée depuis l'app),
// génère des fichiers lisibles sur GitHub : bilan (README.md), synthèses, contacts (CSV, vCard), photos.
// Lancé par .github/workflows/donnees.yml à chaque dépôt d'une sauvegarde ; aussi : node outils/publier-donnees.mjs [racine]
import fs from 'node:fs';
import path from 'node:path';

const RACINE = path.resolve(process.argv[2] || '.');
const DOSSIER = path.join(RACINE, 'donnees');
const APP = 'vpo-preventica-lyon-2026';

// ---------- Sauvegarde la plus récente ----------
const candidates = fs.existsSync(DOSSIER) ? fs.readdirSync(DOSSIER).filter((f) => /^sauvegarde.*\.json$/i.test(f)) : [];
let source = null;
for (const f of candidates) {
  try {
    const d = JSON.parse(fs.readFileSync(path.join(DOSSIER, f), 'utf8').replace(/^\uFEFF/, ''));
    if (!d || d.app !== APP) { console.warn(`Ignoré (pas une sauvegarde du parcours) : ${f}`); continue; }
    if (!source || String(d.date || '') > String(source.d.date || '')) source = { f, d };
  } catch (e) {
    console.warn(`Ignoré (illisible) : ${f}`);
  }
}
const ACCUEIL = `# Préventica Lyon 2026 — données du salon

Ce dossier accueille les données de l'app du parcours : cartes données, interlocuteurs, photos des cartes de visite, synthèses Plaud, stands visités.

**Il est public** : tout ce qui est déposé ici est visible par tous.

## Publier ou mettre à jour les données

1. Dans l'app, sur le téléphone : onglet **Cartes** → **Exporter et sauvegarder** → **Sauvegarde complète**, puis envoyez-vous le fichier (e-mail, AirDrop…).
2. Sur github.com, ouvrez ce dossier \`donnees/\`, puis **Add file** → **Upload files**, et déposez le fichier (\`sauvegarde-….json\`).
3. Validez avec **Commit changes**.

En une à deux minutes, cette page est remplacée par le bilan du salon : synthèses complètes, tableau des contacts avec les photos, stands visités. Des fichiers prêts à l'emploi sont générés à côté :
- \`syntheses.md\` ;
- \`contacts.csv\` et \`contacts-excel.csv\` ;
- \`contacts.vcf\` ;
- le dossier \`photos/\`.

Le site propose aussi ces données sur tout appareil qui n'en a pas encore (votre ordinateur, par exemple).
`;
const GENERES = ['index.json', 'syntheses.md', 'contacts.csv', 'contacts-excel.csv', 'contacts.vcf', 'photos'];
if (!source) {
  fs.mkdirSync(DOSSIER, { recursive: true });
  for (const f of GENERES) fs.rmSync(path.join(DOSSIER, f), { recursive: true, force: true });
  fs.writeFileSync(path.join(DOSSIER, 'README.md'), ACCUEIL);
  console.log('Aucune sauvegarde du parcours dans donnees/ : page d\'accueil remise, rien à publier.');
  process.exit(0);
}
const D = source.d;
const contacts = (Array.isArray(D.contacts) ? D.contacts : []).filter((c) => c && typeof c === 'object').slice().sort((a, b) => String(a.date || '').localeCompare(String(b.date || '')));
const synth = D.syntheses && typeof D.syntheses === 'object' ? D.syntheses : {};
const etat = D.stands && typeof D.stands === 'object' ? D.stands : {};
const photos = D.photos && typeof D.photos === 'object' ? D.photos : {};
console.log(`Sauvegarde : ${source.f} (${D.date}) — ${contacts.length} cartes, ${Object.keys(synth).length} synthèses, ${Object.keys(photos).length} photos`);

// ---------- Référentiel lu dans index.html : stands, conférences suivies, conférences retirées ----------
const page = fs.readFileSync(path.join(RACINE, 'index.html'), 'utf8');
const texte = (h) => String(h).replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
let ALLEES = {};
const mS = page.match(/<script type="application\/json" id="vpo-stands-donnees">([\s\S]*?)<\/script>/);
if (mS) ALLEES = JSON.parse(mS[1]);
const STANDS = {};
for (const l of Object.keys(ALLEES)) for (const [code, nom] of ALLEES[l]) STANDS[code] = { code, nom, allee: l };
const CONFS = [];
const reConf = /<li data-debut="(\d\d:\d\d)" data-fin="(\d\d:\d\d)" data-court="([^"]+)"><div class="vpo-diapo">[\s\S]*?<span class="vpo-heure">([\s\S]*?)<\/span><p class="vpo-lieu"><span class="vpo-type">([\s\S]*?)<\/span><span class="vpo-mini">([\s\S]*?)<\/span><\/p><h3 class="vpo-h3">([\s\S]*?)<\/h3>(?:<p class="vpo-texte">([\s\S]*?)<\/p>)?/g;
for (const m of page.matchAll(reConf)) {
  CONFS.push({ id: 'c' + m[1].replace(':', ''), court: m[3], heure: texte(m[4]), salle: texte(m[5]) + ' · ' + texte(m[6]), titre: texte(m[7]), detail: texte(m[8] || '') });
}
const CONF_PAR_ID = Object.fromEntries(CONFS.map((c) => [c.id, c]));
const objetJs = (nom) => {
  const m = page.match(new RegExp('var ' + nom + '=\\{([^;]*)\\};'));
  return m ? Object.fromEntries([...m[1].matchAll(/(c\d+):'([^']*)'/g)].map((x) => [x[1], x[2]])) : {};
};
const CONFS_ANCIENNES = objetJs('CONFS_ANCIENNES');
const SALLES_ANCIENNES = objetJs('SALLES_ANCIENNES');

// ---------- Outils ----------
const paris = (iso, opts) => { const d = new Date(iso); return isNaN(d) ? '' : new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', ...opts }).format(d); };
const heure = (iso) => paris(iso, { hour: '2-digit', minute: '2-digit' }).replace(':', 'h');
const dateLongue = (iso) => paris(iso, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }).replace(/(\d\d):(\d\d)/, '$1h$2');
const slug = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-+|-+$/g, '').toLowerCase().slice(0, 40) || 'contact';
const ancre = (s) => String(s).toLowerCase().replace(/[^\p{L}\p{N}\s-]/gu, '').trim().replace(/\s/g, '-');
const html = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const ligne = (s) => html(s).replace(/\r\n?|\n/g, ' ');
const cellule = (s) => html(s).replace(/\|/g, '\\|').replace(/\r\n?|\n/g, '<br>');
const pluriel = (n, mot, motP) => `${n} ${n > 1 ? (motP || mot + 's') : mot}`;
function lieu(c) {
  const v = String(c.lieu || '');
  if (STANDS[v]) return `${v} · ${STANDS[v].nom}`;
  if (v.startsWith('conf:')) {
    const id = v.slice(5);
    if (CONF_PAR_ID[id]) return `${CONF_PAR_ID[id].court} · ${CONF_PAR_ID[id].titre}`;
    if (CONFS_ANCIENNES[id]) return CONFS_ANCIENNES[id];
  }
  return c.libre || 'Autre lieu';
}
function infoConf(id) {
  const c = CONF_PAR_ID[id];
  if (c) return { heure: c.heure, salle: c.salle, titre: c.titre };
  const s = synth[id] || {};
  return { heure: s.heure || '', salle: SALLES_ANCIENNES[id] || '', titre: s.titre || 'Autre conférence' };
}
// Titres de Plaud décalés sous ceux de la page (hors blocs de code), en-tête YAML en liste
function decaler(t, n) {
  t = String(t).replace(/\r\n?/g, '\n').trim().replace(/^---\n([\s\S]*?)\n---(\n|$)/, (_, y) => y.split('\n').filter(Boolean).map((l) => '- ' + l).join('\n') + '\n\n');
  let bloc = null;
  const sortie = t.split('\n').map((l) => {
    const f = l.match(/^\s*(```|~~~)/);
    if (f) { if (!bloc) bloc = f[1]; else if (f[1] === bloc) bloc = null; return l; }
    return bloc ? l : l.replace(/^(#{1,6})(?=\s)/, (h) => '#'.repeat(Math.min(6, h.length + n)));
  }).join('\n');
  return bloc ? sortie + '\n' + bloc : sortie;
}
const ecrire = (nom, contenu) => fs.writeFileSync(path.join(DOSSIER, nom), contenu);

// ---------- Photos des cartes de visite ----------
const DOSSIER_PHOTOS = path.join(DOSSIER, 'photos');
fs.rmSync(DOSSIER_PHOTOS, { recursive: true, force: true });
const fichierPhoto = {};
for (const c of contacts) {
  const u = photos[c.id];
  const m = typeof u === 'string' && u.match(/^data:image\/(jpeg|jpg|png|webp|gif);base64,([A-Za-z0-9+/=\s]+)$/);
  if (!c.photo || !m) continue;
  fs.mkdirSync(DOSSIER_PHOTOS, { recursive: true });
  const nom = `${slug(c.nom || c.societe || lieu(c))}-${slug(c.id)}.${m[1] === 'jpeg' ? 'jpg' : m[1]}`;
  fs.writeFileSync(path.join(DOSSIER_PHOTOS, nom), Buffer.from(m[2], 'base64'));
  fichierPhoto[c.id] = 'photos/' + nom;
}

// ---------- Contacts : CSV (GitHub et Excel) et vCard ----------
const COLONNES = ['Date', 'Heure', 'Lieu', 'Interlocuteur', 'Fonction', 'Société', 'Téléphone', 'E-mail', 'Note', 'Photo'];
const lignes = contacts.map((c) => [paris(c.date, { day: '2-digit', month: '2-digit', year: 'numeric' }), heure(c.date), lieu(c), c.nom, c.fonction, c.societe, c.tel, c.email, c.note, fichierPhoto[c.id] || '']);
const csv = (sep, tableur) => [COLONNES, ...lignes].map((l) => l.map((v) => {
  let s = String(v == null ? '' : v);
  if (tableur && /^[=+\-@\t\r]/.test(s)) s = "'" + s; // jamais interprété comme une formule par Excel
  return new RegExp(`[${sep}"\\r\\n]`).test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}).join(sep)).join('\r\n') + '\r\n';
ecrire('contacts.csv', csv(',', false));
ecrire('contacts-excel.csv', '\uFEFF' + csv(';', true));
const vEsc = (s) => String(s || '').replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/([,;])/g, '\\$1');
const vcards = contacts.filter((c) => c.nom || c.tel || c.email).map((c) => {
  const mots = String(c.nom || '').trim().split(/\s+/), prenom = mots.length > 1 ? mots[0] : '', famille = mots.length > 1 ? mots.slice(1).join(' ') : mots[0] || '';
  const l = ['BEGIN:VCARD', 'VERSION:3.0', `N:${vEsc(famille)};${vEsc(prenom)};;;`, `FN:${vEsc(c.nom || c.societe || lieu(c))}`];
  if (c.societe) l.push('ORG:' + vEsc(c.societe));
  if (c.fonction) l.push('TITLE:' + vEsc(c.fonction));
  if (c.tel) l.push('TEL;TYPE=WORK,VOICE:' + vEsc(c.tel));
  if (c.email) l.push('EMAIL;TYPE=INTERNET:' + vEsc(c.email));
  l.push('NOTE:' + vEsc(`Rencontré à Préventica Lyon le 6 octobre 2026 (${lieu(c)}). Carte du podcast remise.` + (c.note ? '\n' + c.note : '')));
  l.push('CATEGORIES:Préventica Lyon 2026', 'END:VCARD');
  return l.join('\r\n');
}).join('\r\n');
ecrire('contacts.vcf', vcards ? vcards + '\r\n' : '');

// ---------- Synthèses ----------
const idsSuivies = CONFS.map((c) => c.id);
const aSynth = (id) => !!(synth[id] && synth[id].texte);
const autres = Object.keys(synth).filter((id) => !CONF_PAR_ID[id] && aSynth(id)).sort((a, b) => String(synth[a].maj || '').localeCompare(String(synth[b].maj || '')));
function blocSynthese(id, niveau) {
  const c = infoConf(id), s = synth[id] || {};
  const h = '#'.repeat(niveau);
  const out = [`${h} ${c.heure ? ligne(c.heure) + ' · ' : ''}${ligne(c.titre)}`];
  if (c.salle) out.push(`*${ligne(c.salle)}*`);
  if (CONF_PAR_ID[id] && CONF_PAR_ID[id].detail) out.push('', CONF_PAR_ID[id].detail);
  out.push('', aSynth(id) ? decaler(s.texte, niveau) : '_Pas de synthèse enregistrée._');
  if (s.lien) out.push('', `[Écouter l'enregistrement Plaud](${s.lien})`);
  out.push('');
  return out.join('\n');
}
ecrire('syntheses.md', [
  '# Préventica Lyon 2026 – synthèses des conférences', '',
  `Mardi 6 octobre 2026, Eurexpo. Synthèses enregistrées avec Plaud (sauvegarde du ${dateLongue(D.date)}).`, '',
  ...idsSuivies.map((id) => blocSynthese(id, 2)),
  ...(autres.length ? ['## Autres synthèses', '', ...autres.map((id) => blocSynthese(id, 3))] : []),
].join('\n'));

// ---------- Bilan : README.md du dossier, affiché par GitHub ----------
const vus = Object.keys(etat).filter((k) => etat[k]);
const nsS = idsSuivies.filter(aSynth).length;
const R = [];
R.push('# Préventica Lyon 2026 — bilan du salon', '');
R.push(`> Page générée automatiquement à partir de la sauvegarde **${ligne(source.f)}** (${dateLongue(D.date)}). Ne pas la modifier à la main : déposer une nouvelle sauvegarde la régénère (voir en bas).`, '');
R.push(`**${pluriel(CONFS.length, 'conférence suivie', 'conférences suivies')}** · **${nsS}/${CONFS.length} synthèses**${autres.length ? ` (+${autres.length} autre${autres.length > 1 ? 's' : ''})` : ''} · **${pluriel(contacts.length, 'carte donnée', 'cartes données')}** · **${pluriel(vus.length, 'stand visité', 'stands visités')}**`, '');
const T_CONF = 'Conférences suivies', T_CARTES = `Cartes données (${contacts.length})`, T_STANDS = `Stands visités (${vus.length})`;
R.push('## Sommaire', '', `- [${T_CONF}](#${ancre(T_CONF)})`, `- [${T_CARTES}](#${ancre(T_CARTES)})`, `- [${T_STANDS}](#${ancre(T_STANDS)})`, '- [Fichiers](#fichiers)', '- [Mettre à jour ces données](#mettre-à-jour-ces-données)', '');
R.push(`## ${T_CONF}`, '');
for (const id of idsSuivies) R.push(blocSynthese(id, 3));
if (autres.length) { R.push('### Autres synthèses', ''); for (const id of autres) R.push(blocSynthese(id, 4)); }
R.push(`## ${T_CARTES}`, '');
if (contacts.length) {
  R.push('| Photo | Heure | Lieu | Interlocuteur | Fonction · Société | Coordonnées | Note |', '|---|---|---|---|---|---|---|');
  for (const c of contacts) {
    const ph = fichierPhoto[c.id] ? `[<img src="${fichierPhoto[c.id]}" width="72" alt="Carte de visite">](${fichierPhoto[c.id]})` : '';
    const coord = [c.tel ? cellule(c.tel) : '', c.email ? `[${cellule(c.email)}](mailto:${String(c.email).replace(/[\s()<>|]/g, '')})` : ''].filter(Boolean).join('<br>');
    R.push(`| ${ph} | ${heure(c.date)} | ${cellule(lieu(c))} | ${cellule(c.nom || '—')} | ${cellule([c.fonction, c.societe].filter(Boolean).join(' · '))} | ${coord} | ${cellule(c.note)} |`);
  }
  R.push('');
} else R.push('_Aucune carte enregistrée._', '');
R.push(`## ${T_STANDS}`, '');
if (vus.length) {
  for (const l of Object.keys(ALLEES)) {
    const ici = ALLEES[l].filter(([code]) => etat[code]);
    if (ici.length) R.push(`- **Allée ${l}** : ${ici.map(([code, nom]) => `${code} ${nom}`).join(', ')}`);
  }
  const inconnus = vus.filter((k) => !STANDS[k]);
  if (inconnus.length) R.push(`- **Autres** : ${inconnus.map(ligne).join(', ')}`);
  R.push('');
} else R.push('_Aucun stand coché._', '');
R.push('## Fichiers', '',
  '- [syntheses.md](syntheses.md) : toutes les synthèses en un document',
  '- [contacts.csv](contacts.csv) : les cartes données (tableau lisible sur GitHub)',
  '- [contacts-excel.csv](contacts-excel.csv) : la même liste, à ouvrir dans Excel',
  '- [contacts.vcf](contacts.vcf) : les contacts, à importer dans un carnet d\'adresses (Outlook, Contacts…)',
  '- [photos/](photos/) : les photos des cartes de visite',
  `- [${ligne(source.f)}](${encodeURIComponent(source.f)}) : la sauvegarde complète, à restaurer dans l'app (Cartes → Exporter et sauvegarder → Restaurer)`, '');
R.push('## Mettre à jour ces données', '',
  '1. Dans l\'app, sur le téléphone : onglet **Cartes** → **Exporter et sauvegarder** → **Sauvegarde complète**, puis envoyez-vous le fichier.',
  '2. Sur github.com, ouvrez ce dossier `donnees/`, puis **Add file** → **Upload files**, et déposez le fichier (`sauvegarde-….json`).',
  '3. Validez avec **Commit changes**. En une à deux minutes, cette page, les synthèses, les contacts et les photos sont régénérés à partir de la sauvegarde la plus récente.', '',
  'Le site propose aussi ces données publiées sur tout appareil qui n\'en a pas encore (votre ordinateur, par exemple).', '');
ecrire('README.md', R.join('\n'));

// ---------- Index lu par le site ----------
ecrire('index.json', JSON.stringify({ fichier: source.f, date: D.date, cartes: contacts.length, syntheses: Object.keys(synth).filter(aSynth).length }, null, 1) + '\n');
console.log('Publié : README.md, syntheses.md, contacts.csv, contacts-excel.csv, contacts.vcf, index.json' + (Object.keys(fichierPhoto).length ? `, ${Object.keys(fichierPhoto).length} photo(s)` : ''));
