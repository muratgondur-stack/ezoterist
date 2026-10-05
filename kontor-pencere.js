// "Kontör yükle" açılır penceresi (Murat 2026-10-05): kullanıcı menüsünden her sayfada açılır. Bakiye, resimli
// paketler (100 / 200 / 500 ₺), sözleşme onayı, PayTR'ye yönlendirme ve kupon kodu. Ödeme açık değilse paketler
// görünür ama satın alma kapalıdır. Sayfa adresinde #kontor-yukle varsa kendiliğinden açılır.
(() => {
  if (window.kontorPenceresi) return;
  const el = (tag, props = {}, ...c) => { const e = Object.assign(document.createElement(tag), props); e.append(...c); return e; };
  const sayi = (n) => new Intl.NumberFormat("tr-TR").format(n);
  const RESIM = { 100: "/kontor/paket-100.webp?v=1", 200: "/kontor/paket-200.webp?v=1", 500: "/kontor/paket-500.webp?v=1" };
  const AD = { 100: "Keşif kesesi", 200: "Bereket kâsesi", 500: "Hazine sandığı" };

  const stil = el("style", { textContent: `
    .kp-pencere { width: min(860px, calc(100vw - 20px)); max-height: calc(100dvh - 20px); padding: 0; border: 1px solid rgba(243,194,107,.45); border-radius: 26px; color: #f4efe6; background: #0b0d1c; box-shadow: 0 30px 90px rgba(0,0,0,.7), 0 0 60px rgba(243,194,107,.12); overflow: hidden; }
    .kp-pencere::backdrop { background: rgba(4,5,14,.78); backdrop-filter: blur(5px); }
    .kp-ic { max-height: calc(100dvh - 22px); overflow-y: auto; overscroll-behavior: contain; font-family: Manrope, system-ui, sans-serif; }
    .kp-kapak { position: relative; height: 210px; background: #120d22 url(/kontor/hero.webp?v=1) center 60%/cover; }
    .kp-kapak::after { content: ""; position: absolute; inset: 0; background: linear-gradient(180deg, rgba(11,13,28,.05) 30%, #0b0d1c 98%); }
    .kp-kapat { position: absolute; top: 12px; right: 12px; z-index: 2; width: 38px; height: 38px; border: 1px solid rgba(255,255,255,.3); border-radius: 50%; color: #fff; background: rgba(0,0,0,.45); font-size: 1.1rem; cursor: pointer; }
    .kp-baslik { position: relative; z-index: 1; margin: -64px 0 0; padding: 0 26px; }
    .kp-baslik h2 { margin: 0; color: #f3c26b; font: 700 clamp(1.9rem, 5vw, 2.6rem)/1.05 "Cormorant Garamond", Georgia, serif; text-shadow: 0 2px 18px rgba(0,0,0,.8); }
    .kp-baslik p { margin: 6px 0 0; color: rgba(255,255,255,.78); font-size: .92rem; }
    .kp-bakiye { display: inline-flex; align-items: center; gap: 10px; margin: 16px 26px 0; padding: 8px 16px 8px 10px; border: 1px solid rgba(243,194,107,.35); border-radius: 999px; background: rgba(243,194,107,.08); font-weight: 700; }
    .kp-bakiye i { font-style: normal; font-size: 1.4rem; }
    .kp-bakiye b { color: #f3c26b; font: 700 1.4rem "Cinzel", Georgia, serif; font-variant-numeric: lining-nums; }
    .kp-paketler { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; padding: 22px 26px 6px; }
    .kp-paket { position: relative; display: grid; justify-items: center; gap: 4px; padding: 14px 10px 16px; border: 1.5px solid rgba(243,194,107,.28); border-radius: 22px; color: inherit; background: radial-gradient(circle at 50% 18%, rgba(243,194,107,.18), transparent 62%), linear-gradient(180deg, #17142e, #0d0b1c); font: inherit; cursor: pointer; transition: transform .18s, border-color .18s, box-shadow .18s; }
    .kp-paket:hover:not(:disabled), .kp-paket:focus-visible { transform: translateY(-4px); border-color: #f3c26b; box-shadow: 0 14px 34px rgba(243,194,107,.18); outline: none; }
    .kp-paket:disabled { cursor: default; }
    .kp-paket.populer { border-color: #f3c26b; box-shadow: 0 0 0 1px rgba(243,194,107,.35), 0 10px 30px rgba(243,194,107,.15); }
    .kp-paket.populer::before { content: "En çok tercih edilen"; position: absolute; top: -11px; padding: 3px 12px; border-radius: 999px; color: #1a1406; background: linear-gradient(180deg, #f5d38a, #d6a24b); font-size: .68rem; font-weight: 800; white-space: nowrap; }
    .kp-paket img { width: 100%; max-width: 170px; aspect-ratio: 1; border-radius: 18px; object-fit: cover; }
    .kp-paket small { color: rgba(255,255,255,.7); font-size: .78rem; font-weight: 700; letter-spacing: .04em; }
    .kp-paket b { color: #f3c26b; font: 700 2.3rem/1 "Cinzel", Georgia, serif; font-variant-numeric: lining-nums; }
    .kp-paket .birim { color: #e8dcc0; font-size: .74rem; font-weight: 800; letter-spacing: .25em; }
    .kp-paket .fiyat { margin-top: 8px; padding: 7px 18px; border-radius: 999px; color: #1a1406; background: linear-gradient(180deg, #f5d38a, #d6a24b); font-weight: 800; font-size: 1rem; }
    .kp-paket:disabled .fiyat { color: #e8dcc0; background: rgba(255,255,255,.1); }
    .kp-alt { display: grid; gap: 12px; padding: 14px 26px 22px; }
    .kp-onay { display: flex; gap: 10px; align-items: flex-start; color: rgba(255,255,255,.8); font-size: .84rem; line-height: 1.5; }
    .kp-onay input { flex: none; width: 19px; height: 19px; margin-top: 2px; accent-color: #f3c26b; }
    .kp-onay a, .kp-alt a { color: #f3c26b; }
    .kp-not { margin: 0; padding: 10px 14px; border-radius: 14px; color: #f3d58a; background: rgba(243,194,107,.08); font-size: .84rem; }
    .kp-kupon { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; padding-top: 12px; border-top: 1px dashed rgba(255,255,255,.12); }
    .kp-kupon span { flex-basis: 100%; color: rgba(255,255,255,.7); font-size: .82rem; font-weight: 700; }
    .kp-kupon input { flex: 1 1 200px; min-width: 0; padding: 11px 14px; border: 1px solid rgba(243,194,107,.3); border-radius: 12px; color: #fff; background: rgba(0,0,0,.35); font: 1rem ui-monospace, Menlo, monospace; letter-spacing: .08em; text-transform: uppercase; }
    .kp-kupon button { padding: 11px 18px; border: 1px solid #f3c26b; border-radius: 999px; color: #f3c26b; background: transparent; font: 800 .9rem Manrope, sans-serif; cursor: pointer; }
    .kp-guven { display: flex; flex-wrap: wrap; gap: 6px 14px; color: rgba(255,255,255,.6); font-size: .78rem; }
    .kp-sekmeler { display: flex; gap: 6px; margin: 18px 26px 0; padding: 5px; border: 1px solid rgba(255,255,255,.12); border-radius: 999px; background: rgba(0,0,0,.3); width: fit-content; }
    .kp-sekmeler button { padding: 8px 16px; border: 0; border-radius: 999px; color: #f4efe6; background: none; font: 700 .86rem Manrope, sans-serif; cursor: pointer; }
    .kp-sekmeler button[aria-selected="true"] { color: #1a1406; background: linear-gradient(180deg, #f5d38a, #d6a24b); }
    .kp-hareketler { padding: 16px 26px 24px; }
    .kp-hareketler ul { display: grid; gap: 8px; margin: 0; padding: 0; list-style: none; }
    .kp-hareketler li { display: grid; grid-template-columns: 40px 1fr auto; gap: 4px 12px; align-items: center; padding: 10px 14px; border: 1px solid rgba(255,255,255,.08); border-radius: 14px; background: rgba(255,255,255,.03); }
    .kp-hareketler .ikon { grid-row: span 2; display: grid; place-items: center; width: 40px; height: 40px; border-radius: 50%; background: rgba(243,194,107,.1); font-size: 1.15rem; }
    .kp-hareketler .aciklama { font-weight: 700; font-size: .9rem; }
    .kp-hareketler .ayrinti { grid-column: 2; color: rgba(255,255,255,.6); font-size: .76rem; }
    .kp-hareketler .miktar { grid-row: span 2; text-align: right; font: 700 1.15rem "Cinzel", Georgia, serif; font-variant-numeric: lining-nums; }
    .kp-hareketler .miktar small { display: block; color: rgba(255,255,255,.55); font: 600 .7rem Manrope, sans-serif; }
    .kp-hareketler .arti { color: #8fe3a5; } .kp-hareketler .eksi { color: #ffb4a0; }
    .kp-bos { margin: 0; padding: 26px; border: 1px dashed rgba(255,255,255,.15); border-radius: 16px; color: rgba(255,255,255,.65); text-align: center; }
    .kp-mesaj { margin: 0; font-size: .86rem; font-weight: 700; }
    .kp-mesaj.iyi { color: #8fe3a5; } .kp-mesaj.kotu { color: #ffb4a0; }
    @media (max-width: 640px) {
      .kp-kapak { height: 150px; } .kp-baslik { margin-top: -48px; padding: 0 18px; } .kp-bakiye { margin: 12px 18px 0; }
      .kp-paketler { gap: 8px; padding: 18px 14px 4px; } .kp-paket { padding: 10px 6px 12px; border-radius: 16px; }
      .kp-paket b { font-size: 1.6rem; } .kp-paket .fiyat { padding: 5px 10px; font-size: .86rem; } .kp-paket small { font-size: .66rem; text-align: center; }
      .kp-alt { padding: 12px 16px 18px; }
    }` });

  const IKON = { yukleme: "💳", kupon: "🎟️", harcama: "✨", hediye: "🎁", iade: "↩️" };
  const tarihYaz = (ms) => new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(ms));
  function hareketListesi(d) {
    if (!d.hareketler?.length) return el("p", { className: "kp-bos", textContent: "Henüz bir kontör hareketin yok. Yüklediğin, kuponla kazandığın ve harcadığın kontörler burada görünür." });
    return el("ul", {}, ...d.hareketler.map((h) => el("li", {},
      el("span", { className: "ikon", textContent: IKON[h.tur] || "🪙" }),
      el("span", { className: "aciklama", textContent: h.aciklama || d.turler?.[h.tur] || h.tur }),
      el("span", { className: `miktar ${h.miktar > 0 ? "arti" : "eksi"}` }, `${h.miktar > 0 ? "+" : "−"}${sayi(Math.abs(h.miktar))}`, el("small", { textContent: `bakiye ${sayi(h.bakiyeSonra)}` })),
      el("span", { className: "ayrinti", textContent: `${tarihYaz(h.tarih)} · ${d.turler?.[h.tur] || h.tur}` }))));
  }

  let pencere = null;
  async function ac(sekme = "yukle") {
    if (!document.head.contains(stil)) document.head.append(stil);
    const r = await fetch("/api/kontor", { credentials: "same-origin" });
    if (r.status === 401) { location.href = `/login?next=${encodeURIComponent(location.pathname + "#kontor-yukle")}`; return; }
    const d = await r.json().catch(() => null);
    if (!d) return;
    pencere?.remove();
    pencere = el("dialog", { className: "kp-pencere" });
    pencere.setAttribute("aria-label", "Kontör yükle");
    const mesaj = el("p", { className: "kp-mesaj", hidden: true });
    const goster = (metin, iyi) => { mesaj.hidden = false; mesaj.className = `kp-mesaj ${iyi ? "iyi" : "kotu"}`; mesaj.textContent = metin; };
    const onay = el("input", { type: "checkbox", disabled: !d.yuklemeAcik });
    const bakiye = el("b", { textContent: sayi(d.bakiye) });

    const paketler = (d.paketler || []).map((p, i, hepsi) => {
      const b = el("button", { type: "button", className: `kp-paket${i === Math.floor(hepsi.length / 2) ? " populer" : ""}`, disabled: !d.yuklemeAcik },
        el("img", { src: RESIM[p.tutar] || RESIM[200], alt: "", loading: "lazy" }),
        el("small", { textContent: AD[p.tutar] || "Kontör paketi" }),
        el("b", { textContent: sayi(p.kontor) }), el("span", { className: "birim", textContent: "KONTÖR" }),
        el("span", { className: "fiyat", textContent: `${sayi(p.tutar)} ₺` }));
      b.addEventListener("click", async () => {
        if (!onay.checked) { goster("Önce Ön Bilgilendirme Formu ve Mesafeli Satış Sözleşmesi onayını işaretle.", false); onay.focus(); return; }
        b.disabled = true;
        try {
          const x = await fetch("/api/kontor/yukle", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "same-origin", body: JSON.stringify({ tutar: p.tutar, onay: true }) });
          const y = await x.json().catch(() => ({}));
          if (!x.ok) throw new Error(y.error || "Ödeme başlatılamadı.");
          goster("Güvenli ödeme sayfasına yönlendiriliyorsun…", true);
          location.href = y.odemeAdresi;
        } catch (error) { goster(error.message, false); b.disabled = false; }
      });
      return b;
    });

    const kod = el("input", { placeholder: "AB2C-DE3F-GH4J", maxLength: 20, autocomplete: "off", spellcheck: false });
    kod.setAttribute("aria-label", "Kupon kodu");
    const kuponDugme = el("button", { type: "button", textContent: "Kuponu kullan" });
    kuponDugme.addEventListener("click", async () => {
      if (!kod.value.trim()) { kod.focus(); return; }
      kuponDugme.disabled = true;
      try {
        const x = await fetch("/api/kontor/kupon", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "same-origin", body: JSON.stringify({ kod: kod.value }) });
        const y = await x.json().catch(() => ({}));
        if (!x.ok) throw new Error(y.error || "Kupon kullanılamadı.");
        bakiye.textContent = sayi(y.bakiye);
        kod.value = "";
        fetch("/api/kontor", { credentials: "same-origin" }).then((z) => z.json()).then((yeni) => {
          hareketBolumu.replaceChildren(hareketListesi(yeni));
          sekmeler.querySelector('[data-ad="hareketler"]').textContent = `📜 Hareketlerim (${yeni.hareketler.length})`;
        }).catch(() => {});
        goster(`🎉 ${sayi(y.kontor)} kontör yüklendi! Yeni bakiyen: ${sayi(y.bakiye)}`, true);
      } catch (error) { goster(error.message, false); } finally { kuponDugme.disabled = false; }
    });

    const kapat = el("button", { type: "button", className: "kp-kapat", textContent: "✕", ariaLabel: "Kapat" });
    kapat.addEventListener("click", () => pencere.close());
    pencere.addEventListener("click", (e) => { if (e.target === pencere) pencere.close(); });
    pencere.addEventListener("close", () => { if (location.hash === "#kontor-yukle") history.replaceState(null, "", location.pathname + location.search); });

    const durumNotu = d.yuklemeAcik
      ? (d.odemeModu === "test" ? "TEST modu: ödeme PayTR test ortamında yapılır, karttan para çekilmez (yalnız yönetici görür)." : "")
      : "Kontör satışı çok yakında açılıyor. Şu an bütün bölümler ücretsiz kullanılabiliyor; kupon kodun varsa hemen kullanabilirsin.";

    // Sekmeler: yükleme ve hareketler.
    const yukleBolumu = el("div");
    const hareketBolumu = el("div", { className: "kp-hareketler", hidden: true }, hareketListesi(d));
    const sekmeler = el("div", { className: "kp-sekmeler", role: "tablist" });
    const baslik = el("h2", { textContent: "Kontör yükle" });
    const sec = (ad) => {
      yukleBolumu.hidden = ad !== "yukle";
      hareketBolumu.hidden = ad !== "hareketler";
      baslik.textContent = ad === "yukle" ? "Kontör yükle" : "Kontör hareketlerim";
      sekmeler.querySelectorAll("button").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.ad === ad)));
    };
    [["yukle", "🪙 Kontör yükle"], ["hareketler", `📜 Hareketlerim (${d.hareketler?.length || 0})`]].forEach(([ad, yazi]) => {
      const b = el("button", { type: "button", textContent: yazi });
      b.dataset.ad = ad;
      b.setAttribute("role", "tab");
      b.addEventListener("click", () => sec(ad));
      sekmeler.append(b);
    });

    pencere.append(el("div", { className: "kp-ic" },
      el("div", { className: "kp-kapak" }, kapat),
      el("div", { className: "kp-baslik" }, baslik,
        el("p", { textContent: "Kontörünle uzman yorumları, fallar ve derin raporlar için yol açılır. 1 kontör = 1 ₺, süresizdir." })),
      el("div", { className: "kp-bakiye" }, el("i", { textContent: "🪙" }), "Bakiyen", bakiye),
      sekmeler,
      yukleBolumu,
      hareketBolumu,
    ));
    yukleBolumu.append(
      el("div", { className: "kp-paketler" }, ...paketler),
      el("div", { className: "kp-alt" },
        ...(durumNotu ? [el("p", { className: "kp-not", textContent: durumNotu })] : []),
        el("label", { className: "kp-onay" }, onay, el("span", {},
          el("a", { href: "/on-bilgilendirme", target: "_blank", textContent: "Ön Bilgilendirme Formu" }), "'nu ve ",
          el("a", { href: "/mesafeli-satis", target: "_blank", textContent: "Mesafeli Satış Sözleşmesi" }), "'ni okudum, onaylıyorum. Kontörün dijital hizmet olarak hemen hesabıma tanımlanacağını biliyorum (",
          el("a", { href: "/iptal-iade", target: "_blank", textContent: "İptal ve İade" }), ").")),
        mesaj,
        el("div", { className: "kp-kupon" }, el("span", { textContent: "🎟️ Kupon kodun mu var?" }), kod, kuponDugme),
        el("div", { className: "kp-guven" }, el("span", { textContent: "🔒 Ödemeler PayTR güvencesiyle; kart bilgilerin bize gelmez." }),
          el("a", { href: "/fiyatlar", textContent: "Hizmet fiyatları" }))),
    );
    sec(sekme);
    document.body.append(pencere);
    pencere.showModal();
  }

  window.kontorPenceresi = (sekme) => ac(sekme).catch(() => {});
  if (location.hash === "#kontor-yukle") window.kontorPenceresi();
  window.addEventListener("hashchange", () => { if (location.hash === "#kontor-yukle") window.kontorPenceresi(); });
})();
