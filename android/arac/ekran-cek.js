// Play Store telefon ekran görüntüleri (1080×1920) — sistemdeki Chrome ile, canlı siteden.
const { chromium } = require(process.env.PW || "playwright-core");
const path = require("node:path");
const SAYFALAR = [["1-ana-menu", "/"], ["2-tarot", "/tarot"], ["3-kahve-fali", "/kahve-fali"], ["4-melek-sayilari", "/melek-sayilari"], ["5-rehber", "/rehber"], ["6-akrep-burcu", "/rehber/burclar/akrep"]];
(async () => {
  const tarayici = await chromium.launch({ channel: "chrome" });
  const bag = await tarayici.newContext({ viewport: { width: 360, height: 640 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, locale: "tr-TR",
    userAgent: "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36" });
  // Uyarı penceresi her girişte açılır; ekran görüntüsünde onaylanmış sayılsın.
  await bag.addInitScript(() => { try { sessionStorage.setItem("ezo-bilgi", "2026-10-07"); } catch {} });
  for (const [ad, yol] of SAYFALAR) {
    const s = await bag.newPage();
    await s.goto(`https://ezoter.ist${yol}`, { waitUntil: "networkidle" });
    await s.waitForTimeout(1500);
    // Alttaki ziyaret sayacı mağaza görselinde görünmesin.
    await s.addStyleTag({ content: ".ezo-sayac { display: none !important; }" });
    await s.waitForTimeout(200);
    await s.screenshot({ path: path.join(__dirname, "../magaza/ekranlar", `${ad}.png`) });
    console.log(ad);
    await s.close();
  }
  await tarayici.close();
})().catch((e) => { console.error(e); process.exit(1); });
