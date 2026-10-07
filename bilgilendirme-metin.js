// "Hoş Geldiniz" bilgilendirme metni (Murat 2026-10-04): ziyaretçiye siteye her girişte (2026-10-07) gösterilir ve onayı alınır; sonradan
// kullanıcı menüsünden (/bilgilendirme) okunabilir. Metin değişirse auth.js'teki BILGILENDIRME_SURUMU artırılır.
// ust-cubuk.js ve app.js, /api/me "bilgilendirmeGerekli" derse bu dosyayı yükleyip onay penceresini açar.
(() => {
  const ikon = (yol) => `<svg viewBox="0 0 48 48" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${yol}</svg>`;
  const MADDELER = [
    {
      ikon: ikon('<circle cx="24" cy="21" r="12"/><path d="M15 38h18l-3-6H18z"/><path d="M24 14v4M22 16h4"/><path d="M19 24c1 2 3 3 5 3"/>'),
      baslik: "İlham ve farkındalık için",
      metin: "Platformda paylaşılan astroloji, numeroloji, tarot, fal ve benzeri tüm içerikler; size ilham vermek, düşünmeye alan açmak ve kişisel farkındalığınızı desteklemek amacıyla sunulur.",
    },
    {
      ikon: ikon('<path d="M24 36c-6-4-9-9-9-14 4 1 7 4 9 8 2-4 5-7 9-8 0 5-3 10-9 14z"/><path d="M24 30c-2-5-2-10 0-16 2 6 2 11 0 16z"/><path d="M15 22c-3-1-6-1-8 0 1 6 6 10 13 12"/><path d="M33 22c3-1 6-1 8 0-1 6-6 10-13 12"/>'),
      baslik: "Bilimsel ya da profesyonel danışmanlık değildir",
      metin: "Bu içerikler bilimsel olarak kanıtlanmış yöntemler değildir; tıbbi, hukuki, finansal veya psikolojik danışmanlık yerine geçmez. Daha çok kişisel yorum, sembolik değerlendirme ve genel nitelikte içeriklerdir.",
    },
    {
      ikon: ikon('<circle cx="24" cy="17" r="5"/><circle cx="12" cy="20" r="4"/><circle cx="36" cy="20" r="4"/><path d="M15 36c0-6 4-10 9-10s9 4 9 10"/><path d="M5 35c0-5 3-8 7-8 2 0 3 .5 4 1.5"/><path d="M43 35c0-5-3-8-7-8-2 0-3 .5-4 1.5"/>'),
      baslik: "Yorumlar yapay zekâ ile üretilir, ücretsizdir",
      metin: "Sitedeki yorumlar, bize ilettiğiniz bilgiler doğrultusunda yapay zekâ ile otomatik olarak hazırlanır; arkasında bir falcı ya da danışman yoktur ve hiçbir hizmet karşılığında ücret alınmaz. Yapay zekâ yorumları hata içerebilir. Girdiğiniz bilgiler ve fotoğraflar kaydedilmez; yorum yalnızca sayfayı kullandığınız sürece görüntülenir.",
    },
    {
      ikon: ikon('<path d="M24 38S9 29 9 19a7.5 7.5 0 0 1 15-2 7.5 7.5 0 0 1 15 2c0 10-15 19-15 19z"/>'),
      baslik: "Kararlar her zaman size aittir",
      metin: "Bu içerikler, hayatınızla ilgili önemli kararlar alırken tek dayanak olarak kullanılmamalıdır. Platform, uzmanlar ve içerik sağlayıcılar, bu yorumların doğruluğu, geçerliliği veya sonuçları hakkında herhangi bir taahhütte bulunmaz. Alacağınız kararların tüm sorumluluğu size aittir.",
    },
    {
      ikon: ikon('<path d="M24 40V22"/><path d="M24 26c-7 0-11-4-11-11 7 0 11 4 11 11z"/><path d="M24 22c0-7 4-11 11-11 0 7-4 11-11 11z"/>'),
      baslik: "Önemli konularda uzman desteği alın",
      metin: "Herhangi bir sağlık durumu veya hayatınızı etkileyen önemli bir karar söz konusuysa lütfen alanında uzman kişilerden destek almanız önerilir.",
    },
  ];

  const kacis = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

  // Metnin gövdesi (sayfa ve pencere ortak).
  function icerik() {
    const kutu = document.createElement("div");
    kutu.className = "bilgi";
    kutu.innerHTML = `
      <div class="bilgi-ust">
        <img class="bilgi-logo" src="/kupon/logo.png?v=1" alt="Ezoter.ist" width="346" height="129" />
        <p class="bilgi-slogan">Daha fazla farkındalık<br />daha aydınlık yarınlar</p>
      </div>
      <h2 class="bilgi-baslik">Hoş Geldiniz</h2>
      <p class="bilgi-giris">Ezoter.ist, hayatın gizemli yanlarını keşfetmek, kendinizi daha iyi tanımak ve size ilham vermek için burada.</p>
      <ul class="bilgi-maddeler">${MADDELER.map((m) => `<li><span class="bilgi-ikon">${m.ikon}</span><div><h3>${kacis(m.baslik)}</h3><p>${kacis(m.metin)}</p></div></li>`).join("")}</ul>
      <div class="bilgi-kapanis">
        <p>Burada amacımız, size yeni bakış açıları sunmak, farkındalığınızı desteklemek ve yolculuğunuzda size eşlik etmek.</p>
        <p class="bilgi-imza">Keyifli keşifler dileriz. ♡</p>
      </div>
      <p class="bilgi-alt">Daima daha fazla sen</p>`;
    return kutu;
  }

  let stilEklendi = false;
  function stilEkle() {
    if (stilEklendi || document.querySelector('link[href^="/bilgilendirme.css"]')) return;
    stilEklendi = true;
    const l = document.createElement("link");
    l.rel = "stylesheet";
    l.href = "/bilgilendirme.css?v=2";
    // Ana sayfa Cormorant'ı yüklemiyor; pencere her sayfada aynı görünsün.
    const f = document.createElement("link");
    f.rel = "stylesheet";
    f.href = "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,600;0,700;1,600&family=Manrope:wght@600;700;800&display=swap";
    document.head.append(f, l);
  }

  // Onay penceresi: kapatılamaz; onaylamak ya da çıkış yapmak gerekir.
  // user.anonim ise onay sunucuya değil bu tarayıcı sekmesine yazılır (sessionStorage): her girişte yeniden sorulur.
  function onayIste(user) {
    const anonim = Boolean(user?.anonim);
    if (document.querySelector(".bilgi-pencere")) return;
    stilEkle();
    const pencere = document.createElement("dialog");
    pencere.className = "bilgi-pencere";
    pencere.setAttribute("aria-label", "Hoş geldiniz — bilgilendirme");
    const govde = icerik();
    const alt = document.createElement("form");
    alt.className = "bilgi-onay";
    alt.innerHTML = `
      <p class="bilgi-ipucu" aria-live="polite"></p>
      <label><input type="checkbox" required disabled /> <span>Bu bilgilendirmeyi okudum ve anladım; içeriklerin eğlence ve kişisel farkındalık amaçlı olduğunu, danışmanlık yerine geçmediğini ve kararlarımın sorumluluğunun bana ait olduğunu kabul ediyorum. Ayrıca <a href="/kullanim-kosullari" target="_blank">Kullanım Koşulları</a>'nı ve <a href="/gizlilik" target="_blank">Gizlilik Politikası</a>'nı okudum.</span></label>
      <div class="bilgi-dugmeler">
        <button type="button" class="bilgi-cikis">${anonim ? "Vazgeç" : "Çıkış yap"}</button>
        <button type="submit" class="bilgi-kabul" disabled>Kabul ediyorum, devam et</button>
      </div>
      <p class="bilgi-hata" hidden></p>`;
    const kutucuk = alt.querySelector("input");
    const kabul = alt.querySelector(".bilgi-kabul");
    kutucuk.addEventListener("change", () => { kabul.disabled = !kutucuk.checked; });
    // Onay ancak metnin sonuna kadar kaydırılıp en az 10 sn geçince açılır (Murat 2026-10-04).
    const ipucu = alt.querySelector(".bilgi-ipucu");
    const acilis = Date.now();
    let sonaGelindi = false;
    const durumYaz = () => {
      const kalan = Math.max(0, 10 - Math.floor((Date.now() - acilis) / 1000));
      const hazir = sonaGelindi && kalan === 0;
      kutucuk.disabled = !hazir;
      alt.classList.toggle("hazir", hazir);
      ipucu.textContent = hazir ? "" : !sonaGelindi ? `↓ Onaylayabilmek için metni sonuna kadar oku${kalan ? ` · ${kalan} sn` : ""}` : `Onay ${kalan} sn sonra açılacak…`;
      if (hazir) clearInterval(sayac);
    };
    const sayac = setInterval(durumYaz, 250);
    new IntersectionObserver((girdiler, gozcu) => {
      if (girdiler.some((g) => g.isIntersecting)) { sonaGelindi = true; gozcu.disconnect(); durumYaz(); }
    }, { root: null, threshold: 1 }).observe(govde.querySelector(".bilgi-alt"));
    alt.querySelector(".bilgi-cikis").addEventListener("click", () => {
      if (anonim) { window.location.replace("about:blank"); return; }
      fetch("/api/logout", { method: "POST", credentials: "same-origin" }).finally(() => window.location.assign("/"));
    });
    alt.addEventListener("submit", async (e) => {
      e.preventDefault();
      kabul.disabled = true;
      try {
        if (anonim) {
          try { sessionStorage.setItem("ezo-bilgi", user.bilgilendirmeSurumu); } catch { /* depolama kapalı */ }
        } else {
        const r = await fetch("/api/bilgilendirme-onay", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "same-origin", body: JSON.stringify({ kabul: true }) });
        if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || "Kaydedilemedi, tekrar dene.");
        }
        pencere.close();
        pencere.remove();
        document.documentElement.classList.remove("bilgi-acik");
      } catch (error) {
        const h = alt.querySelector(".bilgi-hata");
        h.hidden = false;
        h.textContent = error.message;
        kabul.disabled = false;
      }
    });
    pencere.addEventListener("cancel", (e) => e.preventDefault()); // Esc ile kapanmasın
    const ic = document.createElement("div");
    ic.className = "bilgi-pencere-ic";
    ic.append(govde, alt);
    pencere.append(ic);
    document.body.append(pencere);
    document.documentElement.classList.add("bilgi-acik");
    pencere.showModal();
  }

  window.Bilgilendirme = { icerik, onayIste };
})();
