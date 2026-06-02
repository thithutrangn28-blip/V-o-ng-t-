import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Clock, Pin, Trash2, ChevronRight, FileText, Calendar, Database, User } from 'lucide-react';
import { 
  getBatchesByFeature, 
  getBatchItems, 
  deleteApiBatch, 
  togglePinBatch, 
  ApiFeatureBatch, 
  ApiFeatureBatchItem 
} from '../core/apiHub/tiktokDatabase';

interface BatchHistoryModalProps {
  featureName: string;
  onClose: () => void;
  onSelectBatch?: (items: ApiFeatureBatchItem[]) => void;
  title?: string;
}

export default function BatchHistoryModal({ featureName, onClose, onSelectBatch, title }: BatchHistoryModalProps) {
  const [batches, setBatches] = useState<ApiFeatureBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBatch, setSelectedBatch] = useState<ApiFeatureBatch | null>(null);
  const [items, setItems] = useState<ApiFeatureBatchItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);

  useEffect(() => {
    loadBatches();
  }, [featureName]);

  const loadBatches = async () => {
    setLoading(true);
    try {
      const data = await getBatchesByFeature(featureName);
      setBatches(data);
    } catch (err) {
      console.error("Lỗi khi tải danh sách đợt:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectBatch = async (batch: ApiFeatureBatch) => {
    setSelectedBatch(batch);
    setLoadingItems(true);
    try {
      const batchItems = await getBatchItems(batch.id!);
      setItems(batchItems);
    } catch (err) {
      console.error("Lỗi khi tải chi tiết đợt:", err);
    } finally {
      setLoadingItems(false);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Vợ có chắc muốn xóa đợt này không? Ký ức này sẽ mất đó 💕")) return;
    try {
      await deleteApiBatch(id);
      if (selectedBatch?.id === id) setSelectedBatch(null);
      loadBatches();
    } catch (err) {
      console.error(err);
    }
  };

  const handleTogglePin = async (batch: ApiFeatureBatch, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await togglePinBatch(batch.id!, !batch.isPinned);
      loadBatches();
    } catch (err) {
      console.error(err);
    }
  };

  const handleApplyBatch = () => {
    if (onSelectBatch && items.length > 0) {
      onSelectBatch(items);
      onClose();
    }
  };

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
      className="fixed inset-0 z-[100] flex items-end justify-center sm:p-4 font-sans"
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={onClose} />
      
      <motion.div 
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        className="bg-[#fff6fb] w-full max-w-xl md:rounded-[40px] rounded-t-[40px] shadow-2xl relative z-10 flex flex-col overflow-hidden border-t-2 border-[#ffc4dc]"
        style={{ height: '85%' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-[#ffd2e5] flex justify-between items-center bg-white/60 backdrop-blur-md">
          <div>
            <h3 className="text-xl font-black text-[#c65c91] flex items-center gap-2">
              <Database size={20} className="text-[#ff8fc3]" />
              {title || "Lịch sử Đợt"} 🎀
            </h3>
            <p className="text-[10px] text-[#d8689f] font-bold uppercase tracking-wider mt-0.5">
              Tính năng: {featureName.replace(/_/g, ' ')}
            </p>
          </div>
          <button 
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-[#ffe4f0] text-[#ff8fc3] flex items-center justify-center active:scale-90 transition-all cursor-pointer"
          >
            <X size={20} className="stroke-[3]" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar p-5 pb-24">
          <AnimatePresence mode="wait">
            {!selectedBatch ? (
              <motion.div 
                key="list"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="space-y-3"
              >
                {loading ? (
                  <div className="flex flex-col items-center justify-center py-20 space-y-3">
                    <div className="w-10 h-10 border-4 border-[#ff8fc3] border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-xs text-[#b95486] font-bold italic">Đang lục tìm các đợt lụa cho vợ...</p>
                  </div>
                ) : batches.length === 0 ? (
                  <div className="text-center py-16 px-8 bg-white/50 rounded-[32px] border-2 border-dashed border-[#ffd3e6]">
                    <Clock className="mx-auto text-[#ffd3e6] mb-3" size={48} />
                    <p className="text-sm font-bold text-[#b95486]">Chưa có đợt nào được lưu</p>
                    <p className="text-[11px] text-[#d8689f] mt-2 leading-relaxed">Khi vợ gọi API, chồng sẽ tự động gom thành từng đợt ở đây nhen! 💕</p>
                  </div>
                ) : (
                  batches.map((batch) => (
                    <div 
                      key={batch.id} 
                      onClick={() => handleSelectBatch(batch)}
                      className="bg-white/80 border border-[#ffd2e5] rounded-[24px] p-4 shadow-sm hover:shadow-md transition-all cursor-pointer group relative overflow-hidden"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#ffe3f1] flex items-center justify-center shrink-0 border border-[#ffd2e5]">
                           <span className="text-[#ff8fc3] font-black text-sm">{batch.batchNumber}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start">
                             <h4 className="text-[13px] font-black text-[#c65c91]">Đợt {batch.batchNumber}</h4>
                             <span className="text-[9px] text-[#d8689f] font-bold">{formatDate(batch.createdAt)}</span>
                          </div>
                          <p className="text-[11px] text-[#8a4a6a] font-medium mt-0.5">NPC: <span className="font-bold text-[#c65c91]">{batch.npcName}</span></p>
                          <div className="flex items-center gap-3 mt-2">
                             <span className="text-[9px] bg-[#fff0f7] text-[#ff8fc3] px-2 py-0.5 rounded-full border border-[#ffd2e5] font-bold">
                               {batch.itemCount} NPC/Phần
                             </span>
                             <span className="text-[9px] text-gray-400 font-bold">
                               {batch.totalTokens.toLocaleString()} tokens
                             </span>
                          </div>
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
                    </div>
                  ))
                )}
              </motion.div>
            ) : (
              <motion.div 
                key="detail"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="space-y-4"
              >
                <div className="flex items-center gap-2 mb-4">
                  <button 
                    onClick={() => setSelectedBatch(null)}
                    className="p-2 bg-white rounded-full text-[#c65c91] shadow-sm active:scale-90"
                  >
                    <ChevronRight size={18} className="rotate-180" />
                  </button>
                  <span className="text-sm font-black text-[#c65c91]">Quay lại danh sách</span>
                </div>

                <div className="bg-white/80 p-5 rounded-[32px] border-2 border-[#ffc4dc] shadow-sm">
                   <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                         <div className="w-12 h-12 rounded-full bg-[#ff8fc3] flex items-center justify-center text-white shadow-md font-black">
                            {selectedBatch.batchNumber}
                         </div>
                         <div>
                            <h4 className="text-lg font-black text-[#c65c91]">Đợt {selectedBatch.batchNumber}</h4>
                            <p className="text-[10px] text-[#d8689f] font-bold">{formatDate(selectedBatch.createdAt)}</p>
                         </div>
                      </div>
                      <div className="text-right">
                         <p className="text-[10px] font-bold text-[#b95486] uppercase">Tổng tokens</p>
                         <p className="text-xs font-black text-[#c65c91]">{selectedBatch.totalTokens.toLocaleString()}</p>
                      </div>
                   </div>

                   <div className="bg-[#fff5fb] p-3 rounded-2xl border border-[#ffd2e5] mb-4">
                      <p className="text-[10px] font-bold text-[#d8689f] mb-1">NPC TRONG ĐỢT NÀY</p>
                      <p className="text-sm font-black text-[#8a4a6a]">{selectedBatch.npcName}</p>
                   </div>

                   {selectedBatch.summary && (
                     <div className="bg-[#fff5fb] p-3 rounded-2xl border border-[#ffd2e5] mb-4">
                        <p className="text-[10px] font-bold text-[#d8689f] mb-1 uppercase">Tóm tắt nội dung</p>
                        <p className="text-xs italic text-[#8a4a6a] leading-relaxed">{selectedBatch.summary}</p>
                     </div>
                   )}

                   <div className="space-y-3 mt-6">
                      <p className="text-[11px] font-black text-[#c65c91] uppercase px-1">Danh sách chi tiết ({items.length})</p>
                      {loadingItems ? (
                        <div className="py-10 text-center text-[10px] text-[#b95486] font-bold animate-pulse">Đang trải lụa chi tiết...</div>
                      ) : (
                        <div className="space-y-2 max-h-[300px] overflow-y-auto no-scrollbar pr-1">
                           {items.map((item, idx) => (
                             <div key={idx} className="bg-white p-3 rounded-2xl border border-[#ffd3e6] shadow-sm">
                                <div className="flex items-center gap-2 mb-2">
                                   <div className="w-6 h-6 rounded-full bg-[#ffe4f0] flex items-center justify-center text-[10px] font-black text-[#ff8fc3]">
                                      {idx + 1}
                                   </div>
                                   <p className="text-[11px] font-black text-[#c65c91]">{item.title || 'Phần ' + (idx + 1)}</p>
                                </div>
                                <p className="text-[11px] text-[#8a4a6a] leading-relaxed whitespace-pre-wrap">{item.content}</p>
                             </div>
                           ))}
                        </div>
                      )}
                   </div>

                   {onSelectBatch && items.length > 0 && (
                     <button 
                       onClick={handleApplyBatch}
                       className="w-full mt-8 py-3.5 bg-gradient-to-r from-[#ff8fc3] to-[#ffc7df] text-white font-black text-xs rounded-2xl shadow-lg shadow-[#ff8fc3]/30 active:scale-95 transition-all flex items-center justify-center gap-2"
                     >
                       <FileText size={16} /> Áp dụng đợt này vào màn hình 💕
                     </button>
                   )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
}
