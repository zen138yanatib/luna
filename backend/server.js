// =====================================================================
// server.js — Luna Backend API
// ---------------------------------------------------------------------
//   POST /api/auth/register   สมัคร -> { token, user }
//   POST /api/auth/login      เข้าสู่ระบบ -> { token, user }
//   GET  /api/auth/me         ข้อมูลตัวเอง (ต้องมี token)
//   POST /api/events          บันทึกการดูดวง { type } (ต้องมี token)
//   POST /api/ai/interpret    ให้ AI ทำนาย (สตรีมข้อความ, ต้องมี token)
//   GET  /api/admin/stats     สถิติทั้งหมด (เฉพาะแอดมิน)
//   GET  /api/health          เช็คว่าเซิร์ฟเวอร์ทำงาน
// =====================================================================

import "dotenv/config";
import express from "express";
import cors from "cors";

import { usersDB, eventsDB } from "./src/db.js";
import {
  hashPassword,
  verifyPassword,
  signToken,
  verifyToken,
  isAdminIdentity,
  publicUser,
} from "./src/auth.js";

const app = express();
const PORT = process.env.PORT || 8787;
const DAILY_LIMIT = parseInt(process.env.DAILY_LIMIT || "0", 10);

// อนุญาต origin ตาม .env (ค่าเริ่มต้น * = ทุกที่ เหมาะกับตอนทดสอบ)
const origins = (process.env.CORS_ORIGIN || "*")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
app.use(cors({ origin: origins.includes("*") ? true : origins }));
app.use(express.json({ limit: "1mb" }));

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ---------- middleware ----------
function auth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  const payload = verifyToken(token);
  const user = payload && usersDB.findByEmail(payload.sub);
  if (!user) return res.status(401).json({ error: "unauthorized" });
  req.user = user;
  next();
}
function requireAdmin(req, res, next) {
  if (req.user.role !== "admin") return res.status(403).json({ error: "forbidden" });
  next();
}

// ---------- health ----------
app.get("/api/health", (req, res) => {
  res.json({ ok: true, time: Date.now(), hasApiKey: !!process.env.ANTHROPIC_API_KEY });
});

// ---------- สมัครสมาชิก ----------
app.post("/api/auth/register", async (req, res) => {
  const name = (req.body?.name || "").trim();
  const email = (req.body?.email || "").trim().toLowerCase();
  const password = req.body?.password || "";

  if (!name || !email || !password) return res.status(400).json({ error: "missing_fields" });
  if (!emailRe.test(email)) return res.status(400).json({ error: "bad_email" });
  if (password.length < 6) return res.status(400).json({ error: "short_password" });
  if (usersDB.findByEmail(email)) return res.status(409).json({ error: "exists" });

  const isFirst = usersDB.all().length === 0;
  const user = {
    name,
    email,
    passHash: await hashPassword(password),
    provider: "email",
    role: isFirst || isAdminIdentity(email, name) ? "admin" : "user",
    createdAt: new Date().toISOString(),
  };
  usersDB.add(user);
  res.json({ token: signToken(user), user: publicUser(user) });
});

// ---------- เข้าสู่ระบบ ----------
app.post("/api/auth/login", async (req, res) => {
  const email = (req.body?.email || "").trim().toLowerCase();
  const password = req.body?.password || "";

  const user = usersDB.findByEmail(email);
  if (!user || !user.passHash) return res.status(401).json({ error: "invalid_credentials" });
  if (!(await verifyPassword(password, user.passHash)))
    return res.status(401).json({ error: "invalid_credentials" });

  // ยกระดับเป็นแอดมินถ้าตรงรายชื่อ หรือยังไม่มีแอดมินเลย
  if (!user.role) {
    const noAdmin = !usersDB.all().some((u) => u.role === "admin");
    user.role = noAdmin || isAdminIdentity(email, user.name) ? "admin" : "user";
    usersDB.save();
  } else if (isAdminIdentity(email, user.name) && user.role !== "admin") {
    user.role = "admin";
    usersDB.save();
  }
  res.json({ token: signToken(user), user: publicUser(user) });
});

// ---------- ข้อมูลตัวเอง ----------
app.get("/api/auth/me", auth, (req, res) => {
  res.json({ user: publicUser(req.user) });
});

// ---------- บันทึกสถิติการดูดวง ----------
app.post("/api/events", auth, (req, res) => {
  const allowed = ["tarot", "poker", "birthday", "ai"];
  const type = allowed.includes(req.body?.type) ? req.body.type : "tarot";
  eventsDB.add({ email: req.user.email, name: req.user.name, type, ts: Date.now() });
  res.json({ ok: true });
});

// ---------- AI ทำนาย (proxy ไป Claude + สตรีมกลับ) ----------
const ALLOWED_MODELS = new Set([
  "claude-haiku-4-5",
  "claude-sonnet-5",
  "claude-sonnet-4-6",
  "claude-opus-4-8",
]);
const SYSTEM_PROMPT =
  "You are a warm, insightful tarot and cartomancy reader. " +
  "Respond ONLY with the reading itself — no preamble, no reasoning, no meta-commentary, no headings. " +
  "Be poetic but clear, kind, and hopeful. Reply in the language requested by the user.";

function overQuota(email) {
  if (!DAILY_LIMIT) return false;
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const since = start.getTime();
  const count = eventsDB
    .all()
    .filter((e) => e.email === email && e.type === "ai" && e.ts >= since).length;
  return count >= DAILY_LIMIT;
}

app.post("/api/ai/interpret", auth, async (req, res) => {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return res.status(500).json({ error: "server_no_api_key" });

  const prompt = req.body?.prompt;
  if (!prompt || typeof prompt !== "string") return res.status(400).json({ error: "missing_prompt" });
  if (overQuota(req.user.email)) return res.status(429).json({ error: "daily_limit_reached" });

  const model = ALLOWED_MODELS.has(req.body?.model) ? req.body.model : "claude-haiku-4-5";

  let upstream;
  try {
    upstream = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: 700,
        stream: true,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: prompt }],
      }),
    });
  } catch (err) {
    return res.status(502).json({ error: "upstream_unreachable", detail: String(err) });
  }

  if (!upstream.ok) {
    const detail = await upstream.text().catch(() => "");
    return res.status(502).json({ error: "upstream_error", status: upstream.status, detail });
  }

  // สตรีมเฉพาะ "ข้อความ" กลับไปให้ frontend (แปลง SSE ของ Anthropic → text ล้วน)
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache");

  const decoder = new TextDecoder();
  let buffer = "";
  try {
    for await (const chunk of upstream.body) {
      buffer += decoder.decode(chunk, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop();
      for (const line of lines) {
        const t = line.trim();
        if (!t.startsWith("data:")) continue;
        const payload = t.slice(5).trim();
        if (!payload || payload === "[DONE]") continue;
        try {
          const ev = JSON.parse(payload);
          if (ev.type === "content_block_delta" && ev.delta?.type === "text_delta") {
            res.write(ev.delta.text);
          }
        } catch {
          /* ข้าม event ที่ parse ไม่ได้ */
        }
      }
    }
  } catch (err) {
    // สตรีมสะดุด — จบ response เท่าที่ได้
  }

  eventsDB.add({ email: req.user.email, name: req.user.name, type: "ai", model, ts: Date.now() });
  res.end();
});

// ---------- สถิติสำหรับแอดมิน ----------
app.get("/api/admin/stats", auth, requireAdmin, (req, res) => {
  res.json({
    users: usersDB.all().map(publicUser),
    events: eventsDB.all(),
  });
});

app.listen(PORT, () => {
  console.log(`✦ Luna backend running on http://localhost:${PORT}`);
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn("  ⚠ ยังไม่ได้ตั้ง ANTHROPIC_API_KEY ใน .env — /api/ai/interpret จะยังใช้ไม่ได้");
  }
});
