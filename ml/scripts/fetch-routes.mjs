// Pulls the current, full dataset from the deployed Google Apps Script
// backend (the growing source of truth as the campaign collects entries)
// and drops a timestamped snapshot into ml/data/raw/, plus ml/data/raw/latest.json.
//
// Usage:  node --env-file=.env ml/scripts/fetch-routes.mjs
import { writeFileSync, mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rawDir = join(__dirname, "..", "data", "raw");

const url = process.env.VITE_GOOGLE_SHEETS_URL;
const key = process.env.VITE_ROUTER_API_KEY;

if (!url) {
  console.error("Missing VITE_GOOGLE_SHEETS_URL. Run with: node --env-file=.env ml/scripts/fetch-routes.mjs");
  process.exit(1);
}

const fetchUrl = key ? `${url}?key=${encodeURIComponent(key)}` : url;

const res = await fetch(fetchUrl);
if (!res.ok) {
  console.error(`Fetch failed: ${res.status} ${res.statusText}`);
  process.exit(1);
}
const routes = await res.json();

if (!Array.isArray(routes)) {
  console.error("Unexpected response shape (expected an array of route entries):", routes);
  process.exit(1);
}

mkdirSync(rawDir, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
writeFileSync(join(rawDir, `routes-${stamp}.json`), JSON.stringify(routes, null, 2));
writeFileSync(join(rawDir, "latest.json"), JSON.stringify(routes, null, 2));

console.log(`Fetched ${routes.length} route entries -> ml/data/raw/latest.json (snapshot: routes-${stamp}.json)`);
