// Bilgilendirme onayı (bilgilendirme-metin.js): ziyaretçiye siteye her girişte (tarayıcı sekmesi başına bir kez,
// sessionStorage) açılır ve onaylatılır; onaylamamış üyeye de. Yasal metin sayfalarında açılmaz
// (penceredeki bağlantılar onları yeni sekmede açar, okunabilsinler).
const bilgilendirmeKontrol = (user) => {
  if (/^\/(gizlilik|kullanim-kosullari|bilgilendirme)$/.test(location.pathname)) return;
  if (user?.anonim) {
    try { if (sessionStorage.getItem("ezo-bilgi") === user.bilgilendirmeSurumu) return; } catch { /* depolama kapalı: her sayfada sorulur */ }
  } else if (!user?.bilgilendirmeGerekli) return;
  const ac = () => window.Bilgilendirme?.onayIste(user);
  if (window.Bilgilendirme) return ac();
  const s = document.createElement("script");
  s.src = "/bilgilendirme-metin.js?v=3";
  s.onload = ac;
  document.head.append(s);
};

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

  // Geçmiş saklanmıyor, harici uzman yok (2026-10-07): bölümlerdeki defter/günlük listesi ve uzman kartı gizlenir.
  const gizle = document.createElement("style");
  gizle.textContent = 'section#gunluk, a[href="#gunluk"], #expertCard, .uzman-kart { display: none !important; }';
  document.head.append(gizle);

  // Kullanıcı menüsü: sayfanın eski ad alanı (#topbarUser) gizli kalır, yerine bu kutu konur.
  const kutu = document.createElement("div");
  kutu.className = "ust-hesap";
  cubuk.append(kutu);

  fetch("/api/me", { credentials: "same-origin" })
    .then((r) => (r.ok ? r.json() : null))
    .catch(() => null)
    .then((data) => {
      const user = data?.user;
      bilgilendirmeKontrol(user);
      // Üyelik yok (2026-10-07): ziyaretçiye giriş düğmesi ya da menü gösterilmez; menü yalnız giriş yapmış yöneticide.
      if (!user || user.anonim) return;
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
      menu.append(baslik, oge("🏠 Ana menü", "/"), oge("📜 Bilgilendirme", "/bilgilendirme"),
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
    <p class="alt-baglantilar"><span>Tüm hakları saklıdır © 2026</span><a href="/gizlilik">Gizlilik Politikası</a><a href="/kullanim-kosullari">Kullanım Koşulları</a><a href="/bilgilendirme">Bilgilendirme</a><button type="button" aria-haspopup="dialog">İletişim</button></p>
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
  // Genel ayarlar (fiyat rozetleri ve bekleme süreleri) tek istekle alınır.
  const genelAyarlar = fetch("/api/ayarlar/genel", { credentials: "same-origin" }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
  let beklemeSn = { hafif: 8, derin: 12 };
  genelAyarlar.then((d) => { if (d?.bekleme) beklemeSn = d.bekleme; });
  // Aşamalı bekleme yazıları (Murat 2026-10-04): her işlemin gerçekte yaptığı adımlar, bekleme süresine yayılarak.
  const ASAMALAR = {
    "/api/astroloji/harita": ["Doğum anındaki gökyüzü hesaplanıyor…", "Gezegenlerin burçları bulunuyor…", "Yükselen burcun belirleniyor…", "Haritan yorumlanıyor…"],
    "/api/dogum-haritasi/yorum": ["Gezegen konumların okunuyor…", "Evler ve açılar inceleniyor…", "Haritanın ana temaları çıkarılıyor…", "Derin yorumun yazılıyor…"],
    "/api/numeroloji/profil": ["Adının harfleri sayılara çevriliyor…", "Yaşam yolu sayın hesaplanıyor…", "Ruh ve kader sayıların bulunuyor…", "Sayıların yorumlanıyor…"],
    "/api/ruya/yorum": ["Rüyan okunuyor…", "Semboller ayıklanıyor…", "Duygular ve temalar eşleştiriliyor…", "Rüya yorumun yazılıyor…"],
    "/api/tarot/cek": ["Kartlar karıştırılıyor…", "Seçtiğin kartlar açılıyor…", "Açılımdaki yerleri okunuyor…", "Okuman yazılıyor…"],
    "/api/fal/bak": ["Fincan fotoğrafın inceleniyor…", "Telvedeki şekiller seçiliyor…", "Semboller yorumlanıyor…", "Falın yazılıyor…"],
    "/api/el-fali/bak": ["Avucunun hatları bulunuyor…", "Çizgilerin ölçülüyor…", "Tepeler ve el tipin inceleniyor…", "Falın yazılıyor…"],
    "/api/yuz-okuma/bak": ["Yüz haritan çıkarılıyor…", "Oranların ölçülüyor…", "Yüz hatların okunuyor…", "Yorumun yazılıyor…"],
    "/api/fotograf-analizi/bak": ["Fotoğrafın inceleniyor…", "Renkler ve semboller okunuyor…", "Enerji ve atmosfer değerlendiriliyor…", "Analizin yazılıyor…"],
    "/api/ask-uyumu/hesapla": ["İki doğum haritası hesaplanıyor…", "Güneş, Ay ve Venüs uyumu karşılaştırılıyor…", "İsimlerin sayıları eşleştiriliyor…", "Uyum yorumunuz yazılıyor…"],
    "/api/uzman/sanal": ["Uzmanın analizine bakıyor…", "Sembolleri ve işaretleri tartıyor…", "Sana özel yorumunu yazıyor…"],
    "/api/ebced/yorum": ["Harfler Osmanlı imlâsına çevriliyor…", "Ebced değerleri toplanıyor…", "Unsur dengen ve isim burcun bulunuyor…", "Vefkin çiziliyor…", "Yorumun yazılıyor…"],
    "/api/cifir/yorum": ["İsmin, anne adın ve sorun harflere ayrılıyor…", "Ebced toplamı hesaplanıyor…", "Tarh yapılıyor: 28, 12, 7 ve 4…", "Cevap harfleri çıkıyor…", "Vefk kuruluyor…", "Cifir yorumun yazılıyor…"],
    "/api/melek/yorum": ["Sayının titreşimi okunuyor…", "Melek mesajı dinleniyor…", "Mesajın yazılıyor…"],
    "/api/iching/yorum": ["Altıgram kuruluyor…", "Değişen çizgiler okunuyor…", "Kitabın bilgeliği yorumlanıyor…"],
    "/api/run/cek": ["Rünler torbadan çekiliyor…", "Taşların anlamları okunuyor…", "Açılımın yorumlanıyor…"],
    "/api/ay/rehber": ["Ay'ın evresi ve burcu hesaplanıyor…", "Döngünün enerjisi okunuyor…", "Sana özel rehberin hazırlanıyor…"],
    "/api/cakra/test": ["Cevapların değerlendiriliyor…", "Çakra dengen hesaplanıyor…", "Denge planın hazırlanıyor…"],
    "/api/kristal/oner": ["İhtiyacın dinleniyor…", "Kristaller taranıyor…", "Sana uygun taşlar seçiliyor…"],
    "/api/sembol/sor": ["Sembol arşivde aranıyor…", "Kültürlerdeki anlamları derleniyor…", "Sana özel anlamı yazılıyor…"],
    "/api/ruhsal/yansima": ["Sayfan okunuyor…", "Duygular ve temalar fark ediliyor…", "Yansıman yazılıyor…"],
    "/api/ruhsal/ozet": ["Haftanın sayfaları okunuyor…", "Tekrar eden temalar bulunuyor…", "Haftalık özetin yazılıyor…"],
    "/api/dizim/analiz": ["Taşların konumları ölçülüyor…", "Mesafeler ve gruplar hesaplanıyor…", "Dizimin bütünü okunuyor…", "Yansıman yazılıyor…"],
    "/api/dizim/karsilastir": ["İki dizim yan yana konuyor…", "Değişen mesafeler ölçülüyor…", "Karşılaştırman yazılıyor…"],
  };
  const DERIN = /^\/api\/(astroloji\/harita|dogum-haritasi\/yorum|numeroloji\/profil|ruya\/yorum|(fal|el-fali|yuz-okuma|fotograf-analizi)\/bak|ask-uyumu\/hesapla|ay\/rehber|ruhsal\/ozet|dizim\/(analiz|karsilastir))$/;
  let aktifYol = "";
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
    <p class="ai-bekleme-yazi">Yapay zekâ hazırlıyor…</p>`;
  document.body.append(bekleme);
  let bekleyen = 0;
  let asamaZamanlayici = null;
  const yazi = bekleme.querySelector(".ai-bekleme-yazi");
  const guncelle = () => {
    if (bekleyen > 0) {
      if (bekleme.hidden) {
        bekleme.hidden = false;
        // Aşamalar bekleme süresine yayılır (gösterim 0,7 sn sonra başladığı için süreden düşülür); son aşamada kalır.
        const liste = ASAMALAR[aktifYol] || ["Yapay zekâ hazırlıyor…"];
        const toplam = Math.max(3, (DERIN.test(aktifYol) ? beklemeSn.derin : beklemeSn.hafif) - 0.7);
        let i = 0;
        yazi.textContent = liste[0];
        clearInterval(asamaZamanlayici);
        if (liste.length > 1) {
          asamaZamanlayici = setInterval(() => {
            i += 1;
            if (i >= liste.length) { clearInterval(asamaZamanlayici); return; }
            yazi.classList.remove("ai-asama");
            void yazi.offsetWidth; // geçiş animasyonunu yeniden başlat
            yazi.classList.add("ai-asama");
            yazi.textContent = liste[i];
          }, (toplam * 1000) / liste.length);
        }
      }
    } else {
      bekleme.hidden = true;
      clearInterval(asamaZamanlayici);
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
    const zamanlayici = setTimeout(() => { sayildi = true; aktifYol = yol; bekleyen += 1; guncelle(); }, 700);
    const bitti = () => {
      clearTimeout(zamanlayici);
      if (sayildi) { bekleyen = Math.max(0, bekleyen - 1); guncelle(); }
    };
    // Gövde okunana kadar değil, cevap başlıkları gelene kadar beklenir (ses/fotoğraf akışlarında yeterli).
    istek.then(bitti, bitti);
    return istek;
  };

  // Kontör rozetleri (Murat 2026-10-04): ücretli işlemi başlatan düğmenin ve "Uzman yorumu iste" düğmesinin sağ üst
  // köşesinde, yönetim panelinde girilen kontör sayısı; fiyat 0 ise "Ücretsiz". Yalnız gösterim; kontör düşülmez.
  const ISLEM_DUGMESI = {
    "/astroloji": 'form button.btn-primary[type="submit"], a.btn[href="#harita"]',
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
    "/ebced": "#ebcedSubmit",
    "/cifir": "#cifirSubmit",
  };
  // Sayfalar bir yorumu ekranda açınca window.yorumcuGoster(kayit) çağırır; kayıtta yazar (yorumcu) varsa rozet,
  // büyük figür ve ses o yazara göre olur. Seçim kutusu hazır olmadan gelen çağrı bekletilir.
  let bekleyenKayit = null;
  window.yorumcuGoster = (k) => { bekleyenKayit = k; };

  // "Yorumunu kim yapsın?" (Murat 2026-10-04): bölümün yorum düğmesinin üstünde sanal uzman seçimi. Seçilen uzman yorumu
  // kendi promptundaki üslupla yazar (sunucu çerezden okur: ezoy_<bölüm>). Seçim tarayıcıda hatırlanır.
  (async () => {
    const secici = ISLEM_DUGMESI[location.pathname];
    const dugme = secici && document.querySelector(secici.split(",")[0]);
    if (!dugme) return;
    if (!window.YorumcuSayfalari) {
      await new Promise((tamam) => {
        const s = document.createElement("script");
        s.src = "/uzmanlar.js?v=4";
        s.onload = tamam;
        s.onerror = tamam;
        document.head.append(s);
      });
    }
    const sayfa = (window.YorumcuSayfalari || {})[location.pathname];
    if (!sayfa) return;
    const liste = (window.Uzmanlar || []).filter((u) => u.secilebilir && u.tip === "sanal" && u.bolumler.includes(sayfa.anahtar));
    if (!liste.length) return;
    const cerez = `ezoy_${sayfa.bolum}`;
    const kayitli = new RegExp(`(?:^|;\\s*)${cerez}=([0-9a-f]{10})`).exec(document.cookie)?.[1];
    let secili = liste.some((u) => u.id === kayitli) ? kayitli : liste[0].id;
    const yaz = () => { document.cookie = `${cerez}=${secili}; path=/; max-age=31536000; SameSite=Lax`; };
    yaz();

    const stil = document.createElement("style");
    stil.textContent = `
      .yorumcu-sec { flex-basis: 100%; width: 100%; margin: 4px 0 14px; padding: 12px 14px; border: 1px solid rgba(243,194,107,.3); border-radius: 18px; background: rgba(0,0,0,.25); text-align: left; }
      .yorumcu-sec > p { margin: 0 0 8px; font: 800 .9rem Manrope, sans-serif; color: #f3c26b; }
      .yorumcu-liste { display: flex; gap: 10px; overflow-x: auto; padding: 4px 2px 6px; scrollbar-width: thin; }
      .yorumcu-liste button { flex: 0 0 auto; display: grid; justify-items: center; gap: 4px; width: 88px; padding: 6px 4px; border: 1.5px solid transparent; border-radius: 14px; color: inherit; background: none; font: inherit; cursor: pointer; }
      .yorumcu-liste img { width: 62px; height: 62px; border-radius: 50%; object-fit: cover; object-position: 50% 8%; background: radial-gradient(circle at 50% 35%, #353a7a, #0d0f24 75%); box-shadow: 0 0 0 2px rgba(255,255,255,.12); }
      .yorumcu-liste b { font: 700 .76rem/1.2 Manrope, sans-serif; text-align: center; }
      .yorumcu-liste button[aria-pressed="true"] { border-color: #f3c26b; background: rgba(243,194,107,.12); }
      .yorumcu-liste button[aria-pressed="true"] img { box-shadow: 0 0 0 3px #f3c26b, 0 0 18px rgba(243,194,107,.5); }
      .yorumcu-sec small { display: block; color: rgba(255,255,255,.65); font: 500 .76rem Manrope, sans-serif; }
      .yorumcu-rozet { display: flex; align-items: center; gap: 14px; width: 100%; margin: 10px 0 12px; padding: 10px 14px 10px 10px; border: 1px solid rgba(243,194,107,.28); border-radius: 18px; background: linear-gradient(90deg, rgba(243,194,107,.10), rgba(0,0,0,.15)); box-sizing: border-box; text-align: left; }
      .yorumcu-rozet img { flex: none; width: 92px; height: 92px; border-radius: 50%; object-fit: cover; object-position: 50% 8%; background: radial-gradient(circle at 50% 35%, #353a7a, #0d0f24 75%); box-shadow: 0 0 0 2px #f3c26b, 0 8px 22px rgba(0,0,0,.45); transition: box-shadow .3s; }
      .yorumcu-rozet b { display: block; color: #f3c26b; font: 700 1.15rem "Cormorant Garamond", Georgia, serif; }
      .yorumcu-rozet small { display: block; color: rgba(255,255,255,.72); font: 500 .8rem/1.4 Manrope, sans-serif; }
      .yorumcu-rozet.konusuyor img { animation: yorumcu-nabiz 1.2s ease-in-out infinite; }
      @keyframes yorumcu-nabiz { 0%,100% { box-shadow: 0 0 0 2px #f3c26b, 0 0 10px rgba(243,194,107,.35); } 50% { box-shadow: 0 0 0 4px #f3c26b, 0 0 30px rgba(243,194,107,.8); } }
      @media (max-width: 520px) { .yorumcu-rozet img { width: 76px; height: 76px; } }`;
    document.head.append(stil);

    const kutu = document.createElement("div");
    kutu.className = "yorumcu-sec";
    kutu.innerHTML = '<p>🔮 Yorumunu kim yapsın?</p><div class="yorumcu-liste" role="radiogroup" aria-label="Yorumu yapacak uzman"></div><small></small>';
    const not = kutu.querySelector("small");
    const ciz = () => {
      kutu.querySelector(".yorumcu-liste").replaceChildren(...liste.map((u) => {
        const b = document.createElement("button");
        b.type = "button";
        b.setAttribute("role", "radio");
        b.setAttribute("aria-pressed", String(u.id === secili));
        b.setAttribute("aria-checked", String(u.id === secili));
        b.title = [u.unvan, u.tanitim].filter(Boolean).join(" — ");
        b.innerHTML = '<img alt="" loading="lazy" /><b></b>';
        b.querySelector("img").src = u.resim;
        b.querySelector("b").textContent = u.ad;
        b.addEventListener("click", () => { secili = u.id; yaz(); ciz(); duyur(); rozetleriYerlestir(); });
        return b;
      }));
      const u = liste.find((x) => x.id === secili);
      not.textContent = `${u.ad}${u.unvan ? ` · ${u.unvan}` : ""}: yorumunu kendi üslubuyla yazar.`;
    };
    ciz();
    dugme.insertAdjacentElement("beforebegin", kutu);

    // Yorum sonuçlarında, "sesli dinle" düğmelerinin yanında yorumu yazan/okuyan sanal uzmanın resmi (orta boy);
    // okurken resim ışıldar. Gerçek uzman cevaplarına (uzman kartı) eklenmez.
    // Ekranda açık yorumun yazarı (yoksa seçili uzman) rozet, figür ve seste kullanılır.
    let gosterilen = null;
    const kisi = () => gosterilen || liste.find((x) => x.id === secili);
    // Seçili yorumcu sayfanın kendi koduna da duyurulur; büyük okuyucu figürü (tarot, numeroloji) onun resmini alır.
    function duyur() {
      window.SeciliYorumcu = liste.find((x) => x.id === secili);
      const u = kisi();
      window.GosterilenYorumcu = u;
      const fig = document.getElementById("numerolog");
      if (fig) {
        const img = fig.querySelector("img");
        if (img && img.getAttribute("src") !== u.resim) { img.src = u.resim; img.alt = u.ad; img.hidden = false; img.style.objectFit = "cover"; img.style.objectPosition = "50% 8%"; }
        const b = fig.querySelector("figcaption b");
        if (b) b.textContent = `${u.ad}${u.unvan ? ` · ${u.unvan}` : ""}`;
      }
      document.dispatchEvent(new CustomEvent("yorumcu-degisti", { detail: u }));
    }
    duyur();
    const rozetIcerik = (r) => {
      const u = kisi();
      if (r.dataset.yorumcu === u.id) return; // yalnız değişince yaz (gözlemci döngüye girmesin)
      r.dataset.yorumcu = u.id;
      r.querySelector("img").src = u.resim;
      r.querySelector("b").textContent = u.ad;
      r.querySelector("small").textContent = `${u.unvan ? `${u.unvan} · ` : ""}yorumunu o yazdı`;
      r.querySelector("img").hidden = !u.resim;
    };
    function rozetleriYerlestir() {
      document.querySelectorAll("button.listen").forEach((btn) => {
        if (btn.closest("#expertCard, .yorumcu-sec, .journal, ul, li")) return;
        const hedef = btn.closest(".reading-head") || btn;
        let r = hedef.previousElementSibling?.classList.contains("yorumcu-rozet") ? hedef.previousElementSibling
          : hedef.nextElementSibling?.classList.contains("yorumcu-rozet") ? hedef.nextElementSibling : null;
        if (!r) {
          r = document.createElement("div");
          r.className = "yorumcu-rozet";
          r.innerHTML = '<img alt="" /><div><b></b><small></small></div>';
          // Başlık satırındaki düğmede rozet başlığın altına, tek başına duran düğmede düğmenin üstüne gelir.
          hedef.insertAdjacentElement(hedef === btn ? "beforebegin" : "afterend", r);
        }
        rozetIcerik(r);
      });
    }
    rozetleriYerlestir();
    window.yorumcuGoster = (k) => {
      const y = k?.yorumcu;
      gosterilen = y ? (window.Uzmanlar || []).find((u) => u.id === y.id) || { id: y.id, ad: y.ad, unvan: "", resim: "" } : null;
      // Sunucu dinlemede bu yazarın sesini kullanır (yeni yorum yine seçili uzmanla yazılır).
      document.cookie = gosterilen ? `ezoyk_${sayfa.bolum}=${gosterilen.id}; path=/; max-age=86400; SameSite=Lax` : `ezoyk_${sayfa.bolum}=; path=/; max-age=0; SameSite=Lax`;
      duyur();
      rozetleriYerlestir();
    };
    if (bekleyenKayit) window.yorumcuGoster(bekleyenKayit);
    let bekleyen = 0;
    new MutationObserver(() => {
      cancelAnimationFrame(bekleyen);
      bekleyen = requestAnimationFrame(rozetleriYerlestir);
    }).observe(document.querySelector("main") || document.body, { childList: true, subtree: true });
    const ses = document.getElementById("voice");
    if (ses) {
      const isilti = (acik) => document.querySelectorAll(".yorumcu-rozet").forEach((r) => r.classList.toggle("konusuyor", acik));
      ses.addEventListener("playing", () => isilti(!document.querySelector("#expertCard .is-playing, #expertListen.is-playing")));
      ["pause", "ended", "error", "emptied"].forEach((o) => ses.addEventListener(o, () => isilti(false)));
    }
  })();

  // Her zaman ücretsiz olanlar (fiyatı yok): günlük burç yorumu herkes için ortak üretilir.
  const HEP_UCRETSIZ = { "/astroloji": 'a.btn[href="#burclar"]' };
  const UZMAN_DUGMESI = '#expertForm button[type="submit"]';
  genelAyarlar
    .then((d) => {
      const f = d?.fiyatlar?.[location.pathname];
      const yol = location.pathname;
      const tanitim = Boolean(d?.tanitim);
      const ucretli = [];
      const ucretsiz = [];
      const kurallar = [];
      const rozet = (secici, sayi) => {
        if (!secici) return;
        const tek = secici.split(",").map((x) => x.trim());
        kurallar.push(`${tek.join(", ")} { position: relative; overflow: visible; }`);
        const sonra = tek.map((x) => `${x}::after`).join(", ");
        if (sayi > 0 && tanitim) {
          kurallar.push(`${sonra} { content: "Ücretsiz Tanıtım"; }`);
          ucretsiz.push(sonra);
        } else if (sayi > 0) {
          kurallar.push(`${sonra} { content: "${Number(sayi)}"; }`);
          ucretli.push(sonra);
        } else {
          kurallar.push(`${sonra} { content: "Ücretsiz"; }`);
          ucretsiz.push(sonra);
        }
      };
      if (f) {
        rozet(ISLEM_DUGMESI[yol], f.islem);
        rozet(UZMAN_DUGMESI, f.uzman);
      }
      rozet(HEP_UCRETSIZ[yol], 0);
      if (!kurallar.length) return;
      const ortak = [...ucretli, ...ucretsiz].join(", ");
      const stil = document.createElement("style");
      stil.textContent = `${kurallar.join("\n")}
        ${ortak} {
          position: absolute; top: -9px; right: -9px; z-index: 2; min-width: 22px; height: 22px; padding: 0 6px; box-sizing: border-box;
          display: grid; place-items: center; border: 2px solid #1a1205; border-radius: 999px; color: #1a1205; background: #f3c26b;
          font: 800 0.72rem/1 Manrope, system-ui, sans-serif; letter-spacing: 0; text-transform: none; white-space: nowrap; box-shadow: 0 2px 8px rgba(0,0,0,0.5); pointer-events: none;
        }
        ${ucretsiz.length ? `${ucretsiz.join(", ")} { background: #8fe3a5; font-size: 0.66rem; right: -12px; }` : ""}`;
      document.head.append(stil);
    });

  // Onay penceresi (Murat 2026-10-04): ücretli işlem düğmesine basınca kaç kontör olduğu gösterilip onay alınır.
  // "Bir daha sorma" bu tarayıcıda o işlem ve o fiyat için hatırlanır (fiyat değişirse yeniden sorar).
  // Tanıtım dönemi açıksa ya da fiyat 0 ise pencere açılmaz. Yalnız onay; kontör düşülmez.
  genelAyarlar.then((d) => {
    const yol = location.pathname;
    const f = d?.fiyatlar?.[yol];
    if (!f || d?.tanitim) return;
    // Yalnız gerçek işlem düğmeleri (sayfa içi bağlantılar, ör. "Doğum haritamı çıkar", onay istemez).
    const islemSecici = (ISLEM_DUGMESI[yol] || "").split(",").map((x) => x.trim()).filter((x) => x && !x.includes("href")).join(", ");
    const BOLUM_ADI = document.title.split("·")[0].trim();
    const anahtar = (tur) => `ezo-onay:${yol}:${tur}`;
    const hatirla = (tur, fiyat) => { try { return localStorage.getItem(anahtar(tur)) === String(fiyat); } catch { return false; } };
    const sakla = (tur, fiyat) => { try { localStorage.setItem(anahtar(tur), String(fiyat)); } catch { /* depolama kapalı */ } };

    const pencere = document.createElement("dialog");
    pencere.className = "onay-pencere";
    pencere.innerHTML = `
      <div class="onay-isik" aria-hidden="true"></div>
      <svg class="onay-jeton" viewBox="0 0 120 120" aria-hidden="true">
        <defs>
          <radialGradient id="jetonYuz" cx="38%" cy="32%" r="75%"><stop offset="0" stop-color="#fff3c8"/><stop offset="0.45" stop-color="#f3c26b"/><stop offset="1" stop-color="#a86a12"/></radialGradient>
          <linearGradient id="jetonKenar" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffe7a3"/><stop offset="1" stop-color="#7a4a08"/></linearGradient>
        </defs>
        <circle cx="60" cy="60" r="54" fill="url(#jetonKenar)"/>
        <circle cx="60" cy="60" r="46" fill="url(#jetonYuz)"/>
        <circle cx="60" cy="60" r="38" fill="none" stroke="#7a4a08" stroke-width="2" stroke-dasharray="2 5" opacity="0.6"/>
        <path d="M60 30 L65 52 L88 52 L69 65 L76 88 L60 74 L44 88 L51 65 L32 52 L55 52 Z" fill="#8a5410" opacity="0.85"/>
      </svg>
      <p class="onay-ust">Ücretli işlem</p>
      <h2 class="onay-baslik"></h2>
      <p class="onay-fiyat"><b class="onay-sayi"></b> <span>kontör</span></p>
      <p class="onay-not">Bu işlem için hesabından <b class="onay-sayi2"></b> kontör kullanılacak. Onaylıyor musun?</p>
      <label class="onay-sorma"><input type="checkbox" /> <span>Bu işlem için bir daha sorma</span></label>
      <div class="onay-dugmeler">
        <button type="button" class="btn btn-ghost onay-vazgec">Vazgeç</button>
        <button type="button" class="btn btn-primary onay-tamam">Onayla</button>
      </div>`;
    document.body.append(pencere);
    let bekleyenDugme = null;
    let bekleyenTur = "";
    let bekleyenFiyat = 0;
    const kapat = () => { pencere.close(); bekleyenDugme = null; };
    pencere.querySelector(".onay-vazgec").addEventListener("click", kapat);
    pencere.addEventListener("click", (e) => { if (e.target === pencere) kapat(); });
    pencere.querySelector(".onay-tamam").addEventListener("click", () => {
      const dugme = bekleyenDugme;
      if (pencere.querySelector(".onay-sorma input").checked) sakla(bekleyenTur, bekleyenFiyat);
      kapat();
      if (dugme) { dugme.dataset.onaylandi = "1"; dugme.click(); }
    });

    document.addEventListener("click", (e) => {
      const hedef = e.target instanceof Element ? e.target : null;
      if (!hedef) return;
      const uzman = hedef.closest(UZMAN_DUGMESI);
      const islem = islemSecici ? hedef.closest(islemSecici) : null;
      const dugme = uzman || islem;
      if (!dugme || dugme.disabled) return;
      if (dugme.dataset.onaylandi === "1") { delete dugme.dataset.onaylandi; return; }
      if (dugme.getAttribute("aria-label") === "Duraklat") return; // çalarken duraklatma ücretsiz
      const tur = uzman ? "uzman" : "islem";
      const fiyat = Number(uzman ? f.uzman : f.islem) || 0;
      if (!(fiyat > 0) || hatirla(tur, fiyat)) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      bekleyenDugme = dugme;
      bekleyenTur = tur;
      bekleyenFiyat = fiyat;
      const ad = (dugme.textContent || dugme.getAttribute("aria-label") || "").replace(/[^\p{L}\p{N}\s·'’-]/gu, "").trim();
      pencere.querySelector(".onay-baslik").textContent = uzman ? `${BOLUM_ADI} · Uzman değerlendirmesi` : `${BOLUM_ADI}${ad ? ` · ${ad}` : ""}`;
      pencere.querySelector(".onay-sayi").textContent = fiyat;
      pencere.querySelector(".onay-sayi2").textContent = fiyat;
      pencere.querySelector(".onay-tamam").textContent = `Onayla · ${fiyat} kontör`;
      pencere.querySelector(".onay-sorma input").checked = false;
      pencere.showModal();
    }, true);
  });
})();
