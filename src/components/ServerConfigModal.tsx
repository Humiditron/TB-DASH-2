import React, { useState } from 'react';
import { thingsboard } from '../services/thingsboard';
import { Settings, X, Server, CheckCircle2, Zap, Key } from 'lucide-react';

interface ServerConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ServerConfigModal: React.FC<ServerConfigModalProps> = ({
  isOpen,
  onClose,
}) => {
  const currentConfig = thingsboard.getConfig();
  const [serverUrl, setServerUrl] = useState(currentConfig.serverUrl);
  const [authentikUrl, setAuthentikUrl] = useState(currentConfig.authentikUrl || '');
  const [thingsboardToken, setThingsboardToken] = useState(currentConfig.thingsboardToken || '');
  const [savedSuccess, setSavedSuccess] = useState(false);
  const activeToken = thingsboard.getEffectiveToken();
  const currentUser = thingsboard.getCurrentUser();

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    thingsboard.saveConfig({
      serverUrl: serverUrl.trim(),
      authentikUrl: authentikUrl.trim(),
      thingsboardToken: thingsboardToken.trim(),
    });
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl shadow-black/80 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Settings className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Platform & Gateway Configuration</h3>
            <p className="text-xs text-slate-400">Manage runtime service endpoints & SSO authentication</p>
          </div>
        </div>

        {savedSuccess && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Configuration saved successfully!</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
              ThingsBoard Server Host URL
            </label>
            <div className="relative">
              <input
                type="text"
                value={serverUrl}
                onChange={(e) => setServerUrl(e.target.value)}
                placeholder="https://app.humid1.com"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 pl-10 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 font-mono text-xs"
              />
              <Server className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            </div>
            <span className="text-[11px] text-slate-500 mt-1 block">
              ThingsBoard IoT engine REST & WebSocket endpoint.
            </span>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
              ThingsBoard API Access Token (Optional JWT Override)
            </label>
            <div className="relative">
              <input
                type="password"
                value={thingsboardToken}
                onChange={(e) => setThingsboardToken(e.target.value)}
                placeholder="Paste ThingsBoard JWT token if overriding SSO session"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 pl-10 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 font-mono text-xs"
              />
              <Key className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            </div>
            <span className="text-[11px] text-slate-500 mt-1 block">
              Leave blank to auto-use your active Authentik SSO token.
            </span>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
              Authentik SSO / IdP Host URL
            </label>
            <div className="relative">
              <input
                type="text"
                value={authentikUrl}
                onChange={(e) => setAuthentikUrl(e.target.value)}
                placeholder="https://auth.humid1.com"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 pl-10 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 font-mono text-xs"
              />
              <Server className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            </div>
            <span className="text-[11px] text-slate-500 mt-1 block">
              Authentik identity provider portal address (for 2FA and user authentication).
            </span>
          </div>

          {/* Automatic JWT SSO Status Card */}
          <div className="p-3.5 bg-slate-950/80 border border-slate-800 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-bold text-slate-200">JWT Session Token</span>
              </div>
              {activeToken ? (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-950/80 text-emerald-300 border border-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  Active & Synced
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-950/80 text-amber-300 border border-amber-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                  Acquiring from SSO...
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              JWT Bearer tokens are automatically passed via <code className="text-amber-300 font-mono">X-Authorization</code> headers using the <code className="text-amber-300 font-mono">/src/client</code> OpenAPI client for device claiming and telemetry.
            </p>
            {currentUser && (
              <div className="pt-1 text-[11px] text-slate-500 font-mono flex items-center justify-between border-t border-slate-900">
                <span>Identity: {currentUser.email}</span>
                <span>Role: {currentUser.authority || 'CUSTOMER_USER'}</span>
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-500 text-slate-950 transition-all shadow-md shadow-amber-950/40 cursor-pointer"
            >
              Save Settings
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
