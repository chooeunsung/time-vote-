let currentTab = 0;

function goTab(i) {
  if (i === 1 && !db.isLoggedIn) {
      alert("접근 권한이 없습니다. 먼저 교수 로그인을 진행해주세요.");
      return goTab(0);
  }

  currentTab = i;
  document.querySelectorAll('.screen').forEach((s, idx) => s.classList.toggle('active', idx === i));
  
  const tabs = document.querySelectorAll('.step-tab');
  tabs.forEach((t, idx) => t.classList.toggle('active', idx === i));

  if (tabs[1]) {
      tabs[1].style.display = db.isLoggedIn ? '' : 'none';
  }

  if (db.isLoggedIn) {
      document.getElementById('nav-user').textContent = `${db.profName} 교수`;
      document.getElementById('nav-logout').style.display = 'inline-block';
  } else {
      document.getElementById('nav-user').textContent = "로그인 전";
      document.getElementById('nav-logout').style.display = 'none';
  }

  if (i === 1) {
      tempSlots = [];
      renderAdminSlots();
      // 기존에 있던 document.getElementById('link-card').style.display = 'none'; 삭제됨
  }
  if (i === 2) backToPollList(); 
  if (i === 3) {
      const resultSearchInp = document.getElementById('result-search-input');
      if(resultSearchInp) resultSearchInp.value = "";
      renderResults();
  }
  
  if (i === 0 && !db.isLoggedIn) toggleSignup(false);
}

goTab(0);

function toggleSignup(showSignup) {
    document.getElementById('login-card').style.display = showSignup ? 'none' : 'block';
    document.getElementById('signup-card').style.display = showSignup ? 'block' : 'none';
}

async function hashPassword(password) {
    const msgBuffer = new TextEncoder().encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function doSignup() {
    const email = document.getElementById('signup-email').value;
    const pw = document.getElementById('signup-pw').value;
    const pwConfirm = document.getElementById('signup-pw-confirm').value;
    const name = document.getElementById('signup-name').value;

    if(!email || !pw || !pwConfirm || !name) return alert("모든 항목을 빠짐없이 입력해주세요.");
    if(!email.endsWith("@sejong.ac.kr")) return alert("세종대학교 이메일(@sejong.ac.kr)로만 가입할 수 있습니다.");
    if(pw !== pwConfirm) return alert("비밀번호가 일치하지 않습니다. 다시 확인해주세요.");

    const isExist = db.registeredProfs.some(prof => prof.email === email);
    if(isExist) return alert("이미 가입된 이메일 계정입니다.");

    const hashedPw = await hashPassword(pw);

    db.registeredProfs.push({ email: email, pw: hashedPw, name: name });
    db.save();

    alert("회원가입이 완료되었습니다! 가입하신 정보로 로그인해주세요.");
    
    document.getElementById('signup-email').value = "";
    document.getElementById('signup-pw').value = "";
    document.getElementById('signup-pw-confirm').value = "";
    document.getElementById('signup-name').value = "";
    
    toggleSignup(false);
}

async function doLogin() {
  const email = document.getElementById('login-email').value;
  const pw = document.getElementById('login-pw').value;
  const name = document.getElementById('login-name').value;
  
  if(!email || !pw || !name) return alert("이메일, 비밀번호, 교수명을 모두 입력해주세요.");
  
  const hashedPw = await hashPassword(pw);
  
  const isValidUser = db.registeredProfs.some(prof => 
      prof.email === email && 
      prof.pw === hashedPw && 
      prof.name === name
  );

  if (!isValidUser) {
      return alert("입력하신 정보가 등록된 교수 계정과 일치하지 않습니다.\n이메일, 비밀번호, 교수명을 다시 확인해주세요.");
  }
  
  db.isLoggedIn = true;
  db.profName = name;
  db.save();
  goTab(1); 
}

function logout() {
    db.isLoggedIn = false;
    db.profName = "";
    db.save();
    
    document.getElementById('login-email').value = "";
    document.getElementById('login-pw').value = "";
    document.getElementById('login-name').value = "";
    
    alert("안전하게 로그아웃 되었습니다.");
    goTab(0);
}

function deletePoll(pollId) {
    if(!confirm("정말 이 투표를 삭제하시겠습니까? (삭제 시 복구 불가)")) return;
    
    db.polls = db.polls.filter(p => p.id !== pollId);
    db.save();
    renderResults();
}

function renderResults() {
  const container = document.getElementById('result-list-container');
  container.innerHTML = "";

  const titleEl = document.getElementById('result-title');
  const subEl = document.getElementById('result-sub');
  
  const searchInputEl = document.getElementById('result-search-input');
  const searchTerm = searchInputEl ? searchInputEl.value.toLowerCase() : "";

  let pollsToShow = [];

  if (db.isLoggedIn) {
      titleEl.textContent = "내 투표 결과 조회 (교수 모드)";
      subEl.textContent = "개설하신 투표의 상세 결과 및 학생 명단입니다.";
      pollsToShow = db.polls.filter(p => p.profName === db.profName);
  } else {
      titleEl.textContent = "투표 현황 조회 (학생 모드)";
      subEl.textContent = "현재 진행 중인 투표의 익명 현황입니다. (다른 학생의 학번 및 이름 비공개)";
      pollsToShow = db.polls;
  }

  if (searchTerm) {
      pollsToShow = pollsToShow.filter(poll => {
          const fullText = `${poll.pollName} ${poll.section}`.toLowerCase();
          return fullText.includes(searchTerm);
      });
  }

  if(pollsToShow.length === 0) {
      container.innerHTML = `<p style="text-align:center; color:var(--color-text-sub); margin-top:20px;">${searchTerm ? "검색 결과가 없습니다." : "조회할 투표가 없습니다."}</p>`;
      return;
  }

  pollsToShow.reverse().forEach(poll => {
      const sectionText = poll.section ? ` [${poll.section}]` : "";
      
      const deleteBtnHtml = db.isLoggedIn 
        ? `<button onclick="deletePoll(${poll.id})" style="position:absolute; top:16px; right:16px; background:var(--color-danger-bg); color:var(--color-danger); border:none; padding:6px 10px; border-radius:6px; font-size:12px; font-weight:600; cursor:pointer;">투표 삭제</button>` 
        : "";

      let html = `
        <div style="border:1px solid var(--color-border); border-radius:var(--radius-md); padding:16px; margin-bottom:24px; background:var(--color-card-bg); position:relative;">
          ${deleteBtnHtml}
          <h3 style="font-size:18px; color:var(--color-text-main); margin-bottom:4px; padding-right:70px;">${poll.pollName}${sectionText}</h3>
          <p style="font-size:13px; color:var(--color-text-sub); margin-bottom:16px;">총 참여: ${poll.votes.length}명 (개설자: ${poll.profName} 교수)</p>
      `;

      poll.slots.forEach(slot => {
          let impossibleVoters = [];
          poll.votes.forEach(vote => {
              if(vote.impossibleSlots.includes(slot.id)) {
                  impossibleVoters.push(`${vote.voterName}(${vote.voterId})`);
              }
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
          `;

          if (db.isLoggedIn) {
              html += `<div class="names-row">${count > 0 ? impossibleVoters.join(', ') : '전원 참석 가능'}</div>`;
          } else {
              html += `<div class="names-row" style="color:var(--color-primary); font-weight:500;">${count > 0 ? '익명 보호됨' : '전원 참석 가능'}</div>`;
          }
          
          html += `</div>`;
      });

      html += `</div>`;
      container.innerHTML += html;
  });
}