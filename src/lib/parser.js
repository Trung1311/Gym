// Bộ phân tích offline: biến câu nói tiếng Việt thành danh sách món + lượng.
//
// Ví dụ: "sáng nay ăn một tô phở, trưa có cơm, ức gà hai lạng và 3 quả trứng"
//   → phở bò 500 g (đã ăn), cơm (có sẵn), ức gà 200 g (đã ăn), trứng 150 g (đã ăn)
//
// Quy ước: món CÓ nói lượng → "đã ăn"; món KHÔNG nói lượng → "có sẵn" (để app
// gợi ý nên ăn bao nhiêu). Người dùng có thể đổi lại trên giao diện.
// Đây là phương án dự phòng; khi có API key, Claude hiểu câu nói tốt hơn nhiều.

import { allFoods, normalize } from './foods.js';

const NUMBER_WORDS = {
  mot: 1, hai: 2, ba: 3, bon: 4, nam: 5, sau: 6, bay: 7, tam: 8, chin: 9, muoi: 10,
  nua: 0.5, ruoi: 0.5,
};

// Đơn vị khối lượng → gram. Các đơn vị đếm khác (bát, quả, tô…) dùng đơn vị của món.
const WEIGHT_UNITS = { g: 1, gr: 1, gam: 1, gram: 1, kg: 1000, ki: 1000, kilo: 1000, lang: 100, ml: 1 };
const COUNT_UNITS = [
  'bat', 'chen', 'to', 'qua', 'trai', 'o', 'cai', 'mieng', 'hop', 'ly', 'coc', 'thia', 'muong', 'dia', 'cu',
  'lat', 'goi', 'phan', 'nam', 'chiec', 'suat', 'dia', 'vat', 'khuc', 'cuc', 'binh', 'chai', 'scoop',
];

const NUM = '(\\d+(?:[.,]\\d+)?|mot|hai|ba|bon|nam|sau|bay|tam|chin|muoi|nua)';
const UNIT = `(${[...Object.keys(WEIGHT_UNITS), ...COUNT_UNITS].sort((a, b) => b.length - a.length).join('|')})?`;
// "1 bát rưỡi", "nửa bát", "200g", "hai lạng", "3 quả"
const QTY_RE = new RegExp(`(?:^|\\s)${NUM}\\s*${UNIT}(?:\\s+(ruoi))?(?=\\s|$)`, 'g');

/**
 * @param {string} transcript câu nói (đã chuyển thành chữ)
 * @param {object[]} customFoods món tự định nghĩa của người dùng
 * @returns {{items: {foodId:string, name:string, grams:number|null, quantityText:string, status:'eaten'|'available'}[], unknown: string[]}}
 */
export function parseTranscript(transcript, customFoods = []) {
  const foods = allFoods(customFoods);
  const aliases = foods
    .flatMap((food) => food.aliases.map((alias) => ({ alias: normalize(alias), food })))
    .sort((a, b) => b.alias.length - a.alias.length);

  const items = [];
  const unknown = [];
  const segments = normalize(transcript)
    .split(/[,.;]|\s(?:va|voi|roi|them|sau do|cung)\s/)
    .map((s) => s.trim())
    .filter(Boolean);

  for (const segment of segments) {
    const matches = findFoodMatches(segment, aliases);
    if (matches.length === 0) {
      if (QTY_RE.test(segment)) unknown.push(segment);
      QTY_RE.lastIndex = 0;
      continue;
    }
    // Khoảng chữ giữa các món: gaps[i] nằm trước món i, gaps[n] nằm sau món cuối.
    const gaps = [];
    let cursor = 0;
    for (const m of matches) {
      gaps.push(segment.slice(cursor, m.start));
      cursor = m.end;
    }
    gaps.push(segment.slice(cursor));
    const gapQty = gaps.map(findQuantities);

    matches.forEach((m, i) => {
      const before = gapQty[i];
      const after = gapQty[i + 1];
      let qty = null;
      if (before.length > 0) {
        qty = before.pop(); // lượng đứng ngay trước tên món: "2 quả trứng"
      } else if (after.length > 0 && (i === matches.length - 1 || after.length > 1 || after[0].isWeight)) {
        qty = after.shift(); // lượng đứng sau tên món: "ức gà 200g"
      }
      const grams = qty ? qtyToGrams(qty, m.food) : null;
      items.push({
        foodId: m.food.id,
        name: m.food.name,
        grams,
        quantityText: qty ? qty.text : '',
        status: grams ? 'eaten' : 'available',
      });
    });
  }
  return { items: mergeDuplicates(items), unknown };
}

function findFoodMatches(segment, aliases) {
  const taken = new Array(segment.length).fill(false);
  const matches = [];
  for (const { alias, food } of aliases) {
    let from = 0;
    while (true) {
      const idx = segment.indexOf(alias, from);
      if (idx === -1) break;
      const end = idx + alias.length;
      const boundary = (idx === 0 || segment[idx - 1] === ' ') && (end === segment.length || segment[end] === ' ');
      if (boundary && !taken.slice(idx, end).some(Boolean)) {
        taken.fill(true, idx, end);
        matches.push({ food, start: idx, end });
      }
      from = idx + 1;
    }
  }
  return matches.sort((a, b) => a.start - b.start);
}

function findQuantities(text) {
  const out = [];
  QTY_RE.lastIndex = 0;
  let m;
  while ((m = QTY_RE.exec(text))) {
    const [, numText, unit, ruoi] = m;
    let value = /\d/.test(numText) ? parseFloat(numText.replace(',', '.')) : NUMBER_WORDS[numText];
    // "nửa bát" → 0.5; "1 bát rưỡi" → 1.5; "hai lạng rưỡi" → 2.5
    if (ruoi) value += 0.5;
    const isWord = !/\d/.test(numText);
    const atEnd = m.index + m[0].length >= text.trimEnd().length;
    // Số bằng chữ mà không có đơn vị dễ nhầm với từ thường ("sau khi tập", "tầm"):
    // chỉ chấp nhận khi đứng sát ngay trước tên món ("ba trứng").
    if (isWord && !unit && !atEnd) continue;
    out.push({ value, unit: unit ?? null, isWeight: unit ? unit in WEIGHT_UNITS : false, text: m[0].trim() });
  }
  return out;
}

function qtyToGrams(qty, food) {
  if (qty.unit && qty.unit in WEIGHT_UNITS) return Math.round(qty.value * WEIGHT_UNITS[qty.unit]);
  return Math.round(qty.value * food.unit.grams);
}

function mergeDuplicates(items) {
  const byId = new Map();
  for (const it of items) {
    const prev = byId.get(it.foodId);
    if (!prev) {
      byId.set(it.foodId, { ...it });
    } else if (it.grams) {
      prev.grams = (prev.grams ?? 0) + it.grams;
      prev.status = 'eaten';
      prev.quantityText = [prev.quantityText, it.quantityText].filter(Boolean).join(' + ');
    }
  }
  return [...byId.values()];
}
