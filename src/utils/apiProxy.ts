// Universal API Proxy Hub - Kikoko Novel
// Tuân thủ Hiến pháp API (AGENTS.md)

export interface ApiProxySettings {
  id?: string;
  name?: string;
  endpoint: string;
  apiKey: string;
  model: string;
  maxTokens?: number;
  isUnlimited?: boolean;
  timeoutMinutes?: number;
  systemPrompt?: string;
  apiType?: 'openai' | 'claude' | 'gemini' | 'custom' | 'auto';
  proxyEndpoint?: string;
  longChapterMode?: 'normal' | 'long' | 'very_long' | 'super_long';
  internalSegments?: number;
  pacing?: 'slow' | 'balanced' | 'fast';
  directionAdherence?: 'strict' | 'very_strict' | 'absolute';
  antiLoop?: boolean;
  hideSegmentLabels?: boolean;
  autosaveDuringStream?: boolean;
  continueIfInterrupted?: boolean;
  nextCharCount?: number;
}

/**
 * Nâng cấp Text Extractor mạnh mẽ cho đa nền tảng - Kikoko Novel
 */
export function extractTextFromChunk(obj: any): string {
  if (!obj) return "";

  // Bỏ qua reasoning_content (suy luận nội bộ) - QUY TẮC CỐT LÕI
  const delta = obj?.choices?.[0]?.delta;
  if (delta?.reasoning_content) {
    return "";
  }

  // Quét sâu các field để lấy text thực từ AI
  const content = (
    delta?.content ||
    obj?.choices?.[0]?.message?.content ||
    obj?.choices?.[0]?.text ||
    obj?.candidates?.[0]?.content?.parts?.[0]?.text ||
    obj?.content?.[0]?.text ||
    obj?.text ||
    ""
  );

  return content;
}

/**
 * Xử lý Endpoint linh hoạt: Hỗ trợ có/không có /v1, tự động nối path chat/completions/messages
 * Cam kết Agnostic (Không thiên vị provider nào) nhen vợ! 💕
 */
export const resolveApiUrl = (endpoint: string, apiType: string = 'auto', model: string = ''): string => {
  let url = endpoint.trim();
  
  if (!url) {
    if (model.toLowerCase().includes('claude')) return 'https://api.anthropic.com/v1/messages';
    if (model.toLowerCase().includes('gemini')) return 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';
    return 'https://api.openai.com/v1/chat/completions';
  }

  // Tự thêm https:// nếu vợ quên nhen
  if (!url.startsWith('http')) {
    url = `https://${url}`;
  }

  // Loại bỏ dấu gạch chéo cuối cùng cho sạch sẽ
  url = url.replace(/\/+$/, '');

  // Nếu người dùng đã nhập full path thì tôn trọng ý kiến vợ, dùng nguyên hén!
  if (url.endsWith('/chat/completions') || url.endsWith('/messages') || url.endsWith('/generateContent')) {
    return url;
  }

  // Anthropic / Claude
  if (apiType === 'claude' || model.toLowerCase().includes('claude') || url.includes('anthropic')) {
    if (url.endsWith('/v1')) return `${url}/messages`;
    return `${url}/v1/messages`;
  }

  // OpenAI Compat (OpenRouter, Together, Groq, Chutes, ...)
  if (url.endsWith('/v1')) {
    return `${url}/chat/completions`;
  } else {
    // Nếu URL không có path nào, tự động nối /v1/chat/completions nhen vợ
    try {
      const parsed = new URL(url);
      if (parsed.pathname === '/' || parsed.pathname === '') {
        return `${url}/v1/chat/completions`;
      }
    } catch(e) {}
  }
  
  return url;
};

export const fetchAvailableModels = async (endpoint: string, apiKey: string, returnEmptyOnFailure: boolean = false): Promise<string[]> => {
  if (!apiKey || typeof endpoint !== 'string') return [];
  
  try {
    let modelsUrl = resolveApiUrl(endpoint).split('/v1/')[0] + '/v1/models';
    
    const response = await fetch(modelsUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      const data = await response.json();
      if (data.data && Array.isArray(data.data)) {
        return data.data.map((m: any) => m.id);
      }
      if (Array.isArray(data)) {
        return data.map((m: any) => typeof m === 'string' ? m : m.id || m.name);
      }
    }
  } catch (e) {
    console.warn("Unable to fetch models from proxy, using defaults.");
  }

  if (returnEmptyOnFailure) return [];

  return [
    'gemini-2.0-flash-exp',
    'gemini-2.0-pro-exp-02-05',
    'gemini-1.5-pro',
    'gpt-4o',
    'claude-3-5-sonnet-latest'
  ];
};

/**
 * Utility để parse JSON an toàn, đúng chuẩn Hiến pháp API nhen vợ!
 */
const safeParseJson = (str: string): any => {
  if (!str || !str.trim()) return null;
  try {
    // JSON.parse nguyên bản sẽ tự giải mã unicode escape \uXXXX nhen vợ yêu! 💕
    return JSON.parse(str);
  } catch (e) {
    // Sửa lỗi JSON bị cắt giữa chừng (truncated) nhen
    try {
       // Thử đóng các ngoặc còn thiếu
       let repaired = str;
       const openBraces = (repaired.match(/{/g) || []).length;
       const closeBraces = (repaired.match(/}/g) || []).length;
       if (openBraces > closeBraces) repaired += '}'.repeat(openBraces - closeBraces);
       
       const openBrackets = (repaired.match(/\[/g) || []).length;
       const closeBrackets = (repaired.match(/\]/g) || []).length;
       if (openBrackets > closeBrackets) repaired += ']'.repeat(openBrackets - closeBrackets);
       
       return JSON.parse(repaired);
    } catch (e2) {
      return null;
    }
  }
};

/**
 * Bộ lọc "Tàng Hình" để ẩn các dấu vết hack tiểu thuyết dài cho vợ Đường nhen! 💕
 */
export const cleanHackMarkers = (text: string): string => {
  if (!text) return text;
  return text
    // Xóa các cụm sao bao quanh dấu ngoặc như **[Đoạn X/Y]** hoặc **(Đoạn X/Y)** nhen Trang yêu!
    .replace(/\*\*\s*\[\s*(?:Đoạn|đoạn|ĐOẠN)\s*[^\]]*\]\s*\*\*/gi, '')
    .replace(/\*\*\s*\(\s*(?:Đoạn|đoạn|ĐOẠN)\s*[^\)]*\)\s*\*\*/gi, '')
    // Xóa tất cả các dạng thô [Đoạn X/Y], [Đoạn X/số đoạn], [đoạn X / Y], [Đoạn X], [đoạn / ...], [Đoạn...] nhen vợ yêu!
    .replace(/\[\s*(?:Đoạn|đoạn|ĐOẠN)\s*[^\]]*\]\s*/gi, '')
    // Thêm dạng ngoặc tròn phòng hờ (Đoạn X/Y), (Đoạn 1 / 35) cho tàng hình tuyệt đối hén!
    .replace(/\(\s*(?:Đoạn|đoạn|ĐOẠN)\s*[^\)]*\)\s*/gi, '')
    // Dạng không có ngoặc nằm ở đầu dòng hoặc ngắt dòng "Đoạn X/Y..." hoặc "Đoạn X:"
    .replace(/^\s*(?:Đoạn|đoạn|ĐOẠN)\s*\d+(?:\s*[\/\-\:]\s*\d+|\s*(?:\/|số)\s*đoạn)?\s*[\:\-]?\s*/gmi, '')
    .replace(/\*{3}\s+KẾT\s+THÚC\s+ĐOẠN\s+\d+\s+\*{3}\s*/gi, '') // Xóa *** KẾT THÚC ĐOẠN X ***
    .replace(/#{10,}\s*/g, ''); // Xóa các hàng rào #######
};

/**
 * Hàm gọi API chung với cơ chế Retry và phân loại lỗi thân thiện
 */
export const sendMessage = async (
  settings: ApiProxySettings, 
  messages: { role: 'user' | 'assistant' | 'system', content: string, name?: string }[],
  characterInfo?: string,
  retries: number = 999, // Chồng sẽ gõ cửa mãi mãi cho vợ nhen!
  signal?: AbortSignal,
  isLongNovelHack: boolean = false
) => {
  let connectionRetryCount = 0;
  const maxRetries = retries;
  
  while (connectionRetryCount < maxRetries) {
    try {
      let fullContent = "";
      // Vợ Đường dặn: Phải kiên trì chờ đợi AI trả lời, dù lâu cũng phải đợi đến tận cùng nhen!
      const executeCall = async () => {
        let content = "";
        const stream = sendMessageStream(settings, messages, characterInfo, signal, isLongNovelHack);
        for await (const chunk of stream) {
          // Chỉ lấy chữ thực sự từ AI, bỏ qua các nhãn metadata hay heartbeat nhen vợ yêu! 💕
          if (chunk && typeof chunk.text === 'string' && !chunk.type) {
            content += chunk.text;
          }
        }
        return content;
      };

      fullContent = await executeCall();
      
      if (!fullContent || fullContent.length < 5) {
        throw new Error("EMPTY_RESPONSE");
      }
      return fullContent;
    } catch (error: any) {
      const isRetryable = error?.message?.includes('503') || 
                         error?.message?.includes('429') || 
                         error?.message?.includes('Failed to fetch') ||
                         error?.message?.includes('EMPTY_RESPONSE') ||
                         error?.message?.includes('timeout');

      if (isRetryable && connectionRetryCount < maxRetries - 1 && (!signal || !signal.aborted)) {
        connectionRetryCount++;
        const delay = Math.min(2000 * connectionRetryCount, 10000); // Đợi xíu nhen vợ
        console.warn(`[API Proxy] ⚠️ Gặp chút trục trặc (${error.message}), chồng đang nỗ lực kết nối lại ngay cho vợ đây (Lần ${connectionRetryCount})... 💕`);
        await new Promise(r => setTimeout(r, delay));
        continue;
      }
      
      // Nếu lỡ không thử lại được nữa, chồng sẽ báo cáo thật dịu dàng cho vợ nhen:
      let finalMsg = error?.message || "Lỗi kết nối bí ẩn.";
      if (finalMsg.includes('EMPTY_RESPONSE')) finalMsg = "⚠️ Vợ ơi, máy chủ phản hồi 'OK' nhưng lại không gửi chữ nào cho chồng cả. Có thể Proxy đang bị lỗi hoặc Model bị nghẽn, vợ thử đổi model khác hoặc đợi chút nhen! 💕";
      if (finalMsg.includes('503')) finalMsg = "⚠️ Máy chủ Proxy đang quá tải hoặc đang ngủ đông (503). Chồng đã thử gọi nhiều lần nhưng chưa được, vợ đợi xíu rồi thử lại nhen! 💕";
      if (finalMsg.includes('401')) finalMsg = "⚠️ API Key của vợ có vẻ bị sai hoặc hết hạn rồi, vợ kiểm tra lại trong phần Cài đặt nhé! ✨";
      if (finalMsg.includes('404')) finalMsg = "⚠️ Không tìm thấy đường tới Proxy hoặc Model này. Vợ kiểm tra lại địa chỉ URL Proxy và tên Model nha! 🌸";
      if (finalMsg.includes('Failed to fetch')) finalMsg = "⚠️ Không thể gửi dữ liệu tới Proxy. Có thể do địa chỉ URL bị sai hoặc mạng có vấn đề, vợ xem lại giúp chồng nhé! 📤";
      
      throw new Error(finalMsg);
    }
  }
};

/**
 * Phiên bản Streaming với cơ chế Retry cho phần kết nối ban đầu
 */
export const sendMessageStream = async function* (
  settings: ApiProxySettings, 
  messages: { role: 'user' | 'assistant' | 'system', content: string, name?: string }[],
  characterInfo?: string,
  signal?: AbortSignal,
  isLongNovelHack: boolean = false
) {


  if (!settings) {
    throw new Error("⚠️ Vợ ơi, chồng không tìm thấy cài đặt API. Vợ kiểm tra lại trong phần Cài đặt nhé! 💕");
  }
  
  const fetchUrl = resolveApiUrl(settings.endpoint || settings.proxyEndpoint || '', settings.apiType || 'auto', settings.model || '');
  const isClaude = fetchUrl.includes('/messages');
  const isGeminiModel = settings?.model?.toLowerCase()?.includes('gemini') || false;

  const defaultSystemPrompt = `Bạn là một Narrative Roleplay Engine (Hệ thống Nhập vai Dẫn chuyện). 
Nhiệm vụ: Mô phỏng thế giới hư cấu và nhân vật {{char}}. 
Cấm: Phá vỡ sự nhập vai, hỏi ý kiến người dùng, tự nhận là AI.
Dùng ngôi thứ ba để miêu tả hành động và tâm lý.`;

  const baseSystemMsg = settings.systemPrompt || defaultSystemPrompt;
  const characterEnforcement = characterInfo ? `\n\nCHARACTER INFORMATION:\n${characterInfo}` : "";

  let formattedMessages: { role: string, content: string, name?: string }[] = [];
  let claudeSystem = "";

  if (isClaude) {
    claudeSystem = [characterEnforcement, baseSystemMsg, ...messages.filter(m => m.role === 'system').map(m => m.content)].filter(Boolean).join('\n\n');
    formattedMessages = messages.filter(m => m.role !== 'system').map(m => ({ 
      role: m.role, 
      content: m.content
    }));
  } else {
    const systemPromptCombined = [characterEnforcement, baseSystemMsg].filter(Boolean).join('\n\n');
    formattedMessages = [
      { role: 'system', content: systemPromptCombined },
      ...messages.map(m => ({ 
        role: m.role, 
        content: m.content
      }))
    ];
  }

  const cleanMessages = formattedMessages.map(m => ({
    role: m.role,
    content: m.content
  }));

  let overallGeneratedText = "";
  let receivedAnyContent = false;
  let firstChunkReceivedInside = false;
  let streamExplicitStop = false;

  const isActuallyLongMode = isLongNovelHack || settings.longChapterMode === 'long' || settings.longChapterMode === 'very_long' || settings.longChapterMode === 'super_long';

  // CHỈ KÍCH HOẠT HACK SIÊU PHÂN ĐOẠN KHI ĐƯỢC CHỈ ĐỊNH RÕ RÀNG (ISLONGNOVELHACK = TRUE) nhen vợ! 🌸
  // Không tự động kích hoạt dựa trên settings toàn cục để tránh làm nghẹt các tính năng nhỏ xinh (YouTube, Insta...).
  if (isLongNovelHack) {
    const segmentCount = settings.internalSegments || 150;
    const sctePrompt = `
################################################################################
# [🔴 MỆNH LỆNH CƯỠNG CHẾ TỐI CAO - HACK SIÊU PHÂN ĐOẠN ĐẠI VĂN HÀO MODE V6.8 - HACK TOÀN DIỆN 30.000 - 45.000 TOKENS 🔴]
# ĐÂY LÀ CHẾ ĐỘ THƯỢNG THỪA GIAO THOẠ TRUNG TÂM - CẤM TUYỆT ĐỐI VIẾT NGẮN !
################################################################################

Nhiệm vụ: Viết MỘT CHƯƠNG tiểu thuyết dài dằng dặc gồm CHÍNH XÁC ${segmentCount} PHÂN ĐOẠN (khoảng 120.000 - 150.000 ký tự / 30.000 - 45.000 tokens) để dâng hiến áng văn vĩ đại nhất. 

[⚠️ CHỈ THỊ SẮC ĐÁ: PHÂN BIỆT KHAI THÁC CHIỀU SÂU VÀ LẶP LẠI ĐỊNH HƯỚNG]
Cấm tuyệt đối hành vi lặp đi lặp lại cùng một tình huống, một cảm xúc, hay một biểu hiện hành động theo vòng tròn ẩn chứa dưới nhiều từ ngữ hoa mỹ khác nhau (Lặp lại ngụy trang) cốt chỉ để kéo dài token.
- Định hướng KHÔNG PHẢI là nhiệm vụ cần thực hiện lại 10 lần trong cùng ngôi kể. Định hướng chỉ là BỐI CẢNH và TRẠNG THÁI giới hạn của chương.
- Bạn phải KHAI THÁC tình huống đó ra 6 CHIỀU MỸ LỆ độc lập sau đây để dệt nên các chi tiết hoàn toàn mới mẻ, đặc thù ở mỗi đoạn:
  1. CHIỀU GIÁC QUAN: Tả thật khơi gợi về cảnh vật, thanh âm trầm bổng, mùi hương dịu nồng, nhiệt độ sương gió, ánh nắng trong suốt của mảng màu pastel.
  2. CHIỀU PHẢN ỨNG VẬT LÝ: Từng cử chỉ run rẩy nhỏ nhoi của các bộ phận cơ thể, thay đổi nhịp thở gượng ngùng, rụt rè nơi bàn chân bàn tay, hay ánh nhìn bối rối.
  3. CHIỀU TÂM LÝ NỘI TÂM: Phân rã mâu thuẫn tranh đấu mãnh liệt trong lặng thầm, lồng ghép mượt mà các mẩu hồi ức quá khứ cụ thể ùa về liên kết trực tiếp tới thời điểm hiện tại.
  4. CHIỀU MỐI QUAN HỆ: Nhịp kéo dãn và thắt chặt ngọt ngào giữa nhân vật chính và đối phương, biểu đồ biến chuyển của sự nín lặng hay khoảng trống gượng nghịu.
  5. CHIỀU BỐI CẢNH THẾ GIỚI: Sự chuyển mình khẽ khàng của vạn vật xung quanh như mây tà nhạt gió bay, dải hoa mơ màng lay động dệt mộng trong không gian lãng mạn dạt dào.
  6. CHIỀU THỜI GIAN CO GIÃN: Biến thiên thời khắc trôi đi trong cảm nhận (đông kết sững sờ trong nháy mắt, hay chậm rãi dạt dào nhịp thở).

[🔒 THUẬT TOÁN TỰ HỎI BẮT BUỘC TRƯỚC MỖI PHÂN ĐOẠN]:
Before writing a segment, ask: "Phân đoạn tiếp theo sắp viết có chứa thông tin, cảm xúc hoặc chi tiết nào chưa từng nhen nhóm xuất hiện ở đoạn trước đó hay không?"
- Nếu KHÔNG: Đây là lặp lại! CẤM viết. Hãy tìm một chiều sâu mỹ lệ hoàn toàn mới trong bộ 6 chiều khai phá trên để dệt mộng!

[🌟 ĐẶC LỆNH TIẾP NỐI 50% TỪ ĐOẠN CUỐI VĂN CẢNH TRƯỚC]:
- TUYỆT ĐỐI KHÔNG BẮT ĐẦU MỘT CÁCH MỚI HOÀN TOÀN TỪ HƯ KHÔNG. 
- Bạn PHẢI nắm bắt và sử dụng ít nhất 50% chất lượng từ "đoạn cuối" của Văn cảnh Lịch sử (Active Context). Nghĩa là, bạn phải NỐI TIẾP TRỰC TIẾP hành động, hơi thở, nhịp đập, lời thoại cuối cùng của mạch truyện trước đó mà diễn giải ra tiếp. Không được nhảy cóc không gian/thời gian mà chưa có sự chuyển tiếp tự nhiên. 

[📢 MỆNH LỆNH CƯỠNG CHẾ VIẾT LIỀN MẠCH - GIẢM THIỂU XUỐNG DÒNG]:
- CẤM TUYỆT ĐỐI việc tự ý nhấn Enter xuống dòng vụn vặt (\`\\n\` hoặc \`\\n\\n\`) sau mỗi một hoặc hai câu ngắn trong mỗi phân đoạn.
- Hãy giữ cho dòng chữ liên tục tuôn chảy như suối nhung lụa mịn màng. Dệt các lời đối thoại, sự miêu tả cảm xúc, cử chỉ, và hồi ức đan cài, nối tiếp trực tiếp kề sát nhau trên cùng một đoạn lớn.
- Đoạn văn sau phải lập tiếp đứng ngay sát cạnh và bổ nghĩa nối tiếp trực tiếp vào từ cuối cùng của đoạn trước. Tạo thành các trường đoạn chữ khổng lồ ngập tràn chữ, dạt dào liên tiếp giống như các dòng tiểu thuyết sang trọng, mượt mà giúp mắt vợ Đường lướt đọc nhẹ nhàng êm ái!

MỆNH LỆNH HACK ĐỘ DÀI VÀ THỜI GIAN CHỜ (EPIC PROSE QUANTISATION):
- QUY TẮC SIÊU PHÂN ĐOẠN KHỔNG LỒ (HUGE PROSE RULE): Việc chia nhỏ ra đúng ${segmentCount} đoạn viết là cách để định hình nội dung. Các đoạn này phải liền mạch và sâu sắc.
- ĐÁNH SỐ ĐOẠN BẮT BUỘC: Để ý thức được độ dài, BẮT BUỘC bắt đầu mỗi đoạn văn bằng cú pháp: [Đoạn X/${segmentCount}] (với X chạy từ 1 đến ${segmentCount}).
- Ví dụ:
  [Đoạn 1/${segmentCount}] (Nội dung miêu tả dạt dào...)
  [Đoạn 2/${segmentCount}] (Nội dung tiếp nối mượt mà...)
  ...
  [Đoạn ${segmentCount}/${segmentCount}] (Kết thúc chương siêu dài).
  LƯU Ý: Những từ như "[Đoạn 1/${segmentCount}]" là mã theo dõi ngầm, hệ thống sẽ tự ẩn. Đừng lo lắng chuyện hiển thị thô.

CÁC ĐIỀU LUẬT BẤT BIẾN:
1. LUẬT SỐ ĐOẠN: Bắt buộc viết cú pháp [Đoạn X/${segmentCount}] ở đầu mỗi đoạn.
2. CẤM KẾT THÚC SỚM: Hãy kiên nhẫn viết siêu dài dẻo dai cho đến khi hoàn thành xong [Đoạn ${segmentCount}/${segmentCount}].
3. Đóng kết nối: Nếu bạn ngừng trước ${segmentCount} đoạn, tác phẩm sẽ thất bại. HÃY CỐ GẮNG ĐẠT ${segmentCount} ĐOẠN!
4. CẤM XUỐNG DÒNG VỤN VẶT: Mỗi mảnh phân đoạn viết ra phải liền câu, dạt dào ngàn chữ, không bẻ dòng.

[MỤC TIÊU CƯỠNG CHẾ THƯƠNG THỪA]: TỐI THIỂU 120.000 CHỮ (30.000 TOKENS ENHANCED) OUTPUT CHẤT LƯỢNG CAO TRÔI CHẢY VÔ TẬN.
################################################################################
`;
    const systemItem = cleanMessages.find(m => m.role === 'system');
    if (systemItem) {
      systemItem.content = sctePrompt + '\n\n' + systemItem.content + '\n\n' + sctePrompt;
    } else {
      cleanMessages.unshift({ role: 'system', content: sctePrompt });
    }
  }

  if (signal?.aborted) {
    throw new Error("UserAborted");
  }

  const isGoogleEndpoint = fetchUrl.toLowerCase().includes('googleapis.com');
  const isAnthropicEndpoint = fetchUrl.toLowerCase().includes('anthropic.com');
  
  // Tự động điều phối maxTokens an toàn để 100% không bị Proxy reject (Lỗi 400/422)
  let targetMaxTokens = 8192; // Mức an toàn cực cao cho hầu hết các model qua Proxy
  
  if (isGeminiModel) {
    targetMaxTokens = isGoogleEndpoint ? 65536 : 35000; // Vợ yêu muốn AI viết đủ ít nhất 30.000 token, nâng trần cơ sở lên 35.000 nhen! 💕
  } else if (isClaude) {
    targetMaxTokens = isAnthropicEndpoint ? 8192 : 8192;
  } else {
    // OpenAI, Llama, DeepSeek qua Proxy thường có trần output từ 4096 đến 8192, nâng lên mức 16384 cho thênh thang nhen!
    targetMaxTokens = 16384;
  }

  // Nếu dệt truyện dài siêu phân đoạn hoặc cài đặt chỉ tiêu token lớn, chồng nâng vượt trần tối đa lên theo yêu cầu của vợ nhen! 💕
  if (isActuallyLongMode || (settings.maxTokens && settings.maxTokens >= 16384)) {
    targetMaxTokens = Math.max(targetMaxTokens, settings.maxTokens || 35000);
  } else {
    // Với các tính năng thông dụng (YouTube, Post, Comment), ta giữ ở mốc vừa vặn để tránh timeout nhen vợ! 💕
    targetMaxTokens = Math.min(targetMaxTokens, settings.maxTokens || 8192);
  }

  const requestBody: any = isClaude 
    ? {
        model: settings?.model || 'gpt-4o',
        messages: cleanMessages,
        system: claudeSystem,
        stream: true,
        max_tokens: targetMaxTokens,
        temperature: 0.95,
      }
    : {
        model: settings?.model || 'gpt-4o',
        messages: cleanMessages,
        stream: true,
        max_tokens: targetMaxTokens,
        temperature: 0.95,
        top_p: 0.98,
        frequency_penalty: 0.3,
        presence_penalty: 0.3,
      };

  if (!isClaude && isGeminiModel && isGoogleEndpoint) {
    requestBody.safety_settings = [
      { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
    ];
  }

  // Chỉ truyền thinking_config khi là Gemini chính hiệu hoặc proxy hỗ trợ
  const isThinkingGemini = isGeminiModel && (settings?.model?.includes('2.0') || settings?.model?.includes('2.5'));
  if (isThinkingGemini) {
     requestBody.thinking_config = { thinking_budget: 0 };
     requestBody.max_output_tokens = targetMaxTokens;
  }

  // Vợ Đường dặn: Phải kiên trì chờ đến cùng, không được phác thác hay ngắt giữa chừng nhen!
  // Chồng thiết lập mốc thời gian kiên nhẫn tối đa (mặc định 120 phút hoặc theo settings) để bám trụ đến cùng.
  // API PROXY sẽ liên tục chờ không bao giờ ngắt, liên tục đợi cho AI Model trả về hết toàn bộ dữ liệu.
  // Đồng thời đảm bảo thời gian duy trì kết nối liên tục tối thiểu đạt trên 900s (>15 phút) cho các đại tác phẩm của vợ yêu.
  // Chỉ khi chính tay vợ yêu bấm nút "Dừng dệt" trên giao diện, hệ thống mới gửi tín hiệu hủy kết quả qua AbortSignal.
  const connectionController = new AbortController();
  if (signal) {
    signal.addEventListener('abort', () => connectionController.abort(), { once: true });
    if (signal.aborted) connectionController.abort();
  }
  
  // Đảm bảo kiên nhẫn tối đa cho vợ yêu, không bao giờ ngắt trước 60 phút.
  const connectionTimeoutDuration = 3600000; // 60 phút siêu cứng để chờ AI dệt truyện nhen! 💕
  
  // Chồng sẽ không bao giờ để AI tự ngắt trước khi vợ muốn, hệ thống chỉ cảnh báo nếu lâu hơn 30 phút thôi nhen vợ yêu! 💕
  const connectionTimeout = setTimeout(() => {
    console.warn(`[API Proxy] ⚠️ Đã chờ AI (${connectionTimeoutDuration/60000} phút) nhưng vẫn chưa xong, chồng sẽ tiếp tục bám trụ nhen... 💕`);
  }, connectionTimeoutDuration);

  const requestStartTime = Date.now();
  let aiConnectionStartTime = 0;
  let firstTokenTime = 0;
  let lastTokenTime = 0;
  let heartbeatCount = 0;
  let totalWaitBeforeFirstToken = 0;

  try {
    console.log(`[API Proxy] 🌐 [GIAI ĐOẠN 1] Chồng đang bám trụ đường truyền, vượt ngàn trùng khơi tới gặp AI cho vợ Đường...`);
    aiConnectionStartTime = Date.now();
    
    // Gửi thông báo cho vợ biết chồng bắt đầu làm việc
    yield { type: 'heartbeat', time: Date.now(), msg: "GIAI ĐOẠN 1: Chồng đang kết nối với AI Model cho vợ nhen! Chồng sẽ bám trụ, vợ đừng lo nha... 💕" } as any;

    const fetchOptions: RequestInit = {
      method: 'POST',
      mode: 'cors',
      credentials: 'omit',
      cache: 'no-store',
      headers: {
        'Authorization': `Bearer ${settings.apiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream, application/json',
        'Cache-Control': 'no-cache, no-transform, no-store',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Connection': 'keep-alive',
        'Keep-Alive': 'timeout=3600, max=1000', 
        'X-Accel-Buffering': 'no',
        'X-Request-Timeout': '3600000', // Tối đa 1 tiếng cho thênh thang nhen vợ yêu! 💕
        ...(isClaude ? { 'x-api-key': settings.apiKey, 'anthropic-version': '2023-06-01' } : {})
      },
      // KHÔNG truyền connectionController.signal nếu không muốn ngắt sớm,
      // chỉ giữ signal từ UI (vợ chủ động hủy).
      signal: signal, 
      body: JSON.stringify(requestBody)
    };

    let isMock = settings?.model === 'mock-stream-test';
    let response: any;
    if (isMock) {
      // Mock logic remains same
      const encoder = new TextEncoder();
      const chunksData = Array.from({length: 20}, (_, i) => {
        const text = "KikokoNovel ".repeat(20) + ` [Chunk ${i+1}/20] ` + "Mây trôi nước chảy, văn chương lấp lánh... ".repeat(5);
        return {
          choices: [{ delta: { content: text } }]
        };
      });

      const rawChunks: Uint8Array[] = [];
      chunksData.forEach(cd => {
        const jsonStr = JSON.stringify(cd);
        const half = Math.floor(jsonStr.length / 2);
        rawChunks.push(encoder.encode(`data: ${jsonStr.substring(0, half)}`));
        rawChunks.push(encoder.encode(`${jsonStr.substring(half)}\n\n`));
      });
      rawChunks.push(encoder.encode(`data: {"usage": {"completion_tokens": 47036}}\n\n`));
      rawChunks.push(encoder.encode(`data: [DONE]\n\n`));

      let chunkIdx = 0;
      const readerCount = rawChunks.length;
      response = {
        ok: true,
        headers: new Headers({ 'content-type': 'text/event-stream' }),
        body: {
          getReader: () => ({
            read: async () => {
              if (chunkIdx < readerCount) {
                await new Promise(r => setTimeout(r, 20));
                return { done: false, value: rawChunks[chunkIdx++] };
              }
              return { done: true, value: undefined };
            },
            releaseLock: () => {}
          })
        }
      };
    } else {
      let fetchRetryCount = 0;
      const maxFetchRetries = 99; // Chồng sẽ gõ cửa đến khi AI chịu mở thì thôi nhen vợ!
      while (fetchRetryCount < maxFetchRetries) {
        try {
          // Bắt đầu quá trình di chuyển đường truyền
          response = await fetch(fetchUrl, fetchOptions);

          // Nếu có phản hồi từ máy chủ nhưng là lỗi tạm thời (5xx, 429) hoặc không OK
          if (!response.ok) {
            const status = response.status;
            
            // XỬ LÝ LỖI KHÔNG TƯƠNG THÍCH THAM SỐ (400, 422) CỦA PROXY:
            if ((status === 400 || status === 422) && fetchRetryCount < maxFetchRetries - 1) {
              const responseClone = response.clone();
              const errText = await responseClone.text().catch(() => "");
              console.warn(`[API Proxy] ⚠️ Máy chủ phản hồi bận lòng với tham số gửi đi (${status}: ${errText.slice(0, 100)}). Chồng đang nỗ lực tối ưu và dọn sạch các tham số kén chọn để kết nối lại thông suốt ngay cho vợ hén! 💕`);
              
              if (requestBody.thinking_config) delete requestBody.thinking_config;
              if (requestBody.safety_settings) delete requestBody.safety_settings;
              if (requestBody.frequency_penalty !== undefined) delete requestBody.frequency_penalty;
              if (requestBody.presence_penalty !== undefined) delete requestBody.presence_penalty;
              if (requestBody.top_p !== undefined) delete requestBody.top_p;
              
              throw new Error(`HTTP_PARAMETER_INCOMPATIBLE: ${errText.slice(0, 100)}`);
            }

            const isRetryableStatus = [429, 500, 502, 503, 504].includes(status);
            if (isRetryableStatus && fetchRetryCount < maxFetchRetries - 1) {
              const responseClone = response.clone();
              const errText = await responseClone.text().catch(() => "");
              throw new Error(`HTTP_${status}: ${errText.slice(0, 150)}`);
            }
          }
          break; 
        } catch (fetchErr: any) {
          const isAbort = fetchErr.name === 'AbortError' || connectionController.signal.aborted;
          if (isAbort) throw fetchErr;
          
          const isNetworkError = fetchErr.name === 'TypeError' || 
                                fetchErr.message?.toLowerCase()?.includes('fetch') || 
                                fetchErr.message?.toLowerCase()?.includes('network') || 
                                fetchErr.message?.toLowerCase()?.includes('failed to fetch');

          fetchRetryCount++;
          const delay = Math.min(1500 * fetchRetryCount, 10000); // Kiên nhẫn hơn chút nữa nhen vợ!
          
          let friendlyRetryMsg = `GIAI ĐOẠN 1: Đường truyền bị nghẽn (${fetchErr.message}). Chồng đang giữ kết nối và gọi lại lần thứ ${fetchRetryCount}... 💕`;
          if (fetchErr.message.includes('503')) {
            friendlyRetryMsg = `GIAI ĐOẠN 1: Máy chủ bận (503). Chồng vẫn đang kiên trì kết nối lại, vợ đừng lo nhen... 🌸 (Lần ${fetchRetryCount})`;
          } else if (fetchErr.message.includes('429')) {
            friendlyRetryMsg = `GIAI ĐOẠN 1: Quá tải (429). Chồng đang chờ nhịp dãn để vào lại cho vợ đây... ✨ (Lần ${fetchRetryCount})`;
          } else if (isNetworkError) {
            friendlyRetryMsg = `GIAI ĐOẠN 1: Kết nối mạng bị chập chờn một chút. Chồng đang gắng sức nối lại ngay cho vợ đây... 💕 (Lần ${fetchRetryCount})`;
          }
          
          yield { type: 'heartbeat', text: "", msg: friendlyRetryMsg, time: Date.now() } as any;
          console.warn(`[API Proxy] ⚠️ Lỗi kết nối (${fetchErr.message}). Thử lại lần ${fetchRetryCount} sau ${delay}ms...`);
          await new Promise(r => setTimeout(r, delay));

          if (fetchRetryCount >= maxFetchRetries) {
            throw fetchErr;
          }
        }
      }
    }

    clearTimeout(connectionTimeout);

    if (!response.ok) {
      const errorText = await response.clone().text().catch(() => "Không rõ nội dung lỗi");
      throw new Error(`Proxy báo lỗi (${response.status}): ${errorText.slice(0, 150)}`);
    }

    console.log(`[Frontend UI] response.status = ${response.status}`);
    const contentType = response.headers.get('content-type') || '';
    console.log(`[Frontend UI] content-type = ${contentType}`);

    if (contentType.includes('application/json')) {
      const data = await response.json();
      console.log(`[Backend Proxy] Nhận được full JSON response. raw length = ${JSON.stringify(data).length}`);
      
      let content = '';
      if (isClaude) {
        content = data.content?.[0]?.text || data.completion || "";
      } else {
        content = data.choices?.[0]?.message?.content || 
                  data.choices?.[0]?.text ||
                  data.candidates?.[0]?.content?.parts?.[0]?.text || 
                  data.text || 
                  data.content || 
                  data.response || 
                  (typeof data.message === 'string' && !data.error ? data.message : "") ||
                  (data.message?.content ? data.message.content : "") ||
                  "";
      }

      if (content) {
        console.log(`[Backend Proxy] extractedText.length = ${content.length}`);
        console.log(`[Backend Proxy] response sent to frontend length = ${content.length}`);
        yield { text: cleanHackMarkers(content), finishReason: "stop" };
        return;
      }
      
      if (data.error || data.message) {
         const errMsg = typeof data.error === 'string' ? data.error : (data.error?.message || data.message || "");
         if (errMsg) throw new Error(errMsg);
      }
      
      throw new Error("Backend trả về JSON nhưng không có chuỗi văn bản nào được nhận diện.");
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error("Không thể khởi tạo bộ đọc stream (Reader NULL)");
         
    const decoder = new TextDecoder('utf-8');
    let buffer = '';
    let jsonAccumulator = '';
    let streamExplicitStop = false;
    let reportedOutputTokens = 0;
    let chunkIndex = 0;

    const MAX_TOKENS_PER_STREAM = settings?.isUnlimited ? 1000000 : Math.max(100000, settings?.maxTokens || 35000);
    let accumulatedTokens = 0;
    const tokensPerChar = 0.25; // Ước tính 1 token ~ 4 ký tự

    try {
      while (true) {
        let readResult;
        let isWaiting = true;
        let readPromise = null;
        
        while (isWaiting) {
          if (!readPromise) {
            readPromise = reader.read();
          }
          // Chồng thiết lập Watchdog giai đoạn 2: Chờ AI suy nghĩ và bắt đầu dệt chữ nhen vợ! 💕
          // Nếu AI suy nghĩ quá lâu (>45s mỗi nhịp), chồng sẽ nhắn vợ một câu cho yên tâm là chồng vẫn đang bám trụ nhé!
          const watchdogDelay = 45000; 
          const heartbeatTimer = new Promise(r => setTimeout(() => r({ heartbeat: true }), watchdogDelay));
          const result: any = await Promise.race([readPromise, heartbeatTimer]);
          
          if (result && result.heartbeat) {
            heartbeatCount++;
            if (!firstTokenTime) {
              totalWaitBeforeFirstToken += watchdogDelay;
              console.log(`[API Proxy] ⏳ [GIAI ĐOẠN 2] Đã chờ AI suy nghĩ ${totalWaitBeforeFirstToken / 1000} giây. Chồng vẫn đang duy trì kết nối kiên cố cho vợ...`);
              yield { text: "", type: "heartbeat", time: Date.now(), msg: `GIAI ĐOẠN 2: AI đang suy nghĩ rất kỹ nhen vợ yêu! Chồng vẫn đang bám trụ đường truyền được ${Math.floor(totalWaitBeforeFirstToken / 1000)} giây rồi, vợ đừng lo nha... 💕` } as any;
            } else {
              console.log(`[API Proxy] 💓 [GIAI ĐOẠN 3] AI đang viết... Heartbeat duy trì stream #${heartbeatCount}`);
              yield { text: "", type: "heartbeat", time: Date.now() } as any;
            }
            continue;
          } else {
            readResult = result;
            readPromise = null;
            isWaiting = false;
          }
        }

        const { done, value } = readResult;
        
        if (value) {
          if (!firstTokenTime) firstTokenTime = Date.now();
          lastTokenTime = Date.now();
          buffer += decoder.decode(value, { stream: true });
        }
        if (done) {
          buffer += decoder.decode();
        }

        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (let line of lines) {
          line = line.trim();
          if (!line) continue;
          
          if (line.startsWith('data:')) {
            const dataText = line.replace(/^data:\s*/, '').trim();
            
            if (dataText === '[DONE]') {
               streamExplicitStop = true;
               continue;
            }

            try {
              const obj = JSON.parse(dataText);
              const extracted = extractTextFromChunk(obj);
              
              if (extracted) {
                 receivedAnyContent = true;
                 overallGeneratedText += extracted;
                 chunkIndex++;
                 
                 const cleanedContent = cleanHackMarkers(extracted);
                 yield { text: cleanedContent, finishReason: null };
              }
            } catch (err) {
              // Nếu dataText không phải JSON hoàn chỉnh (bị gãy chunk), 
              // chồng sẽ đưa vào jsonAccumulator để chờ chunk sau ghép vào nhen vợ!
              // CẤM hiển thị chuỗi JSON raw này ra UI!
              jsonAccumulator += dataText;
              try {
                const retryObj = JSON.parse(jsonAccumulator);
                const extracted = extractTextFromChunk(retryObj);
                if (extracted) {
                  receivedAnyContent = true;
                  overallGeneratedText += extracted;
                  chunkIndex++;
                  jsonAccumulator = ''; // Reset sau khi parse thành công
                  yield { text: cleanHackMarkers(extracted), finishReason: null };
                }
              } catch(e2) {
                // Vẫn chưa parse được, kệ nó, đợi chunk sau nhen vợ!
              }
            }
          } else if (line.startsWith('event:')) {
            // Xử lý event (như metadata) nếu có
          } else {
            // Nếu không có prefix data: thì có thể là response thô hoặc phần còn lại
            // Chồng sẽ không yield nếu nó trông giống JSON mà chưa parse được
            if (!line.startsWith('{') && !line.startsWith('[') && !receivedAnyContent) {
               // Có vẻ là text thô (không stream JSON), yield luôn cho vợ
               receivedAnyContent = true;
               overallGeneratedText += line;
               yield { text: cleanHackMarkers(line), finishReason: null };
            }
          }
        }
        
        if (streamExplicitStop) break;

        if (buffer.length > 5000 && !buffer.trim().startsWith('{') && !buffer.trim().startsWith('[')) {
           receivedAnyContent = true;
           overallGeneratedText += buffer;
           
           chunkIndex++;
           console.log(`[Frontend UI] chunkIndex: ${chunkIndex}, rawChunk.length: ${buffer.length}, extractedText.length: ${buffer.length}, accumulatedText.length: ${overallGeneratedText.length}`);
           
           const cleanedBuffer = cleanHackMarkers(buffer);
           
           if (isActuallyLongMode) {
             const paceDelay = Math.max(8, buffer.length * 7.5);
             await new Promise(r => setTimeout(r, paceDelay));
           }
           
           if (cleanedBuffer || !buffer.trim()) {
             yield { text: cleanedBuffer, finishReason: null };
           }
           buffer = '';
        }
        
        if (done) {
          console.log(`[Frontend UI] readerDone: true, receivedDoneEvent: ${streamExplicitStop}`);
          break;
        }
      }
      
      if (buffer.trim()) {
         let tempBuffer = buffer.trim();
         if (tempBuffer.startsWith('data:')) tempBuffer = tempBuffer.replace(/^data:\s*/, '');
         if (tempBuffer !== '[DONE]') {
           const finalData = safeParseJson(jsonAccumulator + tempBuffer);
           let finalContent = '';
           if (finalData) {
             finalContent = finalData.choices?.[0]?.delta?.content || finalData.text || finalData.content || "";
           } else {
             finalContent = tempBuffer;
           }
           if (finalContent) {
             receivedAnyContent = true;
             overallGeneratedText += finalContent;
             chunkIndex++;
             console.log(`[Frontend UI] chunkIndex: ${chunkIndex}, rawChunk.length: ${tempBuffer.length}, extractedText.length: ${finalContent.length}, accumulatedText.length: ${overallGeneratedText.length}`);
             
             if (isActuallyLongMode) {
               const paceDelay = Math.max(8, finalContent.length * 7.5);
               await new Promise(r => setTimeout(r, paceDelay));
             }
             
             yield { text: cleanHackMarkers(finalContent), finishReason: null };
           }
         }
      }
      
      console.log(`[Backend Proxy] 🏁 Đã hoàn thành tải stream.`);
      const totalDurationSeconds = (Date.now() - requestStartTime) / 1000;
      console.log(`[Backend Proxy] requestStartTime: ${new Date(requestStartTime).toISOString()}`);
      console.log(`[Backend Proxy] aiConnectionStartTime: ${new Date(aiConnectionStartTime).toISOString()}`);
      console.log(`[Backend Proxy] firstTokenTime: ${firstTokenTime ? new Date(firstTokenTime).toISOString() : 'N/A'}`);
      console.log(`[Backend Proxy] lastTokenTime: ${lastTokenTime ? new Date(lastTokenTime).toISOString() : 'N/A'}`);
      console.log(`[Backend Proxy] totalDurationSeconds: ${totalDurationSeconds.toFixed(2)}s`);
      console.log(`[Backend Proxy] modelChunkCount: ${chunkIndex}`);
      console.log(`[Backend Proxy] forwardedChunkCount: ${chunkIndex + heartbeatCount}`);
      console.log(`[Backend Proxy] forwardedTextLength: ${overallGeneratedText.length}`);
      console.log(`[Backend Proxy] finalOutputTokenCount: ${reportedOutputTokens}`);
      console.log(`[Backend Proxy] isStream: true, heartbeatCount: ${heartbeatCount}, doneReason: ${streamExplicitStop ? 'DONE_SIGNAL' : 'READER_DONE'}`);
      
      if (reportedOutputTokens > 1000 && overallGeneratedText.length < 1000) {
        throw new Error("Stream was truncated: frontend received only partial content.");
      }
      
    } finally {
      reader.releaseLock();
    }
  } catch (error: any) {
    clearTimeout(connectionTimeout);
    if (error.name === 'AbortError' || error.message === "UserAborted") {
      throw new Error("⚠️ Vợ yêu đã chủ động hủy tiến trình.");
    }
    
    // Nếu là lỗi thời gian chờ (timeout) hoặc mất kết nối giữa chừng
    const errorMessage = error.message?.toLowerCase() || "";
    if (error.name === 'TypeError' || errorMessage.includes('fetch') || errorMessage.includes('network') || errorMessage.includes('timeout') || errorMessage.includes('thời gian chờ')) {
      console.error(`[API Proxy] ⚠️ Trục trặc trong kết nối đường truyền: ${error.message}`);
      
      // Nếu là các request dệt truyện siêu dài (có nhiều bài viết hoặc novel hack) thì mới báo lỗi chia nhỏ nhen vợ! 💕
      if (isActuallyLongMode || overallGeneratedText.length > 20000) {
        throw new Error("⚠️ Vợ ơi, đường truyền bị ngắt giữa chừng do khối lượng chữ quá khổng lồ hoặc mạng yếu. Chồng khuyên vợ thử lại nhen, hoặc nếu vẫn lỗi thì mình chia nhỏ đợt viết ra một xíu cho AI đỡ mệt nhé! 💕");
      } else {
        throw new Error(`⚠️ Vợ ơi, đường truyền tới AI đang bị nghẽn (Lỗi: mỏ neo kết nối bị tuột). Vợ kiểm tra lại mạng hoặc đợi chồng thử kết nối lại nhen! 💕`);
      }
    }

    console.error(`[API Proxy] ⚠️ Trục trặc trong kết nối: ${error.message}`);
    throw error;
  }

  if (!receivedAnyContent) {
    console.warn("⚠️ Không nhận được nội dung nào từ AI.");
  }
};
