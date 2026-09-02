import React from 'react';
import { useAuth } from 'react-oidc-context';
import { thingsboard } from '../services/thingsboard';
import { getSafeHost } from '../utils/url';
import { getEnv } from '../utils/env';
import { ShieldAlert, Loader2, ExternalLink, RefreshCw, ShieldCheck } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const auth = useAuth();
  const currentUser = thingsboard.getCurrentUser();

  const authHost = getSafeHost(getEnv('VITE_AUTHENTIK_URL', ''), 'Authentik SSO');
  const tbHost = getSafeHost(getEnv('VITE_THINGSBOARD_URL', ''), 'ThingsBoard');

  const appTitle = getEnv('VITE_APP_TITLE', 'HUMID1_OS');
  const appDesc =
    getEnv(
      'VITE_APP_DESCRIPTION',
      'Precision industrial climate telemetry and IoT humidor management. Authentik Single Sign-On (2FA) is required to access device controls and telemetry feeds.'
    );

  // Handle initial OIDC client loading state
  if (auth.isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-3 text-slate-400 p-4">
        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
        </div>
        <span className="text-sm font-medium text-slate-300">Verifying {authHost} session...</span>
        <span className="text-xs font-mono text-slate-500">{authHost}</span>
      </div>
    );
  }

  // Handle OIDC error state
  if (auth.error) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900 border border-rose-500/30 rounded-2xl p-6 text-center space-y-4 shadow-2xl">
          <div className="p-3 bg-rose-500/10 text-rose-400 rounded-xl w-fit mx-auto border border-rose-500/20">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Authentication Error</h3>
            <p className="text-xs text-rose-300/80 mt-1 font-mono bg-rose-950/40 p-2.5 rounded-lg border border-rose-500/20 text-left break-words">
              {auth.error.message}
            </p>
          </div>
          <button
            onClick={() => auth.signinRedirect()}
            className="w-full py-2.5 px-3 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Re-authenticate with {authHost}
          </button>
        </div>
      </div>
    );
  }

  // Check if authenticated via Authentik OIDC or active session
  const isAuthenticated = auth.isAuthenticated || currentUser !== null;

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(245,158,11,0.08),rgba(255,255,255,0))]">
        <div className="max-w-md w-full bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-3xl p-7 text-center space-y-5 shadow-2xl shadow-black/80">
          <div className="p-3.5 bg-amber-500/10 text-amber-400 rounded-2xl w-fit mx-auto border border-amber-500/20 shadow-inner">
            <ShieldCheck className="w-8 h-8" />
          </div>

          <div className="space-y-1.5">
            <h2 className="text-lg font-bold text-white tracking-wide flex items-center justify-center gap-2">
              {appTitle}
            </h2>
            <p className="text-xs text-slate-400 leading-relaxed">{appDesc}</p>
          </div>

          <div className="pt-2">
            <button
              onClick={() => auth.signinRedirect()}
              className="w-full py-3 px-4 rounded-xl text-xs font-bold tracking-wide uppercase bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 transition-all shadow-lg shadow-amber-950/50 flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
            >
              <ExternalLink className="w-4 h-4" /> Sign In with {authHost}
            </button>
          </div>

          <div className="pt-2 border-t border-slate-800/60 flex items-center justify-center gap-3 text-[11px] text-slate-500 font-mono">
            <span>{authHost}</span>
            <span>•</span>
            <span>{tbHost}</span>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
