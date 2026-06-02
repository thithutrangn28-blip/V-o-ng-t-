import React, { useState, useEffect, useRef } from 'react';
import { Eye, EyeOff, Archive, Save, RefreshCw, AlertTriangle, Play, Settings, Image as ImageIcon, Sparkles, Brain, Clock, ShieldCheck, HeartPulse, Zap, Trash2 } from 'lucide-react';
import { MemoryManager, LongTermMemoryEntry, estimateTokens } from '../services/memoryManager';
import { MEMORY_CONFIG } from '../core/memory/config';
import { saveBackground, loadGlobalBackground } from '../utils/db';
import { compressImage } from '../utils/imageUtils';

interface Props {
  novelId: string;
  story: any;
  apiSettings: any;
  updateStory: (updates: any) => void;
  onClose?: () => void;
}

export default function MemoryManagerTab({ novelId, story, apiSettings, updateStory, onClose }: Props) {
  const [manager] = useState(() => new MemoryManager(novelId));
  const [longTermEntries, setLongTermEntries] = useState<LongTermMemoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [summaryStatus, setSummaryStatus] = useState('');
  const [bg, setBg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Tokens V10 Metrics - Chồng dùng useMemo để máy không phải tính đi tính lại gây lag nhen vợ! 💕
  const TIER1_CORE = 15000; 
  const TOTAL_CAP = 80000; 
  const DANGER_ZONE = 65000; 

  const { currentLtmTotal, estimatedTotal, progressRatio, isOverDanger } = React.useMemo(() => {
    const ltmTotal = longTermEntries
      .filter(e => e.enabled && !e.archived)
      .reduce((sum, e) => sum + estimateTokens(e.content), 0);
    
    const estTotal = TIER1_CORE + ltmTotal + 15000;
    const ratio = Math.min((estTotal / TOTAL_CAP) * 100, 100);
    const danger = estTotal >= DANGER_ZONE;

    return {
      currentLtmTotal: ltmTotal,
      estimatedTotal: estTotal,
      progressRatio: ratio,
      isOverDanger: danger
    };
  }, [longTermEntries, TIER1_CORE, TOTAL_CAP, DANGER_ZONE]);

  useEffect(() => {
    loadMemory();
    loadBg();
  }, [novelId]);

  const loadMemory = async () => {
    setLoading(true);
    const entries = await manager.getLongTermEntries();
    setLongTermEntries(entries);
    setLoading(false);
  };

  const loadBg = async () => {
    const savedBg = await loadGlobalBackground(`ltm_bg_${novelId}`);
    if (savedBg) setBg(savedBg);
  };

  const handleBgUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const b64 = await compressImage(file);
      await saveBackground(`ltm_bg_${novelId}`, b64);
      setBg(b64);
    }
  };

  const toggleLongTermEntry = async (entry: LongTermMemoryEntry) => {
    await manager.updateLongTermEntryStatus(entry.id, !entry.enabled);
    await loadMemory();
  };

  const summarizeAllNow = async () => {
    if (!story.chapters || story.chapters.length === 0) {
      alert('Chưa có chương nào để tóm tắt đâu vợ yêu ơi! 💕');
      return;
    }
    
    setIsSummarizing(true);
    setSummaryStatus('Đang chuẩn bị dữ liệu...');
    
    try {
      await manager.summarizeAllChapters(story.chapters, apiSettings, (msg) => {
        setSummaryStatus(msg);
      });
      await loadMemory();
    } catch (e: any) {
      console.error(e);
      alert(`Vợ ơi, có lỗi khi tóm tắt rồi: ${e.message}`);
    } finally {
      setIsSummarizing(false);
      setSummaryStatus('');
    }
  };

  const cleanUpMemory = async () => {
    setIsSummarizing(true);
    setSummaryStatus('Chồng đang quét dọn rác ký ức cho vợ... 🧹');
    try {
      await manager.pruneInvalidEntries((msg) => setSummaryStatus(msg));
      await new Promise(r => setTimeout(r, 1000));
      await manager.smartContextPruning((msg) => setSummaryStatus(msg));
      await new Promise(r => setTimeout(r, 1000));
      await loadMemory();
    } catch (e: any) {
      console.error(e);
      alert(`Vợ ơi, dọn dẹp bị lỗi rồi: ${e.message}`);
    } finally {
      setIsSummarizing(false);
      setSummaryStatus('');
    }
  };

  const forceCompressAll = async () => {
    setIsSummarizing(true);
    setSummaryStatus('API Proxy: Đang chuẩn bị nén ký ức cốt lõi...');
    try {
      await manager.forceCompressMaster(apiSettings, (msg) => {
        setSummaryStatus(msg);
      });
      await loadMemory();
    } catch (e: any) {
      console.error(e);
      alert(`Vợ ơi, có lỗi khi nén rồi: ${e.message}`);
    } finally {
      setIsSummarizing(false);
      setSummaryStatus('');
    }
  };

  if (loading && longTermEntries.length === 0) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <div className="w-12 h-12 border-4 border-[#F9C6D4] border-t-transparent rounded-full animate-spin" />
      <span className="text-[#D18E9B] font-medium animate-pulse italic">Ký ức đang được sắp xếp cho vợ...</span>
    </div>
  );

  return (
    <div className="relative min-h-full pb-24">
      {/* Background Layer */}
      {bg && (
        <div 
          className="fixed inset-0 z-0 bg-cover bg-center pointer-events-none"
          style={{ backgroundImage: `url(${bg})` }}
        >
          <div className="absolute inset-0 bg-white/80" />
          <div className="absolute inset-0 bg-gradient-to-b from-[#FFF5FB]/90 via-transparent to-[#FFF5FB]/95" />
        </div>
      )}

      <div className="relative z-10 px-4 py-6 space-y-6 max-w-2xl mx-auto">
        <input type="file" ref={fileInputRef} className="hidden" onChange={handleBgUpload} accept="image/*" />

        {/* V10 Header Info */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-[#F9C6D4] rounded-2xl flex items-center justify-center shadow-sm border border-white">
              <Brain size={22} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-black text-[#5C4A4A] tracking-tight">Ký Ức Bánh Nhỏ</h1>
              <p className="text-[10px] uppercase font-bold text-[#D18E9B] tracking-widest">Memory Architecture V10</p>
            </div>
          </div>
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="p-3 bg-white/80 rounded-full border border-[#F9C6D4] text-[#D18E9B] shadow-sm active:scale-95 transition-all"
          >
            <ImageIcon size={20} />
          </button>
        </div>

        {/* CONTEXT WINDOW METER */}
        <div className="bg-white/92 border border-[#F9C6D4] rounded-[32px] p-5 shadow-sm space-y-4">
          <div className="flex justify-between items-end">
            <div className="space-y-1">
              <span className="text-[10px] font-black text-[#D18E9B] uppercase tracking-wider block">Thiết bị lưu trữ</span>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-black text-[#5C4A4A]">{estimatedTotal.toLocaleString()}</span>
                <span className="text-xs font-bold text-[#C79C9C]">/ 80,000 tk</span>
              </div>
            </div>
            <div className={`px-2 py-1 rounded-lg text-[10px] font-bold ${isOverDanger ? 'bg-rose-100 text-rose-500' : (estimatedTotal > 55000 ? 'bg-amber-100 text-amber-600' : 'bg-green-100 text-green-600')}`}>
              {isOverDanger ? '🆘 QUÁ TẢI (DỌN DẸP NGAY)' : (estimatedTotal > 55000 ? '⚠️ CỐI NÉN' : '✨ AN TOÀN')}
            </div>
          </div>

          <div className="h-6 bg-[#F2E6E6] rounded-2xl overflow-hidden shadow-inner border border-white p-1">
             <div 
               className="h-full bg-gradient-to-r from-[#F9C6D4] via-[#FEBFFC] to-[#F9C6D4] rounded-xl transition-all duration-1000 bg-[length:200%_100%] animate-gradient-x"
               style={{ width: `${progressRatio}%` }}
             />
          </div>

          <div className="flex justify-between text-[10px] font-black uppercase text-[#C79C9C]">
            <div className="flex items-center gap-1"><ShieldCheck size={12} /> Cốt lõi: 15K</div>
            <div className="flex items-center gap-1"><HeartPulse size={12} /> Dài hạn: {currentLtmTotal.toLocaleString()}K</div>
            <div className="flex items-center gap-1"><Sparkles size={12} /> Write: 19K Free</div>
          </div>
        </div>

        {/* AUTO-ENGINE TOGGLES */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white/92 border border-[#F9C6D4] rounded-3xl p-4 flex flex-col justify-between gap-3 shadow-sm">
            <div className="flex flex-col">
              <span className="text-[11px] font-black text-[#5C4A4A]">Tóm Tắt Tự Động</span>
              <span className="text-[9px] text-[#C79C9C] italic">Mỗi 3 chương (2500tk)</span>
            </div>
            <button 
              onClick={() => updateStory({ autoSummarize: !story.autoSummarize })}
              className={`w-full py-2 rounded-xl text-[10px] font-black transition-all shadow-sm active:scale-95 ${story.autoSummarize ? 'bg-[#D18E9B] text-white shadow-inner' : 'bg-[#F2E6E6] text-[#C79C9C]'}`}
            >
              {story.autoSummarize ? 'ĐANG CHẠY' : 'ĐÃ DỪNG'}
            </button>
          </div>
          <div className="bg-white/92 border border-[#F9C6D4] rounded-3xl p-4 flex flex-col justify-between gap-3 shadow-sm">
            <div className="flex flex-col">
              <span className="text-[11px] font-black text-[#5C4A4A]">Vòng Lặp 3 Chương</span>
              <span className="text-[9px] text-[#C79C9C] italic">Tự xóa chương cũ thứ 4</span>
            </div>
            <button 
              onClick={() => updateStory({ useMemoryLoop: !story.useMemoryLoop })}
              className={`w-full py-2 rounded-xl text-[10px] font-black transition-all shadow-sm active:scale-95 ${story.useMemoryLoop ? 'bg-[#FEBFFC] text-white shadow-inner' : 'bg-[#F2E6E6] text-[#C79C9C]'}`}
            >
              {story.useMemoryLoop ? 'KÍCH HOẠT' : 'TẮT'}
            </button>
          </div>
        </div>

        {/* RECENT NARRATIVE MEMORY (SLIDING WINDOW) */}
        <div className="space-y-4 px-1 mt-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-[#5C4A4A] flex items-center gap-2">
              <Clock size={16} className="text-[#D18E9B]" /> 
              THẺ TRÍ NHỚ GẦN NHẤT
            </h3>
            <span className="text-[9px] font-bold text-[#C79C9C] italic">Tối đa 3 chương</span>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {story.chapters && story.chapters.length > 0 ? (
              [...story.chapters].slice(-3).reverse().map((chapter: any, idx: number) => {
                const isLatestCard = idx === 0;
                const isOlderCard = idx === 1;
                const isOldestCard = idx === 2;
                const cardLabel = isLatestCard ? "MỚI NHẤT" : isOlderCard ? "CŨ HƠN" : "CŨ NHẤT";
                const cardTagColor = isLatestCard ? "bg-[#FEBFFC] text-white" : isOlderCard ? "bg-[#F9C6D4] text-white" : "bg-[#D6D3D3] text-gray-600";
                const cardStatusLabel = isOldestCard ? (story.useMemoryLoop ? "Sẽ bị xóa khi có chương mới" : "Ký ức cũ nhất") : isOlderCard ? "Đang luân chuyển" : "Mới cập nhật";
                const isCardExpanded = expandedId === chapter.id;
                const isChapterDisabled = story.disabledChapterIds?.includes(chapter.id);

                return (
                  <div 
                    key={chapter.id} 
                    onClick={() => setExpandedId(isCardExpanded ? null : chapter.id)}
                    className={`bg-white/95 border-2 rounded-[32px] p-5 transition-all shadow-sm cursor-pointer relative overflow-hidden group ${isChapterDisabled ? 'opacity-40 grayscale border-dashed border-gray-300' : 'border-[#F9C6D4]'} ${isCardExpanded ? 'ring-2 ring-[#FEBFFC] z-20' : 'hover:border-[#FEBFFC]/50'}`}
                  >
                    <div className="flex justify-between items-center mb-3">
                      <div className="flex items-center gap-2">
                        <span className={`text-[8px] font-black px-2.5 py-1 rounded-full shadow-sm ${cardTagColor}`}>{cardLabel}</span>
                        <h4 className="text-[13px] font-black text-[#5C4A4A] truncate max-w-[150px]">{chapter.title}</h4>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-bold text-[#BEBABA] italic">{cardStatusLabel}</span>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            const currentDisabled = story.disabledChapterIds || [];
                            const newDisabled = isChapterDisabled 
                              ? currentDisabled.filter((id: string) => id !== chapter.id)
                              : [...currentDisabled, chapter.id];
                            updateStory({ disabledChapterIds: newDisabled });
                          }}
                          className="p-1.5 bg-white/50 rounded-full border border-pink-50 text-[#D18E9B] active:scale-90 transition-all hover:bg-white"
                        >
                          {isChapterDisabled ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>
                    
                    <div className={`text-[11px] leading-relaxed text-[#7A6D6D] bg-[#FFF5FB]/40 p-3 rounded-2xl border border-white/50 transition-all duration-300 ${isCardExpanded ? 'max-h-[600px] overflow-y-auto overscroll-contain' : 'line-clamp-3'}`}>
                      {isCardExpanded 
                        ? (chapter.content || "Nội dung chương trống...") 
                        : (chapter.content ? (chapter.content.slice(0, 500) + (chapter.content.length > 500 ? '...' : '')) : "Nội dung chương trống...")}
                    </div>

                    {isCardExpanded && (
                      <div className="mt-3 flex justify-center border-t border-dashed border-[#F9C6D4] pt-2">
                        <span className="text-[9px] font-bold text-[#FEBFFC] animate-pulse flex items-center gap-1">
                          <Brain size={10} /> Chồng đang tối ưu hiển thị, vợ bấm lần nữa để thu gọn nhen 💕
                        </span>
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="text-center py-8 bg-white/40 border border-dashed border-[#F9C6D4] rounded-[24px]">
                 <p className="text-[10px] font-bold text-[#C79C9C] italic">Chương truyện sẽ hiện ở đây khi vợ bắt đầu viết nhen! 💕</p>
              </div>
            )}
          </div>
        </div>

        {/* LONG TERM ENTRIES */}
        <div className="space-y-4 px-1">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-[#5C4A4A] flex items-center gap-2">
              <Archive size={16} className="text-[#D18E9B]" /> 
              THẺ KÝ ỨC TRƯỜNG KỲ
            </h3>
            <div className="flex items-center gap-2">
              <button 
                onClick={summarizeAllNow}
                disabled={isSummarizing}
                className={`px-3 py-1.5 border rounded-xl text-[10px] font-black transition-all shadow-sm flex items-center gap-1 ${isSummarizing ? 'bg-gray-100 border-gray-200 text-gray-400 animate-pulse' : 'bg-[#FFF5FB] border-[#F9C6D4] text-[#D18E9B] hover:bg-[#F9C6D4] hover:text-white'}`}
              >
                <RefreshCw size={12} className={isSummarizing ? 'animate-spin' : ''} /> 
                {isSummarizing ? (summaryStatus || 'Đang tóm tắt...') : 'Tóm Tắt Chương'}
              </button>
              <button 
                onClick={forceCompressAll}
                disabled={isSummarizing || longTermEntries.length < 2}
                className={`px-3 py-1.5 border rounded-xl text-[10px] font-black transition-all shadow-sm flex items-center gap-1 ${isSummarizing || longTermEntries.length < 2 ? 'bg-gray-100 border-gray-200 text-gray-400' : 'bg-[#F4F9FF] border-[#B8D7FF] text-[#5C8DCF] hover:bg-[#B8D7FF] hover:text-white'}`}
                title="Nén toàn bộ thẻ ghi nhớ thành một bản duy nhất qua API Proxy"
              >
                <Zap size={12} className={isSummarizing ? 'animate-pulse' : ''} />
                Nén Cốt Lõi
              </button>
              <button 
                onClick={cleanUpMemory}
                disabled={isSummarizing}
                className={`px-3 py-1.5 border rounded-xl text-[10px] font-black transition-all shadow-sm flex items-center gap-1 ${isSummarizing ? 'bg-gray-100 border-gray-200 text-gray-400' : 'bg-[#FDFCFD] border-[#EACFD5] text-[#777777] hover:bg-[#EACFD5] hover:text-white'}`}
                title="Dọn dẹp rác, thẻ lỗi và tối ưu ngữ cảnh"
              >
                <Trash2 size={12} className={isSummarizing ? 'animate-bounce' : ''} />
                Dọn Dẹp
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {longTermEntries.length === 0 ? (
              <div className="text-center py-12 bg-white/40 border border-dashed border-[#F9C6D4] rounded-[24px]">
                 <p className="text-[10px] font-bold text-[#C79C9C] italic">Ký ức hiện đang rỗng, hãy trò chuyện thêm vợ nhé!</p>
              </div>
            ) : (
              longTermEntries.map((entry) => {
                const isExpanded = expandedId === entry.id;
                return (
                  <div 
                    key={entry.id} 
                    onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                    className={`bg-white/98 border-2 rounded-[28px] p-4 flex flex-col gap-2 transition-all shadow-sm cursor-pointer ${entry.enabled ? 'border-[#F9C6D4]' : 'border-gray-200 opacity-60'} ${isExpanded ? 'ring-2 ring-[#FEBFFC]' : ''}`}
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-6 bg-[#FEBFFC] rounded-full" />
                        <h4 className="text-xs font-black text-[#5C4A4A] truncate max-w-[150px]">{entry.title}</h4>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-bold text-[#D18E9B] bg-[#FFF5FB] px-2 py-0.5 rounded-full">{estimateTokens(entry.content).toLocaleString()} tk</span>
                        <button onClick={(e) => {
                          e.stopPropagation();
                          toggleLongTermEntry(entry);
                        }}>
                          {entry.enabled ? <Eye size={18} className="text-[#FEBFFC]" /> : <EyeOff size={18} className="text-gray-300" />}
                        </button>
                      </div>
                    </div>
                    <div className={`text-[11px] leading-relaxed text-[#777] italic transition-all ${isExpanded ? '' : 'line-clamp-3'}`}>
                      {entry.content}
                    </div>
                    {isExpanded && (
                      <div className="mt-1 text-center border-t border-dashed border-[#F9C6D4] pt-2">
                        <span className="text-[8px] font-bold text-[#D18E9B] italic animate-pulse">Vợ Đường bấm thêm lần nữa để thu nhỏ nhen 💕</span>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* SAFETY ADVISORY */}
        <div className="bg-[#FFF8F8]/92 border border-[#F9C6D4] p-4 rounded-3xl flex gap-3 shadow-sm border-l-4 border-l-[#FEBFFC]">
           <AlertTriangle size={24} className="text-[#FEBFFC] shrink-0" />
           <p className="text-[11px] text-[#8A7D85] leading-relaxed">
             <span className="font-black text-[#5C4A4A] block mb-1">Cơ chế Bảo Vệ MOMENT_LOCK v10:</span>
             Hệ thống sẽ tự động **xoá vĩnh viễn** các thẻ ký ức cũ khi vượt qua con số 3 thẻ gần nhất. Mức trần tuyệt đối là **80,000 tokens** để đảm bảo AI luôn có ít nhất **15,000 - 28,000 tokens** múa bút cho vợ nhen. Chồng bảo vệ tuyệt đối thiết lập gốc của vợ! 💕
           </p>
        </div>
      </div>
    </div>
  );
}

