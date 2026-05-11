const fs = require('fs');
const path = require('path');
const http = require('https');
const os = require('os');

const TOKEN_FILE = path.join(os.homedir(), '.lazyweb', 'lazyweb_mcp_token');
const MCP_URL = 'https://www.lazyweb.com/mcp';

function getToken() {
  try {
    return fs.readFileSync(TOKEN_FILE, 'utf8').trim();
  } catch (e) {
    console.error('Error: Lazyweb token not found at ' + TOKEN_FILE);
    process.exit(1);
  }
}

async function callTool(toolName, args = {}) {
  const token = getToken();
  const payload = JSON.stringify({
    jsonrpc: '2.0',
    method: 'tools/call',
    params: {
      name: toolName,
      arguments: args
    },
    id: Date.now()
  });

  return new Promise((resolve, reject) => {
    const url = new URL(MCP_URL);
    const options = {
      hostname: url.hostname,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream',
        'Content-Length': Buffer.byteLength(payload)
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            const response = JSON.parse(data);
            if (response.error) {
              reject(new Error(response.error.message || 'Unknown RPC error'));
            } else {
              resolve(response.result);
            }
          } catch (e) {
            // Handle streaming responses if any
            resolve(data);
          }
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

const [,, tool, ...argList] = process.argv;

if (!tool) {
  console.log('Usage: node lazyweb_mcp.cjs <tool_name> [args_json]');
  process.exit(1);
}

const args = argList.length > 0 ? JSON.parse(argList.join(' ')) : {};

callTool(tool, args)
  .then(result => {
    console.log(JSON.stringify(result, null, 2));
  })
  .catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
  });
