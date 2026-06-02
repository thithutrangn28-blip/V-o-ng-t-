const fs = require('fs');
const file = 'src/utils/apiProxy.ts';
let code = fs.readFileSync(file, 'utf8');

// Replace the reader loop
const loopRegex = /const decoder = new TextDecoder\('utf-8'\);[\s\S]*?finally \{\s*reader\.releaseLock\(\);\s*\}/;

const newLoop = `const decoder = new TextDecoder('utf-8');
    let buffer = '';
    let jsonAccumulator = '';
    let streamExplicitStop = false;

    try {
      while (true) {
        const { done, value } = await reader.read();
        
        if (value) {
          buffer += decoder.decode(value, { stream: true });
        }
        if (done) {
          buffer += decoder.decode();
        }

        const lines = buffer.split('\\n');
        buffer = lines.pop() || '';

        for (let line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          
          let dataText = trimmed;
          if (trimmed.startsWith('data:')) {
            dataText = trimmed.replace(/^data:\\s*/, '');
          }
          
          if (dataText === '[DONE]') {
             console.log(\`[Backend Proxy] 🏁 Nhận được tín hiệu [DONE] đặc biệt từ Proxy stream.\`);
             streamExplicitStop = true;
             continue;
          }

          if (jsonAccumulator) {
             jsonAccumulator += dataText;
          } else {
             jsonAccumulator = dataText;
          }
          
          let data = safeParseJson(jsonAccumulator);
          
          if (!data) {
             // Nếu không parse được JSON, kiểm tra nếu nó không giống JSON thì treat như raw text
             if (jsonAccumulator.length > 0 && !jsonAccumulator.trim().startsWith('{') && !jsonAccumulator.trim().startsWith('[')) {
                receivedAnyContent = true;
                overallGeneratedText += jsonAccumulator;
                yield { text: jsonAccumulator, finishReason: null };
                jsonAccumulator = ''; // đã yield xong thì reset
             }
             // Nếu giống JSON nhưng chưa đủ thì giữ nguyên jsonAccumulator chờ chunk sau
             continue; 
          }
          
          // Parse thành công -> Xóa jsonAccumulator
          jsonAccumulator = '';
          
          let content = '';
          let finishReason = null;
          
          if (isClaude) {
            if (data.type === 'content_block_delta' && data.delta?.text) content = data.delta.text;
            if (data.type === 'message_stop') finishReason = 'stop';
          } else {
            content = data.choices?.[0]?.delta?.content || 
                     data.choices?.[0]?.message?.content || 
                     data.choices?.[0]?.text ||
                     data.candidates?.[0]?.content?.parts?.[0]?.text || 
                     data.text || 
                     data.content || 
                     data.value || 
                     data.response || 
                     (typeof data.message === 'string' && !data.error ? data.message : "") ||
                     (data.message?.content ? data.message.content : "") ||
                     "";
            
            finishReason = data.choices?.[0]?.finish_reason || 
                           data.candidates?.[0]?.finishReason || 
                           data.finish_reason || 
                           data.finishReason || 
                           null;
          }
          
          if (content || finishReason) {
            if (content) {
               receivedAnyContent = true;
               overallGeneratedText += content;
            }
            if (finishReason === 'stop' || finishReason === 'MAX_TOKENS' || finishReason === 'end_turn' || finishReason === 'length') {
               streamExplicitStop = true;
            }
            yield { text: content, finishReason: streamExplicitStop ? finishReason : null };
          } else if (data.error || data.message) {
            const errMsg = typeof data.error === 'string' ? data.error : (data.error?.message || data.message || "");
            if (errMsg) throw new Error(errMsg);
          }
        }
        
        // CỰC KỲ QUAN TRỌNG: Xử lý chunk không có newline (raw text stream)
        if (buffer.length > 5000 && !buffer.trim().startsWith('{') && !buffer.trim().startsWith('[')) {
           receivedAnyContent = true;
           overallGeneratedText += buffer;
           yield { text: buffer, finishReason: null };
           buffer = '';
        }
        
        if (done) break;
      }
      
      // Cleanup buffer cuối cùng nếu còn
      if (buffer.trim()) {
         let tempBuffer = buffer.trim();
         if (tempBuffer.startsWith('data:')) tempBuffer = tempBuffer.replace(/^data:\\s*/, '');
         if (tempBuffer !== '[DONE]') {
           const finalData = safeParseJson(jsonAccumulator + tempBuffer);
           if (finalData) {
             const c = finalData.choices?.[0]?.delta?.content || finalData.text || finalData.content || "";
             if (c) {
               receivedAnyContent = true;
               overallGeneratedText += c;
               yield { text: c, finishReason: null };
             }
           } else {
             receivedAnyContent = true;
             overallGeneratedText += tempBuffer;
             yield { text: tempBuffer, finishReason: null };
           }
         }
      }
      
      console.log(\`[Backend Proxy] 🏁 Đã hoàn thành tải stream. Tổng kí tự: \${overallGeneratedText.length}\`);
    } finally {
      reader.releaseLock();
    }`;

if (loopRegex.test(code)) {
    code = code.replace(loopRegex, newLoop);
    fs.writeFileSync(file, code);
    console.log("Successfully replaced the stream reader loop in apiProxy.ts");
} else {
    console.log("Regex did not match in apiProxy.ts.");
}
