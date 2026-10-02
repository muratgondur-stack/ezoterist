const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");
const tabs = document.querySelectorAll(".auth-tabs [data-mode]");
const message = document.getElementById("authMessage");
const subtitle = document.getElementById("authSubtitle");
const googleLabel = document.getElementById("googleLabel");
const switchText = document.getElementById("authSwitch");

const errorMessages = {
  google: "Google ile giriş tamamlanamadı. Lütfen tekrar deneyin.",
  google_disabled: "Google ile giriş henüz yapılandırılmadı. Lütfen e-posta ile devam edin.",
  google_email: "Google hesabınızın e-posta adresi doğrulanmamış.",
};

const showMessage = (text, type = "error") => {
  message.textContent = text;
  message.dataset.type = type;
  message.hidden = !text;
};

const setMode = (mode, { updateUrl = true } = {}) => {
  const isRegister = mode === "register";

  loginForm.hidden = isRegister;
  registerForm.hidden = !isRegister;
  tabs.forEach((tab) => tab.setAttribute("aria-selected", String(tab.dataset.mode === mode)));

  subtitle.textContent = isRegister
    ? "Birkaç saniyede ücretsiz hesabını oluştur."
    : "Hesabına giriş yap ve kaldığın yerden devam et.";
  googleLabel.textContent = isRegister ? "Google ile kayıt ol" : "Google ile giriş yap";
  switchText.innerHTML = isRegister
    ? 'Zaten hesabın var mı? <a href="/login" data-mode="login">Giriş yap</a>'
    : 'Hesabın yok mu? <a href="/register" data-mode="register">Kayıt ol</a>';

  showMessage("");
  if (updateUrl) history.replaceState(null, "", isRegister ? "/register" : "/login");
  (isRegister ? registerForm : loginForm).querySelector("input")?.focus();
};

document.addEventListener("click", (event) => {
  const trigger = event.target.closest("[data-mode]");
  if (!trigger) return;
  event.preventDefault();
  setMode(trigger.dataset.mode);
});

const submit = async (form, endpoint, payload) => {
  const button = form.querySelector("button[type=submit]");
  button.disabled = true;
  showMessage("");

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify(payload),
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      showMessage(data.error || "Bir hata oluştu. Lütfen tekrar deneyin.");
      return;
    }

    window.location.href = "/";
  } catch {
    showMessage("Sunucuya ulaşılamadı. İnternet bağlantınızı kontrol edin.");
  } finally {
    button.disabled = false;
  }
};

loginForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const fields = new FormData(loginForm);
  submit(loginForm, "/api/login", {
    email: fields.get("email"),
    password: fields.get("password"),
  });
});

registerForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const fields = new FormData(registerForm);

  if (fields.get("password") !== fields.get("passwordConfirm")) {
    showMessage("Şifreler birbiriyle eşleşmiyor.");
    return;
  }

  submit(registerForm, "/api/register", {
    name: fields.get("name"),
    email: fields.get("email"),
    password: fields.get("password"),
  });
});

setMode(window.location.pathname === "/register" ? "register" : "login", { updateUrl: false });

const errorCode = new URLSearchParams(window.location.search).get("error");
if (errorCode) showMessage(errorMessages[errorCode] || errorMessages.google);

// Zaten giriş yapılmışsa ana sayfaya dön.
fetch("/api/me", { credentials: "same-origin" })
  .then((response) => {
    if (response.ok) window.location.replace("/");
  })
  .catch(() => {});
