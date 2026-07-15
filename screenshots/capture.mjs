/* =====================================================================
   capture.mjs — แคปหน้าจอ Luna ทุกหน้า ทั้งธีมสว่าง/มืด อัตโนมัติ
   ---------------------------------------------------------------------
   รันบนเครื่องคุณ (ไม่ต้องเปิด backend — สคริปต์จำลอง API ให้แล้ว):

     cd screenshots
     npm install           # ติดตั้ง playwright
     npx playwright install chromium
     npm run shots         # หรือ: node capture.mjs

   ผลลัพธ์: รูป .png ในโฟลเดอร์ screenshots/light และ screenshots/dark
   ===================================================================== */

import { chromium } from "playwright-core";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join } from "node:path";
import { mkdirSync } from "node:fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const INDEX = pathToFileURL(join(__dirname, "..", "index.html")).href;
const LANG = "th"; // เปลี่ยนเป็น "en" ได้ถ้าอยากได้ภาษาอังกฤษ

// ---------- ข้อมูลจำลอง (แทน backend) ----------
const ADMIN_USER = {
  name: "Yanatib", email: "yanatib@luna.app",
  provider: "email", role: "admin", createdAt: "2026-06-20T00:00:00.000Z",
};

function sampleStats() {
  const now = Date.now(), DAY = 86400000;
  const users = [
    ADMIN_USER,
    { name: "Ploy", email: "ploy@luna.app", provider: "google", role: "user", createdAt: new Date(now - 9 * DAY).toISOString() },
    { name: "Mark", email: "mark@luna.app", provider: "email", role: "user", createdAt: new Date(now - 6 * DAY).toISOString() },
    { name: "Nan", email: "nan@luna.app", provider: "facebook", role: "user", createdAt: new Date(now - 3 * DAY).toISOString() },
    { name: "Beam", email: "beam@luna.app", provider: "email", role: "user", createdAt: new Date(now - 1 * DAY).toISOString() },
  ];
  const types = ["tarot", "poker", "birthday"];
  const events = [];
  let seed = 7;
  const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
  for (let d = 13; d >= 0; d--) {
    const count = Math.floor(rnd() * 6);
    for (let i = 0; i < count; i++) {
      const u = users[Math.floor(rnd() * users.length)];
      const type = types[Math.floor(rnd() * types.length)];
      events.push({ email: u.email, name: u.name, type, ts: now - d * DAY - Math.floor(rnd() * DAY * 0.4) });
    }
  }
  return { users, events };
}

const READING =
  "ไพ่ทั้งสามทอแสงนุ่มนวล บอกเล่าเส้นทางที่กำลังคลี่คลายอย่างงดงาม " +
  "อดีตวางรากฐานของความพยายามไว้อย่างมั่นคง ปัจจุบันคือช่วงเวลาที่หัวใจเริ่มเปิดรับสิ่งใหม่ " +
  "และอนาคตกำลังพาก้าวเดินไปสู่ความสว่างไสว\n\n" +
  "ขอให้เชื่อมั่นในจังหวะของตัวเอง สิ่งดี ๆ กำลังผลิบานในเวลาที่เหมาะสม ✦";

// ---------- แคป 1 หน้า ----------
async function shot(browser, theme, outDir, s) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 2 });

  await ctx.addInitScript(([theme, lang, loggedIn]) => {
    localStorage.setItem("tarot_theme", theme);
    localStorage.setItem("tarot_lang", lang);
    if (loggedIn) localStorage.setItem("luna_token", "demo-token");
  }, [theme, LANG, s.loggedIn]);

  // จำลอง API ทั้งหมด (ไม่ต้องมี backend จริง)
  await ctx.route("**/api/auth/me", (r) =>
    s.loggedIn
      ? r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ user: ADMIN_USER }) })
      : r.fulfill({ status: 401, contentType: "application/json", body: '{"error":"unauthorized"}' })
  );
  await ctx.route("**/api/admin/stats", (r) =>
    r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(sampleStats()) })
  );
  await ctx.route("**/api/events", (r) =>
    r.fulfill({ status: 200, contentType: "application/json", body: '{"ok":true}' })
  );
  await ctx.route("**/api/ai/interpret", (r) =>
    r.fulfill({ status: 200, contentType: "text/plain; charset=utf-8", body: READING })
  );

  const page = await ctx.newPage();
  await page.goto(INDEX, { waitUntil: "load" });
  await page.waitForTimeout(700);

  // สลับภาษา (แอปหลัก + หน้า login)
  if (LANG === "th") {
    for (const sel of ['.lang-btn[data-lang="th"]', '.auth-lang button[data-lang="th"]']) {
      const el = page.locator(sel).first();
      try { if (await el.count()) await el.click({ timeout: 1000 }); } catch {}
    }
    await page.waitForTimeout(250);
  }

  await s.act(page);
  await page.waitForTimeout(500);
  await page.screenshot({ path: join(outDir, s.name + ".png"), fullPage: !!s.full });
  await ctx.close();
}

// ---------- ขั้นตอนของแต่ละหน้า ----------
async function draw1(p) {
  await p.click("#drawBtn");
  await p.waitForSelector(".pile-card", { timeout: 6000 });
  await p.waitForTimeout(400);
  await p.locator(".pile-card").first().click();
  await p.waitForSelector(".card.flipped", { timeout: 6000 });
  await p.waitForTimeout(1100);
}
async function interpret(p) {
  await p.click("#aiBtn");
  await p.waitForTimeout(1300);
}
async function birthday(p) {
  await p.click("#deckBirthday");
  await p.waitForSelector("#calTrigger", { timeout: 4000 });
  await p.click("#calTrigger");
  await p.waitForSelector("#calYear");
  await p.selectOption("#calYear", "2000");
  await p.selectOption("#calMonth", "5"); // มิถุนายน (0-based)
  await p.click('.cal-day[data-d="15"]');
  await p.click("#birthSubmit");
  await p.waitForSelector(".birth-hero-animal", { timeout: 5000 });
  await p.waitForTimeout(500);
}
async function admin(p) {
  await p.click("#adminBtn");
  await p.waitForSelector(".admin-table, .admin-none", { timeout: 5000 });
  await p.waitForTimeout(600);
}

const SHOTS = [
  { name: "01-login", loggedIn: false, full: false, act: async () => {} },
  { name: "02-home-tarot", loggedIn: true, full: true, act: async () => {} },
  { name: "03-reading", loggedIn: true, full: true, act: draw1 },
  { name: "04-ai-reading", loggedIn: true, full: true, act: async (p) => { await draw1(p); await interpret(p); } },
  { name: "05-playing-cards", loggedIn: true, full: true, act: async (p) => { await p.click("#deckPoker"); await p.waitForTimeout(500); } },
  { name: "06-birthday", loggedIn: true, full: true, act: async (p) => { await p.click("#deckBirthday"); await p.waitForTimeout(500); } },
  { name: "07-birthday-result", loggedIn: true, full: true, act: birthday },
  { name: "08-settings", loggedIn: true, full: false, act: async (p) => { await p.click("#settingsBtn"); await p.waitForTimeout(500); } },
  { name: "09-admin", loggedIn: true, full: false, act: admin },
];

// ใช้เบราว์เซอร์ที่ติดตั้งในเครื่องอยู่แล้ว (Edge/Chrome) — ไม่ต้องโหลดเพิ่ม
async function launchBrowser() {
  const tries = [{ channel: "msedge" }, { channel: "chrome" }, {}];
  let lastErr;
  for (const opt of tries) {
    try { return await chromium.launch(opt); } catch (e) { lastErr = e; }
  }
  throw new Error(
    "เปิดเบราว์เซอร์ไม่ได้ ต้องมี Microsoft Edge หรือ Google Chrome ในเครื่อง\n" + (lastErr ? lastErr.message : "")
  );
}

async function main() {
  const browser = await launchBrowser();
  for (const theme of ["light", "dark"]) {
    const outDir = join(__dirname, theme);
    mkdirSync(outDir, { recursive: true });
    for (const s of SHOTS) {
      try { await shot(browser, theme, outDir, s); console.log("✓", theme, s.name); }
      catch (e) { console.warn("✗", theme, s.name, "-", e.message); }
    }
  }
  await browser.close();
  console.log("\nเสร็จแล้ว! ดูรูปได้ที่ screenshots/light และ screenshots/dark");
}

main().catch((e) => { console.error(e); process.exit(1); });
