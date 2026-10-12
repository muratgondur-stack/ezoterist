// Ziyaretçi sayacı (Murat 2026-10-12, quiz.ist'teki "babadan kalma" sayacın eşi): sayfa açılır açılmaz sunucuya bir vuruş
// atar, altta herkese görünür: bugünkü farklı tarayıcı, açılış ve toplam. Yalnız sayı tutulur; kimlik, IP, çerez saklanmaz.
(() => {
  if (window.__ezoSayac) return;
  window.__ezoSayac = true;
  const gun = new Date().toLocaleDateString("tr-TR", { timeZone: "Europe/Istanbul" });
  let tekil = true;
  try { tekil = localStorage.getItem("ezo_sayac_gun") !== gun; if (tekil) localStorage.setItem("ezo_sayac_gun", gun); } catch { /* özel pencere */ }
  let kaynak = "";
  try {
    const p = new URLSearchParams(location.search); const ref = document.referrer || ""; const utm = (p.get("utm_source") || "").toLowerCase();
    if (utm === "gads" || p.has("gclid")) kaynak = "gads";
    else if (/^(instagram|ig)$/.test(utm) || /(^|\.)instagram\.com/i.test(ref) || p.has("fbclid")) kaynak = "instagram";
    else if (/youtube\.|youtu\.be/i.test(ref) || /youtube|yt/.test(utm)) kaynak = "youtube";
    else if (/(^|\.)google\./i.test(ref)) kaynak = "google";
  } catch { /* yok say */ }
  fetch("/api/sayac", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tekil, kaynak }), credentials: "same-origin" })
    .then((r) => (r.ok ? r.json() : null))
    .then((s) => {
      if (!s) return;
      const n = (x) => Number(x || 0).toLocaleString("tr-TR");
      const el = document.createElement("div");
      el.className = "ezo-sayac";
      el.title = `Bugün ${n(s.bugun)} açılış, ${n(s.bugunTekil)} farklı tarayıcı`;
      el.textContent = `👁 bugün ${n(s.bugunTekil)} (${n(s.bugun)} açılış) · toplam ${n(s.toplam)}`;
      el.style.cssText = "position:fixed;left:50%;bottom:6px;transform:translateX(-50%);z-index:5;pointer-events:none;"
        + "font:11px/1.4 ui-monospace,Menlo,monospace;color:rgba(255,255,255,.55);background:rgba(0,0,0,.28);"
        + "padding:2px 8px;border-radius:10px;white-space:nowrap;";
      document.body.append(el);
    })
    .catch(() => {});
})();
