import { useState, useCallback, useMemo } from 'react'
import MapContainer from './components/MapContainer'
import LayerTabs from './components/LayerTabs'
import TimeSlider from './components/TimeSlider'
import WeekdayToggle from './components/WeekdayToggle'
import OdFlowControls from './components/OdFlowControls'
import WeekdayControls from './components/WeekdayControls'
import CoverageControls from './components/CoverageControls'
import DataTable from './components/DataTable'
import Tooltip from './components/Tooltip'
import Legend from './components/Legend'
import StationPanel from './components/StationPanel'
import OdFlowHeadline from './components/OdFlowHeadline'
import CoverageHeadline from './components/CoverageHeadline'
import { useMetroData } from './hooks/useMetroData'
import { useTimeSlider } from './hooks/useTimeSlider'
import { useTheme } from './context/ThemeContext'

export default function App() {
  const { data, loading, error } = useMetroData()
  const { hour, playing, togglePlay, setHourManual } = useTimeSlider(8)

  const [activeLayer, setActiveLayer] = useState('volume')
  const [weekdayWeekendMode, setWeekdayWeekendMode] = useState('weekday')
  const [odTopN, setOdTopN] = useState(15)
  const [wdwTopN, setWdwTopN] = useState(20)
  const [catchmentRadius, setCatchmentRadius] = useState(500)
  const [tooltipInfo, setTooltipInfo] = useState(null)
  const [selectedStation, setSelectedStation] = useState(null)
  const [zoom, setZoom] = useState(11.2)

  const { theme, toggleTheme } = useTheme()
  const mapStyle = theme === 'dark'
    ? 'https://tiles.openfreemap.org/styles/dark'
    : 'https://tiles.openfreemap.org/styles/positron'

  // Compute % of dense population within catchmentRadius of any station
  const coveragePct = useMemo(() => {
    if (!data?.stations || !data?.populationGrid) return null
    const positions = data.stations.map(s => s.geometry.coordinates)
    const haverDist = ([lng1, lat1], [lng2, lat2]) => {
      const R = 6371000, toRad = d => d * Math.PI / 180
      const dLat = toRad(lat2 - lat1), dLng = toRad(lng2 - lng1)
      const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
      return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    }
    let total = 0, covered = 0
    for (const cell of data.populationGrid) {
      if (cell.weight < 0.12) continue
      total += cell.weight
      if (positions.some(pos => haverDist(pos, cell.position) <= catchmentRadius)) covered += cell.weight
    }
    return total > 0 ? Math.round((covered / total) * 100) : null
  }, [data?.stations, data?.populationGrid, catchmentRadius])

  const handleZoomChange = useCallback(z => setZoom(z), [])

  const handleHover = useCallback(info => {
    setTooltipInfo(info.object ? info : null)
  }, [])

  const handleStationClick = useCallback(station => {
    setSelectedStation(prev =>
      prev?.properties?.id === station.properties?.id ? null : station
    )
  }, [])

  const handleClosePanel = useCallback(() => setSelectedStation(null), [])

  if (error) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-[#0a0a0f]">
        <div className="text-white/60 text-sm text-center px-8">
          <div className="text-2xl mb-3">⚠</div>
          <div>Could not load metro data.</div>
          <div className="text-white/30 text-xs mt-2">{error}</div>
          <div className="text-white/30 text-xs mt-1">
            Run scripts/process_data.py first to generate the data files.
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative w-full h-full overflow-hidden" style={{ background: 'var(--app-bg)' }}>
      {/* Base map + deck.gl layers */}
      {!loading && data && (
        <MapContainer
          data={data}
          activeLayer={activeLayer}
          hour={hour}
          playing={playing}
          weekdayWeekendMode={weekdayWeekendMode}
          zoom={zoom}
          odTopN={odTopN}
          wdwTopN={wdwTopN}
          catchmentRadius={catchmentRadius}
          onHover={handleHover}
          onStationClick={handleStationClick}
          onZoomChange={handleZoomChange}
          mapStyle={mapStyle}
        />
      )}

      {/* Loading overlay when data is still fetching */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div style={{ fontSize: '0.75rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-micro)' }}>
            Loading data…
          </div>
        </div>
      )}

      {/* Layer story chapter tabs */}
      <LayerTabs activeLayer={activeLayer} setActiveLayer={setActiveLayer} toggleTheme={toggleTheme} theme={theme} />

      {/* Weekday / weekend / delta / compare sub-toggle */}
      <WeekdayToggle
        mode={weekdayWeekendMode}
        setMode={setWeekdayWeekendMode}
        activeLayer={activeLayer}
      />

      {/* Data table — adapts to whichever layer is active */}
      <DataTable
        data={data}
        activeLayer={activeLayer}
        hour={hour}
        weekdayWeekendMode={weekdayWeekendMode}
        odTopN={odTopN}
        catchmentRadius={catchmentRadius}
        selectedStation={selectedStation}
        onStationClick={handleStationClick}
      />

      {/* OD flow top-N slider + headline stat */}
      <OdFlowControls
        topN={odTopN}
        setTopN={setOdTopN}
        activeLayer={activeLayer}
        odFlows={data?.odFlows}
      />

      {/* Weekday/weekend top-N stations slider */}
      <WeekdayControls
        topN={wdwTopN}
        setTopN={setWdwTopN}
        activeLayer={activeLayer}
      />

      {/* Coverage gap catchment radius slider */}
      <CoverageControls
        radius={catchmentRadius}
        setRadius={setCatchmentRadius}
        activeLayer={activeLayer}
        coveragePct={coveragePct}
      />

      {/* Time slider (only for hourly layers) */}
      <TimeSlider
        hour={hour}
        playing={playing}
        togglePlay={togglePlay}
        setHourManual={setHourManual}
        activeLayer={activeLayer}
      />

      {/* Legend */}
      <Legend activeLayer={activeLayer} weekdayWeekendMode={weekdayWeekendMode} catchmentRadius={catchmentRadius} />

      {/* Hover tooltip */}
      <Tooltip info={tooltipInfo} hour={hour} />

      {/* Station detail panel */}
      <StationPanel station={selectedStation} onClose={handleClosePanel} />



      {/* Title watermark — safe area aware, hidden on weekdayWeekend layer */}
      {activeLayer !== 'weekdayWeekend' && (
        <div
          className="text-right pointer-events-none"
          style={{
            position: 'absolute',
            top: 'max(16px, env(safe-area-inset-top))',
            right: 'max(16px, env(safe-area-inset-right))',
            zIndex: 10,
          }}
        >
          <div style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--watermark-title)' }}>
            Bengaluru Metro
          </div>
          <div style={{ fontSize: 9, color: 'var(--watermark-sub)' }}>Intelligence Map</div>
        </div>
      )}

      {/* Data attribution — safe area aware, bottom left */}
      <div
        className="pointer-events-none"
        style={{
          position: 'absolute',
          bottom: 'max(8px, env(safe-area-inset-bottom))',
          left: 'max(8px, env(safe-area-inset-left))',
          zIndex: 10,
        }}
      >
        <div style={{ fontSize: 10, color: 'var(--watermark-sub)', letterSpacing: '0.03em' }}>
          Source: BMRCL · Data period: Aug 2025 (RTI)
        </div>
      </div>
    </div>
  )
}
