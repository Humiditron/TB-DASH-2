import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  KeyRound,
  Server,
  Lock,
  ArrowRight,
  AlertCircle,
  Globe,
  ExternalLink,
  Layers,
  Terminal,
  MessageSquare,
  CheckCircle2,
  Settings2,
  ChevronDown,
  Check,
} from 'lucide-react';
import { AuthentikUser, OAuth2ClientOption } from '../types';
import { tbClient } from '../services/tbClient';
import {
  APP_CONFIG,
  getAuthentikSlug,
  setAuthentikSlug as saveAuthentikSlug,
  getAuthentikAppLoginUrl,
  getAuthentikOidcAuthorizeUrl,
  getThingsBoardOAuth2Url,
  getCurrentReturnUrl,
} from '../config/env';
import { EcosystemModal } from './EcosystemModal';
import { ApiInspectorModal } from './ApiInspectorModal';
import { isAuthentikOidcToken } from '../utils/authTokens';

interface AuthScreenProps {
  onAuthenticated: (user: AuthentikUser) => void;
  serverUrl: string;
  onUpdateServerUrl: (url: string) => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({
  onAuthenticated,
  serverUrl,
  onUpdateServerUrl,
}) => {
  const [activeMode, setActiveMode] = useState<'sso' | 'credentials' | 'config'>('sso');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [tempServerUrl, setTempServerUrl] = useState(serverUrl);
  const [authentikSlug, setAuthentikSlugState] = useState(getAuthentikSlug());
  const [isEditingSlug, setIsEditingSlug] = useState(false);
  const [tempSlug, setTempSlug] = useState(getAuthentikSlug());
  const [isLoading, setIsLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('Authenticating...');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [oauthClients, setOauthClients] = useState<OAuth2ClientOption[]>([]);
  const [directTokenInput, setDirectTokenInput] = useState('');
  const [showDirectToken, setShowDirectToken] = useState(false);
  const [showAdvancedSso, setShowAdvancedSso] = useState(false);
  const [isEcosystemOpen, setIsEcosystemOpen] = useState(false);
  const [isDiagnosticsOpen, setIsDiagnosticsOpen] = useState(false);
  const [diagnosticsTab, setDiagnosticsTab] = useState<'logs' | 'token' | 'guide'>('logs');

  useEffect(() => {
    // 1. Immediately check if URL contains SSO token callback
    const callbackUser = tbClient.checkForSSOCallback();
    if (callbackUser) {
      onAuthenticated(callbackUser);
      return;
    }

    // 2. Check if user already authenticated in localStorage
    const existingUser = tbClient.getCurrentUser();
    if (existingUser && tbClient.getToken()) {
      onAuthenticated(existingUser);
      return;
    } else if (tbClient.getToken()) {
      tbClient.fetchCurrentUser().then((u) => {
        if (u) onAuthenticated(u);
      });
    }

    // 3. Load available SSO clients
    tbClient.getAvailableOAuth2Clients().then((clients) => {
      setOauthClients(clients);
    });
  }, [onAuthenticated]);

  const handleSaveSlug = () => {
    const trimmed = tempSlug.trim() || 'humid1-dash';
    saveAuthentikSlug(trimmed);
    setAuthentikSlugState(trimmed);
    setIsEditingSlug(false);
    // Refresh available clients
    tbClient.getAvailableOAuth2Clients().then((clients) => {
      setOauthClients(clients);
    });
  };

  const handleSSORedirect = (customUrl?: string) => {
    setIsLoading(true);
    setLoadingText('Connecting to Authentik SSO...');
    setErrorMessage(null);

    const returnUrl = getCurrentReturnUrl();
    let targetUrl = customUrl;

    if (!targetUrl) {
      // Prioritize ThingsBoard OAuth2 handler so ThingsBoard issues a native session token
      targetUrl = getThingsBoardOAuth2Url(serverUrl, returnUrl);
    }

    // Ensure absolute target
    if (!targetUrl.startsWith('http')) {
      targetUrl = `${serverUrl}${targetUrl.startsWith('/') ? '' : '/'}${targetUrl}`;
    }

    console.info('[Authentik SSO] Initiating SSO redirect to:', targetUrl);
    try {
      window.location.href = targetUrl;
    } catch (err) {
      setIsLoading(false);
      setErrorMessage('Failed to initiate Authentik redirect. Please verify network connectivity.');
    }
  };

  const handleCredentialsLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setErrorMessage('Please enter both your customer email and password.');
      return;
    }

    setIsLoading(true);
    setLoadingText('Verifying credentials with ThingsBoard...');
    setErrorMessage(null);

    const res = await tbClient.loginWithCredentials(username.trim(), password.trim());
    setIsLoading(false);

    if (res.success && res.user) {
      onAuthenticated(res.user);
    } else {
      setErrorMessage(
        res.error || 'Authentication failed. Please verify your ThingsBoard customer account credentials.'
      );
    }
  };

  const handleApplyServerConfig = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tempServerUrl.trim()) return;
    tbClient.setServerUrl(tempServerUrl.trim());
    onUpdateServerUrl(tempServerUrl.trim());
    setActiveMode('sso');
  };

  const handleApplyDirectToken = async () => {
    const raw = directTokenInput.trim();
    if (!raw) return;

    if (isAuthentikOidcToken(raw)) {
      setErrorMessage(
        '⚠️ That is an Authentik OIDC token (issued by auth.humid1.com), not a native ThingsBoard session token! ThingsBoard API rejects external OIDC tokens directly with 401 Unauthorized. Please use "Sign In via ThingsBoard SSO" or log in with your ThingsBoard customer account credentials.'
      );
      return;
    }

    setIsLoading(true);
    setLoadingText('Validating bearer token...');
    setErrorMessage(null);

    tbClient.setSession(raw);
    const user = await tbClient.fetchCurrentUser();
    setIsLoading(false);

    if (user) {
      onAuthenticated(user);
    } else {
      const decoded = tbClient.decodeJwtPayload(directTokenInput.trim());
      const fallbackUser: AuthentikUser = {
        id: (decoded?.userId as string) || 'tb-user-from-jwt',
        email: (decoded?.sub as string) || (decoded?.email as string) || 'customer@humid1.com',
        name: (decoded?.name as string) || (decoded?.firstName as string) || 'Customer User',
        authority: (decoded?.scopes as any)?.[0] || 'CUSTOMER_USER',
        customerId: (decoded?.customerId as string) || undefined,
        tenantId: (decoded?.tenantId as string) || undefined,
        isSimulated: false,
      };
      onAuthenticated(fallbackUser);
    }
  };

  return (
    <div id="auth-portal" className="min-h-screen bg-slate-950 flex flex-col justify-center items-center px-4 py-8 relative overflow-hidden">
      {/* Subtle Background Ambience */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-slate-800/20 rounded-full blur-3xl pointer-events-none" />

      {/* Top Domain Map Status Strip */}
      <div className="w-full max-w-lg mb-4 flex items-center justify-between px-2 text-xs">
        <button
          type="button"
          onClick={() => setIsEcosystemOpen(true)}
          className="flex items-center gap-1.5 text-slate-400 hover:text-amber-400 transition cursor-pointer bg-slate-900/80 px-3 py-1.5 rounded-full border border-slate-800"
        >
          <Layers className="w-3.5 h-3.5 text-amber-400" />
          <span className="font-mono text-[11px]">System Topology</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setDiagnosticsTab('logs');
            setIsDiagnosticsOpen(true);
          }}
          className="flex items-center gap-1.5 text-slate-400 hover:text-amber-400 transition cursor-pointer bg-slate-900/80 px-3 py-1.5 rounded-full border border-slate-800"
        >
          <Terminal className="w-3.5 h-3.5 text-amber-400" />
          <span className="font-mono text-[11px]">Logs & Diagnostics</span>
        </button>

        <a
          href={APP_CONFIG.domains.chatUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-slate-400 hover:text-amber-300 transition cursor-pointer bg-slate-900/80 hover:bg-slate-900 px-3 py-1.5 rounded-full border border-slate-800"
        >
          <MessageSquare className="w-3.5 h-3.5 text-amber-400" />
          <span className="font-semibold text-[11px]">Support</span>
          <ExternalLink className="w-3 h-3 text-slate-400" />
        </a>
      </div>

      {/* Main Card Container */}
      <div className="w-full max-w-lg bg-slate-900/95 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-md relative z-10 space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 mb-1">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-100 font-sans">
            HUMID1<span className="text-amber-400">_OS</span>
          </h1>
          <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
            Production Humidor Telemetry • Authentik SSO • ThingsBoard CE
          </p>
        </div>

        {/* Mode Navigation Tabs */}
        <div className="grid grid-cols-3 p-1 rounded-xl bg-slate-950/80 border border-slate-800 text-xs font-semibold">
          <button
            type="button"
            id="tab-sso"
            onClick={() => {
              setActiveMode('sso');
              setErrorMessage(null);
            }}
            className={`py-2 rounded-lg transition text-center cursor-pointer flex items-center justify-center gap-1.5 ${
              activeMode === 'sso'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Authentik SSO</span>
          </button>

          <button
            type="button"
            id="tab-credentials"
            onClick={() => {
              setActiveMode('credentials');
              setErrorMessage(null);
            }}
            className={`py-2 rounded-lg transition text-center cursor-pointer flex items-center justify-center gap-1.5 ${
              activeMode === 'credentials'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Credentials</span>
          </button>

          <button
            type="button"
            id="tab-config"
            onClick={() => {
              setActiveMode('config');
              setErrorMessage(null);
            }}
            className={`py-2 rounded-lg transition text-center cursor-pointer flex items-center justify-center gap-1.5 ${
              activeMode === 'config'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Server className="w-3.5 h-3.5" />
            <span>Endpoint</span>
          </button>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-rose-950/60 border border-rose-800/80 text-rose-300 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* 1. Authentik SSO Flow */}
        {activeMode === 'sso' && (
          <div className="space-y-4 animate-fade-in">
            {/* Target Provider & Destination Banner */}
            <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Authentik Provider
                </span>
                {isEditingSlug ? (
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      value={tempSlug}
                      onChange={(e) => setTempSlug(e.target.value)}
                      placeholder="humid1-dash"
                      className="bg-slate-900 border border-amber-500/50 rounded-md px-2 py-0.5 text-[11px] text-amber-300 font-mono focus:outline-none w-28"
                    />
                    <button
                      type="button"
                      onClick={handleSaveSlug}
                      className="p-1 rounded bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 cursor-pointer"
                      title="Save Slug"
                    >
                      <Check className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setTempSlug(authentikSlug);
                      setIsEditingSlug(true);
                    }}
                    className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-300 border border-blue-500/20 hover:border-blue-400 transition cursor-pointer flex items-center gap-1"
                    title="Click to edit Authentik Provider slug"
                  >
                    <span>slug: {authentikSlug}</span>
                    <Settings2 className="w-2.5 h-2.5 ml-0.5 opacity-70" />
                  </button>
                )}
              </div>

              <div className="text-[11px] text-slate-400 space-y-1">
                <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                  <span>Identity Provider:</span>
                  <span className="text-amber-300 font-semibold">auth.humid1.com</span>
                </div>
                <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                  <span>Return Destination:</span>
                  <span className="text-emerald-400 font-semibold truncate max-w-[200px]" title={getCurrentReturnUrl()}>
                    {typeof window !== 'undefined' ? window.location.host : 'dash.humid1.com'}
                  </span>
                </div>
              </div>
            </div>

            {/* Primary SSO Action Button */}
            <button
              id="btn-authentik-sso"
              type="button"
              disabled={isLoading}
              onClick={() => handleSSORedirect()}
              className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-600 to-amber-500 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-sm transition shadow-xl shadow-amber-900/30 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isLoading ? (
                <span>{loadingText}</span>
              ) : (
                <>
                  <ShieldCheck className="w-5 h-5" />
                  <span>Sign In with Authentik SSO ({authentikSlug})</span>
                  <ArrowRight className="w-4 h-4 ml-1" />
                </>
              )}
            </button>

            {/* Secondary SSO Options Toggle */}
            <div className="pt-2 border-t border-slate-800/80 space-y-2">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setShowAdvancedSso(!showAdvancedSso)}
                  className="text-[11px] text-slate-400 hover:text-amber-400 transition flex items-center gap-1 cursor-pointer"
                >
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showAdvancedSso ? 'rotate-180' : ''}`} />
                  <span>Alternative Login Gateways</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowDirectToken(!showDirectToken)}
                  className="text-[11px] text-slate-400 hover:text-amber-400 transition flex items-center gap-1 cursor-pointer"
                >
                  <Terminal className="w-3.5 h-3.5" />
                  <span>Direct Token</span>
                </button>
              </div>

              {/* Advanced SSO Options */}
              {showAdvancedSso && (
                <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 space-y-2 animate-fade-in text-xs">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Available SSO Gateways:
                  </span>
                  <div className="space-y-1.5">
                    <button
                      type="button"
                      onClick={() => handleSSORedirect(getAuthentikOidcAuthorizeUrl(authentikSlug))}
                      className="w-full text-left px-3 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs flex items-center justify-between transition cursor-pointer"
                    >
                      <span className="font-medium">Authentik OIDC Flow ({authentikSlug})</span>
                      <ExternalLink className="w-3 h-3 text-slate-400" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSSORedirect(getThingsBoardOAuth2Url(serverUrl))}
                      className="w-full text-left px-3 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs flex items-center justify-between transition cursor-pointer"
                    >
                      <span className="font-medium">ThingsBoard OAuth2 Gateway (with return redirect)</span>
                      <ExternalLink className="w-3 h-3 text-slate-400" />
                    </button>
                  </div>
                </div>
              )}

              {/* Direct Token Drawer */}
              {showDirectToken && (
                <div className="mt-2 space-y-2 p-3 bg-slate-950 rounded-xl border border-slate-800 animate-fade-in">
                  <label className="block text-[11px] font-semibold text-slate-300">
                    Paste JWT Bearer Token (Authentik or ThingsBoard):
                  </label>
                  <textarea
                    rows={3}
                    value={directTokenInput}
                    onChange={(e) => setDirectTokenInput(e.target.value)}
                    placeholder="eyJhbGciOiJIUzUxMiJ9..."
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-[11px] text-slate-200 font-mono focus:outline-none focus:border-amber-500"
                  />
                  <button
                    type="button"
                    onClick={handleApplyDirectToken}
                    disabled={!directTokenInput.trim() || isLoading}
                    className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg transition cursor-pointer"
                  >
                    Apply Bearer Token
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 2. Direct Credentials Fallback */}
        {activeMode === 'credentials' && (
          <form onSubmit={handleCredentialsLogin} className="space-y-4 animate-fade-in">
            <div>
              <label htmlFor="input-login-username" className="block text-xs font-semibold text-slate-300 mb-1.5">
                Customer Email / Username
              </label>
              <input
                id="input-login-username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="customer@humid1.com"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label htmlFor="input-login-password" className="block text-xs font-semibold text-slate-300 mb-1.5">
                Password
              </label>
              <input
                id="input-login-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
            </div>

            <button
              id="btn-submit-credentials"
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 rounded-xl bg-slate-100 hover:bg-white text-slate-950 font-bold text-xs transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
            >
              {isLoading ? (
                <span>{loadingText}</span>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  <span>Authenticate with ThingsBoard</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* 3. Server Configuration */}
        {activeMode === 'config' && (
          <form onSubmit={handleApplyServerConfig} className="space-y-4 animate-fade-in">
            <div>
              <label htmlFor="input-server-url" className="block text-xs font-semibold text-slate-300 mb-1.5">
                ThingsBoard Endpoint URL
              </label>
              <div className="relative">
                <input
                  id="input-server-url"
                  type="url"
                  value={tempServerUrl}
                  onChange={(e) => setTempServerUrl(e.target.value)}
                  placeholder="https://app.humid1.com"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 font-mono"
                />
                <Globe className="w-4 h-4 text-slate-500 absolute right-3 top-3" />
              </div>
              <span className="text-[11px] text-slate-400 mt-1 block">
                Default: <code className="text-amber-400 font-mono">{APP_CONFIG.domains.thingsboardUrl}</code>
              </span>
            </div>

            <button
              id="btn-save-server-url"
              type="submit"
              className="w-full py-2.5 px-4 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 hover:bg-amber-500/30 font-bold text-xs transition cursor-pointer"
            >
              Save Server Configuration
            </button>
          </form>
        )}
      </div>

      {/* Footer Info */}
      <div className="mt-6 text-center text-xs text-slate-400 font-mono flex items-center gap-2">
        <span>Authentik SSO ({authentikSlug})</span>
        <span>•</span>
        <span>ThingsBoard CE</span>
        <span>•</span>
        <span>Hardware Claiming Ready</span>
      </div>

      {/* Ecosystem Modal */}
      <EcosystemModal
        isOpen={isEcosystemOpen}
        onClose={() => setIsEcosystemOpen(false)}
      />

      {/* API Inspector & Diagnostics Modal */}
      <ApiInspectorModal
        isOpen={isDiagnosticsOpen}
        onClose={() => setIsDiagnosticsOpen(false)}
        initialTab={diagnosticsTab}
      />
    </div>
  );
};

