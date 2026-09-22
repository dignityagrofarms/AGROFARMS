import { useState, useEffect } from "react";
import { Download, Share, X } from "lucide-react";

export function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showPrompt, setShowPrompt] = useState(true);

  useEffect(() => {
    // Check if app is already installed/running in standalone mode
    const isAppMode = window.matchMedia("(display-mode: standalone)").matches || 
                      (window.navigator as any).standalone === true;
    setIsStandalone(isAppMode);

    // Detect iOS Safari
    const ua = window.navigator.userAgent;
    const webkit = !!ua.match(/WebKit/i);
    const isIPad = !!ua.match(/iPad/i);
    const isIPhone = !!ua.match(/iPhone/i);
    const isIOSDevice = isIPad || isIPhone;
    const isSafari = isIOSDevice && webkit && !ua.match(/CriOS/i);
    
    if (isSafari && !isAppMode) {
      setIsIOS(true);
    }

    // Inject manifest dynamically so it only exists on this page
    let manifestLink = document.querySelector('link[rel="manifest"]');
    if (!manifestLink) {
      manifestLink = document.createElement('link');
      manifestLink.rel = 'manifest';
      manifestLink.setAttribute('href', '/manifest.json');
      document.head.appendChild(manifestLink);
    }

    // Register service worker dynamically
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(err => console.log('SW registration failed:', err));
    }

    // Listen for Android/Chrome install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setDeferredPrompt(null);
    }
  };

  // If already installed, or user dismissed, or no prompt available (and not iOS), don't show
  if (isStandalone || !showPrompt || (!deferredPrompt && !isIOS)) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:w-96 rounded-2xl bg-[#0F3D24] p-4 text-white shadow-2xl ring-1 ring-white/10 animate-in slide-in-from-bottom-5">
      <button 
        onClick={() => setShowPrompt(false)}
        className="absolute right-3 top-3 rounded-full p-1 text-white/60 hover:bg-white/10 hover:text-white transition"
      >
        <X size={16} />
      </button>

      <div className="mb-3 flex items-center gap-3 pr-6">
        <img src="/favicon.png" alt="App Icon" className="h-10 w-10 rounded-xl bg-white p-0.5 object-cover" />
        <div>
          <h4 className="font-semibold text-sm">Install Dignity Agro farms</h4>
          <p className="text-xs text-white/70">Get the app for quicker access</p>
        </div>
      </div>

      {isIOS ? (
        <div className="mt-3 rounded-xl bg-white/10 p-3 text-xs leading-relaxed text-white/90">
          To install on this iPhone, tap the <Share size={14} className="inline mx-1" /> **Share** icon at the bottom of your screen and select **"Add to Home Screen"**.
        </div>
      ) : (
        <button
          onClick={handleInstallClick}
          className="mt-2 w-full flex items-center justify-center gap-2 rounded-xl bg-[#3F8F3F] py-2.5 text-sm font-semibold text-white transition hover:bg-[#4ea94e]"
        >
          <Download size={16} /> Add to Home Screen
        </button>
      )}
    </div>
  );
}
