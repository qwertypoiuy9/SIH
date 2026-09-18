import http from 'node:http';

const PORT = process.env.PORT || 5000;
const cache = new Map();

const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'hi', name: 'Hindi' },
  { code: 'mr', name: 'Marathi' },
  { code: 'te', name: 'Telugu' },
  { code: 'ta', name: 'Tamil' },
  { code: 'gu', name: 'Gujarati' },
  { code: 'pa', name: 'Punjabi' },
  { code: 'bn', name: 'Bengali' },
  { code: 'kn', name: 'Kannada' },
  { code: 'ml', name: 'Malayalam' },
  { code: 'or', name: 'Odia' },
  { code: 'ur', name: 'Urdu' }
];

async function translateSingle(text, source = 'en', target = 'hi') {
  if (!text || !text.trim() || source === target) {
    return text;
  }

  const key = `${source}:${target}:${text.trim()}`;
  if (cache.has(key)) {
    return cache.get(key);
  }

  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${source}|${target}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const data = await response.json();
    const translated = data?.responseData?.translatedText;
    if (translated && !translated.startsWith('MYMEMORY WARNING:')) {
      cache.set(key, translated);
      return translated;
    }
    return text;
  } catch (err) {
    console.error(`[Translate error for "${text}"]:`, err.message);
    return text;
  }
}

const server = http.createServer(async (req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host}`);

  if (req.method === 'GET' && url.pathname === '/') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', service: 'KisanQ Translation Service', port: PORT }));
    return;
  }

  if (req.method === 'GET' && url.pathname === '/languages') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(LANGUAGES));
    return;
  }

  if (req.method === 'POST' && url.pathname === '/translate') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const payload = JSON.parse(body);
        const { q, source = 'en', target = 'hi' } = payload;

        if (Array.isArray(q)) {
          // Batch translation with concurrency limit
          const results = [];
          for (let i = 0; i < q.length; i += 5) {
            const batch = q.slice(i, i + 5);
            const batchResults = await Promise.all(
              batch.map(item => translateSingle(item, source, target))
            );
            results.push(...batchResults);
          }
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ translatedText: results }));
        } else {
          const translated = await translateSingle(q, source, target);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ translatedText: translated }));
        }
      } catch (err) {
        console.error('[Error handling /translate]:', err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n=============================================`);
  console.log(`🌐 KisanQ Translation Server running on:`);
  console.log(`   http://localhost:${PORT}/translate`);
  console.log(`=============================================\n`);
});
