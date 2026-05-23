const db = {
    isLoggedIn: false, 
    profName: "",      
    polls: [], 
    studentName: "", 
    studentId: "",   
    registeredProfs: [], 
    
    load: function() {
        // 암호화 기능 도입으로 기존 평문 비밀번호 데이터와 꼬이지 않도록 v6로 새롭게 시작합니다.
        const saved = localStorage.getItem('examPollData_v6');
        
        if (saved) {
            const parsed = JSON.parse(saved);
            this.isLoggedIn = parsed.isLoggedIn || false;
            this.profName = parsed.profName || "";
            this.polls = parsed.polls || [];
            this.studentName = parsed.studentName || "";
            this.studentId = parsed.studentId || "";
            this.registeredProfs = parsed.registeredProfs || [];
        } else {
            // 이제 완벽한 회원가입 창이 있으므로, 처음부터 직접 가입해서 테스트하도록 기본 데이터를 비웁니다.
            this.registeredProfs = [];
            this.polls = [];
            this.save(); 
        }
    },
    
    save: function() {
        localStorage.setItem('examPollData_v6', JSON.stringify({
            isLoggedIn: this.isLoggedIn,
            profName: this.profName,
            polls: this.polls,
            studentName: this.studentName,
            studentId: this.studentId,
            registeredProfs: this.registeredProfs
        }));
    }
};

db.load();