import React, { useState } from 'react';
import { X, PlusCircle, ShieldCheck, KeyRound, Cpu, AlertCircle } from 'lucide-react';

interface ClaimModalProps {
  isOpen: boolean;
  onClose: () => void;
  onClaim: (deviceName: string, secretKey: string) => Promise<{ success: boolean; error?: string }>;
}

export const ClaimModal: React.FC<ClaimModalProps> = ({ isOpen, onClose, onClaim }) => {
  const [deviceName, setDeviceName] = useState('HUMID1-Vault-01');
  const [secretKey, setSecretKey] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deviceName.trim()) {
      setErrorMessage('Please provide a Device Name.');
      return;
    }
    if (!secretKey.trim()) {
      setErrorMessage('Please enter the hardware Secret PIN from your device box or screen.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    const res = await onClaim(deviceName.trim(), secretKey.trim());
    setIsSubmitting(false);

    if (res.success) {
      onClose();
    } else {
      setErrorMessage(res.error || 'Failed to claim device. Please verify your secret key.');
    }
  };

  return (
    <div id="modal-claim-device" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-5 animate-scale-in">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
              <PlusCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-100 text-base">Claim New Humidor Unit</h3>
              <p className="text-xs text-slate-400">Bind hardware to your ThingsBoard customer account</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error banner */}
        {errorMessage && (
          <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-800/60 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="input-device-name" className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
              Device Name / Identifier
            </label>
            <div className="relative">
              <input
                id="input-device-name"
                type="text"
                value={deviceName}
                onChange={(e) => setDeviceName(e.target.value)}
                placeholder="e.g. HUMID1-Cabinet-02"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 font-mono"
              />
              <Cpu className="w-4 h-4 text-slate-500 absolute right-3 top-3" />
            </div>
            <span className="text-[11px] text-slate-500 mt-1 block">
              Usually printed on the back label or OLED status display
            </span>
          </div>

          <div>
            <label htmlFor="input-secret-key" className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
              Claim PIN / Secret Key
            </label>
            <div className="relative">
              <input
                id="input-secret-key"
                type="password"
                value={secretKey}
                onChange={(e) => setSecretKey(e.target.value)}
                placeholder="e.g. 748921"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 font-mono"
              />
              <KeyRound className="w-4 h-4 text-slate-500 absolute right-3 top-3" />
            </div>
            <span className="text-[11px] text-slate-500 mt-1 block">
              6-8 digit authorization code found in device packaging
            </span>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition cursor-pointer"
            >
              Cancel
            </button>

            <button
              id="btn-submit-claim"
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-bold transition shadow-lg shadow-amber-900/30 flex items-center gap-1.5 cursor-pointer"
            >
              {isSubmitting ? (
                <span>Binding Device...</span>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Claim & Provision</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
