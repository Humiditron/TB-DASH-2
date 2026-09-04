import React, { useState, useEffect } from 'react';
import {
  Bell,
  BellRing,
  BellOff,
  CheckCircle,
  AlertTriangle,
  Flame,
  ShieldCheck,
  Send,
  X,
  Smartphone,
  ExternalLink,
  Layers,
  Sparkles,
} from 'lucide-react';
import {
  pushNotifications,
  NotificationPermissionState,
} from '../services/pushNotifications';

interface PushNotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PushNotificationModal: React.FC<PushNotificationModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [permission, setPermission] = useState<NotificationPermissionState>(
    pushNotifications.getPermission()
  );
  const [testSent, setTestSent] = useState<string | null>(null);

  useEffect(() => {
    return pushNotifications.subscribe((perm) => {
      setPermission((prev) => (prev === perm ? prev : perm));
    });
  }, []);

  if (!isOpen) return null;

  const handleRequestPermission = async () => {
    const result = await pushNotifications.requestPermission();
    setPermission(result);
  };

  const handleSendTest = async (severity: 'CRITICAL' | 'MAJOR' | 'WARNING') => {
    const success = await pushNotifications.sendTestAlert(severity);
    if (success) {
      setTestSent(severity);
      setTimeout(() => setTestSent(null), 3000);
    }
  };

  return (
    <div
      id="push-notifications-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-labelledby="push-modal-title"
    >
      <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <BellRing className="w-5 h-5" />
            </div>
            <div>
              <h3 id="push-modal-title" className="font-bold text-slate-100 text-base font-display">
                Push Notifications &amp; Mobile TWA
              </h3>
              <p className="text-xs text-slate-400">Web Push API, Background Service Worker &amp; Asset Links</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Permission Status Banner */}
          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold font-mono text-slate-400 uppercase tracking-wider">
                  Browser Push Status
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wide border ${
                    permission === 'granted'
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                      : permission === 'denied'
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                      : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                  }`}
                >
                  {permission}
                </span>
              </div>
              <p className="text-xs text-slate-300">
                {permission === 'granted'
                  ? 'Real-time humidor climate alerts and battery warnings will be pushed to your desktop / lock screen.'
                  : permission === 'denied'
                  ? 'Notifications are blocked in your browser settings. Enable them in site permissions to receive alerts.'
                  : 'Grant notification permission to receive instant push alerts when climate bounds are breached.'}
              </p>
            </div>

            {permission !== 'granted' && permission !== 'unsupported' && (
              <button
                id="grant-push-permission-btn"
                onClick={handleRequestPermission}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-bold transition shrink-0 cursor-pointer shadow-md active:scale-95"
              >
                Enable Notifications
              </button>
            )}
          </div>

          {/* Test Alerts Dispatcher */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-300 font-mono uppercase tracking-wider">
                Simulate &amp; Test Live Push Alerts
              </h4>
              {testSent && (
                <span className="text-[11px] text-emerald-400 font-mono flex items-center gap-1 animate-fadeIn">
                  <CheckCircle className="w-3.5 h-3.5" /> Dispatched {testSent} Alert
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Critical Alert Test */}
              <button
                disabled={permission !== 'granted'}
                onClick={() => handleSendTest('CRITICAL')}
                className="p-3.5 rounded-2xl bg-slate-950 border border-rose-500/30 hover:border-rose-500/60 transition text-left space-y-1.5 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono font-bold text-rose-400">CRITICAL</span>
                  <Send className="w-3.5 h-3.5 text-rose-400 group-hover:translate-x-0.5 transition" />
                </div>
                <div className="text-xs font-bold text-slate-200">Humidity Out of Bounds</div>
                <div className="text-[11px] text-slate-400">Triggers when RH &lt; 65% or &gt; 75%</div>
              </button>

              {/* Major Alert Test */}
              <button
                disabled={permission !== 'granted'}
                onClick={() => handleSendTest('MAJOR')}
                className="p-3.5 rounded-2xl bg-slate-950 border border-amber-500/30 hover:border-amber-500/60 transition text-left space-y-1.5 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono font-bold text-amber-400">MAJOR</span>
                  <Send className="w-3.5 h-3.5 text-amber-400 group-hover:translate-x-0.5 transition" />
                </div>
                <div className="text-xs font-bold text-slate-200">Temperature Ceiling</div>
                <div className="text-[11px] text-slate-400">Triggers when Temp &gt; 75.0°F</div>
              </button>

              {/* Warning Alert Test */}
              <button
                disabled={permission !== 'granted'}
                onClick={() => handleSendTest('WARNING')}
                className="p-3.5 rounded-2xl bg-slate-950 border border-sky-500/30 hover:border-sky-500/60 transition text-left space-y-1.5 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono font-bold text-sky-400">WARNING</span>
                  <Send className="w-3.5 h-3.5 text-sky-400 group-hover:translate-x-0.5 transition" />
                </div>
                <div className="text-xs font-bold text-slate-200">Low Battery Level</div>
                <div className="text-[11px] text-slate-400">Triggers when battery &lt; 20%</div>
              </button>
            </div>
          </div>

          {/* Android TWA & Digital Asset Links Spec */}
          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-300 uppercase tracking-wider font-mono">
              <Smartphone className="w-4 h-4 text-emerald-400" />
              <span>Android TWA &amp; Digital Asset Links</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono text-slate-300">
              <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-slate-500 block text-[10px]">Package ID</span>
                <span className="text-emerald-300 font-bold">com.humid1.app</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-slate-500 block text-[10px]">TWA Asset Verification</span>
                <span className="text-sky-300 font-bold">/.well-known/assetlinks.json</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-slate-500 block text-[10px]">PWA Manifest</span>
                <span className="text-amber-300 font-bold">manifest.webmanifest</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-slate-500 block text-[10px]">Service Worker</span>
                <span className="text-purple-300 font-bold">Workbox v7 Precache &amp; Auto-Update</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/70 flex items-center justify-between">
          <span className="text-[11px] text-slate-500 font-mono">
            Vite PWA + Workbox + Web Push API
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
