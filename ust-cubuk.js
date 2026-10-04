// Bölüm sayfalarının üst çubuğu (ana menüdeki banner sistemiyle aynı, Murat 2026-10-03):
// banner "← Ana Menü" ile kullanıcı butonu arasını doldurur; sağda 👤 kullanıcı menüsü (arşiv, profil,
// yöneticiye yönetim paneli, çıkış). Çubuğun yüksekliği --ust değişkenine yazılır; yapışkan öğeler buna göre durur.
(() => {
  const cubuk = document.querySelector(".topbar");
  if (!cubuk) return;

  const yukseklikYaz = () => document.documentElement.style.setProperty("--ust", `${Math.round(cubuk.getBoundingClientRect().height)}px`);
  yukseklikYaz();
  window.addEventListener("resize", yukseklikYaz);
  cubuk.querySelector(".topbar-logo img")?.addEventListener("load", yukseklikYaz);
  if (window.ResizeObserver) new ResizeObserver(yukseklikYaz).observe(cubuk, { box: "border-box" });

  // Kullanıcı menüsü: sayfanın eski ad alanı (#topbarUser) gizli kalır, yerine bu kutu konur.
  const kutu = document.createElement("div");
  kutu.className = "ust-hesap";
  cubuk.append(kutu);

  fetch("/api/me", { credentials: "same-origin" })
    .then((r) => (r.ok ? r.json() : null))
    .catch(() => null)
    .then((data) => {
      const user = data?.user;
      if (!user) {
        const giris = document.createElement("a");
        giris.className = "ust-hesap-dugme ust-giris";
        giris.href = `/login?next=${encodeURIComponent(location.pathname)}`;
        giris.textContent = "Giriş";
        kutu.replaceChildren(giris);
        return;
      }
      const kim = user.name || user.email;
      const dugme = document.createElement("button");
      dugme.type = "button";
      dugme.className = "ust-hesap-dugme";
      dugme.title = kim;
      dugme.setAttribute("aria-label", `${kim} · kullanıcı menüsü`);
      dugme.setAttribute("aria-haspopup", "menu");
      dugme.setAttribute("aria-expanded", "false");
      dugme.textContent = "👤";

      const menu = document.createElement("div");
      menu.className = "ust-menu";
      menu.setAttribute("role", "menu");
      menu.hidden = true;
      const baslik = document.createElement("div");
      baslik.className = "ust-menu-baslik";
      const ad = document.createElement("b");
      ad.textContent = user.name || "Hesabım";
      const eposta = document.createElement("small");
      eposta.textContent = user.email;
      baslik.append(ad, eposta);
      const oge = (metin, href) => {
        const a = document.createElement("a");
        a.href = href;
        a.setAttribute("role", "menuitem");
        a.textContent = metin;
        return a;
      };
      const cikis = document.createElement("button");
      cikis.type = "button";
      cikis.setAttribute("role", "menuitem");
      cikis.className = "ust-menu-cikis";
      cikis.textContent = "⎋ Çıkış yap";
      cikis.addEventListener("click", () => {
        fetch("/api/logout", { method: "POST", credentials: "same-origin" }).finally(() => window.location.assign("/"));
      });
      menu.append(baslik, oge("🏠 Ana menü", "/"), oge("🗂️ Kişisel arşivim", "/arsiv"), oge("👤 Profilim", "/arsiv#profil"),
        ...(user.yonetici ? [oge("⚙️ Yönetim paneli", "/yonetim")] : []), cikis);

      const ac = (acik) => {
        menu.hidden = !acik;
        dugme.setAttribute("aria-expanded", String(acik));
      };
      dugme.addEventListener("click", (e) => { e.stopPropagation(); ac(menu.hidden); });
      document.addEventListener("click", (e) => { if (!menu.hidden && !menu.contains(e.target)) ac(false); });
      document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !menu.hidden) { ac(false); dugme.focus(); } });
      kutu.replaceChildren(dugme, menu);
    });

  // Alt satırlar (ana sayfadakiyle aynı): telif, Gizlilik Politikası, Kullanım Koşulları, İletişim, yapay zekâlar.
  const alt = document.createElement("footer");
  alt.className = "alt-satir";
  alt.innerHTML = `
    <p class="alt-baglantilar"><span>Tüm hakları saklıdır © 2026</span><a href="/gizlilik">Gizlilik Politikası</a><a href="/kullanim-kosullari">Kullanım Koşulları</a><button type="button" aria-haspopup="dialog">İletişim</button></p>
    <p class="alt-ai" aria-label="Kullandığımız yapay zekâlar"><span>GEMMA4</span><span>OpenAI</span><span>Claude</span><span>Grok</span><span>RAZECE.AI</span></p>`;
  const pencere = document.createElement("dialog");
  pencere.className = "alt-iletisim";
  pencere.setAttribute("aria-label", "İletişim");
  pencere.innerHTML = `
    <button type="button" class="alt-iletisim-kapat" aria-label="Kapat">✕</button>
    <h2>İletişim</h2>
    <p class="alt-iletisim-marka">EZOTER.IST</p>
    <p>VÜCUT DESTEK SİSTEM MEDİKAL TİCARET LİMİTED ŞİRKETİ</p>
    <p>Merkez Mah. Abide-i Hürriyet Cad. No: 211 İç Kapı No: 64 Şişli / İstanbul</p>
    <p>Şişli V.D. 9261011879</p>
    <p><a href="https://wa.me/905323300293" target="_blank" rel="noopener">WhatsApp 532 330 02 93</a><br /><a href="mailto:bilgi@ezoter.ist">bilgi@ezoter.ist</a></p>
    <a class="alt-iletisim-razece" href="https://razece.ai" target="_blank" rel="noopener" aria-label="RAZECE.AI"><img src="/logo/razece.webp?v=2" alt="RAZECE.AI — Artificial Intelligence for People" width="1000" height="153" loading="lazy" /></a>`;
  alt.querySelector("button").addEventListener("click", () => pencere.showModal());
  pencere.querySelector(".alt-iletisim-kapat").addEventListener("click", () => pencere.close());
  pencere.addEventListener("click", (e) => { if (e.target === pencere) pencere.close(); });
  document.body.append(alt, pencere);

  // Yapay zekâ bekleme animasyonu (Murat 2026-10-03): /api/ isteği 0,7 sn'den uzun sürerse ortada göz-gezegenler
  // görseli ve etrafında dönen çark gösterilir. Kısa işler (giriş, liste, silme, kayıt) hariç; sayfayı kilitlemez.
  const HARIC = /^\/api\/(me|logout|login|profil|sifre|ayarlar|yonetim|arsiv|kontor)\b|\/(gunluk|durum|sil|liste|niyet-sil|niyet-durum|gorsel|panel|kayit)(\/|$)/;
  const bekleme = document.createElement("div");
  bekleme.className = "ai-bekleme";
  bekleme.hidden = true;
  bekleme.setAttribute("role", "status");
  bekleme.setAttribute("aria-live", "polite");
  const cizgiler = Array.from({ length: 24 }, (_, i) => {
    const a = (i * 15 * Math.PI) / 180;
    const ic = i % 2 ? 86 : 82;
    return `<line x1="${(100 + ic * Math.cos(a)).toFixed(1)}" y1="${(100 + ic * Math.sin(a)).toFixed(1)}" x2="${(100 + 93 * Math.cos(a)).toFixed(1)}" y2="${(100 + 93 * Math.sin(a)).toFixed(1)}" />`;
  }).join("");
  const noktalar = Array.from({ length: 8 }, (_, i) => {
    const a = (i * 45 * Math.PI) / 180;
    return `<circle cx="${(100 + 74 * Math.cos(a)).toFixed(1)}" cy="${(100 + 74 * Math.sin(a)).toFixed(1)}" r="${i % 2 ? 2.2 : 3.4}" />`;
  }).join("");
  bekleme.innerHTML = `
    <div class="ai-bekleme-kutu">
      <svg class="ai-cark dis" viewBox="0 0 200 200" aria-hidden="true"><circle cx="100" cy="100" r="95" /><circle cx="100" cy="100" r="80" />${cizgiler}</svg>
      <svg class="ai-cark ic" viewBox="0 0 200 200" aria-hidden="true"><circle cx="100" cy="100" r="74" stroke-dasharray="3 7" />${noktalar}</svg>
      <img src="/bekleme/goz-gezegenler.webp?v=1" alt="" width="340" height="370" />
    </div>
    <p class="ai-bekleme-yazi">Yapay zekâ hazırlıyor<span class="ai-sure"></span></p>`;
  document.body.append(bekleme);
  let bekleyen = 0;
  let gosterZamani = null;
  let sayac = null;
  const sure = bekleme.querySelector(".ai-sure");
  const guncelle = () => {
    if (bekleyen > 0) {
      if (bekleme.hidden) {
        bekleme.hidden = false;
        const bas = Date.now();
        sure.textContent = "…";
        clearInterval(sayac);
        sayac = setInterval(() => {
          const sn = Math.round((Date.now() - bas) / 1000) + 1;
          sure.textContent = sn >= 3 ? `… ${sn} sn` : "…";
        }, 1000);
      }
    } else {
      bekleme.hidden = true;
      clearInterval(sayac);
    }
  };
  const asilFetch = window.fetch.bind(window);
  window.fetch = (girdi, ayar) => {
    let yol = "";
    try { yol = new URL(typeof girdi === "string" ? girdi : girdi.url, location.href).pathname; } catch { yol = ""; }
    // Ezo asistan sohbetinin kendi "yazıyor" balonu var; orada büyük animasyon gösterilmez.
    const izle = yol.startsWith("/api/") && !HARIC.test(yol) && location.pathname !== "/asistan";
    const istek = asilFetch(girdi, ayar);
    if (!izle) return istek;
    let sayildi = false;
    const zamanlayici = setTimeout(() => { sayildi = true; bekleyen += 1; guncelle(); }, 700);
    const bitti = () => {
      clearTimeout(zamanlayici);
      if (sayildi) { bekleyen = Math.max(0, bekleyen - 1); guncelle(); }
    };
    // Gövde okunana kadar değil, cevap başlıkları gelene kadar beklenir (ses/fotoğraf akışlarında yeterli).
    istek.then(bitti, bitti);
    return istek;
  };

  // Kontör rozetleri (Murat 2026-10-04): ücretli işlemi başlatan düğmenin ve "Uzman yorumu iste" düğmesinin sağ üst
  // köşesinde, yönetim panelinde girilen kontör sayısı. 0 ise rozet yok. Yalnız gösterim; kontör düşülmez.
  const ISLEM_DUGMESI = {
    "/astroloji": 'form button.btn-primary[type="submit"]',
    "/dogum-haritasi": "#readingButton",
    "/numeroloji": 'form button.btn-primary[type="submit"]',
    "/ruya": "#dreamSubmit",
    "/tarot": "#revealButton",
    "/kahve-fali": "#falSubmit",
    "/el-fali": "#falSubmit",
    "/yuz-okuma": "#falSubmit",
    "/fotograf-analizi": "#falSubmit",
    "/ask-uyumu": "#loveSubmit",
    "/melek-sayilari": "#personalSubmit",
    "/iching": "#askSubmit",
    "/run-taslari": "#revealButton",
    "/ay-takvimi": "#guideButton",
    "/cakralar": "#quizSubmit",
    "/kristaller": "#suggestSubmit",
    "/semboller": "#askSubmit",
    "/ruhsal-gunluk": "#reflectButton, #weekButton",
    "/asistan": "#sendButton",
    "/taslarla-dizim": "#analyzeButton",
    "/yuz-muzigi": "#playButton",
  };
  const UZMAN_DUGMESI = '#expertForm button[type="submit"]';
  fetch("/api/ayarlar/genel", { credentials: "same-origin" })
    .then((r) => (r.ok ? r.json() : null))
    .catch(() => null)
    .then((d) => {
      const f = d?.fiyatlar?.[location.pathname];
      if (!f) return;
      const kurallar = [];
      const rozet = (secici, sayi) => {
        if (!secici || !(sayi > 0)) return;
        const tek = secici.split(",").map((x) => x.trim());
        kurallar.push(`${tek.join(", ")} { position: relative; overflow: visible; }`);
        kurallar.push(`${tek.map((x) => `${x}::after`).join(", ")} { content: "${Number(sayi)}"; }`);
      };
      rozet(ISLEM_DUGMESI[location.pathname], f.islem);
      rozet(UZMAN_DUGMESI, f.uzman);
      if (!kurallar.length) return;
      const stil = document.createElement("style");
      stil.textContent = `${kurallar.join("\n")}
        ${[ISLEM_DUGMESI[location.pathname], UZMAN_DUGMESI].filter(Boolean).join(",").split(",").map((x) => `${x.trim()}::after`).join(", ")} {
          position: absolute; top: -9px; right: -9px; z-index: 2; min-width: 22px; height: 22px; padding: 0 6px; box-sizing: border-box;
          display: grid; place-items: center; border: 2px solid #1a1205; border-radius: 999px; color: #1a1205; background: #f3c26b;
          font: 800 0.72rem/1 Manrope, system-ui, sans-serif; letter-spacing: 0; text-transform: none; box-shadow: 0 2px 8px rgba(0,0,0,0.5); pointer-events: none;
        }`;
      document.head.append(stil);
    });
})();
