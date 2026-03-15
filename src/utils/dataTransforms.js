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

// Find the peak hour for a station (hour with most total ridership)
export function peakHour(station) {
  if (!station.ridership) return 9
  let maxH = 0, maxT = 0
  for (let h = 0; h < 24; h++) {
    const d = station.ridership[String(h)]
    const t = d ? (d.entries || 0) + (d.exits || 0) : 0
    if (t > maxT) { maxT = t; maxH = h }
  }
  return maxH
}

// Classify time of day into named phases with human-readable descriptions
export function timePhase(hour) {
  if (hour >= 5 && hour <= 7) return { label: 'Early Morning', desc: 'first wave, early risers and shift workers' }
  if (hour >= 8 && hour <= 10) return { label: 'Morning Rush', desc: 'peak inbound, suburbs draining toward the centre' }
  if (hour >= 11 && hour <= 13) return { label: 'Midday', desc: 'office rhythm, lighter load, errands and meetings' }
  if (hour >= 14 && hour <= 16) return { label: 'Afternoon Lull', desc: 'the city catches its breath' }
  if (hour >= 17 && hour <= 19) return { label: 'Evening Rush', desc: 'reverse tide, the city returns to where it woke up' }
  if (hour >= 20 && hour <= 22) return { label: 'Night Wind-down', desc: 'leisure trips, late workers, last trains filling up' }
  return { label: 'Late Night', desc: 'skeleton service, essential workers and shift ends' }
}

// Find top anomalous stations: highest ratio of exits-to-entries at a given hour
export function findJobHubAnomalies(stations, hour, topN = 3) {
  return stations
    .map(s => {
      const { entries, exits, total } = getRidershipAtHour(s, hour)
      if (total < 50) return null  // ignore low-volume stations
      return { name: s.properties.name, ratio: exits / Math.max(entries, 1), total, entries, exits }
    })
    .filter(Boolean)
    .sort((a, b) => b.ratio - a.ratio)
    .slice(0, topN)
}

// Compute the network's "centre of gravity" hour — the hour with most total ridership
export function networkPeakHour(stations) {
  const totals = Array(24).fill(0)
  for (const s of stations) {
    if (!s.ridership) continue
    for (let h = 0; h < 24; h++) {
      const d = s.ridership[String(h)]
      if (d) totals[h] += (d.entries || 0) + (d.exits || 0)
    }
  }
  return totals.indexOf(Math.max(...totals))
}

// Return busyness level for a station at a given hour relative to its own peak.
export function getStationBusyness(station, hour) {
  // Guard: no ridership at all, or empty object (tier-1 load state)
  if (!station.ridership || Object.keys(station.ridership).length === 0) {
    return { level: 'unknown', pct: 0, current: 0, peak: 0, peakHour: null, color: '#888', emoji: '⚪', description: 'No data available.' }
  }

  // Find the station's peak hour and peak ridership value
  let peak = 0
  let peakHour = 0
  for (let h = 0; h < 24; h++) {
    const d = station.ridership[String(h)]
    const total = d ? (d.entries || 0) + (d.exits || 0) : 0
    if (total > peak) { peak = total; peakHour = h }
  }

  // Get ridership at the requested hour
  const hData = station.ridership[String(hour)]
  const current = hData ? (hData.entries || 0) + (hData.exits || 0) : 0

  // Avoid division by zero when a station has all-zero ridership
  const pct = peak > 0 ? current / peak : 0

  let level, color, emoji, description
  if (pct >= 0.75) {
    level = 'packed'; color = '#ef4444'; emoji = '🔴'; description = 'Very crowded. Hard to get a seat.'
  } else if (pct >= 0.5) {
    level = 'busy'; color = '#f97316'; emoji = '🟠'; description = 'Busy. Seats available but filling fast.'
  } else if (pct >= 0.25) {
    level = 'moderate'; color = '#eab308'; emoji = '🟡'; description = 'Moderate. Good chance of a seat.'
  } else {
    level = 'quiet'; color = '#22c55e'; emoji = '🟢'; description = 'Quiet. Plenty of seats.'
  }

  return { level, pct, current, peak, peakHour, color, emoji, description }
}
