const fs = require('fs');
const file = 'src/utils/apiProxy.ts';
let code = fs.readFileSync(file, 'utf8');

const anchor1 = `      };
    } else {
      response = await fetch(fetchUrl, {
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
    }
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
    });`;

if (code.includes(anchor1)) {
  const corrected = `      };
    } else {
      response = await fetch(fetchUrl, {
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
    }`;
  code = code.replace(anchor1, corrected);
  fs.writeFileSync(file, code);
  console.log("Fixed duplicate fetch definitions in apiProxy");
} else {
  console.log("Could not find duplicate block");
}
