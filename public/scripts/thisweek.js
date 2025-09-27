// public/scripts/thisweek.js
(() => {
  "use strict";

  /* ---------------- helpers ---------------- */
  const $  = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const escapeHtml = (s) =>
    String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");

  /* ---------------- page data ---------------- */
  const posts = JSON.parse($("#thisweek-posts")?.textContent || "[]");
  const flags = JSON.parse($("#thisweek-flags")?.textContent || "{}");

  /* ---------------- modal plumbing ---------------- */
  const modal = $("#postModal");
  const modalContent = $("#modalContent");
  const lock = () => (document.body.style.overflow = "hidden");
  const unlock = () => (document.body.style.overflow = "");

  function closeModal() {
    if (!modal) return;
    modal.classList.add("opacity-0");
    modalContent.classList.remove("scale-100");
    modalContent.classList.add("scale-95");
    setTimeout(() => {
      modal.classList.add("pointer-events-none");
      modalContent.innerHTML = "";
      unlock();
    }, 300);
  }

  modal?.addEventListener("click", (e) => {
    if (e.target === e.currentTarget) closeModal();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeModal();
  });

  /* ---------------- build + open modal ---------------- */
  const daysAgo = (iso) => {
    const d = Math.floor((Date.now() - new Date(iso)) / (1000 * 60 * 60 * 24));
    return d === 0 ? "Today" : d === 1 ? "1 day ago" : `${d} days ago`;
  };

  function buildModal(post) {
    const initial = (post.userId?.username || "U").charAt(0).toUpperCase();
    const avatar = post.userId?.avatarUrl
      ? `<img src="${post.userId.avatarUrl}" alt="Avatar" class="w-full h-full object-cover" onerror="this.style.display='none'">`
      : `<span class="text-lg font-bold text-white">${initial}</span>`;
    const adminBadge =
      post.userId?.role === "admin"
        ? `<span class="px-2 py-0.5 text-xs rounded-full bg-purple-600/20 text-purple-300 border border-purple-700 ml-2">ADMIN</span>`
        : "";

    const canRemove =
      !!flags.isAdmin ||
      (flags.isLoggedIn && post.userId?._id && String(flags.currentUserId) === String(post.userId._id));

    modalContent.innerHTML = `
      <div class="flex flex-col lg:flex-row h-full max-h-[95vh]">
        <!-- image -->
        <div class="lg:w-3/5 bg-black flex items-center justify-center overflow-auto">
          <img src="${post.imageUrl}" alt="${escapeHtml(post.title)}"
               class="max-w-full max-h-full object-contain"
               onerror="this.onerror=null; this.src='/placeholder.jpg';">
        </div>

        <!-- right pane -->
        <div class="lg:w-2/5 flex flex-col bg-zinc-900 max-h-[95vh]">
          <!-- header -->
          <div class="p-6 border-b border-zinc-800">
            <div class="flex items-center justify-between mb-4">
              <div class="flex items-center gap-3">
                <div class="w-12 h-12 rounded-full overflow-hidden bg-gradient-to-br from-blue-500 to-purple-600 grid place-items-center ring-2 ring-zinc-700">
                  ${avatar}
                </div>
                <div>
                  <h3 class="font-bold text-lg flex items-center">
                    ${escapeHtml(post.userId?.username || "Unknown User")}${adminBadge}
                  </h3>
                  <div class="flex items-center gap-2 text-sm text-zinc-400">
                    <time>${new Date(post.createdAt).toLocaleDateString()}</time>
                    <span>•</span>
                    <span>${daysAgo(post.createdAt)}</span>
                  </div>
                </div>
              </div>
              <button class="p-2 hover:bg-zinc-800 rounded-full transition-colors" data-close-modal>
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>
            <h2 class="text-xl font-bold leading-tight">${escapeHtml(post.title)}</h2>
          </div>

          <!-- stats -->
          <div class="p-6 border-b border-zinc-800">
            <div class="grid grid-cols-2 gap-4 text-center">
              <div>
                <div class="text-2xl font-bold text-pink-400">${post.likesCount ?? 0}</div>
                <div class="text-sm text-zinc-400">Loves</div>
              </div>
              <div>
                <div class="text-2xl font-bold text-blue-400">${daysAgo(post.createdAt)}</div>
                <div class="text-sm text-zinc-400">Posted</div>
              </div>
            </div>
          </div>

          <!-- actions -->
          <div class="p-6 space-y-4">
            ${
              flags.isLoggedIn
                ? `<button class="w-full flex items-center justify-center gap-3 px-6 py-3 rounded-xl text-sm font-medium transition-all hover:scale-105 ${post.likedByMe ? 'bg-pink-600 hover:bg-pink-700' : 'bg-zinc-800 hover:bg-zinc-700'}"
                           data-like data-id="${post.id}" data-liked="${post.likedByMe ? '1' : '0'}">
                     <span class="like-heart">${post.likedByMe ? '❤️' : '🤍'}</span>
                     <span class="like-label">${post.likedByMe ? 'Remove Love' : 'Show Love'}</span>
                   </button>`
                : `<a href="/login" class="w-full flex items-center justify-center gap-3 px-6 py-3 rounded-xl text-sm font-medium bg-zinc-800 hover:bg-zinc-700">
                     <span class="text-lg">🤍</span><span>Login to Show Love</span>
                   </a>`
            }
            ${
              canRemove
                ? `<button class="w-full px-6 py-3 rounded-xl text-sm bg-red-600 hover:bg-red-700 font-medium transition-all"
                           data-delete data-id="${post.id}">
                     <svg class="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                       <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                     </svg>
                     ${flags.isAdmin ? "Remove Post" : "Delete Post"}
                   </button>`
                : ""
            }
          </div>

          <!-- footer badge -->
          <div class="mt-auto p-6 border-t border-zinc-800 bg-zinc-800/50">
            <div class="flex items-center justify-center gap-2 text-sm text-blue-300">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <span>Part of This Week's Collection</span>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function openByIndex(idx) {
    const post = posts[idx];
    if (!post || !modal || !modalContent) return;
    buildModal(post);
    modal.classList.remove("pointer-events-none");
    setTimeout(() => {
      modal.classList.remove("opacity-0");
      modalContent.classList.remove("scale-95");
      modalContent.classList.add("scale-100");
      lock();
    }, 10);
  }

  /* ---------------- like / delete ---------------- */
  async function toggleLike(postId, currentlyLiked) {
    const action = currentlyLiked ? "unlike" : "like";
    return fetch(`/posts/${postId}/${action}`, { method: "POST", headers: { "Content-Type": "application/json" }});
  }
  async function deletePost(postId) {
    return fetch(`/posts/${postId}/delete`, { method: "POST" });
  }
  function updateLikeBtn(btn, liked) {
    btn.dataset.liked = liked ? "1" : "0";
    btn.classList.toggle("bg-pink-600", liked);
    btn.classList.toggle("hover:bg-pink-700", liked);
    btn.classList.toggle("bg-zinc-800", !liked);
    btn.classList.toggle("hover:bg-zinc-700", !liked);
    const heart = btn.querySelector(".like-heart");
    const label = btn.querySelector(".like-label");
    if (heart) heart.textContent = liked ? "❤️" : "🤍";
    if (label) label.textContent = liked ? "Remove Love" : "Show Love";
  }

  /* ---------------- events ---------------- */
  document.addEventListener("click", (e) => {
    // open modal from card
    const open = e.target.closest("[data-open-post]");
    if (open) {
      const idx = Number(open.getAttribute("data-index"));
      openByIndex(idx);
      return;
    }

    // like
    const like = e.target.closest("[data-like]");
    if (like) {
      e.stopPropagation();
      if (!flags.isLoggedIn) return;
      const id = like.getAttribute("data-id");
      const isLiked = like.getAttribute("data-liked") === "1";
      updateLikeBtn(like, !isLiked);
      toggleLike(id, isLiked).then(() => setTimeout(() => location.reload(), 800));
      return;
    }

    // delete
    const del = e.target.closest("[data-delete]");
    if (del) {
      const id = del.getAttribute("data-id");
      if (confirm("Delete this post?")) {
        deletePost(id).then(() => {
          closeModal();
          location.reload();
        });
      }
      return;
    }

    // close modal button
    if (e.target.closest("[data-close-modal]")) closeModal();
  });

  /* ---------------- optional sorting API ---------------- */
  // Add buttons in your UI and call: sortThisWeek('newest' | 'popular' | 'oldest')
  window.sortThisWeek = function sortThisWeek(kind = "newest") {
    const grid = $("#postsGrid");
    if (!grid) return;
    const cards = $$("#postsGrid > article");
    cards.sort((a, b) => {
      const ia = Number(a.getAttribute("data-index"));
      const ib = Number(b.getAttribute("data-index"));
      const A = posts[ia], B = posts[ib];
      switch (kind) {
        case "popular": return (B.likesCount || 0) - (A.likesCount || 0);
        case "oldest":  return new Date(A.createdAt) - new Date(B.createdAt);
        default:        return new Date(B.createdAt) - new Date(A.createdAt);
      }
    });
    cards.forEach((c) => grid.appendChild(c));
  };
})();
