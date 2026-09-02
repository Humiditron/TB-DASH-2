import React from 'react';
import { useAuth } from 'react-oidc-context';
import { HumidorDevice, TempUnit } from '../types';
import { UserProfile, thingsboard } from '../services/thingsboard';
import { getSafeHost } from '../utils/url';
import { getEnv } from '../utils/env';
import { 
  Battery, 
  Plus, 
  Settings, 
  Bell, 
  Flame, 
  ShieldCheck, 
  User, 
  LogIn, 
  LogOut,
  Terminal
} from 'lucide-react';

interface HeaderTickerProps {
  devices: HumidorDevice[];
  selectedDeviceId: string;
  onSelectDevice: (deviceId: string) => void;
  tempUnit: TempUnit;
  onToggleTempUnit: () => void;
  onOpenClaimModal: () => void;
  onOpenConfigModal: () => void;
  onOpenAlarmsModal: () => void;
  onOpenAuthModal: () => void;
  onOpenApiInspector: () => void;
  activeAlarmCount: number;
  currentUser: UserProfile | null;
  isDemoMode: boolean;
}

export const HeaderTicker: React.FC<HeaderTickerProps> = ({
  devices,
  selectedDeviceId,
  onSelectDevice,
  tempUnit,
  onToggleTempUnit,
  onOpenClaimModal,
  onOpenConfigModal,
  onOpenAlarmsModal,
  onOpenAuthModal,
  onOpenApiInspector,
  activeAlarmCount,
  currentUser,
  isDemoMode,
}) => {
  const auth = useAuth();
  const authUsername =
    (auth.user?.profile?.preferred_username as string) ||
    auth.user?.profile?.name ||
    (auth.user?.profile?.email ? auth.user.profile.email.split('@')[0] : null) ||
    (currentUser ? currentUser.email.split('@')[0] : null);
  const isAuth = auth.isAuthenticated || !!currentUser;

  const handleAuthClick = () => {
    if (isAuth) {
      if (confirm(`Sign out of Authentik SSO (${auth.user?.profile?.email || currentUser?.email || authUsername})?`)) {
        try {
          auth.removeUser();
          auth.signoutRedirect();
        } catch {
          thingsboard.setAuthSession(null);
        }
      }
    } else {
      auth.signinRedirect();
    }
  };

  const formatTemp = (tempF: number) => {
    if (tempUnit === 'C') {
      return `${(((tempF - 32) * 5) / 9).toFixed(1)}°C`;
    }
    return `${tempF.toFixed(1)}°F`;
  };

  const getStatusBadge = (status: HumidorDevice['status']) => {
    switch (status) {
      case 'ONLINE':
        return <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-950/80 text-emerald-400 border border-emerald-500/30">ONLINE</span>;
      case 'SLEEP':
        return <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-400 border border-slate-700">SLEEP</span>;
      case 'OFFLINE':
        return <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-rose-950/80 text-rose-400 border border-rose-500/30">OFFLINE</span>;
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800/80 shadow-lg shadow-black/20">
      {/* Top Scrolling Live News-Channel Ticker */}
      <div className="bg-slate-950 border-b border-slate-800/60 overflow-hidden py-1.5 px-3 flex items-center relative text-xs">
        <div className="flex items-center gap-1.5 text-amber-400 font-bold uppercase tracking-wider text-[11px] pr-3 shrink-0 border-r border-slate-800 z-10 bg-slate-950">
          <span className="relative flex h-2 w-2">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${devices.length > 0 ? 'bg-emerald-400' : 'bg-amber-400'} opacity-75`}></span>
            <span className={`relative inline-flex rounded-full h-2 w-2 ${devices.length > 0 ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
          </span>
          {devices.length > 0 ? 'Live Telemetry' : 'System Ready'}
        </div>

        <div className="overflow-hidden w-full select-none">
          {devices.length > 0 ? (
            <div className="animate-ticker flex items-center gap-6">
              {[...devices, ...devices].map((device, idx) => {
                const isSelected = device.id === selectedDeviceId;
                const isDry = device.telemetry.rh < 65;
                const isWet = device.telemetry.rh > 75;
                const isHot = device.telemetry.temp > 75;

                return (
                  <button
                    key={`${device.id}-${idx}`}
                    onClick={() => onSelectDevice(device.id)}
                    className={`inline-flex items-center gap-2.5 px-3 py-1 rounded-md transition-all text-xs font-medium cursor-pointer ${
                      isSelected
                        ? 'bg-amber-500/15 border border-amber-500/40 text-amber-200 shadow-sm'
                        : 'bg-slate-900/80 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white'
                    }`}
                  >
                    <span className="font-semibold text-slate-100">{device.name}</span>
                    {getStatusBadge(device.status)}

                    <span className="text-slate-600">|</span>

                    <span className={`font-mono font-medium ${isDry ? 'text-blue-400 font-bold' : isWet ? 'text-rose-400 font-bold' : 'text-emerald-400'}`}>
                      RH {device.telemetry.rh.toFixed(1)}%
                    </span>

                    <span className={`font-mono ${isHot ? 'text-amber-400 font-bold' : 'text-slate-300'}`}>
                      {formatTemp(device.telemetry.temp)}
                    </span>

                    <span className="inline-flex items-center gap-1 font-mono text-slate-400">
                      <Battery className="w-3 h-3 text-slate-400" />
                      {device.telemetry.battery}%
                    </span>

                    <span className="font-mono text-slate-500 text-[10px]">
                      {device.telemetry.rssi} dBm
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="px-3 text-slate-400 font-mono text-xs flex items-center gap-2">
              <span className="text-slate-500">SSO AUTHENTICATED:</span>
              <span className="text-emerald-400 font-bold">{auth.user?.profile?.email || authUsername || 'Active Session'}</span>
              <span className="text-slate-600">•</span>
              <span>No active humidor telemetry streams detected. Claim a hardware device to start monitoring.</span>
            </div>
          )}
        </div>
      </div>

      {/* Main Navigation Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand & Identity */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-600 via-amber-700 to-amber-900 flex items-center justify-center shadow-md shadow-amber-950/40 border border-amber-500/30">
            <Flame className="w-5 h-5 text-amber-200" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-display font-bold text-lg text-amber-100 tracking-wider">
                {getEnv('VITE_APP_TITLE', 'HUMID1_OS')}
              </span>
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                SSO Active
              </span>
            </div>
            <span className="text-[11px] text-slate-400 tracking-tight font-mono">
              {getSafeHost(getEnv('VITE_AUTHENTIK_URL', ''), 'SSO')} • {authUsername || 'Authenticated'}
            </span>
          </div>
        </div>

        {/* Center / Right Controls */}
        <div className="flex items-center gap-2.5 sm:gap-3.5">
          {/* Quick Unit Switcher */}
          <button
            onClick={onToggleTempUnit}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 hover:border-slate-600 text-xs font-mono text-slate-200 transition-colors shadow-sm cursor-pointer"
            title="Toggle temperature scale"
          >
            <span className={tempUnit === 'F' ? 'text-amber-400 font-bold' : 'text-slate-400'}>°F</span>
            <span className="text-slate-600">/</span>
            <span className={tempUnit === 'C' ? 'text-amber-400 font-bold' : 'text-slate-400'}>°C</span>
          </button>

          {/* Alarms Button */}
          <button
            onClick={onOpenAlarmsModal}
            className="relative p-2 rounded-lg bg-slate-800 border border-slate-700 hover:border-slate-600 text-slate-300 hover:text-white transition-colors cursor-pointer"
            title="View active alarms"
          >
            <Bell className="w-4 h-4" />
            {activeAlarmCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-600 text-[10px] font-bold text-white shadow-sm ring-2 ring-slate-900 animate-pulse">
                {activeAlarmCount}
              </span>
            )}
          </button>

          {/* Claim Device Action */}
          <button
            onClick={onOpenClaimModal}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-slate-950 font-semibold text-xs transition-all shadow-md shadow-amber-950/30 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Claim Device</span>
            <span className="sm:hidden">Claim</span>
          </button>

          {/* Login / Profile Button */}
          <button
            onClick={handleAuthClick}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
              isAuth
                ? 'bg-emerald-950/70 border-emerald-500/40 text-emerald-300 hover:bg-emerald-900/80 hover:border-emerald-500'
                : 'bg-slate-800 border-slate-700 hover:border-amber-500/50 text-slate-200 hover:text-white'
            }`}
            title={isAuth ? `Authenticated as ${auth.user?.profile?.email || authUsername}. Click to Sign Out.` : 'Sign In with Authentik'}
          >
            {isAuth ? (
              <>
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span className="max-w-[120px] truncate hidden sm:inline font-mono">{authUsername}</span>
                <LogOut className="w-3 h-3 text-slate-400 ml-0.5 hover:text-rose-400" />
              </>
            ) : (
              <>
                <LogIn className="w-3.5 h-3.5 text-amber-400" />
                <span>Sign In (SSO)</span>
              </>
            )}
          </button>

          {/* API Transaction Inspector */}
          <button
            onClick={onOpenApiInspector}
            className="p-2 rounded-lg bg-slate-800 border border-slate-700 hover:border-amber-500/50 text-amber-400 hover:text-amber-300 transition-colors cursor-pointer flex items-center gap-1.5 px-2.5 text-xs font-mono"
            title="Inspect API Transactions, Endpoints & JSON Payloads"
          >
            <Terminal className="w-4 h-4" />
            <span className="hidden md:inline">API Logs</span>
          </button>

          {/* Settings / Connection Config */}
          <button
            onClick={onOpenConfigModal}
            className="p-2 rounded-lg bg-slate-800 border border-slate-700 hover:border-slate-600 text-slate-300 hover:text-white transition-colors cursor-pointer"
            title="ThingsBoard Server Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
