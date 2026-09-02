import React, { useState } from 'react';
import { X, ShieldCheck, RefreshCw, KeyRound, Copy, Check, Terminal, ExternalLink } from 'lucide-react';
import { AuthentikUser } from '../types';
import { tbClient } from '../services/tbClient';

interface TokenInspectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: AuthentikUser | null;
  onLogout: () => void;
}

export const TokenInspectorModal: React.FC<TokenInspectorModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onLogout,
}) => {
  const [copied, setCopied] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshNotice, setRefreshNotice] = useState<string | null>(null);

  if (!isOpen) return null;

  const token = tbClient.getToken();
  const refreshToken = tbClient.getRefreshToken();
  const decodedPayload = tbClient.decodeJwtPayload(token || undefined);

  const handleCopyToken = () => {
    if (!token) return;
    navigator.clipboard.writeText(token);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSilentRefresh = async () => {
    setIsRefreshing(true);
    setRefreshNotice(null);
    const ok = await tbClient.trySilentTokenRefresh();
    setIsRefreshing(false);
    if (ok) {
      setRefreshNotice('JWT token silently refreshed successfully via POST /api/auth/token/refresh');
    } else {
      setRefreshNotice('Silent refresh not applicable or simulated mode active.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-xl p-6 shadow-2xl space-y-5 animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-100 text-base">Authentik SSO & Token Session</h3>
              <p className="text-xs text-slate-400">Active ThingsBoard JWT & Claims Inspection</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User Info Details */}
        <div className="grid grid-cols-2 gap-3 text-xs bg-slate-950 p-4 rounded-2xl border border-slate-800 font-mono">
          <div>
            <span className="text-slate-400 text-[10px] block">AUTHENTICATED IDENTITY</span>
            <span className="text-slate-200 font-bold">{currentUser?.name || currentUser?.email}</span>
          </div>
          <div>
            <span className="text-slate-400 text-[10px] block">SECURITY AUTHORITY</span>
            <span className="text-amber-400 font-bold">{currentUser?.authority || 'CUSTOMER_USER'}</span>
          </div>
          <div>
            <span className="text-slate-400 text-[10px] block">CUSTOMER UUID</span>
            <span className="text-slate-300 truncate block">{currentUser?.customerId || 'N/A'}</span>
          </div>
          <div>
            <span className="text-slate-400 text-[10px] block">SESSION TYPE</span>
            <span className="text-emerald-400 font-bold">
              Live Authenticated ThingsBoard JWT
            </span>
          </div>
        </div>

        {/* Decoded JWT Payload */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <Terminal className="w-4 h-4 text-amber-400" />
              <span>Decoded JWT Claims</span>
            </span>
            <button
              onClick={handleCopyToken}
              className="text-[11px] text-amber-400 hover:text-amber-300 transition flex items-center gap-1 cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied Token' : 'Copy Raw JWT'}</span>
            </button>
          </div>

          <pre className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-[11px] font-mono text-slate-300 max-h-48 overflow-auto">
            {decodedPayload ? JSON.stringify(decodedPayload, null, 2) : 'Token payload simulated or not in JWT format.'}
          </pre>
        </div>

        {/* Refresh Notice */}
        {refreshNotice && (
          <div className="p-3 rounded-xl bg-slate-950 border border-amber-500/30 text-amber-300 text-xs font-mono">
            {refreshNotice}
          </div>
        )}

        {/* Actions Footer */}
        <div className="pt-2 flex items-center justify-between border-t border-slate-800">
          <button
            type="button"
            onClick={handleSilentRefresh}
            disabled={isRefreshing}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Test Silent Token Refresh</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onLogout();
              onClose();
            }}
            className="px-4 py-2 rounded-xl bg-rose-950/60 border border-rose-800/80 text-rose-300 hover:bg-rose-900/60 text-xs font-semibold transition cursor-pointer"
          >
            Log Out Current User
          </button>
        </div>
      </div>
    </div>
  );
};
