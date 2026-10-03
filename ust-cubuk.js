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
})();
