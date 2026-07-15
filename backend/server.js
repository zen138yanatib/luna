// =====================================================================
// server.js — Luna Backend API (แข็งแรงขึ้น)
// ---------------------------------------------------------------------
//  ความปลอดภัย: helmet, ตรวจ input, นโยบายรหัสผ่าน, ล็อกบัญชีเมื่อกรอกผิดบ่อย,
//  ยืนยันอีเมลตอนสมัคร, access token (15 นาที) + refresh token
//
//  auth:   register / verify / resend-verify / login / refresh / logout / me
//  reset:  request-reset / reset
//  app:    events / ai/interpret / admin/stats / health
// =====================================================================

import "dotenv/config";
import { randomBytes } from "node:crypto";
import express from "express";
import cors from "cors";
import helmet from "helmet";

import { usersDB, eventsDB, refreshDB } from "./src/db.js";
import {
  hashPassword,
  verifyPassword,
  signAccessToken,
  verifyToken,
  isAdminIdentity,
  publicUser,
} from "./src/auth.js";
import { validateName, validateEmail, validatePassword, emailRe } from "./src/validate.js";

const app = express();
const PORT = process.env.PORT || 8787;
const DAILY_LIMIT = parseInt(process.env.DAILY_LIMIT || "0", 10);

// ---------- security headers ----------
app.use(
  helmet({
    contentSecurityPolicy: false, // เป็น API (ตอบ JSON/ข้อความ) ไม่ได้เสิร์ฟ HTML
    crossOriginResourcePolicy: { policy: "cross-origin" }, // ให้ frontend คนละ origin อ่านได้
  })
);

// ---------- CORS ----------
const origins = (process.env.CORS_ORIGIN || "*")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
app.use(cors({ origin: origins.includes("*") ? true : origins }));
app.use(express.json({ limit: "1mb" }));

const now = () => Date.now();
const nowISO = () => new Date().toISOString();

// ---------- token helpers ----------
const REFRESH_TTL = 30 * 24 * 60 * 60 * 1000; // 30 วัน
function issueTokens(user) {
  const accessToken = signAccessToken(user);
  const refreshToken = randomBytes(48).toString("hex");
  refreshDB.purge();
  refreshDB.add({ token: refreshToken, email: user.email, expires: now() + REFRESH_TTL });
  return { accessToken, refreshToken };
}

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

// ---------- ล็อกบัญชีเมื่อกรอกรหัสผิดบ่อย ----------
const MAX_FAILS = 5;
const LOCK_MS = 15 * 60 * 1000; // ล็อก 15 นาที
const fails = new Map(); // email -> { count, lockUntil }
function isLocked(email) {
  const f = fails.get(email);
  return !!(f && f.lockUntil && f.lockUntil > now());
}
function recordFail(email) {
  const f = fails.get(email) || { count: 0, lockUntil: 0 };
  f.count++;
  if (f.count >= MAX_FAILS) { f.lockUntil = now() + LOCK_MS; f.count = 0; }
  fails.set(email, f);
}
function clearFails(email) { fails.delete(email); }

// ---------- token ยืนยันอีเมล / รีเซ็ตรหัส (โหมดสาธิต: ยังไม่มีเซิร์ฟเวอร์อีเมล) ----------
const VERIFY_TTL = 24 * 60 * 60 * 1000;
const RESET_TTL = 30 * 60 * 1000;
const verifyTokens = new Map(); // token -> { email, expires }
const resetTokens = new Map();  // token -> { email, expires }
function purge(map) { const t = now(); for (const [k, v] of map) if (v.expires <= t) map.delete(k); }
function makeToken(map, email, ttl) {
  purge(map);
  const tk = randomBytes(24).toString("hex");
  map.set(tk, { email, expires: now() + ttl });
  return tk;
}

// ---------- role ----------
function resolveRole(user) {
  if (!user.role) {
    const noAdmin = !usersDB.all().some((u) => u.role === "admin");
    user.role = noAdmin || isAdminIdentity(user.email, user.name) ? "admin" : "user";
  } else if (isAdminIdentity(user.email, user.name) && user.role !== "admin") {
    user.role = "admin";
  }
}

// ================= health =================
app.get("/api/health", (req, res) => {
  res.json({ ok: true, time: now(), hasApiKey: !!process.env.ANTHROPIC_API_KEY });
});

// ================= สมัครสมาชิก (+ ยืนยันอีเมล) =================
app.post("/api/auth/register", async (req, res) => {
  const name = (req.body?.name || "").trim();
  const email = (req.body?.email || "").trim().toLowerCase();
  const password = req.body?.password || "";

  const err = validateName(name) || validateEmail(email) || validatePassword(password);
  if (err) return res.status(400).json({ error: err });
  if (usersDB.findByEmail(email)) return res.status(409).json({ error: "exists" });

  const isFirst = usersDB.all().length === 0;
  const user = {
    name, email,
    passHash: await hashPassword(password),
    provider: "email",
    role: isFirst || isAdminIdentity(email, name) ? "admin" : "user",
    verified: false,
    createdAt: nowISO(),
  };
  usersDB.add(user);

  const verifyToken = makeToken(verifyTokens, email, VERIFY_TTL);
  // ยังไม่มีระบบส่งอีเมล → ส่ง token กลับให้ frontend แสดงลิงก์ยืนยัน (เฟส 2 ค่อยส่งเมลจริง)
  res.json({ ok: true, needVerify: true, verifyToken });
});

// ยืนยันอีเมล
app.post("/api/auth/verify", (req, res) => {
  const token = req.body?.token || "";
  purge(verifyTokens);
  const entry = verifyTokens.get(token);
  if (!entry) return res.status(400).json({ error: "invalid_or_expired" });
  const user = usersDB.findByEmail(entry.email);
  if (!user) return res.status(400).json({ error: "invalid_or_expired" });
  user.verified = true;
  usersDB.save();
  verifyTokens.delete(token);
  res.json({ ok: true, email: user.email });
});

// ส่งลิงก์ยืนยันอีกครั้ง
app.post("/api/auth/resend-verify", (req, res) => {
  const email = (req.body?.email || "").trim().toLowerCase();
  const user = usersDB.findByEmail(email);
  if (!user || user.verified) return res.json({ ok: true }); // ไม่เปิดเผยสถานะบัญชี
  const verifyToken = makeToken(verifyTokens, email, VERIFY_TTL);
  res.json({ ok: true, verifyToken });
});

// ================= เข้าสู่ระบบ =================
app.post("/api/auth/login", async (req, res) => {
  const email = (req.body?.email || "").trim().toLowerCase();
  const password = req.body?.password || "";
  if (!emailRe.test(email) || !password) return res.status(400).json({ error: "invalid_credentials" });
  if (isLocked(email)) return res.status(423).json({ error: "account_locked" });

  const user = usersDB.findByEmail(email);
  if (!user || !user.passHash) { recordFail(email); return res.status(401).json({ error: "invalid_credentials" }); }

  const okPw = await verifyPassword(password, user.passHash);
  if (!okPw) { recordFail(email); return res.status(401).json({ error: "invalid_credentials" }); }

  if (!user.verified) return res.status(403).json({ error: "email_not_verified" });

  clearFails(email);
  resolveRole(user);
  if (!user.createdAt) user.createdAt = nowISO();
  usersDB.save();

  const { accessToken, refreshToken } = issueTokens(user);
  res.json({ accessToken, refreshToken, user: publicUser(user) });
});

// ต่ออายุ access token
app.post("/api/auth/refresh", (req, res) => {
  const refreshToken = req.body?.refreshToken || "";
  refreshDB.purge();
  const entry = refreshDB.find(refreshToken);
  if (!entry) return res.status(401).json({ error: "invalid_refresh" });
  const user = usersDB.findByEmail(entry.email);
  if (!user) { refreshDB.remove(refreshToken); return res.status(401).json({ error: "invalid_refresh" }); }
  res.json({ accessToken: signAccessToken(user), user: publicUser(user) });
});

// ออกจากระบบ (เพิกถอน refresh token)
app.post("/api/auth/logout", (req, res) => {
  const refreshToken = req.body?.refreshToken || "";
  if (refreshToken) refreshDB.remove(refreshToken);
  res.json({ ok: true });
});

// ข้อมูลตัวเอง
app.get("/api/auth/me", auth, (req, res) => {
  res.json({ user: publicUser(req.user) });
});

// ================= ลืมรหัสผ่าน =================
app.post("/api/auth/request-reset", (req, res) => {
  const email = (req.body?.email || "").trim().toLowerCase();
  const user = usersDB.findByEmail(email);
  if (!user || !user.passHash) return res.json({ ok: true }); // ไม่เปิดเผยสถานะบัญชี
  const resetToken = makeToken(resetTokens, email, RESET_TTL);
  res.json({ ok: true, resetToken });
});

app.post("/api/auth/reset", async (req, res) => {
  const token = req.body?.token || "";
  const password = req.body?.password || "";
  const pwErr = validatePassword(password);
  if (pwErr) return res.status(400).json({ error: pwErr });
  purge(resetTokens);
  const entry = resetTokens.get(token);
  if (!entry) return res.status(400).json({ error: "invalid_or_expired" });
  const user = usersDB.findByEmail(entry.email);
  if (!user) return res.status(400).json({ error: "invalid_or_expired" });
  user.passHash = await hashPassword(password);
  user.verified = true; // ตั้งรหัสใหม่ผ่านลิงก์ = ยืนยันความเป็นเจ้าของอีเมลแล้ว
  usersDB.save();
  resetTokens.delete(token);
  clearFails(user.email);
  res.json({ ok: true, email: user.email });
});

// ================= บันทึกสถิติการดูดวง =================
app.post("/api/events", auth, (req, res) => {
  const allowed = ["tarot", "poker", "birthday", "ai"];
  const type = allowed.includes(req.body?.type) ? req.body.type : "tarot";
  eventsDB.add({ email: req.user.email, name: req.user.name, type, ts: now() });
  res.json({ ok: true });
});

// ================= AI ทำนาย (proxy ไป Claude) =================
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
  const count = eventsDB.all().filter((e) => e.email === email && e.type === "ai" && e.ts >= since).length;
  return count >= DAILY_LIMIT;
}

app.post("/api/ai/interpret", auth, async (req, res) => {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return res.status(500).json({ error: "server_no_api_key" });

  const prompt = req.body?.prompt;
  if (!prompt || typeof prompt !== "string" || prompt.length > 8000)
    return res.status(400).json({ error: "bad_prompt" });
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
    return res.status(502).json({ error: "upstream_unreachable" });
  }
  if (!upstream.ok) {
    const detail = await upstream.text().catch(() => "");
    return res.status(502).json({ error: "upstream_error", status: upstream.status, detail });
  }

  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache");

  const reader = upstream.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
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
    /* สตรีมสะดุด — จบเท่าที่ได้ */
  }

  eventsDB.add({ email: req.user.email, name: req.user.name, type: "ai", model, ts: now() });
  res.end();
});

// ================= สถิติสำหรับแอดมิน =================
app.get("/api/admin/stats", auth, requireAdmin, (req, res) => {
  res.json({ users: usersDB.all().map(publicUser), events: eventsDB.all() });
});

app.listen(PORT, () => {
  console.log(`✦ Luna backend running on http://localhost:${PORT}`);
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn("  ⚠ ยังไม่ได้ตั้ง ANTHROPIC_API_KEY ใน .env — /api/ai/interpret จะยังใช้ไม่ได้");
  }
});
