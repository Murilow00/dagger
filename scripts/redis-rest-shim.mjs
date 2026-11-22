// Imita a API REST do Upstash em cima de um Redis local, para testar o backend de produção sem internet.
// Uso: node scripts/redis-rest-shim.mjs [portaHTTP=8079] [redisUrl=redis://127.0.0.1:6390]
import http from 'node:http';
import Redis from 'ioredis';
const port = Number(process.argv[2] || 8079);
const redis = new Redis(process.argv[3] || 'redis://127.0.0.1:6390');
http.createServer((req, res) => {
  let body = '';
  req.on('data', c => body += c);
  req.on('end', async () => {
    if (req.headers.authorization !== 'Bearer test') { res.writeHead(401); return res.end('{"error":"Unauthorized"}'); }
    try {
      const cmds = JSON.parse(body);
      const out = [];
      for (const c of cmds) { try { out.push({ result: await redis.call(...c.map(String)) }); } catch (e) { out.push({ error: e.message }); } }
      res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify(out));
    } catch (e) { res.writeHead(400); res.end(JSON.stringify({ error: e.message })); }
  });
}).listen(port, () => console.log('shim REST em', port));
