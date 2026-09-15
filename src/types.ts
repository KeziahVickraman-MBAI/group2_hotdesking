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

export interface AirQualityData {
  psi: number | null;
  pm25?: number | null;
  band: 'Good' | 'Moderate' | 'Unhealthy' | 'Very Unhealthy' | 'Hazardous' | 'Unknown';
  descriptor: string;
  hazeFactor: number;
  region: string;
  updatedTimestamp?: string;
  regionalPsi?: Record<string, number>;
}

export interface DeviationsResponse {
  success: boolean;
  hour: number;
  day: string;
  dayName: string;
  timeDisplay: string;
  claimSentence: string;
  attendanceFactor: number;
  weatherFactor?: number;
  hazeFactor?: number;
  weatherCondition: string;
  areaName: string;
  airQuality?: AirQualityData | null;
  isUnadjusted: boolean;
  conditionsSentence: string;
  providerForecastStatus: ProviderStatus;
  providerPsiStatus?: ProviderStatus;
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
    dataGovSgPsi?: {
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
