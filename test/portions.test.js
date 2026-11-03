import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findFood, nutritionOf, sumNutrition } from '../src/lib/foods.js';
import { calcTargets } from '../src/lib/targets.js';
import { roundPortion, suggestPortions } from '../src/lib/portions.js';

const F = (id) => findFood(id);
const targets = calcTargets({ sex: 'male', age: 25, heightCm: 170, weightKg: 65, activity: 'moderate', goal: 'maintain' });

test('gợi ý đưa tổng cả ngày về gần mục tiêu kcal và đạm', () => {
  const r = suggestPortions({
    targets,
    eaten: [{ food: F('pho-bo'), grams: 500 }],
    available: ['com-trang', 'uc-ga', 'trung-ga', 'rau-xanh', 'chuoi', 'sua-tuoi'].map(F),
  });
  assert.ok(Math.abs(r.dayTotals.kcal - targets.kcal) / targets.kcal < 0.08, `kcal ${r.dayTotals.kcal} vs ${targets.kcal}`);
  assert.ok(Math.abs(r.dayTotals.p - targets.p) / targets.p < 0.12, `đạm ${r.dayTotals.p} vs ${targets.p}`);
  for (const it of r.items) {
    assert.ok(it.grams >= it.food.minG && it.grams <= it.food.maxG, `${it.food.id} trong giới hạn`);
  }
});

test('đã tính phần đã ăn vào tổng', () => {
  const eaten = [{ food: F('com-tam'), grams: 400 }];
  const r = suggestPortions({ targets, eaten, available: [F('uc-ga')] });
  const expected = sumNutrition(eaten.map((e) => nutritionOf(e.food, e.grams)));
  assert.equal(r.eatenTotals.kcal, expected.kcal);
  assert.equal(r.remaining.kcal, targets.kcal - expected.kcal);
});

test('ăn đủ rồi thì không gợi ý thêm', () => {
  const r = suggestPortions({ targets, eaten: [{ food: F('com-tam'), grams: 2000 }], available: [F('com-trang')] });
  assert.equal(r.items[0].grams, 0);
  assert.ok(r.warnings.length > 0);
});

test('thiếu nguồn đạm thì cảnh báo', () => {
  const r = suggestPortions({ targets, available: [F('com-trang'), F('chuoi')] });
  assert.ok(r.warnings.some((w) => w.includes('đạm')));
});

test('làm tròn theo đơn vị dễ đong', () => {
  assert.equal(roundPortion(F('trung-ga'), 130), 150); // 2.6 quả → 3 quả
  assert.equal(roundPortion(F('com-trang'), 260), 225); // 1.73 bát → 1.5 bát (bước ½)
  assert.equal(roundPortion(F('com-trang'), 280), 300); // 1.87 bát → 2 bát
  assert.equal(roundPortion(F('uc-ga'), 184), 180); // bước 10 g
  assert.equal(roundPortion(F('rau-xanh'), 20), 150); // rau có tối thiểu 150 g
});
