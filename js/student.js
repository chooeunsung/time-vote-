// ---- Browse ----

function renderBrowse() {
  const all    = db.getAllPolls();
  const active = all.filter(p => !isExpired(p));
  const closed = all.filter(p =>  isExpired(p));

  function card(poll, isClosed) {
    const section = poll.section ? ` [${poll.section}]` : '';
    const deadline = poll.deadline ? `마감: ${fmtDt(poll.deadline)}` : '';
    const click = isClosed ? '' : `onclick="nav('vote/${poll.id}')"`;
    return `
      <div class="poll-card ${isClosed ? 'poll-card-expired' : 'poll-card-clickable'}" ${click}>
        <div class="poll-card-body">
          <div class="poll-card-title">${poll.pollName}${section}</div>
          <div class="poll-card-meta">${poll.profName} 교수 · ${deadline}</div>
        </div>
        <div class="poll-card-right">
          ${isClosed
            ? '<span class="badge badge-gray">마감</span>'
            : '<span class="arrow-icon">투표하기 →</span>'
          }
        </div>
      </div>
    `;
  }

  const activeHtml = active.length === 0
    ? '<p class="empty-hint">현재 참여 가능한 투표가 없습니다.</p>'
    : active.slice().reverse().map(p => card(p, false)).join('');

  const closedHtml = closed.length > 0
    ? `<div class="section-divider">마감된 투표</div>
       ${closed.slice().reverse().map(p => card(p, true)).join('')}`
    : '';

  document.getElementById('main').innerHTML = `
    <div class="container">
      <div class="page-header">
        <div>
          <h1 class="page-title">투표 목록</h1>
          <p class="page-sub">참여할 투표를 선택하세요. 로그인 없이 이름과 학번만으로 투표할 수 있습니다.</p>
        </div>
      </div>
      <input type="text" id="browse-search" placeholder="🔍 과목명 또는 교수 이름 검색"
             oninput="filterBrowse()" style="margin-bottom:16px;" />
      <div id="browse-list">
        ${activeHtml}
        ${closedHtml}
      </div>
    </div>
  `;
}

function filterBrowse() {
  const term = document.getElementById('browse-search').value.toLowerCase();
  const polls = db.getAllPolls();
  const container = document.getElementById('browse-list');

  const filtered = polls.filter(p =>
    `${p.pollName} ${p.section} ${p.profName}`.toLowerCase().includes(term)
  );

  if (filtered.length === 0) {
    container.innerHTML = '<p class="empty-hint">검색 결과가 없습니다.</p>';
    return;
  }

  function card(poll) {
    const isClosed = isExpired(poll);
    const section = poll.section ? ` [${poll.section}]` : '';
    const deadline = poll.deadline ? `마감: ${fmtDt(poll.deadline)}` : '';
    const click = isClosed ? '' : `onclick="nav('vote/${poll.id}')"`;
    return `
      <div class="poll-card ${isClosed ? 'poll-card-expired' : 'poll-card-clickable'}" ${click}>
        <div class="poll-card-body">
          <div class="poll-card-title">${poll.pollName}${section}</div>
          <div class="poll-card-meta">${poll.profName} 교수 · ${deadline}</div>
        </div>
        <div class="poll-card-right">
          ${isClosed
            ? '<span class="badge badge-gray">마감</span>'
            : '<span class="arrow-icon">투표하기 →</span>'
          }
        </div>
      </div>
    `;
  }

  container.innerHTML = filtered.slice().reverse().map(card).join('');
}

// ---- Vote ----

let _voteSlots = new Set();

function renderVote(pollId) {
  _voteSlots = new Set();
  const poll = db.getPoll(pollId);
  const main = document.getElementById('main');

  if (!poll) {
    main.innerHTML = `
      <div class="container-sm">
        <div class="card text-center">
          <div class="empty-icon" style="font-size:40px;">🔍</div>
          <h2 class="page-title">투표를 찾을 수 없습니다</h2>
          <p class="text-sub" style="margin-top:8px;">링크가 올바른지 확인해주세요.</p>
          <a href="#browse" class="btn btn-outline" style="margin-top:20px; display:inline-flex;">투표 목록 보기</a>
        </div>
      </div>
    `;
    return;
  }

  if (isExpired(poll)) {
    main.innerHTML = `
      <div class="container-sm">
        <div class="card text-center">
          <div class="empty-icon" style="font-size:40px;">🔒</div>
          <h2 class="page-title" style="margin-top:8px;">투표가 마감되었습니다</h2>
          <p class="text-sub" style="margin-top:8px;">${poll.pollName}${poll.section ? ` [${poll.section}]` : ''}</p>
          <p class="text-sub">마감: ${fmtDt(poll.deadline)}</p>
          <p class="text-sub" style="margin-top:8px;">총 ${poll.votes.length}명이 참여했습니다.</p>
          <a href="#browse" class="btn btn-outline" style="margin-top:20px; display:inline-flex;">다른 투표 보기</a>
        </div>
      </div>
    `;
    return;
  }

  const sectionTag = poll.section ? ` [${poll.section}]` : '';
  const slotsHtml = poll.slots.map(slot => `
    <div class="vote-slot" id="vslot-${slot.id}" onclick="toggleVoteSlot(${slot.id})">
      <div>
        <div class="slot-label">${slot.timeText}</div>
        <div class="unavail-label" id="ulabel-${slot.id}">불가능한 경우 체크하세요</div>
      </div>
      <div class="slot-check" id="scheck-${slot.id}"></div>
    </div>
  `).join('');

  main.innerHTML = `
    <div class="container-sm">
      <div class="card">
        <h1 class="page-title">${poll.pollName}${sectionTag}</h1>
        <p class="page-sub">${poll.profName} 교수 · 마감: ${fmtDt(poll.deadline)}</p>

        <div class="vote-info-box">
          <span>✏️</span>
          <span>이름과 학번을 입력하면 로그인 없이 바로 투표할 수 있습니다. 같은 학번으로 재제출하면 이전 투표가 수정됩니다.</span>
        </div>

        <label>이름 <span class="required">*</span></label>
        <input type="text" id="voter-name" placeholder="본인 이름을 입력하세요" />

        <label>학번 <span class="required">*</span></label>
        <input type="text" id="voter-id" placeholder="예: 23011693" inputmode="numeric" />

        <div style="margin-top:24px;">
          <label style="margin-top:0; font-size:14px; font-weight:700; color:var(--text);">
            참석 불가능한 시간대를 선택하세요
          </label>
          <p style="font-size:12px; color:var(--text-sub); margin-top:4px; margin-bottom:12px;">
            참석 가능한 시간대는 그냥 두세요. 불가능한 시간만 체크하면 됩니다.
          </p>
        </div>
        ${slotsHtml}

        <button class="btn btn-primary btn-full" onclick="submitVote('${pollId}')">투표 제출</button>
      </div>
    </div>
  `;
}

function toggleVoteSlot(slotId) {
  const el    = document.getElementById(`vslot-${slotId}`);
  const check = document.getElementById(`scheck-${slotId}`);
  const label = document.getElementById(`ulabel-${slotId}`);
  const on = el.classList.toggle('checked');
  check.textContent = on ? '✕' : '';
  label.textContent = on ? '불가능 표시됨' : '불가능한 경우 체크하세요';
  if (on) _voteSlots.add(slotId);
  else    _voteSlots.delete(slotId);
}

function submitVote(pollId) {
  const name = document.getElementById('voter-name').value.trim();
  const id   = document.getElementById('voter-id').value.trim();
  if (!name) return alert('이름을 입력해주세요.');
  if (!id)   return alert('학번을 입력해주세요.');
  if (!/^\d+$/.test(id)) return alert('학번은 숫자만 입력해주세요.');
  try {
    db.submitVote(pollId, {
      voterName: name,
      voterId: id,
      impossibleSlots: [..._voteSlots]
    });
    renderVoteSuccess(pollId, name);
  } catch (e) {
    alert(e.message);
  }
}

function renderVoteSuccess(pollId, name) {
  const poll = db.getPoll(pollId);
  const main = document.getElementById('main');
  const sectionTag = poll?.section ? ` [${poll.section}]` : '';
  const impossibleCount = _voteSlots.size;

  main.innerHTML = `
    <div class="container-sm">
      <div class="card text-center">
        <div class="success-icon">✓</div>
        <h2 class="page-title">투표 완료!</h2>
        <p class="text-sub" style="margin-top:8px;">${name}님의 투표가 제출되었습니다.</p>
        <p class="text-sub" style="margin-top:4px; font-size:12px;">
          ${poll?.pollName ?? ''}${sectionTag} ·
          불가 선택: ${impossibleCount}개
        </p>
        <p class="text-sub" style="margin-top:12px; font-size:12px;">
          결과는 마감 후 교수님이 공개합니다.<br>
          투표를 수정하려면 같은 학번으로 다시 제출하세요.
        </p>
        <div class="success-actions">
          <a href="#browse" class="btn btn-outline">다른 투표 보기</a>
          <a href="#vote/${pollId}" class="btn btn-ghost">투표 수정하기</a>
        </div>
      </div>
    </div>
  `;
}
