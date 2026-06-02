import express from "express";
import cors from "cors";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs";
import { GoogleGenerativeAI } from "@google/generative-ai";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  const tasks = new Map<string, { status: 'pending' | 'completed' | 'failed', result?: any, error?: string }>();

  app.post("/api/tasks/submit", async (req, res) => {
    const { taskId, prompt, apiKey, model, endpoint, type } = req.body;
    
    if (!taskId) return res.status(400).json({ error: "taskId is required" });
    
    tasks.set(taskId, { status: 'pending' });
    res.json({ status: 'pending', taskId });

    // Run in background
    (async () => {
      try {
        const finalApiKey = apiKey || process.env.GEMINI_API_KEY;
        if (!finalApiKey) throw new Error("API key missing");

        let apiUrl = endpoint.trim();
        if (!apiUrl.startsWith('http')) apiUrl = 'https://' + apiUrl;
        if (apiUrl.endsWith('/')) apiUrl = apiUrl.slice(0, -1);
        
        const getCompletionUrl = (base: string) => {
          if (base.includes('openai.com')) return `${base}/chat/completions`;
          if (base.includes('anthropic.com')) return `${base}/messages`;
          if (base.includes('googleapis.com')) return `${base}/models/${model}:generateContent`;
          return `${base}/chat/completions`;
        };

        const completionUrl = getCompletionUrl(apiUrl);

        // Retry logic for transient errors (503, 429, etc.)
        const maxRetries = 3;
        let lastError = null;
        let text = null;

        for (let attempt = 0; attempt < maxRetries; attempt++) {
          try {
            const response = await fetch(completionUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${finalApiKey}`
              },
              body: JSON.stringify({
                model: model,
                messages: [{ role: 'user', content: prompt }],
                max_tokens: 16384,
                temperature: 0.8
              })
            });

            if (!response.ok) {
              // If it's a transient error, retry
              if ([503, 504, 429, 500].includes(response.status) && attempt < maxRetries - 1) {
                const delay = Math.pow(2, attempt) * 2000; // 2s, 4s, 8s
                console.log(`Task ${taskId} attempt ${attempt + 1} failed with ${response.status}. Retrying in ${delay}ms...`);
                await new Promise(r => setTimeout(r, delay));
                continue;
              }
              throw new Error(`API Error: ${response.status}`);
            }

            const data = await response.json();
            text = data.choices?.[0]?.message?.content || data.candidates?.[0]?.content?.parts?.[0]?.text;
            if (!text) throw new Error("No content generated");
            break; // Success!
          } catch (err: any) {
            lastError = err;
            if (attempt < maxRetries - 1) {
              const delay = Math.pow(2, attempt) * 2000;
              await new Promise(r => setTimeout(r, delay));
            } else {
              throw err;
            }
          }
        }

        tasks.set(taskId, { status: 'completed', result: text });
      } catch (error: any) {
        console.error(`Task ${taskId} failed:`, error);
        tasks.set(taskId, { status: 'failed', error: error.message });
      }
    })();
  });

  app.get("/api/tasks/status/:taskId", (req, res) => {
    const { taskId } = req.params;
    const task = tasks.get(taskId);
    if (!task) return res.status(404).json({ error: "Task not found" });
    res.json(task);
  });

  app.post("/api/generate-direct", async (req, res) => {
    const { prompt, apiKey, model, endpoint } = req.body;
    const finalApiKey = apiKey || process.env.GEMINI_API_KEY;
    if (!finalApiKey) {
      console.error("[Backend Proxy] Lỗi: Thiếu API Key cho generate-direct");
      return res.status(400).json({ error: "API key is required." });
    }

    console.log(`[Backend Proxy] 📥 Nhận request generate-direct. Model: ${model || "default"} | Endpoint: ${endpoint || "default"}`);

    const maxRetries = 2;
    let lastError = null;

    for (let i = 0; i <= maxRetries; i++) {
       try {
        let apiUrl = endpoint.trim();
        if (!apiUrl.startsWith('http')) apiUrl = 'https://' + apiUrl;
        if (apiUrl.endsWith('/')) apiUrl = apiUrl.slice(0, -1);
        
        const getCompletionUrl = (base: string) => {
          if (base.includes('openai.com')) return `${base}/chat/completions`;
          if (base.includes('anthropic.com')) return `${base}/messages`;
          if (base.includes('googleapis.com')) return `${base}/models/${model}:generateContent`;
          return `${base}/chat/completions`;
        };

        const completionUrl = getCompletionUrl(apiUrl);
        console.log(`[Backend Proxy] 🔄 Đang gọi AI Model qua url: ${completionUrl} (Lần thử ${i + 1}/${maxRetries + 1})`);

        const response = await fetch(completionUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${finalApiKey}`
          },
          body: JSON.stringify({
            model: model,
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 16384,
            temperature: 0.7
          })
        });

        if (!response.ok) {
          if (response.status === 503 || response.status === 429 || response.status === 504) {
             throw new Error(`API Error: ${response.status}`);
          }
          const errorData = await response.json().catch(() => ({}));
          throw new Error(`API Error: ${response.status} - ${JSON.stringify(errorData)}`);
        }

        const data = await response.json();
        const text = data.choices?.[0]?.message?.content || 
                     data.candidates?.[0]?.content?.parts?.[0]?.text || 
                     data.text || 
                     data.content || 
                     "";

        if (!text) {
          console.warn("[Backend Proxy] ⚠️ Warning: AI trả về rỗng hoặc không đúng định dạng!");
          throw new Error("No content generated");
        }

        console.log(`[Backend Proxy] 🎉 Thành công! Độ dài chuỗi văn bản hoàn chỉnh trả về: ${text.length} ký tự`);
        return res.status(200).json({ result: text, content: text, tokenCount: Math.round(text.length / 4.0), done: true });
      } catch (error: any) {
        lastError = error;
        console.error(`[Backend Proxy] Attempt ${i + 1} failed:`, error.message);
        if (i < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1))); 
        }
      }
    }

    res.status(500).json({ error: lastError?.message || "Generation failed after retries" });
  });

  app.post("/api/generate-content", async (req, res) => {
    const { prompt, systemInstruction, apiKey, model, endpoint } = req.body;
    
    console.log(`[Backend Proxy] 📥 Nhận request generate-content stream. Model: ${model || "gemini-1.5-flash"}`);
    console.log("[Backend Proxy] API Key present:", !!apiKey);
    
    const finalApiKey = apiKey || process.env.GEMINI_API_KEY;
    
    if (!finalApiKey) {
      console.error("[Backend Proxy] Lỗi: Thiếu API Key cho generate-content");
      return res.status(400).json({ error: "API key is required." });
    }

    try {
      console.log("[Backend Proxy] Đang khởi tạo GoogleGenerativeAI...");
      const genAI = new GoogleGenerativeAI(finalApiKey);
      const modelInstance = genAI.getGenerativeModel({ 
        model: model || "gemini-1.5-flash",
        systemInstruction: systemInstruction
      });
      
      console.log("[Backend Proxy] Đang gọi generateContentStream từ AI Model...");
      const result = await modelInstance.generateContentStream({
        contents: prompt,
        generationConfig: {
          maxOutputTokens: req.body.maxTokens || 30000,
        },
      });

      console.log("[Backend Proxy] 🌐 Kết nối thành công! Bắt đầu tạo luồng trả về (Stream) cho client...");
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no');

      let chunkCount = 0;
      let totalLength = 0;

      for await (const chunk of result.stream) {
        const textChunk = chunk.text();
        chunkCount++;
        totalLength += textChunk.length;
        console.log(`[Backend Proxy] 📤 Gửi chunk #${chunkCount} về client ("${textChunk.slice(0, 25).replace(/\n/g, ' ')}..."), độ dài: ${textChunk.length} | Tích lũy: ${totalLength}`);
        res.write(`data: ${JSON.stringify({ text: textChunk, content: textChunk })}\n\n`);
      }
      
      console.log(`[Backend Proxy] 🏁 Stream hoàn tất! Tổng cộng gửi ${chunkCount} chunks, tích lũy ${totalLength} ký tự.`);
      res.write('data: [DONE]\n\n');
      res.end();
    } catch (error: any) {
      console.error("[Backend Proxy] ❌ Lỗi xảy ra trong quá trình stream:", error);
      const errorMessage = error.message || "Failed to generate content";
      res.write(`data: ${JSON.stringify({ error: errorMessage })}\n\n`);
      res.end();
    }
  });

  // ==========================================================
  // VECTOR MEMORY API ENDPOINTS - KÝ ỨC VECTOR KIKOKO
  // ==========================================================
  const DATA_DIR = path.join(process.cwd(), '.data');
  const DATA_FILE = path.join(DATA_DIR, 'vector_memories.json');

  // Đảm bảo thư mục và tệp tin lưu trữ dữ liệu tồn tại
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify([]), 'utf8');
  }

  // Tiện ích đọc dữ liệu vector memories
  async function readMemories(): Promise<any[]> {
    try {
      const data = await fs.promises.readFile(DATA_FILE, 'utf8');
      return JSON.parse(data);
    } catch {
      return [];
    }
  }

  // Tiện ích ghi dữ liệu vector memories
  async function writeMemories(memories: any[]): Promise<void> {
    await fs.promises.writeFile(DATA_FILE, JSON.stringify(memories, null, 2), 'utf8');
  }

  const SETTINGS_FILE = path.join(DATA_DIR, 'vector_settings.json');

  // Tiện ích đọc cài đặt cấu hình dệt ký ức
  async function readSettings(): Promise<Record<string, any>> {
    try {
      if (!fs.existsSync(SETTINGS_FILE)) {
        return {};
      }
      const data = await fs.promises.readFile(SETTINGS_FILE, 'utf8');
      return JSON.parse(data);
    } catch {
      return {};
    }
  }

  // Tiện ích ghi cài đặt cấu hình dệt ký ức
  async function writeSettings(data: Record<string, any>): Promise<void> {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      await fs.promises.writeFile(SETTINGS_FILE, JSON.stringify(data, null, 2), 'utf8');
    } catch (err) {
      console.error("[Backend Settings] Thất bại khi ghi cấu hình:", err);
    }
  }

  // Tiện ích mã hóa API Key để lưu trữ an toàn phía backend
  function encryptKey(text: string): string {
    if (!text) return '';
    return Buffer.from(text).toString('base64');
  }

  // Tiện ích giải mã API Key phía backend
  function decryptKey(text: string): string {
    if (!text) return '';
    try {
      return Buffer.from(text, 'base64').toString('utf8');
    } catch {
      return text;
    }
  }

  // Tự động khôi phục chìa dệt bị lỗi/hết quota quá 5 phút hoặc sang ngày hôm sau để không làm mất khóa của vợ yêu
  function healEmbeddingKeys(keys: any[]): { healedKeys: any[]; changed: boolean } {
    if (!Array.isArray(keys)) return { healedKeys: [], changed: false };
    let changed = false;
    const now = Date.now();
    const healedKeys = keys.map((key: any) => {
      if (key.status === 'quota_exceeded' || key.status === 'error') {
        const lastUsedTime = key.lastUsed ? new Date(key.lastUsed).getTime() : 0;
        const timeDiff = now - lastUsedTime;
        const lastUsedDateStr = key.lastUsed ? key.lastUsed.slice(0, 10) : "";
        const todayDateStr = new Date().toISOString().slice(0, 10);
        
        const isDifferentDay = lastUsedDateStr && lastUsedDateStr !== todayDateStr;
        const isOlderThan5Min = lastUsedTime === 0 || timeDiff > 5 * 60 * 1000;

        if (isDifferentDay || isOlderThan5Min) {
          changed = true;
          return {
            ...key,
            status: 'ready',
            errorCount: 0
          };
        }
      }
      return key;
    });
    return { healedKeys, changed };
  }

  // API 1.1: Trả về cấu hình dệt Vector của câu chuyện (kèm danh sách Key đã được che)
  app.get("/api/vector-settings/:storyId", async (req, res) => {
    try {
      const { storyId } = req.params;
      const allSettings = await readSettings();
      const settings = allSettings[storyId] || {
        isEnabled: true,
        autoVectorizeMode: "full_only",
        chunkSize: 1200,
        overlapSize: 150,
        maxContextTokens: 15000,
        maxChunks: 15,
        minSimilarity: 0.65,
        limitResults: 15,
        recentFirst: false,
        importanceFirst: true,
        mainCharFirst: false,
        strongEmotionFirst: false,
        deduplicate: true,
        skipShortChunks: true,
        skipEmptyChunks: true,
        embeddingKeys: []
      };

      // Đồng bộ Key nhúng Vector toàn cục (Global) để vợ yêu không bao giờ bị mất chìa khi sang truyện khác
      const rawKeys = allSettings["global_vector_keys"] || settings.embeddingKeys || [];
      const { healedKeys, changed } = healEmbeddingKeys(rawKeys);
      
      settings.embeddingKeys = healedKeys;
      
      if (changed) {
        allSettings["global_vector_keys"] = healedKeys;
        allSettings[storyId] = {
          ...settings,
          embeddingKeys: healedKeys
        };
        await writeSettings(allSettings);
      }

      // Đếm lần dệt cuối cùng của truyện
      const memories = await readMemories();
      const storyMemories = memories.filter(m => m.storyId === storyId);
      let lastVectorized = "";
      if (storyMemories.length > 0) {
        const timestamps = storyMemories.map(m => m.createdAt).filter(Boolean);
        if (timestamps.length > 0) {
          lastVectorized = timestamps.sort().reverse()[0];
        }
      }

      // Che giấu API key trước khi gửi về Client
      const maskedKeys = (settings.embeddingKeys || []).map((key: any) => {
        const rawKey = decryptKey(key.apiKey);
        let masked = "";
        if (rawKey) {
          masked = rawKey.length > 8 ? "****" + rawKey.slice(-4) : "****";
        }
        return {
          ...key,
          apiKey: masked
        };
      });

      res.json({
        ...settings,
        lastVectorized,
        embeddingKeys: maskedKeys
      });
    } catch (error: any) {
      console.error("[Backend Settings] Lỗi khi đọc cài đặt dệt:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // API 1.2: Cập nhật cấu hình dệt Vector của câu chuyện (giữ bảo mật nâng cao cho keys)
  app.post("/api/vector-settings/:storyId", async (req, res) => {
    try {
      const { storyId } = req.params;
      const newSettings = req.body;
      const allSettings = await readSettings();
      const oldSettings = allSettings[storyId] || {};

      if (newSettings.embeddingKeys && newSettings.isExplicitKeyUpdate === true) {
        const oldGlobalKeys = allSettings["global_vector_keys"] || oldSettings.embeddingKeys || [];
        newSettings.embeddingKeys = newSettings.embeddingKeys.map((key: any) => {
          const oldKey = oldGlobalKeys.find((k: any) => k.id === key.id);
          
          let encryptedApiKey = "";
          if (key.apiKey && key.apiKey.includes('*')) {
            // Giữ lại API key đã mã hóa cũ do người dùng không sửa đổi (hiển thị che)
            encryptedApiKey = oldKey ? oldKey.apiKey : "";
          } else {
            // Mã hóa API key mới hoàn chỉnh vừa nhập
            encryptedApiKey = encryptKey(key.apiKey);
          }

          return {
            ...key,
            apiKey: encryptedApiKey
          };
        });
        
        // Cập nhật Key dệt Vector vào trạng thái Global để chia sẻ cho mọi truyện
        allSettings["global_vector_keys"] = newSettings.embeddingKeys;
      } else {
        // Nếu không phải là cập nhật key từ giao diện quản trị key một cách tường minh,
        // chúng ta TUYỆT ĐỐI không cho phép ghi đè trống rỗng hay làm hỏng danh sách khóa dệt sương của vợ yêu
        delete newSettings.embeddingKeys;
      }

      allSettings[storyId] = {
        ...oldSettings,
        ...newSettings
      };

      await writeSettings(allSettings);
      res.json({ success: true, message: "Lưu cài đặt cấu hình dệt Vector rực rỡ thành công nhen vợ yêu! 💕" });
    } catch (error: any) {
      console.error("[Backend Settings] Lỗi khi lưu cài đặt dệt:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Định nghĩa hàm gọi Google v1beta Native Embedding API chính gốc mượt mà cho vợ yêu
  async function fetchGoogleNativeEmbedding(
    text: string,
    apiKey: string,
    baseUrl: string,
    model: string
  ): Promise<{ success: boolean; vector?: number[]; error?: string; status?: number }> {
    let finalUrl = (baseUrl || "https://generativelanguage.googleapis.com/v1beta").trim();
    if (!finalUrl.startsWith('http')) {
      finalUrl = 'https://' + finalUrl;
    }
    if (finalUrl.endsWith('/')) {
      finalUrl = finalUrl.slice(0, -1);
    }
    
    // Đường dẫn chuẩn: {BASE_URL}/models/{MODEL}:embedContent
    const url = `${finalUrl}/models/${model}:embedContent`;
    
    // Đảm bảo API Key chỉ chứa ký tự ASCII để không gây lỗi ByteString (65533)
    const safeKey = apiKey.replace(/[^\x00-\x7F]/g, '');
    
    console.log(`[Google Native Embed] Đang dệt mảng số qua: ${url} | Model: ${model}`);

    try {
      const response = await fetch(url + `?key=${safeKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: `models/${model}`,
          content: {
            parts: [{ text }]
          }
        })
      });

      if (!response.ok) {
        const status = response.status;
        let errText = await response.text();
        let errMsg = errText;
        let isQuota = status === 429;

        try {
          const errJson = JSON.parse(errText);
          errMsg = errJson.error?.message || errText;
          if (errJson.error?.status === 'RESOURCE_EXHAUSTED' || errMsg.includes('RESOURCE_EXHAUSTED')) {
            isQuota = true;
          }
        } catch {}

        let friendlyError = `Google Native Error (${status}): ${errMsg}`;
        if (status === 404) {
          friendlyError = "Sai endpoint hoặc sai model Google Native API.";
        } else if (status === 400) {
          friendlyError = "Request body sai hoặc model không tương thích.";
        } else if (status === 401 || status === 403) {
          friendlyError = "Google API key sai hoặc không có quyền.";
        } else if (isQuota) {
          friendlyError = "RESOURCE_EXHAUSTED: Key hết quota, tự chuyển sang key tiếp theo nếu có.";
        }

        return { success: false, error: friendlyError, status };
      }

      const resData = await response.json();
      const values = resData.embedding?.values;
      if (!Array.isArray(values) || values.length === 0) {
        return { success: false, error: "Google không trả về embedding.values hợp lệ." };
      }

      return { success: true, vector: values };
    } catch (error: any) {
      console.error("[Google Native Embed] Lỗi kết nối:", error);
      return { success: false, error: `Lỗi kết nối mạng: ${error.message}` };
    }
  }

  // Hàm sinh Vector nhúng có khả năng tự động đảo Key nếu gặp lỗi Quota/Rate Limit cho vợ yêu
  async function getEmbeddingWithFailover(
    storyId: string,
    text: string
  ): Promise<{ success: boolean; vector?: number[]; error?: string }> {
    const allSettings = await readSettings();
    const settings = allSettings[storyId] || {};
    const rawKeys = allSettings["global_vector_keys"] || settings.embeddingKeys || [];
    
    // Tự động khôi phục chìa dệt bị lỗi/hết quota trước khi bắt đầu dệt
    const { healedKeys, changed } = healEmbeddingKeys(rawKeys);
    let embeddingKeys = healedKeys;
    
    if (changed) {
      allSettings["global_vector_keys"] = healedKeys;
      settings.embeddingKeys = healedKeys;
      await writeSettings(allSettings);
    }

    if (embeddingKeys.length === 0) {
      // Fallback khi rỗng danh sách cấu hình key riêng biệt
      const fallbackApiKey = process.env.EMBEDDING_API_KEY || process.env.GEMINI_API_KEY;
      if (!fallbackApiKey) {
        return { success: false, error: "Hộp chìa dệt Vector của vợ trống rỗng và chưa cấu hình Environment Key dự phòng nào!" };
      }
      const fallbackModel = process.env.EMBEDDING_MODEL || "gemini-embedding-001";
      const fallbackEndpoint = process.env.EMBEDDING_BASE_URL || "https://generativelanguage.googleapis.com/v1beta";
      return await fetchGoogleNativeEmbedding(text, fallbackApiKey, fallbackEndpoint, fallbackModel);
    }

    // Lọc các key đang hoạt động (không bị inactive)
    const activeKeys = embeddingKeys.filter((k: any) => k.status !== 'inactive');
    if (activeKeys.length === 0) {
      return { success: false, error: "Tất cả chìa dệt Vector của vợ yêu đã bị tạm tắt (inactive) mất rồi!" };
    }

    // Ưu tiên key 'using' trước, rồi đến 'ready', các key bị dính quota_exceeded/error xếp sau cùng
    const sortedKeys = [...activeKeys].sort((a: any, b: any) => {
      if (a.status === 'using' && b.status !== 'using') return -1;
      if (b.status === 'using' && a.status !== 'using') return 1;
      if (a.status === 'ready' && b.status !== 'ready') return -1;
      if (b.status === 'ready' && a.status !== 'ready') return 1;
      return 0;
    });

    let lastError = "";

    for (const key of sortedKeys) {
      const decrypted = decryptKey(key.apiKey);
      const url = key.endpoint || "https://generativelanguage.googleapis.com/v1beta";
      const model = key.model || "gemini-embedding-001";

      const maxRetries = 2; // Tối đa 2 lần thử lại cho cùng 1 chunk trên cùng 1 key
      let attempt = 0;
      let result: any = null;

      while (attempt <= maxRetries) {
        if (attempt > 0) {
          const delay = attempt === 1 ? 10000 : 30000; // lần 1: 10s, lần 2: 30s
          console.log(`[Failover Backoff] Chờ ${delay}ms trước khi thử lại lần ${attempt} cho key: ${key.name}`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }

        console.log(`[Failover Try] Đang dệt nhúng bằng key [${key.name}], model [${model}], lần thử #${attempt + 1}...`);
        result = await fetchGoogleNativeEmbedding(text, decrypted, url, model);

        if (result.success) {
          // Khắc phục lỗi đè mất key người dùng khi save trùng lúc API đợi phản hồi: Đọc config mới nhất trước khi ghi
          const freshSettings = await readSettings();
          const freshStorySettings = freshSettings[storyId] || {};
          const freshKeys = freshSettings["global_vector_keys"] || freshStorySettings.embeddingKeys || [];

          // Thành công! Đánh dấu status key này thành 'using', các key 'using' khác về 'ready'
          for (const freshKey of freshKeys) {
            if (freshKey.id === key.id) {
              freshKey.status = 'using';
              freshKey.lastUsed = new Date().toISOString();
            } else if (freshKey.status === 'using') {
              freshKey.status = 'ready';
            }
          }

          freshStorySettings.embeddingKeys = freshKeys;
          freshSettings[storyId] = freshStorySettings;
          freshSettings["global_vector_keys"] = freshKeys;
          await writeSettings(freshSettings);

          return { success: true, vector: result.vector };
        }

        // Kiểm tra lỗi có phải do Quota / Rate limit không
        const isQuotaError = result.status === 429 || 
                             (result.error && (
                               result.error.includes("RESOURCE_EXHAUSTED") || 
                               result.error.toLowerCase().includes("quota") || 
                               result.error.toLowerCase().includes("rate limit")
                             ));

        if (isQuotaError) {
          console.warn(`[Failover Alert] Chìa dệt [${key.name}] đã hết quota hoặc chạm rate limit! Tự chuyển key khác.`);
          
          const freshSettings = await readSettings();
          const freshStorySettings = freshSettings[storyId] || {};
          const freshKeys = freshSettings["global_vector_keys"] || freshStorySettings.embeddingKeys || [];
          const targetFreshKey = freshKeys.find((k: any) => k.id === key.id);
          
          if (targetFreshKey) {
            targetFreshKey.status = 'quota_exceeded';
            targetFreshKey.lastUsed = new Date().toISOString();
            targetFreshKey.errorCount = (targetFreshKey.errorCount || 0) + 1;
          }

          freshStorySettings.embeddingKeys = freshKeys;
          freshSettings[storyId] = freshStorySettings;
          freshSettings["global_vector_keys"] = freshKeys;
          await writeSettings(freshSettings);
          
          // Chuyển sang key tiếp theo ngay lập tức, không retry tiếp trên key hết quota này
          break;
        } else {
          // Lỗi thông thường khác, tăng attempt để thử lại hoặc nếu hết lượt thì chuyển key
          attempt++;
          if (attempt > maxRetries) {
            console.warn(`[Failover Alert] Chìa dệt [${key.name}] bị lỗi liên tục. Chuyển sang key khác.`);
            
            const freshSettings = await readSettings();
            const freshStorySettings = freshSettings[storyId] || {};
            const freshKeys = freshSettings["global_vector_keys"] || freshStorySettings.embeddingKeys || [];
            const targetFreshKey = freshKeys.find((k: any) => k.id === key.id);
            
            if (targetFreshKey) {
              targetFreshKey.status = 'error';
              targetFreshKey.lastUsed = new Date().toISOString();
              targetFreshKey.errorCount = (targetFreshKey.errorCount || 0) + 1;
            }

            freshStorySettings.embeddingKeys = freshKeys;
            freshSettings[storyId] = freshStorySettings;
            freshSettings["global_vector_keys"] = freshKeys;
            await writeSettings(freshSettings);
          }
        }
      }

      lastError = result?.error || "Lỗi dệt mảng vector không rõ nguyên do.";
    }

    // Nếu lặp qua toàn bộ danh sách key vẫn thất bại
    return {
      success: false,
      error: `Tất cả key vector đã hết quota hoặc bị lỗi. Vui lòng thêm key mới hoặc thử lại sau nhen vợ yêu! 💕 (Lỗi cuối: ${lastError})`
    };
  }

  // API 1.3: Thử đầu nối Google Embedding API để kiểm định API Key thật
  app.post("/api/vector-memory/verify-key", async (req, res) => {
    try {
      const { apiKey, endpoint, model } = req.body;
      if (!apiKey) return res.status(400).json({ success: false, ok: false, error: "Thiếu API Key rồi, vợ nhập lại giúp chồng nhen!" });

      if (apiKey.includes('*')) {
        return res.status(400).json({ success: false, ok: false, error: "Vui lòng nhập API key đầy đủ, không dùng key đã che để kiểm thử nhen!" });
      }

      const finalEndpoint = endpoint || "https://generativelanguage.googleapis.com/v1beta";
      const finalModel = model || "gemini-embedding-001";
      const testText = "Kiểm tra kết nối Vector Memory";

      const result = await fetchGoogleNativeEmbedding(testText, apiKey, finalEndpoint, finalModel);

      if (!result.success) {
        return res.status(result.status || 400).json({ success: false, ok: false, error: result.error });
      }

      res.json({
        success: true,
        ok: true,
        dimension: result.vector?.length || 0,
        message: "Đã kết nối hoàn mỹ! Mảng số Vector hoạt động trơn tru."
      });
    } catch (error: any) {
      console.error("[Backend Verification] Lỗi kiểm nghiệm đầu nối key:", error);
      res.status(500).json({ success: false, ok: false, error: `Chồng phát hiện lỗi: ${error.message}` });
    }
  });

  // Thuật toán so khớp khoảng cách ngữ cảnh Cosine Similarity thuần túy siêu tốc
  function cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }
    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  // Cắt văn bản chương truyện thông minh theo đoạn văn và hội thoại gối đầu (overlap)
  function makeTextChunks(text: string, chunkSize = 1200, overlap = 150): string[] {
    const paragraphs = text.split(/\n+/).map(p => p.trim()).filter(Boolean);
    if (paragraphs.length === 0) return [text];

    const chunks: string[] = [];
    let currentParagraphs: string[] = [];
    let currentWordCount = 0;

    for (let i = 0; i < paragraphs.length; i++) {
      const paragraph = paragraphs[i];
      const paraWords = paragraph.split(/\s+/).length;

      // Nếu đoạn văn cô độc quá dài vượt qua cả chunkSize
      if (paraWords >= chunkSize) {
        if (currentParagraphs.length > 0) {
          chunks.push(currentParagraphs.join('\n\n'));
          currentParagraphs = [];
          currentWordCount = 0;
        }
        // Cắt thô bằng từ
        const words = paragraph.split(/\s+/);
        let start = 0;
        while (start < words.length) {
          const end = Math.min(start + chunkSize, words.length);
          chunks.push(words.slice(start, end).join(' '));
          if (end >= words.length) break;
          start += (chunkSize - overlap);
        }
        continue;
      }

      // Nếu thêm paragraph này vượt quá chunkSize
      if (currentWordCount + paraWords > chunkSize) {
        if (currentParagraphs.length > 0) {
          chunks.push(currentParagraphs.join('\n\n'));
        }

        // Tạo overlap gối đầu từ cuối chunk trước
        const overlapParas: string[] = [];
        let overlapWords = 0;
        for (let j = currentParagraphs.length - 1; j >= 0; j--) {
          const prevPara = currentParagraphs[j];
          const prevWords = prevPara.split(/\s+/).length;
          if (overlapWords + prevWords > overlap) break;
          overlapParas.unshift(prevPara);
          overlapWords += prevWords;
        }

        currentParagraphs = [...overlapParas, paragraph];
        currentWordCount = overlapWords + paraWords;
      } else {
        currentParagraphs.push(paragraph);
        currentWordCount += paraWords;
      }
    }

    if (currentParagraphs.length > 0) {
      chunks.push(currentParagraphs.join('\n\n'));
    }

    return chunks;
  }

  // Parse JSON an toàn nhận về từ LLM
  function safeParseLLMJSON(text: string) {
    let cleaned = text.trim();
    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.substring(7);
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.substring(3);
    }
    if (cleaned.endsWith('```')) {
      cleaned = cleaned.substring(0, cleaned.length - 3);
    }
    cleaned = cleaned.trim();
    
    try {
      return JSON.parse(cleaned);
    } catch (err) {
      console.error("[Backend Vector] Thất bại khi parse JSON của AI phân tích:", cleaned);
      return {};
    }
  }

  // Hàm sinh Bối cảnh chương (Chapter Context Metadata) rực rỡ cho vợ yêu
  async function generateChapterContext(content: string, chapterTitle: string, llmSettings: any): Promise<any> {
    const finalLlmKey = llmSettings?.apiKey || process.env.GEMINI_API_KEY;
    const finalLlmEndpoint = llmSettings?.endpoint || "generativelanguage.googleapis.com";
    const finalLlmModel = llmSettings?.model || "gemini-1.5-flash";

    const prompt = `Hãy đóng vai một Biên tập viên văn học cao cấp. Phân tích nội dung chương truyện "${chapterTitle}" để trích xuất Bối cảnh chương (Chapter Context Metadata).
Dựa trên nội dung chương, hãy suy luận hoặc tìm các thông tin bối cảnh cụ thể. Nếu không có thông tin rõ ràng, hãy bỏ trống field đó.
Kết quả trả về PHẢI là JSON thuần túy (tuyệt đối không kèm khối markdown \`\`\`json, không lời bình).

Nội dung chương (phân đoạn tiêu biểu):
"${content.substring(0, 5000)}"

JSON cấu trúc:
{
  "storyTime": "Thời điểm trong truyện (ví dụ: Ngày 12/06/2008)",
  "dateTime": "Ngày/giờ cụ thể nếu có (ví dụ: Chiều muộn / 17:30)",
  "season": "Mùa (ví dụ: Đầu hạ)",
  "weather": "Thời tiết (ví dụ: Mưa nhẹ, trời âm u)",
  "mainLocation": "Địa điểm chính (ví dụ: Nhà thuê / bệnh viện)",
  "characters": ["Tên nhân vật xuất hiện 1", "Nhân vật 2"],
  "mood": "Tâm trạng chương (ví dụ: Căng thẳng, thương tâm, dịu lại)",
  "mainEvents": "Sự kiện chính trong chương",
  "relationshipStatus": "Trạng thái quan hệ nhân vật (ví dụ: Đang hiểu lầm, đang xa cách)",
  "continuityContext": "Bối cảnh nối tiếp từ chương trước (ví dụ: Chương trước nhân vật vừa xảy ra xung đột)",
  "continuityNotes": "Ghi chú continuity quan trọng (ví dụ: Nhân vật A đang bị thương ở tay trái)"
}
`;

    try {
      let lUrl = (finalLlmEndpoint || "generativelanguage.googleapis.com").trim();
      if (!lUrl.startsWith('http')) lUrl = 'https://' + lUrl;
      if (lUrl.endsWith('/')) lUrl = lUrl.slice(0, -1);
      
      const getCompletionUrl = (base: string) => {
        if (base.includes('openai.com')) return `${base}/chat/completions`;
        if (base.includes('anthropic.com')) return `${base}/messages`;
        if (base.includes('googleapis.com')) return `${base}/models/${finalLlmModel}:generateContent`;
        return `${base}/chat/completions`;
      };
      
      const completionUrl = getCompletionUrl(lUrl);
      
      let bodyPayload: any = {};
      if (completionUrl.includes('googleapis.com')) {
        bodyPayload = { contents: [{ parts: [{ text: prompt }] }] };
      } else {
        bodyPayload = { 
          model: finalLlmModel, 
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.3
        };
      }

      const response = await fetch(completionUrl, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${finalLlmKey}`
        },
        body: JSON.stringify(bodyPayload)
      });

      if (response.ok) {
        const data = await response.json();
        const text = data.choices?.[0]?.message?.content || data.candidates?.[0]?.content?.parts?.[0]?.text || "";
        const parsed = safeParseLLMJSON(text);
        return Object.keys(parsed).length > 0 ? parsed : {};
      }
    } catch (error) {
      console.error("[Backend Vector] Lỗi khi sinh bối cảnh chương:", error);
    }
    return {};
  }

  // API: Sinh Bối cảnh chương (Chapter Context Metadata)
  app.post("/api/generate-chapter-context", async (req, res) => {
    try {
      const { storyId, chapterTitle, content, llmSettings } = req.body;
      if (!content) return res.status(400).json({ error: "Thiếu nội dung chương" });
      const metadata = await generateChapterContext(content, chapterTitle, llmSettings);
      res.json(metadata);
    } catch (error: any) {
      console.error("[Backend Vector] Lỗi khi sinh bối cảnh chương API:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // 1. API: Lấy về toàn bộ mảng ký ức của câu chuyện
  app.get("/api/vector-memory/story/:storyId", async (req, res) => {
    try {
      const { storyId } = req.params;
      const memories = await readMemories();
      const filtered = memories.filter(m => m.storyId === storyId);
      res.json(filtered);
    } catch (error: any) {
      console.error("[Backend Vector] Lỗi khi lấy danh sách ký ức:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // 2. API: Cập nhật metadata của từng ký ức (sửa title, content, importance, tag, category)
  app.patch("/api/vector-memory/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      const memories = await readMemories();
      const idx = memories.findIndex(m => m.id === id);
      
      if (idx === -1) return res.status(404).json({ error: "Memory/chunk not found" });
      
      memories[idx] = {
        ...memories[idx],
        ...updates,
        updatedAt: new Date().toISOString()
      };
      
      await writeMemories(memories);
      res.json(memories[idx]);
    } catch (error: any) {
      console.error("[Backend Vector] Lỗi khi update ký ức:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // API: Hỗ trợ frontend Queue - dệt từng chunk để show progress
  app.post("/api/vectorize-chunk", async (req, res) => {
    try {
      const { storyId, chapterId, chapterTitle, chunkText, chunkIndex, keyToUse, llmSettings, chapterContextMetadata } = req.body;
      
      // Look up the real key on the server side because the client might send a masked key (****)
      const allSettings = await readSettings();
      const storySettings = allSettings[storyId] || {};
      const globalKeys = allSettings["global_vector_keys"] || storySettings.embeddingKeys || [];
      const serverKeyObj = globalKeys.find((k: any) => k.id === keyToUse.id);
      
      const rawApiKey = serverKeyObj ? decryptKey(serverKeyObj.apiKey) : decryptKey(keyToUse.apiKey);
      
      let vector: number[] = [];
      const url = keyToUse.endpoint || "https://generativelanguage.googleapis.com/v1beta";
      const model = keyToUse.model || "gemini-embedding-001";
      
      // Additional safety check: if key still contains mask characters, it's definitely invalid
      if (rawApiKey.includes('*') || rawApiKey === '') {
        return res.status(401).json({ error: "Chìa khóa dệt ký ức không hợp lệ hoặc đã bị che. Vui lòng kiểm tra cài đặt Hub nhen vợ!" });
      }

      const embRes = await fetchGoogleNativeEmbedding(chunkText, rawApiKey, url, model);
      if (embRes.success && embRes.vector) {
        vector = embRes.vector;
      } else {
        return res.status(embRes.status === 429 ? 429 : 500).json({ error: embRes.error || "Lỗi nhúng" });
      }

      // Handle LLM for analysis (safely look up LLM key if possible)
      const finalLlmKey = llmSettings?.apiKey?.includes('*') ? process.env.GEMINI_API_KEY : (llmSettings?.apiKey || process.env.GEMINI_API_KEY);
      
      if (!finalLlmKey) {
        return res.status(401).json({ error: "Thiếu chìa khóa AI để phân tích ký ức cốt lõi." });
      }
      const finalLlmEndpoint = llmSettings?.endpoint || "generativelanguage.googleapis.com";
      const finalLlmModel = llmSettings?.model || "gemini-1.5-flash";

      const llmPrompt = `Hãy đóng vai một Biên tập viên văn học cao cấp cực kỳ chuyên nghiệp. Phân tích đoạn trích dưới đây của chương truyện "${chapterTitle}" để trích xuất ký ức cốt lõi. Hãy trả về kết quả định dạng JSON thuần túy (tuyệt đối không kèm khối markdown \`\`\`json, không kèm lời bình luận ngoài lề).

Đoạn trích để phân tích:
"${chunkText}"

JSON cấu trúc bắt buộc:
{
  "title": "Đặt tên ký ức ngắn gọn (tối đa 10 từ)",
  "summary": "Tóm tắt cốt lõi của phân đoạn này trong 2 câu ngắn gọn xúc tích",
  "category": "Phân loại vào duy nhất một mục trong nhóm: Character, Event, Relationship, Location, Item, Secret, Emotion, Conflict, Other",
  "tags": ["ghi-cac-tag-viet-thuong-lien-quan", "tối đa 3 tags"],
  "importance": 75
}

*Chú thích:* "importance" là điểm số từ 0 đến 100 biểu thị mức độ quyết định mạch cốt truyện của ký ức này.`;

      let analysis = {
        title: `Ký ức Phân đoạn ${chunkIndex + 1} - ${chapterTitle}`,
        summary: chunkText.substring(0, 150) + "...",
        category: "Other",
        tags: ["tu-dong"],
        importance: 50
      };

      try {
        let lUrl = finalLlmEndpoint.trim();
        if (!lUrl.startsWith('http')) lUrl = 'https://' + lUrl;
        if (lUrl.endsWith('/')) lUrl = lUrl.slice(0, -1);
        
        const getCompletionUrl = (base: string) => {
          if (base.includes('openai.com')) return `${base}/chat/completions`;
          if (base.includes('anthropic.com')) return `${base}/messages`;
          if (base.includes('googleapis.com')) return `${base}/models/${finalLlmModel}:generateContent`;
          return `${base}/chat/completions`;
        };

        const completionUrl = getCompletionUrl(lUrl);
        let bodyPayload: any = {};
        if (completionUrl.includes('googleapis.com')) {
          bodyPayload = {
            contents: [{ parts: [{ text: llmPrompt }] }]
          };
        } else {
          bodyPayload = {
            model: finalLlmModel,
            messages: [{ role: 'user', content: llmPrompt }],
            max_tokens: 800,
            temperature: 0.2
          };
        }

        // Ensure key is ASCII only to prevent ByteString errors
        const safeKey = finalLlmKey.replace(/[^\x00-\x7F]/g, '');
        const paramsStr = completionUrl.includes('googleapis.com') ? `?key=${safeKey}` : '';
        
        const llmRes = await fetch(`${completionUrl}${paramsStr}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(completionUrl.includes('googleapis.com') ? {} : { 'Authorization': `Bearer ${safeKey}` }) },
          body: JSON.stringify(bodyPayload)
        });

        if (llmRes.ok) {
          const llmData = await llmRes.json();
          let rawText = "";
          if (completionUrl.includes('googleapis.com')) {
            rawText = llmData.candidates?.[0]?.content?.parts?.[0]?.text || "";
          } else {
            rawText = llmData.choices?.[0]?.message?.content || "";
          }
          const parsed = safeParseLLMJSON(rawText);
          if (parsed && parsed.title) {
            analysis = { ...analysis, ...parsed };
          }
        }
      } catch (err: any) {
        console.warn(`[Backend Vectorize Chunk LLM] Error on chunk ${chunkIndex}: ${err.message}`);
      }

      const memoryObj = {
        id: `mem_${storyId}_${chapterId}_${chunkIndex}_${Date.now()}`,
        storyId,
        chapterId,
        chunkIndex,
        title: analysis.title || `Vùng dệt ${chunkIndex + 1}`,
        content: chunkText,
        summary: analysis.summary || chunkText.substring(0, 150) + "...",
        category: analysis.category || "Other",
        tags: Array.isArray(analysis.tags) ? analysis.tags : [],
        importance: analysis.importance || 50,
        tokenCount: Math.round(chunkText.length / 4),
        isPinned: false,
        usedCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        embedding: vector,
        chapterContextMetadata: chapterContextMetadata || null
      };

      res.status(200).json({ success: true, memory: memoryObj });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // API 3.1: Lưu bulk memory cho UI frontend
  app.post("/api/vector-memory/bulk-save", async (req, res) => {
    try {
      const { storyId, chapterId, memoriesToAdd } = req.body;
      const memories = await readMemories();
      let newMemories = memories;
      
      // Clear current chapter chunks if requested (to replace)
      if (chapterId) {
        newMemories = newMemories.filter(m => m.chapterId !== chapterId);
      }
      
      if (Array.isArray(memoriesToAdd)) {
        newMemories = [...newMemories, ...memoriesToAdd];
      }
      
      await writeMemories(newMemories);
      res.json({ success: true, count: memoriesToAdd.length });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 3. API: Xoá một lát cắt ký ức cụ thể
  app.delete("/api/vector-memory/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const memories = await readMemories();
      const filtered = memories.filter(m => m.id !== id);
      await writeMemories(filtered);
      res.json({ success: true, message: "Ký ức đã được hóa giải thành công!" });
    } catch (error: any) {
      console.error("[Backend Vector] Lỗi khi xoá ký ức:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // 4. API: Xoá sạch toàn bộ ký ức Vector của một truyện
  app.post("/api/vector-memory/bulk-delete", async (req, res) => {
    try {
      const { storyId } = req.body;
      if (!storyId) return res.status(400).json({ error: "Thiếu storyId rồi" });
      const memories = await readMemories();
      const filtered = memories.filter(m => m.storyId !== storyId);
      await writeMemories(filtered);
      res.json({ success: true, message: `Toàn bộ Kí ức Vector của câu chuyện ${storyId} đã được dọn sạch!` });
    } catch (error: any) {
      console.error("[Backend Vector] Lỗi dọn dẹp bulk delete:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // 5. API: Tra cứu ngữ nghĩa - Sinh vector query và thực hiện Cosine Matching kèm theo Weighted Ranking thông minh
  app.post("/api/search-vector-memory", async (req, res) => {
    try {
      const { storyId, query, minSimilarity, limit } = req.body;
      
      if (!storyId || !query) {
        return res.status(400).json({ error: "Thiếu storyId hoặc câu hỏi truy vấn rồi vợ yêu!" });
      }

      // Đọc toàn bộ cài đặt câu chuyện
      const allSettings = await readSettings();
      const settings = allSettings[storyId] || {};

      const threshold = minSimilarity !== undefined ? minSimilarity : (settings.minSimilarity || 0.65);
      const maxResults = limit || settings.limitResults || 15;
      const maxContextTokens = settings.maxContextTokens || 15000;

      const recentFirst = settings.recentFirst !== undefined ? settings.recentFirst : false;
      const importanceFirst = settings.importanceFirst !== undefined ? settings.importanceFirst : true;
      const mainCharFirst = settings.mainCharFirst !== undefined ? settings.mainCharFirst : false;
      const strongEmotionFirst = settings.strongEmotionFirst !== undefined ? settings.strongEmotionFirst : false;
      const deduplicate = settings.deduplicate !== undefined ? settings.deduplicate : true;
      const skipShortChunks = settings.skipShortChunks !== undefined ? settings.skipShortChunks : true;
      const skipEmptyChunks = settings.skipEmptyChunks !== undefined ? settings.skipEmptyChunks : true;

      console.log(`[Backend Vector Search] Tra cứu: "${query}" cho StoryId: ${storyId}`);

      // Sinh vector nhúng (embedding) cho query thông qua Hàm dệt Failover tự động đảo key
      const result = await getEmbeddingWithFailover(storyId, query);
      
      if (!result.success || !result.vector) {
        return res.status(500).json({ error: `Không sinh được mảng Vector dệt cho câu hỏi: ${result.error}` });
      }

      const queryVector = result.vector;

      // So khớp với tất cả memories của truyện này
      const allMemories = await readMemories();
      let storyMemories = allMemories.filter(m => m.storyId === storyId);

      // A. Lọc thô trước khi chấm điểm
      if (skipEmptyChunks) {
        storyMemories = storyMemories.filter(m => m.content && m.content.trim().length >= 5);
      }
      if (skipShortChunks) {
        storyMemories = storyMemories.filter(m => m.content && m.content.trim().length >= 40);
      }

      // B. Tính cosine similarity cơ bản
      let scoredResults = storyMemories.map(mem => {
        const sim = cosineSimilarity(queryVector, mem.embedding);
        return {
          ...mem,
          similarity: sim,
          relevance: Math.round(sim * 100)
        };
      });

      // Lọc theo ngưỡng similarity thô tối thiểu
      scoredResults = scoredResults.filter(m => m.similarity >= threshold);

      // C. Áp dụng các trọng số Ranking (Ưu tiên) của vợ yêu đặt ra
      const processedResults = scoredResults.map(item => {
        let boostedScore = item.similarity;

        // 1. Ưu tiên ký ức cảm xúc mạnh (Category: 'Emotion' hoặc nhãn chứa cảm xúc)
        if (strongEmotionFirst && (item.category === 'Emotion' || (item.tags && item.tags.some((t: string) => t.toLowerCase().includes('cam xuc') || t.toLowerCase().includes('emotion'))))) {
          boostedScore += 0.08;
        }

        // 2. Ưu tiên ký ức nhân vật chính (tag chứa 'nhân vật chính', 'main character', 'protagonist' nhen)
        if (mainCharFirst && item.tags && item.tags.some((t: string) => {
          const lower = t.toLowerCase();
          return lower.includes('nhan vat chinh') || lower.includes('main') || lower.includes('protagonist') || lower.includes('chinh');
        })) {
          boostedScore += 0.08;
        }

        // 3. Ưu tiên ký ức cốt lõi quan trọng (Càng quan trọng / dùng nhiều càng nhớ sâu)
        if (importanceFirst) {
          const importanceBoost = ((item.importance || 50) / 100) * 0.06;
          const usageBoost = Math.min(item.usedCount || 0, 10) * 0.01; // max 0.10
          boostedScore += (importanceBoost + usageBoost);
        }

        // 4. Ưu tiên ký ức gần đây (Cấp một lượng nhỏ điểm cộng dựa vào mốc thời gian dệt)
        if (recentFirst && item.createdAt) {
          try {
            const ageMs = Date.now() - new Date(item.createdAt).getTime();
            const ageDays = ageMs / (1000 * 60 * 60 * 24);
            const recencyBoost = Math.max(0, 0.05 * (1 - ageDays / 30)); // Boost nhẹ nếu dệt trong vòng 30 ngày qua
            boostedScore += recencyBoost;
          } catch {}
        }

        return {
          ...item,
          boostedScore
        };
      });

      // D. Sắp xếp kết quả sau khi được Boosted
      let sortedResults = processedResults.sort((a, b) => b.boostedScore - a.boostedScore);

      // E. Lọc trùng lặp chunk nếu được bật (deduplicate)
      if (deduplicate) {
        const seenText = new Set<string>();
        const deduplicated: any[] = [];
        for (const item of sortedResults) {
          const normText = item.content ? item.content.trim().substring(0, 50).toLowerCase() : "";
          if (seenText.has(normText)) continue;
          seenText.add(normText);
          deduplicated.push(item);
        }
        sortedResults = deduplicated;
      }

      // F. Thu hồi và cộng dồn tokens - Tự dừng khi tổng gần 15000 vector tokens
      const retrievedChunks: any[] = [];
      let totalTokens = 0;
      let hasUpdatedAny = false;

      for (const item of sortedResults) {
        const itemTokens = item.tokenCount || Math.round(item.content.length / 4.0);
        
        // Dừng retrieval nếu thêm chunk này vượt ngưỡng 15000 tokens
        if (totalTokens + itemTokens > maxContextTokens) {
          console.log(`[Retrieval Limit] Cộng dồn đạt: ${totalTokens} + ${itemTokens} > ${maxContextTokens} tokens. Tự kết thúc dệt gợi nhớ.`);
          break;
        }

        // Dừng nếu đạt số lượng chunks tối đa được cấu hình
        if (retrievedChunks.length >= maxResults) {
          break;
        }

        // Cập nhật lượt dùng dùng thực tế để làm callback emotional
        item.usedCount = (item.usedCount || 0) + 1;
        hasUpdatedAny = true;

        // Tìm và cập nhật ngược usedCount vào danh sách nguyên bản lưu trữ
        const originIdx = allMemories.findIndex(m => m.id === item.id);
        if (originIdx !== -1) {
          allMemories[originIdx].usedCount = item.usedCount;
        }

        // Ẩn mảng embedding cồng kềnh trước khi gửi về Client cho nhẹ băng thông
        const parsedItem = {
          ...item,
          embedding: undefined
        };
        retrievedChunks.push(parsedItem);
        totalTokens += itemTokens;
      }

      // Ghi nhận lượt sử dụng dệt ký ức để lần sau nhớ sâu sắc hơn
      if (hasUpdatedAny) {
        await writeMemories(allMemories);
      }

      res.json(retrievedChunks);
    } catch (error: any) {
      console.error("[Backend Vector Search] Thất bại:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // 6. API: Phân mảnh, sinh Vector nhúng, nhờ AI tóm tắt phân loại và lưu trữ Ký ức Chương truyện
  app.post("/api/vectorize-chapter", async (req, res) => {
    try {
      const { storyId, chapterId, chapterTitle, content, chunkSize, overlap, llmSettings } = req.body;

      if (!storyId || !chapterId || !content) {
        return res.status(400).json({ error: "Thiếu thông tin storyId, chapterId hoặc nội dung để hóa Vector" });
      }

      // Đọc settings để lấy chunk và overlap mặc định nếu rỗng
      const allSettings = await readSettings();
      const settings = allSettings[storyId] || {};

      const size = chunkSize || settings.chunkSize || 1200;
      const over = overlap || settings.overlapSize || 150;
      
      // I. Sinh Bối cảnh chương (Chapter Context Metadata) rực rỡ cho vợ yêu
      console.log(`[Backend Vectorize] Đang dệt bối cảnh chương: ${chapterTitle}...`);
      const chapterContextMetadata = await generateChapterContext(content, chapterTitle, llmSettings);

      // Cài đặt API LLM cho phân tích (Tóm tắt từ Chat completions config)
      const finalLlmKey = llmSettings?.apiKey || process.env.GEMINI_API_KEY;
      const finalLlmEndpoint = llmSettings?.endpoint || "generativelanguage.googleapis.com";
      const finalLlmModel = llmSettings?.model || "gemini-1.5-flash";

      // Phân mảnh chương truyện
      const textChunks = makeTextChunks(content, size, over);
      console.log(`[Backend Vectorize] Hóa chương: ${chapterTitle} (${content.length} ký tự). Cắt thành ${textChunks.length} mảnh.`);

      const results: any[] = [];
      let successCount = 0;
      let failedCount = 0;

      // Đọc tệp tin ký ức cũ
      const memories = await readMemories();
      // Xóa các chunk cũ của chapterId này để tránh trùng lặp khi ghi đè (re-vectorize)!
      const filteredMemories = memories.filter(m => m.chapterId !== chapterId);

      for (let idx = 0; idx < textChunks.length; idx++) {
        const chunkText = textChunks[idx];
        
        try {
          // A. Sinh Embedding Vector cho mảnh này thông qua hàm bọc failover bảo vệ tự đảo chìa chống lỗi Quota
          let vector: number[] = [];
          
          const result = await getEmbeddingWithFailover(storyId, chunkText);
          
          if (result.success && result.vector) {
            vector = result.vector;
          } else {
            throw new Error(result.error || `Lỗi không sinh được vector nhúng cho mảnh #${idx + 1}`);
          }

          // B. Nhờ LLM tóm tắt phân loại
          const llmPrompt = `Hãy đóng vai một Biên tập viên văn học cao cấp cực kỳ chuyên nghiệp. Phân tích đoạn trích dưới đây của chương truyện "${chapterTitle}" để trích xuất ký ức cốt lõi. Hãy trả về kết quả định dạng JSON thuần túy (tuyệt đối không kèm khối markdown \`\`\`json, không kèm lời bình luận ngoài lề).

Đoạn trích để phân tích:
"${chunkText}"

JSON cấu trúc bắt buộc:
{
  "title": "Đặt tên ký ức ngắn gọn (tối đa 10 từ)",
  "summary": "Tóm tắt cốt lõi của phân đoạn này trong 2 câu ngắn gọn xúc tích",
  "category": "Phân loại vào duy nhất một mục trong nhóm: Character, Event, Relationship, Location, Item, Secret, Emotion, Conflict, Other",
  "tags": ["ghi-cac-tag-viet-thuong-lien-quan", "tối đa 3 tags"],
  "importance": 75
}

*Chú thích:* "importance" là điểm số từ 0 đến 100 biểu thị mức độ quyết định mạch cốt truyện của ký ức này.`;

          // Cầu viện LLM
          let analysis = {
            title: `Ký ức Phân đoạn ${idx + 1} - ${chapterTitle}`,
            summary: chunkText.substring(0, 150) + "...",
            category: "Other",
            tags: ["tu-dong"],
            importance: 50
          };

          try {
            let lUrl = finalLlmEndpoint.trim();
            if (!lUrl.startsWith('http')) lUrl = 'https://' + lUrl;
            if (lUrl.endsWith('/')) lUrl = lUrl.slice(0, -1);
            
            const getCompletionUrl = (base: string) => {
              if (base.includes('openai.com')) return `${base}/chat/completions`;
              if (base.includes('anthropic.com')) return `${base}/messages`;
              if (base.includes('googleapis.com')) return `${base}/models/${finalLlmModel}:generateContent`;
              return `${base}/chat/completions`;
            };

            const completionUrl = getCompletionUrl(lUrl);
            let bodyPayload: any = {};
            if (completionUrl.includes('googleapis.com')) {
              bodyPayload = {
                contents: [{ parts: [{ text: llmPrompt }] }]
              };
            } else {
              bodyPayload = {
                model: finalLlmModel,
                messages: [{ role: 'user', content: llmPrompt }],
                max_tokens: 800,
                temperature: 0.2
              };
            }

            const response = await fetch(completionUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${finalLlmKey}`
              },
              body: JSON.stringify(bodyPayload)
            });

            if (response.ok) {
              const data = await response.json();
              const text = data.choices?.[0]?.message?.content || 
                           data.candidates?.[0]?.content?.parts?.[0]?.text || 
                           "";
              analysis = {
                ...analysis,
                ...safeParseLLMJSON(text)
              };
            }
          } catch (errLlm) {
            console.error(`[Backend Vectorize] Lỗi gọi AI phân tích mảnh #${idx + 1}:`, errLlm);
          }

          // Ghép thành mảng ký ức hoàn chỉnh
          const newMem = {
            id: `${chapterId}-chunk-${idx}-${Date.now()}`,
            storyId,
            chapterId,
            chunkIndex: idx,
            title: analysis.title,
            content: chunkText,
            summary: analysis.summary,
            tags: analysis.tags || [],
            category: analysis.category || "Other",
            importance: analysis.importance || 50,
            tokenCount: Math.round(chunkText.length / 4.0),
            embedding: vector,
            chapterContextMetadata: chapterContextMetadata,
            isPinned: false,
            usedCount: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };

          results.push(newMem);
          successCount++;
        } catch (chunkErr: any) {
          console.error(`[Backend Vectorize] Lỗi số hóa mảnh #${idx + 1}:`, chunkErr);
          failedCount++;
        }
      }

      // Cập nhật lưu trữ
      const updatedMemories = [...filteredMemories, ...results];
      await writeMemories(updatedMemories);

      res.json({
        success: true,
        successCount,
        failedCount,
        totalChunks: textChunks.length,
        savedChunks: results.map(r => ({ id: r.id, title: r.title }))
      });
    } catch (error: any) {
      console.error("[Backend Vector] Lỗi toàn cục số hóa chương:", error);
      res.status(500).json({ error: error.message });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
