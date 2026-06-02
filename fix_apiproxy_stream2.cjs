const fs = require('fs');
const file = 'src/utils/apiProxy.ts';
let code = fs.readFileSync(file, 'utf8');

const loopRegex = /const decoder = new TextDecoder\('utf-8'\);[\s\S]*?finally \{\s*reader\.releaseLock\(\);\s*\}/;

const newLoop = `const decoder = new TextDecoder('utf-8');
    let buffer = '';
    let jsonAccumulator = '';
    let streamExplicitStop = false;
    let reportedOutputTokens = 0;
    let chunkIndex = 0;

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
             if (jsonAccumulator.length > 0 && !jsonAccumulator.trim().startsWith('{') && !jsonAccumulator.trim().startsWith('[')) {
                receivedAnyContent = true;
                overallGeneratedText += jsonAccumulator;
                
                chunkIndex++;
                console.log(\`[Frontend UI] chunkIndex: \${chunkIndex}, rawChunk.length: \${jsonAccumulator.length}, extractedText.length: \${jsonAccumulator.length}, accumulatedText.length: \${overallGeneratedText.length}\`);
                
                yield { text: jsonAccumulator, finishReason: null };
                jsonAccumulator = ''; 
             }
             continue; 
          }
          
          jsonAccumulator = '';
          
          let content = '';
          let finishReason = null;
          
          if (data.usage?.completion_tokens) reportedOutputTokens = Math.max(reportedOutputTokens, data.usage.completion_tokens);
          if (data.usage?.candidatesTokenCount) reportedOutputTokens = Math.max(reportedOutputTokens, data.usage.candidatesTokenCount);
          if (data.usageMetadata?.candidatesTokenCount) reportedOutputTokens = Math.max(reportedOutputTokens, data.usageMetadata.candidatesTokenCount);
          
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
            
            if (content) {
              chunkIndex++;
              console.log(\`[Frontend UI] chunkIndex: \${chunkIndex}, rawChunk.length: \${dataText.length}, extractedText.length: \${content.length}, accumulatedText.length: \${overallGeneratedText.length}\`);
            }
            
            yield { text: content, finishReason: streamExplicitStop ? finishReason : null };
          } else if (data.error || data.message) {
            const errMsg = typeof data.error === 'string' ? data.error : (data.error?.message || data.message || "");
            if (errMsg) throw new Error(errMsg);
          }
        }
        
        if (buffer.length > 5000 && !buffer.trim().startsWith('{') && !buffer.trim().startsWith('[')) {
           receivedAnyContent = true;
           overallGeneratedText += buffer;
           
           chunkIndex++;
           console.log(\`[Frontend UI] chunkIndex: \${chunkIndex}, rawChunk.length: \${buffer.length}, extractedText.length: \${buffer.length}, accumulatedText.length: \${overallGeneratedText.length}\`);
           
           yield { text: buffer, finishReason: null };
           buffer = '';
        }
        
        if (done) {
          console.log(\`[Frontend UI] readerDone: true, receivedDoneEvent: \${streamExplicitStop}\`);
          break;
        }
      }
      
      if (buffer.trim()) {
         let tempBuffer = buffer.trim();
         if (tempBuffer.startsWith('data:')) tempBuffer = tempBuffer.replace(/^data:\\s*/, '');
         if (tempBuffer !== '[DONE]') {
           const finalData = safeParseJson(jsonAccumulator + tempBuffer);
           let finalContent = '';
           if (finalData) {
             finalContent = finalData.choices?.[0]?.delta?.content || finalData.text || finalData.content || "";
           } else {
             finalContent = tempBuffer;
           }
           if (finalContent) {
             receivedAnyContent = true;
             overallGeneratedText += finalContent;
             chunkIndex++;
             console.log(\`[Frontend UI] chunkIndex: \${chunkIndex}, rawChunk.length: \${tempBuffer.length}, extractedText.length: \${finalContent.length}, accumulatedText.length: \${overallGeneratedText.length}\`);
             yield { text: finalContent, finishReason: null };
           }
         }
      }
      
      console.log(\`[Backend Proxy] 🏁 Đã hoàn thành tải stream.\`);
      console.log(\`[Backend Proxy] modelChunkCount: \${chunkIndex}, forwardedChunkCount: \${chunkIndex}, forwardedTextLength: \${overallGeneratedText.length}, finalOutputTokenCount: \${reportedOutputTokens}, isStream: true\`);
      
      if (reportedOutputTokens > 1000 && overallGeneratedText.length < 1000) {
        throw new Error("Stream was truncated: frontend received only partial content.");
      }
      
    } finally {
      reader.releaseLock();
    }`;

if (loopRegex.test(code)) {
    code = code.replace(loopRegex, newLoop);
    fs.writeFileSync(file, code);
    console.log("Successfully replaced the stream reader loop in apiProxy.ts with extended logs");
} else {
    console.log("Regex did not match in apiProxy.ts.");
}
