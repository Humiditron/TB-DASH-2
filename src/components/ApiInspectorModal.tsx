import React, { useState, useEffect } from 'react';
import { X, Terminal, Trash2, Copy, Check, Clock, Filter, ArrowRightLeft, CheckCircle2, AlertCircle } from 'lucide-react';
import { ApiTransaction } from '../types';
import { apiLogger } from '../services/apiLogger';

interface ApiInspectorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ApiInspectorModal: React.FC<ApiInspectorModalProps> = ({ isOpen, onClose }) => {
  const [transactions, setTransactions] = useState<ApiTransaction[]>([]);
  const [filterMethod, setFilterMethod] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedTxId, setSelectedTxId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

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

  if (!isOpen) return null;

  const filteredTransactions = transactions.filter((tx) => {
    const matchesMethod = filterMethod === 'ALL' || tx.method.toUpperCase() === filterMethod.toUpperCase();
    const matchesSearch =
      !searchQuery ||
      tx.url.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tx.method.toLowerCase().includes(searchQuery.toLowerCase()) ||
      JSON.stringify(tx.requestPayload || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      JSON.stringify(tx.responsePayload || '').toLowerCase().includes(searchQuery.toLowerCase());
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

  return (
    <div id="api-inspector-modal" className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-slate-950/85 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-5xl h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Terminal className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-100 text-base flex items-center gap-2">
                API Transaction Inspector & Debugger
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 font-mono text-slate-300 border border-slate-700">
                  {transactions.length} logged
                </span>
              </h3>
              <p className="text-xs text-slate-400">Inspect time, endpoints, and JSON request/response payloads in real-time</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyLogs}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-slate-400" />}
              <span>{copied ? 'Copied JSON' : 'Export JSON'}</span>
            </button>

            <button
              onClick={handleClear}
              className="px-3 py-1.5 rounded-xl bg-rose-950/60 hover:bg-rose-900/60 border border-rose-800 text-rose-300 text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              <span>Clear Logs</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition cursor-pointer ml-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filters bar */}
        <div className="px-6 py-3 bg-slate-950 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <span className="text-xs text-slate-400 font-medium">Filter Method:</span>
            {['ALL', 'GET', 'POST', 'PUT', 'DELETE'].map((method) => (
              <button
                key={method}
                onClick={() => setFilterMethod(method)}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition cursor-pointer ${
                  filterMethod === method
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                {method}
              </button>
            ))}
          </div>

          <div className="w-full sm:w-64">
            <input
              type="text"
              placeholder="Search endpoints or payload..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500 font-mono"
            />
          </div>
        </div>

        {/* Content Split Pane */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
          {/* Left List of Transactions */}
          <div className="lg:col-span-5 border-r border-slate-800 overflow-y-auto bg-slate-950/30 divide-y divide-slate-800/60">
            {filteredTransactions.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs font-mono">
                No API transactions recorded yet. Interact with the app or claim a device to view live endpoints.
              </div>
            ) : (
              filteredTransactions.map((tx) => {
                const isSelected = selectedTx?.id === tx.id;
                const isSuccess = tx.responseStatus && tx.responseStatus >= 200 && tx.responseStatus < 300;
                return (
                  <div
                    key={tx.id}
                    onClick={() => setSelectedTxId(tx.id)}
                    className={`p-3.5 transition cursor-pointer flex flex-col gap-1.5 ${
                      isSelected
                        ? 'bg-amber-500/10 border-l-4 border-l-amber-500'
                        : 'hover:bg-slate-900/60'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${getMethodColor(tx.method)}`}>
                          {tx.method}
                        </span>
                        <span className="text-xs font-mono text-slate-300 truncate max-w-[220px]" title={tx.url}>
                          {tx.url}
                        </span>
                      </div>
                      {tx.responseStatus ? (
                        <span
                          className={`text-[11px] font-mono font-bold px-1.5 py-0.5 rounded ${
                            isSuccess
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/50'
                              : 'bg-rose-950 text-rose-300 border border-rose-800/50'
                          }`}
                        >
                          {tx.responseStatus}
                        </span>
                      ) : (
                        <span className="text-[10px] font-mono text-amber-400 animate-pulse">PENDING</span>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatTimestamp(tx.timestamp)}
                      </span>
                      {tx.durationMs !== undefined && <span>{tx.durationMs}ms</span>}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Right Detailed Payload Inspector */}
          <div className="lg:col-span-7 flex flex-col bg-slate-900 overflow-y-auto p-5 space-y-4">
            {selectedTx ? (
              <>
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-0.5 rounded text-xs font-mono font-bold border ${getMethodColor(selectedTx.method)}`}>
                        {selectedTx.method}
                      </span>
                      <span className="text-xs font-mono text-slate-200 font-semibold break-all">{selectedTx.url}</span>
                    </div>
                    {selectedTx.responseStatus && (
                      <div className="flex items-center gap-1 text-xs font-mono">
                        {selectedTx.responseStatus >= 200 && selectedTx.responseStatus < 300 ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-rose-400" />
                        )}
                        <span className="text-slate-300">Status: {selectedTx.responseStatus}</span>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-800 text-xs font-mono text-slate-400">
                    <div>
                      Timestamp: <span className="text-slate-200">{new Date(selectedTx.timestamp).toLocaleString()}</span>
                    </div>
                    <div>
                      Duration: <span className="text-emerald-400">{selectedTx.durationMs !== undefined ? `${selectedTx.durationMs}ms` : 'In flight'}</span>
                    </div>
                  </div>
                </div>

                {/* Request Payload */}
                <div className="space-y-1.5">
                  <span className="text-xs font-bold text-slate-300 font-mono flex items-center gap-1.5">
                    <ArrowRightLeft className="w-3.5 h-3.5 text-amber-400" />
                    <span>Request Payload (JSON)</span>
                  </span>
                  <pre className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 text-xs font-mono text-amber-300 max-h-56 overflow-auto">
                    {selectedTx.requestPayload !== undefined
                      ? typeof selectedTx.requestPayload === 'string'
                        ? selectedTx.requestPayload
                        : JSON.stringify(selectedTx.requestPayload, null, 2)
                      : '// No request body payload'}
                  </pre>
                </div>

                {/* Response Payload */}
                <div className="space-y-1.5">
                  <span className="text-xs font-bold text-slate-300 font-mono flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Response Payload (JSON)</span>
                  </span>
                  <pre className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 text-xs font-mono text-emerald-300 max-h-64 overflow-auto">
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
                Select an API transaction on the left to inspect its endpoint, timestamp, and JSON payloads.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
