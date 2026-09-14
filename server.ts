import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

import bookingsHandler from './api/bookings.js';
import conditionsHandler from './api/conditions.js';
import transportHandler from './api/transport.js';
import healthHandler from './api/health.js';
import deviationsHandler from './api/deviations.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.all('/api/bookings', (req, res) => bookingsHandler(req, res));
  app.all('/api/conditions', (req, res) => conditionsHandler(req, res));
  app.all('/api/transport', (req, res) => transportHandler(req, res));
  app.all('/api/health', (req, res) => healthHandler(req, res));
  app.all('/api/deviations', (req, res) => deviationsHandler(req, res));

  // Health probe for container
  app.get('/healthz', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Vite middleware in dev; static dist in prod
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Hot Desking Exception Board running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
