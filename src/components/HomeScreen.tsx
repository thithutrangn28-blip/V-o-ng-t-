import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Settings, MessageCircle, Image as ImageIcon, Phone, Camera, Heart, Tv, BookOpen, Sparkles, User } from 'lucide-react';

const pages = [0, 1, 2];
const DEFAULT_BG = "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1080&auto=format&fit=crop&q=80";

export default function HomeScreen({ openSettings, openKoko, openDating, openYouTube, openLoveShow, openNovel, openKikokoNovel, openRenGram, openKokoRoleplay, openUserProfile, openBanhNho, openCarrd, openCharacterPhone, openApiHub, openDiscord, openKikokoAnalyzer, openKikokoTiktok }: { openSettings: () => void, openKoko: () => void, openDating: () => void, openYouTube: () => void, openLoveShow: () => void, openNovel: () => void, openKikokoNovel: () => void, openRenGram: () => void, openKokoRoleplay: () => void, openUserProfile: () => void, openBanhNho: () => void, openCarrd: () => void, openCharacterPhone: () => void, openApiHub: () => void, openDiscord: () => void, openKikokoAnalyzer: () => void, openKikokoTiktok: () => void }) {
  const [currentPage, setCurrentPage] = useState(0);
  const [appBackground, setAppBackground] = useState(() => localStorage.getItem('home_bg') || DEFAULT_BG);
  const bgInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    localStorage.setItem('home_bg', appBackground);
  }, [appBackground]);

  const handleBgUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAppBackground(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div 
      className="absolute inset-0 w-full h-full bg-[#FAF9F6] overflow-hidden bg-cover bg-center transition-all duration-300"
      style={{ backgroundImage: appBackground ? `url('${appBackground}')` : 'none' }}
    >
      {/* Pattern */}
      {!appBackground && (
        <div 
          className="absolute inset-0 w-full h-full opacity-50"
          style={{ 
            backgroundImage: 'radial-gradient(#00000022 1px, transparent 1px)',
            backgroundSize: '20px 20px'
          }}
        />
      )}

      {/* Top Bar for Background Upload */}
      <div className="absolute top-0 left-0 right-0 p-4 flex justify-end z-20 pt-safe">
        <input 
          type="file" 
          accept="image/*" 
          className="hidden" 
          ref={bgInputRef} 
          onChange={handleBgUpload} 
        />
        <button 
          onClick={() => bgInputRef.current?.click()}
          className="text-[12px] px-3 py-1.5 rounded-full bg-white/50 backdrop-blur-md border border-white/40 shadow-sm flex items-center gap-1.5 cursor-pointer hover:bg-white/70 transition-colors text-gray-700 font-medium"
        >
          <ImageIcon size={14} />
          Đổi nền
        </button>
      </div>

      {/* Pages */}
      <motion.div 
        className="flex w-full h-full"
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        onDragEnd={(e, info) => {
          if (info.offset.x < -50 && currentPage < pages.length - 1) setCurrentPage(p => p + 1);
          if (info.offset.x > 50 && currentPage > 0) setCurrentPage(p => p - 1);
        }}
        animate={{ x: `-${currentPage * 100}%` }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      >
        {pages.map(page => (
          <div key={page} className="min-w-full h-full pt-20 px-6 relative">
            {page === 0 && (
              <div className="grid grid-cols-4 gap-x-4 gap-y-6 max-w-md mx-auto">
                {/* App Icon */}
                <div className="flex flex-col items-center gap-1" onClick={openSettings}>
                  <div className="w-[62px] h-[62px] bg-[#FFF8F8] border border-[#F9C6D4]/40 rounded-[22px] shadow-[0_4px_12px_rgba(249,198,212,0.3)] flex items-center justify-center text-[#EFA9C2] cursor-pointer active:scale-95 transition-all duration-300">
                    <Settings size={28} strokeWidth={1.5} />
                  </div>
                  <span className="text-[11px] font-bold text-[#c65c91] leading-tight text-center">Cài đặt API</span>
                </div>
                
                <div className="flex flex-col items-center gap-1" onClick={openKoko}>
                  <div className="w-[62px] h-[62px] bg-[#FFF9F9] border border-[#F9C6D4]/40 rounded-[22px] shadow-[0_4px_12px_rgba(249,198,212,0.3)] flex items-center justify-center text-[#EFA9C2] cursor-pointer active:scale-95 transition-all duration-300">
                    <MessageCircle size={28} strokeWidth={1.5} />
                  </div>
                  <span className="text-[11px] font-bold text-[#c65c91] leading-tight text-center">Koko</span>
                </div>

                <div className="flex flex-col items-center gap-1" onClick={openDating}>
                  <div className="w-[62px] h-[62px] bg-[#FFF8F8] border border-[#F9C6D4]/40 rounded-[22px] shadow-[0_4px_12px_rgba(249,198,212,0.3)] flex items-center justify-center text-[#EFA9C2] cursor-pointer active:scale-95 transition-all duration-300">
                    <Heart size={28} strokeWidth={1.5} fill="#FFF5FB" />
                  </div>
                  <span className="text-[11px] font-bold text-[#c65c91] leading-tight text-center">Dating</span>
                </div>

                <div className="flex flex-col items-center gap-1" onClick={openYouTube}>
                  <div className="w-[62px] h-[62px] bg-[#FFF8F8] border border-[#F9C6D4]/40 rounded-[22px] shadow-[0_4px_12px_rgba(249,198,212,0.3)] flex items-center justify-center text-[#EFA9C2] cursor-pointer active:scale-95 transition-all duration-300">
                    <Tv size={28} strokeWidth={1.5} />
                  </div>
                  <span className="text-[11px] font-bold text-[#c65c91] leading-tight text-center">YouTube</span>
                </div>

                <div className="flex flex-col items-center gap-1" onClick={openLoveShow}>
                  <div className="w-[62px] h-[62px] bg-[#FFF8F8] border border-[#F9C6D4]/40 rounded-[22px] shadow-[0_4px_12px_rgba(249,198,212,0.3)] flex items-center justify-center text-[#EFA9C2] cursor-pointer active:scale-95 transition-all duration-300">
                    <Tv size={28} strokeWidth={1.5} />
                  </div>
                  <span className="text-[11px] font-bold text-[#c65c91] leading-tight text-center">Love Show</span>
                </div>

                <div className="flex flex-col items-center gap-1" onClick={openRenGram}>
                  <div className="w-[62px] h-[62px] bg-[#FFF9F9] border border-[#F9C6D4]/40 rounded-[22px] shadow-[0_4px_12px_rgba(249,198,212,0.3)] flex items-center justify-center text-[#EFA9C2] cursor-pointer active:scale-95 transition-all duration-300">
                    <Camera size={28} strokeWidth={1.5} />
                  </div>
                  <span className="text-[11px] font-bold text-[#c65c91] leading-tight text-center">RenGram</span>
                </div>

                <div className="flex flex-col items-center gap-1" onClick={openKokoRoleplay}>
                  <div className="w-[62px] h-[62px] bg-[#FFF8F8] border border-[#F9C6D4]/40 rounded-[22px] shadow-[0_4px_12px_rgba(249,198,212,0.3)] flex items-center justify-center text-[#EFA9C2] cursor-pointer active:scale-95 transition-all duration-300">
                    <Sparkles size={28} strokeWidth={1.5} />
                  </div>
                  <span className="text-[11px] font-bold text-[#c65c91] leading-tight text-center">Roleplay Koko</span>
                </div>

                <div className="flex flex-col items-center gap-1" onClick={openUserProfile}>
                  <div className="w-[62px] h-[62px] bg-[#FFF8F8] border border-[#F9C6D4]/40 rounded-[22px] shadow-[0_4px_12px_rgba(249,198,212,0.3)] flex items-center justify-center text-[#EFA9C2] cursor-pointer active:scale-95 transition-all duration-300">
                    <User size={28} strokeWidth={1.5} />
                  </div>
                  <span className="text-[11px] font-bold text-[#c65c91] leading-tight text-center">Hồ sơ User</span>
                </div>

                <div className="flex flex-col items-center gap-1" onClick={openKikokoTiktok}>
                  <div className="w-[62px] h-[62px] rounded-[22px] flex items-center justify-center cursor-pointer active:scale-95 transition-all duration-300"
                    style={{
                      background: 'rgba(255, 255, 255, 0.78)',
                      border: '2px solid rgba(255, 255, 255, 0.95)',
                      boxShadow: '0 12px 28px rgba(222, 120, 170, 0.18), inset 0 0 0 1px rgba(255, 210, 232, 0.65)'
                    }}>
                    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-[34px] h-[34px]">
                      {/* Left bow wing */}
                      <path d="M32 26 C20 14, 14 26, 32 26 Z" fill="none" stroke="#e89abc" strokeWidth="1.8"/>
                      {/* Right bow wing */}
                      <path d="M32 26 C44 14, 50 26, 32 26 Z" fill="none" stroke="#e89abc" strokeWidth="1.8"/>
                      {/* Left bow leg */}
                      <path d="M29 27 C22 36, 18 45, 16 51 C22 49, 26 42, 28 31" fill="none" stroke="#e89abc" strokeWidth="1.5"/>
                      {/* Right bow leg */}
                      <path d="M35 27 C42 36, 46 45, 48 51 C42 49, 38 42, 36 31" fill="none" stroke="#e89abc" strokeWidth="1.5"/>
                      {/* Center bow tie knot */}
                      <circle cx="32" cy="26" r="4" fill="none" stroke="#e89abc" strokeWidth="1.8"/>
                    </svg>
                  </div>
                  <span className="text-[11px] font-bold text-[#c65c91] leading-tight text-center">Kikoko Tiktok</span>
                </div>

                <div className="flex flex-col items-center gap-1" onClick={openKikokoNovel}>
                  <div className="w-[62px] h-[62px] bg-[#FFF8F8] border border-[#F9C6D4]/40 rounded-[22px] shadow-[0_4px_12px_rgba(249,198,212,0.3)] flex items-center justify-center text-[#EFA9C2] cursor-pointer active:scale-95 transition-all duration-300">
                    <BookOpen size={28} strokeWidth={1.5} />
                  </div>
                  <span className="text-[11px] font-bold text-[#c65c91] leading-tight text-center">Kikoko Novel</span>
                </div>

                {/* Widget 2x2 with rounded sweet pink glass card border */}
                <div className="col-span-2 row-span-2 rounded-[28px] overflow-hidden relative border-4 border-white shadow-[0_8px_24px_rgba(249,198,212,0.4)]">
                  <img src="https://i.postimg.cc/9FnXQNpn/e1d0cd594c41440c5e1dadc28f25c69a.jpg" className="w-full h-full object-cover" alt="widget"/>
                  <div className="absolute inset-0 bg-gradient-to-t from-[#F5C6D6]/85 to-transparent flex items-end p-3">
                    <span className="text-white font-bold text-xs drop-shadow-sm">Kotokoo ୨୧</span>
                  </div>
                </div>
              </div>
            )}
            {page === 1 && (
              <div className="grid grid-cols-4 gap-x-4 gap-y-6 max-w-md mx-auto">
                <div className="flex flex-col items-center gap-1" onClick={openNovel}>
                  <div className="w-[62px] h-[62px] bg-[#FFF8F8] border border-[#F9C6D4]/40 rounded-[22px] shadow-[0_4px_12px_rgba(249,198,212,0.3)] flex items-center justify-center text-[#EFA9C2] cursor-pointer active:scale-95 transition-all duration-300">
                    <BookOpen size={28} strokeWidth={1.5} />
                  </div>
                  <span className="text-[11px] font-bold text-[#c65c91] leading-tight text-center">Novel</span>
                </div>
                
                <div className="flex flex-col items-center gap-1" onClick={openBanhNho}>
                  <div className="w-[62px] h-[62px] bg-[#FFF8F8] border border-[#F9C6D4]/40 rounded-[22px] shadow-[0_4px_12px_rgba(249,198,212,0.3)] cursor-pointer active:scale-95 transition-all duration-300 overflow-hidden p-1">
                    <img src="https://i.postimg.cc/yNkB85Dd/662847c19c8cd32d8ffaea098e8d03f2-(1).png" className="w-full h-full object-cover rounded-xl" alt="Banh nho" />
                  </div>
                  <span className="text-[11px] font-bold text-[#c65c91] text-center leading-tight">Bánh nhỏ<br/>Trò chuyện</span>
                </div>

                <div className="flex flex-col items-center gap-1" onClick={openCharacterPhone}>
                  <div className="w-[62px] h-[62px] bg-[#FFF9F9] border border-[#F9C6D4]/40 rounded-[22px] shadow-[0_4px_12px_rgba(249,198,212,0.3)] flex items-center justify-center text-[#EFA9C2] cursor-pointer active:scale-95 transition-all duration-300">
                    <Phone size={28} strokeWidth={1.5} />
                  </div>
                  <span className="text-[11px] font-bold text-[#c65c91] text-center leading-tight">Điện thoại<br/>Nhân vật</span>
                </div>

                <div className="flex flex-col items-center gap-1" onClick={openApiHub}>
                  <div className="w-[62px] h-[62px] bg-[#FFF8F8] border border-[#F9C6D4]/40 rounded-[22px] shadow-[0_4px_12px_rgba(249,198,212,0.3)] flex items-center justify-center text-[#EFA9C2] cursor-pointer active:scale-95 transition-all duration-300 p-2">
                    <svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                      <path d="M10,8 L48,8 L56,16 L56,56 L10,56 Z" fill="#FFF8F8" stroke="#EFA9C2" strokeWidth="1.5"/>
                      <path d="M48,8 L56,16 L48,16 Z" fill="#F5C6D6" opacity="0.6"/>
                      <line x1="18" y1="24" x2="44" y2="24" stroke="#D7B8B8" strokeWidth="1.2" strokeLinecap="round"/>
                      <line x1="18" y1="32" x2="48" y2="32" stroke="#D7B8B8" strokeWidth="1.2" strokeLinecap="round"/>
                      <line x1="18" y1="40" x2="40" y2="40" stroke="#D7B8B8" strokeWidth="1.2" strokeLinecap="round"/>
                      <circle cx="46" cy="48" r="5" fill="#F5C6D6"/>
                    </svg>
                  </div>
                  <span className="text-[11px] font-bold text-[#c65c91] text-center leading-tight">API Hub</span>
                </div>

                <div className="flex flex-col items-center gap-1" onClick={openDiscord}>
                  <div className="w-[62px] h-[62px] bg-[#FFF8F8] border border-[#F9C6D4]/40 rounded-[22px] shadow-[0_4px_12px_rgba(249,198,212,0.3)] flex items-center justify-center cursor-pointer active:scale-95 transition-all duration-300">
                    <svg viewBox="0 0 127.14 96.36" xmlns="http://www.w3.org/2000/svg" className="w-[28px] h-[28px]" fill="#EFA9C2">
                      <path d="M107.7,8.07A105.15,105.15,0,0,0,77.26,0a77.19,77.19,0,0,0-3.3,6.83A96.67,96.67,0,0,0,53.22,6.83,77.19,77.19,0,0,0,49.88,0,105.15,105.15,0,0,0,19.44,8.07C3.66,31.58-1.86,54.65,1,77.53A105.73,105.73,0,0,0,32,96.36a77.7,77.7,0,0,0,6.63-10.85,68.43,68.43,0,0,1-10.5-5c.88-.65,1.72-1.34,2.53-2a75.58,75.58,0,0,0,73,0c.81.71,1.65,1.4,2.53,2a68.44,68.44,0,0,1-10.5,5,77.7,77.7,0,0,0,6.63,10.85,105.73,105.73,0,0,0,31-18.83C129.87,48.55,123.49,25.82,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53s5.14-12.65,11.43-12.65S53.93,46,53.86,53,48.72,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.24,60,73.24,53s5.14-12.65,11.45-12.65S96.16,46,96.1,53,91,65.69,84.69,65.69Z"/>
                    </svg>
                  </div>
                  <span className="text-[11px] font-bold text-[#c65c91] text-center leading-tight">Discord</span>
                </div>

                <div className="flex flex-col items-center gap-1" onClick={openKikokoAnalyzer}>
                  <div className="w-[62px] h-[62px] bg-[#FFF8F8] border border-[#F9C6D4]/40 rounded-[22px] shadow-[0_4px_12px_rgba(249,198,212,0.3)] flex items-center justify-center cursor-pointer active:scale-95 transition-all duration-300 p-1 overflow-hidden">
                    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-[38px] h-[38px]">
                      <path d="M32 14 C18 14, 14 18, 14 32 C14 46, 18 50, 32 50 C46 50, 50 46, 50 32 C50 18, 46 14, 32 14 Z" stroke="#EFA9C2" strokeWidth="2" fill="#FFFBFD"/>
                      <circle cx="32" cy="32" r="14" stroke="#F5C6D6" strokeWidth="1.2" strokeDasharray="3 3"/>
                      <path d="M32 24 C14 16, 12 36, 32 30 Z" fill="#F5C6D6" stroke="#EFA9C2" strokeWidth="1.2"/>
                      <path d="M32 24 C50 16, 52 36, 32 30 Z" fill="#F5C6D6" stroke="#EFA9C2" strokeWidth="1.2"/>
                      <circle cx="32" cy="26" r="4" fill="#EFA9C2" stroke="#FFFFFF" strokeWidth="1"/>
                    </svg>
                  </div>
                  <span className="text-[11px] font-bold text-[#c65c91] text-center leading-tight">Phân tích<br/>Kikoko</span>
                </div>
              </div>
            )}
            {page === 2 && (
              <div className="flex items-center justify-center h-full text-[#c65c91] font-bold text-[13px]">Vợ yêu quẹt sang tiếp nhen 💕</div>
            )}
          </div>
        ))}
      </motion.div>

      {/* Page Indicators */}
      <div className="absolute bottom-[130px] left-0 w-full flex justify-center gap-2 z-10">
        {pages.map(p => (
          <div key={p} className={`w-2 h-2 rounded-full transition-all duration-300 ${currentPage === p ? 'bg-[#ff69b4] w-4 shadow-[0_0_8px_#ff69b4]' : 'bg-[#FFF5FB]/70'}`} />
        ))}
      </div>

      {/* Dock (Non-blur crisp coquette glass) */}
      <div className="absolute bottom-6 left-5 right-5 md:left-1/2 md:-translate-x-1/2 md:w-[90%] md:max-w-md h-[85px] bg-[#FFF8F8]/85 rounded-[30px] flex justify-around items-center px-4 shadow-[0_8px_32px_rgba(245,198,214,0.4)] border border-white/80 z-20">
        <div className="w-[52px] h-[52px] bg-[#FFFDFD] border border-[#F9C6D4]/30 rounded-[18px] shadow-[0_4px_8px_rgba(249,198,212,0.25)] flex items-center justify-center text-[#EFA9C2] active:scale-95 transition-all">
          <Phone size={24} strokeWidth={1.5} />
        </div>
        <div className="w-[52px] h-[52px] bg-[#FFFDFD] border border-[#F9C6D4]/30 rounded-[18px] shadow-[0_4px_8px_rgba(249,198,212,0.25)] flex items-center justify-center text-[#EFA9C2] active:scale-95 transition-all">
          <MessageCircle size={24} strokeWidth={1.5} />
        </div>
        <div className="w-[52px] h-[52px] bg-[#FFFDFD] border border-[#F9C6D4]/30 rounded-[18px] shadow-[0_4px_8px_rgba(249,198,212,0.25)] flex items-center justify-center text-[#EFA9C2] active:scale-95 transition-all">
          <Camera size={24} strokeWidth={1.5} />
        </div>
        <div className="w-[52px] h-[52px] bg-[#FFFDFD] border border-[#F9C6D4]/30 rounded-[18px] shadow-[0_4px_8px_rgba(249,198,212,0.25)] flex items-center justify-center text-[#EFA9C2] active:scale-95 transition-all">
          <ImageIcon size={24} strokeWidth={1.5} />
        </div>
      </div>
    </div>
  );
}
