const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = __dirname;
const types = {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.svg':'image/svg+xml','.jpg':'image/jpeg'};
http.createServer((req, res) => {
  let pathname;
  try { pathname = decodeURIComponent(new URL(req.url,'http://localhost').pathname); } catch { res.writeHead(400); return res.end(); }
  const file = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
  if (!file.startsWith(root + path.sep) || !['.html','.css','.js','.svg','.jpg','.txt'].includes(path.extname(file)) || pathname.split('/').some(p=>p.startsWith('.'))) { res.writeHead(403); return res.end(); }
  fs.readFile(file, (error, data) => {
    if (error) {res.writeHead(404); return res.end();}
    res.writeHead(200, {'Content-Type':types[path.extname(file)] || 'text/plain', 'Cache-Control':'no-store'}); res.end(data);
  });
}).listen(4173,'127.0.0.1',()=>console.log('Local: http://127.0.0.1:4173'));
