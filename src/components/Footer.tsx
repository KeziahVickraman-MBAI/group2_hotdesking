import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer id="ops-footer" className="bg-white border-t border-stone-200 mt-12 py-8 text-xs text-stone-500">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-3">
        {/* Verbatim licence text required by prompt */}
        <p className="font-mono text-[11px] leading-relaxed text-stone-600">
          Contains information from LTA DataMall and data.gov.sg, accessed 14 September 2026, made available under the terms of the Singapore Open Data Licence version 1.0, data.gov.sg/open-data-licence.
        </p>

        {/* Nager.Date Credit & Operations Boundary */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-stone-100 text-[11px]">
          <p>
            Public holiday dataset provided courtesy of Nager.Date v3 API. All desk attendance figures are synthetic fixtures (data/bookings.json) to respect individual privacy.
          </p>
          <span className="text-stone-400 whitespace-nowrap">
            Hot Desking Exception Board &middot; Singapore Operations
          </span>
        </div>
      </div>
    </footer>
  );
};
