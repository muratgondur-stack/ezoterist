const toast = document.getElementById("toast");
let toastTimer;

const authBar = document.getElementById("authBar");

// Oturumdaki kullanıcı (yoksa null); menü tıklamaları bunu bekler.
const currentUser = fetch("/api/me", { credentials: "same-origin" })
  .then((response) => (response.ok ? response.json() : null))
  .then((data) => data?.user || null)
  .catch(() => null);

const openSection = (button) => {
  toast.textContent = `${button.dataset.title} çok yakında.`;
  toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.hidden = true; }, 2200);
};

const menuButtons = document.querySelectorAll(".menu-button");

menuButtons.forEach((button) => {
  button.addEventListener("click", (event) => {
    event.preventDefault();
    currentUser.then((user) => {
      // Giriş yapılmamışsa giriş penceresini aç; girişten sonra bu bölüme dönülür.
      if (!user) {
        const next = `/${button.getAttribute("href")}`;
        window.location.assign(`/login?next=${encodeURIComponent(next)}`);
        return;
      }
      openSection(button);
    });
  });
});

// Her 2 saniyede rastgele bir butona fareyle üzerine gelinmiş gibi animasyon yap.
if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
  let lastPulsed;
  setInterval(() => {
    if (document.hidden) return;
    const candidates = [...menuButtons].filter((button) => button !== lastPulsed);
    const button = candidates[Math.floor(Math.random() * candidates.length)];
    lastPulsed = button;
    button.classList.add("is-pulsing");
    setTimeout(() => button.classList.remove("is-pulsing"), 900);
  }, 2000);
}

// Girişten "/#bolum" adresine dönüldüyse o bölümü aç.
const returnedTo = [...menuButtons].find((button) => button.getAttribute("href") === window.location.hash);
if (returnedTo) {
  currentUser.then((user) => {
    history.replaceState(null, "", "/");
    if (!user) return;
    returnedTo.scrollIntoView({ block: "center" });
    returnedTo.focus({ preventScroll: true });
    openSection(returnedTo);
  });
}

currentUser.then((user) => {
  if (!user || !authBar) return;

  const name = document.createElement("span");
  name.className = "auth-bar-user";
  name.textContent = user.name || user.email;

  const logout = document.createElement("button");
  logout.type = "button";
  logout.className = "auth-bar-link";
  logout.textContent = "Çıkış";
  logout.addEventListener("click", () => {
    fetch("/api/logout", { method: "POST", credentials: "same-origin" })
      .finally(() => window.location.reload());
  });

  authBar.replaceChildren(name, logout);
});
