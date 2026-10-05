/* Préventica Lyon : garde l'app utilisable sans réseau (page, images, polices).
   Changer le numéro de CACHE force le renouvellement complet du cache. */
var CACHE = 'vpo-preventica-v3';
var POLICES = 'https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;600;700&family=Poppins:wght@600;700;800&display=swap';
var FICHIERS = ['index.html', 'assets/carte-recto.jpg', 'assets/carte-verso.jpg'];

function adresse(rel) { return new URL(rel, self.registration.scope).href; }
function racine() { return new URL(self.registration.scope).pathname; }

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) {
    var locaux = FICHIERS.map(function (f) {
      return fetch(adresse(f), { cache: 'reload' }).then(function (r) { if (r.ok) return c.put(adresse(f), r); }).catch(function () {});
    });
    var polices = fetch(POLICES, { mode: 'cors' }).then(function (r) {
      if (!r.ok) return;
      return r.clone().text().then(function (css) {
        var fichiers = css.match(/https:\/\/fonts\.gstatic\.com\/[^)'"\s]+/g) || [];
        return Promise.all([c.put(POLICES, r)].concat(fichiers.map(function (f) {
          return fetch(f, { mode: 'cors' }).then(function (x) { if (x.ok) return c.put(f, x); }).catch(function () {});
        })));
      });
    }).catch(function () {});
    return Promise.all(locaux.concat([polices]));
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

  /* La page : réseau d'abord (pour recevoir les corrections), copie en cache après 3,5 s ou sans réseau */
  if (req.mode === 'navigate' && u.origin === self.location.origin && (u.pathname === racine() || u.pathname === racine() + 'index.html')) {
    e.respondWith(new Promise(function (ok) {
      var fini = false;
      function rendre(r) { if (!fini && r) { fini = true; ok(r); } }
      var minuteur = setTimeout(function () { caches.match(adresse('index.html')).then(rendre); }, 3500);
      fetch(req).then(function (r) {
        clearTimeout(minuteur);
        if (r.ok) { var copie = r.clone(); caches.open(CACHE).then(function (c) { c.put(adresse('index.html'), copie); }); }
        rendre(r);
      }, function () {
        clearTimeout(minuteur);
        caches.match(adresse('index.html')).then(function (r) { rendre(r || Response.error()); });
      });
    }));
    return;
  }

  /* Images de l'app et polices Google : cache d'abord, mise à jour en arrière-plan */
  var local = u.origin === self.location.origin && u.pathname.indexOf(racine() + 'assets/') === 0;
  var police = u.hostname === 'fonts.googleapis.com' || u.hostname === 'fonts.gstatic.com';
  if (!local && !police) return;
  e.respondWith(caches.match(req, { ignoreVary: true }).then(function (enCache) {
    var reseau = fetch(req).then(function (r) {
      if (r.ok || r.type === 'opaque') { var copie = r.clone(); caches.open(CACHE).then(function (c) { c.put(req, copie); }); }
      return r;
    });
    if (enCache) { reseau.catch(function () {}); return enCache; }
    return reseau;
  }));
});
