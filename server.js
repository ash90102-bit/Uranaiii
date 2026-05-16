#!/usr/bin/env node
// node server.js  →  http://localhost:3000
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;

http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Claude API proxy — keeps the API key server-side safe from CORS blocks
  if (req.method === 'POST' && req.url === '/api/read') {
    let body = '';
    req.on('data', d => (body += d));
    req.on('end', () => {
      try {
        const { apiKey, ...payload } = JSON.parse(body);
        const data = JSON.stringify(payload);
        const opts = {
          hostname: 'api.anthropic.com', port: 443,
          path: '/v1/messages', method: 'POST',
          headers: {
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json',
            'content-length': Buffer.byteLength(data),
          },
        };
        const pr = https.request(opts, ps => {
          res.writeHead(ps.statusCode, { 'content-type': ps.headers['content-type'] || 'application/json' });
          ps.pipe(res);
        });
        pr.on('error', e => { res.writeHead(500); res.end(JSON.stringify({ error: e.message })); });
        pr.write(data);
        pr.end();
      } catch (e) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  // Static files
  const filePath = path.join(__dirname, req.url === '/' ? 'index.html' : req.url);
  fs.readFile(filePath, (err, content) => {
    if (err) { res.writeHead(404); res.end('Not found'); return; }
    const ext = path.extname(filePath);
    const mime = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css' }[ext] || 'text/plain';
    res.writeHead(200, { 'content-type': mime });
    res.end(content);
  });

}).listen(PORT, () => {
  console.log(`\n✨ タロット占い サーバー起動\n   → http://localhost:${PORT}\n`);
  console.log('   停止: Ctrl+C\n');
});
