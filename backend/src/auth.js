// =====================================================================
// auth.js — เครื่องมือด้านการยืนยันตัวตน (แฮชรหัส, JWT, ตรวจสิทธิ์แอดมิน)
// =====================================================================

import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const SECRET = process.env.JWT_SECRET || "dev-insecure-secret-change-me";
const ADMIN_LIST = (process.env.ADMIN_EMAILS || "")
  .split(",")
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

export async function hashPassword(pw) {
  return bcrypt.hash(pw, 10);
}
export async function verifyPassword(pw, hash) {
  return bcrypt.compare(pw, hash);
}

export function signToken(user) {
  return jwt.sign({ sub: user.email }, SECRET, { expiresIn: "7d" });
}
export function verifyToken(token) {
  try {
    return jwt.verify(token, SECRET);
  } catch {
    return null;
  }
}

// ตรงกับรายชื่อแอดมินไหม (ใส่ได้ทั้งอีเมลเต็ม หรือชื่อผู้ใช้/ส่วนหน้า @)
export function isAdminIdentity(email, name) {
  email = (email || "").toLowerCase();
  name = (name || "").toLowerCase();
  const local = email.split("@")[0];
  return ADMIN_LIST.some((entry) =>
    entry.includes("@") ? email === entry : local === entry || name === entry
  );
}

// ตัดข้อมูลลับ (passHash, salt) ออกก่อนส่งกลับให้ client
export function publicUser(u) {
  return {
    name: u.name,
    email: u.email,
    provider: u.provider || "email",
    role: u.role || "user",
    createdAt: u.createdAt,
  };
}
