// Gợi ý khẩu phần: với những món ĐANG CÓ, nên ăn bao nhiêu gram mỗi món để
// (cùng với những gì đã ăn) đạt mục tiêu kcal / đạm / tinh bột / béo trong ngày.
//
// Cách làm: coi lượng mỗi món (x_i, đơn vị 100 g) là ẩn số và tìm x sao cho
// tổng dinh dưỡng gần mục tiêu còn lại nhất, trong giới hạn [minG, maxG] của
// từng món. Đây là bài toán bình phương tối thiểu có ràng buộc hộp; ta giải bằng
// gradient chiếu có gia tốc (FISTA) – đủ nhanh vì chỉ có vài chục món.
// Sau đó làm tròn về đơn vị dễ đong (½ bát, 1 quả, 10 g…).

import { nutritionOf, sumNutrition } from './foods.js';

const KEYS = ['kcal', 'p', 'c', 'f'];
// Ưu tiên: kcal và đạm quan trọng nhất với người tập, tinh bột / béo linh hoạt hơn.
const WEIGHTS = { kcal: 3, p: 3, c: 1, f: 1 };
// Kéo nhẹ mỗi món về 1 khẩu phần chuẩn để lượng được chia đều, không dồn vào 1 món.
const REGULARIZATION = 0.02;

/**
 * @param {object} args
 * @param {{kcal:number,p:number,c:number,f:number}} args.targets  mục tiêu cả ngày
 * @param {{food:object, grams:number}[]} args.eaten  những gì đã ăn (cố định)
 * @param {object[]} args.available  các món có sẵn, cần gợi ý lượng
 */
export function suggestPortions({ targets, eaten = [], available = [] }) {
  const eatenTotals = sumNutrition(eaten.map((e) => nutritionOf(e.food, e.grams)));
  const remaining = {};
  for (const k of KEYS) remaining[k] = Math.max(targets[k] - eatenTotals[k], 0);

  const foods = dedupe(available);
  const warnings = [];

  if (foods.length === 0) {
    return { items: [], eatenTotals, remaining, dayTotals: eatenTotals, warnings };
  }
  if (remaining.kcal < 80) {
    warnings.push('Bạn đã ăn đủ (hoặc vượt) năng lượng hôm nay – không cần ăn thêm. Nếu đói, chọn rau xanh.');
    const items = foods.map((food) => ({ food, grams: 0 }));
    return { items, eatenTotals, remaining, dayTotals: eatenTotals, warnings };
  }

  const raw = solve(foods, remaining, targets);
  const items = foods.map((food, i) => ({ food, grams: roundPortion(food, raw[i] * 100) }));

  const suggestedTotals = sumNutrition(items.map((it) => nutritionOf(it.food, it.grams)));
  const dayTotals = sumNutrition([eatenTotals, suggestedTotals]);

  if (targets.p - dayTotals.p > 20) {
    warnings.push(
      `Còn thiếu khoảng ${Math.round(targets.p - dayTotals.p)} g đạm. Nên thêm trứng, ức gà, cá, đậu phụ hoặc whey.`,
    );
  }
  if (targets.kcal - dayTotals.kcal > 150) {
    warnings.push(
      `Các món đang có còn thiếu khoảng ${Math.round(targets.kcal - dayTotals.kcal)} kcal – có thể thêm khoai, chuối, sữa, một nắm lạc, hoặc xào nấu với 1–2 thìa dầu.`,
    );
  }
  if (dayTotals.kcal - targets.kcal > 250) {
    warnings.push('Ngay cả lượng tối thiểu cũng vượt năng lượng – hãy bớt món nhiều dầu mỡ.');
  }
  if (!foods.some((f) => f.minG > 0)) {
    warnings.push('Đừng quên rau xanh (≥ 300 g/ngày) để đủ chất xơ và vi chất.');
  }

  return { items, eatenTotals, remaining, dayTotals, suggestedTotals, warnings };
}

function dedupe(foods) {
  const seen = new Set();
  return foods.filter((f) => (seen.has(f.id) ? false : (seen.add(f.id), true)));
}

/** Giải min Σ_k w_k((Ax)_k − r_k)²/T_k² + λΣ_i((x_i − d_i)/m_i)²,  lo ≤ x ≤ hi. */
function solve(foods, remaining, targets) {
  const n = foods.length;
  // A[k][i] = dinh dưỡng k trong 100 g món i
  const A = KEYS.map((k) => foods.map((f) => f.per100[k]));
  const scale = KEYS.map((k) => Math.max(targets[k], 1));
  const w = KEYS.map((k) => WEIGHTS[k]);
  const r = KEYS.map((k) => remaining[k]);

  const lo = foods.map((f) => (f.minG ?? 0) / 100);
  const hi = foods.map((f) => Math.max(f.maxG, f.minG ?? 0) / 100);
  const m = hi.map((h) => Math.max(h, 0.1));
  const d = foods.map((f, i) => clamp(f.unit.grams / 100, lo[i], hi[i]));

  // Hằng số Lipschitz ≤ vết của Hessian (ma trận nửa xác định dương).
  let L = 0;
  for (let i = 0; i < n; i++) {
    let hii = 2 * REGULARIZATION / (m[i] * m[i]);
    for (let k = 0; k < KEYS.length; k++) hii += (2 * w[k] * A[k][i] * A[k][i]) / (scale[k] * scale[k]);
    L += hii;
  }
  const step = 1 / L;

  const grad = (y) => {
    const g = new Array(n).fill(0);
    for (let k = 0; k < KEYS.length; k++) {
      let ax = 0;
      for (let i = 0; i < n; i++) ax += A[k][i] * y[i];
      const coef = (2 * w[k] * (ax - r[k])) / (scale[k] * scale[k]);
      for (let i = 0; i < n; i++) g[i] += coef * A[k][i];
    }
    for (let i = 0; i < n; i++) g[i] += (2 * REGULARIZATION * (y[i] - d[i])) / (m[i] * m[i]);
    return g;
  };

  let x = d.slice();
  let y = x.slice();
  let t = 1;
  for (let iter = 0; iter < 4000; iter++) {
    const g = grad(y);
    const xNext = y.map((yi, i) => clamp(yi - step * g[i], lo[i], hi[i]));
    const tNext = (1 + Math.sqrt(1 + 4 * t * t)) / 2;
    y = xNext.map((xi, i) => xi + ((t - 1) / tNext) * (xi - x[i]));
    y = y.map((yi, i) => clamp(yi, lo[i], hi[i]));
    x = xNext;
    t = tNext;
  }
  return x;
}

/** Làm tròn lượng gram về đơn vị dễ đong cho món đó. */
export function roundPortion(food, grams) {
  const rule = food.round ?? { mode: 'gram', step: 10 };
  let g;
  if (rule.mode === 'unit') {
    const units = Math.round(grams / food.unit.grams / rule.step) * rule.step;
    g = units * food.unit.grams;
  } else {
    g = Math.round(grams / rule.step) * rule.step;
  }
  return clamp(g, food.minG ?? 0, Math.max(food.maxG, food.minG ?? 0));
}

function clamp(v, lo, hi) {
  return Math.min(Math.max(v, lo), hi);
}
