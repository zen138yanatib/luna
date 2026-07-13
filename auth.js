/* =====================================================================
   auth.js — ระบบล๊อคอิน / ลงทะเบียน สำหรับแอปดูดวง
   ---------------------------------------------------------------------
   • สมัคร + เข้าสู่ระบบด้วยอีเมล/รหัสผ่าน  → เก็บในเบราว์เซอร์ (localStorage)
     รหัสผ่านถูกแฮชก่อนเก็บ ไม่เก็บเป็นข้อความธรรมดา
   • เข้าสู่ระบบด้วย Google และ Facebook (ดูวิธีตั้งค่าด้านล่าง)

   ⚠️ การล๊อคอินด้วย Google / Facebook ต้องตั้งค่าก่อนถึงจะใช้ได้จริง:
      1) เปิดเว็บผ่านเซิร์ฟเวอร์ (เช่น http://localhost) ไม่ใช่เปิดไฟล์ตรง ๆ
         (Google/Facebook ไม่อนุญาต origin แบบ file://)
      2) สมัครแอปเพื่อขอ ID แล้วนำมาใส่ 2 บรรทัดด้านล่างนี้:
         - Google : https://console.cloud.google.com  → OAuth Client ID (Web)
                    ใส่ Authorized JavaScript origin = http://localhost:PORT
         - Facebook: https://developers.facebook.com   → App ID (Facebook Login)
      ถ้ายังไม่ได้ตั้งค่า ปุ่มจะยังกดได้แต่จะขึ้นข้อความแนะนำวิธีตั้งค่า
      ส่วนการสมัคร/ล๊อคอินด้วยอีเมลใช้งานได้ทันทีแม้เปิดไฟล์ตรง ๆ
   ===================================================================== */

(function () {
  // ▼▼▼ ใส่ค่าของคุณตรงนี้ (ปล่อยว่างไว้ถ้ายังไม่ตั้งค่า) ▼▼▼
  const GOOGLE_CLIENT_ID = ""; // เช่น "1234567890-abcxyz.apps.googleusercontent.com"
  const FB_APP_ID = "";        // เช่น "1234567890123456"
  // แอดมิน: ใส่ได้ทั้ง "อีเมลเต็ม" หรือ "ชื่อผู้ใช้/ส่วนหน้า @" (ไม่สนตัวพิมพ์เล็ก-ใหญ่)
  // ค่าเริ่มต้น: yanatib เป็นแอดมินคนแรก
  const ADMIN_EMAILS = ["yanatib"];

  // ▼ ส่งอีเมลรีเซ็ตรหัสผ่าน "จริง" ด้วย EmailJS (ไม่ตั้งค่า = โหมดสาธิต แสดงลิงก์บนหน้าจอ)
  //   สมัครที่ https://www.emailjs.com → เอา Public Key / Service ID / Template ID มาใส่
  //   ในเทมเพลตให้ใช้ตัวแปร: {{to_email}} {{user_name}} {{reset_link}}
  const EMAILJS_PUBLIC_KEY = "";
  const EMAILJS_SERVICE_ID = "";
  const EMAILJS_TEMPLATE_ID = "";
  // ▲▲▲ -------------------------------------------------- ▲▲▲

  // ตรวจว่า email/ชื่อ ตรงกับรายชื่อแอดมินหรือไม่
  function isAdminIdentity(email, name) {
    email = (email || "").toLowerCase();
    name = (name || "").toLowerCase();
    const local = email.split("@")[0];
    return ADMIN_EMAILS.some(function (entry) {
      entry = String(entry).toLowerCase();
      if (entry.indexOf("@") !== -1) return email === entry;  // ระบุอีเมลเต็ม
      return local === entry || name === entry;               // ระบุชื่อ/ส่วนหน้า @
    });
  }
  function pickRole(email, isFirst, name) {
    return isFirst || isAdminIdentity(email, name) ? "admin" : "user";
  }
  function nowISO() { return new Date().toISOString(); }

  const USERS_KEY = "tarot_users";
  const SESSION_KEY = "tarot_session";
  const LANG_KEY = "tarot_lang";
  const REMEMBER_KEY = "tarot_remember"; // อีเมลที่จำไว้เติมอัตโนมัติ
  const RESET_KEY = "tarot_resets";      // token รีเซ็ตรหัสผ่าน (มีวันหมดอายุ)

  // ---------- ข้อความสองภาษา ----------
  const T = {
    en: {
      subtitle: "Sign in to begin your reading",
      login: "Sign In",
      register: "Register",
      name: "Name",
      email: "Email",
      password: "Password",
      confirm: "Confirm password",
      remember: "Remember me",
      loginBtn: "Sign In",
      regBtn: "Create account",
      or: "or continue with",
      google: "Continue with Google",
      facebook: "Continue with Facebook",
      foot: "Your account is stored only in this browser.",
      logout: "Log out",
      // messages
      fillAll: "Please fill in every field.",
      badEmail: "That email doesn't look right.",
      shortPw: "Password must be at least 6 characters.",
      mismatch: "The passwords don't match.",
      exists: "An account with this email already exists.",
      registered: "Account created — welcome! ✦",
      forgotLink: "Forgot password?",
      forgotHeading: "Reset your password",
      forgotSub: "Enter your email and we'll send you a reset link.",
      sendReset: "Send reset link",
      backToLogin: "← Back to sign in",
      resetHeading: "Set a new password",
      newPassword: "New password",
      confirmNewPassword: "Confirm new password",
      doReset: "Change password",
      resetIfExists: "If that account exists, a reset link has been sent.",
      resetSentReal: "A reset link has been sent to your email ✦",
      resetDemoNote: "Demo mode (no email server) — use this link to reset your password:",
      resetOpenLink: "Open reset link",
      resetDone: "Password changed — please sign in ✦",
      resetInvalid: "This reset link is invalid.",
      resetExpired: "This reset link has expired or is invalid.",
      noUser: "No account found for this email.",
      wrongPw: "Incorrect password, please try again.",
      welcome: "Welcome back, {name} ✦",
      oauthSetup:
        "{p} sign-in needs setup: host the site (e.g. http://localhost) and add your {p} app ID in auth.js.",
      oauthFail: "{p} sign-in was cancelled or failed."
    },
    th: {
      subtitle: "เข้าสู่ระบบเพื่อเริ่มดูดวง",
      login: "เข้าสู่ระบบ",
      register: "ลงทะเบียน",
      name: "ชื่อ",
      email: "อีเมล",
      password: "รหัสผ่าน",
      confirm: "ยืนยันรหัสผ่าน",
      remember: "จดจำฉันไว้",
      loginBtn: "เข้าสู่ระบบ",
      regBtn: "สร้างบัญชี",
      or: "หรือเข้าสู่ระบบด้วย",
      google: "เข้าสู่ระบบด้วย Google",
      facebook: "เข้าสู่ระบบด้วย Facebook",
      foot: "บัญชีของคุณถูกเก็บไว้ในเบราว์เซอร์นี้เท่านั้น",
      logout: "ออกจากระบบ",
      fillAll: "กรุณากรอกข้อมูลให้ครบทุกช่อง",
      badEmail: "รูปแบบอีเมลไม่ถูกต้อง",
      shortPw: "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร",
      mismatch: "รหัสผ่านไม่ตรงกัน",
      exists: "มีบัญชีที่ใช้อีเมลนี้อยู่แล้ว",
      registered: "สร้างบัญชีสำเร็จ ยินดีต้อนรับ ✦",
      forgotLink: "ลืมรหัสผ่าน?",
      forgotHeading: "รีเซ็ตรหัสผ่าน",
      forgotSub: "กรอกอีเมลของคุณ แล้วเราจะส่งลิงก์สำหรับตั้งรหัสใหม่ไปให้",
      sendReset: "ส่งลิงก์รีเซ็ต",
      backToLogin: "← กลับไปเข้าสู่ระบบ",
      resetHeading: "ตั้งรหัสผ่านใหม่",
      newPassword: "รหัสผ่านใหม่",
      confirmNewPassword: "ยืนยันรหัสผ่านใหม่",
      doReset: "เปลี่ยนรหัสผ่าน",
      resetIfExists: "ถ้ามีบัญชีนี้อยู่ ระบบได้ส่งลิงก์รีเซ็ตไปแล้ว",
      resetSentReal: "ส่งลิงก์รีเซ็ตไปที่อีเมลของคุณแล้ว ✦",
      resetDemoNote: "โหมดสาธิต (ไม่มีเซิร์ฟเวอร์อีเมล) — ใช้ลิงก์นี้เพื่อตั้งรหัสใหม่:",
      resetOpenLink: "เปิดลิงก์รีเซ็ต",
      resetDone: "เปลี่ยนรหัสผ่านแล้ว กรุณาเข้าสู่ระบบอีกครั้ง ✦",
      resetInvalid: "ลิงก์รีเซ็ตนี้ไม่ถูกต้อง",
      resetExpired: "ลิงก์รีเซ็ตนี้หมดอายุหรือไม่ถูกต้อง",
      noUser: "ไม่พบบัญชีสำหรับอีเมลนี้",
      wrongPw: "รหัสผ่านไม่ถูกต้อง กรุณาลองใหม่",
      welcome: "ยินดีต้อนรับกลับมา คุณ{name} ✦",
      oauthSetup:
        "การเข้าสู่ระบบด้วย {p} ต้องตั้งค่าก่อน: เปิดเว็บผ่านเซิร์ฟเวอร์ (เช่น http://localhost) และใส่ App ID ของ {p} ในไฟล์ auth.js",
      oauthFail: "การเข้าสู่ระบบด้วย {p} ถูกยกเลิกหรือล้มเหลว"
    }
  };

  let lang = localStorage.getItem(LANG_KEY) || "en";

  // ---------- อ้างอิง element ----------
  const $ = (id) => document.getElementById(id);
  const overlay = $("authOverlay");
  const loginForm = $("loginForm");
  const registerForm = $("registerForm");
  const tabLogin = $("tabLogin");
  const tabRegister = $("tabRegister");
  const authMsg = $("authMsg");
  const googleBtn = $("googleBtn");
  const facebookBtn = $("facebookBtn");
  const gsiContainer = $("gsiContainer");

  const userChip = $("userChip");
  const userAvatar = $("userAvatar");
  const userName = $("userName");
  const logoutBtn = $("logoutBtn");

  // ลืมรหัสผ่าน / รีเซ็ต
  const authTabs = document.querySelector(".auth-tabs");
  const authSocial = $("authSocial");
  const forgotForm = $("forgotForm");
  const resetForm = $("resetForm");
  const forgotLink = $("forgotLink");
  let pendingReset = null; // {token, email} เมื่อเปิดจากลิงก์รีเซ็ต

  // ---------- เก็บ/อ่านข้อมูลผู้ใช้ ----------
  function getUsers() {
    try {
      return JSON.parse(localStorage.getItem(USERS_KEY)) || [];
    } catch (e) {
      return [];
    }
  }
  function saveUsers(users) {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  }
  function getSession() {
    try {
      // จำไว้ถาวร → localStorage, ไม่จำ → sessionStorage (หายเมื่อปิดแท็บ)
      return JSON.parse(localStorage.getItem(SESSION_KEY) || sessionStorage.getItem(SESSION_KEY));
    } catch (e) {
      return null;
    }
  }
  function setSession(user, remember) {
    const sess = {
      name: user.name,
      email: user.email,
      provider: user.provider || "email",
      avatar: user.avatar || "",
      role: user.role || "user"
    };
    const json = JSON.stringify(sess);
    if (remember) {
      sessionStorage.removeItem(SESSION_KEY);
      localStorage.setItem(SESSION_KEY, json);
      localStorage.setItem(REMEMBER_KEY, user.email); // จำอีเมลไว้เติมครั้งหน้า
    } else {
      localStorage.removeItem(SESSION_KEY);
      sessionStorage.setItem(SESSION_KEY, json);
    }
  }
  function clearSession() {
    localStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(SESSION_KEY);
  }

  // ---------- เครื่องมือสุ่ม + แฮชรหัสผ่าน ----------
  function randomHex(bytes) {
    const a = new Uint8Array(bytes);
    if (window.crypto && crypto.getRandomValues) crypto.getRandomValues(a);
    else for (let i = 0; i < bytes; i++) a[i] = (i * 131 + 7) & 255; // fallback ที่คาดเดาได้ (ใช้เฉพาะกรณีไม่มี crypto)
    return Array.from(a).map((b) => b.toString(16).padStart(2, "0")).join("");
  }
  function bufToHex(buf) {
    return Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }
  // แฮชแบบสำรอง (ไม่แข็งแรงเชิงเข้ารหัส) เผื่อ crypto.subtle ใช้ไม่ได้ (เช่น เปิดไฟล์ file:// บางเบราว์เซอร์)
  function weakHash(str) {
    let h1 = 0xdeadbeef ^ str.length,
      h2 = 0x41c6ce57 ^ str.length;
    for (let i = 0; i < str.length; i++) {
      const ch = str.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761);
      h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return (h2 >>> 0).toString(16).padStart(8, "0") + (h1 >>> 0).toString(16).padStart(8, "0");
  }
  async function hashPassword(pw, salt) {
    if (window.crypto && crypto.subtle) {
      try {
        const enc = new TextEncoder();
        const keyMaterial = await crypto.subtle.importKey(
          "raw",
          enc.encode(pw),
          "PBKDF2",
          false,
          ["deriveBits"]
        );
        const bits = await crypto.subtle.deriveBits(
          { name: "PBKDF2", salt: enc.encode(salt), iterations: 100000, hash: "SHA-256" },
          keyMaterial,
          256
        );
        return "pbkdf2$" + bufToHex(bits);
      } catch (e) {
        /* ตกไปใช้ fallback ด้านล่าง */
      }
    }
    return "weak$" + weakHash(salt + "::" + pw + "::" + salt);
  }

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

  // ---------- ปรับข้อความตามภาษา ----------
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
    $("authOr").textContent = tt("or");
    $("googleLabel").textContent = tt("google");
    $("facebookLabel").textContent = tt("facebook");
    $("authFoot").textContent = tt("foot");
    logoutBtn.textContent = tt("logout");
    // ลืมรหัสผ่าน / รีเซ็ต
    forgotLink.textContent = tt("forgotLink");
    $("forgotHeading").textContent = tt("forgotHeading");
    $("forgotSub").textContent = tt("forgotSub");
    $("lblForgotEmail").textContent = tt("email");
    $("forgotSubmit").textContent = tt("sendReset");
    $("resetHeading").textContent = tt("resetHeading");
    $("lblResetPw").textContent = tt("newPassword");
    $("lblResetConfirm").textContent = tt("confirmNewPassword");
    $("resetSubmit").textContent = tt("doReset");
    document.querySelectorAll(".auth-back").forEach((b) => (b.textContent = tt("backToLogin")));
    document
      .querySelectorAll(".auth-lang button")
      .forEach((b) => b.classList.toggle("active", b.dataset.lang === lang));
  }

  // ให้ตัวแอปหลักเปลี่ยนภาษาตามด้วย (ปุ่ม EN/ไทย ในหน้าแอป)
  function syncAppLang() {
    const btn = document.querySelector('.lang-btn[data-lang="' + lang + '"]');
    if (btn && !btn.classList.contains("active")) btn.click();
  }

  document.querySelectorAll(".auth-lang button").forEach((b) => {
    b.addEventListener("click", () => {
      lang = b.dataset.lang;
      localStorage.setItem(LANG_KEY, lang);
      applyAuthLang();
      showMsg("");
      syncAppLang();
    });
  });

  // ให้ล๊อคอินตามภาษาด้วย เมื่อผู้ใช้กดปุ่มภาษาในหน้าแอปหลัก
  document.querySelectorAll(".lang-btn").forEach((b) => {
    b.addEventListener("click", () => {
      if (b.dataset.lang && b.dataset.lang !== lang) {
        lang = b.dataset.lang;
        localStorage.setItem(LANG_KEY, lang);
        applyAuthLang();
      }
    });
  });

  // ---------- สลับมุมมอง: login / register / forgot / reset ----------
  function showView(view) {
    const isLogin = view === "login";
    const isReg = view === "register";
    const isForgot = view === "forgot";
    const isReset = view === "reset";
    tabLogin.classList.toggle("active", isLogin);
    tabRegister.classList.toggle("active", isReg);
    authTabs.hidden = isForgot || isReset;      // ซ่อนแท็บตอนลืม/รีเซ็ตรหัส
    authSocial.hidden = isForgot || isReset;    // ซ่อนปุ่มโซเชียลด้วย
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
  document.querySelectorAll(".auth-back").forEach((b) =>
    b.addEventListener("click", () => showView("login")));

  // ---------- แสดง/ซ่อน gate + chip ----------
  function reflectSession() {
    const sess = getSession();
    if (sess) {
      overlay.hidden = true;
      userChip.hidden = false;
      userName.textContent = sess.name || sess.email;
      if (sess.avatar) {
        userAvatar.innerHTML = '<img src="' + sess.avatar + '" alt="" width="30" height="30" />';
      } else {
        userAvatar.textContent = (sess.name || sess.email || "?").trim().charAt(0).toUpperCase();
      }
    } else {
      overlay.hidden = false;
      userChip.hidden = true;
    }
    if (window.LunaAdmin) window.LunaAdmin.refresh(); // อัปเดตปุ่ม Admin ตามสิทธิ์
  }

  function finishLogin(user, msgKey, remember) {
    setSession(user, remember !== false); // โซเชียล/สมัครใหม่ = จำไว้เป็นค่าเริ่มต้น
    showMsg(tt(msgKey || "welcome", { name: user.name || user.email }), "ok");
    setTimeout(reflectSession, 500);
  }

  // ---------- ลงทะเบียน ----------
  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = $("regName").value.trim();
    const email = $("regEmail").value.trim().toLowerCase();
    const pw = $("regPassword").value;
    const confirm = $("regConfirm").value;

    if (!name || !email || !pw || !confirm) return showMsg(tt("fillAll"), "error");
    if (!emailRe.test(email)) return showMsg(tt("badEmail"), "error");
    if (pw.length < 6) return showMsg(tt("shortPw"), "error");
    if (pw !== confirm) return showMsg(tt("mismatch"), "error");

    const users = getUsers();
    if (users.some((u) => u.email === email)) return showMsg(tt("exists"), "error");

    const salt = randomHex(16);
    const passHash = await hashPassword(pw, salt);
    const user = {
      name, email, salt, passHash, provider: "email",
      role: pickRole(email, users.length === 0, name),
      createdAt: nowISO()
    };
    users.push(user);
    saveUsers(users);
    registerForm.reset();
    finishLogin(user, "registered");
  });

  // ---------- เข้าสู่ระบบ ----------
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = $("loginEmail").value.trim().toLowerCase();
    const pw = $("loginPassword").value;
    if (!email || !pw) return showMsg(tt("fillAll"), "error");

    const users = getUsers();
    const user = users.find((u) => u.email === email);
    if (!user) return showMsg(tt("noUser"), "error");
    if (!user.passHash) return showMsg(tt("noUser"), "error"); // บัญชีที่สมัครผ่าน Google/Facebook

    const hash = await hashPassword(pw, user.salt);
    if (hash !== user.passHash) return showMsg(tt("wrongPw"), "error");

    // เติม role/createdAt ให้บัญชีเก่าที่ยังไม่มี แล้วบันทึกกลับ
    // ถ้ายังไม่มีใครเป็น admin เลย ให้คนที่ล็อกอินนี้เป็น admin (กันกรณีบัญชีเก่าก่อนมีระบบ role)
    if (!user.role) {
      const noAdmin = !users.some((u) => u.role === "admin");
      user.role = noAdmin || isAdminIdentity(email, user.name) ? "admin" : "user";
    } else if (isAdminIdentity(email, user.name) && user.role !== "admin") {
      user.role = "admin"; // ยกระดับให้ตรงรายชื่อแอดมินเสมอ
    }
    if (!user.createdAt) user.createdAt = nowISO();
    saveUsers(users);

    const remember = $("rememberMe").checked;
    if (!remember) localStorage.removeItem(REMEMBER_KEY);
    loginForm.reset();
    finishLogin(user, "welcome", remember);
  });

  // ==================== ลืมรหัสผ่าน / รีเซ็ต ====================
  const RESET_TTL = 30 * 60 * 1000; // ลิงก์อยู่ได้ 30 นาที

  function getResets() {
    try { return JSON.parse(localStorage.getItem(RESET_KEY)) || []; } catch (e) { return []; }
  }
  function saveResets(list) { localStorage.setItem(RESET_KEY, JSON.stringify(list)); }
  function purgeResets(list) {
    const now = Date.now();
    return list.filter((x) => x.expires > now);
  }
  function createReset(email) {
    const list = purgeResets(getResets()).filter((x) => x.email !== email); // ลบ token เก่าของอีเมลนี้
    const token = randomHex(24);
    list.push({ token: token, email: email, expires: Date.now() + RESET_TTL });
    saveResets(list);
    return token;
  }
  function findReset(token) {
    const list = purgeResets(getResets());
    saveResets(list);
    return list.find((x) => x.token === token) || null;
  }
  function consumeReset(token) {
    saveResets(purgeResets(getResets()).filter((x) => x.token !== token));
  }
  function resetLink(token) {
    const base = location.href.split("#")[0].split("?")[0];
    return base + "?reset=" + token;
  }
  function clearResetUrl() {
    try { history.replaceState(null, "", location.href.split("?")[0].split("#")[0]); } catch (e) {}
  }

  // เตรียม EmailJS ถ้าตั้งค่าไว้
  let emailjsReady = false;
  if (EMAILJS_PUBLIC_KEY && EMAILJS_SERVICE_ID && EMAILJS_TEMPLATE_ID) {
    loadScript("https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js")
      .then(() => { try { emailjs.init({ publicKey: EMAILJS_PUBLIC_KEY }); emailjsReady = true; } catch (e) {} })
      .catch(() => {});
  }
  async function sendResetEmail(email, name, link) {
    if (!emailjsReady || typeof emailjs === "undefined") return false;
    await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
      to_email: email, user_name: name || email, reset_link: link
    });
    return true;
  }

  // ขอลิงก์รีเซ็ต
  forgotForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = $("forgotEmail").value.trim().toLowerCase();
    if (!emailRe.test(email)) return showMsg(tt("badEmail"), "error");

    const user = getUsers().find((u) => u.email === email && u.passHash);
    if (!user) return showMsg(tt("resetIfExists"), "ok"); // ไม่เปิดเผยว่ามีบัญชีนี้ไหม

    const link = resetLink(createReset(email));
    try {
      if (await sendResetEmail(email, user.name, link)) return showMsg(tt("resetSentReal"), "ok");
    } catch (err) { /* ส่งไม่สำเร็จ → ตกไปโหมดสาธิต */ }

    // โหมดสาธิต: แสดงลิงก์ให้กดบนหน้าจอ
    authMsg.className = "auth-msg ok";
    authMsg.innerHTML =
      tt("resetDemoNote") +
      '<br><a class="auth-reset-link" href="' + link + '">' + tt("resetOpenLink") + " ↗</a>";
  });

  // ตั้งรหัสใหม่ (เปิดจากลิงก์)
  resetForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!pendingReset) return showView("login");
    const pw = $("resetPassword").value;
    const confirm = $("resetConfirm").value;
    if (pw.length < 6) return showMsg(tt("shortPw"), "error");
    if (pw !== confirm) return showMsg(tt("mismatch"), "error");

    const users = getUsers();
    const user = users.find((u) => u.email === pendingReset.email);
    if (!user) return showMsg(tt("resetInvalid"), "error");

    const salt = randomHex(16);
    user.salt = salt;
    user.passHash = await hashPassword(pw, salt);
    saveUsers(users);
    consumeReset(pendingReset.token);
    pendingReset = null;
    clearResetUrl();
    resetForm.reset();
    showView("login");
    $("loginEmail").value = user.email;
    showMsg(tt("resetDone"), "ok");
  });

  // ตรวจ token รีเซ็ตจาก URL ตอนโหลดหน้า
  function checkResetUrl() {
    let token = "";
    try {
      token = new URLSearchParams(location.search).get("reset") || "";
      if (!token && location.hash.indexOf("reset=") !== -1) token = location.hash.split("reset=")[1];
    } catch (e) {}
    if (!token) return;
    const entry = findReset(token);
    overlay.hidden = false;
    userChip.hidden = true;
    if (!entry) { clearResetUrl(); showView("login"); return showMsg(tt("resetExpired"), "error"); }
    pendingReset = { token: entry.token, email: entry.email };
    showView("reset");
  }

  // ---------- ออกจากระบบ ----------
  logoutBtn.addEventListener("click", () => {
    clearSession();
    reflectSession();
    switchTab("login");
    showMsg("");
  });

  // ---------- สร้าง/หาผู้ใช้จากการล๊อคอินโซเชียล ----------
  function loginWithProvider(provider, profile) {
    const email = (profile.email || provider + "_" + (profile.id || "user")).toLowerCase();
    const users = getUsers();
    let user = users.find((u) => u.email === email);
    if (!user) {
      user = {
        name: profile.name || email, email, provider, avatar: profile.avatar || "",
        role: pickRole(email, users.length === 0, profile.name),
        createdAt: nowISO()
      };
      users.push(user);
    } else {
      user.name = profile.name || user.name;
      user.avatar = profile.avatar || user.avatar;
      user.provider = provider;
      if (!user.role || isAdminIdentity(email, user.name)) user.role = pickRole(email, false, user.name);
      if (!user.createdAt) user.createdAt = nowISO();
    }
    saveUsers(users);
    finishLogin(user, "welcome");
  }

  // ---------- Google Sign-In ----------
  function decodeJwt(token) {
    const payload = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(
      atob(payload)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(json);
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = src;
      s.async = true;
      s.defer = true;
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  if (GOOGLE_CLIENT_ID) {
    googleBtn.hidden = true; // ใช้ปุ่มทางการของ Google แทน
    loadScript("https://accounts.google.com/gsi/client")
      .then(() => {
        /* global google */
        google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: (resp) => {
            try {
              const p = decodeJwt(resp.credential);
              loginWithProvider("google", { name: p.name, email: p.email, avatar: p.picture });
            } catch (err) {
              showMsg(tt("oauthFail", { p: "Google" }), "error");
            }
          }
        });
        google.accounts.id.renderButton(gsiContainer, {
          theme: "outline",
          size: "large",
          shape: "pill",
          width: 300
        });
      })
      .catch(() => {
        googleBtn.hidden = false;
      });
  } else {
    googleBtn.addEventListener("click", () => showMsg(tt("oauthSetup", { p: "Google" }), "error"));
  }

  // ---------- Facebook Login ----------
  if (FB_APP_ID) {
    window.fbAsyncInit = function () {
      /* global FB */
      FB.init({ appId: FB_APP_ID, cookie: true, xfbml: false, version: "v19.0" });
    };
    loadScript("https://connect.facebook.net/en_US/sdk.js").catch(() => {});
    facebookBtn.addEventListener("click", () => {
      if (typeof FB === "undefined") return showMsg(tt("oauthFail", { p: "Facebook" }), "error");
      FB.login(
        (resp) => {
          if (resp.authResponse) {
            FB.api("/me", { fields: "name,email,picture" }, (me) => {
              loginWithProvider("facebook", {
                id: me.id,
                name: me.name,
                email: me.email,
                avatar: me.picture && me.picture.data ? me.picture.data.url : ""
              });
            });
          } else {
            showMsg(tt("oauthFail", { p: "Facebook" }), "error");
          }
        },
        { scope: "public_profile,email" }
      );
    });
  } else {
    facebookBtn.addEventListener("click", () =>
      showMsg(tt("oauthSetup", { p: "Facebook" }), "error")
    );
  }

  // ---------- เริ่มต้น ----------
  // เติมอีเมลที่จำไว้ + ติ๊ก "จดจำฉัน" อัตโนมัติ
  const rememberedEmail = localStorage.getItem(REMEMBER_KEY);
  if (rememberedEmail) {
    $("loginEmail").value = rememberedEmail;
    $("rememberMe").checked = true;
  }
  applyAuthLang();
  reflectSession();
  checkResetUrl(); // ถ้าเปิดจากลิงก์รีเซ็ต ให้แสดงหน้าตั้งรหัสใหม่ทันที
})();
