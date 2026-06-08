const SESSION_KEY = 'examPoll_session';

const db = {
  session: null,

  loadSession() {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (raw) this.session = JSON.parse(raw);
    } catch { this.session = null; }
  },

  isLoggedIn() { return this.session !== null; },

  logout() {
    this.session = null;
    localStorage.removeItem(SESSION_KEY);
  },

  // ── Auth ────────────────────────────────────────────────────────────────

  async signup(email, password, name) {
    if (password.length < 8) throw new Error('비밀번호는 8자 이상이어야 합니다.');
    const pw  = await hashPw(password);
    const res = await api('POST', '/api/auth/signup', { email, pw, name });
    if (!res.ok) throw new Error(res.error);
  },

  async login(email, password) {
    const pw  = await hashPw(password);
    const res = await api('POST', '/api/auth/login', { email, pw });
    if (!res.ok) throw new Error(res.error);
    this.session = { email: res.data.email, name: res.data.name };
    localStorage.setItem(SESSION_KEY, JSON.stringify(this.session));
  },

  // ── Polls ────────────────────────────────────────────────────────────────

  async getAllPolls() {
    const res = await api('GET', '/api/polls');
    return res.ok ? res.data : [];
  },

  async getMyPolls() {
    if (!this.session) return [];
    const polls = await this.getAllPolls();
    return polls.filter(p => p.profEmail === this.session.email);
  },

  async getPoll(id) {
    const res = await api('GET', `/api/polls/${id}`);
    return res.ok ? res.data : null;
  },

  async createPoll({ pollName, section, slots, deadline }) {
    const body = {
      id:        genId(),
      profEmail: this.session.email,
      profName:  this.session.name,
      pollName,
      section:   section || '',
      slots,
      deadline,
      createdAt: new Date().toISOString(),
    };
    const res = await api('POST', '/api/polls', body);
    if (!res.ok) throw new Error(res.error);
    return res.data;
  },

  async deletePoll(id) {
    const res = await api('DELETE', `/api/polls/${id}`);
    if (!res.ok) throw new Error(res.error);
  },

  async submitVote(pollId, { voterName, voterId, impossibleSlots }) {
    const res = await api('POST', '/api/votes', {
      pollId, voterName, voterId, impossibleSlots,
      submittedAt: new Date().toISOString(),
    });
    if (!res.ok) throw new Error(res.error);
  },
};

// ── Shared utilities ───────────────────────────────────────────────────────

async function api(method, path, body) {
  try {
    const opts = {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : {},
      body:    body ? JSON.stringify(body) : undefined,
    };
    const res  = await fetch(path, opts);
    const data = await res.json();
    return res.ok ? { ok: true, data } : { ok: false, error: data.error || '서버 오류' };
  } catch (e) {
    return { ok: false, error: '서버에 연결할 수 없습니다.' };
  }
}

async function hashPw(password) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(password));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function genId() {
  return Array.from(crypto.getRandomValues(new Uint8Array(9)))
    .map(b => b.toString(16).padStart(2, '0')).join('');
}

function isExpired(poll) {
  return poll.deadline ? new Date() > new Date(poll.deadline) : false;
}

function getOptimalSlot(poll) {
  if (!poll.slots?.length || !poll.votes?.length) return null;
  return poll.slots.reduce((best, slot) => {
    const cA = poll.votes.filter(v => v.impossibleSlots.includes(slot.id)).length;
    const cB = poll.votes.filter(v => v.impossibleSlots.includes(best.id)).length;
    return cA < cB ? slot : best;
  });
}

function fmtDt(isoStr) {
  return new Date(isoStr).toLocaleDateString('ko-KR', {
    year: 'numeric', month: 'long', day: 'numeric',
    weekday: 'short', hour: '2-digit', minute: '2-digit',
  });
}

function votePageUrl(pollId) {
  return `${location.href.split('#')[0]}#vote/${pollId}`;
}

db.loadSession();
