// "Dato del día": curiosidades calculadas con los partidos del año.
import { teamName } from "./teams.js?v=4";

const minute = (clk) => {
  const m = String(clk).match(/(\d+)'?(?:\s*\+\s*(\d+))?/);
  return m ? Number(m[1]) + (m[2] ? Number(m[2]) / 100 : 0) : 0;
};
const fecha = new Intl.DateTimeFormat("es-AR", { timeZone: "America/Argentina/Buenos_Aires", day: "numeric", month: "numeric" });
const vs = (e) => `${teamName(e.h[0], e.h[4])} ${e.h[1]}-${e.a[1]} ${teamName(e.a[0], e.a[4])}`;
const plural = (n, s, p) => `${n} ${n === 1 ? s : p}`;

export function buildFacts(events) {
  const played = [...events].filter((e) => e.st === "post" && e.h[1] != null && (e.t === "A" || e.t === "C"))
    .sort((a, b) => a.d.localeCompare(b.d));
  const F = [];
  if (played.length < 10) return F;
  const byTeam = {};
  for (const e of played) for (const [me, op] of [[e.h, e.a], [e.a, e.h]]) {
    (byTeam[me[0]] ||= []).push({ e, gf: me[1], gc: op[1], home: me === e.h, r: me[1] > op[1] ? "G" : me[1] < op[1] ? "P" : "E" });
  }
  const streak = (pred) => {
    let best = null;
    for (const [id, list] of Object.entries(byTeam)) {
      let n = 0;
      for (let i = list.length - 1; i >= 0 && pred(list[i]); i--) n++;
      if (!best || n > best.n) best = { id, n };
    }
    return best;
  };

  const inv = streak((x) => x.r !== "P");
  if (inv?.n >= 5) F.push({ i: "🛡️", club: inv.id, t: `${teamName(inv.id)} lleva ${inv.n} partidos seguidos sin perder. Es el invicto más largo vigente de la Liga.` });
  const win = streak((x) => x.r === "G");
  if (win?.n >= 3) F.push({ i: "🔥", club: win.id, t: `${teamName(win.id)} viene de ganar ${win.n} partidos al hilo, la mejor racha de victorias en curso.` });
  const dry = streak((x) => x.r !== "G");
  if (dry?.n >= 5) F.push({ i: "🥶", club: dry.id, t: `${teamName(dry.id)} no gana hace ${dry.n} partidos. Nadie tiene una racha peor en este momento.` });

  const most = played.reduce((a, e) => (e.h[1] + e.a[1] > a.h[1] + a.a[1] ? e : a));
  F.push({ i: "🎆", club: most.h[0], t: `El partido con más goles del año fue ${vs(most)}, el ${fecha.format(new Date(most.d))}: ${most.h[1] + most.a[1]} goles.` });
  const big = played.reduce((a, e) => (Math.abs(e.h[1] - e.a[1]) > Math.abs(a.h[1] - a.a[1]) ? e : a));
  const bigW = big.h[1] > big.a[1] ? big.h : big.a;
  F.push({ i: "💥", club: bigW[0], t: `La goleada más grande del año: ${vs(big)} (${fecha.format(new Date(big.d))}).` });

  const scorers = {}, pens = {}, hat = [], late = {}, og = { n: 0 };
  let goals = 0;
  for (const e of played) {
    const inMatch = {};
    for (const [team, clk, who, fl] of e.g) {
      goals++;
      if (fl === "o") { og.n++; continue; }
      const k = who + "|" + team;
      scorers[k] = (scorers[k] || 0) + 1;
      inMatch[k] = (inMatch[k] || 0) + 1;
      if (fl === "p") pens[k] = (pens[k] || 0) + 1;
      if (minute(clk) >= 85) late[team] = (late[team] || 0) + 1;
    }
    for (const [k, n] of Object.entries(inMatch)) if (n >= 3) hat.push({ k, n, e });
  }
  const top = (o) => Object.entries(o).sort((a, b) => b[1] - a[1])[0];
  const who = (k) => { const [n, t] = k.split("|"); return { n, t, tn: teamName(t) }; };
  const ts = top(scorers);
  if (ts) { const w = who(ts[0]); F.push({ i: "👟", club: w.t, t: `${w.n} (${w.tn}) es el máximo goleador de la Liga en el año, con ${ts[1]} goles entre Apertura y Clausura.` }); }
  const tp = top(pens);
  if (tp && tp[1] >= 3) { const w = who(tp[0]); F.push({ i: "🎯", club: w.t, t: `El que más penales convirtió en el año es ${w.n} (${w.tn}): ${tp[1]}.` }); }
  if (hat.length) {
    const l = hat.at(-1), w = who(l.k);
    F.push({ i: "🎩", club: w.t, t: `Hubo ${plural(hat.length, "triplete", "tripletes")} en el año. El último fue de ${w.n} (${w.tn}) en ${vs(l.e)}.` });
  }
  const tl = top(late);
  if (tl) F.push({ i: "⏱️", club: tl[0], t: `${teamName(tl[0])} es el rey del final: hizo ${tl[1]} goles del minuto 85 en adelante.` });
  F.push({ i: "⚽", t: `Van ${goals} goles en ${played.length} partidos del año: un promedio de ${(goals / played.length).toFixed(2).replace(".", ",")} por partido. ${og.n} fueron en contra.` });

  // Remontadas: ganó un partido en el que llegó a ir perdiendo
  const comeback = {};
  for (const e of played) {
    const sorted = [...e.g].sort((a, b) => minute(a[1]) - minute(b[1]));
    let h = 0, a = 0, hBehind = false, aBehind = false;
    for (const [team] of sorted) {
      if (team === e.h[0]) h++; else a++;
      if (h < a) hBehind = true;
      if (a < h) aBehind = true;
    }
    if (h !== e.h[1] || a !== e.a[1]) continue; // datos incompletos
    if (e.h[1] > e.a[1] && hBehind) comeback[e.h[0]] = (comeback[e.h[0]] || 0) + 1;
    if (e.a[1] > e.h[1] && aBehind) comeback[e.a[0]] = (comeback[e.a[0]] || 0) + 1;
  }
  const tc = top(comeback);
  if (tc && tc[1] >= 2) F.push({ i: "🔄", club: tc[0], t: `${teamName(tc[0])} es el equipo de las remontadas: ganó ${tc[1]} partidos en los que llegó a ir perdiendo.` });

  // Local y visitante
  const pct = (list) => list.length ? list.reduce((s, x) => s + (x.r === "G" ? 3 : x.r === "E" ? 1 : 0), 0) / (list.length * 3) : 0;
  const homes = Object.entries(byTeam).map(([id, l]) => ({ id, p: pct(l.filter((x) => x.home)), n: l.filter((x) => x.home).length })).filter((x) => x.n >= 8);
  const fort = homes.sort((a, b) => b.p - a.p)[0];
  if (fort) F.push({ i: "🏰", club: fort.id, t: `${teamName(fort.id)} es el más fuerte de local: sacó el ${Math.round(fort.p * 100)}% de los puntos que jugó en su cancha.` });
  const aways = Object.entries(byTeam).map(([id, l]) => ({ id, p: pct(l.filter((x) => !x.home)), n: l.filter((x) => !x.home).length })).filter((x) => x.n >= 8);
  const trav = aways.sort((a, b) => b.p - a.p)[0];
  if (trav) F.push({ i: "🧳", club: trav.id, t: `El mejor visitante del año es ${teamName(trav.id)}: ${Math.round(trav.p * 100)}% de los puntos fuera de casa.` });

  const draws = Object.entries(byTeam).map(([id, l]) => ({ id, n: l.filter((x) => x.r === "E").length })).sort((a, b) => b.n - a.n)[0];
  if (draws) F.push({ i: "🤝", club: draws.id, t: `${teamName(draws.id)} es el rey del empate: igualó ${draws.n} partidos en el año.` });
  const wall = Object.entries(byTeam).map(([id, l]) => ({ id, n: l.length, gc: l.reduce((s, x) => s + x.gc, 0), cs: l.filter((x) => x.gc === 0).length })).sort((a, b) => b.cs - a.cs)[0];
  if (wall) F.push({ i: "🧤", club: wall.id, t: `${teamName(wall.id)} terminó ${wall.cs} partidos con el arco en cero, más que nadie en el año.` });
  return F;
}
