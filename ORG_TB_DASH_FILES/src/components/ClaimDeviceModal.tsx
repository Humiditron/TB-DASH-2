import React, { useState } from 'react';
import { thingsboard } from '../services/thingsboard';
import { Plus, X, KeyRound, Radio, Loader2, Eye, EyeOff, AlertCircle } from 'lucide-react';

interface ClaimDeviceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDeviceClaimed: (newDeviceId: string) => void;
}

export const ClaimDeviceModal: React.FC<ClaimDeviceModalProps> = ({
  isOpen,
  onClose,
  onDeviceClaimed,
}) => {
  const [deviceName, setDeviceName] = useState('');
  const [secretPin, setSecretPin] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanDeviceName = deviceName.trim();
    const cleanSecretPin = secretPin.trim();

    if (!cleanDeviceName) {
      setError('Please enter a descriptive device name (e.g. Test-Sensor-642fa1)');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const newDevice = await thingsboard.claimDevice(cleanDeviceName, cleanSecretPin);
      setLoading(false);
      onDeviceClaimed(newDevice.id);
      onClose();
    } catch (err: any) {
      setLoading(false);
      const rawMsg = err?.message || '';
      setError(rawMsg || 'Failed to claim device. Please verify device name, PIN, and ThingsBoard connection.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl shadow-black/80 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Radio className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Claim New Humidor Hardware</h3>
            <p className="text-xs text-slate-400">Bind unassigned ESP32 to your customer account</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3.5 rounded-xl bg-rose-950/70 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1 leading-relaxed">{error}</div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
              Device Name / Label
            </label>
            <input
              type="text"
              placeholder="e.g. Test-Sensor-642fa1"
              value={deviceName}
              onChange={(e) => setDeviceName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all font-mono text-xs"
            />
            <span className="text-[11px] text-slate-500 mt-1 block">
              The provisioned hardware name as registered in ThingsBoard.
            </span>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
              Secret Claim PIN / Key
            </label>
            <div className="relative">
              <input
                type={showSecret ? 'text' : 'password'}
                placeholder="e.g. mySecret123"
                value={secretPin}
                onChange={(e) => setSecretPin(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 pl-10 pr-10 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all font-mono text-xs"
              />
              <KeyRound className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <button
                type="button"
                onClick={() => setShowSecret(!showSecret)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 p-1 cursor-pointer"
                title={showSecret ? 'Hide secret' : 'Show secret'}
              >
                {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <span className="text-[11px] text-slate-500 mt-1 block">
              Device claiming secret generated during hardware provisioning.
            </span>
          </div>

          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-500 text-slate-950 transition-all shadow-md shadow-amber-950/40 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Binding via ThingsBoard...</span>
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
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
