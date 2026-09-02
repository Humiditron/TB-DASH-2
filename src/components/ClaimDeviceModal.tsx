import React, { useState } from 'react';
import { thingsboard } from '../services/thingsboard';
import { X, Plus, KeyRound, Radio, Cpu, Check, AlertCircle, Loader2 } from 'lucide-react';

interface ClaimDeviceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDeviceClaimed: (deviceId: string) => void;
}

export const ClaimDeviceModal: React.FC<ClaimDeviceModalProps> = ({
  isOpen,
  onClose,
  onDeviceClaimed,
}) => {
  const [deviceName, setDeviceName] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deviceName.trim() || !secretKey.trim()) {
      setError('Please provide both Device Name / ID and Claiming Secret Key.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const device = await thingsboard.claimDevice(deviceName.trim(), secretKey.trim());
      setSuccess(true);
      if (device && device.id) {
        onDeviceClaimed(device.id);
      }
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 1000);
    } catch (err: any) {
      setError(err?.message || 'Failed to claim device. Verify device name and secret.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-6 shadow-2xl shadow-black/80 relative">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Radio className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Claim Physical Device</h3>
            <p className="text-xs text-slate-400">Pair ESP32 humidor hardware to your ThingsBoard account</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-950/70 border border-rose-500/30 text-rose-200 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-950/70 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Device claimed and provisioned successfully!</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[11px] font-mono uppercase text-slate-300 mb-1">
              Device Name / ID (e.g. Humidor-01)
            </label>
            <input
              type="text"
              placeholder="Humidor-01"
              value={deviceName}
              onChange={(e) => setDeviceName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-mono uppercase text-slate-300 mb-1">
              Claiming Secret Key
            </label>
            <input
              type="password"
              placeholder="••••••••"
              value={secretKey}
              onChange={(e) => setSecretKey(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-amber-500"
            />
            <span className="text-[10px] text-slate-500 mt-1 block">
              Found printed on the ESP32 enclosure QR label or packaging insert.
            </span>
          </div>

          <div className="pt-3 flex items-center justify-end gap-2">
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
              className="px-5 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition-all shadow-md shadow-amber-950/40 flex items-center gap-1.5 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Claiming...</span>
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5" />
                  <span>Claim Unit</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
