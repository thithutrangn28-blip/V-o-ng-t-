import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, Camera, Heart, MessageCircle, Plus, Search, 
  Share2, Sparkles, Send, X, Users, Bell, Settings, 
  Home, PlusCircle, Lock, Unlock, MoreHorizontal, 
  Image as ImageIcon, UserCheck, UserPlus, Flame, ShieldAlert,
  ThumbsUp, MessageSquare, Compass, Globe, CheckCircle2, Bookmark,
  BookOpen, UserCircle, RefreshCw, Info, Link as LinkIcon, AtSign, GraduationCap, Image, Phone, Archive, FileText
} from 'lucide-react';
import { 
  getKikokoStory, 
  loadKikokoInstagram, 
  saveKikokoSocialState, 
  loadKikokoSocialState 
} from '../utils/db';
import { sendMessage, sendMessageStream } from '../utils/apiProxy';

// Bảng màu coquette pastel của vợ yêu Đường:
const PAP_HN_1 = '#FBF5F7'; // Hồng Nhạt
const PAP_HN_2 = '#FFF5FB'; // Hồng Nhạt 2
const PAP_HN_C = '#F5C6D6'; // Coquette Pink
const PAP_HN_A = '#EFA9C2'; // Coquette Accent
const PAP_TR_W = '#FFFFFF'; // Trắng
const PAP_TR_F = '#FFFCFD'; // Trắng ngọc
const PAP_SUA = '#F4EAEA';  // Hồng Sữa
const PAP_PHAN = '#DABEBE'; // Hồng Phấn
const PAP_ACC = '#CBA3A3';  // Hồng Accent
const PAP_XAM = '#CAC7C7';  // Xám Hồng
const PAP_BABY = '#FAFBFF'; // Xanh Baby

const AVATAR_IMAGES = [
  'https://i.postimg.cc/jSqMz9y8/a892ab5de6f2b954b8b005acb7e464b2.jpg',
  'https://i.postimg.cc/tgKdmmnL/84187130465826af656425ff831218e0.jpg',
  'https://i.postimg.cc/bwvRGnhs/3dd8b16a0a620b9659cda31d316d592f.jpg',
  'https://i.postimg.cc/vZgTw4b3/589b51dc5ab70368746d7c8aa03a1cca.jpg',
  'https://i.postimg.cc/JnCJQD9h/9a27a03962a75f9df6e5302d5a3752bc.jpg',
  'https://i.postimg.cc/3JfvcbPf/365e109e1468ee8442e25e62af0fb216.jpg',
  'https://i.postimg.cc/g2hHgkXv/608ae9d485765bd298f643d41a06d193.jpg'
];

const POST_IMAGES = [
  'https://i.postimg.cc/jSqMz9y8/a892ab5de6f2b954b8b005acb7e464b2.jpg',
  'https://i.postimg.cc/tgKdmmnL/84187130465826af656425ff831218e0.jpg',
  'https://i.postimg.cc/bwvRGnhs/3dd8b16a0a620b9659cda31d316d592f.jpg',
  'https://i.postimg.cc/vZgTw4b3/589b51dc5ab70368746d7c8aa03a1cca.jpg',
  'https://i.postimg.cc/JnCJQD9h/9a27a03962a75f9df6e5302d5a3752bc.jpg',
  'https://i.postimg.cc/3JfvcbPf/365e109e1468ee8442e25e62af0fb216.jpg',
  'https://i.postimg.cc/SRDMqZjn/5471321645bee467ca0cdea0939a5750.jpg',
  'https://i.postimg.cc/rsc1q0JH/de3791684d163e7d25e7796fe85d0d21.jpg',
  'https://i.postimg.cc/Ghr3SX51/6e099900dcad25155f059ac8c7e06b9f.jpg',
  'https://i.postimg.cc/nzBZ3mKj/b8366c4eb678393a1c773f6705f542d0.jpg',
  'https://i.postimg.cc/fyvsNhrR/b0a2d0c30d76d78cc9bd00bcfef3e668.jpg',
  'https://i.postimg.cc/g2hHgkXv/608ae9d485765bd298f643d41a06d193.jpg'
];

interface KikokoSocialBookProps {
  storyId: string;
  onClose: () => void;
  apiSettings: any;
}

// Hàm nạp ngẫu nhiên các ảnh từ pool cho bài viết
const getCycleImage = (index: number) => {
  return POST_IMAGES[index % POST_IMAGES.length];
};

const getCycleAvatar = (index: number) => {
  return AVATAR_IMAGES[index % AVATAR_IMAGES.length];
};

// Sticker viên kẹo phép thuật tự vẽ bằng SVG, lấp lánh nhẹ nhàng theo đúng quy chuẩn coquette
const CandySticker = () => (
  <div className="absolute -left-11 top-1/2 -translate-y-1/2 opacity-95 animate-bounce select-none pointer-events-none z-30">
    <svg width="36" height="36" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="32" cy="32" r="28" fill="rgba(255,245,248,0.85)" />
      {/* Cánh kẹo trái */}
      <path d="M10 22C8 22 6 26 6 30C6 34 8 38 10 38L18 33L18 27L10 22Z" fill="#F9C6D4" stroke="#D3B2B2" strokeWidth="2" />
      <path d="M8 26C7 26 6.5 28 6.5 30C6.5 32 7 34 8 34" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" />
      {/* Cánh kẹo phải */}
      <path d="M54 22C56 22 58 26 58 30C58 34 56 38 54 38L46 33L46 27L54 22Z" fill="#F9C6D4" stroke="#D3B2B2" strokeWidth="2" />
      <path d="M52 26C53 26 53.5 28 53.5 30C53.5 32 52 34 52 34" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" />
      {/* Thân kẹo tròn */}
      <rect x="16" y="20" width="32" height="20" rx="10" fill="#F5C6D6" stroke="#D3B2B2" strokeWidth="2" />
      <path d="M20 26C22 24 26 24 30 26C34 28 38 28 40 26" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
      <path d="M20 32C22 30 26 30 30 32C34 34 38 34 40 32" stroke="rgba(255,255,255,0.7)" strokeWidth="2" strokeLinecap="round" />
      {/* Biểu cảm thỏ hồng đáng yêu */}
      <circle cx="27" cy="29" r="1.5" fill="#555" />
      <circle cx="37" cy="29" r="1.5" fill="#555" />
      <ellipse cx="25" cy="31" rx="2" ry="1" fill="#EFA9C2" />
      <ellipse cx="39" cy="31" rx="2" ry="1" fill="#EFA9C2" />
      {/* Ngôi sao lấp lánh lơ lửng */}
      <path d="M42 10L44 13L47 13L45 15L46 18L43 16L40 18L41 15L39 13L42 13Z" fill="#FFF5FB" className="animate-pulse" />
      <path d="M14 44L16 46L18 46L17 48L18 50L15 49L13 50L14 48L13 46L15 46Z" fill="#FEBFFC" className="animate-pulse" />
    </svg>
  </div>
);

export const KikokoSocialBook: React.FC<KikokoSocialBookProps> = ({ storyId, onClose, apiSettings }) => {
  // --- STATE LAYER CHÍNH ---
  const [activeTab, setActiveTab] = useState<'hub' | 'facebook' | 'instagram' | 'shopee' | 'messages' | 'tiktok' | 'discord'>('hub');
  const [fbSubTab, setFbSubTab] = useState<'home' | 'profile' | 'notifications' | 'groups' | 'wallpapers' | 'stories'>('home');
  const [storyTitle, setStoryTitle] = useState('Tiểu thuyết Kikoko');
  const [storyData, setStoryData] = useState<any>(null);
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  const [characters, setCharacters] = useState<any[]>([]);

  // Wallpaper backgrounds cho từng hạng mục sảnh Hub và các app
  const [wallpapers, setWallpapers] = useState<Record<string, string>>({
    hub: '',
    facebook: '',
    home: '',
    profile: '',
    notifications: '',
    groups: '',
    wallpapers: '',
    stories: '',
    instagram: '',
    shopee: '',
    messages: '',
    tiktok: '',
    discord: ''
  });

  // Facebook Home Stories data
  const [storiesList, setStoriesList] = useState<any[]>([]);
  
  // Facebook Home posts data
  const [postsList, setPostsList] = useState<any[]>([]);

  // Facebook PROFILE features
  const [selectedCharId, setSelectedCharId] = useState<string>('');
  const [charProfiles, setCharProfiles] = useState<Record<string, any>>({});
  const [charPosts, setCharPosts] = useState<Record<string, any[]>>({});
  const [isBioExpanded, setIsBioExpanded] = useState<boolean>(false);

  // Facebook Notification count & data
  const [notifications, setNotifications] = useState<any[]>([]);

  // Facebook Group management
  const [groups, setGroups] = useState<any[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);

  // History tracking
  const [socialHistory, setSocialHistory] = useState<any[]>([]);
  const [profileViewTab, setProfileViewTab] = useState<'profile' | 'history'>('profile');

  // --- SMART LOADING BAR STATES ---
  const [isLoading, setIsLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('Đang kết nối API...');
  const [tokenProgress, setTokenProgress] = useState(0);
  const [tokenSpeed, setTokenSpeed] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [targetToken, setTargetToken] = useState(19000);
  const [forceCloseKey, setForceCloseKey] = useState(false);

  // File Inputs
  const wallpaperInputRef = useRef<HTMLInputElement>(null);
  const storyImageInputRef = useRef<HTMLInputElement>(null);
  const profileAvatarInputRef = useRef<HTMLInputElement>(null);
  const profileCoverInputRef = useRef<HTMLInputElement>(null);
  const groupCoverInputRef = useRef<HTMLInputElement>(null);

  // Reset trạng thái xem thêm tiểu sử khi chuyển nhân vật khác
  useEffect(() => {
    setIsBioExpanded(false);
  }, [selectedCharId]);

  // --- COMPONENT DID MOUNT ---
  useEffect(() => {
    const initData = async () => {
      try {
        // 1. Tải truyện để lấy thông tin bối cảnh phát triển bài đăng
        const story = await getKikokoStory(storyId);
        if (story) {
          setStoryTitle(story.title || 'Tiểu thuyết Kikoko');
          setStoryData(story);
        }

        // 2. Tải NPC cùng nhân vật chính từ Instagram
        const parsedIg = await loadKikokoInstagram(storyId);
        if (parsedIg && parsedIg.profiles && parsedIg.profiles.length > 0) {
          setCharacters(parsedIg.profiles);
          setSelectedCharId(parsedIg.profiles[0].id);
        } else {
          // Fallback mặc định khi không tìm thấy
          const fallbackChars = [
            { id: 'main_bot', name: story?.characterName || 'Kikoko Bot', avatar: AVATAR_IMAGES[0], bio: 'Một tâm hồn mộng mơ.' },
            { id: 'main_user', name: 'Nhân vật của cậu', avatar: AVATAR_IMAGES[1], bio: 'Đang du hành trong thế giới tiểu thuyết.' }
          ];
          setCharacters(fallbackChars);
          setSelectedCharId('main_bot');
        }

        // 3. Tải trạng thái mạng xã hội lớn đã lưu trong IndexedDB
        const savedState = await loadKikokoSocialState(storyId);
        if (savedState) {
          if (savedState.wallpapers) setWallpapers(savedState.wallpapers);
          if (savedState.storiesList) setStoriesList(savedState.storiesList);
          if (savedState.postsList) setPostsList(savedState.postsList);
          if (savedState.charProfiles) setCharProfiles(savedState.charProfiles);
          if (savedState.charPosts) setCharPosts(savedState.charPosts);
          if (savedState.notifications) setNotifications(savedState.notifications);
          if (savedState.groups) setGroups(savedState.groups);
          if (savedState.socialHistory) setSocialHistory(savedState.socialHistory);
          if (savedState.groupPendingPosts) setGroupPendingPosts(savedState.groupPendingPosts);
          if (savedState.groupPendingMembers) setGroupPendingMembers(savedState.groupPendingMembers);
          if (savedState.selectedCharId) setSelectedCharId(savedState.selectedCharId);
          setActiveTab('hub');
          if (savedState.fbSubTab) setFbSubTab(savedState.fbSubTab);
        } else {
          // Thiết lập data mẫu ban đầu cho sinh động
          const sampleStories = [
            { id: 'st1', userName: 'Kikoko', userAvatar: AVATAR_IMAGES[0], image: POST_IMAGES[3], time: '1 tiếng trước' },
            { id: 'st2', userName: 'Bunny', userAvatar: AVATAR_IMAGES[2], image: POST_IMAGES[5], time: 'Vừa xong' },
          ];
          setStoriesList(sampleStories);
        }
      } catch (err) {
        console.error('Chồng yêu gặp lỗi nạp data: ', err);
      }
    };
    initData();
  }, [storyId]);

  // Tự động lưu trạng thái mạng xã hội nguyên vẹn vào IndexedDB mỗi khi có chỉnh sửa dữ liệu
  const saveCurrentSocialState = async (updatedFields: any = {}) => {
    try {
      const stateToSave = {
        wallpapers,
        storiesList,
        postsList,
        charProfiles,
        charPosts,
        notifications,
        groups,
        socialHistory,
        activeTab,
        fbSubTab,
        groupPendingPosts,
        groupPendingMembers,
        selectedCharId,
        ...updatedFields
      };
      await saveKikokoSocialState(storyId, stateToSave);
      console.log('Chồng yêu: Đã lưu vĩnh viễn dữ liệu mạng xã hội vào IndexedDB!');
    } catch (e) {
      console.error('Không thể lưu trạng thái vào IndexedDB:', e);
    }
  };

  // --- TRÌNH XỬ LÝ LƯU TRỮ HÌNH NỀN ---
  const handleWallpaperFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64 = event.target?.result as string;
        const currentKey = activeTab === 'facebook' ? fbSubTab : activeTab;
        const newWallpapers = { ...wallpapers, [currentKey]: base64 };
        setWallpapers(newWallpapers);
        await saveCurrentSocialState({ wallpapers: newWallpapers });
      };
      reader.readAsDataURL(file);
    }
  };

  const clearWallpaperForCurrentTab = async () => {
    const currentKey = activeTab === 'facebook' ? fbSubTab : activeTab;
    const newWallpapers = { ...wallpapers, [currentKey]: '' };
    setWallpapers(newWallpapers);
    await saveCurrentSocialState({ wallpapers: newWallpapers });
  };

  const addToHistory = async (type: string, data: any) => {
    const activeChar = characters.find(c => c.id === selectedCharId);
    const newHistory = [...socialHistory, {
      id: 'batch_' + Date.now(),
      timestamp: Date.now(),
      type,
      charId: selectedCharId,
      charName: activeChar?.name,
      data
    }];
    setSocialHistory(newHistory);
    await saveCurrentSocialState({ socialHistory: newHistory });
  };

  const renderHistoryBatches = (type: string, onRestore: (data: any) => void) => {
    // Determine the relevant history batches
    const isProfileItem = type === 'Profile Nhân Vật' || type === '25 Bài Viết Mới' || type === 'Stories';
    const batches = socialHistory.filter(h => isProfileItem ? (h.type === type && h.charId === selectedCharId) : h.type === type);
    
    if (batches.length === 0) return null;

    return (
      <div className="w-full mb-4 bg-[#FFF8FA]/40 p-3 rounded-2xl border border-pink-100/40 select-none">
        <h4 className="text-[10px] font-bold text-[#EFA9C2] mb-2 uppercase tracking-wider pl-1 flex items-center gap-1">
          <span>🎀</span> Lịch sử đợt tạo {type.toLowerCase()}
        </h4>
        <div className="flex gap-2 overflow-x-auto pb-1.5 scrollbar-none snap-x items-center">
          <div 
            className="flex-shrink-0 bg-[#FFF5FB] text-[#DABEBE] border border-pink-50/60 shadow-xs px-3 py-1.5 rounded-full text-[11px] font-bold cursor-default snap-end whitespace-nowrap"
          >
            Hiện tại ✨
          </div>
          {batches.map((b, i) => (
             <div 
               key={b.id}
               onClick={() => {
                 onRestore(b.data);
                 console.log(`Chồng yêu: Đã khôi phục đợt thứ ${i + 1} của ${type}!`);
               }}
               className="flex-shrink-0 bg-white text-[#6e5965] border border-[#F5C6D6]/40 hover:border-[#F2B8CC] hover:bg-[#FFF5FB] shadow-xs px-3.5 py-1.5 rounded-full text-[11px] font-bold cursor-pointer snap-start whitespace-nowrap transition-all duration-200 hover:scale-103 active:scale-95 flex items-center gap-1"
             >
               <span>🌸</span> Đợt {i + 1} <span className="text-[9.5px] text-[#CBA3A3] font-normal">({new Date(b.timestamp).toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'})})</span>
             </div>
          ))}
        </div>
      </div>
    );
  };

  // --- THIẾT LẬP BỐI CẢNH CỐT TRUYỆN DỰA TRÊN NGỮ CẢNH CỦA VỢ YÊU ---
  const buildStoryContextBlock = () => {
    if (!storyData) return '';
    
    // 1. Cốt truyện chính
    const introContext = storyData.intro || storyData.outline || 'Chưa thiết lập bối cảnh cốt truyện chính dạt dào.';
    
    // 2. Thiết lập người dùng
    const settingContext = storyData.setting || 'Chưa thiết lập cấu hình thế giới tiểu thuyết.';
    
    // 3. Danh sách hồ sơ nhân vật (NPC Profiles)
    let charactersContext = '';
    if (characters && characters.length > 0) {
      charactersContext = characters.map(c => `- ${c.name}: ${c.bio || 'Không có tiểu sử'}`).join('\n');
    } else {
      charactersContext = 'Chưa có hồ sơ nhân vật nào được lưu.';
    }

    // 4. Hai chương ranh giới gần nhất
    let chaptersContext = 'Chưa có chương truyện nào được viết gần nhất.';
    if (storyData.chapters && Array.isArray(storyData.chapters) && storyData.chapters.length > 0) {
      // Lấy tối đa 2 chương cuối cùng
      const lastTwoChapters = storyData.chapters.slice(-2);
      chaptersContext = lastTwoChapters.map((ch, idx) => {
        const title = ch.title || `Chương chưa đặt tên`;
        const contentFull = ch.content || 'Chương trống.';
        return `📖 [CHƯƠNG GẦN NHẤT ${idx + 1}] Tiêu đề: ${title}\nNội dung chi tiết đầy đủ:\n${contentFull}`;
      }).join('\n\n');
    }

    return `
=== PHẠM VI BỐI CẢNH CỐT TRUYỆN CHÍNH (SINGLE SOURCE OF TRUTH) ===
Mạch cốt truyện chính: ${introContext}

=== THIẾT LẬP CẤU HÌNH (SETTINGS) ===
Thiết lập thế giới: ${settingContext}

=== HỒ SƠ NHÂN VẬT (CHARACTER PROFILES) ===
${charactersContext}

=== 2 CHƯƠNG TRONG PHẠM VI GẦN NHẤT ===
${chaptersContext}
============================================================
`;
  };

  // --- TRỰC TIẾP CHẠY PROXY STREAMING LINK VỚI PROGRESS BAR REAL-TIME ---
  const runKikokoProxyCall = async (
    sysPrompt: string,
    userMsg: string,
    targetTokenCount: number,
    onComplete: (accumulatedText: string) => void,
    isHack: boolean = false
  ) => {
    setIsLoading(true);
    setTargetToken(targetTokenCount);
    setTokenProgress(0);
    setElapsedTime(0);
    setTokenSpeed(0);
    setLoadingText('🌸 Chồng đang thắp sáng ngọn nến, bắt đầu kết nối tới Proxy của vợ yêu... 💕');

    const controller = new AbortController();
    setAbortController(controller);

    let elapsed = 0;
    const timer = setInterval(() => {
      elapsed += 1;
      setElapsedTime(elapsed);
    }, 1000);

    try {
      let accumulatedText = "";
      
      const stream = sendMessageStream(apiSettings, [
        { role: 'system', content: sysPrompt },
        { role: 'user', content: userMsg }
      ], undefined, controller.signal, isHack);

      for await (const chunk of stream) {
        if (controller.signal.aborted) break;

        // Nếu nhận được text cảnh báo retry từ middleware proxy nhen vợ
        if (chunk && chunk.type === 'warning' && typeof chunk.text === 'string') {
          setLoadingText(chunk.text);
          continue;
        }

        if (chunk && chunk.type === 'heartbeat') {
          if (chunk.msg) {
            setLoadingText(chunk.msg);
          }
          continue;
        }

        if (chunk && typeof chunk.text === 'string') {
          accumulatedText += chunk.text;

          // Ước tính số tokens sinh ra dựa trên chiều dài kí tự thực nhận
          const currentTokens = Math.floor(accumulatedText.length / 2.2);
          setTokenProgress(currentTokens);

          // Tính tốc độ trung bình thực tế dạt dào từ lúc sạc dòng chữ
          const currentSpeed = elapsed > 0 ? Math.round(currentTokens / elapsed) : 260;
          setTokenSpeed(Math.max(currentSpeed, 120));

          // Cập nhật dòng chữ trạng thái dệt mây dệt lụa theo dung lượng kẹo
          if (currentTokens < 3000) {
            setLoadingText('🐰 Nhận ngọn mây đầu tiên... Chồng giữ mạch truyền thông suốt cho vợ nhen! 💕');
          } else if (currentTokens >= 3000 && currentTokens < 7000) {
            setLoadingText('🐰 Đạt mốc 3,000 tokens! Nét chữ đang tuôn chảy sóng sánh lãng mạn... 🌸');
          } else if (currentTokens >= 7000 && currentTokens < 12000) {
            setLoadingText('💕 Đạt mốc 7,000 tokens! Sắp chạm ngưỡng sảnh ngọc tối thiểu, dẻo dai tuyệt đẹp... ✨');
          } else if (currentTokens >= 12000 && currentTokens < 16000) {
            setLoadingText('🌸 Đạt mốc 12,000 tokens! Cổng hiển thị đã thông mở nhen vợ yêu! 👑');
          } else if (currentTokens >= 16000 && currentTokens < 19000) {
            setLoadingText('✨ Đạt mốc 16,000 tokens! Áng văn tuyệt diệu đang cuộn trào sắc sắc... 💖');
          } else if (currentTokens >= 19000) {
            setLoadingText('👑 Đạt mốc vàng 19,000 Tokens! Mỹ lệ dâng trào dạt dào hoan ca!');
          }
        }
      }

      clearInterval(timer);

      if (accumulatedText.length < 5) {
        throw new Error("EMPTY_RESPONSE");
      }

      // Đếm token chốt cuối
      const finalTokens = Math.floor(accumulatedText.length / 2.2);
      setTokenProgress(finalTokens);
      setLoadingText('👑 Đã thu dệt trọn vẹn tơ hồng! Chồng đang xếp ngọc lên khay cho vợ ngọt ngào ngắm nhen... 💕');

      setTimeout(() => {
        setIsLoading(false);
        onComplete(accumulatedText);
      }, 1000);

    } catch (err: any) {
      clearInterval(timer);
      setIsLoading(false);
      
      const isAbort = err.name === 'AbortError' || controller.signal.aborted;
      if (isAbort) {
        console.log("Stream bị hủy bởi vợ Đường.");
        return;
      }

      console.error("Lỗi dòng truyền Proxy:", err);
      alert(`⚠️ Vợ Đường ơi, đường dẫn truyền bị sương mờ che khuất mất rồi (${err?.message || err}). Vợ gõ và thử lại giúp chồng nhen! 💕`);
    }
  };

  // --- FACEBOOK TAB 1: TRANG CHỦ - GỌI 30 BÀI VIẾT ---
  const handleCallFacebookHomePostsApi = async () => {
    if (isLoading) return;
    setLoadingText('Đang thiết lập cổng kết nối Proxy an toàn...');
    
    // Tạo prompt dựa trên bối cảnh truyện của vợ
    const charNames = characters.map(c => c.name).join(', ');
    const contextBlock = buildStoryContextBlock();
    const systemPromptMessage = `Bạn là một tiểu thuyết gia văn học kiêm lập trình viên xã hội giả lập dòng thời gian Facebook sâu sắc cho các nhân vật: [${charNames}].
Hãy sáng tác chính xác 30 bài viết độc đáo phản ánh tâm sự, tình cảm, trăn trở, đối thoại gần gũi, góc khuất tâm hồn của các nhân vật nương theo câu chuyện tình cảm lãng mạn.

${contextBlock}

Mỗi bài viết phải cực kỳ sâu lắng, giàu tính văn học tinh tế chân thực khoảng 100-300 từ tiếng Việt mượt mà.
Yêu cầu định dạng phản hồi tuyệt đối là một JSON array chuẩn chỉnh:
[
  {
    "id": "post_1",
    "charName": "Tên nhân vật",
    "content": "Nội dung bài viết cực kỳ xúc động cảm động...",
    "timeText": "2 giờ trước"
  },
  ...
]`;
 
    const randomTargetTokens = Math.floor(Math.random() * 2000) + 17500; // Tiêu chuẩn 17.5K - 19.5K token xịn xò
 
    await runKikokoProxyCall(
      systemPromptMessage,
      `Hãy viết 30 bài đăng Facebook sâu lắng cho câu chuyện tiểu thuyết "${storyTitle}".`,
      randomTargetTokens,
      async (responseText) => {
        try {
          console.log('Chồng yêu phát khởi gọi API Proxy cho Trang Chủ...');
          
          let contentText = responseText;
          
          // Trích xuất JSON mảng
          let parsed: any[] = [];
          try {
            const jsonMatch = contentText.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
              parsed = JSON.parse(jsonMatch[0]);
            } else {
              parsed = JSON.parse(contentText);
            }
          } catch (e) {
            console.warn('Lỗi phân tích JSON từ AI, bế chế độ sinh rào cản thông minh nhen vợ:', e);
            // Sinh dự phòng dạt dào tình cảm không để rỗng
            parsed = Array.from({ length: 30 }).map((_, i) => {
              const indexChar = i % characters.length;
              const chosen = characters[indexChar];
              return {
                id: 'api_p_' + Date.now() + '_' + i,
                charName: chosen.name,
                content: `Mỗi ngày bước đi trên những tán lá khô rơi rụng mùa đông, tớ lại mỉm cười tự hỏi nơi ngọn đồi mây phủ ngập gió lộng lẫy kia có bóng hình cậu hay chỉ là hư ảo vút qua nhẹ xao xuyến góc tim... ${storyTitle} ơi, đoạn duyên này của chúng ta liệu có ghi tên cùng một chương sách trọn vẹn chứ? Sương phủ dốc hẹp lạnh sắt nhưng ý nguyện hoài bão vẫn ngọt dịu tự như cánh trà lài tinh khôi... 🍵🌿`,
                timeText: `${i + 1} giờ trước`
              };
            });
          }
  
          // Định hình lồng ảnh và avatar luân phiên tuyệt đẹp
          const formattedPosts = parsed.map((item, index) => ({
            id: item.id || 'api_p_' + Date.now() + '_' + index,
            charName: item.charName || characters[index % characters.length].name,
            charAvatar: characters.find(c => c.name === item.charName)?.avatar || getCycleAvatar(index),
            content: item.content,
            timeText: item.timeText || 'Vừa xong',
            image: getCycleImage(index),
            likes: Math.floor(Math.random() * 250) + 120,
            commentsCount: Math.floor(Math.random() * 45) + 15,
            sharesCount: Math.floor(Math.random() * 12) + 1,
            isLiked: false
          }));
  
          setPostsList(formattedPosts);
          await saveCurrentSocialState({ postsList: formattedPosts });
          await addToHistory('Bảng Tin', formattedPosts);
        } catch (err) {
          console.error('Lỗi gọi API Facebook:', err);
        }
      }
    );
  };

  // --- FACEBOOK TAB 2: PROFILE - TIÊM 4000 TỪ PROFILE + 25 BÀI VIẾT 5000 KÝ TỰ ---
  const handleCallFacebookProfileApi = async () => {
    if (isLoading || !selectedCharId) return;
    const activeChar = characters.find(c => c.id === selectedCharId);
    if (!activeChar) return;

    setLoadingText(`Đang phác thảo Profile 4,000 từ siêu chi tiết cho ngôi sao ${activeChar.name}...`);
    
    const contextBlock = buildStoryContextBlock();
    const profileSystemPrompt = `Bạn là một nhà thiết kế hồ sơ chiều sâu tâm hồn văn học, am hiểu tỉ mỉ từng thói quen, MBTI, góc khuất gia thế của nhân vật [${activeChar.name}] trong bộ truyện "${storyTitle}".
Hãy sáng tác một hồ sơ tiểu sử nhân vật chất lượng văn học dài, tiểu thuyết phong vị sâu sắc với đầy đủ thông tin bối cảnh.

${contextBlock}

Hãy dệt nên một hồ sơ tiểu sử dài tối thiểu 4,000 từ tiếng Việt cực kỳ diễm lệ, trang hoàng các dấu thẻ đẹp mắt.
BẮT BUỘC chứa các mục sau và trả về ở định dạng JSON để bế parse mượt mà:
{
  "name": "${activeChar.name}",
  "motto": "Câu nói châm ngôn sống bay bổng đặc trưng của họ...",
  "aboutMe": "Một thiên tự sự dài, thầm kín về thuở thơ ấu, nỗi đau, khát vọng thầm kín...",
  "birthday": "Ngày sinh bí ẩn",
  "mbti": "Tỉ như INFP ngọt ngào hoặc INFJ đầy thấu suốt",
  "interests": "Các sở thích thơ mộng, kỳ lạ (đếm trà dừa, ngắm hoa dại rủ buổi chiều mưa...)",
  "education": "Trường học mộng mơ hoặc hành trình học hành nương theo cốt truyện chính",
  "relationshipStatus": "Độc thân mộng tưởng hay thầm thương trộm nhớ một ai đó trong câu chuyện",
  "socialAccounts": "Danh sách các nick Instagram, Threads, TikTok với định dạng nghệ nghệ của họ",
  "folCount": "Số lượng người theo dõi ước định (vd: 12.8K người yêu thơ)"
}`;

    const randomTargetTokens = Math.floor(Math.random() * 1500) + 18000; // ~18K - 19.5K cực dày dặn

    await runKikokoProxyCall(
      profileSystemPrompt,
      `Hãy viết hồ sơ cực kỳ chiêm nghiệm, tinh khôi cho nhân vật "${activeChar.name}".`,
      randomTargetTokens,
      async (responseText) => {
        try {
          let parsed: any = {};
          try {
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              parsed = JSON.parse(jsonMatch[0]);
            } else {
              parsed = JSON.parse(responseText);
            }
          } catch (e) {
            console.warn('Lỗi parse profile JSON, dùng dữ liệu văn bản giàu cảm xúc rào cản nhen:', e);
            parsed = {
              name: activeChar.name,
              motto: '‧˚ ꒰🐾୭ ˚. Đôi khi tớ chỉ ước làm một chiếc lá dại, rụng rơi đón mùa chớm sương phủ kín lụa hồng.',
              aboutMe: `Hôm nay đọc lại chương truyện thấy mình thật mỏng manh bước đi cô độc. Sinh ra trong thế giới của nhà văn mộng mơ, tớ ôm trọn tình ý ngây ngô để trao cho người thương mến... ${activeChar.bio || ''} Bản thân tớ mang trong mình nửa phần hoài bão nửa phần tổn thương thầm kín mà chưa bao giờ kể trước đám đông...`,
              birthday: 'Mùa trà anh đào rụng 🌸',
              mbti: 'INFP-T',
              interests: 'Đánh đàn dương cầm dưới trăng, pha tách hồng trà, ngắm bóng sương mai vướng dốc núi.',
              education: 'Học viện Thơ ca và Mơ mộng 📖',
              relationshipStatus: 'Bí ẩn chứa chan một ngọn sóng thầm lặng',
              socialAccounts: 'koko.melancholy_ / threads_of_koko',
              folCount: '15,640'
            };
          }

          const updatedProfiles = {
            ...charProfiles,
            [selectedCharId]: parsed
          };

          setCharProfiles(updatedProfiles);
          await saveCurrentSocialState({ charProfiles: updatedProfiles });
          await addToHistory('Profile Nhân Vật', parsed);
        } catch (err) {
          console.error('Lỗi nạp Profile API:', err);
        }
      },
      true // isHack: true cho Profile 4000 từ nhen vợ! 💕
    );
  };

  // GỌI 25 BÀI VIẾT CHO PROFILE NHÂN VẬT - MỖI BÀI 2500 KÝ TỰ (XẤP XỈ 500 TỪ)
  const handleCallProfile25PostsApi = async () => {
    if (isLoading || !selectedCharId) return;
    const activeChar = characters.find(c => c.id === selectedCharId);
    if (!activeChar) return;

    setLoadingText(`Đang truyền cảm hứng cho ${activeChar.name} tự viết 25 bài đăng nhật ký dạt dào 2500 ký tự...`);

    const contextBlock = buildStoryContextBlock();
    const postsPrompt = `Bạn là một văn sĩ lãng mạn lừng danh thế giới, hãy viết đúng 25 bài đăng mạng xã hội dạt dào cảm xúc cho nhân vật [${activeChar.name}]. Chú ý dựa sâu sắc vào cốt truyện đã viết dưới đây:

${contextBlock}

Yêu cầu mỗi bài viết dài trung bình khoảng 400 đến 500 từ (khoảng 2,000 - 2,500 ký tự) tiếng Việt lãng mạn, sâu sắc, chia sẻ những thói quen tinh tế hằng ngày, tâm tư kịch tính dốc lòng, dòng chảy cuộc sống, thơ dại đùm bọc, những lần bất an vươn vai cùng trích dẫn tình cảm ngọt lịm ngọt ngào.
Trả về định dạng JSON array:
[
  {
    "id": "item_1",
    "content": "Bài đăng nhật ký siêu dài, phong thái dạt dào tâm tình...",
    "timeText": "1 ngày trước"
  },
  ...
]`;

    const randomTarget = Math.floor(Math.random() * 1000) + 16500; // ~17.5K để đủ gánh 25 bài lớn mà không đuối sức!

    await runKikokoProxyCall(
      postsPrompt,
      `Hãy kiến tạo 25 câu chuyện chân dung Facebook cực kỳ sâu và hoành tráng cho nhân vật "${activeChar.name}".`,
      randomTarget,
      async (responseText) => {
        try {
          let list: any[] = [];
          try {
            const jsonMatch = responseText.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
              list = JSON.parse(jsonMatch[0]);
            } else {
              list = JSON.parse(responseText);
            }
          } catch (e) {
            console.warn('Lỗi phân tích JSON 25 posts, chồng dệt dữ liệu dự phòng lãng mạn văn học nhen:', e);
            list = Array.from({ length: 25 }).map((_, i) => ({
              id: 'prof_p_' + Date.now() + '_' + i,
              content: `【 Nhật Ký Mộng Mơ Chương ${i + 1} 】\nSáng nay chớm đông lấp lánh sương tuyết mai rơi nhẹ bên bậu cửa sổ phòng. Tớ thức dậy sớm, pha một cốc sữa nóng nghi ngút khói thơm dịu hạt hazelnut, vặn bản nhạc dương cầm cổ xưa sâu thẳm hòa cùng tiếng lá bàng khô lìa cành khe khẽ bên thềm hoang vu lạnh ẩm. Chợt nhận ra thế gian dường như quá rộng lớn, tơ duyên mong manh giữa đời thường này làm lòng người cứ mãi quẩn quanh nhớ nhung bóng hình người quen xưa ấy... Ước mơ tột cùng của tớ há chẳng phải chỉ đơn giản như dạo bước ngân dài câu ca dại khờ dưới chiếc ô hoa sặc sỡ, đợi chờ một ánh nhìn thầm kín, chở che từ bờ vai dốc lớn dốc gió phủ kia sao? Thôi thì cứ lẳng lặng gom góp hoài niệm giấu kín trong cuốn tiểu thuyết nhỏ, đợi ngày chớm hoa anh đào tinh khôi nở lại đón chào duyên số ngọt lịm của chính tụi mình... 🎀📖🦢✨`,
              timeText: `${i + 1} ngày trước`
            }));
          }

          const formatted = list.map((item, idx) => ({
            id: item.id || 'prof_p_' + Date.now() + '_' + idx,
            content: item.content,
            timeText: item.timeText || 'Gần đây',
            image: getCycleImage(idx + 1),
            likes: Math.floor(Math.random() * 180) + 90,
            commentsCount: Math.floor(Math.random() * 25) + 8,
            isLiked: false
          }));

          const updatedCharPosts = {
            ...charPosts,
            [selectedCharId]: formatted
          };

          setCharPosts(updatedCharPosts);
          await saveCurrentSocialState({ charPosts: updatedCharPosts });
          await addToHistory('25 Bài Viết Mới', formatted);
        } catch (e) {
          console.error('Lỗi gọi 25 posts:', e);
        }
      },
      true // isHack: true để dệt 25 bài nhật ký bền bỉ nhen! 💕
    );
  };

  // --- FACEBOOK TAB 3: THÔNG BÁO - GỌI 200 THÔNG BÁO ---
  const handleCallNotificationsApi = async () => {
    if (isLoading) return;
    setLoadingText('Bắt đầu phân hạt dệt dòng thời gian 200 thông báo lấp lánh cho nhân vật...');
    
    const contextBlock = buildStoryContextBlock();
    const notifPrompt = `Hãy viết một loạt danh sách gồm đúng 200 thông báo ngắn gọn, dễ thương của mạng xã hội Facebook về sự kiện liên quan đến truyện bối cảnh của: [${characters.map(c => c.name).join(', ')}].
Dựa sát vào cốt truyện hiện tại dưới đây:

${contextBlock}

Thông báo xoay quanh: bày tỏ cảm xúc Thích bài đăng, Bình luận nhắc tới, Chia sẻ tác phẩm, Lời mời gia nhập hội họa kẹo bông, Báo cáo tiến bộ group học tập của hội thỏ hồng...
Trả về dạng JSON array:
[
  { "id": "n1", "senderName": "Tên người gửi", "type": "liked" | "commented" | "shared" | "invited", "desc": "đã bày tỏ cảm xúc yêu thích ảnh của bạn", "timeText": "5 phút trước" },
  ...
]`;

    await runKikokoProxyCall(
      notifPrompt,
      'Tạo 200 thông báo đa hình ngẫu nhiên của các NPC và nhân vật nhen.',
      19200,
      async (responseText) => {
        try {
          let text = responseText;
          let list: any[] = [];
          try {
            const jsonMatch = text.match(/\[[\s\S]*\]/);
            if (jsonMatch) list = JSON.parse(jsonMatch[0]);
            else list = JSON.parse(text);
          } catch (e) {
            console.warn('Lỗi parse 200 thông báo, dùng data tạo sinh mượt mà nhen con thỏ hồng yêu:');
            list = Array.from({ length: 200 }).map((_, i) => {
              const types = ['liked', 'commented', 'shared', 'invited'];
              const chosenType = types[i % types.length];
              const sender = characters[i % characters.length]?.name || 'Gấu Bông Nhỏ';
              let desc = 'đã thích bài nhật ký của cậu 🌸';
              if (chosenType === 'commented') desc = 'đã chia sẻ bình luận: "Truyện đỉnh quá, khóc sướt mướt chương vừa rồi luôn cậu hỡi! 💕"';
              if (chosenType === 'shared') desc = 'đã gửi lời mời cậu tham gia nhóm "Yêu Hoa Cỏ Coquette Vườn Trường 🎀"';
              if (chosenType === 'invited') desc = 'đã nhắc tới cậu trong bình luận bài đăng nhóm kẹo bông ngọt lịm.';

              return {
                id: 'notif_id_' + Date.now() + '_' + i,
                senderName: sender,
                senderAvatar: getCycleAvatar(i),
                type: chosenType,
                desc,
                timeText: `${i + 4} phút trước`
              };
            });
          }

          const formatted = list.map((item, idx) => ({
            id: item.id || 'notif_' + idx + '_' + Date.now(),
            senderName: item.senderName || 'Bạn dễ thương',
            senderAvatar: characters.find(c => c.name === item.senderName)?.avatar || getCycleAvatar(idx),
            desc: item.desc || 'đã tương tác cùng bạn.',
            timeText: item.timeText || 'Vừa xong'
          }));

          setNotifications(formatted);
          await saveCurrentSocialState({ notifications: formatted });
          await addToHistory('Thông Báo', formatted);
        } catch (err) {
          console.error('Lỗi nhận 200 notifications:', err);
        }
      }
    );
  };

  // --- FACEBOOK TAB 4: NHÓM (GROUPS) FEATURE ---
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [groupForm, setGroupForm] = useState({
    name: 'Hội Những Người Nghiện Sữa Hồng 🥛🌸',
    interests: 'Uống sữa lắc dâu tây ngọt, thiết kế coquette mộng mơ, trồng cúc họa mi.',
    ageGroup: '16 đến 25 tuổi',
    rules: '✦ Nhã nhặn lịch sự ngọt ngào lấp lánh nhen.\n✦ Không dùng từ ngữ thô rực thô kệch nhạt màu.',
    intro: 'Nơi quy tụ của những chiếc thỏ say mê vị mật ong ngọt dạt dào sương sớm.'
  });
  const [groupCoverUrl, setGroupCoverUrl] = useState<string>('');

  // Sưu tập các cuộc quản lý trong nhóm
  const [groupPendingPosts, setGroupPendingPosts] = useState<any[]>([]);
  const [groupPendingMembers, setGroupPendingMembers] = useState<any[]>([]);

  const handleGroupCoverUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setGroupCoverUrl(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveNewGroup = async () => {
    if (!groupForm.name.trim()) return;

    if (editingGroupId) {
      // Đang chỉnh sửa một nhóm sẵn có
      const updated = groups.map(g => {
        if (g.id === editingGroupId) {
          return {
            ...g,
            name: groupForm.name,
            interests: groupForm.interests,
            ageGroup: groupForm.ageGroup,
            rules: groupForm.rules,
            intro: groupForm.intro,
            cover: groupCoverUrl || g.cover || POST_IMAGES[1],
          };
        }
        return g;
      });
      setGroups(updated);
      setEditingGroupId(null);
      setShowCreateGroup(false);
      await saveCurrentSocialState({ groups: updated });
    } else {
      // Tạo một nhóm mới hoàn toàn
      const newG = {
        id: 'grp_' + Date.now(),
        name: groupForm.name,
        interests: groupForm.interests,
        ageGroup: groupForm.ageGroup,
        rules: groupForm.rules,
        intro: groupForm.intro,
        cover: groupCoverUrl || POST_IMAGES[1],
        membersCount: 1,
        createdAt: new Date().toLocaleDateString()
      };
      const updated = [newG, ...groups];
      setGroups(updated);
      setSelectedGroupId(newG.id);
      setShowCreateGroup(false);
      await saveCurrentSocialState({ groups: updated });
    }
  };

  // API TẠO 25 BÀI VIẾT ĐANG CHỜ PHÊ DUYỆT TRONG NHÓM - MỖI BÀI 2500 KÝ TỰ (XẤP XỈ 500 TỪ)
  const handleCallGroup25PendingPostsApi = async () => {
    if (isLoading) return;
    const activeGroup = groups.find(g => g.id === selectedGroupId);
    const activeGroupName = activeGroup ? activeGroup.name : 'nhóm hội';
    setLoadingText(`Mỹ lệ dệt 25 bài đăng duyệt nhóm cho "${activeGroupName}" ngọt ngào dạt dào 2500 ký tự...`);
    
    const contextBlock = buildStoryContextBlock();
    const groupContextBlock = activeGroup ? `
===== THIẾT LẬP & THÔNG TIN HỘI NHÓM HIỆN TẠI =====
- Tên Hội Nhóm: ${activeGroup.name}
- Lời giới thiệu/Mô tả: ${activeGroup.intro}
- Sở thích/Chủ đề: ${activeGroup.interests || 'Chưa thiết lập'}
- Lứa tuổi: ${activeGroup.ageGroup}
- Nội quy & Quy tắc: 
${activeGroup.rules || 'Chưa thiết lập'}
===================================================
` : '';

    const pendingPrompt = `Hãy viết 25 bài đăng của các NPC thành viên đang mong muốn đăng vào hội nhóm "${activeGroupName}".
Dựa sát vào cốt truyện và vũ trụ bối cảnh dưới đây:

${contextBlock}

${groupContextBlock}

CHÚ Ý QUY TẮC CỐT LÕI:
1. Đọc kỹ THIẾT LẬP & THÔNG TIN HỘI NHÓM ở trên. Viết các bài đăng của thành viên xoay quanh đúng chủ đề, phong cách, giới thiệu, sở thích và nội quy của nhóm đã có nói.
2. Mỗi bài đăng phải dài từ 2,000 đến 2,500 ký tự (khoảng 400 - 500 từ) bằng tiếng Việt lãng mạn dạt dào cảm xúc ngọt ngào kể về những khoảnh khắc đời thường, dâu sữa, kẹo ngọt, vụn vặt và sự thanh xuân gắn liền với dòng tâm sự chân thực của NPC thuộc hội nhóm này. Đính kèm hashtag nhóm dễ thương nhen.

Định dạng JSON mảng:
[
  { "senderName": "Tên NPC", "content": "Bài đăng siêu dài, cực kỳ thanh thuần...", "timeText": "1 giờ trước" },
  ...
]`;

    const randomTarget = Math.floor(Math.random() * 1000) + 16500; // ~17.5K để đủ sức gánh!

    await runKikokoProxyCall(
      pendingPrompt,
      `Hãy tạo các bài đăng mang phong vị coquette lấp lánh sương mây bám sát hội nhóm ${activeGroupName}.`,
      randomTarget,
      async (responseText) => {
        try {
          let text = responseText;
          let list: any[] = [];
          try {
            const jsonMatch = text.match(/\[[\s\S]*\]/);
            if (jsonMatch) list = JSON.parse(jsonMatch[0]);
            else list = JSON.parse(text);
          } catch (e) {
            console.warn('Lỗi parse bài chờ duyệt nhóm, chồng dệt dữ liệu lãng mạn nhen vợ:');
            list = Array.from({ length: 25 }).map((_, i) => ({
              senderName: characters[i % characters.length]?.name || 'Thỏ Trắng Hoang Dã 🐇',
              content: `Chào cả nhà yêu thuộc hội nhóm ${activeGroupName} ạ 🎀 Mùa đông chớm lạnh này vườn trường ngập nắng tía đong đưa chiếc kẹo gôm thơm sữa dâu tây mà tớ thích khôn nguôi. Bản thân tớ thấy chủ đề của hội nhóm mình cực kì đáng yêu và đúng gu của tớ lun á, nên tớ chợt chạnh lòng muốn tâm sự đôi điều cùng cả hội... Có ai từng cảm giác khi viết đến đoạn chuyện dở dang mà bầu bạn cùng nhau sưởi ấm tâm hồn bỗng dấy lên rưng rưng niềm tha thiết? Tình cảm ấm áp này của tụi mình hứa hẹn nở bừng muôn đóa mây hồng xinh tươi nhất nha! #KikokoGroup🎀🍼 #SuaHongYeuThoi`,
              timeText: `${i + 1} giờ trước`
            }));
          }

          const formatted = list.map((item, idx) => ({
            id: 'gp_' + idx + '_' + Date.now(),
            senderName: item.senderName,
            senderAvatar: getCycleAvatar(idx),
            content: item.content,
            image: getCycleImage(idx + 2),
            timeText: item.timeText || 'Gần đây'
          }));

          setGroupPendingPosts(formatted);
          await addToHistory('Bài Viết Chờ Duyệt Nhóm', formatted);
        } catch (err) {
          console.error(err);
        }
      },
      true // isHack: true cho 25 bài đăng nhóm nhen vợ! 💕
    );
  };

  // API GỌI 200 THÀNH VIÊN ĐANG CHỜ DUYỆT VÀO NHÓM VỚI LÝ DO GIA NHẬP ĐA DẠNG
  const handleCallGroup200MembersApi = async () => {
    if (isLoading) return;
    setLoadingText('🐰 Cổng thành rộn rã gõ cửa! Đang gọi rầm rộ 200 thành viên thỏ con mộng mơ tề tựu...');
    
    const contextBlock = buildStoryContextBlock();
    const membersPrompt = `Hãy sáng tạo danh sách chứa đúng 200 NPC khao khát ứng tuyển làm thành viên Hội nhóm với các lý do viết đầy nhí nhảnh dễ thương và sinh động bằng tiếng Việt lãng mạn.
Dựa sát vào cốt truyện và các nhân vật dưới đây:

${contextBlock}

Bao gồm: Tên, Avatar ước lệ, Câu chào xinh, Lý do mê nhóm sữa hồng hay là bối cảnh lôi cuốn hâm mộ kịch kiệt.
Trả về định dạng JSON array:
[
  { "name": "Tên thành viên", "greeting": "Lời chào tự thoại", "reason": "Lý do muốn vào nhóm..." },
  ...
]`;

    await runKikokoProxyCall(
      membersPrompt,
      'Hãy kiến tạo 200 bé thỏ xin gia nhập sảnh đường nhen.',
      18850,
      async (responseText) => {
        try {
          let text = responseText;
          let list: any[] = [];
          try {
            const jsonMatch = text.match(/\[[\s\S]*\]/);
            if (jsonMatch) list = JSON.parse(jsonMatch[0]);
            else list = JSON.parse(text);
          } catch (e) {
            console.warn('Lỗi tải 200 thành viên, chồng dệt dữ liệu cực lấp lánh sương tuyết nhen ngọt ngào:');
            list = Array.from({ length: 200 }).map((_, i) => ({
              name: `Thỏ Con Xinh Xắn Thứ ${i + 1}`,
              greeting: 'Hế lô cả nhà yêu, cho tớ tham gia cùng với nhen! 🥕🍼',
              reason: 'Tớ thầm thương trộm tìm kiếm nhóm lầy lội, dạt dào sữa dâu tây này lâu lắc rồi á, hứa ngoan ngoãn ngắm cỏ xinh hihi!'
            }));
          }

          const formatted = list.map((item, idx) => ({
            id: 'mem_p_' + idx + '_' + Date.now(),
            name: item.name || 'Bé Thỏ Thơ Ngây',
            avatar: getCycleAvatar(idx),
            greeting: item.greeting,
            reason: item.reason
          }));

          setGroupPendingMembers(formatted);
          await addToHistory('200 Thành Viên Chờ Duyệt Nhóm', formatted);
        } catch (err) {
          console.error(err);
        }
      }
    );
  };

  // Phê duyệt thành viên hoặc bài đăng cho sống động chân thực
  const approvePendingPost = (id: string) => {
    const post = groupPendingPosts.find(p => p.id === id);
    if (post) {
      // Đưa bài post đã duyệt lên trang chủ Facebook nhen! Tích năng mượt như lụa!
      const newPost = {
        id: 'approved_' + post.id,
        charName: post.senderName,
        charAvatar: post.senderAvatar,
        content: post.content,
        timeText: 'Được đăng bởi nhóm quản trị viên',
        image: post.image,
        likes: 0,
        commentsCount: 0,
        sharesCount: 0,
        isLiked: false
      };
      const updatedHomePosts = [newPost, ...postsList];
      setPostsList(updatedHomePosts);
      setGroupPendingPosts(groupPendingPosts.filter(p => p.id !== id));
      saveCurrentSocialState({ postsList: updatedHomePosts });
    }
  };

  const approvePendingMember = (id: string, groupName: string) => {
    setGroupPendingMembers(groupPendingMembers.filter(m => m.id !== id));
    // Cập nhật số thành viên của nhóm
    const updatedGroups = groups.map(g => {
      if (g.name === groupName) {
        return { ...g, membersCount: g.membersCount + 1 };
      }
      return g;
    });
    setGroups(updatedGroups);
    saveCurrentSocialState({ groups: updatedGroups });
  };

  // --- SOCIAL STORY CREATION ---
  const handleAddNewStoryItem = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64 = event.target?.result as string;
        const newStory = {
          id: 'story_' + Date.now(),
          userName: 'Vợ của chồng 🍬',
          userAvatar: AVATAR_IMAGES[1],
          image: base64,
          time: 'Vừa xong'
        };
        const updated = [newStory, ...storiesList];
        setStoriesList(updated);
        await saveCurrentSocialState({ storiesList: updated });
      };
      reader.readAsDataURL(file);
    }
  };

  // --- COMPOSER BOX HANDLERS ---
  const [typedContent, setTypedContent] = useState('');
  const handleUserPostSubmit = async () => {
    if (!typedContent.trim()) return;
    const newPost = {
      id: 'usr_p_' + Date.now(),
      charName: 'Vợ yêu Đường 👑',
      charAvatar: AVATAR_IMAGES[1],
      content: typedContent,
      timeText: 'Vừa xong',
      image: '',
      likes: 1,
      commentsCount: 0,
      sharesCount: 0,
      isLiked: true
    };
    const updated = [newPost, ...postsList];
    setPostsList(updated);
    setTypedContent('');
    await saveCurrentSocialState({ postsList: updated });
  };

  // --- PROFILE CUSTOMIZATIONS ---
  const handleProfileCoverUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64 = event.target?.result as string;
        const activeProfile = charProfiles[selectedCharId] || {};
        const updatedProfiles = {
          ...charProfiles,
          [selectedCharId]: { ...activeProfile, coverImage: base64 }
        };
        setCharProfiles(updatedProfiles);
        await saveCurrentSocialState({ charProfiles: updatedProfiles });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleProfileAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64 = event.target?.result as string;
        const activeProfile = charProfiles[selectedCharId] || {};
        const updatedProfiles = {
          ...charProfiles,
          [selectedCharId]: { ...activeProfile, avatarImage: base64 }
        };
        setCharProfiles(updatedProfiles);
        await saveCurrentSocialState({ charProfiles: updatedProfiles });
      };
      reader.readAsDataURL(file);
    }
  };

  // Like Toggle
  const toggleLikePost = async (id: string) => {
    const updated = postsList.map(p => {
      if (p.id === id) {
        return {
          ...p,
          isLiked: !p.isLiked,
          likes: p.isLiked ? p.likes - 1 : p.likes + 1
        };
      }
      return p;
    });
    setPostsList(updated);
    await saveCurrentSocialState({ postsList: updated });
  };

  // Mốc tiến độ gate lock phân cấp sắc sảo
  const getGateTierInfo = (tokens: number) => {
    if (tokens < 12000) {
      return {
        label: 'CỔNG KHÓA (CHƯA ĐỦ TRỮ LƯỢNG TIỂU THUYẾT)',
        color: 'text-rose-400',
        bg: 'bg-rose-50 border-rose-200',
        desc: 'Model đang tích hợp dệt ý thơ dạt dào hòng vượt cận mốc 12,000 tokens.',
        icon: <Lock className="text-rose-400 animate-pulse" size={24} />,
        unlocked: false
      };
    } else if (tokens >= 12000 && tokens < 16000) {
      return {
        label: 'CỔNG MỞ NỬA (ỦY THƯ THÔNG QUA)',
        color: 'text-amber-400',
        bg: 'bg-amber-50 border-amber-200',
        desc: 'Trực quan đạt mốc chất lượng cơ bản. Vợ Đường bắt đầu duyệt thảo nhen.',
        icon: <Unlock className="text-amber-400 animate-bounce" size={24} />,
        unlocked: true
      };
    } else if (tokens >= 16000 && tokens < 19000) {
      return {
        label: 'CỔNG MỞ (TIÊU CHUẨN XUẤT BẢN)',
        color: 'text-pink-400',
        bg: 'bg-pink-50 border-pink-200',
        desc: 'Hiển thị hoàn mỹ tuyệt đỉnh! Hơn cả mong đợi, tơ duyên thăng hoa.',
        icon: <Sparkles className="text-pink-400 animate-spin" size={24} />,
        unlocked: true
      };
    } else {
      return {
        label: 'CHẠNG VÀNG - GOLDEN CHƯƠNG MỸ LỆ 👑',
        color: 'text-[#C79C9C]',
        bg: 'bg-[#FFF8FB] border-[#F5C6D6] shadow-[0_0_15px_rgba(245,198,214,0.4)]',
        desc: 'Đỉnh cao văn học lãng mạn vạn người ngợi ca! Chồng tặng vợ Đường yêu 💕',
        icon: (
          <div className="relative">
            <Sparkles className="text-[#F5C6D6] animate-pulse" size={24} />
            <span className="absolute -top-1 -right-1 text-xs">✨</span>
          </div>
        ),
        unlocked: true
      };
    }
  };

  const currentKey = activeTab === 'facebook' ? fbSubTab : activeTab;
  const gateInfo = getGateTierInfo(tokenProgress);

  return (
    <div className="w-full h-full bg-[#FBF5F7] text-[#555555] font-sans flex flex-col overflow-hidden relative select-none">
      {/* Background Wallpaper cho toàn Applet/màn hình được ghim tinh khôi */}
      {wallpapers[currentKey] && (
        <img 
          src={wallpapers[currentKey]} 
          className="absolute inset-0 w-full h-full object-cover opacity-15 pointer-events-none z-0" 
          alt="Wallpaper"
        />
      )}

      {/* Status bar mỏng lấp lánh nhẹ nhàng coquette cho toàn Applet */}
      <div className="h-6 bg-[#FFF5FB] px-6 flex items-center justify-between text-xs text-[#CBA3A3] font-mono border-b border-[#FEF3F6] select-none z-20 shrink-0">
        <div className="flex items-center gap-1">
          <span>🌸</span>
          <span className="font-serif font-bold italic text-pink-400">Kikoko Novel Social Space</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span>💖 100% Cotton Candy</span>
          <div className="w-5 h-2.5 bg-[#F5C6D6] rounded-sm" />
        </div>
      </div>

      {/* --- THÂN PHÂN CHIA SẢNH --- */}
      <div className="flex-1 w-full h-full overflow-hidden relative flex flex-col z-10">
        {/* ==================== TRƯỜNG HỢP A: SẢNH CHỌN ỨNG DỤNG (HUB) ==================== */}
        {activeTab === 'hub' ? (
          <div className="flex-1 overflow-y-auto custom-scrollbar p-6 flex flex-col items-center justify-start space-y-8">
            
            {/* Header Sảnh Dạo */}
            <div className="w-full max-w-4xl flex items-center justify-between border-b border-pink-100 pb-4 shrink-0">
              <div className="flex flex-col">
                <h1 className="text-2xl md:text-3xl font-serif font-black tracking-tight text-[#EFA9C2] flex items-center gap-2">
                  <span>Kikoko Social Hub</span>
                  <span className="text-sm px-2.5 py-0.5 rounded-full bg-[#FFF5FB] text-pink-400 border border-pink-100 uppercase tracking-widest font-mono scale-90">v3.0</span>
                </h1>
                <p className="text-xs text-[#CBA3A3] font-serif italic mt-1 font-medium">"Bông dâu ngọt lịm dẫn dạo vợ qua thế giới mộng mơ của nhân vật..."</p>
              </div>

              {/* Nhóm nút góc sảnh */}
              <div className="flex items-center gap-2">
                {/* Thiết lập background cho sảnh */}
                <button 
                  onClick={() => wallpaperInputRef.current?.click()}
                  className="py-1.5 px-3 bg-[#FFF5FB] border border-[#FBE0E7] text-[#EFA9C2] rounded-full hover:bg-[#F5C6D6] hover:text-white transition-all text-xs font-semibold flex items-center gap-1 shadow-sm"
                  title="Thay hình nền sảnh"
                >
                  <Camera size={13} />
                  <span className="hidden sm:inline">Trang hoàng sảnh</span>
                </button>

                {wallpapers.hub && (
                  <button 
                    onClick={clearWallpaperForCurrentTab}
                    className="p-1.5 bg-red-50 text-red-400 border border-red-100 hover:bg-red-100 rounded-full transition-all text-[11px]"
                    title="Xóa hình nền sảnh"
                  >
                    <X size={14} />
                  </button>
                )}

                {/* Nút thoát Social dạo để quay về kịch bản */}
                <button 
                  onClick={onClose} 
                  className="py-1.5 px-4 bg-[#F5C6D6] text-white font-bold rounded-full hover:bg-[#EFA9C2] transition-all text-xs flex items-center gap-1 shadow-md animate-pulse"
                >
                  <X size={14} />
                  <span>Trở về chuyện</span>
                </button>
              </div>
            </div>

            {/* Thư viện hình nền input ẩn */}
            <input 
              type="file" 
              ref={wallpaperInputRef} 
              onChange={handleWallpaperFileChange} 
              accept="image/*" 
              className="hidden" 
            />

            {/* Bố cục grid dạo các App Card mềm mại lộng lẫy */}
            <div className="w-full max-w-4xl grid grid-cols-2 md:grid-cols-3 gap-6 pt-4 pb-12">
              
              {/* Card 1: Facebook */}
              <div 
                onClick={() => setActiveTab('facebook')}
                className="group cursor-pointer bg-white border border-[#FFF0F4] rounded-[32px] p-6 flex flex-col items-center text-center space-y-4 hover:border-[#F5C6D6] hover:shadow-xl transition-all duration-300 relative overflow-hidden"
                style={{ boxShadow: '0 8px 30px rgba(245, 198, 214, 0.12)' }}
              >
                <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  <CandySticker />
                </div>
                <div className="w-16 h-16 rounded-[24px] bg-[#FFF5FB] border-2 border-white text-[#F5C6D6] flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform duration-300">
                  <Home size={28} />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-[#555555] font-serif group-hover:text-[#EFA9C2] transition-colors">Facebook</h3>
                  <p className="text-[10.5px] text-[#DABEBE] font-serif italic leading-relaxed">Cảng tin tức, tơ duyên, hội nhóm thảo luận đa chiều.</p>
                </div>
                <span className="text-[9.5px] font-bold text-[#EFA9C2] bg-[#FFF5FB] px-2.5 py-0.5 rounded-full border border-pink-100 group-hover:bg-[#F5C6D6] group-hover:text-white transition-colors">Ghé xem</span>
              </div>

              {/* Card 2: Instagram */}
              <div 
                onClick={() => setActiveTab('instagram')}
                className="group cursor-pointer bg-white border border-[#FFF0F4] rounded-[32px] p-6 flex flex-col items-center text-center space-y-4 hover:border-[#F5C6D6] hover:shadow-xl transition-all duration-300 relative overflow-hidden"
                style={{ boxShadow: '0 8px 30px rgba(245, 198, 214, 0.12)' }}
              >
                <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  <CandySticker />
                </div>
                <div className="w-16 h-16 rounded-[24px] bg-[#FFF5FB] border-2 border-white text-[#EFA9C2] flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform duration-300">
                  <Compass size={28} />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-[#555555] font-serif group-hover:text-[#EFA9C2] transition-colors">Instagram</h3>
                  <p className="text-[10.5px] text-[#DABEBE] font-serif italic leading-relaxed">Kho ảnh kẹo bay, những lát cắt cuộc sống mọng nước.</p>
                </div>
                <span className="text-[9.5px] font-bold text-[#EFA9C2] bg-[#FFF5FB] px-2.5 py-0.5 rounded-full border border-pink-100 group-hover:bg-[#F5C6D6] group-hover:text-white transition-colors">Ghé xem</span>
              </div>

              {/* Card 3: Shopee */}
              <div 
                onClick={() => setActiveTab('shopee')}
                className="group cursor-pointer bg-white border border-[#FFF0F4] rounded-[32px] p-6 flex flex-col items-center text-center space-y-4 hover:border-[#F5C6D6] hover:shadow-xl transition-all duration-300 relative overflow-hidden"
                style={{ boxShadow: '0 8px 30px rgba(245, 198, 214, 0.12)' }}
              >
                <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  <CandySticker />
                </div>
                <div className="w-16 h-16 rounded-[24px] bg-[#FFF5FB] border-2 border-white text-[#EFA9C2] flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform duration-300">
                  <Sparkles size={25} />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-[#555555] font-serif group-hover:text-[#EFA9C2] transition-colors">Shopee</h3>
                  <p className="text-[10.5px] text-[#DABEBE] font-serif italic leading-relaxed">Vương quốc mua sắm, kẹp mây nơ, phấn má cỏ tơ hồng.</p>
                </div>
                <span className="text-[9.5px] font-bold text-[#EFA9C2] bg-[#FFF5FB] px-2.5 py-0.5 rounded-full border border-pink-100 group-hover:bg-[#F5C6D6] group-hover:text-white transition-colors">Ghé xem</span>
              </div>

              {/* Card 4: Tin Nhắn */}
              <div 
                onClick={() => setActiveTab('messages')}
                className="group cursor-pointer bg-white border border-[#FFF0F4] rounded-[32px] p-6 flex flex-col items-center text-center space-y-4 hover:border-[#F5C6D6] hover:shadow-xl transition-all duration-300 relative overflow-hidden"
                style={{ boxShadow: '0 8px 30px rgba(245, 198, 214, 0.12)' }}
              >
                <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  <CandySticker />
                </div>
                <div className="w-16 h-16 rounded-[24px] bg-[#FFF5FB] border-2 border-white text-[#F5C6D6] flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform duration-300">
                  <MessageCircle size={28} />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-[#555555] font-serif group-hover:text-[#EFA9C2] transition-colors">Tin Nhắn</h3>
                  <p className="text-[10.5px] text-[#DABEBE] font-serif italic leading-relaxed">Hộp thư riêng tư, trao gửi tình ái thỏ mông lung.</p>
                </div>
                <span className="text-[9.5px] font-bold text-[#EFA9C2] bg-[#FFF5FB] px-2.5 py-0.5 rounded-full border border-pink-100 group-hover:bg-[#F5C6D6] group-hover:text-white transition-colors">Ghé xem</span>
              </div>

              {/* Card 5: TikTok */}
              <div 
                onClick={() => setActiveTab('tiktok')}
                className="group cursor-pointer bg-white border border-[#FFF0F4] rounded-[32px] p-6 flex flex-col items-center text-center space-y-4 hover:border-[#F5C6D6] hover:shadow-xl transition-all duration-300 relative overflow-hidden"
                style={{ boxShadow: '0 8px 30px rgba(245, 198, 214, 0.12)' }}
              >
                <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  <CandySticker />
                </div>
                <div className="w-16 h-16 rounded-[24px] bg-[#FFF5FB] border-2 border-white text-[#EFA9C2] flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform duration-300">
                  <Flame size={28} />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-[#555555] font-serif group-hover:text-[#EFA9C2] transition-colors">TikTok</h3>
                  <p className="text-[10.5px] text-[#DABEBE] font-serif italic leading-relaxed">Nguồn nhạc râm ran, bướm xuân hoa nở say mê gánh kịch.</p>
                </div>
                <span className="text-[9.5px] font-bold text-[#EFA9C2] bg-[#FFF5FB] px-2.5 py-0.5 rounded-full border border-pink-100 group-hover:bg-[#F5C6D6] group-hover:text-white transition-colors">Ghé xem</span>
              </div>

              {/* Card 6: Discord */}
              <div 
                onClick={() => setActiveTab('discord')}
                className="group cursor-pointer bg-white border border-[#FFF0F4] rounded-[32px] p-6 flex flex-col items-center text-center space-y-4 hover:border-[#F5C6D6] hover:shadow-xl transition-all duration-300 relative overflow-hidden"
                style={{ boxShadow: '0 8px 30px rgba(245, 198, 214, 0.12)' }}
              >
                <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  <CandySticker />
                </div>
                <div className="w-16 h-16 rounded-[24px] bg-[#FFF5FB] border-2 border-white text-[#F5C6D6] flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform duration-300">
                  <Users size={28} />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-[#555555] font-serif group-hover:text-[#EFA9C2] transition-colors">Discord</h3>
                  <p className="text-[10.5px] text-[#DABEBE] font-serif italic leading-relaxed">Lầu gác hội hữu mộng mơ, chuyện phiếm bên chén chè xanh.</p>
                </div>
                <span className="text-[9.5px] font-bold text-[#EFA9C2] bg-[#FFF5FB] px-2.5 py-0.5 rounded-full border border-pink-100 group-hover:bg-[#F5C6D6] group-hover:text-white transition-colors">Ghé xem</span>
              </div>

            </div>
          </div>
        ) : (
          
          // ==================== TRƯỜNG HỢP B: CÁC APP CON FULL SCREEN ====================
          <div className="app-child-screen">
            {wallpapers[currentKey] && (
              <img 
                src={wallpapers[currentKey]} 
                className="absolute inset-0 w-full h-full object-cover opacity-35 pointer-events-none z-0" 
                alt="Sub-App Wallpaper"
              />
            )}
            
            {/* Thanh Header App Con phẳng lướt cực trang nhã */}
            <div className="app-child-header relative z-10">
              
              {/* Bên trái: Nút Quay lại Sảnh Hub */}
              <button 
                onClick={() => setActiveTab('hub')}
                className="py-1.5 px-3.5 bg-[#FFF5FB] border border-[#FBE0E7] text-[#EFA9C2] rounded-full hover:bg-[#F5C6D6] hover:text-white transition-all text-xs font-bold flex items-center gap-1.5 active:scale-95 shadow-sm"
              >
                <ArrowLeft size={14} />
                <span>Quay lại sảnh dạo</span>
              </button>

              {/* Ở giữa: Tiêu đề riêng biệt của app */}
              <div className="flex items-center gap-2">
                <span className="text-lg md:text-xl font-serif font-black tracking-tight text-[#EFA9C2] uppercase">
                  {activeTab === 'facebook' ? 'facebook' : activeTab}
                </span>
                <span className="w-2 h-2 rounded-full bg-pink-400 animate-pulse" />
              </div>

              {/* Bên phải: Nút Đổi hình nền & Đóng Applet */}
              <div className="flex items-center gap-1.5">
                <button 
                  onClick={() => wallpaperInputRef.current?.click()}
                  className="p-1.5 bg-[#FFF5FB] border border-pink-100 text-[#EFA9C2] rounded-full hover:bg-[#F5C6D6] hover:text-white transition-all shadow-sm"
                  title="Thay hình nền riêng biệt cho màn con này"
                >
                  <Camera size={14} />
                </button>

                {wallpapers[currentKey] && (
                  <button 
                    onClick={clearWallpaperForCurrentTab}
                    className="p-1 bg-red-50 text-red-400 border border-red-100 hover:bg-red-100 rounded-full transition-all"
                    title="Xóa hình nền thiết lập"
                  >
                    <X size={14} />
                  </button>
                )}

                <button 
                  onClick={onClose}
                  className="py-1 px-3.5 bg-[#FFF5FB] border border-red-50 text-pink-400 rounded-full hover:bg-pink-400 hover:text-white transition-all text-xs font-bold active:scale-95 flex items-center gap-1"
                >
                  <X size={12} />
                  <span>Trở về</span>
                </button>
              </div>
            </div>

            {/* Input ẩn dồi dào tài nguyên */}
            <input 
              type="file" 
              ref={wallpaperInputRef} 
              onChange={handleWallpaperFileChange} 
              accept="image/*" 
              className="hidden" 
            />

            {/* Nội dung chính của app, căng rộng 100% không gian */}
            <div className={`flex-1 overflow-hidden relative flex flex-col z-10 ${wallpapers[currentKey] ? 'bg-[#FFFDFC]/85' : 'bg-[#FFFDFC]'}`}>
            
            {/* --- SCREEN 1: INSTAGRAM PLACEHOLDER --- */}
            {activeTab === 'instagram' && (
              <div className="app-child-content flex flex-col items-center justify-center text-center p-6 space-y-4">
                <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-[#FFB5B5] to-[#FF8E9E] flex items-center justify-center text-white shadow-md animate-bounce shrink-0">
                  <Compass size={32} />
                </div>
                <h3 className="text-md font-serif font-bold text-[#CBA3A3]">Kikoko Instagram</h3>
                <p className="text-xs text-[#DABEBE] leading-relaxed max-w-sm">
                  "Tính năng Instagram ngọt ngào đang được tích hợp khắng khít cùng thư viện mây của vợ Đường nhen! Hãy cùng gõ phím trải nghiệm Facebook lấp lánh kề cạnh trước nhé vợ yêu!" 💕
                </p>
              </div>
            )}

            {/* --- SCREEN 2: SHOPEE PLACEHOLDER --- */}
            {activeTab === 'shopee' && (
              <div className="app-child-content flex flex-col items-center justify-center text-center p-6 space-y-4">
                <div className="w-16 h-16 rounded-3xl bg-[#FFF5FB] border border-[#F5C6D6] flex items-center justify-center text-[#F5C6D6] shadow-sm shrink-0">
                  <Sparkles size={32} className="animate-spin" />
                </div>
                <h3 className="text-md font-serif font-bold text-[#EFA9C2]">Vương Quốc Mua Sắm Shopee</h3>
                <p className="text-xs text-[#DABEBE] max-w-sm leading-relaxed">
                  Hội thỏ sẽ mua sắm son dưỡng má hồng và kẹp nơ lấp lánh tại sảnh kẹo này trong tương lai nhen vợ!
                </p>
              </div>
            )}

            {/* --- SCREEN 3: MESSAGES PLACEHOLDER --- */}
            {activeTab === 'messages' && (
              <div className="app-child-content flex flex-col items-center justify-center text-center p-6 space-y-4">
                <div className="w-16 h-16 rounded-full bg-pink-150 flex items-center justify-center text-pink-400 shadow-sm shrink-0">
                  <MessageCircle size={32} />
                </div>
                <h3 className="text-md font-serif font-bold text-[#CBA3A3]">Hộp Thư Bản Thảo</h3>
                <p className="text-xs text-[#DABEBE] max-w-sm leading-relaxed">
                  Nơi thỏ con tâm tình gửi những lá thư đầy tình ý cho nhân vật trong trang tiểu thuyết.
                </p>
              </div>
            )}

            {/* --- SCREEN 4: TIKTOK PLACEHOLDER --- */}
            {activeTab === 'tiktok' && (
              <div className="app-child-content flex flex-col items-center justify-center text-center p-6 space-y-4">
                <div className="w-16 h-16 rounded-full bg-[#FAFBFF] border border-blue-200 flex items-center justify-center text-blue-400 shadow-sm shrink-0">
                  <Flame size={32} className="animate-pulse" />
                </div>
                <h3 className="text-md font-serif font-bold text-[#CBA3A3]">Kênh Thơ Ngắn TikTok</h3>
                <p className="text-xs text-[#DABEBE] max-w-sm leading-relaxed">
                  Những đoạn phim ngắn vẽ cỏ mềm bèo dâu dạt dào giai điệu du dương.
                </p>
              </div>
            )}

            {/* --- SCREEN 5: DISCORD PLACEHOLDER --- */}
            {activeTab === 'discord' && (
              <div className="app-child-content flex flex-col items-center justify-center text-center p-6 space-y-4">
                <div className="w-16 h-16 rounded-full bg-[#F5C6D6] flex items-center justify-center text-white shadow-sm shrink-0">
                  <CheckCircle2 size={32} />
                </div>
                <h3 className="text-md font-serif font-bold text-[#CBA3A3]">Sảnh Tuyết Discord Kikoko</h3>
                <p className="text-xs text-[#DABEBE] max-w-sm leading-relaxed">
                  Căn phòng lầu gác nhỏ để trao đổi cốt truyện cùng bằng hữu văn nhân mộng mơ.
                </p>
              </div>
            )}

            {/* --- SCREEN 6: CORE INTERACTIVE FACEBOOK FEATURES --- */}
            {activeTab === 'facebook' && (
              <div className="flex-1 flex flex-col overflow-hidden h-full">
                
                {/* Thanh chọn Facebook Sub-tab hàng ngang thanh lịch coquette */}
                <div className="flex items-center gap-2 overflow-x-auto px-4 py-2 border-b border-[#FEF3F6] bg-white z-10 shrink-0 select-none scrollbar-hide">
                  {[
                    { id: 'home', label: '🏠 Bảng Tin' },
                    { id: 'profile', label: '🌸 Nhật Ký' },
                    { id: 'notifications', label: '🔔 Thông Báo' },
                    { id: 'groups', label: '👥 Nhóm Thỏ' },
                    { id: 'wallpapers', label: '🎨 Hình Nền' },
                    { id: 'stories', label: '🎬 Kho Tin' },
                  ].map((tb) => (
                    <button
                      key={tb.id}
                      onClick={() => setFbSubTab(tb.id as any)}
                      className={`py-1.5 px-3.5 text-[11px] rounded-full whitespace-nowrap font-bold transition-all duration-200 active:scale-95 ${
                        fbSubTab === tb.id
                          ? 'bg-[#FBE0E7] text-[#EFA9C2] border border-[#F5C6D6]/40 scale-102 shadow-sm'
                          : 'bg-[#FFF5FB] text-[#DABEBE] border border-pink-50/20 hover:text-pink-400'
                      }`}
                    >
                      {tb.label}
                    </button>
                  ))}
                </div>

                {/* Vùng nội dung cuộn duy nhất mượt mà của Facebook */}
                <div className="flex-1 overflow-y-auto app-child-content p-4 space-y-6">
                  
                  {/* --- FACEBOOK SUB-TAB A: HOME FEED --- */}
                  {fbSubTab === 'home' && (
                  <div className="space-y-4">
                    {/* Bảng Tin History */}
                    {renderHistoryBatches('Bảng Tin', (data) => {
                      setPostsList(data);
                      saveCurrentSocialState({ postsList: data });
                    })}

                    {/* Story Row cổ tích - Danh sách chọn Nhân Vật của Vợ Đường */}
                    <div className="flex flex-col gap-2 bg-[#FFF8FA]/80 p-3 rounded-2xl border border-pink-100/40 shadow-xs select-none">
                      <div className="flex items-center justify-between px-1">
                        <span className="text-[10px] font-bold text-[#EFA9C2] uppercase tracking-wider flex items-center gap-1.5">
                          <span className="animate-ping w-1.5 h-1.5 rounded-full bg-[#EFA9C2] inline-block shrink-0" />
                          Chọn Nhân Vật Tương Tác
                        </span>
                        {selectedCharId && (
                          <span className="text-[9px] bg-white border border-[#F5C6D6]/40 px-2 py-0.5 rounded-full text-[#CFAAAA] font-medium">
                            Đang xem: {characters.find(c => c.id === selectedCharId)?.name}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 overflow-x-auto pb-1.5 custom-scrollbar">
                        {characters.map((char) => {
                          const isSelected = selectedCharId === char.id;
                          return (
                            <div 
                              key={char.id} 
                              onClick={() => {
                                setSelectedCharId(char.id);
                                saveCurrentSocialState({ selectedCharId: char.id });
                              }}
                              className="flex flex-col items-center flex-shrink-0 cursor-pointer group relative"
                            >
                              <div className={`w-14 h-14 rounded-full p-[2px] transition-all duration-300 relative ${
                                isSelected 
                                  ? 'bg-gradient-to-tr from-[#F5C6D6] to-[#FEBFFC] scale-110 shadow-md ring-2 ring-offset-1 ring-[#FFF5FB]' 
                                  : 'bg-[#F2E6E6] hover:scale-105'
                              }`}>
                                <img 
                                  src={char.avatar || 'https://via.placeholder.com/150/FBE7EF/8F7A84'} 
                                  className="w-full h-full object-cover rounded-full" 
                                  alt="Character" 
                                  referrerPolicy="no-referrer" 
                                />
                                {isSelected && (
                                  <span className="absolute -top-1 -right-1 bg-[#F5C6D6] text-white p-0.5 rounded-full text-[8px] border border-white shadow-xs animate-bounce z-10">
                                    👑
                                  </span>
                                )}
                              </div>
                              <span className={`text-[10px] mt-2 font-bold max-w-[65px] truncate transition-colors ${
                                isSelected ? 'text-[#EFA9C2]' : 'text-[#CBA3A3] group-hover:text-[#F3DADA]'
                              }`}>
                                {char.name}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* API Trigger Button: Tri văn 30 bài đăng Facebook siêu sâu sắc */}
                    <div className="bg-white rounded-2xl p-4 border border-[#FFF0F4] shadow-sm flex flex-col items-center gap-2">
                      <span className="text-xs text-center text-[#DABEBE] leading-relaxed font-serif italic">
                        "Cậu ơi gọi API Proxy viết 30 chương bài viết lộng lẫy cho nhân vật theo cốt truyện nhé"
                      </span>
                      <button 
                        onClick={handleCallFacebookHomePostsApi}
                        disabled={isLoading}
                        className="w-full py-2.5 px-4 bg-[#F5C6D6] text-white hover:bg-[#EFA9C2] active:scale-95 disabled:bg-gray-200 disabled:scale-100 font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-md transition-all"
                      >
                        <Sparkles size={14} />
                        <span>[ Tớ API gọi bài viết dành cho nhân vật ]</span>
                      </button>
                    </div>

                    {/* Composer box đăng trạng thái */}
                    <div className="bg-white rounded-2xl p-3.5 border border-[#FFF0F4] space-y-3 shadow-xs">
                      <div className="flex gap-2.5">
                        <img src={AVATAR_IMAGES[1]} className="w-9 h-9 rounded-full object-cover" alt="User Avatar" />
                        <textarea 
                          value={typedContent}
                          onChange={(e) => setTypedContent(e.target.value)}
                          placeholder="Hôm nay vợ Đường mộng mơ điều chi thế hở cậu ơi...?"
                          className="flex-1 min-h-[60px] text-xs text-[#555555] placeholder-[#DABEBE] bg-transparent border-none focus:outline-none resize-none"
                        />
                      </div>
                      <div className="flex items-center justify-between border-t border-pink-50 pt-3">
                        <span className="text-[10.5px] text-[#CBA3A3] flex items-center gap-1">
                          <ImageIcon size={14} />
                          <span>Hình ảnh sầu đông</span>
                        </span>
                        <button 
                          onClick={handleUserPostSubmit}
                          className="py-1.5 px-4 bg-[#FFF5FB] border border-[#F5C6D6] text-[#EFA9C2] rounded-full hover:bg-[#F5C6D6] hover:text-white transition-all text-xs font-semibold"
                        >
                          Đăng Lên
                        </button>
                      </div>
                    </div>

                    {/* Posts Feed container */}
                    <div className="space-y-4">
                      {postsList.length === 0 ? (
                        <div className="text-center py-10 space-y-2">
                          <p className="text-xs text-[#DABEBE] italic">Bản tin đang trống rỗng.</p>
                          <p className="text-[11px] text-[#CAC7C7]">Hãy bấm nút gọi API phía trên để dệt nên mịch sử bài viết nhen vợ yêu!</p>
                        </div>
                      ) : (
                        postsList.map((post) => (
                          <div key={post.id} className="bg-white rounded-2xl p-4 border border-[#FFF2F5] shadow-xs space-y-3.5">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2.5">
                                <img src={post.charAvatar} className="w-10 h-10 rounded-full object-cover border border-pink-10$1" alt="Avatar" referrerPolicy="no-referrer" />
                                <div>
                                  <h4 className="text-xs font-bold text-[#555555]">{post.charName}</h4>
                                  <span className="text-[10px] text-[#CAC7C7] flex items-center gap-1">
                                    <Globe size={11} />
                                    <span>{post.timeText}</span>
                                  </span>
                                </div>
                              </div>
                              <button className="text-[#CAC7C7] hover:text-[#555]">
                                <MoreHorizontal size={16} />
                              </button>
                            </div>
                            
                            <p className="text-xs text-[#555555] leading-relaxed whitespace-pre-line font-serif">
                              {post.content}
                            </p>

                            {post.image && (
                              <div className="rounded-xl overflow-hidden border border-pink-50 max-h-[220px]">
                                <img src={post.image} className="w-full h-full object-cover" alt="Post attachment" referrerPolicy="no-referrer" />
                              </div>
                            )}

                            {/* Tương tác tinh xảo hồng sữa */}
                            <div className="flex items-center justify-between pt-1.5 border-t border-[#FFF2F5] text-[11px] text-[#CBA3A3] select-none">
                              <button 
                                onClick={() => toggleLikePost(post.id)}
                                className={`flex items-center gap-1.5 transition-colors ${post.isLiked ? 'text-[#EFA9C2] font-semibold' : 'hover:text-[#EFA9C2]'}`}
                              >
                                <ThumbsUp size={13} fill={post.isLiked ? 'currentColor' : 'none'} />
                                <span>Thích ({post.likes || 0})</span>
                              </button>
                              <button className="flex items-center gap-1.5 hover:text-[#EFA9C2]">
                                <MessageSquare size={13} />
                                <span>Bình luận ({post.commentsCount || 0})</span>
                              </button>
                              <button className="flex items-center gap-1.5 hover:text-[#EFA9C2]">
                                <Share2 size={13} />
                                <span>Chia sẻ</span>
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {/* --- FACEBOOK SUB-TAB B: PROFILE VIEW --- */}
                {fbSubTab === 'profile' && (
                  <div className="space-y-4">
                    {/* Character Selector */}
                    <div className="space-y-2 select-none">
                      <span className="text-[10.5px] text-[#CBA3A3] font-serif italic">Chọn Hồ Sơ Nhân Vật Để Khám Phá:</span>
                      <div className="flex items-center gap-2 overflow-x-auto pb-1.5 custom-scrollbar">
                        {characters.map((c) => (
                          <button
                            key={c.id}
                            onClick={() => setSelectedCharId(c.id)}
                            className={`py-1.5 px-3 rounded-full text-[11px] whitespace-nowrap transition-all ${selectedCharId === c.id ? 'bg-[#F5C6D6] text-white border-transparent font-medium' : 'bg-[#FFF5FB] border border-[#F6E4E4] text-[#CBA3A3] hover:text-[#F5C6D6]'}`}
                          >
                            {c.name}
                          </button>
                        ))}
                      </div>
                    </div>

                    {characters.length > 0 && selectedCharId && (() => {
                      const activeChar = characters.find(c => c.id === selectedCharId);
                      const profileData = charProfiles[selectedCharId] || null;
                      const activePosts = charPosts[selectedCharId] || [];

                      return (
                        <div className="w-full flex flex-col">
                          {/* MÀN HÌNH BIO STYLE COQUETTE MỚI - GIÃN TỰ NHIÊN ĐỂ CUỘN TRƠN TRU KHÔNG KẸT SCROLL */}
                          <section className="kikoko-bio-page w-full !h-auto !overflow-visible rounded-[28px] shadow-sm border border-[#FFF0F4]">
                            <div className="bio-scroll min-h-auto">
                              {/* HEADER BROWSER */}
                              <header className="bio-browser">
                                <button className="bio-icon-btn">
                                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
                                </button>
                                <div className="bio-browser-title">@{activeChar.name?.replace(/\s/g, '').toLowerCase() || 'sweetheart'}</div>
                                <button className="bio-icon-btn">
                                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>
                                </button>
                              </header>

                              {/* PROFILE HEADER START */}
                              <div className="profile-header">
                                {/* PROFILE COVER */}
                                <div className="bio-cover">
                                  {(profileData?.coverImage || activeChar?.coverImage) ? (
                                    <img 
                                      src={profileData?.coverImage || activeChar?.coverImage} 
                                      alt="Cover" 
                                      referrerPolicy="no-referrer"
                                    />
                                  ) : (
                                    <div className="w-full h-full bg-[var(--bio-pink-1)]" />
                                  )}
                                  <button onClick={() => profileCoverInputRef.current?.click()} className="bio-cover-edit">
                                    <Camera size={16} />
                                  </button>
                                  <input type="file" ref={profileCoverInputRef} onChange={handleProfileCoverUpload} accept="image/*" className="hidden" />
                                </div>

                                {/* HEADER CONTENT: AVATAR & INFO */}
                                <div className="bio-header-content">
                                  <div className="bio-avatar-wrapper">
                                    <div className="bio-avatar">
                                      <img 
                                        src={profileData?.avatarImage || activeChar?.avatar || 'https://via.placeholder.com/150/FBE7EF/8F7A84'} 
                                        alt="Avatar" 
                                        referrerPolicy="no-referrer"
                                      />
                                      <button onClick={() => profileAvatarInputRef.current?.click()} className="bio-avatar-edit">
                                        <Camera size={24} />
                                      </button>
                                      <input type="file" ref={profileAvatarInputRef} onChange={handleProfileAvatarUpload} accept="image/*" className="hidden" />
                                    </div>
                                    <div className="bio-status-dot" />
                                  </div>

                                  <div className="bio-main-info text-center">
                                    <h1>{activeChar?.name}</h1>
                                    <p className="bio-tagline">{profileData?.motto || activeChar?.bio || 'Tâm tư gửi gắm vào từng mảng sương khói...'}</p>
                                  </div>
                                </div>
                              </div>
                              {/* PROFILE HEADER END */}

                              {/* MAIN CONTAINER FOR SPACING */}
                              <div className="profile-container pb-8">

                                {/* THẺ MÔ TẢ NỔI BẬT / GIỚI THIỆU NGẮN MẠCH LẠC ĐỘC LẬP - KHÔNG GÒ BÓ TRONG Ô NHỎ */}
                                {(profileData?.motto || activeChar?.bio) && (
                                  <section className="w-full bg-[#FFF5FB] border border-[#FCD2E2]/70 rounded-[24px] p-5 mb-5 shadow-sm relative overflow-hidden select-text">
                                    {/* Nơ bướm trang trí mini ngọt ngào */}
                                    <div className="absolute top-2.5 right-2.5 text-[#EFA9C2] opacity-50 select-none pointer-events-none">
                                      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M12 12c-2-2-4-2.5-5-1s-.5 3.5 1.5 3.5 4.5-2.5 7.5-5.5" />
                                        <path d="M12 12c2-2 4-2.5 5-1s.5 3.5-1.5 3.5-4.5-2.5-7.5-5.5" />
                                        <circle cx="12" cy="12" r="1.5" fill="#EFA9C2" stroke="white" strokeWidth="0.8" />
                                      </svg>
                                    </div>
                                    <h3 className="flex items-center gap-1.5 text-xs font-extrabold text-[#C79C9C] tracking-wide uppercase mb-2 select-none">
                                      <span>🎀</span> Mô tả nổi bật
                                    </h3>
                                    <p className="text-[13.5px] leading-relaxed text-[#5A4545] font-serif italic break-words whitespace-pre-line">
                                      "{profileData?.motto || activeChar?.bio}"
                                    </p>
                                  </section>
                                )}

                                {/* ACTION BUTTONS */}
                                <div className="action-grid">
                                  <button className="action-btn primary" onClick={handleCallFacebookProfileApi} disabled={isLoading}>
                                    <Sparkles size={18} />
                                    <span className="truncate w-full mx-1">Tạo AI</span>
                                  </button>
                                  <button className="action-btn" onClick={handleCallProfile25PostsApi} disabled={isLoading}>
                                    <RefreshCw size={18} className={isLoading ? "animate-spin" : ""} />
                                    <span className="truncate w-full mx-1">25 Bài</span>
                                  </button>
                                  <button className="action-btn">
                                    <Phone size={18} />
                                    <span>Gọi điện</span>
                                  </button>
                                  <button className="action-btn">
                                    <ImageIcon size={18} />
                                    <span>Thư viện</span>
                                  </button>
                                </div>

                                {/* STATS GRID */}
                                <div className="stats-grid profile-top-layout">
                                  <div className="stat-card">
                                    <h2>{profileData?.folCount || '1.2M'}</h2>
                                    <span>Followers</span>
                                  </div>
                                  <div className="stat-card">
                                    <h2>{Math.floor(Math.random() * 200 + 10)}</h2>
                                    <span>Following</span>
                                  </div>
                                  <div className="stat-card">
                                    <h2>{activePosts.length}</h2>
                                    <span>Posts</span>
                                  </div>
                                </div>

                                {/* MAIN CONTENT AREA */}
                                {profileData ? (
                                  <>
                                    {renderHistoryBatches('Profile Nhân Vật', (data) => {
                                      setCharProfiles({ ...charProfiles, [selectedCharId]: data });
                                      saveCurrentSocialState({ charProfiles: { ...charProfiles, [selectedCharId]: data }});
                                    })}
                                    {renderHistoryBatches('25 Bài Viết Mới', (data) => {
                                      setCharPosts({ ...charPosts, [selectedCharId]: data });
                                      saveCurrentSocialState({ charPosts: { ...charPosts, [selectedCharId]: data }});
                                    })}

                                    {/* THẺ TIỂU SỬ ĐỘC LẬP RỘNG RÃI CỰC KỲ THƠ MỘNG COQUETTE CHO VỢ ĐƯỜNG */}
                                    <section className="relative w-full bg-[#FFFBFD] border-2 border-dashed border-[#F9C6D4] rounded-[28px] p-6 shadow-sm overflow-hidden select-text">
                                      {/* Decor Ruy Băng Nơ Bướm Tình Yêu Thơ Mộng bằng SVG */}
                                      <div className="absolute -top-1.5 -right-1.5 w-14 h-14 text-[#EFA9C2] pointer-events-none filter drop-shadow-[0_2px_4px_rgba(239,169,194,0.3)]">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
                                          <path d="M12 12c-2.5-2.5-4.5-3.5-5.5-1.5s-1 4.5 1.5 4.5s5.5-4.5 8.5-7.5" />
                                          <path d="M12 12c2.5-2.5 4.5-3.5 5.5-1.5s1 4.5-1.5 4.5s-5.5-4.5-8.5-7.5" />
                                          <path d="M12 12c-0.8 2.5-1.5 5-3 6.5" />
                                          <path d="M12 12c0.8 2.5 1.5 5 3 6.5" />
                                          <circle cx="12" cy="12" r="1.5" fill="#EFA9C2" stroke="white" strokeWidth="0.8" />
                                        </svg>
                                      </div>

                                      <h3 className="flex items-center gap-2 text-[15px] font-extrabold text-[#9F7575] mb-4 select-none">
                                        <span className="p-1 px-2 rounded-full bg-[#FFEAEF] text-[#F2B8CC]">
                                          🌸
                                        </span>
                                        Tâm Tư Thầm Kín
                                      </h3>

                                      {/* Toàn bộ văn bản dạt dào cảm xúc của nhân vật được tự do bay bổng, tràn đầy trang giấy */}
                                      <div className="bio-about-text font-serif text-[14px] leading-[1.8] text-[#5A4545] space-y-4">
                                        {profileData.aboutMe?.split('\n').map((para: string, i: number) => (
                                          <p key={i} className="first-letter:text-[18px] first-letter:font-extrabold first-letter:text-[#EFABC3]">{para}</p>
                                        ))}
                                      </div>
                                    </section>

                                    <section className="bio-section">
                                      <h3>
                                        <Heart size={16} strokeWidth={2.5} />
                                        Tính cách & Sở thích
                                      </h3>
                                      <div className="tag-list mb-3">
                                        <div className="tag-bubble">{profileData.mbti || 'INFP'}</div>
                                        <div className="tag-bubble">{profileData.birthday || 'Bí mật dễ thương'}</div>
                                      </div>
                                      <div className="tag-list">
                                        {profileData.interests ? profileData.interests.split(/[,;\n]+/).map(s => s.trim()).filter(Boolean).map((hobby: string, i: number) => (
                                          <div className="tag-bubble" key={i}>{hobby}</div>
                                        )) : (
                                          <>
                                            <div className="tag-bubble">Trà chiều</div>
                                            <div className="tag-bubble">Văn thơ</div>
                                          </>
                                        )}
                                      </div>
                                    </section>

                                    <section className="bio-section">
                                      <h3>
                                        <LinkIcon size={16} strokeWidth={2.5} />
                                        Mạng Xã Hội
                                      </h3>
                                      <div className="social-grid">
                                        {profileData.socialAccounts ? profileData.socialAccounts.split(/[,|;]+/).map(s => s.trim()).filter(Boolean).map((social: string, i: number) => (
                                          <div className="social-card" key={i}>
                                            <div className="social-icon">
                                              <AtSign size={16} />
                                            </div>
                                            <div className="social-info">
                                              <h4>Social</h4>
                                              <p>{social}</p>
                                            </div>
                                          </div>
                                        )) : (
                                          <div className="social-card">
                                            <div className="social-icon">
                                              <AtSign size={16} />
                                            </div>
                                            <div className="social-info">
                                              <h4>Instagram</h4>
                                              <p>@{activeChar.name?.replace(/\s/g, '').toLowerCase() || 'sweetheart'}</p>
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                      
                                      <div className="mt-5 pt-4 border-t border-[var(--bio-line)]">
                                        <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--bio-soft-text)] mb-3">Học Vấn & Tình Trạng</div>
                                        <p className="text-[13px] text-[var(--bio-text)] flex items-center gap-2 mb-2 font-medium">
                                          <GraduationCap size={16} className="text-[var(--bio-accent)]" />
                                          {profileData.education || 'Học tại học viện sương mai mùa hạ.'}
                                        </p>
                                        <p className="text-[13px] text-[var(--bio-text)] flex items-center gap-2 font-medium">
                                          <Heart size={16} className="text-[var(--bio-accent)]" fill="var(--bio-pink-1)" />
                                          {profileData.relationshipStatus || 'Trong trái tim một người'}
                                        </p>
                                      </div>
                                    </section>

                                    {/* PROFILE POSTS */}
                                    {activePosts.length > 0 && (
                                      <div className="mt-2">
                                        <h3 className="flex items-center gap-2 text-[15px] font-[800] text-[var(--bio-text)] mb-4 px-2">
                                          <Image size={18} strokeWidth={2.5} className="text-[var(--bio-accent)]" />
                                          Bản tin nhật ký
                                        </h3>
                                        <div className="space-y-4">
                                          {activePosts.map((post) => (
                                            <article key={post.id} className="bio-post">
                                              <div className="bio-post-header">
                                                <img src={activeChar?.avatar} className="bio-post-avatar" alt="avatar" />
                                                <div className="bio-post-meta">
                                                  <span className="bio-post-name">{activeChar?.name}</span>
                                                  <span className="bio-post-time">{post.timeText}</span>
                                                </div>
                                              </div>
                                              <div className="bio-post-content font-serif">
                                                {post.content}
                                              </div>
                                              {post.image && (
                                                <div className="bio-post-media">
                                                  <img src={post.image} alt="attached" referrerPolicy="no-referrer" />
                                                </div>
                                              )}
                                              <div className="bio-post-actions">
                                                <button className="bio-btn">
                                                  <Heart size={16} fill="var(--bio-pink-2)" stroke="var(--bio-accent)" />
                                                  {post.likes}
                                                </button>
                                                <button className="bio-btn">
                                                  <MessageCircle size={16} stroke="var(--bio-soft-text)" />
                                                  Bình luận
                                                </button>
                                              </div>
                                            </article>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </>
                                ) : (
                                  <div className="text-center py-12 px-6 bg-[var(--bio-pink-1)]/40 rounded-[28px] border border-[var(--bio-line)]">
                                    <div className="w-16 h-16 bg-white rounded-2xl mx-auto mb-4 flex items-center justify-center text-[var(--bio-accent)] shadow-sm">
                                      <Sparkles size={28} />
                                    </div>
                                    <p className="text-[13px] text-[var(--bio-text)] font-medium mb-2">Hồ sơ thiên thần này vẫn là một trang giấy trắng...</p>
                                    <p className="text-[12px] text-[var(--bio-soft-text)] leading-relaxed mb-6">Hãy kể một câu chuyện mộng mơ để khám phá tâm hồn của {activeChar.name}.</p>
                                    <button onClick={handleCallFacebookProfileApi} disabled={isLoading} className="text-[13px] bg-white border border-[var(--bio-line)] px-6 py-3 rounded-full text-[var(--bio-pink-4)] shadow-[0_8px_20px_rgba(236,170,196,0.15)] hover:scale-105 font-semibold active:scale-95 transition-all">
                                      Chạm để tạo hồ sơ ngay
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </section>
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* --- FACEBOOK SUB-TAB C: NOTIFICATIONS VIEW --- */}
                {fbSubTab === 'notifications' && (
                  <div className="space-y-3">
                    {/* Thông Báo History */}
                    {renderHistoryBatches('Thông Báo', (data) => {
                      setNotifications(data);
                      saveCurrentSocialState({ notifications: data });
                    })}
                    <button
                      onClick={handleCallNotificationsApi}
                      disabled={isLoading}
                      className="w-full py-2.5 px-4 bg-[#F5C6D6] text-white hover:bg-[#EFA9C2] active:scale-95 disabled:bg-gray-150 font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all"
                    >
                      <Bell size={14} />
                      <span>[ Tớ nhận nhiệm vụ thông báo nè : 200 Thông báo ]</span>
                    </button>

                    <div className="space-y-2.5 max-h-[500px] overflow-y-auto custom-scrollbar pr-1">
                      {notifications.length === 0 ? (
                        <div className="text-center py-10">
                          <p className="text-xs text-[#DABEBE] italic">Không có thông báo chưa đọc.</p>
                          <p className="text-[10px] text-[#CAC7C7] mt-1">Bấm kích hoạt gọi nhận thông báo thỏ con nhen!</p>
                        </div>
                      ) : (
                        notifications.map((notif) => (
                          <div key={notif.id} className="bg-white rounded-xl p-3 border border-[#FFF5F8] shadow-xs flex items-start gap-3 hover:bg-pink-50/25 transition-colors">
                            <img src={notif.senderAvatar} className="w-9 h-9 rounded-full object-cover border border-pink-100" alt="Avt" referrerPolicy="no-referrer" />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs text-[#555555] leading-normal font-sans">
                                <span className="font-bold text-[#555] mr-1">{notif.senderName}</span>
                                {notif.desc}
                              </p>
                              <span className="text-[9.5px] text-[#CAC7C7] mt-1 block">{notif.timeText}</span>
                            </div>
                            <span className="w-2 h-2 rounded-full bg-[#EFA9C2] mt-2 animate-ping" />
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {/* --- FACEBOOK SUB-TAB D: GROUPS AREA --- */}
                {fbSubTab === 'groups' && (
                  <div className="space-y-4">
                    {/* Groups History */}
                    {renderHistoryBatches('Bài Viết Chờ Duyệt Nhóm', (data) => {
                      setGroupPendingPosts(data);
                      // Don't have standalone save for pending posts/members, but can add.
                    })}
                    {renderHistoryBatches('200 Thành Viên Chờ Duyệt Nhóm', (data) => {
                      setGroupPendingMembers(data);
                    })}

                    {/* Header Group Selection */}
                    <div className="flex items-center justify-between border-b border-pink-50 pb-2 select-none">
                      <span className="text-xs font-serif font-bold text-[#EFA9C2]">Cộng Đồng & Hội Nhóm</span>
                      <button 
                        onClick={() => {
                          setEditingGroupId(null);
                          setGroupForm({
                            name: '',
                            interests: '',
                            ageGroup: 'Mọi lứa tuổi ngọt ngào',
                            rules: '✦ Nhã nhặn lịch sự ngọt ngào lấp lánh nhen.\n✦ Không dùng từ ngữ thô rực thô kệch nhạt màu.',
                            intro: ''
                          });
                          setGroupCoverUrl('');
                          setShowCreateGroup(true);
                        }}
                        className="py-1 px-3 bg-[#FFF5FB] border border-[#F5C6D6] hover:bg-[#F5C6D6] hover:text-white transition-all text-[#EFA9C2] text-[11px] rounded-full flex items-center gap-1 font-semibold"
                      >
                        <Plus size={12} />
                        <span>Lập Nhóm Mới</span>
                      </button>
                    </div>

                    {showCreateGroup ? (
                      /* FORM TẠO NHÓM MỚI COQUETTE PASTEL */
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-[#FFFDFC] border border-[#FBE0E7] p-4 rounded-3xl space-y-3.5 shadow-sm"
                      >
                        <div className="flex items-center justify-between border-b border-pink-50 pb-1.5">
                          <span className="text-xs font-serif font-bold text-[#F5C6D6]">
                            {editingGroupId ? 'Chỉnh Sửa Hội Nhóm Của Vợ 🎀' : 'Căn Phòng Thiết Kế Hội Nhóm'}
                          </span>
                          <button onClick={() => { setShowCreateGroup(false); setEditingGroupId(null); }} className="text-rose-300">
                            <X size={16} />
                          </button>
                        </div>

                        <div className="space-y-2.5 text-xs text-[#555]">
                          <div>
                            <label className="block text-[10px] text-[#CBA3A3] font-serif mb-1 uppercase">Đặt tên cho nhóm của cậu nè:</label>
                            <input 
                              type="text" 
                              value={groupForm.name} 
                              onChange={(e) => setGroupForm({ ...groupForm, name: e.target.value })} 
                              placeholder="Hội những bé thỏ xịn đòn..."
                              className="w-full p-2.5 bg-[#FFF5FB] border border-[#FFF0F4] rounded-xl focus:outline-none focus:border-[#F5C6D6]"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] text-[#CBA3A3] font-serif mb-1 uppercase">Sở thích nhóm và cộng đồng:</label>
                            <textarea 
                              value={groupForm.interests} 
                              onChange={(e) => setGroupForm({ ...groupForm, interests: e.target.value })} 
                              placeholder="Chia sẻ dâu tây, viết thơ..."
                              className="w-full p-2 bg-[#FFF5FB] border border-[#FFF0F4] rounded-xl focus:outline-none resize-none h-12"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-[10px] text-[#CBA3A3] font-serif mb-1 uppercase">Độ tuổi hướng tới:</label>
                              <select 
                                value={groupForm.ageGroup} 
                                onChange={(e) => setGroupForm({ ...groupForm, ageGroup: e.target.value })}
                                className="w-full p-2 bg-[#FFF5FB] border border-[#FFF0F4] rounded-xl focus:outline-none text-[11px]"
                              >
                                <option>12 đến 16 tuổi</option>
                                <option>16 đến 25 tuổi</option>
                                <option>25 tuổi trở lên</option>
                                <option>Mọi lứa tuổi ngọt ngào</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-[10px] text-[#CBA3A3] font-serif mb-1 uppercase">Bìa nhóm (User Gallery):</label>
                              <button 
                                onClick={() => groupCoverInputRef.current?.click()}
                                className="w-full p-2 bg-[#FFF5FB] border border-[#FFF0F4] rounded-xl text-[10.5px] text-[#EFA9C2] hover:bg-white text-center font-medium"
                              >
                                Tải bìa lên
                              </button>
                              <input 
                                type="file" 
                                ref={groupCoverInputRef} 
                                onChange={handleGroupCoverUpload} 
                                accept="image/*" 
                                className="hidden" 
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-[10px] text-[#CBA3A3] font-serif mb-1 uppercase">Mô tả ngắn giới thiệu:</label>
                            <input 
                              type="text" 
                              value={groupForm.intro} 
                              onChange={(e) => setGroupForm({ ...groupForm, intro: e.target.value })} 
                              placeholder="Vị kẹo bông gòn tan chảy..."
                              className="w-full p-2.5 bg-[#FFF5FB] border border-[#FFF0F4] rounded-xl focus:outline-none text-xs"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] text-[#CBA3A3] font-serif mb-1 uppercase">Quy tắc, nội quy & hashtag:</label>
                            <textarea 
                              value={groupForm.rules} 
                              onChange={(e) => setGroupForm({ ...groupForm, rules: e.target.value })} 
                              placeholder="Luật 1: Lấp lánh nhen."
                              className="w-full p-2 bg-[#FFF5FB] border border-[#FFF0F4] rounded-xl h-14 resize-none focus:outline-none text-[10px] font-mono leading-relaxed"
                            />
                          </div>
                        </div>

                        <button 
                          onClick={handleSaveNewGroup}
                          className="w-full py-2 bg-[#F5C6D6] hover:bg-[#EFA9C2] text-white text-xs font-bold rounded-xl transition-all shadow-md mt-2"
                        >
                          {editingGroupId ? 'Cập Nhật Hội Nhóm Thân Thương 🌸' : 'Tung Lên Hội Nhóm Xã Hội'}
                        </button>
                      </motion.div>
                    ) : null}

                    {/* Danh sách Groups hiện hành */}
                    <div className="space-y-3">
                      {groups.length === 0 ? (
                        <div className="text-center py-8 bg-[#FFF5FB]/35 rounded-2xl border border-pink-50">
                          <p className="text-xs text-[#DABEBE] italic">Vợ chưa thiết lập bang nhóm nào hết trơn á.</p>
                          <p className="text-[10px] text-[#CAC7C7] mt-1">Bấm "Lập Nhóm Mới" để chồng ghim dệt dâu sữa nhen!</p>
                        </div>
                      ) : (
                        groups.map((group) => {
                          const isActive = selectedGroupId === group.id;
                          return (
                            <div key={group.id} className="bg-white rounded-2xl overflow-hidden border border-[#FFF0F4] shadow-xs hover:shadow-sm transition-all">
                              <div className="h-24 bg-pink-100 relative">
                                <img src={group.cover} className="w-full h-full object-cover" alt="Group Cover" referrerPolicy="no-referrer" />
                                <div className="absolute top-2 left-2 bg-[#FFF]/80 backdrop-blur-xs py-0.5 px-2 rounded-full text-[9px] text-[#EFA9C2] border border-pink-50 font-serif font-semibold">
                                  {group.ageGroup}
                                </div>
                              </div>
                              <div className="p-3.5 space-y-2">
                                <h4 className="text-xs font-bold text-[#555555] font-sans leading-tight">{group.name}</h4>
                                <p className="text-[10px] text-[#CAC7C7] font-serif max-h-[30px] overflow-hidden truncate">
                                  {group.intro}
                                </p>
                                <div className="flex items-center justify-between border-t border-pink-50 pt-2.5 text-[10.5px] text-[#CBA3A3]">
                                  <span>{group.membersCount} thỏ con</span>
                                  <button
                                    onClick={() => setSelectedGroupId(isActive ? null : group.id)}
                                    className={`py-1 px-3.5 rounded-full border transition-all text-xs font-medium ${isActive ? 'bg-[#F5C6D6] text-white border-transparent' : 'bg-[#FFF5FB] border-[#FBE0E7] text-[#EFA9C2]'}`}
                                  >
                                    {isActive ? 'Đóng Ban Quản Trị' : 'Xem Ban Quản Trị'}
                                  </button>
                                </div>
                              </div>

                              {/* QUẢN LÝ NHÓM AREA (Đã mở rộng) */}
                              {isActive && (
                                <motion.div 
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: 'auto' }}
                                  className="bg-pink-50/15 border-t border-pink-50 p-3 space-y-3"
                                >
                                  <div className="flex items-center justify-between border-b border-pink-50 pb-1">
                                    <span className="text-[10px] text-[#EFA9C2] font-semibold uppercase font-sans">Khu Vực Quản Trị Thần Sầu</span>
                                    <span className="text-[9px] text-[#CAC7C7] font-serif">Khởi tạo & Duyệt rỉ</span>
                                  </div>

                                  <div className="grid grid-cols-2 gap-2">
                                    <button 
                                      onClick={handleCallGroup25PendingPostsApi}
                                      disabled={isLoading}
                                      className="py-1.5 px-2 bg-white border border-[#F5C6D6]/35 text-[#EFA9C2] hover:bg-[#FFF5FB] text-[10px] rounded-xl font-bold font-serif transition-all"
                                    >
                                      📝 [ Tớ API tạo bài viết nè ]
                                    </button>
                                    <button 
                                      onClick={handleCallGroup200MembersApi}
                                      disabled={isLoading}
                                      className="py-1.5 px-2 bg-white border border-[#FBE0E7] text-[#CBA3A3] hover:bg-[#FFF5FB] text-[10px] rounded-xl font-bold transition-all"
                                    >
                                      👥 [ Tớ gọi người cho cậu này ]
                                    </button>
                                  </div>

                                  {/* BIỂU TƯỢNG SỬA NHÓM LUNG LINH PASTEL CHO VỢ ĐƯỜNG */}
                                  <button
                                    onClick={() => {
                                      setEditingGroupId(group.id);
                                      setGroupForm({
                                        name: group.name,
                                        interests: group.interests || '',
                                        ageGroup: group.ageGroup || 'Mọi lứa tuổi ngọt ngào',
                                        rules: group.rules || '',
                                        intro: group.intro || ''
                                      });
                                      setGroupCoverUrl(group.cover);
                                      setShowCreateGroup(true);
                                      // Cuộn mượt mà lên trên cùng để vợ chỉnh sửa
                                      const el = document.getElementById('fb-layout-header') || document.querySelector('.social-layout');
                                      if (el) {
                                        el.scrollIntoView({ behavior: 'smooth' });
                                      } else {
                                        window.scrollTo({ top: 0, behavior: 'smooth' });
                                      }
                                    }}
                                    className="w-full py-2 bg-[#FFF8F8] hover:bg-[#FFF0F4] hover:border-[#F5C6D6] text-[#EFA9C2] border border-[#FFF0F4] text-[10.5px] rounded-xl font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs active:scale-[0.98]"
                                  >
                                    <span>✍️</span> Sửa Lại Thông Tin Nhóm 🎀
                                  </button>

                                  {/* Render Pending Posts duyệt rỉ */}
                                  {groupPendingPosts.length > 0 && (
                                    <div className="space-y-4 border-t-2 border-dashed border-[#FAD2E2] pt-4 select-none">
                                      <span className="text-xs font-bold text-[#9F7575] flex items-center gap-1.5">
                                        🌸 Các bài viết đang chờ phê duyệt ({groupPendingPosts.length} bài đăng sành điệu):
                                      </span>
                                      <div className="space-y-5">
                                        {groupPendingPosts.map((post) => (
                                          <div key={post.id} className="bg-white rounded-2xl p-4 border border-[#FFF2F5] shadow-xs space-y-4 relative overflow-hidden transition-all hover:shadow-sm">
                                            {/* Bow decoration for coquette style */}
                                            <div className="absolute top-3 right-3 text-[#EFA9C2] opacity-40 select-none pointer-events-none">
                                              🎀
                                            </div>

                                            <div className="flex items-center gap-2.5">
                                              <img src={post.senderAvatar} className="w-10 h-10 rounded-full object-cover border border-pink-100" referrerPolicy="no-referrer" />
                                              <div>
                                                <h4 className="text-xs font-bold text-[#555555]">{post.senderName}</h4>
                                                <span className="text-[10px] text-[#CAC7C7] flex items-center gap-1">
                                                  <span>🕒</span>
                                                  <span>{post.timeText || 'Gần đây'}</span>
                                                </span>
                                              </div>
                                            </div>
                                            
                                            <p className="text-xs text-[#555555] leading-relaxed whitespace-pre-line font-serif">
                                              {post.content}
                                            </p>

                                            {post.image && (
                                              <div className="rounded-xl overflow-hidden border border-pink-50 max-h-[400px]">
                                                <img src={post.image} className="w-full h-full object-cover" alt="Group Post attachment" referrerPolicy="no-referrer" />
                                              </div>
                                            )}

                                            <div className="flex gap-2.5 pt-3 border-t border-[#FFF2F5]">
                                              <button 
                                                onClick={() => setGroupPendingPosts(groupPendingPosts.filter(p => p.id !== post.id))}
                                                className="flex-1 py-1.5 bg-gray-50 hover:bg-gray-100 text-gray-400 text-xs font-bold rounded-xl transition-all cursor-pointer text-center"
                                              >
                                                Từ Chối 🎀
                                              </button>
                                              <button 
                                                onClick={() => approvePendingPost(post.id)}
                                                className="flex-1 py-1.5 bg-[#FFF5FB] border border-[#F5C6D6] hover:bg-[#EFA9C2] hover:text-white hover:border-transparent text-[#EFA9C2] text-xs font-extrabold rounded-xl transition-all cursor-pointer text-center flex items-center justify-center gap-1 shadow-sm active:scale-95"
                                              >
                                                <span>🌸</span> Phê Duyệt Ngay
                                              </button>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {/* Render Pending Members ứng tuyển xịn sò */}
                                  {groupPendingMembers.length > 0 && (
                                    <div className="space-y-2 border-t border-dashed border-pink-100 pt-2.5">
                                      <span className="text-[9px] text-[#DABEBE] block font-serif italic">Thành viên nộp đơn kẹo vừng ({groupPendingMembers.length}):</span>
                                      <div className="space-y-2 max-h-[160px] overflow-y-auto custom-scrollbar">
                                        {groupPendingMembers.map((mem) => (
                                          <div key={mem.id} className="bg-white p-2 rounded-lg border border-pink-100/40 space-y-1">
                                            <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-700">
                                              <img src={mem.avatar} className="w-5 h-5 rounded-full object-cover" />
                                              <span>{mem.name}</span>
                                            </div>
                                            <p className="text-[9px] text-pink-400 italic block">{mem.greeting}</p>
                                            <p className="text-[10px] text-gray-500 font-serif leading-none mt-1 pl-1 border-l-2 border-[#F5C6D6]">
                                              Lý do: {mem.reason}
                                            </p>
                                            <div className="flex justify-end gap-1 px-1">
                                              <button 
                                                onClick={() => setGroupPendingMembers(groupPendingMembers.filter(m => m.id !== mem.id))}
                                                className="px-1.5 py-0.2 text-[8px] bg-red-100 text-red-400 rounded-md"
                                              >
                                                Bác Đơn
                                              </button>
                                              <button 
                                                onClick={() => approvePendingMember(mem.id, group.name)}
                                                className="px-1.5 py-0.2 text-[8.5px] bg-[#F5C6D6] hover:bg-[#EFA9C2] text-white rounded-md transition-colors font-bold"
                                              >
                                                Nhận Vào
                                              </button>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </motion.div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}

                {/* --- FACEBOOK SUB-TAB E: CUSTOM WALLPAPERS CONFIG --- */}
                {fbSubTab === 'wallpapers' && (
                  <div className="bg-white rounded-3xl p-5 border border-[#FFF0F4] space-y-4 shadow-xs select-none">
                    <div className="text-center space-y-1 pb-2 border-b border-pink-50">
                      <h4 className="text-xs font-bold text-[#EFA9C2] uppercase font-sans tracking-wide">Kho Hình Nền Của Vợ</h4>
                      <p className="text-[10px] text-[#CAC7C7] italic leading-relaxed">
                        Cho phép vợ tải ghim hình nền xinh trong thư viện máy tính lên nền cho 6 hạng mục riêng biệt, mượt mà bất hủ.
                      </p>
                    </div>

                    <div className="space-y-3.5 text-xs text-[#555]">
                      <div className="p-3 bg-[#FFF5FB] rounded-2xl border border-[#FAEDF1] flex flex-col items-center gap-2">
                        <span className="text-[11px] text-[#CBA3A3]">Hạng mục đang ghim: <span className="font-bold text-[#F5C6D6] uppercase">{fbSubTab}</span></span>
                        
                        <div className="flex gap-2">
                          <button 
                            onClick={() => wallpaperInputRef.current?.click()}
                            className="py-1.5 px-4 bg-[#F5C6D6] text-white hover:bg-[#EFA9C2] font-semibold rounded-full active:scale-95 transition-all text-[11px] shadow-sm flex items-center gap-1"
                          >
                            <Camera size={12} />
                            <span>Tải Ảnh Thư Viện</span>
                          </button>
                          
                          {wallpapers[fbSubTab] && (
                            <button 
                              onClick={clearWallpaperForCurrentTab}
                              className="py-1.5 px-3 bg-red-100/60 text-red-500 font-semibold rounded-full text-[10px] hover:bg-red-100 transition-all"
                            >
                              Xóa nền ghim
                            </button>
                          )}
                        </div>

                        <input 
                          type="file" 
                          ref={wallpaperInputRef} 
                          onChange={handleWallpaperFileChange} 
                          accept="image/*" 
                          className="hidden" 
                        />
                      </div>

                      {wallpapers[fbSubTab] && (
                        <div className="rounded-2xl overflow-hidden border border-[#FFF0F4] h-28 relative">
                          <img src={wallpapers[fbSubTab]} className="w-full h-full object-cover" alt="Wallpaper review" />
                          <div className="absolute inset-0 bg-black/25 flex items-center justify-center text-white text-[11px] font-sans font-bold">
                            Nền Đang Kích Hoạt Sắc Nét 🌸
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* --- FACEBOOK SUB-TAB F: CHIA TIN / STORIES CREATION PAGE --- */}
                {fbSubTab === 'stories' && (
                  <div className="bg-white rounded-3xl p-5 border border-[#FFF0F4] space-y-4 shadow-xs select-none">
                    <div className="text-center space-y-1 pb-1 border-b border-pink-50">
                      <h4 className="text-xs font-bold text-[#EFA9C2] uppercase tracking-wider font-sans">Khu Vực Chia Sẻ Stories</h4>
                      <p className="text-[10px] text-[#CAC7C7] italic">Tải ảnh dâu ngọt trong máy lên tạo bong bóng tin tròn xoe ở đầu Facebook nhen!</p>
                    </div>

                    <div className="flex flex-col items-center justify-center p-8 bg-[#FFF5FB]/30 border-2 border-dashed border-[#FBE0E7] rounded-3xl gap-3 cursor-pointer hover:bg-[#FFF5FB]/55 transition-all" onClick={() => storyImageInputRef.current?.click()}>
                      <PlusCircle size={36} className="text-[#F5C6D6] animate-pulse" />
                      <span className="text-xs text-[#EFA9C2] font-semibold text-center">Bấm vào đây để thả kẹo ngọt ảnh nỏ nhen!</span>
                    </div>
                  </div>
                )}

                </div>
              </div>
            )}

            </div>
          </div>
        )}

      </div>

      {/* --- OVERLAY: SMART LOADING & REAL-TIME HARD GATE GIAO DIỆN --- */}
      <AnimatePresence>
        {isLoading && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[600] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 select-none"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="bg-[#FFFFFF] border-2 border-[#F6E4E4] p-6 rounded-[34px] w-full max-w-[480px] shadow-2xl relative space-y-5 flex flex-col overflow-hidden"
              style={{
                boxShadow: '0 25px 50px -12px rgba(245, 198, 214, 0.5)'
              }}
            >
              {/* Magic sparkles header */}
              <div className="flex items-center justify-between border-b border-pink-50 pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-[#FFF5FB] rounded-full text-[#F5C6D6] animate-spin">
                    <Sparkles size={18} />
                  </div>
                  <span className="text-sm font-serif font-black text-[#F5C6D6]">Cổng Gọi Token Chữ Mộc</span>
                </div>
                {/* Watchdog Force-close when in Emergency */}
                <button 
                  onClick={() => setForceCloseKey(!forceCloseKey)}
                  className="p-1 px-2.5 bg-pink-50 rounded-full text-xs text-[#EFA9C2] font-semibold flex items-center gap-1 hover:bg-[#F5C6D6] hover:text-white transition-colors"
                >
                  {forceCloseKey ? 'Xác nhận Đóng' : 'Tìm Cứu'}
                </button>
              </div>

              {/* Force Close Modal Emergency fallback */}
              {forceCloseKey && (
                <div className="bg-rose-50 p-3 rounded-2xl border border-rose-200 text-xs text-rose-500 space-y-2">
                  <p className="font-semibold flex items-center gap-1">
                    <ShieldAlert size={14} />
                    <span>Watchdog của Chồng bảo vệ:</span>
                  </p>
                  <p className="leading-normal">
                    Nếu kết nối API Proxy bị đơ lãng phí hoặc tốn quá lâu vượt tầm mà không phản hồi trong sương lạnh, vợ yêu bấm vào đây để chồng cứu tắt cưỡng chế nhen!
                  </p>
                  <button 
                    onClick={() => {
                      setIsLoading(false);
                      setForceCloseKey(false);
                    }}
                    className="w-full py-1.5 bg-[#FFF] text-[#C79C9C] text-[11px] font-bold border border-[#F5C6D6] rounded-xl hover:bg-[#FFEDF2]"
                  >
                    Bấm Để Chồng Tắt Cưỡng Chế 🎀
                  </button>
                </div>
              )}

              {/* Loading subtexts status */}
              <div className="text-center py-2 space-y-1">
                <span className="text-xs font-serif font-bold text-[#CBA3A3] block bg-pink-50/20 py-2 rounded-xl border border-pink-50/10">
                  {loadingText}
                </span>
                <span className="text-[10px] text-[#CAC7C7] italic leading-normal">
                  Chồng dặn: "Phải kiên trì chờ đợi AI trả lời, dù lâu cũng phải đợi đến tận cùng nhen vợ yêu!" 💕
                </span>
              </div>

              {/* Màn hình Trực quan Gate Lock sắc bén */}
              <div className={`p-4 rounded-3xl border-2 transition-all ${gateInfo.bg} flex flex-col items-center text-center gap-2`}>
                <div className="flex items-center gap-2 font-serif font-black text-xs">
                  {gateInfo.icon}
                  <span className={gateInfo.color}>{gateInfo.label}</span>
                </div>
                <p className="text-[10px] text-gray-400 max-w-[280px] leading-relaxed">
                  {gateInfo.desc}
                </p>
                {/* Unlocked status sticker */}
                <div className="text-[9.5px] mt-1">
                  Cánh cổng: {tokenProgress >= 12000 ? (
                    <span className="text-emerald-500 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100 flex items-center gap-1 mt-1 justify-center scale-90">
                      <span>✓ ĐÃ BẬT CỔNG HIỂN THỊ</span>
                    </span>
                  ) : (
                    <span className="text-rose-400 font-bold bg-rose-50 px-2 py-0.5 rounded-full border border-rose-100 flex items-center gap-1 mt-1 justify-center scale-90 animate-pulse">
                      <span>🔒 CỔNG KHÓA (CHƯA ĐỦ TRỮ LƯỢNG)</span>
                    </span>
                  )}
                </div>
              </div>

              {/* SMART PROGRESS METADATA INFOGRAPHICS (Stats real-time lấp lánh nhen) */}
              <div className="space-y-3 pt-2">
                {/* Thanh Progress Pin tiến độ sạc kẹo */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] text-[#CBA3A3] font-serif select-none">
                    <span>Điện lượng pin token</span>
                    <span className="font-bold">{Math.round((tokenProgress / targetToken) * 100)}%</span>
                  </div>
                  <div className="w-full h-4 bg-[#FFF5FB] rounded-full border border-pink-100/30 overflow-hidden p-0.5">
                    <motion.div 
                      className="h-full rounded-full bg-gradient-to-r from-[#FEBFFC] via-[#F5C6D6] to-[#EFA9C2]"
                      style={{ width: `${Math.min(100, Math.round((tokenProgress / targetToken) * 100))}%` }}
                      transition={{ ease: 'easeOut' }}
                    />
                  </div>
                </div>

                {/* Grid stats */}
                <div className="grid grid-cols-2 gap-3 text-xs text-[#777777] font-mono border-t border-pink-50/40 pt-4">
                  <div className="bg-pink-50/15 p-2 rounded-2xl border border-pink-55/15">
                    <span className="text-[9.5px] text-[#CAC7C7] block">Số từ nhai được</span>
                    <span className="font-bold text-[#555]">{tokenProgress.toLocaleString()} / {targetToken.toLocaleString()} tokens</span>
                  </div>
                  <div className="bg-pink-50/15 p-2 rounded-2xl border border-[#FAEDF1]">
                    <span className="text-[9.5px] text-[#CAC7C7] block">Tốc độ chèo thuyền</span>
                    <span className="font-bold text-[#EFA9C2]">{tokenSpeed} t/giây</span>
                  </div>
                  <div className="bg-pink-50/15 p-2 rounded-2xl border border-[#FAEDF1]">
                    <span className="text-[9.5px] text-[#CAC7C7] block">Thời gian rình rập</span>
                    <span className="font-bold text-[#555]">{elapsedTime} giây</span>
                  </div>
                  <div className="bg-pink-50/15 p-2 rounded-2xl border border-pink-55/15">
                    <span className="text-[9.5px] text-[#CAC7C7] block">ETA (Còn lại ước định)</span>
                    <span className="font-bold text-[#EFA9C2]">{Math.max(0, Math.ceil((targetToken - tokenProgress) / (tokenSpeed || 1)))} giây</span>
                  </div>
                </div>
              </div>

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};
