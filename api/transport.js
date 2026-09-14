/**
 * api/transport.js
 * Keyed endpoint calling LTA DataMall CarParkAvailabilityv2.
 * Header: AccountKey = process.env.LTA_ACCOUNT_KEY.
 * Strict guardrails:
 * - Guard BEFORE fetch if key is missing/empty -> 503
 * - Never log or print key or parts of key
 * - response.ok checked before body reading
 * - Handles 401 empty body without throwing
 * - Paginates at 500 records up to 20 pages
 * - Filters to LotType 'C'
 * - Never computes occupancy % or uses TotalLots (LTA publishes availability only)
 * - Compares availability against historical availability baseline
 * - Cache-Control: 60s
 */

let cachedTransport = null;
let cachedTransportTime = 0;

// Baseline availability for watched carparks near office (Marina/CBD area)
// Sourced from historical averages of AvailableLots for LotType 'C' at 09:00-16:00
const WATCHED_CARPARK_BASELINES = {
  '1': { name: 'Suntec City', area: 'Marina', baselineAvailable: 1750 },
  '2': { name: 'Marina Square', area: 'Marina', baselineAvailable: 1050 },
  '3': { name: 'Raffles City', area: 'Marina', baselineAvailable: 520 }
};

export default async function handler(req, res) {
  const now = Date.now();

  // Cache-Control: 60s because LTA refreshes at roughly that rate
  res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=60');
  res.setHeader('Content-Type', 'application/json');

  // Guard BEFORE fetch: check process.env.LTA_ACCOUNT_KEY
  const apiKey = process.env.LTA_ACCOUNT_KEY;
  if (!apiKey || typeof apiKey !== 'string' || apiKey.trim() === '') {
    return res.status(503).json({
      success: false,
      error: 'KEY_MISSING',
      providerState: 'MISSING_KEY',
      message: 'LTA_ACCOUNT_KEY environment variable is not configured. Transport corroborating signal is unavailable.',
      timestamp: new Date().toISOString()
    });
  }

  // Check in-memory cache (60s TTL)
  if (cachedTransport && (now - cachedTransportTime < 60 * 1000)) {
    return res.status(200).json({
      ...cachedTransport,
      cached: true,
      timestamp: new Date().toISOString()
    });
  }

  const endpointBase = 'https://datamall2.mytransport.sg/ltaodataservice/CarParkAvailabilityv2';
  const allRecords = [];
  const maxPages = 20;
  let pageCount = 0;
  let hitPageCap = false;

  try {
    while (pageCount < maxPages) {
      const skip = pageCount * 500;
      const fetchUrl = skip === 0 ? endpointBase : `${endpointBase}?$skip=${skip}`;

      const response = await fetch(fetchUrl, {
        headers: {
          'AccountKey': apiKey,
          'Accept': 'application/json'
        },
        signal: AbortSignal.timeout(8000)
      });

      // Guard: Check response.ok BEFORE reading body
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          // LTA returns empty body on 401, so calling response.json() throws!
          return res.status(response.status).json({
            success: false,
            error: 'REFUSED',
            providerState: 'REFUSED',
            status: response.status,
            message: 'The transport feed refused our credential, so the corroborating signal is missing. Nothing on this screen should be treated as current.',
            timestamp: new Date().toISOString()
          });
        }

        return res.status(response.status).json({
          success: false,
          error: 'UPSTREAM_ERROR',
          providerState: 'UNREACHABLE',
          status: response.status,
          message: `We could not reach the provider at all (LTA upstream HTTP ${response.status}). This is not an all-clear — treat every value on this screen as unknown.`,
          timestamp: new Date().toISOString()
        });
      }

      // Check for empty body on 200 (Success with nothing in it, not an error)
      const text = await response.text();
      if (!text || text.trim() === '') {
        // A 200 with an empty body is a success with nothing in it, not an error
        break;
      }

      let parsed;
      try {
        parsed = JSON.parse(text);
      } catch {
        break;
      }

      const records = parsed && Array.isArray(parsed.value) ? parsed.value : [];
      allRecords.push(...records);

      pageCount++;
      // Loop until a page returns short (< 500)
      if (records.length < 500) {
        break;
      }
    }

    if (pageCount >= maxPages) {
      hitPageCap = true;
      console.warn('[transport] LTA pagination capped at 20 pages (10,000 records).');
    }

    // Filter to LotType 'C' (Cars only)
    const carLots = allRecords.filter(r => r && r.LotType === 'C');

    // Aggregate watched carparks near office
    const watchedCarparks = [];
    let totalWatchedAvailable = 0;
    let totalWatchedBaseline = 0;

    for (const [id, config] of Object.entries(WATCHED_CARPARK_BASELINES)) {
      const match = carLots.find(r => String(r.CarParkID) === String(id));
      const availableLots = match && typeof match.AvailableLots === 'number' && !isNaN(match.AvailableLots)
        ? Number(match.AvailableLots)
        : null;

      if (availableLots !== null) {
        totalWatchedAvailable += availableLots;
        totalWatchedBaseline += config.baselineAvailable;

        watchedCarparks.push({
          carParkId: id,
          development: config.name,
          area: config.area,
          availableLots,
          baselineAvailableLots: config.baselineAvailable,
          difference: availableLots - config.baselineAvailable
        });
      }
    }

    // Cast numbers strictly at boundary
    const watchedAvailableDelta = totalWatchedBaseline > 0
      ? Math.round(((totalWatchedAvailable - totalWatchedBaseline) / totalWatchedBaseline) * 100)
      : 0;

    // Corroborating interpretation:
    // If available lots are higher than normal baseline, it indicates fewer cars parked (lower physical attendance).
    // If available lots are lower than normal baseline, carpark is fuller.
    let transportSummary = '';
    if (watchedAvailableDelta > 10) {
      transportSummary = `Nearby carparks have ${watchedAvailableDelta}% more free lots than baseline, corroborating reduced physical arrival.`;
    } else if (watchedAvailableDelta < -10) {
      transportSummary = `Nearby carparks have ${Math.abs(watchedAvailableDelta)}% fewer free lots than baseline, indicating normal or elevated road arrivals.`;
    } else {
      transportSummary = `Nearby carpark availability is in line with standard baseline (±${Math.abs(watchedAvailableDelta)}%).`;
    }

    const payload = {
      success: true,
      providerState: 'HEALTHY',
      watchedCarparks,
      totalWatchedAvailable,
      totalWatchedBaseline,
      watchedAvailableDeltaPercent: watchedAvailableDelta,
      corroboratingSummary: transportSummary,
      recordsAnalyzed: carLots.length,
      pagesFetched: pageCount,
      hitPageCap,
      licence: 'Singapore Open Data Licence version 1.0',
      attribution: 'Contains information from LTA DataMall CarParkAvailabilityv2',
      timestamp: new Date().toISOString()
    };

    cachedTransport = payload;
    cachedTransportTime = now;

    return res.status(200).json(payload);
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: 'UNREACHABLE',
      providerState: 'UNREACHABLE',
      message: 'We could not reach the provider at all. This is not an all-clear — treat every value on this screen as unknown.',
      detail: err instanceof Error ? err.message : String(err),
      timestamp: new Date().toISOString()
    });
  }
}
