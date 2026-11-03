import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseTranscript } from '../src/lib/parser.js';

const byId = (items) => Object.fromEntries(items.map((it) => [it.foodId, it]));

test('món có lượng → đã ăn, món không có lượng → có sẵn', () => {
  const { items } = parseTranscript('Sáng nay ăn một tô phở bò, nhà có cơm, ức gà và rau muống. Tối có 3 quả trứng.');
  const m = byId(items);
  assert.deepEqual(Object.keys(m).sort(), ['com-trang', 'pho-bo', 'rau-xanh', 'trung-ga', 'uc-ga']);
  assert.equal(m['pho-bo'].grams, 500);
  assert.equal(m['pho-bo'].status, 'eaten');
  assert.equal(m['trung-ga'].grams, 150);
  assert.equal(m['com-trang'].status, 'available');
  assert.equal(m['uc-ga'].grams, null);
});

test('đơn vị khối lượng và "rưỡi", "nửa"', () => {
  const m = byId(parseTranscript('ăn 1 bát rưỡi cơm, ức gà 200g, hai lạng thịt bò, nửa quả bơ').items);
  assert.equal(m['com-trang'].grams, 225);
  assert.equal(m['uc-ga'].grams, 200);
  assert.equal(m['thit-bo'].grams, 200);
  assert.equal(m['bo-qua'].grams, 100);
});

test('không nhầm "sau khi" thành số 6', () => {
  const m = byId(parseTranscript('sau khi tập ăn chuối').items);
  assert.equal(m['chuoi'].grams, null);
});

test('không nhầm "cà phê" thành cá', () => {
  const { items } = parseTranscript('uống cà phê, ăn 2 bát cơm');
  assert.deepEqual(items.map((i) => i.foodId), ['com-trang']);
});

test('nhiều món trong một cụm không có dấu phẩy', () => {
  const m = byId(parseTranscript('ba quả trứng 2 lát bánh mì đen tầm 200 gam ức gà').items);
  assert.equal(m['trung-ga'].grams, 150);
  assert.equal(m['banh-mi-den'].grams, 60);
  assert.equal(m['uc-ga'].grams, 200);
});
