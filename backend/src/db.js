// =====================================================================
// db.js — ชั้นเก็บข้อมูล (JSON file store)
// ---------------------------------------------------------------------
// ใช้ไฟล์ data/db.json เก็บ users + events เพื่อให้รันได้ทันทีโดยไม่ต้อง
// ติดตั้งฐานข้อมูลภายนอก เหมาะกับการเริ่มต้น/ทดสอบ
//
// ⚠️ ข้อจำกัด: เขียนทั้งไฟล์ใหม่ทุกครั้งที่มีการเปลี่ยนแปลง — โอเคสำหรับ
//    ทราฟฟิกน้อย แต่เมื่อผู้ใช้เยอะควรย้ายไป Postgres/SQLite/Supabase
//    (โครงฟังก์ชันด้านล่างออกแบบให้สลับ backend ได้ง่าย)
// =====================================================================

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, "..", "data");
const DB_FILE = join(DATA_DIR, "db.json");

let db = { users: [], events: [] };

function load() {
  if (existsSync(DB_FILE)) {
    try {
      db = JSON.parse(readFileSync(DB_FILE, "utf8"));
    } catch {
      db = { users: [], events: [] };
    }
  }
  if (!Array.isArray(db.users)) db.users = [];
  if (!Array.isArray(db.events)) db.events = [];
}

function save() {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

load();

export const usersDB = {
  all: () => db.users,
  findByEmail: (email) => db.users.find((u) => u.email === email),
  add: (user) => {
    db.users.push(user);
    save();
    return user;
  },
  save,
};

export const eventsDB = {
  all: () => db.events,
  add: (event) => {
    db.events.push(event);
    if (db.events.length > 100000) db.events.splice(0, db.events.length - 100000);
    save();
    return event;
  },
};
