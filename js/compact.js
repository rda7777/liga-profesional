// Convierte un evento del scoreboard de ESPN a un formato chico.
// Lo usan el navegador (en vivo) y el script de GitHub Actions (fixture completo).
const ROUND = {
  "round-of-16": "r16", "quarterfinals": "qf", "semifinals": "sf", "final": "f",
};

// Primera Nacional (arg.2): fase regular, Reducido y final por el primer ascenso
const ROUND_PN = [["championship-final", "fa"], ["first-round", "p1"], ["quarterfinals", "qf"], ["semifinals", "sf"], ["finals", "f"]];

export function compactEvent(e, lg = "lp") {
  const c = e.competitions?.[0] || {};
  const slug = e.season?.slug || "";
  let t, r = "reg";
  if (lg === "pn") {
    t = "N";
    for (const [k, v] of ROUND_PN) if (slug.endsWith(k)) { r = v; break; }
  } else {
    t = slug.includes("apertura") ? "A" : slug.includes("clausura") ? "C" : "?";
    for (const [k, v] of Object.entries(ROUND)) if (slug.endsWith(k)) r = v;
  }
  const side = (ha) => {
    const x = (c.competitors || []).find((k) => k.homeAway === ha) || {};
    return [String(x.team?.id || ""), x.score != null ? Number(x.score) : null,
      x.shootoutScore != null ? Number(x.shootoutScore) : null, !!x.winner,
      (x.team?.shortDisplayName || "").trim()];
  };
  const g = [], rc = [];
  for (const d of c.details || []) {
    const who = d.athletesInvolved?.[0]?.shortName || d.athletesInvolved?.[0]?.displayName || "";
    if (d.scoringPlay && !d.shootout) g.push([String(d.team?.id || ""), d.clock?.displayValue || "", who, d.ownGoal ? "o" : d.penaltyKick ? "p" : ""]);
    if (d.redCard) rc.push([String(d.team?.id || ""), d.clock?.displayValue || "", who]);
  }
  const st = e.status || c.status || {};
  return {
    id: String(e.id), d: e.date, t, r,
    st: st.type?.state || "pre", sn: st.type?.name || "", sd: st.type?.shortDetail || "",
    clk: st.displayClock || "", tbd: st.type?.shortDetail === "TBD",
    v: c.venue?.fullName || e.venue?.fullName || "",
    h: side("home"), a: side("away"), g, rc,
  };
}
