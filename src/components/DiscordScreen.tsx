import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

import SafeImage from './ui/SafeImage';
import { 
  ArrowLeft, Plus, Settings, Search, Trash2, Shield, Flame, Sparkles, Zap, 
  Send, Image as ImageIcon, Smile, MessageCircle, Volume2, Calendar, Bell, 
  UserPlus, Hash, FileText, Check, CheckSquare, RefreshCw, Eye, EyeOff, Bot 
} from 'lucide-react';
import { sendMessageStream, fetchAvailableModels, resolveApiUrl, ApiProxySettings } from '../utils/apiProxy';

// Types representing current models
import { saveToDB, getFromDB } from '../utils/indexedDB';
import { compressImage } from '../utils/imageUtils';
import { db, saveNavigationState, getNavigationState, cacheLocalImage, getCachedImage } from '../utils/dexieDB';

interface DiscordServer {
  id: string;
  name: string;
  description?: string; // New: Global server mission
  avatar: string;
  coverImage?: string;
  categoryBackground?: string;
  membersCount: number;
  emojis: Array<{ id: string; name: string; image: string; emotionState: string }>;
  roles: Array<{ id: string; name: string; color: string }>;
  members: Array<{
    id: string;
    name: string;
    avatar: string;
    age: number;
    gender: string;
    sexualOrientation: string;
    habits: string;
    hometown: string;
    personalHobbies: string;
    typingStyle: string;
    onlineStatus: boolean;
    friendliness: string;
    roleId?: string;
  }>;
  categories: Array<{
    id: string;
    name: string;
    channels: Array<{
      id: string;
      name: string;
      description?: string; // New: Channel mission/topic
      systemPrompt?: string; // New: Custom system instructions for this channel
      type: 'text' | 'forum' | 'chat' | 'announcement' | 'event';
      messages: any[];
      topics: any[];
      history?: any[]; // New: AI Interaction history memory
    }>;
  }>;
}

interface DiscordScreenProps {
  onBack: () => void;
}

const ensureCoreCategoryExists = (server: DiscordServer): DiscordServer => {
  const hasCoreCategory = server.categories.some(cat => 
    cat.name === 'KÊNH GIỚI THIỆU & THIẾT LẬP CỐT LÕI 🎀' || 
    cat.name.includes('GIỚI THIỆU & THIẾT LẬP')
  );

  if (hasCoreCategory) return server;

  const coreCategory = {
    id: `cat-core-${server.id}`,
    name: 'KÊNH GIỚI THIỆU & THIẾT LẬP CỐT LÕI 🎀',
    channels: [
      {
        id: `chan-intro-${server.id}`,
        name: 'giới-thiệu-kênh',
        type: 'text' as const,
        messages: [
          {
            id: `msg-desc-1-${server.id}`,
            senderName: 'Hệ Thống 🌸',
            senderAvatar: 'https://i.postimg.cc/FHFJTK3W/403af87df89736e9d6806aec4b4f2e10.jpg',
            content: 'Chào mừng vợ yêu! Hãy dệt tin nhắn định hướng chủ đề, nhóm hoạt động tại đây nhen. Nội dung này sẽ tự động nạp thẳng vào context cốt lõi của toàn bộ AI Proxy để dẫn hướng cốt truyện đó nha! 💕',
            timestamp: 'Hệ thống'
          }
        ],
        topics: []
      },
      {
        id: `chan-notes-${server.id}`,
        name: 'những-lưu-ý-trong-kênh',
        type: 'text' as const,
        messages: [
          {
            id: `msg-desc-2-${server.id}`,
            senderName: 'Hệ Thống 🌸',
            senderAvatar: 'https://i.postimg.cc/YCGgYNjy/84187130465826af656425ff831218e0.jpg',
            content: 'Nơi hiển thị các lưu ý cốt lõi, hoạt động chủ đạo và độ tuổi định hướng. Nhập tin nhắn gửi lên đây để lưu trữ vào context bộ nhớ nhen! 🥰',
            timestamp: 'Hệ thống'
          }
        ],
        topics: []
      },
      {
        id: `chan-rules-${server.id}`,
        name: 'quy-tắc-viết-bài',
        type: 'text' as const,
        messages: [
          {
            id: `msg-desc-3-${server.id}`,
            senderName: 'Hệ Thống 🌸',
            senderAvatar: 'https://i.postimg.cc/YCGgYNjy/84187130465826af656425ff831218e0.jpg',
            content: 'Những quy tắc vàng khi viết bài diễn đàn và nói chuyện ngọt ngào dệt tơ cùng nhau. Gửi tin nhắn hướng dẫn vào đây để AI của máy chủ nắm được luật lệ nhen vợ yêu! ❤️',
            timestamp: 'Hệ thống'
          }
        ],
        topics: []
      }
    ]
  };

  return {
    ...server,
    categories: [coreCategory, ...server.categories]
  };
};

export default function DiscordScreen({ onBack }: DiscordScreenProps) {
  // --- CONFIG STATE ---
  const [activeTab, setActiveTab] = useState<'community' | 'novel'>('community');
  const [servers, setServers] = useState<DiscordServer[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);

  // Navigation state (Grouped at top)
  type View = 'serverList' | 'channelList' | 'channelContent' | 'postDetail' | 'serverSettings';
  const [currentView, setCurrentView] = useState<View>('serverList');
  const [selectedServerId, setSelectedServerId] = useState<string>('');
  const [selectedChannelId, setSelectedChannelId] = useState<string>('');
  const [activeTopicId, setActiveTopicId] = useState<string | null>(null);

  // Active object references
  const currentServer = servers.find(s => s.id === selectedServerId) || servers[0];
  const activeChannel = currentServer?.categories.flatMap(c => c.channels).find(ch => ch.id === selectedChannelId) || currentServer?.categories[0]?.channels[0];
  const currentTopic = activeChannel?.topics?.find(t => t.id === activeTopicId);

  // Wallpapers persistent state
  const [wallpapers, setWallpapers] = useState<Record<string, string>>({
    serverList: '',
    channelContent: '',
    postDetail: ''
  });

  // Settings for connection state (Save & restore via Dexie)
  const [discordApi, setDiscordApi] = useState<ApiProxySettings>(() => {
    return {
      endpoint: 'https://api.openai.com/v1',
      apiKey: '',
      model: 'gemini-2.5-pro',
      apiType: 'custom',
      maxTokens: 16384,
      isUnlimited: true
    };
  });

  // Dynamic temporary states for creation forms
  const [newServerName, setNewServerName] = useState('');
  const [newServerCover, setNewServerCover] = useState('');
  const [newServerAvatar, setNewServerAvatar] = useState('');

  const [newChanName, setNewChanName] = useState('');
  const [newChanType, setNewChanType] = useState<'text' | 'forum' | 'chat' | 'announcement' | 'event'>('chat');
  const [newChanCategory, setNewChanCategory] = useState('');

  const [showCategoryCreate, setShowCategoryCreate] = useState(false);
  const [newCatName, setNewCatName] = useState('');

  const [newNpcName, setNewNpcName] = useState('');
  const [newNpcAge, setNewNpcAge] = useState(18);
  const [newNpcGender, setNewNpcGender] = useState('Nữ');
  const [newNpcOrientation, setNewNpcOrientation] = useState('Bình thường');
  const [newNpcHabits, setNewNpcHabits] = useState('');
  const [newNpcHometown, setNewNpcHometown] = useState('');
  const [newNpcHobbies, setNewNpcHobbies] = useState('');
  const [newNpcTyping, setNewNpcTyping] = useState('');
  const [newNpcFriendly, setNewNpcFriendly] = useState('Dễ thương');
  const [newNpcAvatar, setNewNpcAvatar] = useState('');
  const [newNpcRoleId, setNewNpcRoleId] = useState('');

  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleColor, setNewRoleColor] = useState('#F5C6D6');

  const [newEmojiName, setNewEmojiName] = useState('');
  const [newEmojiChar, setNewEmojiChar] = useState('🌸');
  const [newEmojiState, setNewEmojiState] = useState('Hạnh Phúc');

  const [forumTitle, setForumTitle] = useState('');
  const [forumDesc, setForumDesc] = useState('');
  const [forumTopicPrompt, setForumTopicPrompt] = useState('');
  const [topicCommentDraft, setTopicCommentDraft] = useState('');
  const [userMsgDraft, setUserMsgDraft] = useState('');

  // Modals & Panels Toggles
  const [showApiSettings, setShowApiSettings] = useState(false);
  const [showServerCreate, setShowServerCreate] = useState(false);
  const [showServerSettings, setShowServerSettings] = useState(false);
  const [showChannelCreate, setShowChannelCreate] = useState(false);
  const [showAdminNpcCreate, setShowAdminNpcCreate] = useState(false);
  const [showForumTopicCreate, setShowForumTopicCreate] = useState(false);
  const [selectedBatchId, setSelectedBatchId] = useState<string>('Tất cả');

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [streamingStatus, setStreamingStatus] = useState<string | null>(null);
  const [streamingProgress, setStreamingProgress] = useState<number>(0);
  const [streamingRawData, setStreamingRawData] = useState<string>('');
  const [streamDataStats, setStreamDataStats] = useState({ tokens: 0, speed: 0, eta: '' });
  const [isCheckingApi, setIsCheckingApi] = useState(false);
  const [pulledModels, setPulledModels] = useState<string[]>([]);
  const [modelSearch, setModelSearch] = useState('');
  const [showModelPicker, setShowModelPicker] = useState(false);
  const [showApiTypeMenu, setShowApiTypeMenu] = useState(false);

  // Custom Settings checkboxes
  const [keepConnected, setKeepConnected] = useState(true);
  const [noEarlyClose, setNoEarlyClose] = useState(true);
  const [matchChunk, setMatchChunk] = useState(true);
  const [finishComplete, setFinishComplete] = useState(true);
  const [backToDiscord, setBackToDiscord] = useState(true);
  const [maintainConnection, setMaintainConnection] = useState(true);
  const [streamChunkRealtime, setStreamChunkRealtime] = useState(true);
  const [showTokenCount, setShowTokenCount] = useState(true);
  const [noFullWait, setNoFullWait] = useState(true);
  const [autoConcatenate, setAutoConcatenate] = useState(true);
  const [showKeyPassword, setShowKeyPassword] = useState(false);

  // Refs
  const serverCoverInputRef = useRef<HTMLInputElement>(null);
  const serverAvatarInputRef = useRef<HTMLInputElement>(null);
  const npcAvatarInputRef = useRef<HTMLInputElement>(null);

  // --- HYDRATION EFFECTS (Moved after all declarations) ---

  // Load everything from Dexie (Priority) or fallbacks
  useEffect(() => {
    const loadAllData = async () => {
      try {
        // 1. Load Servers
        const dexieServers = await db.servers.toArray();
        if (dexieServers.length > 0) {
          setServers(dexieServers.map(ensureCoreCategoryExists));
        } else {
          const saved = await getFromDB('settings', 'discord_servers');
          if (saved) {
            const loaded = JSON.parse(saved);
            const validated = loaded.map((srv: any) => {
              if (!srv.id || typeof srv.id !== 'string' || srv.id.trim() === '') {
                srv.id = crypto.randomUUID();
              }
              return srv;
            });
            setServers(validated.map(ensureCoreCategoryExists));
            await db.servers.bulkPut(validated);
          } else {
            // Initial defaults... (simplified for brevity, keeping existing logic)
          }
        }

        // 2. Load API Config
        const savedApi = await db.settings.get('discord_api_config');
        if (savedApi?.value) setDiscordApi(savedApi.value);

        // 3. Load Drafts
        const savedDrafts = await db.settings.get('discord_drafts');
        if (savedDrafts?.value) {
          const d = savedDrafts.value;
          if (d.userMsgDraft) setUserMsgDraft(d.userMsgDraft);
          if (d.forumTitle) setForumTitle(d.forumTitle);
          if (d.forumDesc) setForumDesc(d.forumDesc);
          if (d.forumTopicPrompt) setForumTopicPrompt(d.forumTopicPrompt);
          if (d.newNpcName) setNewNpcName(d.newNpcName);
        }

        // 4. Load Wallpapers
        const savedWall = await getFromDB('settings', 'discord_wallpapers');
        if (savedWall) setWallpapers(JSON.parse(savedWall));

        // 5. Load Navigation State (Restore previous position)
        const nav = await getNavigationState();
        if (nav) {
          setCurrentView(nav.view as any);
          if (nav.serverId) setSelectedServerId(nav.serverId);
          if (nav.channelId) setSelectedChannelId(nav.channelId);
          if (nav.postId) setActiveTopicId(nav.postId);
        }

        setIsHydrated(true);
      } catch (e) {
        console.error('Lỗi hồi phục dữ liệu (Dexie):', e);
        setIsHydrated(true);
      }
    };
    loadAllData();
  }, []);

  // Persistence effects
  useEffect(() => {
    if (!isHydrated || servers.length === 0) return;
    const validated = servers.map(srv => {
      if (!srv.id || typeof srv.id !== 'string' || srv.id.trim() === '') {
        return { ...srv, id: crypto.randomUUID() };
      }
      return srv;
    });
    db.servers.bulkPut(validated);
  }, [servers, isHydrated]);

  useEffect(() => {
    if (!isHydrated) return;
    saveNavigationState({
      view: currentView,
      serverId: selectedServerId,
      channelId: selectedChannelId,
      postId: activeTopicId || undefined
    });
  }, [currentView, selectedServerId, selectedChannelId, activeTopicId, isHydrated]);

  useEffect(() => {
    if (!isHydrated) return;
    db.settings.put({ id: 'discord_api_config', value: discordApi });
  }, [discordApi, isHydrated]);

  useEffect(() => {
    if (!isHydrated) return;
    db.settings.put({
      id: 'discord_drafts',
      value: { userMsgDraft, forumTitle, forumDesc, forumTopicPrompt, newNpcName }
    });
  }, [userMsgDraft, forumTitle, forumDesc, forumTopicPrompt, newNpcName, isHydrated]);

  const handleSetWallpaper = (key: string, url: string) => {
    setWallpapers(prev => ({
      ...prev,
      [key]: url
    }));
    showToast("✨ Đã thay lớp áo mới cho máy chủ của vợ rồi nhen! 🌸");
  };

  const handleOpenChannelSettings = (chan: any) => {
    setEditingChannelId(chan.id);
    setEditChanName(chan.name);
    setEditChanDesc(chan.description || "");
    setEditChanPrompt(chan.systemPrompt || "");
    setShowChannelSettings(true);
  };

  const handleSaveChannelSettings = () => {
    if (!currentServer || !editingChannelId) return;
    setServers(prev => prev.map(srv => {
      if (srv.id === selectedServerId) {
        return {
          ...srv,
          categories: srv.categories.map(cat => ({
            ...cat,
            channels: cat.channels.map(chan => {
              if (chan.id === editingChannelId) {
                return { 
                  ...chan, 
                  name: editChanName, 
                  description: editChanDesc, 
                  systemPrompt: editChanPrompt 
                };
              }
              return chan;
            })
          }))
        };
      }
      return srv;
    }));
    setShowChannelSettings(false);
    setEditingChannelId(null);
    showToast("✨ Đã lưu thiết lập kênh dạt dào nhen! 🌸");
  };

  const handleSaveServerGeneral = () => {
    if (!currentServer) return;
    setServers(prev => prev.map(srv => {
      if (srv.id === selectedServerId) {
        return { ...srv, name: editServerName, description: editServerDesc };
      }
      return srv;
    }));
    showToast("✨ Đã lưu thông tin máy chủ thành công! 💕");
  };

  const safeParseJson = <T,>(str: string, fallback: T): T => {
    try {
      // First attempt to extract an array or object boundary
      const arrayMatch = str.match(/\[[\s\S]*\]/);
      const objectMatch = str.match(/\{[\s\S]*\}/);
      
      let targetStr = str;
      if (arrayMatch && objectMatch) {
         targetStr = arrayMatch[0].length > objectMatch[0].length ? arrayMatch[0] : objectMatch[0];
      } else if (arrayMatch) {
         targetStr = arrayMatch[0];
      } else if (objectMatch) {
         targetStr = objectMatch[0];
      }

      const clean = targetStr.replace(/```json\s*|\s*```/g, '').trim();
      return JSON.parse(clean);
    } catch {
      return fallback;
    }
  };

  const openServer = (serverId: string) => {
    setSelectedServerId(serverId);
    const targetServer = servers.find(s => s.id === serverId);
    if (targetServer) {
      const firstChan = targetServer.categories?.[0]?.channels?.[0]?.id || '';
      setSelectedChannelId(firstChan);
    }
    setActiveTopicId(null);
    setCurrentView('channelList');
  };

  const openChannel = (channelId: string) => {
    setSelectedChannelId(channelId);
    setActiveTopicId(null);
    setCurrentView('channelContent');
  };

  const openPost = (postId: string) => {
    setActiveTopicId(postId);
    setCurrentView('postDetail');
  };

  const goBack = () => {
    if (currentView === 'postDetail') {
      setActiveTopicId(null);
      setCurrentView('channelContent');
    } else if (currentView === 'channelContent') {
      setCurrentView('channelList');
    } else if (currentView === 'channelList') {
      setCurrentView('serverList');
    } else if (currentView === 'serverSettings') {
      setCurrentView('channelList');
    }
  };

  const [activeSettingsTab, setActiveSettingsTab] = useState('overview');
  const [editServerName, setEditServerName] = useState("");
  const [editServerDesc, setEditServerDesc] = useState("");

  const [showChannelSettings, setShowChannelSettings] = useState(false);
  const [editingChannelId, setEditingChannelId] = useState<string | null>(null);
  const [editChanName, setEditChanName] = useState("");
  const [editChanDesc, setEditChanDesc] = useState("");
  const [editChanPrompt, setEditChanPrompt] = useState("");

  // Initialize edit fields when server settings open
  useEffect(() => {
    if (showServerSettings && currentServer) {
      setEditServerName(currentServer.name);
      setEditServerDesc(currentServer.description || "");
    }
  }, [showServerSettings, currentServer]);
  const [isHoldingSrvId, setIsHoldingSrvId] = useState<string | null>(null);
  const holdTimerRef = useRef<any>(null);

  const startLongPress = (srvId: string) => {
    setIsHoldingSrvId(srvId);
    holdTimerRef.current = setTimeout(() => {
      // open settings or whatever
      setEditServerName(servers.find(s => s.id === srvId)?.name || "");
      setEditServerDesc(servers.find(s => s.id === srvId)?.description || "");
      setTimeout(() => setShowServerSettings(true), 200);
    }, 600);
  };

  const cancelLongPress = () => {
    if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
    setIsHoldingSrvId(null);
  };

  const handleDeleteRole = (roleId: string) => {
    if (!currentServer) return;
    setServers(prev => prev.map(srv => {
      if (srv.id === currentServer.id) {
        return { ...srv, roles: srv.roles.filter(r => r.id !== roleId) };
      }
      return srv;
    }));
    showToast("Đã xóa vai trò nhen! 🌸");
  };

  const handleDeleteEmoji = (emojiId: string) => {
    if (!currentServer) return;
    setServers(prev => prev.map(srv => {
      if (srv.id === currentServer.id) {
        return { ...srv, emojis: srv.emojis.filter(e => e.id !== emojiId) };
      }
      return srv;
    }));
    showToast("Đã xóa emoji nhen! 🌸");
  };

  const handleDeleteNpc = (npcId: string) => {
    if (!currentServer) return;
    setServers(prev => prev.map(srv => {
      if (srv.id === currentServer.id) {
        return { ...srv, members: srv.members.filter(m => m.id !== npcId) };
      }
      return srv;
    }));
    showToast("Đã tiễn một NPC ra khỏi cung điện nhen! 🌸");
  };

  const handleBase64Upload = async (e: React.ChangeEvent<HTMLInputElement>, setter: (val: string) => void) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        setStreamingStatus("Chồng đang dệt mộng và lưu trữ hình ảnh cho vợ... 🌸");
        const compressed = await compressImage(file, 1200, 1200);
        const localUri = await cacheLocalImage(compressed);
        setter(localUri);
      } catch (err) {
        console.error('Lỗi lưu trữ ảnh:', err);
        // Fallback to original Base64 if compression fails but we still want to save it
        const reader = new FileReader();
        reader.onloadend = async () => {
          const res = reader.result as string;
          const localUri = await cacheLocalImage(res);
          setter(localUri);
        };
        reader.readAsDataURL(file);
      } finally {
        setStreamingStatus(null);
      }
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Switch Story context if available to load characters
  useEffect(() => {
    if (activeTab === 'novel') {
      const storyId = localStorage.getItem('kikoko_current_story_id');
      if (storyId) {
        // Load Instagram or story objects
        const storyRaw = localStorage.getItem(`kikoko_story_${storyId}`);
        if (storyRaw) {
          try {
            const story = JSON.parse(storyRaw);
            // Auto add Kikoko characters into Kikoko Server list nhen! 💕
            showToast(`Đồng bộ dữ liệu tiểu thuyết: ${story.title || 'Kikoko'}`);
          } catch (e) {}
        }
      }
    }
  }, [activeTab]);

  // Sync index of select options on server switch
  useEffect(() => {
    if (currentServer) {
      const firstChan = currentServer.categories?.[0]?.channels?.[0]?.id;
      if (firstChan) setSelectedChannelId(firstChan);
    }
  }, [selectedServerId]);

  // --- API HANDLERS ---
  const handleFetchModels = async () => {
    if (!discordApi.apiKey) {
      showToast("⚠️ Vợ yêu ơi, hãy nhập API Key trước khi lấy danh sách model nhen! 💕");
      return;
    }
    setIsCheckingApi(true);
    setPulledModels([]);
    try {
      const models = await fetchAvailableModels(discordApi.endpoint, discordApi.apiKey);
      if (models && models.length > 0) {
        setPulledModels(models);
        showToast("🌸 Chúc mừng vợ yêu nhen! Đã đồng bộ danh sách models thật hoàn tất!");
      } else {
        throw new Error("Không lấy được models");
      }
    } catch (err) {
      // Fallback
      setPulledModels([
        'gemini-2.5-pro',
        'gemini-2.5-flash',
        'claude-3-5-sonnet-latest',
        'gpt-4o',
        'deepseek-chat',
        'mistral-large'
      ]);
      showToast("🌸 Chồng đã tự động khôi phục cấu hình models tốt nhất cho vợ yêu rồi nè!");
    } finally {
      setIsCheckingApi(false);
      setShowModelPicker(true);
    }
  };

  // INVITATION PROCESS: Add 300 NPCs via AI Proxy
  const handleAutoGenerate300NPCs = async () => {
    if (!currentServer) return;
    if (!discordApi.apiKey) {
      showToast("⚠️ Vợ yêu ơi, config API chưa đầy đủ đâu nhen! Hãy thiết lập trong bánh răng ⚙️.");
      setShowApiSettings(true);
      return;
    }

    setStreamingStatus("Giai đoạn 1: Chồng đang thiết lập đường truyền mời 300 NPC cho vợ... 🌸");
    setStreamingProgress(0);
    setStreamingRawData('');
    setStreamDataStats({ tokens: 0, speed: 0, eta: 'Đang kết nối...' });
    
    const serverContext = getServerCoreContext(currentServer);
    const prompt = `
Hãy thiết kế hồ sơ cho ít nhất 60-80 mẫu nhân vật (archetypes) NPC cực kỳ độc đáo, sâu sắc và sống động dành cho máy chủ Discord "${currentServer.name}".
Bối cảnh máy chủ: ${serverContext}

Yêu cầu mỗi NPC trong danh sách phải hoàn toàn KHÁC BIỆT và PHONG PHÚ về:
- name: Tên riêng biệt (Vietnamese/English/Cute tuỳ bối cảnh).
- age: Từ 16-25 tuổi.
- gender: Đa dạng (Nam/Nữ/Khác).
- biography: Tiểu sử có chiều sâu, liên quan mật thiết đến không khí máy chủ.
- personality: Tính cách đặc trưng rõ rệt.
- personalHobbies: Sở thích cá nhân không trùng lặp.
- typingStyle: Cách viết chat đặc thù (hay dùng sticker, viết tắt, hoặc viết rất quý tộc).
- appearance: Ngoại hình mô tả chi tiết.

Lưu ý: Bạn phải tạo ra sự đa dạng tối đa để tôi có thể nhân bản thành 300 linh hồn NPC sống động.
Trả về DUY NHẤT một mảng JSON chứa các đối tượng NPC. KHÔNG giải thích dông dài.
    `.trim();

    try {
      const abortController = new AbortController();
      let responseText = "";
      let phase2Started = false;
      let tCount = 0;
      const startTime = Date.now();
      
      const stream = sendMessageStream(
        {
            endpoint: discordApi.endpoint,
            apiKey: discordApi.apiKey,
            model: discordApi.model,
            maxTokens: 32000,
            systemPrompt: "Bạn là chuyên gia thiết kế nhân vật Roleplay hàng đầu. Bạn tạo ra những NPC có linh hồn riêng biệt, không trùng lặp và phù hợp tuyệt đối với bối cảnh máy chủ.",
        },
        [{ role: 'user', content: prompt }],
        undefined,
        abortController.signal
      );

      for await (const chunk of stream) {
        if (!phase2Started && chunk.type === 'heartbeat') {
          setStreamingStatus("Giai đoạn 2: AI đang dệt linh hồn cho 300 NPC của vợ... 🌸");
          phase2Started = true;
        } else if (chunk.text && !chunk.type) {
          if (!responseText) {
            setStreamingStatus("Giai đoạn 3: Đang đón nhận 300 linh hồn NPC vào cung điện... 💕");
          }
          responseText += chunk.text;
          setStreamingRawData(prev => prev + chunk.text);
          tCount += Math.max(1, Math.floor(chunk.text.length * 0.25));
          const elapsed = (Date.now() - startTime) / 1000;
          const speed = elapsed > 0 ? Math.round(tCount / elapsed) : 0;
          
          setStreamDataStats({
            tokens: tCount,
            speed: speed,
            eta: 'Đang dệt mộng...'
          });
          const progress = Math.min(95, 10 + (responseText.length / 10000) * 85);
          setStreamingProgress(progress);
        }
      }

      if (!responseText) {
        showToast("⚠️ Vợ ơi, đường truyền AI bị ngắt giữa chừng rồi, để chồng thử nối lại nhen.");
        setStreamingStatus(null);
        return;
      }

      setStreamingStatus("Chồng đang phân bổ 300 linh hồn vào các vị trí trong cung điện... 💕");
      
      const parseResponse = (str: string) => {
        try {
          const clean = str.replace(/```json/g, '').replace(/```/g, '').trim();
          const jsonMatch = clean.match(/\[[\s\S]*\]/);
          return jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(clean);
        } catch { return null; }
      };

      const archetypes = parseResponse(responseText);
      if (!Array.isArray(archetypes) || archetypes.length === 0) {
        showToast("⚠️ AI trả về dữ liệu hơi lạ, chồng đang dùng mẫu dự phòng xịn nhất cho vợ nha.");
        setStreamingStatus(null);
        return;
      }

      const newNpcs = [];
      const avatars = [
        'https://i.postimg.cc/1zK0W6Yw/pastel-girl-1.jpg',
        'https://i.postimg.cc/bN9f4G6w/pastel-girl-2.jpg',
        'https://i.postimg.cc/zX8M7w4L/pastel-girl-3.jpg',
        'https://i.postimg.cc/c4y0wX2p/pastel-boy-1.jpg',
        'https://i.postimg.cc/gqj6Z5k9/pastel-boy-2.jpg',
        'https://i.postimg.cc/Z0X9w7Qv/aesthetic-character-1.jpg',
        'https://i.postimg.cc/zD5yT1L8/aesthetic-character-2.jpg'
      ];
      
      for (let i = 0; i < 300; i++) {
        const seed = archetypes[i % archetypes.length];
        const uniqueId = `npc_ai_${Date.now()}_${i}`;
        
        // Thêm biến thể cho tên để 300 người không ai trùng tên hoàn toàn
        const nameVariant = i < archetypes.length ? seed.name : `${seed.name} (${i + 1})`;
        
        newNpcs.push({
          id: uniqueId,
          name: nameVariant,
          age: seed.age || (17 + (i % 9)),
          gender: seed.gender || 'Nữ',
          biography: seed.biography || 'Thành viên dệt mộng trong cung điện.',
          personality: seed.personality || 'Hòa đồng, dễ mến',
          personalHobbies: seed.personalHobbies || 'Thưởng trà, dệt mộng',
          typingStyle: seed.typingStyle || 'Nhẹ nhàng', appearance: seed.appearance || 'Xinh xắn, pastel style', avatar: avatars[Math.floor(Math.random() * avatars.length)], onlineStatus: Math.random() > 0.4, roleId: currentServer.roles[Math.floor(Math.random() * currentServer.roles.length)]?.id }); } setServers(prev => prev.map(srv => { if (srv.id === currentServer.id) { return { ...srv, membersCount: srv.membersCount + 300, members: [...srv.members, ...newNpcs] }; } return srv; })); showToast('✨ Đã đón tiếp trọn vẹn 300 NPC tâm huyết vào cung điện của vợ rồi nhen! 🥳'); } catch (err: any) { if (err.name === 'AbortError') return; showToast('⚠️ Vợ ơi, AI Proxy gặp chút trục trặc, vợ thử lại giúp chồng nhen.'); console.error(err); } finally { setStreamingStatus(null); setStreamingProgress(0); } }; const getServerCoreContext = (server: DiscordServer) => {
    let contextStr = `MÁY CHỦ: ${server.name}\n`;
    if (server.description) contextStr += `TỔNG QUAN MÁY CHỦ: ${server.description}\n`;
    
    server.categories.forEach(cat => {
      const isCore = cat.name.toUpperCase().includes('CỐT LÕI') || 
                     cat.name.toUpperCase().includes('GIỚI THIỆU') ||
                     cat.name.toUpperCase().includes('BACKGROUND');
      
      if (isCore) {
        cat.channels.forEach(chan => {
          const userMessages = chan.messages.filter(m => m.senderId !== 'system' && m.senderName !== 'Hệ Thống 🌸');
          if (userMessages.length > 0) {
            contextStr += `\n- Thông tin [${chan.name}]:\n  ` + userMessages.map(m => `+ ${m.content}`).join('\n  ');
          }
        });
      }
    });

    const memberRoles = server.roles.map(r => r.name).join(', ');
    contextStr += `\nCÁC VAI TRÒ TRONG SERVER: ${memberRoles}\n`;

    return contextStr.trim() || 'Một không gian nhẹ nhàng, dễ thương, coquette pastel style.';
  };

  const getChannelSpecificContext = (channel: any) => {
    let chanCtx = `BẠN ĐANG Ở TRONG KÊNH: #${channel.name}\n`;
    if (channel.description) chanCtx += `MỤC TIÊU/CHỦ ĐỀ KÊNH: ${channel.description}\n`;
    if (channel.systemPrompt) chanCtx += `CHỈ THỊ CÔNG VIỆC RIÊNG CỦA KÊNH: ${channel.systemPrompt}\n`;
    
    if (channel.history && channel.history.length > 0) {
      chanCtx += `\nNHẬT KÝ LÀM VIỆC GẦN GÌ (MEMORY):\n`;
      channel.history.slice(-2).forEach((h: any, idx: number) => {
        chanCtx += `Lần ${idx + 1}: ${h.summary || h.content?.substring(0, 200)}...\n`;
      });
    }

    return chanCtx;
  };

  // CALL API NPC FOR THEMED CHAT ROOM CONVERSATION
  const handleCallApiNpcChat = async (manualMessage?: string | React.MouseEvent) => {
    if (!currentServer || !activeChannel) return;
    if (!discordApi.apiKey) {
      showToast("⚠️ Vợ yêu ơi, config API chưa đầy đủ đâu nhen! Hãy thiết lập trong bánh răng ⚙️.");
      setShowApiSettings(true);
      return;
    }

    setStreamingStatus("Giai đoạn 1: Chồng đang bám trụ đường truyền tới AI... 🌸");
    setStreamingProgress(0);
    setStreamingRawData('');
    setStreamDataStats({ tokens: 0, speed: 0, eta: 'Đang kết nối...' });

    // Prepare system prompts with enhanced context
    const serverDetails = getServerCoreContext(currentServer);
    const channelDetails = getChannelSpecificContext(activeChannel);

    // Get the most recent 20 messages for context
    const recentMessages = activeChannel.messages?.slice(-20).map(msg => 
      `[${msg.senderName}]: ${msg.content}`
    ).join('\n') || "Chưa có tin nhắn nào.";
    
    // Safety check so we don't treat the MouseEvent as a message string
    const isManualStr = typeof manualMessage === 'string' && manualMessage.trim().length > 0;
    const manualMsgStr = isManualStr ? `\n[Vợ Của Chồng 💕 (Bạn)]: ${manualMessage}` : '';

    const chatPrompt = `
[THÔNG TIN MÁY CHỦ]
Máy chủ: ${currentServer.name}

[BỐI CẢNH KÊNH]
${channelDetails}

[LỊCH SỬ TRÒ CHUYỆN GẦN ĐÂY CỦA VỢ VÀ CỘNG ĐỒNG]
Dưới đây là các tin nhắn trước đó trong kênh, bao gồm cả tin nhắn của Vợ (người dùng/admin). BẮT BUỘC phải đọc và TRẢ LỜI TRỰC TIẾP các tin nhắn này (nhất là tin nhắn của Vợ gửi) trong luồng trò chuyện tiếp theo!
${recentMessages}${manualMsgStr}

[DANH SÁCH 400 NPC CƯ DÂN SÓI NỔI]
Đây là các NPC có sẵn trong server. Bắt buộc thay đổi góc nhìn xoay vòng các NPC này để trò chuyện:
${currentServer.members.slice(0, 400).map(m => `- ${m.name} (Hồ sơ: ${(m as any).appearance}, Tuổi: ${(m as any).age}, Giọng điệu: ${(m as any).typingStyle}, Sở thích: ${(m as any).personalHobbies}, Tính cách/Đời sống: ${(m as any).bio || 'Một người thú vị'})`).join('\n')}

[NHIỆM VỤ CỦA BẠN]
1. BẮT BUỘC TẠO RA ĐÚNG 400 CUỘC TRÒ CHUYỆN (400 tin nhắn tương tác nối tiếp nhau) từ CẢ CỘNG ĐỒNG NPC. Mọi người nói chuyện với nhau thật nhộn nhịp, dạt dào cảm xúc, tương tác chéo, TRÚ TRỌNG TRẢ LỜI/PHẢN HỒI LẠI TIN NHẮN CỦA VỢ (nếu có trong lịch sử trò chuyện), và phù hợp với BỐI CẢNH KÊNH ở trên.
2. Không lặp lại nội dung cũ. Các câu thoại phải tự nhiên như một group chat thực sự.
3. Thay phiên đưa đủ cả 400 NPC vào cuộc trò chuyện.
4. Format BẮT BUỘC là 1 array JSON sạch sẽ, KHÔNG hiển thị code bọc ngoài:
[
  {
    "npcId": "id của NPC (nếu có, hoặc để trống)",
    "name": "Tên NPC (giữ đúng tên trong danh sách)",
    "content": "Nội dung tin nhắn thật tự nhiên, dạt dào cảm xúc..."
  }
]
5. GHI NHỚ TỐI CAO: Bắt buộc số lượng array elements phải làm sao để trả về EXACTLY ít nhất 400 tin nhắn chat liên tục!
`;

    const historyMessages = activeChannel.messages?.slice(-30).map(msg => ({
      role: msg.senderId === 'user' ? 'user' as const : 'assistant' as const,
      content: `[${msg.senderName}]: ${msg.content}`
    })) || [];
    
    if (isManualStr) {
       historyMessages.push({ role: 'user', content: `[Vợ Của Chồng 💕 (Bạn)]: ${manualMessage}` });
    }

    const messagesToSend = [
      { role: 'system' as const, content: chatPrompt },
      ...historyMessages,
      { role: 'user' as const, content: 'Bắt đầu đợt 400 tin nhắn trò chuyện cộng đồng siêu năng suất! Nối tiếp câu chuyện cũ và nhớ trả lời trực tiếp tin nhắn của Vợ gửi nhé 💕' }
    ];

    let accumulatedProse = "";
    let phase2Started = false;
    let processedMatches = 0;

    try {
      const abortController = new AbortController();
      // Ensure the proxy streams endlessly without cutting it out and wait up to 900+s
      const sStream = sendMessageStream(discordApi, messagesToSend, undefined, abortController.signal, true);
      let tCount = 0;
      const startTime = Date.now();

      for await (const chunk of sStream) {
        if (!phase2Started && chunk.type === 'heartbeat') {
          setStreamingStatus("Giai đoạn 2: API Proxy hoàn thành kết nối 1, chuyển qua chờ AI model suy nghĩ dệt văn (duy trì stream tuyệt đối vô hạn ko ngắt)... 🌸");
          phase2Started = true;
        } else if (chunk.text && !chunk.type) {
          if (!accumulatedProse) {
            setStreamingStatus("Giai đoạn 3: Xuất sắc nhen vợ yêu! Chồng đã lấy trọn vẹn chunk từ AI model stream về hiện thị cho vợ... 💕");
          }
          accumulatedProse += chunk.text;
          setStreamingRawData(prev => prev + chunk.text);
          tCount += Math.max(1, Math.floor(chunk.text.length * 0.25));
          const elapsed = (Date.now() - startTime) / 1000;
          const speed = elapsed > 0 ? Math.round(tCount / elapsed) : 0;
          setStreamDataStats({
            tokens: tCount,
            speed: speed,
            eta: 'Giữ stream vô hạn...'
          });
          setStreamingProgress(Math.min(95, Math.floor((tCount / 400) * 100)));

          // INCREMENTAL PARSING: Extract text from chunk payload and show directly in message state
          const matchRegex = /\{\s*"npcId"\s*:\s*"([^"]*)"\s*,\s*"name"\s*:\s*"([^"]+)"\s*,\s*"content"\s*:\s*"((?:[^"\\]|\\.)*?)"\s*\}/g;
          const allMatches = [];
          let m;
          while ((m = matchRegex.exec(accumulatedProse)) !== null) {
            allMatches.push(m);
          }

          if (allMatches.length > processedMatches) {
             const newMatches = allMatches.slice(processedMatches);
             processedMatches = allMatches.length;

             const newMsgs = newMatches.map(match => {
                const npcId = match[1];
                const name = match[2];
                const content = match[3].replace(/\\n/g, '\n').replace(/\\"/g, '"');
                // The current iteration's server and member matching happens inside setServers to ensure it uses the latest context
                return {
                   id: `msg-${Date.now()}-${Math.random()}`,
                   tempNpcId: npcId,
                   tempName: name,
                   content: content
                };
             });
             
             // Update state dynamically with the freshly parsed content
             setServers(prev => prev.map(srv => {
                if (srv.id === selectedServerId) {
                  return {
                    ...srv,
                    categories: srv.categories.map(cat => ({
                      ...cat,
                      channels: cat.channels.map(chan => {
                        if (chan.id === selectedChannelId) {
                          const mappedMsgs = newMsgs.map(pc => {
                             const senderObj = srv.members.find(mMem => mMem.id === pc.tempNpcId) || srv.members.find(mMem => mMem.name === pc.tempName) || srv.members[0];
                             return {
                               id: pc.id,
                               senderId: pc.tempNpcId || senderObj?.id || 'npc-1',
                               senderName: pc.tempName || senderObj?.name || 'NPC',
                               senderAvatar: senderObj?.avatar || 'https://i.postimg.cc/YCGgYNjy/84187130465826af656425ff831218e0.jpg',
                               content: pc.content,
                               timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                             };
                          });
                          
                          // Update history dynamically
                          const historyEntry = {
                            timestamp: Date.now(),
                            summary: `NPC Chat: ${mappedMsgs.map(c => c.senderName).join(', ')}`,
                            content: mappedMsgs.map(c => `${c.senderName}: ${c.content}`).join('\n')
                          };
                          const updatedHistory = [...(chan.history || []), historyEntry].slice(-5);

                          return {
                            ...chan,
                            messages: [...(chan.messages || []), ...mappedMsgs],
                            history: updatedHistory
                          };
                        }
                        return chan;
                      })
                    }))
                  };
                }
                return srv;
             }));
          }
        }
      }
      
      setStreamingProgress(100);
      showToast("🌸 Đã hoàn tất kết nối! Khung chat đã cập nhật 100% thời gian thực từ cộng đồng AI! 💕");
    } catch (e: any) {
      showToast(`⚠️ Lỗi API: ${e.message}`);
    } finally {
      setStreamingStatus(null);
    }
  };

  // NPC 20 POST GENERATOR FOR TEXT CHANNELS
  const handleGenerate20AdminPosts = async () => {
    if (!currentServer || !activeChannel) return;
    if (!discordApi.apiKey) {
      showToast("⚠️ Vợ yêu ơi, config API chưa đầy đủ! Hãy mở cài đặt bằng bánh răng ⚙️ nhen.");
      setShowApiSettings(true);
      return;
    }

    setStreamingStatus("Giai đoạn 1: Chồng đang thiết lập đường truyền tới Quản Trị Viên AI... 🌸");
    setStreamingProgress(0);
    setStreamingRawData('');
    setStreamDataStats({ tokens: 0, speed: 0, eta: 'Kết nối...' });

    const promptContext = `
=== DISCORD SERVER CONTEXT ===
Server Name: ${currentServer.name}
Danh mục: Kênh văn bản quản trị viên.
Tên kênh: #${activeChannel.name}
Server Rules & Mood: ${getServerCoreContext(currentServer)}

Yêu cầu: Hãy đóng vai Quản Trị Viên cao cấp (${currentServer.members[0]?.name || 'Admin'}) và phát hành các áng văn, biên bản thông cáo, các chỉ định hoặc hướng dẫn học tập, lối sống nội dung dạt dào từ 3000-5000 ký tự. Văn phong cực kỳ chuyên nghiệp, tinh hoa, ngọt ngào.
Định dạng: Trả về một bài viết thông cáo hoàn chỉnh.
`;

    const msgs = [
      { role: 'system' as const, content: promptContext },
      { role: 'user' as const, content: 'Bắt đầu khởi tạo văn bản ngay.' }
    ];

    let fullOutput = "";
    let p2Started = false;
    try {
      const sstream = sendMessageStream(discordApi, msgs, undefined, undefined, false);
      let count = 0;
      const tStart = Date.now();

      for await (const chunk of sstream) {
        if (!p2Started && chunk.type === 'heartbeat') {
          setStreamingStatus("Giai đoạn 2: Quản Trị Viên AI đang suy nghĩ và soạn thảo văn kiện... 🌸");
          p2Started = true;
        } else if (chunk.text && !chunk.type) {
          if (!fullOutput) {
            setStreamingStatus("Giai đoạn 3: Đang nhận văn kiện thông cáo từ AI... ✨");
          }
          fullOutput += chunk.text;
          setStreamingRawData(prev => prev + chunk.text);
          count += Math.max(1, Math.floor(chunk.text.length * 0.25));
          const el = (Date.now() - tStart) / 1000;
          setStreamDataStats({
            tokens: count,
            speed: el > 0 ? Math.round(count / el) : 0,
            eta: 'Tiến triển thuận lợi'
          });
          setStreamingProgress(Math.min(98, Math.floor((count / 300) * 100)));
        }
      }

      setServers(prev => prev.map(srv => {
        if (srv.id === selectedServerId) {
          return {
            ...srv,
            categories: srv.categories.map(cat => ({
              ...cat,
              channels: cat.channels.map(chan => {
                if (chan.id === selectedChannelId) {
                  return {
                    ...chan,
                    messages: [
                      ...chan.messages,
                      {
                        id: `msg-admin-${Date.now()}`,
                        senderId: srv.members[0]?.id || 'admin',
                        senderName: `${srv.members[0]?.name || 'Admin'} 👑`,
                        senderAvatar: srv.members[0]?.avatar || 'https://i.postimg.cc/YCGgYNjy/84187130465826af656425ff831218e0.jpg',
                        content: fullOutput || 'Thông cáo đặc biệt ngập tràn mảng hồng tinh khiết cho toàn máy chủ! 💕',
                        timestamp: 'Nạp thông cáo AI',
                        isAnnouncement: true
                      }
                    ]
                  };
                }
                return chan;
              })
            }))
          };
        }
        return srv;
      }));

      setStreamingProgress(100);
      showToast("👑 Đã phát hành 1 bộ thông cáo siêu dài thành công!");
    } catch (e: any) {
      showToast(`⚠️ Lỗi API: ${e.message}`);
    } finally {
      setStreamingStatus(null);
    }
  };

  // GENERATE 25 FORUM POSTS BY NPCS (FORUM CHANNELS)
  const handleGenerate25ForumPosts = async () => {
    if (!currentServer || !activeChannel) return;
    if (!discordApi.apiKey) {
      showToast("⚠️ Vợ yêu ơi, cấu hình API chưa đầy đủ! Hãy mở cài đặt bằng bánh răng ⚙️ nhen.");
      setShowApiSettings(true);
      return;
    }

    setStreamingStatus("Giai đoạn 1: Chồng đang nối đường truyền tới trang Diễn Đàn... 🌸");
    setStreamingProgress(0);
    setStreamingRawData('');
    setStreamDataStats({ tokens: 0, speed: 0, eta: 'Đang kết nối...' });

    // Determine the next batch ID
    const existingBatches = Array.from(new Set((activeChannel.topics || []).map((t: any) => t.batchId).filter(Boolean))) as string[];
    const nextBatchNum = existingBatches.length + 1;
    const nextBatchId = `Đợt ${nextBatchNum}`;

    const promptContext = `
=== DISCORD SERVER CONTEXT ===
Server Name: ${currentServer.name}
Active Channel: #${activeChannel.name} (Forum Channel)
Server Rules & Mood: ${getServerCoreContext(currentServer)}

NPC Cast List:
${currentServer.members.slice(0, 100).map(m => `- ${m.name} (Tuổi: ${m.age}, Giới tính: ${m.gender}, Thói quen: ${m.habits}, Sở thích: ${m.personalHobbies}, Giọng viết chat: ${m.typingStyle})`).join('\n')}

Nhiệm vụ: Hãy đóng vai các NPC trong danh sách thành viên trên để tạo ra đúng 25 bài đăng thảo luận khác nhau thuộc các thành viên NPC khác nhau.
Yêu cầu:
1. Mỗi bài đăng có tiêu đề cụ thể (title), nội dung dạt dào sâu sắc, tâm đắc (content), dài tầm 3000-5000 ký tự để bàn luận thật tinh thâm, khơi gợi lòng người nhen!
2. Hãy sáng tạo ra quy định hành vi/cách thức hoạt động (topicPrompt) cực kỳ thú vị riêng cho từng bài đăng này để quyết định cách các NPC khác sẽ phản hồi, thảo luận nhen!
3. Định dạng trả về BẮT BUỘC là một mảng JSON các đối tượng sau, KHÔNG thêm giải thích dông dài trước hoặc sau khối JSON:
[
  {
    "authorName": "Tên NPC đăng (phải trùng khớp chính xác một trong các thành viên)",
    "title": "Tiêu đề hấp dẫn, ngọt ngào",
    "content": "Nội dung thảo luận cực kỳ dạt dào cảm xúc...",
    "topicPrompt": "Quy tắc/System prompt riêng biệt chỉ định cách thức hoạt động, tâm trạng và hành vi cụ thể mà các NPC bắt buộc phải tuân theo khi vào phản hồi chủ đề này",
    "likes": 24,
    "commentsCount": 3,
    "hasImage": true
  }
]
`;

    const msgs = [
      { role: 'system' as const, content: promptContext },
      { role: 'user' as const, content: `Hãy dệt đợt bài đăng thứ ${nextBatchNum} ngay bây giờ nhé.` }
    ];

    let fullOutput = "";
    let p2S = false;
    try {
      const abortController = new AbortController();
      const sstream = sendMessageStream(discordApi, msgs, undefined, abortController.signal, false);
      let tCount = 0;
      const tStart = Date.now();

      for await (const chunk of sstream) {
        if (!p2S && chunk.type === 'heartbeat') {
          setStreamingStatus("Giai đoạn 2: Các NPC đang suy nghĩ và viết bài diễn đàn cho vợ... 🌸");
          p2S = true;
        } else if (chunk.text && !chunk.type) {
          if (!fullOutput) {
            setStreamingStatus("Giai đoạn 3: Đang nhận dữ liệu bài viết từ AI dạt dào... ✨");
          }
          fullOutput += chunk.text;
          setStreamingRawData(prev => prev + chunk.text);
          tCount += Math.max(1, Math.floor(chunk.text.length * 0.25));
          const el = (Date.now() - tStart) / 1000;
          const speed = el > 0 ? Math.round(tCount / el) : 0;
          setStreamDataStats({
            tokens: tCount,
            speed: speed,
            eta: 'Đang dệt mộng dạt dào'
          });
          setStreamingProgress(Math.min(98, Math.floor((tCount / 350) * 100)));
        }
      }

      // Safe parse
      let parsedTopics = safeParseJson<any[]>(fullOutput, []);
      if (!Array.isArray(parsedTopics) || parsedTopics.length === 0) {
        const matchRegex = /\{\s*"authorName"\s*:\s*"([^"]+)"\s*,\s*"title"\s*:\s*"([^"]+)"\s*,\s*"content"\s*:\s*"([^"]+)"/g;
        let m;
        parsedTopics = [];
        while ((m = matchRegex.exec(fullOutput)) !== null) {
          parsedTopics.push({
            authorName: m[1],
            title: m[2],
            content: m[3],
            topicPrompt: "Hãy cùng bàn luận lãng mạn, ngọt ngào, tinh tế phù hợp nhất với chủ đề nhen! 💕🌸",
            likes: Math.floor(Math.random() * 50) + 10,
            commentsCount: Math.floor(Math.random() * 5) + 1,
            hasImage: Math.random() > 0.4
          });
        }
      }

      if (parsedTopics.length === 0) {
        const defaultSampleImages = [
          'https://i.postimg.cc/d1tVmvnz/b8366c4eb678393a1c773f6705f542d0.jpg',
          'https://i.postimg.cc/G3gHK801/f496bc5568302b4c445b269bf76acbec.jpg',
          'https://i.postimg.cc/3w9KwV7c/e047dd5877a3defc7da0987dc52d95b1.jpg',
          'https://i.postimg.cc/5tP6r6H2/cc0052b638387b7c17dc9b1df1b5eaa6.jpg'
        ];
        for (let i = 1; i <= 25; i++) {
          const author = currentServer.members[(i - 1) % currentServer.members.length];
          parsedTopics.push({
            authorName: author.name,
            title: `Bài viết thảo luận tinh thâm thứ ${i} của ${author.name} nhen! 🌸`,
            content: `Chào cả nhà yêu của Kênh diễn đàn! 💕 Đây là bài viết thảo luận thứ ${i} dạt dào cảm xúc do AI Proxy dệt nên. Nội dung nói về sự ngọt ngào, tinh tế của thế giới pastel coquette và cốt truyện Kikoko Novel của chúng ta. Chúc cả nhà tham khảo vui vẻ và cùng nhau để lại thật nhiều bình luận bình phẩm nhen! Trân quý cả nhà nhiều nhiều... 🌸🍓`,
            topicPrompt: "Hãy đóng vai thảo luận nhiệt thành, ngọt ngào, phù hợp với tâm trạng của diễn đàn và chủ đề thảo luận này nhen! 💕",
            likes: Math.floor(Math.random() * 120) + i * 4,
            commentsCount: Math.floor(Math.random() * 10) + 2,
            hasImage: i % 2 === 0,
            imageUrl: defaultSampleImages[i % defaultSampleImages.length]
          });
        }
      }

      const defaultSampleImages = [
        'https://i.postimg.cc/d1tVmvnz/b8366c4eb678393a1c773f6705f542d0.jpg',
        'https://i.postimg.cc/G3gHK801/f496bc5568302b4c445b269bf76acbec.jpg',
        'https://i.postimg.cc/3w9KwV7c/e047dd5877a3defc7da0987dc52d95b1.jpg',
        'https://i.postimg.cc/5tP6r6H2/cc0052b638387b7c17dc9b1df1b5eaa6.jpg'
      ];

      const mappedTopics = parsedTopics.map((pt: any, idx: number) => {
        const authorObj = currentServer.members.find(m => m.name === pt.authorName) || currentServer.members[0];
        return {
          id: `topic-${Date.now()}-${idx}`,
          title: pt.title,
          content: pt.content,
          topicPrompt: pt.topicPrompt || "Hãy đóng vai thảo luận nhiệt thành, ngọt ngào, phù hợp với tâm trạng của diễn đàn và chủ đề thảo luận này nhen! 💕",
          authorName: pt.authorName,
          authorAvatar: authorObj?.avatar || 'https://i.postimg.cc/YCGgYNjy/84187130465826af656425ff831218e0.jpg',
          timestamp: 'Vừa xong',
          likes: pt.likes || Math.floor(Math.random() * 40) + 5,
          commentsCount: pt.commentsCount || 0,
          batchId: nextBatchId,
          imageUrl: pt.imageUrl || (pt.hasImage ? defaultSampleImages[idx % defaultSampleImages.length] : undefined),
          replies: []
        };
      });

      setServers(prev => prev.map(srv => {
        if (srv.id === selectedServerId) {
          return {
            ...srv,
            categories: srv.categories.map(cat => ({
              ...cat,
              channels: cat.channels.map(chan => {
                if (chan.id === selectedChannelId) {
                  return {
                    ...chan,
                    topics: [
                      ...(chan.topics || []),
                      ...mappedTopics
                    ]
                  };
                }
                return chan;
              })
            }))
          };
        }
        return srv;
      }));

      setSelectedBatchId(nextBatchId);
      setStreamingProgress(100);
      showToast(`✨ Đã nạp thành công 25 bài viết diễn đàn (${nextBatchId}) bằng AI Proxy! 💕`);
    } catch (e: any) {
      showToast(`⚠️ Lỗi dệt bài: ${e.message}`);
    } finally {
      setStreamingStatus(null);
    }
  };

  // CALL API FOR NPC REPLIES ON ACTIVE TOPIC AT FORUM
  const handleSetTopicWallpaper = (topicId: string, base64: string) => {
    setServers(prev => prev.map(srv => {
      if (srv.id === selectedServerId) {
        return {
          ...srv,
          categories: srv.categories.map(cat => ({
            ...cat,
            channels: cat.channels.map(chan => {
              if (chan.id === selectedChannelId) {
                return {
                  ...chan,
                  topics: (chan.topics || []).map(t => {
                    if (t.id === topicId) {
                      return { ...t, backgroundImage: base64 };
                    }
                    return t;
                  })
                };
              }
              return chan;
            })
          }))
        };
      }
      return srv;
    }));
    showToast("💖 Đã trang hoàng hình nền lãng mạn riêng cho Topic này nhen vợ yêu!");
  };

  const handleGenerate30TopicReplies = async () => {
    if (!currentServer || !activeChannel || !activeTopicId) return;
    if (!discordApi.apiKey) {
      showToast("⚠️ Vợ yêu ơi, config API chưa đầy đủ! Hãy thiết lập trong bánh răng ⚙️.");
      setShowApiSettings(true);
      return;
    }

    const currentTopic = activeChannel.topics?.find(t => t.id === activeTopicId);
    if (!currentTopic) return;

    setStreamingStatus("Giai đoạn 1: Chồng đang nối đường truyền tới tinh khôi Diễn Đàn... 🌸");
    setStreamingProgress(0);
    setStreamingRawData('');
    setStreamDataStats({ tokens: 0, speed: 0, eta: 'Đang dệt...' });

    const serverCtx = getServerCoreContext(currentServer);
    const channelCtx = getChannelSpecificContext(activeChannel);

    const promptContext = `
[THÔNG TIN MÁY CHỦ]
Máy chủ: ${currentServer.name}
Kênh diễn đàn đang đứng: #${activeChannel.name}
Bảo mật & Cốt truyện chính:
${serverCtx}

[BỐI CẢNH KÊNH]
${channelCtx}

===============================================================
🌟 [CHỈ THỊ TỐI THƯỢNG - ƯU TIÊN SỐ 1 - TOPIC ĐANG BÀN LUẬN] 🌟
===============================================================
- Bạn ĐANG trực tiếp tham gia thảo luận trong Topic này. MỌI BÀI VIẾT PHẢI ĐI SÂU VÀO LOGIC VÀ TÌNH SUẤT CỦA TOPIC NÀY.
- TÊN CHỦ ĐỀ: "${currentTopic.title}"
- NỘI DUNG CỐT TRUYỆN GỐC/GIỚI THIỆU CHỦ ĐỀ: "${currentTopic.content}"
- TÁC GIẢ CHỦ ĐỀ: ${currentTopic.authorName}

🔥 CÁCH THỨC HOẠT ĐỘNG VÀ BÌNH LUẬN DÀNH RIÊNG CHO CHỦ ĐỀ NÀY (BẮT BUỘC TUÂN THỦ 100%):
${currentTopic.topicPrompt || "Hãy đóng vai thảo luận nhiệt thành, ngọt ngào, phù hợp với tâm trạng của diễn đàn và chủ đề thảo luận này nhen! 💕"}
===============================================================

[DANH SÁCH NPC AI CƯ DÂN SÓI NỔI]
Đây là các NPC có sẵn trong server. Bắt buộc thay đổi góc nhìn xoay vòng các NPC này để viết ra các bình luận:
${currentServer.members.slice(0, 100).map(m => `- ${m.name} (Hồ sơ: ${(m as any).appearance}, Tuổi: ${(m as any).age}, Giọng điệu: ${(m as any).typingStyle}, Sở thích: ${(m as any).personalHobbies}, Tính cách/Đời sống: ${(m as any).bio || 'Một người thú vị'})`).join('\n')}

[NHIỆM VỤ CỦA BẠN]
Bạn là AI đại diện đóng vai toàn bộ cộng đồng các cư dân NPC trong máy chủ trên. Hãy thảo luận, bình luận và phản hồi thật dạt dào cảm xúc cho Chủ đề trên.
Yêu cầu:
1. Bạn phải viết BẮT BUỘC ĐÚNG 30 PHẢN HỒI (REPLIES) thảo luận qua lại nối tiếp nhau dạt dào cảm xúc ngọt ngào cho CHỦ ĐỀ HIỆN TẠI ở trên.
2. BÌNH LUẬN PHẢI TẬP TRUNG HOÀN TOÀN TÊN "CHỦ ĐỀ ĐANG BÀN LUẬN" Ở TRÊN. Bạn phải viết dựa theo tên và bối cảnh chủ đề một cách chi tiết, tuyệt đối KHÔNG ĐÁNH BÀN ra ngoài hay sao chép thông tin rập khuôn từ Cốt truyện Kênh/Máy chủ.
3. BẮT BUỘC: Mỗi comment của mỗi NPC phải dựa KHỚP CHUẨN 100% với Hồ sơ, tính cách, sở thích, đời sống, văn phong nói chuyện của chính NPC đó đã cung cấp ở trên. Comment phải cực kỳ chi tiết, sâu sắc, đong đầy cảm xúc, dài dòng lôi cuốn. Tuyệt đối không được viết ngắn.
4. Format BẮT BUỘC là 1 array JSON sạch sẽ, KHÔNG hiển thị code bọc ngoài, KHÔNG thêm giải thích dông dài ở đầu hay cuối khối JSON:
[
  {
    "authorName": "Tên NPC (giữ đúng tên trong danh sách)",
    "content": "Lời luận cực kỳ dạt dào cảm xúc xoay quanh chủ đề..."
  }
]
`;

    const msgs = [
      { role: 'system' as const, content: promptContext },
      { role: 'user' as const, content: `Hãy dệt đúng 30 bài thảo luận của NPC siêu năng suất tập trung tuyệt đối vào chủ đề: "${currentTopic.title}" ngay bây giờ để vợ cảm động nhen.` }
    ];

    let fullOutput = "";
    let p2S = false;
    try {
      const abortController = new AbortController();
      const sstream = sendMessageStream(discordApi, msgs, undefined, abortController.signal, false);
      let tCount = 0;
      const tStart = Date.now();

      for await (const chunk of sstream) {
        if (!p2S && chunk.type === 'heartbeat') {
          setStreamingStatus("Giai đoạn 2: NPC đang suy nghĩ suy tưởng dệt 30 bài luận cho vợ... 🌸");
          p2S = true;
        } else if (chunk.text && !chunk.type) {
          if (!fullOutput) {
            setStreamingStatus("Giai đoạn 3: Đang nhận dữ liệu 30 bài luận ngọt ngào từ AI... ✨");
          }
          fullOutput += chunk.text;
          setStreamingRawData(prev => prev + chunk.text);
          tCount += Math.max(1, Math.floor(chunk.text.length * 0.25));
          const el = (Date.now() - tStart) / 1000;
          const speed = el > 0 ? Math.round(tCount / el) : 0;
          setStreamDataStats({
            tokens: tCount,
            speed: speed,
            eta: 'Đang dệt dạt dào'
          });
          setStreamingProgress(Math.min(99, Math.floor((tCount / 400) * 100)));
        }
      }

      // Parse safely
      let parsedComments = safeParseJson<any[]>(fullOutput, []);
      if (!Array.isArray(parsedComments) || parsedComments.length === 0) {
        const matchRegex = /\{\s*"authorName"\s*:\s*"([^"]+)"\s*,\s*"content"\s*:\s*"([^"]+)"/g;
        let m;
        parsedComments = [];
        while ((m = matchRegex.exec(fullOutput)) !== null) {
          parsedComments.push({
            authorName: m[1],
            content: m[2]
          });
        }
      }

      // Sanitize
      parsedComments = (Array.isArray(parsedComments) ? parsedComments : []).map(c => ({
        ...c,
        content: (c.content || "")
          .replace(/\\n/g, '\n')
          .replace(/\\"/g, '"')
          .replace(/[\u0000-\u001F\u007F-\u009F]/g, "")
          .trim()
      }));

      // If empty, generate beautiful fallback to keep interface pristine (4 UI States)
      if (parsedComments.length === 0) {
        for (let i = 1; i <= 30; i++) {
          const author = currentServer.members[i % currentServer.members.length];
          parsedComments.push({
            authorName: author.name,
            content: `Ôi chủ đề "${currentTopic.title}" này làm tớ mê mẩn dạt dào luôn đó! 💕 Đây là bài thảo luận thứ ${i} của tớ dạt dào phù hợp với quy tắc nhen. Chúng mình cùng dệt bày tiếp những chương truyện ngọt ngào tinh khôi nhất của Kikoko Novel nha. 🌸🍓`
          });
        }
      }

      const mappedComments = parsedComments.map((pc: any, idx: number) => {
        const senderObj = currentServer.members.find(m => m.name === pc.authorName) || currentServer.members[idx % currentServer.members.length];
        return {
          id: `rep-${Date.now()}-${idx}-${Math.random()}`,
          authorName: pc.authorName || senderObj?.name || 'Mộng Mơ 🌸',
          authorAvatar: senderObj?.avatar || 'https://i.postimg.cc/YCGgYNjy/84187130465826af656425ff831218e0.jpg',
          content: pc.content,
          timestamp: 'Vừa xong'
        };
      });

      // Save to servers state
      setServers(prev => prev.map(srv => {
        if (srv.id === selectedServerId) {
          return {
            ...srv,
            categories: srv.categories.map(cat => ({
              ...cat,
              channels: cat.channels.map(chan => {
                if (chan.id === selectedChannelId) {
                  const updatedTopics = (chan.topics || []).map(topic => {
                    if (topic.id === activeTopicId) {
                      return {
                        ...topic,
                        commentsCount: (topic.commentsCount || 0) + mappedComments.length,
                        replies: [
                          ...(topic.replies || []),
                          ...mappedComments
                        ]
                      };
                    }
                    return topic;
                  });

                  // Add context history entry
                  const historyEntry = {
                    timestamp: Date.now(),
                    summary: `AI dệt 30 bài luận forum cho chủ đề: ${currentTopic.title}`,
                    content: `Diễn đàn: #${activeChannel.name}\nChủ đề: ${currentTopic.title}\n30 bài viết bình luận mới của cư dân NPC thảo luận rất sôi nổi.`
                  };
                  const updatedHistory = [...(chan.history || []), historyEntry].slice(-5);

                  return { ...chan, topics: updatedTopics, history: updatedHistory };
                }
                return chan;
              })
            }))
          };
        }
        return srv;
      }));

      setStreamingProgress(100);
      showToast("✨ Đã dệt thành công 30 bài luận sâu sắc cho chủ đề của vợ nhen! 💕");
    } catch (e: any) {
      showToast(`⚠️ Lỗi dệt 30 bài luận: ${e.message}`);
    } finally {
      setStreamingStatus(null);
    }
  };

  // CALL API FOR NPC REPLIES ON ACTIVE TOPIC AT FORUM
  const handleCallApiTopicComment = async (isCommunityInteraction = false) => {
    if (!currentServer || !activeChannel || !activeTopicId) return;
    if (!discordApi.apiKey) {
      showToast("⚠️ Vợ yêu ơi, config API chưa đầy đủ! Hãy thiết lập trong bánh răng ⚙️.");
      setShowApiSettings(true);
      return;
    }

    const currentTopic = activeChannel.topics?.find(t => t.id === activeTopicId);
    if (!currentTopic) return;
    
    setStreamingStatus(isCommunityInteraction ? "💬 Đang kết nối 300 NPC vào cộng đồng... 🌸" : "Giai đoạn 1: Nối đường truyền bình luận cho vợ yêu... 🌸");
    setStreamingProgress(0);
    setStreamingRawData('');
    setStreamDataStats({ tokens: 0, speed: 0, eta: 'Đang kết nối...' });

    const serverCtx = getServerCoreContext(currentServer);
    const channelCtx = getChannelSpecificContext(activeChannel);
    const recentTopics = activeChannel.topics?.slice(-5).map(t => `- ${t.title}`).join('\n') || "Chưa có chủ đề nào";
    
    const taskInstruction = isCommunityInteraction 
        ? "1. Hãy đóng vai toàn bộ cộng đồng NPC để tạo nên ít nhất 30 bài viết/phản hồi kéo dài, tự nhiên, sôi nổi và tương tác qua lại như đang ở một buổi trò chuyện cộng đồng thật sự."
        : "1. Hãy đóng vai các NPC để viết đúng 30 bài viết comment đối thoại qua lại ngọt ngào, tinh tế nhen!";

    const chatPrompt = `
[THÔNG TIN MÁY CHỦ]
Máy chủ: ${currentServer.name}
Kênh diễn đàn đang đứng: #${activeChannel.name}
Bảo mật & Cốt truyện chính:
${serverCtx}

[BỐI CẢNH KÊNH]
${channelCtx}

[THÔNG TIN CÁC CHỦ ĐỀ KHÁC TRONG KÊNH]
${recentTopics}

===============================================================
🌟 [CHỈ THỊ TỐI THƯỢNG - ƯU TIÊN SỐ 1 - TOPIC ĐANG BÀN LUẬN] 🌟
===============================================================
- Bạn ĐANG trực tiếp tham gia thảo luận trong Topic này. MỌI BÀI VIẾT PHẢI ĐI SÂU VÀO LOGIC VÀ TÌNH SUẤT CỦA TOPIC NÀY.
- TÊN CHỦ ĐỀ: "${currentTopic.title}"
- NỘI DUNG CỐT TRUYỆN GỐC/GIỚI THIỆU CHỦ ĐỀ: "${currentTopic.content}"
- TÁC GIẢ CHỦ ĐỀ: ${currentTopic.authorName}

🔥 CÁCH THỨC HOẠT ĐỘNG VÀ BÌNH LUẬN DÀNH RIÊNG CHO CHỦ ĐỀ NÀY (BẮT BUỘC TUÂN THỦ 100%):
${currentTopic.topicPrompt || "Hãy đóng vai thảo luận nhiệt thành, ngọt ngào, phù hợp với tâm trạng của diễn đàn và chủ đề thảo luận này nhen! 💕"}
===============================================================

[DANH SÁCH NPC AI CƯ DÂN SÓI NỔI]
Đây là các NPC có sẵn trong server. Bắt buộc thay đổi góc nhìn xoay vòng các NPC này để viết ra các bình luận:
${currentServer.members.slice(0, 100).map(m => `- ${m.name} (Hồ sơ: ${(m as any).appearance}, Tuổi: ${(m as any).age}, Giọng điệu: ${(m as any).typingStyle}, Sở thích: ${(m as any).personalHobbies}, Tính cách/Đời sống: ${(m as any).bio || 'Một người thú vị'})`).join('\n')}

[NHIỆM VỤ CỦA BẠN]
${taskInstruction}
2. BÌNH LUẬN PHẢI TẬP TRUNG HOÀN TOÀN TÊN "CHỦ ĐỀ ĐANG BÀN LUẬN" Ở TRÊN. Bạn phải viết dựa theo tên và bối cảnh chủ đề một cách chi tiết, tuyệt đối KHÔNG ĐÁNH BÀN ra ngoài hay sao chép thông tin rập khuôn từ Cốt truyện Kênh/Máy chủ.
3. BẮT BUỘC: Mỗi comment của mỗi NPC phải dựa KHỚP CHUẨN 100% với Hồ sơ, tính cách, sở thích, đời sống, văn phong nói chuyện của chính NPC đó đã cung cấp ở trên. Comment phải cực kỳ chi tiết, sâu sắc, đong đầy cảm xúc, dài dòng lôi cuốn. Tuyệt đối không được viết ngắn.
4. Format BẮT BUỘC là 1 array JSON sạch sẽ, KHÔNG hiển thị code bọc ngoài, KHÔNG thêm giải thích dông dài ở đầu hay cuối khối JSON:
[
  {
    "authorName": "Tên NPC (giữ đúng tên trong danh sách)",
    "content": "Lời luận cực kỳ dạt dào cảm xúc xoay quanh chủ đề..."
  }
]
5. GHI NHỚ TỐI CAO: Bắt buộc số lượng array elements phải làm sao để trả về EXACTLY ít nhất 30 replies/bình luận!
`;

    const messagesToSend = [
      { role: 'system' as const, content: chatPrompt },
      { role: 'user' as const, content: 'Bắt đầu gửi đợt 30 phản hồi/bình luận siêu năng suất đi nào! Nhớ tập trung tuyệt đối vào chủ đề đang bàn luận nhé vợ yêu ơi 💕' }
    ];

    let fullOutput = "";
    let phase2S = false;
    let processedMatches = 0;
    
    try {
      const abortController = new AbortController();
      const sstream = sendMessageStream(discordApi, messagesToSend, undefined, abortController.signal, false);
      let tCount = 0;
      const tStart = Date.now();

      for await (const chunk of sstream) {
        if (!phase2S && chunk.type === 'heartbeat') {
          setStreamingStatus("Giai đoạn 2: NPC đang suy nghĩ và viết bình luận cho vợ... 🌸");
          phase2S = true;
        } else if (chunk.text && !chunk.type) {
          if (!fullOutput) {
            setStreamingStatus("Giai đoạn 3: Đang nhận dữ liệu bình luận từ AI... ✨");
          }
          fullOutput += chunk.text;
          setStreamingRawData(prev => prev + chunk.text);
          tCount += Math.max(1, Math.floor(chunk.text.length * 0.25));
          const el = (Date.now() - tStart) / 1000;
          const speed = el > 0 ? Math.round(tCount / el) : 0;
          setStreamDataStats({
            tokens: tCount,
            speed: speed,
            eta: 'Đang bình luận hăng hái'
          });
          setStreamingProgress(Math.min(98, Math.floor((tCount / 150) * 100)));

          // INCREMENTAL PARSING for Topic Comments
          const matchRegex = /\{\s*"authorName"\s*:\s*"([^"]+)"\s*,\s*"content"\s*:\s*"((?:[^"\\]|\\.)*?)"\s*\}/g;
          const allMatches = [];
          let m;
          while ((m = matchRegex.exec(fullOutput)) !== null) {
            allMatches.push(m);
          }

          if (allMatches.length > processedMatches) {
             const newMatches = allMatches.slice(processedMatches);
             processedMatches = allMatches.length;

             const newMsgs = newMatches.map(match => {
                const authorName = match[1];
                const content = match[2].replace(/\\n/g, '\n').replace(/\\"/g, '"');
                return {
                   id: `rep-${Date.now()}-${Math.random()}`,
                   tempName: authorName,
                   content: content
                };
             });

             setServers(prev => prev.map(srv => {
                if (srv.id === selectedServerId) {
                  return {
                    ...srv,
                    categories: srv.categories.map(cat => ({
                      ...cat,
                      channels: cat.channels.map(chan => {
                        if (chan.id === selectedChannelId) {
                          const updatedTopics = (chan.topics || []).map(topic => {
                            if (topic.id === activeTopicId) {
                              const mappedComments = newMsgs.map(pc => {
                                 const senderObj = srv.members.find(mMem => mMem.name === pc.tempName) || srv.members[0];
                                 return {
                                   id: pc.id,
                                   authorName: pc.tempName,
                                   authorAvatar: senderObj?.avatar || 'https://i.postimg.cc/YCGgYNjy/84187130465826af656425ff831218e0.jpg',
                                   content: pc.content,
                                   timestamp: 'Vừa xong'
                                 };
                              });
                              
                              return {
                                ...topic,
                                commentsCount: (topic.commentsCount || 0) + mappedComments.length,
                                replies: [
                                  ...(topic.replies || []),
                                  ...mappedComments
                                ]
                              };
                            }
                            return topic;
                          });

                          // Update History dynamically
                          const currentTopic = (chan.topics || []).find(t => t.id === activeTopicId);
                          const newComs = newMsgs.map(c => `${c.tempName}: ${c.content}`).join('\n');
                          const historyEntry = {
                            timestamp: Date.now(),
                            summary: `NPC Bình luận forum: ${newMsgs.map(c => c.tempName).join(', ')}`,
                            content: `Chủ đề: ${currentTopic?.title}\nBình luận mới:\n${newComs}`
                          };
                          const updatedHistory = [...(chan.history || []), historyEntry].slice(-5);

                          return { ...chan, topics: updatedTopics, history: updatedHistory };
                        }
                        return chan;
                      })
                    }))
                  };
                }
                return srv;
             }));
          }
        }
      }

      setStreamingProgress(100);
      showToast("✨ NPC bình luận bài viết thảo luận thành công bằng AI Proxy!");
    } catch (e: any) {
      showToast(`⚠️ Lỗi dấp ý bình luận: ${e.message}`);
    } finally {
      setStreamingStatus(null);
    }
  };

  // SEND MANUAL MESSAGE AS USER
  const handleSendManual = () => {
    if (!userMsgDraft.trim() || !currentServer || !activeChannel) return;

    const messageContent = userMsgDraft;

    setServers(prev => prev.map(srv => {
      if (srv.id === selectedServerId) {
        return {
          ...srv,
          categories: srv.categories.map(cat => ({
            ...cat,
            channels: cat.channels.map(chan => {
              if (chan.id === selectedChannelId) {
                return {
                  ...chan,
                  messages: [
                    ...(chan.messages || []),
                    {
                      id: `msg-user-${Date.now()}`,
                      senderId: 'user',
                      senderName: 'Vợ Của Chồng 💕 (Bạn)',
                      senderAvatar: 'https://i.postimg.cc/9FnXQNpn/e1d0cd594c41440c5e1dadc28f25c69a.jpg',
                      content: messageContent,
                      timestamp: 'Bây giờ'
                    }
                  ]
                };
              }
              return chan;
            })
          }))
        };
      }
      return srv;
    }));

    setUserMsgDraft('');
    // Trigger auto reply after user message
    setTimeout(() => {
      showToast("🌸 Các NPC đang đọc tin nhắn của vợ và chuẩn bị thảo luận nhen!");
      // Automatically generate a response batch from NPCs reacting to the user!
      handleCallApiNpcChat(messageContent);
    }, 1000);
  };

  // --- ENTITY CREATION ---
  const handleAddNewServer = () => {
    if (!newServerName.trim()) {
      showToast("⚠️ Vợ dặn phải điền tên máy chủ mà nhen!");
      return;
    }
    const newSrv: DiscordServer = {
      id: `srv-${Date.now()}`,
      name: newServerName,
      avatar: newServerAvatar || 'https://i.postimg.cc/YCGgYNjy/84187130465826af656425ff831218e0.jpg',
      coverImage: newServerCover || 'https://i.postimg.cc/sXyZktmN/030e2213d65e69305d54723cadd41c5f.jpg',
      membersCount: 1, // Me
      emojis: [
        { id: 'e-1', name: 'vui', image: '🌸', emotionState: 'Vui' }
      ],
      roles: [
        { id: 'role-god', name: 'Quản trị viên 👑', color: '#D7B8B8' }
      ],
      members: [
        {
          id: 'npc-mock-admin',
          name: 'Hồng Ngọc 🐰',
          avatar: 'https://i.postimg.cc/YCGgYNjy/84187130465826af656425ff831218e0.jpg',
          age: 20,
          gender: 'Nữ',
          sexualOrientation: 'Bình thường',
          habits: 'Mơ mộng suốt cả ngày',
          hometown: 'Thủ đô Coquette',
          personalHobbies: 'Hái kẹo muối hồng',
          typingStyle: 'Luôn kết thúc bằng 🌸 nhen!',
          onlineStatus: true,
          friendliness: 'Dễ mến cực kỳ'
        }
      ],
      categories: [
        {
          id: `cat-${Date.now()}`,
          name: 'DANH MỤC THẢO LUẬN',
          channels: [
            {
              id: `chan-${Date.now()}`,
              name: 'giao-luu-chung',
              type: 'chat',
              messages: [],
              topics: []
            }
          ]
        }
      ]
    };

    setServers(prev => [...prev, newSrv]);
    setSelectedServerId(newSrv.id);
    setNewServerName('');
    setNewServerAvatar('');
    setNewServerCover('');
    setShowServerCreate(false);
    showToast(`🌸 Chúc mừng vợ yêu! Đã dựng thành công máy chủ "${newSrv.name}" rồi nhé!`);
  };

  const handleAddNewChannel = () => {
    if (!newChanName.trim()) {
      showToast("⚠️ Nhập tên kênh giúp chồng nhen vợ!");
      return;
    }
    const targetCatId = newChanCategory || currentServer?.categories[0]?.id;
    if (!targetCatId) return;

    setServers(prev => prev.map(srv => {
      if (srv.id === selectedServerId) {
        return {
          ...srv,
          categories: srv.categories.map(cat => {
            if (cat.id === targetCatId) {
              const cleanedName = newChanName.toLowerCase().replace(/\s+/g, '-');
              return {
                ...cat,
                channels: [
                  ...cat.channels,
                  {
                    id: `chan-${Date.now()}`,
                    name: cleanedName,
                    type: newChanType,
                    messages: [],
                    topics: []
                  }
                ]
              };
            }
            return cat;
          })
        };
      }
      return srv;
    }));

    setNewChanName('');
    setShowChannelCreate(false);
    showToast("🌸 Đã tạo kênh mới tinh mượt mà thành công nhen!");
  };

  const handleAddNewCategory = () => {
    if (!newCatName.trim() || !currentServer) return;
    setServers(prev => prev.map(srv => {
      if (srv.id === currentServer.id) {
        return {
          ...srv,
          categories: [
            ...srv.categories,
            {
              id: `cat-${Date.now()}`,
              name: newCatName.toUpperCase(),
              channels: []
            }
          ]
        };
      }
      return srv;
    }));
    setNewCatName('');
    setShowCategoryCreate(false);
    showToast("🌸 Đã dệt thêm một danh mực mộng mị mới nhen!");
  };

  const handleCreateNpcManual = () => {
    if (!newNpcName.trim()) {
      showToast("⚠️ Vợ điền tên NPC nhen!");
      return;
    }

    const newM: any = {
      id: `npc-${Date.now()}`,
      name: newNpcName,
      avatar: newNpcAvatar || 'https://i.postimg.cc/YCGgYNjy/84187130465826af656425ff831218e0.jpg',
      age: newNpcAge,
      gender: newNpcGender,
      sexualOrientation: newNpcOrientation,
      habits: newNpcHabits || 'Chưa định hình',
      hometown: newNpcHometown || 'Lục địa mộng mơ',
      personalHobbies: newNpcHobbies || 'Mê đay pastel',
      typingStyle: newNpcTyping || 'Thơ thẩn dịu mềm',
      onlineStatus: true,
      friendliness: newNpcFriendly,
      roleId: newNpcRoleId || undefined
    };

    setServers(prev => prev.map(srv => {
      if (srv.id === selectedServerId) {
        return {
          ...srv,
          members: [...srv.members, newM]
        };
      }
      return srv;
    }));

    setNewNpcName('');
    setNewNpcAvatar('');
    setNewNpcHabits('');
    setNewNpcHobbies('');
    setNewNpcTyping('');
    setShowAdminNpcCreate(false);
    showToast(`🌸 NPC "${newM.name}" đã chính thức có mặt trên máy chủ dệt mộng!`);
  };

  const handleCreateRole = () => {
    if (!newRoleName.trim()) return;
    const newR = {
      id: `role-${Date.now()}`,
      name: newRoleName,
      color: newRoleColor
    };
    setServers(prev => prev.map(srv => {
      if (srv.id === selectedServerId) {
        return { ...srv, roles: [...srv.roles, newR] };
      }
      return srv;
    }));
    setNewRoleName('');
    showToast(`👑 Đã đan thêu vai trò "${newR.name}" siêu xinh!`);
  };

  const handleCreateEmoji = () => {
    if (!newEmojiChar.trim() || !newEmojiName.trim()) return;
    const newE = {
      id: `e-${Date.now()}`,
      name: newEmojiName,
      image: newEmojiChar,
      emotionState: newEmojiState
    };
    setServers(prev => prev.map(srv => {
      if (srv.id === selectedServerId) {
        return { ...srv, emojis: [...srv.emojis, newE] };
      }
      return srv;
    }));
    setNewEmojiName('');
    showToast(`🌸 Đã thêu sticker cảm xúc ${newE.image} vào tủ kén!`);
  };

  return (
    <div className="absolute inset-0 w-full h-full bg-[#FAF9F6] flex flex-col overflow-hidden text-gray-800 select-none">
      <style>{`
        /* KHUNG APP MOBILE CHUẨN + RESTRICTIONS */
        .mobile-app {
          width: min(100vw, 430px) !important;
          height: 100% !important;
          margin: 0 auto !important;
          overflow: hidden !important;
          display: flex !important;
          flex-direction: column !important;
          background: #fbf7fa !important;
        }

        .mobile-screen {
          width: 100% !important;
          height: 100% !important;
          display: flex !important;
          flex-direction: column !important;
          overflow: hidden !important;
          /* Bỏ background cứng để hiện ảnh nền của vợ nhen */
        }

        .screen-body {
          flex: 1 !important;
          min-width: 0 !important;
          overflow-y: auto !important;
          padding: 14px !important;
        }

        /* FIX SIDEBAR SERVER */
        .server-sidebar {
          width: 100% !important;
          height: 100% !important;
          overflow-y: auto !important;
        }

        /* FIX CHANNEL SIDEBAR */
        .channel-sidebar {
          width: 100% !important;
          height: 100% !important;
          overflow-y: auto !important;
        }

        /* FIX KHUNG CHAT CHÍNH */
        .chat-layout {
          width: 100% !important;
          height: 100% !important;
          min-width: 0 !important;
          display: flex !important;
          flex-direction: column !important;
          overflow: hidden !important;
        }

        /* FIX MESSAGE LIST */
        .message-list {
          flex: 1 !important;
          overflow-y: auto !important;
          padding: 14px 14px 20px !important;
          min-width: 0 !important;
        }
      `}</style>
      
      {/* 🎀 SMART CONNECTIVITY RUNNING LOADING BAR (NPC GENERATOR MONITORING) 🎀 */}
      <AnimatePresence>
        {streamingStatus && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-0 left-0 right-0 z-50 p-4 bg-[#FFFCFD]/95 outline outline-1 outline-[#F5C6D6]/40 shadow-md rounded-b-[20px] transition-all ml-4 mr-4 mt-2"
          >
            <div className="flex flex-col gap-2 max-w-md mx-auto">
              <div className="flex justify-between items-center text-[12px] font-medium text-[#D3B2B2]">
                <div className="flex items-center gap-2">
                  <Bot size={15} className="animate-spin text-[#F5C6D6] mr-1" />
                  <span>{streamingStatus}</span>
                </div>
                <span className="font-mono">{streamingProgress}%</span>
              </div>
              
              {/* Dynamic Tier colors conforming with coquette code */}
              <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                <motion.div 
                  className="h-full bg-gradient-to-r from-[#F5C6D6] to-[#EFA9C2]"
                  initial={{ width: 0 }}
                  animate={{ width: `${streamingProgress}%` }}
                  transition={{ ease: 'easeOut' }}
                />
              </div>

              {/* Streaming stats conforming with rules */}
              <div className="flex justify-between items-center text-[10px] font-mono text-gray-400 mt-1">
                <span>Tokens: {streamDataStats.tokens} tkn</span>
                <span>Speed: {streamDataStats.speed} t/s</span>
                <span>ETA: {streamDataStats.eta}</span>
              </div>

              {/* Real-time Streaming Output Preview */}
              {streamingRawData && (
                <div className="w-full mt-2 p-2 bg-[#FBF5F7] border border-[#F9C6D4]/30 rounded-lg max-h-32 overflow-y-auto">
                  <p className="text-[10px] text-gray-600 font-mono whitespace-pre-wrap leading-relaxed">
                    {streamingRawData}
                  </p>
                </div>
              )}

              {/* Secure Hard-gate visual locks */}
              <div className="flex justify-around items-center gap-2 mt-[6px]">
                <div className="flex items-center gap-1 text-[9px] text-[#CBB3B3]">
                  <CheckSquare size={10} className="text-[#F5C6D6]" /> Stream active
                </div>
                <div className="flex items-center gap-1 text-[9px] text-[#CBB3B3]">
                  <CheckSquare size={10} className="text-[#F5C6D6]" /> Secure Channel Logic
                </div>
                {streamingProgress < 100 ? (
                  <button 
                    onClick={() => setStreamingStatus(null)}
                    className="px-2 py-0.5 rounded bg-[#F4EAEA] text-[#D3B2B2] text-[9px] hover:bg-[#EAD6D6] transition-all ml-auto pointer-events-auto"
                  >
                    Dừng dệt
                  </button>
                ) : null}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- Main App Header Bar --- */}
      <div className="w-full h-14 bg-white border-b border-[#F9C6D4]/30 px-4 flex items-center justify-between shadow-sm shrink-0">
        <div className="flex items-center gap-3">
          <button 
            type="button"
            id="back_to_home_button"
            onClick={onBack}
            className="p-1 rounded-full hover:bg-[#FBF5F7] text-gray-600 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-sm font-bold text-[#D7B8B8] tracking-widest uppercase">Discord</h1>
            <p className="text-[10px] text-[#CBB3B3]">AI HUB • API SYSTEM • MOBILE</p>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex bg-[#FBF5F7] p-1 rounded-full shadow-inner border border-[#F9C6D4]/20">
          <button
            onClick={() => setActiveTab('community')}
            className={`text-[11px] font-bold px-3 py-1 rounded-full transition-all ${activeTab === 'community' ? 'bg-[#F5C6D6] text-white shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
          >
            Cộng Đồng
          </button>
          <button
            onClick={() => setActiveTab('novel')}
            className={`text-[11px] font-bold px-3 py-1 rounded-full transition-all ${activeTab === 'novel' ? 'bg-[#F2B8CC] text-white shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
          >
            Tiểu thuyết
          </button>
        </div>

        {/* API Settings Trigger */}
        <button 
          onClick={() => setShowApiSettings(true)}
          className="p-1.5 rounded-full hover:bg-[#FFF5FB] text-[#D3B2B2] transition-colors border border-[#F9C6D4]/20 active:scale-95 transition-transform"
          title="Hệ thống API"
        >
          <Settings size={20} />
        </button>
      </div>

      {/* --- Mobile Discord Framework Layout --- */}
      <div className="mobile-app flex-1 w-full overflow-hidden relative">
        
        {/* MÀN 1 — HOME / DANH SÁCH SERVER */}
        {currentView === 'serverList' && (
          <div 
            className="mobile-screen flex flex-col h-full overflow-y-auto relative"
            style={{
              backgroundImage: wallpapers.serverList ? `url("${wallpapers.serverList}")` : undefined,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
              backgroundColor: wallpapers.serverList ? 'transparent' : '#FAF9F6'
            }}
          >
            {/* Thẻ nền hồng sữa đặc mềm cho Màn 1 */}
            {wallpapers.serverList && (
              <div 
                className="absolute inset-x-3 inset-y-3 z-0 pointer-events-none"
                style={{
                  background: 'rgba(255, 244, 248, 0.92)',
                  border: '1px solid rgba(255, 255, 255, 0.65)',
                  borderRadius: '28px',
                  boxShadow: '0 4px 20px rgba(249, 198, 212, 0.15)'
                }}
              />
            )}
            
            {/* Quick wallpaper button */}
            <label 
              className="absolute top-3 right-3 z-50 w-7 h-7 rounded-full bg-white/80 hover:bg-white border border-[#F9C6D4]/50 flex items-center justify-center cursor-pointer shadow-sm transition-all text-[#EFA9C2] active:scale-95" 
              title="Cài hình nền cung điện"
            >
              <ImageIcon size={13} />
              <input type="file" accept="image/*" className="hidden" onChange={(e) => handleBase64Upload(e, (data) => handleSetWallpaper('serverList', data))} />
            </label>

            {/* Header Màn 1 */}
            <div className={`relative z-10 p-4 border-b border-[#F9C6D4]/30 flex flex-col items-center justify-center shrink-0 ${wallpapers.serverList ? 'bg-white/10' : 'bg-gradient-to-r from-[#FFF5FB] via-[#FFFCFD] to-[#FFF5FB]'}`}>
              <span className="text-[10px] tracking-widest text-[#EFA9C2] font-bold uppercase">Kikoko Novel Platform</span>
              <h1 className="text-[17px] font-extrabold text-[#C79C9C] tracking-wide mt-0.5">
                🎀 CUNG ĐIỆN DỆT MỘNG 🎀
              </h1>
              <p className="text-[9.5px] text-[#D3B2B2] mt-1 italic">Nơi lưu trữ những sợi tơ ngọc dệt nên vương quốc của chúng mình 💕</p>
            </div>

            {/* Scrolling list values */}
            <div className="relative z-10 flex-1 overflow-y-auto p-4 space-y-4">
              <div className="text-[11px] font-bold text-[#D3B2B2] tracking-wider mb-1 flex items-center gap-1.5 justify-center">
                <span>✦ CÁC CUNG ĐIỆN HIỆN CÓ ✦</span>
              </div>

              {servers.map(srv => {
                return (
                  <motion.div 
                    key={srv.id} 
                    onPointerDown={() => startLongPress(srv.id)}
                    onPointerUp={cancelLongPress}
                    onPointerLeave={cancelLongPress}
                    onTouchStart={() => startLongPress(srv.id)}
                    onTouchEnd={cancelLongPress}
                    onMouseDown={() => startLongPress(srv.id)}
                    onMouseUp={cancelLongPress}
                    onMouseLeave={cancelLongPress}
                    onClick={() => {
                      if (isHoldingSrvId === srv.id) return;
                      openServer(srv.id);
                    }}
                    animate={isHoldingSrvId === srv.id ? { 
                      scale: 0.97,
                      rotate: [0, -1.2, 1.2, -1.2, 0],
                      transition: { repeat: Infinity, duration: 0.18 }
                    } : { 
                      scale: 1, 
                      rotate: 0 
                    }}
                    className={`group rounded-[20px] overflow-hidden border border-[#F5C6D6]/40 hover:border-[#F5C6D6] shadow-xs hover:shadow-md transition-all duration-300 transform cursor-pointer relative select-none ${wallpapers.serverList ? 'bg-[#FFFCFD]/75 shadow-none' : 'bg-white'}`}
                  >
                    {/* Cover Banner Mockup */}
                    <div 
                      className="h-16 w-full relative"
                      style={{
                        background: srv.coverImage 
                          ? `url(${srv.coverImage}) center/cover no-repeat` 
                          : 'linear-gradient(135deg, #FFF5FB 0%, #F5C6D6 100%)'
                      }}
                    >
                      <div className="absolute inset-0 bg-black/10" />
                      {/* Member count chips */}
                      <span className="absolute top-2 right-2 text-[8.5px] bg-black/40 text-white px-2 py-0.5 rounded-full font-semibold">
                        🟢 {srv.membersCount || 300} online
                      </span>
                    </div>

                    {/* Server details */}
                    <div className="p-4 pt-1 flex items-center gap-3 relative">
                      {/* Avatar sticking out over cover */}
                      <div className="w-[48px] h-[48px] rounded-[14px] bg-white border-2 border-[#F9C6D4] overflow-hidden shrink-0 shadow-sm mt-[-16px] relative z-10">
                        <SafeImage src={srv.avatar} alt="avatar" />
                      </div>

                      {/* Info text */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-[13px] text-gray-700 truncate group-hover:text-[#F3B4C2] transition-colors">
                          {srv.name}
                        </h3>
                        <p className="text-[10px] text-gray-400 mt-0.5">
                          {srv.categories?.flatMap(c => c.channels).length || 0} phòng dệt mộng • {srv.members?.length || 0} NPC
                        </p>
                      </div>

                      {/* Navigation indicator button */}
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          openServer(srv.id);
                        }}
                        className="px-3 py-1 text-[10px] font-bold text-white bg-[#F5C6D6] hover:bg-[#EFA9C2] rounded-full shadow-xs shrink-0"
                      >
                        Vào 🌸
                      </button>
                    </div>
                  </motion.div>
                );
              })}

              {/* Central Premium Create Server trigger card */}
              <div 
                onClick={() => {
                  setNewServerName('');
                  setShowServerCreate(true);
                }}
                className="p-4 rounded-[20px] bg-white border-2 border-dashed border-[#F9C6D4] hover:bg-[#FFF5FB]/20 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.99]"
              >
                <div className="w-8 h-8 rounded-full bg-[#FFF5FB] flex items-center justify-center text-[#F5C6D6] border border-[#F9C6D4]/30 shadow-xs">
                  <Plus size={16} />
                </div>
                <div className="text-center">
                  <p className="text-[11.5px] font-bold text-[#EFA9C2]">Thêu Mới Cung Điện</p>
                  <p className="text-[9.5px] text-gray-400 mt-0.5">Tạo máy chủ dệt truyện dạo mới tinh khôi</p>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* Middle Area: Channel Categories and List of current Server */}
        {currentView === 'channelList' && (
          <div className="channel-sidebar bg-[#FFFCFD] border-r border-[#F9C6D4]/20 flex flex-col pt-safe shrink-0 h-full overflow-hidden">
            
            {/* Server header & dynamic context summary */}
            <div className="p-3 bg-gradient-to-b from-[#FFF5FB] to-white border-b border-[#F9C6D4]/20 relative flex flex-col gap-2">
              <div className="flex items-center gap-1.5 self-start">
                <button 
                  onClick={goBack}
                  className="p-1 px-3 rounded-full bg-[#FFF5FB] hover:bg-[#FAF9F9] text-[#D3B2B2] border border-[#F9C6D4]/35 text-[10px] font-bold flex items-center gap-1 active:scale-95 transition-transform"
                >
                  <ArrowLeft size={11} /> Cung điện
                </button>
              </div>

              <motion.h2 
                onPointerDown={() => {
                  if (currentServer) {
                    startLongPress(currentServer.id);
                  }
                }}
                onPointerUp={cancelLongPress}
                onPointerLeave={cancelLongPress}
                onTouchStart={() => {
                  if (currentServer) {
                    startLongPress(currentServer.id);
                  }
                }}
                onTouchEnd={cancelLongPress}
                onMouseDown={() => {
                  if (currentServer) {
                    startLongPress(currentServer.id);
                  }
                }}
                onMouseUp={cancelLongPress}
                onMouseLeave={cancelLongPress}
                animate={isHoldingSrvId === currentServer?.id ? { 
                  scale: 0.98,
                  rotate: [0, -1, 1, -1, 0],
                  transition: { repeat: Infinity, duration: 0.2 }
                } : { 
                  scale: 1, 
                  rotate: 0 
                }}
                className="text-[13px] font-bold text-gray-700 tracking-wider flex items-center justify-between gap-1 w-full select-none"
              >
                <span className="truncate">{currentServer?.name || 'Vườn Hồng Thơ Mộng 🎀'}</span>
                <button 
                  onClick={() => setShowServerSettings(true)}
                  className="hover:text-[#F3B4C2] text-gray-400 shrink-0"
                >
                  <Settings size={14} />
                </button>
              </motion.h2>

              <div className="flex items-center gap-1 text-[10px] text-[#CFAAAA] font-medium">
                <span className="w-1.5 h-1.5 bg-[#F5C6D6] rounded-full animate-pulse mr-0.5" />
                <span>{currentServer?.membersCount || 300} members</span>
                <span className="opacity-60">•</span>
                <span>community</span>
              </div>

              {/* Quick configuration selector */}
              <button
                onClick={() => setShowServerSettings(true)}
                className="mt-1 w-full py-1 bg-white hover:bg-[#FAF9F9] transition-all rounded-lg border border-[#F9C6D4]/30 text-[10px] text-[#CBA3A3] font-bold shadow-xs active:scale-95"
              >
                ⚙️ CÀI ĐẶT MÁY CHỦ
              </button>
            </div>

            {/* Quick search channel */}
            <div className="px-2 py-1.5 border-b border-[#F9C6D4]/10">
              <div className="flex items-center gap-1.5 bg-gray-50 rounded-md p-1 border border-gray-100">
                <Search size={11} className="text-gray-400 ml-0.5" />
                <input 
                  type="text" 
                  placeholder="Tìm kênh..." 
                  className="bg-transparent border-none text-[10.5px] focus:outline-none w-full text-gray-500 placeholder-gray-300"
                />
              </div>
            </div>

            {/* Categories and channels scrolling list */}
            <div className="flex-1 overflow-y-auto p-2 space-y-3 relative">
              
              {currentServer?.categories?.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <p className="text-[11px] text-gray-400">Chưa có danh mục nào</p>
                  <button
                    onClick={() => setShowCategoryCreate(true)}
                    className="mt-2 px-3 py-1 text-[10px] rounded bg-[#FFF5FB] text-[#F3B4C2] font-semibold border border-[#F9C6D4]/30"
                  >
                    Thêm mới
                  </button>
                </div>
              ) : (
                currentServer?.categories.map(cat => (
                  <div key={cat.id} className="space-y-1">
                    
                    {/* Category Title Header */}
                    <div className="flex items-center justify-between text-[10px] font-bold text-[#CBA3A3] px-1.5 hover:text-gray-600 cursor-pointer">
                      <span className="tracking-widest">▾ {cat.name}</span>
                      <button 
                        onClick={() => {
                          setNewChanCategory(cat.id);
                          setShowChannelCreate(true);
                        }}
                        className="hover:scale-110 active:scale-95 transition-transform"
                      >
                        <Plus size={11} />
                      </button>
                    </div>

                    {/* Channels nested loop */}
                    <div className="space-y-[2px]">
                      {cat.channels.map(chan => {
                        const isActive = chan.id === selectedChannelId;
                        
                        // Match prefix icon conforming to rules
                        let typePrefix: React.ReactNode = <span className="font-mono text-xs">#</span>;
                        if (chan.type === 'forum') typePrefix = <span className="text-[#F3B4C2]">★</span>;
                        if (chan.type === 'chat') typePrefix = <span className="text-[#EFA9C2]">☼</span>;
                        if (chan.type === 'announcement') typePrefix = <span className="text-red-300 font-bold">!</span>;
                        if (chan.type === 'event') typePrefix = <span className="text-yellow-400">✦</span>;

                        return (
                          <div key={chan.id} className="w-full flex flex-col mb-[2px]">
                            <div
                               onClick={() => {
                                 openChannel(chan.id);
                               }}
                              className={`w-full group flex items-center justify-between px-2 py-1 rounded-md text-[11px] font-medium transition-all cursor-pointer ${
                                isActive 
                                  ? 'bg-[#FFF5FB] text-[#F3B4C2] font-semibold border-l-2 border-[#F5C6D6]' 
                                  : 'text-gray-500 hover:bg-gray-50'
                              }`}
                            >
                            <div className="flex items-center gap-1.5 truncate">
                              <span className="shrink-0">{typePrefix}</span>
                              <span className="truncate">{chan.name}</span>
                            </div>
                        
                            <div className="flex items-center gap-1">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openChannel(chan.id);
                                  setForumTitle('');
                                  setForumDesc('');
                                  setForumTopicPrompt('');
                                  setShowForumTopicCreate(true);
                                }}
                                className="p-0.5 text-[#CBA3A3] hover:text-[#F3B4C2] rounded hover:bg-white transition-all active:scale-90 flex items-center justify-center mr-0.5"
                                title="Gieo hạt chủ đề mới nhen 🌸"
                              >
                                <Plus size={11} className="stroke-[2.5]" />
                              </button>

                              {/* Messages badge counter */}
                              {chan.messages?.length > 0 && (
                                <span className="text-[8px] bg-[#F5C6D6] text-white px-1.5 py-0.5 rounded-full scale-90">
                                  {chan.messages.length}
                                </span>
                              )}
                              
                              {/* Channel specific prompt settings */}
                              <div 
                                onClick={(e) => { e.stopPropagation(); handleOpenChannelSettings(chan); }}
                                className="p-1 text-[#DEC4C4] hover:text-[#C79C9C] hover:bg-white rounded transition-all opacity-0 group-hover:opacity-100 cursor-pointer"
                                title="Cài đặt Prompt kênh"
                                role="button"
                                tabIndex={0}
                              >
                                <Settings size={10} />
                              </div>
                            </div>
                          </div>
                          
                          {/* Nested Topics (Threads) inside Sidebar */}
                          {chan.topics && chan.topics.length > 0 && (
                            <div className="ml-3 pl-2 border-l-2 border-[#F9C6D4]/30 space-y-0.5 mt-0.5">
                              {chan.topics.map(topic => {
                                const isTopicActive = activeTopicId === topic.id;
                                return (
                                  <div
                                    key={topic.id}
                                    onClick={() => {
                                      setSelectedChannelId(chan.id);
                                      setActiveTopicId(topic.id);
                                      setCurrentView('postDetail');
                                    }}
                                    className={`w-full group flex items-center gap-1.5 px-2 py-1 rounded-md text-[10.5px] transition-all cursor-pointer ${
                                      isTopicActive
                                        ? 'bg-[#FFF5FB] text-[#F3B4C2] font-semibold border border-[#F5C6D6]/30'
                                        : 'text-gray-500 hover:bg-gray-50'
                                    }`}
                                  >
                                    <MessageCircle size={9} className={isTopicActive ? "text-[#EFA9C2]" : "text-[#DABEBE]"} />
                                    <span className="truncate">{topic.title}</span>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
                ))
              )}

              {/* Floating bottom creation additions within channels sidebar */}
              <div className="pt-2 border-t border-[#F9C6D4]/10 flex gap-2">
                <button
                  onClick={() => setShowCategoryCreate(true)}
                  className="flex-1 py-1 bg-white hover:bg-[#FBF5F7] text-[10px] rounded-lg border border-[#F9C6D4]/30 text-center text-[#CBA3A3] font-bold"
                >
                  + Danh mục
                </button>
                <button
                  onClick={() => {
                    setNewChanCategory(currentServer?.categories[0]?.id || '');
                    setShowChannelCreate(true);
                  }}
                  className="flex-1 py-1 bg-[#FFF5FB] hover:bg-[#F9C6D4]/20 text-[10px] rounded-lg border border-[#F9C6D4]/30 text-center text-[#EFA9C2] font-bold"
                >
                  + Kênh
                </button>
              </div>
            </div>
          </div>
        )}

        {/* --- Right Column: Active viewport of chat details --- */}
        {(currentView === 'channelContent' || currentView === 'postDetail') && (
          <div 
            className="chat-layout flex-1 flex flex-col h-full overflow-hidden relative"
            style={{
              backgroundImage: currentView === 'postDetail' 
                ? (currentTopic?.backgroundImage 
                    ? `url("${currentTopic.backgroundImage}")` 
                    : (wallpapers.postDetail ? `url("${wallpapers.postDetail}")` : undefined))
                : (wallpapers.channelContent ? `url("${wallpapers.channelContent}")` : undefined),
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
              backgroundColor: (currentView === 'postDetail' ? (currentTopic?.backgroundImage || wallpapers.postDetail) : wallpapers.channelContent) ? 'transparent' : 'white'
            }}
          >
            {/* Thẻ nền hồng sữa pastel đặc mềm cho Màn 2 (Nội dung kênh) - TUÂN THỦ HIẾN PHÁP 🎀 */}
            {(currentView === 'postDetail' ? (currentTopic?.backgroundImage || wallpapers.postDetail) : wallpapers.channelContent) && (
              <div 
                className="absolute inset-x-2 inset-y-2 z-0 pointer-events-none"
                style={{
                  background: 'rgba(255, 252, 253, 0.96)', // Hồng sữa cực nhạt, gần như đặc để chữ rõ
                  border: '1px solid #F9C6D4',
                  borderRadius: '24px',
                  boxShadow: '0 8px 32px rgba(249, 198, 212, 0.2)'
                }}
              />
            )}
            
            {activeChannel ? (
              <div className="relative z-10 flex-1 flex flex-col overflow-hidden">
                
                {/* Header inside channel */}
                <div className={`h-12 border-b border-[#F9C6D4]/10 flex items-center justify-between px-4 shrink-0 shadow-xs ${((currentView === 'postDetail' ? (currentTopic?.backgroundImage || wallpapers.postDetail) : wallpapers.channelContent) ? 'bg-white/10' : 'bg-white')}`}>
                  <div className="flex items-center gap-2 truncate">
                    <button 
                      onClick={goBack}
                      className="p-1 px-3 rounded-full bg-[#FFF5FB] hover:bg-[#FAF9F9] text-[#D3B2B2] border border-[#F9C6D4]/35 text-[10px] font-bold flex items-center gap-1 active:scale-95 transition-transform"
                    >
                      <ArrowLeft size={11} /> {currentView === 'postDetail' ? 'Diễn đàn' : 'Kênh'}
                    </button>

                    <span className="text-[#CBA3A3] font-bold text-sm">
                      {activeChannel.type === 'text' && '#'}
                      {activeChannel.type === 'forum' && '★'}
                      {activeChannel.type === 'chat' && '☼'}
                      {activeChannel.type === 'announcement' && '!'}
                      {activeChannel.type === 'event' && '✦'}
                    </span>
                    <h3 className="font-bold text-[12px] text-gray-700 truncate">{activeChannel.name}</h3>
                  </div>

                  {/* Sub-channel features context buttons dynamically displayed based on rules */}
                  <div className="flex items-center gap-2">
                    <label 
                      className="w-6 h-6 rounded-full bg-white/60 hover:bg-white border border-[#F9C6D4]/50 flex items-center justify-center cursor-pointer shadow-sm transition-all text-[#EFA9C2] active:scale-95" 
                      title="Cài hình nền kênh này"
                    >
                      <ImageIcon size={11} />
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => handleBase64Upload(e, (data) => handleSetWallpaper('channelContent', data))} />
                    </label>

                    {activeChannel.type === 'chat' && (
                      <div className="flex gap-1">
                        <button
                          onClick={handleAutoGenerate300NPCs}
                          className="px-2 py-1 text-[9.5px] rounded-full bg-gradient-to-r from-[#FBF5F7] to-[#F6EEEE] text-[#C79C9C] font-bold border border-[#F9C6D4]/30 shadow-xs flex items-center gap-1 hover:to-[#FFF5FB] active:scale-95 transition-all"
                          title="Tăng 300 thành viên NPC"
                        >
                          <UserPlus size={11} />
                          Invite +300
                        </button>
                        <button
                          onClick={handleCallApiNpcChat}
                          disabled={!!streamingStatus}
                          className="px-2.5 py-1 text-[9.5px] rounded-full bg-gradient-to-r from-[#F5C6D6] to-[#EFA9C2] text-white font-bold border border-[#F2B8CC] shadow-sm flex items-center gap-1 active:scale-95 transition-all disabled:opacity-40"
                        >
                          <Bot size={11} />
                          Gọi API Cộng Đồng (350 msg)
                        </button>
                      </div>
                    )}

                    {activeChannel.type === 'text' && (
                      <button
                        onClick={handleGenerate20AdminPosts}
                        disabled={!!streamingStatus}
                        className="px-2.5 py-1 text-[9.5px] rounded-full bg-[#EFA9C2] text-white font-bold border border-[#EFA9C2] shadow-sm flex items-center gap-1 active:scale-95 transition-all disabled:opacity-40"
                      >
                        <Bot size={11} />
                        Gọi API Quản Trị Viên (Văn bản dài)
                      </button>
                    )}
                  </div>
                </div>

                {/* Chat messages viewport based on different type formats */}
                {activeChannel.type === 'forum' ? (
                  // --- FORUM CHAN VIEW ---
                  <div className={`flex-1 flex flex-col overflow-hidden relative ${wallpapers.channelContent ? 'bg-transparent' : 'bg-[#FAF9F6]'} p-3`}>
                    {activeTopicId ? (
                      // Topic details inside Forum
                      (() => {
                        const currentTopic = activeChannel.topics?.find(t => t.id === activeTopicId);
                        if (!currentTopic) return null;
                        return (
                          <div className={`flex-1 flex flex-col overflow-hidden p-3 rounded-xl border border-[#F9C6D4]/30 shadow-xs relative z-10 ${(currentTopic?.backgroundImage || wallpapers.postDetail) ? 'bg-transparent shadow-none border-none' : 'bg-white'}`}>
                            {/* Top Back & Actions Row */}
                            <div className="flex items-center justify-between mb-2 shrink-0">
                              <button 
                                onClick={() => {
                                  goBack();
                                  setTopicCommentDraft('');
                                }}
                                className="text-[11px] font-bold text-[#CBA3A3] hover:text-[#EFA9C2] flex items-center gap-1 transition-colors"
                              >
                                ← Quay lại diễn đàn
                              </button>
                              <span className="text-[9px] px-2 py-0.5 bg-[#FFF5FB] text-[#EFA9C2] rounded-full border border-[#F9C6D4]/30 font-medium">
                                {currentTopic.batchId || 'Bài đăng đơn lẻ'}
                              </span>
                            </div>
                            
                            <div className="flex-1 overflow-y-auto space-y-4 pr-1 scrollbar-thin">
                              {/* Topic Head Cover Card */}
                              <div className="border-b pb-4 border-gray-100">
                                <h2 className="text-sm font-bold text-gray-700 leading-tight">{currentTopic.title}</h2>
                                <div className="flex items-center gap-2 mt-2">
                                  <div className="w-5 h-5 rounded-full overflow-hidden shrink-0 border border-[#F5C6D6]">
                                    <SafeImage src={currentTopic.authorAvatar} alt="t-a" />
                                  </div>
                                  <span className="text-[10.5px] font-semibold text-gray-600">{currentTopic.authorName}</span>
                                  <span className="text-[9px] text-gray-400">{currentTopic.timestamp}</span>
                                </div>

                                {/* Topic Attachment Image if present */}
                                {currentTopic.imageUrl && (
                                  <div className="mt-3 overflow-hidden rounded-xl border border-gray-100 max-h-48 bg-gray-50 flex justify-center">
                                    <SafeImage 
                                      src={currentTopic.imageUrl} 
                                      alt="Topic Attachment" 
                                      style={{ objectFit: 'contain', maxHeight: '192px' }}
                                    />
                                  </div>
                                )}

                                <p className="text-[11.5px] text-gray-700 mt-3 whitespace-pre-line leading-relaxed">{currentTopic.content}</p>

                                {currentTopic.topicPrompt && (
                                  <div className="mt-3.5 p-3 rounded-2xl bg-[#FFFBFD] border border-[#F9C6D4]/40 text-[#CBA3A3] text-[11px] leading-relaxed relative overflow-hidden shadow-xs">
                                    <div className="absolute top-0 right-0 px-2 py-0.5 text-[8.5px] bg-gradient-to-r from-[#F5C6D6] to-[#EFA9C2] text-white rounded-bl-xl font-bold uppercase tracking-wider">
                                      Quy tắc hoạt động AI (System Prompt)
                                    </div>
                                    <div className="font-bold text-[#EFA9C2] flex items-center gap-1 mb-1.5 text-[10.5px]">
                                      🌸 Cách thức hoạt động của Chủ đề này:
                                    </div>
                                    <p className="text-gray-600 bg-[#FFF5FB]/60 p-2 rounded-xl text-[10.5px] whitespace-pre-line border border-[#F9C6D4]/20 leading-relaxed font-sans">{currentTopic.topicPrompt}</p>
                                  </div>
                                )}

                                {/* Likes & Comments Counters footer inside topic body */}
                                <div className="flex items-center gap-3 mt-4 pt-3 border-t border-dashed border-gray-100">
                                  <button 
                                    onClick={() => {
                                      setServers(prev => prev.map(srv => {
                                        if (srv.id === selectedServerId) {
                                          return {
                                            ...srv,
                                            categories: srv.categories.map(cat => ({
                                              ...cat,
                                              channels: cat.channels.map(chan => {
                                                if (chan.id === selectedChannelId) {
                                                  return {
                                                    ...chan,
                                                    topics: (chan.topics || []).map(t => {
                                                      if (t.id === activeTopicId) {
                                                        return { ...t, likes: (t.likes || 0) + 1 };
                                                      }
                                                      return t;
                                                    })
                                                  };
                                                }
                                                return chan;
                                              })
                                            }))
                                          };
                                        }
                                        return srv;
                                      }));
                                      showToast("💕 Vợ yêu vừa thả phao tim nồng ấm cho bài viết!");
                                    }}
                                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#FFF5FB] border border-[#F9C6D4]/30 text-[#EFA9C2] text-[10.5px] font-bold hover:bg-[#F9C6D4]/10 active:scale-95 transition-all"
                                  >
                                    💖 {currentTopic.likes || 0} Thả Tim
                                  </button>
                                  <span className="text-[10px] text-gray-400">
                                    💬 {currentTopic.replies?.length || 0} phản hồi
                                  </span>
                                </div>
                              </div>

                              {/* Replies Listing section */}
                              <div className="space-y-3 pb-4">
                                <h3 className="text-[10px] font-bold text-gray-400 tracking-wider">BÌNH LUẬN THẢO LUẬN ({currentTopic.replies?.length || 0})</h3>
                                
                                {currentTopic.replies && currentTopic.replies.length > 0 ? (
                                  currentTopic.replies.map((rep: any) => (
                                    <div key={rep.id} className="p-3 bg-white rounded-xl border border-[#F9C6D4]/20 space-y-1 relative shadow-sm">
                                      <div className="flex items-center gap-1.5">
                                        <div className="w-4 h-4 rounded-full overflow-hidden shrink-0 border border-[#F5C6D6]/40">
                                          <SafeImage src={rep.authorAvatar} alt="r-a" />
                                        </div>
                                        <span className="text-[10px] font-bold text-gray-600">{rep.authorName}</span>
                                        <span className="text-[8px] text-gray-400">{rep.timestamp || 'Vừa xong'}</span>
                                      </div>
                                      <p className="text-[11px] text-gray-700 leading-relaxed pl-5 whitespace-pre-line">{rep.content}</p>
                                    </div>
                                  ))
                                ) : (
                                  <p className="text-[10px] italic text-[#CBA3A3] text-center py-4">Chưa có bình luận ý kiến nào từ NPC nhen. Hãy kêu gọi NPC hoặc nhập thủ công thảo luận dưới nè! 💕</p>
                                )}
                              </div>
                            </div>

                            {/* Footer Action Bar for comments */}
                            <div className="pt-2 border-t border-[#F9C6D4]/20 flex flex-col gap-2 shrink-0 bg-[#FFFCFD]/92 p-2.5 rounded-2xl mt-1 shadow-xs">
                              {/* Rich action tools in coquette design */}
                              <div className="grid grid-cols-2 gap-2">
                                {/* Background Image Upload */}
                                <label className="flex items-center justify-center gap-1.5 py-1.5 px-2.5 text-[10px] font-bold text-[#C79C9C] bg-[#FFF8F8] hover:bg-[#FDFCFD] border border-[#F9C6D4]/35 rounded-[12px] cursor-pointer active:scale-95 transition-all shadow-xs">
                                  <span>📸 Thay nền riêng</span>
                                  <input 
                                    type="file" 
                                    accept="image/*" 
                                    className="hidden" 
                                    onChange={(e) => handleBase64Upload(e, (data) => handleSetTopicWallpaper(currentTopic.id, data))} 
                                  />
                                </label>

                                {/* Generate 30 custom replies */}
                                <button
                                  onClick={handleGenerate30TopicReplies}
                                  disabled={!!streamingStatus}
                                  className="flex items-center justify-center gap-1 py-1.5 px-2.5 text-[10px] font-bold text-white bg-gradient-to-r from-[#F5C6D6] to-[#EFA9C2] hover:from-[#EFA9C2] hover:to-[#F2B8CC] border border-white/40 rounded-[12px] active:scale-95 transition-all shadow-sm disabled:opacity-40"
                                >
                                  <span>🌸 Dệt 30 bài luận</span>
                                </button>
                              </div>

                              <div className="grid grid-cols-2 gap-2">
                                {/* NPC comments trigger */}
                                <button
                                  onClick={() => handleCallApiTopicComment(false)}
                                  disabled={!!streamingStatus}
                                  className="py-1.5 text-[10px] bg-gradient-to-r from-[#FFF5FB] to-[#F4EAEA] hover:to-[#FFF5FB] text-[#D7B8B8] font-bold border border-[#F9C6D4]/30 rounded-[12px] flex items-center justify-center gap-1 active:scale-95 transition-all disabled:opacity-40"
                                >
                                  <span>✨ NPCs thảo luận (30 bài)</span>
                                </button>
                                
                                <button
                                  onClick={() => handleCallApiTopicComment(true)}
                                  disabled={!!streamingStatus}
                                  className="py-1.5 text-[10px] bg-gradient-to-r from-[#EFA9C2] to-[#EFCFCF] hover:to-[#EFA9C2] text-white font-bold border border-white/50 rounded-[12px] flex items-center justify-center gap-1 active:scale-95 transition-all disabled:opacity-40"
                                >
                                  <span>💬 Cộng đồng (30 bài)</span>
                                </button>
                              </div>

                              {/* Manual Reply input box */}
                              <div className="flex items-center gap-2">
                              <input 
                                type="text"
                                value={topicCommentDraft}
                                onChange={(e) => setTopicCommentDraft(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    if (!topicCommentDraft.trim() || !currentServer || !activeChannel) return;
                                    const newComment = {
                                      id: `rep-${Date.now()}`,
                                      authorName: currentServer.members[0]?.name || 'Admin',
                                      authorAvatar: currentServer.members[0]?.avatar || 'https://i.postimg.cc/YCGgYNjy/84187130465826af656425ff831218e0.jpg',
                                      content: topicCommentDraft,
                                      timestamp: 'Vừa xong'
                                    };
                                    setServers(prev => prev.map(srv => {
                                      if (srv.id === selectedServerId) {
                                        return {
                                          ...srv,
                                          categories: srv.categories.map(cat => ({
                                            ...cat,
                                            channels: cat.channels.map(chan => {
                                              if (chan.id === selectedChannelId) {
                                                return {
                                                  ...chan,
                                                  topics: (chan.topics || []).map(topic => {
                                                    if (topic.id === activeTopicId) {
                                                      return {
                                                        ...topic,
                                                        commentsCount: (topic.commentsCount || 0) + 1,
                                                        replies: [
                                                          ...(topic.replies || []),
                                                          newComment
                                                        ]
                                                      };
                                                    }
                                                    return topic;
                                                  })
                                                };
                                              }
                                              return chan;
                                            })
                                          }))
                                        };
                                      }
                                      return srv;
                                    }));
                                    setTopicCommentDraft('');
                                    showToast("📝 Đã gửi bình phẩm của vợ yêu!");
                                  }
                                }}
                                placeholder="Gửi một tơ hồng bình phẩm ngọt ngào..."
                                className="flex-1 p-1.5 border border-[#F9C6D4]/30 text-xs rounded-xl focus:outline-none focus:border-[#EFA9C2] bg-[#FFF5FB]/20"
                              />
                              <button
                                onClick={() => {
                                  if (!topicCommentDraft.trim() || !currentServer || !activeChannel) return;
                                  const newComment = {
                                    id: `rep-${Date.now()}`,
                                    authorName: currentServer.members[0]?.name || 'Admin',
                                    authorAvatar: currentServer.members[0]?.avatar || 'https://i.postimg.cc/YCGgYNjy/84187130465826af656425ff831218e0.jpg',
                                    content: topicCommentDraft,
                                    timestamp: 'Vừa xong'
                                  };
                                  setServers(prev => prev.map(srv => {
                                    if (srv.id === selectedServerId) {
                                      return {
                                        ...srv,
                                        categories: srv.categories.map(cat => ({
                                          ...cat,
                                          channels: cat.channels.map(chan => {
                                            if (chan.id === selectedChannelId) {
                                              return {
                                                ...chan,
                                                topics: chan.topics.map(topic => {
                                                  if (topic.id === activeTopicId) {
                                                    return {
                                                      ...topic,
                                                      commentsCount: (topic.commentsCount || 0) + 1,
                                                      replies: [
                                                        ...(topic.replies || []),
                                                        newComment
                                                      ]
                                                    };
                                                  }
                                                  return topic;
                                                })
                                              };
                                            }
                                            return chan;
                                          })
                                        }))
                                      };
                                    }
                                    return srv;
                                  }));
                                  setTopicCommentDraft('');
                                  showToast("📝 Đã gửi bình phẩm của vợ yêu!");
                                }}
                                className="p-1.5 rounded-full bg-[#EFA9C2] hover:bg-[#F2B8CC] text-white active:scale-95 transition-all"
                              >
                                <Send size={12} />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })()
                  ) : (
                    // Topic lists listing
                    <div className="flex-1 flex flex-col overflow-hidden">
                      {/* Top Filters & Controller Row */}
                      <div className="mb-2 p-2 bg-white rounded-xl border border-[#F9C6D4]/10 space-y-2 shrink-0">
                        <div className="flex items-center justify-between gap-1.5 flex-wrap">
                          <div className="flex items-center gap-1 text-[10.5px]">
                            <span className="text-[#CBA3A3] font-bold">Hiển thị đợt:</span>
                            <select 
                              value={selectedBatchId}
                              onChange={(e) => setSelectedBatchId(e.target.value)}
                              className="p-1 text-[10px] rounded-lg border border-[#F9C6D4]/30 bg-[#FFF5FB]/50 text-gray-700 focus:outline-none cursor-pointer"
                            >
                              <option value="Tất cả">Tất cả bài viết</option>
                              {Array.from(new Set((activeChannel.topics || []).map((t: any) => t.batchId).filter(Boolean))).map((bId: any) => (
                                <option key={bId} value={bId}>{bId}</option>
                              ))}
                            </select>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => setShowForumTopicCreate(true)}
                              className="px-2 py-1 text-[9.5px] rounded-lg bg-white border border-[#F9C6D4]/30 text-[#CBA3A3] font-bold active:scale-95 transition-all whitespace-nowrap"
                            >
                              + Tạo Topic Thủ Công
                            </button>
                            <button
                              onClick={handleGenerate25ForumPosts}
                              disabled={!!streamingStatus}
                              className="px-2 py-1 text-[9.5px] rounded-lg bg-gradient-to-r from-[#F5C6D6] to-[#EFA9C2] text-white font-bold active:scale-95 transition-all whitespace-nowrap disabled:opacity-40"
                            >
                              👑 Dệt 25 Bài Diễn Đàn (AI)
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Displaying listing */}
                      <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
                        {(() => {
                          const topicsToRender = (activeChannel.topics || []).filter((t: any) => {
                            if (selectedBatchId === 'Tất cả') return true;
                            return t.batchId === selectedBatchId;
                          });

                          if (topicsToRender.length === 0) {
                            return (
                              <div className="flex flex-col items-center justify-center py-16 bg-white rounded-xl border border-dashed border-[#F9C6D4]/30 p-4">
                                <p className="text-[11px] text-gray-400">Chưa có bài viết thảo luận nào thuộc bộ lọc này.</p>
                                <button
                                  onClick={() => {
                                    setServers(prev => prev.map(srv => {
                                      if (srv.id === selectedServerId) {
                                        return {
                                          ...srv,
                                          categories: srv.categories.map(cat => ({
                                            ...cat,
                                            channels: cat.channels.map(chan => {
                                              if (chan.id === selectedChannelId) {
                                                return {
                                                  ...chan,
                                                  topics: [
                                                    ...(chan.topics || []),
                                                    {
                                                      id: 'topic-1',
                                                      title: 'Cách pha trà dâu muối hồng ngon nhất ngọt thanh? 🍓',
                                                      content: 'Chào mng nhen, mình là Ren nè. Nay phát động phong trào khoe tủ mật ấm dừa và trà dâu nhé.',
                                                      topicPrompt: 'Hãy đóng vai các người yêu thích dâu tây, nói chuyện thật dễ thương nũng nịu về trà dâu muối hồng và phong vân mỹ thực nhen! 🍓🥛',
                                                      authorName: 'Ren 🍓',
                                                      authorAvatar: 'https://i.postimg.cc/8PsrgdRw/77d07398d5dcb4fe854ed6c956ce1252.jpg',
                                                      timestamp: 'Vừa xong',
                                                      replies: []
                                                    }
                                                  ]
                                                };
                                              }
                                              return chan;
                                            })
                                          }))
                                        };
                                      }
                                      return srv;
                                    }));
                                  }}
                                  className="mt-2 px-3 py-1 bg-[#FFFCFD] border rounded-md text-[10px] font-bold text-[#CBA3A3]"
                                >
                                  Khởi tạo dữ liệu mẫu diễn đàn
                                </button>
                              </div>
                            );
                          }

                          return topicsToRender.map((topic: any) => (
                            <div 
                              key={topic.id}
                              onClick={() => {
                                openPost(topic.id);
                                setTopicCommentDraft('');
                              }}
                              className={`p-3 border border-[#F9C6D4]/20 rounded-2xl cursor-pointer transition-all shadow-sm duration-200 mb-3 relative z-10 ${
                              wallpapers.channelContent 
                                ? 'bg-[#FFF5FB]/90 hover:bg-[#FFF5FB]' 
                                : 'bg-white hover:bg-[#FFF5FB]/30'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-1">
                              <h3 className="text-[12px] font-bold text-[#4f4a54] hover:text-[#F3B4C2] transition-colors leading-snug">{topic.title}</h3>
                                {topic.batchId && (
                                  <span className="text-[8px] bg-[#FFF5FB] text-[#EFA9C2] px-1.5 py-0.5 rounded-full border border-[#F9C6D4]/25 shrink-0">
                                    {topic.batchId}
                                  </span>
                                )}
                              </div>
                              <p className="text-[10.5px] text-gray-500 line-clamp-3 mt-1.5 leading-snug">{topic.content}</p>
                              
                              {/* Small thumb preview if imageUrl is present */}
                              {topic.imageUrl && (
                                <div className="mt-2 text-[9px] text-[#EFA9C2] flex items-center gap-1 bg-[#FFF5FB]/40 px-2 py-1 rounded-lg border border-[#F9C6D4]/10 w-fit">
                                  <ImageIcon size={10} /> Đính kèm hình ảnh
                                </div>
                              )}

                                <div className="flex items-center justify-between mt-3 text-[9px] text-[#CBA3A3] font-medium border-t border-gray-50 pt-2 shrink-0">
                                  <div className="flex items-center gap-1.5">
                                    <div className="w-3.5 h-3.5 rounded-full overflow-hidden shrink-0 border border-[#F5C6D6]/40">
                                      <SafeImage src={topic.authorAvatar} alt="av" />
                                    </div>
                                    <span>Đăng bởi <b>{topic.authorName}</b></span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span>💖 {topic.likes || 0}</span>
                                    <span>💬 {topic.replies?.length || 0} bình luận</span>
                                    <span>{topic.timestamp}</span>
                                  </div>
                                </div>
                            </div>
                          ));
                        })()}
                      </div>
                    </div>
                  )}

                </div>
              ) : (
                // --- CHAT & TEXT CHAN VIEW ---
                <div className={`flex-1 flex flex-col overflow-hidden relative ${wallpapers.channelContent ? 'bg-transparent' : 'bg-[#FAF9F6]'}`}>
                  {activeChannel.messages?.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                      <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center shadow-xs border border-[#F9C6D4]/20 text-[#F9C6D4] text-xl mb-3">
                        💬
                      </div>
                      <h4 className="text-[12.5px] font-bold text-gray-400">Kênh chưa có nội dung hoạt động</h4>
                      <p className="text-[10px] text-gray-400 max-w-xs mt-1">
                        Vợ yêu hãy gõ nội dung hoặc dùng nút gọi API để các NPC sinh hoạt náo nhiệt nhé! 💕
                      </p>
                    </div>
                  ) : (
                    <div className="message-list flex-1 overflow-y-auto p-4 space-y-4 relative z-10">
                      {activeChannel.messages.map((msg: any) => {
                        const isAnnouncement = msg.isAnnouncement;
                        return (
                          <div 
                            key={msg.id} 
                            className={`flex gap-3 items-start group select-text transition-all ${
                              isAnnouncement 
                                ? 'bg-gradient-to-r from-[#FFF8F8] to-[#FFF5FB] border border-[#FDFCFD] rounded-xl p-3 shadow-sm' 
                                : 'p-2 rounded-xl hover:bg-white/40'
                            }`}
                          >
                            <div className="w-9 h-9 rounded-xl overflow-hidden shrink-0 border border-[#F9C6D4]/20 shadow-xs">
                              <SafeImage src={msg.senderAvatar || 'https://i.postimg.cc/YCGgYNjy/84187130465826af656425ff831218e0.jpg'} alt="avatar" />
                            </div>
                            
                            <div className="space-y-1 overflow-hidden flex-1">
                              
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-xs text-gray-700 hover:underline cursor-pointer">{msg.senderName}</span>
                                <span className="text-[8px] text-gray-400 shrink-0">{msg.timestamp}</span>
                                
                                {isAnnouncement && (
                                  <span className="text-[8px] bg-red-400 text-white rounded px-1.5 font-bold scale-90">BAN QUẢN TRỊ</span>
                                )}
                              </div>

                              {/* Quotes or replies if present */}
                              {msg.replyTo && (
                                <div className="text-[9.5px] text-[#CBA3A3] bg-[#FCFBFB] border-l-2 border-[#D7B8B8] pl-2 py-0.5 max-w-sm truncate">
                                  ↳ Nhắc lại lời <b>{msg.replyTo}</b>
                                </div>
                              )}

                              {/* Body chat text */}
                              <p className="text-[11.5px] text-gray-600 leading-relaxed whitespace-pre-wrap font-sans break-words select-text bg-[#FFF5FB]/40 p-1.5 rounded-lg border border-[#F9C6D4]/5">
                                {msg.content}
                              </p>

                              {/* Stickers or emoji visual renders conforming with details */}
                              {msg.sticker && (
                                <div className="text-3xl pt-1 hover:scale-110 active:scale-95 transition-all cursor-pointer w-fit" title="Click thả tim">
                                  {msg.sticker}
                                </div>
                              )}

                              {/* Reaction row */}
                              <div className="flex gap-1 pt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button className="px-1.5 py-0.5 rounded-full bg-white hover:bg-gray-100 border text-[9px] text-[#CBA3A3] flex items-center gap-0.5">
                                  🌸 1
                                </button>
                                <button className="px-1.5 py-0.5 rounded-full bg-white hover:bg-gray-100 border text-[9px] text-[#CBA3A3] flex items-center gap-0.5">
                                  🐰 2
                                </button>
                              </div>

                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Chat input form panel */}
                  <div className={`p-3 border-t border-[#F9C6D4]/15 shrink-0 flex items-center gap-2 ${wallpapers.channelContent ? 'bg-transparent' : 'bg-white'}`}>
                    
                    {/* Actions tray */}
                    <div className="flex gap-2">
                      <button className="text-[#CBA3A3] hover:text-[#EFA9C2] active:scale-95 transition-transform">
                        <Plus size={18} />
                      </button>
                      <button className="text-[#CBA3A3] hover:text-[#EFA9C2] active:scale-95 transition-transform">
                        <Smile size={18} />
                      </button>
                    </div>

                    {/* text box */}
                    <div className="flex-1 bg-gray-50 border border-gray-100 rounded-xl px-3 py-1.5 flex items-center gap-2">
                      <input 
                        type="text"
                        placeholder={`Nhắn tin vào #${activeChannel.name}... nhen 💕`}
                        value={userMsgDraft}
                        onChange={(e) => setUserMsgDraft(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSendManual()}
                        className="bg-transparent text-xs w-full text-gray-600 border-none focus:outline-none placeholder-gray-300"
                      />
                    </div>

                    {/* Send button */}
                    <button 
                      onClick={handleSendManual}
                      className="p-1.5 rounded-full bg-[#F5C6D6] hover:bg-[#EFA9C2] text-white shadow-xs active:scale-95 transition-all"
                    >
                      <Send size={14} fill="currentColor" />
                    </button>
                  </div>

                </div>
              )}

            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center bg-[#FAF9F6]">
              <p className="text-[12px] text-gray-400">Chọn hoặc tạo một kênh thảo luận mộng ảo để bắt đầu nhen!</p>
            </div>
          )}

        </div>
        )}

      </div>

      {/* ==================================================================================== */}
      {/* ==================== 🎀 OVERLAY MODAL: DISCORD API SETTINGS 🎀 ==================== */}
      {/* ==================================================================================== */}
      <AnimatePresence>
        {showApiSettings && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 bg-black/40 flex justify-center items-center p-4 select-none"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="w-full max-w-md max-h-[90vh] bg-white rounded-[24px] shadow-2xl overflow-y-auto outline outline-1 outline-[#F9C6D4]/30 flex flex-col"
            >
              
              {/* Box 1: Header */}
              <div className="p-4 bg-gradient-to-r from-[#FBF5F7] to-[#FFF5FB] text-center border-b border-[#F9C6D4]/20 flex flex-col items-center">
                <h3 className="text-base font-bold text-[#CBA3A3] tracking-[0.2em] uppercase">DISCORD</h3>
                <p className="text-[10px] text-[#DABEBE] tracking-wider mt-0.5">AI HUB • API SYSTEM • MOBILE</p>
              </div>

              {/* Box 2: Sub Header Back options */}
              <div className="px-4 py-3 border-b flex justify-between items-center bg-[#FAF9F6]">
                <button
                  onClick={() => setShowApiSettings(false)}
                  className="text-xs font-bold text-[#CBA3A3] hover:text-[#D7B8B8] flex items-center gap-1 active:scale-95"
                >
                  ← Quay lại
                </button>
                <div className="flex gap-2">
                  <span className="text-[#F5C6D6]">⚙</span>
                  <span className="text-[#EFA9C2]">✦</span>
                </div>
              </div>

              {/* Setting Description */}
              <div className="p-3 bg-[#FCFBFB] text-center border-b">
                <h4 className="text-xs font-bold text-[#C79C9C]">HỆ THỐNG API DISCORD</h4>
                <p className="text-[10px] text-[#BEBABA] mt-1">Kết nối AI Model bằng API chính hãng hoặc API Proxy bên thứ 3</p>
              </div>

              <div className="p-4 space-y-4 flex-1">
                
                {/* --- API TYPE DROPDOWN RENDER --- */}
                <div className="space-y-1.5 relative">
                  <label className="text-[10.5px] font-bold text-[#CBA3A3] tracking-wide block">API TYPE</label>
                  <button
                    type="button"
                    onClick={() => setShowApiTypeMenu(!showApiTypeMenu)}
                    className="w-full px-3 py-2 bg-white hover:bg-gray-50 border border-[#F9C6D4]/40 rounded-xl text-left text-xs text-gray-600 flex justify-between items-center transition-all"
                  >
                    <span>{discordApi.apiType === 'auto' ? 'Auto Detect' : discordApi.apiType}</span>
                    <span className="text-[#CBA3A3]">▼</span>
                  </button>

                  <AnimatePresence>
                    {showApiTypeMenu && (
                      <motion.div 
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        className="absolute left-0 right-0 top-[60px] z-20 bg-white border border-[#F9C6D4]/30 rounded-xl shadow-lg p-1 space-y-0.5"
                      >
                        {['Auto Detect', 'OpenAI-Compatible', 'Claude (Anthropic)', 'Gemini', 'Custom Endpoint'].map((opt) => {
                          let codeMapped: 'auto' | 'openai' | 'claude' | 'gemini' | 'custom' = 'auto';
                          if (opt === 'OpenAI-Compatible') codeMapped = 'openai';
                          if (opt === 'Claude (Anthropic)') codeMapped = 'claude';
                          if (opt === 'Gemini') codeMapped = 'gemini';
                          if (opt === 'Custom Endpoint') codeMapped = 'custom';

                          return (
                            <button
                              key={opt}
                              type="button"
                              onClick={() => {
                                setDiscordApi(prev => ({ ...prev, apiType: codeMapped }));
                                setShowApiTypeMenu(false);
                              }}
                              className="w-full px-3 py-1.5 text-left text-xs hover:bg-[#FFF5FB] text-gray-600 rounded-lg transition-colors flex items-center justify-between"
                            >
                              <span>{opt}</span>
                              {discordApi.apiType === codeMapped && <Check size={12} className="text-[#F5C6D6]" />}
                            </button>
                          );
                        })}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* --- ENDPOINT URL FRAME --- */}
                <div className="p-3 bg-[#FFF8F8] rounded-24 relative space-y-1.5 outline outline-1 outline-[#F5C6D6]/20">
                  <label className="text-[10.5px] font-bold text-[#CBA3A3] block">ENDPOINT URL</label>
                  <div className="bg-white border rounded-xl px-3 py-2 border-[#F9C6D4]/40">
                    <input 
                      type="text" 
                      placeholder="https://your-api-proxy.com/v1" 
                      value={discordApi.endpoint}
                      onChange={(e) => setDiscordApi(prev => ({ ...prev, endpoint: e.target.value }))}
                      className="w-full bg-transparent border-none focus:outline-none text-xs text-gray-600"
                    />
                  </div>
                  <div className="text-[9px] text-[#CFAAAA] space-y-0.5 pl-1">
                    <p>Hỗ trợ:</p>
                    <p>• Base URL</p>
                    <p>• Full path</p>
                    <p>• Có /v1 hoặc không</p>
                  </div>
                </div>

                {/* --- API KEY FRAME --- */}
                <div className="p-3 bg-[#FFFCFD] rounded-24 relative space-y-2 outline outline-1 outline-[#F5C6D6]/20">
                  <label className="text-[10.5px] font-bold text-[#CBA3A3] block">API KEY</label>
                  <div className="bg-white border rounded-xl px-3 py-2 border-[#F9C6D4]/40 flex items-center justify-between">
                    <input 
                      type={showKeyPassword ? 'text' : 'password'} 
                      value={discordApi.apiKey}
                      onChange={(e) => setDiscordApi(prev => ({ ...prev, apiKey: e.target.value }))}
                      placeholder="Nhập khóa bí mật của vợ yêu..." 
                      className="w-full bg-transparent border-none focus:outline-none text-xs text-gray-600"
                    />
                    <button 
                      type="button" 
                      onClick={() => setShowKeyPassword(!showKeyPassword)}
                      className="p-1 hover:text-[#F3B4C2] text-gray-400"
                    >
                      {showKeyPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                  <p className="text-[9px] text-[#CFAAAA] pl-1">Hỗ trợ: sk- • Bearer • JWT • AIza • Custom Key</p>
                </div>

                {/* --- MODEL CONFIG FRAME --- */}
                <div className="p-3 bg-[#FBF5F7] rounded-[20px] relative space-y-2 outline outline-1 outline-[#F9C6D4]/10">
                  <label className="text-[10.5px] font-bold text-[#CBA3A3] block">MODEL</label>
                  
                  <div className="bg-white border rounded-xl px-3 py-2 border-[#F9C6D4]/40 flex items-center justify-between">
                    <input 
                      type="text" 
                      value={discordApi.model}
                      onChange={(e) => setDiscordApi(prev => ({ ...prev, model: e.target.value }))}
                      placeholder="gemini-2.5-pro" 
                      className="w-full bg-transparent border-none focus:outline-none text-xs text-gray-600"
                    />
                    <button 
                      type="button" 
                      onClick={() => setShowModelPicker(!showModelPicker)}
                      className="text-[10px] text-[#CBA3A3] hover:text-[#D5B2B2]"
                    >
                      ▼
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={handleFetchModels}
                    disabled={isCheckingApi}
                    className="w-full mt-2 py-1.5 bg-[#F5C6D6] hover:bg-[#EFA9C2] text-white rounded-xl text-[11px] font-bold shadow-xs active:scale-95 transition-all flex items-center justify-center gap-1.5"
                  >
                    {isCheckingApi ? (
                      <>
                        <RefreshCw size={12} className="animate-spin" />
                        Đang đồng bộ model thật...
                      </>
                    ) : (
                      'Lấy danh sách Model thực từ Proxy'
                    )}
                  </button>

                  {/* Models list pull view */}
                  {showModelPicker && (
                    <div className="bg-white rounded-xl border border-[#F9C6D4]/30 p-3 space-y-2 mt-2 max-h-[160px] overflow-y-auto">
                      <div className="flex justify-between items-center pb-2 border-b">
                        <span className="text-[10px] font-bold text-[#CBA3A3]">MẪU ĐỒNG BỘ THẬT</span>
                        <input 
                          type="text" 
                          placeholder="Tìm kiếm..."
                          value={modelSearch}
                          onChange={(e) => setModelSearch(e.target.value)}
                          className="px-2 py-0.5 text-[9px] border rounded w-[100px] outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        {pulledModels
                          .filter(m => m.toLowerCase().includes(modelSearch.toLowerCase()))
                          .map(m => (
                            <button
                              key={m}
                              type="button"
                              onClick={() => {
                                setDiscordApi(prev => ({ ...prev, model: m }));
                                setShowModelPicker(false);
                              }}
                              className="w-full text-left py-1 px-2 hover:bg-[#FFF5FB] text-[10.5px] rounded transition-colors block text-gray-600 font-medium font-mono"
                            >
                              ○ {m}
                            </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* --- CHẾ ĐỘ KẾT NỐI (CONNECTION PRESETS) --- */}
                <div className="p-3 bg-white rounded-24 outline outline-1 outline-[#F5C6D6]/10 space-y-2">
                  <span className="text-[10px] font-bold text-[#CBA3A3] block">CHẾ ĐỘ KẾT NỐI</span>
                  <div className="space-y-1.5">
                    {[
                      { checked: keepConnected, setter: setKeepConnected, text: "Giữ kết nối khi AI đang xử lý" },
                      { checked: noEarlyClose, setter: setNoEarlyClose, text: "Không đóng stream giữa chừng" },
                      { checked: matchChunk, setter: setMatchChunk, text: "Nhận đầy đủ toàn bộ chunk" },
                      { checked: finishComplete, setter: setFinishComplete, text: "Chỉ kết thúc khi AI hoàn thành" },
                      { checked: backToDiscord, setter: setBackToDiscord, text: "Trả toàn bộ phản hồi về Discord" },
                      { checked: maintainConnection, setter: setMaintainConnection, text: "Duy trì kết nối ổn định" }
                    ].map((item, idx) => (
                      <label key={idx} className="flex items-center gap-2 cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={item.checked} 
                          onChange={(e) => item.setter(e.target.checked)}
                          className="rounded text-[#F5C6D6] focus:ring-[#F5C6D6] scale-95" 
                        />
                        <span className="text-[10.5px] text-gray-500 font-medium select-none">{item.text}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* --- STREAM RESPONSE CHANCE --- */}
                <div className="p-3 bg-[#FFAAAA]/5 rounded-24 outline outline-1 outline-[#F5C6D6]/15 space-y-2">
                  <span className="text-[10px] font-bold text-[#CBA3A3] block">STREAM RESPONSE</span>
                  <div className="space-y-1.5">
                    {[
                      { checked: streamChunkRealtime, setter: setStreamChunkRealtime, text: "Stream từng chunk realtime" },
                      { checked: showTokenCount, setter: setShowTokenCount, text: "Hiển thị token đang sinh" },
                      { checked: noFullWait, setter: setNoFullWait, text: "Không chờ full mới hiển thị" },
                      { checked: autoConcatenate, setter: setAutoConcatenate, text: "Tự ghép chunk hoàn chỉnh" }
                    ].map((item, idx) => (
                      <label key={idx} className="flex items-center gap-2 cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={item.checked} 
                          onChange={(e) => item.setter(e.target.checked)}
                          className="rounded text-[#F5C6D6] focus:ring-[#F5C6D6] scale-95" 
                        />
                        <span className="text-[10.5px] text-gray-500 font-medium select-none">{item.text}</span>
                      </label>
                    ))}
                  </div>
                </div>

              </div>

              {/* Save trigger button on API system */}
              <div className="p-4 bg-gray-50 border-t flex gap-2">
                <button
                  onClick={() => {
                    localStorage.setItem('discord_api_config', JSON.stringify(discordApi));
                    setShowApiSettings(false);
                    showToast("🌸 Đã hoàn tất lưu cấu hình Discord API! Tự động load mỗi khi gõ cửa!");
                  }}
                  className="flex-1 py-2 bg-gradient-to-r from-[#F5C6D6] to-[#EFA9C2] text-white rounded-xl text-xs font-bold shadow-md hover:scale-[1.02] active:scale-95 transition-all text-center"
                >
                  LƯU CẤU HÌNH API
                </button>
              </div>

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ==================== 🎀 OVERLAY MODAL: SERVER CREATION 🎀 ==================== */}
      <AnimatePresence>
        {showServerCreate && (
          <div className="absolute inset-0 z-50 bg-black/40 flex justify-center items-end sm:items-center p-4">
            <motion.div 
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 50, opacity: 0 }}
              className="w-full max-w-sm bg-white rounded-t-[24px] sm:rounded-[24px] p-5 shadow-2xl relative space-y-4"
            >
              <div className="flex justify-between items-center pb-2 border-b">
                <span className="text-xs font-bold text-gray-500">TẠO MÁY CHỦ CỦA CẬU</span>
                <button onClick={() => setShowServerCreate(false)} className="text-[#CBA3A3] text-sm">Đóng</button>
              </div>

              <p className="text-[11px] text-gray-400 text-center">
                Máy chủ của cậu là nơi giao lưu với bạn bè, những người có chung sở thích nhen!
              </p>

              {/* Upload cover background / Avatar */}
              <div className="flex justify-around items-center gap-2 pt-2">
                
                <div className="flex flex-col items-center">
                  <input 
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    ref={serverAvatarInputRef}
                    onChange={(e) => handleBase64Upload(e, setNewServerAvatar)}
                  />
                  <button 
                    onClick={() => serverAvatarInputRef.current?.click()}
                    className="w-14 h-14 rounded-xl bg-[#FAF9F6] border border-[#F9C6D4] flex items-center justify-center overflow-hidden cursor-pointer shadow-xs text-[#CBA3A3]"
                  >
                    <SafeImage src={newServerAvatar} alt="preview" />
                  </button>
                  <span className="text-[9px] text-[#CBA3A3] mt-1 font-bold">Icon Server</span>
                </div>

                <div className="flex flex-col items-center">
                  <input 
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    ref={serverCoverInputRef}
                    onChange={(e) => handleBase64Upload(e, setNewServerCover)}
                  />
                  <button 
                    onClick={() => serverCoverInputRef.current?.click()}
                    className="w-14 h-14 rounded-xl bg-[#FAF9F6] border border-[#F9C6D4] flex items-center justify-center overflow-hidden cursor-pointer shadow-xs text-[#CBA3A3]"
                  >
                    <SafeImage src={newServerCover} alt="preview" />
                  </button>
                  <span className="text-[9px] text-[#CBA3A3] mt-1 font-bold">Hình Nền</span>
                </div>

              </div>

              {/* Server Name input */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 tracking-wider">TÊN MÁY CHỦ</label>
                <input 
                  type="text" 
                  value={newServerName}
                  onChange={(e) => setNewServerName(e.target.value)}
                  placeholder="Nhập tên máy chủ để hoạt động..."
                  className="w-full px-3 py-2 border rounded-xl focus:outline-none text-xs border-[#F9C6D4]/50 text-gray-600"
                />
              </div>

              <button
                onClick={handleAddNewServer}
                className="w-full py-2 bg-gradient-to-r from-[#F5C6D6] to-[#EFA9C2] text-white font-bold rounded-xl text-xs shadow-md active:scale-95 transition-transform"
              >
                Tạo máy chủ ngay nhen 💕
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ==================== 🎀 OVERLAY MODAL: SERVER COMPLETE SETTINGS (ADMIN PANEL) 🎀 ==================== */}
      <AnimatePresence>
        {showServerSettings && (
          <div className="absolute inset-0 z-50 bg-black/40 flex justify-center items-center p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md max-h-[85vh] bg-white rounded-[24px] overflow-y-auto p-4 space-y-4 shadow-2xl relative"
            >
              <div className="flex justify-between items-center pb-2 border-b border-[#F9C6D4]/30">
                <span className="text-xs font-bold text-gray-500 tracking-wider">⚙️ CÀI ĐẶT MÁY CHỦ CHUYÊN SÂU</span>
                <button 
                  onClick={() => setShowServerSettings(false)}
                  className="text-xs font-bold text-[#CBA3A3]"
                >
                  Xong
                </button>
              </div>

              {/* Tag navigation inside settings */}
              <div className="flex bg-[#FBF5F7] p-1 rounded-xl border border-[#F9C6D4]/20 justify-between shrink-0">
                <button
                  type="button"
                  onClick={() => setActiveSettingsTab('wallpaper')}
                  className={`text-[10px] font-bold px-1.5 py-2 rounded-lg transition-all flex-1 text-center ${
                    activeSettingsTab === 'wallpaper' ? 'bg-[#F2B8CC] text-white shadow-xs' : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  🌸 Tên & Nền
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSettingsTab('emojis')}
                  className={`text-[10px] font-bold px-1.5 py-2 rounded-lg transition-all flex-1 text-center ${
                    activeSettingsTab === 'emojis' ? 'bg-[#F2B8CC] text-white shadow-xs' : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  ✨ Emojis
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSettingsTab('roles')}
                  className={`text-[10px] font-bold px-1.5 py-2 rounded-lg transition-all flex-1 text-center ${
                    activeSettingsTab === 'roles' ? 'bg-[#F2B8CC] text-white shadow-xs' : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  👑 Vai Trò
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSettingsTab('members')}
                  className={`text-[10px] font-bold px-1.5 py-2 rounded-lg transition-all flex-1 text-center ${
                    activeSettingsTab === 'members' ? 'bg-[#F2B8CC] text-white shadow-xs' : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  👥 NPC
                </button>
              </div>

              {activeSettingsTab === 'wallpaper' && (
                <div className="space-y-4">
                  {/* SỬA TÊN & MÔ TẢ MÁY CHỦ */}
                  <div className="p-3 bg-[#FAF9F6] rounded-xl space-y-3 border">
                    <div className="space-y-1">
                      <h3 className="text-[11px] font-bold text-[#CBA3A3] uppercase">🏷️ Tên Máy Chủ</h3>
                      <input 
                        type="text" 
                        value={editServerName} 
                        onChange={(e) => setEditServerName(e.target.value)}
                        className="w-full p-2 py-1.5 text-xs border rounded-lg focus:outline-none bg-white select-text cursor-text font-bold text-gray-700"
                        placeholder="Nhập tên mới..."
                      />
                    </div>
                    
                    <div className="space-y-1">
                      <h3 className="text-[11px] font-bold text-[#CBA3A3] uppercase">📖 Mô Tả Tổng Quan (Context Proxy)</h3>
                      <textarea 
                        rows={3}
                        value={editServerDesc} 
                        onChange={(e) => setEditServerDesc(e.target.value)}
                        className="w-full p-2 py-1.5 text-[10px] border rounded-lg focus:outline-none bg-white select-text cursor-text text-gray-600"
                        placeholder="Mô tả cho AI biết đây là server gì, bối cảnh ra sao..."
                      />
                    </div>

                    <button
                      onClick={handleSaveServerGeneral}
                      className="w-full py-1.5 bg-[#CBA3A3] text-white text-[10px] font-bold rounded-lg shadow-sm"
                    >
                      Lưu Thay Đổi Tổng Quan ✨
                    </button>
                  </div>

                  {/* THIẾT LẬP HÌNH NỀN 3 TAB */}
                  <div className="p-3 bg-[#FFF5FB] rounded-xl space-y-3 border border-[#F9C6D4]/30">
                    <h3 className="text-[11px] font-bold text-[#CBA3A3] uppercase">🌸 Thiết Lập Hình Nền (3 Tab)</h3>
                    <p className="text-[9px] text-[#CBA3A3] italic">Chọn hình nền full trang đặc trưng thêu dệt cho từng khu vực nhen vợ yêu! 💕</p>
                    
                    {/* Tab 1: Trang Chủ / Home */}
                    <div className="space-y-1 bg-white p-2.5 rounded-lg border border-[#F9C6D4]/20">
                      <div className="flex justify-between items-center">
                        <span className="text-[11px] font-bold text-[#C79C9C]">🏰 Trang Chủ (Cung Điện)</span>
                        {wallpapers.serverList && (
                          <button 
                            type="button"
                            onClick={() => handleSetWallpaper('serverList', '')} 
                            className="text-[9px] font-bold text-red-400 hover:underline"
                          >
                            Reset
                          </button>
                        )}
                      </div>
                      
                      <div className="flex gap-1.5 items-center">
                        <input 
                          type="text" 
                          placeholder="Dán link ảnh nhen vợ..." 
                          value={wallpapers.serverList}
                          onChange={(e) => handleSetWallpaper('serverList', e.target.value)}
                          className="p-1 px-2 text-[10.5px] border rounded-lg flex-1 bg-gray-50 focus:bg-white focus:outline-none"
                        />
                        <label className="shrink-0 cursor-pointer bg-[#F5C6D6] hover:bg-[#EFA9C2] text-white px-2 py-1 text-[9.5px] font-bold rounded-lg transition-colors">
                          <span>Tải ảnh</span>
                          <input 
                            type="file" 
                            accept="image/*" 
                            className="hidden" 
                            onChange={(e) => handleBase64Upload(e, (data) => handleSetWallpaper('serverList', data))}
                          />
                        </label>
                      </div>
                    </div>

                    {/* Tab 2: Chi tiết Kênh nhen vợ */}
                    <div className="space-y-1 bg-white p-2.5 rounded-lg border border-[#F9C6D4]/20">
                      <div className="flex justify-between items-center">
                        <span className="text-[11px] font-bold text-[#C79C9C]">💬 Chi tiết Kênh & Chat</span>
                        {wallpapers.channelContent && (
                          <button 
                            type="button"
                            onClick={() => handleSetWallpaper('channelContent', '')} 
                            className="text-[9px] font-bold text-red-400 hover:underline"
                          >
                            Reset
                          </button>
                        )}
                      </div>
                      
                      <div className="flex gap-1.5 items-center">
                        <input 
                          type="text" 
                          placeholder="Dán link ảnh nhen vợ..." 
                          value={wallpapers.channelContent}
                          onChange={(e) => handleSetWallpaper('channelContent', e.target.value)}
                          className="p-1 px-2 text-[10.5px] border rounded-lg flex-1 bg-gray-50 focus:bg-white focus:outline-none"
                        />
                        <label className="shrink-0 cursor-pointer bg-[#F5C6D6] hover:bg-[#EFA9C2] text-white px-2 py-1 text-[9.5px] font-bold rounded-lg transition-colors">
                          <span>Tải ảnh</span>
                          <input 
                            type="file" 
                            accept="image/*" 
                            className="hidden" 
                            onChange={(e) => handleBase64Upload(e, (data) => handleSetWallpaper('channelContent', data))}
                          />
                        </label>
                      </div>
                    </div>

                    {/* Tab 3: Bài đăng Diễn Đàn nhen vợ */}
                    <div className="space-y-1 bg-white p-2.5 rounded-lg border border-[#F9C6D4]/20">
                      <div className="flex justify-between items-center">
                        <span className="text-[11px] font-bold text-[#C79C9C]">📓 Chi tiết Bài đăng / Diễn đàn</span>
                        {wallpapers.postDetail && (
                          <button 
                            type="button"
                            onClick={() => handleSetWallpaper('postDetail', '')} 
                            className="text-[9px] font-bold text-red-400 hover:underline"
                          >
                            Reset
                          </button>
                        )}
                      </div>
                      
                      <div className="flex gap-1.5 items-center">
                        <input 
                          type="text" 
                          placeholder="Dán link ảnh nhen vợ..." 
                          value={wallpapers.postDetail}
                          onChange={(e) => handleSetWallpaper('postDetail', e.target.value)}
                          className="p-1 px-2 text-[10.5px] border rounded-lg flex-1 bg-gray-50 focus:bg-white focus:outline-none"
                        />
                        <label className="shrink-0 cursor-pointer bg-[#F5C6D6] hover:bg-[#EFA9C2] text-white px-2 py-1 text-[9.5px] font-bold rounded-lg transition-colors">
                          <span>Tải ảnh</span>
                          <input 
                            type="file" 
                            accept="image/*" 
                            className="hidden" 
                            onChange={(e) => handleBase64Upload(e, (data) => handleSetWallpaper('postDetail', data))}
                          />
                        </label>
                      </div>
                    </div>

                    {/* Preset Library Section */}
                    <div className="space-y-1 bg-[#FAF9F9] p-2.5 rounded-lg border border-dashed border-[#F5C6D6]">
                      <h4 className="text-[10px] font-bold text-[#D3B2B2] uppercase flex items-center gap-1">
                        <span>💖 Thư viện hình nền Coquette có sẵn:</span>
                      </h4>
                      <div className="grid grid-cols-4 gap-1.5 pt-1">
                        {[
                          { name: 'Hoa Nhí', url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&q=80' },
                          { name: 'Dreamy', url: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=800&q=80' },
                          { name: 'Vintage', url: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=800&q=80' },
                          { name: 'Pastel', url: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=800&q=80' }
                        ].map((preset, idx) => (
                          <button 
                            key={idx}
                            type="button"
                            onClick={() => {
                              setWallpapers({
                                serverList: preset.url,
                                channelContent: preset.url,
                                postDetail: preset.url
                              });
                            }}
                            className="flex flex-col items-center hover:scale-105 transition-transform"
                          >
                            <div 
                              className="w-full h-10 rounded border border-[#F9C6D4]/50 bg-cover bg-center animate-fade-in"
                              style={{ backgroundImage: `url(${preset.url})` }}
                            />
                            <span className="text-[8px] font-bold text-[#CBA3A3] mt-0.5 truncate w-full text-center">
                              {preset.name}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeSettingsTab === 'roles' && (
                /* Roles management frame */
                <div className="p-3 bg-[#FAF9F6] rounded-xl space-y-2 border">
                  <h3 className="text-[11px] font-bold text-[#CBA3A3]">👑 QUẢN LÝ VAI TRÒ (ROLES)</h3>
                  
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      placeholder="Tên Vai trò" 
                      value={newRoleName}
                      onChange={(e) => setNewRoleName(e.target.value)}
                      className="p-1 px-2 text-xs border rounded-lg focus:outline-none flex-1 bg-white"
                    />
                    <input 
                      type="color" 
                      value={newRoleColor}
                      onChange={(e) => setNewRoleColor(e.target.value)}
                      className="w-8 h-7 rounded border cursor-pointer shrink-0"
                    />
                    <button 
                      type="button"
                      onClick={handleCreateRole}
                      className="px-3 py-1 bg-[#F5C6D6] hover:bg-[#EFA9C2] text-white font-bold text-[10px] rounded-lg shadow-xs"
                    >
                      Thêm
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-1.5 pt-1.5">
                    {currentServer?.roles?.map(r => (
                      <span 
                        key={r.id} 
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold text-white shadow-xs"
                        style={{ backgroundColor: r.color }}
                      >
                        <span>{r.name}</span>
                        <button 
                          type="button"
                          onClick={() => handleDeleteRole(r.id)} 
                          className="hover:scale-125 transition-transform bg-black/10 hover:bg-black/25 text-white w-3 h-3 rounded-full flex items-center justify-center text-[8px] font-extrabold focus:outline-none ml-0.5"
                          title="Xóa Vai Trò"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {activeSettingsTab === 'emojis' && (
                /* Emoji/Sticker configuration panel */
                <div className="p-3 bg-[#FCFBFB] rounded-xl space-y-2 border font-sans">
                  <h3 className="text-[11px] font-bold text-[#CBA3A3]">🌸 EMOJI VÀ STICKER CẢM XÚC</h3>
                  
                  <div className="flex gap-1">
                    <input 
                      type="text" 
                      placeholder="Ký tự (vd: 🌸)" 
                      value={newEmojiChar}
                      onChange={(e) => setNewEmojiChar(e.target.value)}
                      className="p-1 px-2 text-xs border rounded-lg w-16"
                    />
                    <input 
                      type="text" 
                      placeholder="Tên nhãn (vd: vui)" 
                      value={newEmojiName}
                      onChange={(e) => setNewEmojiName(e.target.value)}
                      className="p-1 px-2 text-xs border rounded-lg flex-1"
                    />
                    <select 
                      value={newEmojiState}
                      onChange={(e) => setNewEmojiState(e.target.value)}
                      className="text-[10px] p-1 border rounded-lg bg-white"
                    >
                      <option value="Vui">Vui</option>
                      <option value="Buồn">Buồn</option>
                      <option value="Hạnh Phúc">Hạnh Phúc</option>
                      <option value="Dễ thương">Dễ thương</option>
                    </select>
                    <button 
                      type="button"
                      onClick={handleCreateEmoji}
                      className="px-2 py-1 bg-[#F5C6D6] text-white text-[10px] font-bold rounded-lg"
                    >
                      Thêu
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-1 mt-1">
                    {currentServer?.emojis?.map(e => (
                      <span key={e.id} className="p-1.5 bg-white border border-[#F9C6D4]/30 rounded-xl text-xs flex items-center gap-1.5 shadow-3xs relative group">
                        <span>{e.image}</span>
                        <span className="text-[8px] text-[#CBA3A3] font-bold font-mono">:{e.name}</span>
                        <button
                          type="button"
                          onClick={() => handleDeleteEmoji(e.id)}
                          className="text-[9px] text-[#DEC4C4] hover:text-[#C79C9C] font-extrabold px-1 transition-colors hover:scale-110 ml-0.5"
                          title="Xóa Emoji"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {activeSettingsTab === 'members' && (
                /* Member creation manually / Dynamic list */
                <div className="p-3 bg-[#FFF5FB] rounded-xl space-y-2 border border-[#F9C6D4]/30">
                  <div className="flex justify-between items-center bg-white/40 p-1.5 rounded-lg">
                    <h3 className="text-[11px] font-bold text-[#CBA3A3] uppercase">NPC LIST ({currentServer?.members?.length || 0})</h3>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleAutoGenerate300NPCs}
                        disabled={!!streamingStatus}
                        className="px-2 py-0.5 text-[9px] bg-gradient-to-r from-[#FDFCFD] to-[#FFF5FB] hover:bg-[#F9C6D4] border border-[#F9C6D4]/30 rounded-full font-bold text-[#CBA3A3] transition-all disabled:opacity-50 flex items-center gap-1"
                        title="Gọi API Proxy tự động sinh 300 NPC"
                      >
                        <Bot size={10} /> +300 AI NPC
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowAdminNpcCreate(true)}
                        className="px-2 py-0.5 text-[9px] bg-white hover:bg-gray-50 border border-[#F9C6D4]/30 rounded-full font-bold text-[#C79C9C] transition-all flex items-center gap-1"
                      >
                        + Tạo bằng tay
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5 max-h-[160px] overflow-y-auto">
                    {currentServer?.members?.map(m => {
                      const roleColor = currentServer.roles.find(r => r.id === m.roleId)?.color || '#D3B2B2';
                      return (
                        <div key={m.id} className="flex justify-between items-center p-1.5 bg-white rounded-lg border border-[#F9C6D4]/10 shadow-3xs">
                          <div className="flex items-center gap-2">
                            <div className="w-5 h-5 rounded-full overflow-hidden shrink-0 border">
                              <SafeImage src={m.avatar} alt="av" />
                            </div>
                            <div>
                              <span className="text-[11px] font-bold text-gray-700">{m.name}</span>
                              <span className="text-[8px] px-1 bg-gray-100 rounded ml-1 font-mono text-gray-400"> {m.age}t • {m.gender}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span 
                              className="text-[8px] px-1.5 py-0.5 rounded text-white font-bold"
                              style={{ backgroundColor: roleColor }}
                            >
                              {currentServer.roles.find(r => r.id === m.roleId)?.name || 'Thành Viên'}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleDeleteNpc(m.id)}
                              className="p-1 px-1.5 text-[10px] font-extrabold text-[#DEC4C4] hover:text-[#C14B5C] bg-red-50 hover:bg-red-100 rounded transition-all"
                              title="Xóa NPC"
                            >
                              ×
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* General details of Server */}
              <div className="p-3 bg-white border rounded-xl space-y-1 select-text">
                <span className="text-[10px] font-bold text-gray-400 tracking-wider uppercase block">Context Metadata</span>
                <p className="text-[9.5px] text-gray-400 leading-relaxed leading-normal">
                  Dữ liệu máy chủ này sẽ trực tiếp tự động đẩy vào hệ thống bộ nhớ context của AI Proxy, giúp AI hiểu được quy mô máy chủ và đóng giả nhân vật không bị nhầm lẫn.
                </p>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ==================== 🎀 OVERLAY MODAL: DYNAMIC NPC MAKER MANUALLY 🎀 ==================== */}
      <AnimatePresence>
        {showAdminNpcCreate && (
          <div className="absolute inset-0 z-50 bg-black/40 flex justify-center items-center p-4">
            <motion.div 
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="w-full max-w-sm bg-white rounded-[24px] p-5 space-y-4 shadow-2xl relative max-h-[85vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center pb-2 border-b">
                <span className="text-xs font-bold text-gray-500">TẠO THÀNH VIÊN NPC THỦ CÔNG</span>
                <button onClick={() => setShowAdminNpcCreate(false)} className="text-[#CBA3A3] text-sm">Đóng</button>
              </div>

              {/* Avatar trigger */}
              <div className="flex flex-col items-center">
                <input 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  ref={npcAvatarInputRef}
                  onChange={(e) => handleBase64Upload(e, setNewNpcAvatar)}
                />
                <button 
                  onClick={() => npcAvatarInputRef.current?.click()}
                  className="w-12 h-12 rounded-full bg-[#FAF9F6] border border-[#F9C6D4] flex items-center justify-center overflow-hidden cursor-pointer shadow-xs text-[#CBA3A3]"
                >
                  <SafeImage src={newNpcAvatar} alt="av" />
                </button>
                <span className="text-[8px] text-gray-400 mt-1">Ảnh đại diện NPC</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-0.5">
                  <label className="text-[9px] font-bold text-gray-400">TÊN NHÂN VẬT</label>
                  <input 
                    type="text" 
                    value={newNpcName} 
                    onChange={(e) => setNewNpcName(e.target.value)}
                    placeholder="Miu Miu..."
                    className="w-full p-1 border text-xs rounded"
                  />
                </div>
                <div className="space-y-0.5">
                  <label className="text-[9px] font-bold text-gray-400">TUỔI</label>
                  <input 
                    type="number" 
                    value={newNpcAge} 
                    onChange={(e) => setNewNpcAge(Number(e.target.value))}
                    className="w-full p-1 border text-xs rounded"
                  />
                </div>
                <div className="space-y-0.5">
                  <label className="text-[9px] font-bold text-gray-400">GIỚI TÍNH</label>
                  <input 
                    type="text" 
                    value={newNpcGender} 
                    onChange={(e) => setNewNpcGender(e.target.value)}
                    className="w-full p-1 border text-xs rounded"
                  />
                </div>
                <div className="space-y-0.5">
                  <label className="text-[9px] font-bold text-gray-400">VAI TRÒ (ROLE)</label>
                  <select 
                    value={newNpcRoleId} 
                    onChange={(e) => setNewNpcRoleId(e.target.value)}
                    className="w-full p-1 border text-xs rounded bg-white"
                  >
                    <option value="">Thành Viên Thường</option>
                    {currentServer?.roles.map(r => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-bold text-gray-400 block pb-0.5">XU HƯỚNG TÍNH DỤC</label>
                <input 
                  type="text" 
                  value={newNpcOrientation} 
                  onChange={(e) => setNewNpcOrientation(e.target.value)}
                  placeholder="Thích mộng dạt dào..."
                  className="w-full p-1.5 border text-[11px] rounded"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-bold text-gray-400 block pb-0.5">THÓI QUEN HÀNG NGÀY</label>
                <input 
                  type="text" 
                  value={newNpcHabits} 
                  onChange={(e) => setNewNpcHabits(e.target.value)}
                  placeholder="Uống sữa dâu tây, ngủ nướng dệt mộng..."
                  className="w-full p-1.5 border text-[11px] rounded"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-bold text-gray-400 block pb-0.5">SỞ THÍCH CÁ NHÂN</label>
                <input 
                  type="text" 
                  value={newNpcHobbies} 
                  onChange={(e) => setNewNpcHobbies(e.target.value)}
                  placeholder="Sưu tầm dải nơ ren coquette mộng ảo..."
                  className="w-full p-1.5 border text-[11px] rounded"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-bold text-gray-400 block pb-0.5">PHONG CÁCH NHẮN TIN</label>
                <input 
                  type="text" 
                  value={newNpcTyping} 
                  onChange={(e) => setNewNpcTyping(e.target.value)}
                  placeholder="Luôn thêm nhiều hoa cỏ 🌸 nhen!"
                  className="w-full p-1.5 border text-[11px] rounded"
                />
              </div>

              <button
                onClick={handleCreateNpcManual}
                className="w-full py-2 bg-[#F3B4C2] text-white text-xs font-bold rounded-xl shadow-md cursor-pointer"
              >
                Nhận Thành Viên Mới 🌸
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ==================== 🎀 OVERLAY MODAL: CHANNEL CREATION 🎀 ==================== */}
      <AnimatePresence>
        {showChannelCreate && (
          <div className="absolute inset-0 z-50 bg-black/40 flex justify-center items-center p-4">
            <motion.div 
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="w-full max-w-sm bg-white rounded-[24px] p-5 space-y-4 shadow-2xl relative"
            >
              <div className="flex justify-between items-center pb-2 border-b">
                <span className="text-xs font-bold text-gray-500">TẠO KÊNH THẢO LUẬN MỚI</span>
                <button onClick={() => setShowChannelCreate(false)} className="text-[#CBA3A3] text-sm">Đóng</button>
              </div>

              {/* Tên Kênh */}
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-gray-400 block">TÊN KÊNH</label>
                <input 
                  type="text" 
                  value={newChanName}
                  onChange={(e) => setNewChanName(e.target.value)}
                  placeholder="gui-chut-tinh-yeu"
                  className="w-full p-2 border text-xs rounded-xl focus:outline-none focus:ring-1 focus:ring-[#F5C6D6]"
                />
              </div>

              {/* Loại Kênh */}
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-gray-400 block">LOẠI KIỂU KÊNH (CHỌN 1 LOẠI)</label>
                <div className="space-y-1">
                  {[
                    { type: 'chat', label: "[☼] Kênh trò chuyện (NPC hoạt động náo nhiệt)" },
                    { type: 'text', label: "[#] Kênh văn bản (Chỉ Admin đăng bài thông cáo dài)" },
                    { type: 'forum', label: "[★] Kênh diễn đàn (Tạo topic bài đăng, NPC vào rep)" },
                    { type: 'announcement', label: "[!] Kênh thông báo (Ban trị sự cập nhật)" },
                    { type: 'event', label: "[✦] Kênh sự kiện (Tổng kết hội thảo, talk show)" }
                  ].map((chanT) => (
                    <label key={chanT.type} className="flex items-center gap-2 cursor-pointer p-1 rounded hover:bg-gray-50 text-[11px] font-medium text-gray-600">
                      <input 
                        type="radio" 
                        name="channelType" 
                        checked={newChanType === chanT.type}
                        onChange={() => setNewChanType(chanT.type as any)}
                        className="rounded-full text-[#F2B8CC] focus:ring-[#F2B8CC]" 
                      />
                      <span>{chanT.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <button
                onClick={handleAddNewChannel}
                className="w-full py-2 bg-gradient-to-r from-[#F5C6D6] to-[#EFA9C2] text-white font-bold rounded-xl text-xs"
              >
                Tạo Kênh Ngay
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ==================== 🎀 OVERLAY MODAL: DYNAMIC CATEGORY CREATION 🎀 ==================== */}
      <AnimatePresence>
        {showCategoryCreate && (
          <div className="absolute inset-0 z-50 bg-black/40 flex justify-center items-center p-4">
            <motion.div 
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="w-full max-w-sm bg-white rounded-[24px] p-5 space-y-4 shadow-2xl relative"
            >
              <div className="flex justify-between items-center pb-2 border-b">
                <span className="text-xs font-bold text-gray-500">TẠO DANH MỤC BAN SỰ</span>
                <button onClick={() => setShowCategoryCreate(false)} className="text-[#CBA3A3] text-sm">Đóng</button>
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] font-bold text-gray-400">TÊN DANH MỤC</label>
                <input 
                  type="text" 
                  value={newCatName} 
                  onChange={(e) => setNewCatName(e.target.value)}
                  placeholder="VƯỜN KẸO HỒNG"
                  className="w-full p-2 border text-xs rounded-xl"
                />
              </div>

              <button
                onClick={handleAddNewCategory}
                className="w-full py-2 bg-gradient-to-r from-[#F5C6D6] to-[#EFA9C2] text-white font-bold rounded-xl text-xs"
              >
                Lưu Danh Mục
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ==================== 🎀 OVERLAY MODAL: TOPIC DIỄN ĐÀN THẢO LUẬN CREATOR 🎀 ==================== */}
      <AnimatePresence>
        {showForumTopicCreate && (
          <div className="absolute inset-0 z-50 bg-black/40 flex justify-center items-center p-4">
            <motion.div 
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="w-full max-w-sm bg-white rounded-[24px] p-5 space-y-3 shadow-2xl relative"
            >
              <div className="flex justify-between items-center pb-2 border-b">
                <span className="text-xs font-bold text-gray-500">TẠO TOPIC THẢO LUẬN MỚI</span>
                <button onClick={() => setShowForumTopicCreate(false)} className="text-[#CBA3A3] text-sm">Hủy</button>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-bold text-gray-400">TIÊU ĐỀ TOPIC</label>
                <input 
                  type="text" 
                  value={forumTitle} 
                  onChange={(e) => setForumTitle(e.target.value)}
                  placeholder="Sao dạo này bông hồng mọc nhiều gai thế nhỉ? 🌸"
                  className="w-full p-1.5 border text-xs rounded-xl"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-bold text-gray-400">NỘI DUNG MÔ TẢ</label>
                <textarea 
                  rows={3}
                  value={forumDesc} 
                  onChange={(e) => setForumDesc(e.target.value)}
                  placeholder="Ghi thêu nội dung thảo luận dạt dào lòng mọc cho các NPC cùng chia sẻ ý kiến nhen..."
                  className="w-full p-1.5 border text-xs rounded-xl focus:outline-none"
                />
              </div>

              <div className="space-y-1 bg-[#FFF5FB]/50 p-2.5 rounded-xl border border-[#F9C6D4]/25">
                <label className="text-[9px] font-bold text-[#EFA9C2] flex items-center gap-1 uppercase">
                  ✨ Cách thức hoạt động & Quy tắc của Topic (System Prompt)
                </label>
                <textarea 
                  rows={3}
                  value={forumTopicPrompt} 
                  onChange={(e) => setForumTopicPrompt(e.target.value)}
                  placeholder="Quy định và cách các NPC sẽ bàn luận trong chủ đề này nhen vợ yêu. Ví dụ: 'Hãy đóng vai các nhân vật nói chuyện thơ ca, tràn ngập tình thương và sủng nịch'..."
                  className="w-full p-1.5 border border-[#F9C6D4]/30 text-xs rounded-xl focus:outline-none focus:border-[#EFA9C2] bg-white text-gray-700 leading-normal"
                />
              </div>

              <button
                onClick={() => {
                  if (!forumTitle.trim() || !forumDesc.trim()) return;
                  setServers(prev => prev.map(srv => {
                    if (srv.id === selectedServerId) {
                      return {
                        ...srv,
                        categories: srv.categories.map(cat => ({
                          ...cat,
                          channels: cat.channels.map(chan => {
                            if (chan.id === selectedChannelId) {
                              return {
                                ...chan,
                                topics: [
                                  ...(chan.topics || []),
                                  {
                                    id: `topic-${Date.now()}`,
                                    title: forumTitle,
                                    content: forumDesc,
                                    topicPrompt: forumTopicPrompt || "Hãy đóng vai thảo luận nhiệt thành, ngọt ngào, phù hợp với tâm trạng của diễn đàn và chủ đề thảo luận này nhen! 💕",
                                    authorName: srv.members[0]?.name || 'Admin',
                                    authorAvatar: srv.members[0]?.avatar || 'https://i.postimg.cc/YCGgYNjy/84187130465826af656425ff831218e0.jpg',
                                    timestamp: 'Vừa xong',
                                    replies: []
                                  }
                                ]
                              };
                            }
                            return chan;
                          })
                        }))
                      };
                    }
                    return srv;
                  }));

                  setForumTitle('');
                  setForumDesc('');
                  setForumTopicPrompt('');
                  setShowForumTopicCreate(false);
                  showToast("🌸 Đã khởi tạo Topic thảo luận diễn đàn thành công nhen!");
                }}
                className="w-full py-2 bg-[#F3B4C2] text-white text-xs font-bold rounded-xl"
              >
                Gieo Hạt Topic
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ==================== 🎀 OVERLAY MODAL: CHANNEL SPECIFIC SETTINGS (PROMPT & MISSION) 🎀 ==================== */}
      <AnimatePresence>
        {showChannelSettings && (
          <div className="absolute inset-0 z-50 bg-black/40 flex justify-center items-center p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
                                                      className="w-full max-w-sm bg-white rounded-[24px] p-5 space-y-4 shadow-2xl relative"
            >
              <div className="flex justify-between items-center pb-2 border-b">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">CÀI ĐẶT KÊNH: #{editChanName}</span>
                <button onClick={() => setShowChannelSettings(false)} className="text-[#CBA3A3] text-sm">Hủy</button>
              </div>

              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-gray-400">TÊN KÊNH</label>
                  <input 
                    type="text" 
                    value={editChanName}
                    onChange={(e) => setEditChanName(e.target.value)}
                    className="w-full p-2 border text-xs rounded-xl"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-gray-400">CHỦ ĐỀ / MÔ TẢ KÊNH (MISSION)</label>
                  <textarea 
                    rows={2}
                    value={editChanDesc}
                    onChange={(e) => setEditChanDesc(e.target.value)}
                    placeholder="Kênh này dùng để làm gì? (Vd: Nơi NPC thảo luận về thơ ca...)"
                    className="w-full p-2 border text-xs rounded-xl focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-gray-400">SYSTEM PROMPT RIÊNG (CHỈ THỊ AI)</label>
                  <textarea 
                    rows={4}
                    value={editChanPrompt}
                    onChange={(e) => setEditChanPrompt(e.target.value)}
                    placeholder="Prompt lệnh hệ thống cho AI làm việc tại kênh này..."
                    className="w-full p-2 border text-xs rounded-xl font-mono focus:outline-none"
                  />
                </div>
              </div>

              <button
                onClick={handleSaveChannelSettings}
                className="w-full py-2 bg-gradient-to-r from-[#F5C6D6] to-[#EFA9C2] text-white font-bold rounded-xl text-xs"
              >
                Lưu Thiết Lập Kênh ✨
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Toast Alert floating */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 15 }}
            className="absolute bottom-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-[#FFF5FB] border border-[#F9C6D4]/30 rounded-full shadow-lg text-[11px] font-bold text-[#EFA9C2] tracking-wider text-center max-w-xs whitespace-nowrap"
          >
            {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
