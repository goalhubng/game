// Penalty King — game engine.
// Modes: daily (seeded, once per day), quick (endless with lives),
// keeper (you are the goalkeeper), friend (replay a friend's seeded challenge).
//
// Positions on the goal plane are in metres: x = 0 is the centre of the goal,
// y = 0 is the ground. The goal is 7.32m x 2.44m.
(function () {
  const PK = window.PK;
  const S = PK.store;
  const st = S.state;

  const HALF = 3.66;
  const BAR = 2.44;
  const BALL = 0.11;
  const MAX_DX = 2.4; // furthest a keeper's body centre can travel sideways
  const MIN_Y = 0.45;
  const MAX_Y = 1.7;

  const KEEPERS = {
    reader: { id: "reader", name: "The Reader", color: "#ff4fa3", adapt: 0.85, react: 0.3, speed: 6.2, reach: 0.85, center: 0.1, blurb: "Studies where you like to shoot" },
    gambler: { id: "gambler", name: "The Gambler", color: "#8f5bff", adapt: 0.15, react: 0.55, speed: 7.6, reach: 0.8, center: 0, blurb: "Always picks a side early" },
    wall: { id: "wall", name: "The Wall", color: "#ff9800", adapt: 0.4, react: 0.26, speed: 5.2, reach: 1.0, center: 0.45, blurb: "Big frame, loves to stand tall" },
    cat: { id: "cat", name: "The Cat", color: "#00c2d8", adapt: 0.5, react: 0.2, speed: 6.6, reach: 0.8, center: 0.15, blurb: "Lightning reflexes" },
  };
  const KEEPER_IDS = Object.keys(KEEPERS);

  const DIFF = {
    amateur: { label: "Amateur", react: 1.5, speed: 0.8, reach: 0.85, reticle: true, wind: 0.5 },
    pro: { label: "Pro", react: 1, speed: 1, reach: 1, reticle: true, wind: 1 },
    legend: { label: "Legend", react: 0.8, speed: 1.1, reach: 1.06, reticle: false, wind: 1.5 },
  };

  // ---------- Mode setup ----------
  const params = new URLSearchParams(location.search);
  const MODES = ["daily", "quick", "keeper", "friend"];
  const mode = MODES.includes(params.get("mode")) ? params.get("mode") : "quick";
  const today = S.dayNo();
  const fixedFive = mode === "daily" || mode === "friend" || mode === "keeper";
  const diff = mode === "daily" || mode === "friend" ? DIFF.pro : DIFF[st.difficulty] || DIFF.pro;

  let seed = 0;
  let plan = null; // seeded list of { keeper, wind } for fixed challenges
  let friend = null;

  if (mode === "daily") seed = S.dailySeed(today);
  if (mode === "friend") {
    seed = parseInt(params.get("seed"), 10) || Math.floor(Math.random() * 1e9);
    const r = (params.get("r") || "").toUpperCase().replace(/[^GSM]/g, "").slice(0, 5);
    if (r.length === 5) {
      friend = { r, s: [...r].filter((c) => c === "G").length, n: (params.get("n") || "Your friend").slice(0, 20) };
    }
  }
  if (seed) plan = makePlan(seed);

  function makePlan(sd) {
    const r = S.rng(sd);
    return Array.from({ length: 5 }, (_, i) => ({
      keeper: KEEPER_IDS[Math.floor(r() * KEEPER_IDS.length)],
      wind: i === 0 ? 0 : Math.round((r() - 0.5) * 12) / 10,
    }));
  }

  // ---------- Canvas & layout ----------
  const canvas = document.getElementById("pitch");
  const ctx = canvas.getContext("2d");
  const bg = document.createElement("canvas");
  const crowdLayer = document.createElement("canvas");
  let W = 0, H = 0, dpr = 1;
  let gw, gh, goalX, goalTop, gB, hY, spotX, spotY, r0, zc, boardsTop;

  function layout() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    canvas.style.width = W + "px";
    canvas.style.height = H + "px";

    gw = Math.min(W * 0.88, 560, H * 0.75);
    gh = (gw * BAR) / (HALF * 2);
    goalX = (W - gw) / 2;
    goalTop = Math.max(130, H * 0.3);
    gB = goalTop + gh;
    hY = gB - gh * 0.35;
    boardsTop = hY - gh * 0.28;
    spotX = W / 2;
    spotY = H * 0.82;
    r0 = Math.max(14, Math.min(26, W * 0.045));
    // Camera distance so that the goal line and penalty spot land where we want.
    const ratio = (spotY - hY) / (gB - hY);
    zc = (11 * ratio) / (ratio - 1);
    buildBackground();
  }

  function m2s(x, y) {
    return { x: W / 2 + (x / HALF) * (gw / 2), y: gB - (y / BAR) * gh };
  }
  function s2m(sx, sy) {
    return { x: ((sx - W / 2) / (gw / 2)) * HALF, y: ((gB - sy) / gh) * BAR };
  }
  // Ground point fx metres across, fz metres out from the goal line.
  function project(fx, fz) {
    const k = zc / (zc - fz);
    return { x: W / 2 + fx * (gw / (HALF * 2)) * k, y: hY + (gB - hY) * k, k };
  }

  function buildBackground() {
    for (const c of [bg, crowdLayer]) {
      c.width = canvas.width;
      c.height = canvas.height;
    }
    const g = bg.getContext("2d");
    g.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Stadium
    const sky = g.createLinearGradient(0, 0, 0, boardsTop);
    sky.addColorStop(0, "#050b14");
    sky.addColorStop(1, "#16263a");
    g.fillStyle = sky;
    g.fillRect(0, 0, W, boardsTop + 1);
    for (const lx of [W * 0.1, W * 0.9]) {
      const lg = g.createRadialGradient(lx, 0, 4, lx, 0, W * 0.5);
      lg.addColorStop(0, "rgba(255,255,230,0.35)");
      lg.addColorStop(1, "rgba(255,255,230,0)");
      g.fillStyle = lg;
      g.fillRect(0, 0, W, boardsTop);
    }

    // Grass stripes in perspective
    let i = 0;
    for (let z = -60; z < zc - 0.2; z += 2, i++) {
      const a = project(0, z).y;
      const b = project(0, Math.min(z + 2, zc - 0.2)).y;
      g.fillStyle = i % 2 ? "#1b7a3b" : "#166a32";
      g.fillRect(0, a, W, b - a + 1);
    }
    g.fillStyle = "#166a32";
    g.fillRect(0, hY, W, 2);

    // Advertising boards
    const bh = hY - boardsTop;
    const labels = ["GOALHUB", "PENALTY KING", "⚽ DAILY CHALLENGE", "GOALHUB"];
    const segW = W / labels.length;
    labels.forEach((t, j) => {
      g.fillStyle = j % 2 ? "#0c2f66" : "#8e0c22";
      g.fillRect(j * segW, boardsTop, segW + 1, bh);
      g.fillStyle = "rgba(255,255,255,0.75)";
      g.font = `800 ${Math.max(8, bh * 0.45)}px Inter, system-ui, sans-serif`;
      g.textAlign = "center";
      g.textBaseline = "middle";
      g.fillText(t, j * segW + segW / 2, boardsTop + bh / 2 + 1);
    });

    // Pitch markings
    g.strokeStyle = "rgba(255,255,255,0.85)";
    g.lineCap = "round";
    const line = (x1, z1, x2, z2) => {
      const a = project(x1, z1), b = project(x2, z2);
      g.lineWidth = Math.max(1.2, Math.min(8, 1.4 * ((a.k + b.k) / 2)));
      g.beginPath();
      g.moveTo(a.x, a.y);
      g.lineTo(b.x, b.y);
      g.stroke();
    };
    const zMax = zc - 0.3;
    line(-60, 0, 60, 0);
    line(-9.16, 0, -9.16, 5.5);
    line(9.16, 0, 9.16, 5.5);
    line(-9.16, 5.5, 9.16, 5.5);
    line(-20.16, 0, -20.16, zMax);
    line(20.16, 0, 20.16, zMax);
    const spot = project(0, 11);
    g.fillStyle = "rgba(255,255,255,0.9)";
    g.beginPath();
    g.ellipse(spot.x, spot.y, r0 * 0.9, r0 * 0.3, 0, 0, Math.PI * 2);
    g.fill();

    // Crowd (separate layer so it can bounce when a goal goes in)
    const c = crowdLayer.getContext("2d");
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    const rr = S.rng(42);
    const colors = ["#008751", "#ffffff", "#ffc72c", "#e53935", "#1e88e5", "#8d6e63", "#6d4c41", "#008751"];
    const rows = Math.max(4, Math.floor(boardsTop / 9));
    for (let row = 0; row < rows; row++) {
      const y = boardsTop - 6 - row * 9;
      if (y < 30) break;
      for (let x = (row % 2) * 4; x < W; x += 8) {
        c.fillStyle = colors[Math.floor(rr() * colors.length)];
        c.globalAlpha = 0.18 + rr() * 0.32;
        c.beginPath();
        c.arc(x + rr() * 2, y, 2.6, 0, Math.PI * 2);
        c.fill();
      }
    }
    c.globalAlpha = 1;
  }

  // ---------- Game state ----------
  const G = {
    phase: "intro",
    time: 0,
    shot: 0,
    results: "",
    score: 0,
    lives: 3,
    level: 1,
    coins: 0,
    kp: KEEPERS.reader,
    wind: 0,
    keeper: { x: 0, y: 1, angle: 0, stretch: 0, target: null, speed: 0, t: 0 },
    ball: null,
    drag: null,
    ripple: null,
    particles: [],
    cheerT: -10,
    flashPost: 0,
    shooter: null,
    dove: false,
    tapMark: null,
  };

  // ---------- Keeper AI ----------
  function zoneOf(x, y) {
    const col = x < -1.22 ? 0 : x > 1.22 ? 2 : 1;
    const row = y > 1.22 ? 1 : 0;
    return row * 3 + col;
  }
  function zoneTarget(z) {
    const col = z % 3, row = Math.floor(z / 3);
    return { x: (col - 1) * 2.4, y: row ? MAX_Y : MIN_Y };
  }

  // Blend the player's overall shot map with what they usually do after their last shot.
  function predictZones() {
    const z = st.zones;
    const tr = st.lastZone >= 0 ? st.trans.slice(st.lastZone * 6, st.lastZone * 6 + 6) : [0, 0, 0, 0, 0, 0];
    const zs = z.reduce((a, b) => a + b, 0);
    const ts = tr.reduce((a, b) => a + b, 0);
    return z.map((v, i) => 0.5 * ((v + 0.5) / (zs + 3)) + 0.5 * ((tr[i] + 0.5) / (ts + 3)));
  }

  function keeperGuess(kp) {
    if (Math.random() < kp.center) return { x: 0, y: 1, zone: -1 };
    let zone;
    if (Math.random() < kp.adapt) {
      const p = predictZones().map((v) => v * v);
      const sum = p.reduce((a, b) => a + b, 0);
      let r = Math.random() * sum;
      zone = 0;
      while (zone < 5 && (r -= p[zone]) > 0) zone++;
    } else {
      const sides = [0, 2, 3, 5];
      zone = kp.id === "gambler" ? sides[Math.floor(Math.random() * 4)] : Math.floor(Math.random() * 6);
    }
    return Object.assign(zoneTarget(zone), { zone });
  }

  function currentKeeperParams() {
    const base = KEEPERS[plan ? plan[G.shot].keeper : KEEPER_IDS[Math.floor(Math.random() * KEEPER_IDS.length)]];
    const lv = mode === "quick" ? G.level - 1 : 0;
    return Object.assign({}, base, {
      react: Math.max(0.14, base.react * diff.react - 0.03 * lv),
      speed: base.speed * diff.speed + 0.15 * lv,
      reach: Math.min(1.2, base.reach * diff.reach + 0.02 * lv),
      adapt: Math.min(0.95, base.adapt + 0.08 * lv),
    });
  }

  function moveKeeper(dt) {
    const k = G.keeper;
    if (k.target) {
      const dx = k.target.x - k.x, dy = k.target.y - k.y;
      const d = Math.hypot(dx, dy);
      const step = k.speed * dt;
      if (d > 0.001) {
        const f = Math.min(1, step / d);
        k.x += dx * f;
        k.y += dy * f;
      }
      k.x = Math.max(-MAX_DX, Math.min(MAX_DX, k.x));
      k.y = Math.max(MIN_Y, Math.min(MAX_Y, k.y));
    }
    const moving = Math.abs(k.x) > 0.25 || Math.abs(k.y - 1) > 0.3;
    const targetAngle = moving ? Math.max(-1, Math.min(1, k.x / MAX_DX)) * 1.25 : 0;
    k.angle += (targetAngle - k.angle) * Math.min(1, dt * 14);
    k.stretch += ((moving ? 1 : 0) - k.stretch) * Math.min(1, dt * 12);
  }

  // ---------- Shooting ----------
  function gauss() { return (Math.random() + Math.random() + Math.random() - 1.5) * 1.4; }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  function aimFromSwipe(dx, dy, len, power) {
    const ang = Math.atan2(dx, -dy);
    const h = len / (H * 0.4);
    return { x: (ang / 0.5) * HALF, y: Math.max(0.1, (h - 0.12) * 2.9 + power * 0.25) };
  }

  function finishSwipe() {
    const pts = G.drag.pts;
    G.drag = null;
    const a = pts[0], b = pts[pts.length - 1];
    const dx = b.x - a.x, dy = b.y - a.y;
    const len = Math.hypot(dx, dy);
    if (len < 40 || dy > -25) {
      showHint("Swipe UP towards the goal ☝️");
      return;
    }
    let i0 = pts.findIndex((p) => Math.hypot(p.x - a.x, p.y - a.y) > 10);
    if (i0 < 0) i0 = 0;
    const dt = Math.max(16, b.t - pts[i0].t);
    const speed = len / dt;
    const power = clamp((speed - 0.35) / 1.8, 0, 1);
    // Curl: how far the swipe bowed away from a straight line (positive = bowed right).
    let dev = 0;
    for (const p of pts) {
      const d = ((p.x - a.x) * -dy + (p.y - a.y) * dx) / len;
      if (Math.abs(d) > Math.abs(dev)) dev = d;
    }
    let curl = clamp((dev / len) * 3.5, -1, 1);
    if (Math.abs(curl) < 0.12) curl = 0;
    shoot(aimFromSwipe(dx, dy, len, power), power, curl);
  }

  function shoot(aim, power, curl) {
    const sigma = 0.06 + 0.3 * power * power;
    const x = aim.x + gauss() * sigma + G.wind;
    const y = Math.max(0.05, aim.y + gauss() * sigma * 0.7);
    if (Math.abs(aim.x) < HALF + 1 && aim.y < BAR + 1) {
      S.recordShotZone(zoneOf(clamp(aim.x, -HALF, HALF), clamp(aim.y, 0, BAR)));
    }
    const kp = G.kp;
    const guess = keeperGuess(kp);
    const k = G.keeper;
    k.guess = guess;
    k.t = 0;
    k.react = kp.react + Math.abs(curl) * 0.12;
    k.speed = kp.speed;
    G.ball = { t: 0, T: 0.95 - 0.5 * power, x, y, power, curl, aimX: aim.x, post: null };
    G.hideHint();
    G.phase = "flight";
    PK.sfx.kick();
    PK.vibrate(15);
  }

  function updateShooterKeeper(dt) {
    const k = G.keeper;
    k.t += dt;
    if (k.t < 0.05) k.target = null;
    else if (k.t < k.react) k.target = k.guess;
    else {
      const wrongSide = k.guess.zone >= 0 && Math.sign(k.guess.x) !== Math.sign(G.ball.x) && Math.abs(G.ball.x) > 0.8;
      k.target = { x: G.ball.x, y: G.ball.y };
      // Once committed to a dive, a keeper can only partly correct in mid-air.
      k.speed = G.kp.speed * (wrongSide ? 0.3 : 0.6);
    }
    moveKeeper(dt);
  }

  // ---------- Be the Keeper ----------
  function planShooterKick() {
    const weights = [1.2, 0.6, 1.2, 1, 0.4, 1];
    if (G.lastDive) {
      // Shooters avoid the side you dived to last time.
      const side = G.lastDive > 0 ? [2, 5] : [0, 3];
      side.forEach((z) => (weights[z] *= 0.5));
    }
    const sum = weights.reduce((a, b) => a + b, 0);
    let r = Math.random() * sum, zone = 0;
    while (zone < 5 && (r -= weights[zone]) > 0) zone++;
    const col = zone % 3, row = Math.floor(zone / 3);
    let x = col === 1 ? (Math.random() - 0.5) * 1.2 : (col - 1) * (2.6 + Math.random() * 0.85);
    let y = row ? 1.5 + Math.random() * 0.75 : 0.15 + Math.random() * 0.6;
    if (Math.random() < 0.08) {
      if (Math.random() < 0.5) x = Math.sign(x || 1) * (HALF + 0.3 + Math.random() * 0.5);
      else y = BAR + 0.25 + Math.random() * 0.4;
    }
    const truth = Math.sign(x) || (Math.random() < 0.5 ? -1 : 1);
    const lean = Math.random() < 0.7 ? truth : -truth;
    return { x, y, lean, T: 0.55 + Math.random() * 0.2, runDur: 1.4, runT: 0 };
  }

  function keeperTap(sx, sy) {
    if (G.dove) return;
    const m = s2m(sx, sy);
    const sh = G.shooter;
    const k = G.keeper;
    G.dove = true;
    G.tapMark = { x: sx, y: sy, t: 0 };
    k.target = { x: clamp(m.x, -MAX_DX, MAX_DX), y: clamp(m.y, MIN_Y, MAX_Y) };
    k.speed = 7.5;
    G.lastDive = Math.sign(m.x);
    // Commit too early and the shooter may send you the wrong way.
    if (G.phase === "runup" && sh.runDur - sh.runT > 0.25 && Math.sign(m.x) === Math.sign(sh.x) && Math.abs(sh.x) > 1 && Math.random() < 0.65) {
      sh.x = -sh.x;
      G.fooled = true;
    }
  }

  // ---------- Outcomes ----------
  function resolve() {
    const b = G.ball;
    const ax = Math.abs(b.x);
    const k = G.keeper;
    let out;
    if (b.y <= BAR + BALL && ax >= HALF - BALL && ax <= HALF + BALL) out = "post";
    else if (ax <= HALF + BALL && b.y >= BAR - BALL && b.y <= BAR + BALL) out = "bar";
    else if (b.y > BAR) out = "over";
    else if (ax > HALF) out = "wide";
    else {
      const reach = mode === "keeper" ? 1.0 : G.kp.reach;
      out = Math.hypot(b.x - k.x, b.y - k.y) < reach ? "save" : "goal";
    }
    b.post = { type: out, t: 0 };
    G.phase = "result";
    G.resultT = 0;

    const letter = out === "goal" ? "G" : out === "save" ? "S" : "M";
    G.results += letter;
    const topBins = out === "goal" && ax > 2.6 && b.y > 1.6;
    let text, cls, coins = 0;

    if (mode === "keeper") {
      st.stats.faced++;
      if (out === "goal") {
        text = G.fooled ? "SENT THE WRONG WAY!" : topBins ? "UNSTOPPABLE!" : "GOAL";
        cls = "bad";
        PK.sfx.net();
        PK.sfx.groan();
      } else {
        G.score++;
        coins = out === "save" ? 15 : 5;
        if (out === "save") st.stats.saves++;
        text = out === "save" ? (b.y > 1.6 && ax > 2.4 ? "WORLD-CLASS SAVE!" : "SAVED!") : out === "post" || out === "bar" ? "OFF THE WOODWORK!" : out === "over" ? "OVER THE BAR!" : "WIDE!";
        cls = "good";
        if (out === "save") { PK.sfx.save(); PK.sfx.cheer(true); G.cheerT = G.time; PK.vibrate([30, 40, 30]); }
        else if (out === "post" || out === "bar") { PK.sfx.post(); PK.sfx.cheer(false); }
        else PK.sfx.cheer(false);
      }
    } else {
      st.stats.shots++;
      if (out === "goal") {
        st.stats.goals++;
        G.score++;
        coins = 10 + (topBins ? 10 : 0);
        if (topBins) st.stats.topBins++;
        const wrongWay = Math.abs(k.x) > 0.6 && Math.sign(k.x) !== Math.sign(b.x) && ax > 1;
        text = topBins ? "TOP BINS!" : b.power > 0.8 ? "WHAT A STRIKE!" : wrongWay ? "SENT THE WRONG WAY!" : ax < 1 && b.y > 1.2 && b.power < 0.25 ? "PANENKA!" : "GOAL!";
        cls = "good";
        PK.sfx.net();
        PK.sfx.cheer(true);
        G.cheerT = G.time;
        PK.vibrate([30, 40, 30]);
        burst(m2s(b.x, b.y), topBins ? 60 : 30);
        G.ripple = { x: b.x, y: b.y, t: 0 };
      } else if (out === "save") {
        const readIt = k.guess && k.guess.zone >= 0 && Math.sign(k.guess.x) === Math.sign(b.x);
        text = readIt && G.kp.id === "reader" ? "HE READ YOU!" : "SAVED!";
        cls = "bad";
        PK.sfx.save();
        PK.sfx.groan();
      } else {
        if (out === "post" || out === "bar") st.stats.woodwork++;
        text = out === "post" ? "OFF THE POST!" : out === "bar" ? "CROSSBAR!" : out === "over" ? "OVER THE BAR!" : "WIDE!";
        cls = "bad";
        if (out === "post" || out === "bar") { PK.sfx.post(); G.flashPost = 1; }
        PK.sfx.groan();
      }
      if (mode === "quick" && letter !== "G") G.lives--;
      if (mode === "quick" && letter === "G") G.level = 1 + Math.floor(G.score / 5);
    }

    if (coins) addCoins(coins);
    S.save();
    showBanner(text, cls);
    updateHud();
  }

  function addCoins(n) {
    G.coins += n;
    st.coins += n;
    PK.sfx.coin();
    const el = document.createElement("div");
    el.className = "coin-float";
    el.textContent = `+${n} 🪙`;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1200);
  }

  function burst(p, n) {
    const cols = ["#ffc72c", "#ffffff", "#008751", "#ff4fa3", "#00c2d8"];
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, v = 80 + Math.random() * 260;
      G.particles.push({ x: p.x, y: p.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 160, life: 1 + Math.random() * 0.6, c: cols[i % cols.length], s: 3 + Math.random() * 4 });
    }
  }

  // ---------- Flow ----------
  function totalShots() { return fixedFive ? 5 : Infinity; }

  function startShot() {
    G.ball = null;
    G.ripple = null;
    G.dove = false;
    G.fooled = false;
    G.tapMark = null;
    const k = G.keeper;
    Object.assign(k, { x: 0, y: 1, angle: 0, stretch: 0, target: null, guess: null, t: 0 });
    if (mode === "keeper") {
      G.kp = { color: "#ffc72c", name: "You" };
      G.wind = 0;
      G.shooter = planShooterKick();
      G.phase = "runup";
      showHint("Tap where you'll dive! Watch the shooter's body…");
    } else {
      G.kp = currentKeeperParams();
      // Seeded challenges carry their own wind; otherwise it arrives at level 3 (or always on Legend).
      if (plan) G.wind = plan[G.shot].wind;
      else if (st.difficulty === "legend" || G.level >= 3) G.wind = (Math.round((Math.random() - 0.5) * 12) / 10) * diff.wind;
      else G.wind = 0;
      G.phase = "aim";
      if (G.shot === 0) showHint("Swipe up to shoot ☝️  Longer = higher · Faster = harder to save · Curve it to bend it");
    }
    updateHud();
  }

  function nextOrFinish() {
    G.shot++;
    const done = mode === "quick" ? G.lives <= 0 : G.shot >= totalShots();
    if (done) finish();
    else startShot();
  }

  function finish() {
    G.phase = "over";
    PK.sfx.whistle();
    PK.sfx.crowd(false);
    if (mode === "daily") {
      S.completeDaily(today, G.results);
      addCoins(50);
    }
    if (mode === "quick") st.stats.quickBest = Math.max(st.stats.quickBest, G.score);
    if (mode === "keeper") st.stats.keeperBest = Math.max(st.stats.keeperBest, G.score);
    S.save();
    showResults(G.results, G.score);
  }

  // ---------- Loop ----------
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    G.time += dt;
    update(dt);
    draw();
    requestAnimationFrame(frame);
  }

  function update(dt) {
    if (G.phase === "runup") {
      const sh = G.shooter;
      sh.runT += dt;
      if (G.dove) moveKeeper(dt);
      if (sh.runT >= sh.runDur) {
        G.ball = { t: 0, T: sh.T, x: sh.x, y: sh.y, power: 0.6, curl: 0, post: null };
        G.phase = "flight";
        PK.sfx.kick();
      }
    } else if (G.phase === "flight") {
      const b = G.ball;
      b.t += dt;
      if (mode === "keeper") moveKeeper(dt);
      else updateShooterKeeper(dt);
      if (b.t >= b.T) resolve();
    } else if (G.phase === "result") {
      G.resultT += dt;
      if (G.ball && G.ball.post) G.ball.post.t += dt;
      if (mode !== "keeper") updateShooterKeeper(dt);
      else moveKeeper(dt);
      if (G.resultT > 1.7) nextOrFinish();
    }
    if (G.ripple) G.ripple.t += dt;
    if (G.tapMark) G.tapMark.t += dt;
    G.flashPost = Math.max(0, G.flashPost - dt * 2);
    for (const p of G.particles) {
      p.vy += 500 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
    }
    G.particles = G.particles.filter((p) => p.life > 0);
  }

  // ---------- Drawing ----------
  function draw() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(bg, 0, 0);
    const since = G.time - G.cheerT;
    const bounce = since < 1.6 ? -Math.abs(Math.sin(since * 16)) * 5 * dpr : 0;
    ctx.drawImage(crowdLayer, 0, bounce);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    drawNet();
    const inNet = G.ball && G.ball.post && G.ball.post.type === "goal";
    if (inNet) drawFlyingBall();
    drawKeeper();
    drawPosts();
    if (G.shooter && mode === "keeper") drawShooter();
    if (!inNet) drawFlyingBall();
    drawDrag();
    drawTapMark();
    for (const p of G.particles) {
      ctx.globalAlpha = Math.min(1, p.life);
      ctx.fillStyle = p.c;
      ctx.fillRect(p.x, p.y, p.s, p.s * 0.6);
    }
    ctx.globalAlpha = 1;
  }

  function drawNet() {
    const bx0 = goalX + gw * 0.05, bx1 = goalX + gw * 0.95;
    const bTop = goalTop + gh * 0.1, bBot = gB - gh * 0.16;
    ctx.fillStyle = "rgba(8,20,12,0.45)";
    ctx.beginPath();
    ctx.moveTo(goalX, gB);
    ctx.lineTo(goalX, goalTop);
    ctx.lineTo(goalX + gw, goalTop);
    ctx.lineTo(goalX + gw, gB);
    ctx.lineTo(bx1, bBot);
    ctx.lineTo(bx0, bBot);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = "rgba(255,255,255,0.28)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    const cols = 28, rows = 9;
    for (let i = 0; i <= cols; i++) {
      const x = bx0 + ((bx1 - bx0) * i) / cols;
      ctx.moveTo(x, bTop);
      ctx.lineTo(x, bBot);
    }
    for (let j = 0; j <= rows; j++) {
      const y = bTop + ((bBot - bTop) * j) / rows;
      ctx.moveTo(bx0, y);
      ctx.lineTo(bx1, y);
    }
    for (let j = 0; j <= 6; j++) {
      const f = j / 6;
      ctx.moveTo(goalX, goalTop + gh * f);
      ctx.lineTo(bx0, bTop + (bBot - bTop) * f);
      ctx.moveTo(goalX + gw, goalTop + gh * f);
      ctx.lineTo(bx1, bTop + (bBot - bTop) * f);
    }
    for (let i = 0; i <= 12; i++) {
      const f = i / 12;
      ctx.moveTo(goalX + gw * f, goalTop);
      ctx.lineTo(bx0 + (bx1 - bx0) * f, bTop);
    }
    ctx.stroke();

    if (G.ripple && G.ripple.t < 1.2) {
      const p = m2s(G.ripple.x, G.ripple.y);
      const t = G.ripple.t;
      const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, gh * 0.5);
      grad.addColorStop(0, `rgba(0,0,0,${0.35 * (1 - t / 1.2)})`);
      grad.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = grad;
      ctx.fillRect(p.x - gh, p.y - gh, gh * 2, gh * 2);
      ctx.strokeStyle = `rgba(255,255,255,${0.6 * (1 - t / 1.2)})`;
      for (let i = 0; i < 3; i++) {
        const rad = (t * 1.6 - i * 0.12) * gh * 0.6;
        if (rad <= 0) continue;
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, rad, rad * 0.7, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  }

  function drawPosts() {
    const pw = Math.max(4, gw * 0.018);
    ctx.fillStyle = G.flashPost > 0 ? `rgb(255,${255 - 60 * G.flashPost},${255 - 200 * G.flashPost})` : "#ffffff";
    ctx.shadowColor = "rgba(0,0,0,0.35)";
    ctx.shadowBlur = 6;
    ctx.fillRect(goalX - pw / 2, goalTop - pw / 2, pw, gh + pw / 2);
    ctx.fillRect(goalX + gw - pw / 2, goalTop - pw / 2, pw, gh + pw / 2);
    ctx.fillRect(goalX - pw / 2, goalTop - pw / 2, gw + pw, pw);
    ctx.shadowBlur = 0;
  }

  function drawKeeper() {
    const k = G.keeper;
    const m = gh / BAR; // px per metre
    const idle = G.phase === "aim" || G.phase === "runup" && !G.dove;
    const sway = idle ? Math.sin(G.time * 1.6) * 0.15 : 0;
    const hop = idle ? Math.abs(Math.sin(G.time * 5)) * 0.05 : 0;
    const p = m2s(k.x + sway, k.y + hop);
    const ground = m2s(k.x + sway, 0);

    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ctx.beginPath();
    ctx.ellipse(ground.x, ground.y, 0.45 * m, 0.1 * m, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(k.angle);
    const s = k.stretch;
    const color = G.kp.color || "#ffc72c";
    ctx.lineCap = "round";

    // Legs
    ctx.strokeStyle = "#111";
    ctx.lineWidth = 0.15 * m;
    ctx.beginPath();
    ctx.moveTo(-0.1 * m, 0.3 * m);
    ctx.lineTo((-0.22 - 0.05 * s) * m, 0.95 * m);
    ctx.moveTo(0.1 * m, 0.3 * m);
    ctx.lineTo((0.22 + 0.05 * s) * m, 0.95 * m);
    ctx.stroke();

    // Arms (out to the side when ready, over the head when diving)
    const hx = 0.55 - 0.3 * s, hy = -0.05 - 0.9 * s;
    ctx.strokeStyle = color;
    ctx.lineWidth = 0.13 * m;
    ctx.beginPath();
    ctx.moveTo(-0.2 * m, -0.28 * m);
    ctx.lineTo(-hx * m, hy * m);
    ctx.moveTo(0.2 * m, -0.28 * m);
    ctx.lineTo(hx * m, hy * m);
    ctx.stroke();

    // Torso
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(-0.23 * m, -0.38 * m, 0.46 * m, 0.72 * m, 0.1 * m) : ctx.rect(-0.23 * m, -0.38 * m, 0.46 * m, 0.72 * m);
    ctx.fill();
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ctx.fillRect(-0.23 * m, 0.18 * m, 0.46 * m, 0.16 * m);

    // Head
    ctx.fillStyle = "#6b4226";
    ctx.beginPath();
    ctx.arc(0, -0.52 * m, 0.14 * m, 0, Math.PI * 2);
    ctx.fill();

    // Gloves
    ctx.fillStyle = "#d7ff3a";
    for (const sx of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(sx * hx * m, hy * m, 0.1 * m, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function ballAt(u) {
    // Screen position of the ball along its flight, u in [0, 1].
    const b = G.ball;
    const to = m2s(b.x, b.y);
    const bend = (b.curl * gw * 0.18 + G.wind * (gw / (HALF * 2)) * 0.6) * Math.sin(Math.PI * u);
    const lob = r0 * 2 * (1 - b.power) * Math.sin(Math.PI * u);
    return {
      x: spotX + (to.x - spotX) * u + bend,
      y: spotY + (to.y - spotY) * u - lob,
      gy: spotY + (gB - spotY) * u,
      r: r0 * (1 - 0.58 * u),
    };
  }

  function drawFlyingBall() {
    const b = G.ball;
    if (!b) {
      if (G.phase === "aim" || G.phase === "runup" || G.phase === "intro") {
        const pulse = G.phase === "aim" ? 1 + Math.sin(G.time * 5) * 0.08 : 1;
        drawShadow(spotX, spotY + r0 * 0.7, r0);
        drawBall(spotX, spotY, r0, 0);
        if (G.phase === "aim" && !G.drag) {
          ctx.strokeStyle = "rgba(255,199,44,0.7)";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(spotX, spotY, r0 * 1.7 * pulse, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
      return;
    }
    const u = Math.min(1, b.t / b.T);
    let p = ballAt(u);
    let alpha = 1;
    const rot = b.t * (10 + 20 * b.power) + b.curl * 3;
    if (b.post) {
      const t = b.post.t;
      const e = Math.min(1, t / 0.3);
      const dir = Math.sign(b.x) || 1;
      const base = ballAt(1);
      switch (b.post.type) {
        case "goal":
          p = { x: base.x, y: base.y + gh * 0.1 * e, gy: gB - gh * 0.16, r: base.r * (1 - 0.2 * e) };
          break;
        case "save": {
          const sd = Math.sign(b.x - G.keeper.x) || dir;
          p = { x: base.x + sd * W * 0.5 * t, y: base.y - gh * 1.2 * t + gh * 3 * t * t, gy: gB, r: base.r };
          alpha = Math.max(0, 1 - t / 1.1);
          break;
        }
        case "wide":
        case "over":
          p = { x: base.x + (b.post.type === "wide" ? dir * W * 0.3 * t : 0), y: base.y - gh * (b.post.type === "over" ? 1.4 : 0.2) * t, gy: gB - gh * 0.3 * t, r: base.r * (1 - 0.3 * e) };
          alpha = Math.max(0, 1 - t / 1.0);
          break;
        default: // post / bar: rebounds back towards the camera
          p = { x: base.x - dir * W * 0.2 * t, y: base.y + gh * 1.8 * t, gy: gB + gh * 1.8 * t, r: base.r * (1 + 0.8 * e) };
          alpha = Math.max(0, 1 - t / 1.2);
      }
    }
    ctx.globalAlpha = alpha;
    drawShadow(p.x, p.gy, p.r);
    drawBall(p.x, p.y, p.r, rot);
    ctx.globalAlpha = 1;
  }

  function drawShadow(x, y, r) {
    ctx.fillStyle = "rgba(0,0,0,0.3)";
    ctx.beginPath();
    ctx.ellipse(x, y, r * 0.9, r * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawBall(x, y, r, rot) {
    const sk = S.skin();
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = sk.a;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.clip();
    ctx.rotate(rot);
    ctx.fillStyle = sk.b;
    const spots = [[0, 0, 0.36], [0.72, 0.3, 0.3], [-0.72, 0.3, 0.3], [0.1, -0.8, 0.3], [0.5, 0.85, 0.28], [-0.5, 0.85, 0.28], [-0.7, -0.6, 0.26], [0.75, -0.55, 0.26]];
    for (const [sx, sy, sr] of spots) {
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
        ctx.lineTo(sx * r + Math.cos(a) * sr * r, sy * r + Math.sin(a) * sr * r);
      }
      ctx.fill();
    }
    ctx.restore();
    const shade = ctx.createRadialGradient(x - r * 0.35, y - r * 0.35, r * 0.1, x, y, r);
    shade.addColorStop(0, "rgba(255,255,255,0.35)");
    shade.addColorStop(1, "rgba(0,0,0,0.3)");
    ctx.fillStyle = shade;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawShooter() {
    const sh = G.shooter;
    const u = Math.min(1, sh.runT / sh.runDur);
    const kicked = G.phase !== "runup";
    const fx = spotX - W * 0.22 * (1 - u) - r0 * 1.6;
    const fy = spotY + H * 0.12 * (1 - u) + r0 * 1.2;
    const h = r0 * 7;
    const run = kicked ? 0 : Math.sin(sh.runT * 14);
    // The tell: the body leans during the last part of the run-up.
    const leanAmt = u > 0.55 ? (u - 0.55) / 0.45 : 0;
    const lean = (kicked ? 1 : leanAmt) * sh.lean * 0.22;
    ctx.save();
    ctx.translate(fx, fy);
    ctx.fillStyle = "rgba(0,0,0,0.3)";
    ctx.beginPath();
    ctx.ellipse(0, 0, h * 0.2, h * 0.05, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineCap = "round";
    ctx.strokeStyle = "#3b2416";
    ctx.lineWidth = h * 0.08;
    ctx.beginPath();
    ctx.moveTo(-h * 0.06, -h * 0.45);
    ctx.lineTo(-h * 0.08 + run * h * 0.08, 0);
    ctx.moveTo(h * 0.06, -h * 0.45);
    ctx.lineTo(h * 0.08 - run * h * 0.08 + (kicked ? h * 0.14 : 0), kicked ? -h * 0.12 : 0);
    ctx.stroke();
    ctx.rotate(lean);
    ctx.fillStyle = "#f5f5f5";
    ctx.fillRect(-h * 0.13, -h * 0.55, h * 0.26, h * 0.14);
    ctx.fillStyle = "#008751";
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(-h * 0.16, -h * 0.9, h * 0.32, h * 0.4, h * 0.05) : ctx.rect(-h * 0.16, -h * 0.9, h * 0.32, h * 0.4);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.font = `900 ${h * 0.2}px Anton, Impact, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("9", 0, -h * 0.7);
    ctx.strokeStyle = "#3b2416";
    ctx.lineWidth = h * 0.07;
    ctx.beginPath();
    ctx.moveTo(-h * 0.16, -h * 0.85);
    ctx.lineTo(-h * 0.26, -h * 0.6 + run * h * 0.05);
    ctx.moveTo(h * 0.16, -h * 0.85);
    ctx.lineTo(h * 0.26, -h * 0.6 - run * h * 0.05);
    ctx.stroke();
    ctx.fillStyle = "#1a1a1a";
    ctx.beginPath();
    ctx.arc(0, -h * 1.0, h * 0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawDrag() {
    const d = G.drag;
    if (!d || d.pts.length < 2) return;
    const pts = d.pts;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    for (let i = 1; i < pts.length; i++) {
      ctx.strokeStyle = `rgba(255,255,255,${0.15 + 0.6 * (i / pts.length)})`;
      ctx.lineWidth = 3 + 5 * (i / pts.length);
      ctx.beginPath();
      ctx.moveTo(pts[i - 1].x, pts[i - 1].y);
      ctx.lineTo(pts[i].x, pts[i].y);
      ctx.stroke();
    }
    if (!diff.reticle) return;
    const a = pts[0], b = pts[pts.length - 1];
    const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy);
    if (len < 30 || dy > -20) return;
    const aim = aimFromSwipe(dx, dy, len, 0.5);
    const p = m2s(aim.x + G.wind, aim.y);
    const on = Math.abs(aim.x + G.wind) < HALF && aim.y < BAR;
    ctx.strokeStyle = on ? "rgba(255,199,44,0.95)" : "rgba(255,90,90,0.95)";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(p.x, p.y, r0 * 0.7, 0, Math.PI * 2);
    ctx.moveTo(p.x - r0, p.y);
    ctx.lineTo(p.x + r0, p.y);
    ctx.moveTo(p.x, p.y - r0);
    ctx.lineTo(p.x, p.y + r0);
    ctx.stroke();
  }

  function drawTapMark() {
    const t = G.tapMark;
    if (!t || t.t > 0.6) return;
    ctx.strokeStyle = `rgba(255,199,44,${1 - t.t / 0.6})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(t.x, t.y, 10 + t.t * 60, 0, Math.PI * 2);
    ctx.stroke();
  }

  // ---------- DOM: HUD, banners, overlays ----------
  const $ = (id) => document.getElementById(id);
  const MODE_TITLES = { daily: `Daily Challenge #${today}`, quick: "Quick Shootout", keeper: "Be the Keeper", friend: "Friend Challenge" };

  function updateHud() {
    $("hudTitle").textContent = MODE_TITLES[mode];
    $("hudCoins").textContent = `🪙 ${st.coins}`;
    const shots = $("hudShots");
    if (mode === "quick") {
      shots.innerHTML = `<span class="hud-score">${G.score}</span> <span>${"❤️".repeat(Math.max(0, G.lives))}${"🖤".repeat(3 - Math.max(0, G.lives))}</span> <span class="hud-lv">LV ${G.level}</span>`;
    } else {
      const emo = { G: mode === "keeper" ? "⚽" : "⚽", S: "🧤", M: "❌" };
      let html = "";
      for (let i = 0; i < 5; i++) {
        const c = G.results[i];
        html += `<span class="dot ${i === G.shot && G.phase !== "over" ? "cur" : ""}">${c ? emo[c] : ""}</span>`;
      }
      shots.innerHTML = html;
    }
    const kEl = $("hudKeeper");
    if (mode === "keeper") kEl.innerHTML = `<b>You're in goal</b> · watch the lean`;
    else kEl.innerHTML = `<i style="background:${G.kp.color}"></i><b>${G.kp.name}</b> · ${G.kp.blurb || ""}`;
    const wEl = $("hudWind");
    if (G.wind) {
      wEl.textContent = `💨 ${G.wind < 0 ? "←" : "→"} ${Math.round(Math.abs(G.wind) * 25)} km/h`;
      wEl.hidden = false;
    } else wEl.hidden = true;
  }

  function showBanner(text, cls) {
    const el = $("banner");
    el.textContent = text;
    el.className = "banner show " + cls;
    clearTimeout(showBanner.t);
    showBanner.t = setTimeout(() => (el.className = "banner"), 1400);
  }

  function showHint(text) {
    const el = $("hint");
    el.textContent = text;
    el.classList.add("show");
  }
  G.hideHint = () => $("hint").classList.remove("show");

  function introHtml() {
    const how = mode === "keeper"
      ? `<li>🏃 Watch the shooter's run-up — their body <b>leans</b> towards where they'll shoot (usually…)</li>
         <li>👆 <b>Tap</b> the goal where you want to dive</li>
         <li>⚠️ Dive too early and they'll send you the wrong way</li>`
      : `<li>☝️ <b>Swipe up</b> from the ball to shoot</li>
         <li>📏 Longer swipe = higher shot. Too long = over the bar</li>
         <li>⚡ Faster swipe = harder to save, but less accurate</li>
         <li>🌀 <b>Curve</b> your swipe to bend it and fool the keeper</li>
         <li>🧠 Keepers <b>learn your habits</b>. Mix it up!</li>`;
    let lead = "";
    if (mode === "daily") lead = `<p class="lead">Same 5 penalties for everyone today. One attempt. Make it count.</p>`;
    if (mode === "quick") lead = `<p class="lead">Keep scoring. Three misses and you're out. Keepers get sharper every 5 goals. Difficulty: <b>${diff.label}</b></p>`;
    if (mode === "keeper") lead = `<p class="lead">Five penalties. Stop as many as you can.</p>`;
    if (mode === "friend") {
      lead = friend
        ? `<p class="lead"><b>${escapeHtml(friend.n)}</b> scored <b>${friend.s}/5</b></p><div class="emoji-row">${S.emojiRow(friend.r)}</div><p class="lead">Same keepers, same wind. Can you beat it?</p>`
        : `<p class="lead">Take 5 penalties, then send the link to a friend. They face the same keepers and wind.</p>`;
    }
    return `<h2>${MODE_TITLES[mode]}</h2>${lead}<ul class="how">${how}</ul>`;
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  }

  function showResults(result, score) {
    const box = $("resultsBody");
    const emojis = mode === "keeper"
      ? [...result].map((c) => (c === "G" ? "⚽" : c === "S" ? "🧤" : "❌")).join("")
      : S.emojiRow(result);
    let title, big, sub, actions = "";
    const streak = S.currentStreak();

    if (mode === "daily") {
      title = `Daily Challenge #${today}`;
      big = `${score}/5`;
      sub = score === 5 ? "Perfect! You're today's Penalty King 👑" : score >= 4 ? "Clinical finishing 🔥" : score >= 2 ? "Not bad. Come back tomorrow for revenge." : "The keepers won today…";
      actions = `
        <button class="btn btn-primary" id="shareBtn">Share result 📲</button>
        <button class="btn btn-ghost" id="challengeBtn">🤝 Challenge a friend</button>
        <a class="btn btn-ghost" href="play.html?mode=quick">⚡ Keep practising</a>`;
    } else if (mode === "quick") {
      title = "Quick Shootout";
      big = String(score);
      const best = st.stats.quickBest;
      sub = score >= best && score > 0 ? "New personal best! 🏆" : `Best: ${best}`;
      actions = `
        <button class="btn btn-primary" id="againBtn">Play again</button>
        <button class="btn btn-ghost" id="shareBtn">Share 📲</button>`;
    } else if (mode === "keeper") {
      title = "Be the Keeper";
      big = `${score}/5`;
      sub = score >= 4 ? "Brick wall! 🧱" : score >= 2 ? "Solid shot-stopping" : "Hard day in goal…";
      actions = `
        <button class="btn btn-primary" id="againBtn">Play again</button>
        <button class="btn btn-ghost" id="shareBtn">Share 📲</button>`;
    } else {
      title = "Friend Challenge";
      big = `${score}/5`;
      if (friend) {
        const res = score > friend.s ? "You win! 🏆" : score === friend.s ? "It's a draw 🤝" : `${escapeHtml(friend.n)} wins this time`;
        sub = `You ${score} – ${friend.s} ${escapeHtml(friend.n)} · ${res}`;
      } else sub = "Now send it to a friend and see if they can beat you";
      actions = `
        <button class="btn btn-primary" id="challengeBtn">${friend ? "Send rematch 🔁" : "Send challenge 🤝"}</button>
        <a class="btn btn-ghost" href="play.html?mode=friend">New challenge</a>`;
    }

    box.innerHTML = `
      <div class="res-title">${title}</div>
      <div class="emoji-row big">${emojis}</div>
      <div class="res-big">${big}</div>
      <div class="res-sub">${sub}</div>
      <div class="res-stats">
        <span>🪙 +${G.coins}</span>
        ${mode === "daily" ? `<span>🔥 ${streak} day streak</span>` : ""}
      </div>
      <div class="res-actions">${actions}<a class="btn btn-link" href="index.html">Home</a></div>`;
    $("results").classList.add("show");

    const shareBtn = $("shareBtn");
    if (shareBtn) {
      shareBtn.onclick = () => {
        const home = location.href.replace(/[^/]*([?#].*)?$/, "") + "index.html";
        let text, card;
        if (mode === "daily") {
          text = `Penalty King #${today} ${emojis} ${score}/5${streak > 1 ? `\n🔥 ${streak} day streak` : ""}`;
          card = { title: `Daily Challenge #${today}`, result, big: `${score}/5`, subtitle: streak > 1 ? `🔥 ${streak} day streak` : "Can you beat me?", footer: "Play free · no download" };
        } else if (mode === "quick") {
          text = `I scored ${score} straight in Penalty King Quick Shootout ⚽ Beat that!`;
        } else {
          text = `I stopped ${score}/5 penalties in Penalty King 🧤 ${emojis}`;
        }
        PK.share.shareResult({ text, url: home, card: mode === "keeper" ? null : card });
      };
    }
    const chBtn = $("challengeBtn");
    if (chBtn) {
      chBtn.onclick = () => {
        if (!st.name) {
          const n = prompt("Your name (so your friend knows who challenged them):", "");
          if (n) { st.name = n.trim().slice(0, 20); S.save(); }
        }
        const url = PK.share.challengeLink({ seed, result, name: st.name });
        const text = friend
          ? `Rematch! I scored ${score}/5 ${emojis} on Penalty King. Same keepers, same wind 👇`
          : `I scored ${score}/5 ${emojis} on Penalty King. Same keepers, same wind — can you beat me? 👇`;
        PK.share.shareResult({ text, url });
      };
    }
    const again = $("againBtn");
    if (again) again.onclick = () => location.reload();
  }

  // ---------- Input ----------
  function pos(e) {
    const r = canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top, t: performance.now() };
  }
  canvas.addEventListener("pointerdown", (e) => {
    PK.sfx.unlock();
    const p = pos(e);
    if (G.phase === "aim") {
      G.drag = { pts: [p] };
      canvas.setPointerCapture(e.pointerId);
    } else if (mode === "keeper" && (G.phase === "runup" || G.phase === "flight")) {
      keeperTap(p.x, p.y);
      G.hideHint();
    }
  });
  canvas.addEventListener("pointermove", (e) => {
    if (!G.drag) return;
    const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
    for (const ev of evs) G.drag.pts.push(pos(ev));
  });
  const endDrag = () => { if (G.drag) finishSwipe(); };
  canvas.addEventListener("pointerup", endDrag);
  canvas.addEventListener("pointercancel", () => (G.drag = null));

  window.addEventListener("resize", layout);

  // ---------- Boot ----------
  layout();
  updateHud();
  $("introBody").innerHTML = introHtml();

  if (mode === "daily" && st.daily[today]) {
    // Already played today: show the result instead of letting them replay.
    $("intro").classList.remove("show");
    G.results = st.daily[today].r;
    G.phase = "over";
    showResults(G.results, st.daily[today].score);
    $("resultsBody").insertAdjacentHTML("afterbegin", `<div class="res-note">You've played today. Next challenge at midnight UTC.</div>`);
  } else {
    $("kickoff").onclick = () => {
      PK.sfx.unlock();
      PK.sfx.whistle();
      PK.sfx.crowd(true);
      $("intro").classList.remove("show");
      startShot();
    };
  }
  requestAnimationFrame(frame);

  // Exposed for automated testing.
  PK.game = { G, shoot, update, startShot, m2s, keeperTap, get layout() { return { W, H, gw, gh, spotX, spotY, gB, goalTop }; } };
})();
