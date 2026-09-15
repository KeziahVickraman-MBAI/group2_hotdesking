/**
 * api/conditions.js
 * Keyless endpoint calling data.gov.sg 2-hour forecast and Nager.Date public holidays.
 * Can be UNREACHABLE, but never REFUSED (no credentials used).
 * Aggregates attendance factor with strict casing and fallback logging.
 */

// In-memory cache to respect the tight data.gov.sg rate limit (~6 calls per 10s campus-wide)
let cachedWeather = null;
let cachedWeatherTime = 0;
let cachedPsi = null;
let cachedPsiTime = 0;
let cachedHolidays = null;
let cachedHolidaysTime = 0;
let confirmedSgAvailable = false;

const ATTENDANCE_FACTORS = {
  // Heavy rain or thundery showers ~0.88
  'Heavy Rain': 0.88,
  'Heavy Thundery Showers': 0.88,
  'Thundery Showers': 0.88,
  'Heavy Thundery Showers with Gusty Winds': 0.88,

  // Moderate or light rain, showers ~0.93
  'Moderate Rain': 0.93,
  'Light Rain': 0.93,
  'Showers': 0.93,
  'Light Showers': 0.93,
  'Passing Showers': 0.93,

  // Cloudy or overcast ~0.98
  'Cloudy': 0.98,
  'Overcast': 0.98,
  'Partly Cloudy': 0.98,

  // Anything else 1.00
  'Fair': 1.00,
  'Windy': 1.00,
  'Hazy': 0.92, // Forecast mentions haze
  'Slightly Hazy': 0.97
};

/**
 * Determine NEA PSI air quality band, descriptor, and attendance reduction factor.
 * When PSI climbs, employees with respiratory vulnerabilities or long commutes opt to WFH.
 *
 * PSI Bands (Singapore NEA standard):
 * 0 - 50:    Good (Factor: 1.00 - normal)
 * 51 - 100:  Moderate (Factor: 0.98 - negligible impact)
 * 101 - 200: Unhealthy (Factor: 0.85 - notable drop in office transit, vulnerable groups stay home)
 * 201 - 300: Very Unhealthy (Factor: 0.70 - school advisories, advisory to minimise outdoor exposure)
 * > 300:     Hazardous (Factor: 0.50 - work-from-home default)
 */
function evaluatePsiImpact(psiValue) {
  if (psiValue === null || psiValue === undefined || isNaN(psiValue)) {
    return {
      psi: null,
      band: 'Unknown',
      descriptor: 'Unknown',
      factor: 1.00,
      suppressionPercent: 0
    };
  }

  const val = Math.round(psiValue);
  if (val <= 50) {
    return { psi: val, band: 'Good', descriptor: 'Good', factor: 1.00, suppressionPercent: 0 };
  } else if (val <= 100) {
    return { psi: val, band: 'Moderate', descriptor: 'Moderate', factor: 0.98, suppressionPercent: 2 };
  } else if (val <= 200) {
    return { psi: val, band: 'Unhealthy', descriptor: 'Unhealthy Haze', factor: 0.85, suppressionPercent: 15 };
  } else if (val <= 300) {
    return { psi: val, band: 'Very Unhealthy', descriptor: 'Very Unhealthy Haze', factor: 0.70, suppressionPercent: 30 };
  } else {
    return { psi: val, band: 'Hazardous', descriptor: 'Hazardous Haze', factor: 0.50, suppressionPercent: 50 };
  }
}

export default async function handler(req, res) {
  const now = Date.now();
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const areaTarget = url.searchParams.get('area') || 'City';
  const targetDateStr = url.searchParams.get('date') || '2026-09-14';

    let weatherData = null;
    let weatherError = null;
    let psiData = null;
    let psiError = null;
    let holidaysData = null;
    let holidayError = null;
    let rawForecastString = null;
    let unmatchedForecast = null;
    let weatherFactor = 1.00;
    let weatherReason = '';

    // 1. Confirm Nager.Date supports SG once
  if (!confirmedSgAvailable) {
    try {
      const resp = await fetch('https://date.nager.at/api/v3/AvailableCountries', {
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(5000)
      });
      if (resp.ok) {
        const countries = await resp.json();
        if (Array.isArray(countries) && countries.some(c => c && (c.key === 'SG' || c.countryCode === 'SG'))) {
          confirmedSgAvailable = true;
        }
      }
    } catch {
      // Non-blocking; continue to holidays fetch
    }
  }

  // 2. Fetch Public Holidays (cache for 24h)
  const targetYear = targetDateStr.slice(0, 4) || '2026';
  if (cachedHolidays && (now - cachedHolidaysTime < 24 * 60 * 60 * 1000) && cachedHolidays.year === targetYear) {
    holidaysData = cachedHolidays.data;
  } else {
    try {
      const hResp = await fetch(`https://date.nager.at/api/v3/PublicHolidays/${targetYear}/SG`, {
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(6000)
      });
      if (hResp.ok) {
        const hJson = await hResp.json();
        // An empty array is a valid answer and not an error
        holidaysData = Array.isArray(hJson) ? hJson : [];
        cachedHolidays = { year: targetYear, data: holidaysData };
        cachedHolidaysTime = now;
      } else {
        holidayError = `Nager.Date upstream status ${hResp.status}`;
      }
    } catch (err) {
      holidayError = 'Unreachable: ' + (err instanceof Error ? err.message : String(err));
    }
  }

  // 3. Fetch 2-hour forecast from data.gov.sg (cache 5 mins / 300s)
  if (cachedWeather && (now - cachedWeatherTime < 300 * 1000)) {
    weatherData = cachedWeather;
  } else {
    try {
      const wResp = await fetch('https://api-open.data.gov.sg/v2/real-time/api/two-hr-forecast', {
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(6000)
      });
      if (wResp.ok) {
        const wJson = await wResp.json();
        if (wJson && wJson.data) {
          weatherData = wJson.data;
          cachedWeather = weatherData;
          cachedWeatherTime = now;
        } else {
          weatherError = 'Empty or malformed payload from data.gov.sg';
        }
      } else {
        weatherError = `data.gov.sg upstream status ${wResp.status}`;
      }
    } catch (err) {
      weatherError = 'Unreachable: ' + (err instanceof Error ? err.message : String(err));
    }
  }

  // 4. Fetch 24-hr PSI air quality from data.gov.sg (cache 5 mins / 300s)
  if (cachedPsi && (now - cachedPsiTime < 300 * 1000)) {
    psiData = cachedPsi;
  } else {
    try {
      const psiResp = await fetch('https://api-open.data.gov.sg/v2/real-time/api/psi', {
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(6000)
      });
      if (psiResp.ok) {
        const psiJson = await psiResp.json();
        if (psiJson && psiJson.data) {
          psiData = psiJson.data;
          cachedPsi = psiData;
          cachedPsiTime = now;
        } else {
          psiError = 'Empty or malformed PSI payload from data.gov.sg';
        }
      } else {
        psiError = `data.gov.sg PSI upstream status ${psiResp.status}`;
      }
    } catch (err) {
      psiError = 'Unreachable: ' + (err instanceof Error ? err.message : String(err));
    }
  }

  // Parse forecast for target area
  let areaFound = false;
  let forecastAreaName = areaTarget;

  if (weatherData && weatherData.items && weatherData.items[0] && Array.isArray(weatherData.items[0].forecasts)) {
    const forecasts = weatherData.items[0].forecasts;
    const match = forecasts.find(f => f && f.area && f.area.toLowerCase() === areaTarget.toLowerCase())
      || forecasts.find(f => f && f.area && f.area.toLowerCase() === 'city')
      || forecasts[0];

    if (match) {
      areaFound = true;
      forecastAreaName = match.area;
      rawForecastString = match.forecast;

      // Handle (Day) and (Night) suffixes case-sensitively
      let baseString = rawForecastString;
      if (baseString.endsWith(' (Day)')) {
        baseString = baseString.replace(/ \(Day\)$/, '').trim();
      } else if (baseString.endsWith(' (Night)')) {
        baseString = baseString.replace(/ \(Night\)$/, '').trim();
      }

      if (Object.prototype.hasOwnProperty.call(ATTENDANCE_FACTORS, baseString)) {
        weatherFactor = ATTENDANCE_FACTORS[baseString];
        weatherReason = `${rawForecastString}, ${forecastAreaName}`;
      } else if (Object.prototype.hasOwnProperty.call(ATTENDANCE_FACTORS, rawForecastString)) {
        weatherFactor = ATTENDANCE_FACTORS[rawForecastString];
        weatherReason = `${rawForecastString}, ${forecastAreaName}`;
      } else {
        // Fall back to 1.00 for anything unrecognised, log it, and surface unmatched strings
        console.warn(`[conditions] Unrecognised forecast vocabulary: "${rawForecastString}". Falling back to 1.00.`);
        unmatchedForecast = rawForecastString;
        weatherFactor = 1.00;
        weatherReason = `${rawForecastString} (unmatched, defaulting to 1.00), ${forecastAreaName}`;
      }
    }
  }

  // Parse PSI readings
  let regionPsiMap = {};
  let regionPm25Map = {};
  let targetRegion = 'central'; // Default Singapore central/business area
  const areaLower = areaTarget.toLowerCase();
  if (areaLower.includes('west') || areaLower.includes('jurong') || areaLower.includes('clementi')) {
    targetRegion = 'west';
  } else if (areaLower.includes('north') || areaLower.includes('woodlands') || areaLower.includes('yishun')) {
    targetRegion = 'north';
  } else if (areaLower.includes('east') || areaLower.includes('changi') || areaLower.includes('tampines') || areaLower.includes('bedok')) {
    targetRegion = 'east';
  } else if (areaLower.includes('south') || areaLower.includes('harbourfront') || areaLower.includes('sentosa')) {
    targetRegion = 'south';
  }

  let selectedPsiValue = null;
  let selectedPm25Value = null;
  let psiUpdatedTimestamp = null;

  if (psiData && Array.isArray(psiData.items) && psiData.items.length > 0) {
    const latestItem = psiData.items[psiData.items.length - 1];
    psiUpdatedTimestamp = latestItem.updatedTimestamp || latestItem.timestamp;
    const readings = latestItem.readings || {};
    regionPsiMap = readings.psi_twenty_four_hourly || {};
    regionPm25Map = readings.pm25_twenty_four_hourly || {};

    selectedPsiValue = regionPsiMap[targetRegion] !== undefined 
      ? regionPsiMap[targetRegion] 
      : (regionPsiMap['central'] || regionPsiMap['national'] || Object.values(regionPsiMap)[0] || null);

    selectedPm25Value = regionPm25Map[targetRegion] !== undefined
      ? regionPm25Map[targetRegion]
      : (regionPm25Map['central'] || Object.values(regionPm25Map)[0] || null);
  }

  const airQualityAssessment = evaluatePsiImpact(selectedPsiValue);
  const hazeFactor = airQualityAssessment.factor;

  // Check Holiday Adjacency for Weekdays
  const currentDate = new Date(targetDateStr + 'T12:00:00Z');
  const dayOfWeek = currentDate.getUTCDay(); // 0 = Sun, 1 = Mon, ... 6 = Sat
  const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;
  let isHolidayAdjacent = false;
  let holidayName = null;

  if (isWeekday && Array.isArray(holidaysData)) {
    // Check if targetDate itself is a holiday or adjacent to one
    const oneDayMs = 24 * 60 * 60 * 1000;
    const prevDate = new Date(currentDate.getTime() - oneDayMs);
    const nextDate = new Date(currentDate.getTime() + oneDayMs);
    // Also check Friday-to-Monday bridge
    const prevFriday = dayOfWeek === 1 ? new Date(currentDate.getTime() - 3 * oneDayMs) : null;
    const nextMonday = dayOfWeek === 5 ? new Date(currentDate.getTime() + 3 * oneDayMs) : null;

    const datesToCheck = [
      prevDate.toISOString().slice(0, 10),
      nextDate.toISOString().slice(0, 10),
      prevFriday ? prevFriday.toISOString().slice(0, 10) : null,
      nextMonday ? nextMonday.toISOString().slice(0, 10) : null
    ].filter(Boolean);

    for (const h of holidaysData) {
      if (h && datesToCheck.includes(h.date)) {
        isHolidayAdjacent = true;
        holidayName = h.name || h.localName;
        break;
      }
    }
  }

  // Calculate combined attendance factor:
  // Macro conditions compound: weather forecast * air quality (haze) * public holiday adjacency
  let combinedFactor = weatherFactor * hazeFactor;
  let holidayMultiplier = 1.00;

  if (isHolidayAdjacent) {
    holidayMultiplier = 0.80;
    combinedFactor = combinedFactor * holidayMultiplier;
  }

  // Round combined factor to 2 decimal places
  combinedFactor = Math.round(combinedFactor * 100) / 100;

  // Build human-readable conditions explanation sentence strictly branched
  let explanationSentence = '';
  const suppressionPercent = Math.round((1 - combinedFactor) * 100);

  if (combinedFactor === 1.00) {
    explanationSentence = 'No attendance adjustment — clear, normal air quality, and no holiday nearby.';
  } else {
    const reasons = [];
    if (weatherFactor < 1.00) {
      reasons.push(rawForecastString?.toLowerCase() || 'weather');
    }
    if (hazeFactor < 1.00) {
      reasons.push(`haze (PSI ${selectedPsiValue || 'elevated'}, ${airQualityAssessment.band.toLowerCase()})`);
    }
    if (isHolidayAdjacent) {
      reasons.push(`proximity to ${holidayName}`);
    }
    explanationSentence = `after lowering the expectation ${suppressionPercent}% for ${reasons.join(' and ')}.`;
  }

  // Determine Provider Health & Status
  const forecastStatus = weatherError ? 'UNREACHABLE' : 'HEALTHY';
  const psiStatus = psiError ? 'UNREACHABLE' : 'HEALTHY';
  const holidayStatus = holidayError ? 'UNREACHABLE' : 'HEALTHY';

  // Cache-Control: conditions 5 minutes because campus-wide rate limit on data.gov.sg is tight
  res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=300');
  res.setHeader('Content-Type', 'application/json');

  return res.status(200).json({
    success: true,
    attendanceFactor: combinedFactor,
    weatherFactor,
    hazeFactor,
    holidayMultiplier,
    isHolidayAdjacent,
    holidayName,
    weatherForecast: rawForecastString || (weatherError ? 'Unavailable' : 'Unknown'),
    area: forecastAreaName,
    unmatchedForecast,
    reason: weatherReason,
    explanationSentence,
    suppressionPercent,
    isUnadjusted: combinedFactor === 1.00,
    airQuality: {
      psi: selectedPsiValue,
      pm25: selectedPm25Value,
      band: airQualityAssessment.band,
      descriptor: airQualityAssessment.descriptor,
      hazeFactor,
      region: targetRegion,
      updatedTimestamp: psiUpdatedTimestamp,
      regionalPsi: regionPsiMap
    },
    providers: {
      forecast: {
        status: forecastStatus,
        reachable: !weatherError,
        error: weatherError,
        licence: 'Singapore Open Data Licence version 1.0',
        cached: now - cachedWeatherTime < 300 * 1000
      },
      psi: {
        status: psiStatus,
        reachable: !psiError,
        error: psiError,
        licence: 'Singapore Open Data Licence version 1.0',
        cached: now - cachedPsiTime < 300 * 1000
      },
      holidays: {
        status: holidayStatus,
        reachable: !holidayError,
        error: holidayError,
        source: 'Nager.Date v3'
      }
    },
    timestamp: new Date().toISOString()
  });
}
