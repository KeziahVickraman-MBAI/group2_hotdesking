import React, { useState, useEffect, useCallback, useTransition } from 'react';
import { DisclosureBanner } from './components/DisclosureBanner';
import { Header } from './components/Header';
import { ClaimCard } from './components/ClaimCard';
import { ExceptionBoard } from './components/ExceptionBoard';
import { ComputationBreakdown } from './components/ComputationBreakdown';
import { TransportSignal } from './components/TransportSignal';
import { Footer } from './components/Footer';
import { WorkplaceContextModal } from './components/WorkplaceContextModal';
import { StateBanner } from './components/StateBanner';
import { 
  DeviationsResponse, 
  TransportResponse, 
  FloorDeviation, 
  ProviderStatus, 
  ScreenState 
} from './types';
import { SlidersHorizontal, CloudRain, Sun, Calendar, AlertTriangle, Wind } from 'lucide-react';

export default function App() {
  const [, startTransition] = useTransition();

  // Core Data State
  const [deviationsData, setDeviationsData] = useState<DeviationsResponse | null>(null);
  const [transportData, setTransportData] = useState<TransportResponse | null>(null);
  const [selectedFloor, setSelectedFloor] = useState<FloorDeviation | null>(null);

  // Operations Slot & Condition controls
  const [selectedHour, setSelectedHour] = useState<number>(16);
  const [selectedDayName, setSelectedDayName] = useState<string>('Monday');
  const [timeString, setTimeString] = useState<string>('16:47');
  const [weatherOverride, setWeatherOverride] = useState<'live' | 'heavy_rain' | 'haze_unhealthy' | 'holiday_adjacent'>('live');

  // UI States
  const [screenState, setScreenState] = useState<ScreenState>('LOADING');
  const [simulatedState, setSimulatedState] = useState<ScreenState | null>(null);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [cacheAgeSeconds, setCacheAgeSeconds] = useState<number>(0);
  const [isContextModalOpen, setIsContextModalOpen] = useState<boolean>(false);

  // Fetch deviations and conditions from serverless API
  const fetchData = useCallback(async (hour = selectedHour, day = 'weekday', dayName = selectedDayName) => {
    setIsRefreshing(true);
    try {
      // 1. Fetch Deviations (aggregates bookings, baselines, conditions)
      const devRes = await fetch(`/api/deviations?hour=${hour}&day=${day}&dayName=${encodeURIComponent(dayName)}&time=${encodeURIComponent(timeString)}`, {
        headers: { 'Accept': 'application/json' }
      });

      if (!devRes.ok) {
        setScreenState('UNREACHABLE');
        setIsRefreshing(false);
        return;
      }

      const devJson: DeviationsResponse = await devRes.json();
      
      // If scenario override is active, adjust factor dynamically for demonstration
      if (weatherOverride === 'heavy_rain') {
        const factor = 0.88;
        const weatherCondition = 'Heavy Thundery Showers';
        devJson.attendanceFactor = factor;
        devJson.weatherFactor = 0.88;
        devJson.hazeFactor = 1.00;
        devJson.weatherCondition = weatherCondition;
        devJson.isUnadjusted = false;
        devJson.floors = devJson.floors.map(f => {
          if (f.suppressed || f.baselineExpected === null) return f;
          const adjusted = Math.round(f.baselineExpected * factor);
          const actual = f.actualBooked ?? 0;
          const diff = actual - adjusted;
          const devAdj = adjusted > 0 ? Math.round(((actual - adjusted) / adjusted) * 100) : 0;
          return {
            ...f,
            adjustedExpectation: adjusted,
            difference: diff,
            deviationAdjusted: devAdj,
            attendanceFactor: factor
          };
        });
        const primary = devJson.floors.find(f => f.floor === 'Level 12' && !f.suppressed) || devJson.floors[0];
        if (primary && primary.deviationAdjusted !== null) {
          const absDev = Math.abs(primary.deviationAdjusted);
          const dir = primary.deviationAdjusted < 0 ? 'below' : 'above';
          devJson.claimSentence = `${primary.floor} is ${absDev}% ${dir} its usual ${dayName} rate. Expected attendance was already down 12% for heavy rain, so this is ${primary.deviationAdjusted < -12 ? 'more than weather explains' : 'within weather expectation'}.`;
        }
      } else if (weatherOverride === 'haze_unhealthy') {
        const factor = 0.85; // 15% reduction for Unhealthy haze (PSI 145)
        const weatherCondition = 'Hazy';
        devJson.attendanceFactor = factor;
        devJson.weatherFactor = 1.00;
        devJson.hazeFactor = 0.85;
        devJson.weatherCondition = weatherCondition;
        devJson.isUnadjusted = false;
        devJson.airQuality = {
          psi: 145,
          pm25: 98,
          band: 'Unhealthy',
          descriptor: 'Unhealthy Haze',
          hazeFactor: 0.85,
          region: 'central'
        };
        devJson.floors = devJson.floors.map(f => {
          if (f.suppressed || f.baselineExpected === null) return f;
          const adjusted = Math.round(f.baselineExpected * factor);
          const actual = f.actualBooked ?? 0;
          const diff = actual - adjusted;
          const devAdj = adjusted > 0 ? Math.round(((actual - adjusted) / adjusted) * 100) : 0;
          return {
            ...f,
            adjustedExpectation: adjusted,
            difference: diff,
            deviationAdjusted: devAdj,
            attendanceFactor: factor
          };
        });
        const primary = devJson.floors.find(f => f.floor === 'Level 12' && !f.suppressed) || devJson.floors[0];
        if (primary && primary.deviationAdjusted !== null) {
          const absDev = Math.abs(primary.deviationAdjusted);
          const dir = primary.deviationAdjusted < 0 ? 'below' : 'above';
          devJson.claimSentence = `${primary.floor} is ${absDev}% ${dir} its usual ${dayName} rate. Expected attendance was already down 15% for unhealthy haze (PSI 145), so this is ${primary.deviationAdjusted < -15 ? 'more than haze explains' : 'within haze expectation'}.`;
        }
      } else if (weatherOverride === 'holiday_adjacent') {
        const factor = 0.80;
        const weatherCondition = 'Fair (Eve of Public Holiday)';
        devJson.attendanceFactor = factor;
        devJson.weatherFactor = 1.00;
        devJson.hazeFactor = 1.00;
        devJson.weatherCondition = weatherCondition;
        devJson.isUnadjusted = false;
        devJson.floors = devJson.floors.map(f => {
          if (f.suppressed || f.baselineExpected === null) return f;
          const adjusted = Math.round(f.baselineExpected * factor);
          const actual = f.actualBooked ?? 0;
          const diff = actual - adjusted;
          const devAdj = adjusted > 0 ? Math.round(((actual - adjusted) / adjusted) * 100) : 0;
          return {
            ...f,
            adjustedExpectation: adjusted,
            difference: diff,
            deviationAdjusted: devAdj,
            attendanceFactor: factor
          };
        });
        const primary = devJson.floors.find(f => f.floor === 'Level 12' && !f.suppressed) || devJson.floors[0];
        if (primary && primary.deviationAdjusted !== null) {
          const absDev = Math.abs(primary.deviationAdjusted);
          const dir = primary.deviationAdjusted < 0 ? 'below' : 'above';
          devJson.claimSentence = `${primary.floor} is ${absDev}% ${dir} its usual ${dayName} rate. Expected attendance was already down 20% for holiday adjacency, so this is ${primary.deviationAdjusted < -20 ? 'more than calendar explains' : 'within calendar expectation'}.`;
        }
      }

      setDeviationsData(devJson);

      // Default select Level 12 or first unsuppressed floor
      const defaultFloor = devJson.floors.find(f => f.floor === 'Level 12') || devJson.floors[0];
      setSelectedFloor(defaultFloor || null);

      setScreenState('READY');
      setCacheAgeSeconds(0);
    } catch {
      setScreenState('UNREACHABLE');
    }

    // 2. Fetch Transport feed
    try {
      const transRes = await fetch('/api/transport', {
        headers: { 'Accept': 'application/json' }
      });
      const transJson = await transRes.json();
      setTransportData(transJson);
    } catch {
      setTransportData({
        success: false,
        providerState: 'UNREACHABLE',
        message: 'Could not reach transport feed at /api/transport',
        timestamp: new Date().toISOString()
      });
    } finally {
      setIsRefreshing(false);
    }
  }, [selectedHour, selectedDayName, timeString, weatherOverride]);

  // Initial load
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Cache age tick counter
  useEffect(() => {
    const timer = setInterval(() => {
      setCacheAgeSeconds(prev => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Provider Status Resolution
  const forecastStatus: ProviderStatus = deviationsData?.providerForecastStatus || 'HEALTHY';
  const psiStatus: ProviderStatus = deviationsData?.providerPsiStatus || 'HEALTHY';
  const holidayStatus: ProviderStatus = deviationsData?.providerHolidayStatus || 'HEALTHY';
  const transportStatus: ProviderStatus = transportData?.providerState || 'MISSING_KEY';

  // Active Screen State
  const activeScreenState = simulatedState || screenState;

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col font-sans selection:bg-amber-200 selection:text-amber-900">
      {/* 1. Mandatory Persistent Data Provenance Disclosure (Never in footnote or hidden behind toggle) */}
      <DisclosureBanner />

      {/* 2. Operations Header */}
      <Header
        timeDisplay={timeString}
        dayName={selectedDayName}
        cacheAgeSeconds={cacheAgeSeconds}
        isRefreshing={isRefreshing}
        onRefresh={() => fetchData()}
        forecastStatus={forecastStatus}
        psiStatus={psiStatus}
        holidayStatus={holidayStatus}
        transportStatus={transportStatus}
        onOpenContext={() => setIsContextModalOpen(true)}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Operations Simulation & Observation Toolbar */}
        <section 
          id="ops-observation-toolbar"
          aria-label="Operations Observation Controls"
          className="bg-white border border-stone-200 rounded-xl p-3 sm:p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs"
        >
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-semibold text-stone-700 flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
              <SlidersHorizontal className="w-3.5 h-3.5 text-stone-400" />
              Observation Slot:
            </span>

            {/* Hour Picker */}
            <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-lg">
              <button
                type="button"
                onClick={() => {
                  setSelectedHour(16);
                  setTimeString('16:47');
                  startTransition(() => {
                    fetchData(16, 'weekday', 'Monday');
                  });
                }}
                className={`px-2.5 py-1 rounded font-mono font-medium transition-colors ${
                  selectedHour === 16 ? 'bg-white text-stone-950 shadow-xs' : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                16:47 (Afternoon Dip)
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedHour(10);
                  setTimeString('10:15');
                  startTransition(() => {
                    fetchData(10, 'weekday', 'Monday');
                  });
                }}
                className={`px-2.5 py-1 rounded font-mono font-medium transition-colors ${
                  selectedHour === 10 ? 'bg-white text-stone-950 shadow-xs' : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                10:15 (Morning Peak)
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedHour(14);
                  setTimeString('14:00');
                  startTransition(() => {
                    fetchData(14, 'weekday', 'Monday');
                  });
                }}
                className={`px-2.5 py-1 rounded font-mono font-medium transition-colors ${
                  selectedHour === 14 ? 'bg-white text-stone-950 shadow-xs' : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                14:00 (Post-Lunch)
              </button>
            </div>

            {/* Weather & Calendar Adjustment Scenarios */}
            <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-lg">
              <button
                type="button"
                onClick={() => setWeatherOverride('live')}
                className={`px-2 py-1 rounded font-medium flex items-center gap-1 transition-colors ${
                  weatherOverride === 'live' ? 'bg-white text-stone-950 shadow-xs' : 'text-stone-600 hover:text-stone-900'
                }`}
                title="Live Weather and PSI air quality feed from data.gov.sg"
              >
                <Sun className="w-3 h-3 text-amber-500" />
                <span>Live Feed</span>
              </button>

              <button
                type="button"
                onClick={() => setWeatherOverride('heavy_rain')}
                className={`px-2 py-1 rounded font-medium flex items-center gap-1 transition-colors ${
                  weatherOverride === 'heavy_rain' ? 'bg-white text-stone-950 shadow-xs' : 'text-stone-600 hover:text-stone-900'
                }`}
                title="Simulate Heavy Rain (~0.88 attendance factor)"
              >
                <CloudRain className="w-3 h-3 text-blue-500" />
                <span>Heavy Rain (-12%)</span>
              </button>

              <button
                type="button"
                onClick={() => setWeatherOverride('haze_unhealthy')}
                className={`px-2 py-1 rounded font-medium flex items-center gap-1 transition-colors ${
                  weatherOverride === 'haze_unhealthy' ? 'bg-white text-stone-950 shadow-xs' : 'text-stone-600 hover:text-stone-900'
                }`}
                title="Simulate Elevated Haze PSI 145 Unhealthy (-15% factor)"
              >
                <Wind className="w-3 h-3 text-orange-500" />
                <span>Haze PSI 145 (-15%)</span>
              </button>

              <button
                type="button"
                onClick={() => setWeatherOverride('holiday_adjacent')}
                className={`px-2 py-1 rounded font-medium flex items-center gap-1 transition-colors ${
                  weatherOverride === 'holiday_adjacent' ? 'bg-white text-stone-950 shadow-xs' : 'text-stone-600 hover:text-stone-900'
                }`}
                title="Simulate Public Holiday Adjacency (-20% factor)"
              >
                <Calendar className="w-3 h-3 text-rose-500" />
                <span>Holiday Adjacent (-20%)</span>
              </button>
            </div>
          </div>

          {/* Screen States Auditor Switcher (To test all 4 mandatory states) */}
          <div className="flex items-center gap-1.5 border-t sm:border-t-0 pt-2 sm:pt-0">
            <span className="text-stone-400 font-medium">Test State:</span>
            <select
              id="test-state-selector"
              aria-label="Operations State Tester"
              value={simulatedState || 'READY'}
              onChange={(e) => {
                const val = e.target.value;
                setSimulatedState(val === 'READY' ? null : (val as ScreenState));
              }}
              className="bg-stone-100 hover:bg-stone-200/70 border border-stone-200 text-stone-800 rounded px-2 py-1 text-xs font-mono font-medium outline-none cursor-pointer"
            >
              <option value="READY">Live Operational (Ready)</option>
              <option value="LOADING">State 1: Loading</option>
              <option value="EMPTY">State 2: Empty (Unknown Occupancy)</option>
              <option value="REFUSED">State 3: Refused (Transport 401)</option>
              <option value="UNREACHABLE">State 4: Unreachable Provider</option>
            </select>
          </div>
        </section>

        {/* 3. Screen State Banners (if Loading, Empty, Refused, or Unreachable) */}
        <StateBanner 
          state={activeScreenState} 
          lastTime={timeString} 
          onRetry={() => {
            setSimulatedState(null);
            fetchData();
          }} 
        />

        {/* Core Board Content (Renders when READY or gracefully degraded) */}
        {activeScreenState !== 'LOADING' && activeScreenState !== 'UNREACHABLE' && deviationsData && (
          <>
            {/* 4. The Operational Claim Card */}
            <ClaimCard
              selectedFloor={selectedFloor}
              dayName={deviationsData.dayName}
              attendanceFactor={deviationsData.attendanceFactor}
              weatherCondition={deviationsData.weatherCondition}
              areaName={deviationsData.areaName}
              airQuality={deviationsData.airQuality}
              isHolidayAdjacent={deviationsData.attendanceFactor < 0.9}
              isUnadjusted={deviationsData.isUnadjusted}
              claimSentence={deviationsData.claimSentence}
            />

            {/* 5. Exception Board (Ranked floors, historical baselines vs adjusted expectation) */}
            <ExceptionBoard
              floors={deviationsData.floors}
              excludedFloors={deviationsData.excludedFloors}
              selectedFloorName={selectedFloor?.floor || ''}
              onSelectFloor={(f) => setSelectedFloor(f)}
              attendanceFactor={deviationsData.attendanceFactor}
              unadjustedWarning={deviationsData.isUnadjusted && weatherOverride === 'live' && forecastStatus === 'UNREACHABLE'}
            />

            {/* 6. "How this is computed" Block (Collapsible, closed by default, live arithmetic) */}
            <ComputationBreakdown
              floor={selectedFloor}
              dayName={deviationsData.dayName}
              timeDisplay={timeString}
              attendanceFactor={deviationsData.attendanceFactor}
              weatherFactor={deviationsData.weatherFactor}
              hazeFactor={deviationsData.hazeFactor}
              weatherCondition={deviationsData.weatherCondition}
              areaName={deviationsData.areaName}
              airQuality={deviationsData.airQuality}
            />

            {/* 7. Corroborating Transport Signal (LTA DataMall) */}
            <TransportSignal
              transportData={transportData}
              isLoading={isRefreshing && !transportData}
            />
          </>
        )}
      </main>

      {/* 8. Footer with Verbatim Licence Text & Nager.Date Credit */}
      <Footer />

      {/* Operations Governance & Team Quotes Modal */}
      <WorkplaceContextModal
        isOpen={isContextModalOpen}
        onClose={() => setIsContextModalOpen(false)}
      />
    </div>
  );
}
