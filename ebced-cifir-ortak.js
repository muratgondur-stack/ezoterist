// Ebced ve Cifir sayfalarının ortak arayüz parçaları: harf karoları, Arap harfi klavyesi, unsurlar, vefk,
// süzülen harfler, sesli dinleme ve günlük listesi.
window.EC = (() => {
  const { HARFLER, EK, UNSURLAR, harfBilgisi } = EbcedVeri;
  const $ = (id) => document.getElementById(id);
  const el = (tag, props = {}, ...c) => { const e = Object.assign(document.createElement(tag), props); e.append(...c); return e; };
  let toastTimer;
  const toast = (text) => {
    $("toast").textContent = text;
    $("toast").hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { $("toast").hidden = true; }, 3600);
  };
  const tarih = (ms) => new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long", year: "numeric" }).format(new Date(ms));
  const sayi = (n) => new Intl.NumberFormat("tr-TR").format(n);

  // Kahraman görselin üstünde süzülen altın harfler.
  function yuzenHarfler(kutu, adet = 14) {
    kutu.replaceChildren(...Array.from({ length: adet }, (_, i) => {
      const h = HARFLER[(i * 7) % 28];
      return el("span", { textContent: h.h, style: `left:${5 + ((i * 37) % 88)}%;top:${10 + ((i * 53) % 75)}%;animation-delay:${(i * 0.55).toFixed(2)}s;font-size:${1.4 + ((i * 13) % 10) / 6}rem` });
    }));
  }

  function karo(x, ek = null, gecikme = 0) {
    const b = harfBilgisi(x.h) || x;
    const k = el("div", { className: `ec-karo ${b.unsur}`, title: `${b.ad} · ${b.d} · ${UNSURLAR[b.unsur].ad}` },
      el("span", { className: "harf", textContent: x.h }), el("span", { className: "ad", textContent: b.ad }), el("span", { className: "deger", textContent: sayi(b.d) }));
    if (ek) k.append(ek);
    k.style.animationDelay = `${gecikme}s`;
    return k;
  }
  const karolar = (kutu, harfler, adim = 0.06) => kutu.replaceChildren(...harfler.map((x, i) => karo(x, null, i * adim)));

  // Arap harfi klavyesi: dokunulan harf girdinin sonuna eklenir.
  function klavye(kutu, girdi) {
    const tuslar = [...HARFLER.map((x) => [x.h, x.d]), ...Object.entries(EK).map(([h, x]) => [h, harfBilgisi(h).d])];
    kutu.replaceChildren(...tuslar.map(([h, d]) => {
      const b = el("button", { type: "button", title: `${harfBilgisi(h).ad} · ${d}` }, h, el("small", { textContent: d }));
      b.addEventListener("click", () => { girdi.value += h; girdi.dispatchEvent(new Event("input")); });
      return b;
    }), (() => {
      const sil = el("button", { type: "button", className: "sil", textContent: "⌫ sil" });
      sil.addEventListener("click", () => { girdi.value = [...girdi.value].slice(0, -1).join(""); girdi.dispatchEvent(new Event("input")); });
      return sil;
    })(), (() => {
      const bosluk = el("button", { type: "button", className: "sil", textContent: "boşluk" });
      bosluk.addEventListener("click", () => { girdi.value += " "; girdi.dispatchEvent(new Event("input")); });
      return bosluk;
    })());
  }

  function unsurCiz(kutu, unsur, baskin) {
    const toplam = Object.values(unsur).reduce((a, b) => a + b, 0) || 1;
    kutu.replaceChildren(...Object.entries(UNSURLAR).map(([id, u]) => {
      const bar = el("i", { style: "width:0" });
      const k = el("div", { className: `ec-unsur${id === baskin ? " baskin" : ""}` },
        el("img", { src: `/ebced/unsur-${id}.webp?v=1`, alt: "", loading: "lazy" }), el("b", { textContent: `${u.ad} · ${unsur[id]}` }), el("small", { textContent: u.anahtar }), el("div", { className: "bar" }, bar));
      requestAnimationFrame(() => setTimeout(() => { bar.style.width = `${(unsur[id] / toplam) * 100}%`; }, 80));
      return k;
    }));
  }

  function vefkCiz(kutu, vefk) {
    kutu.replaceChildren(...vefk.kare.flat().map((n, i) => el("span", { textContent: n, style: `animation-delay:${i * 0.05}s` })));
  }

  // --- Ses ---
  const voice = $("voice");
  let aktif = null;
  let sesVar = false;
  const sesAyarla = (v) => { sesVar = v; };
  function durdur() {
    voice.pause();
    if (aktif) { aktif.textContent = aktif.dataset.label; aktif.disabled = false; }
    aktif = null;
  }
  function bindListen(button, getUrl) {
    button.dataset.label = button.dataset.label || button.textContent;
    button.hidden = !sesVar;
    button.onclick = () => {
      if (aktif === button) { durdur(); return; }
      durdur();
      aktif = button;
      button.disabled = true;
      button.textContent = "⏳ Ses hazırlanıyor…";
      voice.src = getUrl();
      voice.play().catch(() => { toast("Ses çalınamadı."); durdur(); });
    };
  }
  voice.addEventListener("playing", () => { if (aktif) { aktif.disabled = false; aktif.textContent = "⏹ Durdur"; } });
  voice.addEventListener("ended", durdur);
  voice.addEventListener("error", () => { if (aktif) toast("Seslendirme şu an hazır değil."); durdur(); });

  // --- Günlük ---
  function gunluk({ liste, kayitlar, acik, baslik, alt, ac, sil, bos }) {
    if (!kayitlar.length) { liste.replaceChildren(el("li", { className: "bos", textContent: bos })); return; }
    liste.replaceChildren(...kayitlar.map((k) => {
      const ackapa = el("button", { type: "button", className: "open" }, el("b", { textContent: baslik(k) }), el("small", { textContent: alt(k) }));
      ackapa.addEventListener("click", () => ac(k));
      const s = el("button", { type: "button", className: "del", textContent: "✕", title: "Sil" });
      s.setAttribute("aria-label", "Bu kaydı sil");
      s.addEventListener("click", () => sil(k));
      return el("li", { className: acik === k.id ? "is-current" : "" }, ackapa, s);
    }));
  }

  async function postJson(url, govde) {
    const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "same-origin", body: JSON.stringify(govde) });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(d.error || "İşlem yapılamadı.");
    return d;
  }

  return { $, el, toast, tarih, sayi, yuzenHarfler, karo, karolar, klavye, unsurCiz, vefkCiz, bindListen, sesAyarla, durdur, gunluk, postJson };
})();
