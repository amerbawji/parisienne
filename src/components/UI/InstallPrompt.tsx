import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const InstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const isMobileOrTablet = window.matchMedia('(max-width: 1024px)').matches;
    if (!isMobileOrTablet) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  if (!visible || !deferredPrompt) return null;

  const handleInstall = async () => {
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setVisible(false);
  };

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:w-80">
      <div className="bg-primary-700 text-white rounded-2xl shadow-xl p-4 flex items-center gap-3">
        <div className="shrink-0 w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
          <img src="/pwa-64x64.png" alt="Parisienne" className="w-7 h-7 rounded-lg" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold">Add to Home Screen</p>
          <p className="text-xs text-white/70">Get quick access to the menu</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button onClick={() => setVisible(false)}
            className="text-xs px-2 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition font-medium">
            Later
          </button>
          <button onClick={handleInstall}
            className="text-xs px-3 py-1.5 rounded-lg bg-white text-primary-700 hover:bg-white/90 transition font-bold">
            Install
          </button>
        </div>
      </div>
    </div>
  );
};
