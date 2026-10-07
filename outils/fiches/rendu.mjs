// Fiches de synthèse A4 (une page par conférence), au design du site.
// Usage : node rendu.mjs fiches.json sortie.pdf [--dossier d] [--mesure] [--html sortie.html] [--seul c0945]
//   sortie.pdf : toutes les fiches réunies ; --dossier : en plus, une fiche par PDF (nom pris dans le champ « fichier »).
//   Affiche pour chaque fiche « TIENT » ou « DÉBORDE » et la marge restante ; code de sortie 1 si une fiche déborde.
// Dépendances : playwright (Chromium) et @fontsource/poppins + @fontsource/open-sans
//   (npm i --no-save playwright @fontsource/poppins @fontsource/open-sans).
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ici = dirname(fileURLToPath(import.meta.url));
const exiger = createRequire(join(process.cwd(), 'x.js'));
const exigerIci = createRequire(join(ici, 'x.js'));
function module(nom) {
  for (const r of [exiger, exigerIci]) { try { return r.resolve(nom); } catch {} }
  if (process.env.PW && nom === 'playwright') return join(process.env.PW, 'index.js');
  throw new Error('Module introuvable : ' + nom);
}

const args = process.argv.slice(2);
const opt = (n) => { const i = args.indexOf(n); return i < 0 ? null : args[i + 1]; };
const [source, sortie] = args.filter((a, i) => !a.startsWith('--') && !(i > 0 && /^--(html|seul|dossier)$/.test(args[i - 1])));
if (!source || !sortie) { console.error('Usage : node rendu.mjs fiches.json sortie.pdf [--dossier d] [--mesure] [--html f.html] [--seul id]'); process.exit(2); }
let fiches = JSON.parse(readFileSync(source, 'utf8'));
if (!Array.isArray(fiches)) fiches = [fiches];
fiches.forEach((f, i, t) => { f.numero = f.numero || i + 1; f.total = f.total || t.length; });
if (opt('--seul')) fiches = fiches.filter((f) => f.id === opt('--seul'));

// Polices : sous-ensembles latin et latin-ext, embarqués en base64.
function polices() {
  const jeux = [['poppins', ['600', '700', '800']], ['open-sans', ['400', '400-italic', '600', '700']]];
  let css = '';
  for (const [fam, poids] of jeux) {
    const base = dirname(module('@fontsource/' + fam + '/package.json'));
    for (const p of poids) {
      const brut = readFileSync(join(base, p + '.css'), 'utf8');
      for (const bloc of brut.split('@font-face').slice(1)) {
        if (!/files\/[a-z-]+-latin(-ext)?-\d+-(normal|italic)\.woff2/.test(bloc)) continue;
        const f = bloc.match(/url\(\.\/files\/([^)]+\.woff2)\)/)[1];
        const donnees = readFileSync(join(base, 'files', f)).toString('base64');
        css += '@font-face' + bloc.replace(/src:[^;]+;/, `src:url(data:font/woff2;base64,${donnees}) format('woff2');`).replace(/\}[\s\S]*$/, '}') + '\n';
      }
    }
  }
  return css;
}

const echapper = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const typo = (s) => String(s ?? '').replace(/ ([:;!?»%€])/g, '\u00a0$1').replace(/« /g, '«\u00a0').replace(/(\d) (?=\d{3}\b)/g, '$1\u00a0').replace(/\b(n°|art\.|Art\.|p\.) /g, '$1\u00a0').replace(/(\d) (?=(janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre)\b)/g, '$1\u00a0');
// Références (R4323-63, n° 23-84.130, 2004-924…) jamais coupées en fin de ligne.
const enLigne = (s) => echapper(typo(s)).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\b[A-Z]?\d[\d.]*-\d[\d.]*\d\b|\b[A-Z]?\d[\d.]*-\d\b/g, '<span class="insec">$&</span>');
const lien = (url, txt) => /^https?:\/\//.test(url || '') ? `<a href="${echapper(url)}">${txt}</a>` : txt;
const domaine = (u) => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return ''; } };
const liste = (items, cls = '') => items?.length ? `<ul class="${cls}">${items.map((x) => `<li>${enLigne(x)}</li>`).join('')}</ul>` : '';

function statut(t) {
  const ok = t.verifie === true;
  return `<span class="statut ${ok ? 'ok' : 'nv'}">${echapper(t.statut || (ok ? 'Vérifié' : 'Non vérifié'))}</span>`;
}

function page(f, n, total) {
  const j = f.juridique || {}, c = f.cabinet || {};
  const meta = [['Organisme', f.organisme], ['Intervenants', f.intervenants], ['Format', f.format]].filter(([, v]) => v);
  return `<article class="page" data-id="${echapper(f.id)}">
<header class="bande">
  <div class="bande-haut"><span class="mini">Préventica Lyon 2026 · Fiche de synthèse</span>
    <span class="marque">Victimes &amp; Préjudices <em>Avocats</em></span></div>
  <div class="reperes"><span class="heure">${echapper(f.heure)}</span><span class="type">${echapper(f.type)}</span><span class="salle">${echapper(f.salle)}</span></div>
  <h1>${enLigne(f.titre)}</h1>
</header>
<div class="contenu">
  <dl class="meta">${meta.map(([k, v]) => `<dt>${k}</dt><dd>${enLigne(v)}</dd>`).join('')}</dl>
  <p class="interet"><span><strong>Intérêt pour le cabinet : ${echapper(f.interet?.niveau)}.</strong> ${enLigne(f.interet?.texte)}</span></p>
  <div class="colonnes">
    <section><h2>Messages clés</h2>${liste(f.messages)}</section>
    <section><h2>Éléments juridiques</h2>
      ${j.socle ? `<p class="socle">${enLigne(j.socle)}</p>` : ''}
      <div class="textes">${(j.textes || []).map((t) => `<div class="texte"><div class="texte-tete"><b>${lien(t.url, enLigne(t.ref))}</b>${statut(t)}</div><p>${enLigne(t.apport)}</p></div>`).join('')}</div>
      ${j.ajouts?.items?.length ? `<div class="ajouts"><h3>${enLigne(j.ajouts.titre || 'Ajouts du rédacteur')}</h3>${liste(j.ajouts.items)}</div>` : ''}
    </section>
    <section><h2>Pour le cabinet</h2>
      ${c.profils?.length ? `<h3>Victimes concernées</h3>${liste(c.profils)}` : ''}
      ${c.questions?.length ? `<h3>${enLigne(c.titreQuestions || 'Questions au premier rendez-vous')}</h3><ol>${c.questions.map((q) => `<li>${enLigne(q)}</li>`).join('')}</ol>` : ''}
      ${c.pieces?.length ? `<h3>Pièces à réclamer</h3>${liste(c.pieces, 'pieces')}` : ''}
      ${c.argument ? `<div class="argument"><h3>Argument à exploiter</h3><p>${enLigne(c.argument)}</p></div>` : ''}
      ${c.prescription ? `<p class="prescription"><strong>Prescripteurs.</strong> ${enLigne(c.prescription)}</p>` : ''}
    </section>
  </div>
  ${f.pistes?.length ? `<section class="bas"><h2>Pistes éditoriales</h2><div class="pistes">${f.pistes.map((p) => `<div class="piste"><span class="format">${echapper(p.format)}</span><b>${enLigne(p.sujet)}</b>${p.angle ? `<span>${enLigne(p.angle)}</span>` : ''}</div>`).join('')}</div></section>` : ''}
  ${f.sources?.length ? `<section class="bas sources"><h2>Sources</h2><ul>${f.sources.map((s) => `<li>${lien(s.url, enLigne(s.libelle))}${domaine(s.url) ? ` <span class="dom">${echapper(domaine(s.url))}</span>` : ''}</li>`).join('')}</ul></section>` : ''}
</div>
<footer><span>Victimes &amp; Préjudices Avocats · ${enLigne(f.pied || 'Synthèse du 6 octobre 2026 · Document interne')}</span><span><a href="${INTEGRALE}">Version intégrale sur GitHub</a> · Fiche ${n} / ${total}</span></footer>
</article>`;
}

const INTEGRALE = 'https://github.com/rigel-cmd/Preventica/blob/main/donnees/syntheses.md';

const CSS = `
@page{size:A4;margin:0}
*{box-sizing:border-box;margin:0;padding:0}
html{-webkit-print-color-adjust:exact;print-color-adjust:exact}
body{background:#fff;color:#3A4650;font:8.5pt/1.38 "Open Sans",system-ui,sans-serif;font-kerning:normal;text-rendering:optimizeLegibility}
strong,b{font-weight:700;color:#23384A}
.insec{white-space:nowrap}
a{color:#B52026;text-decoration:none}
.page{position:relative;display:flex;flex-direction:column;width:210mm;height:297mm;overflow:hidden;break-after:page}
.page:last-child{break-after:auto}
.bande{padding:7mm 12mm 5.5mm;background:#304859;color:#fff}
.bande-haut{display:flex;justify-content:space-between;align-items:center;gap:6mm}
.mini{font:700 6.8pt/1.2 Poppins,sans-serif;letter-spacing:.14em;text-transform:uppercase;color:rgba(255,255,255,.75)}
.marque{font:700 8.6pt/1.15 Poppins,sans-serif;color:#fff;text-align:right;white-space:nowrap}
.marque em{display:block;font-style:normal;color:#8EC33F}
.reperes{display:flex;flex-wrap:wrap;align-items:center;gap:2.2mm;margin-top:3.4mm}
.heure{padding:.9mm 3mm;border-radius:99px;background:#B52026;color:#fff;font:800 9pt/1.3 Poppins,sans-serif;letter-spacing:-.01em;white-space:nowrap}
.type{padding:.7mm 2.6mm;border-radius:99px;background:#FBE8E9;color:#B52026;font:700 6.6pt/1.5 Poppins,sans-serif;letter-spacing:.1em;text-transform:uppercase}
.salle{font:600 8pt/1.3 Poppins,sans-serif;color:rgba(255,255,255,.85)}
h1{margin-top:2.6mm;font:800 16pt/1.2 Poppins,sans-serif;letter-spacing:-.015em;color:#fff;text-wrap:balance}
.contenu{flex:none;display:flex;flex-direction:column;gap:2.6mm;padding:4.5mm 12mm 0}
.meta{display:grid;grid-template-columns:auto 1fr;gap:.8mm 3.5mm;padding:2.4mm 3.5mm;border-radius:3mm;background:#F4F6F8;font-size:7.9pt;line-height:1.35}
.meta dt{font:700 7.4pt/1.5 Poppins,sans-serif;color:#23384A}
.interet{display:flex;gap:2.6mm;align-items:flex-start;padding:2.4mm 3.5mm;border-radius:3mm;background:#FFF3D6;color:#23384A;line-height:1.4}
.interet::before{content:"";flex:none;width:2mm;height:2mm;margin-top:1.1mm;border-radius:50%;background:#FCAF19;box-shadow:0 0 0 1mm rgba(252,175,25,.28)}
.colonnes{column-count:2;column-gap:7mm;column-fill:balance}
.colonnes section+section{margin-top:3mm}
h2{display:flex;align-items:stretch;gap:2mm;margin-bottom:1.6mm;font:800 9.8pt/1.25 Poppins,sans-serif;letter-spacing:-.01em;color:#23384A;break-after:avoid}
h2::before{content:"";flex:none;width:1.1mm;border-radius:.6mm;background:#B52026}
h3{margin:2.2mm 0 1mm;font:800 8pt/1.3 Poppins,sans-serif;color:#B52026;break-after:avoid}
h2+h3{margin-top:0}
ul,ol{list-style:none}
li{break-inside:avoid}
li+li{margin-top:1mm}
ul>li{position:relative;padding-left:3.6mm}
ul>li::before{content:"";position:absolute;left:.6mm;top:.62em;width:1.3mm;height:1.3mm;border-radius:50%;background:#B52026}
ol{counter-reset:q}
ol>li{position:relative;padding-left:4.4mm;counter-increment:q}
ol>li::before{content:counter(q);position:absolute;left:0;top:.05em;font:800 8pt/1.35 Poppins,sans-serif;color:#B52026}
ul.pieces>li{padding-left:4.4mm}
ul.pieces>li::before{left:0;top:.28em;width:2.5mm;height:2.5mm;border-radius:.7mm;background:none;box-shadow:inset 0 0 0 .35mm #7A8792}
.socle{margin-bottom:1.8mm;color:#23384A}
.textes{display:grid;gap:1.6mm}
.texte{padding:1.7mm 2.6mm;border:.3mm solid #E3E8EC;border-radius:2.4mm;break-inside:avoid}
.texte-tete{display:flex;justify-content:space-between;align-items:flex-start;gap:2mm;margin-bottom:.5mm}
.texte-tete b{font:700 7.9pt/1.35 Poppins,sans-serif}
.texte p{font-size:8pt;line-height:1.36}
.statut{flex:none;max-width:42%;padding:.3mm 1.8mm;border-radius:99px;font:700 6.2pt/1.5 Poppins,sans-serif;text-align:center}
.statut.ok{background:#E8F4D6;color:#4E7A1A}
.statut.nv{background:#FFF3D6;color:#8A5A00}
.ajouts{margin-top:2mm;padding:1.8mm 2.6mm;border-radius:2.4mm;background:#F4F6F8;break-inside:avoid}
.ajouts h3{margin-top:0;color:#23384A}
.argument{margin-top:2.4mm;padding:1.9mm 3mm;border-left:1.1mm solid #FCAF19;border-radius:0 2.4mm 2.4mm 0;background:#FDF8E6;color:#23384A;break-inside:avoid}
.argument h3{margin-top:0;color:#23384A}
.prescription{margin-top:2.2mm;font-size:8pt;color:#5B6770}
.prescription strong{color:#23384A}
.bas{padding-top:2.6mm;border-top:.3mm solid #E3E8EC}
.pistes{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:2.4mm}
.piste{display:flex;flex-direction:column;gap:.6mm;padding:1.8mm 2.4mm;border-radius:2.4mm;background:#F4F6F8;font-size:7.5pt;line-height:1.33}
.piste b{font:700 7.7pt/1.3 Poppins,sans-serif}
.piste span:not(.format){color:#5B6770}
.format{align-self:flex-start;padding:.2mm 1.8mm;border-radius:99px;background:#FBE8E9;color:#B52026;font:700 6pt/1.5 Poppins,sans-serif;letter-spacing:.06em;text-transform:uppercase}
.sources h2{font-size:8.4pt;margin-bottom:1mm}
.sources ul{columns:2;column-gap:7mm;font-size:6.9pt;line-height:1.35}
.sources li{padding-left:2.8mm}
.sources li::before{width:1mm;height:1mm;top:.6em;left:.4mm}
.sources li+li{margin-top:.5mm}
.dom{color:#7A8792}
footer{display:flex;justify-content:space-between;gap:6mm;margin-top:auto;padding:2.4mm 12mm 5.5mm;font:600 6.6pt/1.3 Poppins,sans-serif;color:#5B6770}
footer span:last-child{flex:none;white-space:nowrap;color:#B52026}
`;

const POLICES = polices();
const html = (liste = fiches) => `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>${liste.length === 1 ? echapper(typo(liste[0].titre)) + ' · Fiche de synthèse Préventica Lyon 2026' : 'Fiches de synthèse · Préventica Lyon 2026'}</title>
<style>${POLICES}${CSS}</style></head><body>${liste.map((f) => page(f, f.numero, f.total)).join('\n')}</body></html>`;

const pw = await import(pathToFileURL(module('playwright')).href);
const chromium = pw.chromium || pw.default.chromium;
// Sans ce réglage, Chromium sous Linux arrondit les chasses au pixel : lettres espacées et mots collés dans le PDF.
const nav = await chromium.launch({ args: ['--font-render-hinting=none'] });
const p = await nav.newPage({ viewport: { width: 794, height: 1123 } });
await p.emulateMedia({ media: 'print' });

// Mesure : hauteur nécessaire (bandeau + contenu + pied + 3 mm d'air) comparée aux 297 mm de la page.
await p.setContent(html(), { waitUntil: 'load' });
await p.evaluate(() => document.fonts.ready);
const mm = 96 / 25.4;
const mesures = await p.evaluate((mm) => [...document.querySelectorAll('.page')].map((el) => {
  const h = (sel) => el.querySelector(sel).getBoundingClientRect().height / mm;
  const col = el.querySelector('.colonnes');
  return { id: el.dataset.id, besoin: h('.bande') + h('.contenu') + h('footer') + 3, colonnes: h('.colonnes'),
    horsColonnes: col.scrollWidth > col.clientWidth + 1 };
}), mm);
let ok = true;
mesures.forEach((m) => {
  const reste = 297 - m.besoin, tient = reste >= 0 && !m.horsColonnes;
  ok = ok && tient;
  console.log(`${m.id} : ${tient ? 'TIENT' : 'DÉBORDE'} · marge ${reste.toFixed(1)} mm · colonnes ${m.colonnes.toFixed(0)} mm${m.horsColonnes ? ' · texte hors colonnes' : ''}`);
});
if (opt('--html')) writeFileSync(opt('--html'), html());
if (!args.includes('--mesure')) {
  const pdf = async (liste, chemin) => {
    await p.setContent(html(liste), { waitUntil: 'load' });
    await p.evaluate(() => document.fonts.ready);
    await p.pdf({ path: resolve(chemin), preferCSSPageSize: true, printBackground: true, tagged: true, outline: false });
    console.log('PDF : ' + resolve(chemin));
  };
  await pdf(fiches, sortie);
  if (opt('--dossier')) for (const f of fiches) await pdf([f], join(opt('--dossier'), f.fichier || f.id + '.pdf'));
}
await nav.close();
process.exit(ok ? 0 : 1);
