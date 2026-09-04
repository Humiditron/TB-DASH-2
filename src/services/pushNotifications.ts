export type NotificationPermissionState = 'default' | 'granted' | 'denied' | 'unsupported';

export interface HumidorAlertPayload {
  title: string;
  body: string;
  severity: 'CRITICAL' | 'MAJOR' | 'WARNING' | 'INFO';
  deviceId?: string;
  deviceName?: string;
  tag?: string;
  timestamp?: number;
}

class PushNotificationManager {
  private permission: NotificationPermissionState = 'default';
  private registration: ServiceWorkerRegistration | null = null;
  private listeners: Array<(perm: NotificationPermissionState) => void> = [];

  constructor() {
    this.checkInitialState();
  }

  private async checkInitialState() {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      this.permission = 'unsupported';
      this.notifyListeners();
      return;
    }

    this.permission = Notification.permission as NotificationPermissionState;
    this.notifyListeners();

    if ('serviceWorker' in navigator) {
      try {
        const reg = await navigator.serviceWorker.getRegistration();
        if (reg) {
          this.registration = reg;
        }
      } catch (e) {
        console.warn('Could not query service worker registration:', e);
      }
    }
  }

  public getPermission(): NotificationPermissionState {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'unsupported';
    }
    return Notification.permission as NotificationPermissionState;
  }

  public isSupported(): boolean {
    return typeof window !== 'undefined' && 'Notification' in window;
  }

  public isGranted(): boolean {
    return this.getPermission() === 'granted';
  }

  public subscribe(listener: (perm: NotificationPermissionState) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notifyListeners() {
    const current = this.getPermission();
    this.listeners.forEach((l) => l(current));
  }

  public async requestPermission(): Promise<NotificationPermissionState> {
    if (!this.isSupported()) {
      return 'unsupported';
    }

    try {
      const result = await Notification.requestPermission();
      this.permission = result as NotificationPermissionState;
      this.notifyListeners();
      return this.permission;
    } catch (err) {
      console.error('Error requesting notification permission:', err);
      return this.getPermission();
    }
  }

  public async showNotification(payload: HumidorAlertPayload): Promise<boolean> {
    if (!this.isGranted()) {
      return false;
    }

    const { title, body, severity, deviceName, tag } = payload;
    const badgeColor =
      severity === 'CRITICAL' ? '🚨' : severity === 'MAJOR' ? '⚠️' : severity === 'WARNING' ? '⚡' : 'ℹ️';

    const formattedTitle = `${badgeColor} ${title}${deviceName ? ` — ${deviceName}` : ''}`;

    const options: NotificationOptions = {
      body,
      icon: '/pwa-192x192.png',
      badge: '/favicon.svg',
      tag: tag || `humid1-${severity.toLowerCase()}-${Date.now()}`,
      data: {
        timestamp: Date.now(),
        severity,
        url: window.location.origin,
      },
    };

    try {
      // Prefer Service Worker showNotification if active
      if (this.registration && 'showNotification' in this.registration) {
        await this.registration.showNotification(formattedTitle, options);
        return true;
      }

      // Fallback to standard window Notification
      new Notification(formattedTitle, options);
      return true;
    } catch (e) {
      console.warn('Native notification failed, attempting window fallback:', e);
      try {
        new Notification(formattedTitle, options);
        return true;
      } catch (err2) {
        console.error('Failed to display web notification:', err2);
        return false;
      }
    }
  }

  public async sendTestAlert(severity: 'CRITICAL' | 'MAJOR' | 'WARNING' = 'CRITICAL'): Promise<boolean> {
    const alerts: Record<string, HumidorAlertPayload> = {
      CRITICAL: {
        title: 'Critical Humidity Breach',
        body: 'Cabinet RH dropped to 63.8% (Minimum safe limit: 65.0%). Replenish hydration reservoir immediately.',
        severity: 'CRITICAL',
        deviceName: 'Master Vault 01',
      },
      MAJOR: {
        title: 'High Temperature Spike',
        body: 'Cabinet temperature elevated to 76.2°F (Safe ceiling: 75.0°F). Inspect thermoelectric cooling cell.',
        severity: 'MAJOR',
        deviceName: 'Aging Tower B',
      },
      WARNING: {
        title: 'Battery Reserve Low',
        body: 'Hardware battery reserve is at 18%. Connect USB-C fast charger or swap Li-Ion cell.',
        severity: 'WARNING',
        deviceName: 'Travel Case 03',
      },
    };

    return this.showNotification(alerts[severity]);
  }
}

export const pushNotifications = new PushNotificationManager();
