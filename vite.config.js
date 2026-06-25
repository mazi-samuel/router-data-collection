import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'

// Custom local database plugin to write CSV files for Excel integration
function localDbPlugin() {
  const dataDir = path.resolve(process.cwd(), 'data');
  const jsonPath = path.resolve(dataDir, 'routes.json');
  const routesCsvPath = path.resolve(dataDir, 'routes.csv');
  const stopsCsvPath = path.resolve(dataDir, 'stops.csv');
  const altsCsvPath = path.resolve(dataDir, 'alternatives.csv');

  // Helper to escape CSV values for Excel compatibility
  function csvEscape(val) {
    if (val === undefined || val === null) return '';
    let str = String(val).replace(/"/g, '""');
    if (str.includes(',') || str.includes('\n') || str.includes('"')) {
      return `"${str}"`;
    }
    return str;
  }

  // Ensure directories and headers exist
  function initDb() {
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    if (!fs.existsSync(jsonPath)) {
      fs.writeFileSync(jsonPath, JSON.stringify([]));
    }
    if (!fs.existsSync(routesCsvPath)) {
      const headers = [
        'id', 'contributor', 'from', 'to', 'vehicles', 
        'baseFare', 'peakFare', 'offPeakFare', 'negotiable', 
        'negotiateTip', 'dayType', 'timeOfDay', 'condition', 
        'notes', 'landmark', 'timestamp'
      ].join(',');
      fs.writeFileSync(routesCsvPath, headers + '\n', 'utf8');
    }
    if (!fs.existsSync(stopsCsvPath)) {
      const headers = ['routeId', 'stopIndex', 'name', 'fare', 'note'].join(',');
      fs.writeFileSync(stopsCsvPath, headers + '\n', 'utf8');
    }
    if (fs.existsSync(altsCsvPath)) {
      try {
        const content = fs.readFileSync(altsCsvPath, 'utf8');
        const firstLine = content.split('\n')[0].trim();
        if (firstLine.includes(',vehicle,')) {
          fs.unlinkSync(altsCsvPath);
        }
      } catch {}
    }
    if (!fs.existsSync(altsCsvPath)) {
      const headers = ['routeId', 'altIndex', 'vehicles', 'fare', 'peakFare', 'offPeakFare', 'note'].join(',');
      fs.writeFileSync(altsCsvPath, headers + '\n', 'utf8');
    }
  }

  return {
    name: 'local-db-plugin',
    configureServer(server) {
      // Initialize on startup
      initDb();

      server.middlewares.use((req, res, next) => {
        // GET /api/entries
        if (req.url === '/api/entries' && req.method === 'GET') {
          res.setHeader('Content-Type', 'application/json');
          try {
            const data = fs.readFileSync(jsonPath, 'utf-8');
            res.end(data);
          } catch (e) {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: e.message }));
          }
          return;
        }

        // POST /api/submit
        if (req.url === '/api/submit' && req.method === 'POST') {
          let body = '';
          req.on('data', chunk => {
            body += chunk;
          });
          req.on('end', () => {
            try {
              const entry = JSON.parse(body);
              initDb(); // Ensure files exist

              // 1. Save to JSON list
              let entries = [];
              try {
                const raw = fs.readFileSync(jsonPath, 'utf-8');
                entries = JSON.parse(raw);
              } catch {}
              entries.unshift(entry);
              fs.writeFileSync(jsonPath, JSON.stringify(entries, null, 2), 'utf-8');

              // 2. Append to routes.csv
              const routeRow = [
                entry.id,
                entry.contributor,
                entry.from,
                entry.to,
                (entry.vehicles || []).join(';'),
                entry.baseFare,
                entry.peakFare,
                entry.offPeakFare,
                entry.negotiable ? 'TRUE' : 'FALSE',
                entry.negotiateTip,
                entry.dayType,
                entry.timeOfDay,
                entry.condition,
                entry.notes,
                entry.landmark,
                entry.ts
              ].map(csvEscape).join(',');
              fs.appendFileSync(routesCsvPath, routeRow + '\n', 'utf8');

              // 3. Append to stops.csv
              if (Array.isArray(entry.stops)) {
                entry.stops.forEach((stop, index) => {
                  if (!stop.name) return;
                  const stopRow = [
                    entry.id,
                    index + 1,
                    stop.name,
                    stop.fare,
                    stop.note
                  ].map(csvEscape).join(',');
                  fs.appendFileSync(stopsCsvPath, stopRow + '\n', 'utf8');
                });
              }

              // 4. Append to alternatives.csv
              if (Array.isArray(entry.alts)) {
                entry.alts.forEach((alt, index) => {
                  if (!alt.vehicles || alt.vehicles.length === 0) return;
                  const altRow = [
                    entry.id,
                    index + 1,
                    (alt.vehicles || []).join(';'),
                    alt.fare,
                    alt.peakFare,
                    alt.offPeakFare,
                    alt.note
                  ].map(csvEscape).join(',');
                  fs.appendFileSync(altsCsvPath, altRow + '\n', 'utf8');
                });
              }

              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: true }));
            } catch (e) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: e.message }));
            }
          });
          return;
        }

        next();
      });
    }
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), localDbPlugin()],
})
