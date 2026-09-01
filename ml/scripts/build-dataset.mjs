// Converts route entries (ml/data/raw/latest.json, falling back to the local
// dev DB at data/routes.json) into Alpaca-format instruction/output pairs —
// the schema Soup's `soup train` expects for SFT (see data.format: alpaca).
//
// Re-run this any time new entries come in; it always regenerates the full
// file from whatever source data currently exists, so dataset size grows
// automatically with the campaign.
//
// Usage:  node ml/scripts/build-dataset.mjs
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rawLatest = join(__dirname, "..", "data", "raw", "latest.json");
const devDb = join(__dirname, "..", "..", "data", "routes.json");
const outDir = join(__dirname, "..", "data", "processed");
const outFile = join(outDir, "routes.alpaca.jsonl");

const source = existsSync(rawLatest) ? rawLatest : devDb;
if (!existsSync(source)) {
  console.error("No source data found. Run `npm run ml:fetch` first, or seed data/routes.json.");
  process.exit(1);
}

const routes = JSON.parse(readFileSync(source, "utf-8"));
const pairs = [];

const money = (v) => (v ? `₦${v}` : null);
const list = (arr) => (Array.isArray(arr) ? arr.filter(Boolean) : []);

for (const r of routes) {
  if (!r.from || !r.to) continue;
  const vehicles = list(r.vehicles).join(" or ");
  const fareLine = [
    money(r.baseFare) && `Base fare: ${money(r.baseFare)}.`,
    money(r.peakFare) && `Peak: ${money(r.peakFare)}.`,
    money(r.offPeakFare) && `Off-peak: ${money(r.offPeakFare)}.`,
    r.negotiable && `Fare is negotiable${r.negotiateTip ? ` — ${r.negotiateTip}` : ""}.`,
  ].filter(Boolean).join(" ");

  // 1. Fare lookup
  if (fareLine) {
    pairs.push({
      instruction: `What's the fare from ${r.from} to ${r.to}${vehicles ? ` by ${vehicles}` : ""}?`,
      input: "",
      output: fareLine,
    });
  }

  // 2. Day/time-specific fare
  if ((r.dayType || r.timeOfDay) && fareLine) {
    pairs.push({
      instruction: `What's the fare from ${r.from} to ${r.to} during ${[r.dayType, r.timeOfDay].filter(Boolean).join(", ")}?`,
      input: "",
      output: fareLine,
    });
  }

  // 3. Stops
  const stops = list(r.stops).filter((s) => s?.name);
  if (stops.length) {
    const stopText = stops
      .map((s, i) => `${i + 1}. ${s.name}${s.fare ? ` (${money(s.fare)})` : ""}${s.note ? ` — ${s.note}` : ""}`)
      .join(" ");
    pairs.push({
      instruction: `What stops are on the route from ${r.from} to ${r.to}?`,
      input: "",
      output: `Stops: ${stopText}`,
    });
  }

  // 4. Condition / security / landmark
  const safetyLine = [
    r.condition && `Road/route condition: ${r.condition}.`,
    r.securityHint && `Security note: ${r.securityHint}.`,
    r.landmark && `Landmark: ${r.landmark}.`,
    r.notes && `Notes: ${r.notes}.`,
  ].filter(Boolean).join(" ");
  if (safetyLine) {
    pairs.push({
      instruction: `Is the route from ${r.from} to ${r.to} safe, and what should I know before taking it?`,
      input: "",
      output: safetyLine,
    });
  }

  // 5. Alternatives
  const alts = list(r.alts).filter((a) => list(a?.vehicles).length);
  if (alts.length) {
    const altText = alts
      .map((a) => `${list(a.vehicles).join(" then ")}${a.fare ? ` (${money(a.fare)})` : ""}${a.note ? ` — ${a.note}` : ""}`)
      .join(" | ");
    pairs.push({
      instruction: `Is there an alternative way to get from ${r.from} to ${r.to}?`,
      input: "",
      output: `Alternative(s): ${altText}`,
    });
  }
}

mkdirSync(outDir, { recursive: true });
writeFileSync(outFile, pairs.map((p) => JSON.stringify(p)).join("\n") + "\n", "utf-8");

console.log(`Built ${pairs.length} instruction pairs from ${routes.length} route entries -> ${outFile}`);
console.log(pairs.length < 50
  ? "Below Soup's _MIN_ROWS_FOR_TRAINING=50 — run `npm run ml:advise` to confirm, but this is still PROMPT_ENG/RAG territory."
  : "Enough rows to be worth an `npm run ml:advise` check before committing to a training run.");
