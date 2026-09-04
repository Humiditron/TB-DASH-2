import React, { useState } from 'react';
import { Download, Smartphone, CheckCircle, Share, PlusSquare, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  className?: string;
  variant?: 'header' | 'button' | 'compact';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  className = '',
  variant = 'header',
}) => {
  const { isInstallable, isInstalled, isStandalone, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [installing, setInstalling] = useState(false);

  const handleInstallClick = async () => {
    if (isInstallable) {
      setInstalling(true);
      try {
        await install();
      } finally {
        setInstalling(false);
      }
    } else if (isIOS) {
      setShowIOSGuide(true);
    }
  };

  // If running in standalone or TWA mode, show active badge
  if (isStandalone || isInstalled) {
    if (variant === 'compact') return null;
    return (
      <div
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono select-none ${className}`}
        title="Running as an installed PWA / Android TWA"
      >
        <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
        <span className="hidden sm:inline">PWA Active</span>
      </div>
    );
  }

  // Not installable in this browser engine (or already installed) and not iOS
  if (!isInstallable && !isIOS) {
    return null;
  }

  return (
    <>
      <button
        id="pwa-install-app-btn"
        type="button"
        onClick={handleInstallClick}
        disabled={installing}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs tracking-wide transition shadow-sm cursor-pointer active:scale-95 disabled:opacity-50 ${className}`}
        title={isIOS ? 'Install HUMID1 on iPhone/iPad' : 'Install HUMID1 Native App'}
      >
        <Download className="w-3.5 h-3.5 text-slate-950 stroke-[2.5]" />
        <span>{isIOS ? 'Install on iOS' : 'Install App'}</span>
      </button>

      {/* iOS Installation Instruction Guide Modal */}
      {showIOSGuide && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-sm shadow-2xl p-6 text-slate-100 space-y-4 animate-scaleIn">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <Smartphone className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-slate-100 text-base font-display">Install on iPhone / iPad</h3>
              </div>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-300 bg-slate-950/80 p-4 rounded-xl border border-slate-800">
              <div className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-300 font-mono font-bold flex items-center justify-center shrink-0 text-[11px]">
                  1
                </span>
                <p>
                  In Safari, tap the <strong className="text-amber-300">Share</strong> icon <Share className="inline w-3.5 h-3.5 text-amber-300 mx-0.5" /> at the bottom of the screen.
                </p>
              </div>

              <div className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-300 font-mono font-bold flex items-center justify-center shrink-0 text-[11px]">
                  2
                </span>
                <p>
                  Scroll down the menu and tap <strong className="text-amber-300">Add to Home Screen</strong> <PlusSquare className="inline w-3.5 h-3.5 text-amber-300 mx-0.5" />.
                </p>
              </div>

              <div className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono font-bold flex items-center justify-center shrink-0 text-[11px]">
                  3
                </span>
                <p>
                  Tap <strong className="text-emerald-300">Add</strong> in the top-right corner to launch HUMID1 as a full-screen native app.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowIOSGuide(false)}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs transition cursor-pointer"
            >
              Got It
            </button>
          </div>
        </div>
      )}
    </>
  );
};
