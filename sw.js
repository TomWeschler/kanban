// Service worker — rend l'app installable et consultable hors ligne.
//
// Règle absolue : on n'intercepte JAMAIS les appels authentifiés à Google
// (Sheets, identité). Ce sont des données vivantes et personnelles ; les servir
// depuis un cache afficherait un état périmé, ou pire, après déconnexion.
const VERSION = 'v1.8.0';
const SHELL   = 'kanban-shell-' + VERSION;
const ASSETS  = 'kanban-assets-' + VERSION;

const SHELL_FILES = [
  './', './index.html', './manifest.webmanifest',
  './icon-192.png', './icon-512.png', './icon-maskable.png'
];

// Tiers immuables et versionnés : sûrs à mettre en cache, indispensables au
// rendu hors ligne (polices, Chart.js utilisé par Cryptobot).
const CACHEABLE_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com', 'cdnjs.cloudflare.com'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(SHELL)
      // addAll échoue en bloc si un seul fichier manque : on tolère les absents
      .then(c => Promise.all(SHELL_FILES.map(f => c.add(f).catch(() => {}))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== SHELL && k !== ASSETS).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;

  let url;
  try { url = new URL(req.url); } catch (_) { return; }

  if (url.origin !== self.location.origin) {
    if (!CACHEABLE_HOSTS.includes(url.hostname)) return;   // Google API / identité : jamais touché
    e.respondWith(
      caches.match(req).then(hit => hit || fetch(req).then(r => {
        if (r && (r.ok || r.type === 'opaque')) {
          const copy = r.clone();
          caches.open(ASSETS).then(c => c.put(req, copy));
        }
        return r;
      }).catch(() => hit))
    );
    return;
  }

  // Page : réseau d'abord, pour qu'une nouvelle version arrive dès qu'on est en
  // ligne. Le cache ne sert que de filet hors connexion.
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).then(r => {
        const copy = r.clone();
        caches.open(SHELL).then(c => c.put('./index.html', copy));
        return r;
      }).catch(() => caches.match('./index.html').then(hit => hit || caches.match('./')))
    );
    return;
  }

  // Reste du même domaine (fonds d'écran, gifs, icônes) : cache d'abord.
  e.respondWith(
    caches.match(req).then(hit => hit || fetch(req).then(r => {
      if (r && r.ok) {
        const copy = r.clone();
        caches.open(ASSETS).then(c => c.put(req, copy));
      }
      return r;
    }))
  );
});
