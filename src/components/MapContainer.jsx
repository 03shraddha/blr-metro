import { useEffect, useRef, useMemo, useCallback } from 'react'
import maplibregl from 'maplibre-gl'
import { MapboxOverlay } from '@deck.gl/mapbox'
import { findMaxRidership } from '../utils/dataTransforms'
import { buildVolumeLayers } from '../layers/volumeLayer'
import { buildEntryExitLayer } from '../layers/entryExitLayer'
import { buildOdFlowLayer } from '../layers/odFlowLayer'
import { buildWeekdayWeekendLayer } from '../layers/weekdayWeekendLayer'
import { buildCoverageGapLayers } from '../layers/coverageGapLayer'
import { buildMetroLinesLayer } from '../layers/metroLinesLayer'
import { useTheme } from '../context/ThemeContext'

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
  const mapContainerRef = useRef(null)
  const mapRef          = useRef(null)
  const overlayRef      = useRef(null)
  // flowOffset drives directional arc animation when playing
  const flowOffsetRef   = useRef(0)
  const animFrameRef    = useRef(null)

  // Initialize map once
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: mapStyle,
      center: [77.5946, 12.9716],
      zoom: 11.2,
      pitch: 0,
      attributionControl: true,
    })

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

    const metroLinesLayer = buildMetroLinesLayer(metroLines, isDataActive)

    const volumeLayers    = buildVolumeLayers(stations, hour, activeLayer === 'volume', maxRidership)
    const entryExitLayer  = buildEntryExitLayer(stations, hour, activeLayer === 'entryExit')
    const odLayers        = buildOdFlowLayer(stations, odFlows, activeLayer === 'odFlow', flowOffsetRef.current, effectiveTopN)
    // buildWeekdayWeekendLayer now returns an array; flatten with concat
    const wdwLayers       = [].concat(buildWeekdayWeekendLayer(stations, weekday, weekend, weekdayWeekendMode, activeLayer === 'weekdayWeekend', wdwTopN))
    const coverageLayers  = buildCoverageGapLayers(stations, populationGrid, activeLayer === 'coverageGap', catchmentRadius)

    const allLayers = [
      metroLinesLayer,
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
  }, [data, activeLayer, hour, weekdayWeekendMode, maxRidership, effectiveTopN, wdwTopN, catchmentRadius, onHover, onStationClick])

  return (
    <div className="absolute inset-0">
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
