// Relaciona los resúmenes del canal oficial de la Liga Profesional en YouTube con cada partido.
// Títulos del canal: "BOCA 1 - 0 DEFENSA Y JUSTICIA | Resumen del partido | #TorneoMercadoLibre Clausura 2026 🏆"
// (con penales: "RIVER 2 (4) - (3) 2 SAN LORENZO | ...").

const norm = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase().replace(/[^A-Z0-9 ]/g, " ").replace(/\s+/g, " ").trim();

export function clubFromTitle(raw) {
  const n = " " + norm(raw) + " ";
  const has = (w) => n.includes(" " + w + " ") || n.includes(" " + w);
  if (has("RIO CUARTO") || / RC /.test(n)) return "19685";
  if (has("GIMNASIA")) return /( M | MZA| MENDOZA)/.test(n) ? "11972" : "9";
  if (has("ESTUDIANTES")) return "8";
  if (has("IND") && has("RIV")) return "9744";
  if (has("INDEPENDIENTE")) return "11";
  if (has("CENTRAL CORDOBA")) return "11989";
  if (has("ROSARIO CENTRAL")) return "17";
  if (has("TUCUMAN")) return "9785";
  const simple = { RIESTRA: "17702", BARRACAS: "10060", DEFENSA: "8950", ALDOSIVI: "9739", ARGENTINOS: "3", BANFIELD: "235", BELGRANO: "4",
    BOCA: "5", HURACAN: "10", INSTITUTO: "2975", LANUS: "12", NEWELL: "14", PLATENSE: "7764", RACING: "15", RIVER: "16",
    "SAN LORENZO": "18", SARMIENTO: "10158", TALLERES: "19", TIGRE: "7767", UNION: "20", VELEZ: "21" };
  for (const [k, id] of Object.entries(simple)) if (has(k)) return id;
  return null;
}

export function parseTitle(title) {
  if (!/Resumen del partido/i.test(title) || /Proyecci|Reserva|Supercopa|Femenin/i.test(title)) return null;
  const m = title.match(/^\s*(.+?)\s+(\d+)\s*(?:\((\d+)\))?\s*[-–]\s*(?:\((\d+)\))?\s*(\d+)\s+(.+?)\s*[|I]\s*Resumen/i);
  if (!m) return null;
  const h = clubFromTitle(m[1]), a = clubFromTitle(m[6]);
  if (!h || !a) return null;
  const year = (title.match(/20\d\d/) || [])[0];
  return { h, a, hs: +m[2], as: +m[5], t: /Clausura/i.test(title) ? "C" : "A", year: year ? +year : null };
}

// videos: [[videoId, title], ...]; events: partidos compactos. Devuelve { eventId: videoId }.
export function matchVideos(videos, events, year) {
  const out = {};
  const evs = [...events].filter((e) => e.st === "post" && (e.t === "A" || e.t === "C"));
  for (const [vid, title] of videos) {
    const p = parseTitle(title);
    if (!p || (p.year && p.year !== year)) continue;
    const cands = evs.filter((e) => e.h[0] === p.h && e.a[0] === p.a && e.t === p.t && !out[e.id]);
    const best = cands.find((e) => e.h[1] === p.hs && e.a[1] === p.as);
    if (best) out[best.id] = vid;
  }
  return out;
}
