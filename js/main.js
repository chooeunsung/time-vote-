let currentTab = 0;
let tempSlots = []; // 투표 개설 시 임시 저장할 시간대 배열
let currentVotingPollId = null; // 학생이 현재 투표 중인 투표 ID
let currentImpossibleSlots = []; // 학생이 체크한 불가능 시간대

// 1. 화면 이동 로직
function goTab(i) {
  if ((i === 1 || i === 3) && !db.isLoggedIn) {
      alert("접근 권한이 없습니다. 먼저 교수 로그인을 진행해주세요.");
      return goTab(0);
  }

  currentTab = i;
  document.querySelectorAll('.screen').forEach((s, idx) => s.classList.toggle('active', idx === i));
  document.querySelectorAll('.step-tab').forEach((t, idx) => t.classList.toggle('active', idx === i));

  if (i === 0 && db.isLoggedIn) document.getElementById('nav-user').textContent = `${db.profName} 교수`;
  if (i === 1) {
      tempSlots = [];
      renderAdminSlots();
      document.getElementById('link-card').style.display = 'none';
  }
  if (i === 2) {
      backToPollList(); // 학생 탭 누르면 무조건 목록부터 보여줌
  }
  if (i === 3) renderResults();
}

if(db.isLoggedIn) document.getElementById('nav-user').textContent = `${db.profName} 교수`;

// 2. 로그인 로직
function doLogin() {
  const email = document.getElementById('login-email').value;
  const pw = document.getElementById('login-pw').value;
  const name = document.getElementById('login-name').value;
  
  if(!email || !pw || !name) return alert("이메일, 비밀번호, 교수명을 모두 입력해주세요.");
  
  db.isLoggedIn = true;
  db.profName = name;
  db.save();
  
  document.getElementById('nav-user').textContent = `${name} 교수`;
  goTab(1); 
}

// 3. 투표 개설 로직
function addSlot() {
  const inp = document.getElementById('slot-input');
  if (!inp.value) return;
  const d = new Date(inp.value);
  const timeText = d.toLocaleDateString('ko-KR', {month:'long',day:'numeric',weekday:'short'}) + ' ' + d.toLocaleTimeString('ko-KR', {hour:'2-digit',minute:'2-digit'});
  
  tempSlots.push({ id: Date.now(), timeText: timeText });
  inp.value = "";
  renderAdminSlots();
}

function removeSlot(id) {
  tempSlots = tempSlots.filter(slot => slot.id !== id);
  renderAdminSlots();
}

function renderAdminSlots() {
  const list = document.getElementById('slot-list');
  list.innerHTML = ""; 
  tempSlots.forEach(slot => {
    list.innerHTML += `<div class="slot-row"><span>${slot.timeText}</span><button onclick="removeSlot(${slot.id})">×</button></div>`;
  });
}

function createPoll() {
  const name = document.getElementById('poll-name').value;
  const section = document.getElementById('poll-section').value;
  
  if (!name || tempSlots.length === 0) return alert("과목명과 시간대를 최소 1개 이상 입력해주세요.");
  
  const newPollId = Date.now();
  db.polls.push({
      id: newPollId,
      profName: db.profName,
      pollName: name,
      section: section,
      slots: tempSlots,
      votes: [] // 투표 내역 저장용 배열
  });
  db.save();
  
  document.getElementById('poll-name').value = "";
  document.getElementById('poll-section').value = "";
  tempSlots = [];
  renderAdminSlots();
  
  document.getElementById('link-text').textContent = `https://exampoll.app/v/${newPollId}`;
  document.getElementById('link-card').style.display = 'block';
}

// 링크 복사 (호환성 개선)
function copyLink(event) {
  const txt = document.getElementById('link-text').textContent;
  const btn = event.target;

  if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(txt).then(() => showCopied(btn));
  } else {
      // 로컬 환경을 위한 구식 복사 방법
      const textArea = document.createElement("textarea");
      textArea.value = txt;
      textArea.style.position = "fixed";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
          document.execCommand('copy');
          showCopied(btn);
      } catch (err) {
          alert('복사에 실패했습니다. 텍스트를 직접 드래그해서 복사해주세요.');
      }
      document.body.removeChild(textArea);
  }
}
function showCopied(btn) {
    btn.textContent = '복사됨';
    setTimeout(() => { btn.textContent = '복사'; }, 1500);
}

// 4. 학생 화면 로직 (목록 및 검색)
function renderStudentPollList() {
    const listContainer = document.getElementById('student-poll-list');
    const searchTerm = document.getElementById('search-input').value.toLowerCase();
    
    listContainer.innerHTML = "";
    
    if (db.polls.length === 0) {
        listContainer.innerHTML = `<p style="text-align:center; color:var(--color-text-sub); margin-top:20px;">개설된 투표가 없습니다.</p>`;
        return;
    }

    // 검색어 필터링 적용
    const filteredPolls = db.polls.filter(poll => {
        const fullText = `${poll.pollName} ${poll.section}`.toLowerCase();
        return fullText.includes(searchTerm);
    });

    if (filteredPolls.length === 0) {
        listContainer.innerHTML = `<p style="text-align:center; color:var(--color-text-sub); margin-top:20px;">검색 결과가 없습니다.</p>`;
        return;
    }

    filteredPolls.reverse().forEach(poll => {
        const sectionText = poll.section ? `[${poll.section}]` : "";
        listContainer.innerHTML += `
            <div class="slot-row" style="cursor:pointer; padding: 16px; background:var(--color-card-bg); border:1px solid var(--color-border);" onclick="openPollDetail(${poll.id})">
                <div>
                    <div style="font-weight:700; color:var(--color-text-main); font-size:16px;">${poll.pollName} <span style="color:var(--color-primary);">${sectionText}</span></div>
                    <div style="font-size:13px; color:var(--color-text-sub); margin-top:4px;">작성자: ${poll.profName} 교수</div>
                </div>
                <span style="color:var(--color-text-sub);">투표하기 →</span>
            </div>
        `;
    });
}

function backToPollList() {
    document.getElementById('student-list-view').style.display = 'block';
    document.getElementById('student-detail-view').style.display = 'none';
    document.getElementById('search-input').value = "";
    renderStudentPollList();
}

// 5. 학생 상세 투표 화면 로직
function openPollDetail(pollId) {
    const poll = db.polls.find(p => p.id === pollId);
    if(!poll) return;

    currentVotingPollId = pollId;
    currentImpossibleSlots = [];

    document.getElementById('student-list-view').style.display = 'none';
    document.getElementById('student-detail-view').style.display = 'block';

    const sectionText = poll.section ? ` [${poll.section}]` : "";
    document.getElementById('student-poll-title').textContent = poll.pollName + sectionText;
    document.getElementById('student-poll-sub').innerHTML = `작성자: <strong>${poll.profName} 교수</strong><br>불가능한 시간대에 체크하세요.`;

    const container = document.getElementById('vote-list-container');
    container.innerHTML = ""; 
    
    poll.slots.forEach(slot => {
        container.innerHTML += `
          <div class="vote-slot" onclick="toggleSlot(this, ${slot.id})">
            <div>
              <div class="slot-label">${slot.timeText}</div>
              <div class="unavail-label">불가능한 경우 체크</div>
            </div>
            <div class="slot-check"></div>
          </div>
        `;
    });
}

function toggleSlot(el, slotId) {
  const isChecked = el.classList.toggle('checked');
  const check = el.querySelector('.slot-check');
  const label = el.querySelector('.unavail-label');
  
  check.textContent = isChecked ? '✕' : '';
  label.textContent = isChecked ? '불가능 표시됨' : '불가능한 경우 체크';

  if(isChecked) {
      currentImpossibleSlots.push(slotId);
  } else {
      currentImpossibleSlots = currentImpossibleSlots.filter(id => id !== slotId);
  }
}

function submitVote() {
  const name = document.getElementById('voter-name').value;
  if (!name) return alert("본인의 이름을 입력해주세요!");

  const pollIndex = db.polls.findIndex(p => p.id === currentVotingPollId);
  if(pollIndex === -1) return;

  // 해당 투표 항목의 votes 배열에 내 투표 추가
  db.polls[pollIndex].votes.push({
      voterName: name,
      impossibleSlots: currentImpossibleSlots
  });
  db.save();

  alert(`투표가 완료되었습니다!`);
  
  document.getElementById('voter-name').value = "";
  backToPollList();
}

// 6. 결과 조회 로직 (다중 투표 대응)
function renderResults() {
  const container = document.getElementById('result-list-container');
  container.innerHTML = "";

  // 현재 로그인한 교수가 만든 투표만 필터링
  const myPolls = db.polls.filter(p => p.profName === db.profName);

  if(myPolls.length === 0) {
      container.innerHTML = `<p style="text-align:center; color:var(--color-text-sub); margin-top:20px;">개설한 투표가 없습니다.</p>`;
      return;
  }

  myPolls.reverse().forEach(poll => {
      const sectionText = poll.section ? ` [${poll.section}]` : "";
      let html = `
        <div style="border:1px solid var(--color-border); border-radius:var(--radius-md); padding:16px; margin-bottom:24px; background:var(--color-card-bg);">
          <h3 style="font-size:18px; color:var(--color-text-main); margin-bottom:4px;">${poll.pollName}${sectionText}</h3>
          <p style="font-size:13px; color:var(--color-text-sub); margin-bottom:16px;">총 참여: ${poll.votes.length}명</p>
      `;

      poll.slots.forEach(slot => {
          let impossibleVoters = [];
          poll.votes.forEach(vote => {
              if(vote.impossibleSlots.includes(slot.id)) impossibleVoters.push(vote.voterName);
          });
          
          const count = impossibleVoters.length;
          const total = poll.votes.length === 0 ? 1 : poll.votes.length; 
          const percent = Math.round((count / total) * 100);
          
          html += `
            <div class="result-row">
              <div class="result-head">
                <span class="result-date">${slot.timeText}</span>
                <span class="result-count">불가 ${count}명 <span class="badge badge-red">${poll.votes.length === 0 ? 0 : percent}%</span></span>
              </div>
              <div class="bar-bg"><div class="bar-fill" style="width:${poll.votes.length === 0 ? 0 : percent}%;"></div></div>
              <div class="names-row">${count > 0 ? impossibleVoters.join(', ') : '전원 참석 가능'}</div>
            </div>
          `;
      });

      html += `</div>`;
      container.innerHTML += html;
  });
}