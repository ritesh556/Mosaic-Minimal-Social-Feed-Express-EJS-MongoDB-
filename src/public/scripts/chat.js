/* =========================================================================
   Chat UI script (wired to /chats, /chats/:userId, /chats/:userId/messages)
   Requires the page to set:
     window.__me
     window.__followersPreview
     window.__followingPreview
   ========================================================================= */
(function () {
  // Elements
  const chatDrawer        = document.getElementById("chatDrawer");
  const chatOverlay       = document.getElementById("chatOverlay");
  const chatCloseBtn      = document.getElementById("chatCloseBtn");
  const openChatBtn       = document.getElementById("openChatBtn");
  const openChatBtnMobile = document.getElementById("openChatBtnMobile");
  const mobileMenu        = document.getElementById("mobileMenu");

  const chatListEl        = document.getElementById("chatList");
  const mutualListEl      = document.getElementById("mutualList");
  const chatSearchEl      = document.getElementById("chatSearch");

  const threadHeaderName  = document.getElementById("threadName");
  const threadHeaderHint  = document.getElementById("threadHint");
  const threadHeaderAvatar= document.getElementById("threadAvatar");
  const threadBodyEl      = document.getElementById("threadBody");
  const threadInputEl     = document.getElementById("threadInput");
  const threadForm        = document.getElementById("threadForm");

  let currentPeerId = null, currentPeer = null, pollTimer = null;

  // Utils
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, m => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;" }[m]));
  const fmtTime = (ts) => { try { return new Date(ts).toLocaleString(); } catch { return ts; } };
  function avatarHTML(src, name, size = "w-9 h-9 rounded-lg") {
    if (src) {
      return `<div class="${size} overflow-hidden bg-zinc-800 shrink-0">
                <img src="${esc(src)}" class="w-full h-full object-cover"
                     onerror="this.parentNode.textContent='${esc((name||'?').charAt(0).toUpperCase())}'">
              </div>`;
    }
    return `<div class="${size} grid place-items-center bg-zinc-800 shrink-0">
              <span class="font-bold">${esc((name||'?').charAt(0).toUpperCase())}</span>
            </div>`;
  }
  function postForm(url, dataObj) {
    const body = new URLSearchParams();
    for (const k in dataObj) body.append(k, dataObj[k]);
    return fetch(url, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body });
  }

  // Open/Close drawer
  function openChatDrawer() {
    chatDrawer?.classList.remove("hidden");
    buildMutuals();
    loadChats();
  }
  function closeChatDrawer() {
    chatDrawer?.classList.add("hidden");
    clearThread();
  }
  window.openChatDrawer = openChatDrawer;
  window.closeChatDrawer = closeChatDrawer;

  // Wire the buttons (CSP-safe)
  openChatBtn?.addEventListener("click", openChatDrawer);
  openChatBtnMobile?.addEventListener("click", () => {
    mobileMenu?.classList.add("hidden");
    openChatDrawer();
  });
  chatCloseBtn?.addEventListener("click", closeChatDrawer);
  chatOverlay?.addEventListener("click", closeChatDrawer);

  // Build mutuals list (followers ∩ following)
  function buildMutuals() {
    if (!mutualListEl) return;
    const byId = new Map();
    (window.__followersPreview || []).forEach(u => byId.set(String(u._id), { ...u, f:true, g:false }));
    (window.__followingPreview || []).forEach(u => {
      const id = String(u._id);
      if (byId.has(id)) byId.get(id).g = true; else byId.set(id, { ...u, f:false, g:true });
    });
    const mutuals = Array.from(byId.values()).filter(x => x.f && x.g);

    mutualListEl.innerHTML = mutuals.length
      ? mutuals.map(m => `
          <div class="flex items-center gap-3 p-2 rounded-lg bg-zinc-900/40 border border-zinc-800">
            ${avatarHTML(m.avatarUrl, m.username || m.email, "w-8 h-8 rounded-md")}
            <div class="min-w-0">
              <div class="text-sm font-medium truncate">${esc(m.username || m.email || "")}</div>
              <div class="text-xs text-zinc-500 truncate">${esc(m.email || "")}</div>
            </div>
            <button class="ml-auto px-2 py-1 rounded-md bg-blue-600 hover:bg-blue-700 text-xs"
                    data-start-chat data-peer-id="${esc(m._id)}"
                    data-name="${esc(m.username || m.email || "")}"
                    data-avatar="${esc(m.avatarUrl || "")}">
              Message
            </button>
          </div>
        `).join("")
      : `<div class="text-sm text-zinc-500">No mutuals yet.</div>`;
  }

  // Delegate clicks for "Message" buttons
  mutualListEl?.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-start-chat]");
    if (!btn) return;
    startOrOpenChat(btn.dataset.peerId, btn.dataset.name, btn.dataset.avatar);
  });

  // Load chats
  async function loadChats() {
    if (!chatListEl) return;
    chatListEl.innerHTML = `<div class="px-4 py-6 text-sm text-zinc-500">Loading chats...</div>`;
    try {
      const r = await fetch("/chats", { headers: { Accept: "application/json" } });
      const chats = await r.json();
      renderChatList(chats);
    } catch {
      chatListEl.innerHTML = `<div class="px-4 py-6 text-sm text-red-400">Failed to load chats.</div>`;
    }
  }

  function renderChatList(chats) {
    const items = (chats || []).map(c => {
      const other = c.other || {};
      const preview = c.lastMsg?.text || "";
      const when = c.lastMsg?.createdAt ? fmtTime(c.lastMsg.createdAt) : "";
      return `
        <button class="w-full text-left p-3 hover:bg-zinc-900 transition flex items-center gap-3"
                data-open-thread
                data-peer-id="${esc(other._id)}"
                data-name="${esc(other.username || other.email || "")}"
                data-avatar="${esc(other.avatarUrl || "")}">
          ${avatarHTML(other.avatarUrl, other.username || other.email)}
          <div class="min-w-0">
            <div class="font-medium truncate">${esc(other.username || other.email || "")}</div>
            <div class="text-xs text-zinc-400 truncate">${esc(preview)}</div>
          </div>
          <div class="ml-auto text-[10px] text-zinc-500 whitespace-nowrap">${esc(when)}</div>
        </button>
      `;
    });
    chatListEl.innerHTML = items.join("") || `<div class="px-4 py-6 text-sm text-zinc-500">No chats yet.</div>`;
  }

  // Delegate clicks for chat list items
  chatListEl?.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-open-thread]");
    if (!btn) return;
    openThread(btn.dataset.peerId, btn.dataset.name, btn.dataset.avatar);
  });

  // Thread open/render
  async function openThread(peerId, name, avatarUrl) {
    currentPeerId = String(peerId);
    currentPeer   = { _id: peerId, username: name, email: name, avatarUrl: avatarUrl || "" };
    threadHeaderName.textContent = name || "Chat";
    threadHeaderHint.textContent = "Chatting privately";
    threadHeaderAvatar.innerHTML = avatarHTML(avatarUrl, name, "w-8 h-8 rounded-md");
    threadBodyEl.innerHTML = `<div class="px-2 py-4 text-sm text-zinc-500">Loading conversation...</div>`;
    await fetchThreadMessages();
    setTimeout(() => threadInputEl?.focus(), 0);
    if (pollTimer) clearInterval(pollTimer);
    pollTimer = setInterval(fetchThreadMessages, 5000);
  }
  window.openThread = openThread;

  function clearThread() {
    currentPeerId = null; currentPeer = null;
    if (pollTimer) clearInterval(pollTimer); pollTimer = null;
    threadHeaderName.textContent = "Select a chat";
    threadHeaderHint.textContent = "No conversation selected";
    threadHeaderAvatar.innerHTML = "";
    threadBodyEl.innerHTML = "";
    if (threadInputEl) threadInputEl.value = "";
  }

  async function fetchThreadMessages() {
    if (!currentPeerId) return;
    try {
      const r = await fetch(`/chats/${encodeURIComponent(currentPeerId)}`, { headers: { Accept: "application/json" } });
      const data = await r.json();
      renderMessages(data.messages || []);
    } catch {}
  }

  function renderMessages(msgs) {
    const meId = String((window.__me && window.__me._id) || "");
    const atBottomBefore = threadBodyEl
      ? threadBodyEl.scrollHeight - threadBodyEl.scrollTop - threadBodyEl.clientHeight < 100
      : false;

    threadBodyEl.innerHTML =
      (msgs || []).map(m => {
        const mine = String((m.from && m.from._id) || m.from) === meId;
        const bubble = `
          <div class="max-w-[80%] px-3 py-2 rounded-2xl ${mine ? "bg-blue-600 text-white" : "bg-zinc-900 border border-zinc-800"}">
            <div class="text-sm break-words">${esc(m.text)}</div>
            <div class="text-[10px] mt-1 opacity-70">${esc(fmtTime(m.createdAt))}</div>
          </div>`;
        return `
          <div class="w-full flex items-end gap-2 ${mine ? "justify-end" : ""}">
            ${mine ? "" : avatarHTML(m.from?.avatarUrl, m.from?.username || m.from?.email, "w-7 h-7 rounded-md")}
            ${bubble}
          </div>`;
      }).join("") || `<div class="px-2 py-6 text-sm text-zinc-500 text-center">Say hi 👋</div>`;

    if (atBottomBefore && threadBodyEl) threadBodyEl.scrollTop = threadBodyEl.scrollHeight;
  }

  // Start or open chat
  async function startOrOpenChat(peerId, name, avatarUrl) {
    try { await postForm(`/chats/${encodeURIComponent(peerId)}/start`, {}); } catch {}
    openChatDrawer();
    openThread(peerId, name, avatarUrl);
  }
  window.startOrOpenChat = startOrOpenChat;

  // Send message (bind form submit)
  async function sendMessage() {
    if (!currentPeerId) return false;
    const text = (threadInputEl.value || "").trim();
    if (!text) return false;

    const now = new Date().toISOString();
    if (threadBodyEl) {
      threadBodyEl.innerHTML += `
        <div class="w-full flex items-end gap-2 justify-end">
          <div class="max-w-[80%] px-3 py-2 rounded-2xl bg-blue-600 text-white">
            <div class="text-sm break-words">${esc(text)}</div>
            <div class="text-[10px] mt-1 opacity-70">${esc(fmtTime(now))}</div>
          </div>
        </div>`;
      threadBodyEl.scrollTop = threadBodyEl.scrollHeight;
    }
    if (threadInputEl) threadInputEl.value = "";

    try {
      await postForm(`/chats/${encodeURIComponent(currentPeerId)}/messages`, { text });
      fetchThreadMessages();
      loadChats();
    } catch {}
    return false;
  }
  window.sendMessage = sendMessage;

  threadForm?.addEventListener("submit", (e) => { e.preventDefault(); sendMessage(); });

  // Search filter for chats + mutuals
  chatSearchEl?.addEventListener("input", () => {
    const q = chatSearchEl.value.trim().toLowerCase();
    Array.from(chatListEl?.children || []).forEach(el => {
      const txt = (el.textContent || "").toLowerCase();
      el.style.display = txt.includes(q) ? "" : "none";
    });
    Array.from(mutualListEl?.children || []).forEach(el => {
      const txt = (el.textContent || "").toLowerCase();
      el.style.display = txt.includes(q) ? "" : "none";
    });
  });

  // Optional helper: update unread badge (call setUnreadCount(0) to hide)
  window.setUnreadCount = function (n) {
    const b = document.getElementById("unreadBadge");
    if (!b) return;
    if (!n) { b.classList.add("hidden"); return; }
    b.textContent = n > 99 ? "99+" : n;
    b.classList.remove("hidden");
  };
})();
