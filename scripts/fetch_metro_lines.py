"""
Fetch real metro line geometries from OpenStreetMap Overpass API.
Outputs public/data/metro_lines.json with [lon,lat] paths per line.
"""
import json, urllib.request, urllib.parse
from pathlib import Path

OUT = Path(__file__).parent.parent / "public" / "data"

RELATIONS = {
    "purple": {"id": 1798771, "color": [180, 40, 230]},
    "green":  {"id": 1798772, "color": [0, 160, 70]},
    "yellow": {"id": 19421927, "color": [210, 170, 0]},
}

def fetch_ways(relation_id):
    query = f"[out:json][timeout:30];relation({relation_id});way(r);out geom;"
    url = "https://overpass-api.de/api/interpreter?" + urllib.parse.urlencode({"data": query})
    print(f"  Fetching relation {relation_id} ...", end=" ", flush=True)
    with urllib.request.urlopen(url, timeout=40) as r:
        data = json.loads(r.read())
    ways = data.get("elements", [])
    print(f"{len(ways)} ways")
    return ways

def ways_to_path(ways):
    """Chain way segments into a single coordinate list."""
    if not ways:
        return []

    # Deduplicate parallel tracks: drop ways whose midpoint is within ~30m of
    # another way's midpoint (OSM stores both the up-track and down-track).
    def midpoint(seg):
        n = len(seg)
        return seg[n // 2]

    segments = []
    seen_mids = []
    for w in ways:
        geom = w.get("geometry", [])
        if not geom:
            continue
        seg = [[g["lon"], g["lat"]] for g in geom]
        mid = midpoint(seg)
        # ~0.0003 deg ≈ 30 m — skip if a near-identical track already present
        duplicate = any(
            (mid[0]-m[0])**2 + (mid[1]-m[1])**2 < 0.0003**2
            for m in seen_mids
        )
        if not duplicate:
            segments.append(seg)
            seen_mids.append(mid)

    if not segments:
        return []

    # Chain segments: try to connect end-to-end
    path = segments[0][:]
    remaining = segments[1:]

    for _ in range(len(remaining)):
        best_seg = None
        best_dist = float("inf")
        best_reversed = False
        best_idx = -1

        tail = path[-1]
        for i, seg in enumerate(remaining):
            # Distance from path tail to seg start
            d1 = (seg[0][0]-tail[0])**2 + (seg[0][1]-tail[1])**2
            # Distance from path tail to seg end (reversed)
            d2 = (seg[-1][0]-tail[0])**2 + (seg[-1][1]-tail[1])**2
            if d1 < best_dist:
                best_dist, best_seg, best_reversed, best_idx = d1, seg, False, i
            if d2 < best_dist:
                best_dist, best_seg, best_reversed, best_idx = d2, seg, True, i

        if best_seg is None:
            break
        seg_to_add = list(reversed(best_seg)) if best_reversed else best_seg
        # Skip first point to avoid duplicates
        path.extend(seg_to_add[1:])
        remaining.pop(best_idx)

    # Fix "there and back" paths caused by residual parallel track segments.
    # Find the largest gap; if it's > 500 m, the path doubled back — reverse
    # the first half so we get a clean terminus-to-terminus line.
    max_gap, max_idx = 0.0, 0
    for i in range(1, len(path)):
        dx, dy = path[i][0]-path[i-1][0], path[i][1]-path[i-1][1]
        g = dx*dx + dy*dy
        if g > max_gap:
            max_gap, max_idx = g, i

    # 0.005 deg ≈ ~500 m
    if max_gap > 0.005**2:
        seg1, seg2 = path[:max_idx], path[max_idx:]
        path = list(reversed(seg1)) + seg2
        print(f"  (fixed doubled-track gap at index {max_idx})")

    return path

def simplify(path, max_points=200):
    """Keep every Nth point to stay under max_points."""
    if len(path) <= max_points:
        return path
    step = len(path) // max_points
    simplified = path[::step]
    if simplified[-1] != path[-1]:
        simplified.append(path[-1])
    return simplified

lines_out = []
for line_id, info in RELATIONS.items():
    print(f"\n{line_id.upper()} LINE:")
    try:
        ways = fetch_ways(info["id"])
        full_path = ways_to_path(ways)
        path = simplify(full_path, 200)
        print(f"  {len(full_path)} raw pts -> {len(path)} simplified")
        lines_out.append({
            "id": line_id,
            "color": info["color"],
            "path": path,
        })
    except Exception as e:
        print(f"  ERROR: {e}")

out_file = OUT / "metro_lines.json"
out_file.write_text(json.dumps(lines_out))
print(f"\nWrote {out_file} ({len(lines_out)} lines)")
