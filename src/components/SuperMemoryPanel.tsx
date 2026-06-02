import React, { useMemo, useState, useRef } from "react";
import "./SuperMemoryPanel.css";
import { ArrowLeft } from 'lucide-react';
import { compressImage } from '../utils/imageUtils';

export type ChapterSummary = {
  chapterNumber: number;
  title?: string;
  tokenEstimate: number;
  date?: string;
  weather?: string;
  timeRange?: string;
  characters?: string;
  emotions?: string;
  mainEvent?: string;
  romanceLine?: string;
  decisions?: string;
  finalScene?: string;
  notes?: string;
  createdAt: string;
  summaryText: string;
};

type SuperMemoryPanelProps = {
  isOpen: boolean;
  onClose: () => void;
  summaries: ChapterSummary[];
  autoMode: boolean;
  onToggleAutoMode: () => void;
  onSummarizeLatestChapter: () => Promise<void>;
  onUpdateSummary: (chapterNumber: number, data: Partial<ChapterSummary>) => void;
  usedImages: string[];
};

export default function SuperMemoryPanel({
  isOpen,
  onClose,
  summaries,
  autoMode,
  onToggleAutoMode,
  onSummarizeLatestChapter,
  onUpdateSummary,
  usedImages,
}: SuperMemoryPanelProps) {
  // Lấy ảnh nền từ localStorage
  const [bgUrl, setBgUrl] = useState(() => {
    return localStorage.getItem('kikoko_super_memory_bg') || '';
  });

  const [showGallery, setShowGallery] = useState(false);
  const bgInputRef = useRef<HTMLInputElement>(null);

  const handleSetBgClick = () => {
    bgInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const compressed = await compressImage(file);
        setBgUrl(compressed);
        localStorage.setItem('kikoko_super_memory_bg', compressed);
      } catch (err) {
        console.error(err);
      }
    }
    e.target.value = '';
  };

  // Remove background on right click / long press, or could just provide a button. For now let's add a clear button or if they cancel. (We will just let they set it).
  // Or:
  const handleClearBg = () => {
    if (window.confirm('Vợ muốn xoá ảnh nền Siêu Trí Nhớ?')) {
      setBgUrl('');
      localStorage.removeItem('kikoko_super_memory_bg');
    }
  };

  // BẮT BUỘC SẮP XẾP: lấy 5 chương gần nhất có tóm tắt
  const latestFive = useMemo(() => {
    return [...summaries]
      .filter(item => item.summaryText && item.summaryText.trim().length > 0)
      .sort((a, b) => b.chapterNumber - a.chapterNumber)
      .slice(0, 5);
  }, [summaries]);

  // Luôn update tab active khi latestFive thay đổi, nếu activeChapter k tồn tại thì mồi bằng newest
  const [activeChapter, setActiveChapter] = useState<number | null>(
    latestFive.length > 0 ? latestFive[0]?.chapterNumber : null
  );

  const activeSummary =
    latestFive.find((item) => item.chapterNumber === activeChapter) ??
    latestFive[0];

  const [activeMenu, setActiveMenu] = useState('overview');
  const [isSummarizing, setIsSummarizing] = useState(false);

  if (!isOpen) return null;

  const handleSummarize = async () => {
    if (isSummarizing) return;
    setIsSummarizing(true);
    try {
      await onSummarizeLatestChapter();
    } catch (error) {
      console.error(error);
    } finally {
      setIsSummarizing(false);
    }
  };

  const handleCopy = () => {
    if (activeSummary?.summaryText) {
      navigator.clipboard.writeText(activeSummary.summaryText)
        .then(() => alert("Đã sao chép tóm tắt vào bộ nhớ tạm! 💕"))
        .catch(() => alert("Lỗi sao chép :("));
    }
  };

  const handleDelete = () => {
    if (activeSummary?.chapterNumber !== undefined) {
      if (window.confirm("Vợ có chắc muốn xóa tóm tắt này không? (Để hệ thống có thể tạo lại khi viết thêm)")) {
        onUpdateSummary(activeSummary.chapterNumber, { summaryText: '' });
      }
    }
  };

  return (
    <div 
      className="memoryOverlay"
      style={{
        backgroundImage: bgUrl ? `url(${bgUrl})` : 'none',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed'
      }}
    >
      <div 
        className="memoryScreen"
        style={{
          background: bgUrl ? 'var(--white-85, rgba(255, 255, 255, 0.85))' : ''
        }}
      >
        <header className="memoryHeader">
          <button className="iconButton" onClick={onClose}><ArrowLeft size={24} /></button>

          <div className="memoryTitleBlock">
            <h1>🧠 SIÊU TRÍ NHỚ ✨</h1>
            <p>Ghi nhớ tối ưu — Tóm tắt siêu thông minh</p>
          </div>

          <div style={{ display: 'flex', gap: '6px', alignItems: 'center', justifyContent: 'flex-end' }}>
            <input type="file" accept="image/*" ref={bgInputRef} onChange={handleFileChange} style={{ display: 'none' }} />
            <button className="iconButton" onClick={() => setShowGallery(true)} title="Thư viện ảnh" style={{ width: '32px', height: '32px', fontSize: '18px' }}>🌸</button>
            <button className="iconButton" onClick={handleSetBgClick} title="Tải ảnh lên" style={{ width: '32px', height: '32px', fontSize: '18px' }}>🖼️</button>
            {bgUrl && <button className="iconButton" onClick={handleClearBg} title="Xóa nền" style={{ width: '32px', height: '32px', fontSize: '18px' }}>🗑️</button>}
            <button className="historyButton">▣</button>
          </div>
        </header>

        {showGallery && (
          <div className="gallery-mini-modal" onClick={() => setShowGallery(false)}>
            <div className="gallery-mini-content" onClick={e => e.stopPropagation()}>
              <div className="gallery-mini-header">
                <h3>Thư viện ảnh của vợ</h3>
                <button onClick={() => setShowGallery(false)}>✕</button>
              </div>
              <div className="gallery-mini-grid">
                {usedImages.length > 0 ? (
                  usedImages.map((url, idx) => (
                    <button 
                      key={idx} 
                      className="gallery-mini-item"
                      onClick={() => {
                        setBgUrl(url);
                        localStorage.setItem('kikoko_super_memory_bg', url);
                        setShowGallery(false);
                      }}
                    >
                      <img src={url} alt="Gallery" referrerPolicy="no-referrer" />
                    </button>
                  ))
                ) : (
                  <p className="empty-text">Chưa có ảnh nào trong thư viện nhen vợ!</p>
                )}
              </div>
            </div>
          </div>
        )}

        <section className="memoryHeroCard">
          <div className="brainVisual">🧠</div>

          <div className="heroContent">
            <div className="heroTopLine">
              <h2>MEMORY 5 CHƯƠNG GẦN NHẤT</h2>
              <span className="pill">90.000 token</span>
            </div>

            <p className="heroDesc">
              5 tab chỉ xếp thứ tự các chương gần nhất. API Proxy chỉ tóm tắt
              chương mới vừa viết xong, không tóm tắt lại toàn bộ 5 chương.
            </p>

            <div className="statsGrid">
              <div className="statBox">
                <strong>{latestFive.length}</strong>
                <span>Chương đang nhớ</span>
              </div>
              <div className="statBox">
                <strong>{latestFive.reduce((acc, curr) => acc + (curr.tokenEstimate || 0), 0).toLocaleString()}</strong>
                <span>Token ước tính</span>
              </div>
              <div className="statBox">
                <strong>~60-80K</strong>
                <span>Ký tự VN</span>
              </div>
              <div className="statBox">
                <strong>100%</strong>
                <span>Mạch truyện</span>
              </div>
            </div>
          </div>
        </section>

        <section className="autoCard">
          <div>
            <strong>🛡️ Siêu trí nhớ đang hoạt động</strong>
            <p>Tự động tóm tắt chương mới sau khi viết xong</p>
          </div>

          <label className="switch">
            <input
              type="checkbox"
              checked={autoMode}
              onChange={onToggleAutoMode}
            />
            <span />
          </label>
        </section>

        <section className="chapterTabs">
          {latestFive.map((summary, index) => (
            <button
              key={summary.chapterNumber}
              className={
                summary.chapterNumber === activeSummary?.chapterNumber
                  ? "chapterTab active"
                  : "chapterTab"
              }
              onClick={() => setActiveChapter(summary.chapterNumber)}
            >
              <b>{index + 1}</b>
              <span>Chương {summary.chapterNumber}</span>
              {index === 0 && <small>Mới nhất</small>}
            </button>
          ))}
        </section>

        {activeSummary ? (
          <section className="summaryCard">
            <div className="summaryHeader">
              <h2>TÓM TẮT CHƯƠNG {activeSummary.chapterNumber}</h2>
              <span className="pill">{activeSummary.tokenEstimate?.toLocaleString() || 6000} token</span>
            </div>

            <div className="summaryBody">
              <aside className="summaryMenu">
                <button className={activeMenu === 'overview' ? 'active' : ''} onClick={() => setActiveMenu('overview')}>⌂ Tổng quan</button>
                <button className={activeMenu === 'characters' ? 'active' : ''} onClick={() => setActiveMenu('characters')}>♡ Nhân vật</button>
                <button className={activeMenu === 'romance' ? 'active' : ''} onClick={() => setActiveMenu('romance')}>♡ Tuyến tình cảm</button>
                <button className={activeMenu === 'events' ? 'active' : ''} onClick={() => setActiveMenu('events')}>▣ Sự kiện chính</button>
                <button className={activeMenu === 'decisions' ? 'active' : ''} onClick={() => setActiveMenu('decisions')}>◇ Quyết định</button>
                <button className={activeMenu === 'final' ? 'active' : ''} onClick={() => setActiveMenu('final')}>△ Phân đoạn cuối</button>
                <button className={activeMenu === 'context' ? 'active' : ''} onClick={() => setActiveMenu('context')}>☼ Bối cảnh & Thời tiết</button>
                <button className={activeMenu === 'notes' ? 'active' : ''} onClick={() => setActiveMenu('notes')}>✎ Ghi chú quan trọng</button>
                <button className={activeMenu === 'full' ? 'active' : ''} onClick={() => setActiveMenu('full')}>👁 Đầy đủ Full Text</button>
              </aside>

              <main className="summaryDetail">
                {activeMenu === 'overview' && (
                  <>
                    <InfoRow label="Ngày tháng" value={activeSummary.date || "Chưa có"} />
                    <InfoRow label="Thời tiết" value={activeSummary.weather || "Chưa có"} />
                    <InfoRow label="Thời gian" value={activeSummary.timeRange || "Chưa có"} />
                    <div className="largeInfoBox">
                      <h3>Cảm xúc chung</h3>
                      <p>{activeSummary.emotions || "Chưa có"}</p>
                    </div>
                  </>
                )}
                {activeMenu === 'characters' && (
                  <div className="largeInfoBox">
                    <h3>Nhân vật & Tâm lý</h3>
                    <p>{activeSummary.characters || "Chưa có"}</p>
                  </div>
                )}
                {activeMenu === 'romance' && (
                  <div className="largeInfoBox">
                    <h3>Tuyến tình cảm</h3>
                    <p>{activeSummary.romanceLine || "Chưa có"}</p>
                  </div>
                )}
                {activeMenu === 'events' && (
                  <div className="largeInfoBox">
                    <h3>Sự kiện chính</h3>
                    <p>{activeSummary.mainEvent || "Chưa có nội dung tóm tắt."}</p>
                  </div>
                )}
                {activeMenu === 'decisions' && (
                  <div className="largeInfoBox">
                    <h3>Quyết định</h3>
                    <p>{activeSummary.decisions || "Chưa có"}</p>
                  </div>
                )}
                {activeMenu === 'final' && (
                  <div className="largeInfoBox">
                    <h3>Phân đoạn cuối để nối chương sau</h3>
                    <p>{activeSummary.finalScene || "Chưa có phân đoạn cuối."}</p>
                  </div>
                )}
                {activeMenu === 'context' && (
                  <div className="largeInfoBox">
                    <h3>Ghi chú bối cảnh</h3>
                    <p>Thời tiết: {activeSummary.weather || "Chưa có"}</p>
                    <p>Thời gian: {activeSummary.timeRange || "Chưa có"}</p>
                  </div>
                )}
                {activeMenu === 'notes' && (
                  <div className="largeInfoBox">
                    <h3>Ghi chú quan trọng</h3>
                    <p>{activeSummary.notes || "Chưa có"}</p>
                  </div>
                )}
                {activeMenu === 'full' && (
                  <div className="largeInfoBox">
                    <h3>Raw Summary Text (AI Output)</h3>
                    <p>{activeSummary.summaryText || "Chưa có"}</p>
                  </div>
                )}
              </main>
            </div>

            <div className="summaryActions">
              <button onClick={handleCopy}>⧉ Sao chép tóm tắt</button>
              <button className="primary" onClick={() => setActiveMenu('full')}>👁 Xem đầy đủ</button>
              <button onClick={handleDelete} style={{ color: '#e94f8d', borderColor: '#ffd0e2', backgroundColor: 'transparent' }} title="Xóa bỏ tóm tắt này">🗑️ Xoá bỏ</button>
            </div>
          </section>
        ) : (
          <section className="emptyCard">
            <h2>Chưa có chương nào được tóm tắt</h2>
            <p>Hãy viết xong chương đầu tiên rồi gọi API Proxy để tạo bộ nhớ.</p>
          </section>
        )}

        <section className="flowCard">
           <h2>CƠ CHẾ HOẠT ĐỘNG</h2>

          <div className="flowSteps">
            <FlowStep icon="📄" text="Viết xong chương mới" />
            <FlowStep icon="🚀" text="Gọi API Proxy 1 lần" />
            <FlowStep icon="🧠" text="AI tóm tắt chương mới" />
            <FlowStep icon="💾" text="Lưu vào tab mới nhất" />
            <FlowStep icon="🔁" text="Đẩy tab cũ & loại chương cũ nhất" />
          </div>
        </section>

        <section className="noteGrid">
          <div className="noteCard">
            <h3>ƯU ĐIỂM</h3>
            <p>✓ Giảm tải Context</p>
            <p>✓ Không quên tình tiết quan trọng</p>
            <p>✓ Giữ mạch truyện liền mạch</p>
            <p>✓ Chỉ gọi API khi có chương mới</p>
          </div>

          <div className="noteCard warning">
            <h3>LƯU Ý QUAN TRỌNG</h3>
            <p>⚠ Không gửi nguyên chương cũ vào Context</p>
            <p>⚠ 5 tab chỉ là thứ tự bộ nhớ gần nhất</p>
            <p>⚠ API chỉ tóm tắt chương mới vừa viết xong</p>
            <p>⚠ Nếu vượt 5 chương, chương cũ nhất bị loại</p>
          </div>
        </section>

        <section className="proxyCard">
          <h2>API PROXY — KẾT NỐI ỔN ĐỊNH</h2>

          <div className="proxySteps">
            <FlowStep icon="🔗" text="Giữ liên tục" />
            <FlowStep icon="📡" text="Duy trì luồng" />
            <FlowStep icon="🧩" text="Không ngắt" />
            <FlowStep icon="📥" text="Nhận đủ" />
            <FlowStep icon="✅" text="Xác thực" />
          </div>

          <button 
            className="bigApiButton" 
            onClick={handleSummarize}
            disabled={isSummarizing}
          >
            {isSummarizing ? "ĐANG TÓM TẮT... 🧠" : "🚀 Gọi API Proxy — Tóm tắt chương mới nhất"}
          </button>

          <p className="apiHint">
            Chỉ 1 lần gọi API cho chương mới. Không tóm tắt lại toàn bộ 5 chương.
          </p>
        </section>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="infoRow">
      <strong>{label}</strong>
      <span>{value}</span>
    </div>
  );
}

function FlowStep({ icon, text }: { icon: string; text: string }) {
  return (
    <div className="flowStep">
      <div className="flowIcon">{icon}</div>
      <span>{text}</span>
    </div>
  );
}
