/* =====================================================================
   admin.js — ระบบผู้ดูแล (Admin) + เก็บสถิติการใช้งาน
   ---------------------------------------------------------------------
   • เก็บทุกครั้งที่ผู้ใช้ดูดวง (ทาโร่ / ไพ่ป๊อก / วันเกิด) ลง localStorage
   • ผู้ใช้ที่มี role = "admin" จะเห็นปุ่ม 🛡️ Admin เพื่อเปิดแดชบอร์ด
   • แดชบอร์ด: สรุปยอด, กราฟผู้ใช้ต่อวัน (14 วัน), แยกตามประเภท, ตารางผู้ใช้

   ⚠️ เป็นระบบฝั่งเบราว์เซอร์ (localStorage) สถิติจึงเป็น "ต่อเครื่อง/เบราว์เซอร์"
      ถ้าต้องการรวมศูนย์หลายเครื่องจริง ต้องต่อ backend + ฐานข้อมูลเพิ่ม
   ===================================================================== */

(function () {
  const USERS_KEY = "tarot_users";
  const SESSION_KEY = "tarot_session";
  const EVENTS_KEY = "tarot_events";
  const LANG_KEY = "tarot_lang";

  function curLang() {
    return localStorage.getItem(LANG_KEY) || (document.body.classList.contains("th") ? "th" : "en");
  }

  // ---------- อ่าน/เขียนข้อมูล ----------
  function parse(json, fallback) {
    try { return JSON.parse(json) || fallback; } catch (e) { return fallback; }
  }
  function getUsers() { return parse(localStorage.getItem(USERS_KEY), []); }
  function getEvents() { return parse(localStorage.getItem(EVENTS_KEY), []); }
  function saveEvents(ev) { localStorage.setItem(EVENTS_KEY, JSON.stringify(ev)); }
  function getSession() {
    return parse(localStorage.getItem(SESSION_KEY) || sessionStorage.getItem(SESSION_KEY), null);
  }
  function isAdmin() {
    const s = getSession();
    return !!(s && s.role === "admin");
  }

  // ---------- เก็บสถิติ (ให้ script.js / birthday.js เรียก) ----------
  function track(type) {
    const s = getSession();
    if (!s) return;
    const t = type === "poker" ? "poker" : type === "birthday" ? "birthday" : "tarot";
    const ev = getEvents();
    ev.push({ email: s.email, name: s.name || s.email, type: t, ts: Date.now() });
    if (ev.length > 5000) ev.splice(0, ev.length - 5000); // กันไฟล์บวมเกินไป
    saveEvents(ev);
  }
  window.LunaAnalytics = { track: track };

  // ---------- ข้อความสองภาษา ----------
  const T = {
    en: {
      btn: "🛡️ Admin",
      title: "Admin Dashboard",
      totalUsers: "Total users",
      totalReadings: "Total readings",
      activeToday: "Active today",
      byType: "Readings by type",
      perDay: "Active users per day (last 14 days)",
      userList: "Users",
      colName: "Name", colEmail: "Email", colProvider: "Sign-in",
      colRole: "Role", colReadings: "Readings", colJoined: "Joined",
      types: { tarot: "Tarot", poker: "Playing Cards", birthday: "Birthday" },
      admin: "Admin", user: "User", none: "No data yet.",
      reset: "Clear all stats", confirmReset: "Clear ALL usage stats? This cannot be undone."
    },
    th: {
      btn: "🛡️ แอดมิน",
      title: "แดชบอร์ดผู้ดูแล",
      totalUsers: "ผู้ใช้ทั้งหมด",
      totalReadings: "ดูดวงทั้งหมด",
      activeToday: "ใช้งานวันนี้",
      byType: "ดูดวงแยกตามประเภท",
      perDay: "ผู้ใช้ต่อวัน (14 วันล่าสุด)",
      userList: "รายชื่อผู้ใช้",
      colName: "ชื่อ", colEmail: "อีเมล", colProvider: "เข้าผ่าน",
      colRole: "สิทธิ์", colReadings: "ครั้ง", colJoined: "สมัครเมื่อ",
      types: { tarot: "ไพ่ทาโร่", poker: "ไพ่ป๊อก", birthday: "วันเกิด" },
      admin: "แอดมิน", user: "ผู้ใช้", none: "ยังไม่มีข้อมูล",
      reset: "ล้างสถิติทั้งหมด", confirmReset: "ล้างสถิติการใช้งานทั้งหมด? ย้อนกลับไม่ได้"
    }
  };

  // ---------- ปุ่ม (อยู่ใน index.html แล้ว) + โมดัล ----------
  const adminBtn = document.getElementById("adminBtn");

  const overlay = document.createElement("div");
  overlay.className = "admin-overlay";
  overlay.id = "adminOverlay";
  overlay.hidden = true;
  overlay.innerHTML =
    '<div class="admin-modal" role="dialog" aria-modal="true">' +
    '  <button class="admin-close" id="adminClose" aria-label="Close">✕</button>' +
    '  <h2 class="admin-title" id="adminTitle"></h2>' +
    '  <div class="admin-body" id="adminBody"></div>' +
    "</div>";
  document.body.appendChild(overlay);
  const adminBody = overlay.querySelector("#adminBody");

  // ---------- เครื่องมือวันที่ ----------
  function dayKey(d) { return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate(); }
  function fmtDate(iso) {
    if (!iso) return "-";
    const d = new Date(iso);
    if (isNaN(d)) return "-";
    return d.getDate() + "/" + (d.getMonth() + 1) + "/" + d.getFullYear();
  }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  }

  // ---------- วาดแดชบอร์ด ----------
  function render() {
    const t = T[curLang()];
    const users = getUsers();
    const events = getEvents();

    // สรุปประเภท
    const typeCount = { tarot: 0, poker: 0, birthday: 0 };
    events.forEach((e) => { if (typeCount[e.type] != null) typeCount[e.type]++; });

    // ผู้ใช้ต่อวัน (14 วัน)
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const days = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(today); d.setDate(today.getDate() - i); days.push(d);
    }
    const dayMap = {};
    events.forEach((e) => {
      const k = dayKey(new Date(e.ts));
      (dayMap[k] = dayMap[k] || new Set()).add(e.email);
    });
    const dayCounts = days.map((d) => ({ d: d, n: dayMap[dayKey(d)] ? dayMap[dayKey(d)].size : 0 }));
    const dayMax = Math.max(1, ...dayCounts.map((c) => c.n));
    const activeToday = dayCounts[dayCounts.length - 1].n;

    // ครั้งดูดวงต่อผู้ใช้
    const perUser = {};
    events.forEach((e) => { perUser[e.email] = (perUser[e.email] || 0) + 1; });

    // ----- summary cards -----
    let html =
      '<div class="admin-stats">' +
      statCard(t.totalUsers, users.length) +
      statCard(t.totalReadings, events.length) +
      statCard(t.activeToday, activeToday) +
      "</div>";

    // ----- กราฟผู้ใช้ต่อวัน -----
    html += '<h3 class="admin-h3">' + t.perDay + "</h3>";
    html += '<div class="daychart">';
    dayCounts.forEach((c) => {
      const h = Math.round((c.n / dayMax) * 100);
      html +=
        '<div class="daycol" title="' + c.n + '">' +
        '<div class="daybar-wrap"><div class="daybar" style="height:' + (c.n ? Math.max(h, 6) : 0) + '%">' +
        (c.n ? '<span class="daybar-n">' + c.n + "</span>" : "") +
        "</div></div>" +
        '<span class="daylabel">' + c.d.getDate() + "/" + (c.d.getMonth() + 1) + "</span>" +
        "</div>";
    });
    html += "</div>";

    // ----- แยกตามประเภท -----
    const typeMax = Math.max(1, typeCount.tarot, typeCount.poker, typeCount.birthday);
    html += '<h3 class="admin-h3">' + t.byType + "</h3>";
    html += '<div class="typebars">';
    ["tarot", "poker", "birthday"].forEach((k) => {
      const w = Math.round((typeCount[k] / typeMax) * 100);
      html +=
        '<div class="typerow">' +
        '<span class="typelabel">' + t.types[k] + "</span>" +
        '<div class="typebar-track"><div class="typebar ' + k + '" style="width:' + (typeCount[k] ? Math.max(w, 4) : 0) + '%"></div></div>' +
        '<span class="typeval">' + typeCount[k] + "</span>" +
        "</div>";
    });
    html += "</div>";

    // ----- ตารางผู้ใช้ -----
    html += '<h3 class="admin-h3">' + t.userList + "</h3>";
    if (!users.length) {
      html += '<p class="admin-none">' + t.none + "</p>";
    } else {
      html +=
        '<div class="admin-table-wrap"><table class="admin-table"><thead><tr>' +
        "<th>" + t.colName + "</th><th>" + t.colEmail + "</th><th>" + t.colProvider +
        "</th><th>" + t.colRole + "</th><th>" + t.colReadings + "</th><th>" + t.colJoined +
        "</tr></thead><tbody>";
      users
        .slice()
        .sort((a, b) => (perUser[b.email] || 0) - (perUser[a.email] || 0))
        .forEach((u) => {
          const roleTxt = u.role === "admin" ? t.admin : t.user;
          html +=
            "<tr>" +
            "<td>" + esc(u.name) + "</td>" +
            "<td>" + esc(u.email) + "</td>" +
            '<td class="prov">' + esc(u.provider || "email") + "</td>" +
            '<td><span class="role-tag ' + (u.role === "admin" ? "admin" : "") + '">' + roleTxt + "</span></td>" +
            '<td class="num">' + (perUser[u.email] || 0) + "</td>" +
            '<td class="joined">' + fmtDate(u.createdAt) + "</td>" +
            "</tr>";
        });
      html += "</tbody></table></div>";
    }

    html += '<button class="admin-reset" id="adminReset">' + t.reset + "</button>";

    adminBody.innerHTML = html;
    overlay.querySelector("#adminReset").addEventListener("click", () => {
      if (window.confirm(T[curLang()].confirmReset)) { saveEvents([]); render(); }
    });
  }

  function statCard(label, value) {
    return '<div class="stat-card"><span class="stat-value">' + value + '</span><span class="stat-label">' + label + "</span></div>";
  }

  // ---------- เปิด/ปิด ----------
  function open() {
    if (!isAdmin()) return;
    overlay.querySelector("#adminTitle").textContent = T[curLang()].title;
    render();
    overlay.hidden = false;
  }
  function close() { overlay.hidden = true; }

  adminBtn.addEventListener("click", open);
  overlay.querySelector("#adminClose").addEventListener("click", close);
  overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });

  // อัปเดตข้อความ/ปุ่มเมื่อเปลี่ยนภาษา
  document.querySelectorAll(".lang-btn").forEach((b) => {
    b.addEventListener("click", () => setTimeout(() => {
      adminBtn.textContent = T[curLang()].btn;
      if (!overlay.hidden) open();
    }, 0));
  });

  // ---------- API ให้ auth.js เรียก ----------
  function refresh() {
    adminBtn.textContent = T[curLang()].btn;
    adminBtn.hidden = !isAdmin();
    if (!isAdmin()) close();
  }
  window.LunaAdmin = { refresh: refresh };

  // ---------- เริ่มต้น ----------
  refresh();
})();
