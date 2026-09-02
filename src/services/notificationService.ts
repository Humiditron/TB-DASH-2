import { HumidorAlarm, HumidorDevice } from '../types';

export class NotificationService {
  private permission: NotificationPermission = 'default';
  private audioContext: AudioContext | null = null;
  private soundEnabled: boolean = true;
  private pushEnabled: boolean = true;

  constructor() {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      this.permission = Notification.permission;
    }
  }

  public async requestPermission(): Promise<NotificationPermission> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      console.warn('[Notifications] Browser does not support Web Notifications API');
      return 'denied';
    }

    try {
      const perm = await Notification.requestPermission();
      this.permission = perm;
      return perm;
    } catch (e) {
      console.error('[Notifications] Failed to request notification permission:', e);
      return 'denied';
    }
  }

  public getPermissionStatus(): NotificationPermission {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      this.permission = Notification.permission;
    }
    return this.permission;
  }

  public isSupported(): boolean {
    return typeof window !== 'undefined' && 'Notification' in window;
  }

  public setSoundEnabled(enabled: boolean) {
    this.soundEnabled = enabled;
  }

  public setPushEnabled(enabled: boolean) {
    this.pushEnabled = enabled;
  }

  public notifyAlarm(alarm: HumidorAlarm) {
    if (!this.pushEnabled) return;

    if (this.soundEnabled) {
      this.playAlertTone(alarm.severity);
    }

    if (this.getPermissionStatus() === 'granted') {
      try {
        const title = `🚨 [${alarm.severity}] ${alarm.type}`;
        const body = `${alarm.deviceName}: ${alarm.message}`;
        const notification = new Notification(title, {
          body,
          icon: '/favicon.ico',
          badge: '/favicon.ico',
          tag: `humid1-alarm-${alarm.id || Date.now()}`,
          requireInteraction: alarm.severity === 'CRITICAL',
        });

        notification.onclick = () => {
          window.focus();
          notification.close();
        };
      } catch (err) {
        console.warn('[Notifications] Notification display error:', err);
      }
    }
  }

  public notifyDeviceClaimed(deviceName: string) {
    if (!this.pushEnabled) return;

    if (this.getPermissionStatus() === 'granted') {
      try {
        new Notification(`🎉 Humidor Unit Claimed!`, {
          body: `Device "${deviceName}" has been successfully provisioned to your ThingsBoard account.`,
          icon: '/favicon.ico',
          tag: `humid1-claim-${Date.now()}`,
        });
      } catch {
        // ignore
      }
    }
  }

  public notifyTest() {
    if (this.getPermissionStatus() === 'granted') {
      new Notification('HUMID1_OS Telemetry Push Alert', {
        body: 'Push notification dispatch verified on self-hosted instance. Active monitoring engaged.',
        icon: '/favicon.ico',
      });
      this.playAlertTone('WARNING');
    }
  }

  private playAlertTone(severity: 'CRITICAL' | 'MAJOR' | 'WARNING') {
    try {
      if (!this.audioContext) {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          this.audioContext = new AudioCtx();
        }
      }
      if (!this.audioContext) return;

      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume();
      }

      const ctx = this.audioContext;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = severity === 'CRITICAL' ? 'sawtooth' : severity === 'MAJOR' ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(severity === 'CRITICAL' ? 880 : 587.33, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(
        severity === 'CRITICAL' ? 440 : 293.66,
        ctx.currentTime + 0.35
      );

      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } catch {
      // Audio context might be restricted before first gesture
    }
  }
}

export const notificationService = new NotificationService();
