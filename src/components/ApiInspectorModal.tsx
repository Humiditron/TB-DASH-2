import React, { useState, useEffect } from 'react';
import {
  X,
  Terminal,
  Trash2,
  Copy,
  Check,
  Clock,
  Filter,
  ArrowRightLeft,
  CheckCircle2,
  AlertCircle,
  Key,
  Zap,
  Play,
  Loader2,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';
import { ApiTransaction } from '../types';
import { apiLogger } from '../services/apiLogger';
import { thingsboard } from '../services/thingsboard';
import {
  decodeJwtPayload,
  isAuthentikOidcToken,
  isThingsBoardToken,
  normalizeBearerToken,
} from '../utils/authTokens';

interface ApiInspectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'logs' | 'token';
}

export const ApiInspectorModal: React.FC<ApiInspectorModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'logs',
}) => {
  const [activeTab, setActiveTab] = useState<'logs' | 'token'>(initialTab);
  const [transactions, setTransactions] = useState<ApiTransaction[]>([]);
  const [filterMethod, setFilterMethod] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedTxId, setSelectedTxId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [copiedSnippet, setCopiedSnippet] = useState<string | null>(null);

  // Active Token & Test State
  const [currentToken, setCurrentToken] = useState<string | null>(null);
  const [testTokenInput, setTestTokenInput] = useState<string>('');
  const [isTestingToken, setIsTestingToken] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    status: number;
    data?: any;
    error?: string;
  } | null>(null);
  const [activationFeedback, setActivationFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab, isOpen]);

  // Subscribe to API transactions
  useEffect(() => {
    if (!isOpen) return;
    const unsubscribe = apiLogger.subscribe((txs) => {
      setTransactions(txs);
      if (txs.length > 0 && !selectedTxId) {
        setSelectedTxId(txs[0].id);
      }
    });
    return unsubscribe;
  }, [isOpen, selectedTxId]);

  // Refresh current token state when modal opens
  useEffect(() => {
    if (isOpen) {
      const tok = thingsboard.getEffectiveToken();
      setCurrentToken(tok);
      setTestTokenInput(tok || '');
      setTestResult(null);
      setActivationFeedback(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const filteredTransactions = transactions.filter((tx) => {
    const matchesMethod =
      filterMethod === 'ALL' || tx.method.toUpperCase() === filterMethod.toUpperCase();
    const matchesSearch =
      !searchQuery ||
      tx.url.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tx.method.toLowerCase().includes(searchQuery.toLowerCase()) ||
      JSON.stringify(tx.requestPayload || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      JSON.stringify(tx.responsePayload || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (tx.error && tx.error.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesMethod && matchesSearch;
  });

  const selectedTx = transactions.find((t) => t.id === selectedTxId) || filteredTransactions[0];

  const handleClear = () => {
    apiLogger.clearLogs();
    setSelectedTxId(null);
  };

  const handleCopyLogs = () => {
    navigator.clipboard.writeText(JSON.stringify(transactions, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const copyToClipboard = (text: string, snippetId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSnippet(snippetId);
    setTimeout(() => setCopiedSnippet(null), 2500);
  };

  const formatTimestamp = (ts: number) => {
    const date = new Date(ts);
    return date.toLocaleTimeString() + '.' + String(date.getMilliseconds()).padStart(3, '0');
  };

  const getMethodColor = (method: string) => {
    switch (method.toUpperCase()) {
      case 'GET':
        return 'bg-sky-950/80 text-sky-300 border-sky-800/60';
      case 'POST':
        return 'bg-emerald-950/80 text-emerald-300 border-emerald-800/60';
      case 'PUT':
        return 'bg-amber-950/80 text-amber-300 border-amber-800/60';
      case 'DELETE':
        return 'bg-rose-950/80 text-rose-300 border-rose-800/60';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  // Analyze active token
  const activeTokenNormalized = normalizeBearerToken(currentToken);
  const activePayload = decodeJwtPayload(activeTokenNormalized);
  const isTbToken = isThingsBoardToken(activeTokenNormalized);
  const isOidcToken = isAuthentikOidcToken(activeTokenNormalized);

  // Analyze test token input
  const testTokenNormalized = normalizeBearerToken(testTokenInput);
  const testPayload = decodeJwtPayload(testTokenNormalized);
  const isTestTbToken = isThingsBoardToken(testTokenNormalized);
  const isTestOidcToken = isAuthentikOidcToken(testTokenNormalized);

  const handleRunTokenTest = async () => {
    const tokenToTest = testTokenNormalized;
    if (!tokenToTest) return;

    setIsTestingToken(true);
    setTestResult(null);

    const config = thingsboard.getConfig();
    const serverUrl = config.serverUrl || 'https://app.humid1.com';

    const result = await apiLogger.testTokenDirect(serverUrl, tokenToTest);
    setIsTestingToken(false);
    setTestResult(result);
  };

  const handleApplyToken = () => {
    const clean = testTokenNormalized;
    if (!clean) return;

    if (isAuthentikOidcToken(clean)) {
      setActivationFeedback(
        '⚠️ Cannot apply: This is an Authentik OIDC token, which ThingsBoard rejects with 401. You need a ThingsBoard-issued JWT token.'
      );
      return;
    }

    thingsboard.setAuthSession(clean);
    setCurrentToken(clean);
    setActivationFeedback('✅ ThingsBoard token activated successfully! App state synchronized.');
    setTimeout(() => setActivationFeedback(null), 3500);
  };

  return (
    <div
      id="api-inspector-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-slate-950/85 backdrop-blur-sm animate-fadeIn"
    >
      <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-5xl h-[88vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Terminal className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-100 text-base flex items-center gap-2">
                Live Diagnostics, Logs & Token Inspector
              </h3>
              <p className="text-xs text-slate-400">
                Monitor REST API transactions, inspect token claims, and debug ThingsBoard IoT requests
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Top Navigation Tabs */}
        <div className="flex items-center gap-1 px-6 border-b border-slate-800 bg-slate-950/40">
          <button
            onClick={() => setActiveTab('logs')}
            className={`flex items-center gap-2 py-3 px-4 text-xs font-bold border-b-2 transition cursor-pointer ${
              activeTab === 'logs'
                ? 'border-amber-400 text-amber-400 bg-amber-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Terminal className="w-4 h-4" />
            <span>Live API Logs</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 font-mono text-slate-300 border border-slate-700">
              {transactions.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('token')}
            className={`flex items-center gap-2 py-3 px-4 text-xs font-bold border-b-2 transition cursor-pointer ${
              activeTab === 'token'
                ? 'border-amber-400 text-amber-400 bg-amber-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Key className="w-4 h-4" />
            <span>Token & Auth Diagnostics</span>
            {activeTokenNormalized ? (
              isTbToken ? (
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              ) : isOidcToken ? (
                <span className="w-2 h-2 rounded-full bg-amber-400"></span>
              ) : (
                <span className="w-2 h-2 rounded-full bg-sky-400"></span>
              )
            ) : (
              <span className="w-2 h-2 rounded-full bg-rose-400"></span>
            )}
          </button>
        </div>

        {/* TAB 1: LIVE API LOGS */}
        {activeTab === 'logs' && (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Action & Filter Bar */}
            <div className="px-6 py-2.5 bg-slate-950 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-xs text-slate-400 font-medium">Method:</span>
                {['ALL', 'GET', 'POST', 'PUT', 'DELETE'].map((method) => (
                  <button
                    key={method}
                    onClick={() => setFilterMethod(method)}
                    className={`px-2 py-0.5 rounded-lg text-xs font-mono font-bold transition cursor-pointer ${
                      filterMethod === method
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                    }`}
                  >
                    {method}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Search endpoint, status or JSON..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-48 sm:w-60 bg-slate-900 border border-slate-700 rounded-xl px-3 py-1 text-xs text-slate-200 focus:outline-none focus:border-amber-500 font-mono"
                />

                <button
                  onClick={handleCopyLogs}
                  className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition flex items-center gap-1 cursor-pointer"
                  title="Copy all logs to clipboard as JSON"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                  <span className="hidden sm:inline">{copied ? 'Copied' : 'Export'}</span>
                </button>

                <button
                  onClick={handleClear}
                  className="px-2.5 py-1 rounded-xl bg-rose-950/60 hover:bg-rose-900/60 border border-rose-800 text-rose-300 text-xs font-semibold transition flex items-center gap-1 cursor-pointer"
                  title="Clear all logged transactions"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Clear</span>
                </button>
              </div>
            </div>

            {/* Split View */}
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
              {/* Left Transactions List */}
              <div className="lg:col-span-5 border-r border-slate-800 overflow-y-auto bg-slate-950/30 divide-y divide-slate-800/60">
                {filteredTransactions.length === 0 ? (
                  <div className="p-8 text-center text-slate-500 text-xs font-mono">
                    No transactions captured yet. Trigger an action, test a token, or claim a device to observe real-time requests.
                  </div>
                ) : (
                  filteredTransactions.map((tx) => {
                    const isSelected = selectedTx?.id === tx.id;
                    const isSuccess =
                      tx.responseStatus && tx.responseStatus >= 200 && tx.responseStatus < 300;
                    return (
                      <div
                        key={tx.id}
                        onClick={() => setSelectedTxId(tx.id)}
                        className={`p-3 transition cursor-pointer flex flex-col gap-1.5 ${
                          isSelected
                            ? 'bg-amber-500/10 border-l-4 border-l-amber-500'
                            : 'hover:bg-slate-900/60'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold border ${getMethodColor(
                                tx.method
                              )}`}
                            >
                              {tx.method}
                            </span>
                            <span
                              className="text-xs font-mono text-slate-300 truncate max-w-[200px]"
                              title={tx.url}
                            >
                              {tx.url}
                            </span>
                          </div>
                          {tx.responseStatus ? (
                            <span
                              className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                                isSuccess
                                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/50'
                                  : 'bg-rose-950 text-rose-300 border border-rose-800/50'
                              }`}
                            >
                              {tx.responseStatus}
                            </span>
                          ) : (
                            <span className="text-[10px] font-mono text-amber-400 animate-pulse">
                              PENDING
                            </span>
                          )}
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatTimestamp(tx.timestamp)}
                          </span>
                          <div className="flex items-center gap-2">
                            {tx.hasToken && (
                              <span className="text-[10px] text-amber-400/90 font-mono">
                                [auth]
                              </span>
                            )}
                            {tx.durationMs !== undefined && <span>{tx.durationMs}ms</span>}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Right Payload Inspector */}
              <div className="lg:col-span-7 flex flex-col bg-slate-900 overflow-y-auto p-5 space-y-4">
                {selectedTx ? (
                  <>
                    <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2.5 py-0.5 rounded text-xs font-mono font-bold border ${getMethodColor(
                              selectedTx.method
                            )}`}
                          >
                            {selectedTx.method}
                          </span>
                          <span className="text-xs font-mono text-slate-200 font-semibold break-all">
                            {selectedTx.url}
                          </span>
                        </div>
                        {selectedTx.responseStatus && (
                          <div className="flex items-center gap-1 text-xs font-mono">
                            {selectedTx.responseStatus >= 200 && selectedTx.responseStatus < 300 ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                            ) : (
                              <AlertCircle className="w-4 h-4 text-rose-400" />
                            )}
                            <span className="text-slate-300">
                              Status: {selectedTx.responseStatus}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-800 text-xs font-mono text-slate-400">
                        <div>
                          Time: <span className="text-slate-200">{new Date(selectedTx.timestamp).toLocaleString()}</span>
                        </div>
                        <div>
                          Latency: <span className="text-emerald-400">{selectedTx.durationMs !== undefined ? `${selectedTx.durationMs}ms` : 'In flight'}</span>
                        </div>
                      </div>

                      {selectedTx.authHeader && (
                        <div className="text-[11px] font-mono text-slate-400 pt-1 border-t border-slate-900 flex items-center gap-1.5">
                          <span className="text-amber-400">Authorization:</span>
                          <code className="text-slate-300">{selectedTx.authHeader}</code>
                        </div>
                      )}
                    </div>

                    {/* Request Payload */}
                    <div className="space-y-1.5">
                      <span className="text-xs font-bold text-slate-300 font-mono flex items-center gap-1.5">
                        <ArrowRightLeft className="w-3.5 h-3.5 text-amber-400" />
                        <span>Request Body Payload</span>
                      </span>
                      <pre className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 text-xs font-mono text-amber-300 max-h-48 overflow-auto">
                        {selectedTx.requestPayload !== undefined
                          ? typeof selectedTx.requestPayload === 'string'
                            ? selectedTx.requestPayload
                            : JSON.stringify(selectedTx.requestPayload, null, 2)
                          : '// No request payload'}
                      </pre>
                    </div>

                    {/* Response Payload */}
                    <div className="space-y-1.5">
                      <span className="text-xs font-bold text-slate-300 font-mono flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Response Body Payload</span>
                      </span>
                      <pre className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 text-xs font-mono text-emerald-300 max-h-56 overflow-auto">
                        {selectedTx.responsePayload !== undefined
                          ? typeof selectedTx.responsePayload === 'string'
                            ? selectedTx.responsePayload
                            : JSON.stringify(selectedTx.responsePayload, null, 2)
                          : selectedTx.error
                          ? `// Error: ${selectedTx.error}`
                          : '// Response pending or empty'}
                      </pre>
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-slate-500 font-mono text-xs">
                    Select a transaction on the left to inspect full request/response details.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: TOKEN & AUTH DIAGNOSTICS */}
        {activeTab === 'token' && (
          <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-950/40">
            {/* Active Token Status Banner */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    <Key className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-100 text-sm">Active Dashboard Token</h4>
                    <p className="text-xs text-slate-400">Currently loaded token in dashboard memory & storage</p>
                  </div>
                </div>

                <div>
                  {activeTokenNormalized ? (
                    isTbToken ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-950 text-emerald-300 border border-emerald-700/50">
                        <ShieldCheck className="w-4 h-4 text-emerald-400" />
                        Native ThingsBoard JWT
                      </span>
                    ) : isOidcToken ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-950 text-amber-300 border border-amber-700/50">
                        <ShieldAlert className="w-4 h-4 text-amber-400" />
                        Authentik OIDC Token (Incompatible with TB API)
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-sky-950 text-sky-300 border border-sky-700/50">
                        Generic JWT
                      </span>
                    )
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-950 text-rose-300 border border-rose-700/50">
                      <AlertCircle className="w-4 h-4 text-rose-400" />
                      No Token Detected
                    </span>
                  )}
                </div>
              </div>

              {activeTokenNormalized ? (
                <div className="space-y-3">
                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 font-mono text-xs flex items-center justify-between gap-3">
                    <span className="text-slate-300 truncate max-w-[550px]">
                      {activeTokenNormalized.substring(0, 32)}...
                      {activeTokenNormalized.substring(activeTokenNormalized.length - 24)}
                    </span>
                    <button
                      onClick={() => copyToClipboard(activeTokenNormalized, 'active_token')}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 shrink-0 cursor-pointer"
                    >
                      {copiedSnippet === 'active_token' ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5 text-slate-400" />
                      )}
                      <span>{copiedSnippet === 'active_token' ? 'Copied' : 'Copy Full Token'}</span>
                    </button>
                  </div>

                  {/* Decoded Claims */}
                  {activePayload && (
                    <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                      <div className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                        Decoded Token Claims
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs font-mono">
                        <div className="p-2 rounded bg-slate-900 border border-slate-800">
                          <span className="text-slate-500 block text-[10px]">Subject (sub)</span>
                          <span className="text-slate-200 font-bold truncate block">
                            {String(activePayload.sub || 'N/A')}
                          </span>
                        </div>
                        <div className="p-2 rounded bg-slate-900 border border-slate-800">
                          <span className="text-slate-500 block text-[10px]">Issuer (iss)</span>
                          <span className="text-slate-200 truncate block">
                            {String(activePayload.iss || 'ThingsBoard (Internal)')}
                          </span>
                        </div>
                        <div className="p-2 rounded bg-slate-900 border border-slate-800">
                          <span className="text-slate-500 block text-[10px]">Scopes / Authority</span>
                          <span className="text-amber-400 font-bold truncate block">
                            {Array.isArray(activePayload.scopes)
                              ? activePayload.scopes.join(', ')
                              : String(activePayload.authority || 'N/A')}
                          </span>
                        </div>
                        {Boolean(activePayload.userId) && (
                          <div className="p-2 rounded bg-slate-900 border border-slate-800">
                            <span className="text-slate-500 block text-[10px]">ThingsBoard User ID</span>
                            <span className="text-slate-300 truncate block">{String(activePayload.userId)}</span>
                          </div>
                        )}
                        {Boolean(activePayload.tenantId) && (
                          <div className="p-2 rounded bg-slate-900 border border-slate-800">
                            <span className="text-slate-500 block text-[10px]">Tenant ID</span>
                            <span className="text-slate-300 truncate block">{String(activePayload.tenantId)}</span>
                          </div>
                        )}
                        {Boolean(activePayload.exp) && (
                          <div className="p-2 rounded bg-slate-900 border border-slate-800">
                            <span className="text-slate-500 block text-[10px]">Expiration</span>
                            <span className="text-emerald-400 block">
                              {new Date((activePayload.exp as number) * 1000).toLocaleString()}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {isOidcToken && (
                    <div className="p-3.5 rounded-xl bg-amber-950/60 border border-amber-800/60 text-amber-200 text-xs space-y-1">
                      <div className="font-bold flex items-center gap-1.5 text-amber-300">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>Token Authentication Notice:</span>
                      </div>
                      <p className="text-[11px] leading-relaxed text-amber-200/90">
                        This token was issued by <code className="text-amber-100 font-mono">auth.humid1.com</code> (Authentik). ThingsBoard’s security filter validates requests using its native JWT session issued by ThingsBoard.
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-xs text-slate-400 font-mono">
                  No active ThingsBoard session token found in browser memory.
                </div>
              )}
            </div>

            {/* Live Token Tester & Activator */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <Zap className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-100 text-sm">Live Token Test & Activator</h4>
                    <p className="text-xs text-slate-400">
                      Test any token string against ThingsBoard REST endpoint <code className="font-mono text-amber-400">/api/auth/user</code>
                    </p>
                  </div>
                </div>
              </div>

              {activationFeedback && (
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-700 text-xs font-mono text-slate-200">
                  {activationFeedback}
                </div>
              )}

              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                  Token String to Test or Activate:
                </label>
                <div className="relative">
                  <textarea
                    rows={3}
                    value={testTokenInput}
                    onChange={(e) => setTestTokenInput(e.target.value)}
                    placeholder="Paste ThingsBoard JWT token here..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500 font-mono resize-none"
                  />
                </div>

                {testTokenNormalized && (
                  <div className="flex items-center gap-3 text-xs font-mono">
                    <span className="text-slate-400">Type:</span>
                    {isTestTbToken ? (
                      <span className="text-emerald-400 font-bold">Native ThingsBoard JWT ✅</span>
                    ) : isTestOidcToken ? (
                      <span className="text-amber-400 font-bold">Authentik OIDC Token ⚠️</span>
                    ) : (
                      <span className="text-slate-300">Raw JWT string</span>
                    )}
                    {testPayload?.sub && (
                      <span className="text-slate-400">Sub: <strong className="text-slate-200">{String(testPayload.sub)}</strong></span>
                    )}
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleRunTokenTest}
                  disabled={isTestingToken || !testTokenNormalized}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-bold transition shadow-lg shadow-amber-950/30 flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isTestingToken ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Sending GET /api/auth/user...</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4" />
                      <span>Test Token Live</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleApplyToken}
                  disabled={!testTokenNormalized}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Activate Token in Dashboard</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const tok = thingsboard.getEffectiveToken();
                    setTestTokenInput(tok || '');
                  }}
                  className="px-3 py-2 rounded-xl text-slate-400 hover:text-slate-200 text-xs font-mono transition cursor-pointer"
                >
                  Reset to Current
                </button>
              </div>

              {/* Test Result Display */}
              {testResult && (
                <div
                  className={`mt-4 p-4 rounded-xl border ${
                    testResult.success
                      ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-200'
                      : 'bg-rose-950/40 border-rose-800/60 text-rose-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 font-bold text-xs">
                      {testResult.success ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-rose-400" />
                      )}
                      <span>
                        Result: HTTP {testResult.status} {testResult.success ? 'SUCCESS (Authenticated)' : 'FAILED'}
                      </span>
                    </div>
                  </div>

                  <pre className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs font-mono overflow-auto max-h-48 text-slate-200">
                    {testResult.data
                      ? JSON.stringify(testResult.data, null, 2)
                      : testResult.error || 'No response data'}
                  </pre>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

