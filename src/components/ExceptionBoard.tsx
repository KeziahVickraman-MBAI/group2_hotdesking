import React from 'react';
import { AlertCircle, HelpCircle, Shield, ArrowDownRight, ArrowUpRight, Minus, Check } from 'lucide-react';
import { FloorDeviation, ExcludedFloor } from '../types';

interface ExceptionBoardProps {
  floors: FloorDeviation[];
  excludedFloors: ExcludedFloor[];
  selectedFloorName: string;
  onSelectFloor: (floor: FloorDeviation) => void;
  attendanceFactor: number;
  unadjustedWarning?: boolean;
}

export const ExceptionBoard: React.FC<ExceptionBoardProps> = ({
  floors,
  excludedFloors,
  selectedFloorName,
  onSelectFloor,
  attendanceFactor,
  unadjustedWarning
}) => {
  return (
    <section id="exception-board" aria-label="Floor Exception Ranking Board" className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-bold text-stone-900 tracking-tight flex items-center gap-2">
            <span>Floor Exception Board</span>
            <span className="text-xs font-normal text-stone-500 font-mono">
              (Ranked by deviation from adjusted baseline)
            </span>
          </h2>
          <p className="text-xs text-stone-500 mt-0.5">
            Estimates only. Shows desks booked vs historical normal. Floors under 5 bookings are suppressed for privacy.
          </p>
        </div>

        {unadjustedWarning && (
          <div className="text-xs font-medium text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-md flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span>Attendance adjustment unavailable — deviations are unadjusted.</span>
          </div>
        )}
      </div>

      {/* Main Board Table */}
      <div className="bg-white border border-stone-200 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-stone-50 border-b border-stone-200 text-stone-600 text-xs uppercase tracking-wider font-semibold">
                <th className="py-3 px-4">Floor</th>
                <th className="py-3 px-4">Historical Baseline</th>
                <th className="py-3 px-4">Adjusted Expectation</th>
                <th className="py-3 px-4">Actual Booked</th>
                <th className="py-3 px-4">
                  <div className="flex items-center gap-1">
                    <span>Deviation</span>
                    <span className="text-[10px] font-normal text-stone-400 lowercase font-sans">
                      {attendanceFactor === 1.00 ? '(vs normal)' : '(adjusted / raw)'}
                    </span>
                  </div>
                </th>
                <th className="py-3 px-4 text-right">Operations Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 text-stone-800">
              {floors.map((f) => {
                const isSelected = f.floor === selectedFloorName;
                const isSuppressed = f.suppressed;
                const devAdj = f.deviationAdjusted ?? 0;
                const devRaw = f.deviationRaw ?? 0;

                return (
                  <tr
                    key={f.floor}
                    id={`floor-row-${f.floor.replace(/\s+/g, '-').toLowerCase()}`}
                    onClick={() => !isSuppressed && onSelectFloor(f)}
                    className={`transition-colors cursor-pointer ${
                      isSelected 
                        ? 'bg-amber-50/50 hover:bg-amber-50/70 border-l-4 border-l-amber-600' 
                        : 'hover:bg-stone-50/80'
                    }`}
                  >
                    {/* Floor Name */}
                    <td className="py-3.5 px-4 font-semibold text-stone-900 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span>{f.floor}</span>
                        {isSelected && (
                          <span className="text-[10px] font-mono font-medium px-1.5 py-0.2 rounded bg-amber-200 text-amber-950">
                            Active Slot
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Historical Baseline */}
                    <td className="py-3.5 px-4 font-mono text-stone-600 whitespace-nowrap">
                      <span>{f.baselineExpected} desks</span>
                      <span className="text-[11px] text-stone-400 block font-sans">
                        Observed {f.observedOn || '28 Aug 2026'}
                      </span>
                    </td>

                    {/* Adjusted Expectation */}
                    <td className="py-3.5 px-4 font-mono text-stone-900 whitespace-nowrap font-medium">
                      {f.adjustedExpectation !== undefined && f.adjustedExpectation !== null ? (
                        <>
                          <span>{f.adjustedExpectation} desks</span>
                          {attendanceFactor !== 1.00 && (
                            <span className="text-[11px] text-stone-400 block font-sans">
                              (Factor {attendanceFactor.toFixed(2)})
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="text-stone-400">—</span>
                      )}
                    </td>

                    {/* Actual Booked */}
                    <td className="py-3.5 px-4 whitespace-nowrap font-mono">
                      {isSuppressed ? (
                        <span className="inline-flex items-center gap-1 text-xs text-stone-600 bg-stone-100 border border-stone-200 px-2 py-0.5 rounded font-sans font-medium">
                          <Shield className="w-3 h-3 text-stone-500" />
                          Too few bookings to report
                        </span>
                      ) : (
                        <span className="font-semibold text-stone-900">
                          {f.actualBooked} desks
                        </span>
                      )}
                    </td>

                    {/* Deviation (Lead with adjusted, show raw beside it when factor != 1.00) */}
                    <td className="py-3.5 px-4 whitespace-nowrap font-mono">
                      {isSuppressed ? (
                        <span className="text-stone-400">—</span>
                      ) : (
                        <div className="flex items-baseline gap-2">
                          <span className={`font-bold ${
                            devAdj <= -25 
                              ? 'text-amber-700' 
                              : devAdj >= 20 
                                ? 'text-blue-700' 
                                : 'text-stone-700'
                          }`}>
                            {devAdj > 0 ? '+' : ''}{devAdj}%
                          </span>

                          {/* When factor is 1.00 the two are identical — show one figure and do not imply a second exists */}
                          {attendanceFactor !== 1.00 && (
                            <span className="text-xs text-stone-400 font-normal" title="Raw unadjusted deviation">
                              (raw {devRaw > 0 ? '+' : ''}{devRaw}%)
                            </span>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Status badge */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      {isSuppressed ? (
                        <span className="text-[11px] font-medium text-stone-500 bg-stone-100 px-2 py-1 rounded">
                          Suppressed (&lt;5)
                        </span>
                      ) : devAdj <= -25 ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-800 bg-amber-100/70 border border-amber-300 px-2 py-1 rounded">
                          <ArrowDownRight className="w-3.5 h-3.5 text-amber-700" />
                          Unusually Empty
                        </span>
                      ) : devAdj >= 20 ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-800 bg-blue-100/70 border border-blue-300 px-2 py-1 rounded">
                          <ArrowUpRight className="w-3.5 h-3.5 text-blue-700" />
                          Unusually Full
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded">
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          Expected Normal
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footnote on estimates */}
        <div className="bg-stone-50/70 px-4 py-2 border-t border-stone-100 flex items-center justify-between text-xs text-stone-500">
          <span>
            * Note: Attendance factors are estimates, not measured. Both adjusted and raw figures are provided above.
          </span>
          <span className="hidden sm:inline text-stone-400">
            Click any floor to view step-by-step computation
          </span>
        </div>
      </div>

      {/* Excluded Floors notice: strictly excluded from ranking, never ranked against placeholder */}
      {excludedFloors.length > 0 && (
        <aside 
          id="excluded-floors-panel" 
          aria-label="Excluded Floors"
          className="bg-stone-100 border border-stone-200 rounded-lg p-3 text-xs text-stone-600 flex items-start gap-2.5"
        >
          <HelpCircle className="w-4 h-4 text-stone-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-stone-800">
              Floors Excluded from Ranking:
            </span>{' '}
            {excludedFloors.map(ef => (
              <span key={ef.floor} className="inline-block mr-3">
                <strong>{ef.floor}</strong> ({ef.actualBooked} bookings) &mdash; {ef.reason}
              </span>
            ))}
          </div>
        </aside>
      )}
    </section>
  );
};
