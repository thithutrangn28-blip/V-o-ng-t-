import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Pin, Trash2, Clock, User, MessageSquare, ChevronRight, X, FileText, Database, Send, Calendar } from 'lucide-react';
import { getApiHistory, getPinnedApiHistory, deleteApiHistory, togglePinHistory, ApiHistoryBatch } from '../utils/dexieDB';

export default function ApiHistoryTab() {
  const [history, setHistory] = useState<ApiHistoryBatch[]>([]);
  const [pinned, setPinned] = useState<ApiHistoryBatch[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBatch, setSelectedBatch] = useState<ApiHistoryBatch | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const all = await getApiHistory();
      const p = await getPinnedApiHistory();
      setHistory(all);
      setPinned(p);
    } catch (err) {
      console.error("Failed to load history:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Vợ có chắc muốn xóa lịch sử này không? 💕")) return;
    try {
      await deleteApiHistory(id);
      loadHistory();
    } catch (err) {
      console.error(err);
    }
  };

  const handleTogglePin = async (batch: ApiHistoryBatch, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await togglePinHistory(batch.id!, !batch.isPinned);
      loadHistory();
    } catch (err) {
      console.error(err);
    }
  };

  const filteredHistory = history.filter(item => {
    const searchLower = searchQuery.toLowerCase();
    return (
      item.featureName.toLowerCase().includes(searchLower) ||
      item.userPrompt.toLowerCase().includes(searchLower) ||
      (item.activeNpc?.name || '').toLowerCase().includes(searchLower) ||
      (item.channelName || '').toLowerCase().includes(searchLower) ||
      item.response.toLowerCase().includes(searchLower)
    );
  });

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
      year: '2-digit'
    });
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      exit={{ opacity: 0 }} 
      className="h-full flex flex-col bg-[#fff6fb]"
    >
      <div className="p-4 space-y-4">
        <h2 className="text-2xl font-black text-[#c65c91] text-center">Cuốn Sổ Lưu Trữ 📖</h2>
        
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#d8689f]" size={16} />
          <input 
            type="text" 
            placeholder="Tìm kiếm theo NPC, nội dung, prompt..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/80 border-2 border-[#ffd3e6] rounded-2xl py-2.5 pl-10 pr-4 text-xs text-[#8a4a6a] outline-none focus:border-[#ff8fc3] transition-all"
          />
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-3">
             <div className="w-10 h-10 border-4 border-[#ff8fc3] border-t-transparent rounded-full animate-spin"></div>
             <p className="text-xs text-[#b95486] font-bold italic">Đang lục tìm ký ức cho vợ...</p>
          </div>
        ) : history.length === 0 ? (
          <div className="text-center py-20 px-8 bg-white/50 rounded-[32px] border-2 border-dashed border-[#ffd3e6]">
            <Database className="mx-auto text-[#ffd3e6] mb-3" size={48} />
            <p className="text-sm font-bold text-[#b95486]">Chưa có lịch sử nào</p>
            <p className="text-[11px] text-[#d8689f] mt-2 leading-relaxed">Mọi đợt vợ gọi API sẽ được chồng ghi lại cẩn thận ở đây nhen! 💕</p>
          </div>
        ) : (
          <div className="space-y-3 pb-32">
            {filteredHistory.map((batch) => (
              <div 
                key={batch.id} 
                onClick={() => setSelectedBatch(batch)}
                className="bg-white/80 backdrop-blur-xl border border-[#ffd2e5] rounded-[24px] p-4 shadow-sm hover:shadow-md transition-all cursor-pointer group relative overflow-hidden"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#ffe4f0] flex items-center justify-center shrink-0 border border-[#ffd2e5]">
                    {batch.activeNpc?.avatar ? (
                      <img src={batch.activeNpc.avatar} className="w-full h-full rounded-full object-cover" alt="npc" />
                    ) : (
                      <Clock size={18} className="text-[#ff8fc3]" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                      <h4 className="text-[13px] font-black text-[#c65c91] truncate">
                        {batch.featureName.replace(/_/g, ' ').toUpperCase()}
                      </h4>
                      <span className="text-[9px] text-[#d8689f] font-bold">{formatDate(batch.createdAt)}</span>
                    </div>
                    <p className="text-[11px] text-[#8a4a6a] font-medium mt-1">NPC: <span className="font-bold">{batch.activeNpc?.name || 'Vô danh'}</span></p>
                    <p className="text-[11px] text-gray-500 line-clamp-1 mt-1 italic">"{batch.userPrompt}"</p>
                  </div>
                  <div className="flex flex-col gap-2">
                    <button 
                      onClick={(e) => handleTogglePin(batch, e)}
                      className={`p-1.5 transition-colors ${batch.isPinned ? 'text-[#ff8fc3]' : 'text-gray-300 hover:text-[#ff8fc3]'}`}
                    >
                      <Pin size={14} className={batch.isPinned ? 'fill-current' : ''} />
                    </button>
                    <button 
                      onClick={(e) => handleDelete(batch.id!, e)}
                      className="p-1.5 text-rose-300 hover:text-rose-500 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                    <ChevronRight size={16} className="text-[#ffd2e5] group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
                
                <div className="mt-3 flex items-center gap-3">
                   <div className="flex items-center gap-1 bg-[#fff0f7] px-2 py-0.5 rounded-full border border-[#ffd3e6]">
                      <FileText size={10} className="text-[#ff8fc3]" />
                      <span className="text-[9px] font-bold text-[#b95486]">{batch.tokenCount.toLocaleString()} tokens</span>
                   </div>
                   <div className="text-[9px] text-gray-400 font-medium">Model: {batch.model}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Batch Details Modal */}
      <AnimatePresence>
        {selectedBatch && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-end justify-center sm:p-4"
            onClick={() => setSelectedBatch(null)}
          >
            <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" />
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="bg-white w-full max-w-xl md:rounded-[40px] rounded-t-[40px] shadow-2xl relative z-10 flex flex-col overflow-hidden"
              style={{ height: '90%' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 pb-20 overflow-y-auto no-scrollbar flex-1">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h3 className="text-xl font-black text-[#c65c91]">Chi tiết đợt gọi API</h3>
                    <p className="text-xs text-[#d8689f] font-bold">{formatDate(selectedBatch.createdAt)}</p>
                  </div>
                  <button 
                    onClick={() => setSelectedBatch(null)}
                    className="w-10 h-10 rounded-full bg-[#ffe4f0] text-[#ff8fc3] flex items-center justify-center active:scale-90 transition-all cursor-pointer"
                  >
                    <X size={20} className="stroke-[3]" />
                  </button>
                </div>

                <div className="space-y-6">
                  {/* Meta Info */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-[#fff0f7] p-3 rounded-2xl border border-[#ffd3e6]">
                      <span className="text-[10px] font-bold text-[#d8689f] uppercase tracking-wider block mb-1">Tính năng</span>
                      <p className="text-[13px] font-black text-[#c65c91]">{selectedBatch.featureName}</p>
                    </div>
                    <div className="bg-[#fff0f7] p-3 rounded-2xl border border-[#ffd3e6]">
                      <span className="text-[10px] font-bold text-[#d8689f] uppercase tracking-wider block mb-1">AI Model</span>
                      <p className="text-[13px] font-black text-[#c65c91] truncate" title={selectedBatch.model}>{selectedBatch.model}</p>
                    </div>
                  </div>

                  {/* NPC Info */}
                  {selectedBatch.activeNpc && (
                    <div className="bg-white border-2 border-[#ffd3e6] p-3 rounded-3xl flex items-center gap-3">
                      <img src={selectedBatch.activeNpc.avatar} className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-sm" alt="ava" />
                      <div>
                        <p className="text-xs font-black text-[#8a4a6a]">{selectedBatch.activeNpc.name}</p>
                        <p className="text-[10px] text-[#d8689f] font-bold">{selectedBatch.activeNpc.job} • {selectedBatch.activeNpc.nationality}</p>
                      </div>
                    </div>
                  )}

                  {/* Prompts */}
                  <div className="space-y-4">
                    <div className="group">
                      <div className="flex items-center gap-2 mb-2 px-1 text-[#d8689f]">
                        <Send size={14} className="stroke-[3]" />
                        <span className="text-[11px] font-black uppercase tracking-widest">Yêu cầu của vợ (Prompt)</span>
                      </div>
                      <div className="bg-[#fff6fb] border border-[#ffd3e6] p-4 rounded-[24px] text-[13px] text-[#8a4a6a] leading-relaxed shadow-inner">
                        {selectedBatch.userPrompt}
                      </div>
                    </div>

                    <div className="group">
                      <div className="flex items-center gap-2 mb-2 px-1 text-[#d8689f]">
                        <Database size={14} className="stroke-[3]" />
                        <span className="text-[11px] font-black uppercase tracking-widest">Hệ thống & Cốt truyện (Context)</span>
                      </div>
                      <div className="bg-[#fff6fb] border border-[#ffd3e6] p-4 rounded-[24px] text-[11px] text-[#8a4a6a] leading-relaxed shadow-inner max-h-[150px] overflow-y-auto no-scrollbar font-mono">
                        {selectedBatch.systemPrompt}
                      </div>
                    </div>

                    <div className="group">
                      <div className="flex items-center gap-2 mb-2 px-1 text-[#c65c91]">
                        <MessageSquare size={14} className="stroke-[3]" />
                        <span className="text-[11px] font-black uppercase tracking-widest">Kết quả AI viết (Response)</span>
                      </div>
                      <div className="bg-white border-2 border-[#ffc4dc] p-5 rounded-[28px] shadow-sm relative">
                        <div className="text-[14px] text-[#5a2e45] leading-relaxed whitespace-pre-wrap font-medium">
                          {selectedBatch.response}
                        </div>
                        <div className="mt-6 pt-4 border-t border-[#ffd3e6] flex justify-between items-center bg-[#fff0f7] -mx-5 -mb-5 px-5 py-3 rounded-b-[26px]">
                           <div className="flex items-center gap-2">
                              <Calendar size={12} className="text-[#ff8fc3]" />
                              <span className="text-[10px] font-bold text-[#b95486]">Dệt lúc {formatDate(selectedBatch.createdAt)}</span>
                           </div>
                           <div className="flex items-center gap-2">
                              <FileText size={12} className="text-[#ff8fc3]" />
                              <span className="text-[10px] font-bold text-[#b95486]">{selectedBatch.tokenCount.toLocaleString()} tokens dệt được</span>
                           </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
