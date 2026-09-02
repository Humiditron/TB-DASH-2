import React, { useState } from 'react';
import { HumidorDevice, FwState } from '../types';
import { ArrowUpCircle, CheckCircle2, RefreshCw, AlertTriangle, ShieldCheck, Sparkles, Terminal } from 'lucide-react';

interface OtaCenterProps {
  device: HumidorDevice;
  onTriggerOta: (deviceId: string) => void;
}

export const OtaCenter: React.FC<OtaCenterProps> = ({ device, onTriggerOta }) => {
  const currentVersion = device.clientAttributes.fw_version;
  const targetVersion = device.ota.target_version || 'v1.2.0';
  const isUpToDate = currentVersion === targetVersion;
  const isUpdating = device.ota.fw_state !== 'IDLE' && device.ota.fw_state !== 'SUCCESS' && device.ota.fw_state !== 'FAILED';

  const getStateDescription = (state: FwState) => {
    switch (state) {
      case 'DOWNLOADING':
        return 'Microcontroller downloading encrypted binary chunk over HTTPS...';
      case 'VERIFIED':
        return 'SHA-256 binary checksum validated. Writing to ESP32 OTA_0 partition...';
      case 'UPDATING':
        return 'Applying firmware image and updating boot flags...';
      case 'SUCCESS':
        return 'Firmware update successful! Microcontroller rebooted on new build.';
      case 'FAILED':
        return 'OTA failed. Rolling back to safe golden boot image.';
      default:
        return 'Standby — Ready for deployment on next RTC wake cycle.';
    }
  };

  return (
    <div id="humid1-ota-center" className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400">
            <ArrowUpCircle className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-slate-100 text-sm tracking-wide">
              Firmware Lifecycle & OTA Center
            </h3>
            <p className="text-xs text-slate-400">
              Direct ThingsBoard CE Binary Deployment (`/api/otaPackage`)
            </p>
          </div>
        </div>

        {/* Release Status Badge */}
        <div className="flex items-center gap-2 font-mono text-xs">
          <span className="text-slate-400">Active Build:</span>
          <span className="px-2 py-0.5 rounded bg-slate-800 text-emerald-400 font-bold border border-slate-700">
            {currentVersion}
          </span>
          <span className="text-slate-500">→</span>
          <span className="text-slate-400">Server Target:</span>
          <span className="px-2 py-0.5 rounded bg-amber-950/60 text-amber-300 font-bold border border-amber-800/50">
            {targetVersion}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left 2 Cols: OTA Progress & Details */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {isUpdating ? (
                  <RefreshCw className="w-4 h-4 text-amber-400 animate-spin" />
                ) : isUpToDate ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Sparkles className="w-4 h-4 text-amber-400" />
                )}
                <span className="text-xs font-bold text-slate-200">
                  OTA State: <span className="font-mono text-amber-400">{device.ota.fw_state}</span>
                </span>
              </div>
              <span className="font-mono text-xs font-bold text-slate-300">
                {device.ota.fw_progress}%
              </span>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-3 bg-slate-900 rounded-full overflow-hidden border border-slate-700">
              <div
                className={`h-full transition-all duration-300 rounded-full ${
                  device.ota.fw_state === 'SUCCESS'
                    ? 'bg-emerald-400'
                    : device.ota.fw_state === 'FAILED'
                    ? 'bg-rose-500'
                    : 'bg-gradient-to-r from-amber-500 to-amber-300'
                }`}
                style={{ width: `${device.ota.fw_progress}%` }}
              />
            </div>

            {/* Step Message */}
            <p className="text-xs font-mono text-slate-400">
              {getStateDescription(device.ota.fw_state)}
            </p>
          </div>

          {/* Firmware Changelog / Metadata */}
          <div className="text-xs text-slate-400 bg-slate-950/40 p-3 rounded-lg border border-slate-800/80 space-y-1">
            <div className="flex items-center gap-1.5 font-semibold text-slate-300">
              <Terminal className="w-3.5 h-3.5 text-amber-500" />
              <span>Release Notes for {targetVersion}</span>
            </div>
            <ul className="list-disc list-inside space-y-0.5 text-[11px] text-slate-400 pl-1">
              <li>Optimized ESP32 RTC fast Wi-Fi re-association (&lt;700ms connection window)</li>
              <li>Enhanced SD card audio manifest synchronization retry backoff</li>
              <li>Added tobacco beetle alert threshold filter rule chain node</li>
            </ul>
          </div>
        </div>

        {/* Right Col: Action Trigger Box */}
        <div className="bg-slate-950/80 p-5 rounded-xl border border-slate-800 flex flex-col justify-between">
          <div>
            <span className="text-xs font-bold text-slate-200 uppercase tracking-wider block mb-1">
              Manual Deployment
            </span>
            <p className="text-xs text-slate-400 mb-4">
              Sends <code className="text-amber-400 bg-slate-900 px-1 py-0.5 rounded">manual_ota_trigger: true</code> to
              ThingsBoard shared attributes. Hardware flashes binary on next wake.
            </p>
          </div>

          <div>
            <button
              id="btn-push-ota"
              disabled={isUpdating || isUpToDate}
              onClick={() => onTriggerOta(device.id)}
              className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition shadow-md cursor-pointer ${
                isUpdating
                  ? 'bg-amber-600/50 text-slate-950 cursor-wait'
                  : isUpToDate
                  ? 'bg-slate-800 text-slate-400 cursor-not-allowed border border-slate-700'
                  : 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 shadow-amber-900/30 hover:shadow-lg'
              }`}
            >
              {isUpdating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Flashing Firmware ({device.ota.fw_progress}%)...</span>
                </>
              ) : isUpToDate ? (
                <>
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Firmware Up-To-Date</span>
                </>
              ) : (
                <>
                  <ArrowUpCircle className="w-4 h-4" />
                  <span>Push OTA Update Now</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
