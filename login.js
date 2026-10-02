const forms = {
  login: document.getElementById("loginForm"),
  register: document.getElementById("registerForm"),
  forgot: document.getElementById("forgotForm"),
  reset: document.getElementById("resetForm"),
};
const tabList = document.querySelector(".auth-tabs");
const tabs = tabList.querySelectorAll("[data-mode]");
const socialLogin = document.getElementById("socialLogin");
const message = document.getElementById("authMessage");
const title = document.getElementById("authTitle");
const subtitle = document.getElementById("authSubtitle");
const googleLabel = document.getElementById("googleLabel");
const switchText = document.getElementById("authSwitch");
const resendButton = document.getElementById("resendCode");

const modePaths = { login: "/login", register: "/register", forgot: "/forgot-password", reset: "/forgot-password" };
let resetEmail = "";

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
  const isRecovery = mode === "forgot" || mode === "reset";

  Object.entries(forms).forEach(([name, form]) => {
    form.hidden = name !== mode;
  });
  tabList.hidden = isRecovery;
  socialLogin.hidden = isRecovery;
  tabs.forEach((tab) => tab.setAttribute("aria-selected", String(tab.dataset.mode === mode)));

  title.textContent = isRecovery ? "Şifremi Unuttum" : "Ezoter.ist Girişi";
  subtitle.textContent = {
    login: "Hesabına giriş yap ve kaldığın yerden devam et.",
    register: "Birkaç saniyede ücretsiz hesabını oluştur.",
    forgot: "Kayıtlı e-posta adresini yaz; şifreni yenilemen için 6 haneli bir kod gönderelim.",
    reset: `${resetEmail} adresine gelen kodu ve yeni şifreni gir.`,
  }[mode];
  googleLabel.textContent = mode === "register" ? "Google ile kayıt ol" : "Google ile giriş yap";
  switchText.innerHTML = {
    login: 'Hesabın yok mu? <a href="/register" data-mode="register">Kayıt ol</a>',
    register: 'Zaten hesabın var mı? <a href="/login" data-mode="login">Giriş yap</a>',
    forgot: '<a href="/login" data-mode="login">← Giriş sayfasına dön</a>',
    reset: '<a href="/forgot-password" data-mode="forgot">← Farklı bir e-posta dene</a>',
  }[mode];

  showMessage("");
  if (updateUrl) history.replaceState(null, "", modePaths[mode]);
  forms[mode].querySelector("input")?.focus();
};

document.addEventListener("click", (event) => {
  const trigger = event.target.closest("a[data-mode], button[data-mode]");
  if (!trigger) return;
  event.preventDefault();
  setMode(trigger.dataset.mode);
});

const postJson = async (endpoint, payload) => {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify(payload),
  });
  const data = await response.json().catch(() => ({}));
  return { ok: response.ok, data };
};

// Butonu kilitler, isteği atar; hata mesajını gösterir ve başarıda onSuccess'i çağırır.
const submit = async (button, endpoint, payload, onSuccess = () => window.location.assign("/")) => {
  button.disabled = true;
  showMessage("");

  try {
    const { ok, data } = await postJson(endpoint, payload);
    if (!ok) {
      showMessage(data.error || "Bir hata oluştu. Lütfen tekrar deneyin.");
      return;
    }
    onSuccess(data);
  } catch {
    showMessage("Sunucuya ulaşılamadı. İnternet bağlantınızı kontrol edin.");
  } finally {
    button.disabled = false;
  }
};

const submitButton = (form) => form.querySelector("button[type=submit]");

forms.login.addEventListener("submit", (event) => {
  event.preventDefault();
  const fields = new FormData(forms.login);
  submit(submitButton(forms.login), "/api/login", {
    email: fields.get("email"),
    password: fields.get("password"),
  });
});

forms.register.addEventListener("submit", (event) => {
  event.preventDefault();
  const fields = new FormData(forms.register);

  if (fields.get("password") !== fields.get("passwordConfirm")) {
    showMessage("Şifreler birbiriyle eşleşmiyor.");
    return;
  }

  submit(submitButton(forms.register), "/api/register", {
    name: fields.get("name"),
    email: fields.get("email"),
    password: fields.get("password"),
  });
});

const requestCode = (button, email) =>
  submit(button, "/api/forgot-password", { email }, (data) => {
    resetEmail = email;
    if (forms.reset.hidden) setMode("reset");
    showMessage(data.message || "Kod gönderildi.", "success");
  });

forms.forgot.addEventListener("submit", (event) => {
  event.preventDefault();
  const email = String(new FormData(forms.forgot).get("email") || "").trim();
  requestCode(submitButton(forms.forgot), email);
});

resendButton.addEventListener("click", () => requestCode(resendButton, resetEmail));

forms.reset.addEventListener("submit", (event) => {
  event.preventDefault();
  const fields = new FormData(forms.reset);

  if (fields.get("password") !== fields.get("passwordConfirm")) {
    showMessage("Şifreler birbiriyle eşleşmiyor.");
    return;
  }

  submit(submitButton(forms.reset), "/api/reset-password", {
    email: resetEmail,
    code: fields.get("code"),
    password: fields.get("password"),
  });
});

// Girişte yazılan e-posta "Şifremi unuttum" formuna önceden doldurulsun.
document.querySelector(".auth-forgot").addEventListener("click", () => {
  forms.forgot.elements.email.value = forms.login.elements.email.value;
});

const initialMode = { "/register": "register", "/forgot-password": "forgot" }[window.location.pathname] || "login";
setMode(initialMode, { updateUrl: false });

const errorCode = new URLSearchParams(window.location.search).get("error");
if (errorCode) showMessage(errorMessages[errorCode] || errorMessages.google);

// Zaten giriş yapılmışsa ana sayfaya dön.
fetch("/api/me", { credentials: "same-origin" })
  .then((response) => {
    if (response.ok) window.location.replace("/");
  })
  .catch(() => {});
