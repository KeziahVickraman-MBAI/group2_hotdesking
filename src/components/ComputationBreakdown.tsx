import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Calculator, FileText } from 'lucide-react';
import { FloorDeviation } from '../types';

interface ComputationBreakdownProps {
  floor: FloorDeviation | null;
  dayName: string;
  timeDisplay: string;
  attendanceFactor: number;
  weatherCondition: string;
  areaName: string;
}

export const ComputationBreakdown: React.FC<ComputationBreakdownProps> = ({
  floor,
  dayName,
  timeDisplay,
  attendanceFactor,
  weatherCondition,
  areaName
}) => {
  // Collapsible and closed by default
  const [isOpen, setIsOpen] = useState<boolean>(false);

  if (!floor || floor.suppressed) return null;

  const baseline = floor.baselineExpected ?? 84;
  const observedDate = floor.observedOn || '28 Aug 2026';
  const factor = attendanceFactor || 1.00;
  const adjustedExpectation = floor.adjustedExpectation ?? Math.round(baseline * factor);
  const actualBooked = floor.actualBooked ?? 50;
  const difference = actualBooked - adjustedExpectation;
  const deviation = floor.deviationAdjusted ?? -40;

  const signDiff = difference > 0 ? `+${difference}` : `${difference}`;
  const signDev = deviation > 0 ? `+${deviation}` : `${deviation}`;

  return (
    <section 
      id="how-this-is-computed-section" 
      aria-label="Mathematical Computation Breakdown"
      className="bg-white border border-stone-200 rounded-xl overflow-hidden shadow-xs"
    >
      <button
        id="toggle-computation-breakdown"
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        className="w-full px-5 py-3.5 flex items-center justify-between text-left hover:bg-stone-50 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <Calculator className="w-4 h-4 text-stone-500" />
          <span className="text-sm font-semibold text-stone-900">
            How this is computed
          </span>
          <span className="text-xs text-stone-500 font-mono">
            ({floor.floor} &middot; {dayName} {timeDisplay})
          </span>
        </div>
        <div className="flex items-center gap-1 text-xs text-stone-500 font-medium">
          <span>{isOpen ? 'Collapse arithmetic' : 'Expand arithmetic'}</span>
          {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </div>
      </button>

      {isOpen && (
        <div id="computation-body" className="px-5 pb-5 pt-1 border-t border-stone-100 space-y-4">
          {/* Formatted Arithmetic Block matching exact required visual structure */}
          <div className="bg-stone-900 text-stone-100 rounded-lg p-4 font-mono text-xs sm:text-sm overflow-x-auto leading-relaxed shadow-inner">
            <div className="text-amber-300 font-semibold mb-2">
              {floor.floor}, {dayName} {timeDisplay}
            </div>
            <div className="grid grid-cols-1 gap-1 text-stone-200">
              <div className="flex flex-wrap items-baseline justify-between gap-x-4">
                <span className="text-stone-400">baseline expected booked</span>
                <span>
                  <strong className="text-white">{baseline} desks</strong>{' '}
                  <span className="text-stone-400 text-xs">(observed {observedDate})</span>
                </span>
              </div>

              <div className="flex flex-wrap items-baseline justify-between gap-x-4">
                <span className="text-stone-400">attendance factor</span>
                <span>
                  <strong className="text-amber-300">{factor.toFixed(2)}</strong>{' '}
                  <span className="text-stone-400 text-xs">({weatherCondition}, {areaName})</span>
                </span>
              </div>

              <div className="flex flex-wrap items-baseline justify-between gap-x-4 border-t border-stone-800 pt-1">
                <span className="text-stone-400">adjusted expectation</span>
                <span className="text-white font-bold">{adjustedExpectation} desks</span>
              </div>

              <div className="flex flex-wrap items-baseline justify-between gap-x-4">
                <span className="text-stone-400">actual booked</span>
                <span className="text-white font-bold">{actualBooked} desks</span>
              </div>

              <div className="flex flex-wrap items-baseline justify-between gap-x-4 border-t border-stone-800 pt-1">
                <span className="text-stone-400">difference</span>
                <span className={difference < 0 ? 'text-amber-400 font-bold' : 'text-blue-400 font-bold'}>
                  {signDiff} desks
                </span>
              </div>

              <div className="flex flex-wrap items-baseline justify-between gap-x-4">
                <span className="text-stone-400">deviation</span>
                <span className={deviation < 0 ? 'text-amber-400 font-bold' : 'text-blue-400 font-bold'}>
                  {signDev}%
                </span>
              </div>
            </div>
          </div>

          {/* Beneath it, three lines strictly required by prompt */}
          <div className="space-y-1.5 text-xs text-stone-600 bg-stone-50 border border-stone-200 rounded-lg p-3.5">
            <div className="flex items-start gap-2">
              <span className="font-mono text-stone-400 select-none">1.</span>
              <p>
                <strong>The baseline:</strong> The expected booking count is hand-entered from historical observations on a specific date ({observedDate}), establishing a per-floor, per-day-type, per-hour normal.
              </p>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-mono text-stone-400 select-none">2.</span>
              <p>
                <strong>The factor:</strong> The attendance factor models macro conditions (such as severe rainfall or proximity to public holidays) that systematically suppress attendance across the entire campus, isolating true local floor anomalies.
              </p>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-mono text-stone-400 select-none">3.</span>
              <p>
                <strong>The estimate disclosure:</strong> These attendance factors are estimates, not measured constants, which is why the raw unadjusted deviation is shown alongside the adjusted figure on the board.
              </p>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
