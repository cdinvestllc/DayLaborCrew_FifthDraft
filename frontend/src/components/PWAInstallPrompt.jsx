import React, { useState, useEffect } from "react";
import { Download, X } from "lucide-react";

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if already dismissed
    if (localStorage.getItem("pwa-prompt-dismissed")) return;

    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Show prompt after 30s or on specific trigger
      setTimeout(() => setShowPrompt(true), 30000);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const install = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const result = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setShowPrompt(false);
    if (result.outcome === "accepted") {
      localStorage.setItem("pwa-installed", "true");
    }
  };

  const dismiss = () => {
    setShowPrompt(false);
    setDismissed(true);
    localStorage.setItem("pwa-prompt-dismissed", "true");
  };

  if (!showPrompt || dismissed) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-80 bg-[#050A30] text-white rounded-2xl shadow-2xl p-4 z-50 border border-[#0000FF]/40"
      data-testid="pwa-install-prompt">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 bg-[#0000FF] rounded-xl flex items-center justify-center flex-shrink-0">
          <Download className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm mb-0.5">Add to Home Screen</p>
          <p className="text-slate-400 text-xs">Install TheDayLaborers for quick access — works offline too!</p>
          <div className="flex gap-2 mt-3">
            <button onClick={install} data-testid="pwa-install-btn"
              className="flex-1 bg-[#0000FF] text-white py-2 rounded-lg text-xs font-bold hover:bg-blue-600 transition-colors">
              Install App
            </button>
            <button onClick={dismiss} data-testid="pwa-dismiss-btn"
              className="px-3 py-2 border border-slate-600 text-slate-400 rounded-lg text-xs hover:text-white transition-colors">
              Later
            </button>
          </div>
        </div>
        <button onClick={dismiss} className="text-slate-500 hover:text-white -mt-1"><X className="w-4 h-4" /></button>
      </div>
    </div>
  );
}
