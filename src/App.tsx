import React, { useState, useEffect } from 'react';
import { useAuth } from 'react-oidc-context';
import { HumidorDevice, HumidorAlarm, TempUnit } from './types';
import { thingsboard, UserProfile } from './services/thingsboard';
import { HeaderTicker } from './components/HeaderTicker';
import { DeviceStatusHeader } from './components/DeviceStatusHeader';
import { ClimateGauges } from './components/ClimateGauges';
import { HistoricalChart } from './components/HistoricalChart';
import { ControlPanel } from './components/ControlPanel';
import { OtaUpdateCenter } from './components/OtaUpdateCenter';
import { AlarmsFeed } from './components/AlarmsFeed';
import { ClaimDeviceModal } from './components/ClaimDeviceModal';
import { ServerConfigModal } from './components/ServerConfigModal';
import { AuthModal } from './components/AuthModal';
import { ApiInspectorModal } from './components/ApiInspectorModal';
import { HumidorTelemetryWidget } from './components/HumidorTelemetryWidget';
import { ProtectedRoute } from './components/ProtectedRoute';
import { getEnv } from './utils/env';
import { Flame, Cpu } from 'lucide-react';

export default function App() {
  const auth = useAuth();
  const [devices, setDevices] = useState<HumidorDevice[]>([]);
  const [alarms, setAlarms] = useState<HumidorAlarm[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [tempUnit, setTempUnit] = useState<TempUnit>('F');
  const [isClaimModalOpen, setIsClaimModalOpen] = useState(false);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isApiInspectorOpen, setIsApiInspectorOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(thingsboard.getCurrentUser());

  const appTitle = getEnv('VITE_APP_TITLE', 'HUMID1_OS');
  const appDesc = getEnv('VITE_APP_DESCRIPTION', 'Precision Humidor Monitoring & Telemetry Stack');

  // Synchronize Authentik OIDC profile without overwriting native ThingsBoard session
  useEffect(() => {
    if (auth.isAuthenticated && auth.user?.profile) {
      // Keep UI profile in sync with Authentik user profile
      const prof = auth.user.profile;
      setCurrentUser({
        id: prof.sub || 'oidc-user',
        name: prof.name || prof.preferred_username || prof.email || 'Humid1 User',
        email: prof.email || 'user@humid1.com',
        role: 'Authenticated User',
      });
    }
  }, [auth.isAuthenticated, auth.user]);

  useEffect(() => {
    const unsubDevices = thingsboard.subscribe((updatedDevices, updatedAlarms) => {
      setDevices(updatedDevices);
      setAlarms(updatedAlarms);

      // Select first device if none selected
      if (!selectedDeviceId && updatedDevices.length > 0) {
        setSelectedDeviceId(updatedDevices[0].id);
      } else if (selectedDeviceId && !updatedDevices.some((d) => d.id === selectedDeviceId)) {
        if (updatedDevices.length > 0) {
          setSelectedDeviceId(updatedDevices[0].id);
        }
      }
    });

    const unsubAuth = thingsboard.subscribeAuth((profile) => {
      setCurrentUser(profile);
    });

    return () => {
      unsubDevices();
      unsubAuth();
    };
  }, [selectedDeviceId]);

  const selectedDevice = devices.find((d) => d.id === selectedDeviceId) || devices[0];

  const handleSelectDevice = (deviceId: string) => {
    setSelectedDeviceId(deviceId);
  };

  const handleToggleTempUnit = () => {
    setTempUnit((prev) => (prev === 'F' ? 'C' : 'F'));
  };

  const userEmail =
    auth.user?.profile?.email ||
    auth.user?.profile?.preferred_username ||
    currentUser?.email ||
    'Authenticated User';

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-amber-500 selection:text-slate-950 font-sans antialiased">
        {/* Top Header with live ticker & device switcher */}
        <HeaderTicker
          devices={devices}
          selectedDeviceId={selectedDeviceId || (devices[0]?.id ?? '')}
          onSelectDevice={handleSelectDevice}
          tempUnit={tempUnit}
          onToggleTempUnit={handleToggleTempUnit}
          activeAlarmCount={alarms.filter((a) => a.status.startsWith('ACTIVE')).length}
          onOpenConfigModal={() => setIsConfigModalOpen(true)}
          onOpenAuthModal={() => setIsAuthModalOpen(true)}
          onOpenClaimModal={() => setIsClaimModalOpen(true)}
          onOpenApiInspector={() => setIsApiInspectorOpen(true)}
          onOpenAlarmsModal={() => {
            const el = document.getElementById('alarms-feed-section');
            if (el) el.scrollIntoView({ behavior: 'smooth' });
          }}
          currentUser={currentUser}
          isDemoMode={false}
        />

        {/* Main Content Area */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
          {devices.length > 0 && selectedDevice ? (
            <>
              {/* Primary Device Status & Quick Metrics */}
              <DeviceStatusHeader
                device={selectedDevice}
                allDevices={devices}
                onSelectDevice={handleSelectDevice}
              />

              {/* Climate Gauges Grid (RH%, Temp, Battery, RSSI) */}
              <ClimateGauges
                device={selectedDevice}
                tempUnit={tempUnit}
                onToggleTempUnit={handleToggleTempUnit}
              />

              {/* Direct @enerlab/thingsboard-client Telemetry & Session Monitor */}
              <HumidorTelemetryWidget
                deviceId={selectedDevice.id}
                serverUrl={thingsboard.getConfig().serverUrl}
                deviceName={selectedDevice.name}
              />

              {/* Historical Telemetry Chart */}
              <HistoricalChart device={selectedDevice} tempUnit={tempUnit} />

              {/* Control Panel (Dual Dial Sliders) & OTA Firmware Updater */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <ControlPanel device={selectedDevice} />
                </div>
                <div className="lg:col-span-1">
                  <OtaUpdateCenter device={selectedDevice} />
                </div>
              </div>

              {/* Live ThingsBoard Alarms Feed */}
              <div id="alarms-feed-section">
                <AlarmsFeed alarms={alarms} />
              </div>
            </>
          ) : (
            <div className="text-center py-20 bg-slate-900/50 border border-slate-800 rounded-3xl max-w-xl mx-auto p-8 shadow-2xl space-y-4">
              <div className="p-4 bg-amber-500/10 text-amber-400 rounded-2xl w-fit mx-auto border border-amber-500/20 shadow-inner">
                <Cpu className="w-10 h-10" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white mb-1">No Claimed Humidor Devices</h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                  Authenticated as <span className="text-emerald-400 font-mono font-medium">{userEmail}</span>. There are no ESP32 telemetry hardware units assigned to this account yet.
                </p>
              </div>

              <div className="pt-3 flex items-center justify-center">
                <button
                  onClick={() => setIsClaimModalOpen(true)}
                  className="px-6 py-3 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs rounded-xl transition-all shadow-md shadow-amber-950/40 flex items-center gap-2 cursor-pointer"
                >
                  + Claim Hardware Device
                </button>
              </div>
            </div>
          )}
        </main>

        {/* Footer */}
        <footer className="border-t border-slate-800/80 bg-slate-950/80 py-6 text-xs text-slate-500 text-center">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Flame className="w-4 h-4 text-amber-500" />
              <span className="font-display font-semibold text-slate-300">{appTitle}</span>
              <span>— {appDesc}</span>
            </div>
            <div className="flex items-center gap-4 text-[11px] font-mono">
              <span>ThingsBoard IoT Integration</span>
              <span>•</span>
              <span>Authentik SSO (2FA)</span>
            </div>
          </div>
        </footer>

        {/* Modals */}
        <ClaimDeviceModal
          isOpen={isClaimModalOpen}
          onClose={() => setIsClaimModalOpen(false)}
          onDeviceClaimed={(newId: string) => {
            setSelectedDeviceId(newId);
          }}
        />
        <ServerConfigModal isOpen={isConfigModalOpen} onClose={() => setIsConfigModalOpen(false)} />
        <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
        <ApiInspectorModal isOpen={isApiInspectorOpen} onClose={() => setIsApiInspectorOpen(false)} />
      </div>
    </ProtectedRoute>
  );
}

export { App };
