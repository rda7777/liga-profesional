// Festejo de gol: confeti con los colores del club y un sonido sintetizado (original, sin grabaciones).

export function confetti(colors = ["#10b26c", "#ffffff"], ms = 4000) {
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
  const cv = document.createElement("canvas");
  cv.className = "confetti";
  document.body.appendChild(cv);
  const ctx = cv.getContext("2d");
  const dpr = window.devicePixelRatio || 1;
  const W = (cv.width = innerWidth * dpr), H = (cv.height = innerHeight * dpr);
  const palette = [...colors, ...colors, "#ffd200"];
  const parts = Array.from({ length: 220 }, () => ({
    x: W / 2 + (Math.random() - 0.5) * W * 0.3,
    y: H * 0.35,
    vx: (Math.random() - 0.5) * 26 * dpr,
    vy: (-Math.random() * 22 - 8) * dpr,
    w: (6 + Math.random() * 7) * dpr, h: (8 + Math.random() * 10) * dpr,
    r: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.4,
    c: palette[(Math.random() * palette.length) | 0],
  }));
  const t0 = performance.now();
  (function frame(t) {
    const k = (t - t0) / ms;
    ctx.clearRect(0, 0, W, H);
    ctx.globalAlpha = Math.max(0, 1 - Math.max(0, k - 0.7) / 0.3);
    for (const p of parts) {
      p.vy += 0.55 * dpr; p.vx *= 0.985; p.vy *= 0.985;
      p.x += p.vx; p.y += p.vy; p.r += p.vr;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r);
      ctx.fillStyle = p.c; ctx.strokeStyle = "rgba(0,0,0,.15)";
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h * Math.abs(Math.cos(p.r * 2)) + 1);
      ctx.restore();
    }
    if (k < 1) requestAnimationFrame(frame); else cv.remove();
  })(t0);
}

// Hinchada (ruido filtrado que crece y baja) + corneta ascendente.
export function fiestaSound(ac) {
  if (!ac) return;
  const now = ac.currentTime, dur = 3.6;
  const buf = ac.createBuffer(1, ac.sampleRate * dur, ac.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const noise = ac.createBufferSource(); noise.buffer = buf;
  const bp = ac.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 900; bp.Q.value = 0.6;
  const ng = ac.createGain();
  ng.gain.setValueAtTime(0.0001, now);
  ng.gain.exponentialRampToValueAtTime(0.35, now + 0.4);
  ng.gain.setValueAtTime(0.35, now + 2.2);
  ng.gain.exponentialRampToValueAtTime(0.0001, now + dur);
  // "oleaje" de la hinchada
  const lfo = ac.createOscillator(), lg = ac.createGain();
  lfo.frequency.value = 2.2; lg.gain.value = 0.08; lfo.connect(lg).connect(ng.gain);
  noise.connect(bp).connect(ng).connect(ac.destination);
  noise.start(now); noise.stop(now + dur); lfo.start(now); lfo.stop(now + dur);

  const notes = [523.25, 659.25, 783.99, 1046.5, 783.99, 1046.5];
  const lens = [0.14, 0.14, 0.14, 0.32, 0.14, 0.9];
  let t = now + 0.15;
  notes.forEach((f, i) => {
    const o = ac.createOscillator(), g = ac.createGain(), lp = ac.createBiquadFilter();
    o.type = "sawtooth"; o.frequency.value = f;
    lp.type = "lowpass"; lp.frequency.value = 2200;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.18, t + 0.02);
    g.gain.setValueAtTime(0.18, t + lens[i] * 0.8);
    g.gain.exponentialRampToValueAtTime(0.0001, t + lens[i]);
    o.connect(lp).connect(g).connect(ac.destination);
    o.start(t); o.stop(t + lens[i] + 0.02);
    t += lens[i] + 0.03;
  });
}
