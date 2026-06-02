import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Settings, Shield, HardDrive, Wifi, Eye, EyeOff, Save, Key, Globe, Search, Disc, CheckCircle2, Server, Command, CheckSquare, Sparkles, ChevronLeft, ArrowLeft } from 'lucide-react';
import { encryptApiKey, decryptApiKey, maskApiKey } from '../core/apiHub/keyEncryption';
import { saveConfig, setActiveConfig, getAllConfigs, ApiHubConfig } from '../core/apiHub/configStorage';
import { fetchAvailableModels } from '../utils/apiProxy';

interface KikokoTiktokApiCenterProps {
  onClose: () => void;
}

export default function KikokoTiktokApiCenter({ onClose }: KikokoTiktokApiCenterProps) {
  const [apiType, setApiType] = useState('auto');
  const [endpoint, setEndpoint] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [selectedModel, setSelectedModel] = useState('');
  const [models, setModels] = useState<string[]>([]);
  const [searchModel, setSearchModel] = useState('');
  
  const [isFetchingModels, setIsFetchingModels] = useState(false);
  const [fetchError, setFetchError] = useState('');
  const [fetchSuccess, setFetchSuccess] = useState('');
  
  const [streaming, setStreaming] = useState(true);
  
  // Connection checkboxes
  const connectionModes = [
    { id: 'keep_conn', label: 'Giữ kết nối khi AI đang xử lý', checked: true },
    { id: 'no_close', label: 'Không đóng stream giữa chừng', checked: true },
    { id: 'full_chunk', label: 'Nhận đầy đủ toàn bộ chunk', checked: true },
    { id: 'wait_done', label: 'Chỉ kết thúc khi AI hoàn thành', checked: true },
    { id: 'return_all', label: 'Trả toàn bộ phản hồi về Kikoko Tiktok', checked: true },
    { id: 'stable', label: 'Duy trì kết nối ổn định', checked: true },
  ];

  useEffect(() => {
    // Load existing config specifically for Kikoko Tiktok or fallback to active global
    const loadConfig = async () => {
      const configs = await getAllConfigs();
      let kConfig = configs.find(c => c.id === 'kikoko-tiktok-api');
      
      if (!kConfig) {
        kConfig = configs.find(c => c.isActive);
      }
      
      if (kConfig) {
        setEndpoint(kConfig.endpoint || '');
        if (kConfig.apiKey) {
          const decrypted = await decryptApiKey(kConfig.apiKey);
          setApiKey(decrypted);
        }
        setSelectedModel(kConfig.selectedModel || '');
      }

      const localStr = localStorage.getItem('kikoko-tiktok-api-settings');
      if (localStr) {
        try {
          const p = JSON.parse(localStr);
          if (p.apiType) setApiType(p.apiType);
          if (p.streaming !== undefined) setStreaming(p.streaming);
          if (p.models) setModels(p.models);
        } catch(e) {}
      }
    };
    loadConfig();
  }, []);

  const handleFetchModels = async () => {
    if (!endpoint || !apiKey) {
      setFetchError("Vui lòng nhập Endpoint URL và API Key trước!");
      return;
    }
    
    setIsFetchingModels(true);
    setFetchError('');
    setFetchSuccess('');
    setModels([]);
    
    try {
      const fwModels = await fetchAvailableModels(endpoint, apiKey, true);
      if (fwModels && fwModels.length > 0) {
        setModels(fwModels);
        setFetchSuccess(`Đã tìm thấy ${fwModels.length} models khả dụng!`);
        
        // Cập nhật lại list model vào localStorage
        const localStr = localStorage.getItem('kikoko-tiktok-api-settings');
        const p = localStr ? JSON.parse(localStr) : {};
        p.models = fwModels;
        localStorage.setItem('kikoko-tiktok-api-settings', JSON.stringify(p));
      } else {
        setFetchError("Không có quyền lấy danh sách hoặc không tìm thấy model. Hãy tự nhập tay model!");
      }
    } catch (err: any) {
      setFetchError(err?.message || "Lỗi khi gọi API Proxy. Vui lòng kiểm tra lại đường dẫn và khóa.");
    } finally {
      setIsFetchingModels(false);
    }
  };

  const saveSettings = async () => {
    if (!endpoint || !apiKey || !selectedModel) {
      setFetchError("Không thể lưu: Vui lòng điền đủ Endpoint, Key và Model.");
      return;
    }

    try {
      const encrypted = await encryptApiKey(apiKey);
      const newConfig: ApiHubConfig = {
        id: 'kikoko-tiktok-api',
        name: 'Kikoko Tiktok API',
        endpoint,
        apiKey: encrypted,
        selectedModel,
        isActive: true,
        createdAt: Date.now(),
        generationConfig: {
          maxOutputTokens: 32768,
          temperature: 0.95
        }
      };

      await saveConfig(newConfig);
      await setActiveConfig('kikoko-tiktok-api');
      
      localStorage.setItem('kikoko-tiktok-api-settings', JSON.stringify({
        apiType,
        streaming,
        models
      }));
      
      setFetchSuccess("Đã lưu và áp dụng cấu hình cho toàn bộ Kikoko Tiktok! 💕");
      setTimeout(() => setFetchSuccess(''), 3000);
    } catch (e: any) {
      setFetchError("Lỗi khi lưu cấu hình: " + e.message);
    }
  };

  const filteredModels = models.filter(m => m.toLowerCase().includes(searchModel.toLowerCase()));

  return (
    <motion.div 
      initial={{ opacity: 0, y: '100%' }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="absolute inset-0 z-[100] bg-[#fdfafb] flex flex-col font-sans overflow-hidden"
    >
      {/* Header */}
      <div className="pt-12 pb-4 px-6 bg-white/70 backdrop-blur-xl border-b border-[#ffc7df]/30 flex items-center justify-between sticky top-0 z-20">
        <button onClick={onClose} className="p-2 -ml-2 rounded-full cursor-pointer hover:bg-[#ff8fc3]/10 text-[#b95486] transition-colors active:scale-95">
          <ArrowLeft size={24} />
        </button>
        <div className="flex items-center gap-2">
          <Settings size={18} className="text-[#ff8fc3]" />
          <Sparkles size={16} className="text-[#ffb3d6]" />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar pb-24">
        {/* Tiêu đề */}
        <div className="px-6 py-6 text-center space-y-2">
          <h1 className="text-xl font-extrabold text-[#d8689f] tracking-tight">HỆ THỐNG API KIKOKO TIKTOK</h1>
          <p className="text-[13px] text-[#e08ebb] max-w-[260px] mx-auto leading-relaxed">
            Kết nối AI Model bằng API chính hãng hoặc API Proxy bên thứ 3
          </p>
        </div>

        <div className="px-5 space-y-5">
          
          {/* API TYPE */}
          <div className="bg-white/60 backdrop-blur-md rounded-[24px] p-5 shadow-[0_8px_30px_rgb(255,143,195,0.06)] border border-white">
            <div className="flex items-center gap-2 mb-3">
              <Server size={18} className="text-[#ff8fc3]" />
              <h2 className="text-sm font-bold text-[#b95486]">API TYPE</h2>
            </div>
            <div className="relative">
              <select
                value={apiType}
                onChange={e => setApiType(e.target.value)}
                className="w-full appearance-none bg-[#fff5fb] border border-[#ffc7df] text-[#b95486] text-sm rounded-2xl px-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-[#ff8fc3]/50 focus:border-[#ff8fc3] font-medium transition-all"
              >
                <option value="auto">Auto Detect</option>
                <option value="openai">OpenAI-Compatible</option>
                <option value="claude">Claude Anthropic</option>
                <option value="gemini">Gemini</option>
                <option value="custom">Custom Endpoint</option>
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-[#ff8fc3]">
                <ChevronLeft size={18} className="rotate-[-90deg]" />
              </div>
            </div>
          </div>

          {/* ENDPOINT URL */}
          <div className="bg-white/60 backdrop-blur-md rounded-[24px] p-5 shadow-[0_8px_30px_rgb(255,143,195,0.06)] border border-white">
            <div className="flex items-center gap-2 mb-3">
              <Globe size={18} className="text-[#ff8fc3]" />
              <h2 className="text-sm font-bold text-[#b95486]">ENDPOINT URL</h2>
            </div>
            <input
              type="text"
              value={endpoint}
              onChange={e => setEndpoint(e.target.value)}
              placeholder="https://your-api-proxy.com/v1"
              className="w-full bg-[#fff5fb] border border-[#ffc7df] text-[#c96998] placeholder-[#f5b8d4] text-sm rounded-2xl px-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-[#ff8fc3]/50 focus:border-[#ff8fc3] font-medium transition-all"
            />
            <div className="mt-4 bg-[#fffafc] rounded-xl p-3 border border-[#ffebf3] text-[11px] text-[#e08ebb] space-y-1 leading-relaxed">
              <p className="font-semibold text-[#c96998]">Hỗ trợ:</p>
              <ul className="list-disc pl-4 space-y-0.5">
                <li>Base URL</li>
                <li>Full path (/chat/completions)</li>
                <li>Có /v1 hoặc không</li>
                <li>API Proxy riêng cho Kikoko Tiktok</li>
              </ul>
            </div>
          </div>

          {/* API KEY */}
          <div className="bg-white/60 backdrop-blur-md rounded-[24px] p-5 shadow-[0_8px_30px_rgb(255,143,195,0.06)] border border-white">
            <div className="flex items-center gap-2 mb-3">
              <Key size={18} className="text-[#ff8fc3]" />
              <h2 className="text-sm font-bold text-[#b95486]">API KEY</h2>
            </div>
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                placeholder="sk-..."
                className="w-full bg-[#fff5fb] border border-[#ffc7df] text-[#c96998] placeholder-[#f5b8d4] text-[13px] rounded-2xl px-4 py-3.5 pr-12 focus:outline-none focus:ring-2 focus:ring-[#ff8fc3]/50 focus:border-[#ff8fc3] tracking-wide transition-all font-mono"
              />
              <button 
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full text-[#ff8fc3] hover:bg-[#ffe4f0] transition-colors"
              >
                {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <div className="mt-3 text-[11px] text-[#e08ebb] px-1">
              Hỗ trợ: sk- • Bearer • JWT • AIza • Custom Key
            </div>
          </div>

          {/* MODEL */}
          <div className="bg-white/60 backdrop-blur-md rounded-[24px] p-5 shadow-[0_8px_30px_rgb(255,143,195,0.06)] border border-white">
            <div className="flex items-center gap-2 mb-3">
              <Disc size={18} className="text-[#ff8fc3]" />
              <h2 className="text-sm font-bold text-[#b95486]">MODEL</h2>
            </div>

            <input
              type="text"
              value={selectedModel}
              onChange={e => setSelectedModel(e.target.value)}
              placeholder="VD: gemini-2.5-pro, gpt-4o..."
              className="w-full bg-[#fff5fb] border border-[#ffc7df] text-[#c96998] placeholder-[#f5b8d4] text-sm rounded-2xl px-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-[#ff8fc3]/50 focus:border-[#ff8fc3] font-medium transition-all mb-4"
            />
            
            <button 
              onClick={handleFetchModels}
              disabled={isFetchingModels}
              className="w-full bg-gradient-to-r from-[#ff8fc3] to-[#ffb3d6] text-white font-bold text-sm rounded-2xl py-3.5 px-4 shadow-[0_4px_15px_rgb(255,143,195,0.3)] hover:shadow-[0_6px_20px_rgb(255,143,195,0.4)] active:scale-[0.98] transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isFetchingModels ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  ĐANG KẾT NỐI API...
                </>
              ) : (
                <>
                  <Search size={16} />
                  LẤY DANH SÁCH MODEL
                </>
              )}
            </button>
            
            {isFetchingModels && (
               <div className="mt-4 bg-[#fff5fb] border border-[#ffc7df] rounded-xl p-4 text-[11px] text-[#c96998] flex flex-col items-center justify-center animate-pulse text-center">
                 <p className="font-bold mb-1">ĐANG KIỂM TRA API...</p>
                 <p>• Xác thực API key</p>
                 <p>• Kết nối endpoint</p>
                 <p>• Đồng bộ model khả dụng</p>
                 <p className="mt-2 text-[#ff8fc3]">Vui lòng chờ vợ yêu nhé... 💕</p>
               </div>
            )}

            {models.length > 0 && !isFetchingModels && (
              <div className="mt-4 pt-4 border-t border-[#ffebf3]">
                <div className="relative mb-3">
                  <input
                    type="text"
                    value={searchModel}
                    onChange={e => setSearchModel(e.target.value)}
                    placeholder="Tìm model..."
                    className="w-full bg-white border border-[#ffc7df] text-[#b95486] placeholder-[#f5b8d4] text-xs rounded-xl pl-9 pr-4 py-2.5 outline-none focus:border-[#ff8fc3] transition-colors"
                  />
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#ffb3d6]" />
                </div>
                
                <div className="max-h-[220px] overflow-y-auto no-scrollbar space-y-1.5 custom-scroll">
                  {filteredModels.map((m) => (
                    <div 
                      key={m} 
                      onClick={() => setSelectedModel(m)}
                      className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${
                        selectedModel === m 
                          ? 'bg-[#ff8fc3]/10 border border-[#ff8fc3]/30 text-[#d8689f]' 
                          : 'bg-white border border-[#ffebf3] hover:bg-[#fff5fb] text-[#c96998]'
                      }`}
                    >
                      <div className={`w-3.5 h-3.5 rounded-full border-[1.5px] flex items-center justify-center ${selectedModel === m ? 'border-[#ff8fc3]' : 'border-[#ffc7df]'}`}>
                         {selectedModel === m && <div className="w-1.5 h-1.5 bg-[#ff8fc3] rounded-full"></div>}
                      </div>
                      <span className="text-[13px] font-medium break-all">{m}</span>
                    </div>
                  ))}
                  {filteredModels.length === 0 && (
                    <div className="text-center py-4 text-xs text-[#e08ebb]">
                      Không tìm thấy model nào phù hợp.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* CONNECTION MODES */}
          <div className="bg-white/60 backdrop-blur-md rounded-[24px] p-5 shadow-[0_8px_30px_rgb(255,143,195,0.06)] border border-white">
            <div className="flex items-center gap-2 mb-4">
              <Command size={18} className="text-[#ff8fc3]" />
              <h2 className="text-sm font-bold text-[#b95486]">CHẾ ĐỘ KẾT NỐI</h2>
            </div>
            <div className="space-y-3">
              {connectionModes.map(cm => (
                <div key={cm.id} className="flex items-start gap-3">
                  <div className="mt-0.5 text-[#ff8fc3] shrink-0">
                    <CheckSquare size={16} className="fill-[#fff5fb]" />
                  </div>
                  <span className="text-xs text-[#c96998] font-medium">{cm.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* STREAM RESPONSE */}
          <div className="bg-white/60 backdrop-blur-md rounded-[24px] p-5 shadow-[0_8px_30px_rgb(255,143,195,0.06)] border border-white">
            <div className="flex items-center gap-2 mb-4">
              <Wifi size={18} className="text-[#ff8fc3]" />
              <h2 className="text-sm font-bold text-[#b95486]">STREAM RESPONSE</h2>
            </div>
            
            <label className="flex items-center gap-3 cursor-pointer p-3 bg-white border border-[#ffebf3] rounded-xl hover:bg-[#fff5fb] transition-colors mb-4">
              <div className={`w-5 h-5 rounded border ${streaming ? 'bg-[#ff8fc3] border-[#ff8fc3]' : 'bg-white border-[#ffc7df]'} flex items-center justify-center transition-colors`}>
                {streaming && <CheckCircle2 size={14} className="text-white" />}
              </div>
              <span className="text-sm font-bold text-[#b95486]">Bật stream realtime</span>
              <input type="checkbox" className="hidden" checked={streaming} onChange={e => setStreaming(e.target.checked)} />
            </label>

            <div className="bg-[#fffafc] rounded-xl p-4 border border-[#ffebf3] space-y-3">
              <div className="space-y-1.5">
                <p className="text-[11px] font-bold text-[#ff8fc3]">Khi bật:</p>
                <div className="space-y-1">
                   <p className="text-[11px] text-[#e08ebb] flex gap-2"><span>☑</span> Stream từng chunk realtime</p>
                   <p className="text-[11px] text-[#e08ebb] flex gap-2"><span>☑</span> Tự ghép chunk hoàn chỉnh</p>
                   <p className="text-[11px] text-[#e08ebb] flex gap-2"><span>☑</span> Hiển thị dần nội dung sinh ra</p>
                </div>
              </div>
              <div className="h-[1px] bg-[#ffebf3]"></div>
              <div className="space-y-1.5">
                <p className="text-[11px] font-bold text-[#ff8fc3]">Khi tắt:</p>
                <div className="space-y-1">
                   <p className="text-[11px] text-[#e08ebb] flex gap-2"><span>☑</span> Chờ AI hoàn thành toàn bộ</p>
                   <p className="text-[11px] text-[#e08ebb] flex gap-2"><span>☑</span> Trả kết quả đầy đủ một lần</p>
                </div>
              </div>
            </div>
          </div>

          {/* SAVE & RESTORE */}
          <div className="bg-gradient-to-b from-white/80 to-[#fff5fb]/80 backdrop-blur-md rounded-[24px] p-5 shadow-[0_8px_30px_rgb(255,143,195,0.06)] border border-[#ffc7df]/20">
            <div className="flex items-center gap-2 mb-4">
              <HardDrive size={18} className="text-[#ff8fc3]" />
              <h2 className="text-sm font-bold text-[#b95486]">SAVE & RESTORE</h2>
            </div>
            
            <div className="grid grid-cols-2 gap-x-2 gap-y-2 mb-5">
              <div className="text-[10px] text-[#c96998] flex items-center gap-1.5"><CheckCircle2 size={12} className="text-[#ffb3d6]"/> Lưu cấu hình API</div>
              <div className="text-[10px] text-[#c96998] flex items-center gap-1.5"><CheckCircle2 size={12} className="text-[#ffb3d6]"/> Không mất model</div>
              <div className="text-[10px] text-[#c96998] flex items-center gap-1.5"><CheckCircle2 size={12} className="text-[#ffb3d6]"/> Tự khôi phục khi mở</div>
              <div className="text-[10px] text-[#c96998] flex items-center gap-1.5"><CheckCircle2 size={12} className="text-[#ffb3d6]"/> Lưu lịch sử kết nối</div>
              <div className="text-[10px] text-[#c96998] flex items-center gap-1.5 col-span-2"><CheckCircle2 size={12} className="text-[#ffb3d6]"/> Lưu riêng cấu hình cho Kikoko Tiktok</div>
            </div>

            {fetchError && (
              <div className="p-3 bg-red-50 text-red-500 text-xs rounded-xl border border-red-100 mb-4 whitespace-pre-wrap">
                {fetchError}
              </div>
            )}
            
            {fetchSuccess && (
              <div className="p-3 bg-green-50 text-green-600 font-medium text-xs rounded-xl border border-green-100 mb-4 text-center shadow-sm">
                {fetchSuccess}
              </div>
            )}

            <button
              onClick={saveSettings}
              className="w-full bg-[#ff8fc3] text-white font-bold text-sm rounded-2xl py-3.5 px-4 shadow-[0_4px_15px_rgb(255,143,195,0.3)] hover:shadow-[0_6px_20px_rgb(255,143,195,0.4)] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              <Save size={18} />
              LƯU & ÁP DỤNG CHO TOÀN BỘ TIKTOK APP
            </button>
          </div>

        </div>
      </div>
    </motion.div>
  );
}
