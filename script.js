/* SafeGuide – script.js
   Gumagana sa lahat ng pages gamit ang <body data-page="..."> */

const API = 'backend/';

/* ---------------- Helpers ---------------- */
async function api(file, action, body = null, extra = '') {
  const opts = { credentials: 'same-origin' };
  if (body) {
    opts.method = 'POST';
    opts.headers = { 'Content-Type': 'application/json' };
    opts.body = JSON.stringify(body);
  }
  try {
    const res = await fetch(`${API}${file}.php?action=${action}${extra}`, opts);
    const data = await res.json();
    data.status = res.status;
    return data;
  } catch (e) {
    return { success: false, message: 'Cannot reach the server. Is Apache/MySQL running in XAMPP?', status: 0 };
  }
}

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function lines(text) {
  return String(text || '').split('\n').map(t => t.trim()).filter(Boolean);
}

function toast(msg) {
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2500);
}

function showMsg(text, type = 'error') {
  const box = $('#msg');
  box.textContent = text;
  box.className = `alert ${type}`;
}

const ICONS = {
  'Burns': '🔥', 'Bleeding': '🩸', 'Choking': '😮‍💨', 'Fracture': '🦴', 'Fainting': '🧍',
  'Insect Bite': '🐛', 'Electric Shock': '⚡', 'Earthquake': '🌍', 'Flood': '🌊', 'Fire': '🔥',
  'Typhoon': '🌀', 'Electrical Emergency': '⚡', 'Police': '👮', 'Fire Department': '🚒',
  'Ambulance': '🚑', 'Philippine Red Cross': '➕'
};
const icon = name => ICONS[name] || '📌';

/* ---------------- Logout ---------------- */
async function logout() {
  await api('auth', 'logout', {});
  location.replace('login.html');
}

/* ---------------- Auth pages ---------------- */
function initRegister() {
  $('#registerForm').addEventListener('submit', async e => {
    e.preventDefault();
    const body = Object.fromEntries(new FormData(e.target));
    const r = await api('auth', 'register', body);
    if (r.success) {
      showMsg(r.message, 'ok');
      setTimeout(() => (location.href = 'login.html'), 1200);
    } else {
      showMsg(r.message);
    }
  });
}

function initLogin() {
  $('#loginForm').addEventListener('submit', async e => {
    e.preventDefault();
    const body = Object.fromEntries(new FormData(e.target));
    const r = await api('auth', 'login', body);
    if (r.success) location.href = r.redirect;
    else showMsg(r.message);
  });
}

// Kung naka-login na, huwag nang ipakita ang login/register
async function redirectIfLoggedIn() {
  const me = await api('auth', 'me');
  if (me.logged_in) location.replace(me.role === 'admin' ? 'admin.html' : 'dashboard.html');
}

/* ---------------- Protected page guard ---------------- */
async function guard(requiredRole) {
  const me = await api('auth', 'me');
  if (!me.logged_in) { location.replace('login.html'); return null; }
  if (requiredRole === 'admin' && me.role !== 'admin') { location.replace('dashboard.html'); return null; }
  if (requiredRole === 'user' && me.role === 'admin') { location.replace('admin.html'); return null; }
  $('#userName').textContent = me.full_name;
  return me;
}

function initShell(views, first) {
  const view = $('#view');
  const go = async name => {
    $$('.sidebar [data-view]').forEach(b => b.classList.toggle('active', b.dataset.view === name));
    $('#sidebar').classList.remove('open');
    view.innerHTML = 'Loading…';
    await views[name](view);
  };
  $$('.sidebar [data-view]').forEach(b => b.addEventListener('click', () => go(b.dataset.view)));
  $$('.logout-btn').forEach(b => b.addEventListener('click', logout));
  $('#menuToggle').addEventListener('click', () => $('#sidebar').classList.toggle('open'));

  // Kapag pinindot ang Back pagkatapos mag-logout, i-check ulit ang session
  window.addEventListener('pageshow', async ev => {
    if (ev.persisted) {
      const me = await api('auth', 'me');
      if (!me.logged_in) location.replace('login.html');
    }
  });
  window.go = go;
  go(first);
}

/* =====================================================
   USER DASHBOARD
   ===================================================== */
function initDashboard() {
  const views = {
    async home(v) {
      const h = await api('content', 'hotlines');
      const hot = (h.data || []).slice(0, 3).map(x =>
        `<div class="hot">${icon(x.name)}<div>${esc(x.name)}</div><b>${esc(x.emergency_no)}</b></div>`).join('');
      v.innerHTML = `
        <h1>User Dashboard</h1>
        <p class="sub">Quick access to important guides and resources.</p>
        <div class="grid grid-4">
          <button class="tile t-red" onclick="go('guides')"><div class="ico">🩹</div><strong>First Aid Guides</strong><small>Learn life-saving techniques</small></button>
          <button class="tile t-orange" onclick="go('procedures')"><div class="ico">⚠️</div><strong>Emergency Procedures</strong><small>Step-by-step instructions</small></button>
          <button class="tile t-green" onclick="go('checklist')"><div class="ico">🎒</div><strong>Disaster Checklist</strong><small>Be prepared and stay safe</small></button>
          <button class="tile t-blue" onclick="go('hotlines')"><div class="ico">📞</div><strong>Hotline Directory</strong><small>Important contact numbers</small></button>
        </div>
        <div class="panel"><h3>Emergency Hotline Directory</h3><div class="hot-grid">${hot}</div></div>`;
    },

    async guides(v) {
      const r = await api('content', 'guides');
      v.innerHTML = `<h1>First Aid Guides</h1><p class="sub">Choose a condition to learn first aid steps.</p>
        <div class="grid grid-4">${(r.data || []).map(g =>
          `<button class="pick" data-id="${g.id}"><span class="ico">${icon(g.category)}</span>${esc(g.title)}</button>`).join('')}</div>`;
      $$('.pick', v).forEach(b => b.addEventListener('click', () => guideDetail(v, b.dataset.id)));
    },

    async procedures(v) {
      const r = await api('content', 'procedures');
      v.innerHTML = `<h1>Emergency Procedures</h1><p class="sub">Learn what to do before, during and after a disaster.</p>
        ${(r.data || []).map(p =>
          `<button class="row-link" data-id="${p.id}"><span>${icon(p.title)} ${esc(p.title)}</span><span>›</span></button>`).join('')}`;
      $$('.row-link', v).forEach(b => b.addEventListener('click', () => {
        const p = r.data.find(x => x.id == b.dataset.id);
        procedureDetail(v, p);
      }));
    },

    async checklist(v) {
      const r = await api('content', 'checklist');
      const items = r.data || [];
      v.innerHTML = `<h1>Disaster Preparedness Checklist</h1><p class="sub">Make sure you have these essential items.</p>
        <div class="panel" style="margin-top:0">
          <h3>Emergency Kit</h3>
          ${items.map(i => `<label class="check"><input type="checkbox" value="${i.id}" ${i.checked == 1 ? 'checked' : ''}> ${esc(i.label)}</label>`).join('')}
          <p style="margin-top:14px"><strong id="pct">0%</strong> <span id="cnt" class="sub"></span></p>
          <div class="progress"><div id="bar"></div></div>
          <button class="btn" id="saveChecklist">Save Checklist</button>
        </div>`;
      const boxes = $$('input[type=checkbox]', v);
      const update = () => {
        const done = boxes.filter(b => b.checked).length;
        const pct = boxes.length ? Math.round(done / boxes.length * 100) : 0;
        $('#pct', v).textContent = pct + '%';
        $('#cnt', v).textContent = `${done} / ${boxes.length} Items Completed`;
        $('#bar', v).style.width = pct + '%';
      };
      boxes.forEach(b => b.addEventListener('change', update));
      update();
      $('#saveChecklist', v).addEventListener('click', async () => {
        const checked = boxes.filter(b => b.checked).map(b => b.value);
        const res = await api('content', 'save_checklist', { checked });
        toast(res.message || 'Saved');
      });
    },

    async hotlines(v) {
      const r = await api('content', 'hotlines');
      v.innerHTML = `<h1>Emergency Hotline Directory</h1><p class="sub">Quick access to important contact numbers.</p>
        ${(r.data || []).map(h => `
          <div class="hl"><div><strong>${icon(h.name)} ${esc(h.name)}</strong><small>${esc(h.other_info)}</small></div>
          <a class="num" href="tel:${esc(h.emergency_no)}">${esc(h.emergency_no)}</a></div>`).join('')}`;
    },

    async saved(v) {
      const r = await api('content', 'saved');
      const list = r.data || [];
      v.innerHTML = `<h1>Saved Guides</h1><p class="sub">Your bookmarked first aid guides.</p>` +
        (list.length
          ? `<div class="grid grid-4">${list.map(g => `<button class="pick" data-id="${g.id}"><span class="ico">${icon(g.category)}</span>${esc(g.title)}</button>`).join('')}</div>`
          : `<div class="panel">No saved guides yet. Open a guide and tap “Save Guide”.</div>`);
      $$('.pick', v).forEach(b => b.addEventListener('click', () => guideDetail(v, b.dataset.id, 'saved')));
    },

    async profile(v) {
      const r = (await api('content', 'profile')).data || {};
      v.innerHTML = `<h1>Profile</h1><p class="sub">Your account details.</p>
        <div class="panel" style="margin-top:0">
          <p><strong>Full name:</strong> ${esc(r.full_name)}</p>
          <p><strong>Username:</strong> ${esc(r.username)}</p>
          <p><strong>Email:</strong> ${esc(r.email)}</p>
          <p><strong>Member since:</strong> ${esc(r.created_at)}</p>
        </div>`;
    }
  };

  async function guideDetail(v, id, back = 'guides') {
    const r = await api('content', 'guide', null, `&id=${encodeURIComponent(id)}`);
    if (!r.success) { toast(r.message); return; }
    const g = r.data;
    v.innerHTML = `
      <button class="btn btn-ghost btn-sm" id="back">← Back to ${back === 'saved' ? 'Saved' : 'Guides'}</button>
      <h1 style="margin-top:14px">${icon(g.category)} First Aid: ${esc(g.title)}</h1>
      <p class="sub">${esc(g.description)}</p>
      <ol class="steps">${lines(g.steps).map(s => `<li>${esc(s)}</li>`).join('')}</ol>
      ${g.warning ? `<div class="warning">⚠️ ${esc(g.warning)}</div>` : ''}
      <div class="actions">
        <button class="btn" id="saveBtn">${g.saved > 0 ? 'Remove from Saved' : 'Save Guide'}</button>
        <button class="btn btn-ghost" id="back2">Back to Guides</button>
      </div>`;
    const goBack = () => window.go(back);
    $('#back', v).addEventListener('click', goBack);
    $('#back2', v).addEventListener('click', goBack);
    $('#saveBtn', v).addEventListener('click', async e => {
      const res = await api('content', 'toggle_save', { guide_id: g.id });
      e.target.textContent = res.saved ? 'Remove from Saved' : 'Save Guide';
      toast(res.saved ? 'Guide saved' : 'Removed from saved');
    });
  }

  function procedureDetail(v, p) {
    const phase = (label, text) => lines(text).length
      ? `<div class="phase"><h4>${label}</h4><ul>${lines(text).map(s => `<li>${esc(s)}</li>`).join('')}</ul></div>` : '';
    v.innerHTML = `
      <button class="btn btn-ghost btn-sm" id="back">← Back</button>
      <h1 style="margin-top:14px">${icon(p.title)} ${esc(p.title)}</h1>
      <div class="panel">
        ${phase('Before', p.before_steps)}${phase('During', p.during_steps)}${phase('After', p.after_steps)}
      </div>`;
    $('#back', v).addEventListener('click', () => window.go('procedures'));
  }

  guard('user').then(me => { if (me) initShell(views, 'home'); });
}

/* =====================================================
   ADMIN DASHBOARD
   ===================================================== */
function openModal(html) {
  const m = document.createElement('div');
  m.className = 'modal';
  m.innerHTML = `<div class="modal-box">${html}</div>`;
  m.addEventListener('click', e => { if (e.target === m) m.remove(); });
  document.body.appendChild(m);
  return m;
}

function initAdmin() {
  const views = {
    async home(v) {
      const s = await api('admin', 'stats');
      v.innerHTML = `
        <h1>Admin Dashboard</h1><p class="sub">Manage the system and monitor activity.</p>
        <div class="grid grid-4">
          <div class="stat t-blue"><small>Total Users</small><b>${s.users ?? 0}</b></div>
          <div class="stat t-green"><small>Total Guides</small><b>${s.guides ?? 0}</b></div>
          <div class="stat t-orange"><small>Total Procedures</small><b>${s.procedures ?? 0}</b></div>
        </div>
        <div class="panel"><h3>Recent Activity</h3>
          <ul class="activity">${(s.activity || []).map(a => `<li><span>${esc(a.message)}</span><small>${esc(a.created_at)}</small></li>`).join('')}</ul>
        </div>`;
    },

    async users(v) {
      const r = await api('admin', 'users');
      v.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap">
          <div><h1>Manage Users</h1><p class="sub">Add, promote or remove accounts.</p></div>
          <button class="btn" id="addUser">+ Add User</button>
        </div>
        <div class="panel table-wrap" style="margin-top:0"><table>
          <thead><tr><th>ID</th><th>Full Name</th><th>Username</th><th>Email</th><th>Role</th><th>Action</th></tr></thead>
          <tbody>${(r.data || []).map(u => `
            <tr><td>${u.id}</td><td>${esc(u.full_name)}</td><td>${esc(u.username)}</td><td>${esc(u.email)}</td>
            <td><span class="badge ${u.role}">${u.role}</span></td>
            <td class="row-actions">
              <button class="btn btn-ghost btn-sm" data-role="${u.id}">Switch role</button>
              <button class="btn btn-danger btn-sm" data-del="${u.id}">Delete</button>
            </td></tr>`).join('')}</tbody></table></div>`;

      $('#addUser', v).addEventListener('click', () => {
        const m = openModal(`
          <h3>Add User</h3><div id="msg" class="alert hidden"></div>
          <form id="uf">
            <div class="field"><label>Full Name</label><input name="full_name" required></div>
            <div class="field"><label>Username</label><input name="username" required></div>
            <div class="field"><label>Email</label><input name="email" type="email" required></div>
            <div class="field"><label>Password</label><input name="password" type="password" required></div>
            <div class="field"><label>Role</label><select name="role"><option value="user">user</option><option value="admin">admin</option></select></div>
            <button class="btn btn-block" type="submit">Save User</button>
          </form>`);
        $('#uf', m).addEventListener('submit', async e => {
          e.preventDefault();
          const res = await api('admin', 'add_user', Object.fromEntries(new FormData(e.target)));
          if (res.success) { m.remove(); toast(res.message); window.go('users'); }
          else showMsg(res.message);
        });
      });

      $$('[data-del]', v).forEach(b => b.addEventListener('click', async () => {
        if (!confirm('Delete this user?')) return;
        const res = await api('admin', 'delete_user', { id: b.dataset.del });
        if (res.success) window.go('users'); else toast(res.message);
      }));
      $$('[data-role]', v).forEach(b => b.addEventListener('click', async () => {
        const res = await api('admin', 'toggle_role', { id: b.dataset.role });
        if (res.success) window.go('users'); else toast(res.message);
      }));
    },

    async guides(v) {
      const r = await api('admin', 'guides');
      v.innerHTML = `
        <h1>First Aid Guides</h1><p class="sub">Add or remove guides shown to users.</p>
        <div class="grid grid-2">
          <div class="panel" style="margin-top:0"><h3>All Guides</h3>
            ${(r.data || []).map(g => `<div class="check" style="justify-content:space-between"><span>${esc(g.title)} <span class="badge">${esc(g.category)}</span></span>
              <button class="btn btn-danger btn-sm" data-del="${g.id}">Delete</button></div>`).join('')}
          </div>
          <div class="panel" style="margin-top:0"><h3>Add First Aid Guide</h3>
            <div id="msg" class="alert hidden"></div>
            <form id="gf">
              <div class="field"><label>Title</label><input name="title" placeholder="Enter title" required></div>
              <div class="field"><label>Category</label>
                <select name="category" required><option value="">Select category</option>
                  ${['Burns','Bleeding','Choking','Fracture','Fainting','Insect Bite','Electric Shock','Other'].map(c => `<option>${c}</option>`).join('')}
                </select></div>
              <div class="field"><label>Description</label><textarea name="description" placeholder="Enter description"></textarea></div>
              <div class="field"><label>Steps</label><textarea name="steps" placeholder="Enter steps (one per line)" required></textarea></div>
              <div class="field"><label>Warning (optional)</label><input name="warning" placeholder="Do not..."></div>
              <button class="btn btn-block" type="submit">Save Guide</button>
            </form>
          </div>
        </div>`;
      $('#gf', v).addEventListener('submit', async e => {
        e.preventDefault();
        const res = await api('admin', 'add_guide', Object.fromEntries(new FormData(e.target)));
        if (res.success) { toast(res.message); window.go('guides'); } else showMsg(res.message);
      });
      $$('[data-del]', v).forEach(b => b.addEventListener('click', async () => {
        if (!confirm('Delete this guide?')) return;
        await api('admin', 'delete_guide', { id: b.dataset.del });
        window.go('guides');
      }));
    },

    async procedures(v) {
      const r = await api('admin', 'procedures');
      v.innerHTML = `
        <h1>Emergency Procedures</h1><p class="sub">Add or remove procedures shown to users.</p>
        <div class="grid grid-2">
          <div class="panel" style="margin-top:0"><h3>All Procedures</h3>
            ${(r.data || []).map(p => `<div class="check" style="justify-content:space-between"><span>${esc(p.title)}</span>
              <button class="btn btn-danger btn-sm" data-del="${p.id}">Delete</button></div>`).join('')}
          </div>
          <div class="panel" style="margin-top:0"><h3>Add Procedure</h3>
            <div id="msg" class="alert hidden"></div>
            <form id="pf">
              <div class="field"><label>Title</label><input name="title" placeholder="e.g. Landslide" required></div>
              <div class="field"><label>Before (one step per line)</label><textarea name="before_steps"></textarea></div>
              <div class="field"><label>During (one step per line)</label><textarea name="during_steps"></textarea></div>
              <div class="field"><label>After (one step per line)</label><textarea name="after_steps"></textarea></div>
              <button class="btn btn-block" type="submit">Save Procedure</button>
            </form>
          </div>
        </div>`;
      $('#pf', v).addEventListener('submit', async e => {
        e.preventDefault();
        const res = await api('admin', 'add_procedure', Object.fromEntries(new FormData(e.target)));
        if (res.success) { toast(res.message); window.go('procedures'); } else showMsg(res.message);
      });
      $$('[data-del]', v).forEach(b => b.addEventListener('click', async () => {
        if (!confirm('Delete this procedure?')) return;
        await api('admin', 'delete_procedure', { id: b.dataset.del });
        window.go('procedures');
      }));
    }
  };

  guard('admin').then(me => { if (me) initShell(views, 'home'); });
}

/* ---------------- Router ---------------- */
document.addEventListener('DOMContentLoaded', () => {
  switch (document.body.dataset.page) {
    case 'register':  redirectIfLoggedIn(); initRegister(); break;
    case 'login':     redirectIfLoggedIn(); initLogin(); break;
    case 'dashboard': initDashboard(); break;
    case 'admin':     initAdmin(); break;
  }
});