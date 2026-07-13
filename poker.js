// สำรับไพ่ป๊อกสำหรับดูดวง — ตัดเลข 2–6 ออก เหลือ A, 7–K (32 ใบ) + โจ๊กเกอร์ 2 ใบ = 34 ใบ
// แต่ละดอกมีความหมายตามหลักการดูไพ่ป๊อก (cartomancy)
//   ♥ โพแดง = ความรัก/ความรู้สึก   ♦ ข้าวหลามตัด = เงิน/การงาน
//   ♣ ดอกจิก = ความพยายาม/โชค     ♠ โพดำ = อุปสรรค/คำเตือน

const SUITS = [
  { key: "hearts",   symbol: "♥", color: "red",   th: "โพแดง",       en: "Hearts" },
  { key: "diamonds", symbol: "♦", color: "red",   th: "ข้าวหลามตัด", en: "Diamonds" },
  { key: "clubs",    symbol: "♣", color: "black", th: "ดอกจิก",      en: "Clubs" },
  { key: "spades",   symbol: "♠", color: "black", th: "โพดำ",        en: "Spades" }
];

// คำทำนายของแต่ละแต้ม แยกตามดอก [up-meaning EN/TH, keywords EN/TH]
const POKER_MEANINGS = {
  hearts: {
    "A":  { en: "The ace of the heart — a powerful love, deep joy, and warmth flooding into your home.",
            th: "เอซแห่งหัวใจ — ความรักอันแรงกล้า ความสุขที่ลึกซึ้ง และความอบอุ่นที่ไหลเข้าสู่บ้านของคุณ",
            kw: { en: "Great love • Home", th: "รักยิ่งใหญ่ • บ้าน" } },
    "7":  { en: "A small joy is approaching — but be mindful of fickle feelings.",
            th: "ความสุขเล็กๆ กำลังจะมา แต่ระวังความเหลาะแหละในใจ",
            kw: { en: "Joy • Caution", th: "ความสุข • ระวังใจ" } },
    "8":  { en: "An invitation, a meeting, or a warm new connection.",
            th: "คำเชิญ การพบปะ หรือความสัมพันธ์ใหม่ที่อบอุ่น",
            kw: { en: "Invitation • New bond", th: "พบปะ • สัมพันธ์ใหม่" } },
    "9":  { en: "The wish card — what your heart truly longs for may come true.",
            th: "ไพ่แห่งความสมหวัง สิ่งที่ใจปรารถนาอาจเป็นจริง",
            kw: { en: "Wish • Fulfilment", th: "สมหวัง • คำอธิษฐาน" } },
    "10": { en: "Happiness at home and a success filled with love.",
            th: "ความสุขในครอบครัว และความสำเร็จที่เปี่ยมด้วยความรัก",
            kw: { en: "Family • Happiness", th: "ครอบครัว • ความสุข" } },
    "J":  { en: "A sincere young friend brings good news of the heart.",
            th: "เพื่อนหรือคนรุ่นใหม่ที่จริงใจ นำข่าวดีเรื่องหัวใจมาให้",
            kw: { en: "Friend • Good news", th: "เพื่อน • ข่าวดี" } },
    "Q":  { en: "A kind, gentle woman who genuinely wishes you well.",
            th: "หญิงสาวใจดีและอ่อนโยน ผู้ปรารถนาดีต่อคุณอย่างจริงใจ",
            kw: { en: "Kindness • Goodwill", th: "ใจดี • หวังดี" } },
    "K":  { en: "A warm-hearted man who supports you with genuine love.",
            th: "ชายผู้มีน้ำใจ คอยสนับสนุนคุณด้วยความรักที่จริงแท้",
            kw: { en: "Warmth • Devotion", th: "น้ำใจ • รักจริง" } }
  },
  diamonds: {
    "A":  { en: "The ace of coins — an important message, a fresh start with money, or a meaningful gift.",
            th: "เอซแห่งเงินทอง — ข่าวสารสำคัญ การเริ่มต้นใหม่เรื่องเงิน หรือของขวัญที่มีความหมาย",
            kw: { en: "New wealth • Message", th: "เริ่มใหม่ • ข่าวสาร" } },
    "7":  { en: "Small gains come in — but watch for unnecessary spending.",
            th: "มีรายได้เล็กๆ น้อยๆ เข้ามา แต่ระวังรายจ่ายที่ไม่จำเป็น",
            kw: { en: "Small gains • Thrift", th: "รายได้ • ประหยัด" } },
    "8":  { en: "A journey or investment that pays off well.",
            th: "การเดินทางหรือการลงทุนที่นำผลตอบแทนที่ดีมาให้",
            kw: { en: "Travel • Investment", th: "เดินทาง • ลงทุน" } },
    "9":  { en: "News of money or a new opportunity — a financial change.",
            th: "ข่าวเรื่องเงินหรือโอกาสใหม่ ความเปลี่ยนแปลงด้านการเงิน",
            kw: { en: "News • Change", th: "ข่าว • เปลี่ยนแปลง" } },
    "10": { en: "A windfall — wealth and good fortune are on their way.",
            th: "โชคลาภเรื่องเงิน ความมั่งคั่งกำลังเดินทางมาหาคุณ",
            kw: { en: "Windfall • Wealth", th: "โชคลาภ • มั่งคั่ง" } },
    "J":  { en: "Important news or documents concerning work and money.",
            th: "ข่าวสารหรือเอกสารสำคัญเกี่ยวกับเรื่องงานและการเงิน",
            kw: { en: "News • Documents", th: "ข่าวสาร • เอกสาร" } },
    "Q":  { en: "A money-wise woman may offer you valuable advice.",
            th: "หญิงผู้ชาญฉลาดเรื่องการเงิน อาจให้คำแนะนำที่มีค่าแก่คุณ",
            kw: { en: "Wisdom • Advice", th: "ปัญญา • คำแนะนำ" } },
    "K":  { en: "A man of means or authority lends a hand in your work.",
            th: "ชายผู้มีฐานะหรืออำนาจ ยื่นมือช่วยเหลือเรื่องการงานของคุณ",
            kw: { en: "Authority • Aid", th: "อำนาจ • ช่วยเหลือ" } }
  },
  clubs: {
    "A":  { en: "The ace of fortune — great success and prosperity won through your own effort.",
            th: "เอซแห่งโชคลาภ — ความสำเร็จอันยิ่งใหญ่และความรุ่งเรืองที่ได้มาด้วยความพยายามของคุณเอง",
            kw: { en: "Success • Prosperity", th: "สำเร็จ • รุ่งเรือง" } },
    "7":  { en: "A bit of luck arrives, but be careful with money among friends.",
            th: "มีโชคดีเล็กน้อยเข้ามา แต่ระวังเรื่องเงินทองกับเพื่อนฝูง",
            kw: { en: "Luck • Caution", th: "โชค • ระวังเงิน" } },
    "8":  { en: "Beware of hesitation — a temporary obstacle in your work.",
            th: "ระวังความลังเลใจ อาจมีอุปสรรคชั่วคราวในเรื่องงาน",
            kw: { en: "Hesitation • Obstacle", th: "ลังเล • อุปสรรค" } },
    "9":  { en: "Success draws near; your determination begins to bear fruit.",
            th: "ความสำเร็จใกล้เข้ามา ความตั้งใจของคุณเริ่มเห็นผล",
            kw: { en: "Determination • Reward", th: "ตั้งใจ • ผลลัพธ์" } },
    "10": { en: "A big stroke of luck and unexpected success.",
            th: "โชคลาภก้อนใหญ่ และความสำเร็จที่ไม่ได้คาดคิดมาก่อน",
            kw: { en: "Fortune • Success", th: "โชคใหญ่ • สำเร็จ" } },
    "J":  { en: "A trustworthy friend steps in to help with your work.",
            th: "เพื่อนที่ไว้ใจได้ ก้าวเข้ามาช่วยเหลือเรื่องการงานของคุณ",
            kw: { en: "Trust • Help", th: "ไว้ใจ • ช่วยเหลือ" } },
    "Q":  { en: "A confident, warm-hearted woman stands behind you.",
            th: "หญิงผู้มั่นใจและมีน้ำใจ คอยอยู่เคียงข้างสนับสนุนคุณ",
            kw: { en: "Confidence • Support", th: "มั่นใจ • สนับสนุน" } },
    "K":  { en: "An honest, sincere man becomes a good mentor to you.",
            th: "ชายผู้ซื่อสัตย์และจริงใจ กลายเป็นที่ปรึกษาที่ดีของคุณ",
            kw: { en: "Honesty • Mentor", th: "ซื่อสัตย์ • ที่ปรึกษา" } }
  },
  spades: {
    "A":  { en: "The ace of turning points — a strong, decisive new beginning; face it with clear resolve.",
            th: "เอซแห่งจุดเปลี่ยน — การเริ่มต้นใหม่ที่เด็ดเดี่ยวและทรงพลัง จงเผชิญมันด้วยใจที่มั่นคง",
            kw: { en: "New start • Resolve", th: "เริ่มใหม่ • เด็ดเดี่ยว" } },
    "7":  { en: "Beware of needless worry; hold off on major decisions for now.",
            th: "ระวังความกังวลที่เกินจริง อย่าเพิ่งตัดสินใจเรื่องสำคัญตอนนี้",
            kw: { en: "Worry • Wait", th: "กังวล • รอก่อน" } },
    "8":  { en: "An obstacle or warning — act with care and clear thought.",
            th: "อุปสรรคหรือคำเตือน ขอให้กระทำการด้วยความรอบคอบ",
            kw: { en: "Warning • Care", th: "คำเตือน • รอบคอบ" } },
    "9":  { en: "A challenging time, yet your worries will slowly come undone.",
            th: "ช่วงเวลาที่ท้าทาย แต่ความกังวลจะค่อยๆ คลี่คลายไปเอง",
            kw: { en: "Challenge • Relief", th: "ท้าทาย • คลี่คลาย" } },
    "10": { en: "A turning point after hardship — there is light ahead.",
            th: "จุดเปลี่ยนหลังผ่านความยากลำบาก มีแสงสว่างรออยู่ข้างหน้า",
            kw: { en: "Turning point • Hope", th: "จุดเปลี่ยน • ความหวัง" } },
    "J":  { en: "A young person to be wary of, or news to weigh with care.",
            th: "คนหนุ่มสาวที่ควรระแวดระวัง หรือข่าวที่ต้องพิจารณาให้ดี",
            kw: { en: "Caution • News", th: "ระวัง • ข่าว" } },
    "Q":  { en: "A strong woman shaped by experience offers a well-meant caution.",
            th: "หญิงผู้เข้มแข็งจากประสบการณ์ มอบคำเตือนด้วยความหวังดี",
            kw: { en: "Strength • Caution", th: "เข้มแข็ง • เตือนสติ" } },
    "K":  { en: "A serious man of authority — approach him with respect.",
            th: "ชายผู้มีอำนาจและจริงจัง ควรปฏิบัติต่อเขาด้วยความเคารพ",
            kw: { en: "Authority • Respect", th: "อำนาจ • เคารพ" } }
  }
};

const RANK_TH = { "A": "เอซ", "7": "7", "8": "8", "9": "9", "10": "10", "J": "แจ็ค", "Q": "ควีน", "K": "คิง" };
const RANK_EN = { "A": "Ace", "7": "7", "8": "8", "9": "9", "10": "10", "J": "Jack", "Q": "Queen", "K": "King" };
const KEPT_RANKS = ["A", "7", "8", "9", "10", "J", "Q", "K"];

// ตัวอักษรดอกไพ่สำหรับชื่อไฟล์รูป (10 ใช้รหัส "0")
const SUIT_LETTER = { hearts: "H", diamonds: "D", clubs: "C", spades: "S" };

// สร้างสำรับ 32 ใบจากดอก × แต้ม
const POKER_DECK = [];
SUITS.forEach((s) => {
  KEPT_RANKS.forEach((r) => {
    const m = POKER_MEANINGS[s.key][r];
    const code = (r === "10" ? "0" : r) + SUIT_LETTER[s.key];
    POKER_DECK.push({
      type: "poker",
      rank: r,
      symbol: s.symbol,
      color: s.color,
      img: `assets/poker/${code}.png`,   // รูปไพ่จริง
      name: { en: `${RANK_EN[r]} of ${s.en}`, th: `${RANK_TH[r]} ${s.th}` },
      up: m,          // ความหมาย (ไพ่ป๊อกไม่มีกลับหัว)
      kw: m.kw
    });
  });
});

// โจ๊กเกอร์ 2 ใบ
POKER_DECK.push({
  type: "poker", rank: "★", symbol: "🃏", color: "joker",
  img: "assets/poker/X1.png",
  name: { en: "The Lucky Joker", th: "โจ๊กเกอร์แห่งโชค" },
  up: { en: "Special fortune smiles on you — an unexpected golden opportunity appears.",
        th: "ดวงดีเป็นพิเศษกำลังเข้าข้างคุณ โอกาสทองที่ไม่คาดฝันกำลังปรากฏ" },
  kw: { en: "Luck • Opportunity", th: "โชคดี • โอกาส" }
});
POKER_DECK.push({
  type: "poker", rank: "☆", symbol: "🃏", color: "joker",
  img: "assets/poker/X2.png",
  name: { en: "The Wild Joker", th: "โจ๊กเกอร์ตัวแปร" },
  up: { en: "A wild card that flips the situation — stay ready to adapt to change.",
        th: "ไพ่ตัวแปรที่พลิกสถานการณ์ จงเตรียมพร้อมรับมือกับความเปลี่ยนแปลง" },
  kw: { en: "Wild card • Change", th: "ตัวแปร • เปลี่ยนแปลง" }
});
