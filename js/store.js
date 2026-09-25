// Penalty King — persistent player state, daily challenge seeding, and helpers.
// Everything lives in localStorage; if storage is unavailable the game still
// works for the current session.
(function () {
  const PK = (window.PK = window.PK || {});
  const KEY = "pk_v1";
  const LAUNCH = Date.UTC(2026, 8, 1);
  const DAY_MS = 86400000;

  const DEFAULT = {
    name: "",
    difficulty: "pro",
    sound: true,
    haptics: true,
    coins: 0,
    skin: "classic",
    owned: ["classic"],
    streak: 0,
    bestStreak: 0,
    lastDaily: 0, // day number of the last completed daily challenge
    daily: {}, // dayNo -> { r: "GGSGM", score: 4 }
    zones: [0, 0, 0, 0, 0, 0], // how often the player shoots at each zone
    trans: new Array(36).fill(0), // zone -> next zone transitions
    lastZone: -1,
    stats: {
      shots: 0, goals: 0, topBins: 0, woodwork: 0,
      faced: 0, saves: 0, quickBest: 0, keeperBest: 0,
    },
  };

  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  function load() {
    const s = clone(DEFAULT);
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const saved = JSON.parse(raw);
        Object.assign(s, saved);
        s.stats = Object.assign(clone(DEFAULT.stats), saved.stats || {});
        if (!Array.isArray(s.zones) || s.zones.length !== 6) s.zones = clone(DEFAULT.zones);
        if (!Array.isArray(s.trans) || s.trans.length !== 36) s.trans = clone(DEFAULT.trans);
      }
    } catch (e) { /* storage unavailable or corrupt */ }
    return s;
  }

  const state = load();

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* ignore */ }
  }

  function dayNo(now = Date.now()) {
    return Math.floor((now - LAUNCH) / DAY_MS) + 1;
  }

  // Current streak, treating a missed day as a broken streak.
  function currentStreak() {
    return state.lastDaily >= dayNo() - 1 ? state.streak : 0;
  }

  function completeDaily(day, result) {
    if (state.daily[day]) return;
    const score = [...result].filter((c) => c === "G").length;
    state.daily[day] = { r: result, score };
    state.streak = state.lastDaily === day - 1 ? state.streak + 1 : 1;
    state.lastDaily = day;
    state.bestStreak = Math.max(state.bestStreak, state.streak);
    save();
  }

  // Record where the player shot so the keeper can learn their habits.
  function recordShotZone(zone) {
    if (zone < 0) return;
    state.zones[zone] += 1;
    if (state.lastZone >= 0) state.trans[state.lastZone * 6 + zone] += 1;
    state.lastZone = zone;
    // Slowly forget old habits so the model follows the player's current style.
    const total = state.zones.reduce((a, b) => a + b, 0);
    if (total > 60) {
      state.zones = state.zones.map((z) => z * 0.9);
      state.trans = state.trans.map((z) => z * 0.9);
    }
  }

  // Deterministic PRNG so every player gets the same daily challenge.
  function rng(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function dailySeed(day) { return (day * 7919 + 104729) >>> 0; }

  const RESULT_EMOJI = { G: "⚽", S: "🧤", M: "❌" };
  function emojiRow(r) { return [...r].map((c) => RESULT_EMOJI[c] || "·").join(""); }

  const SKINS = [
    { id: "classic", name: "Classic", price: 0, a: "#ffffff", b: "#111111" },
    { id: "naija", name: "Naija Green", price: 0, streak: 3, a: "#ffffff", b: "#008751" },
    { id: "gold", name: "Golden Boot", price: 150, a: "#ffd54a", b: "#8a5a00" },
    { id: "fire", name: "Fireball", price: 300, a: "#ff7a1a", b: "#7a1200" },
    { id: "night", name: "Night Match", price: 500, a: "#1d2340", b: "#7cf3ff" },
    { id: "diamond", name: "Diamond", price: 1000, a: "#dff6ff", b: "#3a7bd5" },
  ];

  function skin() { return SKINS.find((s) => s.id === state.skin) || SKINS[0]; }

  PK.store = {
    state, save, dayNo, currentStreak, completeDaily, recordShotZone,
    rng, dailySeed, emojiRow, SKINS, skin, LAUNCH, DAY_MS,
  };

  // Small shared UI helper.
  PK.toast = function (msg, ms = 2200) {
    let el = document.getElementById("toast");
    if (!el) {
      el = document.createElement("div");
      el.id = "toast";
      el.className = "toast";
      el.setAttribute("role", "status");
      el.setAttribute("aria-live", "polite");
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.classList.add("show");
    clearTimeout(PK._toastTimer);
    PK._toastTimer = setTimeout(() => el.classList.remove("show"), ms);
  };

  PK.vibrate = function (pattern) {
    if (state.haptics && navigator.vibrate) {
      try { navigator.vibrate(pattern); } catch (e) { /* ignore */ }
    }
  };

  if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
    window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
  }
})();
