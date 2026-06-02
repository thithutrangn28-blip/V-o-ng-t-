const fs = require('fs');
const file = 'src/utils/apiProxy.ts';
let code = fs.readFileSync(file, 'utf8');

const anchor = `export const sendMessageStream = async function* (`;
const mockImplementation = `export const sendMessageStream = async function* (
  settings: ApiProxySettings, 
  messages: { role: 'user' | 'assistant' | 'system', content: string, name?: string }[],
  characterInfo?: string,
  signal?: AbortSignal,
  isLongNovelHack: boolean = false
) {
  if (settings?.model === 'mock-stream-test') {
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
  }
`;

if (code.includes(anchor)) {
    code = code.replace(`export const sendMessageStream = async function* (
  settings: ApiProxySettings, 
  messages: { role: 'user' | 'assistant' | 'system', content: string, name?: string }[],
  characterInfo?: string,
  signal?: AbortSignal,
  isLongNovelHack: boolean = false
) {`, mockImplementation);
    fs.writeFileSync(file, code);
    console.log("Successfully injected mock stream test in apiProxy.ts");
} else {
    console.log("Could not find the anchor point in apiProxy.ts");
}
