import React from 'react';
import { RefreshCw, Clock, Activity, CloudSun, Calendar, Car, Database, Info } from 'lucide-react';
import { ProviderStatus } from '../types';

interface HeaderProps {
  timeDisplay: string;
  dayName: string;
  cacheAgeSeconds: number;
  isRefreshing: boolean;
  onRefresh: () => void;
  forecastStatus: ProviderStatus;
  holidayStatus: ProviderStatus;
  transportStatus: ProviderStatus;
  onOpenContext: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  timeDisplay,
  dayName,
  cacheAgeSeconds,
  isRefreshing,
  onRefresh,
  forecastStatus,
  holidayStatus,
  transportStatus,
  onOpenContext
}) => {
  const getStatusBadge = (status: ProviderStatus, type: 'keyless' | 'keyed') => {
    switch (status) {
      case 'HEALTHY':
        return <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded font-mono font-medium">LIVE 200</span>;
      case 'REFUSED':
        return <span className="inline-flex items-center gap-1 text-[11px] text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded font-mono font-medium">REFUSED 401</span>;
      case 'MISSING_KEY':
        return <span className="inline-flex items-center gap-1 text-[11px] text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded font-mono font-medium">NO KEY 503</span>;
      case 'UNREACHABLE':
      default:
        return <span className="inline-flex items-center gap-1 text-[11px] text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded font-mono font-medium">UNREACHABLE</span>;
    }
  };

  return (
    <header id="ops-header" className="bg-white border-b border-stone-200 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 py-3.5 sm:px-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-bold tracking-tight text-stone-900 font-sans">
                Hot Desking Exception Board
              </h1>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-stone-100 text-stone-700 border border-stone-200 uppercase tracking-wider">
                Workplace Ops
              </span>
            </div>
            <p className="text-xs text-stone-500 mt-0.5">
              Identifies floor occupancy anomalies after filtering suppressing external conditions &middot; Singapore Campus
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 sm:gap-4">
            {/* Observation Slot */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-stone-100 border border-stone-200 rounded-md text-xs font-mono text-stone-700">
              <Clock className="w-3.5 h-3.5 text-stone-500" />
              <span>{dayName} {timeDisplay} SGT</span>
            </div>

            {/* Cache TTL / Age */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-stone-50 border border-stone-200 rounded-md text-xs text-stone-600">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>Age: <strong className="font-mono">{cacheAgeSeconds}s</strong> (TTL 60s/300s)</span>
              <button
                id="btn-manual-refresh"
                onClick={onRefresh}
                disabled={isRefreshing}
                title="Refresh live feeds"
                className="ml-1 p-0.5 hover:text-stone-900 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-stone-800' : ''}`} />
              </button>
            </div>

            {/* Context / Operations Mandate */}
            <button
              id="btn-open-context"
              onClick={onOpenContext}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-stone-900 hover:bg-stone-800 text-white rounded-md text-xs font-medium transition-colors shadow-xs"
            >
              <Info className="w-3.5 h-3.5" />
              <span>Ops Charter</span>
            </button>
          </div>
        </div>

        {/* Independent Provider Feeds Status Bar */}
        <div className="mt-3 pt-2.5 border-t border-stone-100 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
          <span className="text-[11px] font-medium text-stone-500 uppercase tracking-wider flex items-center gap-1">
            <Activity className="w-3 h-3 text-stone-400" />
            Providers Status:
          </span>

          <div className="inline-flex items-center gap-1.5">
            <CloudSun className="w-3.5 h-3.5 text-stone-400" />
            <span className="text-stone-600">Forecast (data.gov.sg):</span>
            {getStatusBadge(forecastStatus, 'keyless')}
          </div>

          <div className="inline-flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-stone-400" />
            <span className="text-stone-600">Calendar (Nager.Date):</span>
            {getStatusBadge(holidayStatus, 'keyless')}
          </div>

          <div className="inline-flex items-center gap-1.5">
            <Car className="w-3.5 h-3.5 text-stone-400" />
            <span className="text-stone-600">Transport (LTA):</span>
            {getStatusBadge(transportStatus, 'keyed')}
          </div>

          <div className="inline-flex items-center gap-1.5">
            <Database className="w-3.5 h-3.5 text-stone-400" />
            <span className="text-stone-600">Bookings:</span>
            <span className="text-[11px] text-stone-700 bg-stone-100 border border-stone-200 px-1.5 py-0.5 rounded font-mono font-medium">
              SYNTHETIC (FIXTURE)
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};
