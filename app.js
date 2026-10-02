const toast = document.getElementById("toast");
let toastTimer;

document.querySelectorAll(".menu-button").forEach((button) => {
  button.addEventListener("click", (event) => {
    event.preventDefault();
    toast.textContent = `${button.dataset.title} çok yakında.`;
    toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toast.hidden = true; }, 2200);
  });
});

const authBar = document.getElementById("authBar");

fetch("/api/me", { credentials: "same-origin" })
  .then((response) => (response.ok ? response.json() : null))
  .then((data) => {
    if (!data?.user || !authBar) return;

    const name = document.createElement("span");
    name.className = "auth-bar-user";
    name.textContent = data.user.name || data.user.email;

    const logout = document.createElement("button");
    logout.type = "button";
    logout.className = "auth-bar-link";
    logout.textContent = "Çıkış";
    logout.addEventListener("click", () => {
      fetch("/api/logout", { method: "POST", credentials: "same-origin" })
        .finally(() => window.location.reload());
    });

    authBar.replaceChildren(name, logout);
  })
  .catch(() => {});
