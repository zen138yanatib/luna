# Luna Backend API

Backend สำหรับแอปดูดวง Luna — จัดการ **สมาชิก (JWT)**, **เรียก Claude ฝั่ง server** (ซ่อน API key), และ **เก็บสถิติรวมศูนย์**

## ติดตั้ง & รัน

```bash
cd backend
npm install
cp .env.example .env      # Windows: copy .env.example .env
#  → แก้ .env ใส่ ANTHROPIC_API_KEY และ JWT_SECRET
npm start
```

เซิร์ฟเวอร์จะรันที่ `http://localhost:8787`

## ทดสอบ

```bash
# เช็คว่ารันอยู่
curl http://localhost:8787/api/health

# สมัคร (คนแรก = แอดมินอัตโนมัติ)
curl -X POST http://localhost:8787/api/auth/register \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"yanatib\",\"email\":\"y@example.com\",\"password\":\"123456\"}"

# ตอบกลับจะมี token — ใช้ต่อ:
curl http://localhost:8787/api/auth/me -H "Authorization: Bearer <TOKEN>"
```

## Endpoints

| Method | Path | ต้อง token | หน้าที่ |
|---|---|---|---|
| GET  | `/api/health` | – | เช็คสถานะ + มี API key ไหม |
| POST | `/api/auth/register` | – | สมัคร → `{ token, user }` |
| POST | `/api/auth/login` | – | เข้าสู่ระบบ → `{ token, user }` |
| GET  | `/api/auth/me` | ✅ | ข้อมูลตัวเอง |
| POST | `/api/events` | ✅ | บันทึกการดูดวง `{ type: tarot\|poker\|birthday }` |
| POST | `/api/ai/interpret` | ✅ | ให้ AI ทำนาย (สตรีมข้อความ) `{ prompt, model }` |
| GET  | `/api/admin/stats` | ✅ แอดมิน | `{ users, events }` |

## เก็บข้อมูลแบบไหน

ตอนนี้ใช้ **JSON file** ที่ `data/db.json` (สร้างอัตโนมัติ) — รันได้ทันทีไม่ต้องติดตั้ง DB
เหมาะกับการเริ่มต้น/ทดสอบ เมื่อผู้ใช้เยอะควรย้ายไป **Postgres / SQLite / Supabase**
(โครง `src/db.js` แยกไว้ให้สลับได้ง่าย — เปลี่ยนแค่ไฟล์เดียว)

## ขั้นต่อไป: ต่อ frontend

ให้ `auth.js` / `admin.js` / `script.js` ฝั่งหน้าเว็บเรียก API เหล่านี้แทน localStorage
โดยเก็บ JWT ที่ได้ และแนบ header `Authorization: Bearer <token>` ในทุกคำขอที่ต้องล็อกอิน
