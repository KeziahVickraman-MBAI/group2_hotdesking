/**
 * api/health.js
 * Health monitoring endpoint for Operations.
 * Reports which keys are configured and whether each provider answered,
 * including upstream HTTP status codes.
 * NEVER prints any key or any part of one.
 */

import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Content-Type', 'application/json');

  const ltaKey = process.env.LTA_ACCOUNT_KEY;
  const isLtaConfigured = Boolean(ltaKey && typeof ltaKey === 'string' && ltaKey.trim() !== '');

  const results = {
    timestamp: new Date().toISOString(),
    keys: {
      LTA_ACCOUNT_KEY: {
        configured: isLtaConfigured
        // Never output any part of the key
      }
    },
    providers: {}
  };

  // 1. Check data.gov.sg two-hr-forecast
  const t0Weather = Date.now();
  try {
    const wResp = await fetch('https://api-open.data.gov.sg/v2/real-time/api/two-hr-forecast', {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(4000)
    });
    results.providers.dataGovSg = {
      name: 'data.gov.sg (Two-Hour Forecast)',
      reachable: wResp.ok,
      upstreamStatusCode: wResp.status,
      latencyMs: Date.now() - t0Weather,
      authType: 'Keyless (Singapore Open Data Licence 1.0)'
    };
  } catch (err) {
    results.providers.dataGovSg = {
      name: 'data.gov.sg (Two-Hour Forecast)',
      reachable: false,
      upstreamStatusCode: null,
      error: 'UNREACHABLE',
      detail: err instanceof Error ? err.message : String(err),
      latencyMs: Date.now() - t0Weather,
      authType: 'Keyless'
    };
  }

  // 2. Check Nager.Date
  const t0Holiday = Date.now();
  try {
    const hResp = await fetch('https://date.nager.at/api/v3/PublicHolidays/2026/SG', {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(4000)
    });
    results.providers.nagerDate = {
      name: 'Nager.Date Public Holidays (SG)',
      reachable: hResp.ok,
      upstreamStatusCode: hResp.status,
      latencyMs: Date.now() - t0Holiday,
      authType: 'Keyless'
    };
  } catch (err) {
    results.providers.nagerDate = {
      name: 'Nager.Date Public Holidays (SG)',
      reachable: false,
      upstreamStatusCode: null,
      error: 'UNREACHABLE',
      detail: err instanceof Error ? err.message : String(err),
      latencyMs: Date.now() - t0Holiday,
      authType: 'Keyless'
    };
  }

  // 3. Check LTA DataMall
  const t0Lta = Date.now();
  if (!isLtaConfigured) {
    results.providers.ltaDataMall = {
      name: 'LTA DataMall (CarParkAvailabilityv2)',
      configured: false,
      reachable: false,
      upstreamStatusCode: null,
      status: 'KEY_MISSING',
      message: 'LTA_ACCOUNT_KEY not configured in environment',
      authType: 'AccountKey Header (Keyed)'
    };
  } else {
    try {
      const lResp = await fetch('https://datamall2.mytransport.sg/ltaodataservice/CarParkAvailabilityv2?$top=1', {
        headers: {
          'AccountKey': ltaKey,
          'Accept': 'application/json'
        },
        signal: AbortSignal.timeout(4000)
      });
      results.providers.ltaDataMall = {
        name: 'LTA DataMall (CarParkAvailabilityv2)',
        configured: true,
        reachable: lResp.ok,
        upstreamStatusCode: lResp.status,
        status: lResp.ok ? 'HEALTHY' : (lResp.status === 401 ? 'REFUSED' : 'UPSTREAM_ERROR'),
        latencyMs: Date.now() - t0Lta,
        authType: 'AccountKey Header (Keyed)'
      };
    } catch (err) {
      results.providers.ltaDataMall = {
        name: 'LTA DataMall (CarParkAvailabilityv2)',
        configured: true,
        reachable: false,
        upstreamStatusCode: null,
        status: 'UNREACHABLE',
        error: err instanceof Error ? err.message : String(err),
        latencyMs: Date.now() - t0Lta,
        authType: 'AccountKey Header (Keyed)'
      };
    }
  }

  // 4. Check Desk Bookings Fixture
  const fixturePath = path.join(process.cwd(), 'data', 'bookings.json');
  const fixtureExists = fs.existsSync(fixturePath);
  let generatedOn = null;
  if (fixtureExists) {
    try {
      const parsed = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
      generatedOn = parsed.generatedOn;
    } catch {
      // ignore
    }
  }
  results.providers.deskBookings = {
    name: 'Desk Bookings Fixture',
    type: 'SYNTHETIC',
    present: fixtureExists,
    generatedOn: generatedOn,
    path: 'data/bookings.json',
    disclosure: 'Desk bookings are simulated — no public API publishes this data, because it identifies individuals.'
  };

  return res.status(200).json(results);
}
