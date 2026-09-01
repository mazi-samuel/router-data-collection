# ML pipeline (Soup CLI)

Infrastructure for turning collected route data into a fine-tuned route
assistant, sized to grow with the campaign (entries close Dec 31, 2026).

## Reality check before you train

With only a handful of seed routes today, this is **prompt-engineering /
RAG territory, not a fine-tuning job**. Soup's own pre-flight tool agrees —
run it after building the dataset:

```bash
npm run ml:build
npm run ml:advise
```

`soup advise` recommends fine-tuning only once there's enough volume and no
cheaper approach (retrieval) solves it. Don't skip straight to `ml:train`.

## Pipeline

```
Google Sheet (live data, grows via the app)
        │  npm run ml:fetch
        ▼
ml/data/raw/latest.json  (+ timestamped snapshots)
        │  npm run ml:build
        ▼
ml/data/processed/routes.alpaca.jsonl  (Alpaca instruction/output pairs)
        │  npm run ml:advise  → soup advise verdict
        │  soup train --config ml/soup.yaml
        ▼
ml/runs/route-assistant/  (checkpoints — gitignored)
```

- **`npm run ml:fetch`** — pulls the full current dataset from the deployed
  Apps Script backend (`VITE_GOOGLE_SHEETS_URL` / `VITE_ROUTER_API_KEY` in
  `.env`). This is the growing source of truth, not the local dev DB.
- **`npm run ml:build`** — regenerates `routes.alpaca.jsonl` from whatever
  source data currently exists (raw pull if present, else the local dev
  `data/routes.json`). Safe to re-run anytime; always rebuilds from scratch,
  so the dataset scales automatically as more entries come in. Each route
  entry expands into several instruction/output pairs (fare, stops, safety
  notes, alternatives).
- **`npm run ml:advise`** — Soup's pre-flight decision engine; tells you
  whether the current row count justifies SFT, or whether you're still in
  PROMPT_ENG/RAG territory.
- **`npm run ml:train`** — runs `soup train --config ml/soup.yaml` once
  `ml:advise` actually recommends SFT.

## No local GPU

This machine has no CUDA-capable GPU (Intel integrated graphics only).
`soup-cli[train]` is installed for the data/config/advise tooling and to
validate the pipeline end-to-end, but real training runs need a cloud GPU —
e.g. `soup train --config ml/soup.yaml --cloud modal` (needs
`pip install "soup-cli[modal]"` and a Modal account), a rented GPU box, or
any environment with the config and `ml/data/processed/` copied over.

## Other projects

`ml/soup.yaml` is project-specific, but the pipeline shape (fetch → build →
advise → train) and the installed CLI are reusable. For a new project, start
from `soup init --template chat` or `soup recipes list` rather than copying
this config, and reuse `soup doctor` / `soup profile` to sanity-check the
environment before committing to a run.
