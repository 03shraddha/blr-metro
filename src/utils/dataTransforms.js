// Join ridership JSON data onto station GeoJSON features.
// Returns enriched station array with ridership attached as properties.
export function enrichStations(stations, hourlyData) {
  if (!stations || !hourlyData) return []
  return stations.features.map(f => ({
    ...f,
    ridership: hourlyData[f.properties.id] || null,
  }))
}

// Get total ridership for a station at a given hour
export function getRidershipAtHour(station, hour) {
  if (!station.ridership) return { entries: 0, exits: 0, total: 0 }
  const h = station.ridership[String(hour)]
  if (!h) return { entries: 0, exits: 0, total: 0 }
  return {
    entries: h.entries || 0,
    exits: h.exits || 0,
    total: (h.entries || 0) + (h.exits || 0),
  }
}

// Get daily ridership total for a station (from weekday/weekend JSON)
export function getDailyRidership(dailyData, stationId) {
  if (!dailyData || !dailyData[stationId]) return { entries: 0, exits: 0, total: 0 }
  return dailyData[stationId]
}

// Build 24-hour sparkline data array for a station
export function buildSparkline(station) {
  if (!station.ridership) return Array(24).fill(0)
  return Array.from({ length: 24 }, (_, h) => {
    const d = station.ridership[String(h)]
    return d ? (d.entries || 0) + (d.exits || 0) : 0
  })
}

// Detect bidirectional pairs (A→B and B→A) and annotate each flow with:
// - isPrimary: true if this direction has the larger volume (or is one-way)
// - returnRatio: returnVolume / primaryVolume (0 = one-way, 1 = perfectly balanced)
// - netFlow: primaryVolume - returnVolume
// - pairKey: canonical key for the pair, sorted by station id
// Returns enriched array with the same shape as input plus the new fields.
export function enrichOdFlows(odFlows) {
  if (!odFlows || odFlows.length === 0) return []

  // First pass: group flows by sorted station pair so we can find counterparts
  const pairMap = new Map() // pairKey → [flow, ...]
  for (const flow of odFlows) {
    const pairKey = [flow.from, flow.to].sort().join('-')
    if (!pairMap.has(pairKey)) pairMap.set(pairKey, [])
    pairMap.get(pairKey).push(flow)
  }

  // Second pass: annotate each flow with bidirectional metadata
  return odFlows.map(flow => {
    const pairKey = [flow.from, flow.to].sort().join('-')
    const pair = pairMap.get(pairKey)

    if (pair.length === 1) {
      // No counterpart — purely one-directional
      return { ...flow, pairKey, isPrimary: true, returnRatio: 0, netFlow: flow.volume }
    }

    // Two directions exist — compare volumes
    const other = pair.find(f => f.from === flow.to && f.to === flow.from)
    if (!other) {
      // Edge case: same from/to in pair but no true reverse; treat as one-way
      return { ...flow, pairKey, isPrimary: true, returnRatio: 0, netFlow: flow.volume }
    }

    const primaryVol = Math.max(flow.volume, other.volume)
    const returnVol  = Math.min(flow.volume, other.volume)
    const isPrimary  = flow.volume >= other.volume
    const returnRatio = primaryVol > 0 ? returnVol / primaryVol : 0
    const netFlow     = primaryVol - returnVol

    return { ...flow, pairKey, isPrimary, returnRatio, netFlow }
  })
}

// Format hour as readable label
export function formatHour(h) {
  if (h === 0) return '12 AM'
  if (h < 12) return `${h} AM`
  if (h === 12) return '12 PM'
  return `${h - 12} PM`
}

// Find max total ridership across all stations and hours
export function findMaxRidership(stations) {
  let max = 0
  for (const s of stations) {
    if (!s.ridership) continue
    for (const h of Object.values(s.ridership)) {
      const t = (h.entries || 0) + (h.exits || 0)
      if (t > max) max = t
    }
  }
  return max || 1
}
