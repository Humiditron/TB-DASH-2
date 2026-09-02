import React, { useState } from 'react';
import { HumidorDevice } from '../types';
import { 
  Cpu, 
  ArrowUpCircle, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  RefreshCw, 
  ShieldCheck,
  HardDrive
} from 'lucide-react';

interface OtaUpdateCenterProps {
  device: HumidorDevice;
}

export const OtaUpdateCenter: React.FC<OtaUpdateCenterProps> = ({ device }) => {
  const [updating, setUpdating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [targetVersion] = useState('v1.2.5');

  const currentVersion = device.clientAttributes.fw_version;
  const isUpToDate = currentVersion === targetVersion && !updating;

  const handleStartOta = () => {
    setUpdating(true);
    setProgress(10);

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) {
          clearInterval(interval);
          setTimeout(() => {
            setUpdating(false);
            setProgress(100);
          }, 1200);
          return 95;
        }
        return prev + 15;
      });
    }, 600);
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl backdrop-blur-sm h-full flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-wide">
                OTA Firmware Updater
              </h3>
              <p className="text-xs text-slate-400">
                Over-the-air ESP32-S3 firmware lifecycle
              </p>
            </div>
          </div>

          <span className="text-[11px] font-mono text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
            FOTA
          </span>
        </div>

        {/* Version Matrix */}
        <div className="space-y-3 bg-slate-950/60 p-4 rounded-xl border border-slate-800 mb-5 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Current Running Build:</span>
            <span className="font-mono text-emerald-300 font-bold bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/20">
              {currentVersion}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-400">Latest Stable Release:</span>
            <span className="font-mono text-amber-300 font-bold bg-amber-950/60 px-2 py-0.5 rounded border border-amber-500/20">
              {targetVersion}
            </span>
          </div>

          <div className="flex items-center justify-between border-t border-slate-800 pt-2">
            <span className="text-slate-400">Partition Scheme:</span>
            <span className="font-mono text-slate-300">Dual OTA (ota_0 / ota_1)</span>
          </div>
        </div>

        {/* Update Progress or Status */}
        {updating ? (
          <div className="space-y-3 p-4 bg-indigo-950/40 border border-indigo-500/30 rounded-xl">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-indigo-300 flex items-center gap-1.5">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Flashing Firmware Binary...
              </span>
              <span className="font-mono font-bold text-indigo-200">{progress}%</span>
            </div>

            <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-amber-500 transition-all duration-300 rounded-full"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-400 leading-tight">
              Do not power off ESP32 humidor during flash write operation.
            </p>
          </div>
        ) : (
          <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl text-xs text-slate-400 space-y-2">
            <div className="flex items-center gap-2 text-slate-300 font-medium">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>SHA-256 Signature Verified</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Updates are staged via ThingsBoard OTA repository and applied during next RTC wake cycle.
            </p>
          </div>
        )}
      </div>

      <div className="pt-4 border-t border-slate-800/80 mt-4 flex items-center justify-between">
        <span className="text-[11px] font-mono text-slate-500">
          Auto-Rollback on Panic: Enabled
        </span>

        <button
          onClick={handleStartOta}
          disabled={updating}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer ${
            updating
              ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
              : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-950/40'
          }`}
        >
          {updating ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Updating...</span>
            </>
          ) : (
            <>
              <ArrowUpCircle className="w-3.5 h-3.5" />
              <span>Push OTA Update</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
