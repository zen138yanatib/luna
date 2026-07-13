/* =====================================================================
   birthday.js — ดูดวงวันเดือนปีเกิด (เลข 1-7 + ตารางสัตว์)
   ---------------------------------------------------------------------
   โครงระบบพร้อมใช้ รอ "วิธีดูจริง" จากคุณ แล้วแก้แค่ 2 จุดด้านล่างนี้:

     [ จุดที่ 1 ] ANIMALS  — ตารางสัตว์ 7 ตัว (เลข 1-7) + คำทำนาย
     [ จุดที่ 2 ] computeNumber() — สูตรแปลงวันเกิด → เลข 1-7

   ตอนนี้ใส่ค่า "ตัวอย่าง" ไว้ก่อน (วัว เสือ นาก ... + คิดจากวันในสัปดาห์)
   เมื่อคุณส่งตำรามา ผมจะเปลี่ยนให้ตรงกับของจริง
   ===================================================================== */

(function () {
  const LANG_KEY = "tarot_lang";
  function curLang() {
    return localStorage.getItem(LANG_KEY) || (document.body.classList.contains("th") ? "th" : "en");
  }

  /* ============================================================
     [ จุดที่ 1 ]  ตารางสัตว์ประจำเลข 1-7  (แก้ตรงนี้ตามตำราจริง)
     ============================================================ */
  const ANIMALS = [
    { num: 1, emoji: "🐮", name: { th: "วัว", en: "Ox" },
      desc: { th: "ขยัน อดทน หนักแน่น เป็นที่พึ่งของคนรอบข้าง การงานมั่นคงจากความเพียร",
              en: "Diligent, patient, and steady — a dependable soul whose effort builds lasting security." } },
    { num: 2, emoji: "🐯", name: { th: "เสือ", en: "Tiger" },
      desc: { th: "กล้าหาญ มีอำนาจ เป็นผู้นำโดยธรรมชาติ องอาจแต่ต้องระวังใจร้อน",
              en: "Brave and commanding — a natural leader, bold of heart, but mindful of a quick temper." } },
    { num: 3, emoji: "🦦", name: { th: "นาก", en: "Otter" },
      desc: { th: "เฉลียวฉลาด ปรับตัวเก่ง มีเสน่ห์ เข้ากับผู้คนได้ง่าย โชคด้านมิตรภาพดี",
              en: "Clever and adaptable, full of charm — makes friends easily and is blessed in relationships." } },
    /* ── ด้านล่างเป็นตัวอย่าง (placeholder) รอตำราจริงจากคุณ ── */
    { num: 4, emoji: "🐘", name: { th: "ช้าง", en: "Elephant" },
      desc: { th: "ใจกว้าง มีบารมี มั่นคง ผู้ใหญ่เมตตา ค่อยเป็นค่อยไปแต่ยั่งยืน",
              en: "Generous and dignified — respected and supported by elders; slow but enduring success." } },
    { num: 5, emoji: "🦁", name: { th: "สิงห์", en: "Lion" },
      desc: { th: "สง่างาม เชื่อมั่นในตัวเอง มีเกียรติ ทำสิ่งใดมักโดดเด่นเป็นที่จับตา",
              en: "Proud and self-assured — carries a noble air and tends to stand out wherever they go." } },
    { num: 6, emoji: "🐴", name: { th: "ม้า", en: "Horse" },
      desc: { th: "รักอิสระ กระตือรือร้น เดินทางบ่อย พลังงานล้น ไม่ชอบอยู่นิ่ง",
              en: "Free-spirited and energetic — a frequent traveller who thrives on movement and change." } },
    { num: 7, emoji: "🐭", name: { th: "หนู", en: "Rat" },
      desc: { th: "ช่างสังเกต รอบคอบ เก็บออมเก่ง มองการณ์ไกล เอาตัวรอดได้ในทุกสถานการณ์",
              en: "Observant and prudent — a careful saver with foresight who adapts and survives anything." } }
  ];

  /* ============================================================
     [ จุดที่ 2 ]  สูตรคำนวณเลข 1-7 จากวันเกิด  (แก้ตรงนี้ตามตำราจริง)
     ตอนนี้ใช้ "วันในสัปดาห์" เป็นตัวอย่าง (อาทิตย์=1 ... เสาร์=7)
     ============================================================ */
  function computeNumber(day, month, year) {
    const dow = new Date(year, month - 1, day).getDay(); // 0=อาทิตย์ ... 6=เสาร์
    return dow + 1; // → 1..7
  }

  // ---------- ข้อความสองภาษา ----------
  const T = {
    en: {
      deckBtn: "🎂 Birth Date",
      title: "Luna",
      subtitle: "Enter your date of birth to reveal your number and day-animal.",
      birthdate: "Date of birth",
      pickPrompt: "Select your date…",
      months: ["January","February","March","April","May","June","July","August","September","October","November","December"],
      weekShort: ["Su","Mo","Tu","We","Th","Fr","Sa"],
      reveal: "Reveal my reading ✨",
      needDate: "Please pick your date of birth first ✦",
      bornOn: "You were born on",
      yourNumber: "Your number",
      tableTitle: "The seven animals (1–7)",
      dows: ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"]
    },
    th: {
      deckBtn: "🎂 วันเกิด",
      title: "Luna",
      subtitle: "กรอกวันเดือนปีเกิดของคุณ เพื่อดูเลขประจำตัวและสัตว์ประจำวันเกิด",
      birthdate: "วันเดือนปีเกิด",
      pickPrompt: "เลือกวันเกิดของคุณ…",
      months: ["มกราคม","กุมภาพันธ์","มีนาคม","เมษายน","พฤษภาคม","มิถุนายน","กรกฎาคม","สิงหาคม","กันยายน","ตุลาคม","พฤศจิกายน","ธันวาคม"],
      weekShort: ["อา","จ","อ","พ","พฤ","ศ","ส"],
      reveal: "ดูดวงของฉัน ✨",
      needDate: "กรุณาเลือกวันเดือนปีเกิดก่อนนะคะ ✦",
      bornOn: "คุณเกิดวัน",
      yourNumber: "เลขประจำตัวของคุณ",
      tableTitle: "สัตว์ประจำเลข 1-7",
      dows: ["อาทิตย์","จันทร์","อังคาร","พุธ","พฤหัสบดี","ศุกร์","เสาร์"]
    }
  };

  // ---------- element ----------
  const $ = (id) => document.getElementById(id);
  const section = $("birthSection");
  const form = $("birthForm");
  const result = $("birthResult");
  const deckBtns = document.querySelectorAll(".deck-btn");

  // ปฏิทิน
  const calTrigger = $("calTrigger");
  const calDisplay = $("calDisplay");
  const calPop = $("calPop");
  const calPrev = $("calPrev");
  const calNext = $("calNext");
  const calMonth = $("calMonth");
  const calYear = $("calYear");
  const calWeekdays = $("calWeekdays");
  const calGrid = $("calGrid");

  const MAX_YEAR = new Date().getFullYear();
  const MIN_YEAR = 1920;

  let active = false;         // อยู่ในโหมดวันเกิดหรือไม่
  let lastReading = null;     // {day, month, year} เก็บไว้ re-render ตอนเปลี่ยนภาษา
  let selected = null;        // {day, month(1-12), year} วันที่เลือกจากปฏิทิน
  let view = { y: 2000, m: 0 }; // เดือน/ปีที่ปฏิทินกำลังแสดง

  // ---------- ปฏิทิน ----------
  function buildYearOptions() {
    let html = "";
    for (let y = MAX_YEAR; y >= MIN_YEAR; y--) html += '<option value="' + y + '">' + y + "</option>";
    calYear.innerHTML = html;
  }
  function buildMonthOptions() {
    const t = T[curLang()];
    calMonth.innerHTML = t.months.map((m, i) => '<option value="' + i + '">' + m + "</option>").join("");
  }
  function renderWeekdays() {
    calWeekdays.innerHTML = T[curLang()].weekShort.map((w) => "<span>" + w + "</span>").join("");
  }
  function renderGrid() {
    calMonth.value = view.m;
    calYear.value = view.y;
    const firstDow = new Date(view.y, view.m, 1).getDay(); // 0=อาทิตย์
    const daysInMonth = new Date(view.y, view.m + 1, 0).getDate();
    let cells = "";
    for (let i = 0; i < firstDow; i++) cells += '<span class="cal-day empty"></span>';
    for (let d = 1; d <= daysInMonth; d++) {
      const on = selected && selected.year === view.y && selected.month === view.m + 1 && selected.day === d;
      cells += '<button type="button" class="cal-day' + (on ? " sel" : "") + '" data-d="' + d + '">' + d + "</button>";
    }
    calGrid.innerHTML = cells;
  }
  function openPop() {
    if (selected) { view = { y: selected.year, m: selected.month - 1 }; }
    renderGrid();
    calPop.hidden = false;
  }
  function closePop() { calPop.hidden = true; }
  function togglePop() { calPop.hidden ? openPop() : closePop(); }

  function updateDisplay() {
    const t = T[curLang()];
    calDisplay.textContent = selected
      ? selected.day + " " + t.months[selected.month - 1] + " " + selected.year
      : t.pickPrompt;
  }

  function selectDay(d) {
    selected = { day: d, month: view.m + 1, year: view.y };
    updateDisplay();
    renderGrid();
    closePop();
  }

  calTrigger.addEventListener("click", (e) => { e.stopPropagation(); togglePop(); });
  calPop.addEventListener("click", (e) => e.stopPropagation());
  document.addEventListener("click", () => { if (!calPop.hidden) closePop(); });

  calPrev.addEventListener("click", () => {
    view.m--; if (view.m < 0) { view.m = 11; view.y = Math.max(MIN_YEAR, view.y - 1); } renderGrid();
  });
  calNext.addEventListener("click", () => {
    view.m++; if (view.m > 11) { view.m = 0; view.y = Math.min(MAX_YEAR, view.y + 1); } renderGrid();
  });
  calMonth.addEventListener("change", () => { view.m = parseInt(calMonth.value, 10); renderGrid(); });
  calYear.addEventListener("change", () => { view.y = parseInt(calYear.value, 10); renderGrid(); });
  calGrid.addEventListener("click", (e) => {
    const btn = e.target.closest(".cal-day[data-d]");
    if (btn) selectDay(parseInt(btn.dataset.d, 10));
  });

  // ---------- ปรับข้อความตามภาษา ----------
  function applyLang() {
    const t = T[curLang()];
    $("deckBirthday").textContent = t.deckBtn;
    $("lblBirthdate").textContent = t.birthdate;
    $("birthSubmit").textContent = t.reveal;

    const keepMonth = calMonth.value;
    buildMonthOptions();
    if (keepMonth !== "") calMonth.value = keepMonth;
    renderWeekdays();
    updateDisplay();
    if (!calPop.hidden) renderGrid();

    if (active) {
      $("title").textContent = t.title;
      $("subtitle").textContent = t.subtitle;
    }
    if (lastReading) renderReading(lastReading);
  }

  // ---------- แสดงผลคำทำนาย ----------
  function renderReading(r) {
    const lang = curLang();
    const t = T[lang];
    const num = computeNumber(r.day, r.month, r.year);
    const animal = ANIMALS.find((a) => a.num === num) || ANIMALS[0];
    const dow = new Date(r.year, r.month - 1, r.day).getDay();

    const rows = ANIMALS.map((a) => {
      const on = a.num === num;
      return (
        '<div class="animal-cell' + (on ? " on" : "") + '">' +
        '<span class="animal-num">' + a.num + "</span>" +
        '<span class="animal-emoji">' + a.emoji + "</span>" +
        '<span class="animal-name">' + a.name[lang] + "</span>" +
        "</div>"
      );
    }).join("");

    result.innerHTML =
      '<div class="birth-headline">' +
        '<span class="birth-born">' + t.bornOn + " " + t.dows[dow] + "</span>" +
        '<span class="birth-num-badge">' + t.yourNumber + " · " + num + "</span>" +
      "</div>" +
      '<div class="birth-hero-animal">' +
        '<span class="hero-emoji">' + animal.emoji + "</span>" +
        '<div class="hero-text">' +
          '<span class="hero-name">' + animal.name[lang] + "</span>" +
          '<p class="hero-desc">' + animal.desc[lang] + "</p>" +
        "</div>" +
      "</div>" +
      '<h3 class="birth-table-title">' + t.tableTitle + "</h3>" +
      '<div class="animal-grid">' + rows + "</div>";
    result.classList.add("show");
  }

  // ---------- เข้า/ออกโหมดวันเกิด ----------
  function enter() {
    active = true;
    document.body.classList.add("birthday-mode");
    section.hidden = false;
    deckBtns.forEach((b) => b.classList.toggle("active", b.id === "deckBirthday"));
    const t = T[curLang()];
    $("title").textContent = t.title;
    $("subtitle").textContent = t.subtitle;
  }
  function exit() {
    if (!active) return;
    active = false;
    document.body.classList.remove("birthday-mode");
    section.hidden = true;
    closePop();
  }

  // ---------- events ----------
  $("deckBirthday").addEventListener("click", enter);

  deckBtns.forEach((b) => {
    if (b.id === "deckBirthday") return;
    b.addEventListener("click", () => {
      exit();
      deckBtns.forEach((x) => x.classList.toggle("active", x === b));
    });
  });

  document.querySelectorAll(".lang-btn").forEach((b) => {
    b.addEventListener("click", () => setTimeout(applyLang, 0));
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const t = T[curLang()];
    if (!selected) {
      result.innerHTML = '<p class="birth-msg">' + t.needDate + "</p>";
      result.classList.add("show");
      return;
    }
    lastReading = { day: selected.day, month: selected.month, year: selected.year };
    renderReading(lastReading);
    if (window.LunaAnalytics) window.LunaAnalytics.track("birthday"); // เก็บสถิติการดูดวง
    result.scrollIntoView({ behavior: "smooth", block: "nearest" });
  });

  // ---------- เริ่มต้น ----------
  buildYearOptions();
  applyLang(); // ตั้งเดือน/วัน/ป้ายกำกับตามภาษาที่บันทึกไว้
})();
