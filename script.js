(function () {
  const board = document.getElementById("board");
  const picker = document.getElementById("picker");
  const drawBtn = document.getElementById("drawBtn");
  const modeHint = document.getElementById("modeHint");
  const modeBtns = document.querySelectorAll(".mode-btn");
  const langBtns = document.querySelectorAll(".lang-btn");
  const deckBtns = document.querySelectorAll(".deck-btn");

  // ---------- AI elements ----------
  const aiBtn = document.getElementById("aiBtn");
  const aiBox = document.getElementById("aiBox");
  const aiContent = document.getElementById("aiContent");

  // settings modal
  const settingsBtn = document.getElementById("settingsBtn");
  const settingsOverlay = document.getElementById("settingsOverlay");
  const settingsClose = document.getElementById("settingsClose");
  const aiKeyInput = document.getElementById("aiKeyInput");
  const aiKeySave = document.getElementById("aiKeySave");
  const aiKeyRemove = document.getElementById("aiKeyRemove");
  const aiKeyStatus = document.getElementById("aiKeyStatus");
  const themeToggle = document.getElementById("themeToggle");
  const modelSwitch = document.getElementById("modelSwitch");
  const modelBtns = modelSwitch.querySelectorAll(".model-btn");
  const modelHint = document.getElementById("modelHint");

  const KEY_STORE = "anthropic_api_key";
  const THEME_STORE = "tarot_theme";
  const MODEL_STORE = "tarot_model";
  let runAfterSave = false; // เปิด settings เพราะกดทำนายแต่ยังไม่มี key

  // ค่าเริ่มต้น: ธีมสว่าง + โมเดล Haiku (ประหยัด)
  let theme = localStorage.getItem(THEME_STORE) || "light";
  let aiModel = localStorage.getItem(MODEL_STORE) || "claude-haiku-4-5";

  function applyTheme() {
    document.body.classList.toggle("dark", theme === "dark");
    themeToggle.checked = theme === "dark";
  }

  function applyModel() {
    modelBtns.forEach((b) => b.classList.toggle("active", b.dataset.model === aiModel));
    modelHint.textContent = UI_TEXT[lang].modelHints[aiModel] || "";
  }

  let mode = 1;        // จำนวนไพ่ที่จะเปิด
  let lang = "en";     // ภาษาปัจจุบัน
  let deck = "tarot";  // สำรับปัจจุบัน: tarot | poker
  let lastPicks = [];  // ไพ่ที่เลือกล่าสุด (เก็บไว้ re-render ตอนสลับภาษา)
  let picking = false; // กำลังอยู่ในขั้นตอนเลือกไพ่จากกองอยู่หรือไม่

  const DECKS = { tarot: TAROT_DECK, poker: POKER_DECK };

  // ---------- ใส่ข้อความ UI ตามภาษา/สำรับ ----------
  function applyLang() {
    const t = UI_TEXT[lang];
    document.documentElement.lang = lang;
    document.body.classList.toggle("th", lang === "th");

    document.getElementById("kicker").textContent = t.kicker;
    document.getElementById("title").textContent = deck === "poker" ? t.titlePoker : t.title;
    document.getElementById("subtitle").textContent = deck === "poker" ? t.subtitlePoker : t.subtitle;
    document.getElementById("deckTarot").textContent = t.deckTarot;
    document.getElementById("deckPoker").textContent = t.deckPoker;
    document.getElementById("modeBtn1").textContent = t.mode1;
    document.getElementById("modeBtn3").textContent = t.mode3;
    document.getElementById("drawLabel").textContent = t.draw;
    document.getElementById("footer").textContent = t.footer;
    if (picking) updatePickHint();
    else modeHint.textContent = mode === 1 ? t.hint1 : t.hint3;

    aiBtn.textContent = lastPicks.length && !aiBox.hidden ? t.aiReadAgain : t.aiButton;
    aiKeySave.textContent = t.aiKeySave;
    aiKeyRemove.textContent = t.aiKeyRemove;
    aiKeyInput.placeholder = t.aiKeyPlaceholder;
    document.getElementById("aiKeyTitle").textContent = t.aiKeyTitle;
    document.getElementById("aiKeyNote").textContent = t.aiKeyNote;
    document.getElementById("aiBoxTitle").textContent = t.aiBoxTitle;
    document.getElementById("settingsHeading").textContent = t.settingsHeading;
    document.getElementById("themeLabel").textContent = t.themeLabel;
    document.getElementById("modelLabel").textContent = t.modelLabel;
    modelHint.textContent = t.modelHints[aiModel] || "";
    refreshKeyStatus();

    if (lastPicks.length) render(lastPicks, true);
  }

  // ---------- สับสำรับ (Fisher–Yates) ----------
  function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // ---------- สร้างหน้าไพ่ ----------
  function frontInner(item) {
    const { card, reversed } = item;
    const t = UI_TEXT[lang];

    if (card.type === "poker") {
      // ถ้ารูปโหลดไม่ได้ ให้ย้อนกลับไปโชว์สัญลักษณ์แต้มไพ่แทน
      const art = card.img
        ? `<img class="card-art" src="${card.img}" alt="${card.name.en}" loading="lazy"
                onerror="this.style.display='none';this.nextElementSibling.style.display='flex';" />
           <div class="poker-pip ${card.color}" style="display:none">
             <span class="pip-rank">${card.rank}</span><span class="pip-suit">${card.symbol}</span>
           </div>`
        : `<div class="poker-pip ${card.color}">
             <span class="pip-rank">${card.rank}</span><span class="pip-suit">${card.symbol}</span>
           </div>`;
      return `
        ${art}
        <div class="card-name">${card.name[lang]}</div>
        <p class="card-meaning">${card.up[lang]}</p>
        <p class="card-keywords">${card.kw[lang]}</p>`;
    }

    // ไพ่ทาโร่ — ใช้รูป Rider–Waite จริง (ไพ่กลับหัว = หมุนรูป 180°)
    const meaning = reversed ? card.rev[lang] : card.up[lang];
    const orientationClass = reversed ? "reversed" : "up";
    const orientationText = reversed ? t.reversed : t.upright;
    const src = "assets/tarot/" + String(card.n).padStart(2, "0") + ".jpg";
    const artClass = "card-art" + (reversed ? " flipped-art" : "");
    return `
      <img class="${artClass}" src="${src}" alt="${card.name.en}" loading="lazy"
           onerror="this.style.display='none';this.nextElementSibling.style.display='block';" />
      <div class="card-emoji" style="display:none">${card.emoji}</div>
      <div class="card-name">${card.name[lang]}</div>
      <span class="orientation ${orientationClass}">${orientationText}</span>
      <p class="card-meaning">${meaning}</p>
      <p class="card-keywords">${card.kw[lang]}</p>`;
  }

  function makeCardEl(item, label, delay) {
    const t = UI_TEXT[lang];
    const wrap = document.createElement("div");
    wrap.className = "card" + (item.card.type === "poker" ? " poker" : "");
    wrap.style.animationDelay = delay + "s";

    wrap.innerHTML = `
      <div class="card-inner">
        <div class="card-face card-back">
          <div class="ornament">${item.card.type === "poker" ? "🂠" : "✦"}</div>
          <small>${t.tapReveal}</small>
        </div>
        <div class="card-face card-front">
          <span class="pos-label">${label}</span>
          ${frontInner(item)}
        </div>
      </div>`;

    wrap.addEventListener("click", () => wrap.classList.add("flipped"));
    return wrap;
  }

  // instant = true เมื่อแค่สลับภาษา (ไม่ต้องเล่นอนิเมชันพลิกใหม่)
  function render(picks, instant) {
    board.innerHTML = "";
    const labels = SPREAD_LABELS[picks.length][lang];

    picks.forEach((item, i) => {
      const el = makeCardEl(item, labels[i], instant ? 0 : i * 0.16);
      board.appendChild(el);
      if (instant) {
        el.classList.add("flipped");
      } else {
        setTimeout(() => el.classList.add("flipped"), 450 + i * 350);
      }
    });
  }

  function resetAI() {
    aiBox.hidden = true;
    aiContent.textContent = "";
    aiContent.classList.remove("loading");
    aiBtn.textContent = UI_TEXT[lang].aiButton;
  }

  let dealing = false;

  // ล้างกองไพ่ที่กำลังให้เลือก
  function resetPicker() {
    picking = false;
    picker.hidden = true;
    picker.classList.remove("done");
    picker.innerHTML = "";
  }

  // อัปเดตข้อความบอกว่าเหลือให้เลือกอีกกี่ใบ
  function updatePickHint() {
    const t = UI_TEXT[lang];
    const remaining = mode - lastPicks.length;
    modeHint.textContent =
      remaining > 0 ? t.pickRemaining.replace("{n}", remaining) : t.pickDone;
  }

  // วางกองไพ่คว่ำทั้งสำรับเป็นรูปพัด ให้ผู้ใช้แตะเลือกเอง
  function buildPile() {
    picker.hidden = false;
    picker.classList.remove("done");
    picker.innerHTML = '<div class="fan-inner"></div>';
    const inner = picker.querySelector(".fan-inner");

    const order = shuffle(DECKS[deck]);
    order.forEach((card) => {
      const el = document.createElement("button");
      el.type = "button";
      el.className = "pile-card";
      el.setAttribute("aria-label", UI_TEXT[lang].pickAria);
      el.innerHTML =
        '<span class="pile-face">' + (card.type === "poker" ? "🂠" : "✦") + "</span>";
      el.addEventListener("click", () => choosePileCard(el, card));
      inner.appendChild(el);
    });

    layoutFan();
    picking = true;
    updatePickHint();
  }

  // จัดตำแหน่งไพ่ในกองให้โค้งเป็นรูปพัด
  function layoutFan() {
    const inner = picker.querySelector(".fan-inner");
    if (!inner) return;
    const cards = inner.querySelectorAll(".pile-card");
    const n = cards.length;
    if (!n) return;

    const cw = cards[0].offsetWidth || 78;
    const ch = cards[0].offsetHeight || 116;
    const viewport = picker.clientWidth || 900;

    // เว้นขอบ (cw/2 + ระยะเผื่อการหมุนของไพ่ปลายพัด) สองข้าง เพื่อให้พัดพอดีจอโดยไม่ต้องเลื่อน
    let step = (viewport - cw - 64) / (n - 1);
    step = Math.min(step, 30);        // ไพ่น้อยใบไม่ต้องกางกว้างเกินไป
    if (step < 6) step = 6;

    inner.style.width = viewport + "px"; // เต็มความกว้างพอดี ไม่มี overflow
    inner.style.height = ch + 74 + "px";

    const center = viewport / 2;
    const mid = (n - 1) / 2;
    const angStep = Math.min(0.9, 42 / mid); // องศาความกาง จำกัดไม่ให้บานเกินไป

    cards.forEach((el, i) => {
      const off = i - mid;
      const x = center + off * step - cw / 2;
      const rot = off * angStep;
      const y = 38 + off * off * 0.04; // โค้งลงเล็กน้อยตรงปลายพัด
      el.style.setProperty("--x", x.toFixed(1) + "px");
      el.style.setProperty("--y", y.toFixed(1) + "px");
      el.style.setProperty("--rot", rot.toFixed(2) + "deg");
      el.style.zIndex = i;
    });
  }

  // ผู้ใช้แตะเลือกไพ่หนึ่งใบจากกอง → ย้ายมาที่กระดานแล้วพลิกเผยความหมาย
  function choosePileCard(el, card) {
    if (el.classList.contains("taken") || lastPicks.length >= mode) return;
    el.classList.add("taken");
    el.disabled = true;

    // ไพ่ทาโร่มีโอกาสกลับหัว ส่วนไพ่ป๊อกไม่มี
    const reversed = card.type === "poker" ? false : Math.random() < 0.35;
    const item = { card, reversed };
    const idx = lastPicks.length;
    lastPicks.push(item);

    const labels = SPREAD_LABELS[mode][lang];
    const cardEl = makeCardEl(item, labels[idx], 0);
    board.appendChild(cardEl);
    setTimeout(() => cardEl.classList.add("flipped"), 260);

    updatePickHint();

    if (lastPicks.length >= mode) {
      picking = false;
      if (window.LunaAnalytics) window.LunaAnalytics.track(deck); // เก็บสถิติการดูดวง
      picker.classList.add("done");
      setTimeout(() => resetPicker(), 560);
      setTimeout(
        () => board.scrollIntoView({ behavior: "smooth", block: "nearest" }),
        160
      );
    }
  }

  // กดปุ่ม "สับไพ่" → โชว์อนิเมชันสับไพ่ แล้ววางกองให้เลือกเอง
  function startPick() {
    if (dealing) return;
    dealing = true;
    drawBtn.disabled = true;
    drawBtn.classList.add("shuffling");

    lastPicks = [];
    resetAI();
    board.innerHTML = "";

    picker.hidden = false;
    picker.classList.remove("done");
    picker.innerHTML =
      '<div class="shuffle"><span></span><span></span><span></span><span></span><span></span></div>';
    picker.scrollIntoView({ behavior: "smooth", block: "nearest" });

    setTimeout(() => {
      buildPile();
      dealing = false;
      drawBtn.disabled = false;
      drawBtn.classList.remove("shuffling");
    }, 780);
  }

  // ---------- events ----------
  modeBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      modeBtns.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      mode = Number(btn.dataset.mode);
      // เปลี่ยนจำนวนไพ่แล้วเริ่มใหม่: ล้างกองและไพ่ที่เลือกไว้
      resetPicker();
      lastPicks = [];
      board.innerHTML = "";
      resetAI();
      modeHint.textContent = mode === 1 ? UI_TEXT[lang].hint1 : UI_TEXT[lang].hint3;
    });
  });

  langBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      if (btn.dataset.lang === lang) return;
      langBtns.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      lang = btn.dataset.lang;
      applyLang();
    });
  });

  deckBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      if (btn.dataset.deck === deck) return;
      deckBtns.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      deck = btn.dataset.deck;
      lastPicks = [];        // เปลี่ยนสำรับแล้วล้างไพ่เดิม
      resetPicker();
      board.innerHTML = "";
      resetAI();
      applyLang();
    });
  });

  drawBtn.addEventListener("click", startPick);

  // ---------- AI interpretation ----------
  // สร้างคำอธิบายไพ่ที่เปิดได้ เพื่อส่งให้ Claude วิเคราะห์
  function buildPrompt() {
    const labels = SPREAD_LABELS[lastPicks.length][lang];
    const deckName = deck === "poker" ? "playing-card (cartomancy)" : "tarot";
    const lines = lastPicks.map((item, i) => {
      const c = item.card;
      const name = c.name.en;
      const meaning = (item.reversed ? c.rev : c.up).en;
      const orient = c.type === "poker" ? "" : item.reversed ? " (reversed)" : " (upright)";
      return `${i + 1}. [${labels[i]}] ${name}${orient} — ${meaning}`;
    });
    const langName = lang === "th" ? "Thai" : "English";
    return (
      `A querent has drawn a ${deckName} spread. The cards are:\n\n` +
      lines.join("\n") +
      `\n\nGive a warm, encouraging fortune reading in ${langName}. ` +
      `Weave the cards together into one flowing story (don't just list them), ` +
      `relate each card to its position, and end with one gentle piece of guidance. ` +
      `Keep it to about 3 short paragraphs.`
    );
  }

  const SYSTEM_PROMPT =
    "You are a warm, insightful tarot and cartomancy reader. " +
    "Respond ONLY with the reading itself — no preamble, no reasoning, no meta-commentary, no headings. " +
    "Be poetic but clear, kind, and hopeful. Reply in the language requested by the user.";

  // เรียก AI ผ่าน backend (POST /api/ai/interpret) — API key อยู่ฝั่ง server
  // backend สตรีมกลับมาเป็น "ข้อความล้วน" จึงต่อ chunk ได้เลย
  async function streamReading(onDelta) {
    const LA = window.LunaAuth;
    const base = (LA && LA.base) || (window.LUNA_CONFIG && window.LUNA_CONFIG.apiBase) || "";
    const token = LA ? LA.getToken() : "";
    const res = await fetch(base + "/api/ai/interpret", {
      method: "POST",
      headers: Object.assign(
        { "content-type": "application/json" },
        token ? { Authorization: "Bearer " + token } : {}
      ),
      body: JSON.stringify({ prompt: buildPrompt(), model: aiModel })
    });

    if (!res.ok) {
      let detail = "HTTP " + res.status;
      try {
        const err = await res.json();
        if (err && err.error) detail = err.error;
      } catch (e) {}
      throw new Error(detail);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      onDelta(decoder.decode(value, { stream: true }));
    }
  }

  let aiBusy = false;

  // อัปเดตสถานะ key ในหน้า settings
  function refreshKeyStatus() {
    const t = UI_TEXT[lang];
    const has = !!localStorage.getItem(KEY_STORE);
    aiKeyStatus.textContent = has ? t.aiKeySaved : t.aiKeyNone;
    aiKeyStatus.classList.toggle("ok", has);
    aiKeyRemove.hidden = !has;
  }

  function openSettings() {
    refreshKeyStatus();
    settingsOverlay.hidden = false;
    aiKeyInput.focus();
  }

  function closeSettings() {
    settingsOverlay.hidden = true;
    aiKeyInput.value = "";
    runAfterSave = false;
  }

  async function interpret() {
    if (aiBusy) return;
    const t = UI_TEXT[lang];

    if (!lastPicks.length) {
      aiBox.hidden = false;
      aiContent.textContent = t.aiNoCards;
      return;
    }

    aiBusy = true;
    aiBtn.disabled = true;
    aiBox.hidden = false;
    aiContent.textContent = "";
    aiContent.classList.add("loading");
    aiContent.textContent = t.aiThinking + " …";

    let first = true;
    try {
      await streamReading((chunk) => {
        if (first) {
          aiContent.textContent = "";
          aiContent.classList.remove("loading");
          first = false;
        }
        aiContent.textContent += chunk;
      });
      if (first) aiContent.textContent = t.aiError;
    } catch (err) {
      aiContent.classList.remove("loading");
      aiContent.textContent = t.aiError + "\n(" + err.message + ")";
    } finally {
      aiBusy = false;
      aiBtn.disabled = false;
      aiBtn.textContent = t.aiReadAgain;
    }
  }

  aiBtn.addEventListener("click", interpret);

  settingsBtn.addEventListener("click", openSettings);
  settingsClose.addEventListener("click", closeSettings);
  settingsOverlay.addEventListener("click", (e) => {
    if (e.target === settingsOverlay) closeSettings();
  });

  aiKeySave.addEventListener("click", () => {
    const v = aiKeyInput.value.trim();
    if (!v) return;
    localStorage.setItem(KEY_STORE, v);
    aiKeyInput.value = "";
    const shouldRun = runAfterSave;
    closeSettings();
    if (shouldRun) interpret();
  });

  aiKeyInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") aiKeySave.click();
  });

  aiKeyRemove.addEventListener("click", () => {
    localStorage.removeItem(KEY_STORE);
    refreshKeyStatus();
    aiKeyInput.focus();
  });

  themeToggle.addEventListener("change", () => {
    theme = themeToggle.checked ? "dark" : "light";
    localStorage.setItem(THEME_STORE, theme);
    applyTheme();
  });

  modelBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      aiModel = btn.dataset.model;
      localStorage.setItem(MODEL_STORE, aiModel);
      applyModel();
    });
  });

  // จัดรูปพัดใหม่เมื่อขนาดหน้าจอเปลี่ยน
  let fanResizeTimer;
  window.addEventListener("resize", () => {
    if (!picking) return;
    clearTimeout(fanResizeTimer);
    fanResizeTimer = setTimeout(layoutFan, 150);
  });

  // โหมด server: API key อยู่ฝั่ง backend แล้ว จึงซ่อนช่องกรอก key ในหน้า Settings
  const keyTitleEl = document.getElementById("aiKeyTitle");
  const keyBlock = keyTitleEl && keyTitleEl.closest(".settings-block");
  if (keyBlock) keyBlock.style.display = "none";

  applyTheme();
  applyModel();
  applyLang();
})();
