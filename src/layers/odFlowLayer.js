import { ArcLayer, ScatterplotLayer } from '@deck.gl/layers'
import { scaleLinear, scalePow } from 'd3-scale'

// Returns [anchorLayer, arcLayer]
export function buildOdFlowLayer(stations, odFlows, isActive, flowOffset = 0) {
  const posMap = {}
  const stationMap = {}
  for (const s of stations) {
    posMap[s.properties.id] = s.geometry.coordinates
    stationMap[s.properties.id] = s
  }

  // Top 15 — show only the dominant corridors. More = noise.
  const validFlows = odFlows
    .filter(f => posMap[f.from] && posMap[f.to])
    .slice(0, 15)

  const maxVol = Math.max(...validFlows.map(f => f.volume), 1)

  // Aggressive linear width: top corridor is unmistakably thick
  const widthScale = scalePow().exponent(0.6).domain([0, maxVol]).range([1.5, 14]).clamp(true)

  // Flat arcs — keep them close to the metro lines so flows read as on-network
  const heightScale = scaleLinear().domain([0, maxVol]).range([0.04, 0.18]).clamp(true)

  // Volume-driven opacity: low flows are faint, top flows are vivid
  const opacityScale = scalePow().exponent(0.7).domain([0, maxVol]).range([50, 220]).clamp(true)

  // Collect unique station IDs that appear in the top flows
  const anchorIds = new Set()
  for (const f of validFlows) {
    anchorIds.add(f.from)
    anchorIds.add(f.to)
  }
  const anchorStations = [...anchorIds]
    .map(id => stationMap[id])
    .filter(Boolean)

  // Count how many flows pass through each station (for anchor sizing)
  const flowCount = {}
  for (const f of validFlows) {
    flowCount[f.from] = (flowCount[f.from] || 0) + 1
    flowCount[f.to] = (flowCount[f.to] || 0) + 1
  }

  // Station anchor dots — clear origin/destination markers
  const anchorLayer = new ScatterplotLayer({
    id: 'od-anchors',
    data: anchorStations,
    opacity: isActive ? 1.0 : 0,
    transitions: { opacity: { duration: 600 } },
    getPosition: d => d.geometry.coordinates,
    // Busier stations get slightly larger anchors
    getRadius: d => 120 + (flowCount[d.properties.id] || 1) * 60,
    getFillColor: [255, 255, 255, 220],
    stroked: true,
    getLineColor: [255, 200, 100, 160],
    lineWidthMinPixels: 1,
    radiusUnits: 'meters',
    pickable: true,
  })

  // Flow arcs — single color family (amber→white) scaled by volume.
  // Both ends share the same base color; flowOffset shifts brightness to
  // suggest directionality without introducing a confusing second color.
  const arcLayer = new ArcLayer({
    id: 'od-flows',
    data: validFlows,
    opacity: isActive ? 1.0 : 0,
    transitions: { opacity: { duration: 600 } },
    getSourcePosition: d => posMap[d.from],
    getTargetPosition: d => posMap[d.to],
    // Source (departure end): warm amber
    getSourceColor: d => {
      const a = opacityScale(d.volume)
      const pulse = Math.round(flowOffset) % 2 === 0 ? 30 : 0
      return [255, Math.min(160 + pulse, 255), 40, a]
    },
    // Target (arrival end): brighter, slightly cooler — encodes directionality
    getTargetColor: d => {
      const a = opacityScale(d.volume)
      const pulse = Math.round(flowOffset) % 2 === 1 ? 30 : 0
      return [255, Math.min(220 + pulse, 255), Math.min(120 + pulse, 255), a]
    },
    getWidth: d => widthScale(d.volume),
    getHeight: d => heightScale(d.volume),
    widthUnits: 'pixels',
    widthMinPixels: 1.5,
    widthMaxPixels: 14,
    greatCircle: false,
    pickable: true,
    updateTriggers: {
      getSourceColor: [flowOffset],
      getTargetColor: [flowOffset],
    },
  })

  return [anchorLayer, arcLayer]
}
