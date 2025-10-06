// public/js/dashboard.js
(function () {
  // ===== Bootstrapped data from data-* attributes =====
  const root = document.getElementById('page') || document.body;
  try { window.__me = JSON.parse(root.dataset.me || 'null'); } catch { window.__me = null; }
  try { window.__followersPreview = JSON.parse(root.dataset.followers || '[]'); } catch { window.__followersPreview = []; }
  try { window.__followingPreview = JSON.parse(root.dataset.following || '[]'); } catch { window.__followingPreview = []; }

  // ===== Mobile menu =====
  const menuBtn = document.getElementById('menuBtn');
  const mobileMenu = document.getElementById('mobileMenu');
  menuBtn?.addEventListener('click', () => mobileMenu.classList.toggle('hidden'));

  // ===== Avatar modal =====
  window.openAvatarModal = function () {
    document.getElementById('avatarModal')?.classList.remove('hidden');
  };
  window.closeAvatarModal = function () {
    document.getElementById('avatarModal')?.classList.add('hidden');
    resetAvatarPreviewModal();
  };
  // Open from any element with .js-open-avatar-modal
  document.addEventListener('click', (e) => {
    const trigger = e.target.closest('.js-open-avatar-modal');
    if (trigger) {
      e.preventDefault();
      window.openAvatarModal();
    }
  });
  // Preview inside avatar modal
  (function () {
    const url = document.getElementById('avatar-url-modal');
    const file = document.getElementById('avatar-file-modal');
    const wrap = document.getElementById('avatar-preview-wrap-modal');
    const img = document.getElementById('avatar-preview-modal');

    function render(src) {
      if (!wrap || !img) return;
      if (!src) { wrap.classList.add('hidden'); img.removeAttribute('src'); return; }
      img.src = src; wrap.classList.remove('hidden');
      img.onerror = function () { wrap.classList.add('hidden'); };
    }
    url?.addEventListener('input', () => {
      if (url.value.trim()) render(url.value.trim());
      else if (!(file && file.files && file.files[0])) render('');
    });
    file?.addEventListener('change', () => {
      const f = file.files && file.files[0];
      if (f) render(URL.createObjectURL(f));
      else if (!(url && url.value && url.value.trim())) render('');
    });
    window.resetAvatarPreviewModal = function () {
      if (url) url.value = '';
      if (file) file.value = '';
      render('');
    };
  })();

  // ===== Post modal + preview =====
  window.openPostModal = function () {
    document.getElementById('postModal')?.classList.remove('hidden');
  };
  window.closePostModal = function () {
    document.getElementById('postModal')?.classList.add('hidden');
    resetPostPreview();
  };
  (function () {
    const urlInput = document.getElementById('post-url');
    const fileInput = document.getElementById('post-file');
    const wrap = document.getElementById('post-preview-wrap');
    const img = document.getElementById('post-preview');

    function render(src) {
      if (!wrap || !img) return;
      if (!src) { wrap.classList.add('hidden'); img.removeAttribute('src'); return; }
      img.src = src; wrap.classList.remove('hidden');
      img.onerror = function () { wrap.classList.add('hidden'); };
    }
    urlInput?.addEventListener('input', () => {
      if (urlInput.value.trim()) render(urlInput.value.trim());
      else if (!(fileInput && fileInput.files && fileInput.files[0])) render('');
    });
    fileInput?.addEventListener('change', () => {
      const f = fileInput.files && fileInput.files[0];
      if (f) render(URL.createObjectURL(f));
      else if (!(urlInput && urlInput.value && urlInput.value.trim())) render('');
    });
    window.resetPostPreview = function () {
      if (urlInput) urlInput.value = '';
      if (fileInput) fileInput.value = '';
      render('');
    };
  })();

  // ===== Search posts by title =====
  (function () {
    const input = document.getElementById('postSearch');
    const list = document.getElementById('postList');
    if (!input || !list) return;
    input.addEventListener('input', () => {
      const q = input.value.trim().toLowerCase();
      list.querySelectorAll('li').forEach((li) => {
        const title = (li.querySelector('h3')?.textContent || '').toLowerCase();
        li.style.display = title.includes(q) ? '' : 'none';
      });
    });
  })();

  // ===== Tiny helper CSS (kept in JS to avoid extra file) =====
  (function () {
    const style = document.createElement('style');
    style.textContent = `
      .line-clamp-2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
      @media (max-width: 479px) { .xs\\:block { display: none; } }
    `;
    document.head.appendChild(style);
  })();

  // ===== User Post Count Bar Chart (Admin Panel) =====
  window.addEventListener('DOMContentLoaded', function () {
    const chartContainer = document.getElementById('userPostChartContainer');
    if (!chartContainer) return;
    // Load Chart.js from CDN if not present
    if (typeof window.Chart === 'undefined') {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
      script.onload = renderChart;
      document.head.appendChild(script);
    } else {
      renderChart();
    }

    function renderChart() {
      const userList = window.userList || [];
      if (!userList.length) return;
      const ctx = document.getElementById('userPostChart').getContext('2d');
      new window.Chart(ctx, {
        type: 'bar',
        data: {
          labels: userList.map(u => u.username || u.email || 'User'),
          datasets: [{
            label: 'Post Count',
            data: userList.map(u => u.postCount || 0),
            backgroundColor: 'rgba(37,99,235,0.7)',
            borderRadius: 6,
          }]
        },
        options: {
          plugins: {
            legend: { display: false },
            title: { display: true, text: 'User Post Counts', color: '#fff' }
          },
          scales: {
            x: { ticks: { color: '#fff' }, grid: { color: '#333' } },
            y: { beginAtZero: true, ticks: { color: '#fff' }, grid: { color: '#333' } }
          }
        }
      });
    }
  });

  // ===== Notifications: count + panel =====
  const notifBtn = document.getElementById('notifBtn');
  const notifPanel = document.getElementById('notifPanel');
  const notifBadge = document.getElementById('notif-badge');
  const notifList = document.getElementById('notifList');
  const notifReadAllBtn = document.getElementById('notifReadAllBtn');

  async function refreshNotifCount() {
    try {
      const res = await fetch('/api/notifications/unseen-count', { credentials: 'same-origin' });
      const data = await res.json();
      const count = data?.count || 0;
      if (!notifBadge) return;
      if (count > 0) {
        notifBadge.textContent = count > 99 ? '99+' : String(count);
        notifBadge.classList.remove('hidden');
      } else {
        notifBadge.classList.add('hidden');
      }
    } catch {}
  }

  function toggleNotifPanel() {
    if (!notifPanel) return;
    notifPanel.classList.toggle('hidden');
    if (!notifPanel.classList.contains('hidden')) loadNotifications();
  }

  async function loadNotifications() {
    if (!notifList) return;
    notifList.innerHTML = `<div class="px-3 py-4 text-sm text-zinc-500">Loading…</div>`;
    try {
      const res = await fetch('/notifications', { headers: { 'Accept': 'application/json' }, credentials: 'same-origin' });
      const items = await res.json();
      renderNotifications(items || []);
    } catch {
      notifList.innerHTML = `<div class="px-3 py-4 text-sm text-red-400">Failed to load notifications.</div>`;
    }
  }

  function esc(s) { return String(s ?? '').replace(/[&<>"]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m])); }
  function timeFmt(ts) { try { return new Date(ts).toLocaleString(); } catch { return ts; } }

  function renderNotifications(items) {
    if (!items.length) { notifList.innerHTML = `<div class="px-3 py-4 text-sm text-zinc-500">No notifications.</div>`; return; }
    const myId = (window.__me && (window.__me._id || window.__me.id)) || (document.querySelector('meta[name="uid"]')?.content || '');
    const urlId = v => encodeURIComponent(String(v || ''));

    notifList.innerHTML = items.slice(0, 50).map(n => {
      const seenCls = n.seen ? 'opacity-70' : '';
      let body = '';

      if (n.type === 'new-post') {
        const postTitle = esc(n.post?.title || 'New post');
        body = `<a class="underline hover:no-underline" href="/posts/${urlId(n.post?._id)}">${postTitle}</a>`;
      } else if (n.type === 'follow') {
        const followerId = n.from?._id;
        const name = esc(n.from?.username || n.from?.email || 'Someone');
        body = followerId ? `
          <div class="flex items-center gap-2">
            <span>${name} followed you.</span>
            <form method="post" action="/u/${urlId(followerId)}/follow">
              <button class="px-2 py-1 rounded-md bg-blue-600 hover:bg-blue-700 text-xs">Follow back</button>
            </form>
          </div>` : `<span>New follower.</span>`;
      } else if (n.type === 'follow-request') {
        const requesterId = n.from?._id;
        if (requesterId) {
          const acceptHref = myId ? `/u/${urlId(myId)}/requests/${urlId(requesterId)}/accept` : `/requests/${urlId(requesterId)}/accept`;
          const declineHref = myId ? `/u/${urlId(myId)}/requests/${urlId(requesterId)}/decline` : `/requests/${urlId(requesterId)}/decline`;
          body = `
            <div class="flex items-center gap-2">
              <span>${esc(n.from?.username || n.from?.email || 'Someone')} requested to follow you.</span>
              <form method="post" action="${acceptHref}">
                <button class="px-2 py-1 rounded-md bg-blue-600 hover:bg-blue-700 text-xs">Accept</button>
              </form>
              <form method="post" action="${declineHref}">
                <button class="px-2 py-1 rounded-md bg-zinc-800 hover:bg-zinc-700 text-xs">Decline</button>
              </form>
            </div>`;
        } else body = `<span>Follow request</span>`;
      } else if (n.type === 'follow-accepted') {
        body = `<span>${esc(n.from?.username || n.from?.email || 'User')} accepted your request.</span>`;
      } else {
        body = `<span>New activity.</span>`;
      }

      return `
        <div class="px-3 py-3 flex items-start gap-3 ${seenCls}">
          <div class="w-8 h-8 rounded-md overflow-hidden bg-zinc-800 shrink-0">
            ${n.from?.avatarUrl
              ? `<img src="${esc(n.from.avatarUrl)}" class="w-full h-full object-cover">`
              : `<div class="w-full h-full grid place-items-center text-xs font-bold">
                   ${esc((n.from?.username || n.from?.email || '?').charAt(0).toUpperCase())}
                 </div>`}
          </div>
          <div class="min-w-0 flex-1">
            <div class="text-sm">
              <strong>${esc(n.type.replace('-', ' '))}</strong>
              <span class="text-zinc-400">• ${esc(timeFmt(n.createdAt))}</span>
            </div>
            <div class="text-sm text-zinc-300 mt-1">${body}</div>
            ${n.seen ? '' : `
              <form method="post" action="/notifications/${urlId(n._id)}/read" onsubmit="return markOneSeen('${esc(n._id)}');" class="mt-1">
                <button class="text-xs text-zinc-400 hover:text-blue-300" type="submit">Mark as read</button>
              </form>`}
          </div>
        </div>`;
    }).join('');
  }

  // Mark one as seen (AJAX)
  window.markOneSeen = async function (id) {
    try {
      await fetch(`/notifications/${encodeURIComponent(id)}/read`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        credentials: 'same-origin',
        body: ''
      });
      await loadNotifications();
      await refreshNotifCount();
    } catch {}
    return false;
  };

  notifBtn?.addEventListener('click', toggleNotifPanel);
  notifReadAllBtn?.addEventListener('click', async (e) => {
    e.preventDefault();
    try {
      await fetch('/notifications/read-all', { method: 'POST', credentials: 'same-origin' });
      await loadNotifications();
      await refreshNotifCount();
    } catch {}
  });
  document.addEventListener('click', (ev) => {
    if (!notifPanel || !notifBtn) return;
    if (notifPanel.classList.contains('hidden')) return;
    const inside = notifPanel.contains(ev.target) || notifBtn.contains(ev.target);
    if (!inside) notifPanel.classList.add('hidden');
  });

  // ===== WIRING for CSP-safe controls (this was missing) =====
  // Chat drawer open
  document.getElementById('openChatBtn')?.addEventListener('click', (e) => {
    e.preventDefault();
    window.openChatDrawer && window.openChatDrawer();
  });
  document.getElementById('openChatBtnMobile')?.addEventListener('click', (e) => {
    e.preventDefault();
    window.openChatDrawer && window.openChatDrawer();
  });

  // Avatar modal close
  document.getElementById('avatarOverlay')?.addEventListener('click', closeAvatarModal);
  document.getElementById('avatarCloseBtn')?.addEventListener('click', (e) => { e.preventDefault(); closeAvatarModal(); });
  document.getElementById('avatarCancelBtn')?.addEventListener('click', (e) => { e.preventDefault(); closeAvatarModal(); });

  // Post modal open/close
  document.getElementById('openPostBtn')?.addEventListener('click', (e) => { e.preventDefault(); openPostModal(); });
  document.getElementById('openPostBtn2')?.addEventListener('click', (e) => { e.preventDefault(); openPostModal(); });
  document.getElementById('postOverlay')?.addEventListener('click', closePostModal);
  document.getElementById('postCloseBtn')?.addEventListener('click', (e) => { e.preventDefault(); closePostModal(); });
  document.getElementById('postCancelBtn')?.addEventListener('click', (e) => { e.preventDefault(); closePostModal(); });

  // Confirm delete (CSP-safe replacement for inline confirm)
  document.querySelectorAll('form.js-confirm-delete').forEach((form) => {
    form.addEventListener('submit', (e) => {
      if (!confirm('Delete this post?')) e.preventDefault();
    });
  });

  // ===== Initial notification polling =====
  refreshNotifCount();
  setInterval(refreshNotifCount, 10000);
})();
