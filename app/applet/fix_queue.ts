const fs = require('fs');
let content = fs.readFileSync('src/components/VectorMemoryPanel.tsx', 'utf-8');

// Replace runVectorQueue signature
content = content.replace("const runVectorQueue = async (mode: 'single' | 'all') => {", "const runVectorQueue = async (mode: 'single' | 'all' | 'latest') => {");

// Add 'latest' handling
const singleBlock = `if (mode === 'single') {`;
const latestBlock = `if (mode === 'latest') {
      const validChapters = chapters.filter(c => c.content && c.content.trim().length > 0);
      const chap = validChapters[validChapters.length - 1];
      if (!chap) {
        showAlert('Lỗi', 'Chưa có chương nào có nội dung!', 'error');
        return;
      }
      chaptersToProcess = [chap];
    } else ` + singleBlock;

content = content.replace(singleBlock, latestBlock);

// Now fix the UI buttons. We'll find the Hóa Vector chương hiện tại button block and replace.
const oldButton1 = `<button 
                    onClick={() => {
                      const chap = chapters.find(c => c.id === currentChapterId);
                      if (chap) vectorizeChapter(chap.id, chap.title, chap.content);
                    }}`;
const newButton1 = `<button 
                    onClick={() => runVectorQueue('single')}`;
content = content.replace(oldButton1, newButton1);

const oldSummarizeText = `<div className="text-left font-sans">
                    <h4 className="text-sm">Cập nhật full chương mới nhất</h4>
                    <p className="text-xxs text-[#D18E9B] font-light mt-0.5">Lọc thông tin, lưu summary từ API Proxy</p>
                  </div>`;
const newSummarizeText = `<div className="text-left font-sans">
                    <h4 className="text-sm">Tóm tắt chương mới nhất (AI)</h4>
                    <p className="text-xxs text-[#D18E9B] font-light mt-0.5">Dùng Chat LLM tóm tắt chương cuối</p>
                  </div>`;
content = content.replace(oldSummarizeText, newSummarizeText);

// Also add the new Cập nhật Vector chương mới nhất button
const vectorizeStoryBtn = `<button 
                  onClick={vectorizeEntireStory}
                  disabled={processingProgress.active || summarizingChapterStatus.active}
                  className="p-4 bg-[#F5C6D6] text-white rounded-2xl flex items-center justify-between hover:bg-[#F2B8CC] transition-all font-semibold active:scale-[0.98] disabled:opacity-40"
                >
                  <div className="text-left font-sans">
                    <h4 className="text-sm">Hóa Vector toàn bộ truyện</h4>
                    <p className="text-xxs text-pink-100 font-light mt-0.5">Trải dệt ký ức lụa cho tất cả các chương</p>
                  </div>
                  <TreeDeciduous size={18} />
                </button>`;

const vectorLatestBtn = `<button 
                  onClick={() => runVectorQueue('latest')}
                  disabled={processingProgress.active || summarizingChapterStatus.active}
                  className="p-4 bg-white border border-[#EFA9C2] text-[#EFA9C2] rounded-2xl flex items-center justify-between hover:bg-pink-50 transition-all font-semibold active:scale-[0.98] disabled:opacity-40 shadow-sm"
                >
                  <div className="text-left font-sans">
                    <h4 className="text-sm">Cập nhật Vector chương mới nhất</h4>
                    <p className="text-xxs text-[#D18E9B] font-light mt-0.5">Chỉ dệt mảng nhúng chương cuối cùng</p>
                  </div>
                  <Sparkles size={18} />
                </button>`;
                
content = content.replace(vectorizeStoryBtn, vectorLatestBtn + "\n\n                " + vectorizeStoryBtn);

fs.writeFileSync('src/components/VectorMemoryPanel.tsx', content, 'utf-8');
console.log("Fixed runVectorQueue mode and buttons!");
