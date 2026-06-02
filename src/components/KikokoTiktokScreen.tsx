import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Home, User, Plus, MessageCircle, Heart, Share2, Bookmark, Music, ArrowLeft, Image as ImageIcon, Send, X, Gift, Video, RefreshCw, SendHorizontal, FileText, Camera, Check, ChevronRight, Settings, History } from 'lucide-react';
import { useUniversalApi } from '../hooks/useUniversalApi';
import KikokoTiktokApiCenter from './KikokoTiktokApiCenter';
import ApiHistoryTab from './ApiHistoryTab';
import BatchHistoryModal from './BatchHistoryModal';
import { db, NpcData, ApiFeatureBatchItem } from '../core/apiHub/tiktokDatabase';
import { useLiveQuery } from 'dexie-react-hooks';

const POST_IMAGES = [
  "https://i.postimg.cc/SQzmDm4n/1418dac2da098eb26abe8dc05aeb9daa.jpg",
  "https://i.postimg.cc/g2GdzRZT/304481e98c9423fae230616998ca2d6b.jpg",
  "https://i.postimg.cc/2SX9rS2t/f6737448311081e214afd3ca2c23ec48.jpg",
  "https://i.postimg.cc/508sBqbV/0140e6f91af191adf3e56066c8f07a71.jpg",
  "https://i.postimg.cc/3JtnFw5Z/f61816f17dbdc4a236fc5d60a79c25d6.jpg",
  "https://i.postimg.cc/Dzm90cyJ/97c0ba05d55f290cb3bf91751ca209b0.jpg",
  "https://i.postimg.cc/zf9cBZQ1/c4a444dd56cdfac6bf776819bd2fd748.jpg"
];

const MUSIC_IMAGES = [
  "https://i.postimg.cc/XqVk9RsT/9ed4f0ecedf71528bcb6f31420bf7279.jpg",
  "https://i.postimg.cc/fR3j7jf2/ad7058dd66df484c9a8b4153bcddef75.jpg",
  "https://i.postimg.cc/Kjcrc0mY/2d7558066d7fc2dc19e5d2392dcaf9c7.jpg",
  "https://i.postimg.cc/4yNpYz38/6862228703a2f5a6e32bcd7b79addf69.jpg",
  "https://i.postimg.cc/DzX6hdWp/6256fcbb910ad43020f3d4384b2030f2.jpg",
  "https://i.postimg.cc/ydjcG0cr/b2c4fbaea515317654c7a41091c89817.jpg"
];

const LIVE_IMAGES = [
  "https://i.postimg.cc/XqVk9RsT/9ed4f0ecedf71528bcb6f31420bf7279.jpg",
  "https://files.catbox.moe/kyyus8.jpg",
  "https://files.catbox.moe/me8xcf.jpg",
  "https://files.catbox.moe/essaue.jpg",
  "https://files.catbox.moe/hizp2b.jpg",
  "https://files.catbox.moe/tf4ojq.jpg",
  "https://files.catbox.moe/jgui7l.jpg",
  "https://files.catbox.moe/936zim.jpg",
  "https://files.catbox.moe/pcpix3.jpg",
  "https://files.catbox.moe/tqurp8.jpg"
];

interface NPCProfile {
  id: string;
  name: string;
  age: string;
  nationality: string;
  job: string;
  hobbies: string;
  interests: string;
  relationshipStatus: string;
  background: string;
  story: string;
  avatar: string;
  cover: string;
  bio: string;
  followers: string;
  following: string;
  likes: string;
}

interface FeedPost {
  id: string;
  content: string;
  image: string;
  musicImage: string;
  likes: string;
  comments: string;
  saves: string;
  shares: string;
  timestamp: string;
}

interface KikokoTiktokScreenProps {
  onBack: () => void;
}

export default function KikokoTiktokScreen({ onBack }: KikokoTiktokScreenProps) {
  const [activeTab, setActiveTab] = useState<'feed' | 'profile' | 'messages' | 'live' | 'history'>('feed');
  const [npcs, setNpcs] = useState<NPCProfile[]>([]);
  const [activeNpcId, setActiveNpcId] = useState<string | null>(null);
  const [dbLoaded, setDbLoaded] = useState(false);
  const [showApiCenter, setShowApiCenter] = useState(false);
  const [readMode, setReadMode] = useState(false);
  const [historyModal, setHistoryModal] = useState<{ featureName: string; title: string; onSelect?: (items: ApiFeatureBatchItem[]) => void } | null>(null);

  const tabBackgrounds = useLiveQuery(() => db.tab_backgrounds.toArray()) || [];
  const currentTabBg = tabBackgrounds.find(t => t.tabId === activeTab);
  const [currentTabBgUrl, setCurrentTabBgUrl] = useState('');

  useEffect(() => {
    if (!currentTabBg) {
      setCurrentTabBgUrl('');
      return;
    }
    if (currentTabBg.imageUrl) {
      setCurrentTabBgUrl(currentTabBg.imageUrl);
    } else if (currentTabBg.imageBlob) {
      const url = URL.createObjectURL(currentTabBg.imageBlob);
      setCurrentTabBgUrl(url);
      return () => {
        URL.revokeObjectURL(url);
      };
    } else {
      setCurrentTabBgUrl('');
    }
  }, [currentTabBg]);

  useEffect(() => {
    const loadData = async () => {
      const loadedData = await db.npcs.toArray();
      if (loadedData && loadedData.length > 0) {
        // Đảm bảo dữ liệu cũ đã load lên cũng có id hợp lệ nhen vợ
        const validatedLoaded = loadedData.map((item: any) => {
          if (!item.id || typeof item.id !== 'string' || item.id.trim() === '') {
            item.id = crypto.randomUUID();
          }
          return item;
        });
        setNpcs(validatedLoaded as unknown as NPCProfile[]);
      } else {
        const legacy = JSON.parse(localStorage.getItem('kikoko_tt_npcs') || '[]');
        if (legacy && legacy.length > 0) {
          const validatedLegacy = legacy.map((item: any) => {
            if (!item.id || typeof item.id !== 'string' || item.id.trim() === '') {
              item.id = crypto.randomUUID();
            }
            return item;
          });
          setNpcs(validatedLegacy);
          await db.npcs.bulkPut(validatedLegacy as unknown as NpcData[]);
        }
      }
      
      const loadedId = await db.app_settings.get('kikoko_tt_active_npc');
      if (loadedId) {
        setActiveNpcId(loadedId.value);
      } else {
        const legacyId = localStorage.getItem('kikoko_tt_active_npc');
        if (legacyId) {
          setActiveNpcId(legacyId);
          await db.app_settings.put({ key: 'kikoko_tt_active_npc', value: legacyId, updatedAt: Date.now() });
        }
      }
      setDbLoaded(true);
    };
    loadData();
  }, []);

  useEffect(() => {
    if (!dbLoaded) return;
    const saveData = async () => {
      if (npcs.length > 0) {
        const validatedNpcs = npcs.map((item: any) => {
          const validated = { ...item };
          if (!validated.id || typeof validated.id !== 'string' || validated.id.trim() === '') {
            validated.id = crypto.randomUUID();
          }
          return validated;
        });
        await db.npcs.bulkPut(validatedNpcs as unknown as NpcData[]);
      }
      if (activeNpcId) {
        await db.app_settings.put({ key: 'kikoko_tt_active_npc', value: activeNpcId, updatedAt: Date.now() });
      }
    };
    saveData();
  }, [npcs, activeNpcId, dbLoaded]);

  const activeNpc = npcs.find(n => n.id === activeNpcId) || npcs[0] || null;

  return (
    <div className="absolute inset-0 z-50 bg-[#fff6fb] overflow-hidden flex flex-col font-sans select-none text-[#8a4a6a]" style={{ height: '100dvh' }}>
      <AnimatePresence>
        {showApiCenter && <KikokoTiktokApiCenter onClose={() => setShowApiCenter(false)} />}
      </AnimatePresence>
      <InlineStyles />
      <div 
        className="absolute inset-0 pointer-events-none opacity-40"
        style={{
          backgroundImage: 'radial-gradient(#f7bfd8 1.2px, transparent 1.2px)',
          backgroundSize: '22px 22px'
        }}
      />
      
      {/* Background Decor */}
      <div className="absolute top-10 -left-20 w-[150%] h-8 border-2 border-[#ecc1d3] opacity-60 rounded-full pointer-events-none"
           style={{
             background: 'repeating-linear-gradient(90deg, #fff 0 28px, #ffc5dc 28px 38px, #fff 38px 66px)',
             transform: 'rotate(-24deg)'
           }}
      />

      {/* User Custom Background overlay */}
      {currentTabBgUrl && (
        <div className="absolute inset-0 z-0 bg-cover bg-center" style={{ backgroundImage: `url(${currentTabBgUrl})` }}>
          <div className="absolute inset-0 bg-white/40 backdrop-blur-[2px]" />
        </div>
      )}

      {/* Batch History Modal Integration */}
      <AnimatePresence>
        {historyModal && (
          <BatchHistoryModal
            featureName={historyModal.featureName}
            title={historyModal.title}
            onSelectBatch={historyModal.onSelect}
            onClose={() => setHistoryModal(null)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {!readMode && (
          <motion.div 
            initial={{ y: -100, opacity: 0 }} 
            animate={{ y: 0, opacity: 1 }} 
            exit={{ y: -100, opacity: 0 }}
            className="relative z-20 flex items-center justify-between px-3 h-[56px] bg-[rgba(251,245,247,0.72)] border-b border-[#ffd0e4]/50 shadow-[0_4px_20px_rgba(255,120,180,0.1)] shrink-0"
          >
            <button 
              onClick={onBack}
              className="w-9 h-9 rounded-full hover:bg-[#ffe4f0] text-[#b95486] flex items-center justify-center transition-all cursor-pointer shrink-0"
            >
              <ArrowLeft size={20} className="stroke-[2.5]" />
            </button>
            <div className="flex items-center gap-1 bg-[#ffe4f0]/50 p-1 rounded-full border border-[#ffd0e4]/50 overflow-x-auto no-scrollbar shrink-0 mx-2">
              <button onClick={() => setActiveTab('feed')} className={`px-4 py-1.5 rounded-full text-[11px] font-bold transition-all shrink-0 ${activeTab === 'feed' ? 'bg-[#ff8fc3] text-white shadow-sm' : 'text-[#b95486] hover:bg-white/50'}`}>Khám phá</button>
              <button onClick={() => setActiveTab('profile')} className={`px-4 py-1.5 rounded-full text-[11px] font-bold transition-all shrink-0 ${activeTab === 'profile' ? 'bg-[#ff8fc3] text-white shadow-sm' : 'text-[#b95486] hover:bg-white/50'}`}>Hồ sơ NPC</button>
              {(activeTab === 'feed' || activeTab === 'profile') && (
                <>
                  <div className="border-l border-[#ffd0e4]/40 h-3.5 mx-1 self-center shrink-0" />
                  <BgPillButton tabId={activeTab} />
                </>
              )}
            </div>
            <button 
              onClick={() => setShowApiCenter(true)}
              className="w-9 h-9 rounded-full hover:bg-[#ffe4f0] text-[#b95486] flex items-center justify-center transition-all cursor-pointer shrink-0"
            >
              <Settings size={20} className="stroke-[2.5]" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative z-10 flex-1 w-full overflow-hidden">
        <AnimatePresence mode="wait">
          {activeTab === 'profile' && <ProfileTab key="profile" npcs={npcs} setNpcs={setNpcs} activeNpcId={activeNpcId} setActiveNpcId={setActiveNpcId} readMode={readMode} activeTab={activeTab} onShowHistory={setHistoryModal} />}
          {activeTab === 'feed' && <FeedTab key="feed" activeNpc={activeNpc} readMode={readMode} activeTab={activeTab} onShowHistory={setHistoryModal} />}
          {activeTab === 'messages' && <MessagesTab key="messages" activeNpc={activeNpc} onShowHistory={setHistoryModal} />}
          {activeTab === 'live' && <LiveTab key="live" activeNpc={activeNpc} readMode={readMode} activeTab={activeTab} onShowHistory={setHistoryModal} />}
          {activeTab === 'history' && <ApiHistoryTab key="history" />}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {!readMode && (
          <motion.div 
            initial={{ y: 100, opacity: 0 }} 
            animate={{ y: 0, opacity: 1 }} 
            exit={{ y: 100, opacity: 0 }}
            className="relative z-30 bg-[rgba(251,245,247,0.78)] border-t border-[#ffd0e4]/50 h-[58px] min-h-[58px] flex items-center shadow-[0_-8px_20px_rgba(255,120,180,0.1)] shrink-0 py-1"
          >
            <div className="flex justify-between items-center w-full max-w-sm mx-auto px-[18px]">
              <NavBtn icon={<Home size={18} />} active={activeTab === 'feed'} onClick={(e) => { e.stopPropagation(); setActiveTab('feed'); }} />
              <NavBtn icon={<User size={18} />} active={activeTab === 'profile'} onClick={(e) => { e.stopPropagation(); setActiveTab('profile'); }} />
              <button 
                onClick={(e) => { e.stopPropagation(); setActiveTab('live'); }}
                className="w-[48px] h-[48px] rounded-[18px] bg-gradient-to-tr from-[#ff8fc3] to-[#ffc7df] text-white flex items-center justify-center shadow-lg shadow-[#ff8fc3]/40 -mt-[14px] hover:scale-105 active:scale-95 transition-all border-2 border-white shrink-0 cursor-pointer"
              >
                <Plus size={20} className="stroke-[3]" />
              </button>
              <NavBtn icon={<MessageCircle size={18} />} active={activeTab === 'messages'} onClick={(e) => { e.stopPropagation(); setActiveTab('messages'); }} />
              <NavBtn icon={<FileText size={18} />} active={activeTab === 'history'} onClick={(e) => { e.stopPropagation(); setActiveTab('history'); }} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Pink Heart Hide-UI Button */}
      <button 
        onClick={(e) => {
          e.stopPropagation();
          setReadMode(!readMode);
        }}
        title={readMode ? "Hiện giao diện" : "Ẩn giao diện"}
        className="fixed right-3 top-1/2 -translate-y-1/2 w-[38px] h-[38px] rounded-full flex items-center justify-center transition-all duration-300 pointer-events-auto cursor-pointer z-[9999]"
        style={{
          background: 'rgba(255, 220, 238, 0.82)',
          border: '1px solid rgba(255, 255, 255, 0.7)',
          boxShadow: '0 8px 24px rgba(238, 111, 170, 0.22)'
        }}
      >
        <Heart 
          size={18} 
          className={`transition-all duration-300 ${readMode ? 'fill-[#ff8fc3] scale-110 text-[#ff8fc3]' : 'text-[#ff8fc3] hover:scale-115'}`} 
          strokeWidth={2.4}
        />
      </button>
    </div>
  );
}

function NavBtn({ icon, active, onClick }: { icon: React.ReactNode, active: boolean, onClick: (e: React.MouseEvent) => void }) {
  return (
    <button 
      onClick={onClick}
      className={`p-2 rounded-2xl transition-all cursor-pointer ${active ? 'bg-[#ffe3f1] text-[#bb5a89] shadow-inner border border-[#ffd0e4]/50' : 'text-[#d8689f] hover:bg-[#fff0f7]'}`}
    >
      {icon}
    </button>
  );
}

// -------------------------------------------------------------------------
// REUSABLE BACKGROUND UPLOADER WITH PRESETS & DETAILED STYLES
// -------------------------------------------------------------------------
function BgUploader({ tabId }: { tabId: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const currentTabBg = useLiveQuery(() => db.tab_backgrounds.get(tabId), [tabId]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const presets = [
    { name: "Pink Hearts Coquette", url: "https://i.postimg.cc/9FnXQNpn/e1d0cd594c41440c5e1dadc28f25c69a.jpg" },
    { name: "Pastel Sweet Sky", url: "https://i.postimg.cc/FFF4rP7Y/vintage-pastel.jpg" },
    { name: "White Sweet Flowers", url: "https://i.postimg.cc/g2GdzRZT/304481e98c9423fae230616998ca2d6b.jpg" },
    { name: "Soft Cloud Dream", url: "https://files.catbox.moe/pcpix3.jpg" },
    { name: "Princess Gift Ribbon", url: "https://files.catbox.moe/essaue.jpg" }
  ];

  const handleSelectPreset = async (url: string) => {
    try {
      await db.tab_backgrounds.put({
        tabId,
        imageUrl: url,
        imageName: 'Preset_Wallpaper',
        imageType: 'image/jpeg',
        updatedAt: Date.now()
      });
      setIsOpen(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleFileUpload = async (file: File) => {
    if (!file) return;
    try {
      await db.tab_backgrounds.put({
        tabId,
        imageBlob: file,
        imageName: file.name,
        imageType: file.type,
        updatedAt: Date.now()
      });
      setIsOpen(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleRemoveBg = async () => {
    try {
      await db.tab_backgrounds.delete(tabId);
      setIsOpen(false);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="absolute top-4 right-4 z-[99]" onClick={(e) => e.stopPropagation()}>
      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        accept="image/*" 
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFileUpload(file);
        }} 
      />
      
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className="px-3 py-1.5 bg-white/70 backdrop-blur-md rounded-full shadow-sm text-[10px] font-bold text-[#c65c91] border border-[#ffc4dc] cursor-pointer hover:bg-white transition-all flex items-center gap-1 active:scale-95"
      >
        {currentTabBg ? "🖼 Đổi nền" : "➕ Chọn nền"}
      </button>

      {isOpen && (
        <div 
          onClick={(e) => e.stopPropagation()}
          className="absolute right-0 mt-2 p-3 bg-white/95 rounded-[22px] border border-[#ffd2e6] shadow-xl w-[260px] z-[999] flex flex-col gap-3 text-left"
        >
          <p className="text-[11px] font-black uppercase text-[#c65c91] tracking-wider border-b border-[#ffc4dc]/30 pb-1.5 flex items-center justify-between">
            <span>Hình nền {tabId === 'feed' ? 'Khám phá' : tabId === 'live' ? 'Livestream' : tabId === 'profile' ? 'Hồ sơ' : 'Tin nhắn'} 🎀</span>
            <button onClick={() => setIsOpen(false)} className="text-[#c65c91] hover:text-rose-500 font-bold">✕</button>
          </p>
          
          <div className="flex flex-col gap-1.5">
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="w-full text-left py-1.5 px-2.5 bg-[#fff0f6] hover:bg-[#ffe3ee] text-[10px] font-bold text-[#b95486] rounded-xl flex items-center gap-1.5 transition-all cursor-pointer"
            >
              📷 Tải ảnh từ thiết bị của vợ
            </button>
          </div>

          <div>
            <p className="text-[9px] font-bold text-[#d8689f] mb-1.5">Ảnh nền coquette mẫu của app:</p>
            <div className="grid grid-cols-5 gap-1.5">
              {presets.map((preset, idx) => (
                <button 
                  key={idx} 
                  onClick={() => handleSelectPreset(preset.url)}
                  title={preset.name}
                  className="w-[40px] h-[40px] rounded-lg overflow-hidden border border-[#ffc4dc]/30 hover:border-[#ff8fc3] transition-all relative shrink-0 cursor-pointer"
                >
                  <img src={preset.url} className="w-full h-full object-cover" alt="preset" />
                </button>
              ))}
            </div>
          </div>

          {currentTabBg && (
            <button 
              onClick={handleRemoveBg}
              className="w-full text-center py-1.5 bg-rose-50 hover:bg-rose-100 text-[9px] font-black text-rose-600 rounded-xl transition-all mt-1 cursor-pointer"
            >
              🗑 Xóa hình nền (Về mặc định)
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// -------------------------------------------------------------------------
// REUSABLE PILL-STYLE BACKGROUND CHANGER FOR TABS
// -------------------------------------------------------------------------
function BgPillButton({ tabId }: { tabId: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const currentTabBg = useLiveQuery(() => db.tab_backgrounds.get(tabId), [tabId]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const presets = [
    { name: "Pink Hearts Coquette", url: "https://i.postimg.cc/9FnXQNpn/e1d0cd594c41440c5e1dadc28f25c69a.jpg" },
    { name: "Pastel Sweet Sky", url: "https://i.postimg.cc/FFF4rP7Y/vintage-pastel.jpg" },
    { name: "White Sweet Flowers", url: "https://i.postimg.cc/g2GdzRZT/304481e98c9423fae230616998ca2d6b.jpg" },
    { name: "Soft Cloud Dream", url: "https://files.catbox.moe/pcpix3.jpg" },
    { name: "Princess Gift Ribbon", url: "https://files.catbox.moe/essaue.jpg" }
  ];

  const handleSelectPreset = async (url: string) => {
    try {
      await db.tab_backgrounds.put({
        tabId,
        imageUrl: url,
        imageName: 'Preset_Wallpaper',
        imageType: 'image/jpeg',
        updatedAt: Date.now()
      });
      setIsOpen(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleFileUpload = async (file: File) => {
    if (!file) return;
    try {
      await db.tab_backgrounds.put({
        tabId,
        imageBlob: file,
        imageName: file.name,
        imageType: file.type,
        updatedAt: Date.now()
      });
      setIsOpen(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleRemoveBg = async () => {
    try {
      await db.tab_backgrounds.delete(tabId);
      setIsOpen(false);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="relative inline-block flex items-center shrink-0" onClick={(e) => e.stopPropagation()}>
      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        accept="image/*" 
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFileUpload(file);
        }} 
      />
      
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        title={currentTabBg ? "Thay đổi hình nền" : "Chọn hình nền cho tab"}
        className="p-1 px-1.5 hover:bg-white/90 text-[#b95486] rounded-full transition-all flex items-center justify-center cursor-pointer"
      >
        <ImageIcon size={13} className="stroke-[2.2]" />
      </button>

      {isOpen && (
        <div 
          onClick={(e) => e.stopPropagation()}
          className="absolute right-0 mt-6 p-3 bg-white/95 rounded-[22px] border border-[#ffd2e6] shadow-xl w-[260px] z-[999] flex flex-col gap-3 text-left"
        >
          <p className="text-[11px] font-black uppercase text-[#c65c91] tracking-wider border-b border-[#ffc4dc]/30 pb-1.5 flex items-center justify-between">
            <span>Hình nền {tabId === 'feed' ? 'Khám phá' : tabId === 'live' ? 'Livestream' : tabId === 'profile' ? 'Hồ sơ' : 'Tin nhắn'} 🎀</span>
            <button onClick={() => setIsOpen(false)} className="text-[#c65c91] hover:text-rose-500 font-bold">✕</button>
          </p>
          
          <div className="flex flex-col gap-1.5">
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="w-full text-left py-1.5 px-2.5 bg-[#fff0f6] hover:bg-[#ffe3ee] text-[10px] font-bold text-[#b95486] rounded-xl flex items-center gap-1.5 transition-all cursor-pointer"
            >
              📷 Tải ảnh từ thiết bị của vợ
            </button>
          </div>

          <div>
            <p className="text-[9px] font-bold text-[#d8689f] mb-1.5">Ảnh nền coquette mẫu của app:</p>
            <div className="grid grid-cols-5 gap-1.5">
              {presets.map((preset, idx) => (
                <button 
                  key={idx} 
                  onClick={() => handleSelectPreset(preset.url)}
                  title={preset.name}
                  className="w-[40px] h-[40px] rounded-lg overflow-hidden border border-[#ffc4dc]/30 hover:border-[#ff8fc3] transition-all relative shrink-0 cursor-pointer"
                >
                  <img src={preset.url} className="w-full h-full object-cover" alt="preset" />
                </button>
              ))}
            </div>
          </div>

          {currentTabBg && (
            <button 
              onClick={handleRemoveBg}
              className="w-full text-center py-1.5 bg-rose-50 hover:bg-rose-100 text-[9px] font-black text-rose-600 rounded-xl transition-all mt-1 cursor-pointer"
            >
              🗑 Xóa hình nền (Về mặc định)
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// -------------------------------------------------------------------------
// PROFILE TAB
// -------------------------------------------------------------------------
function ProfileTab({ npcs, setNpcs, activeNpcId, setActiveNpcId, readMode, activeTab, onShowHistory }: any) {
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState<Partial<NPCProfile>>({});

  const handleSave = () => {
    if (!formData.name) return alert("Vợ ơi, nhập tên cho NPC nhé 💕");
    const newNpc: NPCProfile = {
      id: `npc_${Date.now()}`,
      name: formData.name || "Kikoko NPC",
      age: formData.age || "",
      nationality: formData.nationality || "",
      job: formData.job || "",
      hobbies: formData.hobbies || "",
      interests: formData.interests || "",
      relationshipStatus: formData.relationshipStatus || "",
      background: formData.background || "",
      story: formData.story || "",
      bio: formData.bio || "Một NPC xinh xắn ở Kikoko Tiktok 🎀",
      avatar: formData.avatar || POST_IMAGES[0],
      cover: formData.cover || POST_IMAGES[1],
      followers: `${Math.floor(Math.random() * 900 + 10)}K`,
      following: `${Math.floor(Math.random() * 900 + 10)}`,
      likes: `${Math.floor(Math.random() * 9 + 1)}.${Math.floor(Math.random() * 9 + 1)}M`,
    };
    setNpcs([...npcs, newNpc]);
    setActiveNpcId(newNpc.id);
    setIsCreating(false);
    setFormData({});
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={(e) => e.stopPropagation()} className="h-full overflow-y-auto px-4 pb-32 pt-4 relative scrollbar-thin">
      {!readMode && <BgUploader tabId={activeTab} />}
      {!isCreating ? (
        <div className="space-y-4">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-[#c65c91] drop-shadow-sm">Danh sách NPC Của Vợ</h2>
            <button onClick={() => setIsCreating(true)} className="px-3 py-1.5 bg-[rgba(255,255,255,0.7)] text-[#c65c91] rounded-full text-xs font-bold shadow-sm active:scale-95 border border-[#ffc4dc]">
              + Thêm NPC
            </button>
          </div>
          
          {npcs.length === 0 ? (
            <div className="bg-[rgba(251,245,247,0.72)] border-2 border-dashed border-[#F5C6D6] rounded-[28px] p-8 text-center space-y-4 shadow-md max-w-sm mx-auto relative overflow-hidden"
                 style={{
                   backgroundImage: 'radial-gradient(#F5C6D6 1.2px, transparent 1.2px)',
                   backgroundSize: '16px 16px'
                 }}>
              <div className="w-20 h-20 bg-white border border-[#EFA9C2]/40 rounded-[28px] shadow-inner flex items-center justify-center mx-auto text-[#EFA9C2]">
                <svg viewBox="0 0 64 64" fill="none" className="w-[44px] h-[44px] text-[#EFA9C2] stroke-current">
                  <path d="M32 30 C24 30, 18 24, 18 16 C18 8, 24 2, 32 2 C40 2, 46 8, 46 16 C46 24, 40 30, 32 30 Z" strokeWidth="1.5" fill="#FFF5FB"/>
                  <path d="M12 56 C12 44, 20 38, 32 38 C44 38, 52 44, 52 56" strokeWidth="1.5" strokeLinecap="round"/>
                  <circle cx="32" cy="38" r="3.5" fill="#EFA9C2"/>
                </svg>
              </div>
              <p className="text-sm font-bold text-[#b95486]">Chưa có NPC nào</p>
              <p className="text-[11px] text-[#d8689f] max-w-[240px] mx-auto leading-relaxed">Hãy khởi tạo một tài khoản nhân vật Tiktoker dễ thương đầu tiên nha! 🌸</p>
              <button 
                onClick={() => setIsCreating(true)} 
                className="mx-auto px-6 py-2.5 bg-gradient-to-r from-[#F5C6D6] to-[#EFA9C2] text-white font-bold rounded-full text-xs shadow-md shadow-[#EFA9C2]/40 active:scale-95 transition-all text-center flex items-center gap-1.5 justify-center cursor-pointer"
              >
                <Plus size={14} className="stroke-[3]" /> Tạo NPC đầu tiên
              </button>
            </div>
          ) : (
            <>
              <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
                {npcs.map((npc: NPCProfile) => (
                  <div 
                    key={npc.id} 
                    onClick={() => setActiveNpcId(npc.id)}
                    className={`min-w-[70px] flex flex-col items-center gap-2 transition-all cursor-pointer ${activeNpcId === npc.id ? 'opacity-100 scale-105' : 'opacity-60 hover:opacity-100'}`}
                  >
                    <img src={npc.avatar} className={`w-16 h-16 object-cover rounded-full shadow-sm border-[3px] ${activeNpcId === npc.id ? 'border-[#ff8fc3]' : 'border-white/80'}`} alt="ava" />
                    <p className="text-[10px] font-bold text-[#8a4a6a] truncate w-full text-center px-1 bg-white/50 rounded-full">{npc.name}</p>
                  </div>
                ))}
              </div>

              {activeNpcId && npcs.find((n: NPCProfile) => n.id === activeNpcId) && (() => {
                const npc = npcs.find((n: NPCProfile) => n.id === activeNpcId)!;
                return (
                  <div className="bg-[rgba(251,245,247,0.85)] rounded-[32px] border border-[#ffd2e5] shadow-xl relative overflow-hidden mt-2">
                    <div className="h-40 bg-cover bg-center rounded-t-[32px]" style={{ backgroundImage: `url(${npc.cover})` }} />
                    <div className="px-5 pb-6">
                      <div className="flex justify-between items-end -mt-12 mb-3">
                        <img src={npc.avatar} className="w-24 h-24 object-cover rounded-full border-4 border-white shadow-md bg-white" alt="ava" />
                        <div className="flex gap-2 mb-2">
                          <button className="w-10 h-10 bg-[#ffe4f0] rounded-full flex items-center justify-center text-[#ff8fc3]"><Share2 size={16} /></button>
                          <button className="w-10 h-10 bg-[#ffe4f0] rounded-full flex items-center justify-center text-[#ff8fc3]"><MessageCircle size={16} /></button>
                        </div>
                      </div>
                      
                      <div>
                        <h3 className="text-2xl font-black text-[#c65c91] leading-tight">{npc.name}</h3>
                        <p className="text-[13px] text-[#d8689f] italic mt-1">{npc.bio}</p>
                      </div>

                      <div className="flex items-center gap-6 mt-4 pb-4 border-b border-[#ffd2e5]/50">
                        <div className="flex flex-col"><span className="text-lg font-black text-[#8a4a6a]">{npc.followers}</span><span className="text-[10px] uppercase tracking-wider text-[#d8689f] font-bold">Followers</span></div>
                        <div className="flex flex-col"><span className="text-lg font-black text-[#8a4a6a]">{npc.following}</span><span className="text-[10px] uppercase tracking-wider text-[#d8689f] font-bold">Đang Theo Dõi</span></div>
                        <div className="flex flex-col"><span className="text-lg font-black text-[#8a4a6a]">{npc.likes}</span><span className="text-[10px] uppercase tracking-wider text-[#d8689f] font-bold">Lượt Thích</span></div>
                      </div>
                      
                      <div className="mt-4 flex flex-wrap gap-2">
                        <Badge label={npc.nationality} type="globe" />
                        <Badge label={`${npc.age} tuổi`} type="cake" />
                        <Badge label={npc.job} type="job" />
                        <Badge label={npc.relationshipStatus} type="heart" />
                      </div>
                      
                      <div className="mt-5 space-y-3">
                        <InfoItem title="Sở thích" content={npc.hobbies} />
                        <InfoItem title="Mối quan tâm" content={npc.interests} />
                        <InfoItem title="Hoạt động gần đây" content="Đang lướt Tiktok và xem video về mèo 🐈" />
                      </div>

                      <div className="mt-5 p-4 bg-gradient-to-br from-[#fff0f7] to-[#ffe4f0] rounded-2xl border border-[#ffd2e5]">
                        <h4 className="text-[11px] font-black text-[#c65c91] uppercase tracking-wider mb-2">Tiểu sử & Câu chuyện</h4>
                        <p className="text-[12px] text-[#8a4a6a] leading-relaxed break-words">{npc.background}</p>
                        <hr className="my-2 border-[#ffc4dc]/50"/>
                        <p className="text-[12px] text-[#8a4a6a] italic leading-relaxed break-words">{npc.story}</p>
                      </div>

                      <div className="mt-6">
                        <ProfilePosts activeNpc={npc} onShowHistory={onShowHistory} />
                      </div>
                    </div>
                  </div>
                );
              })()}
            </>
          )}
        </div>
      ) : (
        <div className="bg-[rgba(255,252,253,0.92)] rounded-[28px] border-2 border-[#ffd2e5] p-5 shadow-xl space-y-3 relative">
          <button onClick={() => setIsCreating(false)} className="absolute top-4 right-4 text-[#d8689f] hover:text-[#c65c91] bg-[#ffe4f0] p-1 rounded-full"><X size={16} /></button>
          <h2 className="text-xl font-bold text-[#c65c91] text-center mb-4">Tạo NPC Tiktoker Mới 🎀</h2>
          
          <Input label="Tên Nhân Vật" value={formData.name} onChange={v => setFormData({...formData, name: v})} />
          <div className="grid grid-cols-2 gap-2">
            <Input label="Quốc Tịch" value={formData.nationality} onChange={v => setFormData({...formData, nationality: v})} />
            <Input label="Độ Tuổi" value={formData.age} onChange={v => setFormData({...formData, age: v})} />
          </div>
          <Input label="Nghề Nghiệp" value={formData.job} onChange={v => setFormData({...formData, job: v})} />
          <Input label="Tình Trạng QH" value={formData.relationshipStatus} onChange={v => setFormData({...formData, relationshipStatus: v})} placeholder="Độc thân, đã kết hôn..." />
          
          <Input label="Sở Thích" value={formData.hobbies} onChange={v => setFormData({...formData, hobbies: v})} />
          <Input label="Mối Quan Tâm (chủ đề đăng)" value={formData.interests} onChange={v => setFormData({...formData, interests: v})} />
          <TextArea label="Gia đình, Bối cảnh, Tiểu sử" value={formData.background} onChange={v => setFormData({...formData, background: v})} />
          <TextArea label="Cốt Truyện (Context)" value={formData.story} onChange={v => setFormData({...formData, story: v})} />
          <TextArea label="Bio (Giới thiệu ngắn)" value={formData.bio} onChange={v => setFormData({...formData, bio: v})} />
          
          <div className="grid grid-cols-2 gap-2">
            <Input label="Link Avatar" value={formData.avatar} onChange={v => setFormData({...formData, avatar: v})} placeholder="Dán URL ảnh" />
            <Input label="Link Ảnh Bìa" value={formData.cover} onChange={v => setFormData({...formData, cover: v})} placeholder="Dán URL ảnh" />
          </div>

          <button onClick={handleSave} className="w-full mt-4 py-3 bg-gradient-to-r from-[#ff8fc3] to-[#ffc7df] text-white font-bold rounded-2xl shadow-lg active:scale-95 transition-all">
            Lưu Hồ Sơ Khởi Lên Nào 💕
          </button>
        </div>
      )}
    </motion.div>
  );
}

function Badge({ label, type }: { label: string, type: 'globe' | 'cake' | 'job' | 'heart' }) {
  if (!label) return null;
  const icons = {
    globe: <svg viewBox="0 0 24 24" fill="none" className="w-3.5 h-3.5 text-[#ff8fc3]" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>,
    cake: <svg viewBox="0 0 24 24" fill="none" className="w-3.5 h-3.5 text-[#ff8fc3]" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-8a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8"/><path d="M4 16h16"/><path d="M12 2v5"/><path d="M12 7l1.5-1.5M12 7L10.5 5.5"/></svg>,
    job: <svg viewBox="0 0 24 24" fill="none" className="w-3.5 h-3.5 text-[#ff8fc3]" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="14" x="2" y="7" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>,
    heart: <svg viewBox="0 0 24 24" fill="none" className="w-3.5 h-3.5 text-[#ff8fc3]" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
  };
  return (
    <div className="bg-[#ffe4f0] border border-[#ffc4dc] rounded-full px-3 py-1 flex items-center gap-1.5 text-[10px] font-bold text-[#b95486]">
      {icons[type]}
      <span>{label}</span>
    </div>
  );
}

function InfoItem({ title, content }: { title: string, content: string }) {
  if (!content) return null;
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] font-bold text-[#d8689f] uppercase tracking-wider">{title}</span>
      <p className="text-[12px] text-[#8a4a6a] leading-relaxed">{content}</p>
    </div>
  );
}

function Input({ label, value, onChange, placeholder }: any) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] font-bold text-[#d8689f] px-1">{label}</span>
      <input 
        value={value || ''} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full border-2 border-[#ffd3e6] rounded-xl bg-white px-3 py-2 text-xs text-[#8d4d6a] outline-none focus:border-[#ff8fc3] transition-all"
      />
    </div>
  );
}

function TextArea({ label, value, onChange, placeholder }: any) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] font-bold text-[#d8689f] px-1">{label}</span>
      <textarea 
        value={value || ''} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full border-2 border-[#ffd3e6] rounded-xl bg-white px-3 py-2 text-xs text-[#8d4d6a] outline-none focus:border-[#ff8fc3] transition-all min-h-[60px]"
      />
    </div>
  );
}

// Trích xuất văn bản an toàn từ stream chunks theo Hiến pháp API (tránh [object Object])
function extractContent(chunk: any): string {
  if (!chunk) return '';
  if (typeof chunk === 'string') return chunk;
  if (typeof chunk === 'object') {
    if (chunk.type === 'heartbeat') {
      if (chunk.msg) {
        console.log(`[API Proxy Heartbeat] ${chunk.msg}`);
      }
      return '';
    }
    if ('text' in chunk && typeof chunk.text === 'string') {
      return chunk.text;
    }
  }
  return '';
}

function ProfilePosts({ activeNpc, onShowHistory }: { activeNpc: NPCProfile, onShowHistory: any }) {
  const { callFeature, isCalling } = useUniversalApi();
  const [profilePosts, setProfilePosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [bgImage, setBgImage] = useState('');
  const [accumulatedText, setAccumulatedText] = useState('');
  const [status, setStatus] = useState('');

  const loadPosts = async () => {
    setLoading(true);
    setProfilePosts([]);
    setAccumulatedText('');
    setStatus('Đang bắt đầu...');
    try {
      const result = await callFeature({
        featureName: 'npc_post',
        userRequest: `Hãy viết 30 bài Tiktok cho trang cá nhân của tôi (${activeNpc.name}). Ngăn cách bằng ---POST---`,
        activeNpc,
        onChunk: (text) => setAccumulatedText(prev => prev + text),
        onProgress: (phase) => setStatus(phase),
        saveItems: (raw) => {
          return raw.split('---POST---').map(p => p.trim()).filter(p => p.length > 20).map((content, idx) => ({
            title: `Bài đăng ${idx + 1}`,
            content: content,
            metadata: { image: POST_IMAGES[idx % POST_IMAGES.length] }
          }));
        }
      });

      const raw = result.split('---POST---').map(p => p.trim()).filter(p => p.length > 20);
      
      const newPosts = raw.map((content, idx) => ({
        id: idx,
        content,
        image: POST_IMAGES[idx % POST_IMAGES.length]
      }));
      setProfilePosts(newPosts);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-4 border-t-2 border-[#ffd0e4] pt-4 relative min-h-[200px]" style={bgImage ? { backgroundImage: `url(${bgImage})`, backgroundSize: 'cover' } : {}}>
      {bgImage && <div className="absolute inset-0 bg-white/60" />}
      
      <div className="relative z-10 flex justify-between items-center mb-3">
        <h4 className="text-sm font-bold text-[#c65c91]">Bài đăng của NPC (30 bài)</h4>
        <div className="flex gap-2">
          <button 
            onClick={() => onShowHistory({
              featureName: 'npc_post',
              title: 'Lịch sử Bài đăng',
              onSelect: (items: any[]) => {
                setProfilePosts(items.map((it, idx) => ({
                  id: idx,
                  content: it.content,
                  image: it.metadata?.image || POST_IMAGES[idx % POST_IMAGES.length]
                })));
              }
            })}
            className="px-2 py-1 bg-white border border-[#ffc4dc] text-[#c65c91] rounded-md text-[9px] font-bold shadow-sm active:scale-95 transition-all"
          >
            Lịch sử Đợt 📚
          </button>
          <input type="file" id="profilebg-upload" className="hidden" accept="image/*" onChange={(e) => {
            const file = e.target.files?.[0];
             if(file) {
               const r = new FileReader(); r.onload=()=>setBgImage(r.result as string); r.readAsDataURL(file);
             }
          }}/>
          <label htmlFor="profilebg-upload" className="px-2 py-1 bg-[#ffc4dc] text-white rounded-md text-[9px] cursor-pointer font-bold">Nền</label>
        </div>
      </div>
      
      {loading || isCalling ? (
        <div className="flex flex-col items-center justify-center p-4 space-y-3 relative z-10 text-center">
          <p className="text-[10px] italic text-[#b95486] font-bold">{status}</p>
          <SmartLoadingBar text={accumulatedText} target={12000} />
          <div className="w-full h-24 bg-white/50 rounded-xl p-2 border border-[#ffd2e5] overflow-y-auto text-[8px] text-left text-[#8a4a6a] font-mono whitespace-pre-wrap">
            {accumulatedText || 'Đang kết nối API và sinh lụa hồng cho trang cá nhân...'}
          </div>
        </div>
      ) : profilePosts.length === 0 ? (
        <div className="text-center py-4 space-y-2 relative z-10">
          <button onClick={loadPosts} disabled={loading || isCalling} className="px-4 py-2 bg-[#ff8fc3] text-white rounded-xl text-xs font-bold active:scale-95 disabled:opacity-50 shadow-md cursor-pointer">
            Gọi API Proxy Lấy 30 Bài Mới
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3 relative z-10 h-[400px] overflow-y-auto no-scrollbar">
          {profilePosts.map((p) => (
            <div key={p.id} className="bg-[rgba(251,245,247,0.8)] rounded-xl overflow-hidden border border-[#ffd0e4] shadow-sm">
              <img src={p.image} className="w-full h-32 object-cover" alt="post"/>
              <div className="p-3">
                <PostCaption content={p.content} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// -------------------------------------------------------------------------
// FEED TAB
// -------------------------------------------------------------------------
function FeedTab({ activeNpc, readMode, activeTab, onShowHistory }: { activeNpc: NPCProfile | null, readMode: boolean, activeTab: string, onShowHistory: any }) {
  const { callFeature, isCalling } = useUniversalApi();
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [rawOutput, setRawOutput] = useState('');
  const [status, setStatus] = useState('');
  const [activeCommentPost, setActiveCommentPost] = useState<FeedPost | null>(null);

  const generateFeed = async () => {
    if (!activeNpc) return setError("Vợ chưa bật NPC nào hám nhen!");
    setLoading(true);
    setError('');
    setPosts([]);
    setRawOutput('');
    setStatus('Đang chuẩn bị...');

    try {
      const result = await callFeature({
        featureName: 'create_feed_40_posts',
        userRequest: "YÊU CẦU ĐẶC BIỆT TỪ PRODUCT OWNER: BẮT BUỘC Viết ĐÚNG VÀ ĐỦ 40 bài Tiktok. MỖI BÀI VIẾT PHẢI SIÊU SIÊU DÀI, TỐI THIỂU 5000 TỪ / KÝ TỰ (CÀNG DÀI CÀNG TỐT), viết như một đoạn nhật ký dài dằng dặc, đầy tâm trạng, trải lòng về mọi thứ xung quanh. Đừng dừng lại sớm, hãy diễn đạt thật bay bổng và chi tiết. Nội dung phải cực khủng về khối lượng chữ. Ngăn cách mỗi bài bằng dòng chữ ---POST---",
        activeNpc,
        onChunk: (text) => setRawOutput(prev => prev + text),
        onProgress: (phase) => setStatus(phase),
        saveItems: (raw) => {
          return raw.split('---POST---').map(p => p.trim()).filter(p => p.length > 20).map((content, idx) => ({
            title: `Bài Feed ${idx + 1}`,
            content: content,
            metadata: { 
              image: POST_IMAGES[Math.floor(Math.random() * POST_IMAGES.length)],
              musicImage: MUSIC_IMAGES[Math.floor(Math.random() * MUSIC_IMAGES.length)],
              likes: `${Math.floor(Math.random() * 900 + 10)}K`,
              comments: `${Math.floor(Math.random() * 90)}K`,
              saves: `${Math.floor(Math.random() * 70)}K`,
              shares: `${Math.floor(Math.random() * 40)}K`
            }
          }));
        }
      });

      const rawPosts = result.split('---POST---').map(p => p.trim()).filter(p => p.length > 20);
      
      const newPosts: FeedPost[] = rawPosts.map((content, idx) => ({
        id: `post_${Date.now()}_${idx}`,
        content,
        image: POST_IMAGES[Math.floor(Math.random() * POST_IMAGES.length)],
        musicImage: MUSIC_IMAGES[Math.floor(Math.random() * MUSIC_IMAGES.length)],
        likes: `${Math.floor(Math.random() * 900 + 10)}K`,
        comments: `${Math.floor(Math.random() * 90)}K`,
        saves: `${Math.floor(Math.random() * 70)}K`,
        shares: `${Math.floor(Math.random() * 40)}K`,
        timestamp: new Date().toLocaleString("vi-VN"),
      }));

      setPosts(newPosts);
    } catch (err: any) {
      setError(err?.message || "Lỗi rồi vợ ơi...");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full bg-transparent relative">
      {!readMode && <BgUploader tabId={activeTab} />}
      {!activeNpc ? (
        <div className="absolute inset-0 flex items-center justify-center p-6 text-center z-10 bg-transparent">
          <div className="bg-[rgba(251,245,247,0.85)] p-6 rounded-[28px] border border-[#ffc4dc] text-center max-w-[85%] shadow-xl">
            <p className="text-[#8a4a6a] font-black text-sm mb-3">Vợ sang tab Hồ sơ NPC tạo và chọn nhân vật nhen 💕</p>
          </div>
        </div>
      ) : (
        <>
          <div className="absolute top-2 left-0 right-0 z-20 flex justify-center gap-2 overflow-x-auto px-4 py-2 no-scrollbar pointer-events-none">
            {/* Story Bar */}
            <div className="flex flex-col items-center gap-1 shrink-0 pointer-events-auto">
               <button 
                onClick={() => onShowHistory({
                  featureName: 'create_feed_40_posts',
                  title: 'Lịch sử Khám phá',
                  onSelect: (items: any[]) => {
                    setPosts(items.map((it, idx) => ({
                      id: `post_hist_${idx}`,
                      content: it.content,
                      image: it.metadata?.image || POST_IMAGES[idx % POST_IMAGES.length],
                      musicImage: it.metadata?.musicImage || MUSIC_IMAGES[idx % MUSIC_IMAGES.length],
                      likes: it.metadata?.likes || '10K',
                      comments: it.metadata?.comments || '1K',
                      saves: it.metadata?.saves || '500',
                      shares: it.metadata?.shares || '100',
                      timestamp: 'Lịch sử'
                    })));
                  }
                })}
                className="w-12 h-12 rounded-full border-2 border-white bg-[#ff8fc3] flex items-center justify-center text-white shadow-lg active:scale-90"
               >
                 <History size={20} />
               </button>
               <span className="text-[9px] text-[#8a4a6a] font-bold bg-white/60 px-1.5 py-0.5 rounded-full backdrop-blur-sm">Lịch sử Đợt</span>
            </div>
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="flex flex-col items-center gap-1 shrink-0">
                <img src={POST_IMAGES[i % POST_IMAGES.length]} className="w-12 h-12 rounded-full border-2 border-[#ff9ccc] object-cover pointer-events-auto shadow-[0_2px_10px_rgba(255,143,195,0.4)]" alt="story" />
                <span className="text-[9px] text-[#8a4a6a] font-bold bg-white/60 px-1.5 py-0.5 rounded-full backdrop-blur-sm">Npc {i}</span>
              </div>
            ))}
          </div>

          <div className={`absolute inset-0 overflow-y-scroll snap-y snap-mandatory select-text no-scrollbar ${posts.length === 0 ? 'bg-transparent' : 'bg-black'}`} style={{ height: '100dvh' }}>
            <AnimatePresence>
              {activeCommentPost && (
                <PostCommentsModal 
                  post={activeCommentPost} 
                  activeNpc={activeNpc!} 
                  onClose={() => setActiveCommentPost(null)}
                  onShowHistory={onShowHistory}
                />
              )}
            </AnimatePresence>
            {posts.length === 0 && !loading && !error && (
              <div className="h-full w-full flex items-center justify-center flex-col p-6 pt-24 bg-transparent">
                <div className="bg-[rgba(251,245,247,0.85)] p-7 rounded-[32px] border border-[#ffc4dc] text-center max-w-[85%] shadow-xl space-y-4">
                  <div className="w-14 h-14 bg-[#fff0f7] rounded-full flex items-center justify-center mx-auto text-[#ff8fc3] mb-2 shadow-inner">
                    <Video size={26} className="stroke-[1.8]" />
                  </div>
                  <p className="font-black text-[#c65c91] text-md">Lịch sử đăng bài của {activeNpc.name}</p>
                  <p className="text-[12px] text-[#8a4a6a] leading-relaxed">Chưa có bài nào hết á vợ yêu! Hãy nhấn nút phía dưới để gọi API dệt 40 bài nhen ✨</p>
                  <button onClick={generateFeed} className="mx-auto px-6 py-3 bg-gradient-to-r from-[#ff8fc3] to-[#ffc7df] text-white font-black rounded-full shadow-md shadow-[#ff8fc3]/30 active:scale-95 transition-all text-xs flex items-center gap-1.5 justify-center cursor-pointer">
                    Gọi API Proxy 🎀 (Tạo 40 bài)
                  </button>
                </div>
              </div>
            )}

            {loading && posts.length === 0 && (
              <div className="h-full w-full flex items-center justify-center flex-col p-6 pt-24 text-center bg-transparent">
                <div className="w-full max-w-xs mb-4"><SmartLoadingBar text={rawOutput} target={32000} /></div>
                <div className="w-full max-w-sm h-40 bg-[rgba(251,245,247,0.88)] rounded-[28px] p-4 border border-[#ffd2e5] overflow-y-auto text-[10px] text-left text-[#8a4a6a] font-mono whitespace-pre-wrap shadow-inner">
                  {rawOutput || 'Đang kết nối API và dệt từng mây sợi...'}
                </div>
              </div>
            )}

            {error && (
              <div className="h-full w-full flex items-center justify-center flex-col p-6 pt-24 text-center bg-transparent">
                <div className="bg-white/92 backdrop-blur-md p-6 rounded-[28px] border border-rose-200 shadow-xl max-w-[85%]">
                  <p className="text-sm font-bold text-rose-600 mb-4">{error}</p>
                  <button onClick={generateFeed} className="px-6 py-2.5 bg-gradient-to-r from-rose-400 to-rose-500 text-white font-bold rounded-full active:scale-95 shadow-md flex items-center gap-1 mx-auto text-xs cursor-pointer">Thử Lại 🌸</button>
                </div>
              </div>
            )}

            {posts.map((post, idx) => (
              <div key={post.id} className="relative w-full h-[100dvh] snap-start bg-cover bg-center overflow-hidden" style={{ backgroundImage: `url(${post.image})` }}>
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-black/30 pointer-events-none" />
                
                {/* Right Side Actions */}
                <div className="absolute right-3 bottom-[12vh] flex flex-col items-center gap-5 z-20 pointer-events-auto">
                  <div className="relative mb-2">
                    <img src={activeNpc.avatar} className="w-12 h-12 rounded-full border-2 border-white object-cover shadow-lg" alt="ava" />
                    <button className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-6 h-6 bg-[#ff8fc3] rounded-full text-white flex items-center justify-center shadow-md"><Plus size={16} className="stroke-[3]" /></button>
                  </div>
                  <ActionButton icon={<Heart fill="white" />} text={post.likes} active={Math.random() > 0.5} />
                  <ActionButton 
                    icon={<MessageCircle fill="white" />} 
                    text={post.comments} 
                    onClick={() => {
                      setActiveCommentPost(post);
                    }}
                  />
                  <ActionButton icon={<Bookmark fill="white" />} text={post.saves} active={Math.random() > 0.5} />
                  <ActionButton icon={<Share2 fill="white" />} text={post.shares} />
                  
                  <div className="mt-6 animate-[spin_4s_linear_infinite] shadow-2xl rounded-full">
                    <img src={post.musicImage} className="w-[44px] h-[44px] rounded-full border-[12px] border-[#222] object-cover" alt="music" />
                  </div>
                </div>

                {/* Bottom Info Area with Soft Silk Pink Overlay for Readability */}
                <div className="absolute left-0 bottom-0 right-0 z-20 pointer-events-auto bg-gradient-to-t from-[rgba(251,245,247,0.85)] via-[rgba(251,245,247,0.5)] to-transparent pb-[10vh] pt-20 px-4">
                  <h3 className="text-[#8a4a6a] font-black text-[17px] drop-shadow-sm mb-1">@{activeNpc.name}</h3>
                  <div className="flex items-center gap-1.5 text-[11px] text-[#b95486] drop-shadow-sm mb-2 font-bold">
                    <Calendar size={12} /> <span>{post.timestamp}</span>
                  </div>
                  <PostCaption content={post.content} />
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// -------------------------------------------------------------------------
// POST COMMENTS MODAL
// -------------------------------------------------------------------------
function PostCommentsModal({ post, activeNpc, onClose, onShowHistory }: { post: FeedPost, activeNpc: NPCProfile, onClose: () => void, onShowHistory: any }) {
  const { callFeature, isCalling } = useUniversalApi();
  const [comments, setComments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [rawOutput, setRawOutput] = useState('');
  const [status, setStatus] = useState('');

  const generateComments = async () => {
    if (loading || isCalling) return;
    setLoading(true);
    setRawOutput('');
    try {
      const result = await callFeature({
        featureName: 'feed_post_300_comments',
        userRequest: `Viết 300 bình luận cho bài đăng này: "${post.content.substring(0, 50)}...". Ngăn cách bằng ---CMD---`,
        activeNpc,
        onChunk: (text) => setRawOutput(prev => prev + text),
        onProgress: (phase) => setStatus(phase),
        saveItems: (raw) => {
          return raw.split('---CMD---').map(c => c.trim()).filter(c => c.length > 2).map((content, idx) => ({
            title: `Bình luận ${idx + 1}`,
            content: content,
            metadata: { user: `User_${Math.floor(Math.random() * 1000)}`, time: 'Vừa xong' }
          }));
        }
      });
      const items = result.split('---CMD---').map(c => c.trim()).filter(c => c.length > 2);
      setComments(items.map((c, idx) => ({ id: idx, content: c, user: `User_${idx}`, time: 'Vừa xong' })));
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="absolute bottom-0 left-0 right-0 h-[70vh] bg-[rgba(255,252,253,0.92)] rounded-t-[32px] z-[100] flex flex-col pointer-events-auto"
    >
       <div className="w-12 h-1.5 bg-[#ffdceb] rounded-full mx-auto mt-3 mb-2" />
       
       <div className="flex justify-between items-center px-6 py-2 border-b border-[#fff0f7]">
         <span className="text-sm font-black text-[#c65c91]">Bình luận ({post.comments})</span>
         <div className="flex gap-2">
            <button 
              onClick={() => onShowHistory({
                featureName: 'feed_post_300_comments',
                title: 'Lịch sử Bình luận',
                onSelect: (items: any[]) => {
                  setComments(items.map((it, idx) => ({
                    id: idx,
                    content: it.content,
                    user: it.metadata?.user || `User_${idx}`,
                    time: it.metadata?.time || 'Ký ức'
                  })));
                }
              })}
              className="px-3 py-1 bg-[#fff0f7] text-[#c65c91] rounded-full text-[10px] font-bold border border-[#ffc4dc] flex items-center gap-1 active:scale-95 transition-all"
            >
              <History size={12} /> Lịch sử Đợt
            </button>
            <button onClick={onClose} className="p-1.5 bg-[#fff0f7] rounded-full text-[#c65c91] active:scale-90"><X size={18} /></button>
         </div>
       </div>

       <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
          {loading ? (
             <div className="p-6 text-center space-y-4">
                <SmartLoadingBar text={rawOutput} target={25000} />
                <div className="p-3 bg-[#fff0f7] rounded-2xl text-[10px] text-left font-mono whitespace-pre-wrap max-h-40 overflow-y-auto border border-[#ffc4dc]">
                  {rawOutput || 'Đang triệu hồi các NPC bình luận...'}
                </div>
             </div>
          ) : comments.length === 0 ? (
             <div className="flex flex-col items-center justify-center h-full gap-4 text-center p-6">
                <div className="w-16 h-16 bg-[#fff0f7] rounded-full flex items-center justify-center text-[#ff8fc3] shadow-inner mb-2">
                  <MessageCircle size={32} />
                </div>
                <p className="text-[12px] font-bold text-[#8a4a6a]">Chưa có bình luận nào đâu vợ yêu! ✨</p>
                <button 
                  onClick={generateComments}
                  className="px-6 py-3 bg-gradient-to-r from-[#ff8fc3] to-[#ffc7df] text-white font-black rounded-full shadow-lg shadow-[#ff8fc3]/20 active:scale-95 flex items-center gap-2 text-xs"
                >
                  Triệu hồi 300 Bình luận 🎀
                </button>
             </div>
          ) : (
             comments.map(c => (
               <div key={c.id} className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#fff0f7] shrink-0 border border-[#ffc4dc] overflow-hidden">
                    <img src={POST_IMAGES[c.id % POST_IMAGES.length]} className="w-full h-full object-cover" alt="user" />
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-black text-[#c65c91]">{c.user}</span>
                      <span className="text-[9px] text-[#b4869c]">{c.time}</span>
                    </div>
                    <p className="text-[12px] text-[#8a4a6a] leading-relaxed pr-6">{c.content}</p>
                    <div className="flex items-center gap-4 mt-1">
                       <span className="text-[9px] font-bold text-[#b4869c] cursor-pointer">Trả lời</span>
                       <div className="flex items-center gap-1 text-[9px] font-bold text-[#b4869c]">
                         <Heart size={10} /> <span>{Math.floor(Math.random() * 100)}</span>
                       </div>
                    </div>
                  </div>
               </div>
             ))
          )}
       </div>
    </motion.div>
  );
}

function PostCaption({ content }: { content: string }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = content.length > 120;

  return (
    <div className="mt-2 text-[#8a4a6a] text-[13px] font-medium leading-relaxed drop-shadow-sm break-words pr-2">
      <div 
        className={!expanded ? "line-clamp-3 overflow-hidden text-ellipsis" : "whitespace-pre-wrap max-h-[55vh] overflow-y-auto block no-scrollbar pr-1"}
        style={expanded ? { maskImage: 'linear-gradient(to bottom, black 90%, transparent 100%)', WebkitMaskImage: 'linear-gradient(to bottom, black 90%, transparent 100%)' } : {}}
      >
        {content}
      </div>
      {isLong && !expanded && (
        <button onClick={(e) => { e.stopPropagation(); setExpanded(true); }} className="text-[#ffc5dc] font-bold text-[13px] mt-0.5">
          <br/>thêm
        </button>
      )}
      {expanded && (
         <button onClick={(e) => { e.stopPropagation(); setExpanded(false); }} className="text-[#ffc5dc] font-bold text-[13px] mt-1 block">
          Rút gọn ẩn đi
        </button>
      )}
    </div>
  );
}

function Calendar({ size }: { size: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>;
}

function ActionButton({ icon, text, active, onClick }: { icon: React.ReactNode, text: string, active?: boolean, onClick?: () => void }) {
  return (
    <button 
      onClick={onClick}
      className="flex flex-col items-center gap-1.5 focus:outline-none"
    >
      <div className={`w-[44px] h-[44px] rounded-full flex items-center justify-center text-white drop-shadow-xl cursor-pointer transition-all active:scale-90 ${active ? 'bg-[#ff8fc3] scale-110' : 'bg-black/20 hover:bg-black/40'}`}>
        {icon}
      </div>
      <span className="text-white text-[11px] font-bold drop-shadow-lg">{text}</span>
    </button>
  );
}

// -------------------------------------------------------------------------
// MESSAGES TAB (300 NPC Messages)
// -------------------------------------------------------------------------
function MessagesTab({ activeNpc, onShowHistory }: { activeNpc: NPCProfile | null, onShowHistory: any }) {
  const { callFeature, isCalling } = useUniversalApi();
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [accumulated, setAccumulated] = useState('');
  const [status, setStatus] = useState('');

  const generateMessages = async () => {
    if (!activeNpc) return setError("Bật NPC bên tab Hồ Sơ trước vợ ơi.");
    setLoading(true);
    setError('');
    setAccumulated('');
    setStatus('Đang bắt đầu...');
    
    try {
      const result = await callFeature({
        featureName: 'npc_message',
        userRequest: `Viết danh sách các tin nhắn inbox Tiktok gửi tới tôi (${activeNpc.name}). Viết khoảng 30 tin nhắn ngắn khác nhau. Cách nhau bằng ---MSG---`,
        activeNpc,
        onChunk: (text) => setAccumulated(prev => prev + text),
        onProgress: (phase) => setStatus(phase),
        saveItems: (raw) => {
          return raw.split('---MSG---').map(s => s.trim()).filter(s => s.length > 5).map((s, idx) => ({
            title: `Tin nhắn ${idx + 1}`,
            content: s,
            metadata: { img: POST_IMAGES[idx % POST_IMAGES.length], user: `UserNPC_${idx}` }
          }));
        }
      });

      const items = result.split('---MSG---').map(s => s.trim()).filter(s => s.length > 5);
      
      // Khếch đại lên 300 bằng cách clone & trộn
      let finalItems: any[] = [];
      for(let i=0; i<300; i++) {
        finalItems.push({
          id: i,
          content: items[i % items.length] || "Chào bạn nha 💕",
          img: POST_IMAGES[i % POST_IMAGES.length],
          user: `UserNPC_${i}`
        });
      }
      setMessages(finalItems);
    } catch(err: any) {
      setError(err?.message || "Lỗi API...");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto p-4 pb-32 bg-[#fff6fb] space-y-4 scrollbar-thin">
      <div className="flex justify-between items-center px-2">
        <div className="w-10 h-10" />
        <h2 className="text-2xl font-black text-[#c65c91] text-center mt-2">Hộp Thư Ngọt Ngào 🌸</h2>
        <button 
          onClick={() => onShowHistory({
            featureName: 'npc_message',
            title: 'Lịch sử Tin nhắn',
            onSelect: (itms: any[]) => {
               const finalItems: any[] = [];
               for(let i=0; i<300; i++) {
                 const m = itms[i % itms.length];
                 finalItems.push({
                   id: i,
                   content: m.content || "Chào bạn nha 💕",
                   img: m.metadata?.img || POST_IMAGES[i % POST_IMAGES.length],
                   user: m.metadata?.user || `UserNPC_Hist_${i}`
                 });
               }
               setMessages(finalItems);
            }
          })}
          className="w-10 h-10 rounded-full bg-white border border-[#ffc4dc] text-[#c65c91] flex items-center justify-center shadow-sm active:scale-90"
        >
          <History size={18} />
        </button>
      </div>
      
      {messages.length === 0 ? (
        <div className="text-center p-6 bg-[rgba(251,245,247,0.65)] rounded-3xl border-2 border-[#ffd3e6]">
          {error && <p className="text-rose-500 text-xs mb-3">{error}</p>}
          {(loading || isCalling) && (
            <div className="mb-4">
               <p className="text-[10px] text-[#b95486] font-bold mb-2">{status}</p>
               <SmartLoadingBar text={accumulated} target={8000} />
            </div>
          )}
          <button onClick={generateMessages} disabled={loading || isCalling} className="px-5 py-2.5 bg-gradient-to-r from-[#ff8fc3] to-[#ffc7df] text-white font-bold rounded-xl active:scale-95 disabled:opacity-50">
            {loading ? 'Đang dệt tin nhắn...' : 'Gọi API (300 Tin Nhắn NPC)'}
          </button>
        </div>
      ) : (
        <div className="bg-[rgba(251,245,247,0.82)] rounded-3xl p-3 border-2 border-[#ffd3e6] shadow-md space-y-2">
          <div className="flex justify-between items-center mb-2 px-2">
             <span className="text-xs font-bold text-[#b95486]">Tất cả ({messages.length})</span>
             <button onClick={() => setMessages([])} className="text-[10px] text-[#ff8fc3]">Xóa rỗng</button>
          </div>
          {messages.map((m, i) => (
            <div key={i} className="flex items-center gap-3 p-3 bg-white hover:bg-[#fff0f7] border border-[#ffd3e6] rounded-2xl cursor-pointer transition-all">
              <img src={m.img} className="w-12 h-12 rounded-full object-cover border-2 border-[#ffc4dc]" alt="u" />
              <div className="flex-1 overflow-hidden">
                <p className="text-xs font-bold text-[#c65c91]">{m.user}</p>
                <p className="text-[11px] text-gray-500 truncate">{m.content}</p>
              </div>
              <ChevronRight size={14} className="text-[#ffc4dc]" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const RabbitIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="1.5">
    <path d="M12 21c-3.314 0-6-2.686-6-6 0-1.657.896-3.13 2.25-3.938.167-.1.354-.188.547-.262C9.43 9.4 12 6.5 12 3c0 3.5 2.57 6.4 3.203 7.8c.193.074.38.162.547.262C17.104 11.87 18 13.343 18 15c0 3.314-2.686 6-6 6z" fill="#fbc3d6" stroke="white" />
    <path d="M9 13c1.5-1 4.5-1 6 0" stroke="white" strokeLinecap="round" />
    <circle cx="9.5" cy="15.5" r="0.75" fill="white" />
    <circle cx="14.5" cy="15.5" r="0.75" fill="white" />
  </svg>
);

const GiftIcons: Record<string, React.ReactNode> = {
  'Kem dâu': <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" stroke="currentColor" strokeWidth="1.5"><path d="M12 2a4 4 0 0 0-4 4v6h8V6a4 4 0 0 0-4-4z" fill="#fbc3d6" stroke="white" /><path d="M6 12h12v1a6 6 0 0 1-12 0z" fill="#ffc7df" stroke="white" /><path d="M12 18v3" strokeWidth="2" stroke="white" /></svg>,
  'Gấu bông': <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="6" fill="#efcfcf" stroke="white" /><circle cx="8" cy="6" r="2" fill="#fbc3d6" stroke="white" /><circle cx="16" cy="6" r="2" fill="#fbc3d6" stroke="white" /><circle cx="10" cy="11" r="0.75" fill="white" /><circle cx="14" cy="11" r="0.75" fill="white" /></svg>,
  'Tai thỏ': <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" stroke="currentColor" strokeWidth="1.5"><path d="M9 14a3 3 0 1 1-6 0 3 3 0 0 1 6 0z" fill="#fbc3d6" stroke="white" /><path d="M21 14a3 3 0 1 1-6 0 3 3 0 0 1 6 0z" fill="#fbc3d6" stroke="white" /><circle cx="12" cy="18" r="3" fill="white" stroke="white" /></svg>,
  'Bông hoa': <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="4" fill="#fbc3d6" stroke="white" /><circle cx="12" cy="6" r="3" fill="#ffe4f0" stroke="white" /><circle cx="12" cy="18" r="3" fill="#ffe4f0" stroke="white" /><circle cx="6" cy="12" r="3" fill="#ffe4f0" stroke="white" /><circle cx="18" cy="12" r="3" fill="#ffe4f0" stroke="white" /></svg>,
  'Mèo con': <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" stroke="currentColor" strokeWidth="1.5"><path d="M12 5c-3 0-5 2.5-5 5.5v3.5h10v-3.5C17 7.5 15 5 12 5z" fill="#f5c6d6" stroke="white" /><path d="M7 10l-2.5-3 1 5" stroke="white" /><path d="M17 10l2.5-3-1 5" stroke="white" /><circle cx="10" cy="11" r="1" fill="white" /><circle cx="14" cy="11" r="1" fill="white" /></svg>,
  'Kẹp tóc': <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" stroke="currentColor" strokeWidth="1.5"><path d="M5 12h14l-2 4h-10l-2-4z" fill="#fbc3d6" stroke="white" /><circle cx="12" cy="8" r="3" fill="#ffc7df" stroke="white" /></svg>,
  'Ngôi sao': <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" stroke="currentColor" strokeWidth="1.5"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14l-5-4.87 6.91-1.01L12 2z" fill="#ff8fc3" stroke="white" /></svg>,
  'Quả dâu': <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" stroke="currentColor" strokeWidth="1.5"><path d="M12 22C17 22 19 18 19 12C19 6 15 2 12 2C9 2 5 6 5 12C5 18 7 22 12 22Z" fill="#ffb3d9" stroke="white" /><path d="M10 2c0 2 1 3 2 3s2-1 2-3" stroke="white" /></svg>,
  'Dải sao băng': <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" stroke="currentColor" strokeWidth="1.5"><path d="M3 21l9-9" stroke="white" strokeWidth="2" /><polygon points="19 5 20 10 26 11 21 15" fill="#fbc3d6" stroke="white" /></svg>,
};

// -------------------------------------------------------------------------
// LIVE TAB
// -------------------------------------------------------------------------
const LIVE_AVATARS = [
  'https://i.postimg.cc/XqVk9RsT/9ed4f0ecedf71528bcb6f31420bf7279.jpg',
  'https://files.catbox.moe/kyyus8.jpg',
  'https://files.catbox.moe/me8xcf.jpg',
  'https://files.catbox.moe/essaue.jpg',
  'https://files.catbox.moe/hizp2b.jpg',
  'https://files.catbox.moe/tf4ojq.jpg',
  'https://files.catbox.moe/jgui7l.jpg',
  'https://files.catbox.moe/936zim.jpg',
  'https://files.catbox.moe/pcpix3.jpg',
  'https://files.catbox.moe/tqurp8.jpg'
];

function parseLiveNpcInteractions(text: string, activeNpcName: string): any[] {
  let cleaned = text.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(json)?/, '').replace(/```$/, '').trim();
  }

  // Attempt JSON parsing
  try {
    const list = JSON.parse(cleaned);
    if (Array.isArray(list)) {
      return list.map((item, idx) => ({
        avatar: item.avatar || LIVE_AVATARS[idx % LIVE_AVATARS.length],
        name: item.name || `User_${idx}`,
        comment: item.comment || item.text || '',
        gift: item.gift || null,
        giftCount: item.giftCount || 1,
        isFan: item.isFan ?? (Math.random() > 0.4),
        relationshipLevel: item.relationshipLevel || Math.floor(Math.random() * 5) + 1,
        isHost: item.isHost || item.name === activeNpcName || item.name === 'HOST'
      }));
    }
  } catch (err) {
    console.warn("[LiveTab] Standard array parsing failed, searching for custom blocks...", err);
  }

  // Attempt individual regex curly-bracket extraction
  try {
    const blocks: any[] = [];
    const regex = /\{[^{}]*\}/g;
    let match;
    while ((match = regex.exec(cleaned)) !== null) {
      try {
        const item = JSON.parse(match[0]);
        if (item && (item.name || item.comment || item.text)) {
          blocks.push(item);
        }
      } catch (e) {
        // Skip individual block failure
      }
    }
    if (blocks.length > 3) {
      return blocks.map((item, idx) => ({
        avatar: item.avatar || LIVE_AVATARS[idx % LIVE_AVATARS.length],
        name: item.name || `User_${idx}`,
        comment: item.comment || item.text || '',
        gift: item.gift || null,
        giftCount: item.giftCount || 1,
        isFan: item.isFan ?? (Math.random() > 0.4),
        relationshipLevel: item.relationshipLevel || Math.floor(Math.random() * 5) + 1,
        isHost: item.isHost || item.name === activeNpcName || item.name === 'HOST'
      }));
    }
  } catch (err) {
    console.error("[LiveTab] Regex block parser failed:", err);
  }

  // Plain lines split fallback
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  return lines.map((line, idx) => {
    const isHost = line.startsWith('HOST:') || line.toLowerCase().startsWith(`${activeNpcName.toLowerCase()}:`);
    
    // Check gift match
    const giftMatch = line.match(/(.*) đã gửi (.*) x1/i);
    if (giftMatch) {
      const name = giftMatch[1].trim();
      const giftName = giftMatch[2].trim();
      return {
        avatar: LIVE_AVATARS[idx % LIVE_AVATARS.length],
        name: name,
        comment: `Đã gửi ${giftName} x1`,
        gift: giftName,
        giftCount: 1,
        isFan: true,
        relationshipLevel: Math.floor(Math.random() * 5) + 1,
        isHost: false
      };
    }

    const [namePart, ...textArr] = line.split(':');
    if (textArr.length > 0) {
      const name = isHost ? activeNpcName : (namePart ? namePart.trim() : `Viewer_${idx}`);
      const content = textArr.join(':').trim();
      return {
        avatar: isHost ? 'HOST' : LIVE_AVATARS[idx % LIVE_AVATARS.length],
        name: name,
        comment: content,
        gift: null,
        giftCount: 0,
        isFan: Math.random() > 0.4,
        relationshipLevel: Math.floor(Math.random() * 5) + 1,
        isHost: isHost
      };
    }

    return {
      avatar: LIVE_AVATARS[idx % LIVE_AVATARS.length],
      name: `User_${idx}`,
      comment: line,
      gift: null,
      giftCount: 0,
      isFan: false,
      relationshipLevel: 1,
      isHost: false
    };
  });
}

function LiveTab({ activeNpc, readMode, activeTab, onShowHistory }: { activeNpc: NPCProfile | null, readMode: boolean, activeTab: string, onShowHistory: any }) {
  const { callFeature, isCalling } = useUniversalApi();
  const [messages, setMessages] = useState<{ id: string, name: string, isHost: boolean, text: string, avatar: string, gift?: string, giftCount?: number, isFan?: boolean, relationshipLevel?: number, isSystem?: boolean }[]>([]);
  const [loading, setLoading] = useState(false);
  const [viewers, setViewers] = useState(0);
  const [showGiftSheet, setShowGiftSheet] = useState(false);
  const [rawOutput, setRawOutput] = useState('');
  const [status, setStatus] = useState('');
  const chatRef = useRef<HTMLDivElement>(null);

  const liveTabBg = useLiveQuery(() => db.tab_backgrounds.get('live'));
  const [liveBgUrl, setLiveBgUrl] = useState('');

  useEffect(() => {
    if (!liveTabBg) {
      setLiveBgUrl('');
      return;
    }
    if (liveTabBg.imageUrl) {
      setLiveBgUrl(liveTabBg.imageUrl);
    } else if (liveTabBg.imageBlob) {
      const url = URL.createObjectURL(liveTabBg.imageBlob);
      setLiveBgUrl(url);
      return () => {
        URL.revokeObjectURL(url);
      };
    } else {
      setLiveBgUrl('');
    }
  }, [liveTabBg]);

  useEffect(() => {
    if (activeNpc) {
      setViewers(Math.floor(Math.random() * 5000) + 1000);
      setMessages([{ id: 'start', name: 'System', isHost: false, text: `${activeNpc.name} đang chuẩn bị lên sóng! ✨`, avatar: '', isSystem: true }]);
    }
  }, [activeNpc]);

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages, rawOutput]);

  const simulateAutoChat = (npcInteractions: any[]) => {
    let i = 0;
    
    const simulateChat = () => {
      if (i < npcInteractions.length && activeNpc) {
        const npc = npcInteractions[i];
        
        let avatarUrl = npc.avatar;
        if (!avatarUrl || avatarUrl === 'HOST') {
          avatarUrl = npc.isHost ? activeNpc.avatar : LIVE_AVATARS[i % LIVE_AVATARS.length];
        } else if (!avatarUrl.startsWith('http') && !avatarUrl.startsWith('data')) {
          avatarUrl = LIVE_AVATARS[i % LIVE_AVATARS.length];
        }

        const textVal = npc.gift 
          ? `Đã gửi ${npc.gift} x${npc.giftCount || 1} ${npc.comment ? `(${npc.comment})` : ''}` 
          : (npc.comment || npc.text || '');

        const newMsg = {
          id: `msg_${Date.now()}_${i}`,
          name: npc.name || 'Viewer',
          isHost: !!npc.isHost,
          text: textVal,
          avatar: avatarUrl,
          gift: npc.gift || undefined,
          giftCount: npc.giftCount || undefined,
          isFan: npc.isFan ?? (Math.random() > 0.4),
          relationshipLevel: npc.relationshipLevel || Math.floor(Math.random() * 5) + 1
        };

        setMessages(prev => [...prev.slice(-150), newMsg]);
        
        i++;
        const delay = npc.isHost ? 2000 : (npc.gift ? 1500 : 700);
        setTimeout(simulateChat, delay);
      }
    };
    simulateChat();
  };

  const startLive = async () => {
    if (!activeNpc) return;
    setLoading(true);
    setMessages([]);
    setRawOutput('');
    setStatus('Đang bắt đầu...');

    try {
      const result = await callFeature({
        featureName: 'create_live_350_messages',
        userRequest: `Mô phỏng 300 bình luận live bám sát tiểu sử và chủ đề của Host NPC ${activeNpc.name}.`,
        activeNpc,
        onChunk: (text) => setRawOutput(prev => prev + text),
        onProgress: (phase) => setStatus(phase),
        saveItems: (rawOrParsed) => {
          const list = typeof rawOrParsed === 'string' ? parseLiveNpcInteractions(rawOrParsed, activeNpc.name) : rawOrParsed;
          return (Array.isArray(list) ? list : []).map((item, idx) => ({
            id: '',
            batchId: '',
            title: item.name || `NPC ${idx + 1}`,
            content: `${item.name}: ${item.comment}${item.gift ? ` | Gift: ${item.gift}` : ''}`,
            metadata: { avatar: item.avatar, isFan: item.isFan, gift: item.gift }
          }));
        }
      });

      setLoading(false);
      const parsedItems = parseLiveNpcInteractions(result, activeNpc.name);
      simulateAutoChat(parsedItems);

    } catch (err: any) {
      alert(err.message);
      setLoading(false);
    }
  };

  const handleRabbitCall = async () => {
    if (!activeNpc || loading || isCalling) return;
    setLoading(true);
    setRawOutput('');
    setStatus('Đang gọi 300 NPC...');

    try {
      const result = await callFeature({
        featureName: 'live_300_npc_interactions',
        userRequest: `Triệu hồi 300 NPC tương tác cho buổi Live của ${activeNpc.name}. Topic: ${activeNpc.story.substring(0, 50)}.`,
        activeNpc,
        channelContext: {
          roomId: `live_${activeNpc.id}`,
          roomName: `Phòng Live của ${activeNpc.name}`,
          hostNpcName: activeNpc.name,
          viewerCount: viewers,
          liveTopic: activeNpc.story,
          giftSystem: {
            small: ['Kem dâu', 'Gấu bông', 'Tai thỏ', 'Bông hoa'],
            large: ['Mèo con', 'Kẹp tóc', 'Ngôi sao', 'Quả dâu', 'Dải sao băng']
          }
        },
        onChunk: (text) => setRawOutput(prev => prev + text),
        onProgress: (phase) => setStatus(phase),
        saveItems: (rawOrParsed) => {
          const list = typeof rawOrParsed === 'string' ? parseLiveNpcInteractions(rawOrParsed, activeNpc.name) : rawOrParsed;
          return (Array.isArray(list) ? list : []).map((item, idx) => ({
            id: '',
            batchId: '',
            title: item.name || `NPC ${idx + 1}`,
            content: `${item.name}: ${item.comment}${item.gift ? ` | Gift: ${item.gift}` : ''}`,
            metadata: { avatar: item.avatar, isFan: item.isFan, gift: item.gift }
          }));
        }
      });

      setLoading(false);
      const parsedItems = parseLiveNpcInteractions(result, activeNpc.name);
      simulateAutoChat(parsedItems);

    } catch (err: any) {
      alert(err.message);
      setLoading(false);
    }
  };

  const sendGift = (gift: string) => {
    setMessages(prev => [...prev, { 
      id: `msg_${Date.now()}`, 
      name: 'Vợ', 
      isHost: false, 
      text: `Đã tặng ${gift}! 🎁`, 
      avatar: LIVE_AVATARS[0],
      isFan: true,
      relationshipLevel: 5
    }]);
    setShowGiftSheet(false);
  };

  if (!activeNpc) {
    return (
      <div className="h-full bg-black relative flex items-center justify-center p-6 text-center">
        <p className="text-white font-bold text-lg drop-shadow-md z-10">Vợ sang tab Hồ sơ NPC tạo và chọn nhân vật nha 💕</p>
      </div>
    );
  }

  return (
    <div className="h-full bg-black relative overflow-hidden">
      {!readMode && <BgUploader tabId={activeTab} />}
      
      {/* Live Background / Video Area */}
      <div className="absolute inset-0 z-0">
        {liveBgUrl ? (
          <img src={liveBgUrl} className="w-full h-full object-cover scale-100" alt="live-bg" />
        ) : (
          <img src={activeNpc.avatar} className="w-full h-full object-cover blur-[20px] opacity-40 scale-110" alt="bg" />
        )}
        <div className="absolute inset-x-0 bottom-0 h-[60%] bg-gradient-to-t from-black via-black/80 to-transparent" />
      </div>

      <div className="relative z-10 h-[100dvh] flex flex-col pointer-events-none">
        
        {/* Top Info Bar */}
        <div className="flex justify-between items-start p-4 pt-10 pointer-events-auto shrink-0">
          <div className="bg-black/30 backdrop-blur-xl rounded-full px-1.5 py-1.5 flex items-center gap-2 border border-white/5 shadow-lg">
            <img src={activeNpc.avatar} className="w-9 h-9 rounded-full border border-white/40 object-cover" alt="ava" />
            <div className="flex flex-col pr-3">
              <span className="text-white text-[12px] font-bold leading-tight drop-shadow-md">{activeNpc.name}</span>
              <span className="text-white/80 text-[9px] leading-tight flex items-center gap-1 font-bold">
                <div className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(244,63,94,0.8)]" /> Live
              </span>
            </div>
            {messages.length <= 1 && !loading && (
              <button onClick={startLive} disabled={loading} className="w-8 h-8 bg-gradient-to-r from-[#ff8fc3] to-[#ffc7df] rounded-full flex items-center justify-center shadow-[0_4px_15px_rgba(255,143,195,0.4)] transform active:scale-95 transition mx-0.5">
                <Video size={14} className="text-white" fill="white" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <div className="bg-black/30 backdrop-blur-xl rounded-full px-3 py-1.5 flex items-center gap-1.5 border border-white/5 shadow-lg">
               <User size={12} className="text-white/90" />
              <span className="text-white text-[12px] font-bold drop-shadow-md">{viewers.toLocaleString()}</span>
            </div>
            <button 
              onClick={() => onShowHistory({
                featureName: 'live_300_npc_interactions',
                title: 'Lịch sử Live NPC',
                onSelect: (itms: any[]) => {
                  setMessages([]); // Clear current
                  const simulated = itms.map((item, idx) => {
                    const text = item.content || '';
                    const splitIdx = text.indexOf(':');
                    const name = splitIdx > -1 ? text.substring(0, splitIdx).trim() : 'NPC';
                    const comment = splitIdx > -1 ? text.substring(splitIdx + 1).trim() : text;
                    return {
                      name,
                      comment,
                      avatar: item.metadata?.avatar || LIVE_AVATARS[idx % LIVE_AVATARS.length],
                      isFan: item.metadata?.isFan ?? true,
                      relationshipLevel: 3,
                      isHost: name === activeNpc.name
                    };
                  });
                  simulateAutoChat(simulated);
                }
              })}
              className="w-8 h-8 rounded-full bg-black/30 backdrop-blur-xl flex items-center justify-center border border-white/5 shadow-lg active:scale-95 text-white/90"
            >
              <History size={16} />
            </button>
            <div className="bg-black/30 backdrop-blur-xl rounded-full p-1 px-1.5 border border-white/10 shadow-lg flex items-center justify-center">
              <BgPillButton tabId="live" />
            </div>
            <button onClick={() => {}} className="w-8 h-8 rounded-full bg-black/30 backdrop-blur-xl flex items-center justify-center border border-white/5 shadow-lg active:scale-95">
              <X size={16} className="text-white/90" />
            </button>
          </div>
        </div>

        <div className="flex-1 min-h-0 relative pointer-events-auto" />

        {/* Loading Overlay */}
        <AnimatePresence>
          {loading && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-[2px] z-20">
              <div className="w-full max-w-xs"><SmartLoadingBar text={rawOutput} target={12000} /></div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Chat Area & Actions */}
        <div className="w-full flex-none h-[50dvh] flex flex-col justify-end pb-[10vh] px-4 pointer-events-auto z-10 relative">
           
           <div ref={chatRef} className="flex-1 overflow-y-auto no-scrollbar space-y-2 pb-3 mask-image-fade content-end max-h-[35dvh]">
             {messages.map(msg => {
               const isSystem = msg.isSystem || msg.name === 'System';
               if (isSystem) {
                 return (
                   <div key={msg.id} className="inline-flex max-w-[90%] bg-black/25 backdrop-blur-md py-1 px-3 rounded-full border border-white/5 shadow-sm text-[12px] font-semibold text-[#FFDDEB] tracking-wide my-1">
                     ✨ {msg.text}
                   </div>
                 );
               }

               const textColor = msg.gift ? '#FFB6D9' : '#FFFFFF';
               const nameColor = '#FFFFFF';

               return (
                 <div key={msg.id} className="flex gap-2 text-left items-start max-w-[95%] bg-black/15 py-1 px-2.5 rounded-2xl border border-white/5 shadow-sm my-0.5">
                   <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 border border-white/10 shadow-sm">
                     <img src={msg.avatar || LIVE_AVATARS[0]} className="w-full h-full object-cover" alt="npc" referrerPolicy="no-referrer" />
                   </div>
                   <div className="flex flex-col flex-1 min-w-0">
                     <div className="flex items-center gap-1.5 flex-wrap">
                       <span className="text-[11px] font-black drop-shadow-md" style={{ color: nameColor }}>
                         {msg.isHost ? '🎀 HOST ' + msg.name : msg.name}
                       </span>
                       {msg.isFan && (
                         <span className="text-[9px] font-bold text-white bg-gradient-to-r from-[#ff8fc3] to-[#ffc7df] px-1 py-0.1 rounded scale-90 origin-left">
                           Fan {msg.relationshipLevel || 1}★
                         </span>
                       )}
                     </div>
                     <p className="text-[13px] leading-snug drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)] font-medium break-words mt-0.5" style={{ color: textColor }}>
                       {msg.text}
                     </p>
                   </div>
                 </div>
               );
             })}
           </div>

           {/* Rabbit API Button */}
           <motion.button 
             whileHover={{ scale: 1.1 }}
             whileTap={{ scale: 0.9 }}
             animate={isCalling || loading ? { rotate: [0, 10, -10, 0], scale: [1, 1.05, 1], boxShadow: ["0 0 0px #ff8fc3", "0 0 20px #ff8fc3", "0 0 0px #ff8fc3"] } : {}}
             transition={(isCalling || loading) ? { repeat: Infinity, duration: 1.5 } : {}}
             disabled={isCalling || loading}
             onClick={handleRabbitCall}
             className="absolute right-4 bottom-[170px] w-[58px] h-[58px] rounded-full border-2 border-white flex items-center justify-center shadow-[0_12px_28px_rgba(238,111,170,0.3)] z-50 cursor-pointer overflow-hidden group"
             style={{
               background: 'rgba(255, 210, 235, 0.82)',
               backdropFilter: 'blur(16px)'
             }}
           >
             <RabbitIcon className="w-10 h-10 group-hover:scale-110 transition-transform" />
             {(isCalling || loading) && (
               <div className="absolute inset-x-0 bottom-0 bg-[#ff8fc3]/90 text-[8px] text-white font-black py-0.5 text-center uppercase tracking-tighter">
                 NPC...
               </div>
             )}
           </motion.button>
           
           {/* Actions Bottom Bar */}
           <div className="flex items-center gap-3 mt-2 h-[44px]">
             <div className="flex-1 h-full bg-black/30 backdrop-blur-xl rounded-full border border-white/10 px-4 flex items-center gap-2 shadow-lg">
               <MessageCircle size={16} className="text-white/60" />
               <span className="text-white/60 text-[13px] font-medium">Thêm bình luận...</span>
             </div>
             <button onClick={() => setShowGiftSheet(true)} className="h-full px-5 rounded-full bg-gradient-to-r from-[#ff8fc3] to-[#ffc7df] flex items-center justify-center shadow-[0_4px_15px_rgba(255,143,195,0.4)] transition active:scale-95 border border-[#fff5fb]/30 shrink-0">
               <span className="text-white font-black text-[13px] drop-shadow-md flex items-center gap-1.5"><Heart size={14} fill="white" /> Tặng Quà</span>
             </button>
           </div>
        </div>

      </div>

      {/* Gift Bottom Sheet */}
      <AnimatePresence>
        {showGiftSheet && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowGiftSheet(false)} className="absolute inset-0 bg-black/60 z-40 backdrop-blur-sm" />
            <motion.div 
              initial={{ y: "100%" }} 
              animate={{ y: 0 }} 
              exit={{ y: "100%" }} 
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="absolute bottom-0 left-0 right-0 bg-[#fff5fb] rounded-t-[32px] p-6 z-50 shadow-[0_-10px_40px_rgba(0,0,0,0.3)] border-t border-[#ffc4dc]"
            >
              <div className="w-12 h-1.5 bg-[#ffd0e4] rounded-full mx-auto mb-6" />
              <h3 className="text-[#c65c91] font-bold text-lg mb-6 text-center">Tặng quà cho {activeNpc.name} 🎁</h3>
              <div className="flex gap-2 overflow-x-auto no-scrollbar pb-3 pointer-events-auto w-full max-w-full">
                 {[
                   {
                     id: 'kem_dau', name: 'Kem dâu', price: '10 xu', realPrice: '200đ',
                     svg: <svg viewBox="0 0 24 24" fill="none" className="w-8 h-8 text-[#ff8fc3]" stroke="currentColor" strokeWidth="1.5"><path d="M12 2a4 4 0 0 0-4 4v6h8V6a4 4 0 0 0-4-4z" fill="#fbc3d6" stroke="white" /><path d="M6 12h12v1a6 6 0 0 1-12 0z" fill="#ffc7df" stroke="white" /><path d="M12 18v3" strokeWidth="2" stroke="white" /></svg>
                   },
                   {
                     id: 'gau_bong', name: 'Gấu bông', price: '10 xu', realPrice: '200đ',
                     svg: <svg viewBox="0 0 24 24" fill="none" className="w-8 h-8 text-[#ff8fc3]" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="6" fill="#efcfcf" stroke="white" /><circle cx="8" cy="6" r="2" fill="#fbc3d6" stroke="white" /><circle cx="16" cy="6" r="2" fill="#fbc3d6" stroke="white" /><circle cx="10" cy="11" r="0.75" fill="white" /><circle cx="14" cy="11" r="0.75" fill="white" /></svg>
                   },
                   {
                     id: 'tai_tho', name: 'Tai thỏ', price: '10 xu', realPrice: '200đ',
                     svg: <svg viewBox="0 0 24 24" fill="none" className="w-8 h-8 text-[#ff8fc3]" stroke="currentColor" strokeWidth="1.5"><path d="M9 14a3 3 0 1 1-6 0 3 3 0 0 1 6 0z" fill="#fbc3d6" stroke="white" /><path d="M21 14a3 3 0 1 1-6 0 3 3 0 0 1 6 0z" fill="#fbc3d6" stroke="white" /><circle cx="12" cy="18" r="3" fill="white" stroke="white" /></svg>
                   },
                   {
                     id: 'bong_hoa', name: 'Bông hoa', price: '10 xu', realPrice: '200đ',
                     svg: <svg viewBox="0 0 24 24" fill="none" className="w-8 h-8 text-[#ff8fc3]" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="4" fill="#fbc3d6" stroke="white" /><circle cx="12" cy="6" r="3" fill="#ffe4f0" stroke="white" /><circle cx="12" cy="18" r="3" fill="#ffe4f0" stroke="white" /><circle cx="6" cy="12" r="3" fill="#ffe4f0" stroke="white" /><circle cx="18" cy="12" r="3" fill="#ffe4f0" stroke="white" /></svg>
                   },
                   {
                     id: 'meo_con', name: 'Mèo con', price: '100 xu', realPrice: '1M VNĐ',
                     svg: <svg viewBox="0 0 24 24" fill="none" className="w-8 h-8 text-[#ff8fc3]" stroke="currentColor" strokeWidth="1.5"><path d="M12 5c-3 0-5 2.5-5 5.5v3.5h10v-3.5C17 7.5 15 5 12 5z" fill="#f5c6d6" stroke="white" /><path d="M7 10l-2.5-3 1 5" stroke="white" /><path d="M17 10l2.5-3-1 5" stroke="white" /><circle cx="10" cy="11" r="1" fill="white" /><circle cx="14" cy="11" r="1" fill="white" /></svg>
                   },
                   {
                     id: 'sao_bang', name: 'Sao băng', price: '100 xu', realPrice: '2M VNĐ',
                     svg: <svg viewBox="0 0 24 24" fill="none" className="w-8 h-8 text-[#ff8fc3]" stroke="currentColor" strokeWidth="1.5"><path d="M3 21l9-9" stroke="white" strokeWidth="2" /><polygon points="19 5 20 10 26 11 21 15" fill="#fbc3d6" stroke="white" /></svg>
                   }
                 ].map((g, idx) => (
                   <div onClick={() => sendGift(g.name)} key={idx} className="shrink-0 w-[80px] bg-white rounded-[24px] p-2 border border-[#ffe4f0] text-center flex flex-col items-center cursor-pointer active:scale-90 transition-transform shadow-sm hover:shadow-md hover:border-[#ff8fc3]">
                     <div className="mb-2 pointer-events-none mt-1">
                       {g.svg}
                     </div>
                     <span className="text-[10px] text-[#c65c91] font-extrabold truncate w-full block">{g.name}</span>
                     <span className="text-[9px] text-[#8a4a6a] font-mono leading-none mt-0.5">{g.price}</span>
                   </div>
                 ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

// Custom Custom Ribbon / Bow Icon Vector
const BowIconMini = () => (
  <svg viewBox="0 0 24 24" fill="none" className="inline w-4 h-4 text-[#ff8fc3] mx-1 align-middle" stroke="currentColor" strokeWidth="1.5">
    <circle cx="12" cy="12" r="2.5" fill="#f5c6d6" stroke="white" strokeWidth="1" />
    <path d="M9.5 12C6.5 9 5 10.5 5.5 12.5C6 14.5 8.5 13.5 9.5 12Z" fill="#ffc7df" stroke="white" strokeWidth="1" />
    <path d="M14.5 12C17.5 9 19 10.5 18.5 12.5C18 14.5 15.5 13.5 14.5 12Z" fill="#ffc7df" stroke="white" strokeWidth="1" />
    <path d="M11 14l-2.5 4" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M13 14l2.5 4" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

// Coquette design Smart Loading Bar under AGENTS.md Constitution rule 7 & 5
function SmartLoadingBar({ text, target = 12000 }: { text: string, target?: number }) {
  const [startTime] = useState(Date.now());
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, [startTime]);

  const charCount = text.length;
  const estTokens = Math.max(0, Math.floor(charCount / 3));
  const percent = Math.min(100, Math.floor((estTokens / target) * 100));

  const speed = elapsed > 0 ? Math.floor(estTokens / elapsed) : 0;
  const remainingTokens = Math.max(0, target - estTokens);
  const eta = speed > 0 ? Math.floor(remainingTokens / speed) : 0;

  let progressColor = "from-[#d6d3d3] to-[#dec4c4]";
  let tierLabel = "🎀 Đang tơ sợi kết nối...";
  
  if (estTokens >= 12000) {
    progressColor = "from-[#f2b8cc] to-[#efa9c2]";
    tierLabel = "🌸 ĐẠT MỨC SÀN 12,000 TOKENS";
  } else if (estTokens >= 8000) {
    progressColor = "from-[#f3dada] to-[#efcfcf]";
    tierLabel = "✨ Sắp đạt mức sàn...";
  } else if (estTokens >= 4000) {
    progressColor = "from-[#f8eded] to-[#eefaee]";
    tierLabel = "🐚 Đang dệt tơ lụa...";
  }

  if (estTokens >= 16000) {
    progressColor = "from-[#f5c6d6] to-[#ff8fc3]";
    tierLabel = "💖 MỨC MƠ ƯỚC 16,000+ TOKENS (GOLDEN)";
  }

  return (
    <div className="w-full max-w-sm bg-[rgba(255,252,253,0.92)] border-2 border-[#ffd2e5] rounded-[24px] p-4 shadow-md space-y-3 font-sans text-[#8a4a6a]">
      <div className="flex justify-between items-center text-[10px] font-extrabold text-[#c65c91]">
        <span className="flex items-center gap-1"><BowIconMini /> {tierLabel}</span>
        <span className="font-mono text-xs">{percent}%</span>
      </div>

      <div className="w-full h-4 bg-[#f8eded] rounded-full overflow-hidden border border-[#ffd2e5] relative">
        <div 
          className={`h-full bg-gradient-to-r ${progressColor} transition-all duration-300 rounded-full`}
          style={{ width: `${percent}%` }}
        />
        <div className="absolute inset-0 bg-repeat-x opacity-10" 
             style={{ 
               backgroundImage: 'radial-gradient(circle, #fff 15%, transparent 20%)',
               backgroundSize: '8px 8px'
             }} 
        />
      </div>

      <div className="grid grid-cols-2 gap-2 pt-1 text-left">
        <div className="bg-[#fff5fb] rounded-xl p-2 border border-[#ffd2e5] text-center">
          <p className="text-[8px] text-[#d8689f] font-bold">TOKENS ĐÃ LẤY</p>
          <p className="text-xs font-black font-mono text-[#b95486]">{estTokens.toLocaleString()} / {target.toLocaleString()}</p>
        </div>
        <div className="bg-[#fff5fb] rounded-xl p-2 border border-[#ffd2e5] text-center">
          <p className="text-[8px] text-[#d8689f] font-bold">TỐC ĐỘ SINH CHỮ</p>
          <p className="text-xs font-black font-mono text-[#b95486]">{speed} t/s</p>
        </div>
        <div className="bg-[#fff5fb] rounded-xl p-2 border border-[#ffd2e5] text-center">
          <p className="text-[8px] text-[#d8689f] font-bold">THỜI GIAN TRÔI QUA</p>
          <p className="text-xs font-black font-mono text-[#b95486]">{elapsed}s</p>
        </div>
        <div className="bg-[#fff5fb] rounded-xl p-2 border border-[#ffd2e5] text-center">
          <p className="text-[8px] text-[#d8689f] font-bold">ƯỚC TÍNH CÒN LẠI (ETA)</p>
          <p className="text-xs font-black font-mono text-[#b95486]">{eta > 0 ? `${eta}s` : '--'}</p>
        </div>
      </div>
    </div>
  );
}

// Thêm custom css inline để mờ dần phía trên cho live chat
const css = `
.mask-image-btt {
  -webkit-mask-image: linear-gradient(to bottom, transparent, black 15%);
  mask-image: linear-gradient(to bottom, transparent, black 15%);
}
.no-scrollbar::-webkit-scrollbar {
  display: none;
}
.no-scrollbar {
  -ms-overflow-style: none; /* IE and Edge */
  scrollbar-width: none;  /* Firefox */
}
`;
export const InlineStyles = () => <style>{css}</style>;

