// Ghi âm và chuyển giọng nói tiếng Việt thành chữ bằng Web Speech API của
// trình duyệt (Chrome trên Android, Safari trên iOS 14.5+). Không cần API key.

const Recognition = globalThis.SpeechRecognition || globalThis.webkitSpeechRecognition;

export const speechSupported = Boolean(Recognition);

/**
 * Bắt đầu nghe. Trả về hàm stop().
 * @param {{onText:(finalText:string, interim:string)=>void, onError:(msg:string)=>void, onEnd:()=>void}} handlers
 */
export function startListening({ onText, onError, onEnd }) {
  if (!Recognition) {
    onError('Trình duyệt này không hỗ trợ nhận dạng giọng nói. Hãy dùng Chrome (Android) hoặc Safari (iPhone), hoặc gõ tay.');
    onEnd();
    return () => {};
  }

  let finalText = '';
  let stopped = false;
  let rec;

  const begin = () => {
    rec = new Recognition();
    rec.lang = 'vi-VN';
    rec.continuous = true;
    rec.interimResults = true;

    rec.onresult = (event) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const r = event.results[i];
        if (r.isFinal) finalText += (finalText ? ' ' : '') + r[0].transcript.trim();
        else interim += r[0].transcript;
      }
      onText(finalText, interim);
    };

    rec.onerror = (event) => {
      if (event.error === 'no-speech' || event.error === 'aborted') return;
      stopped = true;
      const messages = {
        'not-allowed': 'Chưa cho phép dùng micro. Hãy cấp quyền micro cho trang này.',
        'service-not-allowed': 'Chưa cho phép dùng micro. Hãy cấp quyền micro cho trang này.',
        network: 'Nhận dạng giọng nói cần mạng. Kiểm tra kết nối.',
        'language-not-supported': 'Máy chưa hỗ trợ nhận dạng tiếng Việt.',
      };
      onError(messages[event.error] ?? `Lỗi ghi âm: ${event.error}`);
    };

    // Chrome tự dừng sau vài giây im lặng – nếu người dùng chưa bấm dừng thì nghe tiếp.
    rec.onend = () => {
      if (stopped) onEnd();
      else begin();
    };

    rec.start();
  };

  begin();

  return () => {
    stopped = true;
    rec?.stop();
  };
}
