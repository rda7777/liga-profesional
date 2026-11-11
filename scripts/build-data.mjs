// Genera data/partidos.json (fixture completo del año) y data/noticias.json.
// Lo corre GitHub Actions cada 30 minutos.
import { writeFile, mkdir, readFile } from "node:fs/promises";
import { compactEvent } from "../js/compact.js";
import { TEAMS } from "../js/teams.js";

const ESPN = "https://site.api.espn.com/apis/site/v2/sports/soccer/arg.1/scoreboard";
const year = new Date().toLocaleString("en-US", { timeZone: "America/Argentina/Buenos_Aires", year: "numeric" });

async function getJSON(url) {
  const r = await fetch(url, { headers: { "user-agent": "Mozilla/5.0 liga-profesional" } });
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return r.json();
}

async function partidos() {
  const events = new Map();
  // Por mes: respuestas más chicas y sin tope de cantidad.
  for (let m = 1; m <= 12; m++) {
    const key = `${year}${String(m).padStart(2, "0")}`;
    try {
      const d = await getJSON(`${ESPN}?dates=${key}&limit=500`);
      for (const e of d.events || []) events.set(String(e.id), compactEvent(e));
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

async function rss(q, max = 8) {
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(q + " when:7d")}&hl=es-419&gl=AR&ceid=AR:es-419`;
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

async function noticias(prev) {
  const out = { updated: new Date().toISOString(), general: [], clubs: {} };
  try { out.general = await rss('"Liga Profesional" fútbol argentino', 20); }
  catch (e) { out.general = prev?.general || []; console.error("noticias general", e.message); }
  for (const [id, t] of Object.entries(TEAMS)) {
    try { out.clubs[id] = await rss(t.q); }
    catch (e) { out.clubs[id] = prev?.clubs?.[id] || []; console.error("noticias", t.short, e.message); }
    await new Promise((r) => setTimeout(r, 400));
  }
  return out;
}

await mkdir("data", { recursive: true });
const p = await partidos();
await writeFile("data/partidos.json", JSON.stringify(p));
console.log("partidos:", p.events.length);

let prev = null;
try { prev = JSON.parse(await readFile("data/noticias.json", "utf8")); } catch {}
const n = await noticias(prev);
await writeFile("data/noticias.json", JSON.stringify(n));
console.log("noticias generales:", n.general.length);
