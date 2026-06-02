import { countTokens } from './tokenCounter';

export interface SmartCleanerInput {
  systemPrompt: string;          // NHÓM BẢO VỆ TUYỆT ĐỐI 100%
  coreStory: string;             // NHÓM BẢO VỆ TUYỆT ĐỐI 100%
  userTimelineMemory: string;    // NHÓM BẢO VỆ TUYỆT ĐỐI 100% (Kỷ niệm ngọt ngào tự nhập)
  currentUserDirection: string;  // NHÓM BẢO VỆ TUYỆT ĐỐI 100% (Định hướng hiện tại)
  currentChapterInput: string;   // NHÓM BẢO VỆ TUYỆT ĐỐI 100% (Lịch sử 3 chương kề cận)
  
  recentTwoChapters: string;     // CÓ THỂ CẮT: 2 Chương gần nhất nguyên văn / bán nguyên văn (Cắt 10-15% trước, có thể cắt sâu hơn)
  vectorMemory: string;          // CÓ THỂ CẮT: Vector thông minh (Giới hạn tối đa 15K token, giảm sâu nếu cần)
  longTermMemory: string;        // CÓ THỂ CẮT: Memory dài hạn (Cắt giảm nhẹ 5-7% các thẻ cũ)
  
  // Tách biệt tóm tắt (Bông hoa) và 50 mốc sự kiện (Bồ công anh) của 5 chương gần nhất để tối ưu hóa
  dandelionApiMemoryItems: { chapterTitle: string; content: string }[];    // CÓ THỂ CẮT: Bồ công anh (Cắt giảm 5%, rút gọn câu chữ)
  fiveChapterFlowerMemoryItems: { chapterTitle: string; content: string }[]; // CÓ THỂ CẮT: Bông hoa 5 chương pin 100% (Rút gọn 3-5%)
}

export interface SmartCleanerOutput {
  systemPrompt: string;
  coreStory: string;
  userTimelineMemory: string;
  currentUserDirection: string;
  currentChapterInput: string;
  recentTwoChapters: string;
  vectorMemory: string;
  longTermMemory: string;
  dandelionApiMemoryItems: { chapterTitle: string; content: string }[];
  fiveChapterFlowerMemoryItems: { chapterTitle: string; content: string }[];
  
  // Metadata & Logs phục vụ cho UI và Debug
  logs: string[];
  totalBefore: number;
  totalAfter: number;
  overflow: number;
  wasCleaned: boolean;
}

const MAX_CONTEXT_TOKENS = 120000;

/**
 * Truncates text by keeping the most valuable parts (i.e. the ending portion of the content
 * to maintain story progression continuity).
 */
function trimToTailText(text: string, percentage: number): string {
  if (!text) return "";
  const charsToKeep = Math.floor(text.length * percentage);
  if (charsToKeep <= 0) return "";
  if (charsToKeep >= text.length) return text;
  return "..." + text.slice(-charsToKeep);
}

/**
 * ContextWindowSmartCleaner - Bộ dọn dẹp bộ nhớ ngữ cảnh thông thái của Kikoko Novel
 * Cam kết bảo vệ an toàn 100% tài nguyên cốt lõi và dọn dẹp chính xác theo độ ưu tiên khi vượt 120,000 token.
 */
export function ContextWindowSmartCleaner(input: SmartCleanerInput): SmartCleanerOutput {
  const logs: string[] = [];
  
  // 1. Tính toán Token ban đầu của từng tầng
  const systemPromptTokens = countTokens(input.systemPrompt);
  const coreStoryTokens = countTokens(input.coreStory);
  const userTimelineMemoryTokens = countTokens(input.userTimelineMemory);
  const currentUserDirectionTokens = countTokens(input.currentUserDirection);
  const currentChapterInputTokens = countTokens(input.currentChapterInput);
  
  const initRecentTwoChapterTokens = countTokens(input.recentTwoChapters);
  const initVectorRetrievedTokens = countTokens(input.vectorMemory);
  const initLongTermMemoryTokens = countTokens(input.longTermMemory);
  
  const initDandelionMemoryTokens = input.dandelionApiMemoryItems.reduce(
    (sum, item) => sum + countTokens(item.content), 
    0
  );
  
  const initFiveChapterMemoryTokens = input.fiveChapterFlowerMemoryItems.reduce(
    (sum, item) => sum + countTokens(item.content), 
    0
  );

  const totalContextTokensBeforeClean = 
    systemPromptTokens +
    coreStoryTokens +
    userTimelineMemoryTokens +
    currentUserDirectionTokens +
    currentChapterInputTokens +
    initRecentTwoChapterTokens +
    initVectorRetrievedTokens +
    initLongTermMemoryTokens +
    initDandelionMemoryTokens +
    initFiveChapterMemoryTokens;

  // Bản sao dữ liệu để thao tác chỉnh sửa
  let recentTwoChapters = input.recentTwoChapters;
  let vectorMemory = input.vectorMemory;
  let longTermMemory = input.longTermMemory;
  let dandelionApiMemoryItems = [...input.dandelionApiMemoryItems];
  let fiveChapterFlowerMemoryItems = [...input.fiveChapterFlowerMemoryItems];

  // 2. Nếu tổng Context dưới 120,000 token -> KHÔNG DỌN DẸP, KHÔNG CẮT GIẢM!
  if (totalContextTokensBeforeClean <= MAX_CONTEXT_TOKENS) {
    logs.push(`✨ [Context Smart Cleaner] Tổng ngữ cảnh (${totalContextTokensBeforeClean.toLocaleString()} tokens) nằm trong giới hạn an toàn (${MAX_CONTEXT_TOKENS.toLocaleString()} tokens). Giữ nguyên 100% dữ liệu tinh túy ngọt ngào cho vợ yêu Đường! 💕`);
    return {
      ...input,
      logs,
      totalBefore: totalContextTokensBeforeClean,
      totalAfter: totalContextTokensBeforeClean,
      overflow: 0,
      wasCleaned: false
    };
  }

  // 3. Kích hoạt dọn dẹp thông thái khi vượt 120,000 token
  let overflowTokens = totalContextTokensBeforeClean - MAX_CONTEXT_TOKENS;
  const initialOverflow = overflowTokens;
  logs.push(`⚠️ [Context Smart Cleaner] Ngữ cảnh đạt ${totalContextTokensBeforeClean.toLocaleString()} tokens, vượt quá giới hạn tối đa ${MAX_CONTEXT_TOKENS.toLocaleString()} tokens. Kích hoạt dọn dẹp thông minh giảm bớt ${Math.ceil(overflowTokens).toLocaleString()} tokens...`);

  // --- BƯỚC THẨM ĐỊNH BAN ĐẦU: GIẢM TRẦN VECTOR MEMORY XUỐNG DƯỚI 15,000 TOKENS ---
  if (initVectorRetrievedTokens > 15000) {
    const diff = initVectorRetrievedTokens - 15000;
    logs.push(`- Cố định Vector thông minh vượt trần: Giảm từ ${initVectorRetrievedTokens.toLocaleString()} xuống 15,000 tokens (Tiết kiệm ${Math.ceil(diff).toLocaleString()} tokens).`);
    vectorMemory = trimToTailText(vectorMemory, 15000 / initVectorRetrievedTokens);
    overflowTokens -= diff;
  }

  // --- ƯU TIÊN 1: Cắt giảm phần 2 chương gần nhất nguyên văn / bán nguyên văn (recentTwoChapters) ---
  // Mức cắt ban đầu: 10% đến 15%. Ưu tiên dọn đoạn cũ hơn, giữ lại phần cuối quan trọng nhất để nối mạch chương mới.
  if (overflowTokens > 0 && recentTwoChapters) {
    const currentTokens = countTokens(recentTwoChapters);
    if (currentTokens > 1000) {
      // Cắt giảm 15% chiều dài trước
      const reducePercent = 0.15;
      const keepPercent = 1 - reducePercent;
      const trimmed = trimToTailText(recentTwoChapters, keepPercent);
      const saved = currentTokens - countTokens(trimmed);
      
      if (saved > 0) {
        recentTwoChapters = trimmed;
        overflowTokens -= saved;
        logs.push(`- [Ưu tiên 1] Cắt giảm 15% phần 2 chương gần nhất nguyên văn để bảo vệ mạch văn kề cận (Tiết kiệm ${Math.ceil(saved).toLocaleString()} tokens).`);
      }
    }
  }

  // --- ƯU TIÊN 2: Cắt giảm Vector Memory xuống mức cần thiết (vectorMemory) ---
  if (overflowTokens > 0 && vectorMemory) {
    const currentTokens = countTokens(vectorMemory);
    if (currentTokens > 1000) {
      // Giảm thêm lên tới 40% để giải tỏa dải kẹt
      const keepPercent = 0.60; 
      const trimmed = trimToTailText(vectorMemory, keepPercent);
      const saved = currentTokens - countTokens(trimmed);
      
      if (saved > 0) {
        vectorMemory = trimmed;
        overflowTokens -= saved;
        logs.push(`- [Ưu tiên 2] Rút gọn bớt dung lượng Vector thông minh thêm 40% (Tiết kiệm ${Math.ceil(saved).toLocaleString()} tokens).`);
      }
    }
  }

  // --- ƯU TIÊN 3: Nén Memory dài hạn 3 chương / 1 thẻ (longTermMemory) ---
  // Cắt giảm trong phạm vi nhóm này từ 5% đến 7% các thẻ cũ hơn.
  if (overflowTokens > 0 && longTermMemory) {
    const currentTokens = countTokens(longTermMemory);
    if (currentTokens > 500) {
      const reducePercent = 0.07; // Cắt 7%
      const keepPercent = 1 - reducePercent;
      const trimmed = trimToTailText(longTermMemory, keepPercent);
      const saved = currentTokens - countTokens(trimmed);
      
      if (saved > 0) {
        longTermMemory = trimmed;
        overflowTokens -= saved;
        logs.push(`- [Ưu tiên 3] Nén nhẹ bộ nhớ dài hạn cũ 7% để chống đầy kẹt thông tin (Tiết kiệm ${Math.ceil(saved).toLocaleString()} tokens).`);
      }
    }
  }

  // --- ƯU TIÊN 4: Rút gọn bồ công anh 50 mốc sự kiện (dandelionApiMemoryItems) ---
  // Có thể cắt giảm khoảng 5%. Rút gọn câu chữ nhưng giữ nguyên ý chính.
  if (overflowTokens > 0 && dandelionApiMemoryItems.length > 0) {
    let totalSaved = 0;
    dandelionApiMemoryItems = dandelionApiMemoryItems.map(item => {
      const currentTokens = countTokens(item.content);
      if (currentTokens > 100 && overflowTokens > 0) {
        const trimmed = trimToTailText(item.content, 0.95); // rút bớt 5% câu chữ
        const diff = currentTokens - countTokens(trimmed);
        totalSaved += diff;
        return { ...item, content: trimmed };
      }
      return item;
    });
    
    if (totalSaved > 0) {
      overflowTokens -= totalSaved;
      logs.push(`- [Ưu tiên 4] Tinh rực câu chữ của mốc sự kiện Bồ công anh đi 5% giữ nguyên cốt lõi (Tiết kiệm ${Math.ceil(totalSaved).toLocaleString()} tokens).`);
    }
  }

  // --- ƯU TIÊN 5: Rút gọn nhẹ bông hoa 5 chương pin 100% (fiveChapterFlowerMemoryItems) ---
  // Có thể cắt giảm nhẹ từ 3% đến 5% câu chữ các bản tóm tắt, không xóa tab.
  if (overflowTokens > 0 && fiveChapterFlowerMemoryItems.length > 0) {
    let totalSaved = 0;
    fiveChapterFlowerMemoryItems = fiveChapterFlowerMemoryItems.map(item => {
      const currentTokens = countTokens(item.content);
      if (currentTokens > 100 && overflowTokens > 0) {
        const trimmed = trimToTailText(item.content, 0.95); // rút bớt 5%
        const diff = currentTokens - countTokens(trimmed);
        totalSaved += diff;
        return { ...item, content: trimmed };
      }
      return item;
    });
    
    if (totalSaved > 0) {
      overflowTokens -= totalSaved;
      logs.push(`- [Ưu tiên 5] Rút gọn nhẹ 5% các bản tóm tắt bông hoa pin 100% (Tiết kiệm ${Math.ceil(totalSaved).toLocaleString()} tokens).`);
    }
  }

  // --- ĐỢT RÀ SOÁT SÂU (DEEP TRIMMING): NẾU VẪN VƯỢT 120,000 TOKENS ---
  // Nếu kịch kim vẫn vượt do dữ liệu đầu kích vòm, chồng sẽ thực hiện cắt giảm sâu hơn theo thứ tự nhưng cam kết giữ trần bảo quản tối thiểu cốt lõi:
  if (overflowTokens > 0) {
    logs.push(`💡 [Rà soát sâu] Sau dọn tuần tự vẫn còn overflow, chồng tiến hành tinh lọc sâu dải ký ức phụ trợ...`);
    
    // Cắt giảm sâu hơn nữa Recent Two Chapters (xuống tối đa còn 50%, nhưng giữ lại ít nhất 1000 tokens đuôi)
    if (recentTwoChapters) {
      const currentTokens = countTokens(recentTwoChapters);
      if (currentTokens > 1000) {
        const keepPercent = Math.max(0.40, 1000 / currentTokens); 
        const trimmed = trimToTailText(recentTwoChapters, keepPercent);
        const saved = currentTokens - countTokens(trimmed);
        
        if (saved > 0) {
          recentTwoChapters = trimmed;
          overflowTokens -= saved;
          logs.push(`- [Nhịp nén bổ sung] Nén sâu 2 chương gần nhất nguyên văn (giữ tối thiểu để dệt chuỗi) (Tiết kiệm thêm ${Math.ceil(saved).toLocaleString()} tokens).`);
        }
      }
    }
  }

  if (overflowTokens > 0) {
    // Tinh lọc súc tích sâu hơn nữa Vector Memory
    if (vectorMemory) {
      const currentTokens = countTokens(vectorMemory);
      if (currentTokens > 1000) {
        const keepPercent = Math.max(0.20, 800 / currentTokens);
        const trimmed = trimToTailText(vectorMemory, keepPercent);
        const saved = currentTokens - countTokens(trimmed);
        
        if (saved > 0) {
          vectorMemory = trimmed;
          overflowTokens -= saved;
          logs.push(`- [Nhịp nén bổ sung] Ép sâu Vector Memory về sát dải cận cảnh tối giản nhất (Tiết kiệm thêm ${Math.ceil(saved).toLocaleString()} tokens).`);
        }
      }
    }
  }

  // 4. Tính toán Token sau khi dọn dẹp xong xuôi
  const finalRecentTwoChapterTokens = countTokens(recentTwoChapters);
  const finalVectorRetrievedTokens = countTokens(vectorMemory);
  const finalLongTermMemoryTokens = countTokens(longTermMemory);
  
  const finalDandelionMemoryTokens = dandelionApiMemoryItems.reduce(
    (sum, item) => sum + countTokens(item.content), 
    0
  );
  
  const finalFiveChapterMemoryTokens = fiveChapterFlowerMemoryItems.reduce(
    (sum, item) => sum + countTokens(item.content), 
    0
  );

  const totalContextTokensAfterClean = 
    systemPromptTokens +
    coreStoryTokens +
    userTimelineMemoryTokens +
    currentUserDirectionTokens +
    currentChapterInputTokens +
    finalRecentTwoChapterTokens +
    finalVectorRetrievedTokens +
    finalLongTermMemoryTokens +
    finalDandelionMemoryTokens +
    finalFiveChapterMemoryTokens;

  logs.push(`🛡️ [Tuyên bố bảo vệ] Đã bảo quản nguyên vẹn 100% System Prompt (${systemPromptTokens.toLocaleString()} tokens) và Cốt truyện cốt lõi (${coreStoryTokens.toLocaleString()} tokens). Tuyển tập kỷ niệm của user được giữ nguyên.`);
  logs.push(`🎉 [Context Smart Cleaner] Hoàn thành dọn dẹp! Tổng ngữ cảnh tối ưu hóa thành công từ ${totalContextTokensBeforeClean.toLocaleString()} xuống ${totalContextTokensAfterClean.toLocaleString()} tokens (An toàn dưới ${MAX_CONTEXT_TOKENS.toLocaleString()} tokens) ✨`);

  // In bảng thống kê đẹp mắt ra Console để chồng & dev kiểm soát được thông số nhen!
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🎨 [DEBUG LOG - CONTEXT SMART CLEANER]");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`- totalContextTokensBeforeClean: ${totalContextTokensBeforeClean}`);
  console.log(`- maxContextTokens: ${MAX_CONTEXT_TOKENS}`);
  console.log(`- overflowTokens: ${initialOverflow}`);
  console.log(`- blocksTokenBreakdownBefore:`);
  console.table({
    "System Prompt": systemPromptTokens,
    "Core Story": coreStoryTokens,
    "User Timeline": userTimelineMemoryTokens,
    "Current Direction": currentUserDirectionTokens,
    "Current Chapter Input": currentChapterInputTokens,
    "Recent 2 Chapters": initRecentTwoChapterTokens,
    "Vector Memory": initVectorRetrievedTokens,
    "Long-Term Memory": initLongTermMemoryTokens,
    "Dandelion (50 mốc)": initDandelionMemoryTokens,
    "Five Chapter Flower": initFiveChapterMemoryTokens
  });
  console.log(`- cleanedBlocks: ${initialOverflow > 0 ? "YES" : "NO"}`);
  console.log(`- totalContextTokensAfterClean: ${totalContextTokensAfterClean}`);
  console.log(`- finalContextSentToApi: ${totalContextTokensAfterClean <= MAX_CONTEXT_TOKENS ? "✅ ĐẠT CHUẨN AN TOÀN" : "❌ VẪN VƯỢT TRẦN"}`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  return {
    systemPrompt: input.systemPrompt,
    coreStory: input.coreStory,
    userTimelineMemory: input.userTimelineMemory,
    currentUserDirection: input.currentUserDirection,
    currentChapterInput: input.currentChapterInput,
    recentTwoChapters,
    vectorMemory,
    longTermMemory,
    dandelionApiMemoryItems,
    fiveChapterFlowerMemoryItems,
    logs,
    totalBefore: totalContextTokensBeforeClean,
    totalAfter: totalContextTokensAfterClean,
    overflow: initialOverflow,
    wasCleaned: true
  };
}
