# Bengaluru Metro Intelligence Map

An interactive data visualization of BMRCL metro ridership patterns across Bengaluru. Built with real August 2025 ridership data acquired via RTI from BMRCL.

## Live Demo

### [Try it live → 03shraddha.github.io/BLR-METRO](https://03shraddha.github.io/BLR-METRO/)

Works on desktop and mobile. On mobile, panels slide up as drawers and controls sit in the thumb zone. Tap any station for ridership detail.

## What It Shows

The map has five story chapters, selectable from the top-left panel:

| Layer | What you see |
|---|---|
| **Where people move** | Station circles sized and colored by ridership volume at each hour — play the time slider to watch the city breathe through the day |
| **Job hubs vs home zones** | Diverging color scale (blue = residential origin, red = job destination) showing which stations are net sources vs. sinks of passengers |
| **Passenger flows** | Top 15 origin-destination corridors as arcs — thickness and brightness encode passenger volume |
| **Weekday vs weekend** | Toggle between Mon–Fri and Sat–Sun patterns to see how the city moves differently |
| **Coverage gaps** | Population density heatmap overlaid with 500m station catchment rings — red showing through = underserved area |

## Data

- **Source:** [BMRCL Station-Wise Ridership Data](https://data.opencity.in/dataset/bmrcl-station-wise-ridership-data) via OpenCity India
- **Period:** August 2025
- **Coverage:** 83 stations across Purple, Green, and Yellow lines
- **Metro geometry:** Real OSM line traces from OpenStreetMap (Overpass API)

Raw data files (`hourly_ridership.xlsx`, `hourly_entry_exit.xlsx`) are processed by `scripts/process_bmrcl_data.py` into the JSON files under `public/data/`.

## Running Locally

```bash
npm install
npm run dev
```

Open [http://localhost:5173/bangalore-metro/](http://localhost:5173/bangalore-metro/)

## Deploying

```bash
npm run build
npm run deploy
```

This builds to `dist/` and pushes to the `gh-pages` branch. The live site updates within a minute.

## Tech Stack

- **React + Vite** — UI and build
- **Deck.gl v9** — WebGL map layers with smooth transitions
- **MapLibre GL** — Dark base map tiles (OpenFreeMap, no API key needed)
- **Tailwind CSS v4** — Glassmorphism floating controls
- **d3-scale / d3-ease** — Data scaling and animation easing
- **Python + pandas** — Data pipeline from XLSX to JSON
