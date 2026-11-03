// Lưu dữ liệu ngay trên điện thoại (localStorage). Không có máy chủ.

const KEY = 'gym-app:v1';

const EMPTY = { profile: null, settings: { apiKey: '', useAi: true }, customFoods: [], days: {} };

export function load(storage = globalThis.localStorage) {
  try {
    const raw = storage?.getItem(KEY);
    if (!raw) return structuredClone(EMPTY);
    const data = JSON.parse(raw);
    return {
      ...structuredClone(EMPTY),
      ...data,
      settings: { ...EMPTY.settings, ...data.settings },
    };
  } catch {
    return structuredClone(EMPTY);
  }
}

export function save(state, storage = globalThis.localStorage) {
  try {
    storage?.setItem(KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

/** Khoá ngày theo giờ địa phương: "2026-11-03". */
export function dayKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function emptyDay() {
  return { transcripts: [], items: [] };
}
