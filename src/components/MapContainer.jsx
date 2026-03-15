import { useEffect, useRef, useMemo, useCallback } from 'react'
import maplibregl from 'maplibre-gl'
import { MapboxOverlay } from '@deck.gl/mapbox'
import { findMaxRidership, getRidershipAtHour } from '../utils/dataTransforms'
import { buildVolumeLayers } from '../layers/volumeLayer'
import { buildEntryExitLayer } from '../layers/entryExitLayer'
import { buildOdFlowLayer } from '../layers/odFlowLayer'
import { buildWeekdayWeekendLayer } from '../layers/weekdayWeekendLayer'
import { buildCoverageGapLayers } from '../layers/coverageGapLayer'
import { buildMetroLinesLayer } from '../layers/metroLinesLayer'
import { useTheme } from '../context/ThemeContext'
import { useBreakpoint } from '../hooks/useBreakpoint'

export default function MapContainer({
  data,
  activeLayer,
  hour,
  weekdayWeekendMode,
  playing,
  zoom,
  odTopN,
  wdwTopN,
  catchmentRadius,
  onHover,
  onStationClick,
  onZoomChange,
  mapStyle,
}) {
  const { theme } = useTheme()
  const { isMobile, isTablet } = useBreakpoint()
  const mapContainerRef = useRef(null)
  const mapRef          = useRef(null)
  const overlayRef      = useRef(null)
  // flowOffset drives directional arc animation when playing
  const flowOffsetRef   = useRef(0)
  const animFrameRef    = useRef(null)

  // Initialize map once
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return

    // Pick initial zoom based on screen size so the city fits without needing to pinch-zoom
    const initialZoom = isMobile ? 11.5 : isTablet ? 11.0 : 11.2

    // Disable the default compact attribution so we can control it ourselves
    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: mapStyle,
      center: [77.5946, 12.9716],
      zoom: initialZoom,
      pitch: 0,
      attributionControl: false,
    })

    // Compact attribution saves space on mobile; full text fine on desktop
    map.addControl(
      new maplibregl.AttributionControl({ compact: isMobile }),
      'bottom-left'
    )

    // Navigation controls (zoom +/-) placed bottom-right on mobile (thumb-reachable),
    // top-right on desktop where the UI panel is not blocking that corner
    map.addControl(
      new maplibregl.NavigationControl({ showCompass: false }),
      isMobile ? 'bottom-right' : 'top-right'
    )

    const overlay = new MapboxOverlay({ interleaved: false, layers: [] })
    map.addControl(overlay)

    // Propagate zoom changes for progressive disclosure
    if (onZoomChange) {
      map.on('zoom', () => onZoomChange(map.getZoom()))
    }

    mapRef.current   = map
    overlayRef.current = overlay

    return () => {
      overlay.finalize()
      map.remove()
      mapRef.current   = null
      overlayRef.current = null
    }
  }, [onZoomChange]) // eslint-disable-line react-hooks/exhaustive-deps

  // Update map style when theme changes
  useEffect(() => {
    if (!mapRef.current) return
    mapRef.current.setStyle(mapStyle)
  }, [mapStyle])

  // Directional arc animation — runs rAF loop when playing, stops when paused
  useEffect(() => {
    if (!playing) {
      cancelAnimationFrame(animFrameRef.current)
      return
    }
    let last = performance.now()
    const tick = (now) => {
      const dt = (now - last) / 1000
      last = now
      // Advances ~1 unit per second — integer changes trigger arc color flip
      flowOffsetRef.current = (flowOffsetRef.current + dt * 1.2) % 10
      animFrameRef.current = requestAnimationFrame(tick)
    }
    animFrameRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(animFrameRef.current)
  }, [playing])

  const maxRidership = useMemo(
    () => (data ? findMaxRidership(data.stations) : 1),
    [data]
  )

  // Aggregate per-line ridership at the current hour so metro line widths
  // reflect actual passenger volumes (busier lines render thicker).
  const lineStats = useMemo(() => {
    if (!data?.stations) return null
    const totals = {}
    for (const s of data.stations) {
      const line = s.properties?.line
      if (!line) continue
      const { total } = getRidershipAtHour(s, hour)
      totals[line] = (totals[line] || 0) + total
    }
    const maxLine = Math.max(...Object.values(totals), 1)
    return Object.fromEntries(
      Object.entries(totals).map(([k, v]) => [k, v / maxLine])
    )
  }, [data?.stations, hour])

  // Zoom-based aggregation: show fewer arcs at city-wide zoom, more when zoomed in
  const effectiveTopN = useMemo(() => {
    const n = odTopN ?? 15
    if (zoom < 11) return Math.min(n, 8)
    if (zoom > 13) return Math.min(n * 2, 50)
    return n
  }, [zoom, odTopN])

  // Rebuild layers on every relevant state change
  useEffect(() => {
    if (!overlayRef.current || !data) return

    const { stations, weekday, weekend, odFlows, populationGrid, metroLines } = data
    const isDataActive = true // a data layer is always shown

    const metroLinesLayers = [].concat(buildMetroLinesLayer(metroLines, isDataActive, isMobile, lineStats))

    const volumeLayers    = buildVolumeLayers(stations, hour, activeLayer === 'volume', maxRidership, isMobile)
    const entryExitLayer  = buildEntryExitLayer(stations, hour, activeLayer === 'entryExit', maxRidership)
    const odLayers        = buildOdFlowLayer(stations, odFlows, activeLayer === 'odFlow', flowOffsetRef.current, effectiveTopN, isMobile)
    // buildWeekdayWeekendLayer now returns an array; flatten with concat
    const wdwLayers       = [].concat(buildWeekdayWeekendLayer(stations, weekday, weekend, weekdayWeekendMode, activeLayer === 'weekdayWeekend', wdwTopN, isMobile))
    const coverageLayers  = buildCoverageGapLayers(stations, populationGrid, activeLayer === 'coverageGap', catchmentRadius, isMobile)

    const allLayers = [
      ...metroLinesLayers,
      ...volumeLayers,
      entryExitLayer,
      ...odLayers,
      ...wdwLayers,
      ...coverageLayers,
    ].filter(Boolean)

    const withCallbacks = allLayers.map(layer =>
      layer.clone({
        onHover: info => onHover(info),
        onClick: info => { if (info.object) onStationClick(info.object) },
      })
    )

    overlayRef.current.setProps({ layers: withCallbacks })
  }, [data, activeLayer, hour, weekdayWeekendMode, maxRidership, lineStats, effectiveTopN, wdwTopN, catchmentRadius, onHover, onStationClick, isMobile])

  return (
    <div className="absolute inset-0" style={{ touchAction: 'manipulation' }}>
      <div ref={mapContainerRef} className="absolute inset-0" />
      {/* Light mode: subtle white veil to push basemap further into background */}
      {theme === 'light' && (
        <div style={{
          position: 'absolute', inset: 0,
          background: 'rgba(255,255,255,0.12)',
          pointerEvents: 'none',
          zIndex: 1,
        }} />
      )}
    </div>
  )
}
