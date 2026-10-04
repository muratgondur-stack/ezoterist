// Fiyatlar sayfası: paketler ve hizmet fiyatları yönetim panelindeki ayarlardan (/api/fiyatlar) gelir.
(async () => {
  const sayi = (n) => new Intl.NumberFormat("tr-TR").format(n);
  const d = await fetch("/api/fiyatlar").then((r) => r.json()).catch(() => null);
  if (!d) return;
  document.getElementById("tanitim").hidden = !d.tanitim;
  document.getElementById("kontorTL").textContent = sayi(d.kontorTL);
  document.getElementById("paketler").replaceChildren(...d.paketler.map((p) => {
    const kutu = document.createElement("div");
    kutu.className = "fiyat-paket";
    kutu.innerHTML = "<span aria-hidden=\"true\">🪙</span><b></b><small>kontör</small><em></em>";
    kutu.querySelector("b").textContent = sayi(p.kontor);
    kutu.querySelector("em").textContent = `${sayi(p.tutar)} ₺`;
    return kutu;
  }));
  const hucre = (n) => (n == null ? "—" : n === 0 ? "Ücretsiz" : `${sayi(n)} kontör`);
  document.querySelector("#tablo tbody").replaceChildren(...d.bolumler.map((b) => {
    const tr = document.createElement("tr");
    const ad = document.createElement("td");
    const a = document.createElement("a");
    a.href = b.sayfa;
    a.textContent = b.ad;
    ad.append(a);
    tr.append(ad);
    [b.islem, b.uzman].forEach((n) => {
      const td = document.createElement("td");
      td.className = `num${n === 0 ? " bedava" : ""}`;
      td.textContent = hucre(n);
      tr.append(td);
    });
    return tr;
  }));
})();
