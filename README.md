# Gym – Dinh dưỡng hằng ngày

Ứng dụng tập gym chạy trên điện thoại (PWA: mở bằng trình duyệt rồi "Thêm vào màn hình chính",
dùng như app thật). Tính năng đầu tiên: **kiểm soát dinh dưỡng bằng giọng nói**.

## Cách dùng

1. **Cài đặt** → nhập giới tính, tuổi, chiều cao, cân nặng, mức vận động, mục tiêu
   (giảm mỡ / giữ cân / tăng cơ). App tính lượng kcal, đạm, tinh bột, béo cần mỗi ngày.
2. Mỗi sáng, ở tab **Hôm nay**, bấm 🎙️ và nói, ví dụ:

   > "Sáng nay ăn một tô phở bò. Nhà có cơm, ức gà, trứng, rau muống và chuối."

3. Bấm **Phân tích & ghi lại**:
   - Món có nói lượng ("một tô phở") được ghi là **đã ăn**.
   - Món chỉ nói tên ("có cơm, ức gà…") là **có sẵn** → app gợi ý **nên ăn bao nhiêu**:

     | Món | Lượng gợi ý (nam 65 kg, giữ cân, đã ăn 1 tô phở) |
     |---|---|
     | Cơm trắng | 4 bát (600 g) |
     | Ức gà | 80 g |
     | Trứng gà | 6 quả |
     | Rau xanh | 350 g |
     | Chuối | 4 quả |

     Kèm nhắc nhở nếu còn thiếu: "còn thiếu khoảng 160 kcal – có thể thêm sữa, một nắm lạc…"

4. Ăn xong bấm **Đánh dấu đã ăn theo gợi ý** (hoặc sửa lại số gram nếu ăn khác).
   Tab **Lịch sử** lưu lại từng ngày.

## Hai cách hiểu câu nói

| | Offline (mặc định) | Claude (khi có API key) |
|---|---|---|
| Cần mạng | Không | Có |
| Chi phí | Miễn phí | Ước tính ~0,02–0,03 USD (~500–800 đồng) mỗi lần phân tích (model `claude-opus-5-5`, effort thấp) |
| Hiểu được | ~45 món phổ biến, câu nói đơn giản | Câu nói tự nhiên, lỗi nhận dạng giọng nói, cả món **không có** trong danh sách (tự ước tính dinh dưỡng và lưu lại) |

API key lấy tại <https://console.anthropic.com>, nhập trong **Cài đặt**; key chỉ lưu trên điện thoại.
Nếu Claude lỗi hoặc mất mạng, app tự chuyển sang bộ phân tích offline.

## App tính toán thế nào?

- **BMR** (năng lượng cơ thể đốt khi nằm yên) – công thức Mifflin–St Jeor.
  Ví dụ nam 25 tuổi, 170 cm, 65 kg: 10·65 + 6.25·170 − 5·25 + 5 ≈ **1593 kcal**.
- **TDEE** = BMR × hệ số vận động (tập 3–5 buổi/tuần: ×1.55 → ≈ 2468 kcal).
- **Mục tiêu**: giảm mỡ −20 %, tăng cơ +10 %.
- **Macro**: đạm 1.8–2.2 g/kg, béo ~25 % năng lượng, còn lại là tinh bột.
- **Gợi ý khẩu phần**: tìm lượng mỗi món có sẵn sao cho *(đã ăn + sẽ ăn)* gần mục tiêu nhất,
  ưu tiên kcal và đạm, trong giới hạn hợp lý (vd tối đa 6 quả trứng/ngày, rau tối thiểu 150 g),
  rồi làm tròn về đơn vị dễ đong (½ bát, 1 quả, 10 g).

Số liệu dinh dưỡng là xấp xỉ cho món đã nấu chín; món nhà nấu có thể chênh 10–20 % tuỳ lượng dầu.

## Phát triển

```bash
npm install
npm run dev      # mở http://<ip-máy>:5173 trên điện thoại (cùng Wi-Fi)
npm test         # chạy test
npm run build    # build ra thư mục dist/
```

Ghi âm dùng Web Speech API của trình duyệt (Chrome Android, Safari iOS 14.5+), và cần HTTPS
hoặc `localhost`.

### Đưa lên điện thoại (GitHub Pages)

Workflow `.github/workflows/deploy.yml` tự build và đăng app khi có commit lên `main`.
Bật một lần: **Settings → Pages → Source: GitHub Actions**. App sẽ có địa chỉ
`https://<tên-github>.github.io/gym/` – mở trên điện thoại rồi chọn "Thêm vào màn hình chính".

### Cấu trúc

```
src/lib/foods.js     danh mục món ăn + dinh dưỡng / 100 g
src/lib/targets.js   tính BMR, TDEE, macro
src/lib/portions.js  thuật toán gợi ý khẩu phần
src/lib/parser.js    hiểu câu nói (offline)
src/lib/ai.js        hiểu câu nói bằng Claude
src/lib/speech.js    ghi âm → chữ
src/lib/storage.js   lưu dữ liệu trên máy
src/main.js          giao diện
```
