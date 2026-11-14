// Cloudflare Worker "liga-noticias": noticias frescas de Google News para cada club.
// GET /?q=<búsqueda>&kw=Unión|Tatengue&neg=Unión Europea&others=Boca|River|...&max=8&days=3
// Devuelve JSON con las notas cuyo título está centrado en el club. Guarda en memoria 10 minutos.

const TTL = 10 * 60 * 1000;
const memo = new Map();

const nrm = (s) => " " + s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9' ]/g, " ").replace(/\s+/g, " ") + " ";
const firstPos = (T, words) => Math.min(Infinity, ...words.map((w) => { const i = T.indexOf(" " + nrm(w).trim() + " "); return i < 0 ? Infinity : i; }));
const decode = (s) => s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
  .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&apos;/g, "'")
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n)).replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16))).replace(/<[^>]+>/g, "").trim();

function relevant(title, kw, neg, others) {
  if (!kw.length) return true;
  const T = nrm(title);
  if (neg.some((n) => T.includes(" " + nrm(n).trim() + " "))) return false;
  const ours = firstPos(T, kw);
  if (ours === Infinity) return false;
  const mine = kw.map((k) => nrm(k).trim());
  const oth = others.filter((n) => !mine.some((m) => m.includes(nrm(n).trim()) || nrm(n).trim().includes(m)));
  return ours <= firstPos(T, oth);
}

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";
function parseItems(xml, src) {
  const items = [];
  for (const m of xml.matchAll(/<item>([\s\S]*?)<\/item>/g)) {
    const get = (tag) => decode((m[1].match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`)) || [])[1] || "");
    let source = src === "bing" ? get("News:Source") : get("source");
    let title = get("title"), link = get("link");
    if (source && title.endsWith(" - " + source)) title = title.slice(0, -(source.length + 3));
    if (src === "bing") { try { link = new URL(link).searchParams.get("url") || link; } catch {} }
    const d = new Date(get("pubDate"));
    items.push({ title, link, date: isNaN(d) ? null : d.toISOString(), source });
  }
  return items;
}

// Primero Google News; si no responde, Bing Noticias.
async function news(q, days) {
  let src = "google", r;
  try {
    r = await fetch(`https://news.google.com/rss/search?q=${encodeURIComponent(q + ` when:${days}d`)}&hl=es-419&gl=AR&ceid=AR:es-419`, { headers: { "user-agent": UA, "accept-language": "es-AR,es;q=0.9" } });
  } catch {}
  if (!r || !r.ok) {
    src = "bing";
    r = await fetch(`https://www.bing.com/news/search?q=${encodeURIComponent(q)}&format=rss&setlang=es-AR&cc=AR&qft=interval%3d%227%22`, { headers: { "user-agent": UA, "accept-language": "es-AR,es;q=0.9" } });
    if (!r.ok) throw new Error("Bing " + r.status);
  }
  const min = Date.now() - days * 86400000;
  const items = parseItems(await r.text(), src).filter((x) => x.date && Date.parse(x.date) >= min);
  return items.sort((a, b) => b.date.localeCompare(a.date));
}

const cors = { "access-control-allow-origin": "*", "content-type": "application/json; charset=utf-8", "cache-control": "public, max-age=300" };

export default {
  async fetch(req) {
    const u = new URL(req.url);
    const q = (u.searchParams.get("q") || "").slice(0, 200);
    if (!q) return new Response(JSON.stringify({ error: "falta q" }), { status: 400, headers: cors });
    const list = (k) => (u.searchParams.get(k) || "").split("|").map((x) => x.trim()).filter(Boolean).slice(0, 120);
    const kw = list("kw"), neg = list("neg"), others = list("others");
    const max = Math.min(20, +u.searchParams.get("max") || 8);
    const days = Math.min(7, +u.searchParams.get("days") || 3);
    const key = u.search;
    const hit = memo.get(key);
    if (hit && Date.now() - hit.t < TTL) return new Response(hit.body, { headers: cors });
    try {
      const seen = new Set();
      const items = (await news(q, days)).filter((n) => relevant(n.title, kw, neg, others) && !seen.has(n.title) && seen.add(n.title)).slice(0, max);
      const body = JSON.stringify({ updated: new Date().toISOString(), items });
      memo.set(key, { t: Date.now(), body });
      if (memo.size > 300) memo.delete(memo.keys().next().value);
      return new Response(body, { headers: cors });
    } catch (e) {
      if (hit) return new Response(hit.body, { headers: cors });
      return new Response(JSON.stringify({ error: e.message }), { status: 502, headers: cors });
    }
  },
};
