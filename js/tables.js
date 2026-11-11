// Cálculo de tablas a partir de los partidos (lo usa el simulador "¿Y si…?").
import { TEAMS } from "./teams.js?v=5";

const blank = (id) => ({ id, pj: 0, g: 0, e: 0, p: 0, gf: 0, gc: 0, pts: 0 });
const add = (row, gf, gc) => {
  row.pj++; row.gf += gf; row.gc += gc;
  if (gf > gc) { row.g++; row.pts += 3; } else if (gf === gc) { row.e++; row.pts += 1; } else row.p++;
};
export const sortRows = (rows) => rows.sort((a, b) => b.pts - a.pts || (b.gf - b.gc) - (a.gf - a.gc) || b.gf - a.gf);

// events: iterable de partidos compactos; overrides: { id: [golesLocal, golesVisitante] }
// zoneOf: id de club -> "A" | "B"
export function computeTables(events, overrides, zoneOf) {
  const per = { A: {}, C: {} };
  for (const e of events) {
    if (e.r !== "reg" || !per[e.t]) continue;
    let sc = null;
    if (overrides?.[e.id]) sc = overrides[e.id];
    else if (e.st === "post" && e.h[1] != null) sc = [e.h[1], e.a[1]];
    if (!sc) continue;
    const T = per[e.t];
    add((T[e.h[0]] ||= blank(e.h[0])), sc[0], sc[1]);
    add((T[e.a[0]] ||= blank(e.a[0])), sc[1], sc[0]);
  }
  const zones = {};
  for (const t of ["A", "C"]) {
    zones[t] = { A: [], B: [] };
    for (const r of Object.values(per[t])) { const z = zoneOf(r.id); if (zones[t][z]) zones[t][z].push(r); }
    sortRows(zones[t].A); sortRows(zones[t].B);
  }
  const tot = {};
  for (const t of ["A", "C"]) for (const r of Object.values(per[t])) {
    const x = (tot[r.id] ||= blank(r.id));
    for (const k of ["pj", "g", "e", "p", "gf", "gc", "pts"]) x[k] += r[k];
  }
  const anual = sortRows(Object.values(tot));
  const promedios = anual.map((r) => {
    const b = TEAMS[r.id]?.base || [0, 0];
    const pts = b[0] + r.pts, pj = b[1] + r.pj;
    return { id: r.id, base: b[0], y26: r.pts, pts, pj, prom: pj ? pts / pj : 0 };
  }).sort((a, b) => b.prom - a.prom || b.pts - a.pts);
  let byProm = promedios.at(-1)?.id, byAnual = anual.at(-1)?.id;
  if (byAnual && byAnual === byProm) byAnual = anual.at(-2)?.id;
  return { zones, anual, promedios, rel: { byProm, byAnual } };
}
