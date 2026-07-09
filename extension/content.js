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
