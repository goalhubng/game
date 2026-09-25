// Penalty King — synthesized sound effects (no audio files to download).
(function () {
  const PK = (window.PK = window.PK || {});
  let ctx = null;
  let master = null;
  let noiseBuf = null;
  let crowd = null;

  function ready() {
    if (!PK.store.state.sound) return false;
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.6;
      master.connect(ctx.destination);
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    if (ctx.state === "suspended") ctx.resume();
    return true;
  }

  function noise(dur, freq, q, peak, attack = 0.02, when = 0) {
    const t = ctx.currentTime + when;
    const src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    src.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = "bandpass";
    f.frequency.value = freq;
    f.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(master);
    src.start(t);
    src.stop(t + dur + 0.05);
    return { f, g, t };
  }

  function tone(freq, dur, type = "sine", peak = 0.4, when = 0, endFreq) {
    const t = ctx.currentTime + when;
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (endFreq) o.frequency.exponentialRampToValueAtTime(endFreq, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(master);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  PK.sfx = {
    unlock() { ready(); },
    kick() {
      if (!ready()) return;
      tone(150, 0.18, "sine", 0.9, 0, 45);
      noise(0.06, 1800, 1.2, 0.35, 0.002);
    },
    whistle() {
      if (!ready()) return;
      for (let i = 0; i < 3; i++) tone(2900 + (i % 2) * 180, 0.09, "square", 0.05, i * 0.09);
      tone(2900, 0.35, "square", 0.05, 0.27);
    },
    net() {
      if (!ready()) return;
      noise(0.35, 3500, 0.8, 0.25, 0.01);
    },
    cheer(big) {
      if (!ready()) return;
      const n = noise(big ? 2.6 : 1.6, 900, 0.5, big ? 0.5 : 0.35, 0.25);
      n.f.frequency.linearRampToValueAtTime(1400, n.t + 0.6);
      noise(big ? 2.2 : 1.2, 2400, 1, 0.12, 0.3);
    },
    groan() {
      if (!ready()) return;
      const n = noise(1.4, 500, 0.8, 0.3, 0.15);
      n.f.frequency.linearRampToValueAtTime(250, n.t + 1.2);
    },
    post() {
      if (!ready()) return;
      tone(1320, 0.6, "triangle", 0.35, 0, 1250);
      tone(2210, 0.4, "sine", 0.15);
    },
    save() {
      if (!ready()) return;
      tone(110, 0.15, "sine", 0.7, 0, 60);
      noise(0.1, 700, 1, 0.4, 0.004);
    },
    coin() {
      if (!ready()) return;
      tone(988, 0.08, "square", 0.08);
      tone(1319, 0.2, "square", 0.08, 0.08);
    },
    crowd(on) {
      if (on) {
        if (!ready() || crowd) return;
        const src = ctx.createBufferSource();
        src.buffer = noiseBuf;
        src.loop = true;
        const f = ctx.createBiquadFilter();
        f.type = "lowpass";
        f.frequency.value = 700;
        const g = ctx.createGain();
        g.gain.value = 0.05;
        src.connect(f).connect(g).connect(master);
        src.start();
        crowd = { src, g };
      } else if (crowd) {
        crowd.src.stop();
        crowd = null;
      }
    },
  };
})();
