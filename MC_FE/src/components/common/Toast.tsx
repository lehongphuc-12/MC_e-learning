import React from 'react';
import { CheckCircle2, Info, AlertTriangle, AlertCircle, X } from 'lucide-react';

export type ToastType = 'success' | 'info' | 'warning' | 'error';

export interface ToastMessage {
  title: string;
  desc?: string;
  type?: ToastType;
}

interface ToastProps {
  toast: ToastMessage | null;
  onClose: () => void;
}

const toastStyles: Record<
  ToastType,
  {
    borderColor: string;
    iconBg: string;
    iconColor: string;
    icon: React.ComponentType<{ className?: string }>;
    badgeText?: string;
  }
> = {
  success: {
    borderColor: 'border-emerald-500/40 shadow-emerald-950/20',
    iconBg: 'bg-emerald-500/15 text-emerald-400',
    iconColor: 'text-emerald-400',
    icon: CheckCircle2,
  },
  info: {
    borderColor: 'border-blue-500/40 shadow-blue-950/20',
    iconBg: 'bg-blue-500/15 text-blue-400',
    iconColor: 'text-blue-400',
    icon: Info,
  },
  warning: {
    borderColor: 'border-amber-500/40 shadow-amber-950/20',
    iconBg: 'bg-amber-500/15 text-amber-400',
    iconColor: 'text-amber-400',
    icon: AlertTriangle,
  },
  error: {
    borderColor: 'border-rose-500/40 shadow-rose-950/20',
    iconBg: 'bg-rose-500/15 text-rose-400',
    iconColor: 'text-rose-400',
    icon: AlertCircle,
  },
};

export const Toast: React.FC<ToastProps> = ({ toast, onClose }) => {
  if (!toast) return null;

  const type = toast.type || 'success';
  const config = toastStyles[type] || toastStyles.success;
  const Icon = config.icon;

  return (
    <div
      id="global-toast-notification"
      className={`fixed bottom-6 right-6 z-50 flex items-start gap-3.5 p-4 bg-slate-950/95 text-white rounded-2xl shadow-2xl border backdrop-blur-md max-w-sm w-full transition-all duration-300 animate-in fade-in slide-in-from-bottom-4 ${config.borderColor}`}
    >
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${config.iconBg}`}>
        <Icon className={`w-5 h-5 ${config.iconColor}`} />
      </div>

      <div className="flex-1 min-w-0 pr-1">
        <h4 className="text-xs font-bold text-white tracking-wide">{toast.title}</h4>
        {toast.desc && (
          <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">{toast.desc}</p>
        )}
      </div>

      <button
        onClick={onClose}
        className="text-slate-400 hover:text-white hover:bg-slate-800/60 p-1.5 rounded-lg transition-colors shrink-0"
        aria-label="Close notification"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};
