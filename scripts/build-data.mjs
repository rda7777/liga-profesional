// Genera data/partidos.json (fixture completo del año) y data/noticias.json.
// Lo corre GitHub Actions cada 30 minutos.
import { writeFile, mkdir, readFile } from "node:fs/promises";
import { compactEvent } from "../js/compact.js";
import { TEAMS } from "../js/teams.js";
import { matchVideos } from "../js/videos.js";

const ESPN = "https://site.api.espn.com/apis/site/v2/sports/soccer/arg.1/scoreboard";
const year = new Date().toLocaleString("en-US", { timeZone: "America/Argentina/Buenos_Aires", year: "numeric" });

async function getJSON(url) {
  const r = await fetch(url, { headers: { "user-agent": "Mozilla/5.0 liga-profesional" } });
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return r.json();
}

async function partidos(base = ESPN, lg = "lp") {
  const events = new Map();
  // Por mes: respuestas más chicas y sin tope de cantidad.
  for (let m = 1; m <= 12; m++) {
    const key = `${year}${String(m).padStart(2, "0")}`;
    try {
      const d = await getJSON(`${base}?dates=${key}&limit=500`);
      for (const e of d.events || []) events.set(String(e.id), compactEvent(e, lg));
    } catch (err) { console.error("partidos", key, err.message); }
  }
  const list = [...events.values()].sort((a, b) => a.d.localeCompare(b.d));
  if (list.length < 10) throw new Error("Muy pocos partidos, no sobrescribo");
  return { year: Number(year), updated: new Date().toISOString(), events: list };
}

function decode(s) {
  return s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&apos;/g, "'").trim();
}

// ---------- Filtro de noticias por club ----------
const nrm = (s) => " " + s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9' ]/g, " ").replace(/\s+/g, " ") + " ";
const firstPos = (T, words) => Math.min(...words.map((w) => { const i = T.indexOf(" " + nrm(w).trim() + " "); return i < 0 ? Infinity : i; }));
let OTHER = {}; // id -> nombre principal de cada club, para detectar notas sobre otro equipo
// Se queda con la nota sólo si el título nombra al club y no está centrada en otro club.
function relevant(title, id, kw, neg) {
  const T = nrm(title);
  if (neg.some((n) => T.includes(" " + nrm(n).trim() + " "))) return false;
  const ours = firstPos(T, kw);
  if (ours === Infinity) return false;
  const mine = kw.map((k) => nrm(k).trim());
  const others = Object.entries(OTHER).filter(([oid, n]) => oid !== id && !mine.some((m) => m.includes(nrm(n).trim()) || nrm(n).trim().includes(m))).map(([, n]) => n);
  return ours <= firstPos(T, others);
}

async function rss(q, max = 8, days = 7) {
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(q + ` when:${days}d`)}&hl=es-419&gl=AR&ceid=AR:es-419`;
  const r = await fetch(url, { headers: { "user-agent": "Mozilla/5.0 liga-profesional" } });
  if (!r.ok) throw new Error(`${r.status}`);
  const xml = await r.text();
  const items = [];
  for (const m of xml.matchAll(/<item>([\s\S]*?)<\/item>/g)) {
    const get = (tag) => decode((m[1].match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`)) || [])[1] || "");
    const source = get("source");
    let title = get("title");
    if (source && title.endsWith(" - " + source)) title = title.slice(0, -(source.length + 3));
    items.push({ title, link: get("link"), date: new Date(get("pubDate")).toISOString(), source });
  }
  items.sort((a, b) => b.date.localeCompare(a.date));
  return items.slice(0, max);
}
async function clubNews(id, q, kw, neg, max = 8) {
  const items = await rss(q, 60, 4);
  const seen = new Set();
  return items.filter((n) => relevant(n.title, id, kw, neg) && !seen.has(n.title) && seen.add(n.title)).slice(0, max);
}

// Clubes de la Primera Nacional (nombres desde la tabla de ESPN)
async function clubesNacional() {
  const d = await getJSON("https://site.api.espn.com/apis/v2/sports/soccer/arg.2/standings");
  const out = {};
  for (const c of d.children || []) for (const e of c.standings?.entries || []) out[String(e.team.id)] = e.team.displayName;
  return out;
}

async function noticias(prev, pn = {}) {
  const out = { updated: new Date().toISOString(), general: [], clubs: {} };
  try { out.general = await rss('"Liga Profesional" fútbol argentino', 20); }
  catch (e) { out.general = prev?.general || []; console.error("noticias general", e.message); }
  OTHER = Object.fromEntries([...Object.entries(TEAMS).map(([id, t]) => [id, t.kw[0]]),
    ...Object.entries(pn).map(([id, name]) => [id, name.replace(/\s*\(.*?\)\s*/g, " ").trim()])]);
  for (const [id, t] of Object.entries(TEAMS)) {
    try { out.clubs[id] = await clubNews(id, t.q, t.kw, t.neg); }
    catch (e) { out.clubs[id] = prev?.clubs?.[id] || []; console.error("noticias", t.short, e.message); }
    await new Promise((r) => setTimeout(r, 400));
  }
  try { out.nacional = await rss('"Primera Nacional" fútbol', 20); }
  catch (e) { out.nacional = prev?.nacional || []; }
  for (const [id, name] of Object.entries(pn)) {
    // "Colón (Santa Fe)" -> "Colón" "Santa Fe" fútbol argentino (evita homónimos de otros países)
    const m = name.match(/^(.*?)\s*\((.*?)\)\s*$/);
    const main = (m ? m[1] : name).trim();
    const q = m ? `"${main}" "${m[2].trim()}" fútbol` : `"${main}" fútbol argentino`;
    try { out.clubs[id] = await clubNews(id, q, [main], [], 6); }
    catch (e) { out.clubs[id] = prev?.clubs?.[id] || []; }
    await new Promise((r) => setTimeout(r, 400));
  }
  return out;
}

// ---------- Resúmenes en YouTube (canal oficial @LigaProfesional) ----------
const YT_HEADERS = { "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36", "accept-language": "es-AR,es;q=0.9", cookie: "SOCS=CAI; CONSENT=YES+1" };
// Recorre el JSON de YouTube y toma cada video como un bloque completo (id + título del mismo video).
function walkVideos(o, into) {
  if (!o || typeof o !== "object") return;
  const l = o.lockupViewModel;
  if (l?.contentId && l.metadata?.lockupMetadataViewModel?.title?.content) into.push([l.contentId, l.metadata.lockupMetadataViewModel.title.content]);
  const p = o.playlistVideoRenderer;
  const pt = p?.title?.runs?.[0]?.text || p?.title?.simpleText;
  if (p?.videoId && pt) into.push([p.videoId, pt]);
  for (const k in o) walkVideos(o[k], into);
}
async function youtube(events, prev) {
  const known = new Set(Object.entries(prev || {}).filter(([k]) => k !== "_v").map(([, v]) => v));
  const ch = await (await fetch("https://www.youtube.com/@LigaProfesional", { headers: YT_HEADERS })).text();
  const id = (ch.match(/"externalId":"(UC[\w-]{22})"/) || ch.match(/"channelId":"(UC[\w-]{22})"/) || [])[1];
  if (!id) throw new Error("No encontré el canal");
  const ver = (ch.match(/"INNERTUBE_CLIENT_VERSION":"([^"]+)"/) || [])[1] || "2.20250101.00.00";
  const page = await (await fetch(`https://www.youtube.com/playlist?list=UU${id.slice(2)}`, { headers: YT_HEADERS })).text();
  const vids = [];
  const init = JSON.parse(page.match(/var ytInitialData = (\{.*?\});<\/script>/s)[1]);
  walkVideos(init, vids);
  let tok = (JSON.stringify(init).match(/"continuationCommand":\{"token":"([^"]+)"/) || [])[1];
  // Los videos vienen del más nuevo al más viejo: corto cuando llego a videos ya conocidos o al año anterior.
  for (let i = 0; tok && i < 30; i++) {
    const recent = vids.slice(-60);
    if (known.size && recent.some(([v]) => known.has(v))) break;
    if (recent.length && recent.every(([, t]) => !t.includes(String(year)))) break;
    const r = await fetch("https://www.youtube.com/youtubei/v1/browse?prettyPrint=false", {
      method: "POST", headers: { ...YT_HEADERS, "content-type": "application/json" },
      body: JSON.stringify({ context: { client: { clientName: "WEB", clientVersion: ver, hl: "es", gl: "AR" } }, continuation: tok }),
    });
    const t = await r.text();
    walkVideos(JSON.parse(t), vids);
    tok = (t.match(/"continuationCommand":\{"token":"([^"]+)"/) || [])[1];
  }
  return { ...(prev || {}), ...matchVideos(vids, events, Number(year)), _v: 2 };
}

await mkdir("data", { recursive: true });
const p = await partidos();
await writeFile("data/partidos.json", JSON.stringify(p));
console.log("partidos:", p.events.length);

let prevV = null;
try { const raw = JSON.parse(await readFile("data/videos.json", "utf8")); if (raw._v === 2) prevV = raw; } catch {}
try {
  const v = await youtube(p.events, prevV);
  await writeFile("data/videos.json", JSON.stringify(v));
  console.log("videos:", Object.keys(v).length);
} catch (e) { console.error("videos", e.message); }

// Primera Nacional
let pnClubs = {};
try {
  const pn = await partidos("https://site.api.espn.com/apis/site/v2/sports/soccer/arg.2/scoreboard", "pn");
  await writeFile("data/nacional.json", JSON.stringify(pn));
  console.log("nacional:", pn.events.length);
  pnClubs = await clubesNacional();
} catch (e) { console.error("nacional", e.message); }

let prev = null;
try { prev = JSON.parse(await readFile("data/noticias.json", "utf8")); } catch {}
const n = await noticias(prev, pnClubs);
await writeFile("data/noticias.json", JSON.stringify(n));
console.log("noticias generales:", n.general.length);
