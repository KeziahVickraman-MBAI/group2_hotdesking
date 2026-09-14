import React from 'react';
import { AlertCircle, AlertTriangle, RefreshCw, XCircle } from 'lucide-react';
import { ScreenState } from '../types';

interface StateBannerProps {
  state: ScreenState;
  lastTime?: string;
  onRetry?: () => void;
}

export const StateBanner: React.FC<StateBannerProps> = ({
  state,
  lastTime = '16:00',
  onRetry
}) => {
  if (state === 'READY') return null;

  if (state === 'LOADING') {
    return (
      <div 
        id="screen-state-loading" 
        role="status" 
        aria-live="polite"
        className="bg-stone-100 border border-stone-200 rounded-xl p-6 text-center space-y-3 shadow-xs"
      >
        <RefreshCw className="w-6 h-6 animate-spin text-stone-600 mx-auto" />
        <p className="text-sm font-semibold text-stone-900">
          Checking bookings and live conditions — this usually takes a second or two.
        </p>
      </div>
    );
  }

  if (state === 'EMPTY') {
    return (
      <div 
        id="screen-state-empty" 
        role="alert" 
        className="bg-amber-50 border border-amber-300 rounded-xl p-5 text-amber-950 space-y-2 shadow-xs"
      >
        <div className="flex items-center gap-2 font-bold text-sm">
          <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0" />
          <span>Unknown Occupancy Notice</span>
        </div>
        <p className="text-sm font-medium leading-relaxed">
          No booking data for this floor since {lastTime}. Treat occupancy as unknown, not as available.
        </p>
        <p className="text-xs text-amber-800/90 leading-relaxed">
          Operational principle: Empty badge or sync tables do not mean desks are free. Never route mobile teams to unconfirmed floors.
        </p>
      </div>
    );
  }

  if (state === 'REFUSED') {
    return (
      <div 
        id="screen-state-refused" 
        role="alert" 
        className="bg-rose-50 border border-rose-300 rounded-xl p-5 text-rose-950 space-y-2 shadow-xs"
      >
        <div className="flex items-center gap-2 font-bold text-sm">
          <XCircle className="w-5 h-5 text-rose-700 shrink-0" />
          <span>Credential Refused (401)</span>
        </div>
        <p className="text-sm font-medium leading-relaxed">
          The transport feed refused our credential, so the corroborating signal is missing. Nothing on this screen should be treated as current.
        </p>
      </div>
    );
  }

  if (state === 'UNREACHABLE') {
    return (
      <div 
        id="screen-state-unreachable" 
        role="alert" 
        className="bg-stone-100 border border-stone-300 rounded-xl p-5 text-stone-900 space-y-2 shadow-xs"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-sm">
            <AlertCircle className="w-5 h-5 text-stone-700 shrink-0" />
            <span>Upstream Provider Unreachable</span>
          </div>
          {onRetry && (
            <button
              onClick={onRetry}
              className="text-xs px-2.5 py-1 bg-stone-900 text-white rounded font-medium hover:bg-stone-800 transition-colors"
            >
              Retry Provider
            </button>
          )}
        </div>
        <p className="text-sm font-medium leading-relaxed">
          We could not reach the provider at all. This is not an all-clear — treat every value on this screen as unknown.
        </p>
      </div>
    );
  }

  return null;
};
