// Cơ sở dữ liệu món ăn phổ biến ở Việt Nam.
//
// Mọi giá trị dinh dưỡng là cho 100 g món ở dạng ĐÃ NẤU CHÍN / ĂN ĐƯỢC NGAY
// (trừ các món ghi rõ "khô"). Đây là số liệu xấp xỉ, tổng hợp từ bảng thành phần
// thực phẩm USDA và Bảng thành phần thực phẩm Việt Nam; món nhà nấu có thể chênh
// 10–20 % tuỳ lượng dầu mỡ.
//
// Các trường:
//   per100  – kcal, p (đạm, g), c (tinh bột, g), f (chất béo, g) cho 100 g
//   unit    – đơn vị đếm quen thuộc và số gram tương ứng (vd 1 quả trứng ≈ 50 g)
//   round   – làm tròn gợi ý: theo đơn vị (bước 1 hoặc 0.5) hay theo gram
//   maxG    – lượng tối đa hợp lý trong một ngày (để gợi ý không bị vô lý)
//   minG    – lượng tối thiểu khi món có sẵn (chỉ dùng cho rau)

export const FOODS = [
  // ── Tinh bột ────────────────────────────────────────────────
  food('com-trang', 'Cơm trắng', ['com', 'com trang', 'com te'], [130, 2.7, 28, 0.3], ['bát', 150], { round: unitRound(0.5), maxG: 600 }),
  food('com-gao-lut', 'Cơm gạo lứt', ['com gao lut', 'gao lut'], [112, 2.6, 23.5, 0.9], ['bát', 150], { round: unitRound(0.5), maxG: 600 }),
  food('xoi', 'Xôi', ['xoi', 'xoi trang', 'xoi nep'], [180, 3.5, 37, 2], ['gói', 200], { round: unitRound(0.5), maxG: 400 }),
  food('bun', 'Bún', ['bun', 'bun tuoi'], [108, 1.8, 24, 0.2], ['bát', 200], { round: unitRound(0.5), maxG: 600 }),
  food('banh-mi', 'Bánh mì (không nhân)', ['banh mi', 'banh my', 'o banh mi'], [265, 9, 49, 3.2], ['ổ', 90], { round: unitRound(0.5), maxG: 270 }),
  food('banh-mi-den', 'Bánh mì đen / nguyên cám', ['banh mi den', 'banh mi nguyen cam', 'banh mi sandwich'], [250, 13, 41, 3.4], ['lát', 30], { round: unitRound(1), maxG: 180 }),
  food('yen-mach', 'Yến mạch (khô)', ['yen mach', 'oat', 'oats', 'bot yen mach'], [389, 16.9, 66, 6.9], ['phần', 40], { round: gramRound(10), maxG: 150 }),
  food('khoai-lang', 'Khoai lang luộc', ['khoai lang'], [76, 1.4, 17.7, 0.1], ['củ', 150], { round: unitRound(0.5), maxG: 600 }),
  food('khoai-tay', 'Khoai tây luộc', ['khoai tay'], [87, 1.9, 20, 0.1], ['củ', 150], { round: unitRound(0.5), maxG: 600 }),
  food('mi-goi', 'Mì gói (khô)', ['mi goi', 'mi tom', 'mi an lien', 'mi hao hao'], [470, 9, 60, 20], ['gói', 75], { round: unitRound(1), maxG: 150 }),

  // ── Món nước / món hỗn hợp ─────────────────────────────────
  food('pho-bo', 'Phở bò', ['pho', 'pho bo', 'pho tai', 'pho chin'], [90, 5.5, 11, 2.5], ['tô', 500], { round: unitRound(0.5), maxG: 1000 }),
  food('bun-bo', 'Bún bò Huế', ['bun bo', 'bun bo hue'], [95, 6, 11, 3], ['tô', 600], { round: unitRound(0.5), maxG: 1200 }),
  food('com-tam', 'Cơm tấm sườn', ['com tam', 'com suon'], [165, 8, 20, 6], ['đĩa', 400], { round: unitRound(0.5), maxG: 800 }),
  food('banh-mi-thit', 'Bánh mì thịt', ['banh mi thit', 'banh mi pate', 'banh mi kep'], [250, 11, 30, 9.5], ['ổ', 200], { round: unitRound(0.5), maxG: 400 }),

  // ── Đạm động vật ───────────────────────────────────────────
  food('uc-ga', 'Ức gà', ['uc ga', 'thit uc ga', 'luon ga', 'phi le ga'], [165, 31, 0, 3.6], ['lạng', 100], { round: gramRound(10), maxG: 400 }),
  food('dui-ga', 'Đùi gà (bỏ da)', ['dui ga', 'thit dui ga', 'ma ga'], [176, 24.8, 0, 8], ['cái', 120], { round: unitRound(0.5), maxG: 360 }),
  food('thit-ga', 'Thịt gà (cả da)', ['thit ga', 'ga luoc', 'ga ran'], [215, 25, 0, 12.5], ['lạng', 100], { round: gramRound(10), maxG: 300 }),
  food('trung-ga', 'Trứng gà', ['trung', 'trung ga', 'qua trung', 'trung luoc', 'trung op la'], [143, 12.6, 0.7, 9.5], ['quả', 50], { round: unitRound(1), maxG: 300 }),
  food('long-trang-trung', 'Lòng trắng trứng', ['long trang trung', 'long trang'], [52, 10.9, 0.7, 0.2], ['quả', 33], { round: unitRound(1), maxG: 330 }),
  food('thit-bo', 'Thịt bò nạc', ['thit bo', 'bo', 'bo nac', 'thit bo nac', 'bo xao'], [210, 28, 0, 10], ['lạng', 100], { round: gramRound(10), maxG: 300 }),
  food('thit-lon-nac', 'Thịt lợn nạc', ['thit lon', 'thit heo', 'thit nac', 'lon nac', 'heo nac', 'thit lon nac', 'thit heo nac'], [180, 27, 0, 7], ['lạng', 100], { round: gramRound(10), maxG: 300 }),
  food('thit-ba-chi', 'Thịt ba chỉ', ['ba chi', 'thit ba chi', 'ba roi', 'thit ba roi'], [518, 9.3, 0, 53], ['lạng', 100], { round: gramRound(10), maxG: 150 }),
  food('suon-lon', 'Sườn lợn', ['suon', 'suon lon', 'suon heo', 'suon nuong'], [290, 22, 0, 22], ['lạng', 100], { round: gramRound(10), maxG: 250 }),
  food('ca-hoi', 'Cá hồi', ['ca hoi'], [206, 22, 0, 12], ['lạng', 100], { round: gramRound(10), maxG: 300 }),
  food('ca-ro-phi', 'Cá rô phi / cá trắng', ['ca ro phi', 'ca dieu hong', 'ca basa', 'ca tra', 'ca loc', 'ca thu'], [128, 26, 0, 2.7], ['lạng', 100], { round: gramRound(10), maxG: 400 }),
  food('ca-ngu-hop', 'Cá ngừ hộp (ngâm nước)', ['ca ngu', 'ca ngu hop'], [116, 25.5, 0, 0.8], ['hộp', 140], { round: unitRound(0.5), maxG: 280 }),
  food('tom', 'Tôm', ['tom', 'tom luoc', 'tom hap'], [99, 24, 0.2, 0.3], ['lạng', 100], { round: gramRound(10), maxG: 400 }),

  // ── Đạm thực vật / sữa ─────────────────────────────────────
  food('dau-phu', 'Đậu phụ', ['dau phu', 'dau hu', 'tau hu', 'dau phu luoc'], [95, 10.9, 0.7, 5.4], ['miếng', 100], { round: unitRound(0.5), maxG: 400 }),
  food('sua-tuoi', 'Sữa tươi không đường', ['sua', 'sua tuoi', 'sua khong duong', 'sua bo'], [62, 3.2, 4.8, 3.3], ['hộp', 180], { round: unitRound(1), maxG: 720 }),
  food('sua-dau-nanh', 'Sữa đậu nành', ['sua dau nanh', 'sua dau'], [45, 3.3, 3.5, 1.9], ['hộp', 200], { round: unitRound(1), maxG: 600 }),
  food('sua-chua', 'Sữa chua', ['sua chua', 'yogurt', 'da ua'], [80, 3.5, 12, 2.5], ['hộp', 100], { round: unitRound(1), maxG: 400 }),
  food('sua-chua-hy-lap', 'Sữa chua Hy Lạp', ['sua chua hy lap', 'greek yogurt'], [97, 9, 4, 5], ['hộp', 100], { round: unitRound(1), maxG: 400 }),
  food('whey', 'Whey protein', ['whey', 'whey protein', 'bot protein', 'sua whey'], [400, 80, 10, 5], ['muỗng', 30], { round: unitRound(1), maxG: 60 }),

  // ── Rau, trái cây ──────────────────────────────────────────
  food('rau-xanh', 'Rau xanh luộc', ['rau', 'rau xanh', 'rau luoc', 'rau cai', 'cai ngot', 'rau muong', 'rau ngot'], [25, 2.5, 4, 0.3], ['đĩa', 200], { round: gramRound(50), maxG: 600, minG: 150 }),
  food('bong-cai', 'Bông cải xanh', ['bong cai', 'bong cai xanh', 'sup lo xanh', 'broccoli'], [35, 2.4, 7.2, 0.4], ['đĩa', 200], { round: gramRound(50), maxG: 600, minG: 150 }),
  food('chuoi', 'Chuối', ['chuoi', 'qua chuoi'], [89, 1.1, 22.8, 0.3], ['quả', 120], { round: unitRound(1), maxG: 480 }),
  food('tao', 'Táo', ['tao', 'qua tao'], [52, 0.3, 14, 0.2], ['quả', 180], { round: unitRound(1), maxG: 540 }),
  food('cam', 'Cam', ['cam', 'qua cam'], [47, 0.9, 11.8, 0.1], ['quả', 150], { round: unitRound(1), maxG: 450 }),
  food('bo-qua', 'Quả bơ', ['qua bo', 'trai bo', 'avocado'], [160, 2, 8.5, 14.7], ['quả', 200], { round: unitRound(0.5), maxG: 200 }),

  // ── Chất béo, hạt ──────────────────────────────────────────
  food('lac', 'Lạc / đậu phộng rang', ['lac', 'lac rang', 'dau phong'], [585, 24, 21, 50], ['nắm', 30], { round: gramRound(10), maxG: 60 }),
  food('hat-dieu', 'Hạt điều', ['hat dieu', 'dieu'], [553, 18, 30, 44], ['nắm', 30], { round: gramRound(10), maxG: 60 }),
  food('bo-dau-phong', 'Bơ đậu phộng', ['bo dau phong', 'bo lac', 'peanut butter'], [588, 25, 20, 50], ['thìa', 16], { round: unitRound(1), maxG: 48 }),
  food('dau-an', 'Dầu ăn', ['dau an', 'dau oliu', 'dau olive', 'mo'], [884, 0, 0, 100], ['thìa', 13], { round: unitRound(1), maxG: 39 }),
];

function food(id, name, aliases, [kcal, p, c, f], [unitName, unitGrams], opts) {
  return {
    id,
    name,
    aliases,
    per100: { kcal, p, c, f },
    unit: { name: unitName, grams: unitGrams },
    round: opts.round,
    maxG: opts.maxG,
    minG: opts.minG ?? 0,
  };
}

function unitRound(step) {
  return { mode: 'unit', step };
}

function gramRound(step) {
  return { mode: 'gram', step };
}

/** Bỏ dấu tiếng Việt và đưa về chữ thường để so khớp ("Ức gà" → "uc ga"). */
export function normalize(text) {
  return String(text)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9.,\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Tạo một món tự định nghĩa (vd do Claude ước tính) theo cùng cấu trúc.
 * Món tự định nghĩa luôn được làm tròn theo gram.
 */
export function makeCustomFood({ id, name, per100, unitName = 'phần', unitGrams = 100 }) {
  return {
    id,
    name,
    aliases: [normalize(name)],
    per100: {
      kcal: Number(per100.kcal) || 0,
      p: Number(per100.p) || 0,
      c: Number(per100.c) || 0,
      f: Number(per100.f) || 0,
    },
    unit: { name: unitName, grams: unitGrams > 0 ? unitGrams : 100 },
    round: gramRound(10),
    maxG: Math.max(300, (unitGrams || 100) * 3),
    minG: 0,
    custom: true,
  };
}

/** Gộp danh sách món có sẵn với món tự định nghĩa của người dùng. */
export function allFoods(customFoods = []) {
  return [...FOODS, ...customFoods];
}

export function findFood(id, customFoods = []) {
  return allFoods(customFoods).find((f) => f.id === id) ?? null;
}

/** Dinh dưỡng của `grams` gram món `food`. */
export function nutritionOf(food, grams) {
  const k = grams / 100;
  return {
    kcal: food.per100.kcal * k,
    p: food.per100.p * k,
    c: food.per100.c * k,
    f: food.per100.f * k,
  };
}

export function sumNutrition(list) {
  return list.reduce(
    (acc, n) => ({ kcal: acc.kcal + n.kcal, p: acc.p + n.p, c: acc.c + n.c, f: acc.f + n.f }),
    { kcal: 0, p: 0, c: 0, f: 0 },
  );
}

/** Hiển thị lượng theo đơn vị quen thuộc: "1.5 bát (225 g)" hoặc "150 g". */
export function formatAmount(food, grams) {
  const g = Math.round(grams);
  if (food.round?.mode === 'unit') {
    const units = Math.round((grams / food.unit.grams) * 10) / 10;
    return `${formatNumber(units)} ${food.unit.name} (${g} g)`;
  }
  return `${g} g`;
}

export function formatNumber(n) {
  return Number.isInteger(n) ? String(n) : n.toFixed(1).replace(/\.0$/, '');
}
