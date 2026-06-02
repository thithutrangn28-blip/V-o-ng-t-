const fs = require('fs');
const file = 'src/utils/apiProxy.ts';
let code = fs.readFileSync(file, 'utf8');

// Undo the lazy mock
const oldMock = `  if (settings?.model === 'mock-stream-test') {
    console.log("[Backend Proxy] Khởi động luồng MOCK MOCK-STREAM-TEST");
    let overallText = "";
    for (let i = 1; i <= 20; i++) {
      if (signal?.aborted) throw new Error("UserAborted");
      // JSON bị tách đôi
      yield { text: \`[Mock Chunk \${i}/20] Đại văn hào Kikoko đang viết những dòng chữ lấp lánh phép màu...\`, finishReason: null };
      overallText += \`[Mock Chunk \${i}/20] Đại văn hào Kikoko đang viết những dòng chữ lấp lánh phép màu...\`;
      await new Promise(r => setTimeout(r, 100));
    }
    yield { text: " [KẾT THÚC MOCK]", finishReason: "stop" };
    overallText += " [KẾT THÚC MOCK]";
    console.log(\`[Backend Proxy] modelChunkCount: 20, forwardedChunkCount: 20, forwardedTextLength: \${overallText.length}, finalOutputTokenCount: 47036, isStream: true\`);
    return;
  }`;

code = code.replace(oldMock, '');

const fetchAnchor = `const response = await fetch(fetchUrl, {`;
const mockNetwork = `    let isMock = settings?.model === 'mock-stream-test';
    let response: any;
    if (isMock) {
      console.log("[Backend Proxy] 🌐 Đang chạy MOCK STREAM TEST thay vì gọi mạng thật...");
      
      const encoder = new TextEncoder();
      const chunksData = Array.from({length: 20}, (_, i) => {
        const text = "KikokoNovel ".repeat(20) + \` [Chunk \${i+1}/20] \` + "Mây trôi nước chảy, văn chương lấp lánh... ".repeat(5);
        return {
          choices: [{ delta: { content: text } }]
        };
      });

      const rawChunks: Uint8Array[] = [];
      chunksData.forEach(cd => {
        const jsonStr = JSON.stringify(cd);
        // Split json to simulate incomplete chunks
        const half = Math.floor(jsonStr.length / 2);
        rawChunks.push(encoder.encode(\`data: \${jsonStr.substring(0, half)}\`));
        rawChunks.push(encoder.encode(\`\${jsonStr.substring(half)}\\n\\n\`));
      });
      // Add usage metadata chunk
      rawChunks.push(encoder.encode(\`data: {"usage": {"completion_tokens": 47036}}\\n\\n\`));
      // Add DONE
      rawChunks.push(encoder.encode(\`data: [DONE]\\n\\n\`));

      let chunkIdx = 0;
      const readerCount = rawChunks.length;
      response = {
        ok: true,
        headers: new Headers({ 'content-type': 'text/event-stream' }),
        body: {
          getReader: () => ({
            read: async () => {
              if (chunkIdx < readerCount) {
                await new Promise(r => setTimeout(r, 20));
                return { done: false, value: rawChunks[chunkIdx++] };
              }
              return { done: true, value: undefined };
            },
            releaseLock: () => {}
          })
        }
      };
    } else {
      response = await fetch(fetchUrl, {`;

if (code.includes(fetchAnchor)) {
    code = code.replace(fetchAnchor, mockNetwork + `
      method: 'POST',
      priority: 'high',
      mode: 'cors',
      credentials: 'omit',
      cache: 'no-store',
      headers: {
        'Authorization': \`Bearer \${settings.apiKey}\`,
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream, application/json',
        'Cache-Control': 'no-cache, no-transform, no-store',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Connection': 'keep-alive',
        'Keep-Alive': 'timeout=3600, max=1000', 
        'X-Accel-Buffering': 'no',
        'X-Request-Timeout': String(connectionTimeoutDuration),
        ...(isClaude ? { 'x-api-key': settings.apiKey, 'anthropic-version': '2023-06-01' } : {})
      },
      signal: connectionController.signal,
      body: JSON.stringify(requestBody)
    });
    }`);
    fs.writeFileSync(file, code);
    console.log("Successfully injected true mock stream test intercepting fetch");
} else {
    console.log("Could not find the fetch anchor point in apiProxy.ts");
}
