let tempSlots = []; 

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
      votes: [] 
  });
  db.save();
  
  document.getElementById('poll-name').value = "";
  document.getElementById('poll-section').value = "";
  tempSlots = [];
  renderAdminSlots();
  
  // 성공 알림만 띄우고 화면은 그대로 유지합니다.
  alert("투표 공간이 성공적으로 개설되었습니다!");
}