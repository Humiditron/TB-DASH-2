import React, { useState, useEffect, useCallback } from 'react';
import {
  HumidorDevice,
  HumidorAlarm,
  TempUnit,
  ThingsBoardConfig,
  SharedAttributes,
  AuthentikUser,
} from './types';
import { tbClient } from './services/tbClient';
import { notificationService } from './services/notificationService';
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
import { ShieldCheck, PlusCircle, Server, Bell, Cpu, RefreshCw, Layers } from 'lucide-react';

export function App() {
  const [currentUser, setCurrentUser] = useState<AuthentikUser | null>(() => tbClient.getCurrentUser());
  const [activeView, setActiveView] = useState<'telemetry' | 'claiming'>('telemetry');
  const [devices, setDevices] = useState<HumidorDevice[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [alarms, setAlarms] = useState<HumidorAlarm[]>([]);
  const [tempUnit, setTempUnit] = useState<TempUnit>('F');
  const [pushEnabled, setPushEnabled] = useState<boolean>(true);
  const [isClaimModalOpen, setIsClaimModalOpen] = useState<boolean>(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState<boolean>(false);
  const [isTokenInspectorOpen, setIsTokenInspectorOpen] = useState<boolean>(false);
  const [isEcosystemOpen, setIsEcosystemOpen] = useState<boolean>(false);
  const [serverUrl, setServerUrl] = useState<string>(tbClient.getServerUrl());
  const [activeToastAlarm, setActiveToastAlarm] = useState<HumidorAlarm | null>(null);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  const selectedDevice = devices.find((d) => d.id === selectedDeviceId) || devices[0];

  // Refresh hardware devices and alarms from ThingsBoard
  const refreshData = useCallback(async () => {
    if (!currentUser) return;
    try {
      const [fetchedDevices, fetchedAlarms] = await Promise.all([
        tbClient.fetchCustomerDevices(),
        tbClient.fetchAlarms(),
      ]);

      setDevices((prev) => {
        // Merge historical points with previously loaded history
        return fetchedDevices.map((newDev) => {
          const prevDev = prev.find((p) => p.id === newDev.id);
          if (prevDev && prevDev.history.length > 0) {
            const lastHist = prevDev.history[prevDev.history.length - 1];
            if (newDev.telemetry.timestamp > lastHist.timestamp) {
              const nowPoint = {
                timestamp: newDev.telemetry.timestamp,
                timeFormatted: new Date(newDev.telemetry.timestamp).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                }),
                dateFormatted: new Date(newDev.telemetry.timestamp).toLocaleDateString([], {
                  month: 'short',
                  day: 'numeric',
                }),
                rh: newDev.telemetry.rh,
                temp: newDev.telemetry.temp,
                tempC: Number((((newDev.telemetry.temp - 32) * 5) / 9).toFixed(1)),
                battery: newDev.telemetry.battery,
                rssi: newDev.telemetry.rssi,
              };
              return {
                ...newDev,
                history: [...prevDev.history.slice(-150), nowPoint],
              };
            }
            return {
              ...newDev,
              history: prevDev.history,
            };
          }
          return newDev;
        });
      });

      if (fetchedDevices.length > 0 && !selectedDeviceId) {
        setSelectedDeviceId(fetchedDevices[0].id);
      }

      setAlarms(fetchedAlarms);

      // Check for any active critical alarm that needs notification
      const criticalAlarm = fetchedAlarms.find((a) => a.severity === 'CRITICAL' && a.status.startsWith('ACTIVE'));
      if (criticalAlarm) {
        setActiveToastAlarm(criticalAlarm);
        notificationService.notifyAlarm(criticalAlarm);
      }
    } catch (e) {
      console.warn('[ThingsBoard Poller] Error fetching live data:', e);
    }
  }, [currentUser, selectedDeviceId]);

  // Initial authentication & callback check
  useEffect(() => {
    const callbackUser = tbClient.checkForSSOCallback();
    if (callbackUser) {
      setCurrentUser(callbackUser);
    }
  }, []);

  // Sync data on login & setup regular telemetry polling interval (every 6 seconds)
  useEffect(() => {
    if (currentUser) {
      refreshData();
      const interval = setInterval(() => {
        refreshData();
      }, 6000);
      return () => clearInterval(interval);
    }
  }, [currentUser, refreshData]);

  // Handle push notification toggle & permission
  const handleTogglePush = async () => {
    if (!pushEnabled) {
      setPushEnabled(true);
      notificationService.setPushEnabled(true);
    } else {
      const status = await notificationService.requestPermission();
      if (status === 'granted') {
        notificationService.notifyTest();
      }
      setPushEnabled(!pushEnabled);
      notificationService.setPushEnabled(!pushEnabled);
    }
  };

  // Update Shared Attributes to device
  const handleUpdateSharedAttributes = async (
    deviceId: string,
    attributes: Partial<SharedAttributes>
  ) => {
    setDevices((prev) =>
      prev.map((dev) => (dev.id === deviceId ? { ...dev, sharedAttributes: { ...dev.sharedAttributes, ...attributes } } : dev))
    );
    await tbClient.saveSharedAttributes(deviceId, attributes);
  };

  // Trigger OTA Update
  const handleTriggerOta = async (deviceId: string) => {
    setDevices((prev) =>
      prev.map((dev) =>
        dev.id === deviceId
          ? {
              ...dev,
              ota: {
                ...dev.ota,
                fw_state: 'DOWNLOADING',
                fw_progress: 15,
              },
            }
          : dev
      )
    );

    // Save manual OTA trigger attribute to ThingsBoard
    await tbClient.saveSharedAttributes(deviceId, { manual_ota_trigger: true });

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
            ? { ...dev, ota: { ...dev.ota, fw_state: 'VERIFIED', fw_progress: 85 } }
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
    }, 5000);
  };

  // Claim Device handler
  const handleClaimDevice = async (deviceName: string, secretKey: string) => {
    const result = await tbClient.claimDevice(deviceName, secretKey);
    if (result.success) {
      if (result.device) {
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
      } else {
        await refreshData();
      }
      return { success: true };
    }
    return { success: false, error: result.error };
  };

  const handleDeviceReclaimed = (deviceId: string) => {
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

  const handleLogout = async () => {
    await tbClient.logout();
    setCurrentUser(null);
    setDevices([]);
    setAlarms([]);
    setActiveView('telemetry');
  };

  // If user is not authenticated, display Authentik SSO & Login screen
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
    isSimulated: false,
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
        onTogglePush={handleTogglePush}
        currentUser={currentUser}
        onLogout={handleLogout}
        activeView={activeView}
        onChangeView={setActiveView}
      />

      {/* 3. Main Dashboard Body */}
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
            {/* If no devices registered under this ThingsBoard account */}
            {devices.length === 0 ? (
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 sm:p-12 text-center shadow-2xl space-y-6 max-w-2xl mx-auto my-8">
                <div className="inline-flex items-center justify-center p-4 rounded-3xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
                  <Cpu className="w-10 h-10" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-xl font-bold text-slate-100">No Humidor Hardware Connected</h2>
                  <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                    Your ThingsBoard account is authenticated, but no humidor hardware is currently provisioned.
                    Claim your physical unit to start logging real-time temperature, humidity, and battery telemetry.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsClaimModalOpen(true)}
                    className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs transition shadow-lg shadow-amber-900/30 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span>Claim Your First Device</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveView('claiming')}
                    className="w-full sm:w-auto px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs transition flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <ShieldCheck className="w-4 h-4 text-amber-400" />
                    <span>Open Claiming Hub</span>
                  </button>

                  <button
                    type="button"
                    disabled={isSyncing}
                    onClick={async () => {
                      setIsSyncing(true);
                      await refreshData();
                      setIsSyncing(false);
                    }}
                    className="w-full sm:w-auto px-4 py-3 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs font-semibold transition flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                    <span>Check Again</span>
                  </button>
                </div>
              </div>
            ) : (
              selectedDevice && (
                <>
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
                    onAcknowledgeAlarm={async (id) => {
                      await tbClient.acknowledgeAlarm(id);
                      setAlarms((prev) =>
                        prev.map((a) => (a.id === id ? { ...a, status: 'ACTIVE_ACK', ackTime: Date.now() } : a))
                      );
                    }}
                    onClearAlarm={async (id) => {
                      await tbClient.clearAlarm(id);
                      setAlarms((prev) => prev.filter((a) => a.id !== id));
                    }}
                  />
                </>
              )
            )}
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
            <span>Hardware Claiming Ready</span>
            <span>•</span>
            <span>Live Telemetry Polling</span>
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
