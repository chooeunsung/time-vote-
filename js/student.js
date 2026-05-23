let currentVotingPollId = null; 
let currentImpossibleSlots = []; 

function renderStudentPollList() {
    const listContainer = document.getElementById('student-poll-list');
    const searchTerm = document.getElementById('search-input').value.toLowerCase();
    
    listContainer.innerHTML = "";
    
    if (db.polls.length === 0) {
        listContainer.innerHTML = `<p style="text-align:center; color:var(--color-text-sub); margin-top:20px;">개설된 투표가 없습니다.</p>`;
        return;
    }

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

    document.getElementById('voter-name').value = db.studentName;
    document.getElementById('voter-id').value = db.studentId;

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
  const stuId = document.getElementById('voter-id').value;
  
  if (!name || !stuId) return alert("본인의 이름과 학번을 모두 입력해주세요!");

  const pollIndex = db.polls.findIndex(p => p.id === currentVotingPollId);
  if(pollIndex === -1) return;

  // 동일한 학번이 이미 투표를 했는지 검사
  const existingVoteIndex = db.polls[pollIndex].votes.findIndex(v => v.voterId === stuId);
  
  if (existingVoteIndex !== -1) {
      // 이미 투표한 학번이라면 데이터를 덮어씌움 (중복 방지)
      db.polls[pollIndex].votes[existingVoteIndex].voterName = name;
      db.polls[pollIndex].votes[existingVoteIndex].impossibleSlots = [...currentImpossibleSlots];
  } else {
      // 새로운 학번이면 새 투표로 추가
      db.polls[pollIndex].votes.push({
          voterName: name,
          voterId: stuId,
          impossibleSlots: [...currentImpossibleSlots] // 배열 복사본 저장
      });
  }
  
  db.studentName = name;
  db.studentId = stuId;
  db.save();

  alert(`투표가 완료되었습니다!`);
  backToPollList();
}