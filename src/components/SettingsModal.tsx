import React, { useState } from 'react';
import { ThingsBoardConfig } from '../types';
import { X, Server, ShieldCheck, Check, Globe, AlertCircle, Fingerprint } from 'lucide-react';
import { getAuthentikSlug, setAuthentikSlug, APP_CONFIG } from '../config/env';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: ThingsBoardConfig;
  onSaveConfig: (newConfig: Partial<ThingsBoardConfig>) => void;
  onLogin: (user: string, pass: string) => Promise<boolean>;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  config,
  onSaveConfig,
  onLogin,
}) => {
  const [serverUrl, setServerUrl] = useState(config.serverUrl);
  const [authentikSlug, setAuthentikSlugInput] = useState(getAuthentikSlug());
  const [username, setUsername] = useState(config.username || '');
  const [password, setPassword] = useState(config.password || '');
  const [isConnecting, setIsConnecting] = useState(false);
  const [statusFeedback, setStatusFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  if (!isOpen) return null;

  const handleSaveAndConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsConnecting(true);
    setStatusFeedback(null);

    setAuthentikSlug(authentikSlug.trim() || 'humid1-dash');

    onSaveConfig({
      serverUrl,
      username,
    });

    if (username && password) {
      const success = await onLogin(username, password);
      setIsConnecting(false);
      if (success) {
        setStatusFeedback({ type: 'success', text: 'Connected and authenticated with ThingsBoard instance!' });
        setTimeout(() => onClose(), 1200);
      } else {
        setStatusFeedback({
          type: 'error',
          text: 'Authentication failed. Please verify your ThingsBoard host URL & credentials.',
        });
      }
    } else {
      setIsConnecting(false);
      setStatusFeedback({ type: 'success', text: 'SSO provider & host configuration saved.' });
      setTimeout(() => onClose(), 800);
    }
  };

  return (
    <div id="modal-settings" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-5 animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-100 text-base">SSO & ThingsBoard Connection</h3>
              <p className="text-xs text-slate-400">Configure Authentik provider slug and REST API endpoints</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feedback message */}
        {statusFeedback && (
          <div
            className={`p-3 rounded-lg text-xs font-semibold flex items-center gap-2 ${
              statusFeedback.type === 'success'
                ? 'bg-emerald-950/60 border border-emerald-800 text-emerald-300'
                : 'bg-rose-950/60 border border-rose-800 text-rose-300'
            }`}
          >
            {statusFeedback.type === 'success' ? (
              <Check className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{statusFeedback.text}</span>
          </div>
        )}

        <form onSubmit={handleSaveAndConnect} className="space-y-4">
          {/* Authentik Provider Slug */}
          <div>
            <label htmlFor="input-authentik-slug" className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
              Authentik Application Provider Slug
            </label>
            <div className="relative">
              <input
                id="input-authentik-slug"
                type="text"
                value={authentikSlug}
                onChange={(e) => setAuthentikSlugInput(e.target.value)}
                placeholder="humid1-dash"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 font-mono"
              />
              <Fingerprint className="w-4 h-4 text-slate-500 absolute right-3 top-3" />
            </div>
            <span className="text-[11px] text-slate-400 mt-1 block">
              Routes to <code className="text-amber-400 font-mono">{APP_CONFIG.domains.authentikUrl}/application/o/{authentikSlug || 'humid1-dash'}/</code> and returns to this dashboard.
            </span>
          </div>

          {/* ThingsBoard URL */}
          <div>
            <label htmlFor="input-server-url" className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
              ThingsBoard Server Host URL
            </label>
            <div className="relative">
              <input
                id="input-server-url"
                type="url"
                value={serverUrl}
                onChange={(e) => setServerUrl(e.target.value)}
                placeholder="https://app.humid1.com"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 font-mono"
              />
              <Globe className="w-4 h-4 text-slate-500 absolute right-3 top-3" />
            </div>
            <span className="text-[11px] text-slate-400 mt-1 block">
              ThingsBoard CE backend instance (e.g. {APP_CONFIG.domains.thingsboardUrl})
            </span>
          </div>

          {/* Login Credentials */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="input-tb-user" className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Username / Email
              </label>
              <input
                id="input-tb-user"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="customer@humid1.com"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label htmlFor="input-tb-pass" className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <input
                id="input-tb-pass"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 font-mono"
              />
            </div>
          </div>

          {/* Buttons */}
          <div className="pt-3 flex items-center justify-end gap-2.5 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition cursor-pointer"
            >
              Close
            </button>

            <button
              id="btn-save-settings"
              type="submit"
              disabled={isConnecting}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-bold transition shadow-lg shadow-amber-900/30 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {isConnecting ? (
                <span>Validating...</span>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Save & Authenticate</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

