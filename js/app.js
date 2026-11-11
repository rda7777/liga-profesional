import { TEAMS, logo, teamName } from "./teams.js?v=4";
import { compactEvent } from "./compact.js?v=4";
import { confetti, fiestaSound } from "./fiesta.js?v=4";
import { buildFacts } from "./datos.js?v=4";
import { computeTables } from "./tables.js?v=4";

// ---------- Configuración ----------
const REPO_RAW = "https://raw.githubusercontent.com/rda7777/liga-profesional/main/data/";
const ESPN_SB = "https://site.api.espn.com/apis/site/v2/sports/soccer/arg.1/scoreboard";
const ESPN_ST = "https://site.api.espn.com/apis/v2/sports/soccer/arg.1/standings";
const SEASONTYPE = { A: 1, C: 6 };
const TZ = "America/Argentina/Buenos_Aires";
const LIVE_MS = 12000, IDLE_MS = 60000, STANDINGS_MS = 5 * 60000, FIXTURE_MS = 15 * 60000;

// ---------- Estado ----------
const S = {
  events: new Map(),
  standings: { A: null, C: null },
  news: null,
  ready: false,
  open: new Set(),
  flash: new Set(),
  sel: { torneo: null, round: null, tTabla: null, tPlay: null, newsClub: "", fact: 0, simT: null, simR: null, simTab: "promedios" },
};

const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
};
let favs = new Set(store.get("favs", []));
let alertMode = store.get("alertMode", "off"); // off | all | favs

// ---------- Utilidades ----------
const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const fmt = (opts) => new Intl.DateTimeFormat("es-AR", { timeZone: TZ, ...opts });
const fDay = fmt({ weekday: "long", day: "2-digit", month: "2-digit" });
const fHour = fmt({ hour: "2-digit", minute: "2-digit", hour12: false });
const fShort = fmt({ day: "2-digit", month: "2-digit" });
const dayKey = (iso) => fmt({ year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(iso));
const espnKey = (iso) => {
  const p = new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(iso));
  return p.replace(/-/g, "");
};
const img = (id, cls = "") => id ? `<img class="${cls}" src="${logo(id)}" alt="" loading="lazy" onerror="this.style.visibility='hidden'">` : `<img class="${cls}" alt="" style="visibility:hidden">`;
const ago = (iso) => {
  const m = Math.round((Date.now() - new Date(iso)) / 60000);
  if (m < 60) return `hace ${Math.max(m, 1)} min`;
  const h = Math.round(m / 60);
  return h < 24 ? `hace ${h} h` : `hace ${Math.round(h / 24)} d`;
};
const TORNEO = { A: "Apertura", C: "Clausura" };
const ROUND_NAME = { r16: "Octavos", qf: "Cuartos", sf: "Semifinales", f: "Final" };
const ROUNDS = ["r16", "qf", "sf", "f"];
const nameOf = (side) => teamName(side[0], side[4]);

async function getJSON(url, opts) {
  const r = await fetch(url, { cache: "no-store", ...opts });
  if (!r.ok) throw new Error(r.status + " " + url);
  return r.json();
}

// ---------- Carga de datos ----------
async function loadFixture() {
  let data = null;
  for (const base of ["data/", REPO_RAW]) {
    try { data = await getJSON(base + "partidos.json?t=" + Date.now()); break; } catch {}
  }
  if (!data) {
    // Respaldo: directo de ESPN, mes por mes
    const year = new Date().getFullYear();
    data = { events: [] };
    const months = Array.from({ length: 12 }, (_, i) => `${year}${String(i + 1).padStart(2, "0")}`);
    const res = await Promise.allSettled(months.map((m) => getJSON(`${ESPN_SB}?dates=${m}&limit=500`)));
    res.forEach((r) => r.status === "fulfilled" && r.value.events?.forEach((e) => data.events.push(compactEvent(e))));
  }
  for (const ev of data.events) {
    const cur = S.events.get(ev.id);
    // No pisar datos en vivo más nuevos con el fixture
    if (!cur || cur.st === "pre" || ev.st === "post") S.events.set(ev.id, ev);
  }
}

async function loadStandings() {
  await Promise.all(Object.entries(SEASONTYPE).map(async ([t, st]) => {
    try {
      const d = await getJSON(`${ESPN_ST}?seasontype=${st}`);
      const zones = {};
      for (const c of d.children || []) {
        const z = (c.name || "").slice(-1);
        zones[z] = (c.standings?.entries || []).map((e) => {
          const s = Object.fromEntries(e.stats.map((x) => [x.name, x.value]));
          return { id: String(e.team.id), rank: s.rank, pj: s.gamesPlayed, g: s.wins, e: s.ties, p: s.losses, gf: s.pointsFor, gc: s.pointsAgainst, pts: s.points };
        }).sort((a, b) => a.rank - b.rank);
      }
      if (Object.keys(zones).length) S.standings[t] = zones;
    } catch (e) { console.warn("standings", t, e); }
  }));
}

async function loadNews() {
  for (const base of ["data/", REPO_RAW]) {
    try { S.news = await getJSON(base + "noticias.json?t=" + Date.now()); return; } catch {}
  }
}

// ---------- Cálculos ----------
function zoneOf(id) {
  for (const t of ["C", "A"]) for (const [z, rows] of Object.entries(S.standings[t] || {})) if (rows.some((r) => r.id === id)) return z;
  return null;
}

function roundsInfo(t) {
  const reg = [...S.events.values()].filter((e) => e.t === t && e.r === "reg").sort((a, b) => a.d.localeCompare(b.d));
  const idx = {}, count = {};
  for (const e of reg) for (const id of [e.h[0], e.a[0]]) { count[id] = (count[id] || 0) + 1; }
  const seen = {};
  for (const e of reg) {
    const fh = (seen[e.h[0]] = (seen[e.h[0]] || 0) + 1);
    const fa = (seen[e.a[0]] = (seen[e.a[0]] || 0) + 1);
    idx[e.id] = Math.min(fh, fa);
  }
  return idx;
}

function annual() {
  const tot = {};
  for (const t of ["A", "C"]) for (const rows of Object.values(S.standings[t] || {})) for (const r of rows) {
    const x = (tot[r.id] ||= { id: r.id, pj: 0, g: 0, e: 0, p: 0, gf: 0, gc: 0, pts: 0 });
    for (const k of ["pj", "g", "e", "p", "gf", "gc", "pts"]) x[k] += r[k] || 0;
  }
  return Object.values(tot).sort((a, b) => b.pts - a.pts || (b.gf - b.gc) - (a.gf - a.gc) || b.gf - a.gf);
}

function promedios(an) {
  return an.map((r) => {
    const b = TEAMS[r.id]?.base || [0, 0];
    const pts = b[0] + r.pts, pj = b[1] + r.pj;
    return { id: r.id, base: b[0], y26: r.pts, pts, pj, prom: pj ? pts / pj : 0 };
  }).sort((a, b) => b.prom - a.prom || b.pts - a.pts);
}

function relegated() {
  const an = annual(), pr = promedios(an);
  if (an.length < 2) return { byProm: null, byAnual: null };
  const byProm = pr.at(-1).id;
  let byAnual = an.at(-1).id;
  if (byAnual === byProm) byAnual = an.at(-2).id;
  return { byProm, byAnual };
}

function liveEvents() { return [...S.events.values()].filter((e) => e.st === "in").sort((a, b) => a.d.localeCompare(b.d)); }
function liveTeam(id) { return liveEvents().find((e) => e.h[0] === id || e.a[0] === id); }

function currentTorneo() {
  const all = [...S.events.values()].filter((e) => e.t === "A" || e.t === "C");
  const live = all.find((e) => e.st === "in");
  if (live) return live.t;
  const next = all.filter((e) => e.st === "pre").sort((a, b) => a.d.localeCompare(b.d))[0];
  if (next) return next.t;
  return all.some((e) => e.t === "C") ? "C" : "A";
}

// ---------- Componentes ----------
function statusLabel(e) {
  if (e.sn === "STATUS_POSTPONED") return "Post.";
  if (e.sn === "STATUS_CANCELED" || e.sn === "STATUS_ABANDONED") return "Susp.";
  if (e.st === "in") return e.sn === "STATUS_HALFTIME" ? "ET" : (e.clk || "Vivo");
  if (e.st === "post") return e.sn === "STATUS_FINAL_PEN" ? "Final (pen.)" : e.sn === "STATUS_FINAL_AET" ? "Final (alarg.)" : "Final";
  return e.tbd ? "A conf." : fHour.format(new Date(e.d));
}

function matchRow(e, opts = {}) {
  const show = e.st !== "pre";
  const hw = e.st === "post" && e.h[3], aw = e.st === "post" && e.a[3];
  const pens = e.h[2] != null && e.a[2] != null ? `<small>(${e.h[2]}-${e.a[2]} pen)</small>` : "";
  const goals = (side) => e.g.filter((g) => g[0] === side[0]).map((g) => `⚽ ${esc(g[2])} ${esc(g[1])}${g[3] === "p" ? " (p)" : g[3] === "o" ? " (e/c)" : ""}`)
    .concat(e.rc.filter((r) => r[0] === side[0]).map((r) => `🟥 ${esc(r[2])} ${esc(r[1])}`));
  const gh = goals(e.h), ga = goals(e.a);
  const tag = opts.tag ? `<div class="zone-tag">${esc(opts.tag)}</div>` : "";
  return `<div class="match${S.open.has(e.id) ? " open" : ""}${S.flash.has(e.id) ? " flash" : ""}" data-id="${e.id}">
    <div class="mrow">
      <div class="mstat ${e.st}">${statusLabel(e)}${tag}</div>
      <a class="team h${hw ? " win" : ""}" href="#/club/${e.h[0]}" onclick="event.stopPropagation()"><span>${esc(nameOf(e.h))}</span>${img(e.h[0])}</a>
      <div class="score ${e.st}">${show ? `${e.h[1] ?? 0} - ${e.a[1] ?? 0}` : "vs"}${pens}</div>
      <a class="team${aw ? " win" : ""}" href="#/club/${e.a[0]}" onclick="event.stopPropagation()">${img(e.a[0])}<span>${esc(nameOf(e.a))}</span></a>
    </div>
    <div class="mdet"><div class="hcol">${gh.join("<br>") || ""}</div><div>${ga.join("<br>") || ""}</div>
      <div class="venue">${e.v ? "🏟 " + esc(e.v) + " · " : ""}${fDay.format(new Date(e.d))}${e.tbd ? "" : " " + fHour.format(new Date(e.d))}</div></div>
  </div>`;
}

function matchesByDay(list, tagFn) {
  let html = "", last = "";
  for (const e of list) {
    const k = dayKey(e.d);
    if (k !== last) { html += `<div class="day">${e.tbd ? "<span class=\"nc\">Fecha y hora a confirmar · </span>" : ""}${fDay.format(new Date(e.d))}</div>`; last = k; }
    html += matchRow(e, { tag: tagFn?.(e) });
  }
  return html || `<p class="empty">Sin partidos.</p>`;
}

function teamCell(id) {
  const lv = liveTeam(id);
  return `<td class="tm"><a href="#/club/${id}">${img(id, "tlogo")}<span>${esc(teamName(id))}</span>${lv ? `<span class="livebadge">${lv.h[1] ?? 0}-${lv.a[1] ?? 0}</span>` : ""}</a></td>`;
}

function zoneTable(rows, title, sub) {
  if (!rows) return "";
  const body = rows.map((r, i) => `<tr class="${i < 8 ? "q" : ""}${favs.has(r.id) ? " me" : ""}">
    <td class="pos">${i + 1}</td>${teamCell(r.id)}<td class="pts">${r.pts}</td><td>${r.pj}</td>
    <td class="hide-s">${r.g}</td><td class="hide-s">${r.e}</td><td class="hide-s">${r.p}</td>
    <td class="hide-s">${r.gf}</td><td class="hide-s">${r.gc}</td><td>${r.gf - r.gc > 0 ? "+" : ""}${r.gf - r.gc}</td></tr>`).join("");
  return `<div class="card"><h2>${title}<small>${sub || ""}</small></h2><table class="t"><thead><tr><th>#</th><th style="text-align:left">Equipo</th><th>Pts</th><th>PJ</th><th class="hide-s">G</th><th class="hide-s">E</th><th class="hide-s">P</th><th class="hide-s">GF</th><th class="hide-s">GC</th><th>DG</th></tr></thead><tbody>${body}</tbody></table></div>`;
}

// ---------- Vistas ----------
function viewPartidos() {
  const t = S.sel.torneo || currentTorneo();
  const evs = [...S.events.values()].filter((e) => e.t === t);
  const idx = roundsInfo(t);
  const roundOf = (e) => (e.r === "reg" ? "F" + idx[e.id] : e.r);
  const keys = [...new Set(evs.map(roundOf))].filter((k) => k !== "Fundefined")
    .sort((a, b) => (a[0] === "F" ? +a.slice(1) : 100 + ROUNDS.indexOf(a)) - (b[0] === "F" ? +b.slice(1) : 100 + ROUNDS.indexOf(b)));
  let round = S.sel.round && keys.includes(S.sel.round) ? S.sel.round : null;
  if (!round) {
    const sorted = [...evs].sort((a, b) => a.d.localeCompare(b.d));
    const pick = sorted.find((e) => e.st === "in") || sorted.find((e) => e.st === "pre" && e.sn !== "STATUS_POSTPONED") || sorted.at(-1);
    round = pick ? roundOf(pick) : keys[0];
  }
  const liveR = new Set(evs.filter((e) => e.st === "in").map(roundOf));
  const label = (k) => (k[0] === "F" ? "Fecha " + k.slice(1) : ROUND_NAME[k]);
  const list = evs.filter((e) => roundOf(e) === round).sort((a, b) => a.d.localeCompare(b.d) || nameOf(a.h).localeCompare(nameOf(b.h)));
  const zTag = (e) => {
    if (e.r !== "reg") return "";
    const zh = zoneOf(e.h[0]), za = zoneOf(e.a[0]);
    return zh && zh === za ? "Zona " + zh : "Interzonal";
  };
  return `${factCard()}
    <div class="seg">${["A", "C"].map((k) => `<button data-torneo="${k}" class="${k === t ? "act" : ""}">${TORNEO[k]}</button>`).join("")}</div>
    <div class="chips">${keys.map((k) => `<button class="chip${k === round ? " act" : ""}${liveR.has(k) ? " live" : ""}" data-round="${k}">${label(k)}</button>`).join("")}</div>
    <div class="card"><h2>${TORNEO[t]} · ${label(round) || ""}<small>Tocá un partido para ver goles</small></h2>${matchesByDay(list, zTag)}</div>`;
}

function viewPosiciones() {
  const t = S.sel.tTabla || (S.standings.C ? "C" : "A");
  const z = S.standings[t];
  return `<div class="seg">${["A", "C"].map((k) => `<button data-ttabla="${k}" class="${k === t ? "act" : ""}">${TORNEO[k]}</button>`).join("")}</div>
    ${z ? `<div class="grid2">${zoneTable(z.A, `Zona A · ${TORNEO[t]}`)}${zoneTable(z.B, `Zona B · ${TORNEO[t]}`)}</div>` : `<p class="loading">Cargando posiciones…</p>`}
    <div class="legend"><span><i style="background:var(--accent)"></i>Clasifica a octavos (8 mejores de cada zona)</span></div>`;
}

function viewAnual() {
  const an = annual();
  if (!an.length) return `<p class="loading">Cargando…</p>`;
  const { byAnual } = relegated();
  const body = an.map((r, i) => `<tr class="${i < 3 ? "lib" : ""}${r.id === byAnual ? " down" : ""}${favs.has(r.id) ? " me" : ""}">
    <td class="pos">${i + 1}</td>${teamCell(r.id)}<td class="pts">${r.pts}</td><td>${r.pj}</td>
    <td class="hide-s">${r.g}</td><td class="hide-s">${r.e}</td><td class="hide-s">${r.p}</td><td class="hide-s">${r.gf}</td><td class="hide-s">${r.gc}</td><td>${r.gf - r.gc > 0 ? "+" : ""}${r.gf - r.gc}</td></tr>`).join("");
  return `<div class="card"><h2>Tabla anual 2026<small>Apertura + Clausura (fase regular)</small></h2>
    <table class="t"><thead><tr><th>#</th><th style="text-align:left">Equipo</th><th>Pts</th><th>PJ</th><th class="hide-s">G</th><th class="hide-s">E</th><th class="hide-s">P</th><th class="hide-s">GF</th><th class="hide-s">GC</th><th>DG</th></tr></thead><tbody>${body}</tbody></table>
    <div class="legend"><span><i style="background:var(--lib)"></i>Copa Libertadores (3 mejores; si ya clasificaron por título, el cupo pasa al siguiente)</span><span><i style="background:var(--down)"></i>Desciende por tabla anual</span></div></div>`;
}

function viewPromedios() {
  const pr = promedios(annual());
  if (!pr.length) return `<p class="loading">Cargando…</p>`;
  const { byProm } = relegated();
  const body = pr.map((r, i) => `<tr class="${r.id === byProm ? "down" : ""}${favs.has(r.id) ? " me" : ""}">
    <td class="pos">${i + 1}</td>${teamCell(r.id)}<td class="pts">${r.prom.toFixed(3).replace(".", ",")}</td><td>${r.pts}</td><td>${r.pj}</td>
    <td class="hide-s">${r.base}</td><td class="hide-s">${r.y26}</td></tr>`).join("");
  return `<div class="card"><h2>Promedios<small>2024 + 2025 + 2026</small></h2>
    <table class="t"><thead><tr><th>#</th><th style="text-align:left">Equipo</th><th>Prom.</th><th>Pts</th><th>PJ</th><th class="hide-s">24-25</th><th class="hide-s">2026</th></tr></thead><tbody>${body}</tbody></table>
    <div class="legend"><span><i style="background:var(--down)"></i>Desciende por promedios. Si el mismo club es último en ambas tablas, el segundo descenso es para el anteúltimo de la anual.</span></div></div>`;
}

function bracketMatch(e) {
  if (!e) return `<div class="bm"><div class="bt">A definir</div><div class="bt">A definir</div></div>`;
  const row = (s, o) => `<div class="bt${e.st === "post" && s[3] ? " w" : ""}">${img(s[0])}<span>${esc(nameOf(s))}</span><b>${e.st === "pre" ? "" : (s[1] ?? 0)}${s[2] != null ? ` (${s[2]})` : ""}</b></div>`;
  return `<a class="bm ${e.st}" href="#/" data-goto="${e.id}">${row(e.h)}${row(e.a)}<div class="bi">${statusLabel(e)}${e.st === "pre" && !e.tbd ? " · " + fShort.format(new Date(e.d)) : ""}</div></a>`;
}

function viewPlayoffs() {
  const t = S.sel.tPlay || (["C", "A"].find((k) => [...S.events.values()].some((e) => e.t === k && e.r !== "reg")) || "C");
  const evs = [...S.events.values()].filter((e) => e.t === t && e.r !== "reg").sort((a, b) => a.d.localeCompare(b.d) || a.id.localeCompare(b.id));
  const need = { r16: 8, qf: 4, sf: 2, f: 1 };
  const cols = ROUNDS.map((r) => {
    const list = evs.filter((e) => e.r === r);
    const items = Array.from({ length: need[r] }, (_, i) => bracketMatch(list[i]));
    return `<div class="bcol"><h3>${ROUND_NAME[r]}</h3>${items.join("")}</div>`;
  }).join("");
  const fin = evs.find((e) => e.r === "f" && e.st === "post");
  const champ = fin ? (fin.h[3] ? fin.h : fin.a) : null;
  return `<div class="seg">${["A", "C"].map((k) => `<button data-tplay="${k}" class="${k === t ? "act" : ""}">${TORNEO[k]}</button>`).join("")}</div>
    <div class="card"><h2>Playoffs · ${TORNEO[t]}<small>Partido único</small></h2>
    ${champ ? `<div class="champ">${img(champ[0])}🏆 <b>${esc(nameOf(champ))}</b> campeón del ${TORNEO[t]}</div>` : ""}
    ${evs.length ? `<div class="bracket">${cols}</div>` : `<p class="empty">Los playoffs todavía no empezaron.</p>`}</div>`;
}

function viewClubes() {
  const ids = Object.keys(TEAMS).sort((a, b) => TEAMS[a].short.localeCompare(TEAMS[b].short));
  return `<div class="card"><h2>Clubes<small>⭐ = favoritos</small></h2><div class="clubs">${ids.map((id) =>
    `<a href="#/club/${id}">${img(id)}${esc(TEAMS[id].short)}${favs.has(id) ? ' <span class="fav">★</span>' : ""}</a>`).join("")}</div></div>`;
}

function newsList(items, withClub) {
  if (!items?.length) return `<p class="empty">Sin noticias por ahora.</p>`;
  return `<div class="news">${items.map((n) => `<a href="${esc(n.link)}" target="_blank" rel="noopener">
    <div class="nt">${esc(n.title)}</div><div class="nm">${withClub && n.club ? img(n.club) : ""}${esc(n.source || "")} · ${ago(n.date)}</div></a>`).join("")}</div>`;
}

function viewClub(id) {
  const T = TEAMS[id];
  if (!T) return `<p class="empty">Club no encontrado.</p>`;
  const an = annual(), pr = promedios(an), rel = relegated();
  const z = zoneOf(id);
  const tz = S.standings.C ? "C" : "A";
  const zpos = (S.standings[tz]?.[z] || []).findIndex((r) => r.id === id) + 1;
  const apos = an.findIndex((r) => r.id === id) + 1;
  const ppos = pr.findIndex((r) => r.id === id) + 1;
  const prom = pr.find((r) => r.id === id);
  const evs = [...S.events.values()].filter((e) => e.h[0] === id || e.a[0] === id).sort((a, b) => a.d.localeCompare(b.d));
  const played = evs.filter((e) => e.st === "post");
  const form = played.slice(-5).map((e) => {
    const me = e.h[0] === id ? e.h : e.a, op = e.h[0] === id ? e.a : e.h;
    const r = me[1] > op[1] ? "G" : me[1] < op[1] ? "P" : me[2] != null && op[2] != null ? (me[2] > op[2] ? "G" : "P") : "E";
    return `<i class="${r}">${r}</i>`;
  }).join("");
  const upcoming = evs.filter((e) => e.st !== "post");
  const recent = played.slice(-8).reverse();
  return `<div class="card"><div class="chead">${img(id)}<div><h1>${esc(T.name)}</h1><div style="color:var(--muted);font-size:13px">${z ? "Zona " + z : ""}</div></div>
      <button class="star${favs.has(id) ? " on" : ""}" data-fav="${id}">${favs.has(id) ? "★ Favorito" : "☆ Seguir"}</button></div>
    <div class="stats">
      <div class="stat"><b>${zpos || "-"}°</b><span>Zona ${z || ""} · ${TORNEO[tz]}</span></div>
      <div class="stat${rel.byAnual === id ? " bad" : ""}"><b>${apos || "-"}°</b><span>Tabla anual · ${an[apos - 1]?.pts ?? "-"} pts</span></div>
      <div class="stat${rel.byProm === id ? " bad" : ""}"><b>${ppos || "-"}°</b><span>Promedios · ${prom ? prom.prom.toFixed(3).replace(".", ",") : "-"}</span></div>
      <div class="stat"><div class="form">${form || "-"}</div><span>Últimos 5</span></div>
    </div></div>
    <div class="grid2">
      <div>
        ${upcoming.length ? `<div class="card"><h2>Próximos / en juego</h2>${matchesByDay(upcoming, (e) => e.r === "reg" ? TORNEO[e.t] : TORNEO[e.t] + " · " + ROUND_NAME[e.r])}</div>` : ""}
        <div class="card"><h2>Últimos resultados</h2>${matchesByDay(recent, (e) => e.r === "reg" ? TORNEO[e.t] : TORNEO[e.t] + " · " + ROUND_NAME[e.r])}</div>
      </div>
      <div class="card"><h2>Noticias de ${esc(T.short)}<small>${S.news ? "act. " + ago(S.news.updated) : ""}</small></h2>${S.news ? newsList(S.news.clubs?.[id]) : `<p class="loading">Cargando…</p>`}</div>
    </div>`;
}

function viewNoticias() {
  if (!S.news) return `<p class="loading">Cargando noticias…</p>`;
  const club = S.sel.newsClub;
  let items;
  if (club === "favs") items = [...favs].flatMap((id) => (S.news.clubs?.[id] || []).map((n) => ({ ...n, club: id })));
  else if (club) items = (S.news.clubs?.[club] || []).map((n) => ({ ...n, club }));
  else items = S.news.general || [];
  items = [...items].sort((a, b) => b.date.localeCompare(a.date));
  const opts = Object.keys(TEAMS).sort((a, b) => TEAMS[a].short.localeCompare(TEAMS[b].short))
    .map((id) => `<option value="${id}"${id === club ? " selected" : ""}>${esc(TEAMS[id].short)}</option>`).join("");
  return `<select class="sel" id="newsSel"><option value="">Liga Profesional (general)</option>${favs.size ? `<option value="favs"${club === "favs" ? " selected" : ""}>⭐ Mis favoritos</option>` : ""}${opts}</select>
    <div class="card"><h2>Noticias<small>act. ${ago(S.news.updated)}</small></h2>${newsList(items, !!club)}</div>`;
}

// ---------- Render ----------
function route() {
  const h = location.hash.replace(/^#\/?/, "");
  const [r, arg] = h.split("/");
  return { r: r || "partidos", arg };
}

// ---------- Dato del día ----------
let factsCache = { n: -1, list: [] };
function facts() {
  if (factsCache.n !== S.events.size || factsCache.stamp !== lastFixture) factsCache = { n: S.events.size, stamp: lastFixture, list: buildFacts(S.events.values()) };
  return factsCache.list;
}
function factCard() {
  const F = facts();
  if (!F.length) return "";
  const day = Math.floor((Date.now() - 3 * 3600000) / 86400000);
  const f = F[(day + S.sel.fact) % F.length];
  return `<div class="card fact"><div class="fi">${f.i}</div><div class="ft"><small>Dato del día</small>${esc(f.t)}</div>
    ${f.club ? `<a href="#/club/${f.club}" class="fl">${img(f.club)}</a>` : ""}<button class="fn" data-nextfact>Otro dato ›</button></div>`;
}

// ---------- Pantalla grande ----------
function tvCard(e) {
  const last = e.g.at(-1);
  return `<div class="tvm ${e.st}">
    <div class="tvs">${statusLabel(e)}</div>
    <div class="tvt th">${img(e.h[0])}<span>${esc(nameOf(e.h))}</span></div>
    <div class="tvsc">${e.st === "pre" ? (e.tbd ? "–" : fHour.format(new Date(e.d))) : `${e.h[1] ?? 0}<i>-</i>${e.a[1] ?? 0}`}${e.h[2] != null ? `<small>(${e.h[2]}-${e.a[2]} pen)</small>` : ""}</div>
    <div class="tvt ta">${img(e.a[0])}<span>${esc(nameOf(e.a))}</span></div>
    <div class="tvg">${e.st !== "pre" && last ? `⚽ ${esc(last[2])} ${esc(last[1])}` : e.st === "pre" ? fDay.format(new Date(e.d)) : "&nbsp;"}</div>
  </div>`;
}
function viewTV() {
  const all = [...S.events.values()].sort((a, b) => a.d.localeCompare(b.d));
  const live = all.filter((e) => e.st === "in");
  const next = all.filter((e) => e.st === "pre" && e.sn !== "STATUS_POSTPONED").slice(0, 8);
  const last = all.filter((e) => e.st === "post").slice(-8).reverse();
  const sec = (t, list) => list.length ? `<h2 class="tvh">${t}</h2><div class="tvgrid">${list.map(tvCard).join("")}</div>` : "";
  return `<div class="tvbar"><b>⚽ Liga Profesional</b><span id="tvclock">${fHour.format(new Date())}</span>
      <span class="tvbtns"><button data-fs>⛶ Pantalla completa</button><a href="#/">✕ Salir</a></span></div>
    ${live.length ? sec("🔴 En vivo", live) : `<p class="tvnone">No hay partidos en juego ahora. Cuando empiecen aparecen acá solos.</p>`}
    ${sec("Próximos", next)}${live.length ? "" : sec("Últimos resultados", last)}`;
}
let wakeLock = null;
async function keepAwake(on) {
  try {
    if (on && !wakeLock && "wakeLock" in navigator) { wakeLock = await navigator.wakeLock.request("screen"); wakeLock.addEventListener("release", () => (wakeLock = null)); }
    if (!on && wakeLock) { await wakeLock.release(); wakeLock = null; }
  } catch {}
}
setInterval(() => { const c = $("#tvclock"); if (c) c.textContent = fHour.format(new Date()); }, 15000);

function tvGoal(e, side, who) {
  const col = TEAMS[side[0]]?.col || ["#0b3d2e", "#fff"];
  const o = document.createElement("div");
  o.className = "tvgoal";
  o.style.background = `radial-gradient(circle at 50% 40%, ${col[0]}, #000 85%)`;
  o.innerHTML = `${img(side[0])}<div class="gg">¡GOOOL!</div><div class="gt">${esc(nameOf(side))}</div><div class="gs">${esc(nameOf(e.h))} ${e.h[1]} - ${e.a[1]} ${esc(nameOf(e.a))}</div><div class="gw">${esc(who)}</div>`;
  document.body.appendChild(o);
  confetti(col, 5000);
  setTimeout(() => o.remove(), 9000);
  o.addEventListener("click", () => o.remove());
}

// ---------- Simulador ¿Y si…? ----------
let sim = store.get("sim", {});
const simTables = (ov) => computeTables(S.events.values(), ov, (id) => zoneOf(id));
function delta(realList, id, pos) {
  const was = realList.findIndex((r) => r.id === id) + 1;
  const d = was - pos;
  return d > 0 ? `<span class="up">▲${d}</span>` : d < 0 ? `<span class="dn">▼${-d}</span>` : "";
}
function simResults() {
  const real = simTables({}), mine = simTables(sim);
  const tab = S.sel.simTab, t = S.sel.simT || "C";
  let head, rows;
  if (tab === "promedios") {
    head = `<th>#</th><th style="text-align:left">Equipo</th><th>Prom.</th><th>Pts</th><th>PJ</th>`;
    rows = mine.promedios.map((r, i) => `<tr class="${r.id === mine.rel.byProm ? "down" : ""}"><td class="pos">${i + 1}</td>${teamCell(r.id)}<td class="pts">${r.prom.toFixed(3).replace(".", ",")}</td><td>${r.pts}</td><td>${r.pj}</td><td class="dl">${delta(real.promedios, r.id, i + 1)}</td></tr>`);
  } else {
    const list = tab === "anual" ? mine.anual : mine.zones[t][tab];
    const realList = tab === "anual" ? real.anual : real.zones[t][tab];
    head = `<th>#</th><th style="text-align:left">Equipo</th><th>Pts</th><th>PJ</th><th>DG</th>`;
    rows = list.map((r, i) => {
      const cls = tab === "anual" ? (i < 3 ? "lib" : "") + (r.id === mine.rel.byAnual ? " down" : "") : i < 8 ? "q" : "";
      return `<tr class="${cls}"><td class="pos">${i + 1}</td>${teamCell(r.id)}<td class="pts">${r.pts}</td><td>${r.pj}</td><td>${r.gf - r.gc > 0 ? "+" : ""}${r.gf - r.gc}</td><td class="dl">${delta(realList, r.id, i + 1)}</td></tr>`;
    });
  }
  const changed = Object.keys(sim).length;
  const relTxt = `Descenderían: <b>${esc(teamName(mine.rel.byProm))}</b> (promedios) y <b>${esc(teamName(mine.rel.byAnual))}</b> (anual)` +
    (mine.rel.byProm !== real.rel.byProm || mine.rel.byAnual !== real.rel.byAnual ? " ⚠️ cambia respecto de la realidad" : "");
  return `<div class="seg">${[["promedios", "Promedios"], ["anual", "Anual"], ["A", "Zona A"], ["B", "Zona B"]].map(([k, l]) => `<button data-simtab="${k}" class="${k === tab ? "act" : ""}">${l}</button>`).join("")}</div>
    <div class="card"><h2>Así quedaría${tab === "A" || tab === "B" ? " · " + TORNEO[t] : ""}<small>${changed ? plural(changed) : "sin cambios todavía"}</small></h2>
    <div class="legend">${relTxt}</div>
    <table class="t"><thead><tr>${head}<th></th></tr></thead><tbody>${rows.join("")}</tbody></table></div>`;
}
const plural = (n) => `${n} resultado${n === 1 ? "" : "s"} cambiado${n === 1 ? "" : "s"}`;
function viewSimulador() {
  const t = S.sel.simT || "C";
  const evs = [...S.events.values()].filter((e) => e.t === t && e.r === "reg");
  const idx = roundsInfo(t);
  const max = Math.max(0, ...Object.values(idx));
  let r = S.sel.simR;
  if (!r) {
    const pend = evs.filter((e) => e.st !== "post").sort((a, b) => a.d.localeCompare(b.d))[0];
    r = pend ? idx[pend.id] : max;
  }
  const list = evs.filter((e) => idx[e.id] === r).sort((a, b) => a.d.localeCompare(b.d));
  const row = (e) => {
    const ov = sim[e.id];
    const real = e.st === "post" ? [e.h[1], e.a[1]] : null;
    const v = ov || real || ["", ""];
    return `<div class="simrow${ov ? " chg" : ""}">
      <a class="team h" href="#/club/${e.h[0]}"><span>${esc(nameOf(e.h))}</span>${img(e.h[0])}</a>
      <input type="number" min="0" max="20" inputmode="numeric" data-sim="${e.id}" data-side="0" value="${v[0]}">
      <input type="number" min="0" max="20" inputmode="numeric" data-sim="${e.id}" data-side="1" value="${v[1]}">
      <a class="team" href="#/club/${e.a[0]}">${img(e.a[0])}<span>${esc(nameOf(e.a))}</span></a>
      <small class="real">${real ? `Real: ${real[0]}-${real[1]}` : "Sin jugar"}${ov ? ` · <button data-simreset="${e.id}">deshacer</button>` : ""}</small>
    </div>`;
  };
  return `<div class="card simintro"><b>¿Y si…?</b> Cambiá cualquier resultado de la fase regular y mirá cómo quedarían las zonas, la tabla anual y los promedios. Las flechas comparan con la realidad. Lo que cambies queda guardado en este navegador.
      ${Object.keys(sim).length ? `<button class="chip" data-simclear>Volver todo a la realidad</button>` : ""}</div>
    <div class="grid2">
      <div>
        <div class="seg">${["A", "C"].map((k) => `<button data-simt="${k}" class="${k === t ? "act" : ""}">${TORNEO[k]}</button>`).join("")}</div>
        <div class="chips">${Array.from({ length: max }, (_, i) => i + 1).map((n) => `<button class="chip${n === r ? " act" : ""}${evs.some((e) => idx[e.id] === n && sim[e.id]) ? " live" : ""}" data-simr="${n}">Fecha ${n}</button>`).join("")}</div>
        <div class="card"><h2>${TORNEO[t]} · Fecha ${r}<small>Escribí los goles</small></h2>${list.map(row).join("") || `<p class="empty">Sin partidos.</p>`}</div>
      </div>
      <div id="simres">${simResults()}</div>
    </div>`;
}

function render(keepScroll = true) {
  const y = window.scrollY;
  const { r, arg } = route();
  document.querySelectorAll("#tabs a").forEach((a) => a.classList.toggle("act", a.dataset.r === r || (r === "club" && a.dataset.r === "clubes")));
  const v = $("#view");
  if (!S.ready) { v.innerHTML = `<p class="loading">Cargando…</p>`; return; }
  const views = { partidos: viewPartidos, posiciones: viewPosiciones, anual: viewAnual, promedios: viewPromedios, playoffs: viewPlayoffs, clubes: viewClubes, noticias: viewNoticias, tv: viewTV, simulador: viewSimulador };
  document.body.classList.toggle("tv", r === "tv");
  keepAwake(r === "tv");
  if (r === "simulador" && document.activeElement?.dataset?.sim) return; // no pisar lo que se está escribiendo
  v.innerHTML = r === "club" ? viewClub(arg) : (views[r] || viewPartidos)();
  renderLiveStrip();
  v.querySelector(".chip.act")?.scrollIntoView({ block: "nearest", inline: "center" });
  if (keepScroll) window.scrollTo(0, y);
}

function renderLiveStrip() {
  const live = liveEvents(), el = $("#live-strip");
  el.hidden = !live.length;
  el.innerHTML = live.map((e) => `<a href="#/" data-goto="${e.id}"><span class="min">${statusLabel(e)}</span>${img(e.h[0])}${esc(nameOf(e.h))} <b>${e.h[1] ?? 0}-${e.a[1] ?? 0}</b> ${esc(nameOf(e.a))}${img(e.a[0])}</a>`).join("");
}

document.addEventListener("click", (ev) => {
  const t = ev.target.closest("[data-torneo],[data-round],[data-ttabla],[data-tplay],[data-fav],[data-goto],[data-nextfact],[data-fs],[data-simt],[data-simr],[data-simtab],[data-simreset],[data-simclear],.match");
  if (!t) return;
  if (t.dataset.nextfact !== undefined) { S.sel.fact++; render(); }
  else if (t.dataset.fs !== undefined) { const d = document.documentElement; document.fullscreenElement ? document.exitFullscreen() : d.requestFullscreen?.().catch(() => {}); ensureAudio(); }
  else if (t.dataset.simt) { S.sel.simT = t.dataset.simt; S.sel.simR = null; render(false); }
  else if (t.dataset.simr) { S.sel.simR = +t.dataset.simr; render(); }
  else if (t.dataset.simtab) { S.sel.simTab = t.dataset.simtab; $("#simres").innerHTML = simResults(); }
  else if (t.dataset.simreset) { delete sim[t.dataset.simreset]; store.set("sim", sim); render(); }
  else if (t.dataset.simclear !== undefined) { sim = {}; store.set("sim", sim); render(); }
  else if (t.dataset.torneo) { S.sel.torneo = t.dataset.torneo; S.sel.round = null; render(false); }
  else if (t.dataset.round) { S.sel.round = t.dataset.round; render(); }
  else if (t.dataset.ttabla) { S.sel.tTabla = t.dataset.ttabla; render(); }
  else if (t.dataset.tplay) { S.sel.tPlay = t.dataset.tplay; render(); }
  else if (t.dataset.fav) {
    const id = t.dataset.fav;
    favs.has(id) ? favs.delete(id) : favs.add(id);
    store.set("favs", [...favs]); render();
  } else if (t.dataset.goto) {
    ev.preventDefault();
    const e = S.events.get(t.dataset.goto);
    if (e) {
      S.sel.torneo = e.t;
      const idx = roundsInfo(e.t);
      S.sel.round = e.r === "reg" ? "F" + idx[e.id] : e.r;
      S.open.add(e.id);
      location.hash = "#/";
      render(false);
      document.querySelector(`.match[data-id="${e.id}"]`)?.scrollIntoView({ block: "center" });
    }
  } else if (t.classList.contains("match")) {
    const id = t.dataset.id;
    S.open.has(id) ? S.open.delete(id) : S.open.add(id);
    t.classList.toggle("open");
  }
});
document.addEventListener("input", (ev) => {
  const el = ev.target;
  if (!el.dataset?.sim) return;
  const id = el.dataset.sim, e = S.events.get(id);
  const ins = document.querySelectorAll(`input[data-sim="${id}"]`);
  const h = ins[0].value, a = ins[1].value;
  if (h === "" || a === "") delete sim[id];
  else {
    const v = [Math.max(0, Math.min(20, +h)), Math.max(0, Math.min(20, +a))];
    if (e?.st === "post" && v[0] === e.h[1] && v[1] === e.a[1]) delete sim[id]; else sim[id] = v;
  }
  store.set("sim", sim);
  el.closest(".simrow")?.classList.toggle("chg", !!sim[id]);
  $("#simres").innerHTML = simResults();
});
document.addEventListener("change", (ev) => {
  if (ev.target.id === "newsSel") { S.sel.newsClub = ev.target.value; render(false); }
});
window.addEventListener("hashchange", () => render(false));

// ---------- Campanita de gol ----------
let audio = null;
function ensureAudio() {
  try { audio ||= new (window.AudioContext || window.webkitAudioContext)(); if (audio.state === "suspended") audio.resume(); } catch {}
}
function bell() {
  if (!audio) return;
  const now = audio.currentTime;
  [0, 0.45].forEach((off) => {
    [[880, 0.5], [1320, 0.25], [1760, 0.18], [2640, 0.08]].forEach(([f, v]) => {
      const o = audio.createOscillator(), g = audio.createGain();
      o.type = "sine"; o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, now + off);
      g.gain.exponentialRampToValueAtTime(v, now + off + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, now + off + 1.6);
      o.connect(g).connect(audio.destination);
      o.start(now + off); o.stop(now + off + 1.7);
    });
  });
}
function paintBell() {
  const b = $("#bell");
  b.textContent = alertMode === "all" ? "🔔 Goles: todos" : alertMode === "favs" ? "⭐ Goles: favoritos" : "🔕 Goles";
  b.classList.toggle("on", alertMode !== "off");
}
$("#bell").addEventListener("click", () => {
  alertMode = alertMode === "off" ? "all" : alertMode === "all" ? (favs.size ? "favs" : "off") : "off";
  store.set("alertMode", alertMode);
  paintBell();
  if (alertMode !== "off") {
    ensureAudio(); bell();
    if ("Notification" in window && Notification.permission === "default") Notification.requestPermission().catch(() => {});
  }
});
// Los navegadores sólo permiten sonido después de un toque del usuario
["click", "touchstart", "keydown"].forEach((t) => document.addEventListener(t, () => alertMode !== "off" && ensureAudio(), { passive: true }));

function goalAlert(e, side) {
  const other = side === e.h ? e.a : e.h;
  const wants = alertMode === "all" || (alertMode === "favs" && (favs.has(e.h[0]) || favs.has(e.a[0])));
  const last = [...e.g].reverse().find((g) => g[0] === side[0]);
  const txt = `${nameOf(e.h)} ${e.h[1]} - ${e.a[1]} ${nameOf(e.a)}`;
  const who = last ? `${last[2]} ${last[1]}${last[3] === "o" ? " (en contra)" : last[3] === "p" ? " (penal)" : ""}` : (e.clk || "");
  S.flash.add(e.id); setTimeout(() => S.flash.delete(e.id), 2500);
  const isTV = route().r === "tv";
  const fav = favs.has(side[0]);
  if (isTV) tvGoal(e, side, who);
  else if (fav) confetti(TEAMS[side[0]]?.col);
  if (!wants && !isTV) return;
  if (wants) fav ? fiestaSound(audio) : bell();
  if (isTV) return;
  navigator.vibrate?.([200, 100, 200]);
  const t = document.createElement("div");
  t.className = "toast";
  t.dataset.goto = e.id;
  t.innerHTML = `${img(side[0])}<div><b>¡GOL de ${esc(nameOf(side))}!</b><div>${esc(txt)}</div><small>${esc(who)}</small></div>`;
  $("#toasts").prepend(t);
  setTimeout(() => t.remove(), 12000);
  if (document.hidden && "Notification" in window && Notification.permission === "granted") {
    try { new Notification(`⚽ ¡GOL de ${nameOf(side)}!`, { body: `${txt}\n${who}`, icon: logo(side[0]), tag: "gol-" + e.id }); } catch {}
  }
}

$("#probar").addEventListener("click", () => {
  ensureAudio();
  const done = [...S.events.values()].filter((x) => x.st === "post" && x.g.length);
  const e = done.filter((x) => x.g.some((g) => favs.has(g[0]))).at(-1) || done.at(-1);
  if (!e) return bell();
  const prev = alertMode; if (alertMode === "off") alertMode = "all";
  const g = [...e.g].reverse().find((x) => favs.has(x[0])) || e.g.at(-1);
  goalAlert(e, g[0] === e.a[0] ? e.a : e.h);
  alertMode = prev;
});

// ---------- En vivo ----------
let pollTimer = null, lastStandings = 0, lastFixture = 0;
function activeKeys() {
  const now = Date.now(), keys = new Set();
  for (const e of S.events.values()) {
    const t = new Date(e.d).getTime();
    if (e.st === "in" || (e.st === "pre" && !e.tbd && t - now < 15 * 60000 && now - t < 4 * 3600000)) keys.add(espnKey(e.d));
  }
  return keys;
}

async function poll() {
  clearTimeout(pollTimer);
  const keys = activeKeys();
  const urls = [ESPN_SB, ...[...keys].map((k) => `${ESPN_SB}?dates=${k}`)];
  let changed = false, finished = false;
  const res = await Promise.allSettled(urls.map((u) => getJSON(u)));
  for (const r of res) {
    if (r.status !== "fulfilled") continue;
    for (const raw of r.value.events || []) {
      const e = compactEvent(raw);
      const prev = S.events.get(e.id);
      if (prev && JSON.stringify(prev) === JSON.stringify(e)) continue;
      S.events.set(e.id, e);
      changed = true;
      if (prev && prev.st === "in" && e.st === "post") finished = true;
      if (prev && prev.st !== "pre" && prev.h[1] != null) {
        if ((e.h[1] ?? 0) > (prev.h[1] ?? 0)) goalAlert(e, e.h);
        if ((e.a[1] ?? 0) > (prev.a[1] ?? 0)) goalAlert(e, e.a);
      } else if (prev && prev.st === "pre" && e.st === "in") {
        if ((e.h[1] ?? 0) > 0) goalAlert(e, e.h);
        if ((e.a[1] ?? 0) > 0) goalAlert(e, e.a);
      }
    }
  }
  const now = Date.now();
  const isLive = liveEvents().length > 0 || activeKeys().size > 0;
  if (finished || now - lastStandings > (isLive ? 2 * 60000 : STANDINGS_MS)) { lastStandings = now; await loadStandings(); changed = true; }
  if (now - lastFixture > FIXTURE_MS) { lastFixture = now; await loadFixture().catch(() => {}); changed = true; }
  if (changed) { render(); stamp(); }
  pollTimer = setTimeout(poll, isLive ? LIVE_MS : IDLE_MS);
}

function stamp() { $("#updated").textContent = "Actualizado " + fHour.format(new Date()) + (liveEvents().length ? " · en vivo cada 12 s" : ""); }

document.addEventListener("visibilitychange", () => { if (!document.hidden) poll(); });

// ---------- Inicio ----------
(async function init() {
  paintBell();
  await Promise.all([loadFixture().catch((e) => console.warn(e)), loadStandings()]);
  lastFixture = lastStandings = Date.now();
  S.ready = true;
  render(false); stamp();
  loadNews().then(() => render());
  setInterval(() => loadNews().then(() => { const r = route().r; if (r === "noticias" || r === "club") render(); }), 15 * 60000);
  poll();
})();
