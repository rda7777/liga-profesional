// Cloudflare Worker "liga-goles": detecta goles en ESPN y manda notificaciones push (Web Push).
// - Cron cada minuto: si hay partidos en juego revisa a los 0, 15, 30 y 45 segundos.
// - Las claves VAPID las genera el propio servicio la primera vez y las guarda en KV (no hay secretos que cargar).
// - El aviso push va sin contenido; el service worker de la app pide /goles para armar la notificación.
// Requiere un namespace KV enlazado con el nombre KV.

const LEAGUES = { lp: "arg.1", pn: "arg.2" };
const SB = (lg) => `https://site.api.espn.com/apis/site/v2/sports/soccer/${lg}/scoreboard`;
const SUBJECT = "https://rda7777.github.io/liga-profesional/";
const cors = { "access-control-allow-origin": "*", "access-control-allow-methods": "GET,POST,OPTIONS", "access-control-allow-headers": "content-type", "content-type": "application/json; charset=utf-8" };
const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: cors });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------- utilidades base64url ----------
const b64u = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const b64uStr = (s) => b64u(new TextEncoder().encode(s));
async function sha(s) {
  const h = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(h)].map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 32);
}

// ---------- claves VAPID ----------
async function vapid(env) {
  let v = await env.KV.get("vapid", "json");
  if (!v) {
    const kp = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
    v = { jwk: await crypto.subtle.exportKey("jwk", kp.privateKey), pub: b64u(await crypto.subtle.exportKey("raw", kp.publicKey)) };
    await env.KV.put("vapid", JSON.stringify(v));
  }
  return v;
}

async function sendPush(env, sub, v) {
  const url = new URL(sub.endpoint);
  const header = b64uStr(JSON.stringify({ typ: "JWT", alg: "ES256" }));
  const claims = b64uStr(JSON.stringify({ aud: url.origin, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: SUBJECT }));
  const key = await crypto.subtle.importKey("jwk", v.jwk, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, new TextEncoder().encode(`${header}.${claims}`));
  const r = await fetch(sub.endpoint, {
    method: "POST",
    headers: { Authorization: `vapid t=${header}.${claims}.${b64u(sig)}, k=${v.pub}`, TTL: "180", Urgency: "high", "Content-Length": "0" },
  });
  return r.status;
}

// ---------- partidos ----------
async function scoreboard() {
  const out = [];
  await Promise.all(Object.entries(LEAGUES).map(async ([lg, code]) => {
    try {
      const d = await (await fetch(SB(code), { headers: { "user-agent": "Mozilla/5.0 liga-goles" } })).json();
      for (const e of d.events || []) {
        const c = e.competitions?.[0] || {};
        const side = (ha) => {
          const x = (c.competitors || []).find((k) => k.homeAway === ha) || {};
          return { id: String(x.team?.id || ""), name: (x.team?.shortDisplayName || x.team?.displayName || "").trim(), score: Number(x.score || 0), logo: x.team?.logo || "" };
        };
        out.push({ id: String(e.id), lg, d: e.date, st: e.status?.type?.state || "pre", clk: e.status?.displayClock || "", h: side("home"), a: side("away"),
          det: (c.details || []).filter((x) => x.scoringPlay && !x.shootout).map((x) => ({ team: String(x.team?.id || ""), clk: x.clock?.displayValue || "", who: x.athletesInvolved?.[0]?.shortName || x.athletesInvolved?.[0]?.displayName || "", og: !!x.ownGoal, pk: !!x.penaltyKick })) });
      }
    } catch {}
  }));
  return out;
}

function goalRecord(e, side) {
  const scorer = [...e.det].reverse().find((x) => x.team === side.id);
  const who = scorer ? `${scorer.who} ${scorer.clk}${scorer.og ? " (en contra)" : scorer.pk ? " (penal)" : ""}` : e.clk;
  return {
    gid: `${e.id}-${e.h.score}-${e.a.score}`, t: Date.now(), ev: e.id, lg: e.lg, team: side.id, teams: [e.h.id, e.a.id],
    title: `⚽ ¡GOL de ${side.name}!`, body: `${e.h.name} ${e.h.score} - ${e.a.score} ${e.a.name}${who ? " · " + who : ""}`, icon: side.logo,
  };
}

const wants = (s, g) => g.to ? g.to === s.k : s.mode === "all" || (s.mode === "favs" && g.teams.some((t) => (s.favs || []).includes(t)));

async function deliver(env, goals) {
  const all = (await env.KV.get("goles", "json")) || [];
  const keep = [...all.filter((g) => Date.now() - g.t < 15 * 60000), ...goals];
  await env.KV.put("goles", JSON.stringify(keep));
  const subs = (await env.KV.get("subs", "json")) || {};
  const v = await vapid(env);
  let dead = false;
  for (const [k, s] of Object.entries(subs)) {
    if (!goals.some((g) => wants({ ...s, k }, g))) continue;
    try {
      const st = await sendPush(env, s.sub, v);
      if (st === 404 || st === 410) { delete subs[k]; dead = true; }
    } catch {}
  }
  if (dead) await env.KV.put("subs", JSON.stringify(subs));
}

async function check(env) {
  let state = (await env.KV.get("state", "json")) || {};
  let changed = false;
  for (let i = 0; i < 4; i++) {
    if (i) await sleep(15000);
    const evs = await scoreboard();
    if (i === 0) {
      const now = Date.now();
      const active = evs.some((e) => e.st === "in" || (e.st === "pre" && Date.parse(e.d) - now < 10 * 60000 && now - Date.parse(e.d) < 4 * 3600000));
      if (!active) break;
    }
    const goals = [];
    for (const e of evs) {
      if (e.st === "pre") continue;
      const prev = state[e.id];
      const cur = [e.h.score, e.a.score];
      if (!prev) { state[e.id] = cur; changed = true; continue; } // primera vez que lo vemos: sin aviso
      if (cur[0] > prev[0]) goals.push(goalRecord(e, e.h));
      if (cur[1] > prev[1]) goals.push(goalRecord(e, e.a));
      if (cur[0] !== prev[0] || cur[1] !== prev[1]) { state[e.id] = cur; changed = true; }
    }
    if (goals.length) await deliver(env, goals);
    if (changed) { await env.KV.put("state", JSON.stringify(state)); changed = false; }
  }
  // limpiar partidos viejos del estado una vez por hora
  if (new Date().getMinutes() === 0) {
    const ids = new Set((await scoreboard()).map((e) => e.id));
    const next = Object.fromEntries(Object.entries(state).filter(([k]) => ids.has(k)));
    if (Object.keys(next).length !== Object.keys(state).length) await env.KV.put("state", JSON.stringify(next));
  }
}

export default {
  async scheduled(evt, env, ctx) { ctx.waitUntil(check(env)); },

  async fetch(req, env) {
    const u = new URL(req.url);
    if (req.method === "OPTIONS") return new Response(null, { headers: cors });
    try {
      if (u.pathname === "/clave") return json({ key: (await vapid(env)).pub });

      if (u.pathname === "/suscribir" && req.method === "POST") {
        const b = JSON.parse(await req.text());
        if (!b.sub?.endpoint || !/^https:\/\//.test(b.sub.endpoint)) return json({ error: "suscripción inválida" }, 400);
        const subs = (await env.KV.get("subs", "json")) || {};
        const k = await sha(b.sub.endpoint);
        subs[k] = { sub: { endpoint: b.sub.endpoint }, mode: b.mode === "favs" ? "favs" : "all", favs: (b.favs || []).map(String).slice(0, 80), t: Date.now() };
        await env.KV.put("subs", JSON.stringify(subs));
        return json({ ok: true });
      }

      if (u.pathname === "/baja" && req.method === "POST") {
        const b = JSON.parse(await req.text());
        const subs = (await env.KV.get("subs", "json")) || {};
        delete subs[await sha(b.endpoint || "")];
        await env.KV.put("subs", JSON.stringify(subs));
        return json({ ok: true });
      }

      if (u.pathname === "/goles") {
        const k = await sha(u.searchParams.get("ep") || "");
        const subs = (await env.KV.get("subs", "json")) || {};
        const s = subs[k];
        const all = (await env.KV.get("goles", "json")) || [];
        const mine = s ? all.filter((g) => Date.now() - g.t < 5 * 60000 && wants({ ...s, k }, g)) : [];
        return json({ goles: mine.slice(-5) });
      }

      if (u.pathname === "/prueba" && req.method === "POST") {
        const b = JSON.parse(await req.text());
        const k = await sha(b.endpoint || "");
        const subs = (await env.KV.get("subs", "json")) || {};
        if (!subs[k]) return json({ error: "no suscripto" }, 404);
        const g = { gid: "prueba-" + Date.now(), t: Date.now(), to: k, teams: [], title: "⚽ ¡GOL de prueba!", body: "Así te van a llegar los goles con la pantalla apagada.", icon: "" };
        const all = (await env.KV.get("goles", "json")) || [];
        await env.KV.put("goles", JSON.stringify([...all.filter((x) => Date.now() - x.t < 15 * 60000), g]));
        const st = await sendPush(env, subs[k].sub, await vapid(env));
        return json({ ok: st < 300, status: st });
      }

      if (u.pathname === "/estado") {
        const subs = (await env.KV.get("subs", "json")) || {};
        return json({ suscriptos: Object.keys(subs).length, partidos: Object.keys((await env.KV.get("state", "json")) || {}).length });
      }
      return json({ servicio: "liga-goles", ok: true });
    } catch (e) {
      return json({ error: e.message }, 500);
    }
  },
};
