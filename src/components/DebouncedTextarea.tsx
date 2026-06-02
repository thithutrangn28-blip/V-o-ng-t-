import React, { useState, useEffect, useRef } from 'react';

interface DebouncedTextareaProps extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'value' | 'onChange'> {
  value: string;
  onDebounceChange: (val: string) => void;
  debounceMs?: number;
  onPasteProcessing?: (isProcessing: boolean) => void;
}

export const DebouncedTextarea: React.FC<DebouncedTextareaProps> = ({ 
  value, 
  onDebounceChange, 
  debounceMs = 1000, 
  onPasteProcessing,
  ...props 
}) => {
  const [localValue, setLocalValue] = useState(value);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newVal = e.target.value;
    setLocalValue(newVal);

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      onDebounceChange(newVal);
    }, debounceMs);
  };

  const handlePaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const pasteData = e.clipboardData.getData('text/plain');
    if (pasteData.length > 20000) { // Từ 20,000 ký tự là dán dạt dào async hăm nhen vợ!
      e.preventDefault();
      const target = e.target as HTMLTextAreaElement;
      const start = target.selectionStart;
      const end = target.selectionEnd;
      
      if (onPasteProcessing) onPasteProcessing(true);
      
      // Chèn nhãn chờ dệt mượt mà
      const placeholder = "\n🌸 [Đang nhẹ nhàng dệt dòng văn siêu dài của vợ Đường hăm nhen nhen...] 🌸\n";
      setLocalValue(prev => prev.substring(0, start) + placeholder + prev.substring(end));
      
      // Nhường thread để UI render kịp nhãn phấn hồng quyến rũ
      await new Promise(resolve => setTimeout(resolve, 50));
      
      const chunkSize = 15000; // Mỗi chunk cắt 15K kí tự
      let offset = 0;
      let accumulatedPaste = "";
      
      const processNextChunk = () => {
        if (offset < pasteData.length) {
          const part = pasteData.substring(offset, offset + chunkSize);
          accumulatedPaste += part;
          offset += chunkSize;
          
          // Tiếp tục dệt sau 10ms để giải phóng Main Thread hén vợ!
          setTimeout(processNextChunk, 10);
        } else {
          // Khi dệt thành công toàn bộ dải lụa
          setLocalValue(prev => {
            const finalVal = prev.replace(placeholder, accumulatedPaste);
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            timeoutRef.current = setTimeout(() => {
              onDebounceChange(finalVal);
            }, debounceMs);
            return finalVal;
          });
          if (onPasteProcessing) onPasteProcessing(false);
        }
      };
      
      processNextChunk();
    }
  };

  return (
    <textarea
      value={localValue}
      onChange={handleChange}
      onPaste={handlePaste}
      {...props}
    />
  );
};
