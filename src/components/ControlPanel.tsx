import React, { useState } from 'react';
import { HumidorDevice, SharedAttributes } from '../types';
import { Sliders, Volume2, VolumeX, Moon, Sun, EyeOff, RefreshCw, Check, Lock, AlertCircle, Sparkles } from 'lucide-react';

interface ControlPanelProps {
  device: HumidorDevice;
  onUpdateSharedAttributes: (deviceId: string, attributes: Partial<SharedAttributes>) => void;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({ device, onUpdateSharedAttributes }) => {
  const { sharedAttributes, clientAttributes } = device;
  const [isSavedRecently, setIsSavedRecently] = useState(false);

  // Audio Lockout Rule:
  // Disabled if has_sd_card is false OR audio_synced is false
  const isAudioLockedOut四周 = !clientAttributes.has_sd_card || !clientAttributes.audio_synced;

  const handleUpdate = (updates: Partial<SharedAttributes>) => {
    onUpdateSharedAttributes(device.id, updates);
    setIsSavedRecently(true);
    setTimeout(() => setIsSavedRecently(false), 2000);
  };

  const sleepPresets = [
    { label: '5m', sec: 300 },
    { label: '15m (Standard)', sec: 900 },
    { label: '30m', sec: 1800 },
    { label: '60m (Battery Saver)', sec: 3600 },
  ];

  return (
    <div id="humid1-control-panel" className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm mb-6">
      <div className="flex items-center justify-between mb-5 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400">
            <Sliders className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-slate-100 text-sm tracking-wide">
              Hardware Control & Shared Attributes
            </h3>
            <p className="text-xs text-slate-400">
              Synced bidirectionally with ThingsBoard CE & ESP32 RTC memory
            </p>
          </div>
        </div>

        {isSavedRecently && (
          <span className="flex items-center gap-1 text-xs font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-800/40 px-2.5 py-1 rounded-md animate-fade-in">
            <Check className="w-3.5 h-3.5" />
            <span>Synced to ThingsBoard</span>
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 1. Deep Sleep Interval Slider */}
        <div className="space-y-3 bg-slate-950/70 p-4 rounded-xl border border-slate-800">
          <div className="flex items-center justify-between">
            <div>
              <label htmlFor="sleep-interval-slider" className="text-xs font-bold text-slate-200 uppercase tracking-wider block">
                Deep Sleep Duration
              </label>
              <span className="text-[11px] text-slate-400">Time between active sensor wake cycles</span>
            </div>
            <span className="font-mono text-sm font-bold text-amber-400 bg-slate-900 px-2.5 py-1 rounded border border-slate-700">
              {sharedAttributes.sleep_interval_sec}s ({Math.round(sharedAttributes.sleep_interval_sec / 60)} min)
            </span>
          </div>

          <input
            id="sleep-interval-slider"
            type="range"
            min="60"
            max="3600"
            step="60"
            value={sharedAttributes.sleep_interval_sec}
            onChange={(e) => handleUpdate({ sleep_interval_sec: Number(e.target.value) })}
            className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
          />

          {/* Quick Presets */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            {sleepPresets.map((preset) => (
              <button
                key={preset.sec}
                onClick={() => handleUpdate({ sleep_interval_sec: preset.sec })}
                className={`text-[11px] font-semibold px-2 py-1 rounded-md transition border cursor-pointer ${
                  sharedAttributes.sleep_interval_sec === preset.sec
                    ? 'bg-amber-600/90 text-slate-950 border-amber-500 font-bold'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* 2. Device Visual Theme Mode */}
        <div className="space-y-3 bg-slate-950/70 p-4 rounded-xl border border-slate-800">
          <div>
            <span className="text-xs font-bold text-slate-200 uppercase tracking-wider block">
              Device OLED Display Theme
            </span>
            <span className="text-[11px] text-slate-400">Microcontroller on-device screen profile</span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {(
              [
                { id: 'DARK', label: 'Dark Mode', icon: Moon },
                { id: 'LIGHT', label: 'Light Mode', icon: Sun },
                { id: 'STEALTH', label: 'Stealth', icon: EyeOff },
              ] as const
            ).map((theme) => {
              const Icon = theme.icon;
              const isSelected = sharedAttributes.device_theme === theme.id;
              return (
                <button
                  key={theme.id}
                  id={`btn-theme-${theme.id.toLowerCase()}`}
                  onClick={() => handleUpdate({ device_theme: theme.id })}
                  className={`flex flex-col items-center justify-center p-3 rounded-lg border text-xs font-semibold gap-1.5 transition cursor-pointer ${
                    isSelected
                      ? 'bg-amber-600/20 border-amber-500 text-amber-300 font-bold shadow-sm'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-850 hover:text-slate-200'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{theme.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. Audio Alerts with Lockout Logic */}
        <div className="space-y-3 bg-slate-950/70 p-4 rounded-xl border border-slate-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-slate-900 text-slate-300">
                {sharedAttributes.sound_enabled && !isAudioLockedOut四周 ? (
                  <Volume2 className="w-4 h-4 text-emerald-400" />
                ) : (
                  <VolumeX className="w-4 h-4 text-slate-500" />
                )}
              </div>
              <div>
                <span className="text-xs font-bold text-slate-200 uppercase tracking-wider block">
                  Hardware Audio Alerts
                </span>
                <span className="text-[11px] text-slate-400">On-device acoustic prompt chimes</span>
              </div>
            </div>

            {/* Toggle Switch */}
            <button
              id="btn-toggle-sound"
              disabled={isAudioLockedOut四周}
              onClick={() => handleUpdate({ sound_enabled: !sharedAttributes.sound_enabled })}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                isAudioLockedOut四周
                  ? 'bg-slate-800 opacity-60 cursor-not-allowed'
                  : sharedAttributes.sound_enabled
                  ? 'bg-amber-600'
                  : 'bg-slate-800'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  sharedAttributes.sound_enabled && !isAudioLockedOut四周 ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Hard Lockout Tooltip / Alert */}
          {isAudioLockedOut四周 ? (
            <div className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-950/40 border border-amber-800/50 text-amber-300 text-xs">
              <Lock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block">Audio Lockout Enforced:</span>
                <span>
                  Requires both microSD card hardware detection AND completed audio sync manifest
                  before enabling sound drivers.
                </span>
              </div>
            </div>
          ) : (
            <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>MicroSD mounted and audio files verified. Voice prompts active.</span>
            </div>
          )}
        </div>

        {/* 4. Automatic Background OTA Updates */}
        <div className="space-y-3 bg-slate-950/70 p-4 rounded-xl border border-slate-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-slate-900 text-slate-300">
                <RefreshCw className="w-4 h-4 text-amber-500" />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-200 uppercase tracking-wider block">
                  Automatic Firmware OTA
                </span>
                <span className="text-[11px] text-slate-400">Auto-install verified release packages</span>
              </div>
            </div>

            {/* Toggle Switch */}
            <button
              id="btn-toggle-auto-ota"
              onClick={() => handleUpdate({ auto_update_enabled: !sharedAttributes.auto_update_enabled })}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                sharedAttributes.auto_update_enabled ? 'bg-amber-600' : 'bg-slate-800'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  sharedAttributes.auto_update_enabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <div className="text-[11px] text-slate-400">
            {sharedAttributes.auto_update_enabled
              ? 'Device checks for new OTA binary payload during each scheduled deep-sleep wake cycle.'
              : 'Manual approval required in the OTA Update Center below before flashing.'}
          </div>
        </div>
      </div>
    </div>
  );
};
