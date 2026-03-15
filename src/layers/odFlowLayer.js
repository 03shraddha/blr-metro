import { ArcLayer, ScatterplotLayer, TextLayer } from '@deck.gl/layers'
import { scalePow } from 'd3-scale'

export function buildOdFlowLayer(stations, odFlows, isActive, flowOffset = 0, topN = 15, isMobile = false, hour = 0, enrichedFlows = null) {
  // Scale factor: make arcs and labels more legible on small high-DPI screens
  const mobileScale = isMobile ? 1.5 : 1

  // Tie arc animation drift to actual time of day so the color shift is meaningful,
  // not just an abstract counter. hourProgress is in [0, 0.5] added on top of the
  // raw rAF-driven offset.
  const hourProgress = (hour / 24) * 0.5
  const syncedOffset = flowOffset + hourProgress

  // Use pre-enriched flows when available, otherwise fall back to raw data.
  // Enriched flows carry bidirectional pair metadata (isPrimary, returnRatio, netFlow).
  const flowSource = enrichedFlows || odFlows
  const posMap = {}
  const stationMap = {}
  for (const s of stations) {
    posMap[s.properties.id] = s.geometry.coordinates
    stationMap[s.properties.id] = s
  }

  const validFlows = flowSource
    .filter(f => posMap[f.from] && posMap[f.to])
    .slice(0, topN)

  if (validFlows.length === 0) return []

  const maxVol = Math.max(...validFlows.map(f => f.volume), 1)

  // Width: quiet flows stay thin, top corridors are clearly dominant
  const widthScale = scalePow().exponent(1.8).domain([0, maxVol]).range([1.5, 16]).clamp(true)
  // Arc height: visible curve so flows look like arcs, not metro tracks
  const heightScale = scalePow().exponent(0.5).domain([0, maxVol]).range([0.03, 0.08]).clamp(true)
  const opacityScale = scalePow().exponent(0.6).domain([0, maxVol]).range([40, 200]).clamp(true)

  // Top 3 corridors by volume
  const sortedVols = [...validFlows].sort((a, b) => b.volume - a.volume).map(f => f.volume)
  const corridorThreshold = sortedVols[Math.min(2, sortedVols.length - 1)] ?? 0

  const corridorFlows = validFlows.filter(f => f.volume >= corridorThreshold)
  const regularFlows  = validFlows.filter(f => f.volume < corridorThreshold)

  // Unique stations in all flows
  const anchorIds = new Set()
  for (const f of validFlows) { anchorIds.add(f.from); anchorIds.add(f.to) }
  const anchorStations = [...anchorIds].map(id => stationMap[id]).filter(Boolean)

  const flowCount = {}
  for (const f of validFlows) {
    flowCount[f.from] = (flowCount[f.from] || 0) + 1
    flowCount[f.to]   = (flowCount[f.to]   || 0) + 1
  }

  // Short station name for inline labels
  function shortName(id) {
    const name = stationMap[id]?.properties?.name || id
    if (name.length <= 10) return name
    const parts = name.split(' ')
    if (parts.length >= 2) return parts.slice(0, 2).join(' ')
    return name.slice(0, 10)
  }

  // Anchor dots — white with gold ring
  const anchorLayer = new ScatterplotLayer({
    id: 'od-anchors',
    data: anchorStations,
    opacity: isActive ? 1.0 : 0,
    transitions: { opacity: { duration: 600 } },
    getPosition: d => d.geometry.coordinates,
    // Cap at 400m so dots don't overpower the map on mobile/high-DPI screens
    getRadius: d => Math.min(100 + (flowCount[d.properties.id] || 1) * 55, 400),
    getFillColor: [255, 255, 255, 230],
    stroked: true,
    getLineColor: [255, 190, 50, 180],
    lineWidthMinPixels: 1.5 * mobileScale,
    radiusUnits: 'meters',
    pickable: true,
  })

  // Corridor arcs (top 3) — rich gold gradient, source dim → target bright
  // Direction is clear: dark at origin, bright at destination
  const corridorArcLayer = new ArcLayer({
    id: 'od-corridors',
    data: corridorFlows,
    opacity: isActive ? 1.0 : 0,
    transitions: { opacity: { duration: 600 } },
    getSourcePosition: d => posMap[d.from],
    getTargetPosition: d => posMap[d.to],
    // Source: dark amber (origin)
    getSourceColor: d => [200, 100, 10, Math.round(opacityScale(d.volume) * 0.5)],
    // Target: bright gold (destination) — makes direction obvious
    getTargetColor: d => [255, 215, 0, Math.round(opacityScale(d.volume) + 55)],
    getWidth: d => widthScale(d.volume),
    getHeight: d => heightScale(d.volume),
    widthUnits: 'pixels',
    widthMinPixels: 4 * mobileScale,
    widthMaxPixels: 16 * mobileScale,
    greatCircle: false,
    pickable: true,
    updateTriggers: { getSourceColor: [syncedOffset], getTargetColor: [syncedOffset] },
  })

  // Flows with significant return traffic (returnRatio > 0.3) — render a ghost arc
  // to visualise the balance: lower opacity, narrower, cooler tint.
  const balancedFlows = validFlows.filter(f => (f.returnRatio ?? 0) > 0.3)

  // Ghost arcs for balanced bidirectional pairs — subordinate "return" visual layer
  const ghostArcLayer = new ArcLayer({
    id: 'od-flows-ghost',
    data: balancedFlows,
    opacity: isActive ? 0.25 : 0,
    transitions: { opacity: { duration: 600 } },
    getSourcePosition: d => posMap[d.from],
    getTargetPosition: d => posMap[d.to],
    // Cooler blue-grey tint distinguishes ghost arcs from the warm primary arcs
    getSourceColor: d => [80, 140, 200, Math.round(opacityScale(d.volume) * 0.3)],
    getTargetColor: d => [120, 180, 230, Math.round(opacityScale(d.volume) * 0.5)],
    getWidth: d => widthScale(d.volume) * 0.5,
    getHeight: d => heightScale(d.volume) * 0.5,
    widthUnits: 'pixels',
    widthMinPixels: 0.5,   // dashed-like — very thin
    widthMaxPixels: 4 * mobileScale,
    greatCircle: false,
    pickable: false,       // ghost layer shouldn't steal hover/click events
    updateTriggers: { getSourceColor: [syncedOffset], getTargetColor: [syncedOffset] },
  })

  // Regular arcs — muted amber, clearly subordinate to corridors
  // Opacity raised from 0.45 → 0.6 so they read as information, not noise.
  const regularArcLayer = new ArcLayer({
    id: 'od-flows-rest',
    data: regularFlows,
    opacity: isActive ? 0.6 : 0,
    transitions: { opacity: { duration: 600 } },
    getSourcePosition: d => posMap[d.from],
    getTargetPosition: d => posMap[d.to],
    getSourceColor: d => [180, 80, 10, Math.round(opacityScale(d.volume) * 0.35)],
    // Slightly brighten target for mostly-one-way flows (returnRatio < 0.15)
    getTargetColor: d => {
      const brightBoost = (d.returnRatio ?? 0) < 0.15 ? 1.25 : 1
      return [
        Math.min(255, Math.round(255 * brightBoost)),
        Math.min(255, Math.round(160 * brightBoost)),
        40,
        Math.round(opacityScale(d.volume) * 0.7),
      ]
    },
    getWidth: d => widthScale(d.volume),
    getHeight: d => heightScale(d.volume) * 0.6,
    widthUnits: 'pixels',
    widthMinPixels: 1 * mobileScale,
    widthMaxPixels: 6 * mobileScale,
    greatCircle: false,
    pickable: true,
    updateTriggers: { getSourceColor: [syncedOffset], getTargetColor: [syncedOffset] },
  })

  // Inline labels for top 3 corridors — placed at arc midpoint
  const labelData = corridorFlows.slice(0, 3).map((f, i) => {
    const [x1, y1] = posMap[f.from]
    const [x2, y2] = posMap[f.to]
    // Midpoint with slight upward offset so label clears the arc
    return {
      position: [(x1 + x2) / 2, (y1 + y2) / 2 + 0.006],
      text: `${shortName(f.from)} → ${shortName(f.to)}`,
      rank: i + 1,
    }
  })

  const labelLayer = new TextLayer({
    id: 'od-flow-labels',
    data: labelData,
    opacity: isActive ? 1 : 0,
    transitions: { opacity: { duration: 600 } },
    getPosition: d => d.position,
    getText: d => d.text,
    getSize: 13 * mobileScale,
    getColor: d => d.rank === 1 ? [255, 230, 80, 240] : [255, 200, 80, 200],
    getAngle: 0,
    getTextAnchor: 'middle',
    getAlignmentBaseline: 'center',
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif",
    fontWeight: 600,
    outlineWidth: 2,
    outlineColor: [0, 0, 0, 200],
    sizeUnits: 'pixels',
    pickable: false,
    parameters: { depthTest: false },
  })

  // ghostArcLayer sits beneath regular arcs; corridors are topmost for visual hierarchy
  return [anchorLayer, ghostArcLayer, regularArcLayer, corridorArcLayer, labelLayer]
}
