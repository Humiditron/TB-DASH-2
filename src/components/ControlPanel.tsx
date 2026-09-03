import React, { useState } from 'react';
import { HumidorDevice } from '../types';
import { thingsboard } from '../services/thingsboard';
import { 
  Sliders, 
  Moon, 
  Volume2, 
  VolumeX, 
  Sun, 
  Save, 
  Check, 
  Zap,
  Terminal,
  Radio,
  Clock,
  RefreshCw,
  AlertCircle
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
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // RPC Command states
  const [rpcLoading, setRpcLoading] = useState<string | null>(null);
  const [rpcStatus, setRpcStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const themeNames = ['Classic Amber', 'Midnight Dark', 'Cuban Cigar Brown', 'Emerald Vintage'];

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await thingsboard.updateSharedAttributes(device.id, {
        sleep_interval_min: sleepMin,
        theme_idx: themeIndex,
        audio_lockout: audioLockout,
      });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err: any) {
      console.warn('Failed to save shared attributes:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleTriggerRpc = async (method: string, params: any = {}) => {
    setRpcLoading(method);
    setRpcStatus(null);
    try {
      const res = await thingsboard.sendRpcCommand(device.id, method, params, true, 4000);
      if (res.success) {
        setRpcStatus({
          type: 'success',
          message: `RPC "${method}" acknowledged by hardware${res.data ? `: ${JSON.stringify(res.data)}` : '.'}`,
        });
      } else {
        setRpcStatus({
          type: 'error',
          message: res.error || `RPC "${method}" timed out. Hardware may be sleeping.`,
        });
      }
    } catch (err: any) {
      setRpcStatus({
        type: 'error',
        message: err.message || `RPC "${method}" failed to execute`,
      });
    } finally {
      setRpcLoading(null);
      setTimeout(() => setRpcStatus(null), 6000);
    }
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
                Hardware Device Control & RPC
              </h3>
              <p className="text-xs text-slate-400">
                Manage ESP32 RTC sleep intervals, shared attributes & live RPCs
              </p>
            </div>
          </div>

          {savedSuccess && (
            <span className="inline-flex items-center gap-1 text-xs text-emerald-400 font-semibold bg-emerald-950/80 px-2.5 py-1 rounded-lg border border-emerald-500/30 animate-fadeIn">
              <Check className="w-3.5 h-3.5" /> Synced to Server
            </span>
          )}
        </div>

        <form onSubmit={handleSave} className="space-y-4">
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

          {/* 4. Live ThingsBoard RPC Triggers */}
          <div className="space-y-2 bg-slate-950/60 p-4 rounded-xl border border-slate-800">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-amber-400" />
                <span>Remote RPC Hardware Commands</span>
              </label>
              <span className="text-[10px] font-mono text-slate-500">ThingsBoard RPC Engine</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
              <button
                type="button"
                disabled={!!rpcLoading}
                onClick={() => handleTriggerRpc('ping')}
                className="px-2.5 py-1.5 bg-slate-900 border border-slate-700 hover:border-amber-500/40 text-slate-200 rounded-lg text-xs font-mono flex items-center justify-center gap-1.5 transition disabled:opacity-50 cursor-pointer"
              >
                {rpcLoading === 'ping' ? <RefreshCw className="w-3 h-3 animate-spin text-amber-400" /> : <Radio className="w-3 h-3 text-amber-400" />}
                <span>Ping RTC</span>
              </button>

              <button
                type="button"
                disabled={!!rpcLoading}
                onClick={() => handleTriggerRpc('testBuzzer', { durationMs: 500 })}
                className="px-2.5 py-1.5 bg-slate-900 border border-slate-700 hover:border-amber-500/40 text-slate-200 rounded-lg text-xs font-mono flex items-center justify-center gap-1.5 transition disabled:opacity-50 cursor-pointer"
              >
                {rpcLoading === 'testBuzzer' ? <RefreshCw className="w-3 h-3 animate-spin text-amber-400" /> : <Volume2 className="w-3 h-3 text-amber-400" />}
                <span>Beep Buzzer</span>
              </button>

              <button
                type="button"
                disabled={!!rpcLoading}
                onClick={() => handleTriggerRpc('syncTime', { epoch: Math.floor(Date.now() / 1000) })}
                className="px-2.5 py-1.5 bg-slate-900 border border-slate-700 hover:border-amber-500/40 text-slate-200 rounded-lg text-xs font-mono flex items-center justify-center gap-1.5 transition disabled:opacity-50 cursor-pointer col-span-2 sm:col-span-1"
              >
                {rpcLoading === 'syncTime' ? <RefreshCw className="w-3 h-3 animate-spin text-amber-400" /> : <Clock className="w-3 h-3 text-amber-400" />}
                <span>Sync Clock</span>
              </button>
            </div>

            {/* RPC Feedback Message */}
            {rpcStatus && (
              <div
                className={`mt-2 p-2 rounded-lg text-[11px] font-mono flex items-center gap-1.5 ${
                  rpcStatus.type === 'success'
                    ? 'bg-emerald-950/70 border border-emerald-500/30 text-emerald-300'
                    : 'bg-amber-950/70 border border-amber-500/30 text-amber-300'
                }`}
              >
                {rpcStatus.type === 'success' ? <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> : <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                <span className="truncate">{rpcStatus.message}</span>
              </div>
            )}
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
          disabled={isSaving}
          className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs rounded-xl transition-all shadow-md shadow-amber-950/30 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
        >
          {isSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          <span>Save Attributes</span>
        </button>
      </div>
    </div>
  );
};
