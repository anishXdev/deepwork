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
        let borderColor = 'var(--border)';
        let accentColor = 'var(--accent)';
        let Icon = Info;

        if (toast.type === 'success') {
          borderColor = 'rgba(16,185,129,0.4)';
          accentColor = '#10b981';
          Icon = CheckCircle2;
        } else if (toast.type === 'warning') {
          borderColor = 'rgba(245,158,11,0.4)';
          accentColor = '#f59e0b';
          Icon = AlertTriangle;
        } else if (toast.type === 'error') {
          borderColor = 'rgba(239,68,68,0.4)';
          accentColor = '#ef4444';
          Icon = AlertCircle;
        }

        return (
          <div
            key={toast.id}
            className="pointer-events-auto flex items-center justify-between gap-3 p-3 rounded-xl text-xs animate-in slide-in-from-top-2 fade-in"
            style={{
              background: 'var(--bg-card)',
              border: `1px solid ${borderColor}`,
              boxShadow: 'var(--shadow-md)',
              color: 'var(--text-primary)',
            }}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <Icon className="w-4 h-4 shrink-0" style={{ color: accentColor }} />
              <p className="truncate font-medium">{toast.message}</p>
            </div>
            <button
              onClick={() => Notifications.dismissToast(toast.id)}
              className="p-0.5 rounded transition-colors"
              style={{ color: 'var(--text-muted)' }}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
