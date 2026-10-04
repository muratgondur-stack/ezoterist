// Hediye kupon sayfası (/kupon/KOD): kuponu gösterir; giriş yapmış üye tek tuşla kullanır, değilse girişe/üyeliğe gider.
(async () => {
  const $ = (id) => document.getElementById(id);
  const kod = decodeURIComponent(location.pathname.split("/").pop() || "");
  const sayi = (n) => new Intl.NumberFormat("tr-TR").format(n);
  const tarih = (ms) => new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long", year: "numeric" }).format(new Date(ms));
  const sonuc = (metin, iyi) => { $("kpSonuc").hidden = false; $("kpSonuc").className = `kp-sonuc ${iyi ? "ok" : "bad"}`; $("kpSonuc").textContent = metin; };

  const r = await fetch(`/api/kupon/bilgi?kod=${encodeURIComponent(kod)}`);
  const k = await r.json().catch(() => ({}));
  if (!r.ok) {
    $("kpBaslik").textContent = "Kupon bulunamadı";
    $("kpResim").hidden = true;
    $("kpMetin").textContent = "Bu bağlantıdaki hediye kupon bulunamadı. Kodu e-postadaki gibi girdiğinden emin ol ya da Kişisel Arşiv → Kontörüm'den kodu elle gir.";
    return;
  }
  $("kpBaslik").textContent = k.kimeAd ? `${k.kimeAd}, sana bir hediye var ✨` : "Sana bir hediye var ✨";
  KuponCizim.ciz($("kpResim"), { sablon: k.sablon, kontor: k.kontor, kimden: k.kimden, kime: k.kimeAd, not: k.not, kod: k.kod }).catch(() => {});
  $("kpMetin").textContent = `${k.kimden} sana Ezoter.ist'te astroloji, tarot, fal, rüya yorumu ve daha fazlası için kullanabileceğin ${sayi(k.kontor)} kontörlük bir hediye kupon gönderdi.`;
  if (k.durum === "kullanildi") return sonuc("Bu kupon kullanıldı. 💛", true);
  if (k.durum === "devredildi") return sonuc("Bu kuponun süresi doldu; kontörler gönderene geri döndü.", false);

  const ben = await fetch("/api/me", { credentials: "same-origin" }).then((x) => (x.ok ? x.json() : null)).catch(() => null);
  $("kpEylem").hidden = false;
  $("kpNot").textContent = `Kupon ${tarih(k.sonGun)} tarihine kadar geçerli. ${ben?.user ? "" : "Kullanmak için giriş yap; üye değilsen ücretsiz üye olabilirsin."}`;
  if (!ben?.user) $("kpKullan").textContent = "Giriş yap / üye ol ve kullan";
  $("kpKullan").addEventListener("click", async () => {
    if (!ben?.user) { location.href = `/login?next=${encodeURIComponent(location.pathname)}`; return; }
    $("kpKullan").disabled = true;
    try {
      const x = await fetch("/api/kontor/kupon", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "same-origin", body: JSON.stringify({ kod: k.kod }) });
      const d = await x.json().catch(() => ({}));
      if (!x.ok) throw new Error(d.error || "Kupon kullanılamadı.");
      $("kpEylem").hidden = true;
      sonuc(`🎉 ${sayi(d.kontor)} kontör hesabına yüklendi! Yeni bakiyen: ${sayi(d.bakiye)}. Keyifli keşifler!`, true);
    } catch (error) {
      sonuc(error.message, false);
      $("kpKullan").disabled = false;
    }
  });
})();
