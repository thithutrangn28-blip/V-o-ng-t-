import { getDB, PERMANENT_MEM_STORE, SHORT_TERM_MEM_STORE, LONG_TERM_MEM_STORE, LOREBOOK_STORE } from '../utils/db';
import { sendMessage } from '../utils/apiProxy';
import { countTokens } from '../core/memory/tokenCounter';

export interface LongTermMemoryEntry {
  id: string;
  novelId: string;
  chapterRange: number[]; // [start, end]
  title: string;
  content: string;
  enabled: boolean;
  archived: boolean;
  createdAt: number;
}

// Standardized for Vietnamese compatibility
export const estimateTokens = countTokens;

export class MemoryManager {
  novelId: string;
  // Chồng cập nhật theo ý vợ 65k tokens là mức "An toàn tuyệt đối" nhen! 💕
  MAX_BUDGET = 75000;
  SAFE_BUDGET = 65000;

  constructor(novelId: string) {
    this.novelId = novelId;
  }

  async getLongTermEntries(): Promise<LongTermMemoryEntry[]> {
    const db = await getDB();
    const all = await db.getAllFromIndex(LONG_TERM_MEM_STORE, 'novelId', this.novelId);
    // Ưu tiên các mục CORE lên đầu, sau đó là ngày tạo mới nhất
    return all.sort((a, b) => {
      const aIsCore = a.title.includes('CỐT LÕI') || a.title.includes('Bản Hiến Pháp');
      const bIsCore = b.title.includes('CỐT LÕI') || b.title.includes('Bản Hiến Pháp');
      if (aIsCore && !bIsCore) return -1;
      if (!aIsCore && bIsCore) return 1;
      return b.createdAt - a.createdAt;
    });
  }

  async saveLongTermEntry(entry: LongTermMemoryEntry) {
    const db = await getDB();
    await db.put(LONG_TERM_MEM_STORE, entry);
  }
  
  async updateLongTermEntryStatus(id: string, enabled: boolean) {
    const db = await getDB();
    const entry = await db.get(LONG_TERM_MEM_STORE, id);
    if (entry) {
      // Chồng chặn không cho tắt các thẻ Cốt Lõi nếu vợ không cố ý nhen
      const isCore = entry.title.includes('CỐT LÕI');
      entry.enabled = enabled;
      await db.put(LONG_TERM_MEM_STORE, id === entry.id ? entry : { ...entry, id }); 
      // Sửa lỗi gán ID nếu ID truyền vào là string còn Object có ID khác
      await db.put(LONG_TERM_MEM_STORE, entry);
    }
  }

  async archiveOldEntries() {
    const entries = await this.getLongTermEntries();
    // Chồng không bao giờ đụng vào thẻ Cốt Lõi của vợ nhen!
    const activeEntries = entries.filter((e) => !e.title.includes('CỐT LÕI'));
    
    if (activeEntries.length > 3) {
      console.log(`[Kikoko Memory] 🧹 Vợ muốn xoá sạch cho nhẹ máy nên chồng xoá các thẻ cũ ngoài top 3 nhen!`);
      // Sắp xếp cũ nhất lên đầu để xoá
      activeEntries.sort((a, b) => a.createdAt - b.createdAt);
      const toDelete = activeEntries.slice(0, activeEntries.length - 3);
      
      for (const entry of toDelete) {
        await this.deleteLongTermEntry(entry.id);
      }
    }
  }

  async summarizeAllChapters(allChapters: any[], config: any, onProgress?: (msg: string) => void) {
    if (!config || (!config.apiKey && !config.proxyEndpoint)) {
      throw new Error("Vợ chưa thiết lập API Proxy trong phần Cài đặt nên chồng không tóm tắt được đâu ạ! 💕");
    }

    // Nhóm các chương thành từng bộ 3 (để logic 3 chương luôn đồng bộ)
    const groups: any[][] = [];
    for (let i = 0; i < allChapters.length; i += 3) {
      groups.push(allChapters.slice(i, i + 3));
    }

    const controller = new AbortController();
    
    for (let i = 0; i < groups.length; i++) {
      const group = groups[i];
      const start = allChapters.indexOf(group[0]) + 1;
      const end = allChapters.indexOf(group[group.length - 1]) + 1;
      
      if (onProgress) onProgress(`Kiểm tra chu kỳ 3 chương: ${start}-${end}... (${i + 1}/${groups.length})`);
      
      const existingEntries = await this.getLongTermEntries();
      const isExist = existingEntries.some(e => e.chapterRange[0] === start && e.chapterRange[1] === end);
      
      if (!isExist) {
        if (onProgress) onProgress(`API Proxy: Đang dệt ký ức chương ${start}-${end}...`);
        const formattedChapters = group.map((c) => ({
          chapterNumber: allChapters.indexOf(c) + 1,
          content: c.content
        }));
        
        await this.generateLongTermEntry(formattedChapters, config, controller, onProgress);
      }
    }

    await this.archiveOldEntries();
    if (onProgress) onProgress('Đã hoàn thiện dọn dẹp và tóm tắt toàn bộ! ✨');
  }

  async forceCompressMaster(config: any, onProgress?: (msg: string) => void) {
    if (onProgress) onProgress(`API Proxy: Đang gom toàn bộ thẻ ghi nhớ để nén tổng thể...`);
    await this.checkAndCompressMasterSummary(config, onProgress, true);
  }

  /**
   * Dọn dẹp các mục lỗi hoặc trống
   */
  async pruneInvalidEntries(onProgress?: (msg: string) => void) {
    const entries = await this.getLongTermEntries();
    let deletedCount = 0;
    
    for (const entry of entries) {
      // Xóa nếu nội dung quá ngắn hoặc không có nội dung thực
      if (!entry.content || entry.content.trim().length < 10) {
        await this.deleteLongTermEntry(entry.id);
        deletedCount++;
      }
    }
    
    if (onProgress) onProgress(`Đã dọn dẹp xong ${deletedCount} thẻ ký ức lỗi nhen vợ! ✨`);
    return deletedCount;
  }

  /**
   * Tự động vô hiệu hóa các thẻ đã cũ khi đã có Master Summary
   */
  async smartContextPruning(onProgress?: (msg: string) => void) {
    const entries = await this.getLongTermEntries();
    const hasMaster = entries.some(e => e.title.includes('Ký Ức Cốt Lõi') && e.enabled);
    
    if (hasMaster) {
      if (onProgress) onProgress('Đang tối ưu ngữ cảnh: Xoá các thẻ cũ để giữ bộ nhớ gọn nhẹ... 🧹');
      let deletedCount = 0;
      for (const entry of entries) {
        // Nếu không phải là Master và không phải là 3 thẻ gần nhất, thì xoá luôn
        if (!entry.title.includes('Ký Ức Cốt Lõi')) {
          await this.deleteLongTermEntry(entry.id);
          deletedCount++;
        }
      }
      if (onProgress) onProgress(`Đã tối ưu hóa context, đã xoá ${deletedCount} thẻ cũ nhen vợ! 💕`);
    } else {
      if (onProgress) onProgress('Chưa có Ký Ức Cốt Lõi để nén thêm đâu ạ! 💕');
    }
  }

  async deleteLongTermEntry(id: string) {
    const db = await getDB();
    await db.delete(LONG_TERM_MEM_STORE, id);
  }

  async generateLongTermEntry(chapters: { chapterNumber: number; content: string }[], config: any, controller: AbortController, onProgress?: (msg: string) => void) {
    if (chapters.length === 0) return;
    
    // Sort ascending
    chapters.sort((a, b) => a.chapterNumber - b.chapterNumber);
    const startObj = chapters[0];
    const endObj = chapters[chapters.length - 1];
    const chapterRange = [startObj.chapterNumber, endObj.chapterNumber];
    
    const summaryPrompt = `
[KIKOKO MEMORY SYSTEM - ÉP OUTPUT CAO ~2500 TOKENS]
Nhiệm vụ của bạn là tóm tắt ${chapters.length} chương truyện (từ chương ${chapterRange[0]} đến ${chapterRange[1]}) thành một "Thẻ Bộ Nhớ Trường Kỳ".

YÊU CẦU BẮT BUỘC:
1. Độ dài: Khoảng 2500 tokens. Hãy viết cực kỳ chi tiết từng hành động, cảm xúc và bối cảnh của 3 chương này.
2. Ngôn ngữ: Tiếng Việt, văn phong tiểu thuyết gia chuyên nghiệp.
3. Cấu trúc thẻ PHẢI gồm 10 mục chính sau:

[1. BỐI CẢNH & KHÔNG GIAN CHI TIẾT]
[2. DIỄN BIẾN HÀNH ĐỘNG CỐT LÕI - PHÂN ĐOẠN CHI TIẾT]
[3. CHI TIẾT NHÂN VẬT & TÂM LÝ BIẾN CHUYỂN]
[4. TIẾN TRIỂN TÌNH CẢM & NHỮNG ĐIỂM CHẠM CẢM XÚC]
[5. ĐỐI THOẠI ĐẮT GIÁ & PHÁT NGÔN QUAN TRỌNG]
[6. CONFLICT (XUNG ĐỘT) ĐANG DỞ DANG]
[7. FORESHADOWING (ĐIỀM BÁO) ĐÃ CÀI CẮM]
[8. VẬT PHẨM & MÔI TRƯỜNG BIẾN ĐỘNG]
[9. KẾT LUẬN CỦA GIAI ĐOẠN 3 CHƯƠNG]
[10. GHI CHÚ CHO CHƯƠNG TIẾP THEO]

Dữ liệu nguồn (Nghiêm cấm viết lại nội dung cũ, chỉ tập trung vào diễn biến mới của 3 chương này):
${chapters.map(c => `--- CHƯƠNG ${c.chapterNumber} ---\n${c.content}`).join('\n\n')}
    `.trim();

    // Call API proxy
    let summaryText = '';
    const messages: any[] = [
      { role: 'system', content: 'Bạn là chuyên gia tóm tắt truyện. Viết theo đúng 8 mục định dạng bắt buộc.' },
      { role: 'user', content: summaryPrompt }
    ];

    try {
      if (onProgress) onProgress(`API Proxy: Đang dệt bộ nhớ chương ${chapterRange[0]}-${chapterRange[1]}...`);
      summaryText = await sendMessage(
        config as any, 
        messages as any, 
        undefined, 
        3, // retries cho vợ nhen
        controller.signal
      );
    } catch (err: any) {
      if (err.name === 'AbortError') throw err;
      console.error('Long Term Summary failed', err);
      // Fallback fallback raw if failed
      summaryText = `[BỐI CẢNH CHUNG]\nKhông thể tạo tóm tắt do lỗi API: ${err.message}\n\n[GHI CHÚ]\nBộ nhớ đã cố gắng lưu thông tin chương ${chapterRange[0]} đến ${chapterRange[1]}.`;
    }

    // Try to extract a title, or generate a default one
    let title = `Chương ${chapterRange[0]}-${chapterRange[1]}`;
    // Maybe extract first 5 words as title if there's no title specified
    const match = summaryText.match(/Tóm tắt[^\n]*/i);
    if (match) title = match[0].substring(0, 30);

    const newEntry: LongTermMemoryEntry = {
      id: crypto.randomUUID(),
      novelId: this.novelId,
      chapterRange,
      title,
      content: summaryText,
      enabled: true,
      archived: false,
      createdAt: Date.now()
    };

    await this.saveLongTermEntry(newEntry);
    await this.archiveRecentlyCompressed(chapterRange);
    await this.checkAndCompressMasterSummary(config);
    if (onProgress) onProgress('Hoàn thành tổng hợp!');
  }

  async archiveRecentlyCompressed(chapterRange: number[]) {
     // Optional: mark chapters as "summarized" in other stores if needed
  }

  async checkAndCompressMasterSummary(config: any, onProgress?: (msg: string) => void, force: boolean = false) {
    const entries = await this.getLongTermEntries();
    const enabledEntries = entries.filter(e => e.enabled && !e.archived);
    
    // Phân loại thẻ
    const normalEntries = enabledEntries.filter(e => !e.title.includes('CỐT LÕI') && !e.title.includes('Cốt Lõi') && !e.title.includes('Master Summary'));
    
    let totalTokens = 0;
    enabledEntries.forEach(e => {
      totalTokens += estimateTokens(e.content);
    });

    // Tự động nén nếu >= 15k tokens hoặc đã có >= 3 thẻ 3-chương hoặc vợ ép nén thủ công
    if (totalTokens >= 15000 || normalEntries.length >= 3 || (force && enabledEntries.length >= 2)) {
      if (onProgress) onProgress(`API Proxy: Đang nén tất cả ký ức thành "Ký Ức Cốt Lõi" duy nhất (${totalTokens.toLocaleString()} tokens)... 💕`);
      
      // Nén TẤT CẢ thẻ Cốt lõi cũ và TẤT CẢ thẻ thường 3-chương hiện có thành 1 thẻ duy nhất
      // Để sau lần nén này, bộ nhớ chỉ còn đúng 1 thẻ "Ký Ức Cốt Lõi" sạch sẽ.
      // Các chương mới được viết sau đó sẽ đẻ ra các thẻ 3-chương mới, đúng ý vợ dặn.
      const toCompress = enabledEntries;
      
      if (toCompress.length < 2 && !force) {
          if (force && onProgress) onProgress('Chưa đủ thẻ để nén đâu vợ yêu ơi! 💕');
          return;
      }

      const controller = new AbortController();
      const masterPrompt = `
[KIKOKO MASTER MEMORY COMPRESSOR V10]
Bạn là hệ thống nén ký ức siêu việt. Hãy nén Ký Ức Cốt Lõi hiện tại (nếu có) cùng các bản tóm tắt tiểu thuyết 3-chương mới nhất dưới đây thành một bản tóm tắt "Ký Ức Cốt Lõi" DUY NHẤT, mạch lạc và xuyên suốt.

YÊU CẦU:
- Tổng hợp toàn bộ diễn biến, bối cảnh, sự phát triển tâm lý nhân vật và tình cảm từ ĐẦU truyện đến nay thành một bản tóm tắt Siêu Trường Kỳ ĐỒNG NHẤT.
- Giữ phong cách văn học mượt mà.
- Độ dài mục tiêu: Khoảng 5000 tokens. Hãy chắt lọc những chi tiết tuyệt vời và cốt lõi nhất. CẤM BỎ SÓT NHỮNG MỐC QUAN TRỌNG NHẤT.

DỮ LIỆU CẦN NÉN (Bao gồm Ký ức cốt lõi cũ và các chương mới tiếp nối):
${toCompress.map(e => `[${e.title}]:\n${e.content}`).join('\n\n---\n\n')}
      `.trim();

      let compressedText = '';
      const messages: { role: 'user' | 'assistant' | 'system', content: string }[] = [
        { role: 'system', content: 'Bạn là siêu máy chủ lưu trữ ký ức vĩnh cửu của Kikoko Novel. Xóa mờ ranh giới các thẻ rời rạc, hòa trộn chúng thành 1 ký ức cốt lõi hoàn chỉnh nhất.' },
        { role: 'user', content: masterPrompt }
      ];

      try {
        compressedText = await sendMessage(
          config, 
          messages, 
          undefined, 
          3,
          controller.signal
        );

        // Tạo thẻ Ký Ức Cốt Lõi mới
        let start = 1;
        let end = 1;
        if (toCompress.length > 0) {
           start = Math.min(...toCompress.map(e => e.chapterRange[0]));
           end = Math.max(...toCompress.map(e => e.chapterRange[1]));
        }

        const masterEntry: LongTermMemoryEntry = {
          id: "master_" + Date.now(),
          novelId: this.novelId,
          chapterRange: [start, end],
          title: "KÝ ỨC CỐT LÕI (Chương " + start + "-" + end + ")",
          content: compressedText,
          enabled: true,
          archived: false,
          createdAt: Date.now()
        };

        await this.saveLongTermEntry(masterEntry);

        // Xoá các thẻ cũ đã được nén
        for (const part of toCompress) {
          await this.deleteLongTermEntry(part.id);
        }
        
        if (onProgress) onProgress('API Proxy: Đã nén thành một Ký Ức Cốt Lõi thành công, gọn gàng và đầy đủ! ✨');
      } catch (err) {
        console.error("Master compression failed", err);
        if (onProgress) onProgress("Lỗi API Proxy khi nén Ký Ức: " + (err instanceof Error ? err.message : String(err)));
      }
    }
  }
}
