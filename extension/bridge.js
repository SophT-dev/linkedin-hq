// Page ↔ extension bridge — runs ONLY on the LinkedIn HQ dashboard
// (linkedin-hq.vercel.app + localhost:3009). The dashboard can't talk to the
// extension directly (no extension id, and chrome.runtime isn't exposed to page
// scripts), so this content script sits in the middle:
//
//   page  --window.postMessage {BLEED_SYNC_NOW}-->  bridge
//   bridge  --chrome.runtime.sendMessage {BLEED_SYNC_NOW}-->  background
//   bridge  --window.postMessage {BLEED_SYNC_ACK}-->  page   (immediately: "extension is here")
//   background runs open-force-close sync, replies...
//   bridge  --window.postMessage {BLEED_SYNC_DONE}-->  page   (on completion)
//
// The ACK is what lets the dashboard tell "extension installed" from "not
// installed" — if no ACK arrives within its window, the page shows the reload
// hint. DONE just nudges the page to poll immediately instead of waiting.
(function () {
  "use strict";

  window.addEventListener("message", (event) => {
    // Only trust messages this page posted to itself.
    if (event.source !== window) return;
    const data = event.data;
    if (!data || data.type !== "BLEED_SYNC_NOW") return;

    // 1) Prove the extension is present, synchronously.
    window.postMessage({ type: "BLEED_SYNC_ACK" }, "*");

    // 2) Ask the background worker to run the open-force-close sync routine.
    try {
      chrome.runtime.sendMessage({ type: "BLEED_SYNC_NOW" }, (resp) => {
        if (chrome.runtime.lastError) {
          window.postMessage(
            { type: "BLEED_SYNC_DONE", ok: false, error: chrome.runtime.lastError.message },
            "*"
          );
          return;
        }
        window.postMessage(
          { type: "BLEED_SYNC_DONE", ok: !!(resp && resp.ok), error: resp && resp.error },
          "*"
        );
      });
    } catch (e) {
      window.postMessage({ type: "BLEED_SYNC_DONE", ok: false, error: String((e && e.message) || e) }, "*");
    }
  });
})();
