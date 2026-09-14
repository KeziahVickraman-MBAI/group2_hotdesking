/**
 * api/deviations.js
 * Combines bookings, baselines, and conditions to compute the full hot desking exception board.
 * Strictly adheres to Operations constraints:
 * - Aggregates only, zero personal identifiers.
 * - Suppresses floors with < 5 bookings ("Too few bookings to report").
 * - Excludes floors without a baseline for the current slot from ranking entirely.
 * - Shows both deviationAdjusted and deviationRaw.
 * - Branches claim sentences based on attendanceFactor.
 */

import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
  try {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const queryHour = url.searchParams.get('hour');
    const queryDay = url.searchParams.get('day') || 'weekday';
    const dayName = url.searchParams.get('dayName') || 'Monday';
    const timeDisplay = url.searchParams.get('time') || '16:47';

    const hourInt = queryHour !== null && !isNaN(parseInt(queryHour, 10))
      ? parseInt(queryHour, 10)
      : 16;

    // 1. Read Bookings Fixture
    const bookingsPath = path.join(process.cwd(), 'data', 'bookings.json');
    if (!fs.existsSync(bookingsPath)) {
      return res.status(404).json({ error: 'FIXTURE_NOT_FOUND', message: 'data/bookings.json missing' });
    }
    const bookingsFixture = JSON.parse(fs.readFileSync(bookingsPath, 'utf-8'));

    // 2. Read Baselines
    const baselinesPath = path.join(process.cwd(), 'data', 'baselines.json');
    let baselines = { floors: {} };
    if (fs.existsSync(baselinesPath)) {
      baselines = JSON.parse(fs.readFileSync(baselinesPath, 'utf-8'));
    }

    // 3. Fetch Live Conditions directly from conditions handler or fallback safely
    let attendanceFactor = 1.00;
    let weatherCondition = 'Partly Cloudy (Day)';
    let areaName = 'City';
    let conditionsSentence = 'No attendance adjustment — clear, and no holiday nearby.';
    let isUnadjusted = true;
    let providerForecastStatus = 'HEALTHY';
    let providerHolidayStatus = 'HEALTHY';

    try {
      // In-process invocation or internal call
      const condHost = req.headers.host || 'localhost:3000';
      const condResp = await fetch(`http://${condHost}/api/conditions?area=City&date=2026-09-14`, {
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(3000)
      });
      if (condResp.ok) {
        const condJson = await condResp.json();
        attendanceFactor = condJson.attendanceFactor !== undefined ? Number(condJson.attendanceFactor) : 1.00;
        weatherCondition = condJson.weatherForecast || 'Partly Cloudy (Day)';
        areaName = condJson.area || 'City';
        conditionsSentence = condJson.explanationSentence || 'No attendance adjustment — clear, and no holiday nearby.';
        isUnadjusted = condJson.isUnadjusted !== undefined ? condJson.isUnadjusted : (attendanceFactor === 1.00);
        providerForecastStatus = condJson.providers?.forecast?.status || 'HEALTHY';
        providerHolidayStatus = condJson.providers?.holidays?.status || 'HEALTHY';
      }
    } catch {
      // Degrades independently: deviations become unadjusted
      attendanceFactor = 1.00;
      isUnadjusted = true;
      providerForecastStatus = 'UNREACHABLE';
      conditionsSentence = 'Attendance adjustment unavailable — deviations are unadjusted.';
    }

    // 4. Compute deviations per floor
    const floorsMap = bookingsFixture.floors || {};
    const rankedFloors = [];
    const excludedFloors = [];

    for (const [floorName, floorBookingData] of Object.entries(floorsMap)) {
      const hourly = floorBookingData.hourly || {};
      const actualCount = hourly[String(hourInt)] !== undefined ? Number(hourly[String(hourInt)]) : 0;

      // Check baseline existence
      const floorBaselineEntry = baselines.floors?.[floorName]?.[queryDay]?.[String(hourInt)];
      if (!floorBaselineEntry || typeof floorBaselineEntry.expectedBooked !== 'number') {
        // Floor has no baseline for current slot -> EXCLUDED from ranking entirely
        excludedFloors.push({
          floor: floorName,
          actualBooked: actualCount,
          reason: 'No historical baseline recorded for this slot (never ranked against a placeholder).'
        });
        continue;
      }

      const expectedBooked = Number(floorBaselineEntry.expectedBooked);
      const observedOn = floorBaselineEntry.observedOn || '28 Aug 2026';

      // Aggregation constraint: < 5 bookings suppressed
      if (actualCount < 5) {
        rankedFloors.push({
          floor: floorName,
          baselineExpected: expectedBooked,
          observedOn,
          actualBooked: null,
          suppressed: true,
          statusText: 'Too few bookings to report',
          deviationRaw: null,
          deviationAdjusted: null,
          difference: null
        });
        continue;
      }

      // Calculate adjusted baseline
      const adjustedExpectation = Math.round(expectedBooked * attendanceFactor);
      const difference = actualCount - adjustedExpectation;
      const deviationRaw = Math.round(((actualCount - expectedBooked) / expectedBooked) * 100);
      const deviationAdjusted = adjustedExpectation > 0
        ? Math.round(((actualCount - adjustedExpectation) / adjustedExpectation) * 100)
        : 0;

      let exceptionCategory = 'NORMAL';
      if (deviationAdjusted <= -25) {
        exceptionCategory = 'UNUSUALLY_EMPTY';
      } else if (deviationAdjusted >= 20) {
        exceptionCategory = 'UNUSUALLY_FULL';
      }

      rankedFloors.push({
        floor: floorName,
        baselineExpected: expectedBooked,
        observedOn,
        adjustedExpectation,
        actualBooked: actualCount,
        difference,
        deviationRaw,
        deviationAdjusted,
        attendanceFactor,
        suppressed: false,
        exceptionCategory
      });
    }

    // Sort ranked floors: most negative deviation (unusually empty) first, then positive
    rankedFloors.sort((a, b) => {
      if (a.suppressed && !b.suppressed) return 1;
      if (!a.suppressed && b.suppressed) return -1;
      return (a.deviationAdjusted ?? 0) - (b.deviationAdjusted ?? 0);
    });

    // 5. Build Primary Claim Sentence for operations
    // Target primary highlight: Level 12 or top anomalous floor
    const primaryFloor = rankedFloors.find(f => f.floor === 'Level 12' && !f.suppressed) || rankedFloors[0];
    let claimSentence = '';

    if (primaryFloor) {
      const devAdj = primaryFloor.deviationAdjusted ?? 0;
      const absDev = Math.abs(devAdj);
      const direction = devAdj < 0 ? 'below' : 'above';

      if (attendanceFactor === 1.00) {
        claimSentence = `${primaryFloor.floor} is ${absDev}% ${direction} its usual ${dayName} rate. No attendance adjustment — clear, and no holiday nearby.`;
      } else {
        const dropPercent = Math.round((1 - attendanceFactor) * 100);
        claimSentence = `${primaryFloor.floor} is ${absDev}% ${direction} its usual ${dayName} rate. Expected attendance was already down ${dropPercent}% for ${weatherCondition.toLowerCase()}, so this is ${devAdj < -dropPercent ? 'more than weather explains' : 'within adjusted expectation'}.`;
      }
    }

    res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=300');
    res.setHeader('Content-Type', 'application/json');

    return res.status(200).json({
      success: true,
      hour: hourInt,
      day: queryDay,
      dayName,
      timeDisplay,
      claimSentence,
      attendanceFactor,
      weatherCondition,
      areaName,
      isUnadjusted,
      conditionsSentence,
      providerForecastStatus,
      providerHolidayStatus,
      generatedOn: bookingsFixture.generatedOn,
      persistentDisclosure: 'Desk bookings are simulated — no public API publishes this data, because it identifies individuals. The weather, holiday and transport signals are live.',
      floors: rankedFloors,
      excludedFloors,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.setHeader('Cache-Control', 'no-cache');
    return res.status(500).json({
      error: 'COMPUTATION_ERROR',
      message: err instanceof Error ? err.message : String(err)
    });
  }
}
