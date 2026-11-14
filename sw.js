// Service worker minimal : l'appli s'ouvre même sans réseau (les recettes
// déjà chargées sont gardées sur le téléphone par app.js).
// Réseau d'abord, copie locale en secours : les mises à jour arrivent tout de suite.
const CACHE = 'recettes-1.21'; // même numéro que APP_VERSION dans app.js
const FICHIERS = ['./', 'index.html', 'style.css', 'app.js', 'manifest.webmanifest', 'icon-192.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FICHIERS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((k) => Promise.all(k.filter((x) => x !== CACHE).map((x) => caches.delete(x)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return; // Apps Script, polices… : pas de cache
  e.respondWith(
    // « no-cache » : toujours vérifier auprès de GitHub s'il y a une nouvelle version
    fetch(e.request.mode === 'navigate' ? e.request.url : e.request, { cache: 'no-cache' }).then((r) => {
      const copie = r.clone();
      caches.open(CACHE).then((c) => c.put(e.request, copie));
      return r;
    }).catch(() => caches.match(e.request, { ignoreSearch: true }).then((r) => r || caches.match('index.html')))
  );
});
