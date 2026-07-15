/* =====================================================================
   auth.js — ล๊อคอิน/ลงทะเบียน (เชื่อม backend API)
   ---------------------------------------------------------------------
   • access token (สั้น) + refresh token → ต่ออายุอัตโนมัติเมื่อ 401
   • สมัคร → ต้องยืนยันอีเมลก่อน (โหมดสาธิต: แสดงลิงก์ยืนยันบนหน้าจอ)
   • นโยบายรหัสผ่าน: อย่างน้อย 8 ตัว มีพิมพ์ใหญ่/เล็ก/ตัวเลข
   • แจ้งเตือนเมื่อบัญชีถูกล็อก (กรอกผิดหลายครั้ง) / อีเมลยังไม่ยืนยัน
   ===================================================================== */

(function () {
  const API = (window.LUNA_CONFIG && window.LUNA_CONFIG.apiBase) || "http://localhost:8787";
  const ACCESS_KEY = "luna_access";
  const REFRESH_KEY = "luna_refresh";
  const LANG_KEY = "tarot_lang";
  const REMEMBER_KEY = "tarot_remember";

  const T = {
    en: {
      subtitle: "Sign in to begin your reading",
      login: "Sign In", register: "Register",
      name: "Name", email: "Email", password: "Password", confirm: "Confirm password",
      remember: "Remember me", loginBtn: "Sign In", regBtn: "Create account",
      or: "or continue with", google: "Continue with Google", facebook: "Continue with Facebook",
      foot: "Your account is stored securely on the server.", logout: "Log out",
      fillAll: "Please fill in every field.",
      badEmail: "That email doesn't look right.",
      nameLen: "Name must be 2–60 characters.",
      pwPolicy: "Password needs 8+ characters with an uppercase, a lowercase, and a number.",
      pwHint: "8+ chars · A-Z · a-z · 0-9",
      mismatch: "The passwords don't match.",
      exists: "An account with this email already exists.",
      forgotLink: "Forgot password?",
      forgotHeading: "Reset your password",
      forgotSub: "Enter your email and we'll send you a reset link.",
      sendReset: "Send reset link", backToLogin: "← Back to sign in",
      resetHeading: "Set a new password", newPassword: "New password",
      confirmNewPassword: "Confirm new password", doReset: "Change password",
      resetIfExists: "If that account exists, a reset link has been sent.",
      resetDemoNote: "Demo mode (no email server) — use this link to reset your password:",
      resetOpenLink: "Open reset link", resetDone: "Password changed — please sign in ✦",
      resetExpired: "This reset link has expired or is invalid.",
      invalidCreds: "Email or password is incorrect.",
      accountLocked: "Too many attempts. Please try again in ~15 minutes.",
      emailNotVerified: "Please verify your email first.",
      resendVerify: "Resend link",
      verifyDemoNote: "Demo mode (no email server) — click to verify your email:",
      verifyOpenLink: "Verify email", verifySent: "Verification link sent — check your email.",
      verifyDone: "Email verified — please sign in ✦",
      verifyExpired: "This verification link is invalid or has expired.",
      welcome: "Welcome back, {name} ✦",
      registered: "Almost there — verify your email to finish. ✦",
      serverDown: "Can't reach the server. Is the backend running?",
      genericErr: "Something went wrong, please try again.",
      oauthPhase2: "{p} sign-in will be enabled once backend OAuth is set up (phase 2)."
    },
    th: {
      subtitle: "เข้าสู่ระบบเพื่อเริ่มดูดวง",
      login: "เข้าสู่ระบบ", register: "ลงทะเบียน",
      name: "ชื่อ", email: "อีเมล", password: "รหัสผ่าน", confirm: "ยืนยันรหัสผ่าน",
      remember: "จดจำฉันไว้", loginBtn: "เข้าสู่ระบบ", regBtn: "สร้างบัญชี",
      or: "หรือเข้าสู่ระบบด้วย", google: "เข้าสู่ระบบด้วย Google", facebook: "เข้าสู่ระบบด้วย Facebook",
      foot: "บัญชีของคุณถูกเก็บอย่างปลอดภัยบนเซิร์ฟเวอร์", logout: "ออกจากระบบ",
      fillAll: "กรุณากรอกข้อมูลให้ครบทุกช่อง",
      badEmail: "รูปแบบอีเมลไม่ถูกต้อง",
      nameLen: "ชื่อต้องมี 2–60 ตัวอักษร",
      pwPolicy: "รหัสผ่านต้องมีอย่างน้อย 8 ตัว มีพิมพ์ใหญ่ พิมพ์เล็ก และตัวเลข",
      pwHint: "8+ ตัว · A-Z · a-z · 0-9",
      mismatch: "รหัสผ่านไม่ตรงกัน",
      exists: "มีบัญชีที่ใช้อีเมลนี้อยู่แล้ว",
      forgotLink: "ลืมรหัสผ่าน?",
      forgotHeading: "รีเซ็ตรหัสผ่าน",
      forgotSub: "กรอกอีเมลของคุณ แล้วเราจะส่งลิงก์สำหรับตั้งรหัสใหม่ไปให้",
      sendReset: "ส่งลิงก์รีเซ็ต", backToLogin: "← กลับไปเข้าสู่ระบบ",
      resetHeading: "ตั้งรหัสผ่านใหม่", newPassword: "รหัสผ่านใหม่",
      confirmNewPassword: "ยืนยันรหัสผ่านใหม่", doReset: "เปลี่ยนรหัสผ่าน",
      resetIfExists: "ถ้ามีบัญชีนี้อยู่ ระบบได้ส่งลิงก์รีเซ็ตไปแล้ว",
      resetDemoNote: "โหมดสาธิต (ไม่มีเซิร์ฟเวอร์อีเมล) — ใช้ลิงก์นี้เพื่อตั้งรหัสใหม่:",
      resetOpenLink: "เปิดลิงก์รีเซ็ต", resetDone: "เปลี่ยนรหัสผ่านแล้ว กรุณาเข้าสู่ระบบอีกครั้ง ✦",
      resetExpired: "ลิงก์รีเซ็ตนี้หมดอายุหรือไม่ถูกต้อง",
      invalidCreds: "อีเมลหรือรหัสผ่านไม่ถูกต้อง",
      accountLocked: "กรอกผิดหลายครั้งเกินไป กรุณาลองใหม่ในอีก ~15 นาที",
      emailNotVerified: "กรุณายืนยันอีเมลก่อน",
      resendVerify: "ส่งลิงก์อีกครั้ง",
      verifyDemoNote: "โหมดสาธิต (ไม่มีเซิร์ฟเวอร์อีเมล) — กดลิงก์นี้เพื่อยืนยันอีเมล:",
      verifyOpenLink: "ยืนยันอีเมล", verifySent: "ส่งลิงก์ยืนยันแล้ว — เช็คอีเมลของคุณ",
      verifyDone: "ยืนยันอีเมลแล้ว กรุณาเข้าสู่ระบบ ✦",
      verifyExpired: "ลิงก์ยืนยันนี้หมดอายุหรือไม่ถูกต้อง",
      welcome: "ยินดีต้อนรับกลับมา คุณ{name} ✦",
      registered: "อีกนิดเดียว — ยืนยันอีเมลเพื่อเสร็จสิ้นการสมัคร ✦",
      serverDown: "เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ — เปิด backend อยู่หรือเปล่า?",
      genericErr: "เกิดข้อผิดพลาด กรุณาลองใหม่",
      oauthPhase2: "การเข้าสู่ระบบด้วย {p} จะเปิดใช้เมื่อตั้งค่า OAuth ฝั่ง backend แล้ว (เฟส 2)"
    }
  };

  let lang = localStorage.getItem(LANG_KEY) || "en";
  let currentUser = null;
  let pendingReset = null;

  const $ = (id) => document.getElementById(id);
  const overlay = $("authOverlay");
  const loginForm = $("loginForm");
  const registerForm = $("registerForm");
  const tabLogin = $("tabLogin");
  const tabRegister = $("tabRegister");
  const authMsg = $("authMsg");
  const googleBtn = $("googleBtn");
  const facebookBtn = $("facebookBtn");
  const userChip = $("userChip");
  const userAvatar = $("userAvatar");
  const userName = $("userName");
  const logoutBtn = $("logoutBtn");
  const authTabs = document.querySelector(".auth-tabs");
  const authSocial = $("authSocial");
  const forgotForm = $("forgotForm");
  const resetForm = $("resetForm");
  const forgotLink = $("forgotLink");

  // ---------- โทเคน ----------
  function getAccess() { return localStorage.getItem(ACCESS_KEY) || sessionStorage.getItem(ACCESS_KEY) || ""; }
  function getRefresh() { return localStorage.getItem(REFRESH_KEY) || sessionStorage.getItem(REFRESH_KEY) || ""; }
  function setTokens(access, refresh, remember) {
    const store = remember ? localStorage : sessionStorage;
    const other = remember ? sessionStorage : localStorage;
    other.removeItem(ACCESS_KEY); other.removeItem(REFRESH_KEY);
    store.setItem(ACCESS_KEY, access);
    if (refresh) store.setItem(REFRESH_KEY, refresh);
  }
  function storeAccess(access) {
    if (localStorage.getItem(REFRESH_KEY) !== null) localStorage.setItem(ACCESS_KEY, access);
    else sessionStorage.setItem(ACCESS_KEY, access);
  }
  function clearTokens() {
    [localStorage, sessionStorage].forEach((s) => { s.removeItem(ACCESS_KEY); s.removeItem(REFRESH_KEY); });
  }

  // ---------- เรียก API (+ ต่ออายุ token อัตโนมัติ) ----------
  let refreshing = null;
  function tryRefresh() {
    const rt = getRefresh();
    if (!rt) return Promise.resolve(false);
    if (!refreshing) {
      refreshing = (async () => {
        try {
          const res = await fetch(API + "/api/auth/refresh", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ refreshToken: rt }),
          });
          if (!res.ok) return false;
          const data = await res.json().catch(() => null);
          if (data && data.accessToken) { storeAccess(data.accessToken); return true; }
          return false;
        } catch (e) { return false; }
      })();
      refreshing.finally(() => { refreshing = null; });
    }
    return refreshing;
  }
  async function api(path, opts, _retried) {
    opts = opts || {};
    const headers = { "Content-Type": "application/json" };
    if (opts.auth) { const t = getAccess(); if (t) headers.Authorization = "Bearer " + t; }
    let res;
    try {
      res = await fetch(API + path, {
        method: opts.method || "GET",
        headers,
        body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      });
    } catch (e) { return { ok: false, status: 0, data: null }; }

    if (res.status === 401 && opts.auth && !_retried && getRefresh() && path.indexOf("/api/auth/refresh") === -1) {
      if (await tryRefresh()) return api(path, opts, true);
    }
    let data = null;
    try { data = await res.json(); } catch (e) {}
    return { ok: res.ok, status: res.status, data };
  }

  function apiErr(status, data) {
    if (status === 0) return tt("serverDown");
    const code = data && data.error;
    const map = {
      exists: "exists", bad_email: "badEmail",
      name_short: "nameLen", name_long: "nameLen",
      pw_short: "pwPolicy", pw_long: "pwPolicy", pw_lower: "pwPolicy", pw_upper: "pwPolicy", pw_digit: "pwPolicy",
      invalid_credentials: "invalidCreds",
      account_locked: "accountLocked", email_not_verified: "emailNotVerified",
    };
    if (map[code]) return tt(map[code]);
    return tt("genericErr");
  }

  window.LunaAuth = { base: API, getToken: getAccess, getUser: () => currentUser, api };

  // ---------- ข้อความ ----------
  function tt(key, vars) {
    let s = T[lang][key] || T.en[key] || key;
    if (vars) for (const k in vars) s = s.replace(new RegExp("\\{" + k + "\\}", "g"), vars[k]);
    return s;
  }
  function showMsg(text, type) {
    authMsg.textContent = text || "";
    authMsg.className = "auth-msg" + (type ? " " + type : "");
  }
  function baseUrl() { return location.href.split("#")[0].split("?")[0]; }
  function showLink(noteKey, url, linkKey) {
    authMsg.className = "auth-msg ok";
    authMsg.innerHTML = tt(noteKey) + '<br><a class="auth-reset-link" href="' + url + '">' + tt(linkKey) + " ↗</a>";
  }

  function applyAuthLang() {
    $("authSubtitle").textContent = tt("subtitle");
    tabLogin.textContent = tt("login");
    tabRegister.textContent = tt("register");
    $("lblLoginEmail").textContent = tt("email");
    $("lblLoginPassword").textContent = tt("password");
    $("loginSubmit").textContent = tt("loginBtn");
    $("lblRegName").textContent = tt("name");
    $("lblRegEmail").textContent = tt("email");
    $("lblRegPassword").textContent = tt("password");
    $("lblRegConfirm").textContent = tt("confirm");
    $("lblRemember").textContent = tt("remember");
    $("regSubmit").textContent = tt("regBtn");
    $("regPassword").placeholder = tt("pwHint");
    $("authOr").textContent = tt("or");
    $("googleLabel").textContent = tt("google");
    $("facebookLabel").textContent = tt("facebook");
    $("authFoot").textContent = tt("foot");
    logoutBtn.textContent = tt("logout");
    forgotLink.textContent = tt("forgotLink");
    $("forgotHeading").textContent = tt("forgotHeading");
    $("forgotSub").textContent = tt("forgotSub");
    $("lblForgotEmail").textContent = tt("email");
    $("forgotSubmit").textContent = tt("sendReset");
    $("resetHeading").textContent = tt("resetHeading");
    $("lblResetPw").textContent = tt("newPassword");
    $("lblResetConfirm").textContent = tt("confirmNewPassword");
    $("resetSubmit").textContent = tt("doReset");
    $("resetPassword").placeholder = tt("pwHint");
    document.querySelectorAll(".auth-back").forEach((b) => (b.textContent = tt("backToLogin")));
    document.querySelectorAll(".auth-lang button").forEach((b) => b.classList.toggle("active", b.dataset.lang === lang));
  }

  function syncAppLang() {
    const btn = document.querySelector('.lang-btn[data-lang="' + lang + '"]');
    if (btn && !btn.classList.contains("active")) btn.click();
  }
  document.querySelectorAll(".auth-lang button").forEach((b) => {
    b.addEventListener("click", () => {
      lang = b.dataset.lang;
      localStorage.setItem(LANG_KEY, lang);
      applyAuthLang(); showMsg(""); syncAppLang();
    });
  });
  document.querySelectorAll(".lang-btn").forEach((b) => {
    b.addEventListener("click", () => {
      if (b.dataset.lang && b.dataset.lang !== lang) {
        lang = b.dataset.lang;
        localStorage.setItem(LANG_KEY, lang);
        applyAuthLang();
      }
    });
  });

  // ---------- สลับมุมมอง ----------
  function showView(view) {
    const isLogin = view === "login", isReg = view === "register",
      isForgot = view === "forgot", isReset = view === "reset";
    tabLogin.classList.toggle("active", isLogin);
    tabRegister.classList.toggle("active", isReg);
    authTabs.hidden = isForgot || isReset;
    authSocial.hidden = isForgot || isReset;
    loginForm.hidden = !isLogin;
    registerForm.hidden = !isReg;
    forgotForm.hidden = !isForgot;
    resetForm.hidden = !isReset;
    showMsg("");
  }
  function switchTab(tab) { showView(tab); }
  tabLogin.addEventListener("click", () => showView("login"));
  tabRegister.addEventListener("click", () => showView("register"));
  forgotLink.addEventListener("click", () => showView("forgot"));
  document.querySelectorAll(".auth-back").forEach((b) => b.addEventListener("click", () => showView("login")));

  // ---------- gate + chip ----------
  function reflectUI() {
    if (currentUser) {
      overlay.hidden = true;
      userChip.hidden = false;
      userName.textContent = currentUser.name || currentUser.email;
      userAvatar.textContent = (currentUser.name || currentUser.email || "?").trim().charAt(0).toUpperCase();
    } else {
      overlay.hidden = false;
      userChip.hidden = true;
    }
    if (window.LunaAdmin) window.LunaAdmin.refresh();
  }
  function finishAuth(data, remember, msgKey) {
    setTokens(data.accessToken, data.refreshToken, remember !== false);
    currentUser = data.user;
    if (remember !== false && data.user.email) localStorage.setItem(REMEMBER_KEY, data.user.email);
    showMsg(tt(msgKey || "welcome", { name: data.user.name || data.user.email }), "ok");
    setTimeout(reflectUI, 400);
  }

  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  function pwPolicyOk(pw) {
    return pw.length >= 8 && /[a-z]/.test(pw) && /[A-Z]/.test(pw) && /[0-9]/.test(pw);
  }

  // ---------- ลงทะเบียน ----------
  registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = $("regName").value.trim();
    const email = $("regEmail").value.trim().toLowerCase();
    const pw = $("regPassword").value;
    const confirm = $("regConfirm").value;

    if (!name || !email || !pw || !confirm) return showMsg(tt("fillAll"), "error");
    if (name.length < 2 || name.length > 60) return showMsg(tt("nameLen"), "error");
    if (!emailRe.test(email)) return showMsg(tt("badEmail"), "error");
    if (!pwPolicyOk(pw)) return showMsg(tt("pwPolicy"), "error");
    if (pw !== confirm) return showMsg(tt("mismatch"), "error");

    const { ok, status, data } = await api("/api/auth/register", { method: "POST", body: { name, email, password: pw } });
    if (!ok) return showMsg(apiErr(status, data), "error");

    registerForm.reset();
    // ต้องยืนยันอีเมลก่อน → ไปหน้า login แล้วโชว์ลิงก์ยืนยัน (โหมดสาธิต)
    showView("login");
    $("loginEmail").value = email;
    if (data && data.verifyToken) showLink("verifyDemoNote", baseUrl() + "?verify=" + data.verifyToken, "verifyOpenLink");
    else showMsg(tt("registered"), "ok");
  });

  // ---------- เข้าสู่ระบบ ----------
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = $("loginEmail").value.trim().toLowerCase();
    const pw = $("loginPassword").value;
    if (!email || !pw) return showMsg(tt("fillAll"), "error");

    const remember = $("rememberMe").checked;
    const { ok, status, data } = await api("/api/auth/login", { method: "POST", body: { email, password: pw } });

    if (!ok) {
      if (status === 403 && data && data.error === "email_not_verified") return showNotVerified(email);
      return showMsg(apiErr(status, data), "error");
    }
    if (!remember) localStorage.removeItem(REMEMBER_KEY);
    loginForm.reset();
    finishAuth(data, remember, "welcome");
  });

  // อีเมลยังไม่ยืนยัน → ข้อความ + ปุ่มส่งลิงก์อีกครั้ง
  function showNotVerified(email) {
    authMsg.className = "auth-msg error";
    authMsg.innerHTML = tt("emailNotVerified") + ' <a href="#" class="auth-reset-link" id="resendLink">' + tt("resendVerify") + "</a>";
    const link = $("resendLink");
    if (link) link.addEventListener("click", async (ev) => {
      ev.preventDefault();
      const { data } = await api("/api/auth/resend-verify", { method: "POST", body: { email } });
      if (data && data.verifyToken) showLink("verifyDemoNote", baseUrl() + "?verify=" + data.verifyToken, "verifyOpenLink");
      else showMsg(tt("verifySent"), "ok");
    });
  }

  // ---------- ลืมรหัสผ่าน ----------
  forgotForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = $("forgotEmail").value.trim().toLowerCase();
    if (!emailRe.test(email)) return showMsg(tt("badEmail"), "error");
    const { status, data } = await api("/api/auth/request-reset", { method: "POST", body: { email } });
    if (status === 0) return showMsg(tt("serverDown"), "error");
    if (data && data.resetToken) showLink("resetDemoNote", baseUrl() + "?reset=" + data.resetToken, "resetOpenLink");
    else showMsg(tt("resetIfExists"), "ok");
  });

  resetForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!pendingReset) return showView("login");
    const pw = $("resetPassword").value;
    const confirm = $("resetConfirm").value;
    if (!pwPolicyOk(pw)) return showMsg(tt("pwPolicy"), "error");
    if (pw !== confirm) return showMsg(tt("mismatch"), "error");
    const { ok, status, data } = await api("/api/auth/reset", { method: "POST", body: { token: pendingReset.token, password: pw } });
    if (status === 0) return showMsg(tt("serverDown"), "error");
    if (!ok) return showMsg(tt("resetExpired"), "error");
    pendingReset = null;
    clearUrl();
    resetForm.reset();
    showView("login");
    if (data && data.email) $("loginEmail").value = data.email;
    showMsg(tt("resetDone"), "ok");
  });

  function clearUrl() { try { history.replaceState(null, "", baseUrl()); } catch (e) {} }
  function urlParam(name) {
    try {
      const v = new URLSearchParams(location.search).get(name);
      if (v) return v;
      if (location.hash.indexOf(name + "=") !== -1) return location.hash.split(name + "=")[1];
    } catch (e) {}
    return "";
  }
  function checkResetUrl() {
    const token = urlParam("reset");
    if (!token) return false;
    pendingReset = { token };
    overlay.hidden = false; userChip.hidden = true;
    showView("reset");
    return true;
  }
  async function checkVerifyUrl() {
    const token = urlParam("verify");
    if (!token) return false;
    overlay.hidden = false; userChip.hidden = true;
    showView("login");
    const { ok, data } = await api("/api/auth/verify", { method: "POST", body: { token } });
    clearUrl();
    if (ok) { if (data && data.email) $("loginEmail").value = data.email; showMsg(tt("verifyDone"), "ok"); }
    else showMsg(tt("verifyExpired"), "error");
    return true;
  }

  // ---------- ออกจากระบบ ----------
  logoutBtn.addEventListener("click", () => {
    const rt = getRefresh();
    if (rt) api("/api/auth/logout", { method: "POST", body: { refreshToken: rt } }); // fire-and-forget
    clearTokens();
    currentUser = null;
    reflectUI();
    switchTab("login");
    showMsg("");
  });

  // ---------- Google / Facebook (เฟส 2) ----------
  googleBtn.addEventListener("click", () => showMsg(tt("oauthPhase2", { p: "Google" }), "error"));
  facebookBtn.addEventListener("click", () => showMsg(tt("oauthPhase2", { p: "Facebook" }), "error"));

  // ---------- ตรวจ session ----------
  async function validateSession() {
    if (!getAccess() && !getRefresh()) return reflectUI();
    const { ok, data } = await api("/api/auth/me", { auth: true });
    if (ok && data && data.user) currentUser = data.user;
    else clearTokens();
    reflectUI();
  }

  // ---------- เริ่มต้น ----------
  const rememberedEmail = localStorage.getItem(REMEMBER_KEY);
  if (rememberedEmail) { $("loginEmail").value = rememberedEmail; $("rememberMe").checked = true; }
  applyAuthLang();
  overlay.hidden = false;
  userChip.hidden = true;
  (async () => {
    if (checkResetUrl()) return;
    if (await checkVerifyUrl()) return;
    validateSession();
  })();
})();
