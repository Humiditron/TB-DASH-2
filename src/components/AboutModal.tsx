import React, { useState } from 'react';
import {
  Info,
  X,
  Flame,
  Shield,
  Code2,
  Calendar,
  UserCheck,
  Sparkles,
  ExternalLink,
  Layers,
  Database,
  Cpu,
  Check,
  Copy,
} from 'lucide-react';
import { APP_CONFIG } from '../config/env';
import { getEnv } from '../utils/env';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenDevWarning?: () => void;
}

export const AboutModal: React.FC<AboutModalProps> = ({
  isOpen,
  onClose,
  onOpenDevWarning,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const version = APP_CONFIG.version;
  const buildDate = getEnv('VITE_BUILD_DATE', 'September 2026 (Continuous Build)');
  const authors = 'HUMID1 Engineering Team';
  const contributors = [
    'HUMID1 Core Developers',
    'Google DeepMind Antigravity AI Coding Assistant',
  ];
  const copyright = `© ${new Date().getFullYear()} HUMID1 Systems LLC. All rights reserved.`;
  const license = 'MIT License';
  const dataRetention = '7 Days (604,800 seconds)';

  const aboutJson = {
    appName: 'HUMID1_OS Telemetry Dashboard',
    version,
    buildDate,
    authors,
    contributors,
    copyright,
    license,
    dataRetentionPolicy: dataRetention,
    environment: {
      dashboardDomain: APP_CONFIG.domains.dashboardUrl,
      thingsboardUrl: APP_CONFIG.domains.thingsboardUrl,
      authentikUrl: APP_CONFIG.domains.authentikUrl,
    },
  };

  const handleCopySpecs = () => {
    navigator.clipboard.writeText(JSON.stringify(aboutJson, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      id="about-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-labelledby="about-modal-title"
    >
      <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <h3 id="about-modal-title" className="font-bold text-slate-100 text-base font-display">
                About HUMID1_OS Dashboard
              </h3>
              <p className="text-xs text-slate-400">Precision IoT Telemetry &amp; Climate Control Architecture</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopySpecs}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition flex items-center gap-1.5 text-xs font-mono cursor-pointer"
              title="Copy System Specs JSON"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              <span className="hidden sm:inline">{copied ? 'Copied' : 'Copy Specs'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Main Hero Card */}
          <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-slate-100 font-display">HUMID1_OS</span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  v{version}
                </span>
              </div>
              <p className="text-xs text-slate-400 max-w-md leading-relaxed">
                Industrial-grade real-time humidor climate telemetry, ESP32 hardware device management, dual-sensor differential analytics, and ThingsBoard IoT command center.
              </p>
            </div>

            {onOpenDevWarning && (
              <button
                onClick={() => {
                  onClose();
                  onOpenDevWarning();
                }}
                className="px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-semibold transition shrink-0 cursor-pointer"
              >
                Development Status
              </button>
            )}
          </div>

          {/* Key Metadata Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Version & Build */}
            <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80 space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-300 font-mono">
                <Calendar className="w-4 h-4 text-amber-400" />
                <span>Build &amp; Release</span>
              </div>
              <div className="text-xs text-slate-200 font-mono">
                Version: <span className="text-amber-300 font-bold">{version}</span>
              </div>
              <div className="text-xs text-slate-400 font-mono">
                Build Date: <span className="text-slate-300">{buildDate}</span>
              </div>
            </div>

            {/* License & Copyright */}
            <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80 space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-300 font-mono">
                <Shield className="w-4 h-4 text-emerald-400" />
                <span>Legal &amp; Licensing</span>
              </div>
              <div className="text-xs text-slate-200 font-mono">
                License: <span className="text-emerald-300 font-bold">{license}</span>
              </div>
              <div className="text-xs text-slate-400 font-mono">{copyright}</div>
            </div>

            {/* Authors */}
            <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80 space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-300 font-mono">
                <UserCheck className="w-4 h-4 text-sky-400" />
                <span>Authors</span>
              </div>
              <div className="text-xs text-slate-200 font-medium">{authors}</div>
              <div className="text-[11px] text-slate-400">HUMID1 Systems &amp; Embedded Firmware Group</div>
            </div>

            {/* Contributors */}
            <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80 space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-300 font-mono">
                <Sparkles className="w-4 h-4 text-purple-400" />
                <span>Contributors</span>
              </div>
              <ul className="text-xs text-slate-200 space-y-1">
                {contributors.map((c, idx) => (
                  <li key={idx} className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                    <span>{c}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Architecture & Infrastructure Specs */}
          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-300 uppercase tracking-wider font-mono">
              <Layers className="w-4 h-4 text-amber-400" />
              <span>Stack &amp; Telemetry Architecture</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono text-slate-300">
              <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-slate-500 block text-[10px]">Data Retention TTL</span>
                <span className="text-amber-300 font-bold">{dataRetention}</span>
                <span className="text-[10px] text-slate-500 block">SQL_DATA_RETENTION_TTL=604800</span>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-slate-500 block text-[10px]">IoT Core Platform</span>
                <span className="text-emerald-300 font-bold">ThingsBoard CE REST &amp; WSS</span>
                <span className="text-[10px] text-slate-500 block truncate">{APP_CONFIG.domains.thingsboardUrl}</span>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-slate-500 block text-[10px]">Identity &amp; Auth</span>
                <span className="text-sky-300 font-bold">Authentik OIDC (PKCE) + Native JWT</span>
                <span className="text-[10px] text-slate-500 block truncate">{APP_CONFIG.domains.authentikUrl}</span>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-slate-500 block text-[10px]">Frontend Stack</span>
                <span className="text-purple-300 font-bold">React 18 + Vite + Tailwind CSS</span>
                <span className="text-[10px] text-slate-500 block">Docker Multi-stage runtime</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer with Close Button */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/70 flex items-center justify-between">
          <span className="text-[11px] text-slate-500 font-mono">
            {APP_CONFIG.domains.dashboardUrl}
          </span>
          <button
            id="close-about-modal-btn"
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
