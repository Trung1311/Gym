import './styles.css';
import { allFoods, findFood, formatAmount, makeCustomFood, normalize, nutritionOf, sumNutrition } from './lib/foods.js';
import { ACTIVITY_LEVELS, DEFAULT_PROFILE, GOALS, calcTargets } from './lib/targets.js';
import { suggestPortions } from './lib/portions.js';
import { parseTranscript } from './lib/parser.js';
import { speechSupported, startListening } from './lib/speech.js';
import { dayKey, emptyDay, load, save } from './lib/storage.js';

const state = load();
const ui = {
  tab: state.profile ? 'today' : 'settings',
  draft: '',
  recording: false,
  stopRecording: null,
  busy: false,
  message: null, // { kind: 'info' | 'error', text }
};

const app = document.getElementById('app');
const today = () => dayKey();
const getDay = (key = today()) => (state.days[key] ??= emptyDay());
const persist = () => save(state);

// ── Tiện ích ─────────────────────────────────────────────────
const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
const r0 = (n) => Math.round(n);
const uid = () => Math.random().toString(36).slice(2, 10);

function foodOf(item) {
  return findFood(item.foodId, state.customFoods);
}

function eatenList(day) {
  return day.items
    .filter((it) => it.status === 'eaten' && it.grams > 0)
    .map((it) => ({ food: foodOf(it), grams: it.grams }))
    .filter((e) => e.food);
}

function availableFoods(day) {
  return day.items
    .filter((it) => it.status === 'available')
    .map(foodOf)
    .filter(Boolean);
}

function setMessage(kind, text) {
  ui.message = text ? { kind, text } : null;
}

// ── Màn hình "Hôm nay" ───────────────────────────────────────
function renderToday() {
  if (!state.profile) {
    return `<section class="card"><p>Hãy nhập thông tin cơ thể ở tab <b>Cài đặt</b> trước để app tính lượng ăn phù hợp.</p></section>`;
  }
  const targets = calcTargets(state.profile);
  const day = getDay();
  const eaten = eatenList(day);
  const totals = sumNutrition(eaten.map((e) => nutritionOf(e.food, e.grams)));
  const result = suggestPortions({ targets, eaten, available: availableFoods(day) });

  return `
    ${renderProgress(targets, totals)}
    ${renderRecorder()}
    ${ui.message ? `<div class="notice ${ui.message.kind}">${esc(ui.message.text)}</div>` : ''}
    ${renderItems(day)}
    ${renderSuggestion(targets, result)}
  `;
}

function renderProgress(targets, totals) {
  const row = (label, key, unit) => {
    const pct = Math.min((totals[key] / Math.max(targets[key], 1)) * 100, 100);
    const over = totals[key] > targets[key] * 1.05;
    return `
      <div class="bar-row">
        <div class="bar-label"><span>${label}</span><span>${r0(totals[key])} / ${targets[key]} ${unit}</span></div>
        <div class="bar"><div class="bar-fill ${over ? 'over' : ''}" style="width:${pct}%"></div></div>
      </div>`;
  };
  return `
    <section class="card">
      <h2>Đã ăn hôm nay</h2>
      ${row('Năng lượng', 'kcal', 'kcal')}
      ${row('Đạm (protein)', 'p', 'g')}
      ${row('Tinh bột (carb)', 'c', 'g')}
      ${row('Chất béo (fat)', 'f', 'g')}
    </section>`;
}

function renderRecorder() {
  const canAi = state.settings.useAi && state.settings.apiKey;
  return `
    <section class="card">
      <h2>Nói những gì bạn ăn</h2>
      <p class="muted small">Ví dụ: “Sáng nay ăn một tô phở. Nhà có cơm, ức gà, trứng và rau muống.”
      Món có nói lượng sẽ được ghi là <b>đã ăn</b>; món chỉ nói tên sẽ được <b>gợi ý lượng</b>.</p>
      <button id="mic" class="mic ${ui.recording ? 'recording' : ''}" ${speechSupported ? '' : 'disabled'}>
        ${ui.recording ? '⏹ Dừng ghi âm' : '🎙️ Bấm để nói'}
      </button>
      ${speechSupported ? '' : '<p class="muted small">Trình duyệt không hỗ trợ ghi âm – hãy gõ vào ô dưới.</p>'}
      <textarea id="draft" rows="4" placeholder="Nội dung sẽ hiện ở đây khi bạn nói, hoặc gõ tay…">${esc(ui.draft)}</textarea>
      <button id="analyze" class="primary" ${ui.busy ? 'disabled' : ''}>
        ${ui.busy ? 'Đang phân tích…' : 'Phân tích & ghi lại'}
      </button>
      <p class="muted small">${canAi ? '🤖 Dùng Claude để hiểu câu nói.' : '📴 Đang dùng bộ phân tích offline (thêm API key trong Cài đặt để chính xác hơn).'}</p>
    </section>`;
}

function renderItems(day) {
  const options = allFoods(state.customFoods)
    .map((f) => `<option value="${esc(f.id)}">${esc(f.name)}</option>`)
    .join('');

  const row = (it) => {
    const food = foodOf(it);
    if (!food) return '';
    const eaten = it.status === 'eaten';
    const n = eaten && it.grams ? nutritionOf(food, it.grams) : null;
    return `
      <li class="item ${eaten ? 'eaten' : 'available'}" data-uid="${it.uid}">
        <div class="item-main">
          <div class="item-name">${esc(food.name)}${food.custom ? ' <span class="tag">ước tính</span>' : ''}</div>
          <div class="muted small">
            ${eaten ? (n ? `${r0(n.kcal)} kcal · ${r0(n.p)} g đạm` : 'Nhập số gram') : `1 ${esc(food.unit.name)} ≈ ${food.unit.grams} g`}
          </div>
        </div>
        ${eaten ? `<label class="grams"><input type="number" inputmode="numeric" min="0" step="10" value="${it.grams ?? ''}" data-action="grams"/> g</label>` : ''}
        <button class="chip" data-action="toggle" title="Đổi trạng thái">${eaten ? '✅ Đã ăn' : '🧺 Có sẵn'}</button>
        <button class="icon" data-action="remove" aria-label="Xoá">✕</button>
      </li>`;
  };

  const eatenItems = day.items.filter((it) => it.status === 'eaten');
  const availItems = day.items.filter((it) => it.status === 'available');

  return `
    <section class="card">
      <h2>Ghi chép hôm nay</h2>
      ${day.items.length === 0 ? '<p class="muted">Chưa có món nào.</p>' : ''}
      ${eatenItems.length ? `<h3>Đã ăn</h3><ul class="items">${eatenItems.map(row).join('')}</ul>` : ''}
      ${availItems.length ? `<h3>Có sẵn – cần gợi ý lượng</h3><ul class="items">${availItems.map(row).join('')}</ul>` : ''}
      <div class="add-row">
        <select id="add-food"><option value="">+ Thêm món có sẵn…</option>${options}</select>
      </div>
    </section>`;
}

function renderSuggestion(targets, result) {
  if (result.items.length === 0) {
    return `
      <section class="card">
        <h2>Gợi ý khẩu phần</h2>
        <p class="muted">Hãy nói hoặc thêm các món <b>đang có sẵn</b> – app sẽ tính mỗi món nên ăn bao nhiêu cho đủ mục tiêu.</p>
        <p class="small">Còn lại hôm nay: <b>${r0(result.remaining.kcal)} kcal</b>, ${r0(result.remaining.p)} g đạm,
        ${r0(result.remaining.c)} g tinh bột, ${r0(result.remaining.f)} g béo.</p>
      </section>`;
  }
  const rows = result.items
    .map((it) => {
      const n = nutritionOf(it.food, it.grams);
      return `<tr><td>${esc(it.food.name)}</td><td class="amount">${it.grams > 0 ? esc(formatAmount(it.food, it.grams)) : '—'}</td>
        <td class="num">${r0(n.kcal)}</td><td class="num">${r0(n.p)}</td></tr>`;
    })
    .join('');
  const t = result.dayTotals;
  const diff = (k) => {
    const d = r0(t[k] - targets[k]);
    return `<span class="${Math.abs(d) <= targets[k] * 0.1 ? 'ok' : 'warn'}">${d > 0 ? '+' : ''}${d}</span>`;
  };
  return `
    <section class="card highlight">
      <h2>Gợi ý: nên ăn bao nhiêu</h2>
      <p class="muted small">Tính cho phần còn lại của ngày, chia cho các bữa còn lại.</p>
      <table class="suggest">
        <thead><tr><th>Món</th><th>Lượng</th><th class="num">kcal</th><th class="num">Đạm</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <div class="totals">
        <div>Tổng cả ngày nếu ăn theo gợi ý:</div>
        <div><b>${r0(t.kcal)}</b> kcal (${diff('kcal')}) · Đạm <b>${r0(t.p)}</b> g (${diff('p')}) ·
        Carb <b>${r0(t.c)}</b> g (${diff('c')}) · Béo <b>${r0(t.f)}</b> g (${diff('f')})</div>
      </div>
      ${result.warnings.map((w) => `<div class="notice info">💡 ${esc(w)}</div>`).join('')}
      <button id="accept" class="secondary">Đánh dấu đã ăn theo gợi ý</button>
    </section>`;
}

// ── Màn hình "Lịch sử" ───────────────────────────────────────
function renderHistory() {
  const keys = Object.keys(state.days).sort().reverse();
  if (keys.length === 0) return `<section class="card"><p class="muted">Chưa có dữ liệu.</p></section>`;
  const targets = state.profile ? calcTargets(state.profile) : null;
  return keys
    .map((key) => {
      const day = state.days[key];
      const eaten = eatenList(day);
      const t = sumNutrition(eaten.map((e) => nutritionOf(e.food, e.grams)));
      const list = eaten.map((e) => `${esc(e.food.name)} ${esc(formatAmount(e.food, e.grams))}`).join(', ');
      return `
        <section class="card">
          <h2>${formatDate(key)}</h2>
          <p><b>${r0(t.kcal)}</b>${targets ? ` / ${targets.kcal}` : ''} kcal · Đạm <b>${r0(t.p)}</b>${targets ? ` / ${targets.p}` : ''} g ·
          Carb ${r0(t.c)} g · Béo ${r0(t.f)} g</p>
          <p class="small">${list || '<span class="muted">Chưa ghi món đã ăn.</span>'}</p>
          ${day.transcripts.length ? `<details><summary class="small">Lời nói đã ghi (${day.transcripts.length})</summary>${day.transcripts.map((tx) => `<p class="small muted">“${esc(tx)}”</p>`).join('')}</details>` : ''}
        </section>`;
    })
    .join('');
}

function formatDate(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'numeric', year: 'numeric' });
}

// ── Màn hình "Cài đặt" ───────────────────────────────────────
function renderSettings() {
  const p = state.profile ?? DEFAULT_PROFILE;
  const targets = calcTargets(p);
  const opt = (obj, value) =>
    Object.entries(obj)
      .map(([k, v]) => `<option value="${k}" ${k === value ? 'selected' : ''}>${esc(v.label)}</option>`)
      .join('');
  return `
    <form id="profile" class="card">
      <h2>Thông tin cơ thể</h2>
      <div class="grid2">
        <label>Giới tính
          <select name="sex"><option value="male" ${p.sex === 'male' ? 'selected' : ''}>Nam</option><option value="female" ${p.sex === 'female' ? 'selected' : ''}>Nữ</option></select>
        </label>
        <label>Tuổi <input name="age" type="number" inputmode="numeric" min="14" max="90" value="${p.age}" required /></label>
        <label>Chiều cao (cm) <input name="heightCm" type="number" inputmode="numeric" min="120" max="230" value="${p.heightCm}" required /></label>
        <label>Cân nặng (kg) <input name="weightKg" type="number" inputmode="decimal" step="0.1" min="30" max="250" value="${p.weightKg}" required /></label>
      </div>
      <label>Mức vận động <select name="activity">${opt(ACTIVITY_LEVELS, p.activity)}</select></label>
      <label>Mục tiêu <select name="goal">${opt(GOALS, p.goal)}</select></label>
      <button class="primary" type="submit">Lưu</button>
      <div class="targets">
        <div><b>${targets.kcal}</b><span>kcal/ngày</span></div>
        <div><b>${targets.p} g</b><span>đạm</span></div>
        <div><b>${targets.c} g</b><span>tinh bột</span></div>
        <div><b>${targets.f} g</b><span>béo</span></div>
      </div>
      <p class="muted small">BMR (năng lượng khi nghỉ) ≈ ${targets.bmr} kcal, tổng tiêu hao ≈ ${targets.tdee} kcal.
      Mục tiêu đã điều chỉnh theo “${esc(GOALS[p.goal]?.label)}”.</p>
    </form>

    <form id="ai" class="card">
      <h2>Claude (AI hiểu câu nói)</h2>
      <p class="muted small">Không bắt buộc. Có API key, app hiểu câu nói tự nhiên hơn và ước tính được cả món không có trong danh sách.
      Lấy key tại console.anthropic.com. Key chỉ lưu trên điện thoại này.</p>
      <label>Anthropic API key <input name="apiKey" type="password" autocomplete="off" value="${esc(state.settings.apiKey)}" placeholder="sk-ant-…" /></label>
      <label class="check"><input name="useAi" type="checkbox" ${state.settings.useAi ? 'checked' : ''}/> Dùng Claude khi có mạng</label>
      <button class="primary" type="submit">Lưu</button>
    </form>

    <section class="card">
      <h2>Dữ liệu</h2>
      <p class="muted small">Toàn bộ dữ liệu nằm trong trình duyệt của điện thoại này.</p>
      <div class="row">
        <button id="export" class="secondary">Tải bản sao lưu (JSON)</button>
        <button id="reset" class="danger">Xoá tất cả</button>
      </div>
    </section>`;
}

// ── Vẽ lại & sự kiện ─────────────────────────────────────────
function render() {
  document.getElementById('today-label').textContent = formatDate(today());
  document.querySelectorAll('.tabbar button').forEach((b) => b.classList.toggle('active', b.dataset.tab === ui.tab));
  app.innerHTML = ui.tab === 'today' ? renderToday() : ui.tab === 'history' ? renderHistory() : renderSettings();
}

document.querySelector('.tabbar').addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-tab]');
  if (!btn) return;
  ui.tab = btn.dataset.tab;
  setMessage();
  render();
});

app.addEventListener('input', (e) => {
  if (e.target.id === 'draft') ui.draft = e.target.value;
});

app.addEventListener('click', async (e) => {
  const target = e.target.closest('button');
  if (!target) return;

  if (target.id === 'mic') return toggleRecording();
  if (target.id === 'analyze') return analyze();
  if (target.id === 'accept') return acceptSuggestion();
  if (target.id === 'export') return exportData();
  if (target.id === 'reset') return resetData();

  const li = target.closest('li.item');
  if (!li) return;
  const day = getDay();
  const item = day.items.find((it) => it.uid === li.dataset.uid);
  if (!item) return;
  if (target.dataset.action === 'remove') {
    day.items = day.items.filter((it) => it !== item);
  } else if (target.dataset.action === 'toggle') {
    item.status = item.status === 'eaten' ? 'available' : 'eaten';
    if (item.status === 'eaten' && !item.grams) item.grams = foodOf(item)?.unit.grams ?? 100;
  }
  persist();
  render();
});

app.addEventListener('change', (e) => {
  if (e.target.dataset.action === 'grams') {
    const li = e.target.closest('li.item');
    const item = getDay().items.find((it) => it.uid === li.dataset.uid);
    if (item) item.grams = Math.max(0, Math.round(Number(e.target.value) || 0));
    persist();
    render();
  } else if (e.target.id === 'add-food' && e.target.value) {
    addItems([{ foodId: e.target.value, grams: null, status: 'available' }]);
    persist();
    render();
  }
});

app.addEventListener('submit', (e) => {
  e.preventDefault();
  const form = new FormData(e.target);
  if (e.target.id === 'profile') {
    state.profile = {
      sex: form.get('sex'),
      age: Number(form.get('age')),
      heightCm: Number(form.get('heightCm')),
      weightKg: Number(form.get('weightKg')),
      activity: form.get('activity'),
      goal: form.get('goal'),
    };
    persist();
    ui.tab = 'today';
  } else if (e.target.id === 'ai') {
    state.settings.apiKey = String(form.get('apiKey') ?? '').trim();
    state.settings.useAi = form.get('useAi') === 'on';
    persist();
  }
  render();
});

function toggleRecording() {
  if (ui.recording) {
    ui.stopRecording?.();
    return;
  }
  const base = ui.draft ? `${ui.draft.trim()} ` : '';
  ui.recording = true;
  setMessage();
  ui.stopRecording = startListening({
    onText: (finalText, interim) => {
      ui.draft = base + finalText;
      const box = document.getElementById('draft');
      if (box) box.value = ui.draft + (interim ? ` ${interim}` : '');
    },
    onError: (msg) => setMessage('error', msg),
    onEnd: () => {
      ui.recording = false;
      ui.stopRecording = null;
      render();
    },
  });
  render();
}

let AiError = null;
let parseWithClaude = null;

async function analyze() {
  const text = ui.draft.trim();
  if (!text) {
    setMessage('error', 'Hãy nói hoặc gõ những món bạn ăn trước.');
    return render();
  }
  if (ui.recording) ui.stopRecording?.();

  const useAi = state.settings.useAi && state.settings.apiKey && navigator.onLine !== false;
  ui.busy = true;
  render();

  let parsed;
  let note = '';
  try {
    if (useAi) {
      // Tải SDK Claude khi cần, để app mở nhanh hơn.
      ({ AiError, parseWithClaude } = await import('./lib/ai.js'));
      const aiItems = await parseWithClaude({ apiKey: state.settings.apiKey, transcript: text, customFoods: state.customFoods });
      parsed = aiItems.map((it) => ({ ...it, foodId: it.foodId ?? ensureCustomFood(it) }));
    }
  } catch (err) {
    note = `${AiError && err instanceof AiError ? err.message : 'Lỗi khi gọi Claude.'} Đã dùng bộ phân tích offline.`;
    console.error(err);
  }
  if (!parsed) {
    const res = parseTranscript(text, state.customFoods);
    parsed = res.items;
    if (res.unknown.length) note += ` Không nhận ra: “${res.unknown.join('”, “')}” – hãy thêm tay.`;
  }

  const day = getDay();
  day.transcripts.push(text);
  const added = addItems(parsed);
  ui.draft = '';
  ui.busy = false;
  setMessage(
    note ? 'error' : 'info',
    `${added > 0 ? `Đã ghi ${added} món.` : 'Không tìm thấy món ăn nào trong câu nói.'} ${note}`.trim(),
  );
  persist();
  render();
}

/** Thêm món vào ngày hôm nay; món "có sẵn" trùng thì bỏ qua. Trả về số món đã thêm. */
function addItems(items) {
  const day = getDay();
  let added = 0;
  for (const it of items) {
    if (!it.foodId) continue;
    if (it.status === 'available' && day.items.some((x) => x.foodId === it.foodId && x.status === 'available')) continue;
    day.items.push({ uid: uid(), foodId: it.foodId, grams: it.grams ?? null, status: it.grams ? it.status : 'available' });
    added++;
  }
  return added;
}

/** Món Claude nhận ra nhưng không có trong danh mục → lưu thành món tự định nghĩa. */
function ensureCustomFood(it) {
  const key = normalize(it.name);
  const existing = state.customFoods.find((f) => normalize(f.name) === key);
  if (existing) return existing.id;
  const food = makeCustomFood({
    id: `custom-${key.replace(/\s+/g, '-')}-${uid().slice(0, 4)}`,
    name: it.name,
    per100: it.per100,
    unitName: it.unitName,
    unitGrams: it.unitGrams,
  });
  state.customFoods.push(food);
  return food.id;
}

function acceptSuggestion() {
  const targets = calcTargets(state.profile);
  const day = getDay();
  const result = suggestPortions({ targets, eaten: eatenList(day), available: availableFoods(day) });
  const grams = new Map(result.items.map((it) => [it.food.id, it.grams]));
  day.items = day.items.flatMap((it) => {
    if (it.status !== 'available') return [it];
    const g = grams.get(it.foodId) ?? 0;
    return g > 0 ? [{ ...it, status: 'eaten', grams: g }] : [];
  });
  setMessage('info', 'Đã ghi các món theo gợi ý. Bạn có thể sửa lại số gram nếu ăn khác.');
  persist();
  render();
}

function exportData() {
  const data = { ...state, settings: { ...state.settings, apiKey: '' } };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `gym-dinh-duong-${today()}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
}

function resetData() {
  if (!confirm('Xoá toàn bộ dữ liệu (hồ sơ, lịch sử, API key)? Không thể hoàn tác.')) return;
  Object.assign(state, { profile: null, settings: { apiKey: '', useAi: true }, customFoods: [], days: {} });
  persist();
  ui.tab = 'settings';
  render();
}

render();

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}
