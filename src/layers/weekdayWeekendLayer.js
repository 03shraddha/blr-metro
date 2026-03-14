import { ScatterplotLayer, TextLayer } from '@deck.gl/layers'
import { easeCubicInOut } from 'd3-ease'
import { scaleLinear, scaleSqrt } from 'd3-scale'
import { getDailyRidership } from '../utils/dataTransforms'

// Neighbourhood zone labels — faint geographic anchors
const ZONES = [
  { position: [77.750, 12.966], label: 'WHITEFIELD IT' },
  { position: [77.607, 12.977], label: 'CBD' },
  { position: [77.626, 12.844], label: 'ELECTRONIC CITY' },
  { position: [77.541, 13.022], label: 'YESHWANTHPUR' },
  { position: [77.572, 12.976], label: 'MAJESTIC' },
  { position: [77.660, 12.991], label: 'BAIYAPPANAHALLI' },
  { position: [77.621, 12.921], label: 'SILK BOARD' },
]

// Visual design: ring-based proportional symbols.
// A thin ring + faint fill is far less cluttered than a solid filled circle —
// it lets the metro map show through while still communicating station size.
const RING_MAX_RADIUS = 800   // metres — keeps stations visually distinct
const RING_MIN_RADIUS = 80

// Filter stations to top-N by total ridership for the given mode
function filterTopN(stations, weekdayData, weekendData, mode, topN) {
  const getTotal = s => {
    const data = mode === 'weekend' ? weekendData : weekdayData
    return getDailyRidership(data, s.properties.id).total
  }
  return [...stations]
    .sort((a, b) => getTotal(b) - getTotal(a))
    .slice(0, topN)
}

export function buildWeekdayWeekendLayer(stations, weekdayData, weekendData, mode, isActive, topN = 50) {
  const filteredStations = filterTopN(stations, weekdayData, weekendData, mode, topN)
  const zoneLabels = new TextLayer({
    id: 'wdw-zone-labels',
    data: ZONES,
    opacity: isActive ? 0.30 : 0,
    transitions: { opacity: { duration: 600 } },
    getPosition: d => d.position,
    getText: d => d.label,
    getSize: 11,
    getColor: [255, 255, 255, 180],
    fontWeight: 600,
    getTextAnchor: 'middle',
    getAlignmentBaseline: 'center',
    sizeUnits: 'pixels',
    sizeMinPixels: 9,
    sizeMaxPixels: 13,
    pickable: false,
  })

  if (mode === 'delta')   return [buildDeltaLayer(filteredStations, weekdayData, weekendData, isActive), zoneLabels]
  if (mode === 'compare') return [...buildCompareLayers(filteredStations, weekdayData, weekendData, isActive), zoneLabels]

  // ── Single mode (weekday / weekend) ──────────────────────────────────────────
  const data    = mode === 'weekday' ? weekdayData : weekendData
  const palette = mode === 'weekday' ? [30, 120, 255] : [200, 50, 220]

  let maxTotal = 1
  for (const s of filteredStations) {
    const d = getDailyRidership(data, s.properties.id)
    if (d.total > maxTotal) maxTotal = d.total
  }

  const radiusScale  = scaleSqrt().domain([0, maxTotal]).range([RING_MIN_RADIUS, RING_MAX_RADIUS]).clamp(true)
  const ringAlpha    = scaleLinear().domain([0, maxTotal]).range([80, 230]).clamp(true)
  const fillAlpha    = scaleLinear().domain([0, maxTotal]).range([8,  50]).clamp(true)

  // Glow halo layer — very faint fill for the outer radius (visual "weight")
  const haloLayer = new ScatterplotLayer({
    id: 'wdw-halo',
    data: filteredStations,
    opacity: isActive ? 1.0 : 0,
    transitions: {
      opacity:      { duration: 600 },
      getRadius:    { duration: 700, easing: easeCubicInOut },
      getFillColor: { duration: 700, easing: easeCubicInOut },
    },
    getPosition:  d => d.geometry.coordinates,
    getRadius: d => {
      const { total } = getDailyRidership(data, d.properties.id)
      return radiusScale(total)
    },
    getFillColor: d => {
      const { total } = getDailyRidership(data, d.properties.id)
      return [...palette, fillAlpha(total)]
    },
    radiusUnits: 'meters',
    stroked: false,
    pickable: false,
    updateTriggers: { getRadius: [mode, topN], getFillColor: [mode, topN] },
  })

  // Ring layer — the proportional circle outline
  const ringLayer = new ScatterplotLayer({
    id: 'weekday-weekend',
    data: filteredStations,
    opacity: isActive ? 1.0 : 0,
    transitions: {
      opacity:        { duration: 600 },
      getRadius:      { duration: 700, easing: easeCubicInOut },
      getLineColor:   { duration: 700, easing: easeCubicInOut },
    },
    getPosition: d => d.geometry.coordinates,
    getRadius: d => {
      const { total } = getDailyRidership(data, d.properties.id)
      return radiusScale(total)
    },
    getFillColor:  [0, 0, 0, 0],        // transparent fill — ring only
    stroked: true,
    getLineColor: d => {
      const { total } = getDailyRidership(data, d.properties.id)
      return [...palette, ringAlpha(total)]
    },
    lineWidthMinPixels: 1.5,
    lineWidthMaxPixels: 3,
    radiusUnits: 'meters',
    pickable: true,
    updateTriggers: { getRadius: [mode, topN], getLineColor: [mode, topN] },
  })

  // Station dot — small solid dot at centre so you can see exact station location
  const dotLayer = new ScatterplotLayer({
    id: 'wdw-dots',
    data: filteredStations,
    opacity: isActive ? 1.0 : 0,
    transitions: { opacity: { duration: 600 } },
    getPosition:  d => d.geometry.coordinates,
    getRadius:    70,
    getFillColor: [...palette, 200],
    stroked: false,
    radiusUnits: 'meters',
    pickable: false,
  })

  return [haloLayer, ringLayer, dotLayer, zoneLabels]
}

// ── Delta mode ────────────────────────────────────────────────────────────────
function buildDeltaLayer(stations, weekdayData, weekendData, isActive) {
  let maxAbsDelta = 1
  for (const s of stations) {
    const wd  = getDailyRidership(weekdayData, s.properties.id)
    const we  = getDailyRidership(weekendData,  s.properties.id)
    const abs = Math.abs(wd.total - we.total)
    if (abs > maxAbsDelta) maxAbsDelta = abs
  }

  const radiusScale = scaleSqrt().domain([0, maxAbsDelta]).range([60, 700]).clamp(true)
  const alphaScale  = scaleLinear().domain([0, maxAbsDelta]).range([60, 200]).clamp(true)

  return new ScatterplotLayer({
    id: 'weekday-weekend-delta',
    data: stations,
    opacity: isActive ? 1.0 : 0,
    transitions: {
      opacity:        { duration: 600 },
      getRadius:      { duration: 700, easing: easeCubicInOut },
      getLineColor:   { duration: 700, easing: easeCubicInOut },
    },
    getPosition: d => d.geometry.coordinates,
    getRadius: d => {
      const wd = getDailyRidership(weekdayData, d.properties.id)
      const we = getDailyRidership(weekendData,  d.properties.id)
      return radiusScale(Math.abs(wd.total - we.total))
    },
    getFillColor: d => {
      const wd    = getDailyRidership(weekdayData, d.properties.id)
      const we    = getDailyRidership(weekendData,  d.properties.id)
      const delta = wd.total - we.total
      const t     = Math.max(-1, Math.min(1, delta / maxAbsDelta))
      const alpha = alphaScale(Math.abs(delta))
      return t >= 0 ? [30, 100, 220, Math.round(alpha * 0.3)] : [180, 30, 200, Math.round(alpha * 0.3)]
    },
    stroked: true,
    getLineColor: d => {
      const wd    = getDailyRidership(weekdayData, d.properties.id)
      const we    = getDailyRidership(weekendData,  d.properties.id)
      const delta = wd.total - we.total
      const t     = Math.max(-1, Math.min(1, delta / maxAbsDelta))
      const alpha = alphaScale(Math.abs(delta))
      return t >= 0 ? [30, 100, 220, alpha] : [180, 30, 200, alpha]
    },
    lineWidthMinPixels: 1.5,
    lineWidthMaxPixels: 2.5,
    radiusUnits: 'meters',
    pickable: true,
    updateTriggers: { getRadius: ['delta'], getFillColor: ['delta'], getLineColor: ['delta'] },
  })
}

// ── Compare mode ──────────────────────────────────────────────────────────────
function buildCompareLayers(stations, weekdayData, weekendData, isActive) {
  let maxWd = 1, maxWe = 1
  for (const s of stations) {
    const wd = getDailyRidership(weekdayData, s.properties.id)
    const we = getDailyRidership(weekendData,  s.properties.id)
    if (wd.total > maxWd) maxWd = wd.total
    if (we.total > maxWe) maxWe = we.total
  }

  const wdRadius = scaleSqrt().domain([0, maxWd]).range([60, 700]).clamp(true)
  const weRadius = scaleSqrt().domain([0, maxWe]).range([60, 700]).clamp(true)
  const wdAlpha  = scaleLinear().domain([0, maxWd]).range([60, 200]).clamp(true)
  const weAlpha  = scaleLinear().domain([0, maxWe]).range([60, 200]).clamp(true)

  // Weekday: solid blue ring, slightly larger
  const weekdayLayer = new ScatterplotLayer({
    id: 'wdw-compare-weekday',
    data: stations,
    opacity: isActive ? 1.0 : 0,
    transitions: { opacity: { duration: 600 } },
    getPosition:  d => d.geometry.coordinates,
    getRadius:    d => wdRadius(getDailyRidership(weekdayData, d.properties.id).total),
    getFillColor: d => [30, 120, 255, Math.round(wdAlpha(getDailyRidership(weekdayData, d.properties.id).total) * 0.2)],
    stroked: true,
    getLineColor: d => [30, 120, 255, wdAlpha(getDailyRidership(weekdayData, d.properties.id).total)],
    lineWidthMinPixels: 1.5,
    radiusUnits: 'meters',
    pickable: true,
  })

  // Weekend: dashed-style purple ring (shorter radius so they can be seen together)
  const weekendLayer = new ScatterplotLayer({
    id: 'wdw-compare-weekend',
    data: stations,
    opacity: isActive ? 1.0 : 0,
    transitions: { opacity: { duration: 600 } },
    getPosition:  d => d.geometry.coordinates,
    getRadius:    d => weRadius(getDailyRidership(weekendData, d.properties.id).total) * 0.78,
    getFillColor: [0, 0, 0, 0],
    stroked: true,
    getLineColor: d => [200, 50, 220, weAlpha(getDailyRidership(weekendData, d.properties.id).total)],
    lineWidthMinPixels: 1.5,
    radiusUnits: 'meters',
    pickable: true,
  })

  return [weekdayLayer, weekendLayer]
}
