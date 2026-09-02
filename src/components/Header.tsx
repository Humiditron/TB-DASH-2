import React from 'react';
import { HumidorDevice, TempUnit, ThingsBoardConfig, AuthentikUser } from '../types';
import {
  PlusCircle,
  Bell,
  BellOff,
  Settings,
  ShieldCheck,
  Cpu,
  Layers,
  Activity,
  LogOut,
  Sliders,
  Sparkles,
  MessageSquare,
  ExternalLink,
} from 'lucide-react';
import { APP_CONFIG } from '../config/env';

interface HeaderProps {
  devices: HumidorDevice[];
  selectedDeviceId: string;
  onSelectDevice: (id: string) => void;
  tempUnit: TempUnit;
  onToggleTempUnit: () => void;
  onOpenClaimModal: () => void;
  onOpenSettingsModal: () => void;
  onOpenTokenInspector: () => void;
  onOpenEcosystemModal: () => void;
  tbConfig: ThingsBoardConfig;
  pushEnabled: boolean;
  onTogglePush: () => void;
  currentUser: AuthentikUser | null;
  onLogout: () => void;
  activeView: 'telemetry' | 'claiming';
  onChangeView: (view: 'telemetry' | 'claiming') => void;
}

export const Header: React.FC<HeaderProps> = ({
  devices,
  selectedDeviceId,
  onSelectDevice,
  tempUnit,
  onToggleTempUnit,
  onOpenClaimModal,
  onOpenSettingsModal,
  onOpenTokenInspector,
  onOpenEcosystemModal,
  tbConfig,
  pushEnabled,
  onTogglePush,
  currentUser,
  onLogout,
  activeView,
  onChangeView,
}) => {
  const selectedDevice = devices.find((d) => d.id === selectedDeviceId);

  return (
    <header id="humid1-header" className="bg-slate-900/95 backdrop-blur border-b border-slate-800 px-4 lg:px-8 py-3 sticky top-0 z-30 shadow-md">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        {/* Brand, Logo & Navigation Tabs */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 p-0.5 shadow-lg shadow-amber-900/20 flex items-center justify-center">
                <div className="w-full h-full bg-slate-950 rounded-[9px] flex items-center justify-center">
                  <span className="text-amber-500 font-serif font-black text-base tracking-tighter">H1</span>
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="font-serif font-bold text-base text-slate-100 tracking-wide flex items-center gap-1">
                    HUMID1<span className="text-amber-400 font-sans text-xs font-semibold px-1.5 py-0.5 rounded bg-amber-950/60 border border-amber-800/50">_OS</span>
                  </h1>
                </div>
                <p className="text-[11px] text-slate-400 font-medium hidden sm:block">
                  Authentik SSO & ThingsBoard CE Engine
                </p>
              </div>
            </div>

            {/* Main Navigation Views */}
            <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-semibold">
              <button
                type="button"
                id="nav-telemetry"
                onClick={() => onChangeView('telemetry')}
                className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 cursor-pointer ${
                  activeView === 'telemetry'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Activity className="w-3.5 h-3.5" />
                <span>Telemetry & Controls</span>
              </button>

              <button
                type="button"
                id="nav-claiming"
                onClick={() => onChangeView('claiming')}
                className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 cursor-pointer ${
                  activeView === 'claiming'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Claim & Devices ({devices.length})</span>
              </button>
            </div>
          </div>
        </div>

        {/* Center / Right Action Controls */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
          {/* Device Selector Dropdown (When in Telemetry View) */}
          {activeView === 'telemetry' && devices.length > 0 && (
            <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-xl p-1">
              <select
                id="device-selector"
                value={selectedDeviceId}
                onChange={(e) => onSelectDevice(e.target.value)}
                className="bg-slate-900 text-slate-200 text-xs font-semibold rounded-lg px-2.5 py-1 border border-slate-700 focus:outline-none focus:border-amber-500 cursor-pointer"
              >
                {devices.map((dev) => (
                  <option key={dev.id} value={dev.id}>
                    {dev.name} ({dev.status})
                  </option>
                ))}
              </select>

              <button
                id="btn-claim-device-header"
                onClick={onOpenClaimModal}
                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 text-amber-300 text-xs font-semibold transition cursor-pointer"
                title="Claim new humidor hardware"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Claim</span>
              </button>
            </div>
          )}

          {/* Unit Switcher */}
          <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl p-0.5">
            <button
              id="btn-temp-f"
              onClick={() => tempUnit !== 'F' && onToggleTempUnit()}
              className={`px-2 py-1 text-xs font-bold rounded-lg transition cursor-pointer ${
                tempUnit === 'F'
                  ? 'bg-amber-600 text-slate-950 shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              °F
            </button>
            <button
              id="btn-temp-c"
              onClick={() => tempUnit !== 'C' && onToggleTempUnit()}
              className={`px-2 py-1 text-xs font-bold rounded-lg transition cursor-pointer ${
                tempUnit === 'C'
                  ? 'bg-amber-600 text-slate-950 shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              °C
            </button>
          </div>

          {/* Web Push Notification Toggle */}
          <button
            id="btn-toggle-push"
            onClick={onTogglePush}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-semibold transition cursor-pointer ${
              pushEnabled
                ? 'bg-emerald-950/70 border-emerald-700/60 text-emerald-300'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
            title={pushEnabled ? 'Push notifications active' : 'Enable Web Push notifications'}
          >
            {pushEnabled ? <Bell className="w-3.5 h-3.5 text-emerald-400" /> : <BellOff className="w-3.5 h-3.5 text-slate-400" />}
            <span className="hidden lg:inline">{pushEnabled ? 'Alerts: ON' : 'Alerts: OFF'}</span>
          </button>

          {/* Domain Map / Ecosystem Directory Trigger */}
          <button
            id="btn-open-ecosystem"
            onClick={onOpenEcosystemModal}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-amber-500/50 text-slate-300 hover:text-amber-300 text-xs font-semibold transition cursor-pointer"
            title="View Ecosystem Domain Map (5 Subdomains)"
          >
            <Layers className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Domain Map</span>
          </button>

          {/* Direct Chatto Concierge / Live Support */}
          <a
            id="btn-chat-support"
            href={APP_CONFIG.domains.chatUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-purple-950/50 border border-purple-800/60 hover:bg-purple-900/60 text-purple-200 text-xs font-semibold transition cursor-pointer"
            title="Open Chatto Live Technical Concierge"
          >
            <MessageSquare className="w-3.5 h-3.5 text-purple-400" />
            <span className="hidden sm:inline">Support</span>
          </a>

          {/* Authentik User Token & Profile Badge */}
          <button
            id="btn-token-inspector"
            onClick={onOpenTokenInspector}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white text-xs font-semibold transition cursor-pointer"
            title="Inspect Authentik SSO Token & Claims"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
            <span className="max-w-[110px] truncate hidden sm:inline">
              {currentUser?.name || currentUser?.email || 'Customer'}
            </span>
          </button>

          {/* Server Config Trigger */}
          <button
            id="btn-open-settings"
            onClick={onOpenSettingsModal}
            className="p-2 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white text-xs font-semibold transition cursor-pointer"
            title="ThingsBoard Server & API Settings"
          >
            <Settings className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {/* Logout Trigger */}
          <button
            id="btn-logout"
            onClick={onLogout}
            className="p-2 rounded-xl bg-slate-950 border border-slate-800 hover:border-rose-800 hover:text-rose-400 text-slate-400 transition cursor-pointer"
            title="Sign out of Authentik / ThingsBoard"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
};
