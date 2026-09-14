import React from 'react';
import { Car, AlertTriangle, CheckCircle, ShieldAlert } from 'lucide-react';
import { TransportResponse } from '../types';

interface TransportSignalProps {
  transportData: TransportResponse | null;
  isLoading: boolean;
}

export const TransportSignal: React.FC<TransportSignalProps> = ({
  transportData,
  isLoading
}) => {
  if (isLoading) {
    return (
      <section 
        id="transport-corroborating-signal" 
        aria-label="Transport Corroborating Signal"
        className="bg-white border border-stone-200 rounded-xl p-5 shadow-xs"
      >
        <div className="flex items-center gap-2 text-stone-500 text-xs">
          <Car className="w-4 h-4 animate-pulse text-stone-400" />
          <span>Polling LTA CarParkAvailabilityv2 feed...</span>
        </div>
      </section>
    );
  }

  if (!transportData || !transportData.success) {
    const isRefused = transportData?.providerState === 'REFUSED';
    const isKeyMissing = transportData?.providerState === 'MISSING_KEY';

    return (
      <section 
        id="transport-corroborating-signal" 
        aria-label="Transport Corroborating Signal"
        className="bg-white border border-stone-200 rounded-xl p-5 shadow-xs space-y-3"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Car className="w-4 h-4 text-stone-700" />
            <h3 className="text-sm font-bold text-stone-900">
              Corroborating Transport Signal (LTA DataMall)
            </h3>
          </div>
          <span className={`text-[11px] font-mono font-semibold px-2 py-0.5 rounded ${
            isRefused 
              ? 'bg-rose-100 text-rose-800 border border-rose-300' 
              : 'bg-amber-100 text-amber-800 border border-amber-300'
          }`}>
            {isRefused ? 'REFUSED 401' : isKeyMissing ? 'KEY UNCONFIGURED' : 'FEED UNAVAILABLE'}
          </span>
        </div>

        <div className="bg-stone-50 border border-stone-200 rounded-lg p-3.5 text-xs text-stone-700 space-y-1.5">
          {isRefused ? (
            <div className="flex items-start gap-2 text-rose-800 font-medium">
              <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <p id="transport-refused-sentence">
                The transport feed refused our credential, so the corroborating signal is missing. Nothing on this screen should be treated as current.
              </p>
            </div>
          ) : isKeyMissing ? (
            <div className="flex items-start gap-2 text-amber-800">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p>
                LTA_ACCOUNT_KEY is not configured in the server environment. The transport corroborating signal has gracefully degraded while desk bookings and live weather remain fully operational.
              </p>
            </div>
          ) : (
            <div className="flex items-start gap-2 text-stone-700">
              <AlertTriangle className="w-4 h-4 text-stone-500 shrink-0 mt-0.5" />
              <p>
                {transportData?.message || 'We could not reach the transport provider at all. This is not an all-clear — treat every value on this screen as unknown.'}
              </p>
            </div>
          )}

          <p className="text-[11px] text-stone-500 pt-1 border-t border-stone-200">
            * Guardrail: LTA DataMall publishes available lots only (LotType &apos;C&apos;). No TotalLots field exists in the feed; occupancy percentages and capacity baselines are deliberately omitted.
          </p>
        </div>
      </section>
    );
  }

  const delta = transportData.watchedAvailableDeltaPercent ?? 0;
  const isElevatedAvailable = delta > 10;
  const isLowerAvailable = delta < -10;

  return (
    <section 
      id="transport-corroborating-signal" 
      aria-label="Transport Corroborating Signal"
      className="bg-white border border-stone-200 rounded-xl p-5 shadow-xs space-y-4"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Car className="w-4 h-4 text-stone-700" />
          <h3 className="text-sm font-bold text-stone-900">
            Corroborating Transport Signal (Marina Office Cluster)
          </h3>
          <span className="text-[11px] text-emerald-800 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded font-mono font-medium">
            LIVE 200
          </span>
        </div>
        <span className="text-xs text-stone-500 font-mono">
          TTL: 60s &middot; LotType: C (Cars)
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {transportData.watchedCarparks?.map(cp => {
          const cpDiff = cp.difference;
          return (
            <div key={cp.carParkId} className="bg-stone-50 border border-stone-200 rounded-lg p-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-stone-900">{cp.development}</span>
                <span className="text-stone-400 font-mono text-[10px]">{cp.area}</span>
              </div>
              <div className="flex items-baseline justify-between mt-2 font-mono">
                <span className="text-lg font-bold text-stone-900">
                  {cp.availableLots} <span className="text-xs font-normal text-stone-500">free</span>
                </span>
                <span className={`text-xs ${cpDiff > 0 ? 'text-amber-700' : 'text-stone-600'}`}>
                  {cpDiff > 0 ? `+${cpDiff}` : cpDiff} vs baseline
                </span>
              </div>
              <span className="text-[10px] text-stone-400 block mt-0.5">
                Baseline availability: {cp.baselineAvailableLots} lots
              </span>
            </div>
          );
        })}
      </div>

      <div className="bg-stone-50/80 border border-stone-200 rounded-lg p-3 text-xs text-stone-700 flex items-start gap-2.5">
        <div className="mt-0.5 shrink-0">
          {isElevatedAvailable ? (
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          ) : (
            <CheckCircle className="w-4 h-4 text-emerald-600" />
          )}
        </div>
        <div className="space-y-1">
          <p className="font-medium text-stone-900">
            {transportData.corroboratingSummary}
          </p>
          <p className="text-[11px] text-stone-500 leading-relaxed">
            Corroboration interpretation: Unusually high available parking lots (+{delta}%) in the Marina perimeter indicates fewer vehicles arrived at campus, corroborating that depressed floor bookings are driven by broader attendance suppression rather than local floor migration.
          </p>
        </div>
      </div>
    </section>
  );
};
