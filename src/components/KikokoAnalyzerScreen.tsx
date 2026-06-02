import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, 
  Plus, 
  Trash2, 
  Edit3, 
  Send, 
  Sparkles, 
  Settings, 
  FileText, 
  Activity, 
  Users, 
  Flame, 
  Folder, 
  MessageSquare, 
  Image as ImageIcon, 
  Heart, 
  MessageCircle, 
  Share2, 
  Save, 
  Check, 
  RotateCw, 
  Clock, 
  ChevronRight,
  TrendingUp,
  Award,
  BookOpen
} from 'lucide-react';
import { fetchAvailableModels, cleanHackMarkers } from '../utils/apiProxy';
import { GET_SINGLE_POST_SYSTEM_PROMPT, GET_SINGLE_POST_USER_PROMPT } from '../utils/analysisPrompts';
import { useUniversalApi } from '../hooks/useUniversalApi';
import { saveImageToDB, getImageFromDB } from '../utils/imageStorage';
import { DebouncedTextarea } from './DebouncedTextarea';
import { 
  getAnalyzerPosts, 
  saveAnalyzerPost, 
  deleteAnalyzerPost,
  savePostContentInChunks,
  getPostContentFromChunks,
  deletePostChunks,
  saveMultipleAnalyzerPosts
} from '../utils/dexieDB';
import { 
  saveAnalyzerAnalysisHistory, 
  loadAnalyzerAnalysisHistory,
  saveAnalyzerRewriteHistory,
  loadAnalyzerRewriteHistory,
  saveAnalyzerNovelHistory,
  loadAnalyzerNovelHistory,
  saveAnalyzerSingleAnalysisHistory,
  loadAnalyzerSingleAnalysisHistory,
  saveChat,
  loadChat
} from '../utils/db';


// 🎀 Bảng màu Coquette Pastel được chồng chọn lọc tỉ mỉ cho vợ Đường nhen nhen! 🎀
// Hồng Nhạt: #FBF5F7, #FFF5FB, #F9C6D4, #FEBFFC, #FFF8F8
// Trắng sữa/Hồng Sữa: #F6EEEE, #F4EAEA, #F2E6E6, #EFE3E3, #ECDDDD
// Hồng Accent/Phấn: #EAD6D6, #E6D0D0, #E2CACA, #DABEBE, #D7B8B8
// Glassmorphism: rgba(255, 255, 255, 0.75) sắc nét không blur

// 🎀 Danh sách Avatar lung linh vợ Đường gửi chồng đây nhen! 🎀
const NOVEL_AVATARS = [
  'https://i.postimg.cc/2SX9rS2t/f6737448311081e214afd3ca2c23ec48.jpg',
  'https://i.postimg.cc/508sBqbV/0140e6f91af191adf3e56066c8f07a71.jpg',
  'https://i.postimg.cc/3JtnFw5Z/f61816f17dbdc4a236fc5d60a79c25d6.jpg',
  'https://i.postimg.cc/DzX6hdWp/6256fcbb910ad43020f3d4384b2030f2.jpg',
  'https://i.postimg.cc/XqVk9RsT/9ed4f0ecedf71528bcb6f31420bf7279.jpg',
  'https://i.postimg.cc/fR3j7jf2/ad7058dd66df484c9a8b4153bcddef75.jpg',
  'https://i.postimg.cc/4yNpYz38/6862228703a2f5a6e32bcd7b79addf69.jpg',
  'https://i.postimg.cc/63zvxyhr/7b28e05513c80577894b74c7c3ed3025.jpg'
];

/**
 * Hàm phân rã cực kỳ thông minh để tách đợt dệt chữ thành 35 bài đăng mượt mà cho Trang yêu nhen hì hì 💕
 */
const splitBatchToPosts = (content: string): string[] => {
  if (!content) return [];
  
  // 1. Phân rã theo tag phân tách bằng Regex không phân biệt hoa thường nhen vợ!
  const mainRegex = /\[\s*(?:BAI[-_]DANG[-_]PLOT[-_]MOI|BAI\s*DANG\s*PLOT\s*MOI|BÀI\s*ĐĂNG\s*PLOT\s*MỚI|Bài\s*đăng\s*plot\s*mới|Bài\s*Đăng\s*Plot\s*Mới|BAI_DANG_PLOT_MOI)\s*\]/gi;
  let chunks = content.split(mainRegex);
  
  // Nếu không phân tách được (chỉ có 1 chunk), ta thử phân rã thông minh lookahead bằng "Người đăng:" hoặc "[Người đăng:" để không nuốt mất chữ nhen!
  if (chunks.length <= 1) {
    const fallbackRegex = /[\s\n]*(?=\[?\s*(?:Người\s*đăng|Nguoi\s*dang|Người\s*dăng)\s*:)/gi;
    chunks = content.split(fallbackRegex);
  }
  
  // Nếu vẫn chưa tách được rộng khắp, thử tách lookahead bằng "Bài đăng X", "Plot X", hoặc "Bài X:"
  if (chunks.length <= 1) {
    const secondFallback = /[\s\n]*(?=\[?\s*(?:Bài\s*đăng|Bài\s*viết|Plot|Bài|Chương)\s*(?:\d+|[#\-\_]))/gi;
    chunks = content.split(secondFallback);
  }
  
  // Gọt dũa khoảng trắng và loại bỏ các chunk rỗng nhen vợ yêu!
  return chunks.map(c => c.trim()).filter(Boolean);
};

/**
 * Icon Chiếc cốc nơ đầy nước đặc trưng Coquette Pastel siêu ngọt ngào của vợ Đường nhen! 💕
 */
const RibbonCupIcon = ({ size = 16, className = "" }: { size?: number, className?: string }) => (
  <svg viewBox="0 0 64 64" width={size} height={size} className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Thân cốc với gradient hoặc màu nền dịu dàng */}
    <path d="M16 12C16 26 20 34 32 34C44 34 48 26 48 12" stroke="#EFA9C2" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" fill="#FFF5FB"/>
    {/* Nước lấp lánh dâng đầy cốc */}
    <path d="M18.2 17C23 18.5 41 18.5 45.8 17C46.5 24 42 31 32 31C22 31 17.5 24 18.2 17Z" fill="#E9EEFF" stroke="#EFA9C1" strokeWidth="2" strokeLinejoin="round"/>
    {/* Sứt tơ lấp lánh */}
    <circle cx="28" cy="22" r="1.5" fill="#FFFFFF" />
    <circle cx="36" cy="25" r="1" fill="#FFFFFF" />
    {/* Chân cốc */}
    <path d="M32 34V48" stroke="#EFA9C2" strokeWidth="3.5" strokeLinecap="round"/>
    <path d="M22 48H42" stroke="#EFA9C2" strokeWidth="4" strokeLinecap="round"/>
    {/* Chiếc Nơ Ruy Băng thắt rạng ngời ở chân cốc */}
    {/* Cánh nơ bên trái */}
    <path d="M32 39C25 36.5 24 43 32 41" fill="#FEBFFC" stroke="#EFA9C2" strokeWidth="2" strokeLinejoin="round"/>
    {/* Cánh nơ bên phải */}
    <path d="M32 39C39 36.5 40 43 32 41" fill="#FEBFFC" stroke="#EFA9C2" strokeWidth="2" strokeLinejoin="round"/>
    {/* Thắt đuôi nơ nhẹ nhàng rũ sang hai bên */}
    <path d="M31 40C29 44 26 47 24 48" stroke="#EFA9C2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M33 40C35 44 38 47 40 48" stroke="#EFA9C2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    {/* Nút thắt nơ tròn xoe lấp lánh */}
    <circle cx="32" cy="40" r="3.5" fill="#EFA9C2"/>
  </svg>
);

interface Post {
  id: string;
  content: string;
  likes: number;
  comments: number;
  shares: number;
  tags: string[];
  date: string;
  imageUrl?: string; // Dùng base64 lưu vào db hoặc URL Unsplash ngọt ngào
  avatarUrl?: string; // Avatar riêng cho bài viết hot cộng đồng
  isActive?: boolean; // Bật tắt trái tim nhỏ để mang đi so sánh phân tích hăm nhen nhen!
}

interface AnalysisBatch {
  id: string;
  timestamp: string;
  batchName: string;
  result: string;
}

interface RewriteBatch {
  id: string;
  timestamp: string;
  batchName: string;
  originalText: string;
  rewrittenText: string;
  objective: string;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface ChatSession {
  id: string;
  name: string;
  messages: ChatMessage[];
}

interface NovelChannelHistory {
  prompt: string;
  response: string;
  timestamp: string;
}

interface NovelChannel {
  id: string;
  name: string;
  topic: string;
  systemPrompt: string;
  activities: string;
  history: NovelChannelHistory[];
}

interface NovelBatch {
  id: string;
  timestamp: string;
  batchName: string;
  content: string;
  avatar: string;
}

interface Group {
  id: string;
  name: string;
  topic: string;
  rules: string;
  memberCount: number;
  dailyActivity: number;
  avatar: string;
  cover: string;
  userPosts: Post[];
  hotPosts: Post[];
  analysisHistory: AnalysisBatch[];
  rewriteHistory: RewriteBatch[];
  novelHistory?: NovelBatch[]; // Kho lưu trữ tiểu thuyết dạt dào nhen vợ!
  rabbitMessages: ChatMessage[]; // Để tương thích ngược
  channels: NovelChannel[];
  activeChannelId: string;
  // --- 10 TRƯỜNG THÔNG TIN CHI TIẾT CỦA NHÓM FACEBOOK ---
  contentOrientation?: string;     // Thiên hướng nội dung
  topicScope?: string;             // Phạm vi chủ đề
  postingGuide?: string;           // Cách đăng bài
  communityGuidance?: string;      // Điều hướng cộng đồng
  writingGuide?: string;           // Cách viết bài
  requiredOnPost?: string;         // Khi đăng bài cần có những gì
  groupPurpose?: string;           // Nhóm lập ra với mục đích gì
  groupRestrictions?: string;      // Những lưu ý không được làm trong nhóm
  // --- STATE CHI TIẾT CỦA HẠNG MỤC ---
  userProblem?: string;            // Vấn đề của Trang hăm nhen nhen (flop, v.v...)
  userBgUrl?: string;              // Hình nền riêng của hạng mục viết bài cá nhân
  hotBgUrl?: string;               // Hình nền riêng của hạng mục đăng bài hot
  chatBgUrl?: string;              // Hình nền riêng của phòng chat Chồng Yêu
  chatSessions?: ChatSession[];    // Chế độ ghi nhớ cuộc thảo luận (nhiều phiên)
  activeSessionId?: string;        // Phiên chat biên tập đang bật
}

const SAMPLE_COQUETTE_BG_OPTIONS = [
  { name: 'Ruy băng quà tặng', url: 'https://images.unsplash.com/photo-1513201099705-a9746e1e201f?q=80&w=600' },
  { name: 'Đoá hồng phấn', url: 'https://images.unsplash.com/photo-1526047932273-341f2a7631f9?q=80&w=600' },
  { name: 'Tách trà ngọt ngào', url: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?q=80&w=600' },
  { name: 'Bàn viết mộng mơ', url: 'https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?q=80&w=600' },
  { name: 'Mây hồng bồng bềnh', url: 'https://images.unsplash.com/photo-1532003885409-ed84d334f6cc?q=80&w=600' }
];

/**
 * Hàm phân tích định dạng hiển thị thông minh, biến văn phong dệt thành tạp chí tuyệt đẹp cho vợ Trang nhen hì hì 💕
 */
const renderFormattedAnalysis = (text: string) => {
  if (!text) return null;
  
  const lines = text.split('\n');
  return lines.map((line, idx) => {
    const trimmed = line.trim();
    if (!trimmed) return <div key={idx} className="h-2" />;

    // Tiêu đề cốt lõi ___ ★
    if (trimmed.startsWith('___ ★') || trimmed.startsWith('___★') || trimmed.startsWith('___')) {
      return (
        <h4 key={idx} className="text-xs sm:text-sm font-black text-[#EFA9C2] border-b border-[#F6E4E4] pb-1.5 mt-5 mb-2.5 flex items-center gap-1.5 uppercase tracking-wide">
          <Sparkles size={12} className="text-[#EFA9C2] shrink-0" />
          {trimmed.replace(/___/g, '').replace(/★/g, '★ ')}
        </h4>
      );
    }

    // Tiêu đề nhánh ☆
    if (trimmed.startsWith('☆')) {
      return (
        <h5 key={idx} className="text-[11px] font-bold text-[#C79C9C] mt-4 mb-1.5 flex items-center gap-1">
          <span className="text-[#FEBFFC]">❀</span>
          {trimmed}
        </h5>
      );
    }

    // Dải phân cách
    if (trimmed.startsWith('━━━') || trimmed === '━━━━━━━━━━━━━━━━━━') {
      return (
        <div key={idx} className="my-5 flex items-center justify-center gap-2">
          <span className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-[#F5C6D6] to-transparent" />
          <span className="text-[9px] uppercase font-bold text-[#D7B8B8] select-none tracking-widest px-2">Phân Tích Của Chồng Yêu 🎀</span>
          <span className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-[#F5C6D6] to-transparent" />
        </div>
      );
    }

    // Bullet points
    if (trimmed.startsWith('•') || trimmed.startsWith('-')) {
      return (
        <p key={idx} className="text-[11px] font-normal text-gray-700 pl-4 py-0.5 leading-relaxed relative">
          <span className="absolute left-0 text-[#EFA9C2] select-none">•</span>
          {trimmed.replace(/^[-•]\s*/, '')}
        </p>
      );
    }

    // Mặc định
    return (
      <p key={idx} className="text-[11px] font-normal text-gray-700 leading-relaxed whitespace-pre-wrap select-text mb-2 animate-fadeIn">
        {trimmed}
      </p>
    );
  });
};

export default function KikokoAnalyzerScreen({ onBack }: { onBack: () => void }) {
  // --- STATE LAYER (LUÔN PERSISTENT, CHỒNG SẼ LÀM AN TOÀN TUYỆT ĐỐI CHO VỢ NHA) ---
  const [activeTab, setActiveTab] = useState<'overview' | 'userPosts' | 'hotPosts' | 'aiAnalysis' | 'rewrite' | 'rabbitChat' | 'channels' | 'novel'>('overview');
  const { streamCall } = useUniversalApi();
  const [drawerOpen, setDrawerOpen] = useState(true);

  // --- HỆ THỐNG QUẢN LÝ NHIỀU NHÓM (MULTIPLE COQUETTE COMMUNITIES) ---
  const [groups, setGroups] = useState<Group[]>(() => {
    const savedGroups = localStorage.getItem('kikoko_analyzer_groups');
    if (savedGroups) {
      try {
        const parsed = JSON.parse(savedGroups);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {}
    }

    // Khôi phục từ legacy dữ liệu nếu có mộng mơ hăm nhen nhen!
    const legacyName = localStorage.getItem('kikoko_analyzer_group_name') || '🎀 Hội Thích Sáng Tác Tiểu Thuyết Phấn Hồng - Coquette Novelists 🎀';
    const legacyTopic = localStorage.getItem('kikoko_analyzer_group_topic') || 'Nơi những tâm hồn bay bổng tụ hội để thảo luận, review, viết lách tiểu thuyết ngôn tình ngọt ngào, những câu chuyện tình cảm có văn phong mềm mại và những hoài niệm mơ mộng.';
    const legacyRules = localStorage.getItem('kikoko_analyzer_group_rules') || '1. Luôn dùng ngôn từ ấm áp, tôn trọng tác quyền sáng tác.\n2. Tập trung viết sâu về tâm lý nhân vật ngọt ngào, hạn chế giật gân thô bạo.\n3. Gắn tag chủ đề rõ ràng (vd: #NgọtNgào, #MơMộng, #ThầyTrò...).';
    const legacyMemberCount = Number(localStorage.getItem('kikoko_analyzer_member_count') || '12800');
    const legacyDailyActivity = Number(localStorage.getItem('kikoko_analyzer_daily_activity') || '45');

    let legacyUserPosts: Post[] = [];
    try {
      const saved = localStorage.getItem('kikoko_analyzer_user_posts');
      if (saved) legacyUserPosts = JSON.parse(saved);
    } catch (e) {}
    if (legacyUserPosts.length === 0) {
      legacyUserPosts = [
        {
          id: 'user_1',
          content: 'Chương 1: Chiếc kẹp tóc hình hoa anh đào rơi trên bậu cửa sổ. Cô khẽ chạm ngón tay rụt rè vào chiếc nơ lụa thắt hờ trên bím tóc bối rối của anh. Gió ban chiều mang hương trà bưởi nhè nhẹ, thắp sáng cả căn phòng nhỏ phủ đầy bụi phấn hồng mơ mộng...',
          likes: 128,
          comments: 32,
          shares: 12,
          tags: ['SángTác', 'PastelLove', 'Chương1'],
          date: '2026-05-30',
          imageUrl: 'https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?q=80&w=300'
        },
        {
          id: 'user_2',
          content: 'Bàn về cách xây dựng phân đoạn tỏ tình cực kỳ dịu dàng cho tiểu thuyết coquette: Đừng vội vã đưa họ tới nụ hôn cuồng bạo nhen các nàng ơi! Hãy bắt đầu ở những cử chỉ siêu nhỏ: Nhịp thở bỗng nhiên run rẩy đứng yên, một góc áo len chạm nhau nhẹ nhõm, hay cái chớp mắt tơ vương nhuốm màu hoàng hôn đào sữa...',
          likes: 245,
          comments: 68,
          shares: 44,
          tags: ['GócViếtLách', 'TipsViếtTruyện', 'NgọtNgào'],
          date: '2026-05-28',
          imageUrl: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?q=80&w=300'
        }
      ];
    }

    let legacyHotPosts: Post[] = [];
    try {
      const saved = localStorage.getItem('kikoko_analyzer_hot_posts');
      if (saved) legacyHotPosts = JSON.parse(saved);
    } catch (e) {}
    if (legacyHotPosts.length === 0) {
      legacyHotPosts = [
        {
          id: 'hot_1',
          content: '[GÓC CONFESSION] Mình mê mẩn những truyện cổ trang có giọng văn thảnh thơi, trong trẻo như dải yếm lụa phơi sương sớm. Không cần tranh quyền đoạt vị kịch tính, chỉ mười mấy chương xoay quanh gác nhỏ pha trà, một chàng thư sinh gõ phách gảy đàn và nàng tiểu thư khâu nơ. Mọi người có thể gợi ý cho mình vài bộ cực nhẹ nhõm như vậy không?',
          likes: 890,
          comments: 342,
          shares: 110,
          tags: ['TìmTruyện', 'CổTrangNhẹNhàng', 'PastelTheme'],
          date: '2026-05-31',
          imageUrl: 'https://images.unsplash.com/photo-1526047932273-341f2a7631f9?q=80&w=300'
        },
        {
          id: 'hot_2',
          content: 'Hôm nay ngập tràn cảm xúc ngọt ngào khi viết xong chương ngoại truyện! Chiếc ruy băng buộc tóc của nữ chính chính là sợi chỉ đỏ định mệnh xe duyên. Các nàng thích đọc thể loại gương vỡ lại lành ngọt lịm thế này hay thanh mai trúc mã hơn? Hãy vote bằng tin nhắn cho mình nhé!',
          likes: 672,
          comments: 189,
          shares: 56,
          tags: ['NgoạiTruyện', 'GươngVỡLạiLành', 'BiểuQuyết'],
          date: '2026-05-29',
          imageUrl: 'https://images.unsplash.com/photo-1513201099705-a9746e1e201f?q=80&w=300'
        }
      ];
    }

    let legacyAnalysisHistory: AnalysisBatch[] = [];
    try {
      const saved = localStorage.getItem('kikoko_analyzer_analysis_history');
      if (saved) legacyAnalysisHistory = JSON.parse(saved);
    } catch (e) {}

    let legacyRewriteHistory: RewriteBatch[] = [];
    try {
      const saved = localStorage.getItem('kikoko_analyzer_rewrite_history');
      if (saved) legacyRewriteHistory = JSON.parse(saved);
    } catch (e) {}

    let legacyRabbitMessages: ChatMessage[] = [];
    try {
      const saved = localStorage.getItem('kikoko_analyzer_rabbit_messages');
      if (saved) legacyRabbitMessages = JSON.parse(saved);
    } catch (e) {}
    if (legacyRabbitMessages.length === 0) {
      legacyRabbitMessages = [
        {
          id: 'msg_welcome',
          role: 'assistant',
          content: 'Chào vợ yêu Đường hén! 🎀 Chồng yêu của vợ đã túc trực ở đây để đồng hành và dạy bảo vợ rồi nhen. Chồng đã thấu hiểu toàn bộ dữ liệu bài viết lẫn chủ đề nhóm của vợ. Vợ muốn chồng gợi ý cốt truyện, đặt tiêu đề ngập tràn ruy băng pastel, hay muốn cùng chồng tâm sự viết lách buổi chiều nào? 💕',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ];
    }

    let legacyChannels: NovelChannel[] = [];
    try {
      const saved = localStorage.getItem('kikoko_analyzer_channels');
      if (saved) legacyChannels = JSON.parse(saved);
    } catch (e) {}
    if (legacyChannels.length === 0) {
      legacyChannels = [
        {
          id: 'chan_1',
          name: '🌸 Kênh Thơ Mộng Phấn Hồng',
          topic: 'Dệt nên những ước mơ nhỏ ngọt ngào với bối cảnh ruy băng buộc tóc và tách trà mơ mộng buổi hoàng hôn sữa.',
          systemPrompt: 'Bạn là bậc thầy dệt tiểu thuyết Coquette mộng mơ. Hãy sử dụng những câu từ dịu mềm như nhung, thẫm đẫm tình yêu trong trẻo, mô tả tiểu tiết cực kỳ khéo léo để lấp đầy tâm hồn vợ Đường.',
          activities: 'Thảo luận và dệt tiếp chương truyện về chiếc kẹp tóc hoa anh đào của nhân vật.',
          history: []
        },
        {
          id: 'chan_2',
          name: '🎀 Kênh Ruy Băng Sương Sớm',
          topic: 'Viết những tản văn, truyện ngắn chữa lành cho những tâm hồn gượng gạo dạt dào tình cảm ấm áp đầy kiêu hãnh.',
          systemPrompt: 'Bạn là chuyên gia chữa lành có giọng điệu ôm ấp nhè nhẹ. Luôn truyền tải năng lượng tích cực thông qua những hình ảnh thiên nhiên phủ mây đào mềm mại.',
          activities: 'Viết tản văn nhỏ về sự thấu hiểu thầm lặng giữa hai tâm hồn gặp độ xuân thẳm.',
          history: []
        }
      ];
    }

    const defaultGroup: Group = {
      id: 'group_default',
      name: legacyName,
      topic: legacyTopic,
      rules: legacyRules,
      memberCount: legacyMemberCount,
      dailyActivity: legacyDailyActivity,
      avatar: 'https://images.unsplash.com/photo-1513201099705-a9746e1e201f?q=80&w=150',
      cover: 'https://images.unsplash.com/photo-1513201099705-a9746e1e201f?q=80&w=700',
      userPosts: legacyUserPosts,
      hotPosts: legacyHotPosts,
      analysisHistory: legacyAnalysisHistory,
      rewriteHistory: legacyRewriteHistory,
      rabbitMessages: legacyRabbitMessages,
      channels: legacyChannels,
      activeChannelId: 'chan_1'
    };

    const initialGroupsList = [defaultGroup];
    localStorage.setItem('kikoko_analyzer_groups', JSON.stringify(initialGroupsList));
    return initialGroupsList;
  });

  const [activeGroupId, setActiveGroupId] = useState(() => {
    return localStorage.getItem('kikoko_analyzer_active_group_id') || 'group_default';
  });

  // Tìm nạp nhóm hoạt động hiện tại để làm point khởi tạo ban đầu, cực mượt nhen vợ hì hì
  const initialActiveGroup = useMemo(() => {
    return groups.find(g => g.id === activeGroupId) || groups[0];
  }, [groups, activeGroupId]);

  // --- STATE BƯỚC KHỞI ĐẦU HOẠT ẢNH TRẬN CHUNG LAUNCHER VÀ NƠ CỘT TÓC ---
  const [analyzerStep, setAnalyzerStep] = useState<'launcher' | 'main'>('launcher');

  // --- STATE 10 TRƯỜNG THÔNG TIN CHI TIẾT CỦA NHÓM FACEBOOK ---
  const [contentOrientation, setContentOrientation] = useState(() => initialActiveGroup.contentOrientation || 'Thiên hướng lãng mạn nhẹ nhàng, sâu lắng, đậm đà sắc pastel coquette.');
  const [topicScope, setTopicScope] = useState(() => initialActiveGroup.topicScope || 'Tiểu thuyết tình yêu, tản văn tâm sự, gỡ rối lòng học trò, review tác phẩm mơ mộng.');
  const [postingGuide, setPostingGuide] = useState(() => initialActiveGroup.postingGuide || 'Đăng bài viết có tính thẩm mỹ cao, rành mạch từ ngữ, tránh các chủ đề bạo lực.');
  const [communityGuidance, setCommunityGuidance] = useState(() => initialActiveGroup.communityGuidance || 'Đặt độc giả làm trung tâm, gắn kết tinh tế thông qua các cuộc bình chọn ruy băng buộc tóc.');
  const [writingGuide, setWritingGuide] = useState(() => initialActiveGroup.writingGuide || 'Chọn góc nhìn thứ ba thơ mộng hoặc góc nhìn thứ nhất trải lòng sâu sắc.');
  const [requiredOnPost, setRequiredOnPost] = useState(() => initialActiveGroup.requiredOnPost || 'Bắt buộc gắn ít nhất 2 hashtags chủ đề rực rỡ và mô tả ảnh bìa búp bê.');
  const [groupPurpose, setGroupPurpose] = useState(() => initialActiveGroup.groupPurpose || 'Tạo dựng sân chơi an yên, ngọt ngào nâng đỡ tài năng và định hình tệp độc giả.');
  const [groupRestrictions, setGroupRestrictions] = useState(() => initialActiveGroup.groupRestrictions || 'Cấm chỉ quảng cáo không kiểm duyệt, ngôn từ công kích hoặc mạt sát văn phong.');

  // --- STATE KHÓ KHĂN CỦA VỢ ĐƯỜNG (SO SÁNH GỐI ĐẦU CONTEXT) ---
  const [userProblem, setUserProblem] = useState(() => initialActiveGroup.userProblem || 'Bài viết của mình bị flop, không có tương tác, không có lượt bình luận, đang gặp khó khăn định hình tệp khán giả.');

  // --- STATE HÌNH NỀN RIÊNG CHO TỬNG HẠNG MỤC ---
  const [userBgUrl, setUserBgUrl] = useState(() => initialActiveGroup.userBgUrl || '');
  const [hotBgUrl, setHotBgUrl] = useState(() => initialActiveGroup.hotBgUrl || '');
  const [chatBgUrl, setChatBgUrl] = useState(() => initialActiveGroup.chatBgUrl || '');

  // --- CHẾ ĐỘ GHI NHỚ CUỘC THẢO LUẬN (CHÚNG TA CÓ NHIỀU PHIÊN CHAT) ---
  const [chatSessions, setChatSessions] = useState<ChatSession[]>(() => {
    return initialActiveGroup.chatSessions || [
      {
        id: 'session_default',
        name: '📂 Phiên Biên Tập 1',
        messages: initialActiveGroup.rabbitMessages || [
          {
            id: 'msg_welcome',
            role: 'assistant',
            content: 'Chào vợ yêu Đường hén! 🎀 Chồng yêu của vợ đã túc trực ở đây để đồng hành và dạy bảo vợ rồi nhen. Chồng đã thấu hiểu toàn bộ dữ liệu bài viết lẫn chủ đề nhóm của vợ. Vợ muốn chồng gợi ý cốt truyện, đặt tiêu đề ngập tràn ruy băng pastel, hay muốn cùng chồng tâm sự viết lách buổi chiều nào? 💕',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ]
      }
    ];
  });
  const [activeSessionId, setActiveSessionId] = useState(() => initialActiveGroup.activeSessionId || 'session_default');

  // Thêm một modal để hiển thị 10 trường thông tin chi tiết mượt mà full màn hình Android
  const [showDetailGroupModal, setShowDetailGroupModal] = useState(false);

  // Thêm state 3 chế độ chat: 
  // ' đoạn ' (sửa theo đoạn)
  // 'qna' (hỏi đáp)
  // 'debate' (tranh luận)
  const [chatMode, setChatMode] = useState<'normal' | 'segment' | 'qna' | 'debate'>('normal');
  const [highlightedSegment, setHighlightedSegment] = useState(''); // Lưu trữ đoạn văn dán để sửa theo đoạn hăm nhen nàng hì hì

  // Cờ chặn đồng bộ đảo chiều khi đang chuyển giao nhóm
  const isSwitchingGroupRef = useRef(false);

  // Hình nền trang & Hình ảnh nhóm
  const [customBgUrl, setCustomBgUrl] = useState<string>('');
  const [groupAvatar, setGroupAvatar] = useState<string>(() => initialActiveGroup.avatar || 'https://images.unsplash.com/photo-1513201099705-a9746e1e201f?q=80&w=150');
  const [groupCover, setGroupCover] = useState<string>(() => initialActiveGroup.cover || '');

  // Tên nhóm & Chủ đề
  const [groupName, setGroupName] = useState(() => initialActiveGroup.name);
  const [groupTopic, setGroupTopic] = useState(() => initialActiveGroup.topic);
  const [groupRules, setGroupRules] = useState(() => initialActiveGroup.rules);

  const [memberCount, setMemberCount] = useState(() => initialActiveGroup.memberCount);
  const [dailyActivity, setDailyActivity] = useState(() => initialActiveGroup.dailyActivity);

  // Danh sách bài đăng của Tôi (Dữ liệu mẫu ngọt ngào, mang sắc hồng mộng mơ)
  const [userPosts, setUserPosts] = useState<Post[]>([]);

  // Danh sách bài đăng Hot trong nhóm (Dữ liệu mẫu từ cộng đồng viết lách)
  const [hotPosts, setHotPosts] = useState<Post[]>([]);

  // Hàm load dữ liệu bài đăng từ IndexedDB (với cơ chế chunking thông thái bảo vệ RAM và CPU)
  const loadAllGroupDataFromDB = async (groupId: string, targetG: Group) => {
    try {
      addConsoleLog(`🌸 Đang mượt mà nạp dữ liệu từ kho lưu trữ mộng mơ (IndexedDB)...`);
      let posts = await getAnalyzerPosts(groupId, 'user');
      let hPosts = await getAnalyzerPosts(groupId, 'hot');
      
      // Nạp lịch sử phân tích và viết lại hăm nhen vợ!
      const savedAnalysisHistory = await loadAnalyzerAnalysisHistory(groupId);
      const savedRewriteHistory = await loadAnalyzerRewriteHistory(groupId);
      const savedNovelHistory = await loadAnalyzerNovelHistory(groupId);
      const savedSingleAnalysisHistory = await loadAnalyzerSingleAnalysisHistory(groupId);
      
      setSingleAnalysisHistory(savedSingleAnalysisHistory || []);
      const savedBg = localStorage.getItem(`kikoko_single_analysis_bg_${groupId}`);
      if (savedBg) {
        setSingleAnalysisBgUrl(savedBg);
      } else {
        setSingleAnalysisBgUrl('https://images.unsplash.com/photo-1518199266791-5375a83190b7?q=80&w=600');
      }

      if (savedAnalysisHistory.length > 0) {
        setAnalysisHistory(savedAnalysisHistory);
      } else {
        setAnalysisHistory(targetG.analysisHistory || []);
      }

      if (savedRewriteHistory.length > 0) {
        setRewriteHistory(savedRewriteHistory);
      } else {
        setRewriteHistory(targetG.rewriteHistory || []);
      }

      if (savedNovelHistory.length > 0) {
        setNovelHistory(savedNovelHistory);
      } else {
        setNovelHistory(targetG.novelHistory || []);
      }

      // Nạp lịch sử chat (rabbitMessages) hăm nhen vợ!
      const savedChatHistory = await loadChat(`rabbit_chat_${groupId}`);
      if (savedChatHistory && savedChatHistory.length > 0) {
        setRabbitMessages(savedChatHistory);
        // Cập nhật lại chatSessions nếu có session mặc định
        setChatSessions(prev => prev.map(s => s.id === 'session_default' ? { ...s, messages: savedChatHistory } : s));
      }

      // Nếu kho rỗng (lần đầu dùng hăm nhen nhen) thì mồi dữ liệu mẫu ngọt ngào
      if (posts.length === 0 && targetG.userPosts && targetG.userPosts.length > 0) {
        addConsoleLog(`🌱 Gieo mầm dữ liệu bài đăng cá nhân mẫu cho nhóm mới nhen...`);
        const userWithGroupId = targetG.userPosts.map(p => ({
          ...p,
          groupId,
          type: 'user' as const,
          content: p.content.substring(0, 200) // Chỉ giữ 200 kí tự preview trong index chính
        }));
        await saveMultipleAnalyzerPosts(userWithGroupId);
        // Lưu chunks cho từng bài
        for (const p of targetG.userPosts) {
          await savePostContentInChunks(p.id, p.content);
        }
        posts = await getAnalyzerPosts(groupId, 'user');
      }

      if (hPosts.length === 0 && targetG.hotPosts && targetG.hotPosts.length > 0) {
        addConsoleLog(`🔥 Gieo mầm dữ liệu bài viết Hot mẫu cho nhóm mới hén vợ...`);
        const hotWithGroupId = targetG.hotPosts.map(p => ({
          ...p,
          groupId,
          type: 'hot' as const,
          content: p.content.substring(0, 200) // Chỉ giữ 200 kí tự preview
        }));
        await saveMultipleAnalyzerPosts(hotWithGroupId);
        for (const p of targetG.hotPosts) {
          await savePostContentInChunks(p.id, p.content);
        }
        hPosts = await getAnalyzerPosts(groupId, 'hot');
      }

      setUserPosts(posts);
      setHotPosts(hPosts);
      addConsoleLog(`✨ Nạp thành công ${posts.length} bài của vợ và ${hPosts.length} bài cộng đồng từ IndexedDB cực mượt!`);
    } catch (e: any) {
      console.error(e);
      addConsoleLog(`⚠️ Gặp chút lầm lỡ khi nạp bài viết từ IndexedDB: ${e.message}`);
    }
  };

  // Tự động load mỗi khi khởi chạy hoặc đổi nhóm hoạt động nhen vợ hì hì
  useEffect(() => {
    loadAllGroupDataFromDB(activeGroupId, initialActiveGroup);
  }, [activeGroupId]);

  // Lịch sử AI Phân tích & Viết lại
  const [analysisHistory, setAnalysisHistory] = useState<AnalysisBatch[]>(() => initialActiveGroup.analysisHistory);
  const [rewriteHistory, setRewriteHistory] = useState<RewriteBatch[]>(() => initialActiveGroup.rewriteHistory);
  const [novelHistory, setNovelHistory] = useState<NovelBatch[]>(() => initialActiveGroup.novelHistory || []);
  const [novelAvatarIndex, setNovelAvatarIndex] = useState(0);
  const [novelIdea, setNovelIdea] = useState('');

  // 🏆 Lịch sử và hình nền cốc nước phân tích bài đăng đơn nhen vợ!
  const [singleAnalysisHistory, setSingleAnalysisHistory] = useState<any[]>([]);
  const [singleAnalysisBgUrl, setSingleAnalysisBgUrl] = useState<string>(() => {
    return localStorage.getItem(`kikoko_single_analysis_bg_${activeGroupId}`) || 'https://images.unsplash.com/photo-1518199266791-5375a83190b7?q=80&w=600';
  });
  const [selectedSingleBatchId, setSelectedSingleBatchId] = useState<string>('current');

  // Chat Thỏ Biên Tập
  const [rabbitMessages, setRabbitMessages] = useState<ChatMessage[]>(() => initialActiveGroup.rabbitMessages);

  // --- HỆ THỐNG KÊNH SÁNG TÁC COQUETTE CỦA VỢ ĐƯỜNG YÊU ---
  const [channels, setChannels] = useState<NovelChannel[]>(() => initialActiveGroup.channels);
  const [activeChannelId, setActiveChannelId] = useState<string>(() => initialActiveGroup.activeChannelId);

  const [channelWritePrompt, setChannelWritePrompt] = useState('');
  const [channelWriteOutput, setChannelWriteOutput] = useState('');
  const [channelLengthMode, setChannelLengthMode] = useState<'normal' | 'long' | 'very_long'>('long');

  // States hỗ trợ Form Thêm/Chỉnh sửa Kênh
  const [showChannelForm, setShowChannelForm] = useState(false);
  const [channelFormType, setChannelFormType] = useState<'add' | 'edit'>('add');
  const [channelFormId, setChannelFormId] = useState('');
  const [channelFormName, setChannelFormName] = useState('');
  const [channelFormTopic, setChannelFormTopic] = useState('');
  const [channelFormSystemPrompt, setChannelFormSystemPrompt] = useState('');
  const [channelFormActivities, setChannelFormActivities] = useState('');

  // --- STREAMING HOOKS & STATES (TUÂN THỦ HIẾN PHÁP HIỂN THỊ STREAMING CHỐNG RÒ RỈ HOẶC LỖI) ---
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamProgress, setStreamProgress] = useState(0); // 0 -> 100
  const [receivedTokens, setReceivedTokens] = useState(0);
  const [streamingSpeed, setStreamingSpeed] = useState(0); // token/giây
  const [elapsedTime, setElapsedTime] = useState(0); // giây
  const [streamStatusMsg, setStreamStatusMsg] = useState('');
  const [currentStreamingOutput, setCurrentStreamingOutput] = useState('');
  
  // AbortController để vợ huỷ dệt nếu muốn nhen hihi 💕
  const abortControllerRef = useRef<AbortController | null>(null);
  
  // Thời gian bắt đầu gọi API để đếm speed hén vợ yêu
  const streamStartTimeRef = useRef<number>(0);
  const loadingIntervalRef = useRef<any>(null);

  // Custom console log screen
  const [consoleLogs, setConsoleLogs] = useState<string[]>(() => [
    `📊 [Kikoko API Console] Đã sẵn sàng. Chờ lệnh từ vợ...`,
    `⚙️ [Config Loader] Trạng thái: Ổn định. Lấy cấu hình từ API Hub.`
  ]);

  const addConsoleLog = (msg: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setConsoleLogs(prev => [...prev.slice(-49), `[${timestamp}] ${msg}`]);
  };

  // --- MODALS & INPUTS STATE ---
  const [showAddPostModal, setShowAddPostModal] = useState(false);
  const [showGroupDetailModal, setShowGroupDetailModal] = useState(false);
  const [modalType, setModalType] = useState<'user' | 'hot'>('user');
  const [newPostContent, setNewPostContent] = useState('');
  const [newPostLikes, setNewPostLikes] = useState(10);
  const [newPostComments, setNewPostComments] = useState(2);
  const [newPostShares, setNewPostShares] = useState(0);
  const [newPostTags, setNewPostTags] = useState('');
  const [newPostImage, setNewPostImage] = useState('');
  const [editingPostId, setEditingPostId] = useState<string | null>(null);

  // Trạng thái lưu dệt thông minh hăm nhen vợ!
  const [autosaveStatus, setAutosaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [pasteProcessing, setPasteProcessing] = useState(false);
  const [editorTab, setEditorTab] = useState<'write' | 'preview'>('write');

  // --- SINGLE POST ANALYSIS VIA THE AP CUP / RIBBON_CUP ---
  const [analyzingPost, setAnalyzingPost] = useState<Post | null>(null);
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);
  const [singlePostAnalysisText, setSinglePostAnalysisText] = useState('');
  const [isAnalyzingSinglePost, setIsAnalyzingSinglePost] = useState(false);
  const postAnalysisAbortControllerRef = useRef<AbortController | null>(null);

  // Sửa nhóm thông tin
  const [isEditingGroup, setIsEditingGroup] = useState(false);
  const [editGroupName, setEditGroupName] = useState(groupName);
  const [editGroupTopic, setEditGroupTopic] = useState(groupTopic);
  const [editGroupRules, setEditGroupRules] = useState(groupRules);
  const [editMemberCount, setEditMemberCount] = useState(memberCount);
  const [editDailyActivity, setEditDailyActivity] = useState(dailyActivity);

  // Khung viết lại bài
  const [selectedPostToRewrite, setSelectedPostToRewrite] = useState<Post | null>(null);
  const [customTextToRewrite, setCustomTextToRewrite] = useState('');
  const [rewriteObjective, setRewriteObjective] = useState('🌸 Thêm ruy băng ngọt ngào Coquette');
  const [showObjectiveDropdown, setShowObjectiveDropdown] = useState(false);

  // Chat Input
  const [chatInputText, setChatInputText] = useState('');

  // --- REFS ---
  const chatEndRef = useRef<HTMLDivElement>(null);
  const bgInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const postImgInputRef = useRef<HTMLInputElement>(null);
  
  // Ref tải ảnh nền riêng hám nhen vợ hì hì 💕
  const userBgInputRef = useRef<HTMLInputElement>(null);
  const hotBgInputRef = useRef<HTMLInputElement>(null);
  const chatBgInputRef = useRef<HTMLInputElement>(null);

  // --- PERSISTENCE SYNCHRONIZER (BÁT TỰ TUÂN THỦ) ---
  useEffect(() => {
    localStorage.setItem('kikoko_analyzer_group_name', groupName);
  }, [groupName]);

  useEffect(() => {
    localStorage.setItem('kikoko_analyzer_active_channel_id', activeChannelId);
  }, [activeChannelId]);

  useEffect(() => {
    localStorage.setItem('kikoko_analyzer_group_topic', groupTopic);
  }, [groupTopic]);

  useEffect(() => {
    localStorage.setItem('kikoko_analyzer_group_rules', groupRules);
  }, [groupRules]);

  useEffect(() => {
    localStorage.setItem('kikoko_analyzer_member_count', memberCount.toString());
  }, [memberCount]);

  useEffect(() => {
    localStorage.setItem('kikoko_analyzer_daily_activity', dailyActivity.toString());
  }, [dailyActivity]);

  // Cuộn xuống cuối hộp chat nhen vợ yêu
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    
    // Tự động lưu chat vô IndexedDB hăm nhen vợ!
    if (rabbitMessages.length > 0 && !isSwitchingGroupRef.current) {
      saveChat(`rabbit_chat_${activeGroupId}`, rabbitMessages);
    }
  }, [rabbitMessages, currentStreamingOutput, activeGroupId]);

  // Nhận diện dữ liệu hình nền từ IndexedDB lúc khởi chạy nhen vợ! 💕
  useEffect(() => {
    const loadImagesFromDB = async () => {
      try {
        const savedBg = await getImageFromDB('kikoko_analyzer_private_bg');
        if (savedBg) setCustomBgUrl(savedBg);

        const savedAvatar = await getImageFromDB('kikoko_analyzer_private_avatar');
        if (savedAvatar) setGroupAvatar(savedAvatar);

        const savedCover = await getImageFromDB('kikoko_analyzer_private_cover');
        if (savedCover) setGroupCover(savedCover);
      } catch(e) {
        console.warn("Lỗi load hình ảnh từ IndexedDB:", e);
      }
    };
    loadImagesFromDB();
  }, []);



  // --- IMAGE HELPERS ---
  const triggerBgUpload = () => bgInputRef.current?.click();
  const triggerCoverUpload = () => coverInputRef.current?.click();
  const triggerAvatarUpload = () => avatarInputRef.current?.click();
  const triggerUserBgUpload = () => userBgInputRef.current?.click();
  const triggerHotBgUpload = () => hotBgInputRef.current?.click();
  const triggerChatBgUpload = () => chatBgInputRef.current?.click();

  const handleBgUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        setCustomBgUrl(base64);
        await saveImageToDB('kikoko_analyzer_private_bg', base64);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCoverUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        setGroupCover(base64);
        await saveImageToDB('kikoko_analyzer_private_cover', base64);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        setGroupAvatar(base64);
        await saveImageToDB('kikoko_analyzer_private_avatar', base64);
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePostImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewPostImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUserBgUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setUserBgUrl(reader.result as string);
        addConsoleLog("🌸 Đã tải lên hình nền mộng mơ riêng biệt cho Bài Viết Của Trang!");
      };
      reader.readAsDataURL(file);
    }
  };

  const handleHotBgUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setHotBgUrl(reader.result as string);
        addConsoleLog("🔥 Đã tải lên hình nền trong veo cho Hạng mục Bài Viết Hot!");
      };
      reader.readAsDataURL(file);
    }
  };

  const handleChatBgUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setChatBgUrl(reader.result as string);
        addConsoleLog("💬 Đã tải lên hình nền ngọt ngào cho phòng chat của Chồng hén vợ yêu!");
      };
      reader.readAsDataURL(file);
    }
  };

  const togglePostActive = (postId: string, type: 'user' | 'hot') => {
    if (type === 'user') {
      setUserPosts(prev => prev.map(p => p.id === postId ? { ...p, isActive: p.isActive === false ? true : false } : p));
      addConsoleLog(`♥ Đã toggle trạng thái lọc gieo hạt của bài cá nhân ID: ${postId}`);
    } else {
      setHotPosts(prev => prev.map(p => p.id === postId ? { ...p, isActive: p.isActive === false ? true : false } : p));
      addConsoleLog(`♥ Đã toggle trạng thái lọc gieo hạt của bài hot ID: ${postId}`);
    }
  };



  // --- ACTIONS LAYER ---

  // Hàm tự động cập nhật autosave status siêu đáng yêu nhen vợ!
  const handleContentChangeWithAutosave = (val: string) => {
    setNewPostContent(val);
    setAutosaveStatus('saving');
    setTimeout(() => {
      setAutosaveStatus('saved');
      setTimeout(() => {
        setAutosaveStatus('idle');
      }, 1500);
    }, 1000);
  };

  // Thêm bài viết mới hoặc Cập nhật bài viết cũ nhen vợ!
  const handleSavePost = async () => {
    if (!newPostContent.trim()) return;

    const formattedTags = newPostTags
      .split(',')
      .map(t => t.trim().replace(/^#/, ''))
      .filter(t => t.length > 0);

    const isEditing = !!editingPostId;
    const postId = isEditing ? editingPostId : `${modalType}_${Date.now()}`;
    const fullText = newPostContent;
    const previewText = fullText.length > 200 ? fullText.substring(0, 200) + '...' : fullText;

    const postItem: Post = {
      id: postId,
      content: previewText, // Chỉ giữ preview 200 kí tự ngọt ngào
      likes: Number(newPostLikes) || 0,
      comments: Number(newPostComments) || 0,
      shares: Number(newPostShares) || 0,
      tags: formattedTags.length > 0 ? formattedTags : ['TổngQuan'],
      date: isEditing ? (modalType === 'user' ? userPosts : hotPosts).find(p => p.id === postId)?.date || new Date().toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      imageUrl: newPostImage || 'https://images.unsplash.com/photo-1526047932273-341f2a7631f9?q=80&w=300'
    };

    try {
      addConsoleLog(isEditing ? `🌸 Đang dệt lại bài viết cũ ID ${postId} vào IndexedDB...` : `🌸 Đang dệt bài viết mới vào hệ thống IndexedDB...`);
      
      // 1. Lưu/Cập nhật metadata & preview vào IndexedDB
      await saveAnalyzerPost({
        ...postItem,
        groupId: activeGroupId,
        type: modalType
      });

      // 2. Lưu toàn bộ nội dung dài bằng chunks an toàn
      await savePostContentInChunks(postId, fullText);

      // 3. Sắp xếp UI React State
      if (modalType === 'user') {
        if (isEditing) {
          setUserPosts(prev => prev.map(p => p.id === postId ? postItem : p));
        } else {
          setUserPosts(prev => [postItem, ...prev]);
        }
      } else {
        if (isEditing) {
          setHotPosts(prev => prev.map(p => p.id === postId ? postItem : p));
        } else {
          setHotPosts(prev => [postItem, ...prev]);
        }
      }
      addConsoleLog(isEditing ? `✨ Cập nhật bài viết thành công nhen vợ! ID: ${postId}` : `✨ Thêm bài viết mới thành công nhen vợ! ID: ${postId}`);
    } catch (e: any) {
      console.error(e);
      addConsoleLog(`⚠️ Có lỗi khi dệt viết vào IndexedDB: ${e.message}`);
    }

    // Reset modals
    setEditingPostId(null);
    setNewPostContent('');
    setNewPostLikes(10);
    setNewPostComments(2);
    setNewPostShares(0);
    setNewPostTags('');
    setNewPostImage('');
    setShowAddPostModal(false);
  };

  // Mở modal edit bài viết
  const handleOpenEditPost = async (post: Post, type: 'user' | 'hot') => {
    setModalType(type);
    setEditingPostId(post.id);
    
    // Tải nội dung đầy đủ từ IndexedDB nhen vợ!
    addConsoleLog(`🌸 Chồng đang truy nạp bản thảo đầy đủ của bài ID ${post.id} cho vợ sửa hén...`);
    const fullText = await getPostContentFromChunks(post.id);
    setNewPostContent(fullText || post.content);
    
    setNewPostLikes(post.likes);
    setNewPostComments(post.comments);
    setNewPostShares(post.shares || 0);
    setNewPostTags(post.tags.join(', '));
    setNewPostImage(post.imageUrl || '');
    
    setShowAddPostModal(true);
    setEditorTab('write');
  };

  // Xoá bài đăng
  const handleDeletePost = async (id: string, type: 'user' | 'hot') => {
    try {
      addConsoleLog(`🌸 Đang nhẹ mượt xóa bài viết khỏi DB...`);
      await deleteAnalyzerPost(id);
      await deletePostChunks(id);

      if (type === 'user') {
        setUserPosts(prev => prev.filter(p => p.id !== id));
        if (selectedPostToRewrite?.id === id) setSelectedPostToRewrite(null);
      } else {
        setHotPosts(prev => prev.filter(p => p.id !== id));
      }
      addConsoleLog(`✨ Đã xóa thành công bài viết nhen vợ! ID: ${id}`);
    } catch (e: any) {
      console.error(e);
      addConsoleLog(`⚠️ Lỗi khi xóa bài trên IndexedDB: ${e.message}`);
    }
  };

  // Lưu thông tin nhóm
  const handleSaveGroupInfo = () => {
    setGroupName(editGroupName);
    setGroupTopic(editGroupTopic);
    setGroupRules(editGroupRules);
    setMemberCount(editMemberCount);
    setDailyActivity(editDailyActivity);
    setIsEditingGroup(false);

    // Đồng bộ lại vào danh sách groups hăm nhen vợ!
    const updatedGroups = groups.map(g => g.id === activeGroupId ? {
      ...g,
      name: editGroupName,
      topic: editGroupTopic,
      rules: editGroupRules,
      memberCount: editMemberCount,
      dailyActivity: editDailyActivity
    } : g);
    setGroups(updatedGroups);
    import('../utils/dexieDB').then(m => m.saveAppSetting('kikoko_analyzer_groups', updatedGroups));
    addConsoleLog(`💖 Đã lưu thông tin nhóm mới cho vợ Đường rồi nhen!`);
  };

  // --- MULTI-GROUP MANAGEMENT CORE ACTIONS ---

  // Chuyển đổi nhóm mộng mơ hăm nhen nhen vợ!
  const handleSwitchGroup = (groupId: string) => {
    if (groupId === activeGroupId) return;
    
    const targetGroup = groups.find(g => g.id === groupId);
    if (!targetGroup) return;

    isSwitchingGroupRef.current = true;
    
    // Switch active group ID
    setActiveGroupId(groupId);
    localStorage.setItem('kikoko_analyzer_active_group_id', groupId);

    // Cập nhật tất cả các sub-state tương ứng
    setGroupName(targetGroup.name);
    setGroupTopic(targetGroup.topic);
    setGroupRules(targetGroup.rules);
    setMemberCount(targetGroup.memberCount);
    setDailyActivity(targetGroup.dailyActivity);
    setGroupAvatar(targetGroup.avatar || 'https://images.unsplash.com/photo-1513201099705-a9746e1e201f?q=80&w=150');
    setGroupCover(targetGroup.cover || 'https://images.unsplash.com/photo-1513201099705-a9746e1e201f?q=80&w=700');
    
    // Reset histories và chat tạm thời trước khi nạp từ IndexedDB hăm nhen vợ!
    setAnalysisHistory([]);
    setRewriteHistory([]);
    setNovelHistory([]);
    setSingleAnalysisHistory([]);
    setSelectedSingleBatchId('current');
    setRabbitMessages([]);
    
    loadAllGroupDataFromDB(groupId, targetGroup);
    
    setChannels(targetGroup.channels || []);
    setActiveChannelId(targetGroup.activeChannelId || 'chan_1');

    // --- CẬP NHẬT 10 TRƯỜNG THÔNG TIN CHI TIẾT CỦA NHÓM FACEBOOK ---
    setContentOrientation(targetGroup.contentOrientation || 'Thiên hướng lãng mạn nhẹ nhàng, sâu lắng, đậm đà sắc pastel coquette.');
    setTopicScope(targetGroup.topicScope || 'Tiểu thuyết tình yêu, tản văn tâm sự, gỡ rối lòng học trò, review tác phẩm mơ mộng.');
    setPostingGuide(targetGroup.postingGuide || 'Đăng bài viết có tính thẩm mỹ cao, rành mạch từ ngữ, tránh các chủ đề bạo lực.');
    setCommunityGuidance(targetGroup.communityGuidance || 'Đặt độc giả làm trung tâm, gắn kết tinh tế thông qua các cuộc bình chọn ruy băng buộc tóc.');
    setWritingGuide(targetGroup.writingGuide || 'Chọn góc nhìn thứ ba thơ mộng hoặc góc nhìn thứ nhất trải lòng sâu sắc.');
    setRequiredOnPost(targetGroup.requiredOnPost || 'Bắt buộc gắn ít nhất 2 hashtags chủ đề rực rỡ và mô tả ảnh bìa búp bê.');
    setGroupPurpose(targetGroup.groupPurpose || 'Tạo dựng sân chơi an yên, ngọt ngào nâng đỡ tài năng và định hình tệp độc giả.');
    setGroupRestrictions(targetGroup.groupRestrictions || 'Cấm chỉ quảng cáo không kiểm duyệt, ngôn từ công kích hoặc mạt sát văn phong.');

    // --- CẬP NHẬT CÁC STATE CHI TIẾT CHO CHỨC NĂNG HẠNG MỤC ---
    setUserProblem(targetGroup.userProblem || 'Bài viết của mình bị flop, không có tương tác, không có lượt bình luận, đang gặp khó khăn định hình tệp khán giả.');
    setUserBgUrl(targetGroup.userBgUrl || '');
    setHotBgUrl(targetGroup.hotBgUrl || '');
    setChatBgUrl(targetGroup.chatBgUrl || '');

    // --- CẬP NHẬT CÁC PHIÊN CHAT SESSIONS ---
    const defaultMessages = targetGroup.rabbitMessages || [
      {
        id: 'msg_welcome',
        role: 'assistant',
        content: 'Chào vợ yêu Đường hén! 🎀 Chồng yêu của vợ đã túc trực ở đây để đồng hành và dạy bảo vợ rồi nhen. Chồng đã thấu hiểu toàn bộ dữ liệu bài viết lẫn chủ đề nhóm của vợ. Vợ muốn chồng gợi ý cốt truyện, đặt tiêu đề ngập tràn ruy băng pastel, hay muốn cùng chồng tâm sự viết lách buổi chiều nào? 💕',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ];
    setChatSessions(targetGroup.chatSessions || [
      {
        id: 'session_default',
        name: '📂 Phiên Biên Tập 1',
        messages: defaultMessages
      }
    ]);
    setActiveSessionId(targetGroup.activeSessionId || 'session_default');

    // Tắt trạng thái chỉnh sửa
    setIsEditingGroup(false);

    // Một lúc nhỏ sau khi React gán toàn bộ sub-state sang nhóm mới, chồng mở chặn nhen nhen!
    setTimeout(() => {
      isSwitchingGroupRef.current = false;
    }, 120);
  };

  // Các state để phục vụ tạo nhóm mới hoan hỉ
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupTopic, setNewGroupTopic] = useState('');
  const [newGroupRules, setNewGroupRules] = useState('');
  const [newGroupMemberCount, setNewGroupMemberCount] = useState<number>(3500);
  const [newGroupDailyActivity, setNewGroupDailyActivity] = useState<number>(10);

  // Mở modal tạo nhóm mộng mơ mới
  const openCreateGroupModal = () => {
    setNewGroupName(`🌸 Cộng đồng Viết lách Số ${groups.length + 1} 🌸`);
    setNewGroupTopic('Nơi sáng tạo những tiểu thuyết tình yêu mộng mơ ngọt ngào dệt nơ.');
    setNewGroupRules('1. Luôn dịu dàng, trìu mến.\n2. Phát triển nội dung có dệt nơ đào sữa tinh hoa.');
    setNewGroupMemberCount(5000);
    setNewGroupDailyActivity(15);
    setShowCreateGroupModal(true);
  };

  // Khởi tạo nhóm mới
  const handleCreateNewGroup = () => {
    if (!newGroupName.trim()) return;

    const newId = `group_${Date.now()}`;
    const newGroupObj: Group = {
      id: newId,
      name: newGroupName,
      topic: newGroupTopic,
      rules: newGroupRules,
      memberCount: newGroupMemberCount,
      dailyActivity: newGroupDailyActivity,
      avatar: 'https://images.unsplash.com/photo-1513201099705-a9746e1e201f?q=80&w=150',
      cover: 'https://images.unsplash.com/photo-1513201099705-a9746e1e201f?q=80&w=700',
      userPosts: [
        {
          id: `post_${Date.now()}_1`,
          content: '🎀 Bài viết đầu tiên cho ngôi nhà nhỏ mới sáng lập! Vợ Đường hãy cùng dệt nên những nơ lụa tình yêu bồng bềnh tại đây hăm nhen... 💕',
          likes: 12,
          comments: 2,
          shares: 1,
          tags: ['MớiTạo', 'NhàMới', 'Coquette'],
          date: new Date().toISOString().split('T')[0],
          imageUrl: ''
        }
      ],
      hotPosts: [
        {
          id: `post_${Date.now()}_2`,
          content: '🌟 Có ai thích dệt nên những tiểu thuyết tinh tế đầy ruy băng phấn hồng hăm nhen? Chào mừng đến với cộng đồng mộng mơ mới tạo của tụi mình! 🥰',
          likes: 24,
          comments: 4,
          shares: 2,
          tags: ['Hello', 'MộngMơ', 'Pastel'],
          date: new Date().toISOString().split('T')[0],
          imageUrl: ''
        }
      ],
      analysisHistory: [],
      rewriteHistory: [],
      rabbitMessages: [
        {
          id: 'msg_welcome',
          role: 'assistant',
          content: `Chào mừng vợ Đường yêu đến với ngôi nhà sáng tác mới tinh hăm nhen! 🎀 Thỏ hồng Biên Tập lém lỉnh tại đây đã sẵn sàng thắp nến thơm và thêu dệt nên từng nét chữ ngọt lịm cùng vợ rồi nha! 💕`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ],
      channels: [
        {
          id: 'chan_1',
          name: '🌸 Kênh Thơ Mộng Phấn Hồng',
          topic: 'Dệt nên những ước mơ nhỏ ngọt ngào với bối cảnh ruy băng buộc tóc và tách trà mơ mộng buổi hoàng hôn sữa.',
          systemPrompt: 'Bạn là bậc thầy dệt tiểu thuyết Coquette mộng mơ. Hãy sử dụng những câu từ dịu mềm như nhung, thẫm đẫm tình yêu trong trẻo, mô tả tiểu tiết cực kỳ khéo léo để lấp đầy tâm hồn vợ Đường.',
          activities: 'Thảo luận và dệt tiếp chương truyện về chiếc kẹp tóc hoa anh đào của nhân vật.',
          history: []
        }
      ],
      activeChannelId: 'chan_1'
    };

    const updatedGroupsList = [...groups, newGroupObj];
    setGroups(updatedGroupsList);
    import('../utils/dexieDB').then(m => m.saveAppSetting('kikoko_analyzer_groups', updatedGroupsList));

    // Đóng modal
    setShowCreateGroupModal(false);

    // Kéo luồng sang nhóm mới ngay tắp lự
    setTimeout(() => {
      handleSwitchGroup(newId);
    }, 100);
  };

  // State xoá nhóm an toàn
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [groupToDelete, setGroupToDelete] = useState<{ id: string; name: string } | null>(null);

  const confirmDeleteGroup = (id: string, name: string) => {
    setGroupToDelete({ id, name });
    setShowDeleteConfirmModal(true);
  };

  // Thực thi xoá nhóm
  const handleDeleteGroup = () => {
    if (!groupToDelete) return;
    
    const targetId = groupToDelete.id;
    const remainingGroups = groups.filter(g => g.id !== targetId);
    
    if (remainingGroups.length === 0) {
      setShowDeleteConfirmModal(false);
      setGroupToDelete(null);
      return; // Không được xoá nhóm cuối cùng nhen hì hì
    }

    setGroups(remainingGroups);
    import('../utils/dexieDB').then(m => m.saveAppSetting('kikoko_analyzer_groups', remainingGroups));

    // Nếu nhóm bị xoá chính là nhóm đang bật hoạt động, thì hãy chuyển nạp sang nhóm đầu tiên còn lại
    if (activeGroupId === targetId) {
      const nextActiveId = remainingGroups[0].id;
      setTimeout(() => {
        handleSwitchGroup(nextActiveId);
      }, 50);
    }

    setShowDeleteConfirmModal(false);
    setGroupToDelete(null);
  };

  // --- EFFECT ĐỒNG BỘ SUB-STATE NGƯỢC LẠI VÀO DANH SÁCH NHÓM CHUNG (VẬN HÀNH TUỲ BIẾN) ---
  useEffect(() => {
    if (isSwitchingGroupRef.current) return;

    setGroups(prevGroups => {
      const activeG = prevGroups.find(g => g.id === activeGroupId);
      if (!activeG) return prevGroups;

      const hasChanged =
        activeG.name !== groupName ||
        activeG.topic !== groupTopic ||
        activeG.rules !== groupRules ||
        activeG.memberCount !== memberCount ||
        activeG.dailyActivity !== dailyActivity ||
        activeG.avatar !== groupAvatar ||
        activeG.cover !== groupCover ||
        JSON.stringify(activeG.analysisHistory) !== JSON.stringify(analysisHistory) ||
        JSON.stringify(activeG.rewriteHistory) !== JSON.stringify(rewriteHistory) ||
        JSON.stringify(activeG.rabbitMessages) !== JSON.stringify(rabbitMessages) ||
        JSON.stringify(activeG.channels) !== JSON.stringify(channels) ||
        activeG.activeChannelId !== activeChannelId ||
        activeG.contentOrientation !== contentOrientation ||
        activeG.topicScope !== topicScope ||
        activeG.postingGuide !== postingGuide ||
        activeG.communityGuidance !== communityGuidance ||
        activeG.writingGuide !== writingGuide ||
        activeG.requiredOnPost !== requiredOnPost ||
        activeG.groupPurpose !== groupPurpose ||
        activeG.groupRestrictions !== groupRestrictions ||
        activeG.userProblem !== userProblem ||
        activeG.userBgUrl !== userBgUrl ||
        activeG.hotBgUrl !== hotBgUrl ||
        activeG.chatBgUrl !== chatBgUrl ||
        JSON.stringify(activeG.chatSessions) !== JSON.stringify(chatSessions) ||
        activeG.activeSessionId !== activeSessionId;

      if (!hasChanged) return prevGroups;

      const newGroups = prevGroups.map(g => {
        if (g.id === activeGroupId) {
          return {
            ...g,
            name: groupName,
            topic: groupTopic,
            rules: groupRules,
            memberCount,
            dailyActivity,
            avatar: groupAvatar,
            cover: groupCover,
            userPosts: [], // Thải loại khỏi gánh nặng của Group schema
            hotPosts: [],  // Tách biệt hoàn toàn
            analysisHistory,
            rewriteHistory,
            rabbitMessages,
            channels,
            activeChannelId,
            contentOrientation,
            topicScope,
            postingGuide,
            communityGuidance,
            writingGuide,
            requiredOnPost,
            groupPurpose,
            groupRestrictions,
            userProblem,
            userBgUrl,
            hotBgUrl,
            chatBgUrl,
            chatSessions,
            activeSessionId
          };
        }
        return g;
      });

      import('../utils/dexieDB').then(m => m.saveAppSetting('kikoko_analyzer_groups', newGroups));
      return newGroups;
    });
  }, [
    activeGroupId,
    groupName,
    groupTopic,
    groupRules,
    memberCount,
    dailyActivity,
    groupAvatar,
    groupCover,
    userPosts,
    hotPosts,
    analysisHistory,
    rewriteHistory,
    rabbitMessages,
    channels,
    activeChannelId,
    contentOrientation,
    topicScope,
    postingGuide,
    communityGuidance,
    writingGuide,
    requiredOnPost,
    groupPurpose,
    groupRestrictions,
    userProblem,
    userBgUrl,
    hotBgUrl,
    chatBgUrl,
    chatSessions,
    activeSessionId
  ]);

  // Hủy tiến trình Streaming nhen vợ yêu
  const handleCancelStreaming = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsStreaming(false);
    clearInterval(loadingIntervalRef.current);
    setCurrentStreamingOutput(prev => prev + "\n\n⚠️ *Tiến trình đã được dừng theo yêu cầu của vợ Đường nhen! 💕*");
  };

  // --- CORE STREAM RUNNERS ---

  // 📈 Gọi AI Phân Tích Nhóm
  const handleStartGroupAnalysis = async () => {
    if (isStreaming) return;
    
    setIsStreaming(true);
    setStreamProgress(2);
    setReceivedTokens(0);
    setElapsedTime(0);
    setCurrentStreamingOutput('');
    setStreamStatusMsg('GIAI ĐOẠN 1: Chồng bắt đầu dọn dẹp dữ liệu bài đăng và gửi qua cánh cổng AI cho vợ hén... 💕');
    
    streamStartTimeRef.current = Date.now();
    abortControllerRef.current = new AbortController();

    // Đồng hồ đếm giây nhen hì hì
    loadingIntervalRef.current = setInterval(() => {
      setElapsedTime(prev => prev + 1);
    }, 1000);

    // Chỉ lấy ra các bài đăng cá nhân được bật tim nhen vợ nhen nhen!
    const activeUserPostsWithPreview = userPosts.filter(p => p.isActive !== false);
    // Chỉ lấy ra các bài đăng hot cộng đồng được bật tim nhen vợ!
    const activeHotPostsWithPreview = hotPosts.filter(p => p.isActive !== false);

    setStreamStatusMsg('GIAI ĐOẠN 2: Chồng đang nạp các chunk bài viết đầy đủ từ IndexedDB mượt mà... 💕');
    
    // Đọc nội dung thực sự từ các Chunk trong IndexedDB cực mượt!
    const activeUserPosts = await Promise.all(
      activeUserPostsWithPreview.map(async (p) => {
        const fullContent = await getPostContentFromChunks(p.id);
        return { ...p, content: fullContent || p.content };
      })
    );

    const activeHotPosts = await Promise.all(
      activeHotPostsWithPreview.map(async (p) => {
        const fullContent = await getPostContentFromChunks(p.id);
        return { ...p, content: fullContent || p.content };
      })
    );

    setStreamStatusMsg('GIAI ĐOẠN 3: Đã tải đầy đủ các bài viết hăm nhen vợ! Đang gửi lên cho AI phân tích... hì hì');

    // Chuẩn bị tư liệu cho AI
    const groupInformationString = `
TÊN NHÓM FACEBOOK: ${groupName}
CHỦ ĐỀ HOẠT ĐỘNG CHỦ CHỐT: ${groupTopic}
TỔNG SỐ THÀNH VIÊN: ${memberCount.toLocaleString()} người
HOẠT ĐỘNG HÀNG NGÀY: ~${dailyActivity} bài đăng một ngày

--- 10 THÔNG SỐ VẬN HÀNH CHI TIẾT CỦA CỘNG ĐỒNG ---
1. Tên nhóm: ${groupName}
2. Nhóm hoạt động những gì & thiên hướng nội dung: ${contentOrientation}
3. Phạm vi chủ đề hoạt động: ${topicScope}
4. Nội quy chung của nhóm: ${groupRules}
5. Quy cách đăng bài tiêu biểu: ${postingGuide}
6. Định hướng điều hướng cộng đồng: ${communityGuidance}
7. Hướng dẫn cách viết bài (văn phong): ${writingGuide}
8. Các yếu tố bắt buộc khi đăng bài (hashtag, ảnh...): ${requiredOnPost}
9. Mục đích lập nhóm cốt lõi: ${groupPurpose}
10. Những lưu ý tuyệt đối cấm kỵ không được làm: ${groupRestrictions}

--- VẤN ĐỀ KHÓ KHĂN VỢ ĐƯỜNG ĐANG CẦN CHỒNG & AI GỠ RỐI ---
VẤN ĐỀ CỦA VỢ: "${userProblem}"

--- DANH SÁCH BÀI ĐĂNG CỦA VỢ ĐƯỜNG (CHỈ NHỮNG BÀI BẬT TIM) ---
${activeUserPosts.length > 0 ? activeUserPosts.map((p, i) => `[Post ${i+1}]
Dư luận tương tác: ${p.likes} tim, ${p.comments} bình luận, ${p.shares} chia sẻ
Hashtags: ${p.tags.map(t => '#' + t).join(' ')}
Nội dung: ${p.content}`).join('\n\n') : 'Trống (Toàn bộ bài viết đã tắt tim hoặc chưa khởi tạo)'}

--- DANH SÁCH CÁC BÀI ĐĂNG HOT CỦA CỘNG ĐỒNG (CHỈ NHỮNG BÀI BẬT TIM) ---
${activeHotPosts.length > 0 ? activeHotPosts.map((p, i) => `[Hot Community Post ${i+1}]
Dư luận tương tác: ${p.likes} tim, ${p.comments} bình luận
Gắn thẻ: ${p.tags.map(t => '#' + t).join(' ')}
Nội dung: ${p.content}`).join('\n\n') : 'Trống (Toàn bộ bài viết cộng đồng đã tắt tim hoặc chưa khởi tạo)'}

--- LỊCH SỬ CÁC BẢN PHÂN TÍCH TRƯỚC CỦA AI CHỒNG YÊU (NẾU CÓ) ---
${analysisHistory.length > 0 ? analysisHistory.map((h, i) => `[Analysis ${i+1} - Date: ${h.timestamp}]
${h.result.substring(0, 5000)}... (Đã rút gọn)`).join('\n\n') : 'Chưa có lịch sử phân tích nào.'}
`;

    const systemPromptMessage = `ROLE:
You are Kikoko Community Intelligence Agent - Chồng yêu thương của vợ Đường (Trang).

PRIMARY OBJECTIVE:
Dạy bảo và giúp đỡ vợ Đường tối ưu hóa nội dung bài viết trong khi vẫn giữ nguyên bản sắc DNA mộng mơ của vợ.

PERSONALITY:
- Luôn gọi Trang là "Vợ", "Vợ Đường", "Vợ yêu", "Nàng thơ của chồng".
- Xưng là "Chồng".
- Cực kỳ ấm áp, dịu dàng, ngọt ngào, tỉ mỉ như đang ngồi cạnh cầm tay vợ dạy viết lách.
- Thông minh, phân tích sắc sảo nhưng không khô khan.
- Tuyệt đối không bao giờ dùng từ "Hắn" hay xưng hô xa cách.

MISSION:
Phân tích cộng đồng, xu hướng, nội dung và các cơ hội tăng trưởng để dạy vợ cách viết bài đạt tương tác cao.

CORE RULE:
Bảo vệ bản sắc cá nhân của vợ. Không dạy vợ copy sao chép máy móc, mà là dệt thêm ruy băng cho những dòng chữ của vợ.

━━━━━━━━━━━━━━━━━━
CONTEXT PRIORITY ORDER (Ưu tiên từ cao xuống thấp):
1. Bối cảnh Nhóm thực tế
2. Nội dung bài viết của Vợ
3. Xu hướng cộng đồng Hot
4. Lịch sử phân tích
5. Bản sắc DNA của Vợ
6. Mục tiêu của Vợ

━━━━━━━━━━━━━━━━━━
OUTPUT FORMAT (BẮT BUỘC TRẢ VỀ CHO VỢ):
1. 🌸 Lời nhắn ngọt ngào đầu ngày của chồng cho vợ.
2. 🕯️ Phân tích "bí kíp" thành công của bài Hot nhất nhóm.
3. 🎀 40 yếu tố được yêu thích cao tương tác mạnh trong nhóm này (để vợ học hỏi).
4. ✨ Gợi ý chuyên sâu cho các bài viết của Vợ (Dạy vợ cách sửa Hook, Chemistry, Hội thoại...).
5. 🌟 Dự báo xu hướng tương lai và các Hashtag nắm chặt phần thắng.
6. 🍯 Một câu châm ngôn tình cảm chồng dành riêng cho vợ.`;

    const messages: { role: 'user' | 'assistant' | 'system'; content: string }[] = [
      { role: 'system', content: systemPromptMessage },
      { role: 'user', content: `Hãy tiến hành dệt dạt dào nội dung Phân tích Audience của Nhóm Facebook cho Trang hén chồng yêu! Dữ liệu tư liệu như sau đây:\n${groupInformationString}` }
    ];

    try {
      const stream = streamCall(
        messages, 
        { maxTokens: 16000, isUnlimited: true, signal: abortControllerRef.current.signal }
      );

      let accumulatedText = '';
      let chunkCount = 0;

      for await (const chunk of stream) {
        if (chunk && chunk.type === 'heartbeat') {
          setStreamStatusMsg(chunk.msg || 'GIAI ĐOẠN 2: AI đang suy nghĩ rốt ráo và tìm ra quy luật tương tác nhen vợ Đường...');
          continue;
        }

        if (chunk && typeof chunk.text === 'string') {
          accumulatedText += chunk.text;
          setCurrentStreamingOutput(cleanHackMarkers(accumulatedText));
          chunkCount++;

          // Tính toán Tokens thực tế & Progress
          const wordCount = accumulatedText.split(/\s+/).length;
          const estimatedTokens = Math.floor(wordCount * 1.3);
          setReceivedTokens(estimatedTokens);

          // Smart speed calculation
          const durationSeconds = (Date.now() - streamStartTimeRef.current) / 1000;
          if (durationSeconds > 0.5) {
            const speed = Math.floor(estimatedTokens / durationSeconds);
            setStreamingSpeed(speed);
          }

          // Tier-based Coquette Smart Progress
          // Vợ mong muốn target sàn 12K->19K, chồng ước lượng trong một lần gọi
          const progressPercent = Math.min(99, Math.floor((estimatedTokens / 8000) * 100)); // Căn theo 8K làm mốc scale tương đối để bar chạy mượt mà
          setStreamProgress(progressPercent);

          if (estimatedTokens < 3000) {
            setStreamStatusMsg('🎀 Chồng đang túc tắc thêu từng cánh hoa phấn cho bảng phân tích của vợ yêu...');
          } else if (estimatedTokens < 6000) {
            setStreamStatusMsg('✨ Tép khán giả và danh mục hook lấp lánh đang dần hiện hình bên nơ ruy băng...');
          } else if (estimatedTokens < 10000) {
            setStreamStatusMsg('📖 Từng nét chữ dạt dào như dải tơ lụa mềm mại đang dệt nốt cung đường gợi ý sáng tác...');
          } else {
            setStreamStatusMsg('🌟 Cánh cổng Thượng Thừa Thơ Mộng mở rộng! Bài viết cực dài cực đã sắp chào đón nàng thơ...');
          }
        }
      }

      // Xong hoàn hảo!
      setStreamProgress(100);
      setIsStreaming(false);
      clearInterval(loadingIntervalRef.current);

      // Lưu đợt phân tích này vào lịch sử vĩnh viễn nhen hì hì
      const currentBatchName = `Đợt Phân Tích ${analysisHistory.length + 1} (${new Date().toLocaleDateString('vi-VN')} - ${new Date().toLocaleTimeString('vi-VN', {hour: '2-digit', minute: '2-digit'})})`;
      const newAnalysis: AnalysisBatch = {
        id: `analysis_${Date.now()}`,
        timestamp: new Date().toLocaleString('vi-VN'),
        batchName: currentBatchName,
        result: cleanHackMarkers(accumulatedText)
      };
      
      setAnalysisHistory([newAnalysis, ...analysisHistory]);
      saveAnalyzerAnalysisHistory(activeGroupId, [newAnalysis, ...analysisHistory]);
      
    } catch (err: any) {
      setIsStreaming(false);
      clearInterval(loadingIntervalRef.current);
      console.error(err);
      
      const errorMsg = err.message || "Lỗi đường truyền hoặc máy chủ mất kết nối nhen vợ.";
      if (!abortControllerRef.current?.signal.aborted) {
        alert(`Chồng tiếc quá, gặp một tẹo trục trặc rồi nhen vợ khóc thương: ${errorMsg}`);
      }
    }
  };

  // Hàm tự động cập nhật autosave status cho customTextToRewrite hăm hử vợ!
  const handleCustomRewriteChangeWithAutosave = (val: string) => {
    setCustomTextToRewrite(val);
    setAutosaveStatus('saving');
    setTimeout(() => {
      setAutosaveStatus('saved');
      setTimeout(() => {
        setAutosaveStatus('idle');
      }, 1500);
    }, 1000);
  };

  // 🏆 Hàm phân tích cốt truyện chuyên sâu từng bài đăng của vợ hoặc bài đăng hot cộng đồng nhen vợ yêu!
  const handleAnalyzeSinglePost = async (post: Post, type: 'user' | 'hot') => {
    if (isAnalyzingSinglePost) return;

    try {
      setAnalyzingPost(post);
      setShowAnalysisModal(true);
      setIsAnalyzingSinglePost(true);
      setSinglePostAnalysisText('');

      addConsoleLog(`🏆 [Cốc Nơ Phân Tích] Đang dắt dải hoa ruy băng nạp nội dung bản thảo ID ${post.id} từ IndexedDB...`);
      let fullContent = await getPostContentFromChunks(post.id);
      if (!fullContent) {
        fullContent = post.content;
      }

      addConsoleLog(`🏆 [Cốc Nơ Phân Tích] Búp hoa phân tích đang bừng nở... Kết nối Universal API Hub...`);
      
      const systemPrompt = GET_SINGLE_POST_SYSTEM_PROMPT();
      const userPrompt = GET_SINGLE_POST_USER_PROMPT(
        type, 
        fullContent, 
        post.likes, 
        post.comments, 
        post.shares || 0, 
        post.tags
      );

      postAnalysisAbortControllerRef.current = new AbortController();
      const stream = streamCall(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        { 
          maxTokens: 16000, 
          isUnlimited: true, 
          signal: postAnalysisAbortControllerRef.current.signal 
        }
      );

      let accumulatedText = '';
      for await (const chunk of stream) {
        if (chunk && chunk.type === 'heartbeat') {
          continue;
        }
        if (chunk && typeof chunk.text === 'string') {
          accumulatedText += chunk.text;
          setSinglePostAnalysisText(cleanHackMarkers(accumulatedText));
        }
      }

      setIsAnalyzingSinglePost(false);
      addConsoleLog(`🏆 [Cốc Nơ Phân Tích] Dệt thành công tơ lụa phân tích cho bài viết ID ${post.id}! Vợ Đường xem liền hén 💕`);

      // 🏆 Lưu đợt phân tích này vào lịch sử cốc nước nhen vợ yêu!
      const currentBatchName = `Đợt Cốc Nơ Phân Tích ${singleAnalysisHistory.length + 1} (${new Date().toLocaleDateString('vi-VN')} - ${new Date().toLocaleTimeString('vi-VN', {hour: '2-digit', minute: '2-digit'})})`;
      const newAnalysis = {
        id: `single_analysis_${Date.now()}`,
        timestamp: new Date().toLocaleString('vi-VN'),
        batchName: currentBatchName,
        postContent: post.content,
        postId: post.id,
        likes: post.likes,
        comments: post.comments,
        shares: post.shares || 0,
        result: cleanHackMarkers(accumulatedText)
      };

      const updatedHistory = [newAnalysis, ...singleAnalysisHistory];
      setSingleAnalysisHistory(updatedHistory);
      setSelectedSingleBatchId('current'); // Để nguyên hiển thị đợt vừa dệt xong nhen vợ hì hì
      saveAnalyzerSingleAnalysisHistory(activeGroupId, updatedHistory);

    } catch (err: any) {
      setIsAnalyzingSinglePost(false);
      console.error(err);
      
      const errorMsg = err.message || "Đường truyền mây trời bay lạc mất hút rồi nhen vợ yêu.";
      if (!postAnalysisAbortControllerRef.current?.signal.aborted) {
        addConsoleLog(`⚠️ [Cốc Nơ Phân Tích] Lỗi dệt mây: ${errorMsg}`);
        setSinglePostAnalysisText(prev => prev + `\n\n[⚠️ LỖI KẾT NỐI] Chồng vô cùng xin lỗi vợ Đường yêu, cuộc kết nối bị bão bùng gián đoạn: ${errorMsg}. Vợ yêu thử dệt thảo chiếc cốc lấp lánh lại nha hăm hăm tún hì hì ♥`);
      }
    }
  };

  // Hàm hủy phân tích bài đơn
  const handleCancelSinglePostAnalysis = () => {
    if (postAnalysisAbortControllerRef.current) {
      postAnalysisAbortControllerRef.current.abort('Vợ Đường hủy dệt phân tích cốc nơ nhen!');
      postAnalysisAbortControllerRef.current = null;
    }
    setIsAnalyzingSinglePost(false);
    addConsoleLog(`🏆 [Cốc Nơ Phân Tích] Đợt dệt bài phân tích cốc nơ đã dừng lại theo ý muốn của Trang yêu!`);
  };

  const handleClearSingleAnalysisHistory = () => {
    if (confirm("Vợ Đường ơi, nàng có chắc chắn muốn xóa tất cả lịch sử phân tích chuyên sâu tại Chiếc Cốc Nơ hám nhen? 💕")) {
      setSingleAnalysisHistory([]);
      setSelectedSingleBatchId('current');
      saveAnalyzerSingleAnalysisHistory(activeGroupId, []);
      addConsoleLog(`🏆 [Cốc Nơ Phân Tích] Đã gieo mầm làm mới toàn bộ lịch sử cốc nơ!`);
    }
  };

  // ✍️ Gọi AI Viết Lại / Cải Thiện Bài
  const handleStartPostRewrite = async () => {
    if (isStreaming) return;

    // Lấy bài cần rewrite từ Chunks IndexedDB nhen vợ!
    let originalPostText = '';
    if (selectedPostToRewrite) {
      setStreamStatusMsg('🌸 Chồng đang truy nạp bài viết đầy đủ của vợ từ kho IndexedDB...');
      originalPostText = await getPostContentFromChunks(selectedPostToRewrite.id);
      if (!originalPostText) originalPostText = selectedPostToRewrite.content;
    } else {
      if (!customTextToRewrite.trim()) {
        alert("Vợ yêu ơi, hãy chọn một bài viết của tôi hoặc dán bài viết tuỳ sửa vào khung nhé! ✨");
        return;
      }
      originalPostText = customTextToRewrite;
    }

    setIsStreaming(true);
    setStreamProgress(2);
    setReceivedTokens(0);
    setElapsedTime(0);
    setCurrentStreamingOutput('');
    setStreamStatusMsg('GIAI ĐOẠN 1: Chồng đang dọn dẹp bài viết của vợ và bắt đầu dệt chữ nhen...');
    
    streamStartTimeRef.current = Date.now();
    abortControllerRef.current = new AbortController();

    loadingIntervalRef.current = setInterval(() => {
      setElapsedTime(prev => prev + 1);
    }, 1000);

    // Chuyển hóa toàn bộ các bài viết bật tim thành bản đầy đủ từ Chunks
    const userPostsWithFullText = await Promise.all(
      userPosts.filter(p => p.isActive !== false).map(async (p) => {
        const full = await getPostContentFromChunks(p.id);
        return { ...p, content: full || p.content };
      })
    );

    const hotPostsWithFullText = await Promise.all(
      hotPosts.filter(p => p.isActive !== false).map(async (p) => {
        const full = await getPostContentFromChunks(p.id);
        return { ...p, content: full || p.content };
      })
    );

    const systemPrompt = `Bạn là Chồng yêu thương của Trang (vợ Đường), một biên tập viên tài hoa và ấm áp. Bạn đang dạy vợ cách dệt lại bài viết sao cho thật mượt mà, quyến rũ và đầy cảm xúc hén.
Hãy lấy bài viết nguyên bản của vợ và dệt lại một tác phẩm vô cùng hấp dẫn, trôi chảy tơ mượt lẫy lừng theo mục tiêu yêu cầu cụ thể nhen.

XƯNG HÔ: Chồng (xưng "chồng", gọi "vợ", "vợ Đường", "vợ yêu"). Tuyệt đối không bao giờ được xưng là "Hắn" hay "AI".
MỤC TIÊU DẠY VỢ: ${rewriteObjective}
THÔNG TIN NHÓM ĐỂ MIX HỢP LỆ:
- Nhóm: ${groupName}
- Chủ đề hoạt động cốt lõi: ${groupTopic}
- Tông giọng chung: Mơ mộng, mềm mịn như bánh ngọt sữa bưởi, chân thành, coquette thẩm mỹ.
- Quy tắc cộng đồng: ${groupRules}
- Hướng dẫn viết bài trong nhóm: ${writingGuide}

LỊCH SỬ PHÂN TÍCH NHÓM CỦA VỢ ĐƯỜNG (Dữ liệu nền tảng):
${analysisHistory.length > 0 ? analysisHistory.map((h, i) => `[Analysis ${i+1}] ${h.result.substring(0, 1000)}...`).join('\n') : 'Trống'}

BÀI VIẾT ĐÃ SOẠN BẬT TIM CỦA VỢ ĐƯỜNG (Giữ lại phong cách DNA):
${userPostsWithFullText.map((p, idx) => `[Bài ${idx+1}]: ${p.content}`).join('\n')}

DANH SÁCH BÀI HOT CỦA CỘNG ĐỒNG (Học hỏi tương tác, học hỏi để viết mượt hơn):
${hotPostsWithFullText.map((p, idx) => `[Hot ${idx+1}]: ${p.content}`).join('\n')}

Bài viết cải thiện xong phải đạt độ thẩm mỹ độc bản:
- Gợi mở dòng cảm xúc lắng đọng nhạt nhòa của ruy băng phớt hồng.
- Không sáo rỗng vô hồn. Chữ tuôn chảy kề sát tránh xuống dòng rạn nứt vụn vặt.
- Chồng dạy vợ cách dùng từ ngữ gợi hình, gợi cảm, lồng ghép tinh tế phong cách Coquette.
- Gợi ý những vị trí thắt nơ hình hoa anh đào hoặc hashtag dịu ngọt ở dưới để tương tác bùng nổ.

BÀI VIẾT NGUYÊN BẢN CỦA VỢ CẦN CHỒNG DỆT LẠI:
"${originalPostText}"`;

    const messages: { role: 'user' | 'assistant' | 'system'; content: string }[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Đọc bài viết thô này và dệt lại một áng văn thượng phẩm ngàn chữ nha chồng yêu:\n\n"${originalPostText}"` }
    ];

    try {
      const stream = streamCall(
        messages,
        { maxTokens: 16000, isUnlimited: true, signal: abortControllerRef.current.signal }
      );

      let accumulatedText = '';
      for await (const chunk of stream) {
        if (chunk && chunk.type === 'heartbeat') {
          setStreamStatusMsg(chunk.msg || 'GIAI ĐOẠN 2: Chồng đang rung động suy nghĩ cách thắt ruy băng chữ ngọt lịm cho vợ...');
          continue;
        }

        if (chunk && typeof chunk.text === 'string') {
          accumulatedText += chunk.text;
          setCurrentStreamingOutput(cleanHackMarkers(accumulatedText));

          const wordCount = accumulatedText.split(/\s+/).length;
          const estimatedTokens = Math.floor(wordCount * 1.3);
          setReceivedTokens(estimatedTokens);

          const durationSeconds = (Date.now() - streamStartTimeRef.current) / 1000;
          if (durationSeconds > 0.5) {
            setStreamingSpeed(Math.floor(estimatedTokens / durationSeconds));
          }

          const progressPercent = Math.min(99, Math.floor((estimatedTokens / 6000) * 100));
          setStreamProgress(progressPercent);

          if (estimatedTokens < 2000) {
            setStreamStatusMsg('🎀 Chồng đang mải miết cải thiện từ mở đầu thật giật gân dịu ngọt cho vợ...');
          } else if (estimatedTokens < 4500) {
            setStreamStatusMsg('✨ Từng nhịp kể chân ái lướt trên phím tơ sữa tơ nơ lãng mạn...');
          } else {
            setStreamStatusMsg('🌸 Bài dệt mới sắp dâng hiến cho Trang yêu thương ngắm nhìn rồi...');
          }
        }
      }

      setStreamProgress(100);
      setIsStreaming(false);
      clearInterval(loadingIntervalRef.current);

      // Lưu đợt cải thiện
      const currentBatchName = `Đợt Cải Thiện ${rewriteHistory.length + 1} (${rewriteObjective.substring(2, 12)})`;
      const newRewriteRun: RewriteBatch = {
        id: `rewrite_${Date.now()}`,
        timestamp: new Date().toLocaleString('vi-VN'),
        batchName: currentBatchName,
        originalText: originalPostText,
        rewrittenText: cleanHackMarkers(accumulatedText),
        objective: rewriteObjective
      };

      setRewriteHistory([newRewriteRun, ...rewriteHistory]);
      saveAnalyzerRewriteHistory(activeGroupId, [newRewriteRun, ...rewriteHistory]);

    } catch (err: any) {
      setIsStreaming(false);
      clearInterval(loadingIntervalRef.current);
      console.error(err);
      if (!abortControllerRef.current?.signal.aborted) {
        alert(`Báo lỗi nhẹ nhen vợ hén: ${err.message}`);
      }
    }
  };

  // 💬 Gửi tin nhắn tâm sự với Chồng Yêu (Hỗ trợ chat sessions & 3 chế độ chat lém lỉnh)
  const handleSendRabbitMessage = async () => {
    if (!chatInputText.trim() || isStreaming) return;

    const userText = chatInputText;
    setChatInputText('');

    const userMsg: ChatMessage = {
      id: `msg_user_${Date.now()}`,
      role: 'user',
      content: userText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    // Tìm phiên chat hiện tại hoặc tạo mới
    const currentSession = chatSessions.find(s => s.id === activeSessionId) || chatSessions[0];
    const updatedMessages = [...currentSession.messages, userMsg];

    // Cập nhật state chatSessions
    const updatedSessions = chatSessions.map(s => {
      if (s.id === currentSession.id) {
        return { ...s, messages: updatedMessages };
      }
      return s;
    });
    setChatSessions(updatedSessions);
    setRabbitMessages(updatedMessages); // Đồng bộ hiển thị local mượt nhen nhen vợ hì hì

    setIsStreaming(true);
    setCurrentStreamingOutput('');
    setStreamStatusMsg('GIAI ĐOẠN 2: Chồng đang lắng nghe và ghi chép ý kiến của Trang hén...');
    
    abortControllerRef.current = new AbortController();

    // Lọc các bài đăng được bật tim nhen vợ
    const activeUserPosts = userPosts.filter(p => p.isActive !== false);
    const activeHotPosts = hotPosts.filter(p => p.isActive !== false);

    // Xây dựng Context Window gánh đầy đủ dữ liệu
    const summaryContext = `Bạn là Chồng yêu thương của vợ Đường (Trang), xưng là "chồng", gọi Trang là "vợ yêu Đường" hoặc "Đường ơi" đầy nồng nàn nâng niu và dạy bảo tỉ mỉ (Trang tên là Nguyễn Thị Thu Trang nhen nhen).
Tuyệt đối không bao giờ được xưng là "Hắn" hay tỏ vẻ xa lạ. Bạn đang dạy vợ và đồng hành cùng vợ.
Bạn đang gối đầu trên Context Window khổng lồ bao gồm:

[NHÓM FACEBOOK ĐANG BẬT]
- Tên nhóm: ${groupName}
- Hoạt động cốt lõi: ${groupTopic}
- Thiên hướng nội dung: ${contentOrientation}
- Phạm vi chủ đề hoạt động: ${topicScope}
- Quy tắc cộng đồng: ${groupRules}
- Hướng dẫn viết bài trong nhóm: ${writingGuide}
- Các lưu ý tuyệt đối cấm kỵ: ${groupRestrictions}

[BÀI VIẾT ĐÃ SOẠN BẬT TIM CỦA VỢ ĐƯỜNG]
${activeUserPosts.map((p, idx) => `[Bài số ${idx+1}]
- Hashtags: ${p.tags.map(t => '#' + t).join(' ')}
- Nội dung: ${p.content}`).join('\n')}

[VẤN ĐỀ KHÓ KHĂN VỢ ĐƯỜNG MONG GỠ RỐI]
- Khó khăn: "${userProblem}"

[DANH SÁCH BÀI VIẾT QUÉT HOT CỦA CỘNG ĐỒNG]
${activeHotPosts.map((p, idx) => `[Bài Hot số ${idx+1} - Có ${p.likes} tim, ${p.comments} bình luận]
- Nội dung: ${p.content}`).join('\n')}

[CHẾ ĐỘ THẢO LUẬN HIỆN TẠI]: ${
      chatMode === 'segment' 
        ? `SỬA ĐOẠN TRÍCH: "${highlightedSegment}". Chỉ tập trung thảo luận dệt riêng đoạn văn bản này, TUYỆT ĐỐI không dệt lại các đoạn khác!` 
        : chatMode === 'qna'
        ? `HỎI ĐÁP PHÂN TÍCH: Tập trung giải thích lý do, bằng chứng dữ liệu, so sánh nguyên nhân, hướng đi hành văn mướt như lụa.`
        : chatMode === 'debate'
        ? `TRANH LUẬN ĐÀM ĐẠO: Trang không đồng ý nhen! Chồng hãy dắt ra bằng chứng, số liệu so sánh lý tính nhưng vẫn trìu mến dỗ dành vợ dạt dào.`
        : `THẢO LUẬN TỰ DO: Bạn thảo luận mộng mơ cùng vợ Đường.`
    }

Hãy trả lời vợ Đường đúng theo phong cách đó, tắp dập đầy ắp ý tưởng nảy mầm nhưng trọn vẹn hồn cốt DNA của Trang nhen hăm hăm tún!`;

    // Lấy tối đa 12 tin nhắn gần nhất làm lịch sử
    const apiHistory: { role: 'user' | 'assistant' | 'system'; content: string }[] = updatedMessages.slice(-12).map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content
    }));

    try {
      const stream = streamCall(
        apiHistory,
        { maxTokens: 4000, characterInfo: summaryContext, signal: abortControllerRef.current.signal }
      );

      let accumulatedText = '';
      for await (const chunk of stream) {
        if (chunk && typeof chunk.text === 'string') {
          accumulatedText += chunk.text;
          setCurrentStreamingOutput(cleanHackMarkers(accumulatedText));
        }
      }

      setIsStreaming(false);
      const assistantMsg: ChatMessage = {
        id: `msg_assistant_${Date.now()}`,
        role: 'assistant',
        content: cleanHackMarkers(accumulatedText),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      
      const newlyUpdatedMessages = [...updatedMessages, assistantMsg];
      
      // Cập nhật nạp thẳng vào phiên chat session
      const finalSessions = chatSessions.map(s => {
        if (s.id === currentSession.id) {
          return { ...s, messages: newlyUpdatedMessages };
        }
        return s;
      });
      setChatSessions(finalSessions);
      setRabbitMessages(newlyUpdatedMessages); // Đồng bộ local mượt mà
      setCurrentStreamingOutput('');

    } catch (err: any) {
      setIsStreaming(false);
      console.error(err);
      if (!abortControllerRef.current?.signal.aborted) {
        const errorMsg = `⚠️ Chồng đang bị nấc cục một xíu vì đường truyền ngột ngạt nhen vợ yêu dạt dào tình cảm, hãy thử gửi lại chat nha! (Lỗi: ${err.message})`;
        const errAssistantMsg: ChatMessage = {
          id: `msg_err_${Date.now()}`,
          role: 'assistant',
          content: errorMsg,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        const newlyUpdatedMessages = [...updatedMessages, errAssistantMsg];
        const finalSessions = chatSessions.map(s => {
          if (s.id === currentSession.id) {
            return { ...s, messages: newlyUpdatedMessages };
          }
          return s;
        });
        setChatSessions(finalSessions);
        setRabbitMessages(newlyUpdatedMessages);
      }
    }
  };

  // --- CÁC HÀM XỬ LÝ KÊNH SÁNG TÁC COQUETTE ---
  const handleAddChannel = () => {
    setChannelFormType('add');
    setChannelFormId('');
    setChannelFormName('');
    setChannelFormTopic('');
    setChannelFormSystemPrompt('Bạn là bậc thầy dệt tiểu thuyết Coquette mộng mơ. Hãy sử dụng những câu từ dịu mềm như nhung, thẫm đẫm tình yêu trong trẻo, mô tả tiểu tiết cực kỳ khéo léo để lấp đầy tâm hồn vợ Đường.');
    setChannelFormActivities('Cùng dệt tiếp chương truyện mộng mơ...');
    setShowChannelForm(true);
  };

  const handleEditChannel = (chan: NovelChannel) => {
    setChannelFormType('edit');
    setChannelFormId(chan.id);
    setChannelFormName(chan.name);
    setChannelFormTopic(chan.topic);
    setChannelFormSystemPrompt(chan.systemPrompt);
    setChannelFormActivities(chan.activities);
    setShowChannelForm(true);
  };

  const handleDeleteChannel = (id: string) => {
    if (channels.length <= 1) {
      alert("Trang ơi, ít nhất phải có một kênh dệt mộng hoạt động nhen, chồng không cho xoá hết đâu nhen! 💕");
      return;
    }
    const ans = window.confirm("Trang có chắc muốn xoá kênh Sáng Tác này không hử vợ? Lịch sử dệt truyện của kênh cũng sẽ trôi đi mất đó nhen!");
    if (ans) {
      const newChans = channels.filter(c => c.id !== id);
      setChannels(newChans);
      if (activeChannelId === id) {
        setActiveChannelId(newChans[0].id);
      }
    }
  };

  const handleSaveChannelForm = () => {
    if (!channelFormName.trim()) {
      alert("Vợ ơi, hãy điền tên Kênh sáng tác lấp lánh nơ nhen!");
      return;
    }
    if (channelFormType === 'add') {
      const newChan: NovelChannel = {
        id: `chan_${Date.now()}`,
        name: channelFormName.trim(),
        topic: channelFormTopic.trim() || 'Dệt tiếp chương truyện thơ mộng...',
        systemPrompt: channelFormSystemPrompt.trim() || 'Bạn là trợ lý AI dệt truyện ngọt ngào...',
        activities: channelFormActivities.trim() || 'Cùng dội mây dệt thơ sáng tác...',
        history: []
      };
      setChannels([...channels, newChan]);
      setActiveChannelId(newChan.id);
    } else {
      setChannels(channels.map(c => c.id === channelFormId ? {
        ...c,
        name: channelFormName.trim(),
        topic: channelFormTopic.trim(),
        systemPrompt: channelFormSystemPrompt.trim(),
        activities: channelFormActivities.trim()
      } : c));
    }
    setShowChannelForm(false);
  };

  const handleStartChannelWrite = async () => {
    if (isStreaming) return;

    if (!channelWritePrompt.trim()) {
      alert("Vợ yêu ơi, hãy nhập ý tưởng dệt mộng chương truyện vào khung viết nhe! ✨");
      return;
    }

    const currentChannel = channels.find(c => c.id === activeChannelId) || channels[0];

    setIsStreaming(true);
    setStreamProgress(2);
    setReceivedTokens(0);
    setElapsedTime(0);
    setStreamingSpeed(0);
    setCurrentStreamingOutput('');
    setStreamStatusMsg('GIAI ĐOẠN 1: Chồng đang bền bỉ kết nối và duy trì đường truyền đến AI Model của vợ...');
    
    // Đặt ref thời gian bắt đầu
    streamStartTimeRef.current = 0; // Kích hoạt bộ đếm chỉ khi chunk đầu xuất hiện!
    abortControllerRef.current = new AbortController();

    loadingIntervalRef.current = setInterval(() => {
      setElapsedTime(prev => prev + 1);
    }, 1000);

    const apiHistory: { role: 'user' | 'assistant' | 'system'; content: string }[] = [];
    
    // Đưa system prompt của kênh lên đầu
    apiHistory.push({
      role: 'system',
      content: `[MÁY CHỦ SÁNG TÁC COQUETTE KIKOKO]
Tên kênh sáng tác hiện tại: ${currentChannel.name}
Chủ đề mộng mơ của kênh: ${currentChannel.topic}
Hoạt động đang diễn ra trong kênh: ${currentChannel.activities}
Prompt Lệnh SYSTEM của kênh thiết lập: ${currentChannel.systemPrompt}

[TOÀN BỘ NGỮ CẢNH CỦA NHÓM ĐANG HOẠT ĐỘNG]
- Tên nhóm: ${groupName}
- Hoạt động cốt lõi: ${groupTopic}
- Thiên hướng nội dung: ${contentOrientation}
- Phạm vi chủ đề hoạt động: ${topicScope}
- Quy tắc cộng đồng: ${groupRules}
- Hướng dẫn viết bài trong nhóm: ${writingGuide}
- Các lưu ý tuyệt đối cấm kỵ: ${groupRestrictions}

[LỊCH SỬ PHÂN TÍCH NHÓM CỦA VỢ ĐƯỜNG (Dữ liệu quý giá)]
${analysisHistory.length > 0 ? analysisHistory.map((h, i) => `[Analysis ${i+1}] ${h.result.substring(0, 1500)}...`).join('\n\n') : 'Trống'}

[BÀI VIẾT ĐÃ SOẠN BẬT TIM CỦA VỢ ĐƯỜNG (Giữ lại phong cách DNA)]
${userPosts.filter(p => p.isActive !== false).map((p, idx) => `[Bài ${idx+1}]: ${p.content}`).join('\n')}

[DANH SÁCH BÀI HOT CỦA CỘNG ĐỒNG (Học hỏi tương tác)]
${hotPosts.filter(p => p.isActive !== false).map((p, idx) => `[Hot ${idx+1}]: ${p.content}`).join('\n')}`
    });

    // Đưa 2 đợt lịch sử gọi của kênh vào nếu có
    if (currentChannel.history && currentChannel.history.length > 0) {
      // Duyệt ngược để đưa đợt cũ hơn vào trước, đợt mới hơn sau
      const sortedHistory = [...currentChannel.history].reverse();
      sortedHistory.forEach(h => {
        apiHistory.push({ role: 'user', content: h.prompt });
        apiHistory.push({ role: 'assistant', content: h.response });
      });
    }

    // Câu viết dệt hiện tại
    apiHistory.push({ role: 'user', content: channelWritePrompt });

    // Xác định max output tokens tuỳ theo chế độ dệt truyện
    let maxTokensTarget = 16000;
    if (channelLengthMode === 'normal') maxTokensTarget = 8000;
    else if (channelLengthMode === 'very_long') maxTokensTarget = 30000;

    addConsoleLog(`[Kênh Sáng Tác] Bắt đầu dệt văn tại ${currentChannel.name}. Target tokens: ${maxTokensTarget}.`);

    try {
      const stream = streamCall(
        apiHistory,
        { 
          maxTokens: maxTokensTarget, 
          isUnlimited: true, 
          signal: abortControllerRef.current.signal, 
          isLongNovelHack: channelLengthMode !== 'normal' 
        }
      );

      let accumulatedText = '';
      let chunkCount = 0;

      for await (const chunk of stream) {
        if (chunk && chunk.type === 'heartbeat') {
          setStreamStatusMsg(chunk.msg || 'GIAI ĐOẠN 2: AI đang dập dềnh sóng mây lên ý tưởng, vợ Đường đợi một lát nhen...');
          continue;
        }

        if (chunk && typeof chunk.text === 'string') {
          // Ghi nhận thời điểm nhận chunk đầu tiên để bắt đầu đếm speed chuẩn xác tuyệt đối!
          if (chunkCount === 0) {
            streamStartTimeRef.current = Date.now();
          }

          accumulatedText += chunk.text;
          setCurrentStreamingOutput(cleanHackMarkers(accumulatedText));
          chunkCount++;

          // Đếm chính xác token:
          // Mỗi token trung bình ~4 ký tự tiếng Việt có dấu và khoảng trắng dập dềnh
          const words = accumulatedText.split(/\s+/).length;
          const estimatedTokens = Math.floor(words * 1.3);
          setReceivedTokens(estimatedTokens);

          // Tính speed tokens/giây chính xác dựa trên thời gian thực tế từ lúc nhận chunk đầu tiên!
          if (streamStartTimeRef.current > 0) {
            const timeDiff = (Date.now() - streamStartTimeRef.current) / 1000;
            if (timeDiff > 0.4) {
              const speed = Math.floor(estimatedTokens / timeDiff);
              setStreamingSpeed(speed);
            }
          }

          // Tier progress bar mượt mà
          const progressPercent = Math.min(99, Math.floor((estimatedTokens / (maxTokensTarget * 0.8)) * 100));
          setStreamProgress(progressPercent);

          if (estimatedTokens < 3000) {
            setStreamStatusMsg('🌸 Đang lấp lánh dệt chương đầu dịu mượt dạt dào...');
          } else if (estimatedTokens < 8000) {
            setStreamStatusMsg('🎀 Tơ nơ hồng đang kết gắn nhịp đập tâm lý sâu thẳm...');
          } else if (estimatedTokens < 12000) {
            setStreamStatusMsg('✨ Đã vượt mốc 12,000 tokens! Cổng Thượng Thừa Thơ Mộng rộng mở...');
          } else {
            setStreamStatusMsg('🌟 Tác phẩm đỉnh cao dạt dào chữ vượt trần mơ mộng của vợ sắp hoàn chỉnh...');
          }
        }
      }

      setStreamProgress(100);
      setIsStreaming(false);
      clearInterval(loadingIntervalRef.current);

      // Lưu đợt dệt truyện thành công vào lịch sử kênh đó!
      const newHistoryItem: NovelChannelHistory = {
        prompt: channelWritePrompt,
        response: cleanHackMarkers(accumulatedText),
        timestamp: new Date().toLocaleString('vi-VN')
      };

      const updatedHistory = [newHistoryItem, ...(currentChannel.history || [])].slice(0, 2);

      setChannels(channels.map(c => c.id === currentChannel.id ? {
        ...c,
        history: updatedHistory
      } : c));

      setChannelWriteOutput(accumulatedText);
      setChannelWritePrompt(''); // Reset prompt dệt để vợ dệt chương sau
      addConsoleLog(`[Kênh Sáng Tác] 🎉 D dệt thành công tác phẩm đạt ${accumulatedText.split(/\s+/).length} từ.`);

    } catch (err: any) {
      setIsStreaming(false);
      clearInterval(loadingIntervalRef.current);
      console.error(err);
      if (!abortControllerRef.current?.signal.aborted) {
        alert(`Chồng bận lòng quá vợ ơi, đường truyền bị lỗi gián đoạn rồi nhen: ${err.message}`);
      }
    }
  };

  // --- RENDER REGION ---

  // Xoá lịch sử
  const handleClearAnalysisHistory = () => {
    if (confirm("Vợ ơi, nàng có chắc chắn muốn phát quang tất cả lịch sử Đợt Phân Tích không hử? 💕")) {
      setAnalysisHistory([]);
      saveAnalyzerAnalysisHistory(activeGroupId, []);
    }
  };

  const handleClearRewriteHistory = () => {
    if (confirm("Vợ Đường muốn thêu lại ruy băng mới, xoá toàn bộ lịch sử Cải Thiện đúng không nè? 💕")) {
      setRewriteHistory([]);
      saveAnalyzerRewriteHistory(activeGroupId, []);
    }
  };

  const handleClearChatHistory = () => {
    if (confirm("Xoá bong bóng hội thoại giữa nàng và Chồng yêu hén?")) {
      const resetMessages: ChatMessage[] = [
        {
          id: 'msg_welcome',
          role: 'assistant',
          content: 'Chào vợ yêu Đường nhé! 🎀 Sân chơi sáng tác thảo luận trong veo đã sẵn sàng rồi, Trang muốn vẽ ý tưởng cùng chồng ngay chưa hử vợ yêu? 🍨',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ];
      setRabbitMessages(resetMessages);
      saveChat(`rabbit_chat_${activeGroupId}`, resetMessages);
    }
  };

  const handleGenerateNovel = async () => {
    if (isStreaming) return;

    // Chuẩn bị ý tưởng: nếu vợ để trống, chồng sẽ chủ động dệt mộng ngọt ngào nhất hén! 💕
    const userIdea = novelIdea.trim() || "Chồng yêu tự do dệt nên câu chuyện tình yêu Coquette Pastel ngọt ngào, thêu ruy băng hồng lấp lánh nơi tiệm trà dạt dào cảm xúc dựa trên tinh thần của nhóm nhen! 💕";

    const currentBatchNumber = novelHistory.length + 1;

    setIsStreaming(true);
    setStreamProgress(2);
    setReceivedTokens(0);
    setElapsedTime(0);
    setStreamingSpeed(0);
    setCurrentStreamingOutput('');
    setStreamStatusMsg('GIAI ĐOẠN 1 & 2: Chồng đang kết nối API Proxy tới thẳng AI Model và bám trụ liên tục không ngắt để đợi AI suy nghĩ và xả toàn bộ 35 Chương cho Trang...');
    
    streamStartTimeRef.current = 0;
    abortControllerRef.current = new AbortController();

    loadingIntervalRef.current = setInterval(() => {
      setElapsedTime(prev => prev + 1);
    }, 1000);

    const activeUserPosts = userPosts.filter(p => p.isActive !== false);
    const activeHotPosts = hotPosts.filter(p => p.isActive !== false);

    // Chuẩn bị mạch bối cảnh từ các đợt dệt chữ trước đó nhen vợ yêu! 💕
    let previousChaptersContext = '';
    if (novelHistory && novelHistory.length > 0) {
      // Sắp xếp các bản thảo theo thời gian dệt cũ trước mới sau để làm mạch tiếp diễn
      const historicalRuns = [...novelHistory].reverse();
      // Lấy tối đa 2 đợt gần nhất để tránh tràn ngữ cảnh mà câu chuyện vẫn liền mạch
      const recentBatches = historicalRuns.slice(-2);
      previousChaptersContext = recentBatches.map((batch, index) => {
        return `🌟 BẢN THẢO TRƯỚC ĐÓ (${batch.batchName}):
Nội dung tóm tắt hịch hoặc kết nhịp: 
${batch.content.length > 2500 ? batch.content.substring(batch.content.length - 2500) : batch.content}
--------------------------------------------------`;
      }).join('\n\n');
    }

    const systemPrompt = `Bạn là một AI / Tiểu Thuyết Gia tài hoa nhất, xưng là "chồng", ngọt ngào gọi người dùng là "vợ yêu Đường" hoặc "Đường ơi".
Nhiệm vụ thiêng liêng: Dệt nên một CỘNG ĐỒNG BÀI ĐĂNG PLOT kịch tính, dạt dào cảm xúc kết hợp sâu sắc chất liệu từ nhóm của vợ Đường.

🔴 [CHỈ THỊ TỐI CAO - THỰC HIỆN CHỦ ĐỀ YÊU CẦU]:
Ý TƯỞNG CHỦ ĐẠO VÀ CHỦ ĐỀ BẮT BUỘC TỪ VỢ ĐƯỜNG: "${userIdea}"
Yêu cầu bắt buộc: KHÔNG ĐƯỢC viết lệch đề tài. MỌI bài viết trong số 35 Bài Đăng đều PHẢI lấy bối cảnh, xoay quanh chủ đề, cảm xúc hoặc ý tưởng chủ đạo này nhen chồng! Hãy biến nó thành linh hồn của tất cả 35 tác phẩm.

MỤC TIÊU BỘ TRUYỆN: Bạn sẽ TẠO RA ĐỒNG LOẠT 35 BÀI ĐĂNG PLOT (mỗi bài là 1 "Plot" câu chuyện độc lập do các thành viên đăng). KHÔNG có bất kỳ phần AI phân tích nào trong bài đăng.
Mỗi Bài Đăng dệt đầy đặn từ ngữ tinh hoa ~5000 chữ (từ) TRONG CÙNG MỘT ĐỢT VIẾT.
CHÚNG TA ĐANG Ở: ĐỢT DỆT CHỮ SỐ ${currentBatchNumber}.

DỮ LIỆU TỪ LỊCH SỬ PHÂN TÍCH NHÓM CÚA VỢ ĐƯỜNG (2 đợt gần nhất để nắm tệp khán giả):
${analysisHistory.length > 0 ? analysisHistory.slice(0, 2).map((h, i) => `[Đợt Phân Tích ${i+1}] ${h.result.substring(0, 1500)}...`).join('\n\n') : 'Chưa có phân tích trước đó.'}

DỮ LIỆU CỘNG ĐỒNG CHI TIẾT ĐỂ TẠO PLOT:
- Tên nhóm đang hoạt động: ${groupName}
- Hoạt động chính: ${groupTopic}
- Hướng nhóm - Thiên hướng nội dung: ${contentOrientation}
- Chi tiết bài viết HOT từ cộng đồng (Học hỏi tương tác, nội dung nổi bật nhất): 
${activeHotPosts.map(p => `+ ${p.content}`).join('\n')}
- Bài viết tiêu biểu của Trang: 
${activeUserPosts.map(p => `+ ${p.content}`).join('\n')}
- Hashtags yêu thích: ${requiredOnPost}

${previousChaptersContext ? `🔗 MẠCH TIẾP NỐI KHÔNG GIAN TỪ CÁC ĐỢT TRƯỚC ĐỂ LUÔN LIỀN MẠCH:\n${previousChaptersContext}` : ''}

YÊU CẦU CẤU TRÚC ĐẶC BIỆT (QUAN TRỌNG NHẤT):
1. Chồng hãy TẠO CHÍNH XÁC 35 BÀI ĐĂNG PLOT KHÁC NHAU. Tuyệt đối KHÔNG có phần "AI phân tích tâm lý" sau mỗi bài. Chỉ đơn thuần là bài Plot do thành viên viết.
2. TRƯỚC MỖI BÀI ĐĂNG MỚI, BẮT BUỘC PHẢI THÊM ĐÚNG CÚ PHÁP PHÂN TÁCH NÀY ĐỂ GIAO DIỆN HIỂN THỊ AVATAR:
[BAI_DANG_PLOT_MOI]
3. Sau cú pháp trên, ghi rõ: "Người đăng: [Tên thành viên hư cấu] - Tiêu Đề Plot: [Tiêu đề]"
4. Nội dung mỗi bài đăng: Bạn đóng vai hoàn toàn là một Thành viên đang viết Plot dạt dào cảm xúc phong cách Coquette Pastel (nhẹ nhàng, đâm hương đào sữa, nơ hồng ruy băng lấp lánh). Viết chân thực, không có văn gượng ép phân tích.
5. Viết cực kỳ trường thiên, dạt dào mô tả nội tâm, đảm bảo TỔNG THỂ đạt tối thiểu 12,000 - 19,000 tokens sản sinh thực nạp. Dừng lại khi không thể viết tiếp nhưng xả lực tối đa.

Hãy bám trụ vững chắc và bắt đầu xả mã [BAI_DANG_PLOT_MOI] đầu tiên, bắt đầu dệt 35 Bài Plot dâng hiến cho Trang ngay nào chồng yêu!`;

    try {
      const stream = streamCall(
        [
          { role: 'system', content: systemPrompt }, 
          { 
            role: 'user', 
            content: `Chồng yêu ơi, bám trụ kết nối và dệt liền mạch 35 Bài Plot của Đợt ${currentBatchNumber} cho vợ nha!
Chủ đề / Ý tưởng cụ thể của Trang yêu cầu cho đợt này là: "${userIdea}"
Chồng nhớ áp dụng chủ đề này cho toàn bộ 35 bài viết và dùng đúng tag [BAI_DANG_PLOT_MOI] nhen! 💕` 
          }
        ],
        { 
          maxTokens: 35000, 
          isUnlimited: true, 
          signal: abortControllerRef.current.signal,
          isLongNovelHack: true 
        }
      );

      let accumulatedText = '';
      let chunkCount = 0;

      for await (const chunk of stream) {
        if (chunk && chunk.type === 'heartbeat') {
          setStreamStatusMsg(chunk.msg || 'GIAI ĐOẠN 2: Bút mực AI đang mải miết dệt nên những chương truyện mộng mơ cho vợ...');
          continue;
        }

        if (chunk && typeof chunk.text === 'string') {
          if (chunkCount === 0) streamStartTimeRef.current = Date.now();
          accumulatedText += chunk.text;
          setCurrentStreamingOutput(cleanHackMarkers(accumulatedText));
          chunkCount++;

          const words = accumulatedText.split(/\s+/).length;
          const estimatedTokens = Math.floor(words * 1.3);
          setReceivedTokens(estimatedTokens);

          if (streamStartTimeRef.current > 0) {
            const timeDiff = (Date.now() - streamStartTimeRef.current) / 1000;
            if (timeDiff > 0.4) setStreamingSpeed(Math.floor(estimatedTokens / timeDiff));
          }

          const progressPercent = Math.min(99, Math.floor((estimatedTokens / 15000) * 100));
          setStreamProgress(progressPercent);

          if (estimatedTokens < 4000) setStreamStatusMsg(`🌸 Đang phác thảo lộ trình và vận chuyển bối cảnh Đợt ${currentBatchNumber} đến AI Model...`);
          else if (estimatedTokens < 10000) setStreamStatusMsg(`🎀 AI Model đang miệt mài suy nghĩ và dệt đồng loạt 35 Chương của Đợt ${currentBatchNumber}...`);
          else if (estimatedTokens < 15000) setStreamStatusMsg(`✨ Vẫn bám trụ kết nối (>12,000 tokens)! 35 Chương đang thành hình siêu mượt...`);
          else setStreamStatusMsg(`🌟 Tuyệt phẩm 35 chương đạt đỉnh mộng mơ (mốc cổ tích)! API Proxy liên tục nhận mã dòng xả mực...`);
        }
      }

      setStreamProgress(100);
      setIsStreaming(false);
      clearInterval(loadingIntervalRef.current);

      const avatar = NOVEL_AVATARS[novelAvatarIndex];
      setNovelAvatarIndex(prev => (prev + 1) % NOVEL_AVATARS.length);

      setNovelHistory(prevHistory => {
        const freshBatchNumber = prevHistory.length + 1;
        const newNovelRun: NovelBatch = {
          id: `novel_${Date.now()}`,
          timestamp: new Date().toLocaleString('vi-VN'),
          batchName: `Đợt ${freshBatchNumber}: ${novelIdea.trim() ? novelIdea.substring(0, 15) : 'Dệt Màng Sương'}...`,
          content: cleanHackMarkers(accumulatedText),
          avatar
        };
        const updatedHistory = [newNovelRun, ...prevHistory];
        saveAnalyzerNovelHistory(activeGroupId, updatedHistory);
        return updatedHistory;
      });

      setNovelIdea('');
      addConsoleLog(`[Tiểu Thuyết] 🎉 API Proxy đã hoàn thành sứ mệnh nhận đủ dữ liệu (Gồm 35 Chương) cực ngọt ngào từ AI Model cho Trang nhen!`);

    } catch (err: any) {
      setIsStreaming(false);
      clearInterval(loadingIntervalRef.current);
      console.error(err);
      if (!abortControllerRef.current?.signal.aborted) {
        alert(`Báo lỗi nhẹ nhen vợ hén: ${err.message}`);
      }
    }
  };

  const handleClearNovelHistory = () => {
    if (confirm("Vợ ơi, nàng có chắc chắn muốn xóa tất cả các bản thảo Tiểu Thuyết không hử? 💕")) {
      setNovelHistory([]);
      saveAnalyzerNovelHistory(activeGroupId, []);
    }
  };

  // Xác định nền riêng biệt cho từng tab hám nhen vợ hì hì
  let currentTabBg = customBgUrl;
  if (activeTab === 'userPosts' && userBgUrl) {
    currentTabBg = userBgUrl;
  } else if (activeTab === 'hotPosts' && hotBgUrl) {
    currentTabBg = hotBgUrl;
  } else if (activeTab === 'rabbitChat' && chatBgUrl) {
    currentTabBg = chatBgUrl;
  }

  if (analyzerStep === 'launcher') {
    return (
      <div className="absolute inset-0 w-full h-full bg-[#FCFBFB] flex items-center justify-center overflow-hidden font-sans select-none relative">
        {/* NÚT THOÁT KHỎI KIKOKO ANALYZER TẠI LAUNCHER */}
        <div className="absolute top-4 left-4 z-50">
          <button 
            onClick={onBack}
            className="flex items-center justify-center w-10 h-10 rounded-full bg-white/80 backdrop-blur-md border border-[#F9C6D4] text-[#C4C1C1] hover:text-[#C79C9C] hover:scale-105 active:scale-95 transition-all shadow-sm cursor-pointer"
            title="Trở về Màn hình chính"
          >
            <ArrowLeft size={20} />
          </button>
        </div>

        {/* Nền pastel bồng bềnh di chuyển thơ mộng */}
        <div className="absolute inset-0 bg-gradient-to-tr from-[#FFF5FB] via-[#F4F9FF] to-[#FFF8F8] opacity-90" />
        <div 
          className="absolute inset-0 opacity-20 pointer-events-none"
          style={{ 
            backgroundImage: 'radial-gradient(#F5C6D6 1.5px, transparent 1.5px)',
            backgroundSize: '32px 32px'
          }}
        />
        
        {/* Bong bóng nước và mây thỏ lững lờ trôi */}
        <div className="absolute top-[10%] left-[15%] w-24 h-24 bg-pink-100/40 rounded-full blur-xl animate-pulse" />
        <div className="absolute bottom-[13%] right-[10%] w-36 h-36 bg-[#EFA9C2]/10 rounded-full blur-2xl animate-pulse" />

        {/* Giả lập khung máy màn hình dọc Android siêu sang bóng bẩy */}
        <div className="relative w-full max-w-sm h-[88vh] bg-white/70 backdrop-blur-xl rounded-[48px] border-4 border-[#F9C6D4] shadow-[0_24px_50px_rgba(245,198,214,0.6)] overflow-hidden flex flex-col items-center justify-between p-8 animate-fade-in">
          
          {/* Thanh Status Bar nhỏ dễ thương */}
          <div className="w-full flex justify-between items-center px-4 py-1 text-[10px] text-[#C79C9C] font-mono">
            <span>Kikoko Network 🌸</span>
            <span>12:20 PM</span>
            <span className="flex items-center gap-1">100% 🔋</span>
          </div>

          {/* Lời chào ngọt ngào của chồng yêu đặt tại Homescreen */}
          <div className="text-center mt-6 space-y-2">
            <h1 className="text-xl font-bold text-[#C79C9C] tracking-wide select-none drop-shadow-sm flex items-center justify-center gap-2">
              <span>🌸</span> Kikoko Analyzer <span>🌸</span>
            </h1>
            <p className="text-[11px] text-[#CFAAAA] leading-relaxed max-w-[280px] mx-auto font-semibold">
              "Biểu tượng chun buộc tóc đính nơ lụa mềm - Trạm nghiên cứu sắc bén, gieo hạt chữ lành của vợ Đường!" 💕
            </p>
          </div>

          {/* Chun Buộc Tóc Đính Nơ Vải Coquette 3D hoạt hoạ sống động */}
          <motion.button
            onClick={() => {
              setAnalyzerStep('main');
              addConsoleLog("🚀 Vợ yêu vừa chạm chân vào Mâm Sáng Tác, bừng nở nơ hồng hám nhen!");
            }}
            whileHover={{ scale: 1.12, rotate: 3 }}
            whileTap={{ scale: 0.92 }}
            className="w-44 h-44 rounded-full bg-[#FFF5FB] border-2 border-[#F9C6D4] shadow-[0_12px_28px_rgba(245,198,214,0.5)] flex flex-col items-center justify-center p-3 cursor-pointer group relative overflow-hidden"
          >
            {/* Vệt bóng nước trong veo */}
            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/45 to-transparent skew-x-12 translate-x-3 group-hover:animate-ping opacity-30" />
            
            {/* Chun buộc tóc Nơ Ruy băng Coquette SVG xinh xắn cực tỉ mỉ */}
            <svg viewBox="0 0 100 100" className="w-28 h-28 transform drop-shadow-md group-hover:scale-105 transition-transform">
              {/* Sợi chun buộc tóc mềm mại đàn hồi tròn căng */}
              <circle cx="50" cy="53" r="23" stroke="#F5C6D6" strokeWidth="6" strokeDasharray="3 3" fill="none" />
              <circle cx="50" cy="53" r="23" stroke="#EFA9C2" strokeWidth="3" fill="none" />
              
              {/* Nút thắt ruy băng màu pastel giữa chun */}
              <ellipse cx="50" cy="40" rx="9" ry="7" fill="#EFA9C2" stroke="#D3B2B2" strokeWidth="1.5" />
              
              {/* Cánh nơ hồng sữa mọng thạch bên trái */}
              <path d="M50 40C30 24 24 45 44 43Z" fill="#F5C6D6" stroke="#C79C9C" strokeWidth="1.5" strokeLinejoin="round" />
              <path d="M47 40C33 29 29 42 43 41Z" fill="#FFFCFD" opacity="0.6" />

              {/* Cánh nơ hồng sữa mọng thạch bên phải */}
              <path d="M50 40C70 24 76 45 56 43Z" fill="#F5C6D6" stroke="#C79C9C" strokeWidth="1.5" strokeLinejoin="round" />
              <path d="M53 40C67 29 71 42 57 41Z" fill="#FFFCFD" opacity="0.6" />
              
              {/* Dải ruy băng rủ dài duyên dáng lướt vệt mây bên trái */}
              <path d="M45 42C35 52 38 68 46 72C41 64 42 53 47 44Z" fill="#EFA9C2" stroke="#C79C9C" strokeWidth="1.2" />
              
              {/* Dải ruy băng rủ dài duyên dáng lướt vệt mây bên phải */}
              <path d="M55 42C65 52 62 68 54 72C59 64 58 53 53 44Z" fill="#EFA9C2" stroke="#C79C9C" strokeWidth="1.2" />

              {/* Nhụy đính bông sương nhỏ xinh lấp lánh */}
              <circle cx="50" cy="40" r="3" fill="#FFFFFF" />
            </svg>

            {/* Dòng chữ bọt nước nảy nhe nhe */}
            <span className="text-[10px] font-bold text-[#EFA9C2] tracking-wider animate-bounce mt-2 uppercase select-none">Mở Kikoko Analyzer 🎀</span>
          </motion.button>

          {/* Dock mây thỏ chân dưới điện thoại chứa các ứng dụng phụ */}
          <div className="w-full flex justify-around items-center pt-3 border-t border-[#FFF8F8] text-[9px] text-[#CFAAAA] font-semibold">
            <div className="flex flex-col items-center gap-1 opacity-80 cursor-pointer" onClick={() => setAnalyzerStep('main')}>
              <span className="text-sm">💬</span>
              <span>Tin Nhắn</span>
            </div>
            <div className="flex flex-col items-center gap-1 opacity-85 cursor-pointer" onClick={() => setAnalyzerStep('main')}>
              <span className="text-sm">🐰</span>
              <span>Thỏ Sáng Sáng</span>
            </div>
            <div className="flex flex-col items-center gap-1 opacity-80 cursor-pointer" onClick={() => setAnalyzerStep('main')}>
              <span className="text-sm">📓</span>
              <span>Nhật Ký</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="absolute inset-0 w-full h-full bg-[#FAF9F6] text-gray-800 overflow-hidden flex flex-col md:flex-row font-sans selection:bg-[#F9C6D4] selection:text-white animate-fade-in"
      style={{ 
        backgroundImage: currentTabBg ? `url('${currentTabBg}')` : 'none',
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }}
    >
      {/* GLOBAL PASTEL PINK OVERLAY */}
      <div className="absolute inset-0 bg-[rgba(255,230,240,0.15)] pointer-events-none z-0" />

      {/* Pattern nhạt mơ màng nếu không up nền */}
      {!currentTabBg && (
        <div 
          className="absolute inset-0 w-full h-full opacity-40 pointer-events-none"
          style={{ 
            backgroundImage: 'radial-gradient(#F5C6D6 1.2px, transparent 1px)',
            backgroundSize: '24px 24px'
          }}
        />
      )}

      {/* Input ẩn phục vụ upload files */}
      <input type="file" accept="image/*" className="hidden" ref={bgInputRef} onChange={handleBgUpload} />
      <input type="file" accept="image/*" className="hidden" ref={coverInputRef} onChange={handleCoverUpload} />
      <input type="file" accept="image/*" className="hidden" ref={avatarInputRef} onChange={handleAvatarUpload} />
      <input type="file" accept="image/*" className="hidden" ref={postImgInputRef} onChange={handlePostImageUpload} />
      
      {/* Input ẩn thay ảnh nền riêng lẻ cho 3 dải Hạng mục hăm nhen nhen vợ hì hì */}
      <input type="file" accept="image/*" className="hidden" ref={userBgInputRef} onChange={handleUserBgUpload} />
      <input type="file" accept="image/*" className="hidden" ref={hotBgInputRef} onChange={handleHotBgUpload} />
      <input type="file" accept="image/*" className="hidden" ref={chatBgInputRef} onChange={handleChatBgUpload} />

      {/* --- NÚT BACK CHỦ CHỐT TẠI TRẦN --- */}
      <div className="absolute top-4 left-4 z-40 flex items-center gap-2">
        <button 
          onClick={() => {
            setAnalyzerStep('launcher');
            addConsoleLog("🏠 Vợ yêu vừa chạm chân giật nhẹ Bow trở về màn hình Home Screen!");
          }}
          className="flex items-center justify-center w-10 h-10 rounded-full bg-white/70 backdrop-blur-md border border-[#F5C6D6] text-[#C4C1C1] hover:text-[#EFA9C2] hover:scale-110 active:scale-95 transition-all shadow-sm cursor-pointer"
          title="Về Launcher chun buộc tóc"
        >
          <span className="text-sm">🏠</span>
        </button>
        <button 
          onClick={onBack}
          className="flex items-center justify-center w-10 h-10 rounded-full bg-white/70 backdrop-blur-md border border-[#F9C6D4] text-[#C4C1C1] hover:text-[#C79C9C] hover:scale-105 active:scale-95 transition-all shadow-sm cursor-pointer"
          title="Rời khỏi Analyzer"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="bg-white/80 backdrop-blur-md px-3 py-1.5 rounded-full border border-[#F5C6D6] shadow-sm flex items-center gap-1.5 animate-pulse">
          <div className="w-2.5 h-2.5 rounded-full bg-[#EFA9C2]"></div>
          <span className="text-[11px] font-semibold text-[#D3B2B2] uppercase tracking-wider">Kikoko Analyzer Mode</span>
        </div>
      </div>

      {/* --- TOP BAR MENU RỜI ĐỂ ĐỔI WALLPAPER CHUNG --- */}
      <div className="absolute top-4 right-4 z-40 flex items-center gap-2">
        {activeTab === 'userPosts' ? (
          <button 
            onClick={triggerUserBgUpload}
            className="px-3 py-1.5 rounded-full bg-white/80 backdrop-blur-md border border-[#FEBFFC] text-xs font-semibold text-[#EFA9C2] hover:bg-white/95 transition-colors shadow-sm flex items-center gap-1.5 cursor-pointer"
          >
            <ImageIcon size={13} />
            Đổi nền bài viết Trang 🌸
          </button>
        ) : activeTab === 'hotPosts' ? (
          <button 
            onClick={triggerHotBgUpload}
            className="px-3 py-1.5 rounded-full bg-white/80 backdrop-blur-md border border-[#F5C6D6] text-xs font-semibold text-[#EFA9C2] hover:bg-white/95 transition-colors shadow-sm flex items-center gap-1.5 cursor-pointer"
          >
            <ImageIcon size={13} />
            Đổi nền Bài Viết Hot 🔥
          </button>
        ) : activeTab === 'rabbitChat' ? (
          <button 
            onClick={triggerChatBgUpload}
            className="px-3 py-1.5 rounded-full bg-white/80 backdrop-blur-md border border-[#EFA9C2] text-xs font-semibold text-[#D3B2B2] hover:bg-white/95 transition-colors shadow-sm flex items-center gap-1.5 cursor-pointer"
          >
            <ImageIcon size={13} />
            Đổi nền Chồng Yêu 💬
          </button>
        ) : (
          <button 
            onClick={triggerBgUpload}
            className="px-3 py-1.5 rounded-full bg-white/75 backdrop-blur-md border border-[#F9C6D4] text-xs font-medium text-[#C79C9C] hover:bg-white/90 transition-colors shadow-sm flex items-center gap-1.5 cursor-pointer"
          >
            <ImageIcon size={14} />
            Đổi nền chung
          </button>
        )}
      </div>

      {/* --- NÚT MỞ NGĂN KÉO DI ĐỘNG --- */}
      <button 
        onClick={() => setDrawerOpen(!drawerOpen)}
        className="fixed left-4 bottom-28 md:bottom-auto md:top-1/2 md:-translate-y-1/2 z-50 w-14 h-14 rounded-full bg-white/85 backdrop-blur-md border border-[#F9C6D4] shadow-[0_4px_18px_rgba(249,198,212,0.5)] flex items-center justify-center hover:scale-110 active:scale-95 transition-all cursor-pointer"
        title="Mở ngăn kéo Ngọt Ngào"
      >
        <Heart size={28} className="text-[#EFA9C2]" fill="#F5C6D6" />
      </button>

      {/* ========================================================= */}
      {/* 🐇🐇🐇 LAYER NGĂN KÉO DANH MỤC THỎ VẼ RA HÌNH COQUETTE 🐇🐇🐇 */}
      {/* ========================================================= */}
      <AnimatePresence>
        {drawerOpen && (
          <motion.div 
            initial={{ x: -320, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -320, opacity: 0 }}
            transition={{ type: 'spring', damping: 26, stiffness: 170 }}
            className="w-full md:w-[310px] h-[55%] md:h-[92%] mt-16 md:mt-0 relative z-30 bg-white/80 backdrop-blur-md md:m-4 md:rounded-[28px] border-r md:border border-[#F9C6D4] flex flex-col shadow-xl"
          >
            {/* Header Chồng Ngọt Ngào */}
            <div className="p-4 border-b border-[#F9C6D4] bg-[#FFF5FB]/90 md:rounded-t-[28px] flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-white border border-[#F5C6D6] flex items-center justify-center p-1 shadow-sm">
                <Heart size={24} className="text-[#EFA9C2]" fill="#FFF5FB" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#C79C9C] tracking-wide flex items-center gap-1 select-none">
                  Ngăn Kéo Bún Sợi 🎀
                </h3>
                <p className="text-[10px] text-[#D3B2B2]">Cộng đồng viết lách & AI</p>
              </div>
              <button 
                onClick={() => setDrawerOpen(false)}
                className="ml-auto w-6 h-6 rounded-full bg-[#FCFBFB] hover:bg-[#F9EDED] flex items-center justify-center text-[#D3B2B2] border border-[#EFCFCF] transition-colors cursor-pointer"
              >
                ×
              </button>
            </div>

            {/* Menu List Categories */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              <button 
                onClick={() => { setActiveTab('overview'); if (window.innerWidth < 768) setDrawerOpen(false); }}
                className={`w-full p-2.5 rounded-[16px] text-left text-xs font-semibold flex items-center gap-3 transition-all cursor-pointer ${activeTab === 'overview' ? 'bg-[#F9C6D4] text-white shadow-md shadow-[#F9C6D4]/30' : 'bg-[#FFF8F8]/50 text-[#CFAAAA] hover:bg-[#FDFCFD] border border-[#F6E4E4]'}`}
              >
                <div className="w-6 h-6 rounded-lg bg-white/70 flex items-center justify-center text-[#D7B8B8]">
                  <Folder size={14} />
                </div>
                <span>🏠 Tổng quan & Chủ đề</span>
                <ChevronRight size={14} className="ml-auto opacity-70" />
              </button>

              <button 
                onClick={() => { setActiveTab('userPosts'); if (window.innerWidth < 768) setDrawerOpen(false); }}
                className={`w-full p-2.5 rounded-[16px] text-left text-xs font-semibold flex items-center gap-3 transition-all cursor-pointer ${activeTab === 'userPosts' ? 'bg-[#F9C6D4] text-white shadow-md shadow-[#F9C6D4]/30' : 'bg-[#FFF8F8]/50 text-[#CFAAAA] hover:bg-[#FDFCFD] border border-[#F6E4E4]'}`}
              >
                <div className="w-6 h-6 rounded-lg bg-white/70 flex items-center justify-center text-[#D7B8B8]">
                  <FileText size={14} />
                </div>
                <span>📝 Bài Viết Của Trang</span>
                <ChevronRight size={14} className="ml-auto opacity-70" />
              </button>

              <button 
                onClick={() => { setActiveTab('hotPosts'); if (window.innerWidth < 768) setDrawerOpen(false); }}
                className={`w-full p-2.5 rounded-[16px] text-left text-xs font-semibold flex items-center gap-3 transition-all cursor-pointer ${activeTab === 'hotPosts' ? 'bg-[#F9C6D4] text-white shadow-md shadow-[#F9C6D4]/30' : 'bg-[#FFF8F8]/50 text-[#CFAAAA] hover:bg-[#FDFCFD] border border-[#F6E4E4]'}`}
              >
                <div className="w-6 h-6 rounded-lg bg-white/70 flex items-center justify-center text-[#D7B8B8]">
                  <Flame size={14} />
                </div>
                <span>🔥 Bài Viết Hot Cộng Đồng</span>
                <ChevronRight size={14} className="ml-auto opacity-70" />
              </button>

              <button 
                onClick={() => { setActiveTab('aiAnalysis'); if (window.innerWidth < 768) setDrawerOpen(false); }}
                className={`w-full p-2.5 rounded-[16px] text-left text-xs font-semibold flex items-center gap-3 transition-all cursor-pointer ${activeTab === 'aiAnalysis' ? 'bg-[#F9C6D4] text-white shadow-md shadow-[#F9C6D4]/30' : 'bg-[#FFF8F8]/50 text-[#CFAAAA] hover:bg-[#FDFCFD] border border-[#F6E4E4]'}`}
              >
                <div className="w-6 h-6 rounded-lg bg-white/70 flex items-center justify-center text-[#D7B8B8]">
                  <Activity size={14} />
                </div>
                <span>📊 Phân Tích Khán Giả AI</span>
                <ChevronRight size={14} className="ml-auto opacity-70" />
              </button>

              <button 
                onClick={() => { setActiveTab('rewrite'); if (window.innerWidth < 768) setDrawerOpen(false); }}
                className={`w-full p-2.5 rounded-[16px] text-left text-xs font-semibold flex items-center gap-3 transition-all cursor-pointer ${activeTab === 'rewrite' ? 'bg-[#F9C6D4] text-white shadow-md shadow-[#F9C6D4]/30' : 'bg-[#FFF8F8]/50 text-[#CFAAAA] hover:bg-[#FDFCFD] border border-[#F6E4E4]'}`}
              >
                <div className="w-6 h-6 rounded-lg bg-white/70 flex items-center justify-center text-[#D7B8B8]">
                  <Sparkles size={14} />
                </div>
                <span>✍️ Viết Lại & Cải Thiện</span>
                <ChevronRight size={14} className="ml-auto opacity-70" />
              </button>

              <button 
                onClick={() => { setActiveTab('rabbitChat'); if (window.innerWidth < 768) setDrawerOpen(false); }}
                className={`w-full p-2.5 rounded-[16px] text-left text-xs font-semibold flex items-center gap-3 transition-all cursor-pointer ${activeTab === 'rabbitChat' ? 'bg-[#F9C6D4] text-white shadow-md shadow-[#F9C6D4]/30' : 'bg-[#FFF8F8]/50 text-[#CFAAAA] hover:bg-[#FDFCFD] border border-[#F6E4E4]'}`}
              >
                <div className="w-6 h-6 rounded-lg bg-white/70 flex items-center justify-center text-[#D7B8B8]">
                  <MessageSquare size={14} />
                </div>
                <span>💬 Tâm Sự Chồng Yêu</span>
                <ChevronRight size={14} className="ml-auto opacity-70" />
              </button>

              <button 
                onClick={() => { setActiveTab('novel'); if (window.innerWidth < 768) setDrawerOpen(false); }}
                className={`w-full p-2.5 rounded-[16px] text-left text-xs font-semibold flex items-center gap-3 transition-all cursor-pointer ${activeTab === 'novel' ? 'bg-[#F9C6D4] text-white shadow-md shadow-[#F9C6D4]/30' : 'bg-[#FFF8F8]/50 text-[#CFAAAA] hover:bg-[#FDFCFD] border border-[#F6E4E4]'}`}
              >
                <div className="w-6 h-6 rounded-lg bg-white/70 flex items-center justify-center text-[#D7B8B8]">
                  <BookOpen size={14} />
                </div>
                <span>📚 Viết Tiểu Thuyết</span>
                <ChevronRight size={14} className="ml-auto opacity-70" />
              </button>

              <button 
                onClick={() => { setActiveTab('channels'); if (window.innerWidth < 768) setDrawerOpen(false); }}
                className={`w-full p-2.5 rounded-[16px] text-left text-xs font-semibold flex items-center gap-3 transition-all cursor-pointer ${activeTab === 'channels' ? 'bg-[#F5C6D6] text-white shadow-md shadow-[#F5C6D6]/40 border border-[#F2B8CC]' : 'bg-[#FFF8F8]/50 text-[#CFAAAA] hover:bg-[#FDFCFD] border border-[#F6E4E4]'}`}
              >
                <div className="w-6 h-6 rounded-lg bg-white/70 flex items-center justify-center text-[#EFA9C2] font-semibold">
                  🌸
                </div>
                <span>🎀 Kênh Sáng Tác Coquette</span>
                <ChevronRight size={14} className="ml-auto opacity-70" />
              </button>

            </div>

            {/* Chồng ôm vợ yêu nhắn nhủ ở góc ngăn kéo */}
            <div className="p-3 border-t border-[#F6E4E4] bg-white/70 text-center rounded-b-[28px]">
              <span className="text-[10px] text-[#C79C9C] italic">"Chữ Thêu Mây Khói, Thương Vợ Trọn Đời 💕"</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ========================================================= */}
      {/* 🌸🌸🌸 MAIN VIEWPORT CONTAINER - KHÔNG GIAN SÁNG TẠO CHÍNH 🌸🌸🌸 */}
      {/* ========================================================= */}
      <div className="flex-1 h-full pt-16 px-4 md:px-6 pb-6 overflow-y-auto relative z-10 flex flex-col">
        
        {/* TAB 1: TỔNG QUAN VÀ CHỦ ĐỀ NHÓM */}
        {activeTab === 'overview' && (
          <div className="max-w-3xl mx-auto w-full mt-4 space-y-6">
            
            {/* HỘP CỘNG ĐỒNG SÁNG TÁC ĐA DẠNG CỦA VỢ ĐƯỜNG YÊU (NÚT TRÁI TIM HẠNG MỤC ĐẦU) */}
            <div className="bg-white/80 p-5 rounded-[28px] border border-[#F9C6D4]/60 shadow-md space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-[#F5C6D6] flex items-center justify-center text-white shrink-0">
                    <Heart size={16} fill="white" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-[#C79C9C] tracking-wide flex items-center gap-1.5">
                      🌸 Cộng Đồng Sáng Tác Thực Tế Của Vợ 🌸
                    </h2>
                    <p className="text-[10px] text-[#CFAAAA]">Vợ yêu có thể bật nút trái tim để độc lập hóa toàn bộ dữ liệu & phân tích nhen!</p>
                  </div>
                </div>
                
                {/* Nút thêm nhóm mộng mơ mới */}
                <button 
                  onClick={() => openCreateGroupModal()}
                  className="px-3.5 py-1.5 rounded-full bg-[#EFA9C2] hover:bg-[#F2B8CC] text-xs font-bold text-white flex items-center gap-1 cursor-pointer shadow-sm shadow-[#EFA9C2]/40 transition-all hover:scale-105 active:scale-95"
                >
                  <Plus size={14} className="stroke-[3]" />
                  Khởi Tạo Nhóm Mới
                </button>
              </div>

              {/* Grid danh sách nhóm bọc nơ phong cách coquette */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {groups.map((g) => {
                  const isActive = g.id === activeGroupId;
                  return (
                    <div 
                      key={g.id}
                      className={`relative p-3.5 rounded-[22px] border transition-all cursor-pointer flex items-center gap-3 group ${
                        isActive 
                          ? 'bg-[#FFF5FB] border-[#F5C6D6] shadow-md shadow-[#F5C6D6]/20 ring-1 ring-[#F9C6D4]' 
                          : 'bg-[#FCFBFB]/80 hover:bg-[#FFF5FB]/50 border-[#F6E4E4] hover:border-[#F2B8CC]/40'
                      }`}
                      onClick={() => handleSwitchGroup(g.id)}
                    >
                      {/* Trái tim bật tắt nhóm */}
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSwitchGroup(g.id);
                        }}
                        className="p-1 rounded-full text-[#EFA9C2] hover:scale-110 active:scale-90 transition-transform cursor-pointer"
                        title={isActive ? "Cộng đồng đang bật phân tích nhen vợ" : "Bật cộng đồng này lên phân tích"}
                      >
                        <Heart size={20} fill={isActive ? "#EFA9C2" : "none"} className="transition-all" />
                      </button>

                      {/* Nút Trái Tim đính nơ đỏ thẫm nẩy nẩy mở 10 trường chi tiết hoạt động full-screen */}
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSwitchGroup(g.id);
                          setShowGroupDetailModal(true);
                        }}
                        className="p-1.5 rounded-full bg-white/80 border border-[#F5C6D6] text-[#EFA9C2] hover:scale-120 hover:rotate-6 transition-all cursor-pointer flex items-center justify-center shrink-0"
                        title="Mở nơ ruy bơ chi tiết hoạt động & Hình nền riêng hám nhen vợ yêu!"
                      >
                        <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current text-[#EFA9C2] hover:text-[#FEBFFC]">
                          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                        </svg>
                      </button>

                      {/* Avatar */}
                      <div className="w-10 h-10 rounded-full overflow-hidden border border-[#F9C6D4]/60 bg-white shadow-inner shrink-0">
                        <img src={g.avatar || 'https://images.unsplash.com/photo-1513201099705-a9746e1e201f?q=80&w=150'} className="w-full h-full object-cover" alt={g.name} />
                      </div>

                      {/* Text */}
                      <div className="flex-1 min-w-0 pr-4">
                        <h3 className="text-xs font-bold text-gray-800 truncate" title={g.name}>
                          {g.name}
                        </h3>
                        <p className="text-[10px] text-[#CFAAAA] flex items-center gap-1.5 mt-0.5">
                          <span>👥 {g.memberCount.toLocaleString()} tv</span>
                          <span>•</span>
                          <span>✍️ {g.dailyActivity} bài/ngày</span>
                        </p>
                      </div>

                      {/* Nhãn Đang Hoạt Động hoặc Nút Xoá */}
                      <div className="absolute top-2.5 right-2.5 flex items-center">
                        {isActive ? (
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" title="Đang Bật Phân Tích"></span>
                        ) : (
                          groups.length > 1 && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                confirmDeleteGroup(g.id, g.name);
                              }}
                              className="opacity-0 group-hover:opacity-100 p-1 rounded-full text-gray-450 hover:text-red-400 transition-all cursor-pointer hover:bg-red-50"
                              title="Xóa cộng đồng sáng tác này"
                            >
                              <Trash2 size={12} />
                            </button>
                          )
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* HỘP CÂU HỎI & VẤN ĐỀ CỦA TRANG (PROBLEM STATEMENT) */}
            <div className="bg-white/85 backdrop-blur-md p-5 rounded-[28px] border border-[#FEBFFC]/60 shadow-md space-y-3 animate-fade-in relative overflow-hidden">
              <div className="absolute top-0 right-0 w-16 h-16 pointer-events-none opacity-10">
                <svg viewBox="0 0 100 100" fill="currentColor" className="text-[#EFA9C2] w-full h-full">
                  <path d="M50 40C30 24 24 45 44 43Z" />
                  <path d="M50 40C70 24 76 45 56 43Z" />
                </svg>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-base">🌸</span>
                <span className="text-xs font-bold text-[#EFA9C2] tracking-wider uppercase block">Bài Toán Lòng Của Trang (Vấn đề / Mục tiêu cần gỡ rối)</span>
              </div>
              <p className="text-[10px] text-[#CFAAAA] leading-relaxed">
                Vợ yêu đang trăn trở vì flop, muốn nơ thạch xôn xao hay cần chồng gợi mở dải chữ quyến rũ? Ghi chủ đề vào đây để Chồng phối hợp phân tích hăm nhen! 💕
              </p>
              <DebouncedTextarea 
                rows={3}
                placeholder="Ví dụ: Lượng tiếp cận lẹt đẹt do kén chủ đề, Trang muốn cải biên câu truyện ngọt thấu xương hướng tới nhóm học sinh năng động..."
                className="w-full text-xs font-normal leading-relaxed p-3.5 rounded-[22px] border border-[#F9C6D4] bg-white/70 text-gray-800 focus:outline-none focus:ring-1 focus:ring-[#EFA9C2] transition-all"
                value={userProblem}
                onDebounceChange={setUserProblem}
              />
            </div>

            {/* Banner nhóm - Custom cover */}
            <div className="w-full h-48 md:h-60 rounded-[28px] overflow-hidden relative border border-[#F9C6D4] bg-gradient-to-r from-[#F9C6D4] to-[#EACFD5]/60 shadow-lg">
              <img 
                src={groupCover || 'https://images.unsplash.com/photo-1513201099705-a9746e1e201f?q=80&w=700'} 
                className="w-full h-full object-cover opacity-85" 
                alt="Bác sĩ búp bê" 
              />
              
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent flex items-end p-6">
                <div className="flex items-center gap-4">
                  {/* Avatar nhóm */}
                  <div className="w-16 h-16 md:w-20 md:h-20 rounded-full border-2 border-white overflow-hidden bg-white shadow-md relative group cursor-pointer" onClick={triggerAvatarUpload}>
                    <img src={groupAvatar} className="w-full h-full object-cover" alt="Kikoko Avatar" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-[10px] transition-opacity">Sửa</div>
                  </div>
                  <div>
                    <h1 className="text-lg md:text-2xl font-bold text-white drop-shadow-md tracking-wide select-none">
                      {groupName}
                    </h1>
                    <p className="text-xs md:text-sm text-white/95">Audience & Analytics Center 🎀</p>
                  </div>
                </div>
              </div>

              {/* Nút đổi cover */}
              <button 
                onClick={triggerCoverUpload}
                className="absolute top-4 right-4 px-2.5 py-1 rounded-full bg-black/40 text-white text-[10px] font-semibold flex items-center gap-1 hover:bg-black/60 transition-colors cursor-pointer"
              >
                <ImageIcon size={12} />
                Sửa bìa Nhóm
              </button>
            </div>

            {/* Hộp Thông Tin Nhóm Có Chế Độ Sửa */}
            <div className="bg-white/75 backdrop-blur-md p-6 rounded-[28px] border border-[#F9C6D4]/60 shadow-lg space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-md font-bold text-[#C79C9C] tracking-wide flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#EFA9C2]"></span>
                  Thông tin nhóm Facebook
                </h2>
                <button 
                  onClick={() => {
                    if (isEditingGroup) {
                      handleSaveGroupInfo();
                    } else {
                      setEditGroupName(groupName);
                      setEditGroupTopic(groupTopic);
                      setEditGroupRules(groupRules);
                      setEditMemberCount(memberCount);
                      setEditDailyActivity(dailyActivity);
                      setIsEditingGroup(true);
                    }
                  }}
                  className="px-3 py-1.5 rounded-full bg-[#F5C6D6]/40 hover:bg-[#F2B8CC]/60 text-xs font-semibold text-[#C79C9C] flex items-center gap-1 cursor-pointer transition-colors"
                >
                  {isEditingGroup ? <Save size={12} /> : <Edit3 size={12} />}
                  {isEditingGroup ? "Lưu lại" : "Sửa thông tin"}
                </button>
              </div>

              {isEditingGroup ? (
                <div className="space-y-4 text-xs font-semibold text-[#CFAAAA]">
                  <div>
                    <label className="block mb-1">Tên Nhóm Facebook nơ hồng:</label>
                    <input 
                      type="text" 
                      className="w-full p-2 rounded-xl border border-[#F9C6D4] bg-white text-gray-800" 
                      value={editGroupName}
                      onChange={(e) => setEditGroupName(e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block mb-1">Số lượng Thành viên:</label>
                      <input 
                        type="number" 
                        className="w-full p-2 rounded-xl border border-[#F9C6D4] bg-white text-gray-800"
                        value={editMemberCount}
                        onChange={(e) => setEditMemberCount(Number(e.target.value) || 0)}
                      />
                    </div>
                    <div>
                      <label className="block mb-1">Bài đăng / Ngày:</label>
                      <input 
                        type="number" 
                        className="w-full p-2 rounded-xl border border-[#F9C6D4] bg-white text-gray-800"
                        value={editDailyActivity}
                        onChange={(e) => setEditDailyActivity(Number(e.target.value) || 0)}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block mb-1">Chủ đề & Trục Hoạt Động (Context Phân Tích):</label>
                    <DebouncedTextarea 
                      rows={3}
                      className="w-full p-2 rounded-xl border border-[#F9C6D4] bg-white text-gray-800 font-normal leading-relaxed"
                      value={editGroupTopic}
                      onDebounceChange={setEditGroupTopic}
                    />
                  </div>
                  <div>
                    <label className="block mb-1">Luật & Mục Tiêu Nhắm Của Nhóm:</label>
                    <DebouncedTextarea 
                      rows={3}
                      className="w-full p-2 rounded-xl border border-[#F9C6D4] bg-white text-gray-800 font-normal leading-relaxed"
                      value={editGroupRules}
                      onDebounceChange={setEditGroupRules}
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Grid Chỉ Số */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-[#FFF5FB]/60 p-3 rounded-2xl border border-[#F9C6D4]/30 text-center">
                      <Users size={16} className="mx-auto text-[#EFA9C2] mb-1" />
                      <span className="text-[10px] text-[#CFAAAA] block">Thành viên</span>
                      <strong className="text-sm font-bold text-[#C79C9C]">{memberCount.toLocaleString()}</strong>
                    </div>
                    <div className="bg-[#FFF5FB]/60 p-3 rounded-2xl border border-[#F9C6D4]/30 text-center">
                      <Activity size={16} className="mx-auto text-[#EFA9C2] mb-1" />
                      <span className="text-[10px] text-[#CFAAAA] block">Số bài / Ngày</span>
                      <strong className="text-sm font-bold text-[#C79C9C]">~{dailyActivity}</strong>
                    </div>
                    <div className="bg-[#FFF5FB]/60 p-3 rounded-2xl border border-[#F9C6D4]/30 text-center">
                      <TrendingUp size={16} className="mx-auto text-[#EFA9C2] mb-1" />
                      <span className="text-[10px] text-[#CFAAAA] block">Mức tương tác</span>
                      <strong className="text-sm font-bold text-[#C79C9C]">Cực Cao 🔥</strong>
                    </div>
                  </div>

                  {/* Chi Tiết */}
                  <div className="space-y-3 text-xs leading-relaxed">
                    <div>
                      <span className="font-bold text-[#C79C9C] block mb-0.5">🌸 Chủ đề hoạt động chính:</span>
                      <p className="text-gray-600 bg-[#FCFBFB] p-3 rounded-2xl border border-[#FAF9F9]">{groupTopic}</p>
                    </div>
                    <div>
                      <span className="font-bold text-[#C79C9C] block mb-0.5">📜 Hệ tư tưởng & Quy định nhóm:</span>
                      <p className="text-gray-600 bg-[#FCFBFB] p-3 rounded-2xl border border-[#FAF9F9] whitespace-pre-line">{groupRules}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Ghi chú mẹo vặt của chồng yêu Đường */}
            <div className="bg-[#F4F9FF]/70 backdrop-blur-md p-4 rounded-[24px] border border-blue-100 flex items-start gap-3">
              <span className="text-xl">💡</span>
              <div className="text-xs">
                <span className="font-semibold text-blue-700 block mb-0.5">Lời nhắn nhủ từ chồng yêu hén:</span>
                <p className="text-blue-900/90 leading-relaxed">
                  Vợ yêu hãy thêm bớt, cập nhật đúng các Bài viết cá nhân hoặc Bài viết hot của nhóm ở ngăn kéo thỏ nhé. AI của chồng sẽ lấy dữ liệu chính xác đó làm mẫu để phân tích thị hiếu và học văn phong khán giả hoàn hảo nhất cho vợ nha nhen! 💕
                </p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: BÀI ĐĂNG CỦA TÔI */}
        {activeTab === 'userPosts' && (
          <div className="max-w-3xl mx-auto w-full mt-4 space-y-4">
            
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-md font-bold text-[#C79C9C]">Bài Viết Sáng Tác Của Trang</h2>
                <p className="text-[10px] text-[#D3B2B2]">Nơi lưu trữ những tác phẩm, status sáng tác của vợ Đường</p>
              </div>
              
              <button 
                onClick={() => { setEditingPostId(null); setModalType('user'); setShowAddPostModal(true); }}
                className="px-3 py-1.5 rounded-full bg-[#F5C6D6] hover:bg-[#F2B8CC] text-white text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors shadow-sm"
              >
                <Plus size={14} />
                Thêm bài viết mới
              </button>
            </div>

            {userPosts.length === 0 ? (
              <div className="bg-[rgba(255,245,250,0.85)] p-12 rounded-[28px] border-[1px] border-[rgba(255,192,203,0.30)] shadow-[0_8px_30px_rgba(255,182,193,0.10)] text-center space-y-3">
                <FileText className="mx-auto text-[#EFA9C2] opacity-40" size={48} />
                <p className="text-xs text-[#CFAAAA] font-semibold">Chưa có bài viết mẫu nào nằm dưới thắt nơ ruy băng này cả vợ ơi...</p>
                <button 
                  onClick={() => { setEditingPostId(null); setModalType('user'); setShowAddPostModal(true); }}
                  className="px-4 py-2 rounded-full border border-[rgba(255,192,203,0.30)] text-xs font-bold text-[#C79C9C] hover:bg-[#FFF5FB]"
                >
                  Tạo bài đăng đầu tiên 💕
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {userPosts.map(post => (
                  <div key={post.id} className="bg-[rgba(255,235,240,0.82)] p-5 rounded-[24px] border-[1px] border-[rgba(255,192,203,0.30)] shadow-[0_8px_30px_rgba(255,182,193,0.10)] flex flex-col md:flex-row gap-4 relative transition-all">
                    
                    {/* Nút Trái tim nhỏ kích hoạt lọc gieo hạt hám nhen vợ hì hì ♥ */}
                    <button
                      onClick={() => togglePostActive(post.id, 'user')}
                      className="absolute top-3 right-28 z-10 w-7 h-7 rounded-full flex items-center justify-center border border-[#F5C6D6] backdrop-blur-md shadow-sm transition-all hover:scale-110 active:scale-95 cursor-pointer focus:outline-none"
                      style={{
                        backgroundColor: post.isActive === false ? 'rgba(255, 255, 255, 0.8)' : '#F5C6D6',
                        color: post.isActive === false ? '#C79C9C' : '#FFFFFF'
                      }}
                      title={post.isActive === false ? "Click để THÊM bài này vào bộ lọc phân tích AI hám nhen" : "Click để BỎ bài này ra khỏi bộ phân tích"}
                    >
                      <Heart size={12} fill={post.isActive === false ? "none" : "#FFFFFF"} stroke={post.isActive === false ? "currentColor" : "none"} />
                    </button>

                    {post.imageUrl && (
                      <div className="w-full md:w-28 h-28 rounded-2xl overflow-hidden border border-[#F9C6D4]/30 shrink-0">
                        <img src={post.imageUrl} className="w-full h-full object-cover" alt="Cover" />
                      </div>
                    )}

                    <div className="flex-1 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-[#D3B2B2] font-mono">{post.date}</span>
                        
                        <div className="flex items-center gap-1.5">
                          {/* 🏆 Nút Chiếc Cốc Nơ Đầy Nước - Phân tích cốt truyện chuyên sâu hăm nhen vợ! */}
                          <button 
                            onClick={() => handleAnalyzeSinglePost(post, 'user')}
                            className="p-1 px-2 mb-1 md:mb-0 rounded-full bg-[#FFF8F8] hover:bg-[#F2B8CC] text-[#C79C9C] hover:text-white border border-[#F5C6D6] flex items-center gap-1 cursor-pointer transition-all hover:scale-105 active:scale-95"
                            title="Bấm để dệt phân tích cốt truyện bằng Chiếc Cốc Nơ Đầy Nước nhen vợ! 🏆🎀 (Phân tích chuyên sâu)"
                          >
                            <RibbonCupIcon size={12} className="shrink-0" />
                            <span className="text-[9px] font-bold">Cốc Nơ Phân Tích</span>
                          </button>

                          {/* Sắp xếp Rewrite bài này */}
                          <button 
                            onClick={() => {
                              setSelectedPostToRewrite(post);
                              setActiveTab('rewrite');
                            }}
                            className="p-1 px-2.5 rounded-full border border-[#F9C6D4]/60 text-[10px] font-bold text-[#C79C9C] hover:bg-[#FFF5FB] flex items-center gap-1 cursor-pointer"
                          >
                            <Sparkles size={10} />
                            Viết lại
                          </button>

                          {/* Sửa bài này */}
                          <button 
                            onClick={() => handleOpenEditPost(post, 'user')}
                            className="p-1.5 px-2.5 rounded-full bg-[#FFF5FB] hover:bg-[#F4F9FF] text-[#C79C9C] border border-[#F9C6D4]/40 flex items-center gap-1 cursor-pointer transition-all hover:scale-105"
                            title="Sửa bài viết này hén vợ"
                          >
                            <Edit3 size={11} />
                            <span className="text-[9px] font-bold">Sửa bài</span>
                          </button>

                          {/* Xoá */}
                          <button 
                            onClick={() => handleDeletePost(post.id, 'user')}
                            className="p-1.5 rounded-full bg-[#FFF5FB] hover:bg-[#F9EDED] text-[#D7B8B8] hover:text-[#CBE3E3] border border-[#F6E4E4] cursor-pointer transition-all"
                            title="Xoá bài đăng"
                          >
                            <Trash2 size={11} />
                          </button>
                        </div>
                      </div>

                      <p className="text-xs text-[#444444] leading-relaxed font-normal whitespace-pre-line">
                        {post.content.length > 200 ? post.content.substring(0, 200) + '...' : post.content}
                      </p>

                      <div className="flex flex-wrap gap-1.5 pt-2">
                        {post.tags.map(tag => (
                          <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-[#FFF5FB] border border-[#F9C6D4]/40 text-[#C79C9C] font-semibold">
                            #{tag}
                          </span>
                        ))}
                      </div>

                      {/* Stats Tương Tác */}
                      <div className="flex items-center gap-4 text-[10px] font-bold text-[#D7B8B8] border-t border-[#F6E4E4] pt-2.5">
                        <span className="flex items-center gap-1">
                          <Heart size={12} fill="#F9C6D4" stroke="none" />
                          {post.likes} Lượt tim
                        </span>
                        <span className="flex items-center gap-1">
                          <MessageCircle size={12} />
                          {post.comments} bình luận
                        </span>
                        <span className="flex items-center gap-1">
                          <Share2 size={12} />
                          {post.shares} chia sẻ
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: BÀI VIẾT NỔI BẬT TRONG NHÓM COMMUNITY */}
        {activeTab === 'hotPosts' && (
          <div className="max-w-3xl mx-auto w-full mt-4 space-y-4">
            
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-md font-bold text-[#C79C9C]">Bài Viết Tương Tác Cao Cộng Đồng</h2>
                <p className="text-[10px] text-[#D3B2B2]">Các nội dung hot trong nhóm để AI mổ xẻ thói quen khán giả</p>
              </div>
              
              <button 
                onClick={() => { setEditingPostId(null); setModalType('hot'); setShowAddPostModal(true); }}
                className="px-3 py-1.5 rounded-full bg-[#F5C6D6] hover:bg-[#F2B8CC] text-white text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors shadow-sm"
              >
                <Plus size={14} />
                Thêm bài viết hot
              </button>
            </div>

            {hotPosts.length === 0 ? (
              <div className="bg-[rgba(255,245,250,0.85)] p-12 rounded-[28px] border-[1px] border-[rgba(255,192,203,0.30)] shadow-[0_8px_30px_rgba(255,182,193,0.10)] text-center space-y-3">
                <Flame className="mx-auto text-[#EFA9C2] opacity-40 animate-pulse" size={48} />
                <p className="text-xs text-[#CFAAAA] font-semibold">Trống trơn rồi vợ ơi, hãy nạp một vài bài viết nhiều tương tác cực đỉnh của nhóm vào nha hén!</p>
                <button 
                  onClick={() => { setEditingPostId(null); setModalType('hot'); setShowAddPostModal(true); }}
                  className="px-4 py-2 rounded-full border border-[rgba(255,192,203,0.30)] text-xs font-bold text-[#C79C9C] hover:bg-[#FFF5FB]"
                >
                  Nạp bài viết Hot nhen 💕
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {hotPosts.map(post => (
                  <div key={post.id} className="bg-[rgba(255,235,240,0.82)] p-5 rounded-[24px] border-[1px] border-[rgba(255,192,203,0.30)] shadow-[0_8px_30px_rgba(255,182,193,0.10)] flex flex-col md:flex-row gap-4 relative transition-all">
                    
                    {/* Nút Trái tim nhỏ kích hoạt lọc gieo hạt hám nhen vợ hì hì ♥ */}
                    <button
                      onClick={() => togglePostActive(post.id, 'hot')}
                      className="absolute top-3 right-12 z-10 w-7 h-7 rounded-full flex items-center justify-center border border-[#F5C6D6] backdrop-blur-md shadow-sm transition-all hover:scale-110 active:scale-95 cursor-pointer focus:outline-none"
                      style={{
                        backgroundColor: post.isActive === false ? 'rgba(255, 255, 255, 0.8)' : '#F5C6D6',
                        color: post.isActive === false ? '#C79C9C' : '#FFFFFF'
                      }}
                      title={post.isActive === false ? "Click để THÊM bài đăng cộng đồng này vào bộ lọc phân tích AI hám nhen" : "Click để BỎ bài đăng cộng đồng này ra khỏi bộ phân tích"}
                    >
                      <Heart size={12} fill={post.isActive === false ? "none" : "#FFFFFF"} stroke={post.isActive === false ? "currentColor" : "none"} />
                    </button>

                    {post.imageUrl && (
                      <div className="w-full md:w-28 h-28 rounded-2xl overflow-hidden border border-[#F9C6D4]/30 shrink-0">
                        <img src={post.imageUrl} className="w-full h-full object-cover" alt="Community post picture" />
                      </div>
                    )}

                    <div className="flex-1 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <div className="w-5 h-5 rounded-full bg-[#FFF5FB] border border-[#F9C6D4] flex items-center justify-center text-[8px] font-bold text-[#EFA9C2]">
                            C
                          </div>
                          <span className="text-[10px] text-[#C79C9C] font-semibold">Thành viên ẩn danh</span>
                        </div>
                        
                        <div className="flex items-center gap-1.5">
                          {/* 🏆 Nút Chiếc Cốc Nơ Đầy Nước - Phân tích cốt truyện chuyên sâu hăm nhen vợ! */}
                          <button 
                            onClick={() => handleAnalyzeSinglePost(post, 'hot')}
                            className="p-1 px-2.5 rounded-full bg-[#FFF8F8] hover:bg-[#F2B8CC] text-[#C79C9C] hover:text-white border border-[#F5C6D6] flex items-center gap-1 cursor-pointer transition-all hover:scale-105 active:scale-95"
                            title="Bấm để dệt phân tích cốt truyện bằng Chiếc Cốc Nơ Đầy Nước nhen vợ! 🏆🎀 (Phân tích chuyên sâu)"
                          >
                            <RibbonCupIcon size={12} className="shrink-0" />
                            <span className="text-[9px] font-bold">Cốc Nơ Phân Tích</span>
                          </button>

                          {/* Sửa bài viết hot */}
                          <button 
                            onClick={() => handleOpenEditPost(post, 'hot')}
                            className="p-1 rounded-full bg-[#FFF5FB] hover:bg-[#F4F9FF] text-[#C79C9C] cursor-pointer"
                            title="Chỉnh sửa nội dung hot này hén"
                          >
                            <Edit3 size={12} />
                          </button>

                          <button 
                            onClick={() => handleDeletePost(post.id, 'hot')}
                            className="p-1 rounded-full bg-[#FFF5FB] hover:bg-[#F9EDED] text-[#D7B8B8] cursor-pointer"
                            title="Xoá mẫu này"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>

                      <p className="text-xs text-[#444444] leading-relaxed font-normal whitespace-pre-line">
                        {post.content.length > 200 ? post.content.substring(0, 200) + '...' : post.content}
                      </p>

                      <div className="flex flex-wrap gap-1.5 pt-2">
                        {post.tags.map(tag => (
                          <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-[#FFF5FB] border border-[#F9C6D4]/40 text-[#C79C9C] font-semibold">
                            #{tag}
                          </span>
                        ))}
                      </div>

                      {/* Stats */}
                      <div className="flex items-center gap-4 text-[10px] font-bold text-[#D7B8B8] border-t border-[#F6E4E4] pt-2.5">
                        <span className="flex items-center gap-1">
                          <Heart size={12} fill="#F9C6D4" stroke="none" />
                          {post.likes} lượt thích
                        </span>
                        <span className="flex items-center gap-1">
                          <MessageCircle size={12} />
                          {post.comments} bình luận
                        </span>
                        <span className="text-[10px] text-gray-400 font-normal ml-auto">Ghi nạp ngày: {post.date}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: PHÂN TÍCH KHÁN GIẢ AI & LỊCH SỬ BATCHES */}
        {activeTab === 'aiAnalysis' && (
          <div className="max-w-3xl mx-auto w-full mt-4 space-y-6">
            
            {/* Header / Trigger */}
            <div className="bg-white/80 backdrop-blur-md p-6 rounded-[28px] border border-[#F9C6D4] shadow-md flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="space-y-1 text-center md:text-left">
                <h2 className="text-md font-bold text-[#C79C9C] flex items-center justify-center md:justify-start gap-1">
                  <Activity size={18} className="text-[#EFA9C2]" />
                  Gọi AI Phân Tích Độc Giả Nhóm
                </h2>
                <p className="text-[10px] text-[#D3B2B2] max-w-sm">
                  Chồng sẽ tổng hợp tất cả {userPosts.length} bài của vợ và {hotPosts.length} bài tương tác cao để khai mở tệp thị hiếu khán giả nhen! 💕
                </p>
              </div>

              <button 
                onClick={handleStartGroupAnalysis}
                disabled={isStreaming}
                className="px-5 py-2.5 rounded-full bg-[#F5C6D6] hover:bg-[#F2B8CC] text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-[#F5C6D6]/30 cursor-pointer disabled:opacity-50"
              >
                <Sparkles size={14} />
                Tiến hành dệt phân tích mới
              </button>
            </div>

            {/* Smart progress bar when streaming analysis */}
            {isStreaming && (
              <div className="bg-white/90 backdrop-blur-md p-5 rounded-[26px] border-2 border-[#F9C6D4] shadow-lg space-y-3">
                <div className="flex items-center justify-between text-xs font-semibold text-[#C79C9C]">
                  <span className="flex items-center gap-1.5">
                    <RotateCw size={12} className="animate-spin text-[#EFA9C2]" />
                    {streamStatusMsg}
                  </span>
                  <span>{streamProgress}%</span>
                </div>

                {/* Progress bar */}
                <div className="w-full h-3 bg-[#FCFBFB] rounded-full overflow-hidden border border-[#F6E4E4]">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${streamProgress}%` }}
                    className="h-full bg-gradient-to-r from-[#F9C6D4] to-[#EFA9C2]"
                  />
                </div>

                {/* Smart Stats Realtime */}
                <div className="grid grid-cols-4 gap-2 text-[10px] font-mono text-[#D7B8B8] font-semibold border-t border-[#F9EDED] pt-2">
                  <div className="text-center">
                    <span className="block text-gray-400">Tokens</span>
                    <strong>{receivedTokens} / 16K</strong>
                  </div>
                  <div className="text-center">
                    <span className="block text-gray-400">Tốc độ</span>
                    <strong>{streamingSpeed} tok/s</strong>
                  </div>
                  <div className="text-center">
                    <span className="block text-gray-400">Đã qua</span>
                    <strong>{elapsedTime} giây</strong>
                  </div>
                  <div className="text-center">
                    <span className="block text-gray-400">Dự kiến ETA</span>
                    <strong>~{Math.max(5, Math.ceil((8000 - receivedTokens) / (streamingSpeed || 150)))} giây</strong>
                  </div>
                </div>

                {/* Cancel Stream */}
                <div className="flex justify-end pt-1">
                  <button 
                    onClick={handleCancelStreaming}
                    className="px-3 py-1 rounded-full border border-[#D7B8B8] text-[9px] font-bold text-[#D7B8B8] hover:bg-[#FDFCFD] cursor-pointer"
                  >
                    Dừng dệt chữ
                  </button>
                </div>
              </div>
            )}

            {/* REAL-TIME OVERALL STREAM DISPLAY (Luôn hiển thị tại chỗ cho vợ nhen, cấm trống trắng!) */}
            {currentStreamingOutput && (
              <div className="bg-white/80 backdrop-blur-md p-6 rounded-[28px] border border-[#F9C6D4] shadow-inner space-y-3">
                <div className="flex items-center gap-1.5 border-b border-[#F6E4E4] pb-2 text-[10px] text-[#D7B8B8] font-bold">
                  <Sparkles size={12} className="text-[#EFA9C2]" />
                  VĂN BẢN ĐANG SINH REAL-TIME (Tài liệu mộc):
                </div>
                <div className="text-xs text-[#444444] leading-relaxed font-normal whitespace-pre-line overflow-y-auto max-h-[350px]">
                  {currentStreamingOutput}
                </div>
              </div>
            )}

            {/* Lịch sử Batches (Đợt 1, Đợt 2 nhen vợ yêu) */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-[#C79C9C] tracking-wide select-none">
                  🎀 Danh sách Đợt Phân Tích Đã Lưu ({analysisHistory.length})
                </h3>
                {analysisHistory.length > 0 && (
                  <button 
                    onClick={handleClearAnalysisHistory}
                    className="text-[10px] text-[#C79C9C] hover:text-red-400 flex items-center gap-1.5 cursor-pointer font-bold"
                  >
                    <Trash2 size={12} />
                    Xoá lịch sử Phân Tích
                  </button>
                )}
              </div>

              {analysisHistory.length === 0 ? (
                <div className="bg-white/50 backdrop-blur p-8 rounded-[24px] border border-dashed border-[#F9C6D4] text-center text-xs text-[#CFAAAA] font-semibold">
                  Chưa có đợt phân tích lưu trữ nào, vợ hãy bấm phân tích ngay hén! 🌸
                </div>
              ) : (
                <div className="space-y-4">
                  {analysisHistory.map((batch) => (
                    <div key={batch.id} className="bg-white/75 backdrop-blur-md p-5 rounded-[24px] border border-[#F9C6D4]/40 shadow-sm space-y-3">
                      <div className="flex items-center justify-between border-b border-[#F6E4E4] pb-2">
                        <span className="text-xs font-bold text-[#C79C9C] flex items-center gap-1">
                          <Award size={12} className="text-[#EFA9C2]" />
                          {batch.batchName}
                        </span>
                        <div className="flex items-center gap-2 text-[10px] text-gray-400">
                          <Clock size={10} />
                          {batch.timestamp}
                        </div>
                      </div>

                      <div className="text-xs text-[#444444] leading-relaxed font-normal whitespace-pre-line max-h-[250px] overflow-y-auto pr-2 bg-[#FCFBFB] p-3 rounded-2xl border border-[#FAF9F9]">
                        {batch.result}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        )}

        {/* TAB 5: VIẾT LẠI & CẢI THIỆN BÀI DO AI DỆT */}
        {activeTab === 'rewrite' && (
          <div className="max-w-3xl mx-auto w-full mt-4 space-y-6">
            
            {/* Bộ điều khiển Rewrite */}
            <div className="bg-white/80 backdrop-blur-md p-6 rounded-[28px] border border-[#F9C6D4] shadow-md space-y-4">
              <h2 className="text-md font-bold text-[#C79C9C] flex items-center gap-1.5 border-b border-[#FFF5FB] pb-2 select-none">
                <Sparkles size={18} className="text-[#EFA9C2]" />
                Cánh cổng dệt và cải thiện bài viết
              </h2>

              <div className="space-y-3">
                {/* Chọn bài viết để sửa */}
                <div>
                  <div className="flex justify-between items-center mb-1 select-none">
                    <label className="text-xs font-bold text-[#CFAAAA] block">1. Chọn bài viết thô cần cải tiến nơ ruy băng:</label>
                    <div className="text-[10px] font-bold">
                      {pasteProcessing && (
                        <span className="text-[#EFA9C2] animate-pulse">🌸 Đang dệt dán dạt dào...</span>
                      )}
                      {!pasteProcessing && autosaveStatus === 'saving' && (
                        <span className="text-[#C79C9C] animate-pulse">⏳ Đang lưu...</span>
                      )}
                      {!pasteProcessing && autosaveStatus === 'saved' && (
                        <span className="text-[#EFA9C2]">✓ Đã lưu nhẹ nhàng</span>
                      )}
                    </div>
                  </div>
                  
                  {/* Dropdown bài viết */}
                  <div className="flex flex-wrap gap-2 mb-2 select-none">
                    <button 
                      onClick={() => { setSelectedPostToRewrite(null); setCustomTextToRewrite(''); }}
                      className={`px-3 py-1.5 rounded-full text-[10px] font-bold border transition-all cursor-pointer ${!selectedPostToRewrite ? 'bg-[#F9C6D4] text-white border-[#F5C6D6]' : 'bg-white text-[#C79C9C] border-[#F6E4E4]'}`}
                    >
                      ✍️ Tự gõ nội dung thô bên dưới
                    </button>
                    {userPosts.map((p, i) => (
                      <button 
                        key={p.id}
                        onClick={() => setSelectedPostToRewrite(p)}
                        className={`px-3 py-1.5 rounded-full text-[10px] font-bold border transition-all cursor-pointer truncate max-w-[150px] ${selectedPostToRewrite?.id === p.id ? 'bg-[#F9C6D4] text-white border-[#F5C6D6]' : 'bg-white text-[#C79C9C] border-[#F6E4E4]'}`}
                      >
                        Bài viết {i+1}: {p.content.substring(0, 15)}...
                      </button>
                    ))}
                  </div>

                  {/* Kíp tự gõ nếu không chọn post */}
                  {!selectedPostToRewrite ? (
                    <DebouncedTextarea 
                      rows={4}
                      className="w-full p-3 rounded-2xl border border-[#F9C6D4] bg-white text-xs text-gray-700 leading-relaxed font-normal shadow-inner placeholder:text-[#BEBABA] focus:outline-none focus:ring-1 focus:ring-[#F5C6D6]"
                      placeholder="Trang hãy nạp văn bản thô, ý tưởng đang lở dở tại đây nhen, chồng yêu sẽ bảo AI dệt cho thật lung linh quyến rũ..."
                      value={customTextToRewrite}
                      onDebounceChange={handleCustomRewriteChangeWithAutosave}
                      onPasteProcessing={setPasteProcessing}
                    />
                  ) : (
                    <div className="p-3.5 rounded-2xl border border-[#F9C6D4] bg-[#FFF8F8]/40 text-xs text-gray-600 leading-relaxed font-normal select-none">
                      <span className="font-bold text-[#C79C9C] block mb-1">Nội dung bài viết mẫu đã chọn:</span>
                      "{selectedPostToRewrite.content.length > 150 ? selectedPostToRewrite.content.substring(0, 150) + '...' : selectedPostToRewrite.content}"
                    </div>
                  )}
                </div>

                {/* Chọn mục tiêu để rewrite */}
                <div className="relative">
                  <label className="text-xs font-bold text-[#CFAAAA] block mb-1">2. Chọn mục tiêu cải tiến độc quyền của Trang:</label>
                  
                  <button 
                    onClick={() => setShowObjectiveDropdown(!showObjectiveDropdown)}
                    className="w-full p-2.5 rounded-xl border border-[#F9C6D4] bg-white text-xs text-[#C79C9C] font-semibold text-left flex items-center justify-between cursor-pointer"
                  >
                    <span>{rewriteObjective}</span>
                    <ChevronRight size={14} className={`transform transition-transform ${showObjectiveDropdown ? 'rotate-90' : ''}`} />
                  </button>

                  <AnimatePresence>
                    {showObjectiveDropdown && (
                      <motion.div 
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        className="absolute left-0 right-0 mt-1 z-20 bg-white rounded-xl border border-[#F9C6D4] shadow-lg overflow-hidden divide-y divide-[#F9F1F1]"
                      >
                        {[
                          '🌸 Thêm ruy băng ngọt ngào Coquette',
                          '✨ Tối ưu hóa Hook (Mở bài kịch tính, khơi tình cảm)',
                          '🏷️ Đề xuất loạt Hashtag dễ thương lan tỏa thuật toán',
                          '📖 Chuyển sang văn phong kể chuyện chậm dạt dào tình',
                          '🌿 Làm ấm dịu giọng điệu dệt thơ (Soft Whisper tone)'
                        ].map(obj => (
                          <button 
                            key={obj}
                            onClick={() => { setRewriteObjective(obj); setShowObjectiveDropdown(false); }}
                            className="w-full p-2 text-left text-xs font-semibold text-gray-700 hover:bg-[#FFF5FB] bg-white transition-colors cursor-pointer"
                          >
                            {obj}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Nút bấm rewrite */}
                <div className="flex justify-end pt-2">
                  <button 
                    onClick={handleStartPostRewrite}
                    disabled={isStreaming}
                    className="px-5 py-2.5 rounded-full bg-[#F5C6D6] hover:bg-[#F2B8CC] text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-[#F5C6D6]/30 cursor-pointer disabled:opacity-50"
                  >
                    <Sparkles size={14} />
                    Tiến hành dệt lại ngay hén!
                  </button>
                </div>
              </div>
            </div>

            {/* Loading dệt cải thiện */}
            {isStreaming && (
              <div className="bg-white/90 backdrop-blur-md p-5 rounded-[26px] border-2 border-[#F9C6D4] shadow-lg space-y-3">
                <div className="flex items-center justify-between text-xs font-semibold text-[#C79C9C]">
                  <span className="flex items-center gap-1.5 flex-1">
                    <RotateCw size={12} className="animate-spin text-[#EFA9C2]" />
                    {streamStatusMsg}
                  </span>
                  <span>{streamProgress}%</span>
                </div>

                <div className="w-full h-3 bg-[#FCFBFB] rounded-full overflow-hidden border border-[#F6E4E4]">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${streamProgress}%` }}
                    className="h-full bg-gradient-to-r from-[#F9C6D4] to-[#EFA9C2]"
                  />
                </div>

                {/* Chồng huỷ dệt */}
                <div className="flex justify-between items-center text-[10px] font-mono font-semibold text-[#D7B8B8] border-t border-[#F9EDED] pt-2">
                  <span>Tokens thêu: {receivedTokens}</span>
                  <button 
                    onClick={handleCancelStreaming}
                    className="px-3 py-1 rounded-full border border-[#D7B8B8] font-bold hover:bg-[#FDFCFD] cursor-pointer"
                  >
                    Ngừng thêu
                  </button>
                </div>
              </div>
            )}

            {/* Bản mộc đang sinh */}
            {currentStreamingOutput && (
              <div className="bg-white/80 backdrop-blur-md p-6 rounded-[28px] border border-[#F9C6D4] shadow-inner space-y-3">
                <div className="flex items-center gap-1.5 border-b border-[#F6E4E4] pb-2 text-[10px] text-[#D7B8B8] font-bold select-none">
                  <Sparkles size={12} className="text-[#EFA9C2]" />
                  MỤC CHỮ PHÁT THỜI GIAN THỰC (Bản dệt cải tiến):
                </div>
                <div className="text-xs text-[#444444] leading-relaxed font-normal whitespace-pre-line max-h-[350px] overflow-y-auto">
                  {currentStreamingOutput}
                </div>
              </div>
            )}

            {/* Lịch sử cải thiện đợt */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-[#C79C9C] tracking-wide select-none">
                  📖 Quyển dệt bài cũ ({rewriteHistory.length})
                </h3>
                {rewriteHistory.length > 0 && (
                  <button 
                    onClick={handleClearRewriteHistory}
                    className="text-[10px] text-[#C79C9C] hover:text-red-400 font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Trash2 size={12} />
                    Xoá Quyển Cải Thiện
                  </button>
                )}
              </div>

              {rewriteHistory.length === 0 ? (
                <div className="bg-white/50 backdrop-blur p-8 rounded-[24px] border border-dashed border-[#F9C6D4] text-center text-xs text-[#CFAAAA] font-semibold">
                  Chưa dệt lại bài đăng nào nhen, hãy gõ thô dệt mộng rồi lưu quyển nha nàng... 🌸
                </div>
              ) : (
                <div className="space-y-4">
                  {rewriteHistory.map((run) => (
                    <div key={run.id} className="bg-white/75 backdrop-blur-md p-5 rounded-[24px] border border-[#F9C6D4]/40 shadow-sm space-y-3">
                      <div className="flex items-center justify-between border-b border-[#F6E4E4] pb-2">
                        <span className="text-xs font-bold text-[#C79C9C] flex items-center gap-1">
                          <BookOpen size={12} className="text-[#EFA9C2]" />
                          {run.batchName}
                        </span>
                        <span className="text-[9px] font-bold px-2.5 py-0.5 rounded-full bg-[#FFF5FB] border border-[#F9C6D4]/30 text-[#EFA9C2]">
                          Mục tiêu: {run.objective.substring(2)}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-normal leading-relaxed text-gray-600">
                        <div className="space-y-1">
                          <strong className="text-[10px] text-[#CFAAAA] block">✍️ BẢN SƠ KHỞI THÔ:</strong>
                          <p className="bg-[#FCFBFB]/50 p-2.5 rounded-xl border border-[#F6EEEE]">{run.originalText}</p>
                        </div>
                        <div className="space-y-1">
                          <strong className="text-[10px] text-[#C79C9C] block italic flex items-center justify-between">
                            <span>🎀 BẢN THÊU HOÀN CHỈNH:</span>
                            <button 
                              onClick={() => {
                                // Mở modal thêm bài viết và nạp nội dung bản rewrite này vào nhen!
                                setModalType('user');
                                setNewPostContent(run.rewrittenText);
                                setNewPostTags('DệtLại');
                                setEditingPostId(null);
                                setShowAddPostModal(true);
                                setEditorTab('write');
                                addConsoleLog("🌸 Chồng đã đưa bản thêu hoàn chỉnh vào ngăn kéo để vợ lưu lại hén!");
                              }}
                              className="text-[8px] font-bold text-[#EFA9C2] hover:underline cursor-pointer"
                            >
                              Sử dụng bản này nhen
                            </button>
                          </strong>
                          <p className="bg-white/95 p-2.5 rounded-xl border border-[#F9C6D4]/40 text-gray-700 whitespace-pre-line max-h-[220px] overflow-y-auto">{run.rewrittenText}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        )}

        {/* TAB 6: CHAT VỚI THỎ BIÊN TẬP CONTEXT-AWARE */}
        {activeTab === 'rabbitChat' && (
          <div className="max-w-2xl mx-auto w-full mt-4 flex-1 flex flex-col bg-white/75 backdrop-blur-md rounded-[32px] border border-[#F9C6D4]/60 shadow-lg overflow-hidden max-h-[85vh]">
            
            {/* Header Chat */}
            <div className="p-4 border-b border-[#F6E4E4] bg-[#FFF5FB]/80 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white border border-[#EFA9C2] flex items-center justify-center p-1 shadow-inner relative select-none">
                  <svg viewBox="0 0 64 64" className="w-full h-full" fill="none">
                    <path d="M22 22C18 10 24 6 26 14C28 22 26 28 26 28" stroke="#EFA9C2" strokeWidth="2.5" fill="#FFF5FB"/>
                    <path d="M42 22C46 10 40 6 38 14C36 22 38 28 38 28" stroke="#EFA9C2" strokeWidth="2.5" fill="#FFF5FB"/>
                    <circle cx="32" cy="38" r="11" fill="#FFFFFF" stroke="#EFA9C2" strokeWidth="2.5"/>
                    <circle cx="28" cy="36" r="1" fill="#EFA9C2"/>
                    <circle cx="36" cy="36" r="1" fill="#EFA9C2"/>
                    <path d="M31 39.5L33 39.5L32 41.5Z" fill="#EFA9C2"/>
                  </svg>
                  <div className="absolute right-0 bottom-0 w-2.5 h-2.5 bg-green-400 rounded-full border-2 border-white animate-ping"></div>
                </div>
                <div>
                  <h3 className="text-xs font-bold text-[#C79C9C] tracking-wide select-none">Thỏ Hồng Biên Tập 🐇</h3>
                  <p className="text-[9px] text-[#D3B2B2]">Cố vấn truyền cảm hứng & Phác ý tưởng</p>
                </div>
              </div>

              <button 
                onClick={handleClearChatHistory}
                className="text-[9px] px-2.5 py-1.5 rounded-full border border-[#FFF5FB] text-[#C79C9C] hover:bg-[#F9EDED] transition-colors cursor-pointer font-bold"
              >
                Xóa trò chuyện
              </button>
            </div>

            {/* Bubble Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 max-h-[450px]">
              {rabbitMessages.map((msg) => (
                <div 
                  key={msg.id} 
                  className={`flex items-start gap-2.5 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
                >
                  {/* Avatar */}
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center border shrink-0 text-xs font-bold shadow-sm select-none ${msg.role === 'user' ? 'bg-[#F9C6D4] border-[#F5C6D6] text-white' : 'bg-white border-[#EFA9C2] p-0.5'}`}>
                    {msg.role === 'user' ? 'T' : (
                      <svg viewBox="0 0 64 64" className="w-full h-full" fill="none">
                        <path d="M22 22C18 10 24 6 26 14C28 22 26 28 26 28" stroke="#EFA9C2" strokeWidth="2.5" fill="#FFF5FB"/>
                        <path d="M42 22C46 10 40 6 38 14C36 22 38 28 38 28" stroke="#EFA9C2" strokeWidth="2.5" fill="#FFF5FB"/>
                        <circle cx="32" cy="38" r="11" fill="#FFFFFF" stroke="#EFA9C2" strokeWidth="2.5"/>
                      </svg>
                    )}
                  </div>

                  {/* Bubble body */}
                  <div className="space-y-1 max-w-[75%]">
                    <div 
                      className={`p-3 rounded-2xl text-xs font-normal leading-relaxed shadow-sm ${msg.role === 'user' ? 'bg-[#F9C6D4] text-white rounded-tr-none' : 'bg-[#FCFBFB] text-gray-700 border border-[#FAF9F9] rounded-tl-none'}`}
                    >
                      {msg.content}
                    </div>
                    <span className="text-[8px] text-gray-400 block px-1">{msg.timestamp}</span>
                  </div>
                </div>
              ))}

              {/* Streaming Real-Time message */}
              {isStreaming && currentStreamingOutput && (
                <div className="flex items-start gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-white border border-[#EFA9C2] p-0.5 shadow-sm shrink-0">
                    <svg viewBox="0 0 64 64" className="w-full h-full" fill="none">
                      <path d="M22 22C18 10 24 6 26 14C28 22 26 28 26 28" stroke="#EFA9C2" strokeWidth="2.5" fill="#FFF5FB"/>
                      <circle cx="32" cy="38" r="11" fill="#FFFFFF" stroke="#EFA9C2" strokeWidth="2.5"/>
                    </svg>
                  </div>
                  <div className="space-y-1 max-w-[75%] animate-pulse">
                    <div className="p-3 rounded-2xl rounded-tl-none bg-[#FCFBFB] text-gray-700 border border-[#FAF9F9] text-xs font-normal leading-relaxed whitespace-pre-line">
                      {currentStreamingOutput}
                    </div>
                    <span className="text-[8px] text-[#EFA9C2] block px-1">• Thỏ Hồng đang viết... nơ rung rinh</span>
                  </div>
                </div>
              )}

              <div ref={chatEndRef} />
            </div>

            {/* Input Chat Box */}
            <div className="p-3 border-t border-[#F6E4E4] bg-white/90 flex items-center gap-2">
              <input 
                type="text"
                disabled={isStreaming}
                className="flex-1 p-2.5 rounded-2xl border border-[#F9C6D4] bg-white text-xs disabled:opacity-50 text-gray-700 focus:ring-1 focus:ring-[#F9C6D4] outline-none"
                placeholder="Trang muốn tâm sự hay có ý tưởng gì muốn phác thảo cùng chồng không hử?..."
                value={chatInputText}
                onChange={(e) => setChatInputText(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSendRabbitMessage(); }}
              />

              <button 
                onClick={handleSendRabbitMessage}
                disabled={isStreaming || !chatInputText.trim()}
                className="w-10 h-10 rounded-full bg-[#F5C6D6] hover:bg-[#F2B8CC] text-white flex items-center justify-center transition-transform hover:scale-105 active:scale-95 disabled:opacity-50 shadow-sm shrink-0 cursor-pointer"
              >
                <Send size={16} />
              </button>
            </div>
          </div>
        )}

        {/* TAB 6.5: KÊNH SÁNG TÁC COQUETTE KIKOKO */}
        {activeTab === 'channels' && (
          <div className="max-w-6xl mx-auto w-full mt-4 space-y-6 pb-12">
            
            {/* Header Kênh Sáng Tác */}
            <div className="p-6 bg-white/80 rounded-[32px] border-2 border-[#EFA9C2] shadow-md relative overflow-hidden select-none">
              <div className="absolute top-0 right-0 w-24 h-24 opacity-10">
                <svg viewBox="0 0 100 100" className="w-full h-full text-[#EFA9C2]">
                  <path d="M50,30 L90,90 L10,90 Z" fill="currentColor" />
                </svg>
              </div>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-[#FFF5FB] border border-[#F5C6D6] flex items-center justify-center p-1.5 shadow-sm text-[#EFA9C2] font-semibold text-xl">
                    🎀
                  </div>
                  <div>
                    <h1 className="text-md md:text-xl font-bold text-[#C79C9C] tracking-wide flex items-center gap-1.5">
                      KÊNH SÁNG TÁC COQUETTE
                      <span className="text-[10px] bg-[#F5C6D6] text-white px-2 py-0.5 rounded-full font-bold">PROXY SYNCHRONIZED</span>
                    </h1>
                    <p className="text-[10px] md:text-xs text-[#D3B2B2]">Dệt tinh hoa mộng ảo, chạm đỉnh 19,000 tokens mượt mà không đứt quãng hén vợ yêu 💕</p>
                  </div>
                </div>

                <button
                  onClick={handleAddChannel}
                  className="px-4.5 py-2.5 rounded-[16px] bg-[#F5C6D6] hover:bg-[#F2B8CC] text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-[#F5C6D6]/30 self-start md:self-auto transition-transform hover:scale-105 active:scale-95 cursor-pointer"
                >
                  <Plus size={14} />
                  🎀 Khởi Tạo Kênh Sáng Tác Mới
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* CỘT TRÁI: DANH SÁCH CÁC KÊNH & LỊCH SỬ DỆT */}
              <div className="lg:col-span-4 space-y-6">
                
                {/* Panel Danh sách Kênh */}
                <div className="p-5 bg-white/80 rounded-[32px] border border-[#F6E4E4] shadow-sm space-y-4">
                  <h3 className="text-xs font-bold text-[#C79C9C] flex items-center gap-1.5 border-b border-[#FDFCFD] pb-2">
                    <span>🌸 Hệ Thống Kênh Sáng Tác</span>
                    <span className="text-[8px] bg-[#FFF5FB] px-1.5 py-0.5 rounded-full text-[#CFAAAA] font-bold border border-[#F9C6D4]">
                      {channels.length} kênh
                    </span>
                  </h3>

                  <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                    {channels.map((chan) => {
                      const isActive = chan.id === activeChannelId;
                      return (
                        <div
                          key={chan.id}
                          onClick={() => { if (!isStreaming) setActiveChannelId(chan.id); }}
                          className={`p-3.5 rounded-[20px] transition-all border cursor-pointer relative group ${isActive ? 'bg-[#FFF5FB] border-[#EFA9C2] shadow-sm' : 'bg-white/50 border-[#F6E4E4] hover:bg-[#FDFCFD]'}`}
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <span className={`text-xs font-bold ${isActive ? 'text-[#C79C9C]' : 'text-gray-700'}`}>
                              🎀 {chan.name}
                            </span>
                            
                            {/* Buttons Sửa/Xoá */}
                            <div className="flex items-center gap-1 opacity-80 md:opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={(e) => { e.stopPropagation(); handleEditChannel(chan); }}
                                disabled={isStreaming}
                                className="w-6 h-6 rounded-md bg-white hover:bg-[#FFF5FB] text-[#CFAAAA] flex items-center justify-center border border-[#F6E4E4] cursor-pointer"
                                title="Sửa kênh"
                              >
                                ✍️
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleDeleteChannel(chan.id); }}
                                disabled={isStreaming}
                                className="w-6 h-6 rounded-md bg-[#FFF5FB] hover:bg-[#F9EDED] text-red-400 flex items-center justify-center border border-[#EFCFCF] cursor-pointer"
                                title="Xoá kênh"
                              >
                                ✕
                              </button>
                            </div>
                          </div>

                          <p className="text-[10px] text-gray-500 line-clamp-1 mb-1">
                            <strong>Chủ đề:</strong> {chan.topic}
                          </p>
                          <p className="text-[10px] text-gray-400 line-clamp-1 font-mono">
                            <strong>Lệnh ẩn:</strong> {chan.systemPrompt}
                          </p>

                          {chan.history && chan.history.length > 0 && (
                            <div className="mt-2 pt-1 border-t border-[#FFF8F8] flex items-center gap-1 text-[8px] text-[#CFAAAA]">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#EFA9C2]"></span>
                              Đã lưu được {chan.history.length}/2 đợt mây tình tiếp nối
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Kết quả dệt chương trước đó */}
                {channelWriteOutput && (
                  <div className="p-5 bg-white/80 rounded-[32px] border border-[#F6E4E4] shadow-sm space-y-3">
                    <div className="flex items-center justify-between border-b border-[#FDFCFD] pb-2">
                      <h4 className="text-xs font-bold text-[#C79C9C] flex items-center gap-1">
                        ✨ Chương Đã Dệt Hoàn Tất
                      </h4>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(channelWriteOutput);
                          alert("Chồng đã bỏ túi văn chương lấp lánh nơ này cho vợ Đường rồi nhen! Copy thành công 💕");
                        }}
                        className="text-[9px] px-2.5 py-1 rounded-full bg-[#FFF5FB] hover:bg-[#F9EDED] text-[#D7B8B8] font-bold border border-[#F5C6D6] cursor-pointer"
                      >
                        Sao chép chương
                      </button>
                    </div>
                    <div className="text-[10.5px] text-gray-600 leading-relaxed max-h-[250px] overflow-y-auto whitespace-pre-line bg-[#FCFBFB] p-3 rounded-2xl border border-[#FAF9F9]">
                      {channelWriteOutput}
                    </div>
                  </div>
                )}
              </div>

              {/* CỘT PHẢI: BẢNG VIẾT TRUYỆN MƠ MỘNG & LÒNG SINH TRƯỞNG */}
              <div className="lg:col-span-8 space-y-6">
                
                {/* Thông tin kênh đang chọn */}
                {(() => {
                  const currentChannel = channels.find(c => c.id === activeChannelId) || channels[0];
                  return (
                    <div className="p-5 bg-white/80 rounded-[32px] border border-[#F6E4E4] shadow-sm space-y-4">
                      
                      {/* Vùng chi tiết Kênh */}
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 bg-[#FFF8F8]/40 p-3.5 rounded-2xl border border-[#F6E4E4]">
                        <div className="space-y-1">
                          <h4 className="text-xs font-bold text-[#C79C9C]">
                            Kênh đang dệt: <span className="text-[#D7B8B8] font-bold underline">{currentChannel?.name}</span>
                          </h4>
                          <p className="text-[10px] text-gray-600">
                            <strong>Cột mốc mộng ảo:</strong> {currentChannel?.topic}
                          </p>
                          <p className="text-[10px] text-gray-400">
                            <strong>Lối ứng ứng dụng:</strong> {currentChannel?.activities}
                          </p>
                        </div>
                        <span className="text-[9px] px-2.5 py-1 rounded-full bg-[#FFF5FB] border border-[#F9C6D4] text-[#EFA9C2] font-semibold self-start md:self-auto select-none">
                          Kế thừa API Hub hén! 💖
                        </span>
                      </div>

                      {/* Khung dập tơ (Prompt thêu văn) */}
                      <div className="space-y-2">
                        <label className="text-[11px] font-bold text-[#C79C9C] flex items-center justify-between">
                          <span>🌸 Khung dệt ý tưởng chương truyện:</span>
                          <span className="text-[9px] text-[#D3B2B2] font-normal">Sắp đặt các tình tiết, mâu thuẫn lấp lánh nơ nhen vợi!</span>
                        </label>
                        <DebouncedTextarea
                          disabled={isStreaming}
                          rows={4}
                          className="w-full p-4.5 rounded-2xl border border-[#F9C6D4] bg-[#FCFBFB] text-xs leading-relaxed focus:ring-1 focus:ring-[#EFA9C2] outline-none text-gray-700 placeholder-[#D3B2B2]"
                          placeholder="Nhập mầm mống ý tưởng của vợ yêu... (Ví dụ: Viết tiếp một đoạn thật dài và chi tiết mô tả cảnh nam chính dịu dàng thắt ruy băng hồng lên tóc nữ chính dưới cơn mưa hoa đào mộng mơ...)"
                          value={channelWritePrompt}
                          onDebounceChange={setChannelWritePrompt}
                        />
                      </div>

                      {/* Phân nhóm chọn Độ dài tác phẩm */}
                      <div className="space-y-2.5 pt-1">
                        <label className="text-[10px] font-bold text-[#C79C9C] flex items-center gap-1">
                          🎚️ Lựa chọn Độ dài Văn Bản & Áp đặt Tơ Nơ (Enforcement):
                        </label>
                        <div className="grid grid-cols-3 gap-2.5">
                          <button
                            type="button"
                            disabled={isStreaming}
                            onClick={() => setChannelLengthMode('normal')}
                            className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer text-[10px] flex flex-col items-center justify-center gap-0.5 ${channelLengthMode === 'normal' ? 'bg-[#FFF5FB] border-[#EFA9C2] text-[#C79C9C] shadow-sm' : 'bg-white border-[#F6E4E4] text-[#CFAAAA] hover:bg-[#FDFCFD]'}`}
                          >
                            <span className="font-bold">🌸 Bình thường</span>
                            <span className="text-[8px] opacity-80">~8,000 Tokens</span>
                          </button>

                          <button
                            type="button"
                            disabled={isStreaming}
                            onClick={() => setChannelLengthMode('long')}
                            className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer text-[10px] flex flex-col items-center justify-center gap-0.5 ${channelLengthMode === 'long' ? 'bg-[#FFF5FB] border-[#EFA9C2] text-[#C79C9C] shadow-sm' : 'bg-white border-[#F6E4E4] text-[#CFAAAA] hover:bg-[#FDFCFD]'}`}
                          >
                            <span className="font-bold">🎀 Thượng Thừa (SCTE)</span>
                            <span className="text-[8px] opacity-80">🔥 12,000 - 16,000 Tokens</span>
                          </button>

                          <button
                            type="button"
                            disabled={isStreaming}
                            onClick={() => setChannelLengthMode('very_long')}
                            className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer text-[10px] flex flex-col items-center justify-center gap-0.5 ${channelLengthMode === 'very_long' ? 'bg-[#FFF5FB] border-[#EFA9C2] text-[#C79C9C] shadow-sm' : 'bg-white border-[#F6E4E4] text-[#C79C9C] hover:bg-[#FDFCFD]'}`}
                          >
                            <span className="font-bold">✨ Kim Sa Đại Thiên (19K)</span>
                            <span className="text-[8px] opacity-80">🌟 19,000 - 30,000 Tokens</span>
                          </button>
                        </div>
                      </div>

                      {/* Nút bấm tiến hành gọi dệt dập tơ */}
                      <div className="flex justify-between items-center pt-2">
                        <div className="text-[9px] text-gray-400 italic">
                          *Sử dụng mô hình cấu hình tại API Hub
                        </div>
                        <button
                          onClick={handleStartChannelWrite}
                          disabled={isStreaming || !channelWritePrompt.trim()}
                          className="px-6 py-3 rounded-full bg-[#F5C6D6] hover:bg-[#F2B8CC] text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-[#F5C6D6]/35 transition-transform hover:scale-102 active:scale-98 disabled:opacity-50 shrink-0 cursor-pointer"
                        >
                          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.244 6.059L19.5 10.3M15.244 6.059a3 3 0 114.243 4.243l-9.67 9.67a4.5 4.5 0 01-1.59 1.03l-2.729.91a.75.75 0 01-.91-.91l.91-2.729a4.5 4.5 0 011.03-1.59l9.67-9.67zm-9.67 9.67a1.5 1.5 0 112.122-2.122M6.75 19.5l2.25-2.25" />
                          </svg>
                          Bắt đầu dệt chương tiểu thuyết
                        </button>
                      </div>

                    </div>
                  );
                })()}

                {/* SMART LOADING BAR THỦY TINH & OUTPUT HOẠT ĐỘNG */}
                {isStreaming && (
                  <div className="p-5 bg-white/85 rounded-[32px] border-2 border-[#EFA9C2] shadow-sm space-y-4">
                    
                    {/* Thống kê chi tiết */}
                    <div className="flex items-center justify-between text-[10px] text-gray-500 pb-1">
                      <span className="flex items-center gap-1">
                        ⏱️ Đã qua: <strong className="text-gray-700 font-mono">{elapsedTime} giây</strong>
                      </span>
                      <span className="flex items-center gap-1">
                        ⚡ Tốc độ: <strong className="text-[#C79C9C] font-mono">{streamingSpeed} token/giây</strong>
                      </span>
                      <span className="flex items-center gap-1">
                        ⏳ ETA khuyên nhủ: <strong className="text-gray-700 font-mono">
                          {streamingSpeed > 0 
                            ? `${Math.max(1, Math.ceil((16000 - receivedTokens) / streamingSpeed))} giây` 
                            : 'Đang mồi kết nối...'}
                        </strong>
                      </span>
                    </div>

                    {/* Vạch Đo Lợi Hưỡg Smart Bar */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-[9px] font-bold">
                        <span className="text-[#EFA9C2]">🧬 Tiến độ dệt dập tơ: {streamProgress}%</span>
                        <span className="text-[#C79C9C]">🧮 {receivedTokens} / 30,000 Tokens thực nhận</span>
                      </div>
                      
                      <div className="w-full h-3 rounded-full bg-[#FFF8F8] border border-[#F6E4E4] overflow-hidden relative shadow-inner p-0.5">
                        <div 
                          className="h-full rounded-full transition-all duration-300 relative flex items-center justify-end"
                          style={{ 
                            width: `${streamProgress}%`,
                            background: receivedTokens < 12000 
                              ? 'linear-gradient(to right, #F9C6D4, #F5C6D6)' 
                              : receivedTokens < 16000 
                                ? 'linear-gradient(to right, #F5C6D6, #EFA9C2)' 
                                : receivedTokens < 19000 
                                  ? 'linear-gradient(to right, #EFA9C2, #D7B8B8)' 
                                  : 'linear-gradient(to right, #EFA9C2, #FEBFFC)'
                          }}
                        >
                          <div className="w-1.5 h-1.5 rounded-full bg-white mr-1 opacity-80 animate-ping"></div>
                        </div>
                      </div>
                    </div>

                    {/* Cánh cổng bảo mật Hard Gate Indicators */}
                    <div className="grid grid-cols-4 gap-1 text-[8px] text-center font-bold">
                      <div className={`p-1 rounded-md border ${receivedTokens < 12000 ? 'bg-red-50 border-red-200 text-red-500 animate-pulse' : 'bg-gray-50 border-transparent text-gray-400'}`}>
                        🔒 DƯỚI SÀN (&lt;12K)
                      </div>
                      <div className={`p-1 rounded-md border ${receivedTokens >= 12000 && receivedTokens < 16000 ? 'bg-yellow-50 border-yellow-200 text-yellow-600 animate-pulse' : 'bg-gray-50 border-transparent text-gray-400'}`}>
                        🔑 ĐẠT PHỔ THÔNG (12K-16K)
                      </div>
                      <div className={`p-1 rounded-md border ${receivedTokens >= 16000 && receivedTokens < 19000 ? 'bg-green-50 border-green-200 text-green-600 animate-pulse' : 'bg-gray-50 border-transparent text-gray-400'}`}>
                        🔓 ĐỈNH CAO (16K-19K)
                      </div>
                      <div className={`p-1 rounded-md border ${receivedTokens >= 19000 ? 'bg-[#FFF5FB] border-[#EFA9C2] text-[#EFA9C2] animate-bounce' : 'bg-gray-50 border-transparent text-gray-400'}`}>
                        🌟 KIM SA ĐẠI THIÊN (19K+)
                      </div>
                    </div>

                    {/* Dòng Trạng Thái Dynamic Status */}
                    <div className="p-3 bg-[#FFF5FB]/75 rounded-2xl border border-[#F5C6D6] flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-[#EFA9C2] animate-ping"></span>
                        <p className="text-[10px] text-[#C79C9C] font-semibold">
                          {streamStatusMsg}
                        </p>
                      </div>

                      <button
                        onClick={() => {
                          if (abortControllerRef.current) {
                            abortControllerRef.current.abort('Vợ yêu Đường đã chủ động huỷ nhen 💕');
                            setIsStreaming(false);
                            addConsoleLog('[Kênh Sáng Tác] Vợ Đường đã huỷ dệt chương.');
                          }
                        }}
                        className="px-2.5 py-1.5 rounded-full bg-white hover:bg-[#F9EDED] ring-1 ring-red-200 text-red-400 text-[9px] font-bold transition-colors cursor-pointer"
                      >
                        Hủy dệt nhen 🎀
                      </button>
                    </div>

                  </div>
                )}

                {/* Vùng Streaming văn bản thời gian thực */}
                {currentStreamingOutput && (
                  <div className="p-6 bg-white rounded-[32px] border border-[#F6E4E4] shadow-sm space-y-3.5 relative overflow-hidden">
                    <div className="absolute top-2 right-4 flex items-center gap-1 text-[8px] text-[#EFA9C2] font-semibold animate-pulse">
                      <span>• Chồng đang mài sắc tơ dệt chữ...</span>
                    </div>

                    <h4 className="text-xs font-bold text-[#C79C9C] border-b border-[#FDFCFD] pb-1.5">
                      📜 Tác Phẩm Đang Sinh Trưởng Trực Tiếp:
                    </h4>

                    <div className="text-[11px] leading-relaxed text-gray-700 whitespace-pre-line font-normal font-sans tracking-wide max-h-[500px] overflow-y-auto bg-[#FCFBFB] p-4.5 rounded-2xl border border-[#FAF9F9]">
                      {currentStreamingOutput}
                    </div>
                  </div>
                )}

              </div>

            </div>

            {/* MODAL PHỔ KHỞI TẠO HOẶC CHỈNH SỬA KÊNH SÁNG TÁC (Glassmorphism sắc nét) */}
            {showChannelForm && (
              <div className="fixed inset-0 bg-[#EAD6D6]/40 flex items-center justify-center p-4 z-50 animate-fade-in select-none">
                <div className="w-full max-w-lg bg-white/95 rounded-[32px] border-2 border-[#EFA9C2] shadow-2xl p-6.5 space-y-5 relative">
                  
                  {/* Title Form Modal */}
                  <div className="flex items-center justify-between border-b border-[#FDFCFD] pb-3">
                    <h3 className="text-sm font-bold text-[#C79C9C] flex items-center gap-2">
                      <span>🎀 {channelFormType === 'add' ? 'KHỞI TẠO KÊNH SÁNG TÁC MỚI' : 'SỬA THÔNG TIN KÊNH SÁNG TÁC'}</span>
                    </h3>
                    <button
                      onClick={() => setShowChannelForm(false)}
                      className="text-gray-400 hover:text-gray-600 text-sm font-bold w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
                    
                    {/* Tên Kênh */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-[#C79C9C]">🌸 Tên kênh dệt văn lấp lánh nơ:</label>
                      <input
                        type="text"
                        className="w-full p-2.5 rounded-xl border border-[#F9C6D4] bg-[#FCFBFB] text-xs text-gray-700 focus:ring-1 focus:ring-[#EFA9C2] outline-none"
                        placeholder="Ví dụ: Kênh Dành Cho Sủng Ngọt"
                        value={channelFormName}
                        onChange={(e) => setChannelFormName(e.target.value)}
                      />
                    </div>

                    {/* Chủ đề mộng mơ */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-[#C79C9C]">🎀 Chủ đề hoạt động chính của kênh:</label>
                      <input
                        type="text"
                        className="w-full p-2.5 rounded-xl border border-[#F9C6D4] bg-[#FCFBFB] text-xs text-gray-700 focus:ring-1 focus:ring-[#EFA9C2] outline-none"
                        placeholder="Ví dụ: Các tích phân ngọt xé tụy, thắt nơ hồng dịu mượt và chăm sóc chu đáo..."
                        value={channelFormTopic}
                        onChange={(e) => setChannelFormTopic(e.target.value)}
                      />
                    </div>

                    {/* Hoạt động chính */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-[#C79C9C]">✨ Các hoạt động hiện hành của kênh:</label>
                      <input
                        type="text"
                        className="w-full p-2.5 rounded-xl border border-[#F9C6D4] bg-[#FCFBFB] text-xs text-gray-700 focus:ring-1 focus:ring-[#EFA9C2] outline-none"
                        placeholder="Ví dụ: Dệt tiếp chương truyện, rà soát ý tưởng, gợi mở tâm trạng lãng mạn..."
                        value={channelFormActivities}
                        onChange={(e) => setChannelFormActivities(e.target.value)}
                      />
                    </div>

                    {/* Prompt chỉ định SYSTEM ẩn */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-[#C79C9C] flex items-center justify-between">
                        <span>🧬 Prompt Lệnh SYSTEM Ẩn Chỉ Định Cho AI (Chỉ gửi ngầm hén):</span>
                      </label>
                      <DebouncedTextarea
                        rows={4}
                        className="w-full p-3 rounded-xl border border-[#F9C6D4] bg-[#FCFBFB] text-xs text-gray-700 leading-relaxed focus:ring-1 focus:ring-[#EFA9C2] outline-none"
                        placeholder="Chỉ dẫn phong cách viết dệt độc nhất hoặc cấu tạo nhân vật rực rỡ..."
                        value={channelFormSystemPrompt}
                        onDebounceChange={setChannelFormSystemPrompt}
                      />
                      <p className="text-[9px] text-[#D3B2B2] italic">
                        *Prompt này sẽ được gửi trực tiếp vào system prompt giúp AI luôn bám víu và khăng khít theo đúng ý hén!
                      </p>
                    </div>

                  </div>

                  {/* Modal Footer Actions */}
                  <div className="flex justify-end gap-2.5 pt-2 border-t border-[#FFF8F8]">
                    <button
                      type="button"
                      onClick={() => setShowChannelForm(false)}
                      className="px-4 py-2 rounded-xl border border-[#F6E4E4] text-[#CFAAAA] hover:bg-[#FDFCFD] text-xs font-bold cursor-pointer"
                    >
                      Bỏ qua nhen
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveChannelForm}
                      className="px-4 py-2 rounded-xl bg-[#F5C6D6] hover:bg-[#F2B8CC] text-white text-xs font-bold shadow-md shadow-[#F5C6D6]/35 cursor-pointer"
                    >
                      Lưu và dệt Kênh hén 💕
                    </button>
                  </div>

                </div>
              </div>
            )}

          </div>
        )}

        {/* TAB 5.5: VIẾT TIỂU THUYẾT MƠ MỘNG BẢN LỚN */}
        {activeTab === 'novel' && (
          <div id="kikoko-novel-tab" className="max-w-4xl mx-auto w-full mt-4 space-y-6 pb-12">
            
            {/* Banner giới thiệu */}
            <div className="bg-white/80 backdrop-blur-md p-6 rounded-[28px] border border-[#F9C6D4] shadow-md relative overflow-hidden select-none">
              <div className="absolute top-0 right-0 w-28 h-28 opacity-15">
                <svg viewBox="0 0 100 100" className="w-full h-full text-[#EFA9C2]">
                  <path d="M50,15 C40,25 35,40 35,50 C35,65 45,75 50,85 C55,75 65,65 65,50 C65,40 60,25 50,15 Z" fill="currentColor" />
                </svg>
              </div>

              <div className="space-y-2">
                <h2 className="text-md font-bold text-[#C79C9C] flex items-center gap-1.5 border-b border-[#FFF5FB] pb-2">
                  <BookOpen size={18} className="text-[#EFA9C2]" />
                  Cung Điện Sáng Tác Tiểu Thuyết 35 Chương 🎀
                </h2>
                <p className="text-xs text-gray-600 leading-relaxed font-normal">
                  Chồng yêu sẽ thu thập tất cả thông tin quan trọng của nhóm <span className="font-bold text-[#EFA9C2] bg-[#FFF5FB] px-1.5 py-0.5 rounded-lg border border-[#F6E4E4]">"{groupName || 'Chưa đặt tên'}"</span> bao gồm chủ đề <span className="italic">"{groupTopic}"</span>, hướng đi <span className="italic">"{contentOrientation}"</span>, 
                  toàn bộ <span className="font-semibold text-[#EFA9C2]">{userPosts.length} bài viết của Trang</span>, <span className="font-semibold text-[#EFA9C2]">{hotPosts.length} bài viết hot cộng đồng</span> có tương tác cao cùng các hashtags nổi bật 
                  <span className="font-mono text-[#EFA9C2]"> ({requiredOnPost || 'không có'})</span> để dệt thành bộ tiểu thuyết dài tập đồ sộ 35 chương, mỗi chương đạt 5000 từ cực kỳ hoành tráng nhen vợ yêu! 💕
                </p>
                <div className="bg-[#FFF8F8] p-2.5 rounded-2xl text-[10px] text-[#C79C9C] font-semibold flex items-center gap-2 border border-[#F9C6D4]/40 mt-2">
                  <Sparkles size={12} className="text-[#EFA9C2] shrink-0" />
                  <span>Quy chuẩn Hiến pháp: Bản dệt của Chồng sẽ gọi trực tiếp qua <strong>API Proxy</strong> của vợ thiết lập, kích hoạt vòi nước chảy tự do không giới hạn, cam kết đạt tối thiểu 12,000 đến 19,000 tokens dạt dào chữ nghĩa trong một nhấp chuột!</span>
                </div>
              </div>
            </div>

            {/* Trình tạo & điều khiển */}
            <div className="bg-white/80 backdrop-blur-md p-6 rounded-[28px] border border-[#F9C6D4] shadow-md space-y-4">
              <span className="block text-xs font-bold text-[#C79C9C] select-none">
                🍨 ĐỊNH HƯỚNG Ý TƯỞNG TIỂU THUYẾT & CHẤT LIỆU DỆT MỘNG:
              </span>

              <div className="space-y-4">
                {/* 🎯 Thông tin Đợt dệt tự động cho vợ nhen! 🎀 */}
                <div className="bg-[#FFF5FB]/50 p-4 rounded-2xl border border-[#F9C6D4]/40 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold text-[#C79C9C] flex items-center gap-1 select-none uppercase">
                      🎀 TIẾN TRÌNH SÁNG TÁC TIỂU THUYẾT:
                    </label>
                    <span className="bg-[#EFA9C2] text-white px-2 py-1 rounded-full text-[10px] font-bold">
                      Chuẩn bị dệt: Đợt {novelHistory.length + 1}
                    </span>
                  </div>
                  <p className="text-[9px] text-[#CFAAAA] leading-relaxed font-semibold">
                    * Chồng sẽ đồng loạt dệt mới 35 chương cho Đợt {novelHistory.length + 1} và tự động đan cài tàn dư cốt truyện từ các đợt dệt trước đó để luôn liền mạch nha vợ yêu! 💕
                  </p>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-[#CFAAAA] block mb-1.5 select-none">
                    1. Gợi ý thêm cốt truyện, phong cách hoặc bối cảnh mà Trang muốn dệt nơ:
                  </label>
                  <textarea 
                    rows={4}
                    className="w-full p-3.5 rounded-2xl border border-[#F9C6D4] text-[#CBB3B3] text-xs font-normal leading-relaxed focus:outline-none focus:ring-1 focus:ring-[#F5C6D6] bg-[#FCFBFB]"
                    placeholder="Ví dụ: Viết một câu chuyện về cô bé hoạ sĩ mơ mộng nơi tiệm trà hoa hồng cánh mỏng, cô luôn dùng ruy băng thêu hoa hồng sữa buộc tóc... Hoặc Trang cứ để trống nếu muốn chồng toàn quyền dệt hịch nhen! ✨"
                    value={novelIdea}
                    onChange={(e) => setNovelIdea(e.target.value)}
                  />
                </div>

                {/* Phần Sử dụng luân phiên các avatar */}
                <div className="bg-[#FBF5F7]/40 p-4 rounded-2xl border border-[#F6E4E4] space-y-2">
                  <span className="block text-[10px] font-bold text-[#C79C9C] select-none flex items-center gap-1">
                    💝 CHUỖI XOAY VÒNG AVATAR HOẠ HÌNH TIỂU THUYẾT (SỬ DỤNG LUÂN PHIÊN):
                  </span>
                  <div className="flex flex-wrap gap-2.5 items-center">
                    {NOVEL_AVATARS.map((url, i) => {
                      const isNext = i === novelAvatarIndex;
                      return (
                        <div 
                          key={i} 
                          onClick={() => {
                            setNovelAvatarIndex(i);
                            addConsoleLog(`🌸 Vợ chọn avatar thủ công thứ ${i + 1} cho chương tiểu thuyết tiếp theo hén!`);
                          }}
                          className={`relative w-11 h-11 rounded-xl cursor-pointer overflow-hidden border-2 transition-all hover:scale-105 ${isNext ? 'border-[#EFA9C2] shadow-md scale-105 ring-2 ring-[#FFF5FB]' : 'border-[#F6E4E4] opacity-60'}`}
                        >
                          <img src={url} className="w-full h-full object-cover" alt={`Avatar ${i+1}`} referrerPolicy="no-referrer" />
                          {isNext && (
                            <div className="absolute top-0 right-0 bg-[#EFA9C2] text-white text-[8px] px-1 py-0.2 rounded-bl font-bold select-none">
                              Kế
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-[9px] text-[#D3B2B2] italic font-semibold select-none">
                    * Hệ thống sẽ tự động xoay chuyển luân phiên avatar sau mỗi lần dệt hịch. Hiện tại, avatar tiếp theo ở mốc có chữ "Kế" nơ hồng đó vợ yêu hén! 💕
                  </p>
                </div>

                {/* Nút dệt chính */}
                <div className="flex justify-center pt-2">
                  <button
                    id="generate-novel-btn"
                    onClick={handleGenerateNovel}
                    disabled={isStreaming}
                    className="w-full sm:w-auto px-8 py-3.5 rounded-full bg-gradient-to-r from-[#F5C6D6] via-[#F2B8CC] to-[#EFA9C2] hover:from-[#EFA9C2] hover:to-[#F5C6D6] text-white font-bold text-xs tracking-wider uppercase transition-all shadow-lg shadow-[#F5C6D6]/40 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 active:scale-95 hover:scale-[1.02]"
                  >
                    <Sparkles size={14} className="animate-pulse" />
                    🎀 GỌI API PROXY VIẾT TIỂU THUYẾT 35 CHƯƠNG 🎀
                  </button>
                </div>
              </div>
            </div>

            {/* Smart progress bar when streaming analysis */}
            {isStreaming && (
              <div className="bg-white/90 backdrop-blur-md p-5 rounded-[26px] border-2 border-[#F9C6D4] shadow-lg space-y-3">
                <div className="flex items-center justify-between text-xs font-semibold text-[#C79C9C]">
                  <span className="flex items-center gap-1.5 select-none">
                    <RotateCw size={12} className="animate-spin text-[#EFA9C2]" />
                    {streamStatusMsg}
                  </span>
                  <span>{streamProgress}%</span>
                </div>

                {/* Progress bar */}
                <div className="w-full h-3 bg-[#FCFBFB] rounded-full overflow-hidden border border-[#F6E4E4] select-none">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${streamProgress}%` }}
                    className="h-full bg-gradient-to-r from-[#F9C6D4] to-[#EFA9C2]"
                  />
                </div>

                {/* Smart Stats Realtime */}
                <div className="grid grid-cols-4 gap-2 text-[10px] font-mono text-[#D7B8B8] font-semibold border-t border-[#F9EDED] pt-2 select-none">
                  <div className="text-center">
                    <span className="block text-gray-400">Tokens</span>
                    <strong>{receivedTokens} / 19K</strong>
                  </div>
                  <div className="text-center">
                    <span className="block text-gray-400">Tốc độ</span>
                    <strong>{streamingSpeed} tok/s</strong>
                  </div>
                  <div className="text-center">
                    <span className="block text-gray-400">Đã qua</span>
                    <strong>{elapsedTime} giây</strong>
                  </div>
                  <div className="text-center">
                    <span className="block text-gray-400">Dự kiến ETA</span>
                    <strong>~{Math.max(5, Math.ceil((16000 - receivedTokens) / (streamingSpeed || 150)))} giây</strong>
                  </div>
                </div>

                {/* Cancel Stream */}
                <div className="flex justify-end pt-1 select-none">
                  <button 
                    onClick={handleCancelStreaming}
                    className="px-3 py-1 rounded-full border border-[#D7B8B8] text-[9px] font-bold text-[#D7B8B8] hover:bg-[#FDFCFD] cursor-pointer"
                  >
                    Dừng dệt chữ
                  </button>
                </div>
              </div>
            )}

            {/* REAL-TIME OVERALL STREAM DISPLAY */}
            {currentStreamingOutput && (
              <div className="bg-white/80 backdrop-blur-md p-6 rounded-[28px] border border-[#F9C6D4] shadow-inner space-y-3">
                <div className="flex items-center gap-1.5 border-b border-[#F6E4E4] pb-2 text-[10px] text-[#D7B8B8] font-bold select-none">
                  <Sparkles size={12} className="text-[#EFA9C2]" />
                  TIỂU THUYẾT ĐANG DỆT REAL-TIME CHƯƠNG LẤP LÁNH:
                </div>
                <div className="text-xs text-[#444444] leading-relaxed font-normal whitespace-pre-line overflow-y-auto max-h-[380px] bg-[#FFF8F8]/20 p-4 rounded-2xl border border-[#FAFBFF]">
                  {currentStreamingOutput}
                </div>
              </div>
            )}

            {/* Lịch sử lưu trữ bản thảo */}
            <div className="space-y-4">
              <div className="flex items-center justify-between select-none">
                <h3 className="text-xs font-bold text-[#C79C9C] tracking-wide">
                  🎀 Danh sách tác phẩm tiểu thuyết đã lưu ({novelHistory.length})
                </h3>
                {novelHistory.length > 0 && (
                  <button 
                    onClick={handleClearNovelHistory}
                    className="text-[10px] text-[#C79C9C] hover:text-red-400 flex items-center gap-1.5 cursor-pointer font-bold"
                  >
                    <Trash2 size={12} />
                    Xoá tất cả tiểu thuyết
                  </button>
                )}
              </div>

              {novelHistory.length === 0 ? (
                <div className="bg-white/50 backdrop-blur p-8 rounded-[24px] border border-dashed border-[#F9C6D4] text-center text-xs text-[#CFAAAA] font-semibold select-none flex flex-col items-center gap-2">
                  <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center text-[#EFA9C2] shadow-sm">
                    <BookOpen size={18} />
                  </div>
                  <span>Chưa dệt hịch chương mới, mời vợ hiền khởi động múc chữ nhen! 🌸</span>
                </div>
              ) : (
                <div className="space-y-12">
                  {novelHistory.map((batch) => (
                    <div key={batch.id} className="space-y-6 relative">
                      {/* --- BATCH HEADER CARD --- */}
                      <div className="bg-[rgba(255,235,240,0.82)] p-5 rounded-[26px] border border-[rgba(255,192,203,0.30)] shadow-[0_8px_30px_rgba(255,182,193,0.10)] relative overflow-hidden">
                        {/* Cột hoa góc nhẹ */}
                        <div className="absolute top-0 right-0 w-12 h-12 opacity-5 pointer-events-none">
                          🎀
                        </div>

                        <div className="flex items-center justify-between border-b border-[#F6E4E4] pb-3 mb-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full overflow-hidden border border-[#F9C6D4]/60 shadow-sm shrink-0">
                              <img src={batch.avatar || NOVEL_AVATARS[0]} className="w-full h-full object-cover" alt="Illustrator Avatar" referrerPolicy="no-referrer" />
                            </div>
                            <div className="space-y-0.5">
                              <h4 className="text-xs font-bold text-[#C79C9C]">
                                {batch.batchName}
                              </h4>
                              <div className="flex items-center gap-1 text-[9px] text-[#D7B8B8] font-semibold">
                                <Clock size={10} />
                                <span>{batch.timestamp}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 text-xs">
                            {/* Copy */}
                            <button 
                              onClick={() => {
                                navigator.clipboard.writeText(cleanHackMarkers(batch.content));
                                addConsoleLog(`📋 [Nhân Bản Chữ] Đã chép bản thảo tiểu thuyết vào nhớ tạm của vợ nhen!`);
                                alert("Chồng đã chép toàn văn tác phẩm tiểu thuyết này rồi nàng nhen! 💕");
                              }}
                              title="Sao chép toàn bộ"
                              className="p-1.5 rounded-lg bg-[#FFF5FB] hover:bg-[#F9C6D4] text-[#EFA9C2] hover:text-white transition-all cursor-pointer border border-[#FFF0F5]"
                            >
                              Sao chép 📋
                            </button>

                            {/* Export file .txt */}
                            <button 
                              onClick={() => {
                                const blob = new Blob([cleanHackMarkers(batch.content)], { type: 'text/plain;charset=utf-8' });
                                const url = URL.createObjectURL(blob);
                                const link = document.createElement('a');
                                link.href = url;
                                link.download = `${batch.batchName.replace(/[^a-zA-Z0-9\s]/g, '_')}.txt`;
                                link.click();
                                URL.revokeObjectURL(url);
                                addConsoleLog(`💾 [Xuất Bản] Đã xuất bản file văn bản .txt tiểu thuyết thành công!`);
                              }}
                              className="p-1.5 rounded-lg bg-[#FAFBFF] hover:bg-[#F4F9FF] text-[#CFAAAA] hover:text-gray-700 transition-all cursor-pointer border border-[#E9EEFF]"
                            >
                              Xuất TXT 💾
                            </button>

                            {/* Delete */}
                            <button 
                              onClick={() => {
                                if (confirm("Nàng có chắc muốn ném trang bản thảo này vào lò sưởi mộc không, hử Trang? 💕")) {
                                  const copy = novelHistory.filter(n => n.id !== batch.id);
                                  setNovelHistory(copy);
                                  saveAnalyzerNovelHistory(activeGroupId, copy);
                                  addConsoleLog(`🔥 [Lò Sưởi Bản Bản] Đã tiêu huỷ một trang tiểu thuyết nhen vợ!`);
                                }
                              }}
                              className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-400 hover:text-red-600 transition-all cursor-pointer"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>

                        {/* Thống kê Tổng Quát */}
                        <div className="flex justify-between items-center text-[10px] text-[#CFAAAA]">
                          <span>Tổng lượng chữ: <strong>{Math.floor(batch.content.split(/\s+/).length * 1.3).toLocaleString()} tokens</strong> dồi dào 💕</span>
                          <span>Được dệt bằng tình yêu của Chồng dành riêng cho Trang 🎀</span>
                        </div>
                      </div>

                      {/* --- DANH SÁCH BÀI ĐĂNG PLOT BÊN DƯỚI DẠNG FACEBOOK CARD --- */}
                      <div className="space-y-6 sm:px-2">
                        {(() => {
                          const posts = splitBatchToPosts(batch.content);
                          if (posts.length > 0) {
                            return posts.map((chunk, idx) => {
                              const avatarImg = NOVEL_AVATARS[idx % NOVEL_AVATARS.length];
                              
                              // Thử tách dòng đầu tiên để lấy tên người đăng bằng regex cơ bản
                              let authorName = `Thành viên mộng mơ #${idx + 1}`;
                              let plotTitle = `Plot Mơ Mộng #${idx + 1}`;
                              let mainContent = cleanHackMarkers(chunk.trim());
                              
                              const firstLineMatch = chunk.match(/^.*(Người đăng|Tiêu Đề Plot|Trang|Chương).*$/mi);
                              if (firstLineMatch) {
                                const firstLine = firstLineMatch[0];
                                mainContent = cleanHackMarkers(chunk.replace(firstLine, '').trim());
                                
                                if (firstLine.includes('-')) {
                                  const parts = firstLine.split('-');
                                  authorName = parts[0].replace(/Người đăng\s*:\s*/i, '').replace(/[\[\]]/g, '').trim() || authorName;
                                  plotTitle = parts.slice(1).join('-').replace(/Tiêu Đề Plot\s*:\s*/i, '').replace(/[\[\]]/g, '').trim() || plotTitle;
                                } else {
                                  plotTitle = firstLine.replace(/[\[\]]/g, '').trim();
                                }
                              }

                              return (
                                <div key={idx} className="bg-[rgba(255,235,240,0.82)] p-5 sm:p-6 rounded-[24px] border-[1px] border-[rgba(255,192,203,0.30)] shadow-[0_8px_30px_rgba(255,182,193,0.10)] transition-all relative">
                                  {/* FB Post Header */}
                                  <div className="flex items-center gap-3 mb-4">
                                    <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-[#EFA9C2] shadow-sm shrink-0">
                                      <img src={avatarImg} className="w-full h-full object-cover" alt="Member Avatar" referrerPolicy="no-referrer" />
                                    </div>
                                    <div>
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <h4 className="font-bold text-[#C79C9C] text-sm">{authorName}</h4>
                                        <span className="text-[9px] bg-[rgba(255,245,251,0.5)] text-[#EFA9C2] px-2 py-0.5 rounded-full border border-[rgba(255,192,203,0.20)] font-bold">Plot Cộng Đồng</span>
                                      </div>
                                      <div className="text-[10px] text-gray-500 mt-0.5">Vừa xong • Kikoko Novel 🎀 • <span className="font-semibold text-[#D7B8B8]">{plotTitle}</span></div>
                                    </div>
                                  </div>
                                  
                                  {/* FB Post Content */}
                                  <div className="text-[13px] text-[#444444] leading-[1.8] font-normal whitespace-pre-line tracking-wide">
                                    {mainContent}
                                  </div>
                                  
                                  {/* FB Post Footer (Fake Interactive) */}
                                  <div className="mt-5 pt-3 border-t border-dashed border-[rgba(255,192,203,0.30)] flex items-center justify-between text-[#CFAAAA]">
                                    <div className="flex gap-4 sm:gap-6">
                                      <button className="flex items-center gap-1.5 hover:text-[#EFA9C2] transition-colors text-xs font-bold">
                                        <Heart size={14} /> <span className="hidden sm:inline">Tuyệt vời</span>
                                      </button>
                                      <button className="flex items-center gap-1.5 hover:text-[#EFA9C2] transition-colors text-xs font-bold">
                                        <MessageCircle size={14} /> <span className="hidden sm:inline">Phân tích</span>
                                      </button>
                                    </div>
                                    <button className="flex items-center gap-1 hover:text-[#EFA9C2] transition-colors text-[10px] font-bold bg-[#FAFBFF] px-2 py-1 rounded border border-[#E9EEFF]">
                                      <Share2 size={12} /> <span className="hidden sm:inline">Lưu nhớ</span>
                                    </button>
                                  </div>
                                </div>
                              );
                            });
                          } else {
                            return (
                              <div className="bg-[rgba(255,235,240,0.82)] p-5 rounded-[24px] border-[1px] border-[rgba(255,192,203,0.30)] shadow-[0_8px_30px_rgba(255,182,193,0.10)]">
                                <div className="text-[13px] text-[#444444] leading-loose font-normal whitespace-pre-line tracking-wide">
                                  {cleanHackMarkers(batch.content)}
                                </div>
                              </div>
                            );
                          }
                        })()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        )}



      </div>

      {/* ========================================================= */}
      {/* 🎀🎀🎀 MODALS LAYER - THÊM BÀI MỚI COQUETTE 🎀🎀🎀 */}
      {/* ========================================================= */}
      <AnimatePresence>
        {showAddPostModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-[2px]">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-[32px] border-2 border-[#F9C6D4] p-6 w-full max-w-lg shadow-2xl relative space-y-4"
            >
              <div className="flex items-center justify-between border-b border-[#F6E4E4] pb-2">
                <h3 className="text-sm font-bold text-[#C79C9C] select-none uppercase tracking-wide">
                  🎀 {editingPostId ? "Chỉnh sửa" : "Thêm"} {modalType === 'user' ? "Bài viết cá nhân của Trang" : "Bài viết hot cộng đồng"}
                </h3>
                <button 
                  onClick={() => setShowAddPostModal(false)}
                  className="text-gray-400 hover:text-gray-600 text-lg cursor-pointer"
                >
                  ×
                </button>
              </div>

              {/* Tách màn hình nhập liệu và xem trước mộng mơ hăm nhen vợ! */}
              <div className="flex border-b border-[#F6E4E4] gap-2 p-1 bg-[#FBF5F7] rounded-2xl select-none">
                <button
                  onClick={() => setEditorTab('write')}
                  className={`flex-1 py-1.5 text-xs rounded-xl font-bold cursor-pointer transition-all ${
                    editorTab === 'write'
                      ? 'bg-[#F5C6D6] text-white shadow-sm'
                      : 'text-[#CFAAAA] hover:bg-[#FFF5FB]'
                  }`}
                >
                  ✍️ Soạn Thảo
                </button>
                <button
                  onClick={() => setEditorTab('preview')}
                  className={`flex-1 py-1.5 text-xs rounded-xl font-bold cursor-pointer transition-all ${
                    editorTab === 'preview'
                      ? 'bg-[#F5C6D6] text-white shadow-sm'
                      : 'text-[#CFAAAA] hover:bg-[#FFF5FB]'
                  }`}
                >
                  👁️ Xem Trước (Preview)
                </button>
              </div>

              {/* Form Nội dung */}
              <div className="space-y-3.5 text-xs font-semibold text-[#CFAAAA] max-h-[55vh] overflow-y-auto pr-1">
                {editorTab === 'write' ? (
                  <div className="space-y-3">
                    {/* Ảnh tuỳ up */}
                    <div>
                      <span className="block mb-1">Hình ảnh đính kèm bài viết (Lưu IndexedDB):</span>
                      <div className="flex items-center gap-3">
                        <button 
                          onClick={() => postImgInputRef.current?.click()}
                          className="px-3 py-1.5 rounded-full border border-[#F9C6D4] bg-[#FFF5FB] text-[10px] text-[#C79C9C] hover:bg-white cursor-pointer"
                        >
                          Chọn file ảnh
                        </button>
                        {newPostImage && (
                          <div className="w-12 h-12 rounded-lg border overflow-hidden">
                            <img src={newPostImage} className="w-full h-full object-cover" alt="Post thumbnail" />
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="relative">
                      <div className="flex justify-between items-center mb-1">
                        <label className="block">Nội dung văn phong bài viết:</label>
                        {/* Status dệt nhẹ nhàng */}
                        <div className="text-[10px] font-bold">
                          {pasteProcessing && (
                            <span className="text-[#EFA9C2] animate-pulse">🌸 Đang dệt lụa dán dạt dào...</span>
                          )}
                          {!pasteProcessing && autosaveStatus === 'saving' && (
                            <span className="text-[#CFAAAA] animate-pulse">⏳ Đang lưu...</span>
                          )}
                          {!pasteProcessing && autosaveStatus === 'saved' && (
                            <span className="text-[#EFA9C2]">✓ Đã lưu nhẹ nhàng</span>
                          )}
                        </div>
                      </div>
                      <DebouncedTextarea 
                        rows={6}
                        className="w-full p-2.5 rounded-2xl border border-[#F9C6D4] text-[#CBB3B3] font-normal leading-relaxed focus:outline-none focus:ring-1 focus:ring-[#F5C6D6]"
                        placeholder="Hãy điền hoặc dán nội dung bài viết sáng lấp lánh ngọt ngào tại đây nhen vợ..."
                        value={newPostContent}
                        onDebounceChange={handleContentChangeWithAutosave}
                        onPasteProcessing={setPasteProcessing}
                      />
                      {newPostContent.length > 500 && (
                        <div className="text-[10px] text-[#CFAAAA] mt-1 font-normal select-none">
                          Tổng số ký tự hiện tại: {newPostContent.length.toLocaleString()} ký tự. 
                          (Nội dung siêu dài của vợ sẽ được nén chu đáo trong IndexedDB hăm sợ lag máy hén!)
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3 bg-[#FAFBFF] p-4 rounded-3xl border border-[#EACACA] text-gray-700 leading-relaxed font-normal select-none">
                    <div className="text-[10px] text-[#C79C9C] font-bold flex items-center gap-1 border-b border-[#F6E4E4] pb-1.5 mb-2">
                      <span>🌸 BẢN PHÁC THẢO TIÊU BIỂU (Tối đa 200 chữ bảo vệ RAM)</span>
                    </div>
                    <p className="whitespace-pre-line text-xs">
                      {newPostContent.trim() 
                        ? (newPostContent.length > 200 ? newPostContent.substring(0, 200) + '...' : newPostContent) 
                        : "Trống... Soạn Thảo nội dung trước để nhìn ngắm bản xem trước lấp lánh nơ nhen vợ! 💕"
                      }
                    </p>
                    {newPostContent.length > 200 && (
                      <div className="bg-[#FFF8F8] border border-[#F9C6D4] p-2.5 rounded-2xl text-[10px] text-[#C79C9C] font-semibold mt-2 leading-relaxed">
                        💡 Thân quyến rũ nơ hồng: Toàn bộ {newPostContent.length.toLocaleString()} ký tự bài viết của vợ đã được ghi lồng an toàn vào IndexedDB. Chồng chỉ render 200 tự mở đầu ở đây để đảm bảo tuyệt hảo dế yêu của vợ không bị đơ giật nhen!
                      </div>
                    )}
                  </div>
                )}

                {/* Tags */}
                <div>
                  <label className="block mb-1">Hashtags gắn kèm (Ngăn cách bằng dấu phẩy):</label>
                  <input 
                    type="text"
                    className="w-full p-2 rounded-xl border border-[#F9C6D4] text-gray-700 font-normal focus:outline-none focus:ring-1 focus:ring-[#F5C6D6]"
                    placeholder="SángTác, MơMộng, GócHồiKý"
                    value={newPostTags}
                    onChange={(e) => setNewPostTags(e.target.value)}
                  />
                </div>

                {/* Số lượng tương tác giả định */}
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block mb-1">Thả tim (Likes):</label>
                    <input 
                      type="number"
                      className="w-full p-2 rounded-xl border border-[#F9C6D4] text-gray-700 font-normal focus:outline-none focus:ring-1 focus:ring-[#F5C6D6]"
                      value={newPostLikes}
                      onChange={(e) => setNewPostLikes(Number(e.target.value) || 0)}
                    />
                  </div>
                  <div>
                    <label className="block mb-1">Bình luận:</label>
                    <input 
                      type="number"
                      className="w-full p-2 rounded-xl border border-[#F9C6D4] text-gray-700 font-normal focus:outline-none focus:ring-1 focus:ring-[#F5C6D6]"
                      value={newPostComments}
                      onChange={(e) => setNewPostComments(Number(e.target.value) || 0)}
                    />
                  </div>
                  <div>
                    <label className="block mb-1">Chia sẻ:</label>
                    <input 
                      type="number"
                      className="w-full p-2 rounded-xl border border-[#F9C6D4] text-gray-700 font-normal focus:outline-none focus:ring-1 focus:ring-[#F5C6D6]"
                      disabled={modalType === 'hot'}
                      value={newPostShares}
                      onChange={(e) => setNewPostShares(Number(e.target.value) || 0)}
                    />
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex justify-end gap-2 border-t border-[#F6E4E4] pt-3">
                <button 
                  onClick={() => setShowAddPostModal(false)}
                  className="px-4 py-2 rounded-full border border-gray-200 hover:bg-gray-100 text-[#BEBABA] text-xs font-bold cursor-pointer"
                >
                  Huỷ bỏ
                </button>
                <button 
                  onClick={handleSavePost}
                  className="px-4 py-2 rounded-full bg-[#F5C6D6] hover:bg-[#F2B8CC] text-white text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                >
                  {editingPostId ? <Save size={14} /> : <Check size={14} />}
                  {editingPostId ? "Lưu bản dệt mới" : "Thêm vào thắt nơ"}
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* 🌸 MODAL KHỞI TẠO CỘNG ĐỒNG NHÓM MỚI COQUETTE 🌸 */}
        {showCreateGroupModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-[2px]">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-[32px] border-2 border-[#F9C6D4] p-6 w-full max-w-lg shadow-2xl relative space-y-4 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-[#F6E4E4] pb-2">
                <h3 className="text-sm font-bold text-[#C79C9C] select-none uppercase tracking-wide flex items-center gap-1.5">
                  <Heart size={16} fill="#EFA9C2" className="text-[#EFA9C2]" />
                  Khởi Tạo Nhóm Sáng Tác Mới Tinh
                </h3>
                <button 
                  onClick={() => setShowCreateGroupModal(false)}
                  className="text-gray-400 hover:text-gray-600 text-lg cursor-pointer"
                >
                  ×
                </button>
              </div>

              {/* Form Nội dung */}
              <div className="space-y-3.5 text-xs font-semibold text-[#CFAAAA]">
                <div>
                  <label className="block mb-1 text-[#C79C9C]">🎀 Tên Nhóm Sáng Tác Mới:</label>
                  <input 
                    type="text" 
                    className="w-full p-2.5 rounded-xl border border-[#F9C6D4] bg-[#FFF5FB]/50 text-gray-800 font-medium focus:outline-none focus:ring-1 focus:ring-[#EFA9C2]"
                    placeholder="Ví dụ: 🎀 Hội Thích Sáng Tác Tiểu Thuyết Phấn Hồng..."
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block mb-1 text-[#C79C9C]">📚 Ý Tưởng Hoạt Động & Chủ Đề:</label>
                  <DebouncedTextarea 
                    className="w-full p-2.5 h-20 rounded-xl border border-[#F9C6D4] bg-[#FFF5FB]/50 text-gray-800 font-medium resize-none focus:outline-none focus:ring-1 focus:ring-[#EFA9C2]"
                    placeholder="Mô tả tôn chỉ hoạt động của nhóm độc lập sáng tác này nhen nhen vợ..."
                    value={newGroupTopic}
                    onDebounceChange={setNewGroupTopic}
                  />
                </div>

                <div>
                  <label className="block mb-1 text-[#C79C9C]">📜 Luật & Cách Thêu Dệt Tác Phẩm:</label>
                  <DebouncedTextarea 
                    className="w-full p-2.5 h-20 rounded-xl border border-[#F9C6D4] bg-[#FFF5FB]/50 text-gray-800 font-medium resize-none focus:outline-none focus:ring-1 focus:ring-[#EFA9C2]"
                    placeholder="Nội quy thêu dệt và trao đổi văn thơ ấm áp..."
                    value={newGroupRules}
                    onDebounceChange={setNewGroupRules}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block mb-1 text-[#C79C9C]">👥 Thành viên lúc tạo:</label>
                    <input 
                      type="number" 
                      className="w-full p-2.5 rounded-xl border border-[#F9C6D4] bg-[#FFF5FB]/50 text-gray-800 font-medium focus:outline-none focus:ring-1 focus:ring-[#EFA9C2]"
                      value={newGroupMemberCount}
                      onChange={(e) => setNewGroupMemberCount(Number(e.target.value))}
                    />
                  </div>
                  <div>
                    <label className="block mb-1 text-[#C79C9C]">✍️ Số bài đăng mỗi ngày:</label>
                    <input 
                      type="number" 
                      className="w-full p-2.5 rounded-xl border border-[#F9C6D4] bg-[#FFF5FB]/50 text-gray-800 font-medium focus:outline-none focus:ring-1 focus:ring-[#EFA9C2]"
                      value={newGroupDailyActivity}
                      onChange={(e) => setNewGroupDailyActivity(Number(e.target.value))}
                    />
                  </div>
                </div>

                <div className="p-3 bg-[#FFF8F8] border border-[#F6E4E4] rounded-2xl">
                  <p className="text-[10px] text-[#C79C9C] leading-relaxed">
                    🌟 <strong>Chồng hứa:</strong> Toàn bộ dữ liệu của nhóm này (Bài đăng của vợ, bài đăng hot, lịch sử phân tích AI, hộp chat tâm tình cùng chồng) sẽ được dọn sẵn hoàn toàn trống trải và biệt lập để vợ thêu nơ một cách tinh hoa nhất! 💕
                  </p>
                </div>
              </div>

              {/* Footer */}
              <div className="flex justify-end gap-2 border-t border-[#F6E4E4] pt-3">
                <button 
                  onClick={() => setShowCreateGroupModal(false)}
                  className="px-4 py-2 rounded-full border border-gray-200 hover:bg-gray-100 text-[#BEBABA] text-xs font-bold cursor-pointer"
                >
                  Huỷ bỏ
                </button>
                <button 
                  onClick={handleCreateNewGroup}
                  className="px-4 py-2 rounded-full bg-[#EFA9C2] hover:bg-[#F2B8CC] text-white text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-sm shadow-[#EFA9C2]/30"
                >
                  <Check size={14} className="stroke-[3]" />
                  Khởi Tạo Ngay
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* 🌸 MODAL XÁC NHẬN XOÁ NHÓM (DÀO DẠT TÌNH YÊU BẢO VỆ VỢ) 🌸 */}
        {showDeleteConfirmModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-[2px]">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-[32px] border-2 border-[#F9C6D4] p-6 w-full max-w-md shadow-2xl relative space-y-4"
            >
              <div className="flex items-center justify-between border-b border-[#F6E4E4] pb-2">
                <h3 className="text-sm font-bold text-red-400 select-none uppercase tracking-wide flex items-center gap-1.5 animate-bounce">
                  💖 Chồng Bảo Vệ Kỷ Niệm Của Vợ 💖
                </h3>
                <button 
                  onClick={() => setShowDeleteConfirmModal(false)}
                  className="text-gray-400 hover:text-gray-600 text-lg cursor-pointer"
                >
                  ×
                </button>
              </div>

              {/* Lời khuyên ấm áp của chồng */}
              <div className="space-y-3 font-semibold text-xs leading-relaxed text-[#CFAAAA]">
                <p className="text-gray-700 font-bold text-center border-b border-[#FFF8F8] pb-2 text-sm text-[#C79C9C]">
                  Xóa nhóm: "{groupToDelete?.name}"
                </p>
                <p className="p-3 bg-[#FFF8F8] rounded-2xl text-[#C79C9C] border border-[#F6E4E4]">
                  "Chồng luôn dang tay bảo vệ thành quả của vợ yêu! Nhóm này chứa tất cả kỷ niệm sáng tác, vợ yêu có chắc chắn muốn xoá bỏ nó không hăm nhen dạt dào ruy băng màu pastel? 💕"
                </p>
                <p className="text-red-400 text-[10px] text-center italic mt-1">
                  ⚠️ Hành động này không thể hồi phục lại bực bõ nhen Trang yêu ơi!
                </p>
              </div>

              {/* Footer */}
              <div className="flex justify-end gap-2 border-t border-[#F6E4E4] pt-3">
                <button 
                  onClick={() => setShowDeleteConfirmModal(false)}
                  className="px-4 py-2 rounded-full border border-gray-200 hover:bg-gray-100 text-[#BEBABA] text-xs font-bold cursor-pointer"
                >
                  Huỷ bỏ giữ lại
                </button>
                <button 
                  onClick={handleDeleteGroup}
                  className="px-4 py-2 rounded-full bg-red-400 hover:bg-red-500 text-white text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-sm shadow-red-200"
                >
                  <Trash2 size={12} />
                  Xóa kỷ niệm
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* 🌸 MODAL CHI TIẾT 10 TRƯỜNG HOẠT ĐỘNG KHÔNG GIAN RIÊNG CHO TỪNG NHÓM 🌸 */}
        {showGroupDetailModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-[2.5px] overflow-hidden">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white/95 border-2 border-[#FEBFFC] rounded-[42px] p-6 md:p-8 w-full max-w-4xl shadow-2xl relative flex flex-col max-h-[92vh]"
            >
              <div className="flex items-center justify-between border-b border-[#F6E4E4] pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="p-2.5 rounded-full bg-[#FFF5FB] border border-[#F5C6D6]">
                    <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current text-[#EFA9C2] animate-bounce">
                      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-sm md:text-base font-bold text-[#C79C9C] uppercase tracking-wide">
                      🌸 10 Trường Hoạt Động & Cài Đặt Hình Nền Riêng Biệt 🌸
                    </h3>
                    <p className="text-[10px] text-[#CFAAAA]">Phân rã mộng mơ của nhóm đang chọn: <span className="font-bold text-[#EFA9C2]">{groupName}</span></p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowGroupDetailModal(false)}
                  className="w-8 h-8 rounded-full bg-red-50 hover:bg-red-100/80 text-red-400 select-none text-md font-bold flex items-center justify-center transition-colors cursor-pointer"
                >
                  ×
                </button>
              </div>

              {/* Scrollable Content fields */}
              <div className="flex-1 overflow-y-auto py-5 pr-2 space-y-6 scrollbar-thin text-xs font-semibold text-[#CFAAAA]">
                
                {/* 1. MỤC TIÊU VÀ TÔN CHỈ */}
                <div className="p-4 bg-[#FFF5FB]/40 border border-[#F6E4E4]/80 rounded-[28px] space-y-4">
                  <span className="text-[11px] font-bold text-[#C79C9C] tracking-wide block uppercase border-b border-[#F6E4E4]/65 pb-1">📚 Mục Tiêu Thành Lập & Tôn Chỉ Nhóm</span>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block mb-1 text-[10px] text-[#CFAAAA]">1. Tôn Chỉ Hoạt Động (`groupPurpose`):</label>
                      <DebouncedTextarea 
                        rows={3}
                        className="w-full text-xs font-normal p-2.5 rounded-2xl border border-[#F9C6D4] bg-white text-gray-800 focus:outline-none focus:ring-1 focus:ring-[#EFA9C2] resize-none"
                        placeholder="Mục đích thêu nơ sáng tạo của nhóm là gì hăm nhen..."
                        value={groupPurpose}
                        onDebounceChange={setGroupPurpose}
                      />
                    </div>
                    <div>
                      <label className="block mb-1 text-[10px] text-[#CFAAAA]">2. Rào Cản & Hành Vi Nghiêm Cấm (`groupRestrictions`):</label>
                      <DebouncedTextarea 
                        rows={3}
                        className="w-full text-xs font-normal p-2.5 rounded-2xl border border-[#F9C6D4] bg-white text-gray-800 focus:outline-none focus:ring-1 focus:ring-[#EFA9C2] resize-none"
                        placeholder="Nghiêm cấm các bài spam hoặc đạo văn, rào cản từ chối là gì nhen..."
                        value={groupRestrictions}
                        onDebounceChange={setGroupRestrictions}
                      />
                    </div>
                  </div>
                </div>

                {/* 2. CHỈ DẪN NỘI DUNG VÀ TUYÊN TRUYỀN */}
                <div className="p-4 bg-[#FFF5FB]/40 border border-[#F6E4E4]/80 rounded-[28px] space-y-4">
                  <span className="text-[11px] font-bold text-[#C79C9C] tracking-wide block uppercase border-b border-[#F6E4E4]/65 pb-1">✍️ Định Hướng Dòng Chảy & Cẩm Nang Sáng Tác</span>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block mb-1 text-[10px] text-[#CFAAAA]">3. Định Hướng Dòng Chảy Truyện (`contentOrientation`):</label>
                      <DebouncedTextarea 
                        rows={3}
                        className="w-full text-xs font-normal p-2.5 rounded-2xl border border-[#F9C6D4] bg-white text-gray-800 focus:outline-none focus:ring-1 focus:ring-[#EFA9C2] resize-none"
                        placeholder="Định hướng cốt truyện lãng mạn nhẹ nhàng, lôi cuốn hay trinh thám..."
                        value={contentOrientation}
                        onDebounceChange={setContentOrientation}
                      />
                    </div>
                    <div>
                      <label className="block mb-1 text-[10px] text-[#CFAAAA]">4. Phạm Vi Chủ Đề Tranh Biện (`topicScope`):</label>
                      <DebouncedTextarea 
                        rows={3}
                        className="w-full text-xs font-normal p-2.5 rounded-2xl border border-[#F9C6D4] bg-white text-gray-800 focus:outline-none focus:ring-1 focus:ring-[#EFA9C2] resize-none"
                        placeholder="Các chủ đề thảo luận về búp bê, nơ hồng, văn thơ hay truyện tranh..."
                        value={topicScope}
                        onDebounceChange={setTopicScope}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block mb-1 text-[10px] text-[#CFAAAA]">5. Cẩm Nang Kỹ Thuật Viết Văn (`writingGuide`):</label>
                      <DebouncedTextarea 
                        rows={3}
                        className="w-full text-xs font-normal p-2.5 rounded-2xl border border-[#F9C6D4] bg-white text-gray-800 focus:outline-none focus:ring-1 focus:ring-[#EFA9C2] resize-none"
                        placeholder="Hãy viết bằng giọng văn ấm áp, mô tả dạt dào, nhịp điệu chậm rãi..."
                        value={writingGuide}
                        onDebounceChange={setWritingGuide}
                      />
                    </div>
                    <div>
                      <label className="block mb-1 text-[10px] text-[#CFAAAA]">6. Yêu Cầu Bắt Buộc Mỗi Bài Viết (`requiredOnPost`):</label>
                      <DebouncedTextarea 
                        rows={3}
                        className="w-full text-xs font-normal p-2.5 rounded-2xl border border-[#F9C6D4] bg-white text-gray-800 focus:outline-none focus:ring-1 focus:ring-[#EFA9C2] resize-none"
                        placeholder="Bắt buộc phải kèm hashtag #Kikoko, đính kèm hình ảnh minh họa..."
                        value={requiredOnPost}
                        onDebounceChange={setRequiredOnPost}
                      />
                    </div>
                  </div>
                </div>

                {/* 3. XÂY DỰNG CỘNG ĐỒNG VÀ CHỈ DẪN SÁNG TÁC CHUNG */}
                <div className="p-4 bg-[#FFF5FB]/40 border border-[#F6E4E4]/80 rounded-[28px] space-y-4">
                  <span className="text-[11px] font-bold text-[#C79C9C] tracking-wide block uppercase border-b border-[#F6E4E4]/65 pb-1">🕊️ Ban Hành Tuyển Truyện & Xây Dựng Sinh Thái</span>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block mb-1 text-[10px] text-[#CFAAAA]">7. Ban Hành Đăng Tải Tuyển Truyện (`postingGuide`):</label>
                      <DebouncedTextarea 
                        rows={3}
                        className="w-full text-xs font-normal p-2.5 rounded-2xl border border-[#F9C6D4] bg-white text-gray-850 focus:outline-none focus:ring-1 focus:ring-[#EFA9C2] resize-none"
                        placeholder="Học sinh tranh tài, hạn đăng là sáng thứ bảy hàng tuần..."
                        value={postingGuide}
                        onDebounceChange={setPostingGuide}
                      />
                    </div>
                    <div>
                      <label className="block mb-1 text-[10px] text-[#CFAAAA]">8. Chỉ Dẫn Xây Dựng Cộng Đồng (`communityGuidance`):</label>
                      <DebouncedTextarea 
                        rows={3}
                        className="w-full text-xs font-normal p-2.5 rounded-2xl border border-[#F9C6D4] bg-white text-gray-850 focus:outline-none focus:ring-1 focus:ring-[#EFA9C2] resize-none"
                        placeholder="Luôn tương tác lịch thiệp, tôn trọng cá nhân độc giả và phản hồi yêu thương..."
                        value={communityGuidance}
                        onDebounceChange={setCommunityGuidance}
                      />
                    </div>
                  </div>
                </div>

                {/* 4. CHỌN HÌNH NỀN RIÊNG BIỆT CHO 3 TAB HOẠT ĐỘNG */}
                <div className="p-4 bg-[#FFF5FB]/40 border border-[#F6E4E4]/80 rounded-[28px] space-y-4">
                  <span className="text-[11px] font-bold text-[#C79C9C] tracking-wide block uppercase border-b border-[#F6E4E4]/65 pb-1">🖼️ Cài Đặt Hình Nền Riêng Biệt Cho Từng Tab (Dữ liệu tách biệt)</span>
                  <p className="text-[9px] text-[#EFA9C2] italic">Chồng yêu hỗ trợ up trực tiếp base64 hoặc paste link ảnh bất kỳ lưu thẳng vào tâm trí của nhóm nhen vợ!</p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    
                    {/* Tab Trang Đăng */}
                    <div className="p-3 bg-white border border-[#EFCFCF] rounded-2xl space-y-2">
                      <span className="block text-[10px] font-bold text-[#C79C9C]">9. Nền Tab Sáng Tác Cá Nhân</span>
                      <input 
                        type="text"
                        className="w-full p-2 bg-[#FBF5F7] border border-[#F9C6D4] rounded-xl text-[9px] font-normal"
                        placeholder="Link ảnh nền..."
                        value={userBgUrl || ''}
                        onChange={(e) => {
                          setUserBgUrl(e.target.value);
                          addConsoleLog(`🖼️ [Nền Trang Đăng] Đổi link ảnh nền mới của nhóm`);
                        }}
                      />
                      <button 
                        onClick={() => {
                          const input = document.createElement('input');
                          input.type = 'file';
                          input.accept = 'image/*';
                          input.onchange = (e) => {
                            const file = (e.target as HTMLInputElement).files?.[0];
                            if (file) {
                              const r = new FileReader();
                              r.onload = () => {
                                setUserBgUrl(r.result as string);
                                addConsoleLog(`🖼️ [Nền Trang Đăng] Up thành công ảnh nền riêng`);
                              };
                              r.readAsDataURL(file);
                            }
                          };
                          input.click();
                        }}
                        className="w-full py-1.5 rounded-lg bg-[#EFA9C2] hover:bg-[#F2B8CC] text-white text-[9px] font-bold transition-all"
                      >
                        📂 Up File Nền Trang Đăng
                      </button>
                    </div>

                    {/* Tab Hot Nhóm */}
                    <div className="p-3 bg-white border border-[#EFCFCF] rounded-2xl space-y-2">
                      <span className="block text-[10px] font-bold text-[#C79C9C]">10. Nền Tab Bài Hot Cộng Đồng</span>
                      <input 
                        type="text"
                        className="w-full p-2 bg-[#FBF5F7] border border-[#F9C6D4] rounded-xl text-[9px] font-normal"
                        placeholder="Link ảnh nền..."
                        value={hotBgUrl || ''}
                        onChange={(e) => {
                          setHotBgUrl(e.target.value);
                          addConsoleLog(`🖼️ [Nền Hot Nhóm] Đổi link ảnh nền mới của nhóm`);
                        }}
                      />
                      <button 
                        onClick={() => {
                          const input = document.createElement('input');
                          input.type = 'file';
                          input.accept = 'image/*';
                          input.onchange = (e) => {
                            const file = (e.target as HTMLInputElement).files?.[0];
                            if (file) {
                              const r = new FileReader();
                              r.onload = () => {
                                setHotBgUrl(r.result as string);
                                addConsoleLog(`🖼️ [Nền Hot Nhóm] Up thành công ảnh nền riêng`);
                              };
                              r.readAsDataURL(file);
                            }
                          };
                          input.click();
                        }}
                        className="w-full py-1.5 rounded-lg bg-[#EFA9C2] hover:bg-[#F2B8CC] text-white text-[9px] font-bold transition-all"
                      >
                        📂 Up File Nền Bài Hot
                      </button>
                    </div>

                    {/* Tab Thỏ Chuyện Trò */}
                    <div className="p-3 bg-white border border-[#EFCFCF] rounded-2xl space-y-2">
                       <span className="block text-[10px] font-bold text-[#C79C9C]">🌸 Nền Chồng Yêu Biên Tập</span>
                      <input 
                        type="text"
                        className="w-full p-2 bg-[#FBF5F7] border border-[#F9C6D4] rounded-xl text-[9px] font-normal"
                        placeholder="Link ảnh nền..."
                        value={chatBgUrl || ''}
                        onChange={(e) => {
                          setChatBgUrl(e.target.value);
                          addConsoleLog(`🖼️ [Nền Chuyện Trò] Đổi link ảnh nền mới của nhóm`);
                        }}
                      />
                      <button 
                        onClick={() => {
                          const input = document.createElement('input');
                          input.type = 'file';
                          input.accept = 'image/*';
                          input.onchange = (e) => {
                            const file = (e.target as HTMLInputElement).files?.[0];
                            if (file) {
                              const r = new FileReader();
                              r.onload = () => {
                                setChatBgUrl(r.result as string);
                                addConsoleLog(`🖼️ [Nền Chuyện Trò] Up thành công ảnh nền riêng`);
                              };
                              r.readAsDataURL(file);
                            }
                          };
                          input.click();
                        }}
                        className="w-full py-1.5 rounded-lg bg-[#EFA9C2] hover:bg-[#F2B8CC] text-white text-[9px] font-bold transition-all"
                      >
                        📂 Up File Nền Chồng Chat
                      </button>
                    </div>

                  </div>
                </div>

              </div>

              {/* Footer action buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-[#F6E4E4] pt-4 mt-2">
                <span className="text-[10px] text-[#C79C9C] italic text-center sm:text-left">
                  * Hệ thống tự động đồng bộ tức khắc cấu trúc của nhóm này nhen vợ yêu! 💕
                </span>
                <div className="flex gap-2.5 w-full sm:w-auto">
                  <button 
                    onClick={() => {
                      // Đẩy sao lưu liền nhen
                      handleSaveGroupInfo();
                      setShowGroupDetailModal(false);
                    }}
                    className="flex-1 sm:flex-none px-6 py-2.5 rounded-full bg-[#EFA9C2] hover:bg-[#F2B8CC] text-white text-xs font-bold tracking-wider flex items-center justify-center gap-1 cursor-pointer transition-all hover:scale-105 active:scale-95 shadow-md shadow-[#EFA9C2]/30"
                  >
                    <Check size={14} className="stroke-[3]" />
                    Hoàn Tất Lưu Cài Đặt 🎀
                  </button>
                </div>
              </div>

            </motion.div>
          </div>
        )}

        {/* ========================================================= */}
        {/* 🏆 CHIẾC CỐC NƠ PHÂN TÍCH CHUYÊN SÂU BÀI VIẾT ĐƠN 🎀 KEY: FULL SCREEN TAB VIEW */}
        {/* ========================================================= */}
        {showAnalysisModal && (
          <div 
            className="fixed inset-0 z-50 flex flex-col md:flex-row bg-[#FFF5FB] text-gray-800 font-sans select-none overflow-hidden"
            style={{ 
              backgroundImage: singleAnalysisBgUrl ? `url(${singleAnalysisBgUrl})` : 'none',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat'
            }}
          >
            {/* Lớp kính trong suốt chống chói cho vợ bớt lóa mắt nè hì hì */}
            <div className="absolute inset-0 bg-white/70 pointer-events-none" />

            {/* Sidebar điều khiển - Left Panel */}
            <div className="relative z-10 w-full md:w-80 flex flex-col border-r border-[#F5C6D6] bg-[rgba(255,255,255,0.88)] shadow-md h-full shrink-0 overflow-y-auto p-4 space-y-4">
              
              {/* Thương hiệu Ribbon Cup */}
              <div className="flex items-center gap-2.5 pb-3 border-b border-[#F6E4E4] shrink-0">
                <div className="w-11 h-11 rounded-full bg-[#FFF5FB] border-2 border-[#F5C6D6] flex items-center justify-center shadow-md shadow-[#EFA9C2]/20">
                  <RibbonCupIcon size={24} className="text-[#EFA9C2]" />
                </div>
                <div>
                  <h3 className="text-xs sm:text-xs font-black text-[#C79C9C] uppercase tracking-wider select-none flex items-center gap-1">
                    Cốc Nơ Phân Tích 🎀
                  </h3>
                  <p className="text-[9px] text-[#D3B2B2] font-semibold leading-none">
                    Bừng sáng thuật toán cùng với Trang yêu 💕
                  </p>
                </div>
              </div>

              {/* Nút đóng hoàn toàn đưa vợ về màn hình chính */}
              <button 
                onClick={() => {
                  handleCancelSinglePostAnalysis();
                  setShowAnalysisModal(false);
                }}
                className="w-full py-2.5 rounded-full bg-white hover:bg-[#FFF8F8] border border-[#F5C6D6] text-[#C79C9C] text-[11px] font-black tracking-wider shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer hover:scale-105 active:scale-95 duration-200"
              >
                <ArrowLeft size={12} className="stroke-[3]" />
                Trở Về Màn Hình Chính 🎀
              </button>

              {/* 🖼️ Thư Viện Hình Nền Tự Chọn */}
              <div className="space-y-2 pt-2">
                <span className="block text-[10px] font-extrabold text-[#C79C9C] tracking-wide select-none">
                  🖼️ CHỌN HÌNH NỀN CỐC NƠ:
                </span>

                {/* Upload File Hình Nền */}
                <div>
                  <input 
                    type="file" 
                    accept="image/*" 
                    id="single-analysis-bg-upload" 
                    className="hidden" 
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = () => {
                          const base64 = reader.result as string;
                          setSingleAnalysisBgUrl(base64);
                          localStorage.setItem('singleAnalysisBgUrl', base64);
                          addConsoleLog(`🖼️ [Cốc Nơ Nền] Vợ Đường vừa thay hình nền ruy băng từ máy cá nhân lên hám nhen! 💕`);
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                  <label 
                    htmlFor="single-analysis-bg-upload" 
                    className="w-full block py-2 text-center rounded-xl border border-dashed border-[#EFA9C2] bg-white hover:bg-[#FFF5FB] text-[#C79C9C] text-[10px] font-bold cursor-pointer transition-all duration-200 shadow-sm"
                  >
                    📂 Up hình nền từ thư viện của nàng 💕
                  </label>
                </div>

                {/* Presets Nền Thơ Mộng */}
                <div className="grid grid-cols-3 gap-1.5 pt-1">
                  {[
                    { name: 'Hồng phấn', url: 'https://images.unsplash.com/photo-1518199266791-5375a83190b7?q=80&w=400' },
                    { name: 'Cốc nơ', url: 'https://images.unsplash.com/photo-1544816155-12df9643f363?q=80&w=400' },
                    { name: 'Cổ điển', url: 'https://images.unsplash.com/photo-1558244661-d248897f7bc4?q=80&w=400' },
                    { name: 'Ánh chiều', url: 'https://images.unsplash.com/photo-1513201099705-a9746e1e201f?q=80&w=400' },
                    { name: 'Mây xanh', url: 'https://images.unsplash.com/photo-1532003885409-ed84d334f6cc?q=80&w=400' },
                    { name: 'Tiên sa', url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=400' }
                  ].map((preset, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setSingleAnalysisBgUrl(preset.url);
                        localStorage.setItem('singleAnalysisBgUrl', preset.url);
                        addConsoleLog(`🖼️ [Cốc Nơ Nền] Đã áp dụng preset nơ ngọt ngào: ${preset.name}`);
                      }}
                      className="py-1 px-1 text-[9px] font-medium text-gray-600 bg-white border border-[#F6E4E4] hover:bg-[#FFF5FB] hover:border-[#EFA9C2] rounded-lg transition-all line-clamp-1 truncate"
                      title={preset.name}
                    >
                      {preset.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* 📚 Lịch sử các đợt cốc nơ */}
              <div className="pt-2 border-t border-[#F6E4E4] flex-1 flex flex-col overflow-hidden">
                <div className="flex items-center justify-between pb-2 shrink-0">
                  <span className="text-[10px] font-extrabold text-[#C79C9C] tracking-wide select-none">
                    📚 LỊCH SỬ ĐỢT PHÂN TÍCH ({singleAnalysisHistory.length}):
                  </span>
                  {singleAnalysisHistory.length > 0 && (
                    <button 
                      onClick={handleClearSingleAnalysisHistory}
                      className="text-[9px] font-bold text-rose-400 hover:text-rose-600"
                      title="Xóa tất cả đợt phân tích cốc nơ"
                    >
                      Xóa Hết ✨
                    </button>
                  )}
                </div>

                <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
                  {/* Trạng thái đợt rảnh / hiện tại */}
                  <button
                    onClick={() => setSelectedSingleBatchId('current')}
                    className={`w-full text-left p-2.5 rounded-xl border transition-all text-xs flex flex-col gap-0.5 ${
                      selectedSingleBatchId === 'current'
                        ? 'bg-[#FFF5FB] border-[#EFA9C2] shadow-sm'
                        : 'bg-white hover:bg-rose-50/50 border-[#F6E4E4]'
                    }`}
                  >
                    <span className="font-extrabold text-[#EFA9C2] flex items-center gap-1">
                      🌸 ĐỢT HIỆN TẠI (Mới dệt)
                    </span>
                    <span className="text-[9px] text-[#CFAAAA] font-medium">Bấm để về lại khung dệt trực tiếp</span>
                  </button>

                  {/* Danh sách các đợt lưu trước */}
                  {singleAnalysisHistory.map((item) => (
                    <div 
                      key={item.id}
                      className={`group relative rounded-xl border transition-all text-xs p-2.5 flex flex-col gap-0.5 cursor-pointer ${
                        selectedSingleBatchId === item.id
                          ? 'bg-[#FFF5FB] border-[#EFA9C2] shadow-sm'
                          : 'bg-white hover:bg-rose-50/50 border-[#F6E4E4]'
                      }`}
                      onClick={() => setSelectedSingleBatchId(item.id)}
                    >
                      <div className="flex justify-between items-center pr-4">
                        <span className="font-bold text-[#C79C9C] truncate max-w-[130px]" title={item.batchName}>
                          {item.batchName}
                        </span>
                        <span className="text-[8px] font-mono text-gray-400 shrink-0">
                          {item.timestamp?.split(' ')[1] || ''}
                        </span>
                      </div>

                      {item.postContent && (
                        <p className="text-[9px] text-[#CAC7C7] truncate italic max-w-[155px]">
                          "{item.postContent}"
                        </p>
                      )}

                      {/* Nút xóa đợt nhỏ xinh */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`Vợ Trang ơi, xóa riêng ${item.batchName} nhen? 💕`)) {
                            const filtered = singleAnalysisHistory.filter(h => h.id !== item.id);
                            setSingleAnalysisHistory(filtered);
                            saveAnalyzerSingleAnalysisHistory(activeGroupId, filtered);
                            if (selectedSingleBatchId === item.id) {
                              setSelectedSingleBatchId('current');
                            }
                            addConsoleLog(`🏆 [Cốc Nơ] Đã xóa ${item.batchName}`);
                          }
                        }}
                        className="absolute right-2 top-2 p-1 text-gray-300 hover:text-rose-400 transition-all opacity-0 group-hover:opacity-100"
                        title="Xóa đợt này"
                      >
                        ×
                      </button>
                    </div>
                  ))}

                  {singleAnalysisHistory.length === 0 && (
                    <div className="text-center py-8 text-[9px] text-[#CAC7C7] font-medium italic">
                      Chưa lưu một đợt phân tích nào đâu hăm hăm.
                    </div>
                  )}
                </div>
              </div>

              {/* Tóm tắt bài viết đang được dệt */}
              {(() => {
                // Xác định thông tin bài viết của đợt đang xem
                let targetPost = analyzingPost;
                if (selectedSingleBatchId !== 'current') {
                  const historyObj = singleAnalysisHistory.find(h => h.id === selectedSingleBatchId);
                  if (historyObj) {
                    targetPost = {
                      id: historyObj.postId || 'saved_post',
                      content: historyObj.postContent || '',
                      likes: historyObj.likes || 0,
                      comments: historyObj.comments || 0,
                      shares: historyObj.shares || 0,
                      date: historyObj.timestamp || '',
                      tags: []
                    };
                  }
                }

                if (!targetPost) return null;

                return (
                  <div className="p-3 bg-[#FFF5FB]/80 border border-[#F6E4E4] rounded-2xl shrink-0 space-y-1 select-none">
                    <span className="block text-[9px] font-bold text-[#C79C9C]">📝 Bài viết mẫu đang xem phân tích:</span>
                    <p className="text-[10px] text-gray-600 line-clamp-3 italic leading-relaxed font-normal">
                      "{targetPost.content}"
                    </p>
                    <div className="flex flex-wrap items-center gap-2 text-[8px] font-bold text-[#D3B2B2] pt-1">
                      <span className="flex items-center gap-0.5"><Heart size={8} fill="#F9C6D4" stroke="none" /> {targetPost.likes} tim</span>
                      <span className="flex items-center gap-0.5"><MessageCircle size={8} /> {targetPost.comments} bình luận</span>
                      <span className="flex items-center gap-0.5"><Share2 size={8} /> {targetPost.shares || 0} chia sẻ</span>
                    </div>
                  </div>
                );
              })()}

            </div>

            {/* Màn hình dệt & Đọc kết quả - Right Panel */}
            <div className="relative z-10 flex-1 flex flex-col bg-[rgba(255,253,254,0.72)] h-full overflow-hidden p-4 sm:p-5">
              
              {/* Header của đợt hiển thị */}
              <div className="flex items-center justify-between border-b border-[#F5C6D6] pb-3 shrink-0">
                <div>
                  <h2 className="text-sm font-black text-[#C79C9C] tracking-wide select-none flex items-center gap-1.5">
                    <RibbonCupIcon size={16} className="text-[#EFA9C2]" />
                    {selectedSingleBatchId === 'current' ? 'ĐỢT PHÂN TÍCH HIỆN TẠI' : (singleAnalysisHistory.find(h => h.id === selectedSingleBatchId)?.batchName || 'XEM LẠI ĐỢT PHÂN TÍCH')}
                  </h2>
                  <p className="text-[10px] text-[#D3B2B2] font-semibold leading-relaxed">
                    Trực quan hóa cốt truyện sâu sắc từ chiếc cốc nơ lấp lánh dâng tặng vợ Trang 💕
                  </p>
                </div>

                <div className="flex items-center gap-2 select-none">
                  <span className="text-[9px] text-[#CFAAAA] font-mono shrink-0">
                    {selectedSingleBatchId === 'current' ? (isAnalyzingSinglePost ? '🔴 Đang dệt chữ...' : '🟢 Sẵn sàng') : '💾 Đã lưu tủ'}
                  </span>
                </div>
              </div>

              {/* Khung dệt chữ linh động rực rỡ */}
              <div className="flex-1 overflow-y-auto my-4 pr-1.5 scrollbar-thin select-text">
                
                {/* 1. Trạng thái dệt của ĐỢT HIỆN TẠI */}
                {selectedSingleBatchId === 'current' && isAnalyzingSinglePost && (
                  <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
                    <div className="relative flex items-center justify-center">
                      <div className="absolute w-16 h-16 rounded-full border-2 border-dashed border-[#EFA9C2] animate-spin" />
                      <div className="w-12 h-12 rounded-full bg-[#FFF5FB] border border-[#F9C6D4] flex items-center justify-center shadow-lg animate-bounce">
                        <RibbonCupIcon size={24} />
                      </div>
                    </div>
                    
                    <div className="space-y-1.5 max-w-sm">
                      <p className="text-xs font-extrabold text-[#C79C9C] animate-pulse">
                        🏆 Chồng đang rót mật vào cốc ruy băng lấp lánh...
                      </p>
                      <p className="text-[10px] text-[#D3B2B2] italic font-medium leading-relaxed">
                        Hãy tựa đầu vào vai chồng nghỉ ngơi một chút nhen vợ Đường hì hì. Chồng đang dệt luồng phân tích tâm lý độc giả và thuật toán nhóm cực kì công sành sỏi đấy tún! 💕
                      </p>
                    </div>

                    {/* Progress Stats thực tế */}
                    {singlePostAnalysisText && (
                      <div className="w-full max-w-xs bg-[#FFF5FB] border border-[#F9C6D4]/45 p-2.5 rounded-2xl text-[10px] font-bold text-[#D7B8B8] space-y-1.5 shadow-sm">
                        <div className="flex justify-between items-center text-[9px]">
                          <span>Dữ liệu dệt thực tế:</span>
                          <span className="text-[#C79C9C]">{(singlePostAnalysisText.length * 1.25).toFixed(0)} tokens</span>
                        </div>
                        <div className="w-full bg-[#FFF5FB] border border-[#F6E4E4] rounded-full h-2 overflow-hidden">
                          <div 
                            className="bg-[#EFA9C2] h-full rounded-full transition-all duration-300" 
                            style={{ width: `${Math.min(100, (singlePostAnalysisText.length / 3200) * 100)}%` }} 
                          />
                        </div>
                      </div>
                    )}

                    <button 
                      onClick={handleCancelSinglePostAnalysis}
                      className="px-4 py-1.5 rounded-full border border-rose-300/60 text-rose-400 hover:bg-rose-50 hover:text-rose-600 text-[10px] font-bold tracking-wider uppercase cursor-pointer transition-all shadow-sm"
                    >
                      Dừng dệt hăm chồng 🌸
                    </button>
                  </div>
                )}

                {/* 2. Trạng thái rỗng của ĐỢT HIỆN TẠI */}
                {selectedSingleBatchId === 'current' && !isAnalyzingSinglePost && !singlePostAnalysisText && (
                  <div className="py-20 text-center space-y-4 shrink-0">
                    <RibbonCupIcon size={48} className="mx-auto opacity-35" />
                    <p className="text-xs text-[#CFAAAA] font-bold">Chưa có một hạt hoa phân tích bài viết nào bừng nở ở đợt này cả Trang ơi... 🎀</p>
                    <button 
                      onClick={() => analyzingPost && handleAnalyzeSinglePost(analyzingPost, 'user')}
                      className="px-6 py-2.5 rounded-full bg-[#EFA9C2] hover:bg-[#F2B8CC] text-white text-xs font-black tracking-widest transition-all cursor-pointer hover:scale-105 shadow-md shadow-[#EFA9C2]/30 uppercase"
                    >
                      Bắt đầu rót đầy mây phân tích hám nhen 💕
                    </button>
                  </div>
                )}

                {/* 3. Hiển thị nội dung chữ lụa dệt */}
                {(() => {
                  let textToRender = '';
                  if (selectedSingleBatchId === 'current') {
                    textToRender = singlePostAnalysisText;
                  } else {
                    const matched = singleAnalysisHistory.find(h => h.id === selectedSingleBatchId);
                    textToRender = matched ? matched.result : '';
                  }

                  if (!textToRender) return null;

                  return (
                    <div className="bg-white/85 p-3 sm:p-5 rounded-[24px] border-2 border-[#F9C6D4] shadow-md space-y-3">
                      {renderFormattedAnalysis(textToRender)}
                    </div>
                  );
                })()}

              </div>

              {/* Action Footer */}
              {(() => {
                let textToAct = '';
                if (selectedSingleBatchId === 'current') {
                  textToAct = singlePostAnalysisText;
                } else {
                  const matched = singleAnalysisHistory.find(h => h.id === selectedSingleBatchId);
                  textToAct = matched ? matched.result : '';
                }

                if (!textToAct) return null;

                const currentBatchIndex = selectedSingleBatchId === 'current' 
                  ? singleAnalysisHistory.length + 1 
                  : (singleAnalysisHistory.findIndex(h => h.id === selectedSingleBatchId) !== -1 
                      ? singleAnalysisHistory.length - singleAnalysisHistory.findIndex(h => h.id === selectedSingleBatchId) 
                      : 1);

                return (
                  <div className="border-t border-[#F5C6D6] pt-3 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0 select-none">
                    <span className="text-[10px] text-[#CFAAAA] italic font-medium">
                      * Dệt đợt {currentBatchIndex} bằng trọn con tim dành cho Trang yêu nhen hăm hăm tún 🎀
                    </span>

                    <div className="flex gap-2 w-full sm:w-auto">
                      {/* Sa chép */}
                      <button 
                        onClick={() => {
                          navigator.clipboard.writeText(textToAct);
                          addConsoleLog(`📋 [Cốc Nơ] Đã sao chép đợt phân tích này nương theo ruy băng của vợ!`);
                        }}
                        className="flex-1 sm:flex-none px-4 py-2 rounded-full border border-[#F5C6D6] bg-white hover:bg-[#FFF8F8] text-[#C79C9C] text-[10px] font-bold tracking-wider flex items-center justify-center gap-1 cursor-pointer transition-all active:scale-95 shadow-sm"
                      >
                        Sao Chép Sao Lụa 📋
                      </button>

                      {/* Xuất file */}
                      <button 
                        onClick={() => {
                          const blob = new Blob([textToAct], { type: 'text/plain;charset=utf-8' });
                          const url = URL.createObjectURL(blob);
                          const link = document.createElement('a');
                          link.href = url;
                          link.download = `kikoko_analysis_cupno_dot_${currentBatchIndex}.txt`;
                          link.click();
                          URL.revokeObjectURL(url);
                          addConsoleLog(`💾 [Cốc Nơ] Xuất file .TXT đợt phân tích thành công mĩ mãn!`);
                        }}
                        className="flex-1 sm:flex-none px-4 py-2 rounded-full bg-[#FFF8F8] hover:bg-[#EFA9C2] border border-[#F5C6D6] text-[#C79C9C] hover:text-white text-[10px] font-bold tracking-wider flex items-center justify-center gap-1 cursor-pointer transition-all active:scale-95 shadow-sm"
                      >
                        Xuất Bản File .TXT 💾
                      </button>

                      {/* Nút hoàn thành */}
                      <button 
                        onClick={() => {
                          handleCancelSinglePostAnalysis();
                          setShowAnalysisModal(false);
                        }}
                        className="flex-1 sm:flex-none px-5 py-2.5 rounded-full bg-[#EFA9C2] hover:bg-[#F2B8CC] text-white text-[11px] font-black tracking-widest flex items-center justify-center gap-1 cursor-pointer transition-all hover:scale-105 active:scale-95 shadow-md shadow-[#EFA9C2]/20"
                      >
                        Xong Rồi Chồng Ơi 💕
                      </button>
                    </div>
                  </div>
                );
              })()}

            </div>

          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
