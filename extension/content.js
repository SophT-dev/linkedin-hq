// Content script — runs on linkedin.com. It watches for comment boxes opening
// as you scroll, drops a "Suggest comment" button above each one, and on click
// reads the post text, asks the background worker for suggestions, and renders
// them as clickable chips. Clicking a chip inserts the text into LinkedIn's
// comment editor. Nothing is ever posted automatically.
(function () {
  "use strict";
  const FLAG = "bleedInjected";

  // LinkedIn's comment editor moved from Quill (.ql-editor) to Tiptap/
  // ProseMirror at some point in 2026. Match both so this survives whichever
  // one is live. The aria-label is the most stable Tiptap identifier LinkedIn
  // exposes (used for accessibility, unlikely to be casually renamed); the
  // .tiptap.ProseMirror classes are a fallback in case the label wording
  // changes. isComment() below still gates out the post composer either way.
  const EDITOR_SELECTOR =
    ".ql-editor[contenteditable='true']," +
    " [contenteditable='true'][aria-label='Text editor for creating comment']," +
    " [contenteditable='true'].tiptap.ProseMirror";

  // Walk up from a comment editor to the post it belongs to. LinkedIn's 2026
  // feed rewrite uses hashed CSS-module class names (no stable classes at
  // all), so we anchor on the ARIA role instead — each post in the feed is
  // role="listitem" (confirmed via live DOM trace 2026-07-09). Old selectors
  // kept as a fallback in case a different page template still uses them.
  // The single-post permalink page (e.g. linkedin.com/feed/update/...) does
  // NOT wrap its post in role="listitem" — there's only one post, not a list
  // — so none of the specific selectors match there. Last-resort fallback:
  // walk up from the editor and take the first ancestor with a meaningful
  // amount of text, capped at 15 levels so we never walk all the way to
  // <body> and grab the whole page.
  function findPostContainer(el) {
    const specific =
      el.closest('[role="listitem"]') ||
      el.closest(".feed-shared-update-v2") ||
      el.closest("[data-urn]") ||
      el.closest("article");
    if (specific) return specific;

    let node = el.parentElement;
    for (let i = 0; i < 15 && node; i++) {
      const text = (node.innerText || "").trim();
      if (text.length > 50) return node;
      node = node.parentElement;
    }
    return null;
  }

  // Pull the post's text, trying the stable-ish content selectors first,
  // falling back to the container's visible text.
  function extractPostText(container) {
    if (!container) return "";
    const sels = [
      ".update-components-update-v2__commentary",
      ".feed-shared-update-v2__description",
      ".update-components-text",
      ".feed-shared-text",
    ];
    for (const s of sels) {
      const node = container.querySelector(s);
      if (node && node.innerText && node.innerText.trim().length > 10) {
        return node.innerText.trim().slice(0, 3000);
      }
    }
    return (container.innerText || "").trim().slice(0, 3000);
  }

  function findAuthor(container) {
    if (!container) return "";
    const a = container.querySelector(
      ".update-components-actor__title, .update-components-actor__name"
    );
    return a ? (a.innerText || "").trim().split("\n")[0].slice(0, 80) : "";
  }

  // Insert text into LinkedIn's comment editor (Quill or Tiptap/ProseMirror)
  // and make sure the editor notices. execCommand fires native beforeinput/
  // input events, which is what makes both Quill and ProseMirror pick up a
  // programmatic change instead of silently ignoring a direct textContent set.
  function insertIntoEditor(editor, text) {
    editor.focus();
    try {
      const sel = window.getSelection();
      sel.selectAllChildren(editor);
      document.execCommand("insertText", false, text);
    } catch (e) {
      editor.textContent = text;
    }
    // Quill's empty-state flag lives on the editor itself; Tiptap/ProseMirror's
    // lives on the inner <p>. Clear whichever is present.
    editor.classList.remove("ql-blank");
    editor.querySelectorAll(".is-empty, .is-editor-empty").forEach((p) => {
      p.classList.remove("is-empty", "is-editor-empty");
    });
    editor.dispatchEvent(new InputEvent("input", { bubbles: true }));
  }

  function buildBar(editor, container) {
    const bar = document.createElement("div");
    bar.className = "bleed-bar";

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "bleed-btn";
    btn.textContent = "✨ Suggest comment";

    const results = document.createElement("div");
    results.className = "bleed-results";

    bar.appendChild(btn);
    bar.appendChild(results);

    btn.addEventListener("click", function () {
      const postText = extractPostText(container);
      if (!postText || postText.length < 5) {
        results.innerHTML =
          '<div class="bleed-msg">Couldn\'t read this post’s text.</div>';
        return;
      }
      btn.disabled = true;
      btn.textContent = "Thinking…";
      results.innerHTML = "";

      chrome.runtime.sendMessage(
        {
          type: "BLEED_SUGGEST",
          postText: postText,
          creatorName: findAuthor(container),
        },
        function (resp) {
          btn.disabled = false;
          btn.textContent = "✨ Suggest comment";
          if (chrome.runtime.lastError) {
            results.innerHTML =
              '<div class="bleed-msg">⚠ ' +
              chrome.runtime.lastError.message +
              "</div>";
            return;
          }
          if (!resp || !resp.ok) {
            results.innerHTML =
              '<div class="bleed-msg">⚠ ' +
              ((resp && resp.error) || "request failed") +
              "</div>";
            return;
          }
          if (!resp.suggestions || !resp.suggestions.length) {
            results.innerHTML =
              '<div class="bleed-msg">No suggestions passed the voice filter — tap again.</div>';
            return;
          }
          results.innerHTML = "";
          resp.suggestions.forEach(function (s) {
            const chip = document.createElement("button");
            chip.type = "button";
            chip.className = "bleed-chip";
            chip.textContent = s.text;
            chip.title = "Insert this comment";
            chip.addEventListener("click", function () {
              insertIntoEditor(editor, s.text);
              results.innerHTML = "";
            });
            results.appendChild(chip);
          });
        }
      );
    });

    return bar;
  }

  function tryInject(editor) {
    if (!editor || editor.dataset[FLAG]) return;
    // Only the comment editor, never the post composer.
    // LinkedIn 2026 rewrite: comment box wrapper's componentkey literally
    // starts with "commentBox-" (confirmed via live DOM trace 2026-07-09).
    // Old class-based checks kept as fallback for other page templates.
    const ariaLabel = (editor.getAttribute("aria-label") || "").toLowerCase();
    const isComment =
      editor.closest('[componentkey^="commentBox-"]') ||
      editor.closest(".comments-comment-box") ||
      editor.closest(".comments-comment-texteditor") ||
      editor.closest("form.comments-comment-box__form") ||
      (ariaLabel.includes("comment") && !ariaLabel.includes("post"));
    if (!isComment) return;
    const container = findPostContainer(editor);
    if (!container) return;

    editor.dataset[FLAG] = "1";
    const anchor =
      editor.closest("form") ||
      editor.closest(".comments-comment-box") ||
      editor.parentElement;
    const bar = buildBar(editor, container);
    (anchor || editor).insertAdjacentElement("beforebegin", bar);
  }

  function scan(root) {
    if (!root || !root.querySelectorAll) return;
    root.querySelectorAll(EDITOR_SELECTOR).forEach(tryInject);
  }

  const observer = new MutationObserver(function (muts) {
    for (const m of muts) {
      m.addedNodes.forEach(function (n) {
        if (n.nodeType !== 1) return;
        if (n.matches && n.matches(EDITOR_SELECTOR)) tryInject(n);
        scan(n);
      });
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
  scan(document);
})();

// ============================================================================
// ⭐ Favorite / star a feed post
// Drops a ☆ button top-right of every feed post. Click → scrape the post
// (urn/url, author, text, counts, media, timestamp) and send it to linkedin-hq
// as a starred Template Library entry. Filled ★ = already starred; the skip-
// list is primed on load (same pattern as activity.js's BLEED_CMTS_KNOWN).
// Self-contained IIFE so it can't interfere with the comment-suggest block.
// ============================================================================
(function () {
  "use strict";
  const FAV_FLAG = "bleedFav";
  const FAVSET = new Set(); // postUrls + urns already starred (skip-list cache)

  // Human-readable count ("1.2K") → integer, or null. (Mirrors sync.js.)
  function favParseCount(s) {
    if (s == null) return null;
    const t = ("" + s).replace(/,/g, "").trim();
    const m = t.match(/([\d.]+)\s*([KMB]?)/i);
    if (!m) return null;
    let v = parseFloat(m[1]);
    const u = (m[2] || "").toUpperCase();
    if (u === "K") v *= 1e3;
    else if (u === "M") v *= 1e6;
    else if (u === "B") v *= 1e9;
    return Math.round(v);
  }

  // activity.js's convention: the post's activity urn is the stable id, and the
  // permalink is /feed/update/<urn>.
  function favUrn(container) {
    let urn = container.getAttribute("data-urn");
    if (!urn || !/urn:li:activity/.test(urn)) {
      const el = container.querySelector('[data-urn*="urn:li:activity"]');
      if (el) urn = el.getAttribute("data-urn");
    }
    if (!urn) {
      const anc = container.closest('[data-urn*="urn:li:activity"]');
      if (anc) urn = anc.getAttribute("data-urn");
    }
    return urn && /urn:li:activity/.test(urn) ? urn : "";
  }

  function favAuthor(container) {
    const a = container.querySelector(
      ".update-components-actor__title, .update-components-actor__name"
    );
    return a ? (a.innerText || "").trim().split("\n")[0].slice(0, 120) : "";
  }

  function favAuthorUrl(container) {
    const link = container.querySelector(
      '.update-components-actor__meta a[href*="/in/"],' +
      ' .update-components-actor__container a[href*="/in/"],' +
      ' a.update-components-actor__meta-link[href*="/in/"],' +
      ' .update-components-actor a[href*="/in/"]'
    );
    let href = link ? link.getAttribute("href") || "" : "";
    if (href.startsWith("/")) href = "https://www.linkedin.com" + href;
    return (href.split("?")[0] || "");
  }

  // Same content selectors content.js uses for the comment-suggest feature.
  function favText(container) {
    // Reveal a "…see more" toggle if it's trivially clickable (LinkedIn just
    // un-hides already-rendered text, so a synchronous read after works).
    const more = container.querySelector(
      "button.feed-shared-inline-show-more-text__see-more-less-toggle," +
      ' .feed-shared-inline-show-more-text button,' +
      ' button[aria-label*="see more" i]'
    );
    if (more && more.offsetParent !== null) { try { more.click(); } catch (e) { /* ignore */ } }

    const sels = [
      ".update-components-update-v2__commentary",
      ".feed-shared-update-v2__description",
      ".update-components-text",
      ".feed-shared-text",
    ];
    for (const s of sels) {
      const node = container.querySelector(s);
      if (node && node.innerText && node.innerText.trim().length > 10) {
        return node.innerText.trim().slice(0, 3000);
      }
    }
    return "";
  }

  // Social counts bar → { likes, comments } (either may be null).
  function favCounts(container) {
    const scope = container.querySelector(".social-details-social-counts") || container;
    let likes = null;
    const rc = scope.querySelector(".social-details-social-counts__reactions-count");
    if (rc) likes = favParseCount(rc.innerText);
    if (likes == null) {
      const rl = scope.querySelector('[aria-label*="reaction" i]');
      if (rl) {
        const m = (rl.getAttribute("aria-label") || "").match(/([\d.,]+\s*[KMB]?)/);
        if (m) likes = favParseCount(m[1]);
      }
    }
    let comments = null;
    const cel = scope.querySelector('[aria-label*="comment" i]');
    if (cel) {
      const src = cel.getAttribute("aria-label") || cel.innerText || "";
      const m = src.match(/([\d.,]+\s*[KMB]?)\s*comment/i);
      if (m) comments = favParseCount(m[1]);
    }
    return { likes, comments };
  }

  function favMedia(container) {
    const urls = [];
    container
      .querySelectorAll('img[src*="media.licdn.com"], video[src*="media.licdn.com"]')
      .forEach((el) => {
        if (el.closest(".update-components-actor")) return; // skip the author avatar
        const s = el.getAttribute("src") || "";
        if (s && urls.indexOf(s) === -1) urls.push(s);
      });
    return urls;
  }

  function favTimestamp(container) {
    const sub = container.querySelector(".update-components-actor__sub-description");
    return sub ? (sub.innerText || "").split("\n")[0].trim().slice(0, 80) : "";
  }

  function setFavState(btn, filled) {
    btn.textContent = filled ? "★" : "☆";
    btn.classList.toggle("is-fav", !!filled);
    btn.title = filled ? "Starred ✓ (saved as template)" : "Star this post as a template";
  }

  let toastTimer = null;
  function favToast(text) {
    let el = document.querySelector(".bleed-fav-toast");
    if (!el) {
      el = document.createElement("div");
      el.className = "bleed-fav-toast";
      document.body.appendChild(el);
    }
    el.textContent = text;
    requestAnimationFrame(() => el.classList.add("show"));
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("show"), 1900);
  }

  function onFavClick(e) {
    e.preventDefault();
    e.stopPropagation();
    const btn = e.currentTarget;
    const container = btn.__container;
    const urn = btn.__urn;
    const postUrl = btn.__postUrl;
    if (btn.classList.contains("is-fav")) { favToast("Already saved ✓"); return; }

    const text = favText(container);
    const counts = favCounts(container);
    const payload = {
      postUrl: postUrl,
      authorName: favAuthor(container),
      authorProfileUrl: favAuthorUrl(container),
      text: text,
      hook: (text.split("\n").map((s) => s.trim()).find((s) => s) || "").slice(0, 200),
      likes: counts.likes,
      comments: counts.comments,
      mediaUrls: favMedia(container),
      timestamp: favTimestamp(container),
    };

    btn.disabled = true;
    chrome.runtime.sendMessage({ type: "BLEED_FAVORITE", payload }, function (resp) {
      btn.disabled = false;
      if (chrome.runtime.lastError) { favToast("⚠ " + chrome.runtime.lastError.message); return; }
      if (!resp || !resp.ok) { favToast("⚠ " + ((resp && resp.error) || "save failed")); return; }
      FAVSET.add(postUrl);
      FAVSET.add(urn);
      setFavState(btn, true);
      favToast(resp.body && resp.body.dedup ? "Already saved ✓" : "Saved ✓");
    });
  }

  function favInject(container) {
    if (!container || container.dataset[FAV_FLAG]) return;
    const urn = favUrn(container);
    if (!urn) return; // no stable id → not a real feed post (or a nested fragment)
    // Must actually be a post (has an author actor), not a comment/other block.
    if (!container.querySelector(".update-components-actor__title, .update-components-actor__name")) return;
    container.dataset[FAV_FLAG] = "1";

    if (getComputedStyle(container).position === "static") container.style.position = "relative";
    const postUrl = "https://www.linkedin.com/feed/update/" + urn;

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "bleed-fav";
    btn.setAttribute("aria-label", "Star this post as a template");
    btn.__container = container;
    btn.__urn = urn;
    btn.__postUrl = postUrl;
    setFavState(btn, FAVSET.has(postUrl) || FAVSET.has(urn));
    btn.addEventListener("click", onFavClick);
    container.appendChild(btn);
  }

  function favScan(root) {
    if (!root || !root.querySelectorAll) return;
    root
      .querySelectorAll('.feed-shared-update-v2, div[data-urn*="urn:li:activity"]')
      .forEach(favInject);
    if (root.matches && root.matches('.feed-shared-update-v2, div[data-urn*="urn:li:activity"]')) {
      favInject(root);
    }
  }

  // Prime the skip-list once, then refresh any already-rendered stars.
  function primeFavs() {
    chrome.runtime.sendMessage({ type: "BLEED_FAVS_KNOWN" }, function (resp) {
      if (chrome.runtime.lastError) return;
      (resp && resp.urls || []).forEach((u) => FAVSET.add(u));
      if (!FAVSET.size) return;
      document.querySelectorAll(".bleed-fav").forEach((b) => {
        if (FAVSET.has(b.__postUrl) || FAVSET.has(b.__urn)) setFavState(b, true);
      });
    });
  }

  const favObserver = new MutationObserver(function (muts) {
    for (const m of muts) {
      m.addedNodes.forEach(function (n) {
        if (n.nodeType !== 1) return;
        favScan(n);
      });
    }
  });
  favObserver.observe(document.body, { childList: true, subtree: true });
  primeFavs();
  favScan(document);
})();
