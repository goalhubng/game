// Penalty King — share cards (image + text) and friend challenge links.
(function () {
  const PK = (window.PK = window.PK || {});

  function baseUrl() {
    return location.href.replace(/[^/]*([?#].*)?$/, "");
  }

  function challengeLink({ seed, result, name }) {
    const score = [...result].filter((c) => c === "G").length;
    const p = new URLSearchParams({ mode: "friend", seed: String(seed), r: result, s: String(score) });
    if (name) p.set("n", name.slice(0, 20));
    return baseUrl() + "play.html?" + p.toString();
  }

  function drawCard({ title, subtitle, result, big, footer }) {
    const c = document.createElement("canvas");
    c.width = 1080;
    c.height = 1350;
    const g = c.getContext("2d");
    for (let i = 0; i < 14; i++) {
      g.fillStyle = i % 2 ? "#14602f" : "#1c7a3d";
      g.fillRect(0, i * 100, 1080, 100);
    }
    const glow = g.createRadialGradient(540, 0, 50, 540, 0, 900);
    glow.addColorStop(0, "rgba(255,199,44,0.35)");
    glow.addColorStop(1, "rgba(255,199,44,0)");
    g.fillStyle = glow;
    g.fillRect(0, 0, 1080, 1350);

    g.textAlign = "center";
    g.fillStyle = "#fff";
    g.font = "110px serif";
    g.fillText("👑", 540, 190);
    g.font = "900 128px Anton, Impact, sans-serif";
    g.fillText("PENALTY", 540, 350);
    g.fillStyle = "#ffc72c";
    g.fillText("KING", 540, 480);

    g.fillStyle = "rgba(0,0,0,0.35)";
    roundRect(g, 90, 560, 900, 560, 48);
    g.fill();
    g.strokeStyle = "#ffc72c";
    g.lineWidth = 6;
    g.stroke();

    g.fillStyle = "#ffc72c";
    g.font = "800 44px Inter, system-ui, sans-serif";
    g.fillText(title.toUpperCase(), 540, 650);
    g.font = "120px serif";
    g.fillStyle = "#fff";
    g.fillText(PK.store.emojiRow(result), 540, 820);
    g.font = "900 150px Anton, Impact, sans-serif";
    g.fillText(big, 540, 1000);
    g.font = "600 40px Inter, system-ui, sans-serif";
    g.fillStyle = "rgba(255,255,255,0.8)";
    g.fillText(subtitle, 540, 1075);

    g.font = "800 46px Inter, system-ui, sans-serif";
    g.fillStyle = "#fff";
    g.fillText(footer, 540, 1230);
    return c;
  }

  function roundRect(g, x, y, w, h, r) {
    g.beginPath();
    g.moveTo(x + r, y);
    g.arcTo(x + w, y, x + w, y + h, r);
    g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r);
    g.arcTo(x, y, x + w, y, r);
    g.closePath();
  }

  // Share with an image when the device supports it, then text, then clipboard.
  async function shareResult({ text, url, card }) {
    const full = url ? `${text}\n${url}` : text;
    try {
      if (card && navigator.canShare) {
        const blob = await new Promise((res) => drawCard(card).toBlob(res, "image/png"));
        const file = new File([blob], "penalty-king.png", { type: "image/png" });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], text: full });
          return;
        }
      }
      if (navigator.share) {
        await navigator.share({ text: full });
        return;
      }
    } catch (e) {
      if (e && e.name === "AbortError") return;
    }
    try {
      await navigator.clipboard.writeText(full);
      PK.toast("Copied! Paste it in WhatsApp 📲");
    } catch (e) {
      prompt("Copy and share:", full);
    }
  }

  PK.share = { challengeLink, shareResult, drawCard };
})();
