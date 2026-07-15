// =====================================================================
// validate.js — ตรวจสอบ input (อีเมล / ชื่อ / นโยบายรหัสผ่าน)
// คืนค่า null ถ้าผ่าน, หรือ error code (string) ถ้าไม่ผ่าน
// =====================================================================

export const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateName(name) {
  if (!name || typeof name !== "string") return "name_required";
  const n = name.trim();
  if (n.length < 2) return "name_short";
  if (n.length > 60) return "name_long";
  return null;
}

export function validateEmail(email) {
  if (!email || typeof email !== "string") return "email_required";
  if (email.length > 254 || !emailRe.test(email)) return "bad_email";
  return null;
}

// นโยบายรหัสผ่าน: อย่างน้อย 8 ตัว มีพิมพ์ใหญ่ พิมพ์เล็ก และตัวเลข
export function validatePassword(pw) {
  if (!pw || typeof pw !== "string") return "password_required";
  if (pw.length < 8) return "pw_short";
  if (pw.length > 128) return "pw_long";
  if (!/[a-z]/.test(pw)) return "pw_lower";
  if (!/[A-Z]/.test(pw)) return "pw_upper";
  if (!/[0-9]/.test(pw)) return "pw_digit";
  return null;
}
