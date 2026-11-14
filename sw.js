// Service worker: permite instalar la app y abrirla sin conexión con los últimos datos guardados.
const VERSION = "v8";
const SHELL = `shell-${VERSION}`, DATA = "data", LOGOS = "logos";
const FILES = [
  "./", "./index.html", "./manifest.webmanifest",
  `./css/style.css?${VERSION.replace("v", "v=")}`,
  ...["app", "teams", "compact", "fiesta", "datos", "tables"].map((f) => `./js/${f}.js?${VERSION.replace("v", "v=")}`),
  "./icons/icon-192.png", "./icons/icon-512.png", "./icons/favicon-32.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(SHELL).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k.startsWith("shell-") && k !== SHELL).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

const networkFirst = async (req, cacheName) => {
  const c = await caches.open(cacheName);
  const u = new URL(req.url);
  const key = req.mode === "navigate" ? "./index.html" : u.origin + u.pathname; // una sola copia por archivo
  try {
    const r = await fetch(req);
    if (r.ok) c.put(key, r.clone());
    return r;
  } catch {
    const hit = await c.match(key);
    if (hit) return hit;
    throw new Error("sin conexión");
  }
};

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // Escudos de ESPN: se guardan para no bajarlos cada vez
  if (url.hostname.endsWith("espncdn.com")) {
    e.respondWith(caches.open(LOGOS).then(async (c) => (await c.match(req)) || fetch(req).then((r) => { if (r.ok || r.type === "opaque") c.put(req, r.clone()); return r; })));
    return;
  }
  // Datos en vivo de ESPN y otros sitios: siempre de la red
  if (url.origin !== location.origin && !url.hostname.endsWith("githubusercontent.com")) return;

  // Fixture, noticias y videos: red primero, si no hay conexión lo último guardado
  if (url.pathname.includes("/data/")) { e.respondWith(networkFirst(req, DATA)); return; }

  // Página: red primero (para tomar siempre la última versión)
  if (req.mode === "navigate") { e.respondWith(networkFirst(req, SHELL).catch(() => caches.match("./index.html"))); return; }

  // Archivos del sitio: caché primero
  e.respondWith(caches.match(req).then((hit) => hit || fetch(req)));
});
