"""
BMRCL Real Data Pipeline — August 2025
=======================================
Processes the two downloaded XLSX files from OpenCity CKAN into
the 5 JSON files consumed by the visualization.

Files expected in data/raw/:
  hourly_ridership.xlsx    — station × 24 hour-slot columns, total ridership
  hourly_entry_exit.xlsx   — OD matrix: (date_hour, origin) × destination codes
  station_codes.csv        — code → station name

Output written to public/data/:
  stations.geojson
  ridership_hourly.json
  ridership_weekday.json
  ridership_weekend.json
  od_flows.json
  population_grid.json     (synthetic — unchanged)
"""

import json
import re
import math
import random
from pathlib import Path
from collections import defaultdict
from difflib import get_close_matches

import pandas as pd

random.seed(42)

RAW   = Path(__file__).parent.parent / "data" / "raw"
OUT   = Path(__file__).parent.parent / "public" / "data"
OUT.mkdir(parents=True, exist_ok=True)

# ── 1. Load station codes ────────────────────────────────────────────────────

codes_df = pd.read_csv(RAW / "station_codes.csv", quoting=3, on_bad_lines="skip")
# code → name (deduplicated: keep first occurrence)
code_to_name = {}
for _, row in codes_df.iterrows():
    code = str(row["code"]).strip()
    name = str(row["name"]).strip()
    if code not in code_to_name:
        code_to_name[code] = name

# Reverse map for fuzzy station name matching
name_lower_to_code = {v.lower(): k for k, v in code_to_name.items()}
canonical_names    = list(name_lower_to_code.keys())

print(f"Loaded {len(code_to_name)} station codes")


def fuzzy_match_name(raw_name):
    """Match a raw station name string to a station code."""
    # Strip leading number prefix like "11-Baiyappanahalli" or "110-Kempegowda"
    clean = re.sub(r'^\d+-', '', str(raw_name)).strip().lower()
    # Known name overrides for tricky matches
    overrides = {
        "vidhana soudha":         "VDSA",
        "sir.m. visveshwaraya":   "VSWA",
        "sir m visveshwaraya":    "VSWA",
        "kempegowda":             "KGWA",
        "bangalore city station": "BRCS",
        "majestic":               "KGWA",
    }
    if clean in overrides:
        return overrides[clean]
    # Exact match first
    if clean in name_lower_to_code:
        return name_lower_to_code[clean]
    # Fuzzy match
    matches = get_close_matches(clean, canonical_names, n=1, cutoff=0.55)
    if matches:
        return name_lower_to_code[matches[0]]
    return None


def parse_hour_from_slot(slot_str):
    """'2025-08-01-05Hrs-6hrs' → (date_str '2025-08-01', hour int 5)"""
    m = re.search(r'(\d{4}-\d{2}-\d{2})-(\d+)Hrs', str(slot_str))
    if m:
        return m.group(1), int(m.group(2))
    return None, None


# ── 2. Process hourly_ridership.xlsx ─────────────────────────────────────────
# Schema: BUSINESS DATE | STATION | "HH:00 Hrs To HH+1:00 Hrs" × 24 | TOTAL

print("\nProcessing hourly_ridership.xlsx ...")
ride_df = pd.read_excel(RAW / "hourly_ridership.xlsx", engine="openpyxl")

# Identify hour columns (all columns between STATION and TOTAL)
all_cols   = list(ride_df.columns)
hour_cols  = [c for c in all_cols if "Hrs To" in str(c)]
print(f"  Found {len(hour_cols)} hour-slot columns, {len(ride_df)} rows")

# Map each hour column to its integer hour (0 = midnight)
def col_to_hour(col):
    m = re.match(r'(\d+):00', str(col).strip())
    return int(m.group(1)) if m else None

hour_col_map = {c: col_to_hour(c) for c in hour_cols}  # col → int hour

# Match station names to codes
ride_df["code"] = ride_df["STATION"].apply(fuzzy_match_name)
unmatched = ride_df[ride_df["code"].isna()]["STATION"].unique()
if len(unmatched):
    print(f"  [warn] {len(unmatched)} unmatched stations: {list(unmatched[:5])}")

# Parse date for weekday/weekend split
ride_df["date"] = pd.to_datetime(ride_df["BUSINESS DATE"], errors="coerce")
ride_df["is_weekend"] = ride_df["date"].dt.weekday >= 5

# Build: {code: {hour: [daily_totals_list]}}  — collect per-day values, then average
daily_totals   = defaultdict(lambda: defaultdict(list))
weekday_totals = defaultdict(list)
weekend_totals = defaultdict(list)

for _, row in ride_df.iterrows():
    code = row["code"]
    if not code:
        continue
    for col, h in hour_col_map.items():
        if h is None:
            continue
        val = row[col]
        if pd.isna(val):
            val = 0
        daily_totals[code][h].append(int(val))

    day_total = sum(int(row[c]) for c in hour_cols if not pd.isna(row[c]))
    if row["is_weekend"]:
        weekend_totals[code].append(day_total)
    else:
        weekday_totals[code].append(day_total)

# Compute average daily ridership per hour
hourly_out = {}
for code, hours in daily_totals.items():
    hourly_out[code] = {}
    for h in range(24):
        vals = hours.get(h, [0])
        avg  = int(sum(vals) / len(vals)) if vals else 0
        hourly_out[code][str(h)] = {"total": avg, "entries": avg // 2, "exits": avg - avg // 2}

print(f"  Built hourly data for {len(hourly_out)} stations")


# ── 3. Process hourly_entry_exit.xlsx ─────────────────────────────────────────
# Schema: BUSINESS DATE (date-HHHrs-HH+1hrs) | STATION (origin code) | dest_code columns...

print("\nProcessing hourly_entry_exit.xlsx ...")
od_df = pd.read_excel(RAW / "hourly_entry_exit.xlsx", engine="openpyxl")

# Drop rows with no origin station
od_df = od_df[od_df["STATION"].notna()].copy()
print(f"  {len(od_df)} valid rows after dropping NaN stations")

# Identify destination columns (all valid station codes)
meta_cols = {"BUSINESS DATE", "STATION"}
dest_codes = [c for c in od_df.columns if c not in meta_cols and c in code_to_name]
print(f"  {len(dest_codes)} destination station columns recognized")

# Parse date and hour from BUSINESS DATE slot string
od_df[["date_str", "hour"]] = od_df["BUSINESS DATE"].apply(
    lambda x: pd.Series(parse_hour_from_slot(x))
)
od_df["date"] = pd.to_datetime(od_df["date_str"], errors="coerce")
od_df["is_weekend"] = od_df["date"].dt.weekday >= 5

# Accumulate entries/exits per station per hour using OD matrix
# exits at station = row sum (departures from origin)
# entries at station = column sum (arrivals at destination)

# Collect per-(station, hour): list of (exits, entries) across dates
station_hour_exits   = defaultdict(lambda: defaultdict(list))  # [code][hour] = [vals]
station_hour_entries = defaultdict(lambda: defaultdict(list))

for _, row in od_df.iterrows():
    origin = str(row["STATION"]).strip()
    h      = row["hour"]
    if h is None or origin not in code_to_name:
        continue
    # exits from origin = sum across all destinations in this row
    row_exit = sum(int(row[d]) for d in dest_codes if not pd.isna(row[d]))
    station_hour_exits[origin][h].append(row_exit)

# For entries: sum each destination column per (date, hour)
print("  Computing column-wise entries per station per hour...")
for (date_slot, hour), grp in od_df.groupby(["date_str", "hour"]):
    if hour is None:
        continue
    for dest in dest_codes:
        total_arrivals = int(grp[dest].fillna(0).sum())
        station_hour_entries[dest][hour].append(total_arrivals)

# Merge entries/exits back into hourly_out
for code in set(list(station_hour_exits.keys()) + list(station_hour_entries.keys())):
    if code not in hourly_out:
        hourly_out[code] = {str(h): {"total": 0, "entries": 0, "exits": 0} for h in range(24)}
    for h in range(24):
        exits_list   = station_hour_exits[code].get(h, [0])
        entries_list = station_hour_entries[code].get(h, [0])
        avg_exits   = int(sum(exits_list)   / max(len(exits_list), 1))
        avg_entries = int(sum(entries_list) / max(len(entries_list), 1))
        hourly_out[code][str(h)]["exits"]   = avg_exits
        hourly_out[code][str(h)]["entries"] = avg_entries
        hourly_out[code][str(h)]["total"]   = avg_exits + avg_entries

print(f"  Updated entries/exits for {len(hourly_out)} stations")

# ── 4. Build OD flows (top 200) ───────────────────────────────────────────────
print("\nBuilding OD flows ...")
od_counts = defaultdict(int)
for _, row in od_df.iterrows():
    origin = str(row["STATION"]).strip()
    if origin not in code_to_name:
        continue
    for dest in dest_codes:
        val = row[dest]
        if pd.isna(val) or val == 0:
            continue
        od_counts[(origin, dest)] += int(val)

top_od = sorted(od_counts.items(), key=lambda x: x[1], reverse=True)[:200]
od_list = [{"from": k[0], "to": k[1], "volume": v} for k, v in top_od]
print(f"  Top OD pair: {top_od[0][0]} to {top_od[0][1]}: {top_od[0][1]:,} passengers")

# ── 5. Build weekday/weekend daily totals ─────────────────────────────────────
wd_out = {}
we_out = {}
for code in hourly_out:
    wd_vals = weekday_totals.get(code, [0])
    we_vals = weekend_totals.get(code, [0])
    wd_avg  = int(sum(wd_vals) / max(len(wd_vals), 1))
    we_avg  = int(sum(we_vals) / max(len(we_vals), 1))
    wd_out[code] = {"entries": wd_avg // 2, "exits": wd_avg - wd_avg // 2, "total": wd_avg}
    we_out[code] = {"entries": we_avg // 2, "exits": we_avg - we_avg // 2, "total": we_avg}


# ── 6. Build stations.geojson with real coordinates ───────────────────────────
# Coordinates from OSM / BMRCL maps, keyed by station code
STATION_COORDS = {
    # Purple Line
    "BYPH": [77.6685, 12.9993],
    "SVRD": [77.6575, 12.9971],
    "IDN":  [77.6415, 12.9786],
    "HLRU": [77.6239, 12.9748],
    "TTY":  [77.6175, 12.9712],
    "MGRD": [77.6118, 12.9755],
    "MAGR": [77.6118, 12.9755],
    "CBPK": [77.6023, 12.9786],
    "VDSA": [77.5907, 12.9793],
    "VSWA": [77.5830, 12.9765],
    "KGWA": [77.5706, 12.9768],  # Majestic interchange
    "BRCS": [77.5706, 12.9768],  # KSR Railway Station
    "MIRD": [77.5498, 12.9715],
    "HSLI": [77.5367, 12.9618],
    "VJNR": [77.5267, 12.9587],
    "AGPP": [77.5243, 12.9543],
    "DJNR": [77.5017, 12.9487],
    "MYRD": [77.4916, 12.9463],
    "NYHM": [77.5056, 12.9497],
    "RRRN": [77.4836, 12.9318],
    "BGUC": [77.5059, 12.9288],
    "PATC": [77.4879, 12.9174],
    "PATG": [77.4879, 12.9174],
    "MLSD": [77.4777, 12.9440],
    "KGIT": [77.4777, 12.9440],
    "CLG":  [77.4647, 12.9405],
    "CLGA": [77.4647, 12.9405],
    "CLGT": [77.4647, 12.9405],
    # Purple Line East extension
    "JTPM": [77.6502, 12.9790],
    "KRMA": [77.6760, 12.9965],
    "KRPM": [77.6760, 12.9965],
    "MDVP": [77.6630, 12.9988],
    "GDCP": [77.6933, 13.0039],
    "DKIA": [77.7005, 13.0000],
    "VWIA": [77.7122, 12.9876],
    "KDNH": [77.7122, 12.9876],
    "VDHP": [77.7285, 12.9889],
    "SSHP": [77.7415, 12.9960],
    "ITPL": [77.7503, 12.9698],
    "KDGD": [77.7536, 12.9940],
    "UWVL": [77.7536, 12.9940],
    "WHTM": [77.7503, 12.9698],
    # Green Line North
    "NGSA": [77.5109, 13.0509],
    "DSH":  [77.5130, 13.0420],
    "JHLI": [77.5209, 13.0329],
    "JLHL": [77.5209, 13.0329],
    "PYID": [77.5175, 13.0238],
    "PEYA": [77.5175, 13.0168],
    "YPI":  [77.5347, 13.0249],
    "YPM":  [77.5406, 13.0275],
    "SSFY": [77.5406, 13.0165],
    "MHLI": [77.5563, 13.0102],
    "RJNR": [77.5548, 12.9974],
    "KVPR": [77.5717, 12.9893],
    "SPRU": [77.5651, 12.9927],
    "SPGD": [77.5812, 12.9933],
    # Green Line South
    "NLC":  [77.5831, 12.9549],
    "LAGH": [77.5866, 12.9491],
    "LBGH": [77.5866, 12.9491],
    "SECE": [77.5901, 12.9414],
    "JAYN": [77.5887, 12.9314],
    "JYN":  [77.5887, 12.9314],
    "RVRD": [77.5891, 12.9230],
    "RVR":  [77.5777, 12.9480],
    "BNSK": [77.5716, 12.9228],
    "BSNK": [77.5716, 12.9228],
    "JPN":  [77.5897, 12.9145],
    "PUTH": [77.5788, 12.9030],
    "APRC": [77.5648, 12.8936],
    "KLPK": [77.5546, 12.8836],
    "VJRH": [77.5426, 12.8750],
    "TGTP": [77.5192, 12.8659],
    "APTS": [77.6809, 12.9189],
    # Pink/Red Line
    "MNJN": [77.5548, 13.0012],
    "JIDL": [77.5340, 13.0192],
    "BIET": [77.5186, 13.0349],
    "NGSA": [77.5109, 13.0509],
    "RGDT": [77.5889, 12.9246],
    "JDHP": [77.5940, 12.9336],
    "BTML": [77.6099, 12.9152],
    "SBJT": [77.6266, 12.9129],
    "HSRL": [77.6383, 12.9082],
    "OFDC": [77.6140, 12.9050],
    "MSRN": [77.6250, 12.9270],
    "CKBR": [77.6375, 12.9090],
    "CHPK": [77.5774, 12.9639],
    "KRMT": [77.5783, 12.9630],
    # Yellow Line
    "BSRD": [77.6627, 12.8598],
    "HOSR": [77.6627, 12.8598],
    "ETCT": [77.6690, 12.8391],
    "ECTN": [77.6690, 12.8391],
    "HSKR": [77.6850, 12.8299],
    "HBGI": [77.6893, 12.8347],
    "BMSD": [77.6948, 12.8216],
}

# Build GeoJSON
line_map = {
    "BYPH": "purple", "SVRD": "purple", "IDN": "purple", "HLRU": "purple",
    "TTY": "purple", "MGRD": "purple", "MAGR": "purple", "CBPK": "purple",
    "VDSA": "purple", "VSWA": "purple", "KGWA": "purple", "BRCS": "purple",
    "MIRD": "purple", "HSLI": "purple", "VJNR": "purple", "AGPP": "purple",
    "DJNR": "purple", "MYRD": "purple", "NYHM": "purple", "RRRN": "purple",
    "BGUC": "purple", "PATC": "purple", "PATG": "purple", "MLSD": "purple",
    "KGIT": "purple", "CLG": "purple", "CLGA": "purple", "CLGT": "purple",
    "JTPM": "purple", "KRMA": "purple", "KRPM": "purple", "MDVP": "purple",
    "GDCP": "purple", "DKIA": "purple", "VWIA": "purple", "KDNH": "purple",
    "VDHP": "purple", "SSHP": "purple", "ITPL": "purple", "KDGD": "purple",
    "UWVL": "purple", "WHTM": "purple",
    "NGSA": "green", "DSH": "green", "JHLI": "green", "JLHL": "green",
    "PYID": "green", "PEYA": "green", "YPI": "green", "YPM": "green",
    "SSFY": "green", "MHLI": "green", "RJNR": "green", "KVPR": "green",
    "SPRU": "green", "SPGD": "green", "NLC": "green", "LAGH": "green",
    "LBGH": "green", "SECE": "green", "JAYN": "green", "JYN": "green",
    "RVRD": "green", "RVR": "green", "BNSK": "green", "BSNK": "green",
    "JPN": "green", "PUTH": "green", "APRC": "green", "KLPK": "green",
    "VJRH": "green", "TGTP": "green", "APTS": "green",
    "MNJN": "pink", "JIDL": "pink", "BIET": "pink", "RGDT": "pink",
    "JDHP": "pink", "BTML": "pink", "SBJT": "pink", "HSRL": "pink",
    "OFDC": "pink", "MSRN": "pink", "CKBR": "pink", "CHPK": "pink", "KRMT": "pink",
    "BSRD": "yellow", "HOSR": "yellow", "ETCT": "yellow", "ECTN": "yellow",
    "HSKR": "yellow", "HBGI": "yellow", "BMSD": "yellow",
}
INTERCHANGE = {"KGWA", "BRCS"}

features = []
for code, name in code_to_name.items():
    coords = STATION_COORDS.get(code)
    if not coords:
        continue  # skip if no coordinates
    features.append({
        "type": "Feature",
        "geometry": {"type": "Point", "coordinates": coords},
        "properties": {
            "id": code,
            "name": name,
            "line": line_map.get(code, "unknown"),
            "interchange": code in INTERCHANGE,
        },
    })

geojson = {"type": "FeatureCollection", "features": features}
print(f"\nBuilt stations.geojson with {len(features)} stations with coordinates")
missing_coords = [c for c in code_to_name if c not in STATION_COORDS]
if missing_coords:
    print(f"  [info] {len(missing_coords)} stations without coordinates (skipped): {missing_coords[:8]}")


# ── 7. Population grid (synthetic, unchanged) ─────────────────────────────────
density_centers = [
    ([77.7480, 12.9700], 1.0, 0.04),
    ([77.6100, 12.9150], 0.9, 0.035),
    ([77.6690, 12.8391], 0.85, 0.04),
    ([77.6100, 13.0350], 0.8, 0.035),
    ([77.5550, 12.9980], 0.75, 0.03),
    ([77.5850, 12.9050], 0.7, 0.035),
    ([77.6450, 12.9600], 0.8, 0.03),
    ([77.6250, 13.0100], 0.65, 0.03),
    ([77.5700, 12.9500], 0.6, 0.025),
    ([77.5980, 12.9750], 0.55, 0.025),
]
pop_points = []
for center, max_w, spread in density_centers:
    for _ in range(150):
        lng = center[0] + random.gauss(0, spread)
        lat = center[1] + random.gauss(0, spread)
        w = max_w * math.exp(-((lng-center[0])**2+(lat-center[1])**2)/(2*spread**2))
        pop_points.append({"position": [round(lng,5), round(lat,5)], "weight": round(max(0.05, w*random.uniform(0.7,1.3)), 3)})


# ── 8. Write all outputs ──────────────────────────────────────────────────────
print("\nWriting output files ...")

(OUT / "stations.geojson").write_text(json.dumps(geojson))
print(f"  stations.geojson ({len(features)} stations)")

(OUT / "ridership_hourly.json").write_text(json.dumps(hourly_out))
print(f"  ridership_hourly.json ({len(hourly_out)} stations)")

(OUT / "ridership_weekday.json").write_text(json.dumps(wd_out))
print(f"  ridership_weekday.json ({len(wd_out)} stations)")

(OUT / "ridership_weekend.json").write_text(json.dumps(we_out))
print(f"  ridership_weekend.json ({len(we_out)} stations)")

(OUT / "od_flows.json").write_text(json.dumps(od_list))
print(f"  od_flows.json ({len(od_list)} OD pairs, top: {od_list[0]})")

(OUT / "population_grid.json").write_text(json.dumps(pop_points))
print(f"  population_grid.json ({len(pop_points)} density points)")

print("\nDone! Run: npm run dev")
