import React from 'react';
import { ShieldAlert, Radio } from 'lucide-react';

export const DisclosureBanner: React.FC = () => {
  return (
    <aside 
      id="persistent-provenance-disclosure"
      aria-label="Data Provenance Disclosure"
      className="w-full bg-amber-500/10 border-b border-amber-500/20 text-stone-800 px-4 py-2.5"
    >
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs md:text-sm font-medium">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-semibold uppercase tracking-wider bg-amber-200/60 text-amber-900">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-700" />
            Data Split
          </span>
          <span className="text-stone-900 font-semibold">
            Desk bookings are simulated — no public API publishes this data, because it identifies individuals. The weather, holiday and transport signals are live.
          </span>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-stone-600 whitespace-nowrap pl-6 sm:pl-0">
          <span className="inline-flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Live feeds: data.gov.sg &middot; Nager.Date &middot; LTA DataMall
          </span>
        </div>
      </div>
    </aside>
  );
};
