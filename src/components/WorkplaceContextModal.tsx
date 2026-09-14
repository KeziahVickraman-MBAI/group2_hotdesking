import React from 'react';
import { X, Quote, Shield, Users, Lock, Compass } from 'lucide-react';

interface WorkplaceContextModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WorkplaceContextModal: React.FC<WorkplaceContextModalProps> = ({
  isOpen,
  onClose
}) => {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ops-charter-title"
    >
      <div className="bg-white border border-stone-200 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl p-6 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-stone-200 pb-4">
          <div>
            <span className="text-[11px] font-mono uppercase tracking-wider text-stone-500 font-semibold">
              Workplace Operations Charter &amp; Evidence
            </span>
            <h2 id="ops-charter-title" className="text-lg font-bold text-stone-900 mt-0.5">
              Purpose &amp; Structural Governance Guardrails
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-100 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Team Quotes */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-stone-600 flex items-center gap-1.5">
            <Quote className="w-3.5 h-3.5 text-stone-400" />
            What the team observed:
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-stone-50 border border-stone-200 rounded-xl p-3.5 text-xs">
              <p className="italic text-stone-800 leading-relaxed">
                &ldquo;Currently my company does not look at floor plans and income new teams for ideal desking.&rdquo;
              </p>
              <span className="block mt-2 font-semibold text-stone-900">— Keziah</span>
            </div>
            <div className="bg-stone-50 border border-stone-200 rounded-xl p-3.5 text-xs">
              <p className="italic text-stone-800 leading-relaxed">
                &ldquo;My group does not get their time together for project discussions&rdquo;
              </p>
              <span className="block mt-2 font-semibold text-stone-900">— Ziming</span>
            </div>
          </div>
        </div>

        {/* Governance & Privacy Mandate */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-stone-600 flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-stone-400" />
            Operational Governance: Space Allocation Only
          </h3>
          <div className="bg-amber-500/10 border border-amber-300/40 rounded-xl p-4 text-xs text-stone-800 space-y-2">
            <p className="font-semibold text-stone-900">
              Anti-Misuse Constraint (Code-Enforced, Not Just Policy):
            </p>
            <p className="leading-relaxed">
              Two operational risks pull against each other: under-provisioning sends teams to floors with no free desk (a wasted commute); over-provisioning pays for real estate nobody uses.
            </p>
            <p className="leading-relaxed font-medium text-stone-900">
              The sharper risk is data leaking into performance management, where an occupancy board becomes an unagreed presence-monitoring tool.
            </p>
            <ul className="list-disc pl-4 space-y-1 text-stone-700">
              <li><strong>Zero personal identifiers:</strong> No names, employee IDs, or individual desk IDs exist anywhere in payloads.</li>
              <li><strong>Suppression threshold:</strong> Any floor with &lt; 5 bookings is suppressed to &quot;Too few bookings to report&quot; to prevent individual re-identification.</li>
              <li><strong>No drill-down:</strong> There is no route that returns desk-level or occupant-level data.</li>
              <li><strong>Audit timestamp:</strong> Every reading carries a timestamp so reviewers can reconstruct what the screen said at the moment a decision was made.</li>
            </ul>
          </div>
        </div>

        {/* The Decision Context */}
        <div className="space-y-2 text-xs text-stone-600 border-t border-stone-100 pt-4">
          <div className="flex items-center gap-1.5 font-semibold text-stone-800">
            <Compass className="w-4 h-4 text-stone-500" />
            <span>The Workplace Lead&apos;s Decision:</span>
          </div>
          <p className="leading-relaxed">
            A workplace lead who allocates space across floors cannot see any of them. The decision is whether a floor running quiet today needs intervention (rebalancing team neighbourhoods), or whether live conditions (heavy rain, pre-holiday weekdays, transport disruptions) already account for campus-wide attendance suppression.
          </p>
        </div>

        <div className="flex justify-end pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-lg text-xs font-semibold transition-colors"
          >
            Acknowledge &amp; Return to Board
          </button>
        </div>
      </div>
    </div>
  );
};
