import React, { useState, useEffect } from 'react';
import { useAuth } from 'react-oidc-context';
import { thingsboard, UserProfile } from '../services/thingsboard';
import { getResolvedOidcParams } from '../services/oidcConfig';
import { getThingsBoardOAuth2Url } from '../config/env';
import { isAuthentikOidcToken } from '../utils/authTokens';
import { 
  ShieldCheck, 
  LogIn, 
  AlertCircle, 
  Key, 
  Settings, 
  CheckCircle2, 
  Loader2, 
  ExternalLink, 
  Radio, 
  Eye,
  EyeOff,
  Terminal,
  HelpCircle,
  Play
} from 'lucide-react';
import { AuthModal } from './AuthModal';
import { ApiInspectorModal } from './ApiInspectorModal';
import { apiLogger } from '../services/apiLogger';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const auth = useAuth();
  const [activeToken, setActiveToken] = useState<string | null>(thingsboard.getAuthToken());
  const [userProfile, setUserProfile] = useState<UserProfile | null>(thingsboard.getCurrentUser());
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showDirectLogin, setShowDirectLogin] = useState(false);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [diagnosticsTab, setDiagnosticsTab] = useState<'logs' | 'token' | 'guide'>('logs');
  const [txCount, setTxCount] = useState(0);

  // Direct login form state
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [directTokenInput, setDirectTokenInput] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  const oidcParams = getResolvedOidcParams();

  // Track transaction count for live indicator
  useEffect(() => {
    const unsub = apiLogger.subscribe((txs) => setTxCount(txs.length));
    return unsub;
  }, []);

  // Check on load if native ThingsBoard token exists or was returned in URL
  useEffect(() => {
    const discovered = thingsboard.findAutomaticJwt();
    if (discovered) {
      setActiveToken(discovered);
    }
  }, []);

  // Synchronize Authentik OIDC profile without injecting external token into ThingsBoard
  useEffect(() => {
    if (auth.isAuthenticated && auth.user?.profile) {
      setUserProfile({
        id: (auth.user.profile.sub as string) || 'oidc-user',
        name: auth.user.profile.name || auth.user.profile.preferred_username || auth.user.profile.email || 'Humid1 User',
        email: auth.user.profile.email || 'user@humid1.com',
        role: 'Authenticated User',
      });
    }
  }, [auth.isAuthenticated, auth.user]);

  // Subscribe to Thingsboard internal auth changes
  useEffect(() => {
    const unsub = thingsboard.subscribeAuth((profile, token) => {
      setUserProfile(profile);
      setActiveToken(token);
    });
    return unsub;
  }, []);

  const openDiagnosticsModal = (tab: 'logs' | 'token' | 'guide' = 'logs') => {
    setDiagnosticsTab(tab);
    setShowDiagnostics(true);
  };

  const handleThingsBoardSsoLogin = () => {
    setLoginError(null);
    try {
      const targetUrl = getThingsBoardOAuth2Url();
      console.info('[ThingsBoard SSO] Initiating ThingsBoard OAuth2 redirect to:', targetUrl);
      window.location.href = targetUrl;
    } catch (err: any) {
      setLoginError(`ThingsBoard SSO Initiation failed: ${err?.message || 'Check configuration'}`);
    }
  };

  const handleAuthentikLogin = () => {
    setLoginError(null);
    try {
      auth.signinRedirect();
    } catch (err: any) {
      console.warn('Redirect failed, attempting popup:', err);
      auth.signinPopup().catch((popupErr) => {
        setLoginError(`SSO Initiation failed: ${popupErr?.message || err?.message || 'Check Authentik OIDC configuration'}`);
      });
    }
  };

  const handleCredentialsLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setLoginError('Please provide both username and password.');
      return;
    }

    setLoginLoading(true);
    setLoginError(null);

    const config = thingsboard.getConfig();
    const serverUrl = config.serverUrl || 'https://app.humid1.com';

    // Direct login probe with full logging
    const res = await apiLogger.testLoginDirect(serverUrl, username.trim(), password);
    setLoginLoading(false);

    if (res.success && res.data?.token) {
      await thingsboard.setAuthSession(res.data.token, undefined, res.data.refreshToken);
    } else {
      const isAutoProvisionedHint =
        res.status === 401
          ? ' Note: Accounts auto-provisioned via Authentik SSO do not have a local ThingsBoard password. Use "Token Finder & Quick Bridge" to grab your active ThingsBoard token in 5 seconds.'
          : '';
      setLoginError(
        `Login failed (${res.status}): ${res.error || 'Invalid credentials.'}${isAutoProvisionedHint}`
      );
    }
  };

  const handleDirectTokenSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = directTokenInput.trim();
    if (!clean) {
      setLoginError('Please enter a valid JWT token string.');
      return;
    }
    if (isAuthentikOidcToken(clean)) {
      setLoginError(
        '⚠️ Detected Authentik OIDC token (issued by auth.humid1.com). ThingsBoard API rejects external OIDC tokens with 401 Unauthorized. Open "Token Finder" to get your valid ThingsBoard token.'
      );
      return;
    }
    thingsboard.setAuthSession(clean);
  };

  const isUserAuthenticated = Boolean(auth.isAuthenticated || activeToken);

  // Show loading during initial OIDC session check
  if (auth.isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-slate-100 font-sans">
        <div className="flex flex-col items-center max-w-sm text-center space-y-4">
          <div className="relative">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center shadow-lg shadow-amber-500/10">
              <Radio className="w-7 h-7 text-amber-400 animate-pulse" />
            </div>
            <Loader2 className="w-5 h-5 text-amber-400 animate-spin absolute -top-1 -right-1" />
          </div>
          <h2 className="text-lg font-bold text-white tracking-wide">
            HUMID1<span className="text-amber-400">_OS</span>
          </h2>
          <p className="text-xs text-slate-400 font-mono">
            Verifying Authentik SSO & ThingsBoard credentials...
          </p>
        </div>
      </div>
    );
  }

  // If authenticated, render children
  if (isUserAuthenticated) {
    return <>{children}</>;
  }

  // Otherwise, render the polished authentication gate
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 selection:bg-amber-500/30 selection:text-amber-200 relative">
      {/* Top Floating Diagnostics Bar */}
      <div className="absolute top-4 right-4 flex items-center gap-2 z-20">
        <button
          onClick={() => openDiagnosticsModal('logs')}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white text-xs font-mono transition shadow-lg cursor-pointer"
          title="Open API Inspector & Diagnostics"
        >
          <Terminal className="w-4 h-4 text-amber-400" />
          <span className="hidden sm:inline">Diagnostics & Logs</span>
          <span className="px-1.5 py-0.2 rounded-full bg-slate-800 text-[10px] text-amber-300 border border-slate-700">
            {txCount}
          </span>
        </button>

        <button
          onClick={() => openDiagnosticsModal('guide')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-bold transition shadow-lg cursor-pointer"
          title="Find your ThingsBoard token"
        >
          <HelpCircle className="w-4 h-4" />
          <span className="hidden sm:inline">Token Finder</span>
        </button>

        <button
          onClick={() => setShowConfigModal(true)}
          className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800 bg-slate-900 transition-colors cursor-pointer"
          title="Configure Server & Auth URLs"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>

      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-7 shadow-2xl shadow-black/80 relative">
        {/* Top Header & Logo */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-600/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-md shadow-amber-500/10">
              <Radio className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-extrabold tracking-tight text-white flex items-center gap-1.5">
                HUMID1<span className="text-amber-400">_OS</span>
              </h1>
              <p className="text-[11px] font-mono text-slate-400">
                Precision Humidor Telemetry Stack
              </p>
            </div>
          </div>
        </div>

        {/* Primary Alert / Error Feedback */}
        {auth.error && (
          <div className="mb-5 p-3.5 rounded-2xl bg-rose-950/70 border border-rose-500/30 text-rose-200 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1 space-y-1">
              <div className="font-bold text-rose-300">Authentik OIDC Error:</div>
              <div className="font-mono text-[11px] leading-relaxed text-rose-200/90">{auth.error.message}</div>
            </div>
          </div>
        )}

        {loginError && (
          <div className="mb-5 p-3.5 rounded-2xl bg-rose-950/70 border border-rose-500/30 text-rose-200 text-xs flex flex-col gap-2">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="flex-1 font-mono text-[11px] leading-relaxed text-rose-200/90">{loginError}</div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-1 border-t border-rose-900/50">
              <button
                type="button"
                onClick={() => openDiagnosticsModal('logs')}
                className="text-[11px] text-amber-300 hover:text-amber-200 underline font-mono flex items-center gap-1 cursor-pointer"
              >
                <Terminal className="w-3 h-3" /> View Request Log
              </button>
              <button
                type="button"
                onClick={() => openDiagnosticsModal('guide')}
                className="text-[11px] text-amber-300 hover:text-amber-200 underline font-mono flex items-center gap-1 cursor-pointer"
              >
                <HelpCircle className="w-3 h-3" /> How to get Token
              </button>
            </div>
          </div>
        )}

        {/* Primary Action: ThingsBoard SSO via OAuth2 */}
        <div className="space-y-3 mb-6">
          <button
            onClick={handleThingsBoardSsoLogin}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-sm shadow-lg shadow-amber-950/40 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2.5 cursor-pointer"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Sign In with ThingsBoard SSO (Authentik)</span>
          </button>

          <div className="flex items-center justify-between px-1 text-[11px] text-slate-400 font-mono">
            <span>Authenticates through ThingsBoard OAuth2</span>
            <button
              type="button"
              onClick={handleAuthentikLogin}
              className="text-amber-400 hover:underline flex items-center gap-1"
              title="Direct Authentik OIDC flow"
            >
              Direct Authentik OIDC <ExternalLink className="w-3 h-3" />
            </button>
          </div>

          {/* OIDC Config Summary Pill */}
          <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-[11px] space-y-1 text-slate-400 font-mono">
            <div className="flex justify-between">
              <span className="text-slate-500">SSO Provider:</span>
              <span className="text-slate-300 font-semibold">{oidcParams.authentikUrl}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">ThingsBoard Gateway:</span>
              <span className="text-amber-400 font-semibold">app.humid1.com/oauth2</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Authentik App:</span>
              <span className="text-slate-300 font-semibold truncate max-w-[200px]" title={oidcParams.appSlug}>
                {oidcParams.appSlug}
              </span>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="relative flex py-2 items-center mb-5">
          <div className="flex-grow border-t border-slate-800"></div>
          <span className="flex-shrink mx-3 text-slate-500 text-[10px] uppercase font-mono tracking-wider">
            Or Alternate Access
          </span>
          <div className="flex-grow border-t border-slate-800"></div>
        </div>

        {/* Direct Thingsboard / Token Dropdown */}
        <div>
          <button
            onClick={() => setShowDirectLogin(!showDirectLogin)}
            className="w-full text-center text-xs text-slate-400 hover:text-amber-400 font-medium py-1.5 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Key className="w-3.5 h-3.5" />
            <span>{showDirectLogin ? 'Hide Credentials & Token Login' : 'Direct ThingsBoard Login / Token Override'}</span>
          </button>

          {showDirectLogin && (
            <div className="mt-4 p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-4 animate-fadeIn">
              {/* Username/Password Form */}
              <form onSubmit={handleCredentialsLogin} className="space-y-3">
                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-1">
                    Username / Customer Email
                  </label>
                  <input
                    type="text"
                    placeholder="customer@example.com"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-1">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 pr-9 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loginLoading}
                  className="w-full py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {loginLoading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Authenticating...</span>
                    </>
                  ) : (
                    <>
                      <LogIn className="w-3.5 h-3.5" />
                      <span>Log In via ThingsBoard REST</span>
                    </>
                  )}
                </button>
              </form>

              {/* Or Token Input */}
              <div className="pt-3 border-t border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-400">
                    Paste Raw ThingsBoard JWT
                  </label>
                  <button
                    type="button"
                    onClick={() => openDiagnosticsModal('guide')}
                    className="text-[10px] text-amber-400 hover:text-amber-300 underline font-mono flex items-center gap-0.5 cursor-pointer"
                  >
                    How to find?
                  </button>
                </div>
                <form onSubmit={handleDirectTokenSubmit} className="flex gap-2">
                  <input
                    type="password"
                    placeholder="eyJhbGciOi..."
                    value={directTokenInput}
                    onChange={(e) => setDirectTokenInput(e.target.value)}
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-100 font-mono placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  />
                  <button
                    type="submit"
                    className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-slate-950 text-xs font-bold cursor-pointer"
                  >
                    Apply
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>

      <AuthModal
        isOpen={showConfigModal}
        onClose={() => setShowConfigModal(false)}
      />

      <ApiInspectorModal
        isOpen={showDiagnostics}
        onClose={() => setShowDiagnostics(false)}
        initialTab={diagnosticsTab}
      />
    </div>
  );
};
