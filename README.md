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
- Where the data only recorded total passengers (not how many got on vs. how many got off), the map assumes half the passengers got on and half got off at every station
  - In reality, stations near the ends of lines are heavily one-directional - most people are getting off in the morning (arriving at work) and getting on in the evening (heading home)
  - The map uses the on/off ratio to decide whether a station is a "job hub" or a "residential area", so stations like these can end up misclassified

### Population Grid (Coverage Gap Analysis)

- The density layer is built from 10 manually chosen cluster centers based on local knowledge of where Bengaluru's population is concentrated: Whitefield, BTM/Koramangala, Electronic City, Hebbal, Rajajinagar, JP Nagar, Marathahalli, Kalyan Nagar, Jayanagar, Shivajinagar
- Each cluster spreads outward as a smooth gradient, which is a reasonable rough approximation - these are genuinely dense areas and the gradient captures the idea that density fades as you move away from a center
- Where it breaks down: it cannot capture the actual shape of that density - a neighborhood that is dense only along one corridor, or one that has a sharp edge (a lake, a highway), will look smoother and more uniform than it really is
- Replacing this with real WorldPop 100m satellite data (free, openly licensed) would sharpen the analysis - though WorldPop also underestimates population in dense informal settlements in Indian cities

---

## Known Limitations

- **Population density is approximate** - the coverage gap layer uses manually chosen cluster centers that capture where the dense areas are, but not the exact shape or boundary of that density
- **Atypical reference window** - Yellow Line Week 1, Independence Day, and a flower show are all inside the only available data period
- **Interchange undercounting** - Majestic and RV Road transfers are structurally missing from both ridership and corridor data
- **Silent station drops** - stations whose names cannot be matched to codes are quietly excluded from the map with no warning
- **50/50 entry/exit assumption** - propagates into job-hub classification; terminus stations may appear balanced when they are not
- **Yellow Line geometry is unverified** - may be absent or partially mapped in OSM

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
