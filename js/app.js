function showLoading() {
  document.getElementById('main').innerHTML = `
    <div class="loading-wrap"><div class="spinner"></div></div>
  `;
}

function nav(path) {
  location.hash = path;
}

function doLogout() {
  db.logout();
  nav('home');
}

function renderNavbar() {
  document.getElementById('navbar').innerHTML = `
    <div class="nav-inner">
      <a class="nav-logo" href="#home">exam<span>poll</span></a>
      <div class="nav-right">
        ${db.isLoggedIn()
          ? `<span class="nav-prof">${db.session.name} 교수님</span>
             <a href="#dashboard" class="btn btn-sm btn-ghost">내 투표 관리</a>
             <button class="btn btn-sm btn-ghost danger" onclick="doLogout()">로그아웃</button>`
          : `<a href="#browse" class="btn btn-sm btn-ghost">투표 참여</a>
             <a href="#login" class="btn btn-sm btn-outline">교수 로그인</a>`
        }
      </div>
    </div>
  `;
}

function route() {
  const hash = (location.hash || '').replace(/^#\/?/, '') || 'home';
  const slash = hash.indexOf('/');
  const page = slash === -1 ? hash : hash.slice(0, slash);
  const id   = slash === -1 ? '' : hash.slice(slash + 1);

  renderNavbar();

  switch (page) {
    case 'login':
      db.isLoggedIn() ? nav('dashboard') : renderLogin();
      break;
    case 'signup':
      db.isLoggedIn() ? nav('dashboard') : renderSignup();
      break;
    case 'dashboard':
      db.isLoggedIn() ? renderDashboard() : nav('login');
      break;
    case 'create':
      db.isLoggedIn() ? renderCreatePoll() : nav('login');
      break;
    case 'poll':
      db.isLoggedIn() ? renderPollManage(id) : nav('login');
      break;
    case 'vote':
      renderVote(id);
      break;
    case 'browse':
      renderBrowse();
      break;
    default:
      renderHome();
  }
}

window.addEventListener('hashchange', route);
route();
