export type ProviderStatus = 'HEALTHY' | 'UNREACHABLE' | 'REFUSED' | 'MISSING_KEY' | 'DEGRADED';

export type ScreenState = 'LOADING' | 'READY' | 'EMPTY' | 'REFUSED' | 'UNREACHABLE';

export interface FloorDeviation {
  floor: string;
  baselineExpected: number | null;
  observedOn?: string;
  adjustedExpectation?: number | null;
  actualBooked: number | null;
  difference?: number | null;
  deviationRaw: number | null;
  deviationAdjusted: number | null;
  attendanceFactor?: number;
  suppressed: boolean;
  statusText?: string;
  exceptionCategory?: 'UNUSUALLY_EMPTY' | 'UNUSUALLY_FULL' | 'NORMAL';
}

export interface ExcludedFloor {
  floor: string;
  actualBooked: number;
  reason: string;
}

export interface DeviationsResponse {
  success: boolean;
  hour: number;
  day: string;
  dayName: string;
  timeDisplay: string;
  claimSentence: string;
  attendanceFactor: number;
  weatherCondition: string;
  areaName: string;
  isUnadjusted: boolean;
  conditionsSentence: string;
  providerForecastStatus: ProviderStatus;
  providerHolidayStatus: ProviderStatus;
  generatedOn: string;
  persistentDisclosure: string;
  floors: FloorDeviation[];
  excludedFloors: ExcludedFloor[];
  timestamp: string;
}

export interface WatchedCarpark {
  carParkId: string;
  development: string;
  area: string;
  availableLots: number;
  baselineAvailableLots: number;
  difference: number;
}

export interface TransportResponse {
  success: boolean;
  providerState: ProviderStatus;
  error?: string;
  message?: string;
  watchedCarparks?: WatchedCarpark[];
  totalWatchedAvailable?: number;
  totalWatchedBaseline?: number;
  watchedAvailableDeltaPercent?: number;
  corroboratingSummary?: string;
  recordsAnalyzed?: number;
  pagesFetched?: number;
  timestamp: string;
}

export interface HealthResponse {
  timestamp: string;
  keys: {
    LTA_ACCOUNT_KEY: {
      configured: boolean;
    };
  };
  providers: {
    dataGovSg?: {
      reachable: boolean;
      upstreamStatusCode: number | null;
    };
    nagerDate?: {
      reachable: boolean;
      upstreamStatusCode: number | null;
    };
    ltaDataMall?: {
      configured: boolean;
      reachable: boolean;
      upstreamStatusCode: number | null;
      status: string;
    };
    deskBookings?: {
      present: boolean;
      generatedOn: string | null;
    };
  };
}
