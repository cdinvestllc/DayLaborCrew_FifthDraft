import React from "react";
import ReactDOM from "react-dom/client";
import "@/index.css";
import "leaflet/dist/leaflet.css";
import "maplibre-gl/dist/maplibre-gl.css";
import App from "@/App";

// ─── PostHog / rrweb cross-origin iframe crash fix ───────────────────────────
// Must run BEFORE any PostHog script initialises.
(function () {
  // 1. Detect cross-origin iframe (accessing window.top throws SecurityError)
  let isIframe = false;
  try {
    isIframe = window.self !== window.top;
  } catch (_) {
    isIframe = true; // blocked = definitely cross-origin iframe
  }

  // 2. Globally swallow SecurityError from posthog-recorder / rrweb
  const SWALLOW = ["removeEventListener", "cross-origin", "posthog-recorder", "SecurityError", "rrweb"];
  const swallow = (msg) => msg && SWALLOW.some((s) => String(msg).includes(s));

  const origOnError = window.onerror;
  window.onerror = function (msg, src, line, col, err) {
    if (swallow(msg) || swallow(err?.message) || swallow(src)) return true;
    return origOnError ? origOnError(msg, src, line, col, err) : false;
  };

  window.addEventListener("unhandledrejection", function (e) {
    if (swallow(e?.reason?.message) || swallow(String(e?.reason))) {
      e.preventDefault();
      e.stopImmediatePropagation();
    }
  }, true);

  // 3. If in iframe, stop PostHog session recording as soon as PostHog loads
  if (isIframe) {
    const stopRecording = () => {
      try {
        if (window.posthog) {
          if (typeof window.posthog.stopSessionRecording === "function") {
            window.posthog.stopSessionRecording();
          }
          // Disable recorder before it can attach cross-origin listeners
          if (window.posthog.sessionRecording) {
            window.posthog.sessionRecording.isRecordingEnabled = () => false;
          }
        }
      } catch (_) {}
    };

    // Run immediately and after a tick (PostHog may not be initialised yet)
    stopRecording();
    setTimeout(stopRecording, 0);
    setTimeout(stopRecording, 500);

    // Also patch MutationObserver used by rrweb to catch cross-origin nodes
    const OrigMO = window.MutationObserver;
    window.MutationObserver = class SafeMO extends OrigMO {
      observe(target, options) {
        try {
          super.observe(target, options);
        } catch (e) {
          if (!swallow(e.message)) throw e;
        }
      }
    };
  }
})();
// ─────────────────────────────────────────────────────────────────────────────

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
