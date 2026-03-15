import { ArcLayer, ScatterplotLayer, TextLayer } from '@deck.gl/layers'
import { scalePow } from 'd3-scale'

export function buildOdFlowLayer(stations, odFlows, isActive, flowOffset = 0, topN = 15) {
  const posMap = {}
  const stationMap = {}
  for (const s of stations) {
    posMap[s.properties.id] = s.geometry.coordinates
    stationMap[s.properties.id] = s
  }

  const validFlows = odFlows
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
    getRadius: d => 100 + (flowCount[d.properties.id] || 1) * 55,
    getFillColor: [255, 255, 255, 230],
    stroked: true,
    getLineColor: [255, 190, 50, 180],
    lineWidthMinPixels: 1.5,
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
    widthMinPixels: 4,
    widthMaxPixels: 16,
    greatCircle: false,
    pickable: true,
    updateTriggers: { getSourceColor: [flowOffset], getTargetColor: [flowOffset] },
  })

  // Regular arcs — muted amber, clearly subordinate to corridors
  const regularArcLayer = new ArcLayer({
    id: 'od-flows-rest',
    data: regularFlows,
    opacity: isActive ? 0.45 : 0,
    transitions: { opacity: { duration: 600 } },
    getSourcePosition: d => posMap[d.from],
    getTargetPosition: d => posMap[d.to],
    getSourceColor: d => [180, 80, 10, Math.round(opacityScale(d.volume) * 0.35)],
    getTargetColor: d => [255, 160, 40, Math.round(opacityScale(d.volume) * 0.7)],
    getWidth: d => widthScale(d.volume),
    getHeight: d => heightScale(d.volume) * 0.6,
    widthUnits: 'pixels',
    widthMinPixels: 1,
    widthMaxPixels: 6,
    greatCircle: false,
    pickable: true,
    updateTriggers: { getSourceColor: [flowOffset], getTargetColor: [flowOffset] },
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
    getSize: 13,
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

  return [anchorLayer, regularArcLayer, corridorArcLayer, labelLayer]
}
