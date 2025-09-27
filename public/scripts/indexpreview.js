(() => {
  // Grab DOM nodes safely
  const modal = document.getElementById("postModal");
  const modalContent = document.getElementById("modalContent");
  const menuBtn = document.getElementById("menuBtn");
  const mobileMenu = document.getElementById("mobileMenu");

  // If this page doesn't have the modal, just don't run the feed logic.
  if (!modal || !modalContent) {
    // Still wire the mobile menu if present
    if (menuBtn && mobileMenu) {
      menuBtn.addEventListener("click", () => mobileMenu.classList.toggle("hidden"));
    }
    return;
  }

  // Safe JSON parse helpers
  function safeParseById(id, fallback) {
    const el = document.getElementById(id);
    if (!el) return fallback;
    try {
      const txt = el.textContent || el.innerText || "";
      return JSON.parse(txt || "");
    } catch {
      return fallback;
    }
  }

  const posts = safeParseById("posts-data", []);
  const viewer = safeParseById("viewer-data", { isLoggedIn: false, userId: null, role: null });

  // --- Relative time (“x ago”) helpers ---
  function timeAgo(ts) {
    const d = new Date(ts);
    if (isNaN(d.getTime())) return "";
    const diff = Date.now() - d.getTime();
    const sec = Math.max(1, Math.floor(diff / 1000));
    if (sec < 60) return `${sec}s ago`;
    const min = Math.floor(sec / 60);
    if (min < 60) return `${min}m ago`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr}h ago`;
    const day = Math.floor(hr / 24);
    if (day < 30) return `${day}d ago`;
    const mon = Math.floor(day / 30);
    if (mon < 12) return `${mon}mo ago`;
    const yr = Math.floor(mon / 12);
    return `${yr}y ago`;
  }

  function hydrateTimeagos(root = document) {
    root.querySelectorAll("[data-timeago]").forEach(el => {
      const ts = el.getAttribute("data-timeago");
      if (!ts) return;
      el.textContent = timeAgo(ts);
      // Keep the absolute datetime accessible via title tooltip
      const parentTime = el.closest("time");
      if (parentTime && !parentTime.getAttribute("title")) {
        const d = new Date(ts);
        parentTime.setAttribute("title", d.toLocaleString());
      }
    });
  }

  // keep relative times fresh (updates every minute)
  setInterval(() => hydrateTimeagos(), 60_000);

  // If no posts, still wire minimal UI (menu + close handlers) then stop.
  if (!Array.isArray(posts) || posts.length === 0) {
    if (menuBtn && mobileMenu) {
      menuBtn.addEventListener("click", () => mobileMenu.classList.toggle("hidden"));
    }
    // Backdrop close + Esc still safe to set
    modal.addEventListener("click", (e) => { if (e.target === modal) closeModal(); });
    window.addEventListener("keydown", (e) => { if (e.key === "Escape") closeModal(); });
    // Hydrate any server-rendered timeagos
    hydrateTimeagos();
    return;
  }

  // Helpers
  const openModal = (html) => {
    document.body.style.overflow = "hidden";
    modalContent.innerHTML = html;
    // hydrate relative times inside modal content
    hydrateTimeagos(modalContent);

    modal.classList.remove("pointer-events-none");
    requestAnimationFrame(() => {
      modal.classList.remove("opacity-0");
      modalContent.classList.remove("scale-95");
    });
  };

  const closeModal = () => {
    modal.classList.add("opacity-0");
    modalContent.classList.add("scale-95");
    document.body.style.overflow = "";
    setTimeout(() => {
      modal.classList.add("pointer-events-none");
      modalContent.innerHTML = "";
    }, 200);
  };

  // Close on backdrop click / Esc
  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeModal();
  });
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeModal();
  });

  // Mobile menu toggle
  if (menuBtn && mobileMenu) {
    menuBtn.addEventListener("click", () => mobileMenu.classList.toggle("hidden"));
  }

  // Render one comment <li> (for modal)
  function renderCommentItem(c) {
    const u = c?.user || {};
    const userUrl = u.id ? `/u/${u.id}` : "#";
    const initial = (u.username || "U").toString().trim().charAt(0).toUpperCase();

    return `
      <li class="flex items-start gap-3">
        <a href="${userUrl}" class="w-8 h-8 rounded-full overflow-hidden bg-zinc-700 grid place-items-center shrink-0 ring-1 ring-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-600" aria-label="View commenter profile">
          ${u.avatarUrl
            ? `<img src="${u.avatarUrl}" class="w-full h-full object-cover" alt="${u.username || 'User'}" />`
            : `<span class="text-xs font-semibold">${initial}</span>`}
        </a>
        <div class="min-w-0 flex-1">
          <div class="flex items-center justify-between">
            <div class="text-sm font-medium truncate">
              <a href="${userUrl}" class="hover:underline">${u.username || "User"}</a>
            </div>
            <div class="text-xs text-zinc-500">
              <span data-timeago="${new Date(c.createdAt).toISOString()}"></span>
            </div>
          </div>
          <p class="mt-1 text-sm text-zinc-200 whitespace-pre-wrap break-words">${c.text}</p>
        </div>
      </li>
    `;
  }

  // Build modal HTML (image fixed, info scrolls)
  function renderPostModal(p) {
    const isLoggedIn = !!viewer.isLoggedIn;
    const owner = p?.userId || {};
    const ownerUrl = owner._id ? `/u/${owner._id}` : "#";

    return `
      <div class="grid sm:grid-cols-2 h-[90vh]">
        <!-- IMAGE -->
        <div class="relative bg-black shrink-0 sm:h-full h-[55vh]">
          <img src="${p.imageUrl}" alt="${p.title}"
               class="absolute inset-0 w-full h-full object-contain sm:object-cover" />
          <button class="absolute top-3 right-3 p-2 rounded-full bg-zinc-900/70 hover:bg-zinc-800"
                  aria-label="Close" data-close-modal>
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <!-- RIGHT / BOTTOM PANEL (scrolls) -->
        <div class="flex flex-col bg-zinc-900 border-l border-zinc-800 sm:min-h-0 min-h-[35vh]">
          <!-- Header (fixed) -->
          <div class="p-4 sm:p-5 border-b border-zinc-800 shrink-0">
            <div class="flex items-center gap-3">
              <a href="${ownerUrl}" class="w-10 h-10 rounded-full overflow-hidden bg-zinc-800 grid place-items-center ring-1 ring-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-600" aria-label="View profile">
                ${owner.avatarUrl
                  ? `<img src="${owner.avatarUrl}" class="w-full h-full object-cover" alt="${owner.username || 'User'}" />`
                  : `<span class="text-sm font-semibold">${(owner.username || "?").trim().charAt(0).toUpperCase()}</span>`}
              </a>
              <div class="min-w-0">
                <div class="text-sm font-semibold truncate">
                  <a href="${ownerUrl}" class="hover:underline">${owner.username || "User"}</a>
                </div>
                <div class="text-xs text-zinc-400">
                  <span data-timeago="${new Date(p.createdAt).toISOString()}"></span>
                </div>
              </div>
            </div>
            <h2 class="mt-3 text-lg font-semibold">${p.title}</h2>
          </div>

          <!-- Scrollable content -->
          <div class="flex-1 overflow-y-auto px-4 sm:px-5 py-4 space-y-5">
            <!-- Actions / counts -->
            <div class="flex items-center gap-3">
              ${isLoggedIn ? `
                <form method="post" action="/posts/${p.id}/${p.likedByMe ? "unlike" : "like"}">
                  <button class="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium ${p.likedByMe ? "bg-pink-600 hover:bg-pink-700" : "bg-zinc-800 hover:bg-zinc-700"}">
                    <span>${p.likedByMe ? "❤️" : "🤍"}</span>
                    <span>${p.likedByMe ? "Loved" : "Love"}</span>
                  </button>
                </form>` : ``}
              <span class="flex items-center gap-2 text-zinc-400 text-sm">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path>
                </svg>
                <strong>${p.likesCount}</strong> <span class="hidden sm:inline">people loved this</span>
              </span>
            </div>

            <!-- Comments -->
            <div>
              <h3 class="text-sm uppercase tracking-wide text-zinc-400 mb-3">Comments</h3>
              ${Array.isArray(p.comments) && p.comments.length
                ? `<ul class="space-y-4">${p.comments.map(renderCommentItem).join("")}</ul>`
                : `<p class="text-sm text-zinc-400">No comments yet.</p>`}
            </div>
          </div>

          <!-- Comment form (fixed) -->
          <div class="p-4 sm:p-5 border-t border-zinc-800 ${isLoggedIn ? "" : "hidden"}">
            <form method="post" action="/posts/${p.id}/comments" class="flex gap-2">
              <input name="text" maxlength="300" required
                placeholder="Write a comment…"
                class="flex-1 px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 outline-none focus:ring-2 focus:ring-blue-600" />
              <button class="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 font-medium">Send</button>
            </form>
          </div>
        </div>
      </div>
    `;
  }

  // Wire "open" buttons only if they exist
  const openBtns = document.querySelectorAll("[data-open-post]");
  if (openBtns.length) {
    openBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-id");
        const post = posts.find((x) => x.id === id);
        if (!post) return;
        openModal(renderPostModal(post));
        modalContent.querySelector("[data-close-modal]")?.addEventListener("click", closeModal);
      });
    });
  }

  // Collapsible comments inside feed cards (kept from your page)
  document.querySelectorAll("[data-toggle-comments]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-id");
      const el = document.getElementById(`comments-${id}`);
      if (el) el.classList.toggle("hidden");
      // Hydrate any newly revealed timeago elements within this comments panel
      if (el) hydrateTimeagos(el);
    });
  });

  // Initial hydration for server-rendered timestamps
  hydrateTimeagos();
})();
