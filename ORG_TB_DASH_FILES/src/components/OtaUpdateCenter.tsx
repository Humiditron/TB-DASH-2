import React from 'react';
import { HumidorDevice } from '../types';
import { thingsboard } from '../services/thingsboard';
import { 
  DownloadCloud, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles, 
  Cpu, 
  Loader2, 
  ArrowUpCircle 
} from 'lucide-react';

interface OtaUpdateCenterProps {
  device: HumidorDevice;
}

export const OtaUpdateCenter: React.FC<OtaUpdateCenterProps> = ({ device }) => {
  const currentVersion = device.clientAttributes.fw_version;
  const latestVersion = device.latestFwAvailable;
  const hasUpdate = currentVersion !== latestVersion;
  const isUpdating = device.fw_state !== 'IDLE' && device.fw_state !== 'SUCCESS' && device.fw_state !== 'FAILED';

  const handlePushOta = () => {
    thingsboard.triggerManualOta(device.id);
  };

  const getStatusText = () => {
    switch (device.fw_state) {
      case 'QUEUED':
        return 'Update Queued (Waiting for next ESP32 wake window)';
      case 'DOWNLOADING':
        return `Downloading binary payload over HTTPS... (${device.fw_progress}%)`;
      case 'VERIFIED':
        return 'SHA-256 Checksum & Signature Verified';
      case 'UPDATING':
        return 'Flashing ESP32 Flash Memory & Rebooting...';
      case 'SUCCESS':
        return `Firmware updated successfully to ${device.clientAttributes.fw_version}!`;
      case 'FAILED':
        return 'OTA flash failed. Check battery and network.';
      default:
        return hasUpdate ? 'New Firmware Build Available' : 'Device Firmware Up-to-Date';
    }
  };

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl shadow-black/20 backdrop-blur-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-white tracking-wide">
              OTA Firmware Update Management
            </h2>
            <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
              ESP-IDF OTA
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Deliver firmware binaries over-the-air directly from ThingsBoard package repository
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            disabled={isUpdating || !hasUpdate}
            onClick={handlePushOta}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md ${
              isUpdating
                ? 'bg-slate-800 text-slate-400 border border-slate-700 cursor-not-allowed'
                : hasUpdate
                ? 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 shadow-amber-950/40 hover:scale-[1.02] active:scale-[0.98]'
                : 'bg-slate-800 text-slate-400 border border-slate-700 cursor-default'
            }`}
          >
            {isUpdating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                <span>Flashing OTA...</span>
              </>
            ) : hasUpdate ? (
              <>
                <DownloadCloud className="w-4 h-4" />
                <span>Push OTA Update Now</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Latest Version Active</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Firmware Comparison Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
        <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3.5">
          <span className="text-[11px] text-slate-500 block uppercase font-mono">Installed Version</span>
          <span className="text-lg font-bold font-mono text-slate-100">{currentVersion}</span>
        </div>

        <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3.5">
          <span className="text-[11px] text-slate-500 block uppercase font-mono">Latest ThingsBoard Release</span>
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold font-mono text-amber-400">{latestVersion}</span>
            {hasUpdate && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                UPDATE READY
              </span>
            )}
          </div>
        </div>

        <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3.5">
          <span className="text-[11px] text-slate-500 block uppercase font-mono">OTA State Machine</span>
          <span className="text-sm font-semibold font-mono text-slate-300">{device.fw_state}</span>
        </div>
      </div>

      {/* Live OTA Progress Bar and State Monitor */}
      <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-4">
        <div className="flex items-center justify-between text-xs mb-2">
          <span className="font-semibold text-slate-300 flex items-center gap-2">
            {isUpdating && <span className="h-2 w-2 rounded-full bg-amber-400 animate-ping" />}
            {getStatusText()}
          </span>
          <span className="font-mono font-bold text-amber-400">{device.fw_progress}%</span>
        </div>

        <div className="h-3 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-800">
          <div
            className={`h-full transition-all duration-500 rounded-full ${
              device.fw_state === 'SUCCESS'
                ? 'bg-emerald-500'
                : device.fw_state === 'FAILED'
                ? 'bg-rose-500'
                : 'bg-gradient-to-r from-amber-600 via-amber-500 to-amber-400'
            }`}
            style={{ width: `${Math.max(isUpdating ? 5 : 0, device.fw_progress)}%` }}
          />
        </div>

        {isUpdating && (
          <p className="text-[11px] text-slate-500 mt-2 font-mono">
            * Next wake cycle payload will download image partition, verify cryptographic hash, and boot new application firmware automatically.
          </p>
        )}
      </div>
    </div>
  );
};
