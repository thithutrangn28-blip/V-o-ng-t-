const fs = require('fs');
const file = 'src/components/KikokoTiktokScreen.tsx';
const content = fs.readFileSync(file, 'utf8');

const targetStart = '// -------------------------------------------------------------------------\n// LIVE TAB\n// -------------------------------------------------------------------------';
const targetEnd = '\n// Custom Custom Ribbon / Bow Icon Vector';

const startIndex = content.indexOf(targetStart);
const endIndex = content.indexOf(targetEnd);

const newLiveTab = `// -------------------------------------------------------------------------
// LIVE TAB
// -------------------------------------------------------------------------
function LiveTab({ activeNpc, readMode, activeTab }: { activeNpc: NPCProfile | null, readMode: boolean, activeTab: string }) {
  const { streamCall } = useUniversalApi();
  const [messages, setMessages] = useState<{ id: string, name: string, isHost: boolean, text: string, color?: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [viewers, setViewers] = useState(0);
  const [showGiftSheet, setShowGiftSheet] = useState(false);
  const [rawOutput, setRawOutput] = useState('');
  const chatRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeNpc) {
      setViewers(Math.floor(Math.random() * 5000) + 1000);
      setMessages([{ id: 'start', name: 'System', isHost: false, text: \`\${activeNpc.name} đang chuẩn bị lên sóng! ✨\` }]);
    }
  }, [activeNpc]);

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages, rawOutput]);

  const startLive = async () => {
    if (!activeNpc) return;
    setLoading(true);
    setMessages([]);
    setRawOutput('');

    try {
      const prompt = \`Đây là một buổi livestream TikTok của:
Tên: \${activeNpc.name}
Cốt Truyện: \${activeNpc.story}
Tính Cách: \${activeNpc.hobbies}

Nhiệm vụ: Viết một đoạn chat livestream mô phỏng thực tế. Cả fan hỏi và NPC trả lời xen kẽ nhau. 
Định dạng mỗi dòng (bắt buộc):
Trường hợp 1 (Fan chat): FanName: Nội dung
Trường hợp 2 (NPC trả lời): HOST: Nội dung
Ví dụ:
MeoMeo: Chào chị yêu
HOST: Chào MeoMeo nha, hnay mọi người khoẻ không?
Dài khoảng 30-50 câu thoại. Phân cách bằng dấu xuống dòng.\`;

      const gen = await streamCall([{ role: 'user', content: prompt }], {
        systemPrompt: "Mô phỏng livestream sôi động, nhiều tương tác.",
        maxTokens: 12000
      });

      let accumulated = "";
      for await (const chunk of gen) {
        accumulated += chunk;
        setRawOutput(accumulated);
      }

      setLoading(false);
      
      const lines = accumulated.split('\\n').filter((l: string) => l.trim().length > 0);
      let msgs: any[] = [];
      let i = 0;
      
      const simulateChat = () => {
        if (i < lines.length) {
          const line = lines[i];
          const isHost = line.startsWith('HOST:');
          const [namePart, ...textArr] = line.split(':');
          const text = textArr.join(':').trim();
          
          if (text) {
            msgs = [...msgs, {
              id: \`msg_\${Date.now()}_\${i}\`,
              name: isHost ? activeNpc.name : namePart.trim(),
              isHost,
              text,
              color: \`hsl(\${Math.random() * 360}, 70%, 60%)\`
            }];
            setMessages(msgs);
          }
          i++;
          setTimeout(simulateChat, isHost ? 2000 : 800);
        }
      };
      simulateChat();

    } catch (err: any) {
      alert(err.message);
      setLoading(false);
    }
  };

  const sendGift = (gift: string) => {
    setMessages(prev => [...prev, { id: \`msg_\${Date.now()}\`, name: 'Vợ', isHost: false, text: \`Đã tặng \${gift}! 🎁\`, color: '#ffb3d9' }]);
    setShowGiftSheet(false);
  };

  if (!activeNpc) {
    return (
      <div className="h-[100dvh] bg-black relative flex items-center justify-center p-6 text-center">
        <p className="text-white font-bold text-lg drop-shadow-md z-10">Vợ sang tab Hồ sơ NPC tạo và chọn nhân vật nha 💕</p>
      </div>
    );
  }

  return (
    <div className="h-[100dvh] bg-black relative overflow-hidden">
      {!readMode && <BgUploader tabId={activeTab} />}
      
      {/* Live Background / Video Area */}
      <div className="absolute inset-0 z-0">
        <img src={activeNpc.avatar} className="w-full h-full object-cover blur-[20px] opacity-40 scale-110" alt="bg" />
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

          <div className="flex flex-col items-end gap-2">
            <div className="bg-black/30 backdrop-blur-xl rounded-full px-3 py-1.5 flex items-center gap-1.5 border border-white/5 shadow-lg">
               <User size={12} className="text-white/90" />
              <span className="text-white text-[12px] font-bold drop-shadow-md">{viewers.toLocaleString()}</span>
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
           
           <div ref={chatRef} className="flex-1 overflow-y-auto no-scrollbar space-y-2 pb-3 mask-image-fade content-end">
             {messages.map(msg => (
               <div key={msg.id} className="flex flex-col max-w-[85%]">
                 <div className="inline-flex items-center gap-1.5 mb-0.5">
                   <span className={\`text-[12px] font-black drop-shadow-md \${msg.isHost ? 'text-[#ffb3d9]' : 'text-white/80'}\`} style={!msg.isHost ? {color: msg.color} : {}}>
                     {msg.isHost ? 'HOST ' + msg.name : msg.name}
                   </span>
                 </div>
                 <p className="text-[14px] text-white/95 leading-snug drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                   {msg.text}
                 </p>
               </div>
             ))}
           </div>
           
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
`;

fs.writeFileSync(file, content.substring(0, startIndex) + newLiveTab + content.substring(endIndex));
console.log('Update success');
