// =====================================================================
// Ayudante de la app instalada (service worker)
// ---------------------------------------------------------------------
// Hace que la web se pueda instalar como app (PWA) y que abra rápido:
// - Las páginas se piden siempre al servidor (así cada versión nueva llega sola); si no hay
//   internet, se muestra un aviso de "sin conexión" (los datos están en el servidor).
// - Los archivos de la app (con huella en el nombre, no cambian nunca) se guardan la primera vez.
// - Lo demás (Supabase, cotización, etc.) no se toca: va siempre directo a internet.
// =====================================================================

const CACHE = 'locatia-v1';

const OFFLINE_HTML = `<!doctype html><html lang="es"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1"><title>Locatia</title>
<style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;
font-family:-apple-system,Roboto,Arial,sans-serif;background:#0A4FA8;color:#fff;text-align:center;padding:24px}
h1{font-size:22px;margin:0 0 8px}p{margin:0 0 20px;opacity:.85}
button{font:inherit;font-weight:700;border:0;border-radius:12px;padding:12px 20px;background:#fff;color:#0A4FA8}</style>
</head><body><div><h1>Sin conexión</h1><p>Locatia necesita internet para mostrar tus datos.</p>
<button onclick="location.reload()">Reintentar</button></div></body></html>`;

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Páginas: siempre de internet; sin conexión, el aviso.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => new Response(OFFLINE_HTML, { headers: { 'Content-Type': 'text/html; charset=utf-8' } })),
    );
    return;
  }

  // Archivos de la app con huella en el nombre: se guardan la primera vez.
  if (url.pathname.startsWith('/_expo/static/') || url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.match(request).then(
        (saved) =>
          saved ||
          fetch(request).then((response) => {
            if (response.ok) {
              const copy = response.clone();
              caches.open(CACHE).then((cache) => cache.put(request, copy));
            }
            return response;
          }),
      ),
    );
  }
});
