const http = require('http');
const fs   = require('fs');
const path = require('path');
const url  = require('url');

const DATA_DIR   = path.join(__dirname, 'data');
const STATIC_DIR = __dirname;
const PORT       = process.env.PORT || 8080;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.json': 'application/json',
  '.png':  'image/png',
  '.ico':  'image/x-icon',
};

// ── JSON file helpers ──────────────────────────────────────────────────────

function readDb(schema) {
  const file = path.join(DATA_DIR, `db_${schema}.json`);
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch { return []; }
}

function writeDb(schema, data) {
  const file = path.join(DATA_DIR, `db_${schema}.json`);
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
}

// ── Request helpers ────────────────────────────────────────────────────────

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', c => raw += c);
    req.on('end', () => { try { resolve(JSON.parse(raw)); } catch { resolve({}); } });
    req.on('error', reject);
  });
}

function json(res, status, data) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  });
  res.end(JSON.stringify(data));
}

// ── Static file server ─────────────────────────────────────────────────────

function serveStatic(req, res) {
  // Strip query string
  const reqPath = url.parse(req.url).pathname;
  let filePath = path.join(STATIC_DIR, reqPath === '/' ? 'index.html' : reqPath);

  // Prevent directory traversal outside project root
  if (!filePath.startsWith(STATIC_DIR)) {
    res.writeHead(403); res.end(); return;
  }

  // Don't serve data/ directory
  if (filePath.startsWith(path.join(STATIC_DIR, 'data'))) {
    res.writeHead(403); res.end(); return;
  }

  // SPA fallback: unknown paths → index.html
  if (!path.extname(filePath)) filePath = path.join(STATIC_DIR, 'index.html');

  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); res.end('Not found'); return; }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(filePath)] || 'text/plain' });
    res.end(data);
  });
}

// ── API router ─────────────────────────────────────────────────────────────

async function handleApi(req, res) {
  const parsed   = url.parse(req.url, true);
  const pathname = parsed.pathname;
  const method   = req.method;

  // CORS preflight
  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    res.end(); return;
  }

  // POST /api/auth/signup
  if (pathname === '/api/auth/signup' && method === 'POST') {
    const { email, pw, name } = await parseBody(req);
    if (!email || !pw || !name) return json(res, 400, { error: '필수 항목 누락' });
    if (!email.endsWith('@sejong.ac.kr'))
      return json(res, 400, { error: '세종대학교 이메일(@sejong.ac.kr)만 가입 가능합니다.' });

    const profs = readDb('professors');
    if (profs.some(p => p.email === email))
      return json(res, 409, { error: '이미 가입된 이메일입니다.' });

    profs.push({ email, pw, name });
    writeDb('professors', profs);
    return json(res, 200, { ok: true });
  }

  // POST /api/auth/login
  if (pathname === '/api/auth/login' && method === 'POST') {
    const { email, pw } = await parseBody(req);
    const prof = readDb('professors').find(p => p.email === email && p.pw === pw);
    if (!prof) return json(res, 401, { error: '이메일 또는 비밀번호가 올바르지 않습니다.' });
    return json(res, 200, { email: prof.email, name: prof.name });
  }

  // GET /api/polls  →  polls + voteCount (목록용)
  if (pathname === '/api/polls' && method === 'GET') {
    const polls = readDb('polls');
    const votes = readDb('votes');
    const result = polls.map(p => ({
      ...p,
      voteCount: votes.filter(v => v.pollId === p.id).length,
    }));
    return json(res, 200, result);
  }

  // POST /api/polls
  if (pathname === '/api/polls' && method === 'POST') {
    const body = await parseBody(req);
    if (!body.id || !body.pollName) return json(res, 400, { error: '필수 항목 누락' });
    const polls = readDb('polls');
    polls.push(body);
    writeDb('polls', polls);
    return json(res, 200, body);
  }

  // GET /api/polls/:id  →  poll + full votes (상세용)
  const pollIdMatch = pathname.match(/^\/api\/polls\/([^/]+)$/);
  if (pollIdMatch) {
    const id = pollIdMatch[1];

    if (method === 'GET') {
      const poll = readDb('polls').find(p => p.id === id);
      if (!poll) return json(res, 404, { error: '투표를 찾을 수 없습니다.' });
      const votes = readDb('votes').filter(v => v.pollId === id);
      return json(res, 200, { ...poll, votes });
    }

    if (method === 'DELETE') {
      writeDb('polls', readDb('polls').filter(p => p.id !== id));
      writeDb('votes', readDb('votes').filter(v => v.pollId !== id));
      return json(res, 200, { ok: true });
    }
  }

  // GET /api/votes?pollId=xxx
  if (pathname === '/api/votes' && method === 'GET') {
    const votes = readDb('votes');
    const { pollId } = parsed.query;
    return json(res, 200, pollId ? votes.filter(v => v.pollId === pollId) : votes);
  }

  // POST /api/votes
  if (pathname === '/api/votes' && method === 'POST') {
    const { pollId, voterName, voterId, impossibleSlots, submittedAt } = await parseBody(req);
    if (!pollId || !voterName || !voterId)
      return json(res, 400, { error: '필수 항목 누락' });

    const poll = readDb('polls').find(p => p.id === pollId);
    if (!poll) return json(res, 404, { error: '투표를 찾을 수 없습니다.' });
    if (poll.deadline && new Date() > new Date(poll.deadline))
      return json(res, 400, { error: '투표 기한이 마감되었습니다.' });

    const votes = readDb('votes');
    const idx   = votes.findIndex(v => v.pollId === pollId && v.voterId === voterId);
    const vote  = { pollId, voterName, voterId, impossibleSlots: impossibleSlots || [], submittedAt };
    if (idx !== -1) votes[idx] = vote; else votes.push(vote);
    writeDb('votes', votes);
    return json(res, 200, { ok: true });
  }

  return json(res, 404, { error: 'API endpoint not found' });
}

// ── Main server ────────────────────────────────────────────────────────────

const server = http.createServer(async (req, res) => {
  try {
    if (req.url.startsWith('/api/')) {
      await handleApi(req, res);
    } else {
      serveStatic(req, res);
    }
  } catch (err) {
    console.error(err);
    if (!res.headersSent) json(res, 500, { error: 'Internal server error' });
  }
});

server.listen(PORT, () => {
  console.log(`\nExamPoll 서버 실행 중 → http://localhost:${PORT}`);
  console.log('ngrok 으로 외부 공유: npx ngrok http ' + PORT + '\n');
});
