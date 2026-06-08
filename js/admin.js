// ---- Home ----

function renderHome() {
  document.getElementById('main').innerHTML = `
    <div class="hero">
      <p class="hero-eyebrow">세종대학교 시험 일정 조율 서비스</p>
      <h1 class="hero-title">학생 모두가 참여할 수 있는<br>시험 시간을 찾아드립니다</h1>
      <p class="hero-sub">
        교수님이 후보 시간대를 등록하면 학생들이 불가능한 시간에 투표합니다.<br>
        시스템이 최적의 시험 시간을 자동으로 추천해드립니다.
      </p>
      <div class="hero-actions">
        <a href="#login" class="btn btn-primary btn-lg">교수 로그인 · 투표 개설</a>
        <a href="#browse" class="btn btn-outline btn-lg">학생 투표 참여</a>
      </div>
    </div>
  `;
}

// ---- Login ----

function renderLogin() {
  document.getElementById('main').innerHTML = `
    <div class="container-sm">
      <div class="card">
        <h1 class="page-title">교수 로그인</h1>
        <p class="page-sub">투표 공간을 개설하려면 로그인이 필요합니다.</p>

        <label>이메일</label>
        <input type="email" id="login-email" placeholder="professor@sejong.ac.kr" autocomplete="email" />

        <label>비밀번호</label>
        <input type="password" id="login-pw" placeholder="••••••••" autocomplete="current-password"
               onkeydown="if(event.key==='Enter')doLogin()" />

        <button class="btn btn-primary btn-full" onclick="doLogin()">로그인</button>

        <p class="text-center mt-16 text-sub">
          아직 계정이 없으신가요?
          <a href="#signup" class="link">회원가입</a>
        </p>
      </div>
    </div>
  `;
  setTimeout(() => document.getElementById('login-email')?.focus(), 50);
}

async function doLogin() {
  const email = document.getElementById('login-email').value.trim();
  const pw = document.getElementById('login-pw').value;
  if (!email || !pw) return alert('이메일과 비밀번호를 모두 입력해주세요.');
  try {
    await db.login(email, pw);
    nav('dashboard');
  } catch (e) {
    alert(e.message);
  }
}

// ---- Signup ----

function renderSignup() {
  document.getElementById('main').innerHTML = `
    <div class="container-sm">
      <div class="card">
        <h1 class="page-title">교수 회원가입</h1>
        <p class="page-sub">세종대학교 이메일(@sejong.ac.kr)로만 가입 가능합니다.</p>

        <label>교수명 <span class="required">*</span></label>
        <input type="text" id="su-name" placeholder="예: 홍길동" />

        <label>이메일 <span class="required">*</span></label>
        <input type="email" id="su-email" placeholder="professor@sejong.ac.kr" autocomplete="email" />

        <label>비밀번호 <span class="required">*</span></label>
        <input type="password" id="su-pw" placeholder="8자 이상" autocomplete="new-password" />

        <label>비밀번호 확인 <span class="required">*</span></label>
        <input type="password" id="su-pw2" placeholder="비밀번호 재입력" autocomplete="new-password"
               onkeydown="if(event.key==='Enter')doSignup()" />

        <button class="btn btn-primary btn-full" onclick="doSignup()">가입하기</button>

        <p class="text-center mt-16 text-sub">
          이미 계정이 있으신가요?
          <a href="#login" class="link">로그인</a>
        </p>
      </div>
    </div>
  `;
}

async function doSignup() {
  const name  = document.getElementById('su-name').value.trim();
  const email = document.getElementById('su-email').value.trim();
  const pw    = document.getElementById('su-pw').value;
  const pw2   = document.getElementById('su-pw2').value;
  if (!name || !email || !pw || !pw2) return alert('모든 항목을 입력해주세요.');
  if (pw !== pw2) return alert('비밀번호가 일치하지 않습니다.');
  try {
    await db.signup(email, pw, name);
    alert('회원가입이 완료되었습니다! 로그인해주세요.');
    nav('login');
  } catch (e) {
    alert(e.message);
  }
}

// ---- Dashboard ----

function renderDashboard() {
  const polls = db.getMyPolls().slice().reverse();

  const pollsHtml = polls.length === 0
    ? `<div class="empty-state">
        <div class="empty-icon">📋</div>
        <p class="empty-text">아직 개설한 투표가 없습니다.</p>
        <a href="#create" class="btn btn-primary">첫 투표 개설하기</a>
       </div>`
    : polls.map(poll => {
        const expired = isExpired(poll);
        const status = expired
          ? '<span class="badge badge-gray">마감</span>'
          : '<span class="badge badge-green">진행 중</span>';
        const deadline = poll.deadline ? fmtDt(poll.deadline) : '기한 없음';
        const sectionTag = poll.section ? ` <span class="section-tag">[${poll.section}]</span>` : '';
        return `
          <div class="poll-card" onclick="nav('poll/${poll.id}')">
            <div class="poll-card-body">
              <div class="poll-card-title">${poll.pollName}${sectionTag}</div>
              <div class="poll-card-meta">마감: ${deadline}</div>
            </div>
            <div class="poll-card-right">
              ${status}
              <span class="poll-card-votes">${poll.votes.length}명 참여</span>
              <span class="arrow-icon">→</span>
            </div>
          </div>
        `;
      }).join('');

  document.getElementById('main').innerHTML = `
    <div class="container">
      <div class="page-header">
        <div>
          <h1 class="page-title">내 투표 목록</h1>
          <p class="page-sub">${db.session.name} 교수님의 투표 공간 목록입니다.</p>
        </div>
        <a href="#create" class="btn btn-primary">+ 새 투표 개설</a>
      </div>
      ${pollsHtml}
    </div>
  `;
}

// ---- Create Poll ----

let tempSlots = [];

function renderCreatePoll() {
  tempSlots = [];
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  const nowStr = now.toISOString().slice(0, 16);

  document.getElementById('main').innerHTML = `
    <div class="container-sm">
      <div class="card">
        <a href="#dashboard" class="btn-back">← 목록으로</a>
        <h1 class="page-title" style="margin-top:16px;">새 투표 개설</h1>

        <label>과목명 <span class="required">*</span></label>
        <input type="text" id="poll-name" placeholder="예: 자료구조 중간고사" />

        <label>분반 <span class="text-sub">(선택)</span></label>
        <input type="text" id="poll-section" placeholder="예: 01분반" />

        <label>투표 마감 일시 <span class="required">*</span></label>
        <input type="datetime-local" id="poll-deadline" min="${nowStr}" />

        <label>후보 시간대 <span class="required">*</span></label>
        <div class="slot-input-row">
          <input type="datetime-local" id="slot-input" style="flex:1;" />
          <button class="btn btn-sm btn-outline" onclick="addSlot()">+ 추가</button>
        </div>
        <div id="slot-list" class="slot-list">
          <p class="empty-hint">추가된 시간대가 없습니다.</p>
        </div>

        <button class="btn btn-primary btn-full" onclick="createPoll()">투표 공간 생성</button>
      </div>
    </div>
  `;
}

function addSlot() {
  const inp = document.getElementById('slot-input');
  if (!inp.value) return alert('시간대를 선택해주세요.');
  const d = new Date(inp.value);
  const timeText =
    d.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' }) +
    ' ' +
    d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
  const id = Date.now();
  tempSlots.push({ id, timeText, datetime: inp.value });
  inp.value = '';
  renderTempSlots();
}

function removeSlot(id) {
  tempSlots = tempSlots.filter(s => s.id !== id);
  renderTempSlots();
}

function renderTempSlots() {
  const el = document.getElementById('slot-list');
  if (tempSlots.length === 0) {
    el.innerHTML = '<p class="empty-hint">추가된 시간대가 없습니다.</p>';
    return;
  }
  el.innerHTML = tempSlots.map(s => `
    <div class="slot-row">
      <span>${s.timeText}</span>
      <button class="btn-remove" onclick="removeSlot(${s.id})">×</button>
    </div>
  `).join('');
}

function createPoll() {
  const pollName = document.getElementById('poll-name').value.trim();
  const section  = document.getElementById('poll-section').value.trim();
  const deadline = document.getElementById('poll-deadline').value;
  if (!pollName) return alert('과목명을 입력해주세요.');
  if (!deadline) return alert('투표 마감 일시를 설정해주세요.');
  if (tempSlots.length === 0) return alert('후보 시간대를 최소 1개 이상 추가해주세요.');
  const poll = db.createPoll({
    pollName, section,
    slots: [...tempSlots],
    deadline: new Date(deadline).toISOString()
  });
  nav(`poll/${poll.id}`);
}

// ---- Poll Management (link + QR + results) ----

function renderPollManage(pollId) {
  const poll = db.getPoll(pollId);
  const main = document.getElementById('main');

  if (!poll) {
    main.innerHTML = `<div class="container"><p class="text-sub">투표를 찾을 수 없습니다.</p></div>`;
    return;
  }
  if (poll.profEmail !== db.session.email) {
    main.innerHTML = `<div class="container"><p class="text-sub">접근 권한이 없습니다.</p></div>`;
    return;
  }

  const voteUrl = votePageUrl(poll.id);
  const expired = isExpired(poll);
  const optimal = getOptimalSlot(poll);

  const optimalBanner = expired && optimal
    ? `<div class="optimal-banner">
        <div class="optimal-label">✓ 시스템 추천 최적 시간</div>
        <div class="optimal-time">${optimal.timeText}</div>
        <div class="optimal-sub">
          불가 응답 ${poll.votes.filter(v => v.impossibleSlots.includes(optimal.id)).length}명
          (전체 ${poll.votes.length}명 중)
        </div>
       </div>`
    : '';

  const slotsHtml = poll.slots.map(slot => {
    const impossibleVoters = poll.votes.filter(v => v.impossibleSlots.includes(slot.id));
    const count = impossibleVoters.length;
    const pct   = poll.votes.length === 0 ? 0 : Math.round((count / poll.votes.length) * 100);
    const isOpt = optimal && slot.id === optimal.id;
    const voterChips = count > 0
      ? impossibleVoters.map(v => `<span class="voter-chip">${v.voterName}(${v.voterId})</span>`).join('')
      : '<span class="all-ok">전원 참석 가능</span>';
    return `
      <div class="result-row ${isOpt ? 'result-optimal' : ''}">
        <div class="result-head">
          <span class="result-date">
            ${slot.timeText}
            ${isOpt ? '<span class="badge badge-primary">✓ 추천</span>' : ''}
          </span>
          <span class="result-count">
            불가 ${count}명 <span class="badge badge-red">${pct}%</span>
          </span>
        </div>
        <div class="bar-bg">
          <div class="bar-fill ${isOpt ? 'bar-optimal' : ''}" style="width:${pct}%;"></div>
        </div>
        <div class="names-row">${voterChips}</div>
      </div>
    `;
  }).join('');

  const sectionTag = poll.section ? ` <span class="section-tag">[${poll.section}]</span>` : '';
  const statusHtml = expired
    ? '<span class="status-expired">투표 마감됨</span>'
    : '<span class="status-active">투표 진행 중</span>';

  main.innerHTML = `
    <div class="container">
      <a href="#dashboard" class="btn-back">← 내 투표 목록</a>

      <div class="page-header" style="margin-top:16px;">
        <div>
          <h1 class="page-title">${poll.pollName}${sectionTag}</h1>
          <p class="page-sub">
            마감: ${fmtDt(poll.deadline)} · ${statusHtml} · 참여: ${poll.votes.length}명
          </p>
        </div>
        <button class="btn btn-sm btn-danger-ghost" onclick="confirmDeletePoll('${poll.id}')">삭제</button>
      </div>

      ${optimalBanner}

      <div class="card mb-20">
        <h2 class="section-title">학생 공유 링크 &amp; QR 코드</h2>
        <p class="qr-hint" style="margin-bottom:12px;">아래 링크 또는 QR 코드를 학생들에게 공유하세요.</p>
        <div class="link-row">
          <input type="text" id="vote-url-input" value="${voteUrl}" readonly class="link-input" />
          <button class="btn btn-sm btn-outline" onclick="copyVoteLink(this)">복사</button>
        </div>
        <div id="qr-box" class="qr-box"></div>
      </div>

      <div class="card">
        <h2 class="section-title">
          투표 결과
          <span class="text-sub" style="font-weight:400; font-size:14px;">총 ${poll.votes.length}명 참여</span>
        </h2>
        ${poll.votes.length === 0
          ? '<p class="empty-hint">아직 투표 참여자가 없습니다.</p>'
          : slotsHtml
        }
      </div>
    </div>
  `;

  const qrBox = document.getElementById('qr-box');
  if (typeof QRCode !== 'undefined') {
    new QRCode(qrBox, {
      text: voteUrl,
      width: 160,
      height: 160,
      colorDark: '#111827',
      colorLight: '#ffffff',
      correctLevel: QRCode.CorrectLevel.M
    });
  } else {
    qrBox.innerHTML = '<p class="empty-hint">QR 생성 불가 (인터넷 연결 필요)</p>';
  }
}

function copyVoteLink(btn) {
  const url = document.getElementById('vote-url-input').value;
  const fallback = () => {
    const ta = document.createElement('textarea');
    ta.value = url;
    ta.style.cssText = 'position:fixed;opacity:0;';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    flashCopied(btn);
  };
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(url).then(() => flashCopied(btn)).catch(fallback);
  } else {
    fallback();
  }
}

function flashCopied(btn) {
  const orig = btn.textContent;
  btn.textContent = '복사됨 ✓';
  btn.style.cssText = 'background:var(--success-bg);color:var(--success);border-color:var(--success-bg);';
  setTimeout(() => {
    btn.textContent = orig;
    btn.style.cssText = '';
  }, 2000);
}

function confirmDeletePoll(pollId) {
  if (!confirm('이 투표를 삭제하시겠습니까? 복구할 수 없습니다.')) return;
  db.deletePoll(pollId);
  nav('dashboard');
}
