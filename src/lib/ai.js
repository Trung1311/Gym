// Dùng Claude để hiểu câu nói và ghi chép món ăn.
//
// App gọi thẳng Claude API từ điện thoại bằng API key của chính bạn (lưu trong
// máy, không gửi đi đâu khác). Claude trả về JSON theo schema cố định
// (structured outputs) nên app luôn đọc được kết quả.

import Anthropic from '@anthropic-ai/sdk';
import { allFoods } from './foods.js';

export const MODEL = 'claude-opus-5-5';

function buildSystemPrompt(foods) {
  const catalog = foods
    .map((f) => `- ${f.id}: ${f.name} (1 ${f.unit.name} ≈ ${f.unit.grams} g)`)
    .join('\n');
  return `Bạn là trợ lý dinh dưỡng cho người tập gym ở Việt Nam. Người dùng đọc bằng giọng nói những gì họ đã ăn và những món đang có sẵn trong ngày; văn bản do máy nhận dạng giọng nói tạo ra nên có thể sai chính tả hoặc mất dấu (ví dụ "ước gà" nghĩa là "ức gà", "phở bồ" nghĩa là "phở bò").

Nhiệm vụ: liệt kê từng món được nhắc tới.
- status = "eaten" nếu người dùng nói đã ăn / sẽ ăn một lượng cụ thể; status = "available" nếu họ chỉ nói là có món đó, hoặc hỏi nên ăn bao nhiêu.
- grams: quy đổi lượng đã nói ra gram của món ở dạng chín/ăn được, dùng khẩu phần Việt Nam thông thường (1 lạng = 100 g, 1 bát cơm ≈ 150 g, 1 tô phở ≈ 500 g). Nếu không nói lượng thì grams = null.
- food_id: id của món gần nhất trong danh mục dưới đây. Chỉ chọn khi đúng là món đó; nếu không có món phù hợp thì để null.
- Luôn ước tính kcal, đạm, tinh bột, béo cho 100 g món (dạng chín), kể cả khi đã chọn food_id.
- default_unit_name / default_unit_grams: đơn vị đếm quen thuộc của món và số gram của 1 đơn vị (ví dụ "cái", 60).
- name: tên món bằng tiếng Việt có dấu, viết gọn.
- Bỏ qua đồ uống không có năng lượng (nước lọc, trà không đường, cà phê đen).
- Nếu không có món nào, trả về danh sách rỗng.

Danh mục món có sẵn:
${catalog}`;
}

function buildSchema(foods) {
  return {
    type: 'object',
    additionalProperties: false,
    required: ['items'],
    properties: {
      items: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: [
            'name',
            'food_id',
            'status',
            'grams',
            'quantity_text',
            'kcal_per_100g',
            'protein_per_100g',
            'carbs_per_100g',
            'fat_per_100g',
            'default_unit_name',
            'default_unit_grams',
          ],
          properties: {
            name: { type: 'string' },
            food_id: { anyOf: [{ type: 'string', enum: foods.map((f) => f.id) }, { type: 'null' }] },
            status: { type: 'string', enum: ['eaten', 'available'] },
            grams: { anyOf: [{ type: 'number' }, { type: 'null' }] },
            quantity_text: { type: 'string', description: 'Lượng như người dùng nói, vd "1 bát rưỡi"' },
            kcal_per_100g: { type: 'number' },
            protein_per_100g: { type: 'number' },
            carbs_per_100g: { type: 'number' },
            fat_per_100g: { type: 'number' },
            default_unit_name: { type: 'string' },
            default_unit_grams: { type: 'number' },
          },
        },
      },
    },
  };
}

export class AiError extends Error {}

/**
 * @returns {Promise<{name, foodId, status, grams, quantityText, per100, unitName, unitGrams}[]>}
 */
export async function parseWithClaude({ apiKey, transcript, customFoods = [] }) {
  const foods = allFoods(customFoods);
  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });

  let response;
  try {
    response = await client.beta.messages.create({
      model: MODEL,
      max_tokens: 16000,
      // Nếu bộ lọc an toàn từ chối nhầm, API tự chạy lại trên model dự phòng.
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      // Trích xuất đơn giản → effort thấp để nhanh và rẻ.
      output_config: {
        effort: 'low',
        format: { type: 'json_schema', schema: buildSchema(foods) },
      },
      system: buildSystemPrompt(foods),
      messages: [{ role: 'user', content: transcript }],
    });
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError) throw new AiError('API key không hợp lệ. Kiểm tra lại trong phần Cài đặt.');
    if (err instanceof Anthropic.RateLimitError) throw new AiError('Gọi Claude quá nhiều lần, thử lại sau ít phút.');
    if (err instanceof Anthropic.APIConnectionError) throw new AiError('Không kết nối được tới Claude. Kiểm tra mạng.');
    if (err instanceof Anthropic.APIError) throw new AiError(`Claude báo lỗi (${err.status ?? '?'}): ${err.message}`);
    throw err;
  }

  if (response.stop_reason === 'refusal') throw new AiError('Claude từ chối xử lý đoạn này. Hãy thử nói lại.');
  if (response.stop_reason === 'max_tokens') throw new AiError('Câu trả lời bị cắt ngắn. Hãy chia đoạn ghi âm ngắn hơn.');

  const text = response.content.find((b) => b.type === 'text')?.text;
  if (!text) throw new AiError('Claude không trả về kết quả.');

  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new AiError('Không đọc được kết quả từ Claude.');
  }

  const knownIds = new Set(foods.map((f) => f.id));
  return (data.items ?? []).map((it) => ({
    name: it.name,
    foodId: it.food_id && knownIds.has(it.food_id) ? it.food_id : null,
    status: it.status === 'eaten' && it.grams ? 'eaten' : 'available',
    grams: typeof it.grams === 'number' && it.grams > 0 ? Math.round(it.grams) : null,
    quantityText: it.quantity_text ?? '',
    per100: {
      kcal: it.kcal_per_100g,
      p: it.protein_per_100g,
      c: it.carbs_per_100g,
      f: it.fat_per_100g,
    },
    unitName: it.default_unit_name || 'phần',
    unitGrams: it.default_unit_grams > 0 ? it.default_unit_grams : 100,
  }));
}
