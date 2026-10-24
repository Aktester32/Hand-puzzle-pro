const http = require('http');
const fs   = require('fs');
const path = require('path');

const PORT = 8000;
const DIR  = __dirname;
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'application/javascript',
  '.css':  'text/css',
  '.json': 'application/json',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.ico':  'image/x-icon',
  '.svg':  'image/svg+xml',
  '.wasm': 'application/wasm'
};

const server = http.createServer((req, res) => {
  let url = req.url.split('?')[0];
  if (url === '/') url = '/index.html';

  const filePath = path.join(DIR, url);
  const ext      = path.extname(filePath).toLowerCase();

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(err.code === 'ENOENT' ? 404 : 500);
      res.end(err.code === 'ENOENT' ? '404 Not Found' : '500 Server Error');
      return;
    }
    res.writeHead(200, {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Cache-Control': 'no-cache',
      'Access-Control-Allow-Origin': '*'
    });
    res.end(data);
  });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log('\x1b[36m%s\x1b[0m', '╔══════════════════════════════════╗');
  console.log('\x1b[36m%s\x1b[0m', '║   HandPuzzle Pro  –  v2.0.0      ║');
  console.log('\x1b[36m%s\x1b[0m', '╠══════════════════════════════════╣');
  console.log('\x1b[32m%s\x1b[0m', `║  http://127.0.0.1:${PORT}          ║`);
  console.log('\x1b[36m%s\x1b[0m', '╚══════════════════════════════════╝');
});
