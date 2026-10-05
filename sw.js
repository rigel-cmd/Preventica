/* Préventica Lyon : garde l'app utilisable sans réseau (page, images, polices).
   Changer le numéro de CACHE force le renouvellement complet du cache. */
var CACHE = 'vpo-preventica-v4';
var POLICES = 'https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;600;700&family=Poppins:wght@600;700;800&display=swap';
var IMAGES = ['assets/carte-recto.jpg', 'assets/carte-verso.jpg'];

function adresse(rel) { return new URL(rel, self.registration.scope).href; }
function racine() { return new URL(self.registration.scope).pathname; }
function delai(ms) { return new Promise(function (ok) { setTimeout(ok, ms); }); }

/* Polices : seulement les jeux latin et latin-ext, sans jamais bloquer l'installation plus de 5 s */
function copierPolices(c) {
  return fetch(POLICES, { mode: 'cors' }).then(function (r) {
    if (!r.ok) return;
    return r.clone().text().then(function (css) {
      var blocs = css.match(/\/\* latin(?:-ext)? \*\/[^}]*\}/g) || [css];
      var fichiers = blocs.join('\n').match(/https:\/\/fonts\.gstatic\.com\/[^)'"\s]+/g) || [];
      return Promise.all([c.put(POLICES, r)].concat(fichiers.map(function (f) {
        return fetch(f, { mode: 'cors' }).then(function (x) { if (x.ok) return c.put(f, x); }).catch(function () {});
      })));
    });
  }).catch(function () {});
}

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) {
    /* La page est obligatoire : sans elle, pas d'installation (et pas de faux « prêt ») */
    var page = fetch(adresse('index.html'), { cache: 'reload' }).then(function (r) {
      if (!r.ok) throw new Error('index.html ' + r.status);
      return c.put(adresse('index.html'), r);
    });
    var images = IMAGES.map(function (f) {
      return fetch(adresse(f), { cache: 'reload' }).then(function (r) { if (r.ok) return c.put(adresse(f), r); }).catch(function () {});
    });
    return Promise.all([page].concat(images, [Promise.race([copierPolices(c), delai(5000)])]));
  }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (cles) {
    return Promise.all(cles.filter(function (k) { return k.indexOf('vpo-preventica-') === 0 && k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var u = new URL(req.url);

  /* La page : réseau d'abord (revalidé, pour recevoir les corrections), copie en cache après 3,5 s,
     sans réseau ou si le serveur répond une erreur */
  if (req.mode === 'navigate' && u.origin === self.location.origin && (u.pathname === racine() || u.pathname === racine() + 'index.html')) {
    var reseau = fetch(u.href, { cache: 'no-cache', credentials: 'same-origin' });
    e.waitUntil(reseau.then(function (r) {
      if (r.ok) { var copie = r.clone(); return caches.open(CACHE).then(function (c) { return c.put(adresse('index.html'), copie); }); }
    }).catch(function () {}));
    e.respondWith(new Promise(function (ok) {
      var fini = false;
      function rendre(r) { if (!fini && r) { fini = true; ok(r); } }
      function copie() { return caches.match(adresse('index.html')); }
      var minuteur = setTimeout(function () { copie().then(rendre); }, 3500);
      reseau.then(function (r) {
        clearTimeout(minuteur);
        if (r.ok && !r.redirected) rendre(r);
        else copie().then(function (enCache) { rendre(enCache || r); });
      }, function () {
        clearTimeout(minuteur);
        copie().then(function (r) { rendre(r || Response.error()); });
      });
    }));
    return;
  }

  /* Images de l'app et polices Google : cache d'abord, mise à jour en arrière-plan (jamais de réponse opaque) */
  var local = u.origin === self.location.origin && u.pathname.indexOf(racine() + 'assets/') === 0 && req.mode !== 'navigate';
  var police = u.hostname === 'fonts.googleapis.com' || u.hostname === 'fonts.gstatic.com';
  if (!local && !police) return;
  var maj = fetch(req).then(function (r) {
    if (r.ok) { var copie = r.clone(); caches.open(CACHE).then(function (c) { return c.put(req, copie); }).catch(function () {}); }
    return r;
  });
  e.waitUntil(maj.then(function () {}, function () {}));
  e.respondWith(caches.match(req, { ignoreVary: true }).then(function (enCache) { return enCache || maj; }));
});
