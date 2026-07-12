/* =====================================================
   CONFIG — same backend as the main site
===================================================== */
const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:5000/api'
  : 'https://portfolio-backend-gbzi.onrender.com/api';

const TOKEN_KEY = 'ks_admin_token';
const EMAIL_KEY = 'ks_admin_email';

/* =====================================================
   ELEMENTS
===================================================== */
const loginView = document.getElementById('loginView');
const dashboardView = document.getElementById('dashboardView');
const loginForm = document.getElementById('loginForm');
const loginBtn = document.getElementById('loginBtn');
const loginError = document.getElementById('loginError');
const logoutBtn = document.getElementById('logoutBtn');
const adminEmailEl = document.getElementById('adminEmail');

const messagesBody = document.getElementById('messagesBody');
const emptyState = document.getElementById('emptyState');
const paginationEl = document.getElementById('pagination');
const filterTabs = document.getElementById('filterTabs');
const searchInput = document.getElementById('searchInput');

const modalBackdrop = document.getElementById('modalBackdrop');
const modalClose = document.getElementById('modalClose');
const modalMeta = document.getElementById('modalMeta');
const modalSubject = document.getElementById('modalSubject');
const modalBody = document.getElementById('modalBody');
const statusSelect = document.getElementById('statusSelect');
const modalReplyLink = document.getElementById('modalReplyLink');
const modalDeleteBtn = document.getElementById('modalDeleteBtn');

let state = {
  page: 1,
  limit: 20,
  status: '',
  search: '',
  activeMessageId: null,
};
let searchDebounce = null;

/* =====================================================
   AUTH HELPERS
===================================================== */
function getToken() { return localStorage.getItem(TOKEN_KEY); }
function setSession(token, email) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(EMAIL_KEY, email);
}
function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(EMAIL_KEY);
}

async function apiFetch(path, options = {}) {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getToken()}`,
      ...(options.headers || {}),
    },
  });

  if (res.status === 401) {
    clearSession();
    showLogin();
    throw new Error('Session expired. Please log in again.');
  }

  const data = await res.json();
  if (!res.ok || data.success === false) {
    throw new Error(data.message || 'Request failed.');
  }
  return data;
}

/* =====================================================
   VIEW SWITCHING
===================================================== */
function showLogin() {
  loginView.classList.remove('hidden');
  dashboardView.classList.add('hidden');
}
function showDashboard() {
  loginView.classList.add('hidden');
  dashboardView.classList.remove('hidden');
  adminEmailEl.textContent = localStorage.getItem(EMAIL_KEY) || '';
  loadStats();
  loadMessages();
}

/* =====================================================
   LOGIN
===================================================== */
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  loginError.textContent = '';
  loginBtn.classList.add('is-loading');
  loginBtn.disabled = true;

  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;

  try {
    const res = await fetch(`${API_BASE_URL}/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.message || 'Login failed.');

    setSession(data.token, data.admin.email);
    showDashboard();
  } catch (err) {
    loginError.textContent = err.message;
  } finally {
    loginBtn.classList.remove('is-loading');
    loginBtn.disabled = false;
  }
});

logoutBtn.addEventListener('click', () => {
  clearSession();
  showLogin();
});

/* =====================================================
   STATS
===================================================== */
async function loadStats() {
  try {
    const { data } = await apiFetch('/admin/stats');
    document.getElementById('statTotal').textContent = data.total;
    document.getElementById('statUnread').textContent = data.unread;
    document.getElementById('statRead').textContent = data.read;
    document.getElementById('statReplied').textContent = data.replied;
    document.getElementById('statWeek').textContent = data.last_7_days;
  } catch (err) {
    console.error(err.message);
  }
}

/* =====================================================
   MESSAGES LIST
===================================================== */
async function loadMessages() {
  const params = new URLSearchParams({
    page: state.page,
    limit: state.limit,
  });
  if (state.status) params.set('status', state.status);
  if (state.search) params.set('search', state.search);

  try {
    const { data, pagination } = await apiFetch(`/admin/messages?${params.toString()}`);
    renderMessages(data);
    renderPagination(pagination);
  } catch (err) {
    console.error(err.message);
  }
}

function renderMessages(messages) {
  messagesBody.innerHTML = '';
  emptyState.classList.toggle('hidden', messages.length > 0);

  messages.forEach((msg) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><span class="status-pill ${msg.status}">${msg.status}</span></td>
      <td>
        <span class="msg-name">${escapeHtml(msg.name)}</span>
        <span class="msg-email">${escapeHtml(msg.email)}</span>
      </td>
      <td>${escapeHtml(msg.subject || '—')}</td>
      <td class="msg-date">${formatDate(msg.created_at)}</td>
      <td class="msg-arrow">→</td>
    `;
    tr.addEventListener('click', () => openModal(msg));
    messagesBody.appendChild(tr);
  });
}

function renderPagination({ page, totalPages }) {
  paginationEl.innerHTML = '';
  if (totalPages <= 1) return;

  for (let i = 1; i <= totalPages; i++) {
    const btn = document.createElement('button');
    btn.textContent = i;
    if (i === page) btn.classList.add('is-active');
    btn.addEventListener('click', () => {
      state.page = i;
      loadMessages();
    });
    paginationEl.appendChild(btn);
  }
}

/* =====================================================
   FILTER TABS + SEARCH
===================================================== */
filterTabs.addEventListener('click', (e) => {
  const btn = e.target.closest('.filter-tab');
  if (!btn) return;
  filterTabs.querySelectorAll('.filter-tab').forEach((t) => t.classList.remove('is-active'));
  btn.classList.add('is-active');
  state.status = btn.dataset.status;
  state.page = 1;
  loadMessages();
});

searchInput.addEventListener('input', () => {
  clearTimeout(searchDebounce);
  searchDebounce = setTimeout(() => {
    state.search = searchInput.value.trim();
    state.page = 1;
    loadMessages();
  }, 350);
});

/* =====================================================
   MODAL — message detail
===================================================== */
function openModal(msg) {
  state.activeMessageId = msg.id;
  modalMeta.textContent = `${msg.name} · ${msg.email} · ${formatDate(msg.created_at)}`;
  modalSubject.textContent = msg.subject || '(No subject)';
  modalBody.textContent = msg.message;
  statusSelect.value = msg.status;
  modalReplyLink.href = `mailto:${msg.email}?subject=${encodeURIComponent('Re: ' + (msg.subject || 'your message'))}`;
  modalBackdrop.classList.remove('hidden');

  // opening a message you haven't looked at yet marks it read
  if (msg.status === 'unread') {
    updateStatus(msg.id, 'read', { silent: true });
  }
}

function closeModal() {
  modalBackdrop.classList.add('hidden');
  state.activeMessageId = null;
}
modalClose.addEventListener('click', closeModal);
modalBackdrop.addEventListener('click', (e) => { if (e.target === modalBackdrop) closeModal(); });

statusSelect.addEventListener('change', () => {
  updateStatus(state.activeMessageId, statusSelect.value);
});

async function updateStatus(id, status, { silent } = {}) {
  try {
    await apiFetch(`/admin/messages/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
    if (!silent) loadMessages();
    loadStats();
  } catch (err) {
    console.error(err.message);
  }
}

modalDeleteBtn.addEventListener('click', async () => {
  if (!state.activeMessageId) return;
  if (!confirm('Delete this message permanently?')) return;

  try {
    await apiFetch(`/admin/messages/${state.activeMessageId}`, { method: 'DELETE' });
    closeModal();
    loadMessages();
    loadStats();
  } catch (err) {
    alert(err.message);
  }
});

/* =====================================================
   UTILS
===================================================== */
function escapeHtml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

/* =====================================================
   INIT
===================================================== */
(async function init() {
  if (getToken()) {
    try {
      await apiFetch('/admin/me');
      showDashboard();
      return;
    } catch (err) {
      // token invalid/expired — fall through to login
    }
  }
  showLogin();
})();
