import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcTargets } from '../src/lib/targets.js';

test('Mifflin–St Jeor: nam 25 tuổi, 170 cm, 65 kg', () => {
  const t = calcTargets({ sex: 'male', age: 25, heightCm: 170, weightKg: 65, activity: 'moderate', goal: 'maintain' });
  // 10·65 + 6.25·170 − 5·25 + 5 = 1592.5
  assert.equal(t.bmr, 1593);
  assert.equal(t.tdee, Math.round(1592.5 * 1.55));
  assert.equal(t.p, Math.round(1.8 * 65));
  // kcal từ macro phải khớp tổng kcal (sai số làm tròn)
  assert.ok(Math.abs(t.p * 4 + t.c * 4 + t.f * 9 - t.kcal) < 15);
});

test('giảm mỡ ăn ít hơn, tăng cơ ăn nhiều hơn', () => {
  const base = { sex: 'female', age: 30, heightCm: 160, weightKg: 55, activity: 'light' };
  const cut = calcTargets({ ...base, goal: 'cut' });
  const keep = calcTargets({ ...base, goal: 'maintain' });
  const bulk = calcTargets({ ...base, goal: 'bulk' });
  assert.ok(cut.kcal < keep.kcal && keep.kcal < bulk.kcal);
  assert.ok(cut.p > keep.p, 'giảm mỡ cần nhiều đạm hơn để giữ cơ');
});
