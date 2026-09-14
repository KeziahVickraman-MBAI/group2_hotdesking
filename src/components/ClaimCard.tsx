import React from 'react';
import { AlertTriangle, CheckCircle2, TrendingDown, TrendingUp, Sparkles, Filter } from 'lucide-react';
import { FloorDeviation } from '../types';

interface ClaimCardProps {
  selectedFloor: FloorDeviation | null;
  dayName: string;
  attendanceFactor: number;
  weatherCondition: string;
  areaName: string;
  isHolidayAdjacent: boolean;
  holidayName?: string;
  isUnadjusted: boolean;
  claimSentence: string;
}

export const ClaimCard: React.FC<ClaimCardProps> = ({
  selectedFloor,
  dayName,
  attendanceFactor,
  weatherCondition,
  areaName,
  isHolidayAdjacent,
  holidayName,
  isUnadjusted,
  claimSentence
}) => {
  if (!selectedFloor) return null;

  const devAdjusted = selectedFloor.deviationAdjusted ?? 0;
  const devRaw = selectedFloor.deviationRaw ?? 0;
  const isSuppressed = selectedFloor.suppressed;

  // Determine operational severity
  const isSignificantlyEmpty = devAdjusted <= -25;
  const isSignificantlyFull = devAdjusted >= 20;

  // Compute percentage suppressed
  const conditionDropPercent = Math.round((1 - attendanceFactor) * 100);

  return (
    <section 
      id="ops-claim-card" 
      aria-label="Core Operational Exception Claim"
      className="bg-white rounded-xl border border-stone-200 p-5 md:p-6 shadow-xs relative overflow-hidden"
    >
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-2 max-w-3xl">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-stone-900 text-stone-100 font-mono">
              The Decision Claim
            </span>
            {isSignificantlyEmpty && (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300">
                <AlertTriangle className="w-3 h-3 text-amber-700" />
                Under-Occupied Anomaly
              </span>
            )}
            {isSignificantlyFull && (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded bg-blue-100 text-blue-900 border border-blue-300">
                <TrendingUp className="w-3 h-3 text-blue-700" />
                Over-Subscribed Anomaly
              </span>
            )}
            {!isSignificantlyEmpty && !isSignificantlyFull && !isSuppressed && (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 border border-emerald-300">
                <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                Within Baseline Tolerance
              </span>
            )}
            {isSuppressed && (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded bg-stone-200 text-stone-800 border border-stone-300">
                Suppressed Aggregate (&lt; 5)
              </span>
            )}
          </div>

          {/* Primary Operations Sentence */}
          <p id="claim-primary-sentence" className="text-base sm:text-lg md:text-xl font-medium text-stone-900 leading-snug">
            &ldquo;{claimSentence}&rdquo;
          </p>

          <p className="text-xs text-stone-500 leading-relaxed">
            The decision is whether this floor needs workplace intervention (re-allocating project spaces), or whether environmental factors (heavy rainfall or holiday proximity) already explain attendance.
          </p>
        </div>

        {/* Highlight Metrics Box */}
        <div className="flex sm:flex-row lg:flex-col items-stretch gap-3 bg-stone-50 border border-stone-200 rounded-lg p-3 sm:p-4 min-w-[240px]">
          <div className="flex-1">
            <span className="text-[11px] uppercase tracking-wider text-stone-500 block font-medium">
              Lead Metric (Adjusted)
            </span>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className={`text-2xl font-bold font-mono ${devAdjusted < 0 ? 'text-amber-700' : devAdjusted > 0 ? 'text-blue-700' : 'text-stone-800'}`}>
                {isSuppressed ? '—' : `${devAdjusted > 0 ? '+' : ''}${devAdjusted}%`}
              </span>
              {/* Show raw beside adjusted in muted text. When factor is 1.00, do not imply second exists! */}
              {attendanceFactor !== 1.00 && !isSuppressed && (
                <span className="text-xs font-mono text-stone-400" title="Unadjusted deviation against raw historical baseline">
                  (raw: {devRaw > 0 ? '+' : ''}{devRaw}%)
                </span>
              )}
            </div>
            <span className="text-[10px] text-stone-500 block mt-0.5">
              {attendanceFactor === 1.00 
                ? 'Deviation vs normal rate' 
                : `Filtered for -${conditionDropPercent}% weather/calendar`}
            </span>
          </div>

          <div className="pt-2 sm:pt-0 lg:pt-2 sm:border-l lg:border-l-0 lg:border-t border-stone-200 sm:pl-3 lg:pl-0">
            <span className="text-[11px] uppercase tracking-wider text-stone-500 block font-medium">
              Attendance Factor
            </span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="font-mono font-bold text-stone-800 text-sm">
                {attendanceFactor.toFixed(2)}
              </span>
              <span className="text-xs text-stone-600">
                ({weatherCondition}, {areaName})
              </span>
            </div>
            <span className="text-[10px] text-stone-500 block mt-0.5">
              {attendanceFactor === 1.00 ? 'No attendance adjustment' : `Expected baseline lowered ${conditionDropPercent}%`}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};
