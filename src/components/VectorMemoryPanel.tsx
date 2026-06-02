import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  TreeDeciduous, 
  Heart, 
  Search, 
  Filter, 
  Clock, 
  Star, 
  Pin, 
  FileText, 
  Trash2, 
  RefreshCw, 
  BarChart3, 
  Settings, 
  ShieldAlert, 
  ArrowLeft, 
  Bookmark, 
  Tag, 
  Save, 
  Sliders, 
  BookOpen, 
  Sparkles,
  Check,
  AlertCircle,
  Database,
  Key,
  X,
  Zap,
  ZapOff,
  Flower2
} from 'lucide-react';
import { sendMessage, sendMessageStream } from '../utils/apiProxy';
import { 
  saveLocalVectorMemory, 
  getLocalVectorMemories, 
  saveLocalVectorMemoriesBulk, 
  deleteLocalVectorMemory, 
  clearLocalVectorMemories,
  saveGlobalBackground,
  loadGlobalBackground
} from '../utils/db';

interface VectorMemory {
  id: string;
  storyId: string;
  chapterId: string;
  chunkIndex: number;
  title: string;
  content: string;
  summary: string;
  tags: string[];
  category: string;
  importance: number;
  tokenCount: number;
  isPinned: boolean;
  usedCount: number;
  createdAt: string;
  updatedAt: string;
  relevance?: number;
  chapterContextMetadata?: any;
}

interface VectorMemoryPanelProps {
  storyId: string;
  storyTitle: string;
  chapters: any[];
  currentChapterId?: string;
  apiSettings: any;
  onClose: () => void;
  showAlert: (title: string, message: string, type: 'success' | 'warning' | 'error') => void;
  onUpdateChapter?: (chapterId: string, updates: any) => void;
}

export default function VectorMemoryPanel({
  storyId,
  storyTitle,
  chapters,
  currentChapterId,
  apiSettings,
  onClose,
  showAlert,
  onUpdateChapter
}: VectorMemoryPanelProps) {
  const [activeTab, setActiveTab] = useState<'status' | 'memories' | 'search' | 'timeline' | 'settings'>('status');
  const [memories, setMemories] = useState<VectorMemory[]>([]);
  const [loading, setLoading] = useState(false);
  const [processingProgress, setProcessingProgress] = useState({
    active: false,
    text: '',
    progress: 0,
    current: 0,
    total: 0,
    chunkCurrent: 0,
    chunkTotal: 0,
    keyName: '',
    speed: 0,
    status: 'Stable',
    eta: 0
  });

  const [vectorMode, setVectorMode] = useState<'saving' | 'fast'>('saving');

  const [summarizingChapterStatus, setSummarizingChapterStatus] = useState<{active: boolean, message: string, type: 'info'|'success'|'error'|''}>({ active: false, message: '', type: '' });

  // Filter & Search states for Memories Tab
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterImportance, setFilterImportance] = useState<string>('all');
  const [searchKeyword, setSearchKeyword] = useState<string>('');
  
  // Semantic Search Tab states
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<VectorMemory[]>([]);
  const [searchingSemantic, setSearchingSemantic] = useState(false);
  
  // Các cấu hình dệt Vector đồng hành với Máy chủ Backend
  const [isVectorEnabled, setIsVectorEnabled] = useState(true);
  const [autoVectorize, setAutoVectorize] = useState(true);
  const [autoVectorizeMode, setAutoVectorizeMode] = useState<'off' | 'full_only' | 'bg_save'>('full_only');
  const [chunkSize, setChunkSize] = useState(1000);
  const [overlapSize, setOverlapSize] = useState(120);
  const [maxContextTokens, setMaxContextTokens] = useState(15000);
  const [maxChunks, setMaxChunks] = useState(15);
  const [minSimilarity, setMinSimilarity] = useState<number>(0.65);
  const [limitResults, setLimitResults] = useState(15);
  
  const [recentFirst, setRecentFirst] = useState(false);
  const [importanceFirst, setImportanceFirst] = useState(true);
  const [mainCharFirst, setMainCharFirst] = useState(false);
  const [strongEmotionFirst, setStrongEmotionFirst] = useState(false);
  const [deduplicate, setDeduplicate] = useState(true);
  const [skipShortChunks, setSkipShortChunks] = useState(true);
  
  const [embeddingKeys, setEmbeddingKeys] = useState<any[]>([]);
  const [lastVectorized, setLastVectorized] = useState('');
  
  // State quản lý form thêm chìa nhúng (API Key) cực xinh bo góc pastel
  const [isAddingKey, setIsAddingKey] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyEndpoint, setNewKeyEndpoint] = useState('https://generativelanguage.googleapis.com/v1beta');
  const [newKeyApiKey, setNewKeyApiKey] = useState('');
  const [newKeyModel, setNewKeyModel] = useState('gemini-embedding-001');
  const [newKeyProvider, setNewKeyProvider] = useState('Google AI');
  const [verifyingKey, setVerifyingKey] = useState(false);
  const [verifyError, setVerifyError] = useState('');
  
  // Thêm tương thích cho biến vectorLimit cũ ở Memories để không làm vỡ các tab cũ của vợ nhen
  const vectorLimit = limitResults;

  const [pushedContexts, setPushedContexts] = useState<string[]>([]); // Temp in-context memories

  const [vectorBg, setVectorBg] = useState<string | null>(null);

  const handleHeartClick = () => {
    document.getElementById('vector-bg-upload')?.click();
  };

  const handleBgUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      if (base64) {
        setVectorBg(base64);
        await saveGlobalBackground('kikoko_vector_background', base64);
        showAlert('Đã lưu nền', 'Hình nền Vector mộng mơ đã được dệt và lưu giữ thành công! 🌸', 'success');
      }
    };
    reader.readAsDataURL(file);
  };

  // Edit inline state
  const [editingMemoryId, setEditingMemoryId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editSummary, setEditSummary] = useState('');
  const [editCategory, setEditCategory] = useState('Other');
  const [editImportance, setEditImportance] = useState(50);
  const [editTagsString, setEditTagsString] = useState('');

  const categories = [
    'Character', 
    'Event', 
    'Relationship', 
    'Location', 
    'Item', 
    'Secret', 
    'Emotion', 
    'Conflict', 
    'Other'
  ];

  // Load memories from backend
  const loadMemories = async () => {
    setLoading(true);
    try {
      // 1. Load from IndexedDB first for instant access and failover
      const localMems = await getLocalVectorMemories(storyId);
      if (localMems && localMems.length > 0) {
        setMemories(localMems);
      }

      // 2. Fetch from backend server
      const response = await fetch(`/api/vector-memory/story/${storyId}`);
      if (response.ok) {
        const data = await response.json();
        
        // 3. Merge them based on unique memory id
        const mergedMap = new Map();
        localMems.forEach(m => mergedMap.set(m.id, m));
        data.forEach((m: any) => mergedMap.set(m.id, m));
        
        const mergedList = Array.from(mergedMap.values());
        
        setMemories(mergedList);
        // 4. Update the IndexedDB local cache in background
        await saveLocalVectorMemoriesBulk(mergedList);
      } else {
        if (localMems && localMems.length > 0) {
          console.log("Using cached offline memories due to backend response not OK");
        } else {
          showAlert('Cảnh báo', 'Không thể lấy bộ nhớ ký ức từ máy chủ nhen', 'warning');
        }
      }
    } catch (err: any) {
      console.error("Load memories failed:", err);
      // Fallback is already set from local cache!
    } finally {
      setLoading(false);
    }
  };

  // Load cấu hình dệt Vector từ máy chủ backend
  const loadVectorSettings = async () => {
    try {
      const response = await fetch(`/api/vector-settings/${storyId}`);
      if (response.ok) {
        const data = await response.json();
        setIsVectorEnabled(data.isEnabled !== undefined ? data.isEnabled : true);
        setAutoVectorizeMode(data.autoVectorizeMode || 'full_only');
        setAutoVectorize(data.autoVectorizeMode !== 'off');
        setChunkSize(data.chunkSize || 1000);
        setOverlapSize(data.overlapSize || 120);
        setMaxContextTokens(data.maxContextTokens || 15000);
        setMaxChunks(data.maxChunks || 15);
        setMinSimilarity(data.minSimilarity || 0.65);
        setLimitResults(data.limitResults || 15);
        setRecentFirst(data.recentFirst || false);
        setImportanceFirst(data.importanceFirst !== undefined ? data.importanceFirst : true);
        setMainCharFirst(data.mainCharFirst || false);
        setStrongEmotionFirst(data.strongEmotionFirst || false);
        setDeduplicate(data.deduplicate !== undefined ? data.deduplicate : true);
        setSkipShortChunks(data.skipShortChunks !== undefined ? data.skipShortChunks : true);
        setEmbeddingKeys(data.embeddingKeys || []);
        if (data.lastVectorized) {
          setLastVectorized(data.lastVectorized);
        }
      }
    } catch (err) {
      console.error("Lấy cài đặt dệt thất bại ở backend:", err);
    }
  };

  useEffect(() => {
    loadMemories();
    loadVectorSettings();

    // Load custom vector romantic background image
    const fetchBg = async () => {
      try {
        const bgData = await loadGlobalBackground('kikoko_vector_background');
        if (bgData) {
          setVectorBg(bgData);
        }
      } catch (err) {
        console.error("Lỗi lấy hình nền vector cục bộ:", err);
      }
    };
    fetchBg();

    // Load active template context
    const currentPushed = localStorage.getItem(`pushed_context_memories_${storyId}`);
    if (currentPushed) {
      try {
        setPushedContexts(JSON.parse(currentPushed));
      } catch {
        setPushedContexts([]);
      }
    }
  }, [storyId]);

  // Đồng bộ lưu cài đặt lên máy chủ backend an toàn
  const saveSettingsToBackend = async (updates: Partial<any>) => {
    try {
      const isExplicitKeyUpdate = updates.embeddingKeys !== undefined;
      const payload = {
        isEnabled: updates.isEnabled !== undefined ? updates.isEnabled : isVectorEnabled,
        autoVectorizeMode: updates.autoVectorizeMode !== undefined ? updates.autoVectorizeMode : autoVectorizeMode,
        chunkSize: updates.chunkSize !== undefined ? updates.chunkSize : chunkSize,
        overlapSize: updates.overlapSize !== undefined ? updates.overlapSize : overlapSize,
        maxContextTokens: updates.maxContextTokens !== undefined ? updates.maxContextTokens : maxContextTokens,
        maxChunks: updates.maxChunks !== undefined ? updates.maxChunks : maxChunks,
        minSimilarity: updates.minSimilarity !== undefined ? updates.minSimilarity : minSimilarity,
        limitResults: updates.limitResults !== undefined ? updates.limitResults : limitResults,
        recentFirst: updates.recentFirst !== undefined ? updates.recentFirst : recentFirst,
        importanceFirst: updates.importanceFirst !== undefined ? updates.importanceFirst : importanceFirst,
        mainCharFirst: updates.mainCharFirst !== undefined ? updates.mainCharFirst : mainCharFirst,
        strongEmotionFirst: updates.strongEmotionFirst !== undefined ? updates.strongEmotionFirst : strongEmotionFirst,
        deduplicate: updates.deduplicate !== undefined ? updates.deduplicate : deduplicate,
        skipShortChunks: updates.skipShortChunks !== undefined ? updates.skipShortChunks : skipShortChunks,
        embeddingKeys: updates.embeddingKeys !== undefined ? updates.embeddingKeys : embeddingKeys,
        isExplicitKeyUpdate: isExplicitKeyUpdate
      };

      const response = await fetch(`/api/vector-settings/${storyId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      if (response.ok) {
        if (updates.isEnabled !== undefined) setIsVectorEnabled(updates.isEnabled);
        if (updates.autoVectorizeMode !== undefined) {
          setAutoVectorizeMode(updates.autoVectorizeMode);
          setAutoVectorize(updates.autoVectorizeMode !== 'off');
        }
        if (updates.chunkSize !== undefined) setChunkSize(updates.chunkSize);
        if (updates.overlapSize !== undefined) setOverlapSize(updates.overlapSize);
        if (updates.maxContextTokens !== undefined) setMaxContextTokens(updates.maxContextTokens);
        if (updates.maxChunks !== undefined) setMaxChunks(updates.maxChunks);
        if (updates.minSimilarity !== undefined) setMinSimilarity(updates.minSimilarity);
        if (updates.limitResults !== undefined) setLimitResults(updates.limitResults);
        if (updates.recentFirst !== undefined) setRecentFirst(updates.recentFirst);
        if (updates.importanceFirst !== undefined) setImportanceFirst(updates.importanceFirst);
        if (updates.mainCharFirst !== undefined) setMainCharFirst(updates.mainCharFirst);
        if (updates.strongEmotionFirst !== undefined) setStrongEmotionFirst(updates.strongEmotionFirst);
        if (updates.deduplicate !== undefined) setDeduplicate(updates.deduplicate);
        if (updates.skipShortChunks !== undefined) setSkipShortChunks(updates.skipShortChunks);
        if (updates.embeddingKeys !== undefined) setEmbeddingKeys(updates.embeddingKeys);
      } else {
        showAlert('Lỗi', 'Không thể đồng bộ cài đặt dệt lên máy chủ nhen', 'error');
      }
    } catch (err: any) {
      console.error("Save settings failed:", err);
    }
  };

  // Mock saveSetting tương thích ngược
  const saveSetting = (key: string, value: any) => {
    localStorage.setItem(key, String(value));
    if (key.startsWith('vector_mem_enabled_')) saveSettingsToBackend({ isEnabled: value });
    if (key.startsWith('vector_mem_auto_')) saveSettingsToBackend({ autoVectorizeMode: value ? 'full_only' : 'off' });
    if (key.startsWith('vector_mem_chunk_')) saveSettingsToBackend({ chunkSize: parseInt(value) });
    if (key.startsWith('vector_mem_overlap_')) saveSettingsToBackend({ overlapSize: parseInt(value) });
    if (key.startsWith('vector_mem_limit_')) saveSettingsToBackend({ limitResults: parseInt(value) });
    if (key.startsWith('vector_mem_max_ctx_')) saveSettingsToBackend({ maxContextTokens: parseInt(value) });
  };

    const hashCode = (s: string) => {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = Math.imul(31, h) + s.charCodeAt(i) | 0;
    return h;
  };

  const makeTextChunks = (text: string, size = 1200, overlap = 150): string[] => {
    const paragraphs = text.split(/\n+/).map(p => p.trim()).filter(Boolean);
    if (paragraphs.length === 0) return [text];
    const chunks: string[] = [];
    let currentParagraphs: string[] = [];
    let currentWordCount = 0;

    for (let i = 0; i < paragraphs.length; i++) {
      const paragraph = paragraphs[i];
      const paraWords = paragraph.split(/\s+/).length;

      if (currentWordCount + paraWords > size && currentParagraphs.length > 0) {
        chunks.push(currentParagraphs.join('\n\n'));
        let overlapWords = 0;
        const newParagraphs: string[] = [];
        for (let j = currentParagraphs.length - 1; j >= 0; j--) {
          const wCount = currentParagraphs[j].split(/\s+/).length;
          if (overlapWords + wCount <= overlap) {
            newParagraphs.unshift(currentParagraphs[j]);
            overlapWords += wCount;
          } else {
            break;
          }
        }
        currentParagraphs = [...newParagraphs, paragraph];
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
  };

  const getStoredHashes = () => {
    try { return JSON.parse(localStorage.getItem(`vector_hashes_${storyId}`) || '{}'); } 
    catch { return {}; }
  };
  
  const saveStoredHashes = (hashes: any) => {
    localStorage.setItem(`vector_hashes_${storyId}`, JSON.stringify(hashes));
  };

  const extractPlainText = (html: string) => {
    if (!html) return "";
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.body.textContent || "";
  };

  // CORE VECTOR QUEUE LOGIC 
  const runVectorQueue = async (mode: 'single' | 'all' | 'latest') => {
    let chaptersToProcess = [];
    
    if (mode === 'latest') {
      const validChapters = chapters.filter(c => c.content && c.content.trim().length > 0);
      const chap = validChapters[validChapters.length - 1];
      if (!chap) {
        showAlert('Lỗi', 'Truyện chưa có chương nào có nội dung!', 'error');
        return;
      }
      chaptersToProcess = [chap];
    } else if (mode === 'single') {
      const chap = chapters.find(c => c.id === currentChapterId);
      if (!chap || !chap.content || chap.content.trim().length === 0) {
        showAlert('Lỗi', 'Chương hiện tại chưa có nội dung!', 'error');
        return;
      }
      chaptersToProcess = [chap];
    } else {
      chaptersToProcess = chapters.filter(c => c.content && c.content.trim().length > 0);
      if (chaptersToProcess.length === 0) {
        showAlert('Lỗi', 'Truyện chưa có chương nào!', 'warning');
        return;
      }
    }

    if (!isVectorEnabled) {
      showAlert('Lỗi cấu hình', 'Hệ nhúng Vector đang tạm tắt! Bật ở thẻ Cấu hình nha 🌸', 'warning');
      return;
    }
    
    const validActiveKeys = embeddingKeys.filter(k => k.status !== 'inactive' && k.status !== 'quota_exceeded' && k.status !== 'error');
    if (validActiveKeys.length === 0) {
      showAlert('Thiếu chìa', 'Tất cả chìa nhúng quá tải hoặc chưa cấu hình! 💕', 'error');
      return;
    }

    const hashes = getStoredHashes();
    const chapsToRealProcess = [];
    
    // Check Hashes & Resume Status
    for (const chap of chaptersToProcess) {
      const plainText = extractPlainText(chap.content);
      const hash = hashCode(plainText);
      const saved = hashes[chap.id];
      
      // even in single mode, if hash matches and it's completed, we skip to save quota
      const hasChanged = !saved || saved.hash !== hash || !saved.completed;
      
      if (hasChanged) {
        chapsToRealProcess.push({ 
          ...chap, 
          plainText, 
          newHash: hash,
          startFromChunk: (saved && saved.hash === hash) ? (saved.lastIndex + 1) : 0
        });
      }
    }

    if (chapsToRealProcess.length === 0) {
      showAlert('Hoàn thành', 'Tất cả các chương đã hóa vector và không có nội dung mới nào cần dệt thêm 💕', 'success');
      return;
    }

    setProcessingProgress(prev => ({
      ...prev,
      active: true,
      text: `Đang lập dàn ý dệt... (Tổng: ${chapsToRealProcess.length} chương cần dệt)`,
      progress: 5,
      current: 0,
      total: chapsToRealProcess.length,
      status: 'Preparing'
    }));

    let globalSuccessCount = 0;
    let currentKeyArr = [...embeddingKeys];
    const startTime = Date.now();

    for (let cIdx = 0; cIdx < chapsToRealProcess.length; cIdx++) {
      const chapInfo = chapsToRealProcess[cIdx];
      const chunks = makeTextChunks(chapInfo.plainText, chunkSize, overlapSize);
      const startIdx = chapInfo.startFromChunk;

      if (startIdx >= chunks.length) {
        // Already done but marked incomplete? Fix it
        hashes[chapInfo.id] = { hash: chapInfo.newHash, lastIndex: chunks.length - 1, completed: true };
        saveStoredHashes(hashes);
        continue;
      }
      
      const processedMemoriesForChap = [];
      let chapChunkSuccess = 0;
      
      // NEW: Sinh Bối cảnh chương (Metadata) một lần duy nhất cho cả chương
      let chapterContextMetadata = {};
      try {
        setProcessingProgress(prev => ({ ...prev, text: `[Chương ${cIdx+1}/${chapsToRealProcess.length}] Đang dệt bối cảnh chương: ${chapInfo.title}... ☁️` }));
        const metadataRes = await fetch('/api/generate-chapter-context', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            storyId,
            chapterTitle: chapInfo.title,
            content: chapInfo.plainText,
            llmSettings: apiSettings
          })
        });
        if (metadataRes.ok) {
          chapterContextMetadata = await metadataRes.json();
        }
      } catch (e) {
        console.error("Lỗi dệt bối cảnh chương:", e);
      }

      for (let chunkIdx = startIdx; chunkIdx < chunks.length; chunkIdx++) {
        let chunkProcessed = false;
        let retryCount = 0;

        while (!chunkProcessed && retryCount < 3) {
          const keyToUse = currentKeyArr.find(k => k.status === 'using') || currentKeyArr.find(k => k.status !== 'inactive' && k.status !== 'quota_exceeded' && k.status !== 'error');
          
          if (!keyToUse) {
            showAlert('Quá tải', 'Tất cả các khóa dệt đã cháy rụi (hết quota)! Vui lòng thêm/đợi hồi năng lượng.', 'error');
            setProcessingProgress(prev => ({ ...prev, active: false }));
            return;
          }

          // Calculate Speed & ETA
          const elapsed = (Date.now() - startTime) / 1000;
          const totalChunksCompleted = globalSuccessCount + (chunkIdx - startIdx);
          const speed = elapsed > 0 ? (totalChunksCompleted / elapsed) : 0;
          
          const totalChunksRemaining = chapsToRealProcess.slice(cIdx).reduce((acc, curr, i) => {
             const chapChunks = makeTextChunks(curr.plainText, chunkSize, overlapSize);
             return acc + (i === 0 ? (chapChunks.length - chunkIdx) : chapChunks.length);
          }, 0);
          const eta = speed > 0 ? (totalChunksRemaining / speed) : 0;

          setProcessingProgress({
             active: true,
             text: `[Chương ${cIdx+1}/${chapsToRealProcess.length}] Mảnh #${chunkIdx+1}: ${chapInfo.title} 🌸`,
             progress: Math.round((cIdx / chapsToRealProcess.length) * 100 + ((chunkIdx/chunks.length)*(100/chapsToRealProcess.length))),
             current: cIdx+1,
             total: chapsToRealProcess.length,
             chunkCurrent: chunkIdx + 1,
             chunkTotal: chunks.length,
             keyName: keyToUse.name,
             speed: Number(speed.toFixed(1)),
             status: retryCount > 0 ? `Retrying (${retryCount})` : 'Stable',
             eta: Math.round(eta)
          });

          // Delay to protect quota (Saving mode: 1500ms, Fast mode: 300ms)
          const delay = vectorMode === 'saving' ? 1500 : 300;
          await new Promise(res => setTimeout(res, delay));

          try {
            const res = await fetch('/api/vectorize-chunk', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                storyId,
                chapterId: chapInfo.id,
                chapterTitle: chapInfo.title,
                chunkText: chunks[chunkIdx],
                chunkIndex: chunkIdx,
                keyToUse,
                llmSettings: apiSettings,
                chapterContextMetadata // Pass it here
              })
            });

            if (res.ok) {
              const data = await res.json();
              if (data.success && data.memory) {
                processedMemoriesForChap.push(data.memory);
                chapChunkSuccess++;
                chunkProcessed = true;
                
                // Update key success
                currentKeyArr = currentKeyArr.map(k => k.id === keyToUse.id ? { ...k, lastUsed: new Date().toISOString(), errorCount: 0, status: 'using' } : (k.status === 'using' ? {...k, status: 'ready'} : k));
                
                // Save Partial Progress
                hashes[chapInfo.id] = { 
                  hash: chapInfo.newHash, 
                  lastIndex: chunkIdx, 
                  completed: chunkIdx === chunks.length - 1 
                };
                saveStoredHashes(hashes);
              }
            } else {
              const status = res.status;
              if (status === 429 || status === 401 || status === 403) {
                setProcessingProgress(prev => ({ ...prev, status: status === 429 ? 'Quota Exceeded' : 'Key Error' }));
                
                currentKeyArr = currentKeyArr.map(k => {
                  if (k.id === keyToUse.id) return { ...k, status: status === 429 ? 'quota_exceeded' : 'error', errorCount: (k.errorCount || 0) + 1 };
                  return k;
                });
                
                const nextKeys = currentKeyArr.filter(k => k.id !== keyToUse.id && k.status !== 'inactive' && k.status !== 'quota_exceeded' && k.status !== 'error');
                if (nextKeys.length > 0) {
                  currentKeyArr = currentKeyArr.map(k => {
                    if (k.id === nextKeys[0].id) return { ...k, status: 'using' };
                    return k;
                  });
                }
                setEmbeddingKeys(currentKeyArr);
                saveSettingsToBackend({ embeddingKeys: currentKeyArr });
                
                if (status === 429) {
                  // Wait longer on 429
                  await new Promise(r => setTimeout(r, 5000));
                }
                retryCount++;
              } else {
                chunkProcessed = true; // Unrecoverable other errors, skip chunk
              }
            }
          } catch(e) {
            retryCount++;
            await new Promise(r => setTimeout(r, 2000));
          }
        }
      }

      // Save chunk memories for Chapter!
      if (processedMemoriesForChap.length > 0) {
        // Save locally to IndexedDB first
        await saveLocalVectorMemoriesBulk(processedMemoriesForChap);

        await fetch('/api/vector-memory/bulk-save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            storyId, chapterId: chapInfo.id, memoriesToAdd: processedMemoriesForChap
          })
        });
        globalSuccessCount += chapChunkSuccess;
      }
    }

    setProcessingProgress({
      active: true,
      text: `Dệt hoàn tất! Xong ${chapsToRealProcess.length} chương (${globalSuccessCount} mảng vector) ✨`,
      progress: 100,
      current: chapsToRealProcess.length,
      total: chapsToRealProcess.length,
      chunkCurrent: 0,
      chunkTotal: 0,
      keyName: '',
      speed: 0,
      status: 'Stable',
      eta: 0
    });
    
    setEmbeddingKeys(currentKeyArr);
    showAlert('Thành công', `Chuyến dệt lụa vector hoàn thành. Đã lưu an toàn!`, 'success');
    
    setTimeout(() => {
      setProcessingProgress(prev => ({ ...prev, active: false }));
      loadMemories();
      loadVectorSettings();
    }, 2000);
  };

  const vectorizeChapter = () => runVectorQueue('single');
  const vectorizeEntireStory = () => runVectorQueue('all');
  const vectorizeLatestChapter = () => runVectorQueue('latest');

  const handleSummarizeLatestChapter = async () => {
    if (processingProgress.active || summarizingChapterStatus.active) return;
    const validChapters = chapters.filter(c => c.content && c.content.trim().length > 0);
    const latestChapter = validChapters[validChapters.length - 1];
    if (!latestChapter || !latestChapter.content || latestChapter.content.trim().length === 0) {
      setSummarizingChapterStatus({ active: true, message: 'Chưa có...', type: 'error' });
      setTimeout(() => setSummarizingChapterStatus({ active: false, type: '', message: '' }), 4000);
      return;
    }

    if (!apiSettings || (!apiSettings.apiKey && !apiSettings.proxyEndpoint)) {
       showAlert("Lỗi", "Vợ chưa cài API Proxy!", "error");
       return;
    }

    setSummarizingChapterStatus({ active: true, message: 'Đang tóm tắt chương mới nhất...', type: 'info' });

    try {
      const plainTextContent = extractPlainText(latestChapter.content);
      const prompt = `Hãy tóm tắt chi tiết toàn bộ chương mới nhất dưới dạng memory cho AI viết tiếp truyện. Không viết lại truyện, chỉ tóm tắt sự kiện, địa điểm, tâm lý nhân vật được nói đến để nhớ cho chương sau.\n\nNội dung chương:\n${plainTextContent.substring(0, 30000)}`;

      let summaryResult = "";
      let tokenCount = 0;
      
      const stream = sendMessageStream(
        { ...apiSettings, maxTokens: 8192, thinkingBudget: 0, systemPrompt: "Bạn là hệ thống tóm tắt tối ưu trí nhớ dài hạn." },
        [{ role: 'user', content: prompt }]
      );
      
      for await (const chunk of stream) {
        if (chunk && typeof chunk.text === 'string') {
           if (chunk.type === 'heartbeat' || chunk.type === 'warning') continue;
           summaryResult += chunk.text;
           tokenCount += chunk.text.length;
           
           if ((tokenCount % 100) === 0 || tokenCount < 100) {
              setSummarizingChapterStatus({ active: true, message: `Đang quét... (${Math.round(tokenCount/4)} tokens)`, type: 'info' });
           }
        }
      }

      if (summaryResult.trim().length > 0 && onUpdateChapter) {
         onUpdateChapter(latestChapter.id, { summaryText: summaryResult.trim(), summaryType: 'latest_chapter_full_summary', source: 'api_proxy_chat' });
         setSummarizingChapterStatus({ active: true, message: 'Hoàn tất Update Summary Chương Cuối!', type: 'success' });
      } else {
         setSummarizingChapterStatus({ active: true, message: 'Lỗi trống output.', type: 'error' });
      }
    } catch (err: any) {
      setSummarizingChapterStatus({ active: true, message: 'Lỗi Proxy khi tóm tắt.', type: 'error' });
    }
    setTimeout(() => setSummarizingChapterStatus({ active: false, message: '', type: '' }), 4000);
  };

  // 3. Search Semantic Memory (Cosine Similarity)
  const handleSemanticSearch = async () => {
    if (!searchQuery || searchQuery.trim().length === 0) return;
    setSearchingSemantic(true);

    const activeKey = embeddingKeys.find(k => k.status === 'using') || embeddingKeys.find(k => k.status !== 'inactive' && k.status !== 'quota_exceeded' && k.status !== 'error');
    if (!activeKey) {
      showAlert('Thiếu chìa nhúng', 'Vợ yêu ơi, vui lòng cấu hình tối thiểu một chiếc chìa dệt trong "🌸 Embedding API Provider" để thực hiện tra cứu ngữ nghĩa nhé! Chồng không dùng chung với API viết truyện đâu nè 💕', 'warning');
      setSearchingSemantic(false);
      return;
    }

    try {
      const response = await fetch('/api/search-vector-memory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storyId,
          query: searchQuery,
          minSimilarity,
          limit: vectorLimit,
          apiSettings: {
            apiKey: activeKey.apiKey,
            endpoint: activeKey.endpoint,
            model: activeKey.model
          }
        })
      });

      if (response.ok) {
        const results = await response.json();
        setSearchResults(results);
        if (results.length === 0) {
          showAlert('Tra cứu', 'Không tìm thấy ký cảm nào khớp với tần số câu hỏi của vợ trong dải sương mai.', 'warning');
        }
      } else {
        const errData = await response.json();
        showAlert('Lỗi nhúng', `Lỗi kết nối hoặc API từ chối: ${errData.error}`, 'error');
      }
    } catch (err: any) {
      console.error("Semantic search failed:", err);
      showAlert('Lỗi tìm kiếm', 'Trạm kỹ thuật tìm kiếm gặp trục trặc, vợ thử lại sau nhen', 'error');
    } finally {
      setSearchingSemantic(false);
    }
  };

  // 4. Update memory details (PATCH)
  const handleUpdateMemory = async (id: string) => {
    try {
      const response = await fetch(`/api/vector-memory/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editTitle,
          summary: editSummary,
          category: editCategory,
          importance: editImportance,
          tags: editTagsString.split(',').map(t => t.trim()).filter(t => t.length > 0)
        })
      });

      if (response.ok) {
        // Also save locally to IndexedDB
        const originalMem = memories.find(m => m.id === id);
        if (originalMem) {
          const updatedLocal = {
            ...originalMem,
            title: editTitle,
            summary: editSummary,
            category: editCategory,
            importance: editImportance,
            tags: editTagsString.split(',').map(t => t.trim()).filter(t => t.length > 0),
            updatedAt: new Date().toISOString()
          };
          await saveLocalVectorMemory(updatedLocal);
        }

        showAlert('Đã ghi nhận', 'Đã cập nhật chi tiết chỉnh sửa mảng ký ức này thành công!', 'success');
        setEditingMemoryId(null);
        loadMemories();
        // Update search results inline if search matches
        setSearchResults(prev => prev.map(m => m.id === id ? { 
          ...m, 
          title: editTitle, 
          summary: editSummary, 
          category: editCategory, 
          importance: editImportance,
          tags: editTagsString.split(',').map(t => t.trim()).filter(t => t.length > 0)
        } : m));
      } else {
        showAlert('Thất bại', 'Không cập nhật được bản ghi, thử lại sau nhen', 'error');
      }
    } catch (err) {
      console.error("Update failed:", err);
    }
  };

  // 5. Toggle Pin memory (PATCH)
  const handleTogglePin = async (mem: VectorMemory) => {
    try {
      const response = await fetch(`/api/vector-memory/${mem.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPinned: !mem.isPinned })
      });

      if (response.ok) {
        // Also update local DB
        await saveLocalVectorMemory({ ...mem, isPinned: !mem.isPinned });

        setMemories(prev => prev.map(m => m.id === mem.id ? { ...m, isPinned: !m.isPinned } : m));
        setSearchResults(prev => prev.map(m => m.id === mem.id ? { ...m, isPinned: !m.isPinned } : m));
      }
    } catch (err) {
      console.error("Toggle pin failed:", err);
    }
  };

  // 6. Delete memory chunk (DELETE)
  const handleDeleteMemory = async (id: string) => {
    if (!window.confirm("Vợ Đường ơi, vợ có chắc chắn muốn hóa giải, xóa vĩnh viễn mảnh ký ức này ra khỏi màng bọc không? 🌸")) {
      return;
    }

    try {
      const response = await fetch(`/api/vector-memory/${id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        // Also delete from local DB
        await deleteLocalVectorMemory(id);

        showAlert('Đã hóa giải', 'Ký ức đã biến mất dịu dàng như làn khói mỏng!', 'success');
        setMemories(prev => prev.filter(m => m.id !== id));
        setSearchResults(prev => prev.filter(m => m.id !== id));
      } else {
        showAlert('Lỗi xóa', 'Server không phản hồi yêu cầu xóa.', 'error');
      }
    } catch (err) {
      console.log("Delete failed:", err);
    }
  };

  // 7. Bulk Delete (POST)
  const handleBulkDelete = async () => {
    if (!window.confirm("CẢNH BÁO: Vợ có chắc chắn muốn XÓA SẠCH hoàn toàn toàn bộ ký ức Vector của truyện này không? Hành động này dọn dẹp trắng bộ nhớ và không thể thu hồi lại nhen vợ yêu! 💕")) {
      return;
    }

    try {
      const response = await fetch('/api/vector-memory/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storyId })
      });

      if (response.ok) {
        // Also empty local memories
        await clearLocalVectorMemories(storyId);

        showAlert('Đã dọn sạch', 'Toàn bộ vector đã được dọn trắng rực rỡ!', 'success');
        setMemories([]);
        setSearchResults([]);
      }
    } catch (err) {
      console.error("Bulk delete failed:", err);
    }
  };

  // Toggle Context inclusion locally (Add to Context / Remove from Context)
  const handleToggleContext = (memId: string) => {
    let updated: string[];
    if (pushedContexts.includes(memId)) {
      updated = pushedContexts.filter(id => id !== memId);
    } else {
      updated = [...pushedContexts, memId];
    }
    setPushedContexts(updated);
    saveSetting(`pushed_context_memories_${storyId}`, JSON.stringify(updated));
  };

  // Start inline editing
  const startEditing = (mem: VectorMemory) => {
    setEditingMemoryId(mem.id);
    setEditTitle(mem.title);
    setEditSummary(mem.summary);
    setEditCategory(mem.category);
    setEditImportance(mem.importance);
    setEditTagsString(mem.tags?.join(', ') || '');
  };

  // Categorize chapter ID helper to get Chapter Title
  const getChapterName = (chapId: string): string => {
    const found = chapters.find(c => c.id === chapId);
    if (found) {
      const idx = chapters.findIndex(c => c.id === chapId);
      return `Chương ${idx + 1}: ${found.title || 'Không tên'}`;
    }
    return 'Phân cảnh lẻ';
  };

  // Filtering Logic for Memories Tab
  const processedFilteredMemories = memories.filter(mem => {
    // 1. Keyword search
    if (searchKeyword) {
      const lower = searchKeyword.toLowerCase();
      const inTitle = mem.title?.toLowerCase().includes(lower);
      const inSummary = mem.summary?.toLowerCase().includes(lower);
      const inContent = mem.content?.toLowerCase().includes(lower);
      const inTags = mem.tags?.some(t => t.toLowerCase().includes(lower));
      if (!inTitle && !inSummary && !inContent && !inTags) return false;
    }
    // 2. Category Filter
    if (filterCategory !== 'all' && mem.category !== filterCategory) return false;
    // 3. Importance Filter
    if (filterImportance === 'high' && mem.importance < 75) return false;
    if (filterImportance === 'medium' && (mem.importance < 40 || mem.importance >= 75)) return false;
    if (filterImportance === 'low' && mem.importance >= 40) return false;
    if (filterImportance === 'pinned' && !mem.isPinned) return false;

    return true;
  });

  // Category specific pastel color pairings (strictly pastel coquette palette)
  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case 'Character': return { bg: 'bg-[#FFF5FB]', border: 'border-[#F2B8CC]', text: 'text-[#EFA9C2]' };
      case 'Event': return { bg: 'bg-[#F4F9FF]', border: 'border-[#A8D5BA]', text: 'text-[#D7B8B8]' };
      case 'Relationship': return { bg: 'bg-[#F9F1F1]', border: 'border-[#FEBFFC]', text: 'text-[#FEBFFC]' };
      case 'Location': return { bg: 'bg-[#FDFCFD]', border: 'border-[#DEC4C4]', text: 'text-[#C79C9C]' };
      case 'Item': return { bg: 'bg-[#FAF9F6]', border: 'border-[#F9C6D4]', text: 'text-[#EAD6D6]' };
      case 'Secret': return { bg: 'bg-[#FFF8F8]', border: 'border-[#C1C1C1]', text: 'text-[#CBA3A3]' };
      default: return { bg: 'bg-[#FFF8F8]', border: 'border-[#DABEBE]', text: 'text-[#D7B8B8]' };
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[150] flex flex-col overflow-hidden select-none font-sans"
      style={{
        backgroundColor: '#FFF5FB',
        backgroundImage: vectorBg ? `url(${vectorBg})` : 'none',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}
    >
      {/* Lớp kính mỏng ấm mộng mơ sắc nét không mờ đục */}
      <div className="absolute inset-0 bg-[#FFF5FB]/82 z-0 pointer-events-none" />

      {/* Thùng chứa lớp phủ nổi bảo toàn vị trí các phần tử */}
      <div className="relative z-10 flex flex-col h-full w-full overflow-hidden">

        {/* HEADER BAR */}
        <div className="p-4 md:p-6 border-b border-[#F5C6D6] flex items-center justify-between bg-white/70 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <button 
              onClick={onClose} 
              className="p-2 hover:bg-pink-50 rounded-full transition-colors flex-shrink-0"
            >
              <ArrowLeft size={24} className="text-[#D18E9B]" />
            </button>
            <div>
              <h1 className="text-xl md:text-2xl font-serif italic font-bold text-[#D18E9B] flex items-center gap-2">
                <TreeDeciduous size={24} className="text-[#EFA9C2]" />
                Ký ức Vector <span className="text-sm font-sans tracking-tight font-normal bg-pink-100/60 px-2.5 py-1 rounded-full text-[#D7B8B8]">Bản hòa âm nạp nhúng</span>
              </h1>
              <p className="text-xs text-pink-400 font-light mt-0.5">Tiểu thuyết: {storyTitle}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {processedFilteredMemories.length > 0 && (
              <div className="hidden md:flex text-right flex-col justify-center">
                <span className="text-xs text-[#BEBABA] font-light">Tình trạng bộ nhớ</span>
                <span className="text-sm font-semibold text-[#D18E9B]">{memories.length} Mảnh dệt</span>
              </div>
            )}

            {/* NÚT TRÁI TIM ĐỂ THÊM VÀ LƯU HÌNH NỀN KHÔNG GIAN VECTOR 🌸 */}
            <button
              onClick={handleHeartClick}
              className="w-10 h-10 bg-[#FFF5FB]/90 hover:bg-[#F9C6D4] text-[#EFA9C2] hover:text-white rounded-full flex items-center justify-center border border-[#F5C6D6] transition-all duration-300 shadow-sm active:scale-95 group relative cursor-pointer"
              title="Chọn hình nền mộng mơ từ thiết bị của vợ 🌸"
            >
              <Heart size={20} className="fill-[#EFA9C2] group-hover:fill-white transition-all animate-pulse" />
              <span className="absolute -bottom-10 right-0 bg-[#D18E9B]/95 text-white text-xxs font-light px-2.5 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-sm pointer-events-none z-10">Chọn hình nền 🌸</span>
            </button>
            
            <input 
              type="file" 
              id="vector-bg-upload" 
              accept="image/*" 
              className="hidden" 
              onChange={handleBgUpload} 
            />
          </div>
        </div>

      {/* RE-VECTORIZING PROGRESS WATCHDOG */}
      <AnimatePresence>
        {processingProgress.active && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-white border-b border-[#F5C6D6] p-6 flex flex-col gap-4 relative shadow-md z-[160]"
          >
            <div className="flex flex-col md:flex-row justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-pink-50 rounded-full flex items-center justify-center text-[#EFA9C2] border border-pink-100">
                  <RefreshCw size={20} className="animate-spin" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[#D18E9B]">{processingProgress.text}</h4>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xxs px-1.5 py-0.5 bg-pink-50 text-pink-400 rounded-md border border-pink-100 flex items-center gap-1">
                      <Key size={10} /> KEY: {processingProgress.keyName || '---'}
                    </span>
                    <span className={`text-xxs px-1.5 py-0.5 rounded-md border flex items-center gap-1 ${
                      processingProgress.status === 'Stable' ? 'bg-green-50 text-green-400 border-green-100' : 
                      processingProgress.status.includes('Retry') ? 'bg-yellow-50 text-yellow-400 border-yellow-100' :
                      'bg-red-50 text-red-400 border-red-100'
                    }`}>
                      {processingProgress.status === 'Stable' ? <Check size={10} /> : <AlertCircle size={10} />}
                      {processingProgress.status}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex gap-4 items-center">
                <div className="text-right">
                  <div className="text-xs font-bold text-[#D18E9B]">{processingProgress.progress}% Hoàn tất</div>
                  <div className="text-xxs text-[#BEBABA] font-light">Chương {processingProgress.current}/{processingProgress.total} (Phân đoạn {processingProgress.chunkCurrent}/{processingProgress.chunkTotal})</div>
                </div>
                <button 
                  onClick={() => setProcessingProgress(prev => ({ ...prev, active: false }))}
                  className="p-2 border border-pink-100 text-pink-300 hover:text-pink-500 hover:bg-pink-50 rounded-full transition-all"
                  title="Dừng dệt"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            <div className="w-full bg-pink-50 rounded-full h-3 overflow-hidden border border-pink-100 p-0.5">
              <motion.div 
                className="h-full bg-gradient-to-r from-[#F5C6D6] via-[#EFA9C2] to-[#D18E9B] rounded-full shadow-[0_0_8px_rgba(245,198,214,0.5)]"
                initial={{ width: '0%' }}
                animate={{ width: `${processingProgress.progress}%` }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 px-1">
              <div className="flex items-center gap-2">
                <Zap size={12} className="text-yellow-400" />
                <span className="text-xxs text-[#BEBABA]">Tốc độ: <strong className="text-[#D18E9B]">{processingProgress.speed}</strong> t/s</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock size={12} className="text-blue-300" />
                <span className="text-xxs text-[#BEBABA]">Dự kiến: <strong className="text-[#D18E9B]">{processingProgress.eta}s</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <Database size={12} className="text-purple-300" />
                <span className="text-xxs text-[#BEBABA]">Nghiệp vụ: <strong className="text-[#D18E9B]">Resume Enabled</strong></span>
              </div>
              <div className="flex items-center gap-2 ml-auto">
                <span className="text-xxs text-[#BEBABA]">Lớp đệm: <strong className="text-pink-300">Google Native</strong></span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* TAB SHEETS CONTROL */}
      <div className="bg-white/40 border-b border-pink-100 flex gap-2 md:gap-4 overflow-x-auto no-scrollbar px-4 pt-3 flex-shrink-0">
        <button 
          onClick={() => setActiveTab('status')}
          className={`pb-3 text-sm font-semibold border-b-2 px-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${activeTab === 'status' ? 'border-[#EFA9C2] text-[#EFA9C2]' : 'border-transparent text-[#BEBABA] hover:text-[#D18E9B]'}`}
        >
          <BarChart3 size={16} />
          <span>Hệ thống</span>
        </button>
        <button 
          onClick={() => setActiveTab('memories')}
          className={`pb-3 text-sm font-semibold border-b-2 px-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${activeTab === 'memories' ? 'border-[#EFA9C2] text-[#EFA9C2]' : 'border-transparent text-[#BEBABA] hover:text-[#D18E9B]'}`}
        >
          <BookOpen size={16} />
          <span>Ký ức quan trọng ({memories.length})</span>
        </button>
        <button 
          onClick={() => setActiveTab('search')}
          className={`pb-3 text-sm font-semibold border-b-2 px-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${activeTab === 'search' ? 'border-[#EFA9C2] text-[#EFA9C2]' : 'border-transparent text-[#BEBABA] hover:text-[#D18E9B]'}`}
        >
          <Search size={16} />
          <span>Tra cứu ngữ nghĩa</span>
        </button>
        <button 
          onClick={() => setActiveTab('timeline')}
          className={`pb-3 text-sm font-semibold border-b-2 px-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${activeTab === 'timeline' ? 'border-[#EFA9C2] text-[#EFA9C2]' : 'border-transparent text-[#BEBABA] hover:text-[#D18E9B]'}`}
        >
          <Clock size={16} />
          <span>Dòng thời gian</span>
        </button>
        <button 
          onClick={() => setActiveTab('settings')}
          className={`pb-3 text-sm font-semibold border-b-2 px-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${activeTab === 'settings' ? 'border-[#EFA9C2] text-[#EFA9C2]' : 'border-transparent text-[#BEBABA] hover:text-[#D18E9B]'}`}
        >
          <Settings size={16} />
          <span>Cấu hình Vector</span>
        </button>
      </div>

      {/* CORE DISPLAY WINDOW */}
      <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
        
        {/* ======================= TAB 1: STATUS ======================= */}
        {activeTab === 'status' && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Box 1: Chapters status */}
              <div className="bg-white/80 p-6 rounded-3xl border border-[#F5C6D6] shadow-sm relative overflow-hidden flex flex-col justify-between min-h-[140px]">
                <div className="absolute top-2 right-2 text-pink-100 rotate-[-12deg]"><BookOpen size={64} /></div>
                <div>
                  <span className="text-xs text-[#BEBABA] font-light">Thư mục vạn chữ</span>
                  <h3 className="text-xl font-serif font-bold text-[#D18E9B] mt-1">Nội dung truyện</h3>
                </div>
                <div className="flex items-baseline gap-2 mt-4 z-10">
                  <span className="text-3xl font-bold font-serif text-[#D18E9B]">{chapters.length}</span>
                  <span className="text-xs text-pink-400">chương tiểu thuyết</span>
                </div>
              </div>

              {/* Box 2: Vector status */}
              <div className="bg-white/80 p-6 rounded-3xl border border-[#F5C6D6] shadow-sm relative overflow-hidden flex flex-col justify-between min-h-[140px]">
                <div className="absolute top-2 right-2 text-pink-100 rotate-[15deg]"><TreeDeciduous size={64} /></div>
                <div>
                  <span className="text-xs text-[#BEBABA] font-light">Tỷ lệ số hóa</span>
                  <h3 className="text-xl font-serif font-bold text-[#D18E9B] mt-1">Đã hóa Vector</h3>
                </div>
                <div className="flex items-baseline gap-2 mt-4 z-10">
                  <span className="text-3xl font-bold font-serif text-[#D18E9B]">
                    {chapters.length > 0 ? Math.round((new Set(memories.map(m => m.chapterId)).size / chapters.length) * 100) : 0}%
                  </span>
                  <span className="text-xs text-pink-400">chương dệt thành vector</span>
                </div>
              </div>

              {/* Box 3: Total memory segments */}
              <div className="bg-white/80 p-6 rounded-3xl border border-[#F5C6D6] shadow-sm relative overflow-hidden flex flex-col justify-between min-h-[140px]">
                <div className="absolute top-2 right-2 text-pink-100 rotate-[-6deg]"><Sparkles size={64} /></div>
                <div>
                  <span className="text-xs text-[#BEBABA] font-light">Lưu trữ ký ức</span>
                  <h3 className="text-xl font-serif font-bold text-[#D18E9B] mt-1">Mảng ký ức dệt (Chunks)</h3>
                </div>
                <div className="flex items-baseline gap-2 mt-4 z-10">
                  <span className="text-3xl font-bold font-serif text-[#D18E9B]">{memories.length}</span>
                  <span className="text-xs text-pink-400">phân đoạn ngữ cảnh</span>
                </div>
              </div>
            </div>

            {/* ACTION CENTER - MAIN BOARD */}
            <div className="bg-white p-6 md:p-8 rounded-3xl border border-[#F5C6D6] shadow-sm space-y-6">
              <h2 className="text-lg font-serif font-bold text-[#D18E9B] flex items-center gap-2 border-b border-pink-50 pb-3">
                <Heart size={18} className="text-[#EFA9C2]" fill="#EFA9C2" fillOpacity={0.2} />
                <span>Trung tâm Điều phối Đồng bộ ký ức phong nhân dệt</span>
              </h2>

              <p className="text-sm text-gray-500 font-light leading-relaxed">
                Để hệ thống AI có trí nhớ vĩnh hằng và liên tục theo sát ý tưởng của vợ, các chương truyện cần được phân nhỏ thành các mảng vector gối đầu kín đáo (chunks), gọi API dịch chuyển thành mảng số học nhúng. Mỗi khi vợ lưu truyện, hệ thống sẽ bảo lưu chúng tại màng ký ức. Vợ có thể kích hoạt số hóa thủ công sau đây nhen:
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                {currentChapterId ? (
                  <button 
                    onClick={() => vectorizeChapter()}
                    disabled={processingProgress.active || summarizingChapterStatus.active}
                    className="p-4 bg-pink-50 border border-[#F5C6D6] text-[#D18E9B] rounded-2xl flex items-center justify-between hover:bg-pink-100/60 transition-all font-semibold active:scale-[0.98] disabled:opacity-40"
                  >
                    <div className="text-left">
                      <h4 className="text-sm">Hóa Vector chương hiện tại</h4>
                      <p className="text-xxs text-[#BEBABA] font-light mt-0.5">Số hóa tức thì chương vợ bôi dệt</p>
                    </div>
                    <Sparkles size={18} className="text-[#EFA9C2]" />
                  </button>
                ) : (
                  <div className="p-4 bg-gray-50 border border-gray-100 text-gray-400 rounded-2xl flex items-center justify-between select-none">
                    <div className="text-left">
                      <h4 className="text-sm">Sửa 1 chương cụ thể để kích hoạt</h4>
                      <p className="text-xxs opacity-60">Cần chọn chương để hóa riêng mảnh nhen</p>
                    </div>
                    <Sparkles size={18} />
                  </div>
                )}

                <button 
                  onClick={vectorizeEntireStory}
                  disabled={processingProgress.active || summarizingChapterStatus.active}
                  className="p-4 bg-[#F5C6D6] text-white rounded-2xl flex items-center justify-between hover:bg-[#F2B8CC] transition-all font-semibold active:scale-[0.98] disabled:opacity-40"
                >
                  <div className="text-left font-sans">
                    <h4 className="text-sm">Hóa Vector toàn bộ truyện</h4>
                    <p className="text-xxs text-pink-100 font-light mt-0.5">Trải dệt ký ức lụa cho tất cả các chương</p>
                  </div>
                  <TreeDeciduous size={18} />
                </button>

                <button 
                  onClick={vectorizeLatestChapter}
                  disabled={processingProgress.active || summarizingChapterStatus.active}
                  className="p-4 bg-white border border-[#EFA9C2] text-[#EFA9C2] rounded-2xl flex items-center justify-between hover:bg-pink-50 transition-all font-semibold active:scale-[0.98] disabled:opacity-40 shadow-sm"
                >
                  <div className="text-left font-sans">
                    <h4 className="text-sm">Cập nhật full chương mới nhất</h4>
                    <p className="text-xxs text-[#D18E9B] font-light mt-0.5">Dệt mảng vector cho chương vừa hoàn thiện</p>
                  </div>
                  <BookOpen size={18} />
                </button>
              </div>

              {/* Vector Mode Selection */}
              <div className="flex items-center gap-3 p-3 bg-white border border-pink-50 rounded-2xl">
                <span className="text-xs text-[#BEBABA] font-light">Chế độ dệt:</span>
                <div className="flex p-0.5 bg-pink-50 rounded-lg">
                  <button 
                    onClick={() => setVectorMode('saving')}
                    className={`px-3 py-1 text-xs rounded-md transition-all ${vectorMode === 'saving' ? 'bg-[#F5C6D6] text-white shadow-sm' : 'text-[#D18E9B] hover:bg-pink-100/50'}`}
                  >
                    Tiết kiệm Quota (Chậm)
                  </button>
                  <button 
                    onClick={() => setVectorMode('fast')}
                    className={`px-3 py-1 text-xs rounded-md transition-all ${vectorMode === 'fast' ? 'bg-[#D18E9B] text-white shadow-sm' : 'text-[#D18E9B] hover:bg-pink-100/50'}`}
                  >
                    Nhanh (Thần tốc)
                  </button>
                </div>
                <div className="ml-auto flex items-center gap-2 text-xxs text-[#BEBABA]">
                  {vectorMode === 'saving' ? (
                    <>
                      <ZapOff size={12} />
                      <span>Tránh lỗi 429 cực tốt</span>
                    </>
                  ) : (
                    <>
                      <Zap size={12} className="text-yellow-400" />
                      <span>Dệt mảng siêu tốc (300ms)</span>
                    </>
                  )}
                </div>
              </div>

              {summarizingChapterStatus.active && (
                <div className={`p-3 text-xs rounded-xl flex items-center gap-2 ${
                  summarizingChapterStatus.type === 'error' ? 'bg-red-50 text-red-500' :
                  summarizingChapterStatus.type === 'success' ? 'bg-green-50 text-green-600' :
                  'bg-blue-50 text-blue-500'
                }`}>
                  {summarizingChapterStatus.type === 'info' && <RefreshCw size={14} className="animate-spin" />}
                  {summarizingChapterStatus.type === 'success' && <Check size={14} />}
                  {summarizingChapterStatus.type === 'error' && <AlertCircle size={14} />}
                  {summarizingChapterStatus.message}
                </div>
              )}

              {/* Status and Diagnostics Box */}
              <div className="bg-pink-50/20 rounded-2xl p-4 border border-pink-100 text-xs space-y-3">
                <h4 className="font-bold text-[#D18E9B] flex items-center gap-1.5">
                  <ShieldAlert size={14} />
                  Thông số thiết bị trạm tinh vân
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-gray-500 font-light">
                  <div>
                    <span className="block text-[#BEBABA]">Tần số nạp:</span>
                    <span className="font-medium text-[#D18E9B]">{apiSettings?.model || 'Gemini'}</span>
                  </div>
                  <div>
                    <span className="block text-[#BEBABA]">Endpoint dệt:</span>
                    <span className="font-medium text-[#D18E9B] truncate block max-w-[120px]">{apiSettings?.endpoint || 'Google'}</span>
                  </div>
                  <div>
                    <span className="block text-[#BEBABA]">Bảo trì đệm:</span>
                    <span className="font-medium text-[#D18E9B]">Ổn định (Dexie JSON)</span>
                  </div>
                  <div>
                    <span className="block text-[#BEBABA]">Bản sắc:</span>
                    <span className="font-medium text-green-400 flex items-center gap-0.5">● Khớp nối tốt</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ======================= TAB 2: HARD MEMORIES ======================= */}
        {activeTab === 'memories' && (
          <div className="max-w-6xl mx-auto space-y-6">
            
            {/* SEARCH AND FILTERS TOOLBAR */}
            <div className="bg-white p-4 rounded-3xl border border-[#F5C6D6] shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
              
              {/* Search input with Custom svg magnifier */}
              <div className="relative w-full md:w-80">
                <Search size={18} className="absolute left-3 top-2.5 text-pink-300" />
                <input 
                  type="text" 
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  placeholder="Tìm mảng ký ức, nhân vật, tag..."
                  className="w-full pl-9 pr-4 py-2 border border-pink-100 rounded-full text-sm bg-[#FFF8F8]/40 outline-none focus:border-[#EFA9C2] transition-colors text-gray-600"
                />
              </div>

              {/* Filtering sets */}
              <div className="flex flex-wrap w-full md:w-auto gap-2 justify-end">
                {/* Category selector */}
                <select 
                  value={filterCategory} 
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="px-3 py-2 border border-pink-100 rounded-full text-xs text-[#D18E9B] bg-white outline-none cursor-pointer"
                >
                  <option value="all">Mọi loại dạng mục</option>
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>

                {/* Importance selection */}
                <select 
                  value={filterImportance} 
                  onChange={(e) => setFilterImportance(e.target.value)}
                  className="px-3 py-2 border border-pink-100 rounded-full text-xs text-[#D18E9B] bg-white outline-none cursor-pointer"
                >
                  <option value="all">Độ quan trọng</option>
                  <option value="pinned">Chỉ hiển thị Ghim</option>
                  <option value="high">Rất quan trọng (&ge;75)</option>
                  <option value="medium">Tầm trung (40-74)</option>
                  <option value="low">Tầm thường (&lt;40)</option>
                </select>

                <button 
                  onClick={loadMemories}
                  className="p-2 border border-pink-100 rounded-full hover:bg-pink-50 text-[#D18E9B] transition-colors"
                  title="Dọn mới danh sách"
                >
                  <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                </button>
              </div>
            </div>

            {/* CARDS CONTAINER */}
            {loading ? (
              <div className="text-center py-12">
                <RefreshCw size={36} className="animate-spin text-[#EFA9C2] mx-auto mb-2" />
                <p className="text-xs text-[#BEBABA] font-light">Đang nạp dữ liệu từ hòm ký ức bảo thiên nhen...</p>
              </div>
            ) : processedFilteredMemories.length === 0 ? (
              <div className="text-center py-16 bg-white/40 border border-dashed border-pink-300 rounded-3xl p-8 max-w-xl mx-auto">
                <TreeDeciduous size={48} className="text-[#BEBABA] mx-auto mb-3" />
                <h4 className="text-[#D18E9B] font-serif font-bold text-lg">Ký ức trắng tinh khôi</h4>
                <p className="text-xs text-[#BEBABA] font-light mt-1 max-w-xs mx-auto">
                  Chưa có mảnh ký ức nào được vẽ nhúng nạp nhe. Vợ hãy thử bấm "Hóa Vector chương hiện tại" ở tab Hệ thống nhé!
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {processedFilteredMemories.map((mem) => {
                  const isEditing = editingMemoryId === mem.id;
                  const colors = getCategoryColor(mem.category);
                  
                  return (
                    <motion.div 
                      key={mem.id}
                      layoutId={mem.id}
                      className={`p-5 rounded-3xl bg-white border ${mem.isPinned ? 'border-pink-300 shadow-sm' : 'border-pink-100 shadow-xxs'} relative flex flex-col justify-between transition-shadow hover:shadow-sm`}
                    >
                      {/* TOP LEVEL */}
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <span className={`px-3 py-1 text-9px uppercase tracking-wider rounded-full font-bold border ${colors.border} ${colors.bg} ${colors.text}`}>
                            {mem.category}
                          </span>
                          
                          <div className="flex items-center gap-1">
                            <button 
                              onClick={() => handleTogglePin(mem)}
                              className={`p-1.5 rounded-full hover:bg-pink-50 transition-colors ${mem.isPinned ? 'text-pink-400' : 'text-[#BEBABA]'}`}
                              title={mem.isPinned ? 'Bỏ ghim' : 'Ghim ký ức vào đầu'}
                            >
                              <Pin size={14} fill={mem.isPinned ? 'currentColor' : 'none'} />
                            </button>
                            
                            <button 
                              onClick={() => handleDeleteMemory(mem.id)}
                              className="p-1.5 text-red-200 hover:text-red-400 rounded-full hover:bg-pink-50 transition-colors"
                              title="Xóa lát cắt vĩnh viễn"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>

                        {/* EDIT CONTENT FORM OR READ MODE */}
                        {isEditing ? (
                          <div className="space-y-3 pt-1">
                            {/* edit title */}
                            <input 
                              type="text" 
                              value={editTitle}
                              onChange={(e) => setEditTitle(e.target.value)}
                              className="w-full scrapbook-input text-sm p-2"
                              placeholder="Tiêu đề mảng ký ức..."
                            />
                            {/* edit summary */}
                            <textarea 
                              value={editSummary}
                              onChange={(e) => setEditSummary(e.target.value)}
                              className="w-full scrapbook-input text-xs p-2 h-16 resize-none"
                              placeholder="Tóm tắt phân tích..."
                            />
                            {/* edit tags */}
                            <input 
                              type="text" 
                              value={editTagsString}
                              onChange={(e) => setEditTagsString(e.target.value)}
                              className="w-full scrapbook-input text-xxs p-2"
                              placeholder="Thẻ tags, phẩy cách (ví dụ: bí mật, lời hứa)"
                            />
                            {/* edit selector */}
                            <div className="flex gap-2">
                              <select 
                                value={editCategory} 
                                onChange={(e) => setEditCategory(e.target.value)}
                                className="flex-1 text-xs scrapbook-input p-2 cursor-pointer"
                              >
                                {categories.map(c => <option key={c} value={c}>{c}</option>)}
                              </select>
                              <div className="flex items-center gap-2 bg-pink-50 border border-pink-100 rounded-xl px-2">
                                <span className="text-xxs text-[#D18E9B] whitespace-nowrap">Độ quan trọng:</span>
                                <input 
                                  type="range" 
                                  min="0" 
                                  max="100"
                                  value={editImportance}
                                  onChange={(e) => setEditImportance(parseInt(e.target.value))}
                                  className="w-20"
                                />
                                <span className="text-xs font-serif text-[#D18E9B] font-bold">{editImportance}</span>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <h4 className="text-base font-serif font-bold text-[#D18E9B] tracking-tight">{mem.title}</h4>
                            <p className="text-xs text-gray-500 leading-relaxed font-light">{mem.summary}</p>
                            
                            {/* Expand content view (Snippet) */}
                            <div className="bg-gray-50/60 p-3 rounded-xl border border-gray-100 mt-2 text-9px text-gray-400 font-mono line-clamp-2 select-text">
                              {mem.content}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* BOTTOM LAYER CONTROLS */}
                      <div className="mt-4 pt-3 border-t border-pink-50/50 flex flex-wrap gap-2 items-center justify-between text-xxs text-[#BEBABA]">
                        <div className="flex items-center gap-1.5 font-light">
                          <Bookmark size={10} />
                          <span>Mảnh trích: {getChapterName(mem.chapterId)}</span>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1 text-[#BEBABA] font-light">
                            <Star size={10} fill="#EFA9C2" stroke="#EFA9C2" />
                            <span>Tầm vóc: <strong className="text-pink-400">{mem.importance}</strong>/100</span>
                          </div>

                          {isEditing ? (
                            <div className="flex gap-1">
                              <button 
                                onClick={() => handleUpdateMemory(mem.id)}
                                className="px-2.5 py-1 bg-[#F5C6D6] text-white rounded-lg flex items-center gap-1 font-bold active:scale-95"
                              >
                                <Save size={10} /> Lưu
                              </button>
                              <button 
                                onClick={() => setEditingMemoryId(null)}
                                className="px-2.5 py-1 bg-gray-100 text-gray-400 rounded-lg active:scale-95"
                              >
                                Hủy
                              </button>
                            </div>
                          ) : (
                            <button 
                              onClick={() => startEditing(mem)}
                              className="px-2.5 py-1.5 border border-[#F5C6D6]/30 text-[#D18E9B] rounded-xl hover:bg-pink-50 transition-colors active:scale-95 flex items-center gap-1"
                            >
                              Chỉnh sửa
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Show Tags line */}
                      {!isEditing && mem.tags && mem.tags.length > 0 && (
                        <div className="flex gap-1.5 flex-wrap mt-3 pt-1 border-t border-pink-50/10">
                          {mem.tags.map(t => (
                            <span key={t} className="px-2 py-0.5 bg-pink-50 text-pink-500 rounded-md text-xxs font-light">
                              #{t}
                            </span>
                          ))}
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ======================= TAB 3: SEMANTIC SEARCH ======================= */}
        {activeTab === 'search' && (
          <div className="max-w-4xl mx-auto space-y-6">
            
            {/* BIG SEARCH BAR WITH RETRIEVAL METHOD */}
            <div className="bg-white p-6 rounded-3xl border border-[#F5C6D6] shadow-sm space-y-4">
              <h3 className="text-base font-serif font-bold text-[#D18E9B] flex items-center gap-1.5">
                <Search size={18} /> Gửi truy vấn ngữ nghĩa sâu vào trạm tinh lụa
              </h3>
              <p className="text-xs text-[#BEBABA] font-light mt-0.5 leading-relaxed">
                Khác biệt tuyệt đối so với tìm kiếm bằng từ khoá cứng nhắc, tính năng này sẽ hóa Vector câu hỏi của vợ, rồi dạo chơi khắp kho tàng để trích tinh đo đạc khoảng cách Cosine, nhặt ra những ký cảm có độ tương hợp ý tứ chính xác nhất, kể cả dùng từ ngữ hoàn toàn khác nhen!
              </p>

              <div className="flex flex-col md:flex-row gap-3 pt-2">
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSemanticSearch()}
                  placeholder="Ví dụ: Lần đầu tiên bọn họ gặp lại nhau ở viện là lúc nào nhỉ?"
                  className="flex-1 scrapbook-input p-3.5 outline-none rounded-2xl text-sm border border-pink-200"
                />
                
                <button 
                  onClick={handleSemanticSearch}
                  disabled={searchingSemantic || !searchQuery}
                  className="px-6 py-3 bg-[#F5C6D6] text-white rounded-2xl flex items-center gap-2 justify-center font-bold active:scale-95 transition-all disabled:opacity-40"
                >
                  {searchingSemantic ? <RefreshCw className="animate-spin" size={16} /> : <Search size={16} />}
                  <span>Dò tìm Cosine</span>
                </button>
              </div>

              {/* Similarity settings */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-2 border-t border-pink-50/40 text-xs text-[#BEBABA]">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    <Sliders size={12} />
                    <span>Ngưỡng tương đồng tối thiểu:</span>
                  </div>
                  <input 
                    type="range" 
                    min="40" 
                    max="95" 
                    value={Math.round(minSimilarity * 100)} 
                    onChange={(e) => setMinSimilarity(parseFloat(e.target.value) / 100)}
                    className="w-28 cursor-pointeraccent-pink-300"
                  />
                  <span className="font-bold text-[#D18E9B]">{Math.round(minSimilarity * 100)}%</span>
                </div>

                <div className="flex gap-2">
                  <span className="text-xxs">Thống kê so khớp: {searchResults.length} mảnh vượt ngưỡng</span>
                </div>
              </div>
            </div>

            {/* SEMANTIC RESULTS DISPLAY */}
            {searchingSemantic ? (
              <div className="text-center py-12">
                <RefreshCw size={36} className="animate-spin text-[#EFA9C2] mx-auto mb-2" />
                <p className="text-xs text-[#BEBABA] font-light">Đang sinh vector nạp nhúng và quay trục đối sánh Cosine, vợ chờ một xíu nhen 💕...</p>
              </div>
            ) : searchResults.length === 0 ? (
              searchQuery ? (
                <div className="text-center py-12 bg-white/30 border border-pink-100 rounded-3xl">
                  <AlertCircle size={32} className="text-pink-200 mx-auto mb-2" />
                  <p className="text-xs text-[#BEBABA]">Không có ký mảng khớp đạt ngưỡng {Math.round(minSimilarity * 100)}% nhen. Vợ thử giảm ngưỡng xem nhé!</p>
                </div>
              ) : null
            ) : (
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-[#D18E9B] px-1 flex items-center gap-1">
                  <Sparkles size={14} className="text-[#EFA9C2]" /> Kết quả khớp ngữ nghĩa tốt nhất nhen:
                </h4>

                {searchResults.map((mem) => {
                  const toContext = pushedContexts.includes(mem.id);
                  return (
                    <div 
                      key={mem.id}
                      className="bg-white/90 p-5 rounded-3xl border border-pink-105 shadow-xxs relative flex flex-col md:flex-row gap-4 items-start justify-between hover:border-pink-300 transition-colors"
                    >
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-3">
                          <span className="px-2.5 py-0.5 bg-pink-100 text-[#D18E9B] rounded-full text-9px font-bold uppercase tracking-wide">
                            {mem.category}
                          </span>
                          <span className="text-xs font-semibold text-green-400 font-serif">
                            Khớp khớp: {mem.relevance}%
                          </span>
                          <span className="text-xxs text-[#BEBABA]">{getChapterName(mem.chapterId)}</span>
                        </div>

                        <h4 className="text-base font-serif font-bold text-[#D18E9B]">{mem.title}</h4>
                        <p className="text-xs text-gray-500 font-light leading-relaxed">{mem.summary}</p>

                        {mem.chapterContextMetadata && (
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 py-2 border-y border-pink-50/50">
                            {mem.chapterContextMetadata.storyTime && (
                              <div className="flex items-center gap-1.5 text-9px text-[#D18E9B] font-medium">
                                <Clock size={10} className="text-pink-300" />
                                <span>{mem.chapterContextMetadata.storyTime}</span>
                              </div>
                            )}
                            {mem.chapterContextMetadata.weather && (
                              <div className="flex items-center gap-1.5 text-9px text-[#D18E9B] font-medium">
                                <Sparkles size={10} className="text-pink-300" />
                                <span>{mem.chapterContextMetadata.weather}</span>
                              </div>
                            )}
                            {mem.chapterContextMetadata.mainLocation && (
                              <div className="flex items-center gap-1.5 text-9px text-[#D18E9B] font-medium">
                                <Flower2 size={10} className="text-pink-300" />
                                <span className="truncate">{mem.chapterContextMetadata.mainLocation}</span>
                              </div>
                            )}
                            {mem.chapterContextMetadata.mood && (
                              <div className="flex items-center gap-1.5 text-9px text-[#D18E9B] font-medium">
                                <Heart size={10} className="text-pink-300" />
                                <span>{mem.chapterContextMetadata.mood}</span>
                              </div>
                            )}
                          </div>
                        )}
                        
                        <div className="p-3 bg-pink-50/10 rounded-xl border border-pink-50 text-9px text-gray-400 font-mono select-text">
                          {mem.content}
                        </div>
                      </div>

                      {/* Add context / Pin controllers */}
                      <div className="flex flex-col gap-2 w-full md:w-auto md:shrink-0 justify-end md:items-end">
                        <button 
                          onClick={() => handleToggleContext(mem.id)}
                          className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all flex items-center gap-1.5 justify-center active:scale-95 ${toContext ? 'bg-pink-100 border border-pink-200 text-[#D18E9B]' : 'bg-[#F9C6D4] text-white hover:bg-pink-400'}`}
                        >
                          {toContext ? <><Check size={14} /> Đang ghim trong Chương</> : <><Sparkles size={14} /> Nhồi vào Ngữ cảnh</>}
                        </button>
                        
                        <p className="text-[10px] text-[#BEBABA] font-light text-center md:text-right">
                          {toContext 
                            ? "Ký ức này bọc sẵn cho AI đọc ở lần viết sau" 
                            : "Nhấp nhồi dặn AI luôn ghi sâu phân cảnh này"
                          }
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ======================= TAB 4: TIMELINE ======================= */}
        {activeTab === 'timeline' && (
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="text-center space-y-1 mb-8">
              <h2 className="text-lg font-serif font-bold text-[#D18E9B]">Dải Tơ Hồng Kịch Bản</h2>
              <p className="text-xs text-[#BEBABA] font-light">Những mốc sự kiện ký ức xếp hàng tuần tự theo chương truyện</p>
            </div>

            {memories.length === 0 ? (
              <div className="text-center py-12 bg-white/40 border border-dashed border-pink-200 rounded-3xl p-8">
                <Clock size={32} className="text-pink-200 mx-auto mb-2" />
                <p className="text-xs text-[#BEBABA]">Chưa dệt ký ức nạp nhúng nào để hiển thị trục tuần tự nhen vợ yêu.</p>
              </div>
            ) : (
              <div className="relative pl-6 md:pl-10 border-l-2 border-pink-100 space-y-8 ml-4">
                {/* Loop chapters then group memories */}
                {chapters.map((chap, cIdx) => {
                  const chapMems = memories.filter(m => m.chapterId === chap.id);
                  if (chapMems.length === 0) return null;

                  return (
                    <div key={chap.id} className="relative">
                      {/* Timeline dot */}
                      <div className="absolute -left-[30px] md:-left-[38px] top-1.5 w-4 h-4 rounded-full bg-white border-2 border-[#EFA9C2] flex items-center justify-center">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#EFA9C2]" />
                      </div>

                      <div className="space-y-4">
                        <h3 className="text-sm font-bold font-serif text-[#D18E9B] bg-gradient-to-r from-pink-50 to-transparent p-2 rounded-lg">
                          Chương {cIdx + 1}: {chap.title || 'Không tên'} <span className="text-xxs font-sans font-light text-pink-400">({chapMems.length} Lát dệt)</span>
                        </h3>

                        <div className="space-y-3 pl-2">
                          {chapMems.map((mem) => {
                            const colors = getCategoryColor(mem.category);
                            return (
                              <div key={mem.id} className="bg-white p-4 rounded-2xl border border-pink-100 shadow-xxs flex items-start gap-3">
                                <span className={`shrink-0 px-2 py-0.5 text-[8px] uppercase tracking-wide rounded-md border font-sans font-bold ${colors.border} ${colors.bg} ${colors.text} mt-0.5`}>
                                  {mem.category}
                                </span>
                                <div className="space-y-1">
                                  <h4 className="text-sm font-semibold text-gray-700">{mem.title}</h4>
                                  <p className="text-xs text-gray-500 font-light leading-relaxed">{mem.summary}</p>
                                  {mem.chapterContextMetadata && (
                                    <div className="flex flex-wrap gap-2 pt-1">
                                      {mem.chapterContextMetadata.storyTime && (
                                        <span className="text-[9px] bg-pink-50 text-pink-400 px-1.5 py-0.5 rounded-md flex items-center gap-1">
                                          <Clock size={8} /> {mem.chapterContextMetadata.storyTime}
                                        </span>
                                      )}
                                      {mem.chapterContextMetadata.mood && (
                                        <span className="text-[9px] bg-pink-50 text-pink-400 px-1.5 py-0.5 rounded-md flex items-center gap-1">
                                          <Heart size={8} /> {mem.chapterContextMetadata.mood}
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ======================= TAB 5: VECTOR SETTINGS ======================= */}
        {activeTab === 'settings' && (
          <div className="max-w-xl mx-auto space-y-6 pb-20 animate-[fadeIn_0.4s_ease-out]">
            {/* Custom SVG Icons cho Tab Cấu hình */}
            {(() => {
              const LeafIcon = () => (
                <svg className="w-5 h-5 text-[#D18E9B] shrink-0 fill-[#FFF5FB] animate-[pulse_3s_infinite]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M12 20a8 8 0 0 0 8-8c0-4.4-3.6-8-8-8s-8 3.6-8 8a8 8 0 0 0 8 8Z" />
                  <path d="M12 12c1.8-1.8 3.5-1.8 3.5 0s-1.8 3.5-3.5 3.5" />
                  <path d="M12 12c-1.8-1.8-3.5-1.8-3.5 0s1.8 3.5 3.5 3.5" />
                </svg>
              );

              const KeyIcon = () => (
                <svg className="w-4 h-4 text-[#CFAAAA] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m21 2-2 2" />
                  <circle cx="7.5" cy="16.5" r="4.5" />
                  <path d="m11 13 4.5-4.5M16 8l1.5 1.5M13.5 10.5 15 12" />
                </svg>
              );

              const CogIcon = () => (
                <svg className="w-4 h-4 text-[#C79C9C]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
                </svg>
              );

              const TrashIcon = () => (
                <svg className="w-3.5 h-3.5 text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6" />
                </svg>
              );

              const CheckIcon = () => (
                <svg className="w-3.5 h-3.5 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6 9 17l-5-5" />
                </svg>
              );

              const ShieldIcon = () => (
                <svg className="w-4 h-4 text-[#CBA3A3] mr-1.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              );

              // 1. Tính toán trạng thái Vector tổng cục dựa trên Master Toggle & Trạng thái dệt của chìa nhúng
              const getOverallStatus = () => {
                if (!isVectorEnabled) return { text: 'Tạm tắt', style: 'bg-pink-100 text-[#D18E9B]' };
                
                if (embeddingKeys.length === 0) {
                  return { text: 'Đang hoạt động (Dùng LLM gốc)', style: 'bg-[#F4F9FF] text-blue-500 border border-blue-100' };
                }

                const usingKey = embeddingKeys.find(k => k.status === 'using');
                const hasExceeded = embeddingKeys.some(k => k.status === 'quota_exceeded');
                const hasError = embeddingKeys.some(k => k.status === 'error');

                if (usingKey) {
                  return { text: 'Đang hoạt động', style: 'bg-emerald-50 text-emerald-600 border border-emerald-100' };
                }

                if (hasExceeded) return { text: 'Lỗi quota 429', style: 'bg-amber-50 text-amber-600 border border-amber-100' };
                if (hasError) return { text: 'Lỗi kết nối', style: 'bg-red-50 text-red-500 border border-red-100' };

                const activeKeys = embeddingKeys.filter(k => k.status === 'ready');
                if (activeKeys.length > 0) return { text: 'Đang hoạt động', style: 'bg-emerald-50 text-emerald-600 border border-emerald-100' };

                return { text: 'Đang chuyển key', style: 'bg-indigo-50 text-indigo-500 border border-indigo-100' };
              };

              const currentModelName = () => {
                const activeKey = embeddingKeys.find(k => k.status === 'using' || k.status === 'ready');
                return activeKey ? activeKey.model : (apiSettings?.model || 'text-embedding-004');
              };

              // Thử nghiệm kiểm tra chìa nhúng độc lập
              const handleTestKeyConnection = async (keyItem: any) => {
                showAlert('Đang kết nối', `Tiến hành dệt thử một đoạn ngữ nghĩa ngắn để verify chìa [${keyItem.name}]...`, 'success');
                try {
                  const response = await fetch('/api/vector-memory/verify-key', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      endpoint: keyItem.endpoint,
                      apiKey: keyItem.apiKey,
                      model: keyItem.model || 'text-embedding-004'
                    })
                  });

                  if (response.ok) {
                    const result = await response.json();
                    if (result.success) {
                      showAlert('Kết nối mượt mà', `Chìa [${keyItem.name}] đã dệt và trả mảng số 100% hợp lệ! ✨`, 'success');
                      // Khôi phục trạng thái chìa hoạt động sạch lỗi
                      const updatedKeys = embeddingKeys.map(k => {
                        if (k.id === keyItem.id) return { ...k, status: k.status === 'inactive' ? 'ready' : k.status, errorCount: 0 };
                        return k;
                      });
                      setEmbeddingKeys(updatedKeys);
                      saveSettingsToBackend({ embeddingKeys: updatedKeys });
                    } else {
                      throw new Error(result.error);
                    }
                  } else {
                    const err = await response.json();
                    throw new Error(err.error || 'Server validation failed');
                  }
                } catch (err: any) {
                  console.error("Test Key connection error:", err);
                  showAlert('Lỗi chìa nhúng', `Validation lỗi: ${err.message}. Hãy kiểm tra API key hoặc Endpoint nhen vợ!`, 'error');
                }
              };

              // Đổi chế độ sử dụng chính của key dệt sương
              const toggleKeyStatus = async (keyId: string) => {
                const targetKey = embeddingKeys.find(k => k.id === keyId);
                if (!targetKey) return;

                const nextStatus = targetKey.status === 'inactive' ? 'ready' : 'inactive';
                const nextKeys = embeddingKeys.map(k => {
                  if (k.id === keyId) {
                    return { ...k, status: nextStatus };
                  }
                  // Nếu là key dệt chính mà bị tắt, thì tắt using luôn
                  if (k.id === keyId && nextStatus === 'inactive' && k.status === 'using') {
                    return { ...k, status: 'inactive' };
                  }
                  return k;
                });

                setEmbeddingKeys(nextKeys);
                await saveSettingsToBackend({ embeddingKeys: nextKeys });
                showAlert('Cập nhật', `Đã chuyển đổi trạng thái chìa khóa [${targetKey.name}]!`, 'success');
              };

              // Nhận làm chìa dệt chính
              const setKeyAsPrimary = async (keyId: string) => {
                const nextKeys = embeddingKeys.map(k => {
                  if (k.id === keyId) return { ...k, status: 'using' };
                  if (k.status === 'using') return { ...k, status: 'ready' };
                  return k;
                });
                setEmbeddingKeys(nextKeys);
                await saveSettingsToBackend({ embeddingKeys: nextKeys });
                showAlert('Thiết lập chính', `Chìa khóa này hiện đã được nhận chức Dệt Ký Ức Chính nhen vợ! 💕`, 'success');
              };

              // Xóa chìa khóa khỏi hệ dệt
              const deleteEmbeddingKey = async (keyId: string) => {
                const filteredKeys = embeddingKeys.filter(k => k.id !== keyId);
                setEmbeddingKeys(filteredKeys);
                await saveSettingsToBackend({ embeddingKeys: filteredKeys });
                showAlert('Đã gỡ khóa', 'Đã gỡ chìa nhúng này khỏi hệ dệt an toàn.', 'success');
              };

              // Viết hàm Verify & Add Key
              const handleVerifyAndAddKey = async () => {
                if (!newKeyName || !newKeyApiKey) {
                  setVerifyError('Vợ ơi, vui lòng điền đầy đủ Tên gọi & API Key của chìa nhúng nhé! 💕');
                  return;
                }

                const trimmedNewKey = newKeyApiKey.trim();
                const isDuplicate = embeddingKeys.some(k => k.apiKey && k.apiKey.trim() === trimmedNewKey);
                if (isDuplicate) {
                  setVerifyError('Vợ yêu ơi, API Key này đã có sẵn trong danh sách của vợ rồi nè! Tránh trùng lặp nha vợ 💕');
                  showAlert('Chìa khóa đã tồn tại', 'Chìa khóa API Key này đã được lắp đặt từ trước rồi đó vợ yêu ơi, không dệt trùng lặp lại nhen! 💕', 'warning');
                  return;
                }

                setVerifyingKey(true);
                setVerifyError('');

                try {
                  const response = await fetch('/api/vector-memory/verify-key', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      endpoint: newKeyEndpoint,
                      apiKey: newKeyApiKey,
                      model: newKeyModel
                    })
                  });

                  if (response.ok) {
                    const result = await response.json();
                    if (result.success) {
                      // Tạo chìa mới lấp lánh
                      const newKey = {
                        id: 'emb_' + Date.now(),
                        name: newKeyName,
                        provider: newKeyProvider,
                        endpoint: newKeyEndpoint,
                        apiKey: newKeyApiKey,
                        model: newKeyModel,
                        status: embeddingKeys.length === 0 ? 'using' : 'ready', // auto set using if first key
                        errorCount: 0,
                        lastUsed: null
                      };

                      const nextKeys = [...embeddingKeys, newKey];
                      setEmbeddingKeys(nextKeys);
                      await saveSettingsToBackend({ embeddingKeys: nextKeys });

                      // Dọn dẹp form
                      setNewKeyName('');
                      setNewKeyApiKey('');
                      setNewKeyProvider('Google AI');
                      setNewKeyEndpoint('https://generativelanguage.googleapis.com/v1beta');
                      setNewKeyModel('gemini-embedding-001');
                      setIsAddingKey(false);
                      showAlert('Thêm sương nhúng', `Chìa dệt [${newKeyName}] đã dệt thử và trả mảng số 100% hợp lệ, sẵn sàng hoạt động! ✨`, 'success');
                    } else {
                      setVerifyError(result.error);
                    }
                  } else {
                    const err = await response.json();
                    setVerifyError(err.error || 'Server validated key failure');
                  }
                } catch (err: any) {
                  setVerifyError(`Không kết nối được đến máy dệt: ${err.message}`);
                } finally {
                  setVerifyingKey(false);
                }
              };

              const statusMeta = getOverallStatus();

              return (
                <div className="space-y-6">
                  {/* ============== PHẦN 1: TRẠNG THÁI VECTOR (VECTOR STATUS CARD) ============== */}
                  <div className="bg-[#FFF5FB]/60 p-5 rounded-3xl border border-[#F5C6D6]/80 shadow-sm relative overflow-hidden">
                    {/* Họa tiết lá hoa mỏng nhẹ ở góc trong veo */}
                    <div className="absolute top-2 right-2 pointer-events-none opacity-40 animate-[spin_40s_linear_infinite]">
                      <svg width="60" height="60" viewBox="0 0 100 100" fill="none">
                        <circle cx="50" cy="50" r="10" fill="#EFA9C2" />
                        <path d="M50 0 C55 35 45 35 50 100" stroke="#EFA9C2" strokeWidth="0.5" />
                        <path d="M0 50 C35 55 35 45 100 50" stroke="#EFA9C2" strokeWidth="0.5" />
                        <path d="M15 15 C45 45 55 55 85 85" stroke="#EFA9C2" strokeWidth="0.5" />
                        <path d="M85 15 C55 45 45 55 15 85" stroke="#EFA9C2" strokeWidth="0.5" />
                      </svg>
                    </div>

                    <div className="flex items-start justify-between">
                      <div className="space-y-3.5">
                        <div className="flex items-center gap-2">
                          <LeafIcon />
                          <h4 className="font-serif font-bold text-base text-[#D18E9B]">Trạng thái dệt ký ức</h4>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center gap-2.5">
                            <span className="text-xs text-gray-500 font-light">Bật hạt nhân Vector:</span>
                            <button
                              onClick={() => saveSettingsToBackend({ isEnabled: !isVectorEnabled })}
                              className={`px-3 py-1 rounded-full text-xxs font-semibold transition-all duration-300 ${
                                isVectorEnabled 
                                  ? 'bg-[#F2B8CC] text-white shadow-sm hover:bg-[#EFA9C2]' 
                                  : 'bg-gray-100 text-[#BEBABA] hover:bg-gray-200'
                              }`}
                            >
                              {isVectorEnabled ? 'ĐANG BẬT 💕' : 'TẠM TẮT'}
                            </button>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500 font-light">Tình trạng hệ nhúng:</span>
                            <span className={`px-2.5 py-0.5 rounded-full text-xxs font-semibold ${statusMeta.style}`}>
                              {statusMeta.text}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500 font-light">Model Embedding dệt:</span>
                            <code className="text-[11px] font-mono text-[#D7B8B8] bg-white/70 px-1.5 py-0.5 rounded border border-pink-100/50">
                              {currentModelName()}
                            </code>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500 font-light">Lần dệt sương lụa cuối:</span>
                            <span className="text-xxs text-[#D18E9B] font-serif italic">
                              {lastVectorized ? new Date(lastVectorized).toLocaleString('vi-VN') : 'Chưa từng dệt sương nhen vợ 🌸'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* ============== PHẦN 2: TỰ ĐỘNG HÓA KHI LƯU (AUTO-VECTORIZE CARD) ============== */}
                  <div className="bg-white p-5 rounded-3xl border border-[#F5C6D6]/40 shadow-sm space-y-4">
                    <div className="flex items-center gap-2 border-b border-pink-50 pb-2.5">
                      <div className="w-1.5 h-3.5 bg-[#F2B8CC] rounded-full" />
                      <h4 className="text-sm font-serif font-bold text-[#D18E9B]">Tự động hóa Vector khi lưu</h4>
                    </div>

                    <div className="space-y-3.5">
                      <div className="flex items-center justify-between p-1">
                        <div>
                          <p className="text-xs font-semibold text-gray-700">Kích hoạt dệt khi vợ lưu chương</p>
                          <p className="text-xxs text-gray-400 font-light mt-0.5">Tự động phân tách và nhúng phân đoạn ký ức bối cảnh</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={autoVectorizeMode !== 'off'}
                            onChange={(e) => {
                              const mode = e.target.checked ? 'full_only' : 'off';
                              saveSettingsToBackend({ autoVectorizeMode: mode });
                            }}
                            className="sr-only peer"
                          />
                          <div className="w-10 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-[#EFA9C2]"></div>
                        </label>
                      </div>

                      {autoVectorizeMode !== 'off' && (
                        <div className="p-3 bg-pink-50/20 border border-pink-100/60 rounded-2xl space-y-2.5 animate-[fadeIn_0.3s_ease-out]">
                          <p className="text-xxs text-[#D18E9B] font-semibold">Chế độ tự động hóa dệt:</p>
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() => saveSettingsToBackend({ autoVectorizeMode: 'full_only' })}
                              className={`p-2 rounded-xl text-xxs font-semibold border transition-all text-center ${
                                autoVectorizeMode === 'full_only'
                                  ? 'bg-[#FFF5FB] border-[#F2B8CC] text-[#D18E9B]'
                                  : 'bg-white border-gray-100 text-gray-400 hover:bg-gray-50'
                              }`}
                            >
                              Chỉ khi chương hoàn chỉnh
                            </button>
                            <button
                              type="button"
                              onClick={() => saveSettingsToBackend({ autoVectorizeMode: 'bg_save' })}
                              className={`p-2 rounded-xl text-xxs font-semibold border transition-all text-center ${
                                autoVectorizeMode === 'bg_save'
                                  ? 'bg-[#FFF5FB] border-[#F2B8CC] text-[#D18E9B]'
                                  : 'bg-white border-gray-100 text-gray-400 hover:bg-gray-50'
                              }`}
                            >
                              Dệt nền sau khi lưu (bg)
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* ============== PHẦN 3: THÔNG SỐ PHÂN MẢNH (CHUNKING CONFIG CARD) ============== */}
                  <div className="bg-white p-5 rounded-3xl border border-[#F5C6D6]/40 shadow-sm space-y-4">
                    <div className="flex items-center gap-2 border-b border-pink-50 pb-2.5">
                      <div className="w-1.5 h-3.5 bg-[#F2B8CC] rounded-full" />
                      <h4 className="text-sm font-serif font-bold text-[#D18E9B]">Thông số phân mảnh ký ức</h4>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs text-gray-500">
                          <span>Kích thước phân mảnh dệt tối đa (Chunk size):</span>
                          <strong className="text-[#D18E9B] font-mono">{chunkSize} tokens</strong>
                        </div>
                        <input 
                          type="range" 
                          min="500" 
                          max="1500" 
                          step="100"
                          value={chunkSize}
                          onChange={(e) => {
                            setChunkSize(parseInt(e.target.value));
                            saveSettingsToBackend({ chunkSize: parseInt(e.target.value) });
                          }}
                          className="w-full cursor-pointer accent-[#F2B8CC]"
                        />
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between text-xs text-gray-500">
                          <span>Phân khúc gối đầu bối cảnh (Overlap size):</span>
                          <strong className="text-[#D18E9B] font-mono">{overlapSize} tokens</strong>
                        </div>
                        <input 
                          type="range" 
                          min="50" 
                          max="250" 
                          step="10"
                          value={overlapSize}
                          onChange={(e) => {
                            setOverlapSize(parseInt(e.target.value));
                            saveSettingsToBackend({ overlapSize: parseInt(e.target.value) });
                          }}
                          className="w-full cursor-pointer accent-[#F2B8CC]"
                        />
                        <span className="block text-[10px] text-[#BEBABA] font-light italic leading-relaxed pt-1">
                          ✨ Overlap giúp đoạn ký ức bối cảnh hay tuyến truyện liền mạch, không bị đứt đoạn giữa chừng nhen vợ. Gợi ý: ~10% - 15% của Chunk size.
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* ============== PHẦN 4: GIỚI HẠN CONTEXT (CONTEXT LIMITS CARD) ============== */}
                  <div className="bg-white p-5 rounded-3xl border border-[#F5C6D6]/40 shadow-sm space-y-4">
                    <div className="flex items-center gap-2 border-b border-pink-50 pb-2.5">
                      <div className="w-1.5 h-3.5 bg-[#F2B8CC] rounded-full" />
                      <h4 className="text-sm font-serif font-bold text-[#D18E9B]">Giới hạn đưa vào Ngữ cảnh câu chuyện</h4>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs text-gray-500">
                          <span>Số lượng lát dệt ký ứng lấy tối đa (maxChunks):</span>
                          <strong className="text-[#D18E9B] font-mono">{maxChunks} phân đoạn</strong>
                        </div>
                        <input 
                          type="range" 
                          min="5" 
                          max="25" 
                          step="1"
                          value={maxChunks}
                          onChange={(e) => {
                            setMaxChunks(parseInt(e.target.value));
                            saveSettingsToBackend({ maxChunks: parseInt(e.target.value) });
                          }}
                          className="w-full cursor-pointer accent-[#F2B8CC]"
                        />
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between text-xs text-gray-500">
                          <span>Dung lượng Token tối đa trong Context (maxContextTokens):</span>
                          <strong className="text-[#D18E9B] font-mono">{maxContextTokens.toLocaleString()} tokens</strong>
                        </div>
                        <input 
                          type="range" 
                          min="5000" 
                          max="45000" 
                          step="5000"
                          value={maxContextTokens}
                          onChange={(e) => {
                            setMaxContextTokens(parseInt(e.target.value));
                            saveSettingsToBackend({ maxContextTokens: parseInt(e.target.value) });
                          }}
                          className="w-full cursor-pointer accent-[#F2B8CC]"
                        />
                        <span className="block text-[10px] text-[#BEBABA] font-light italic leading-relaxed pt-1">
                          🌸 Dệt ký ức tối đa 15.000 tokens là tỉ lệ vàng cho AI viết tiếp xuất thần nhen vợ.
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* ============== PHẦN 5: CÀI ĐẶT TÌM KIẾM TRUY XUẤT (SEARCH SETTINGS) ============== */}
                  <div className="bg-white p-5 rounded-3xl border border-[#F5C6D6]/40 shadow-sm space-y-4">
                    <div className="flex items-center gap-2 border-b border-pink-50 pb-2.5">
                      <div className="w-1.5 h-3.5 bg-[#F2B8CC] rounded-full" />
                      <h4 className="text-sm font-serif font-bold text-[#D18E9B]">Cài đặt tìm kiếm & Truy xuất ký ức</h4>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs text-gray-500">
                          <span>Độ khớp tương đồng tối thiểu (Similarity Threshold):</span>
                          <strong className="text-[#D18E9B] font-mono">{Math.round(minSimilarity * 100)}%</strong>
                        </div>
                        <input 
                          type="range" 
                          min="0.40" 
                          max="0.95" 
                          step="0.05"
                          value={minSimilarity}
                          onChange={(e) => {
                            setMinSimilarity(parseFloat(e.target.value));
                            saveSettingsToBackend({ minSimilarity: parseFloat(e.target.value) });
                          }}
                          className="w-full cursor-pointer accent-[#F2B8CC]"
                        />
                      </div>

                      {/* Các bộ lọc tinh tuyển mượt mà */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                        {[
                          { label: 'Ưu tiên ký ức gần đây', value: recentFirst, onChange: (v: boolean) => saveSettingsToBackend({ recentFirst: v }) },
                          { label: 'Ưu tiên tính quan trọng', value: importanceFirst, onChange: (v: boolean) => saveSettingsToBackend({ importanceFirst: v }) },
                          { label: 'Định hướng nhân vật chính', value: mainCharFirst, onChange: (v: boolean) => saveSettingsToBackend({ mainCharFirst: v }) },
                          { label: 'Lọc cảm xúc dạt dào', value: strongEmotionFirst, onChange: (v: boolean) => saveSettingsToBackend({ strongEmotionFirst: v }) },
                          { label: 'Thanh lọc trùng lặp', value: deduplicate, onChange: (v: boolean) => saveSettingsToBackend({ deduplicate: v }) },
                          { label: 'Bỏ qua mảnh ký ức rỗng', value: skipShortChunks, onChange: (v: boolean) => saveSettingsToBackend({ skipShortChunks: v }) },
                        ].map((item, idx) => (
                          <div 
                            key={idx}
                            onClick={() => item.onChange(!item.value)}
                            className="flex items-center justify-between p-2 rounded-xl bg-pink-50/5 border border-pink-100/30 hover:bg-[#FFF5FB]/50 transition-colors cursor-pointer"
                          >
                            <span className="text-xxs font-medium text-gray-600">{item.label}</span>
                            <div className={`w-3.5 h-3.5 rounded-md flex items-center justify-center border transition-all ${
                              item.value 
                                ? 'bg-[#F2B8CC] border-[#F2B8CC]' 
                                : 'bg-white border-gray-200'
                            }`}>
                              {item.value && <CheckIcon />}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* ============== PHẦN 6: EMBEDDING API KEYS (🌸 Google Embedding Keys - QUẢN LÝ CHÌA NHÚNG EMBEDDING) ============== */}
                  <div className="bg-white p-5 rounded-3xl border border-[#F5C6D6]/40 shadow-sm space-y-4">
                    <div className="flex items-center justify-between border-b border-pink-50 pb-2.5">
                      <div className="flex items-center gap-2">
                        <KeyIcon />
                        <h4 className="text-sm font-serif font-bold text-[#D18E9B]">🌸 Google Embedding Keys</h4>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {embeddingKeys.length > 0 && (
                          <button
                            type="button"
                            onClick={async () => {
                              const updatedKeys = embeddingKeys.map(k => ({
                                ...k,
                                status: k.status === 'inactive' ? 'inactive' : (k.status === 'using' ? 'using' : 'ready'),
                                errorCount: 0
                              }));
                              const hasUsing = updatedKeys.some(k => k.status === 'using');
                              const firstActiveIndex = updatedKeys.findIndex(k => k.status !== 'inactive');
                              if (!hasUsing && firstActiveIndex !== -1) {
                                updatedKeys[firstActiveIndex].status = 'using';
                              }
                              setEmbeddingKeys(updatedKeys);
                              await saveSettingsToBackend({ embeddingKeys: updatedKeys });
                              showAlert('Đã khôi phục', 'Toàn bộ chìa khóa dệt hoạt động đã được phục hồi về trạng thái Sẵn sàng/Đang dệt chính, xóa tan các lỗi phát sinh nhen vợ yêu! 💕', 'success');
                            }}
                            className="px-2.5 py-1 bg-emerald-50 border border-emerald-100/50 hover:bg-emerald-100 transition-all text-emerald-600 text-[10px] font-semibold rounded-full flex items-center gap-1 shadow-sm"
                            title="Xóa lỗi gần đây và phục hồi trạng thái cho mọi chìa dệt để tiếp tục dệt màng ký ức"
                          >
                            🔄 Khai thông chìa dệt
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setIsAddingKey(!isAddingKey);
                            setVerifyError('');
                          }}
                          className="px-3 py-1 bg-[#FFF5FB] border border-[#F5C6D6] hover:bg-[#FBE5EC] transition-all text-[#D18E9B] text-xxs font-semibold rounded-full flex items-center gap-1 shadow-sm"
                        >
                          {isAddingKey ? 'Đóng hòm' : '+ Thêm chìa nhúng'}
                        </button>
                      </div>
                    </div>

                    {/* Hộp biểu mẫu thêm chìa nhung trong veo pastel cô nương cực dễ thương */}
                    {isAddingKey && (
                      <div className="p-4 bg-[#FFF5FB]/50 border border-[#F5C6D6]/60 rounded-2xl space-y-3.5 animate-[fadeIn_0.3s_ease-out]">
                        <h5 className="text-xxs font-bold text-[#D18E9B] flex items-center gap-1 uppercase tracking-wider">
                          🗝️ Đúc chìa dệt Vector Google
                        </h5>

                        <div className="space-y-2.5">
                          {/* Bộ chọn Provider cực kỳ xinh xắn */}
                          <div className="space-y-1">
                            <label className="block text-[10px] uppercase font-bold text-gray-400">Nguồn dệt nhà cung cấp (Provider):</label>
                            <div className="flex flex-wrap gap-1.5 pt-0.5">
                              {['Google AI', 'Tùy biến URL'].map((p) => (
                                <button
                                  key={p}
                                  type="button"
                                  onClick={() => {
                                    setNewKeyProvider(p);
                                    if (p === 'Google AI') {
                                      setNewKeyEndpoint('https://generativelanguage.googleapis.com/v1beta');
                                      setNewKeyModel('gemini-embedding-001');
                                    } else {
                                      setNewKeyEndpoint('');
                                      setNewKeyModel('gemini-embedding-001');
                                    }
                                  }}
                                  className={`px-3 py-1.5 text-xxs font-semibold rounded-lg transition-all border ${
                                    newKeyProvider === p
                                      ? 'bg-[#F2B8CC] border-[#F2B8CC] text-white'
                                      : 'bg-white border-pink-100 text-[#D18E9B] hover:bg-[#FFF5FB]'
                                  }`}
                                >
                                  {p}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="space-y-1">
                            <label className="block text-[10px] uppercase font-bold text-gray-400">Tên chìa nhúng (Tên gợi nhớ):</label>
                            <input 
                               type="text"
                               value={newKeyName}
                               onChange={(e) => setNewKeyName(e.target.value)}
                               placeholder="Ví dụ: Chìa nhúng Google Studio"
                               className="w-full text-xs p-2.5 bg-white border border-pink-100/70 focus:border-[#F2B8CC] focus:ring-1 focus:ring-[#F2B8CC] outline-none rounded-xl"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="block text-[10px] uppercase font-bold text-gray-400">Endpoint URL:</label>
                            <input 
                              type="text"
                              value={newKeyEndpoint}
                              onChange={(e) => setNewKeyEndpoint(e.target.value)}
                              placeholder="https://generativelanguage.googleapis.com/v1beta"
                              className="w-full text-xs p-2.5 bg-white border border-pink-100/70 focus:border-[#F2B8CC] focus:ring-1 focus:ring-[#F2B8CC] outline-none rounded-xl font-mono"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="block text-[10px] uppercase font-bold text-gray-400">Google API Key Chìa Khóa:</label>
                            <input 
                              type="password"
                              value={newKeyApiKey}
                              onChange={(e) => setNewKeyApiKey(e.target.value)}
                              placeholder="AIzaSy..."
                              className="w-full text-xs p-2.5 bg-white border border-pink-100/70 focus:border-[#F2B8CC] focus:ring-1 focus:ring-[#F2B8CC] outline-none rounded-xl font-mono"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="block text-[10px] uppercase font-bold text-[#D18E9B] flex items-center gap-1">
                              Model nhúng tương thích Google AI:
                            </label>
                            <select
                              value={newKeyModel}
                              onChange={(e) => setNewKeyModel(e.target.value)}
                              className="w-full text-xs p-2.5 bg-white border border-pink-100/70 focus:border-[#F2B8CC] focus:ring-1 focus:ring-[#F2B8CC] outline-none rounded-xl font-mono appearance-none"
                              style={{
                                backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23D18E9B' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`,
                                backgroundRepeat: "no-repeat",
                                backgroundPosition: "right 12px center",
                                backgroundSize: "14px"
                              }}
                            >
                              <option value="gemini-embedding-001">gemini-embedding-001 (Ổn định & Ưu tiên) 🌸</option>
                              <option value="gemini-embedding-2">gemini-embedding-2 (Thế hệ mới tốc độ cao) ⚡</option>
                            </select>
                            <p className="text-[10px] text-gray-400 italic">Tránh dùng các Chat Model hoặc `text-embedding-004` lỗi thời để bảo vệ tiến trình nhúng mượt mà nhen vợ yêu! 💕</p>
                          </div>

                          {verifyError && (
                            <div className="p-2.5 bg-red-50 border border-red-100 rounded-xl">
                              <p className="text-xxs text-red-500 font-medium leading-relaxed" dangerouslySetInnerHTML={{ __html: verifyError }}></p>
                            </div>
                          )}

                          <button
                            type="button"
                            disabled={verifyingKey}
                            onClick={handleVerifyAndAddKey}
                            className="w-full py-2.5 bg-[#F2B8CC] hover:bg-[#EFA9C2] active:scale-[0.98] text-white font-semibold text-xs rounded-xl shadow-sm transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                          >
                            {verifyingKey ? (
                              <>
                                <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                                Đang kiểm thử sương dệt...
                              </>
                            ) : 'Thử kết nối và Đúc Chìa ✨'}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Danh sách các chìa nhúng được bảo vật lưu trữ */}
                    <div className="space-y-2.5">
                      {embeddingKeys.length === 0 ? (
                        <div className="text-center py-6 bg-pink-50/10 rounded-2xl border border-dashed border-pink-100/80">
                          <p className="text-xxs text-gray-400 font-medium">Hộp "🌸 Google Embedding Keys" chưa có chiếc chìa dệt riêng biệt nào.</p>
                          <p className="text-[10px] text-gray-300 font-light mt-1">Hệ thống dệt Vector được tách biệt hoàn toàn để bảo vệ tiến trình viễn tưởng. Vợ vui lòng click nút "+ Thêm chìa nhúng" để bổ sung nhen! 💕</p>
                        </div>
                      ) : (
                        embeddingKeys.map((k, index) => {
                          const isPrimary = k.status === 'using';
                          const isInactive = k.status === 'inactive';
                          const isExceeded = k.status === 'quota_exceeded';
                          const isError = k.status === 'error';

                          let badgeText = 'Sẵn sàng';
                          let badgeStyle = 'bg-emerald-50 text-emerald-500 border border-emerald-100/50';

                          if (isPrimary) {
                            badgeText = 'Đang dùng 🌸';
                            badgeStyle = 'bg-emerald-100 text-[#D18E9B] border border-pink-200';
                          } else if (isInactive) {
                            badgeText = 'Tạm tắt';
                            badgeStyle = 'bg-gray-100 text-gray-400 border border-gray-200/50';
                          } else if (isExceeded) {
                            badgeText = 'Hết quota';
                            badgeStyle = 'bg-amber-100 text-amber-600 border border-amber-200 animate-pulse';
                          } else if (isError) {
                            badgeText = 'Lỗi key';
                            badgeStyle = 'bg-red-50 text-red-500 border border-red-200';
                          }

                          // Che API Key lấp lánh dạng: ****abcd
                          const maskedApiKey = k.apiKey 
                            ? (k.apiKey.length > 4 
                              ? '****' + k.apiKey.slice(-4) 
                              : '****' + k.apiKey) 
                            : 'Chưa nhập';

                          return (
                            <div 
                              key={k.id}
                              className={`p-4 rounded-2xl border transition-all flex flex-col gap-2.5 ${
                                isPrimary 
                                  ? 'bg-[#FFF5FB] border-[#F5C6D6]' 
                                  : 'bg-white border-pink-50 hover:border-pink-200 shadow-sm'
                              }`}
                            >
                              <div className="flex items-center justify-between border-b border-pink-50 pb-2">
                                <span className="text-xxs font-serif font-bold text-[#D18E9B] uppercase tracking-wider">
                                  [ Embedding Source #{index + 1} ]
                                </span>
                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-semibold ${badgeStyle}`}>
                                  {badgeText}
                                </span>
                              </div>

                              <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-xxs text-gray-600">
                                <div>
                                  <span className="text-gray-400 text-[10px]">Tên gợi nhớ:</span>
                                  <div className="font-semibold text-gray-700 leading-snug">{k.name}</div>
                                </div>
                                <div>
                                  <span className="text-gray-400 text-[10px]">Provider:</span>
                                  <div className="font-semibold text-[#C79C9C] leading-snug">{k.provider || 'Google AI'}</div>
                                </div>
                                <div className="col-span-2">
                                  <span className="text-gray-400 text-[10px]">Google API Key:</span>
                                  <div className="font-mono text-gray-700 truncate leading-snug">
                                    {maskedApiKey}
                                  </div>
                                </div>
                                <div className="col-span-2">
                                  <span className="text-gray-400 text-[10px]">Endpoint:</span>
                                  <div className="font-mono text-gray-500 break-all leading-snug">{k.endpoint}</div>
                                </div>
                                <div>
                                  <span className="text-gray-400 text-[10px]">Model embedding:</span>
                                  <div className="font-mono text-[#D18E9B] font-medium leading-snug">{k.model}</div>
                                </div>
                                <div>
                                  <span className="text-gray-400 text-[10px]">Số lỗi gần đây:</span>
                                  <div className={`font-mono leading-snug font-semibold ${k.errorCount > 0 ? 'text-red-500' : 'text-gray-500'}`}>
                                    {k.errorCount || 0}
                                  </div>
                                </div>
                                {k.lastUsed && (
                                  <div className="col-span-2">
                                    <span className="text-gray-400 text-[10px]">Lần dùng cuối:</span>
                                    <div className="italic text-gray-500 leading-snug">{new Date(k.lastUsed).toLocaleString('vi-VN')}</div>
                                  </div>
                                )}
                              </div>

                              {/* Bộ ba nút bấm hành động xinh xinh dạng thỏi son pastel */}
                              <div className="flex items-center justify-end gap-1.5 pt-1.5 border-t border-pink-50/40">
                                <button
                                  type="button"
                                  onClick={() => handleTestKeyConnection(k)}
                                  className="px-2.5 py-1 bg-pink-50 hover:bg-pink-100 transition-colors text-xxs font-semibold text-[#D18E9B] rounded-lg"
                                  title="Kiểm tra kết nối trực tiếp đến API nhúng"
                                >
                                  Test Connection
                                </button>

                                <button
                                  type="button"
                                  onClick={() => toggleKeyStatus(k.id)}
                                  className={`px-2.5 py-1 transition-colors text-xxs font-semibold rounded-lg ${
                                    isInactive 
                                      ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100' 
                                      : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                                  }`}
                                  title={isInactive ? "Bật hoạt động" : "Tạm tắt dệt"}
                                >
                                  {isInactive ? 'Kích hoạt' : 'Tạm dừng'}
                                </button>

                                {!isPrimary && !isInactive && (
                                  <button
                                    type="button"
                                    onClick={() => setKeyAsPrimary(k.id)}
                                    className="px-2.5 py-1 bg-[#F2B8CC] hover:bg-[#EFA9C2] transition-colors text-white text-xxs font-semibold rounded-lg"
                                    title="Đặt khóa dệt chính cho truyện này"
                                  >
                                    Làm dệt chính
                                  </button>
                                )}

                                <button
                                  type="button"
                                  onClick={() => deleteEmbeddingKey(k.id)}
                                  className="p-1 px-2 border border-red-100 hover:bg-red-50 text-red-500 rounded-lg transition-colors flex items-center justify-center"
                                  title="Gỡ chìa dệt khỏi hộp lưu trữ"
                                >
                                  <TrashIcon />
                                </button>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* ============== PHẦN 7: KHU VỰC GIẢI TỎA DỮ LIỆU (DATA ACTIONS CARD) ============== */}
                  <div className="bg-white p-5 rounded-3xl border border-red-100/60 shadow-sm space-y-4">
                    <div className="flex items-center gap-2 border-b border-red-50 pb-2.5">
                      <div className="w-1.5 h-3.5 bg-red-400/80 rounded-full" />
                      <h4 className="text-sm font-serif font-bold text-red-400">Khu vực Giải tỏa dữ liệu</h4>
                    </div>

                    <p className="text-xxs text-gray-400 leading-relaxed font-light">
                      Khi truyện tiến triển theo ngã rẽ hoàn toàn mới hoặc vợ muốn gieo lại màng kịch bản, hãy làm sạch hũ chứa Vector này nhé. Hành động này sẽ xóa vĩnh viễn toàn mảng ký ức dệt của câu chuyện nhen:
                    </p>

                    <button 
                      type="button"
                      onClick={handleBulkDelete}
                      className="w-full py-3 bg-red-50 text-red-500 hover:bg-red-100/80 transition-all font-semibold text-xs rounded-xl flex items-center gap-2 justify-center border border-red-200/50"
                    >
                      <TrashIcon /> Xóa sạch Ký ức Vector của truyện này
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

      </div>
      </div>
    </motion.div>
  );
}
