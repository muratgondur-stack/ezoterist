const { kristaller, niyetler, temizleme, kristalBul } = KristalVeri;
const { burclar } = AstrolojiVeri;
const $ = (id) => document.getElementById(id);
const resim = (id) => `/kristal/${id}.webp?v=1`;

let durum = { ses: false, kalan: 5, sinir: 5 };
let kayitlar = [];
let acikKayit = null;
let toastTimer;
const toast = (text) => {
  $("toast").textContent = text;
  $("toast").hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { $("toast").hidden = true; }, 3400);
};
const tarih = (ms) => new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long", year: "numeric" }).format(new Date(ms));
const img = (id, cls = "crystal-img") => Object.assign(document.createElement("img"), { src: resim(id), alt: kristalBul(id).ad, className: cls, loading: "lazy", width: 420, height: 420 });

// --- Ses ---

const voice = $("voice");
let activeListen = null;

function stopVoice() {
  voice.pause();
  if (activeListen) {
    activeListen.classList.remove("is-playing");
    activeListen.textContent = activeListen.dataset.label;
    activeListen.disabled = false;
  }
  activeListen = null;
}

function bindListen(button, getUrl) {
  button.dataset.label = button.dataset.label || button.textContent;
  button.hidden = !durum.ses;
  button.onclick = () => {
    if (activeListen === button) { stopVoice(); return; }
    stopVoice();
    activeListen = button;
    button.disabled = true;
    button.textContent = "⏳ Ses hazırlanıyor…";
    voice.src = getUrl();
    voice.play().catch(() => { toast("Ses çalınamadı."); stopVoice(); });
  };
}

voice.addEventListener("playing", () => {
  if (!activeListen) return;
  activeListen.disabled = false;
  activeListen.classList.add("is-playing");
  activeListen.textContent = "⏹ Durdur";
});
voice.addEventListener("ended", stopVoice);
voice.addEventListener("error", () => { if (activeListen) toast("Seslendirme şu an hazır değil."); stopVoice(); });

// --- Kristal ayrıntısı ---

function kristalAc(id) {
  const k = kristalBul(id);
  if (!k) return;
  const govde = $("crystalDialogBody");
  govde.innerHTML = `<div class="crystal-detail"><div></div><div><p class="sky-label"></p><h2></h2><p class="kw"></p><p class="anlam"></p>
    <dl><div><dt>Nasıl kullanılır</dt><dd class="kullanim"></dd></div><div><dt>Çakra</dt><dd class="cakra"></dd></div>
    <div><dt>Burçlar</dt><dd class="burc"></dd></div><div><dt>Niyet</dt><dd class="niyet"></dd></div></dl></div></div>`;
  govde.querySelector(".crystal-detail > div").replaceWith(img(id));
  govde.querySelector(".sky-label").textContent = k.renk;
  govde.querySelector("h2").textContent = k.ad;
  govde.querySelector(".kw").textContent = k.anahtar.join(" · ");
  govde.querySelector(".anlam").textContent = k.anlam;
  govde.querySelector(".kullanim").textContent = k.kullanim;
  govde.querySelector(".cakra").replaceChildren(...k.cakralar.flatMap((c, i) => {
    const a = document.createElement("a");
    a.href = "/cakralar";
    const dot = document.createElement("span");
    dot.className = "dot";
    dot.style.setProperty("--c", CakraVeri.cakraBul(c).renk);
    a.append(dot, CakraVeri.cakraBul(c).ad);
    return i ? [", ", a] : [a];
  }));
  govde.querySelector(".burc").textContent = k.burclar.map((b) => `${burclar[b].sembol}︎ ${burclar[b].ad}`).join(", ");
  govde.querySelector(".niyet").textContent = k.niyet.map((n) => niyetler[n]).join(", ");
  $("crystalDialog").showModal();
}

$("crystalDialog").addEventListener("click", (e) => { if (e.target === $("crystalDialog")) $("crystalDialog").close(); });

// --- Günün kristali ---

function renderDaily() {
  const gun = Math.floor((Date.now() + 3 * 3600000) / 86400000);
  const k = kristaller[(gun * 5) % kristaller.length];
  $("dailyDate").textContent = new Intl.DateTimeFormat("tr-TR", { weekday: "long", day: "numeric", month: "long" }).format(new Date());
  const kutu = $("dailyCrystal");
  kutu.innerHTML = "<div></div><div><p class=\"sky-label\"></p><h3></h3><p class=\"kw\"></p><p class=\"anlam\"></p><p class=\"use\"></p><button type=\"button\" class=\"btn btn-ghost\">Ayrıntılar</button></div>";
  kutu.firstElementChild.replaceWith(img(k.id));
  kutu.querySelector(".sky-label").textContent = `${k.renk} · ${k.cakralar.map((c) => CakraVeri.cakraBul(c).ad).join(", ")}`;
  kutu.querySelector("h3").textContent = k.ad;
  kutu.querySelector(".kw").textContent = k.anahtar.join(" · ");
  kutu.querySelector(".anlam").textContent = k.anlam;
  kutu.querySelector(".use").textContent = `Bugün: ${k.kullanim}`;
  kutu.querySelector("button").addEventListener("click", () => kristalAc(k.id));
}

// --- Burç kristalleri ---

function renderSigns(yerlesim) {
  if (!yerlesim) return;
  const satirlar = [["Güneş", yerlesim.gunes], ["Ay", yerlesim.ay], ["Yükselen", yerlesim.yukselen]].filter(([, b]) => b);
  $("burcum").hidden = false;
  $("signCrystals").replaceChildren(...satirlar.map(([etiket, b]) => {
    const div = document.createElement("div");
    div.className = "card";
    div.innerHTML = `<h3><img src="/astroloji/${b}.webp" alt="" width="44" height="44" /><span></span></h3><div class="row"></div>`;
    div.querySelector("span").textContent = `${etiket}: ${burclar[b].ad}`;
    div.querySelector(".row").replaceChildren(...kristaller.filter((k) => k.burclar.includes(b)).slice(0, 4).map((k) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.append(img(k.id), k.ad);
      btn.addEventListener("click", () => kristalAc(k.id));
      return btn;
    }));
    return div;
  }));
}

// --- Öneri ---

let seciliNiyet = "";

function renderIntentChips() {
  $("intentChips").replaceChildren(...Object.entries(niyetler).map(([k, ad]) => {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = ad;
    b.setAttribute("aria-pressed", String(k === seciliNiyet));
    b.addEventListener("click", () => { seciliNiyet = seciliNiyet === k ? "" : k; renderIntentChips(); });
    return b;
  }));
}

function renderKota() {
  $("quota").textContent = durum.kalan == null ? "" : durum.kalan > 0
    ? `Bir niyet seç ve/veya ihtiyacını yaz; listemizden sana en uygun üç kristali seçelim. Bugün ${durum.kalan} öneri hakkın var.`
    : `Bugünkü ${durum.sinir} öneri hakkını kullandın. Rehber her zaman açık; yarın yeniden bekleriz.`;
  $("suggestSubmit").disabled = (durum.kalan != null && durum.kalan <= 0);
}

$("suggestForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const ihtiyac = $("suggestForm").elements.ihtiyac.value.trim();
  if (!ihtiyac && !seciliNiyet) { toast("Bir niyet seç ya da ihtiyacını birkaç kelimeyle yaz."); return; }
  const b = $("suggestSubmit");
  b.disabled = true;
  b.textContent = "Kristaller seçiliyor…";
  try {
    const response = await fetch("/api/kristal/oner", {
      method: "POST", headers: { "Content-Type": "application/json" }, credentials: "same-origin",
      body: JSON.stringify({ ihtiyac, niyet: seciliNiyet }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "Öneri alınamadı.");
    durum.kalan = data.kalan;
    kayitlar.unshift(data.kayit);
    $("suggestForm").elements.ihtiyac.value = "";
    showKayit(data.kayit, true);
    renderJournal();
  } catch (error) {
    toast(error.message);
  } finally {
    b.textContent = "Kristallerimi öner";
    renderKota();
  }
});

function showKayit(kayit, kaydir = false) {
  window.yorumcuGoster?.(kayit); // yorumun yazarı: rozet, figür ve ses (ust-cubuk.js)
  stopVoice();
  acikKayit = kayit;
  const y = kayit.yorum;
  $("sonuc").hidden = false;
  $("resultMeta").textContent = [tarih(kayit.tarih), kayit.niyet ? niyetler[kayit.niyet] : ""].filter(Boolean).join(" · ");
  $("resultTitle").textContent = y.baslik;
  $("resultBadge").textContent = kayit.kaynak === "ai" ? "✨ Sana özel öneri" : "📜 Niyetine uygun taşlar";
  $("resultSummary").textContent = y.ozet;
  $("picks").replaceChildren(...y.secimler.map((s, i) => {
    const k = kristalBul(s.id);
    const div = document.createElement("div");
    div.className = "pick";
    div.style.animationDelay = `${i * 0.15}s`;
    const b = document.createElement("b");
    b.textContent = k.ad;
    const p = document.createElement("p");
    p.textContent = s.neden;
    const use = document.createElement("p");
    use.className = "use";
    use.textContent = `✦ ${s.kullanim}`;
    const resimEl = img(k.id);
    resimEl.style.cursor = "pointer";
    resimEl.addEventListener("click", () => kristalAc(k.id));
    div.append(resimEl, b, p, use);
    return div;
  }));
  $("ritual").replaceChildren(...y.rituel.map((t) => { const li = document.createElement("li"); li.textContent = t; return li; }));
  $("ritualBox").hidden = !y.rituel.length;
  $("resultAffirmation").textContent = y.olumlama;
  bindListen($("resultListen"), () => `/api/kristal/ses?id=${kayit.id}`);
  uzmanKarti.goster();
  document.querySelectorAll(".crystal-journal li").forEach((el) => el.classList.toggle("is-current", el.dataset.id === kayit.id));
  if (kaydir) $("sonuc").scrollIntoView({ behavior: "smooth", block: "start" });
}

const uzmanKarti = UzmanKarti({ bolum: "kristaller", bindListen, toast, ekVeri: () => ({ kayitId: acikKayit?.id }) });

// --- Rehber ve süzgeç ---

function renderFilters() {
  const doldur = (sel, ilk, secenekler) => { sel.replaceChildren(new Option(ilk, ""), ...secenekler.map(([v, t]) => new Option(t, v))); };
  doldur($("filterChakra"), "Tüm çakralar", CakraVeri.cakralar.map((c) => [c.id, c.ad]));
  doldur($("filterSign"), "Tüm burçlar", Object.entries(burclar).map(([k, b]) => [k, b.ad]));
  doldur($("filterIntent"), "Tüm niyetler", Object.entries(niyetler));
  ["filterChakra", "filterSign", "filterIntent"].forEach((id) => $(id).addEventListener("change", renderGrid));
}

function renderGrid() {
  const c = $("filterChakra").value;
  const b = $("filterSign").value;
  const n = $("filterIntent").value;
  const liste = kristaller.filter((k) => (!c || k.cakralar.includes(c)) && (!b || k.burclar.includes(b)) && (!n || k.niyet.includes(n)));
  $("filterNote").textContent = liste.length === kristaller.length
    ? "24 kristal. Çakraya, burca ya da niyete göre süz; bir kristale dokun."
    : `${liste.length} kristal bulundu.`;
  $("crystalGrid").replaceChildren(...(liste.length ? liste : [null]).map((k, i) => {
    const li = document.createElement("li");
    if (!k) { li.textContent = "Bu süzgeçle eşleşen kristal yok; bir süzgeci kaldırmayı dene."; return li; }
    li.style.animationDelay = `${Math.min(i, 12) * 0.03}s`;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.id = k.id;
    const ad = document.createElement("b");
    ad.textContent = k.ad;
    const small = document.createElement("small");
    small.textContent = k.anahtar.join(" · ");
    btn.append(img(k.id), ad, small);
    btn.addEventListener("click", () => kristalAc(k.id));
    li.append(btn);
    return li;
  }));
}

// --- Günlük ---

function renderJournal() {
  const list = $("journal");
  if (!kayitlar.length) {
    list.innerHTML = '<li class="journal-empty">Henüz bir öneri almadın. Yukarıda niyetini seç.</li>';
    return;
  }
  $("journalNote").textContent = `${kayitlar.length} öneri kayıtlı.`;
  list.replaceChildren(...kayitlar.map((k) => {
    const li = document.createElement("li");
    li.dataset.id = k.id;
    li.className = acikKayit?.id === k.id ? "is-current" : "";
    const open = document.createElement("button");
    open.type = "button";
    open.className = "open";
    const mini = document.createElement("div");
    mini.className = "mini";
    k.yorum.secimler.forEach((s) => mini.append(img(s.id, "")));
    const b = document.createElement("b");
    b.textContent = k.yorum.baslik;
    const small = document.createElement("small");
    small.textContent = tarih(k.tarih);
    const p = document.createElement("p");
    p.textContent = k.ihtiyac || (k.niyet ? niyetler[k.niyet] : "");
    open.append(mini, b, small, p);
    open.addEventListener("click", () => showKayit(k, true));
    const sil = document.createElement("button");
    sil.type = "button";
    sil.className = "del";
    sil.title = "Bu öneriyi sil";
    sil.setAttribute("aria-label", "Bu öneriyi sil");
    sil.textContent = "✕";
    sil.addEventListener("click", async () => {
      if (!confirm("Bu öneri günlüğünden silinsin mi?")) return;
      const response = await fetch("/api/kristal/sil", {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "same-origin", body: JSON.stringify({ id: k.id }),
      });
      if (!response.ok) { toast("Silinemedi."); return; }
      kayitlar = kayitlar.filter((x) => x.id !== k.id);
      if (acikKayit?.id === k.id) { acikKayit = null; $("sonuc").hidden = true; stopVoice(); }
      renderJournal();
    });
    li.append(open, sil);
    return li;
  }));
}

// --- Başlangıç ---

async function init() {
  const me = await fetch("/api/me", { credentials: "same-origin" }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
  if (!me?.user) {
    window.location.replace(`/login?next=${encodeURIComponent("/kristaller")}`);
    return;
  }
  $("topbarUser").textContent = me.user.name || me.user.email;
  const data = await fetch("/api/kristal/durum", { credentials: "same-origin" }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
  if (data) {
    durum = { ...durum, ses: data.ses, kalan: data.kalan, sinir: data.sinir };
    kayitlar = data.kayitlar;
    renderSigns(data.yerlesim);
  }
  renderKota();
  await uzmanKarti.yukle();
  renderJournal();
  // Çakra sayfasından gelen bağlantı (#kristal-adi) o kristali açar.
  const hedef = decodeURIComponent(window.location.hash.slice(1));
  if (kristalBul(hedef)) kristalAc(hedef);
  else if (kayitlar.length && hedef === "gunluk") showKayit(kayitlar[0]);
}

$("cleansing").replaceChildren(...temizleme.map((t) => { const li = document.createElement("li"); li.textContent = t; return li; }));
renderDaily();
renderIntentChips();
renderFilters();
renderGrid();
init();
