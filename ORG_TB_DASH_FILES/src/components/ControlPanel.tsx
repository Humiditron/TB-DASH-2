import React from 'react';
import { HumidorDevice, DeviceTheme, SharedAttributes } from '../types';
import { thingsboard } from '../services/thingsboard';
import { 
  Sliders, 
  Moon, 
  Sun, 
  EyeOff, 
  Volume2, 
  VolumeX, 
  RefreshCw, 
  Lock, 
  HelpCircle, 
  Zap 
} from 'lucide-react';

interface ControlPanelProps {
  device: HumidorDevice;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({ device }) => {
  const { sleep_interval_sec, device_theme, sound_enabled, auto_update_enabled } = device.sharedAttributes;
  const { has_sd_card, audio_synced } = device.clientAttributes;

  const isAudioLocked = !has_sd_card || !audio_synced;

  const handleUpdate = (attr: Partial<SharedAttributes>) => {
    thingsboard.updateSharedAttributes(device.id, attr);
  };

  const formatInterval = (sec: number) => {
    if (sec < 60) return `${sec}s`;
    const min = Math.floor(sec / 60);
    const remainder = sec % 60;
    if (remainder === 0) return `${min} min (${sec}s)`;
    return `${min}m ${remainder}s (${sec}s)`;
  };

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl shadow-black/20 backdrop-blur-sm">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-white tracking-wide">
              Shared Attribute Control Center
            </h2>
            <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
              TB Sync
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Cloud parameters propagated to ESP32 on next wake-up cycle
          </p>
        </div>
        <Sliders className="w-5 h-5 text-amber-400" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 1. Deep Sleep Interval Slider */}
        <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Deep Sleep Interval
              </label>
              <span className="text-xs font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                {formatInterval(sleep_interval_sec)}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed mb-3">
              Interval the microcontroller enters RTC deep sleep before waking to send telemetry bursts.
            </p>
          </div>

          <div>
            <input
              type="range"
              min="60"
              max="3600"
              step="60"
              value={sleep_interval_sec}
              onChange={(e) => handleUpdate({ sleep_interval_sec: Number(e.target.value) })}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
            />
            <div className="flex justify-between text-[10px] font-mono text-slate-500 mt-1.5">
              <span>1 min (60s)</span>
              <span>15 min (900s)</span>
              <span>60 min (3600s)</span>
            </div>
          </div>
        </div>

        {/* 2. Device Visual Theme */}
        <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                On-Device Display Theme
              </label>
              <span className="text-xs font-mono text-slate-400">
                {device_theme}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed mb-3">
              Sets the color palette rendered on the humidor's integrated OLED/e-Paper display.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {(['DARK', 'LIGHT', 'STEALTH'] as DeviceTheme[]).map((theme) => {
              const isSelected = device_theme === theme;
              return (
                <button
                  key={theme}
                  onClick={() => handleUpdate({ device_theme: theme })}
                  className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold transition-all border ${
                    isSelected
                      ? 'bg-amber-600 border-amber-500 text-slate-950 shadow-md font-bold'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                  }`}
                >
                  {theme === 'DARK' && <Moon className="w-3.5 h-3.5" />}
                  {theme === 'LIGHT' && <Sun className="w-3.5 h-3.5" />}
                  {theme === 'STEALTH' && <EyeOff className="w-3.5 h-3.5" />}
                  <span>{theme}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. Audio Alerts (With HARD LOCKOUT RULE) */}
        <div className={`border rounded-xl p-4 flex flex-col justify-between transition-all ${
          isAudioLocked
            ? 'bg-slate-950/40 border-slate-800/50 opacity-90'
            : 'bg-slate-950/60 border-slate-800/80'
        }`}>
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Audio Tone Prompts
                </label>
                {isAudioLocked && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-950/80 text-amber-300 border border-amber-500/30">
                    <Lock className="w-3 h-3" />
                    LOCKED
                  </span>
                )}
              </div>

              {/* Toggle switch */}
              <button
                disabled={isAudioLocked}
                onClick={() => handleUpdate({ sound_enabled: !sound_enabled })}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  isAudioLocked
                    ? 'bg-slate-800 cursor-not-allowed opacity-60'
                    : sound_enabled
                    ? 'bg-amber-600'
                    : 'bg-slate-700'
                }`}
                title={isAudioLocked ? "Audio locked: SD card required & audio download must be complete." : "Toggle audio"}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    sound_enabled && !isAudioLocked ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            <p className="text-[11px] text-slate-500 leading-relaxed mb-2">
              Plays acoustic chimes on humidity/temperature breaches and button clicks.
            </p>
          </div>

          {/* Lockout Notice or Status */}
          {isAudioLocked ? (
            <div className="mt-2 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px] flex items-start gap-2">
              <HelpCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
              <span>
                <strong>Hard Lockout Enforced:</strong> Requires detected microSD hardware (<span className={has_sd_card ? 'text-emerald-400 font-semibold' : 'text-rose-400 font-semibold'}>{has_sd_card ? 'OK' : 'Missing'}</span>) and verified audio manifest sync (<span className={audio_synced ? 'text-emerald-400 font-semibold' : 'text-rose-400 font-semibold'}>{audio_synced ? 'Synced' : 'Pending'}</span>).
              </span>
            </div>
          ) : (
            <div className="mt-2 flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
              <Volume2 className="w-3.5 h-3.5" />
              <span>Audio drivers active. Assets loaded on SD card.</span>
            </div>
          )}
        </div>

        {/* 4. Auto Update Toggle */}
        <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Background Auto-OTA
              </label>

              <button
                onClick={() => handleUpdate({ auto_update_enabled: !auto_update_enabled })}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  auto_update_enabled ? 'bg-amber-600' : 'bg-slate-700'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    auto_update_enabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            <p className="text-[11px] text-slate-500 leading-relaxed mb-3">
              Automatically flash new firmware packages during scheduled sleep wake cycles when released by the ThingsBoard OTA repository.
            </p>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
            <span>Status: {auto_update_enabled ? 'Auto-Update Enabled' : 'Manual Approval Required'}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
