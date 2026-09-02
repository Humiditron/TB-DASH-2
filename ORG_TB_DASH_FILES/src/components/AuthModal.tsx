import React from 'react';
import { useAuth } from 'react-oidc-context';
import { thingsboard } from '../services/thingsboard';
import { getSafeHost } from '../utils/url';
import { getEnv } from '../utils/env';
import { ShieldCheck, LogOut, ExternalLink, X } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const auth = useAuth();
  const currentUser = thingsboard.getCurrentUser();
  const isAuth = auth.isAuthenticated || !!currentUser;
  const username =
    (auth.user?.profile?.preferred_username as string) ||
    auth.user?.profile?.name ||
    auth.user?.profile?.email ||
    currentUser?.email ||
    'Authenticated User';

  const authHost = getSafeHost(getEnv('VITE_AUTHENTIK_URL', ''), 'Authentik SSO');
  const appTitle = getEnv('VITE_APP_TITLE', 'HUMID1_OS');

  if (!isOpen) return null;

  const handleLogout = () => {
    try {
      auth.removeUser();
      auth.signoutRedirect();
    } catch {
      thingsboard.setAuthSession(null);
    }
    onClose();
  };

  const handleSSOLogin = () => {
    auth.signinRedirect();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-6 shadow-2xl shadow-black/80 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Single Sign-On</h3>
            <p className="text-xs text-slate-400 font-mono">{authHost}</p>
          </div>
        </div>

        {isAuth ? (
          <div className="space-y-4">
            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Status</span>
                <span className="text-emerald-400 font-semibold flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span> Authenticated
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Identity</span>
                <span className="text-white font-mono font-medium">{username}</span>
              </div>
              {auth.user?.profile?.email && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Email</span>
                  <span className="text-slate-300 font-mono">{auth.user.profile.email}</span>
                </div>
              )}
            </div>

            <button
              onClick={handleLogout}
              className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-rose-300 bg-rose-950/60 hover:bg-rose-900/80 border border-rose-500/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <LogOut className="w-4 h-4" /> Sign Out
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-xs text-slate-300 leading-relaxed">
              {appTitle} uses Single Sign-On (SSO) for secure telemetry access.
            </p>

            <button
              onClick={handleSSOLogin}
              className="w-full py-3 px-4 rounded-xl text-xs font-bold tracking-wide uppercase bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 transition-all shadow-lg shadow-amber-950/50 flex items-center justify-center gap-2 cursor-pointer"
            >
              <ExternalLink className="w-4 h-4" /> Sign In with {authHost}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
