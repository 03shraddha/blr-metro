# Bengaluru Metro Intelligence Map

Interactive web map of Namma Metro with real station ridership, passenger corridor flows, and coverage gap analysis.

---

## Data Sources

### BMRCL Station-Level Ridership

- BMRCL does not publish station-level data publicly
  - The opencity.in team got it by filing an RTI (Right to Information) request - a formal legal request for government data
  - Hosted at data.opencity.in/dataset/bmrcl-station-wise-ridership-data
- What came out: hourly ridership per station (Aug-Sep 2025), which station to which station for Aug 1-18 only (18 days), and a station codes lookup table
- The only other public BMRCL number is a single daily total on their website, which they do not archive themselves - a community project has been scraping and saving it since October 2024

**Accuracy issues:**

- Short, atypical window:
  - The Yellow Line opened August 10, 2025 - its first weeks are in this dataset
  - Independence Day (Aug 15) and the Lalbagh Flower Show also fall in the window
  - There is no pre-2025 station-level data anywhere publicly - this RTI is the entire historical record
- Interchange stations are undercounted:
  - At Majestic and RV Road, passengers can switch lines without checking out
  - Those transfers are either counted as two separate short trips or not counted at all, making terminal stations look busier than they are relative to interchange hubs
- Station names changed mid-history:
  - Several Phase 2 stations were renamed (e.g. "HSR Layout" is now "Bommanahalli")
  - Matching on station names will silently fail for any old name; the codes lookup table is the only reliable join key
  - Getting updated data requires filing a new RTI - there is no regular publication

### Metro Line Geometry (OpenStreetMap)

- Line paths are pulled from OpenStreetMap (OSM), a crowdsourced map, via its public query API
- Identified by internal OSM IDs for Purple, Green, and Yellow lines

**Accuracy issues:**

- Yellow Line is likely incomplete or missing:
  - OSM's own documentation for Bengaluru only lists Purple and Green
  - New lines typically take weeks or months for volunteers to map after opening
  - If geometry is missing, it fails silently
- Station names can lag official renames by weeks - volunteers update OSM, and OpenCity's station dataset is itself sourced from OSM, so both share the same lag

### Origin-Destination Flows

- Who traveled from which station to which - from the same RTI, Aug 1-18 only (18 days)
- Narrowed to the top 200 station pairs; only the top 15 are shown on the map at any time
- 18 days is not enough to establish reliable weekly or seasonal patterns
- The data sometimes only gives a total passenger count per station, not separate entry and exit numbers. The map fills this gap by assuming half the count entered and half exited
  - This breaks down at stations at the ends of a line: in the morning rush, almost everyone is arriving - exits dominate. In the evening, almost everyone is leaving - entries dominate. A 50/50 assumption misses this entirely
  - The map uses the entry vs. exit ratio to decide if a station is a "job hub" or a "residential area" - so a station at the end of a line, where the ratio is forced to 50/50, can end up with the wrong label

### Population Grid (Coverage Gap Analysis)

- The density layer is built from 10 manually chosen cluster centers based on local knowledge of where Bengaluru's population is concentrated: Whitefield, BTM/Koramangala, Electronic City, Hebbal, Rajajinagar, JP Nagar, Marathahalli, Kalyan Nagar, Jayanagar, Shivajinagar
- Each cluster spreads outward as a smooth gradient, which is a reasonable rough approximation - these are genuinely dense areas and the gradient captures the idea that density fades as you move away from a center
- Where it breaks down: it cannot capture the actual shape of that density - a neighborhood that is dense only along one corridor, or one that has a sharp edge (a lake, a highway), will look smoother and more uniform than it really is
- Replacing this with real WorldPop 100m satellite data (free, openly licensed) would sharpen the analysis - though WorldPop also underestimates population in dense informal settlements in Indian cities

---

## What Would Make This More Accurate

Three specific data sources that exist and are publicly accessible, in order of impact:

- **BBMP 2023 ward boundaries + Census 2011 ward population**
  - The 2023 BBMP delimitation produced 225 ward polygons (KML, at data.opencity.in/dataset/bbmp-ward-information); the Census 2011 ward-wise population CSV for Bangalore is at the same portal
  - Caveat: the census is from 2011; there are no publicly available ward-level projections for 2023 or 2025. But that is what every Bangalore planning document uses too

- **BMTC GTFS - bus stop locations and route alignments**
  - ~9,600 BMTC stop locations with coordinates and ~2,000+ bus routes are available as an unofficial but validated GTFS dataset at github.com/Vonter/bmtc-gtfs; an official version was published by DULT through the TUMI Datahub (hub.tumidata.org/dataset/gtfs-bengaluru, June 2024 vintage)
  - First and last mile is the biggest driver of ridership variation between metro stations in Bangalore - but this map currently has no bus layer at all
  - Adding BMTC stops would let you show which stations have dense bus feeder coverage and which are effectively bus-deserts, and identify high-density areas that lack both metro access and connecting bus service - the real coverage gaps

- **DULT Comprehensive Mobility Plan - Traffic Analysis Zones**
  - DULT's 2020 plan divided Bangalore into planning zones, each with data on how many trips start there and what share of those trips currently use public transport (data.opencity.in/dataset/bengaluru-mobility-indicators)
  - Each zone tells you: how many people travel, and how many of them are already using buses or metro vs. driving
  - Comparing these zones against metro station catchment areas would show where lots of people travel but few use public transport - areas where demand exists but the network is not reaching them

---

## Running Locally

```bash
npm install
npm run dev
```

Open http://localhost:5173/blr-metro/

To regenerate data from raw BMRCL spreadsheets:

```bash
pip install -r scripts/requirements.txt
python scripts/process_bmrcl_data.py
python scripts/fetch_metro_lines.py
```
