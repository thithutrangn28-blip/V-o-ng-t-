import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, 
  X, 
  ChevronDown, 
  ChevronUp, 
  Save, 
  Trash2, 
  Plus, 
  Sparkles, 
  Info,
  Layers,
  User,
  Globe,
  BookOpen,
  History,
  Settings,
  ShieldCheck,
  Zap,
  BarChart3,
  RefreshCcw,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { getBotCards } from './BotCardGallery';

// --- TYPES ---
export type ContextCategory =
  | "system"
  | "character_link"
  | "world_info"
  | "lorebook"
  | "memory"
  | "style"
  | "post_history"
  | "rules_output"
  | "estimate"
  | "templates"
  | "settings";

export type ContextBlock = {
  id: string;
  title: string;
  content: string;
  orientation?: string;
  enabled: boolean;
  tokenCount: number;
};

export type ContextLayer = {
  id: string;
  order?: number;
  title: string;
  description?: string;
  category?: ContextCategory;
  content: string;
  blocks?: ContextBlock[];
  type?: 'manual' | 'blocks';
  tokenCount: number;
  maxBudget?: number;
  enabled: boolean;
  locked: boolean;
  cleanable?: boolean;
  status?: 'ready' | 'too_long' | 'warning';
  priority?: number;
  updatedAt?: number;
  advancedOptions?: any;
};

export type ContextSection = ContextLayer;

// --- UTILS ---
export function estimateTokens(text: string): number {
  if (!text) return 0;
  // Simple estimation for Vietnamese: ~3-4 chars per token
  return Math.ceil(text.length / 3.7);
}

const CORE_CATEGORIES: ContextCategory[] = [
  "system",
  "character_link",
  "world_info",
  "lorebook",
  "post_history",
  "rules_output",
  "style", // Added style here for engine grouping
];

// --- INITIAL DATA ---
const INITIAL_SECTIONS: ContextSection[] = [
  {
    id: "system",
    title: "1. System Prompt",
    category: "system",
    content: "",
    type: 'blocks',
    blocks: [
      {
        id: 'sys-1',
        title: 'Core AI Instructions',
        content: "Bạn là một AI hỗ trợ Roleplay chuyên nghiệp, viết văn phong lãng mạn, tinh tế.",
        orientation: 'Dùng làm kim chỉ nam chính cho AI.',
        enabled: true,
        tokenCount: estimateTokens("Bạn là một AI hỗ trợ Roleplay chuyên nghiệp, viết văn phong lãng mạn, tinh tế.")
      }
    ],
    enabled: true,
    locked: false,
    cleanable: false,
    tokenCount: 16,
    priority: 1,
    updatedAt: Date.now(),
    description: "Nhập hướng dẫn cốt lõi điều khiển toàn bộ hành vi của AI."
  },
  {
    id: "writing-engine",
    title: "2. Writing Engine",
    category: "style",
    content: "",
    type: 'blocks',
    blocks: [
      {
        id: 'writing-1',
        title: 'Hệ thống Đếm Đoạn & Pacing',
        content: `[ HỆ THỐNG ĐẾM ĐOẠN CHO ROLEPLAY NOVEL ]
- AI sử dụng format [ Đoạn X / 15 đoạn ] ở đầu mỗi đoạn để kiểm soát tiến độ.
- Mục tiêu: Hoàn thành đủ 15 đoạn để chương dài tự nhiên (đạt 12k-19k tokens).
- Độ dài mỗi đoạn biến thiên linh hoạt (vài trăm đến vài nghìn chữ) tùy theo cao trào và tension.
- Tránh rush plot, tránh kết thúc sớm. Mỗi đoạn phải có sự tiến triển thực sự.`,
        orientation: 'Dùng để hack pacing và giữ độ dài chương ổn định.',
        enabled: true,
        tokenCount: 200
      },
      {
        id: 'writing-2',
        title: 'Quy tắc Xuống Dòng & Immersion',
        content: `[ QUY TẮC TRÌNH BÀY TIỂU THUYẾT ]
- Tránh xuống dòng quá vụn. Khoảng 2-3 ý nội dung mới ngắt đoạn lớn một lần.
- Mật độ chữ dày nhưng vẫn đảm bảo tính dễ đọc (readability).
- Văn phong tiểu thuyết chuyên nghiệp, cinematic flow.`,
        orientation: 'Tạo cảm giác đọc dài hơi và đắm chìm hơn.',
        enabled: true,
        tokenCount: 150
      }
    ],
    enabled: true,
    locked: false,
    cleanable: true,
    tokenCount: 0,
    priority: 2,
    updatedAt: Date.now(),
    description: "Quản lý phong cách viết, ngôi kể, và nhịp độ truyện."
  },
  {
    id: "roleplay-engine",
    title: "3. Roleplay Engine",
    category: "style",
    content: "",
    type: 'blocks',
    blocks: [],
    enabled: true,
    locked: false,
    cleanable: true,
    tokenCount: 0,
    priority: 3,
    updatedAt: Date.now(),
    description: "Thiết lập cơ chế tương tác, hội thoại và cảm xúc nhân vật."
  },
  {
    id: "character",
    title: "4. Nhân vật (Character)",
    category: "character_link",
    content: "",
    type: 'manual',
    enabled: true,
    locked: true,
    cleanable: false,
    tokenCount: 0,
    priority: 4,
    updatedAt: Date.now(),
    description: "Dữ liệu nhân vật được liên kết trực tiếp từ Tab 1 để giữ đúng thiết lập gốc."
  },
  {
    id: "world",
    title: "5. World Info",
    category: "world_info",
    content: "",
    type: 'manual',
    enabled: true,
    locked: true,
    cleanable: false,
    tokenCount: 0,
    priority: 5,
    updatedAt: Date.now(),
    description: "Thiết lập bối cảnh, thời đại, địa điểm và các quy luật của thế giới."
  },
  {
    id: "lorebook",
    title: "6. Lorebook",
    category: "lorebook",
    content: "",
    type: 'manual',
    enabled: true,
    locked: true,
    cleanable: false,
    tokenCount: 0,
    priority: 6,
    updatedAt: Date.now(),
    description: "Kho lưu trữ thông tin nhân vật phụ, tổ chức, sự kiện và từ khóa kích hoạt."
  },
  {
    id: "memory",
    title: "7. Memory Engine",
    category: "memory",
    content: "",
    type: 'manual',
    enabled: true,
    locked: false,
    cleanable: true,
    tokenCount: 0,
    priority: 7,
    updatedAt: Date.now(),
    description: "Quản lý bộ nhớ ngắn hạn, trung hạn và dài hạn của câu chuyện."
  },
  {
    id: "post_history",
    title: "8. Post-History Instructions",
    category: "post_history",
    content: "",
    enabled: true,
    locked: true,
    cleanable: false,
    tokenCount: 0,
    priority: 8,
    updatedAt: Date.now(),
    description: "Hướng dẫn AI cách xử lý sau khi đã đọc qua lịch sử trò chuyện."
  },
  {
    id: "rules_output",
    title: "9. Quy tắc & Output",
    category: "rules_output",
    content: "KHÔNG nói thay user. KHÔNG tóm tắt sớm. Ưu tiên hội thoại tự nhiên.",
    enabled: true,
    locked: true,
    cleanable: false,
    tokenCount: 0,
    priority: 9,
    updatedAt: Date.now(),
    description: "Thiết lập các rào cản kỹ thuật để AI không phá vai và trả về đúng định dạng."
  }
];

interface ContextWindowManagerProps {
  isOpen: boolean;
  onClose: () => void;
  onSend?: (layers: ContextLayer[]) => void;
  onSave?: (layers: ContextLayer[]) => void;
  initialLayers?: ContextLayer[];
  onOpenMemoryPrompts?: () => void;
  onSmartImportPrompts?: (text: any, targetId: any) => void;
}

export default function ContextWindowManager({ 
  isOpen, 
  onClose, 
  onSend, 
  onSave, 
  initialLayers,
  onOpenMemoryPrompts,
  onSmartImportPrompts
}: ContextWindowManagerProps) {
  const [sections, setSections] = useState<ContextSection[]>([]);
  const [openId, setOpenId] = useState<string | null>("system");
  const [toast, setToast] = useState<string | null>(null);
  const [linkedBotId, setLinkedBotId] = useState<string | null>(null);
  const [botList, setBotList] = useState<any[]>([]);
  const [showBotPicker, setShowBotPicker] = useState(false);
  const [rabbitSkin, setRabbitSkin] = useState<string | null>(localStorage.getItem("context_rabbit_skin"));

  useEffect(() => {
    // Chồng sẽ ưu tiên lấy dữ liệu tươi mới từ các window khác nhen vợ
    const syncExternalData = () => {
      // 1. Lấy dữ liệu Diamond Core từ Memory Engine (v3 Diamond Core)
      const memoryData = localStorage.getItem("roleplay_memory_data") || localStorage.getItem("diamond_core_memory");
      let diamondCoreContent = "";
      if (memoryData) {
        try {
          const parsed = JSON.parse(memoryData);
          diamondCoreContent = parsed.diamondCore || parsed.content || (typeof parsed === 'string' ? parsed : "");
        } catch(e) {
          diamondCoreContent = memoryData;
        }
      }

      // 2. Lấy System Prompt từ Chat (Tab 3 hoặc lưu trữ chính)
      const systemPrompt = localStorage.getItem("roleplay_novel_system_prompt") || localStorage.getItem("novel_system_prompt") || localStorage.getItem("kikoko_novel_system_prompt") || "";

      // 3. Lấy World Info & Lorebook
      const worldInfo = localStorage.getItem("roleplay_world_info") || localStorage.getItem("world_info_data") || localStorage.getItem("novel_world_info") || "";
      const lorebook = localStorage.getItem("roleplay_lorebook") || localStorage.getItem("lorebook_data") || "";

      // 4. Lấy Character Profile hiện tại
      const activeBot = localStorage.getItem("current_bot_card") || localStorage.getItem("selected_bot_card");
      let botProfile = "";
      if (activeBot) {
        try {
          const bot = JSON.parse(activeBot);
          botProfile = `Tên: ${bot.name || ''}\nMô tả: ${bot.description || ''}\nTính cách: ${Array.isArray(bot.personality) ? bot.personality.join(', ') : (bot.personality || '')}\nBối cảnh: ${bot.scenario || ''}\nHướng dẫn AI: ${bot.systemPrompt || ''}`;
          if (bot.id) setLinkedBotId(bot.id);
        } catch(e) {}
      }

      return { diamondCoreContent, systemPrompt, worldInfo, lorebook, botProfile };
    };

    const external = syncExternalData();

    // Priority 1: Use initialLayers if passed (this bridges the gap from RoleplayChat's memory)
    if (initialLayers && initialLayers.length > 0 && isOpen) {
      // Map initialLayers IDs to our internal section IDs
      const mappedLayers = initialLayers.map(layer => {
        let targetId = layer.id;
        if (layer.id === 'GLOBAL_SYSTEM_RULES') targetId = 'system';
        if (layer.id === 'WRITING_ENGINE') targetId = 'writing-engine';
        if (layer.id === 'ROLEPLAY_ENGINE') targetId = 'roleplay-engine';
        if (layer.id === 'CHARACTER_CORE') targetId = 'character';
        if (layer.id === 'LONG_TERM_MEMORY') targetId = 'memory'; // Link Diamond Core to Memory
        if (layer.id === 'WORLD_INFO') targetId = 'world';
        if (layer.id === 'LOREBOOK') targetId = 'lorebook';
        
        const isEngine = targetId === 'system' || targetId === 'writing-engine' || targetId === 'roleplay-engine';
        const initial = INITIAL_SECTIONS.find(s => s.id === targetId) || INITIAL_SECTIONS.find(s => s.id === 'system')!;

        // Auto-fill content from external sources if it matches
        let finalContent = layer.content || "";
        if (targetId === 'memory' && external.diamondCoreContent) finalContent = external.diamondCoreContent;
        if (targetId === 'character' && external.botProfile) finalContent = external.botProfile;
        if (targetId === 'world' && external.worldInfo) finalContent = external.worldInfo;
        if (targetId === 'lorebook' && external.lorebook) finalContent = external.lorebook;
        if (targetId === 'system' && external.systemPrompt && (!finalContent || finalContent.length < external.systemPrompt.length)) finalContent = external.systemPrompt;

        const currentTokens = estimateTokens(finalContent);

        return {
          ...initial,
          id: targetId,
          content: finalContent,
          enabled: layer.enabled,
          tokenCount: currentTokens,
          type: isEngine ? 'blocks' : (initial.type || 'manual'),
          blocks: isEngine ? (
             finalContent ? [{
                id: `init-${targetId}-${Date.now()}`,
                title: `Dữ liệu đồng bộ`,
                content: finalContent,
                enabled: true,
                tokenCount: currentTokens
             }] : initial.blocks
          ) : []
        };
      });

      // Merge with saved blocks to preserve user customizations in the editor
      const saved = localStorage.getItem("roleplay_context_sections");
      try {
        const parsed = saved ? JSON.parse(saved) : [];
        const merged = INITIAL_SECTIONS.map(initial => {
          const chatLayer = mappedLayers.find(l => l.id === initial.id);
          const savedSec = parsed.find((s: any) => s.id === initial.id);

          let finalContent = chatLayer?.content || savedSec?.content || initial.content || "";
          if (initial.id === 'memory' && external.diamondCoreContent) finalContent = external.diamondCoreContent;
          if (initial.id === 'character' && external.botProfile) finalContent = external.botProfile;
          if (initial.id === 'world' && external.worldInfo) finalContent = external.worldInfo;
          if (initial.id === 'lorebook' && external.lorebook) finalContent = external.lorebook;
          if (initial.id === 'system' && external.systemPrompt && (!finalContent || finalContent.length < external.systemPrompt.length)) finalContent = external.systemPrompt;

          const currentTokens = estimateTokens(finalContent);
          const isEngine = initial.id === 'system' || initial.id === 'writing-engine' || initial.id === 'roleplay-engine';
          const isEnabled = chatLayer ? chatLayer.enabled : (savedSec ? savedSec.enabled : initial.enabled);

          let blocks = savedSec?.blocks && savedSec.blocks.length > 0 
            ? savedSec.blocks 
            : (chatLayer?.blocks && chatLayer.blocks.length > 0 
                ? chatLayer.blocks 
                : (finalContent ? [{
                    id: `init-${initial.id}-${Date.now()}`,
                    title: `Dữ liệu đồng bộ`,
                    content: finalContent,
                    enabled: true,
                    tokenCount: currentTokens
                  }] : initial.blocks)
              );

          const validatedBlocks = (blocks || []).map((b: any) => ({
            ...b,
            tokenCount: b.tokenCount || estimateTokens(b.content)
          }));

          return {
            ...initial,
            content: finalContent,
            enabled: isEnabled,
            tokenCount: isEngine ? 0 : currentTokens,
            type: isEngine ? 'blocks' : (savedSec?.type || initial.type),
            blocks: isEngine ? validatedBlocks : (savedSec?.blocks || initial.blocks)
          };
        });
        setSections(merged);
      } catch (e) {
        setSections(mappedLayers);
      }
    } else if (isOpen) {
      // Priority 2: Load saved or SYNC from other tabs
      const saved = localStorage.getItem("roleplay_context_sections");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          const merged = INITIAL_SECTIONS.map(initial => {
            const savedSection = parsed.find((s: any) => s.id === initial.id);
            const isEngine = initial.id === 'system' || initial.id === 'writing-engine' || initial.id === 'roleplay-engine';
            
            // Sync content from external sources for manual sections
            let content = savedSection?.content || initial.content || "";
            if (initial.id === 'memory' && external.diamondCoreContent) content = external.diamondCoreContent;
            if (initial.id === 'character' && external.botProfile) content = external.botProfile;
            if (initial.id === 'world' && external.worldInfo) content = external.worldInfo;
            if (initial.id === 'lorebook' && external.lorebook) content = external.lorebook;
            if (initial.id === 'system' && external.systemPrompt && (!content || content.length < external.systemPrompt.length)) content = external.systemPrompt;

            if (savedSection) {
              const blocks = savedSection.blocks && savedSection.blocks.length > 0 
                ? savedSection.blocks 
                : (content ? [{
                    id: `block-${Date.now()}`,
                    title: 'Nội dung đồng bộ',
                    content: content,
                    enabled: true,
                    tokenCount: estimateTokens(content)
                  }] : initial.blocks);

              // Recalculate block tokens to ensure they aren't 0
              const validatedBlocks = (blocks || []).map((b: any) => ({
                ...b,
                tokenCount: b.tokenCount || estimateTokens(b.content)
              }));

              return { 
                ...initial, 
                ...savedSection,
                content: content,
                tokenCount: estimateTokens(content),
                type: isEngine ? 'blocks' : (savedSection.type || initial.type),
                blocks: isEngine ? validatedBlocks : (savedSection.blocks || initial.blocks)
              };
            }
            return { ...initial, content, tokenCount: estimateTokens(content) };
          });
          setSections(merged);
        } catch (e) {
          setSections(INITIAL_SECTIONS.map(s => ({ ...s, tokenCount: estimateTokens(s.content) })));
        }
      } else {
        // First time opening: Link everything!
        const synced = INITIAL_SECTIONS.map(s => {
          let content = s.content;
          if (s.id === 'memory') content = external.diamondCoreContent;
          if (s.id === 'character') content = external.botProfile;
          if (s.id === 'world') content = external.worldInfo;
          if (s.id === 'lorebook') content = external.lorebook;
          if (s.id === 'system' && external.systemPrompt) content = external.systemPrompt;
          
          const isEngine = s.id === 'system' || s.id === 'writing-engine' || s.id === 'roleplay-engine';
          const blocks = isEngine && content ? [{
            id: `init-${s.id}-${Date.now()}`,
            title: 'Dữ liệu đồng bộ',
            content: content,
            enabled: true,
            tokenCount: estimateTokens(content)
          }] : (s.blocks || []);

          return { ...s, content, tokenCount: estimateTokens(content), blocks };
        });
        setSections(synced);
      }
    }

    // Load bot list for character link
    if (isOpen) {
      getBotCards().then(list => setBotList(list));
    }
  }, [initialLayers, isOpen]);

  const handleReset = () => {
    if (window.confirm("Vợ muốn khôi phục lại toàn bộ cài đặt gốc của các mục Prompt không? (Nội dung cũ sẽ bị mất đó nhen vợ ơi 💕)")) {
      setSections(INITIAL_SECTIONS.map(s => ({ ...s, tokenCount: estimateTokens(s.content) })));
      localStorage.removeItem("roleplay_context_sections");
      showToast("Đã đưa mọi thứ về trạng thái tinh khôi rồi nhen vợ! ✨");
    }
  };

  if (!isOpen) return null;

  // New logic for calculating tokens including blocks
  const calculateSectionTokens = (section: ContextSection) => {
    if (section.type === 'blocks' && section.blocks) {
      return section.blocks
        .filter(b => b.enabled)
        .reduce((sum, b) => sum + b.tokenCount, 0);
    }
    return section.tokenCount;
  };

  const totalTokens = sections
    .filter(s => s.enabled)
    .reduce((sum, s) => sum + calculateSectionTokens(s), 0);

  const maxTokens = 130000;
  const safetyThreshold = 100000;
  const tokenPercent = Math.min((totalTokens / maxTokens) * 100, 100);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
  };

  const handleToggle = (id: string) => {
    setSections(prev => prev.map(s => {
      if (s.id === id) return { ...s, enabled: !s.enabled };
      return s;
    }));
  };

  const handleContentChange = (id: string, content: string) => {
    setSections(prev => prev.map(s => {
      if (s.id === id) return { ...s, content, tokenCount: estimateTokens(content), updatedAt: Date.now() };
      return s;
    }));
  };

  // Block management
  const addBlock = (sectionId: string) => {
    setSections(prev => prev.map(s => {
      if (s.id === sectionId) {
        const newBlock: ContextBlock = {
          id: `block-${Date.now()}`,
          title: 'Mục mới',
          content: '',
          orientation: '',
          enabled: true,
          tokenCount: 0
        };
        return {
          ...s,
          blocks: [...(s.blocks || []), newBlock],
          updatedAt: Date.now()
        };
      }
      return s;
    }));
  };

  const updateBlock = (sectionId: string, blockId: string, updates: Partial<ContextBlock>) => {
    setSections(prev => prev.map(s => {
      if (s.id === sectionId && s.blocks) {
        return {
          ...s,
          blocks: s.blocks.map(b => {
            if (b.id === blockId) {
              const updated = { ...b, ...updates };
              if (updates.content !== undefined) {
                updated.tokenCount = estimateTokens(updates.content);
              }
              return updated;
            }
            return b;
          }),
          updatedAt: Date.now()
        };
      }
      return s;
    }));
  };

  const deleteBlock = (sectionId: string, blockId: string) => {
    setSections(prev => prev.map(s => {
      if (s.id === sectionId && s.blocks) {
        return {
          ...s,
          blocks: s.blocks.filter(b => b.id !== blockId),
          updatedAt: Date.now()
        };
      }
      return s;
    }));
  };

  const handleRabbitSkinUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (prev) => {
        const base64 = prev.target?.result as string;
        setRabbitSkin(base64);
        localStorage.setItem("context_rabbit_skin", base64);
        showToast("Đã thay áo mới cho thỏ rồi nhen vợ! 👗");
      };
      reader.readAsDataURL(file);
    }
  };

  const saveSections = (specificId?: string) => {
    localStorage.setItem("roleplay_context_sections", JSON.stringify(sections));
    showToast(specificId ? `Đã lưu mục ${specificId}` : "Đã lưu toàn bộ thiết lập!");
  };

  const handleSaveToContext = () => {
    // Sync block content to main content before saving
    const syncedSections = sections.map(s => {
      if (s.type === 'blocks' && s.blocks) {
        const joinedContent = s.blocks.filter(b => b.enabled).map(b => b.content).join("\n\n");
        return { ...s, content: joinedContent, tokenCount: estimateTokens(joinedContent) };
      }
      return s;
    });

    const contextPayload = {
      sections: syncedSections,
      totalTokens,
      timestamp: Date.now()
    };
    localStorage.setItem("roleplay_final_context_payload", JSON.stringify(contextPayload));
    localStorage.setItem("roleplay_context_sections", JSON.stringify(syncedSections));
    setSections(syncedSections);
    showToast("Đã lưu Prompt & Context thành công! 💖");
  };

  const linkBot = (bot: any) => {
    setLinkedBotId(bot.id);
    localStorage.setItem("context_linked_bot_id", bot.id || "");
    
    // Auto-update section content with bot data
    const botContent = `Tên: ${bot.name}\nMô tả: ${bot.description}\nTính cách: ${bot.personality?.join(', ') || ''}`;
    handleContentChange('character', botContent);
    
    setShowBotPicker(false);
    showToast(`Đã liên kết nhân vật ${bot.name} ✨`);
  };

  const getSectionIcon = (cat: ContextCategory) => {
    switch (cat) {
      case "system": return <Sparkles className="w-5 h-5 text-[#f36aa3]" />;
      case "character_link": return <User className="w-5 h-5 text-[#f36aa3]" />;
      case "world_info": return <Globe className="w-5 h-5 text-[#f36aa3]" />;
      case "lorebook": return <BookOpen className="w-5 h-5 text-[#f36aa3]" />;
      case "memory": return <History className="w-5 h-5 text-[#f36aa3]" />;
      case "style": return <Layers className="w-5 h-5 text-[#f36aa3]" />;
      case "post_history": return <RefreshCcw className="w-5 h-5 text-[#f36aa3]" />;
      case "rules_output": return <ShieldCheck className="w-5 h-5 text-[#f36aa3]" />;
      default: return <Info className="w-5 h-5 text-[#f36aa3]" />;
    }
  };

  return (
    <motion.div 
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="fixed inset-0 z-[100] bg-[#FDF2F5] flex flex-col font-sans overflow-hidden"
    >
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-[#F9C6D4] px-4 h-16 flex items-center justify-between">
        <button onClick={onClose} className="w-10 h-10 flex items-center justify-center rounded-xl bg-[#FFF5FB] border border-[#F9C6D4] text-[#C79C9C]">
          <ArrowLeft size={20} />
        </button>
        <div className="text-center flex-1">
          <h1 className="text-sm font-black text-[#B94470] tracking-tight uppercase">Prompt & Context</h1>
          <p className="text-[9px] font-bold text-[#D7B8B8] uppercase">Bộ nhớ ngữ cảnh Roleplay</p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={handleReset} 
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-[#FFF5FB] border border-[#F9C6D4] text-[#EF5B9A]"
            title="Khôi phục mặc định"
          >
            <RefreshCcw size={18} />
          </button>
          <button onClick={onClose} className="w-10 h-10 flex items-center justify-center rounded-xl bg-[#FFF5FB] border border-[#F9C6D4] text-[#C79C9C]">
            <X size={20} />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 pb-40">
        
        {/* Compact Context Meter */}
        <div className="bg-white/90 border border-[#F9C6D4] rounded-2xl p-4 shadow-sm">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-[10px] font-black text-[#B94470] uppercase">Bộ nhớ: {totalTokens.toLocaleString()} tokens</h2>
            <div className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase ${totalTokens < safetyThreshold ? 'bg-[#F4F9FF] text-[#60C98F]' : 'bg-[#FFF5FB] text-[#EF5B9A]'}`}>
              {totalTokens < safetyThreshold ? 'An toàn' : 'Cảnh báo'}
            </div>
          </div>
          <div className="h-2 bg-[#F2E8EE] rounded-full overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${tokenPercent}%` }}
              className={`h-full rounded-full ${totalTokens < safetyThreshold ? 'bg-[#60C98F]' : totalTokens < 120000 ? 'bg-[#F6C45D]' : 'bg-[#EF5B9A]'}`}
            />
          </div>
        </div>

        {/* Categories Accordion */}
        <div className="space-y-3">
          {sections.map((section) => (
            <div key={section.id} className="bg-white/90 border border-[#F9C6D4] rounded-3xl overflow-hidden shadow-sm">
              <div 
                onClick={() => setOpenId(openId === section.id ? null : section.id)}
                className="p-4 flex items-center justify-between cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 flex items-center justify-center rounded-2xl bg-[#FFF5FB] border border-[#F9C6D4]/50">
                    {getSectionIcon(section.category || 'system')}
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-[#555555]">{section.title}</h3>
                    <p className="text-[10px] font-bold text-[#D7B8B8]">{calculateSectionTokens(section).toLocaleString()} tokens • {section.enabled ? 'Đang bật' : 'Đang tắt'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {section.type === 'blocks' && (
                    <button 
                      onClick={(e) => { e.stopPropagation(); addBlock(section.id); setOpenId(section.id); }}
                      className="w-10 h-10 flex items-center justify-center bg-[#EF5B9A] text-white rounded-full active:scale-95 shadow-md border-2 border-white"
                      title="Thêm mục mới"
                    >
                      <Plus size={20} strokeWidth={3} />
                    </button>
                  )}
                  <div 
                    onClick={(e) => { e.stopPropagation(); handleToggle(section.id); }}
                    className={`w-11 h-6 rounded-full p-1 transition-colors ${section.enabled ? 'bg-[#EF5B9A]' : 'bg-[#D6D3D3]'}`}
                  >
                    <div className={`w-4 h-4 bg-white rounded-full transition-transform ${section.enabled ? 'translate-x-5' : 'translate-x-0'}`} />
                  </div>
                  {openId === section.id ? <ChevronUp size={18} className="text-[#C79C9C]" /> : <ChevronDown size={18} className="text-[#C79C9C]" />}
                </div>
              </div>

              <AnimatePresence>
                {openId === section.id && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="border-t border-[#F9C6D4]/30 bg-[#FFF8FB]/50"
                  >
                    <div className="p-4 space-y-4">
                      <p className="text-xs font-medium text-[#907D88] italic">{section.description}</p>
                      
                      {section.category === 'character_link' ? (
                        <div className="space-y-3">
                          <button 
                            onClick={() => setShowBotPicker(true)}
                            className="w-full h-12 dashed-border rounded-2xl flex items-center justify-center gap-2 text-[#C79C9C] font-bold text-sm bg-white"
                          >
                            <Plus size={18} />
                            Liên kết từ Tab 1
                          </button>
                          
                          {linkedBotId && (
                            <div className="bg-white border border-[#60C98F] rounded-2xl p-3 flex items-center gap-3">
                              <div className="w-12 h-12 rounded-xl bg-[#F4F9FF] border border-[#60C98F]/30 overflow-hidden flex items-center justify-center">
                                🎀
                              </div>
                              <div className="flex-1">
                                <span className="text-[10px] font-black text-[#60C98F] uppercase">✓ Đã liên kết</span>
                                <h4 className="text-sm font-black text-[#555555]">Hồ sơ nhân vật hiện tại</h4>
                              </div>
                              <CheckCircle2 size={20} className="text-[#60C98F]" />
                            </div>
                          )}
                        </div>
                      ) : null}

                      {section.type === 'blocks' ? (
                        <div className="space-y-4">
                          {section.blocks && section.blocks.length > 0 ? (
                            section.blocks.map((block) => (
                              <div key={block.id} className="bg-white border border-[#F9C6D4]/50 rounded-2xl p-4 shadow-sm space-y-3 relative group">
                                <div className="flex items-center justify-between gap-3">
                                  <input 
                                    value={block.title}
                                    onChange={(e) => updateBlock(section.id, block.id, { title: e.target.value })}
                                    placeholder="Tên Prompt..."
                                    className="flex-1 bg-transparent border-none p-0 text-sm font-black text-[#B94470] focus:ring-0 placeholder:text-[#F9C6D4]"
                                  />
                                  <div className="flex items-center gap-2">
                                    <button 
                                      onClick={() => updateBlock(section.id, block.id, { enabled: !block.enabled })}
                                      className={`w-8 h-4 rounded-full p-0.5 transition-colors ${block.enabled ? 'bg-[#EF5B9A]' : 'bg-[#D6D3D3]'}`}
                                    >
                                      <div className={`w-3 h-3 bg-white rounded-full transition-transform ${block.enabled ? 'translate-x-4' : 'translate-x-0'}`} />
                                    </button>
                                    <button 
                                      onClick={() => deleteBlock(section.id, block.id)}
                                      className="p-1 text-[#D7B8B8] hover:text-[#EF5B9A]"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  </div>
                                </div>

                                <div className="space-y-2">
                                  <label className="text-[10px] font-black text-[#D7B8B8] uppercase">Nội dung Prompt</label>
                                  <textarea 
                                    value={block.content}
                                    onChange={(e) => updateBlock(section.id, block.id, { content: e.target.value })}
                                    placeholder="Chi tiết prompt tại đây..."
                                    className="w-full min-h-[80px] bg-[#FFF8FB] border border-[#F9C6D4]/30 rounded-xl p-3 text-xs font-medium text-[#555555] outline-none focus:ring-1 focus:ring-[#F9C6D4]"
                                  />
                                </div>

                                <div className="space-y-2">
                                  <label className="text-[10px] font-black text-[#D7B8B8] uppercase">Định hướng AI</label>
                                  <input 
                                    value={block.orientation || ''}
                                    onChange={(e) => updateBlock(section.id, block.id, { orientation: e.target.value })}
                                    placeholder="Hướng dẫn bổ sung cho AI..."
                                    className="w-full bg-[#FAFBFF] border border-[#F4F9FF] rounded-xl px-3 py-2 text-[11px] font-bold text-[#907D88] outline-none focus:ring-1 focus:ring-[#F4F9FF]"
                                  />
                                </div>

                                <div className="text-[9px] font-bold text-[#D7B8B8] text-right">
                                  {block.tokenCount.toLocaleString()} tokens
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="text-center py-6 border-2 border-dashed border-[#F9C6D4] rounded-3xl">
                              <p className="text-xs font-bold text-[#D7B8B8]">Bấm dấu + ở trên để thêm Prompt nhen vợ! 💕</p>
                            </div>
                          )}

                          <button 
                            onClick={() => addBlock(section.id)}
                            className="w-full h-10 bg-white border border-[#F9C6D4] text-[#B94470] rounded-xl font-black text-xs flex items-center justify-center gap-2 hover:bg-[#FFF5FB]"
                          >
                            <Plus size={16} />
                            Thêm Prompt Mới
                          </button>
                        </div>
                      ) : (
                        <div className="relative">
                          <textarea 
                            value={section.content}
                            onChange={(e) => handleContentChange(section.id, e.target.value)}
                            placeholder="Nhập nội dung cho mục này..."
                            className="w-full min-h-[160px] bg-white border border-[#F9C6D4] rounded-2xl p-4 text-sm font-medium text-[#555555] outline-none focus:ring-2 focus:ring-[#F9C6D4]/50"
                          />
                          <div className="absolute bottom-3 right-3 text-[10px] font-bold text-[#D7B8B8] bg-white/80 px-2 py-1 rounded-lg">
                            {section.content.length} ký tự
                          </div>
                        </div>
                      )}

                      {section.locked && (
                        <div className="flex items-center gap-2 text-[10px] font-black text-[#EF5B9A] uppercase bg-[#FFF5FB] p-2 rounded-xl border border-[#F9C6D4]/30">
                          < ShieldCheck size={14} />
                          Mục này thuộc Core Context - Không thể tự động xóa
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </div>

      {/* Footer - Minimal Rabbit Button Area */}
      <footer className="fixed bottom-6 right-6 z-[120] flex flex-col items-end gap-3">
        {/* Compact Token Badge */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/95 border border-[#F9C6D4] rounded-full px-3 py-1 shadow-md flex items-center gap-2"
        >
          <p className="text-[10px] font-black text-[#B94470]">{totalTokens.toLocaleString()} tkn</p>
          <label className="cursor-pointer p-0.5 rounded-full hover:bg-[#FFF5FB] transition-colors" title="Thay nền thỏ">
            <Settings size={10} className="text-[#D7B8B8]" />
            <input type="file" className="hidden" accept="image/*" onChange={handleRabbitSkinUpload} />
          </label>
        </motion.div>

        <button 
          onClick={handleSaveToContext}
          className="w-14 h-14 bg-white/40 backdrop-blur-md rounded-full shadow-xl flex items-center justify-center active:scale-90 transition-all border-2 border-white/60 relative overflow-hidden group"
          title="Lưu Context"
          style={{ 
            backgroundImage: rabbitSkin ? `url(${rabbitSkin})` : 'none',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          {!rabbitSkin && (
            <svg viewBox="0 0 24 24" className="w-8 h-8 fill-[#EF5B9A] drop-shadow-sm" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 22C14.7614 22 17 19.7614 17 17C17 15.6503 16.4673 14.4243 15.6 13.5181V13C15.6 12.3373 16.1373 11.8 16.8 11.8C18.5121 11.8 19.9 10.4121 19.9 8.7C19.9 6.98792 18.5121 5.6 16.8 5.6C16.1373 5.6 15.6 5.06274 15.6 4.4C15.6 2.74315 14.2569 1.4 12.6 1.4H11.4C9.74315 1.4 8.4 2.74315 8.4 4.4C8.4 5.06274 7.86274 5.6 7.2 5.6C5.48792 5.6 4.1 6.98792 4.1 8.7C4.1 10.4121 5.48792 11.8 7.2 11.8C7.86274 11.8 8.4 12.3373 8.4 13V13.5181C7.53273 14.4243 7 15.6503 7 17C7 19.7614 9.23858 22 12 22ZM10.5 16C10.5 15.4477 10.9477 15 11.5 15C12.0523 15 12.5 15.4477 12.5 16C12.5 16.5523 12.0523 17 11.5 17C10.9477 17 10.5 16.5523 10.5 16Z" />
            </svg>
          )}
        </button>
      </footer>

      {/* Bot Picker Modal */}
      <AnimatePresence>
        {showBotPicker && (
          <div className="fixed inset-0 z-[110] flex items-end justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowBotPicker(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="w-full max-w-md bg-[#FDF2F5] rounded-t-[40px] p-6 pb-12 relative z-10 border-t border-[#F9C6D4]"
            >
              <div className="w-12 h-1.5 bg-[#F9C6D4] rounded-full mx-auto mb-6" />
              <h3 className="text-lg font-black text-[#B94470] text-center mb-6">Chọn nhân vật từ Tab 1</h3>
              
              <div className="max-h-[60vh] overflow-y-auto space-y-3 pb-4">
                {botList.length === 0 ? (
                  <div className="text-center py-10">
                    <p className="text-sm font-bold text-[#D7B8B8]">Chưa có nhân vật nào được tạo ở Tab 1 nhen vợ ơi... 💕</p>
                  </div>
                ) : (
                  botList.map((bot, idx) => (
                    <div 
                      key={idx} 
                      onClick={() => linkBot(bot)}
                      className="bg-white border border-[#F9C6D4] rounded-2xl p-4 flex items-center gap-4 active:bg-[#FFF5FB]"
                    >
                      <div className="w-14 h-14 rounded-xl bg-[#FDF2F5] border border-[#F9C6D4] flex items-center justify-center text-2xl">
                        🎀
                      </div>
                      <div className="flex-1">
                        <h4 className="text-sm font-black text-[#555555]">{bot.name}</h4>
                        <p className="text-[10px] font-bold text-[#D7B8B8] line-clamp-1">{bot.description}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div 
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
            className="fixed bottom-32 left-1/2 -translate-x-1/2 z-[200] bg-[#3B2A35]/90 text-white px-6 py-3 rounded-2xl text-xs font-black shadow-xl border border-white/20 whitespace-nowrap"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        .dashed-border {
          background-image: url("data:image/svg+xml,%3csvg width='100%25' height='100%25' xmlns='http://www.w3.org/2000/svg'%3e%3crect width='100%25' height='100%25' fill='none' rx='16' ry='16' stroke='%23F9C6D4FF' stroke-width='3' stroke-dasharray='8%2c 8' stroke-dashoffset='0' stroke-linecap='square'/%3e%3c/svg%3e");
          border-radius: 20px;
        }
      `}</style>
    </motion.div>
  );
}
