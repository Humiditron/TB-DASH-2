import React, { useState } from 'react';
import { thingsboard } from '../services/thingsboard';
import { HumidorDevice } from '../types';
import {
  Trash2,
  X,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  RotateCcw,
  ShieldAlert,
  Server,
  Cpu,
} from 'lucide-react';

interface RemoveDeviceModalProps {
  isOpen: boolean;
  onClose: () => void;
  device: HumidorDevice | null;
  onDeviceRemoved: (deviceId: string) => void;
}

type RemovalAction = 'unclaim' | 'delete';

export const RemoveDeviceModal: React.FC<RemoveDeviceModalProps> = ({
  isOpen,
  onClose,
  device,
  onDeviceRemoved,
}) => {
  const [actionType, setActionType] = useState<RemovalAction>('unclaim');
  const [confirmText, setConfirmText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen || !device) return null;

  const deviceName = device.clientAttributes?.device_name || device.name;
  const isDeleteConfirmed = actionType === 'unclaim' || confirmText.trim().toUpperCase() === 'DELETE';

  const handleExecuteRemoval = async () => {
    if (!isDeleteConfirmed) return;

    setIsProcessing(true);
    setError(null);
    setSuccessMessage(null);

    try {
      if (actionType === 'unclaim') {
        await thingsboard.unclaimDevice(deviceName, device.id);
        setSuccessMessage(`Device "${deviceName}" has been successfully released/unclaimed.`);
      } else {
        await thingsboard.deleteDevice(device.id);
        setSuccessMessage(`Device "${deviceName}" has been permanently removed from ThingsBoard.`);
      }

      onDeviceRemoved(device.id);

      setTimeout(() => {
        setIsProcessing(false);
        setSuccessMessage(null);
        setConfirmText('');
        onClose();
      }, 1200);
    } catch (err: any) {
      setIsProcessing(false);
      setError(err?.message || 'Failed to remove device. Please check permissions.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl shadow-black/80 relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          disabled={isProcessing}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition disabled:opacity-40"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400">
            <Trash2 className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">Remove Humidor Device</h2>
            <p className="text-xs text-slate-400">
              Unclaim from account or permanently remove from ThingsBoard
            </p>
          </div>
        </div>

        {/* Target Device Summary */}
        <div className="p-3.5 bg-slate-800/60 border border-slate-700/60 rounded-xl mb-5 text-xs text-slate-300 space-y-1.5">
          <div className="flex justify-between items-center">
            <span className="text-slate-400 font-medium">Device Name:</span>
            <span className="font-bold text-white font-mono">{deviceName}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-400 font-medium">Device ID:</span>
            <span className="font-mono text-slate-400 text-[11px] truncate max-w-[240px]">
              {device.id}
            </span>
          </div>
          {device.clientAttributes?.mac_address && (
            <div className="flex justify-between items-center">
              <span className="text-slate-400 font-medium">MAC Address:</span>
              <span className="font-mono text-slate-400 text-[11px]">
                {device.clientAttributes.mac_address}
              </span>
            </div>
          )}
          <div className="flex justify-between items-center">
            <span className="text-slate-400 font-medium">Current Status:</span>
            <span
              className={`font-semibold ${
                device.status === 'ONLINE' ? 'text-emerald-400' : 'text-slate-400'
              }`}
            >
              {device.status}
            </span>
          </div>
        </div>

        {/* Removal Action Selection Tabs */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <button
            type="button"
            onClick={() => setActionType('unclaim')}
            className={`p-3 rounded-xl border text-left transition flex flex-col gap-1 ${
              actionType === 'unclaim'
                ? 'bg-amber-500/15 border-amber-500/50 text-amber-300 shadow-sm'
                : 'bg-slate-800/40 border-slate-700/60 text-slate-400 hover:bg-slate-800'
            }`}
          >
            <div className="flex items-center gap-1.5 font-semibold text-xs text-white">
              <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
              <span>Unclaim Device</span>
            </div>
            <span className="text-[11px] text-slate-400 leading-snug">
              Releases hardware back to unassigned pool. Safe for re-claiming.
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActionType('delete')}
            className={`p-3 rounded-xl border text-left transition flex flex-col gap-1 ${
              actionType === 'delete'
                ? 'bg-rose-500/15 border-rose-500/50 text-rose-300 shadow-sm'
                : 'bg-slate-800/40 border-slate-700/60 text-slate-400 hover:bg-slate-800'
            }`}
          >
            <div className="flex items-center gap-1.5 font-semibold text-xs text-white">
              <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
              <span>Delete Permanently</span>
            </div>
            <span className="text-[11px] text-slate-400 leading-snug">
              Destroys entity and telemetry data in ThingsBoard backend.
            </span>
          </button>
        </div>

        {/* Action Explanation Notice */}
        {actionType === 'unclaim' ? (
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl mb-5 text-xs text-amber-300/90 leading-relaxed flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <strong>Unclaiming is non-destructive:</strong> This will detach{' '}
              <span className="font-mono text-white">{deviceName}</span> from your customer dashboard.
              You or another technician can reclaim it anytime using the device claim key.
            </div>
          </div>
        ) : (
          <div className="space-y-3 mb-5">
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 leading-relaxed flex items-start gap-2.5">
              <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <strong>Irreversible Action:</strong> Deleting will permanently remove the device
                entity and all recorded timeseries telemetry history from ThingsBoard.
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Type <span className="font-mono text-rose-400 font-bold">DELETE</span> to confirm:
              </label>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="DELETE"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-rose-500 transition"
              />
            </div>
          </div>
        )}

        {/* Error / Success Feedback */}
        {error && (
          <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div>{error}</div>
          </div>
        )}

        {successMessage && (
          <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <div>{successMessage}</div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleExecuteRemoval}
            disabled={isProcessing || !isDeleteConfirmed}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition shadow-lg ${
              actionType === 'delete'
                ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-900/40 disabled:opacity-40'
                : 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-900/40 disabled:opacity-40'
            }`}
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Processing...</span>
              </>
            ) : actionType === 'delete' ? (
              <>
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Device Entity</span>
              </>
            ) : (
              <>
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Unclaim & Release Device</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
