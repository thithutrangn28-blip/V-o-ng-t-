import { useCallback, useState } from 'react';
import { getActiveConfig } from '../core/apiHub/configStorage';
import { decryptApiKey } from '../core/apiHub/keyEncryption';
import { sendMessageStream, ApiProxySettings as LegacyApiProxySettings } from '../utils/apiProxy';
import { 
  saveApiFeatureBatch, 
  getRecentHistoryByFeature, 
  getNextBatchNumber, 
  ApiFeatureBatch, 
  ApiFeatureBatchItem,
  saveApiHistoryBatch
} from '../core/apiHub/tiktokDatabase';

export interface CallFeatureOptions {
  featureName: string;
  userRequest: string;
  activeNpc?: any;
  channelId?: string;
  channelName?: string;
  channelContext?: any;
  featureSettings?: any;
  outputSchema?: any;
  imagePool?: string[];
  onChunk?: (text: string) => void;
  onProgress?: (phase: string, progress: number) => void;
  signal?: AbortSignal;
  saveItems?: (parsedData: any) => ApiFeatureBatchItem[]; // Hàm để trích xuất item từ response đã parse
}

export function useUniversalApi() {
  const [isCalling, setIsCalling] = useState(false);
  const [currentPhase, setCurrentPhase] = useState('');

  const callFeature = useCallback(async (options: CallFeatureOptions) => {
    setIsCalling(true);
    const { 
      featureName, 
      userRequest, 
      activeNpc, 
      channelId, 
      channelName, 
      channelContext, 
      featureSettings, 
      outputSchema, 
      imagePool, 
      onChunk, 
      onProgress, 
      signal 
    } = options;

    try {
      // 1. Chuẩn bị Context Window - Kikoko Tiktok
      onProgress?.("Đang lấy cấu hình từ API Hub...", 10);
      const activeConfig = await getActiveConfig();
      if (!activeConfig) {
        throw new Error("⚠️ Vợ ơi, chưa có cấu hình API Hub. Vợ ra ngoài màn hình chính mở API Hub để cấu hình nhen! 💕");
      }

      const plainKey = await decryptApiKey(activeConfig.apiKey);
      onProgress?.("Đang chuẩn bị ký ức cũ cho vợ nè...", 20);

      // Lấy 2 đợt gọi cũ của feature này (nếu có)
      const recentHistory = await getRecentHistoryByFeature(featureName, 2);
      const previousMemory = recentHistory.map(h => ({
        timestamp: h.createdAt,
        userRequest: h.userPrompt,
        summary: h.summary || h.response.substring(0, 500) // Tóm tắt ngắn gọn ký ức nhen vợ!
      }));

      // 2. Build System Prompts
      const appSystemPrompt = `Bạn là AI Model vận hành Kikoko Tiktok - app mạng xã hội mô phỏng TikTok bằng NPC.
Bạn tạo nội dung cho Feed, Comment, Live, NPC Profile, Messages, Cat Room, Community, Story, Album.
Bạn phải đọc toàn bộ Context Window trước khi trả lời. Trả lời đúng outputSchema yêu cầu.
Không trả object thô. Không trả markdown nếu yêu cầu JSON. Không bỏ qua NPC và cốt truyện.
Đặc biệt tuân thủ phong cách trẻ trung, sôi động của TikTok.`;

      const featurePrompts: Record<string, string> = {
        'create_feed_40_posts': 'Nhiệm vụ: BẮT BUỘC TẠO ĐÚNG VÀ ĐỦ 40 bài TikTok bám sát active NPC và cốt truyện. MỖI BÀI PHẢI CỰC KỲ SIÊU DÀI (MỤC TIÊU 5000 TỪ / KÝ TỰ MỖI BÀI), hãy viết thật chậm rãi, chi tiết từng cảm xúc, từng khung cảnh, từng suy nghĩ nội tâm sâu sắc. CẤM VIẾT NGẮN. Hãy để thế giới nội tâm của NPC tràn ngập trong từng dòng chữ. Trả về dưới dạng String ngăn cách bằng ---POST---',
        'create_300_comments': 'Nhiệm vụ: Tạo 300 bình luận bám sát bài viết. Có fan, người tò mò, người trái chiều.',
        'create_live_350_messages': `Nhiệm vụ: Triệu hồi 300 NPC tương tác trong phòng Live. 
YÊU CẦU:
- NPC phải đọc: Chủ đề phòng live (ROOM TOPIC), Mô tả phòng (ROOM DESCRIPTION), Thiết lập phòng (ROOM SETTINGS / LIVE SETTINGS), Hồ sơ host NPC (activeNpc), Câu chuyện cốt truyện (NPC STORY / NPC PROFILE).
- Tạo 300 dòng bình luận tự nhiên, đa dạng cảm xúc liên quan mật thiết và sâu sắc đến chủ đề live hiện tại.
- Bình luận phải lịch sự ngọt ngào hoặc ủng hộ, tò mò hỏi sâu, chia sẻ cảm xúc, hâm mộ, không comment vô nghĩa, không meme nhảm nhí, không lệch đề, không thô lỗ hay bạo lực/toxic.
- 20% tin nhắn là gửi quà nhỏ (Kem dâu, Gấu bông, Tai thỏ, Bông hoa).
- 10% tin nhắn là gửi quà lớn (Mèo con, Kẹp tóc, Ngôi sao, Quả dâu, Dải sao băng).
- FORMAT BẮT BUỘC: Trả về một JSON array gồm 300 đối tượng. KHÔNG TRẢ TEXT THÔ. Mỗi đối tượng có cấu trúc:
{
  "avatar": "một URL avatar ngẫu nhiên dạng chuỗi",
  "name": "Tên NPC",
  "comment": "Nội dung bình luận bám sát chủ đề live",
  "gift": "Món quà nếu có (Kem dâu/Gấu bông/Tai thỏ/Bông hoa/Mèo con/Kẹp tóc/Ngôi sao/Quả dâu/Dải sao băng) hoặc null",
  "giftCount": số lượng (ví dụ 1),
  "timestamp": "Vừa xong",
  "isFan": true hoặc false,
  "relationshipLevel": số từ 1 đến 5
}`,
        'live_300_npc_interactions': `Nhiệm vụ: Triệu hồi 300 NPC tương tác trong phòng Live. 
YÊU CẦU:
- NPC phải đọc: Chủ đề phòng live (ROOM TOPIC), Mô tả phòng (ROOM DESCRIPTION), Thiết lập phòng (ROOM SETTINGS / LIVE SETTINGS), Hồ sơ host NPC (activeNpc), Câu chuyện cốt truyện (NPC STORY / NPC PROFILE).
- Tạo 300 dòng bình luận tự nhiên, đa dạng cảm xúc liên quan mật thiết và sâu sắc đến chủ đề live hiện tại.
- Bình luận phải lịch sự ngọt ngào hoặc ủng hộ, tò mò hỏi sâu, chia sẻ cảm xúc, hâm mộ, không comment vô nghĩa, không meme nhảm nhí, không lệch đề, không thô lỗ hay bạo lực/toxic.
- 20% tin nhắn là gửi quà nhỏ (Kem dâu, Gấu bông, Tai thỏ, Bông hoa).
- 10% tin nhắn là gửi quà lớn (Mèo con, Kẹp tóc, Ngôi sao, Quả dâu, Dải sao băng).
- FORMAT BẮT BUỘC: Trả về một JSON array gồm 300 đối tượng. KHÔNG TRẢ TEXT THÔ. Mỗi đối tượng có cấu trúc:
{
  "avatar": "một URL avatar ngẫu nhiên dạng chuỗi",
  "name": "Tên NPC",
  "comment": "Nội dung bình luận bám sát chủ đề live",
  "gift": "Món quà nếu có (Kem dâu/Gấu bông/Tai thỏ/Bông hoa/Mèo con/Kẹp tóc/Ngôi sao/Quả dâu/Dải sao băng) hoặc null",
  "giftCount": số lượng (ví dụ 1),
  "timestamp": "Vừa xong",
  "isFan": true hoặc false,
  "relationshipLevel": số từ 1 đến 5
}`,
        'cat_room_300_messages': 'Nhiệm vụ: Tạo 300 tin nhắn phòng mèo theo topic. Có các ý kiến đa chiều, hài hước.',
        'npc_profile': 'Nhiệm vụ: Tạo hồ sơ NPC gồm bio, tiểu sử bám sát cốt truyện. Nhớ các lần chỉnh sửa trước.',
        'npc_post': 'Nhiệm vụ: Tạo bài đăng cá nhân cho NPC bám sát phong cách đăng bài.',
        'npc_message': 'Nhiệm vụ: Tạo các tin nhắn chat thân thiết hoặc theo cốt truyện giữa NPC và user.',
        'create_story': 'Nhiệm vụ: Tạo 5-10 nội dung Story ngắn gọn bám sát hoạt động của NPC.',
        'create_album': 'Nhiệm vụ: Tạo mô tả Album ảnh và danh sách 5-10 ảnh theo một chủ đề của NPC.',
        'create_community': 'Nhiệm vụ: Tạo 50-100 bài đăng/thảo luận trong cộng đồng theo chủ đề nhóm.',
      };
 
      const featurePrompt = featurePrompts[featureName] || `Nhiệm vụ: ${featureName}. Thực hiện yêu cầu của người dùng trong bối cảnh Kikoko Tiktok.`;
 
      // 3. Build Request Payload (Context Window đầy đủ như vợ dặn)
      const contextWindow = {
        featureName,
        appName: "Kikoko Tiktok",
        appSystemPrompt: appSystemPrompt,
        featureSystemPrompt: featurePrompt,
        featureSettings: featureSettings || {
          theme: 'Pastel Coquette',
          language: 'Vietnamese',
          commentTone: 'Supportive, curious, emotional, sweet, non-toxic'
        },
        roomSettings: channelContext?.roomSettings || {
          roomName: channelContext?.roomName || "",
          viewerCount: channelContext?.viewerCount || 5000,
          roomTopic: channelContext?.liveTopic || (activeNpc ? activeNpc.story.substring(0, 50) : "")
        },
        liveSettings: {
          platform: "TikTok",
          isLiveChatEnabled: true,
          giftSystemEnabled: true
        },
        activeNpc: activeNpc ? {
          id: activeNpc.id,
          name: activeNpc.name,
          age: activeNpc.age,
          nationality: activeNpc.nationality,
          hobbies: activeNpc.hobbies,
          interests: activeNpc.interests,
          job: activeNpc.job,
          relationshipStatus: activeNpc.relationshipStatus,
          story: activeNpc.story,
          avatar: activeNpc.avatar
        } : null,
        npcProfile: activeNpc || null,
        npcStory: activeNpc ? activeNpc.story : "",
        npcInterests: activeNpc ? activeNpc.interests : "",
        roomTopic: channelContext?.liveTopic || (activeNpc ? activeNpc.story.substring(0, 50) : "Tâm sự"),
        roomDescription: channelContext?.roomDescription || (activeNpc ? `Kênh chính thức của ${activeNpc.name}. Cùng đón xem livestream nhé!` : ""),
        roomRules: "Không thô lỗ, không toxic, không xúc phạm, thân thiện, tôn trọng và yêu thương",
        giftSettings: {
          small: ['Kem dâu', 'Gấu bông', 'Tai thỏ', 'Bông hoa'],
          large: ['Mèo con', 'Kẹp tóc', 'Ngôi sao', 'Quả dâu', 'Dải sao băng']
        },
        commentSettings: {
          maxComments: 300,
          allowedTones: ["ủng hộ", "tò mò", "hỏi thêm", "chia sẻ cảm xúc", "fan hâm mộ", "góp ý nhẹ nhàng"],
          forbiddenTones: ["meme nhảm nhí", "vô nghĩa", "lệch chủ đề", "xúc phạm", "toxic"]
        },
        last2LiveBatches: previousMemory,
        longTermMemory: previousMemory.map(p => p.summary).join("\n"),
        outputFormat: {
          structure: "JSON Array of Objects",
          schema: {
            avatar: "URL avatar ngẫu nhiên",
            name: "Tên NPC bình luận",
            comment: "Nội dung bình luận bám sát chủ đề live",
            gift: "Tên món quà hoặc null",
            giftCount: "Số lượng quà (number)",
            timestamp: "Thời gian",
            isFan: "Boolean (true/false)",
            relationshipLevel: "Cấp độ từ 1 đến 5"
          }
        },
        liveRoom: channelContext || null, 
        previousLiveMemory: previousMemory,
        userRequest,
        imagePool,
        outputSchema,
        appSettings: {
          theme: 'Pastel Coquette',
          language: 'Vietnamese'
        }
      };

      const messages: { role: 'user' | 'assistant' | 'system', content: string }[] = [
        { role: 'system', content: appSystemPrompt },
        { role: 'system', content: featurePrompt },
        { role: 'user', content: JSON.stringify(contextWindow) }
      ];

      const isVeryLongFeature = featureName === 'create_feed_40_posts' || featureName === 'create_live_350_messages';

      const mappedSettings: LegacyApiProxySettings = {
        endpoint: activeConfig.endpoint,
        apiType: 'auto',
        model: activeConfig.selectedModel,
        apiKey: plainKey,
        maxTokens: isVeryLongFeature ? Math.max(activeConfig.generationConfig?.maxOutputTokens || 0, 100000) : (activeConfig.generationConfig?.maxOutputTokens || 35000),
        isUnlimited: true,
      };

      onProgress?.("Đang kết nối API Proxy và AI Model...", 40);
      
      let fullResponse = "";
      const stream = sendMessageStream(
        mappedSettings,
        messages,
        undefined,
        signal,
        isVeryLongFeature
      );

      onProgress?.("AI đang bắt đầu dệt lụa cho vợ đây...", 60);

      for await (const chunk of stream) {
        if (chunk && chunk.text) {
          fullResponse += chunk.text;
          onChunk?.(chunk.text);
        }
      }

      onProgress?.("Hoàn tất! Đang lưu lại đợt gọi API này nhen...", 90);

      // 4. Lưu lịch sử Đợt gọi API (Batch) & Feature Batch Library
      const batchId = `batch_${featureName}_${Date.now()}`;
      const batchNum = await getNextBatchNumber(featureName);
      
      const featureBatch: ApiFeatureBatch = {
        id: batchId,
        featureName,
        batchNumber: batchNum,
        npcId: activeNpc?.id,
        npcName: activeNpc?.name || 'NPC',
        model: activeConfig.selectedModel,
        prompt: userRequest,
        totalTokens: Math.floor(fullResponse.length / 4),
        itemCount: 0, 
        summary: fullResponse.substring(0, 1000), 
        isPinned: false,
        createdAt: Date.now(),
      };

      let items: ApiFeatureBatchItem[] = [];
      if (options.saveItems) {
        try {
          // Thử parse data trước khi lưu item
          let parsed = null;
          try {
            parsed = JSON.parse(fullResponse.replace(/```json|```/g, '').trim());
          } catch (e) {
             // Fallback nếu không phải JSON
          }
          items = options.saveItems(parsed || fullResponse);
          featureBatch.itemCount = items.length;
          // Gán id và batchId cho từng item
          items = items.map((item, idx) => {
            const hasId = item.id && typeof item.id === 'string' && item.id.trim() !== '';
            return {
              ...item,
              id: hasId ? item.id : `item_${featureName}_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 9)}`,
              batchId
            };
          });
        } catch (itemErr) {
          console.error("Lỗi khi trích xuất items cho batch:", itemErr);
        }
      }

      await saveApiFeatureBatch(featureBatch, items);

      // Lưu History truyền thống
      await saveApiHistoryBatch({
        id: batchId,
        featureName,
        activeNpc,
        channelId,
        channelName,
        createdAt: Date.now(),
        userPrompt: userRequest,
        systemPrompt: appSystemPrompt + "\n" + featurePrompt,
        contextWindow: contextWindow,
        response: fullResponse,
        tokenCount: Math.floor(fullResponse.length / 4),
        model: activeConfig.selectedModel,
        endpoint: activeConfig.endpoint,
        isPinned: 0
      });

      onProgress?.(`Đã xong! Lưu thành công Đợt ${featureBatch.batchNumber} 💕`, 100);
      setIsCalling(false);
      return fullResponse;

    } catch (error: any) {
      setIsCalling(false);
      console.error("Universal API Error:", error);
      throw error;
    }
  }, []);

  // Giữ lại streamCall cho các tính năng cũ đang dùng
  const streamCall = useCallback(async function* (
    messages: { role: 'user' | 'assistant' | 'system', content: string, name?: string }[],
    options?: {
      signal?: AbortSignal;
      maxTokens?: number;
      systemPrompt?: string;
      isUnlimited?: boolean;
      characterInfo?: string;
      isLongNovelHack?: boolean;
    }
  ) {
    const activeConfig = await getActiveConfig();
    if (!activeConfig) throw new Error("Chưa có cấu hình API Hub.");
    const plainKey = await decryptApiKey(activeConfig.apiKey);

    const mappedSettings: LegacyApiProxySettings = {
      endpoint: activeConfig.endpoint,
      apiType: 'auto',
      model: activeConfig.selectedModel,
      apiKey: plainKey,
      systemPrompt: options?.systemPrompt || '',
      maxTokens: options?.maxTokens || activeConfig.generationConfig?.maxOutputTokens || 16000,
      isUnlimited: options?.isUnlimited ?? true,
    };

    const stream = sendMessageStream(
      mappedSettings,
      messages,
      options?.characterInfo,
      options?.signal,
      options?.isLongNovelHack ?? false
    );

    for await (const chunk of stream) {
      yield chunk;
    }
  }, []);

  return {
    streamCall,
    callFeature,
    isCalling,
    currentPhase
  };
}
