// Ziyaretçi sayacı (Murat 2026-10-12, quiz.ist'teki "babadan kalma" sayacın eşi): sayfa açılır açılmaz sunucuya bir vuruş
// atar, altta herkese görünür: bugünkü farklı tarayıcı, açılış ve toplam. Yalnız sayı tutulur; kimlik, IP, çerez saklanmaz.
// Murat 2026-10-14: ziyaretçinin nerede bıraktığı — her sayfada giriş/çıkış, kalma süresi, kaydırma derinliği, tıklama.
// Yine yalnız günlük sayaçlar (sayfa başına); kişiye bağlı kayıt tutulmaz.
(() => {
  if (window.__ezoSayac) return;
  window.__ezoSayac = true;
  const gun = new Date().toLocaleDateString("tr-TR", { timeZone: "Europe/Istanbul" });
  let tekil = true;
  try { tekil = localStorage.getItem("ezo_sayac_gun") !== gun; if (tekil) localStorage.setItem("ezo_sayac_gun", gun); } catch { /* özel pencere */ }
  let kaynak = "";
  try {
    const p = new URLSearchParams(location.search); const ref = document.referrer || ""; const utm = (p.get("utm_source") || "").toLowerCase();
    // Murat 2026-10-14: YouTube reklamı da Google Ads'ten (gclid) gelir; YouTube'dan geldiyse ayrı sayılır
    if (utm === "gads" || p.has("gclid")) kaynak = /youtube\.|youtu\.be/i.test(ref) || /youtube|yt/.test((p.get("utm_medium") || "") + (p.get("utm_campaign") || "")) ? "gads_youtube" : "gads";
    else if (/^(instagram|ig)$/.test(utm) || /(^|\.)instagram\.com/i.test(ref) || p.has("fbclid")) kaynak = "instagram";
    else if (/youtube\.|youtu\.be/i.test(ref) || /youtube|yt/.test(utm)) kaynak = "youtube";
    else if (/(^|\.)google\./i.test(ref)) kaynak = "google";
  } catch { /* yok say */ }
  const sayfa = location.pathname || "/";
  let icGiris = false;                       // önceki sayfadan site içi bağlantıyla mı gelindi
  try { icGiris = sessionStorage.getItem("ezo_ic") === "1"; sessionStorage.removeItem("ezo_ic"); } catch { /* yok say */ }
  fetch("/api/sayac", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tekil, kaynak, sayfa, giris: !icGiris }), credentials: "same-origin" })
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

  // Çıkış: görünür kalınan süre, en derin kaydırma (%), tıklandı mı, site içi bağlantıyla mı ayrıldı
  let gorunur = document.visibilityState === "visible" ? Date.now() : 0; let sure = 0; let derin = 0; let tik = false; let ic = false; let gitti = false;
  addEventListener("scroll", () => {
    const h = Math.max(1, document.documentElement.scrollHeight - innerHeight);
    derin = Math.max(derin, Math.min(100, Math.round((scrollY / h) * 100)));
  }, { passive: true });
  addEventListener("click", (e) => {
    tik = true;
    const a = e.target.closest && e.target.closest("a[href]");
    if (a && a.origin === location.origin && a.pathname !== location.pathname) { ic = true; try { sessionStorage.setItem("ezo_ic", "1"); } catch { /* yok say */ } }
  }, true);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") gorunur = Date.now();
    else if (gorunur) { sure += Date.now() - gorunur; gorunur = 0; }
  });
  addEventListener("pagehide", () => {
    if (gitti) return; gitti = true;
    if (gorunur) sure += Date.now() - gorunur;
    if (document.documentElement.scrollHeight <= innerHeight + 4) derin = 100;
    try { navigator.sendBeacon("/api/sayac/cikis", new Blob([JSON.stringify({ sayfa, sn: Math.round(sure / 1000), derin, tik, ic })], { type: "application/json" })); } catch { /* yok say */ }
  });
})();
