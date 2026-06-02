import { ApiProxySettings } from './apiProxy';
import { sendMessageStream } from './apiProxy';

export const summarizeChapter = async (
  chapterContent: string,
  apiSettings: any,
  targetTokens: number = 5000,
  onProgress?: (text: string) => void
): Promise<string> => {
  const prompt = `[SMART MEMORY SYSTEM]
Nhiệm vụ của bạn là đọc chương tiểu thuyết dưới đây và TÓM TẮT LẠI CHI TIẾT TỪ Ý THEO ĐÚNG TIẾN TRÌNH CÂU CHUYỆN.

Yêu cầu tóm tắt:
1. Đô dài mong muốn: Khoảng ${targetTokens} tokens (tương đương 10,000 chữ).
2. Chi tiết: Phải liệt kê rành mạch mọi sự kiện xảy ra, mọi câu thoại quan trọng, mọi thay đổi trong cảm xúc nhân vật.
3. KHÔNG ĐƯỢC CẮT BỚT: Tóm tắt nhưng phải đầy đủ ý chính, không được bỏ qua cảnh nào.
4. Mạch truyện: Giữ nguyên văn lịch sử tuyến tính từ đầu chương đến cuối chương.

[NỘI DUNG CHƯƠNG CẦN TÓM TẮT]:
${chapterContent}`;

  const abortController = new AbortController();
  const stream = sendMessageStream(
    { ...apiSettings, endpoint: apiSettings.proxyEndpoint } as ApiProxySettings,
    [{ role: 'user', content: prompt }],
    undefined,
    abortController.signal,
    false // TẮT hack long novel để chỉ gọi API đúng 1 lần cho tóm tắt
  );

  let fullSummary = '';
  try {
    for await (const chunk of stream) {
      if (chunk.text) {
        fullSummary += chunk.text;
        if (onProgress) onProgress(fullSummary);
      }
    }
  } catch (error) {
    console.error("Lỗi khi tóm tắt chương:", error);
    throw error;
  }
  
  return fullSummary;
};

export const summarizeChaptersBatch = async (
  chapters: { id: string | number; fullText: string }[],
  apiSettings: any,
  targetTokensPerChapter: number = 5000,
  onProgress?: (text: string) => void
): Promise<Record<string, string>> => {
  if (chapters.length === 0) return {};

  const prompt = `
Bạn là biên tập viên văn học chuyên nghiệp. Bạn sẽ tóm tắt 
${chapters.length} chương tiểu thuyết thành ${chapters.length} bản tóm tắt riêng biệt 
trong MỘT LẦN PHẢN HỒI duy nhất.

ĐỘ DÀI MỖI BẢN TÓM TẮT: ~${targetTokensPerChapter} token (~17,500 ký tự, ~3,000 từ)

CẤU TRÚC OUTPUT (BẮT BUỘC):

Sử dụng marker chính xác để phân tách các bản tóm tắt:

===SUMMARY_CHAPTER_[ID]_START===
[Nội dung tóm tắt chương]
===SUMMARY_CHAPTER_[ID]_END===

NỘI DUNG MỖI BẢN TÓM TẮT PHẢI CÓ:

1. CỐT TRUYỆN CHÍNH (40%): Các sự kiện chính theo thứ tự, 
   quyết định quan trọng, bước ngoặt mối quan hệ, lore mới
   
2. PHÁT TRIỂN NHÂN VẬT (25%): Cảm xúc nhân vật chính, 
   thay đổi tâm lý, tiết lộ quá khứ, mục tiêu mới
   
3. MỐI QUAN HỆ (15%): Tình trạng mối quan hệ đầu chương, 
   sự kiện thay đổi, tình trạng cuối chương
   
4. BỐI CẢNH (10%): Địa điểm, thời gian, không khí, 
   yếu tố môi trường biểu tượng
   
5. TRẠNG THÁI CUỐI CHƯƠNG (10%): Nhân vật đang ở đâu, 
   làm gì, cảm thấy gì để chương tiếp có điểm xuất phát

QUY TẮC:

- Viết bằng văn xuôi tóm tắt mạch lạc, không bullet
- Ngôi thứ 3, giọng văn neutral
- Chính xác về tên, địa điểm, sự kiện
- Bao quát đủ tất cả phân cảnh chính
- Không bịa thông tin

═══════════════════════════════════════════════════════════════
CÁC CHƯƠNG CẦN TÓM TẮT:
═══════════════════════════════════════════════════════════════

${chapters.map(c => `[CHƯƠNG_${c.id}]:\n${c.fullText}`).join('\n\n═══════════════════════════════════════════════════════════════\n\n')}

BẮT ĐẦU TÓM TẮT CẢ ${chapters.length} CHƯƠNG (sử dụng marker phân tách):
`;

  const abortController = new AbortController();
  const stream = sendMessageStream(
    { ...apiSettings, endpoint: apiSettings.proxyEndpoint } as ApiProxySettings,
    [{ role: 'user', content: prompt }],
    undefined,
    abortController.signal,
    false // TẮT hack long novel để chỉ gọi API đúng 1 lần cho tóm tắt
  );

  let fullOutput = '';
  try {
    for await (const chunk of stream) {
      if (chunk.text) {
        fullOutput += chunk.text;
        if (onProgress) onProgress(fullOutput);
      }
    }
  } catch (error) {
    console.error("Lỗi khi tóm tắt batch chương:", error);
    throw error;
  }
  
  // Parse outputs based on markers
  const results: Record<string, string> = {};
  for (const c of chapters) {
    const startMarker = `===SUMMARY_CHAPTER_${c.id}_START===`;
    const endMarker = `===SUMMARY_CHAPTER_${c.id}_END===`;
    
    // In case AI uses lowercase or slightly different formatting, we can use regex
    const regex = new RegExp(`===SUMMARY_CHAPTER_${c.id}_START===[\\s\\S]*?(.*)[\\s\\S]*?===SUMMARY_CHAPTER_${c.id}_END===`, 'i');
    const match = fullOutput.match(new RegExp(`${startMarker}([\\s\\S]*?)${endMarker}`, 'i'));
    
    if (match && match[1]) {
      results[c.id.toString()] = match[1].trim();
    } else {
      // Fallback if markers are messed up, we just try to find something or return raw
      console.warn(`[Kikoko Memory] ⚠️ Markers missing for chapter ${c.id}`);
      results[c.id.toString()] = '';
    }
  }

  // Fallback heuristic if no markers match but we have some text and it's 1 chapter
  if (chapters.length === 1 && !results[chapters[0].id.toString()] && fullOutput.trim().length > 0) {
    results[chapters[0].id.toString()] = fullOutput.replace(/===.*?===/g, '').trim();
  }

  return results;
};
export const getChapterTail = (content: string, percentage: number = 0.6): string => {
  if (!content) return '';
  const length = content.length;
  const startIndex = Math.floor(length * (1 - percentage));
  return content.substring(startIndex);
};
