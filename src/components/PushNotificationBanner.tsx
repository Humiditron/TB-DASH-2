import React from 'react';
import { HumidorAlarm } from '../types';
import { Bell, X, AlertOctagon, AlertTriangle, AlertCircle } from 'lucide-react';

interface PushNotificationToastProps {
  alarm: HumidorAlarm | null;
  onDismiss: () => void;
}

export const PushNotificationBanner: React.FC<PushNotificationToastProps> = ({
  alarm,
  onDismiss,
}) => {
  if (!alarm) return null;

  const getSeverityStyle = () => {
    switch (alarm.severity) {
      case 'CRITICAL':
        return {
          border: 'border-rose-600',
          bg: 'bg-rose-950/90 text-rose-100',
          icon: AlertOctagon,
          iconColor: 'text-rose-400',
        };
      case 'MAJOR':
        return {
          border: 'border-amber-600',
          bg: 'bg-amber-950/90 text-amber-100',
          icon: AlertTriangle,
          iconColor: 'text-amber-400',
        };
      default:
        return {
          border: 'border-yellow-600',
          bg: 'bg-yellow-950/90 text-yellow-100',
          icon: AlertCircle,
          iconColor: 'text-yellow-400',
        };
    }
  };

  const style = getSeverityStyle();
  const Icon = style.icon;

  return (
    <div className="fixed bottom-5 right-5 z-50 max-w-sm w-full p-4 rounded-xl shadow-2xl backdrop-blur-md border border-slate-700 bg-slate-900/95 flex items-start gap-3 animate-slide-up">
      <div className="p-2 rounded-lg bg-slate-950 border border-slate-800 shrink-0">
        <Icon className={`w-5 h-5 ${style.iconColor}`} />
      </div>

      <div className="flex-1 space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
            {alarm.severity} ALARM • {alarm.deviceName}
          </span>
          <button
            onClick={onDismiss}
            className="text-slate-400 hover:text-slate-200 p-0.5 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <h4 className="text-xs font-bold text-slate-100">{alarm.type}</h4>
        <p className="text-xs text-slate-300">{alarm.message}</p>
      </div>
    </div>
  );
};
