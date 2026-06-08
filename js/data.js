const STORAGE_KEY = 'examPoll_v7';
const SESSION_KEY = 'examPoll_session';

const db = {
  session: null,

  _read() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : { registeredProfs: [], polls: [] };
    } catch {
      return { registeredProfs: [], polls: [] };
    }
  },

  _write(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  },

  loadSession() {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (raw) this.session = JSON.parse(raw);
    } catch {
      this.session = null;
    }
  },

  isLoggedIn() {
    return this.session !== null;
  },

  async signup(email, password, name) {
    if (!email.endsWith('@sejong.ac.kr')) {
      throw new Error('세종대학교 이메일(@sejong.ac.kr)만 가입 가능합니다.');
    }
    if (password.length < 8) {
      throw new Error('비밀번호는 8자 이상이어야 합니다.');
    }
    const data = this._read();
    if (data.registeredProfs.some(p => p.email === email)) {
      throw new Error('이미 가입된 이메일입니다.');
    }
    const pw = await hashPw(password);
    data.registeredProfs.push({ email, pw, name });
    this._write(data);
  },

  async login(email, password) {
    const data = this._read();
    const pw = await hashPw(password);
    const prof = data.registeredProfs.find(p => p.email === email && p.pw === pw);
    if (!prof) throw new Error('이메일 또는 비밀번호가 올바르지 않습니다.');
    this.session = { email: prof.email, name: prof.name };
    localStorage.setItem(SESSION_KEY, JSON.stringify(this.session));
  },

  logout() {
    this.session = null;
    localStorage.removeItem(SESSION_KEY);
  },

  getMyPolls() {
    if (!this.session) return [];
    return this._read().polls.filter(p => p.profEmail === this.session.email);
  },

  getAllPolls() {
    return this._read().polls;
  },

  getPoll(id) {
    return this._read().polls.find(p => p.id === id) || null;
  },

  createPoll({ pollName, section, slots, deadline }) {
    const data = this._read();
    const poll = {
      id: genId(),
      profEmail: this.session.email,
      profName: this.session.name,
      pollName,
      section: section || '',
      slots,
      deadline,
      votes: [],
      createdAt: new Date().toISOString()
    };
    data.polls.push(poll);
    this._write(data);
    return poll;
  },

  deletePoll(id) {
    const data = this._read();
    data.polls = data.polls.filter(p => p.id !== id);
    this._write(data);
  },

  submitVote(pollId, { voterName, voterId, impossibleSlots }) {
    const data = this._read();
    const poll = data.polls.find(p => p.id === pollId);
    if (!poll) throw new Error('투표를 찾을 수 없습니다.');
    if (isExpired(poll)) throw new Error('투표 기한이 마감되었습니다.');

    const idx = poll.votes.findIndex(v => v.voterId === voterId);
    const vote = {
      voterName,
      voterId,
      impossibleSlots: [...impossibleSlots],
      submittedAt: new Date().toISOString()
    };
    if (idx !== -1) {
      poll.votes[idx] = vote;
    } else {
      poll.votes.push(vote);
    }
    this._write(data);
  }
};

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
  if (!poll.slots.length || !poll.votes.length) return null;
  return poll.slots.reduce((best, slot) => {
    const cA = poll.votes.filter(v => v.impossibleSlots.includes(slot.id)).length;
    const cB = poll.votes.filter(v => v.impossibleSlots.includes(best.id)).length;
    return cA < cB ? slot : best;
  });
}

function fmtDt(isoStr) {
  return new Date(isoStr).toLocaleDateString('ko-KR', {
    year: 'numeric', month: 'long', day: 'numeric',
    weekday: 'short', hour: '2-digit', minute: '2-digit'
  });
}

function votePageUrl(pollId) {
  const base = location.href.split('#')[0];
  return `${base}#vote/${pollId}`;
}

db.loadSession();
