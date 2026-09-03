import React, { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle, ShieldAlert, Sparkles, X, ChevronRight, Bug } from 'lucide-react';
import { APP_CONFIG } from '../config/env';

interface DevelopmentWarningModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const STORAGE_KEY_DEV_DISMISSED = 'humid1_dev_warning_dismissed';

export const DevelopmentWarningModal: React.FC<DevelopmentWarningModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [dontShowAgain, setDontShowAgain] = useState(false);

  if (!isOpen) return null;

  const handleDismiss = () => {
    if (dontShowAgain) {
      try {
        localStorage.setItem(STORAGE_KEY_DEV_DISMISSED, 'true');
      } catch {
        // ignore
      }
    }
    onClose();
  };

  return (
    <div
      id="dev-warning-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-labelledby="dev-warning-title"
    >
      <div className="bg-slate-900 border border-amber-500/40 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden text-slate-100 animate-scaleIn">
        {/* Banner Top Accent */}
        <div className="bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600 h-2 w-full" />

        <div className="p-6 sm:p-7 space-y-5">
          {/* Icon & Title */}
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 shrink-0">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Pre-Release Build {APP_CONFIG.version}
                </span>
              </div>
              <h2 id="dev-warning-title" className="text-lg font-bold text-slate-100 font-display">
                Dashboard Under Active Development
              </h2>
            </div>
          </div>

          {/* Description & Notice */}
          <div className="space-y-3 text-xs leading-relaxed text-slate-300 bg-slate-950/70 p-4 rounded-2xl border border-slate-800">
            <p className="text-slate-200">
              Welcome to <strong>HUMID1_OS Telemetry Dashboard</strong> (<code className="font-mono text-amber-400">dash.humid1.com</code>).
            </p>
            <p className="text-slate-400">
              Please note that this dashboard is in active development and testing. Features, telemetry feeds, and SSO authentication flows are being refined and may experience intermittent quirks or bugs as live hardware testing continues.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-slate-800/80 text-[11px] font-mono">
              <div className="flex items-center gap-1.5 text-amber-300/90">
                <Bug className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>Active Bug Squash Phase</span>
              </div>
              <div className="flex items-center gap-1.5 text-emerald-300/90">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Live Telemetry Active</span>
              </div>
            </div>
          </div>

          {/* Checkbox: Don't show again */}
          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center gap-2.5 text-xs text-slate-400 hover:text-slate-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={dontShowAgain}
                onChange={(e) => setDontShowAgain(e.target.checked)}
                className="w-4 h-4 rounded border-slate-700 bg-slate-950 text-amber-500 focus:ring-amber-500/40 focus:ring-offset-0 transition cursor-pointer"
              />
              <span>Don't show this notice again on this device</span>
            </label>
          </div>

          {/* Action Button */}
          <div className="pt-2">
            <button
              id="dismiss-dev-warning-btn"
              type="button"
              onClick={handleDismiss}
              className="w-full py-3 px-5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs tracking-wide transition-all shadow-lg shadow-amber-950/40 flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
            >
              <span>I Understand &amp; Continue</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
