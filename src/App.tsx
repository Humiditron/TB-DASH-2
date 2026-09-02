import React, { useState, useEffect } from 'react';
import {
  HumidorDevice,
  HumidorAlarm,
  TempUnit,
  ThingsBoardConfig,
  SharedAttributes,
  AuthentikUser,
} from './types';
import { INITIAL_DEVICES, INITIAL_ALARMS } from './services/thingsboard';
import { tbClient } from './services/tbClient';
import { NewsTicker } from './components/NewsTicker';
import { Header } from './components/Header';
import { DiagnosticsBar } from './components/DiagnosticsBar';
import { ClimateGauges } from './components/ClimateGauges';
import { HistoricalChart } from './components/HistoricalChart';
import { ControlPanel } from './components/ControlPanel';
import { OtaCenter } from './components/OtaCenter';
import { AlarmsFeed } from './components/AlarmsFeed';
import { ClaimModal } from './components/ClaimModal';
import { SettingsModal } from './components/SettingsModal';
import { PushNotificationBanner } from './components/PushNotificationBanner';
import { AuthScreen } from './components/AuthScreen';
import { ClaimingHub } from './components/ClaimingHub';
import { TokenInspectorModal } from './components/TokenInspectorModal';
import { EcosystemModal } from './components/EcosystemModal';

export function App() {
  const [currentUser, setCurrentUser] = useState<AuthentikUser | null>(() => tbClient.getCurrentUser());
  const [activeView, setActiveView] = useState<'telemetry' | 'claiming'>('telemetry');
  const [devices, setDevices] = useState<HumidorDevice[]>(INITIAL_DEVICES);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('tb-dev-001');
  const [alarms, setAlarms] = useState<HumidorAlarm[]>(INITIAL_ALARMS);
  const [tempUnit, setTempUnit] = useState<TempUnit>('F');
  const [pushEnabled, setPushEnabled] = useState<boolean>(true);
  const [isClaimModalOpen, setIsClaimModalOpen] = useState<boolean>(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState<boolean>(false);
  const [isTokenInspectorOpen, setIsTokenInspectorOpen] = useState<boolean>(false);
  const [isEcosystemOpen, setIsEcosystemOpen] = useState<boolean>(false);
  const [serverUrl, setServerUrl] = useState<string>(tbClient.getServerUrl());
  const [activeToastAlarm, setActiveToastAlarm] = useState<HumidorAlarm | null>(null);

  const selectedDevice = devices.find((d) => d.id === selectedDeviceId) || devices[0] || INITIAL_DEVICES[0];

  // SSO Callback check on mount
  useEffect(() => {
    const ssoUser = tbClient.checkForSSOCallback();
    if (ssoUser) {
      setCurrentUser(ssoUser);
    }
  }, []);

  // Fetch registered devices when user is logged in
  useEffect(() => {
    if (currentUser) {
      tbClient.fetchCustomerDevices().then((fetched) => {
        if (fetched && fetched.length > 0) {
          setDevices(fetched);
          setSelectedDeviceId(fetched[0].id);
        }
      });
    }
  }, [currentUser]);

  // Live telemetry pulse simulation for active humidor units
  useEffect(() => {
    const interval = setInterval(() => {
      setDevices((prevDevices) =>
        prevDevices.map((dev) => {
          if (dev.status === 'OFFLINE') return dev;

          // Micro variations in temperature & humidity
          const rhDelta = (Math.random() - 0.5) * 0.15;
          const tempDelta = (Math.random() - 0.5) * 0.1;
          const newRh = Number(Math.max(50, Math.min(85, dev.telemetry.rh + rhDelta)).toFixed(1));
          const newTemp = Number(Math.max(55, Math.min(90, dev.telemetry.temp + tempDelta)).toFixed(1));
          const newTimestamp = Date.now();

          // Append to history if interval met
          const lastPoint = dev.history[dev.history.length - 1];
          let updatedHistory = dev.history;
          if (!lastPoint || newTimestamp - lastPoint.timestamp > 60 * 1000) {
            const date = new Date(newTimestamp);
            const newPoint = {
              timestamp: newTimestamp,
              timeFormatted: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              dateFormatted: date.toLocaleDateString([], { month: 'short', day: 'numeric' }),
              rh: newRh,
              temp: newTemp,
              tempC: Number((((newTemp - 32) * 5) / 9).toFixed(1)),
              battery: dev.telemetry.battery,
              rssi: dev.telemetry.rssi,
            };
            updatedHistory = [...dev.history.slice(-200), newPoint];
          }

          return {
            ...dev,
            lastSeen: newTimestamp,
            telemetry: {
              ...dev.telemetry,
              rh: newRh,
              temp: newTemp,
              timestamp: newTimestamp,
            },
            history: updatedHistory,
          };
        })
      );
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  // Update Shared Attributes
  const handleUpdateSharedAttributes = (
    deviceId: string,
    attributes: Partial<SharedAttributes>
  ) => {
    setDevices((prev) =>
      prev.map((dev) => {
        if (dev.id === deviceId) {
          const updatedShared = { ...dev.sharedAttributes, ...attributes };
          return {
            ...dev,
            sharedAttributes: updatedShared,
          };
        }
        return dev;
      })
    );
  };

  // Trigger OTA Update with state machine
  const handleTriggerOta = (deviceId: string) => {
    setDevices((prev) =>
      prev.map((dev) => {
        if (dev.id === deviceId) {
          return {
            ...dev,
            ota: {
              ...dev.ota,
              fw_state: 'DOWNLOADING',
              fw_progress: 15,
            },
          };
        }
        return dev;
      })
    );

    setTimeout(() => {
      setDevices((prev) =>
        prev.map((dev) =>
          dev.id === deviceId
            ? { ...dev, ota: { ...dev.ota, fw_state: 'DOWNLOADING', fw_progress: 55 } }
            : dev
        )
      );
    }, 1200);

    setTimeout(() => {
      setDevices((prev) =>
        prev.map((dev) =>
          dev.id === deviceId
            ? { ...dev, ota: { ...dev.ota, fw_state: 'VERIFIED', fw_progress: 80 } }
            : dev
        )
      );
    }, 2500);

    setTimeout(() => {
      setDevices((prev) =>
        prev.map((dev) =>
          dev.id === deviceId
            ? { ...dev, ota: { ...dev.ota, fw_state: 'UPDATING', fw_progress: 95 } }
            : dev
        )
      );
    }, 3800);

    setTimeout(() => {
      setDevices((prev) =>
        prev.map((dev) => {
          if (dev.id === deviceId) {
            const target = dev.ota.target_version || 'v1.2.0';
            return {
              ...dev,
              clientAttributes: {
                ...dev.clientAttributes,
                fw_version: target,
              },
              ota: {
                ...dev.ota,
                fw_state: 'SUCCESS',
                fw_progress: 100,
              },
            };
          }
          return dev;
        })
      );
    }, 5200);
  };

  // Claim Device handler
  const handleClaimDevice = async (deviceName: string, secretKey: string) => {
    const result = await tbClient.claimDevice(deviceName, secretKey);
    if (result.success && result.device) {
      const newDev = result.device;
      setDevices((prev) => {
        const existingIdx = prev.findIndex((d) => d.id === newDev.id);
        if (existingIdx >= 0) {
          const clone = [...prev];
          clone[existingIdx] = newDev;
          return clone;
        }
        return [...prev, newDev];
      });
      setSelectedDeviceId(newDev.id);
      return { success: true };
    }
    return { success: false, error: result.error };
  };

  const handleDeviceReclaimed = (deviceId: string, _deviceName: string) => {
    setDevices((prev) => {
      const filtered = prev.filter((d) => d.id !== deviceId);
      if (filtered.length > 0 && selectedDeviceId === deviceId) {
        setSelectedDeviceId(filtered[0].id);
      }
      return filtered;
    });
  };

  const handleDeviceClaimedFromHub = (newDev: HumidorDevice) => {
    setDevices((prev) => {
      const idx = prev.findIndex((d) => d.id === newDev.id);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = newDev;
        return updated;
      }
      return [...prev, newDev];
    });
    setSelectedDeviceId(newDev.id);
  };

  const handleLogout = () => {
    tbClient.clearSession();
    setCurrentUser(null);
    setActiveView('telemetry');
  };

  // If user is not authenticated, show the Authentik SSO & Login screen
  if (!currentUser) {
    return (
      <AuthScreen
        onAuthenticated={(user) => {
          setCurrentUser(user);
        }}
        serverUrl={serverUrl}
        onUpdateServerUrl={(url) => setServerUrl(url)}
      />
    );
  }

  const tbConfig: ThingsBoardConfig = {
    serverUrl: serverUrl,
    isConnected: true,
    isSimulated: currentUser.isSimulated,
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-amber-500/30 selection:text-amber-200">
      {/* 1. News-Channel Marquee Device Ticker */}
      <NewsTicker
        devices={devices}
        selectedDeviceId={selectedDeviceId}
        onSelectDevice={setSelectedDeviceId}
        tempUnit={tempUnit}
      />

      {/* 2. Primary Navigation Header */}
      <Header
        devices={devices}
        selectedDeviceId={selectedDeviceId}
        onSelectDevice={setSelectedDeviceId}
        tempUnit={tempUnit}
        onToggleTempUnit={() => setTempUnit(tempUnit === 'F' ? 'C' : 'F')}
        onOpenClaimModal={() => setIsClaimModalOpen(true)}
        onOpenSettingsModal={() => setIsSettingsModalOpen(true)}
        onOpenTokenInspector={() => setIsTokenInspectorOpen(true)}
        onOpenEcosystemModal={() => setIsEcosystemOpen(true)}
        tbConfig={tbConfig}
        pushEnabled={pushEnabled}
        onTogglePush={() => setPushEnabled(!pushEnabled)}
        currentUser={currentUser}
        onLogout={handleLogout}
        activeView={activeView}
        onChangeView={setActiveView}
      />

      {/* 3. Main Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 lg:px-8 py-6">
        {activeView === 'claiming' ? (
          <ClaimingHub
            currentUser={currentUser}
            devices={devices}
            onDeviceClaimed={handleDeviceClaimedFromHub}
            onDeviceReclaimed={handleDeviceReclaimed}
            onSelectDevice={(id) => {
              setSelectedDeviceId(id);
              setActiveView('telemetry');
            }}
            selectedDeviceId={selectedDeviceId}
          />
        ) : (
          <div className="space-y-6 animate-fade-in">
            {/* Hardware & Network Diagnostics Bar */}
            <DiagnosticsBar device={selectedDevice} />

            {/* Live Climate & Battery Gauges */}
            <ClimateGauges device={selectedDevice} tempUnit={tempUnit} />

            {/* Dual-Axis Synchronized Historical Chart */}
            <HistoricalChart device={selectedDevice} tempUnit={tempUnit} />

            {/* Hardware Control Panel (Sleep Slider, Theme, Audio Lockout, Auto-OTA) */}
            <ControlPanel
              device={selectedDevice}
              onUpdateSharedAttributes={handleUpdateSharedAttributes}
            />

            {/* Firmware Lifecycle & Manual OTA Center */}
            <OtaCenter device={selectedDevice} onTriggerOta={handleTriggerOta} />

            {/* ThingsBoard Safety Alarms Feed */}
            <AlarmsFeed
              alarms={alarms}
              onAcknowledgeAlarm={(id) =>
                setAlarms((prev) =>
                  prev.map((a) => (a.id === id ? { ...a, status: 'ACTIVE_ACK', ackTime: Date.now() } : a))
                )
              }
              onClearAlarm={(id) => setAlarms((prev) => prev.filter((a) => a.id !== id))}
            />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-4 px-4 text-center text-xs text-slate-400">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>HUMID1_OS • ThingsBoard CE IoT Humidor Telemetry Stack</p>
          <div className="flex items-center gap-4 text-slate-400 font-mono text-[11px]">
            <span>Authentik SSO Active</span>
            <span>•</span>
            <span>Hardware Claiming Enabled</span>
            <span>•</span>
            <span>PWA / Android TWA Compliant</span>
          </div>
        </div>
      </footer>

      {/* Modals & Toasts */}
      <ClaimModal
        isOpen={isClaimModalOpen}
        onClose={() => setIsClaimModalOpen(false)}
        onClaim={handleClaimDevice}
      />

      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        config={tbConfig}
        onSaveConfig={(cfg) => {
          if (cfg.serverUrl) {
            tbClient.setServerUrl(cfg.serverUrl);
            setServerUrl(cfg.serverUrl);
          }
        }}
        onLogin={async (user, pass) => {
          const res = await tbClient.loginWithCredentials(user, pass);
          if (res.success && res.user) {
            setCurrentUser(res.user);
            return true;
          }
          return false;
        }}
      />

      <TokenInspectorModal
        isOpen={isTokenInspectorOpen}
        onClose={() => setIsTokenInspectorOpen(false)}
        currentUser={currentUser}
        onLogout={handleLogout}
      />

      <EcosystemModal
        isOpen={isEcosystemOpen}
        onClose={() => setIsEcosystemOpen(false)}
      />

      <PushNotificationBanner
        alarm={activeToastAlarm}
        onDismiss={() => setActiveToastAlarm(null)}
      />
    </div>
  );
}

export default App;
