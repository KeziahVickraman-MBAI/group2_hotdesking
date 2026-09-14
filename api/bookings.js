import fs from 'fs';
import path from 'path';

/**
 * api/bookings.js
 * Reads the synthetic desk bookings fixture, filters to requested floor and hour.
 * Aggregation-only: no individual identifiers, employee IDs, or personal desk IDs.
 * Floors with < 5 bookings are suppressed to prevent re-identification.
 * Provenance (generatedOn) is included in every response.
 */
export default async function handler(req, res) {
  try {
    const filePath = path.join(process.cwd(), 'data', 'bookings.json');
    if (!fs.existsSync(filePath)) {
      res.setHeader('Cache-Control', 'no-cache');
      return res.status(404).json({
        error: 'FIXTURE_NOT_FOUND',
        message: 'Desk bookings fixture not found at data/bookings.json'
      });
    }

    const rawData = fs.readFileSync(filePath, 'utf-8');
    const fixture = JSON.parse(rawData);

    // Parse query params safely
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const queryHour = url.searchParams.get('hour');
    const queryFloor = url.searchParams.get('floor');

    // Default hour to 16 (4pm Singapore time) or parsed hour
    const hourInt = queryHour !== null && !isNaN(parseInt(queryHour, 10))
      ? parseInt(queryHour, 10)
      : 16;

    const floorResults = {};
    const floors = fixture.floors || {};

    for (const [floorName, floorData] of Object.entries(floors)) {
      if (queryFloor && queryFloor.toLowerCase() !== floorName.toLowerCase()) {
        continue;
      }

      const hourlyMap = floorData.hourly || {};
      const count = hourlyMap[String(hourInt)] !== undefined ? Number(hourlyMap[String(hourInt)]) : 0;

      // Aggregation constraint: counts under 5 are suppressed
      if (count < 5) {
        floorResults[floorName] = {
          floor: floorName,
          hour: hourInt,
          booked: null,
          suppressed: true,
          statusText: 'Too few bookings to report',
          generatedOn: fixture.generatedOn
        };
      } else {
        floorResults[floorName] = {
          floor: floorName,
          hour: hourInt,
          booked: count,
          suppressed: false,
          generatedOn: fixture.generatedOn
        };
      }
    }

    // Cache-Control: bookings 5 minutes because fixture is static and TTL exists for consistency
    res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=300');
    res.setHeader('Content-Type', 'application/json');

    return res.status(200).json({
      success: true,
      hour: hourInt,
      generatedOn: fixture.generatedOn,
      isSynthetic: true,
      disclosure: 'Desk bookings are simulated — no public API publishes this data, because it identifies individuals. The weather, holiday and transport signals are live.',
      floors: floorResults,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.setHeader('Cache-Control', 'no-cache');
    return res.status(500).json({
      error: 'SERVER_ERROR',
      message: 'Failed reading bookings fixture: ' + (err instanceof Error ? err.message : String(err))
    });
  }
}
