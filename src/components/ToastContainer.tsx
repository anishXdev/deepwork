import React, { useState, useEffect } from 'react';
import { Notifications, ToastItem } from '../services/notifications';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    return Notifications.subscribe(items => {
      setToasts(items);
    });
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm pointer-events-none select-none">
      {toasts.map(toast => {
        let borderClass = 'border-teal-500/30';
        let bgClass = 'bg-[#030a12]/90';
        let Icon = Info;
        let iconColor = 'text-teal-400';

        if (toast.type === 'success') {
          borderClass = 'border-emerald-500/40';
          iconColor = 'text-emerald-400';
          Icon = CheckCircle2;
        } else if (toast.type === 'warning') {
          borderClass = 'border-amber-500/40';
          iconColor = 'text-amber-400';
          Icon = AlertTriangle;
        } else if (toast.type === 'error') {
          borderClass = 'border-rose-500/40';
          iconColor = 'text-rose-400';
          Icon = AlertCircle;
        }

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center justify-between gap-3 p-3 rounded-2xl ${bgClass} ${borderClass} border shadow-2xl backdrop-blur-xl text-xs text-white animate-in slide-in-from-top-2 fade-in`}
          >
            <div className="flex items-center space-x-2.5 min-w-0">
              <Icon className={`w-4 h-4 shrink-0 ${iconColor}`} />
              <p className="truncate font-medium">{toast.message}</p>
            </div>
            <button
              onClick={() => Notifications.dismissToast(toast.id)}
              className="text-slate-400 hover:text-white p-0.5 rounded transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
