// Content script — runs on linkedin.com. It watches for comment boxes opening
// as you scroll, drops a "Suggest comment" button above each one, and on click
// reads the post text, asks the background worker for suggestions, and renders
// them as clickable chips. Clicking a chip inserts the text into LinkedIn's
// comment editor. Nothing is ever posted automatically.
(function () {
  "use strict";
  const FLAG = "bleedInjected";

  // Walk up from a comment editor to the post it belongs to.
  function findPostContainer(el) {
    return (
      el.closest(".feed-shared-update-v2") ||
      el.closest("[data-urn]") ||
      el.closest("article") ||
      null
    );
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

  // Insert text into LinkedIn's Quill comment editor and make Quill notice.
  function insertIntoEditor(editor, text) {
    editor.focus();
    try {
      const sel = window.getSelection();
      sel.selectAllChildren(editor);
      document.execCommand("insertText", false, text);
    } catch (e) {
      editor.textContent = text;
    }
    editor.classList.remove("ql-blank");
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
    const isComment =
      editor.closest(".comments-comment-box") ||
      editor.closest(".comments-comment-texteditor") ||
      editor.closest("form.comments-comment-box__form");
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
    root
      .querySelectorAll(".ql-editor[contenteditable='true']")
      .forEach(tryInject);
  }

  const observer = new MutationObserver(function (muts) {
    for (const m of muts) {
      m.addedNodes.forEach(function (n) {
        if (n.nodeType !== 1) return;
        if (n.matches && n.matches(".ql-editor[contenteditable='true']"))
          tryInject(n);
        scan(n);
      });
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
  scan(document);
})();
