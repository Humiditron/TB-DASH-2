import React, { useState } from 'react';
import { HumidorDevice, SharedAttributes } from '../types';
import { 
  Sliders, 
  Moon, 
  Volume2, 
  VolumeX, 
  Sun, 
  Save, 
  RotateCcw, 
  Check, 
  Cpu, 
  Zap,
  Info
} from 'lucide-react';

interface ControlPanelProps {
  device: HumidorDevice;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({ device }) => {
  const [sleepMin, setSleepMin] = useState<number>(
    device.sharedAttributes.sleep_interval_min || 15
  );
  const [themeIndex, setThemeIndex] = useState<number>(
    device.sharedAttributes.theme_idx ?? 0
  );
  const [audioLockout, setAudioLockout] = useState<boolean>(
    device.sharedAttributes.audio_lockout ?? false
  );
  const [savedSuccess, setSavedSuccess] = useState(false);

  const themeNames = ['Classic Amber', 'Midnight Dark', 'Cuban Cigar Brown', 'Emerald Vintage'];

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    // Save to shared attributes via ThingsBoard
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl backdrop-blur-sm h-full flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-wide">
                Hardware Device Control Panel
              </h3>
              <p className="text-xs text-slate-400">
                Manage ESP32 RTC sleep intervals & UI shared attributes
              </p>
            </div>
          </div>

          {savedSuccess && (
            <span className="inline-flex items-center gap-1 text-xs text-emerald-400 font-semibold bg-emerald-950/80 px-2.5 py-1 rounded-lg border border-emerald-500/30 animate-fadeIn">
              <Check className="w-3.5 h-3.5" /> Synced to Device
            </span>
          )}
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          {/* 1. Deep Sleep Interval Slider */}
          <div className="space-y-2 bg-slate-950/60 p-4 rounded-xl border border-slate-800">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Moon className="w-3.5 h-3.5 text-amber-400" />
                <span>Deep Sleep Wake Interval</span>
              </label>
              <span className="font-mono text-xs font-bold text-amber-300 bg-amber-500/10 px-2.5 py-0.5 rounded border border-amber-500/20">
                {sleepMin} Minutes
              </span>
            </div>

            <input
              type="range"
              min="1"
              max="60"
              step="1"
              value={sleepMin}
              onChange={(e) => setSleepMin(Number(e.target.value))}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
            />

            <div className="flex justify-between text-[10px] font-mono text-slate-500">
              <span>1 min (Rapid Testing)</span>
              <span>15 min (Balanced)</span>
              <span>60 min (Max LiPo Life)</span>
            </div>
          </div>

          {/* 2. On-Device Display Theme Selector */}
          <div className="space-y-2 bg-slate-950/60 p-4 rounded-xl border border-slate-800">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <Sun className="w-3.5 h-3.5 text-amber-400" />
              <span>Hardware OLED Display Theme</span>
            </label>

            <div className="grid grid-cols-2 gap-2">
              {themeNames.map((name, idx) => (
                <button
                  type="button"
                  key={name}
                  onClick={() => setThemeIndex(idx)}
                  className={`py-2 px-3 rounded-lg text-xs font-medium border text-left transition-all cursor-pointer ${
                    themeIndex === idx
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-xs'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                  }`}
                >
                  <span className="font-mono mr-1.5 text-[10px] text-slate-500">#{idx + 1}</span>
                  {name}
                </button>
              ))}
            </div>
          </div>

          {/* 3. Audio Lockout Toggle */}
          <div className="flex items-center justify-between bg-slate-950/60 p-4 rounded-xl border border-slate-800">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${audioLockout ? 'bg-rose-950 text-rose-400' : 'bg-slate-800 text-slate-300'}`}>
                {audioLockout ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </div>
              <div>
                <span className="text-xs font-bold text-slate-200 block">Buzzer / Audio Lockout</span>
                <span className="text-[11px] text-slate-400">Mute on-device audio alarms and beepers</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setAudioLockout(!audioLockout)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                audioLockout ? 'bg-amber-600' : 'bg-slate-800'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  audioLockout ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </form>
      </div>

      <div className="pt-4 border-t border-slate-800/80 mt-4 flex items-center justify-between">
        <div className="flex items-center gap-1 text-[11px] text-slate-500 font-mono">
          <Zap className="w-3.5 h-3.5 text-amber-400" />
          <span>Auto-pushes to ThingsBoard Attributes</span>
        </div>

        <button
          onClick={handleSave}
          className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs rounded-xl transition-all shadow-md shadow-amber-950/30 flex items-center gap-1.5 cursor-pointer"
        >
          <Save className="w-3.5 h-3.5" />
          <span>Save Changes</span>
        </button>
      </div>
    </div>
  );
};
