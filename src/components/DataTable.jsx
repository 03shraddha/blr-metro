import { useState, useMemo } from 'react'
import { getRidershipAtHour, getDailyRidership, buildSparkline, formatHour } from '../utils/dataTransforms'

const IOS_FONT = "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', Arial, sans-serif"

function SearchIcon() {
  return (
    <svg viewBox="0 0 16 16" width={14} height={14} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round">
      <circle cx="6.5" cy="6.5" r="4" />
      <line x1="10" y1="10" x2="14" y2="14" />
    </svg>
  )
}

// Mini sparkline for selected station card
function MiniSparkline({ station, accentColor }) {
  const spark = buildSparkline(station)
  const maxV  = Math.max(...spark, 1)
  const W = 220, H = 36
  const pts = spark.map((v, i) => `${(i / 23) * W},${H - (v / maxV) * H}`).join(' ')
  const peakH = spark.indexOf(Math.max(...spark))
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: H }}>
        <polyline points={`0,${H} ${pts} ${W},${H}`} fill={accentColor + '18'} stroke="none" />
        <polyline points={pts} fill="none" stroke={accentColor} strokeWidth={1.5} strokeLinejoin="round" opacity={0.85} />
        <circle cx={(peakH / 23) * W} cy={H - (spark[peakH] / maxV) * H} r={3} fill={accentColor} />
      </svg>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
        {[0, 6, 12, 18, 23].map(h => (
          <span key={h} style={{ fontSize: 10, color: 'var(--text-micro)' }}>{formatHour(h)}</span>
        ))}
      </div>
      <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 6 }}>
        Peak: <span style={{ color: accentColor, fontWeight: 600 }}>{formatHour(peakH)}</span>
      </div>
    </div>
  )
}

// Selected station detail card shown at top of panel
function SelectedCard({ station, accentColor, onClose, weekday, weekend, hour, activeLayer, weekdayWeekendMode }) {
  if (!station) return null
  const props = station.properties || {}
  const lineColor = LINE_COLOR[props.line?.toLowerCase()] || '#888'

  // Build context-aware stats based on active layer
  let stats = []
  if (activeLayer === 'volume' || activeLayer === 'entryExit') {
    const { entries, exits, total } = getRidershipAtHour(station, hour)
    stats = [
      { label: 'Entries', value: fmtN(entries) },
      { label: 'Exits',   value: fmtN(exits) },
      { label: 'Total',   value: fmtN(total) },
    ]
  } else if (activeLayer === 'weekdayWeekend') {
    const wd = getDailyRidership(weekday, props.id)
    const we = getDailyRidership(weekend, props.id)
    stats = [
      { label: 'Weekday', value: fmtN(wd.total) },
      { label: 'Weekend', value: fmtN(we.total) },
      { label: 'Change',  value: wd.total > 0 ? `${Math.round((we.total / wd.total - 1) * 100)}%` : '-' },
    ]
  } else if (activeLayer === 'coverageGap') {
    const wd = getDailyRidership(weekday, props.id)
    stats = [{ label: 'Daily riders', value: fmtN(wd.total) }]
  }

  const type = stationType(station)

  return (
    <div style={{ padding: '12px 18px', borderBottom: '0.5px solid var(--border)', background: 'var(--stat-bg)' }}>
      {/* Station header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 3 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: lineColor, display: 'inline-block', flexShrink: 0 }} />
            <span style={{ fontSize: 16, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
              {props.name || 'Station'}
            </span>
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            {props.line && (
              <span style={{ fontSize: 11, color: 'var(--text-label)' }}>{capitalize(props.line)} Line</span>
            )}
            {type && (
              <span style={{ fontSize: 11, fontWeight: 600, padding: '1px 6px', borderRadius: 5, color: type.color, background: type.color + '22' }}>
                {type.label}
              </span>
            )}
          </div>
        </div>
        <button
          onClick={onClose}
          style={{ color: 'var(--text-muted)', cursor: 'pointer', background: 'none', border: 'none', padding: 2, lineHeight: 0 }}
        >
          <svg viewBox="0 0 12 12" width={12} height={12} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round">
            <line x1="1" y1="1" x2="11" y2="11" /><line x1="11" y1="1" x2="1" y2="11" />
          </svg>
        </button>
      </div>

      {/* Stats row */}
      {stats.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${stats.length}, 1fr)`, gap: 8, marginBottom: 10 }}>
          {stats.map(({ label, value }) => (
            <div key={label} style={{ background: 'var(--stat-bg)', borderRadius: 10, padding: '7px 10px' }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>{label}</div>
              <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text-primary)' }} className="tabular-nums">{value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Sparkline */}
      {station.ridership && (
        <MiniSparkline station={station} accentColor={accentColor} />
      )}
    </div>
  )
}

const LINE_COLOR = {
  purple: '#b222b2', green: '#008c46',
  yellow: '#c8a000', pink:  '#c83264',
  red:    '#b41e1e', blue:  '#1e50c8',
}

// Classify a station as Job Hub / Residential / Mixed based on its all-day exit:entry ratio
function stationType(station) {
  if (!station.ridership) return null
  let totalIn = 0, totalOut = 0
  for (const h of Object.values(station.ridership)) {
    totalIn  += h.entries || 0
    totalOut += h.exits   || 0
  }
  if (totalIn === 0) return null
  const r = totalOut / totalIn
  if (r > 1.35) return { label: 'Job Hub',     color: '#fca5a5' }
  if (r < 0.72) return { label: 'Residential', color: '#93c5fd' }
  return              { label: 'Interchange',  color: '#d9f99d' }
}

// Find the hour with highest ridership for a station
function peakHour(station) {
  if (!station.ridership) return null
  let max = 0, peak = null
  for (const [h, d] of Object.entries(station.ridership)) {
    const t = (d.entries || 0) + (d.exits || 0)
    if (t > max) { max = t; peak = parseInt(h) }
  }
  return peak
}

export default function DataTable({ data, activeLayer, hour, weekdayWeekendMode, odTopN, catchmentRadius = 500, onStationClick, selectedStation }) {
  const [collapsed, setCollapsed] = useState(false)
  const [search, setSearch] = useState('')
  if (!data) return null

  const { stations, weekday, weekend, odFlows } = data
  const config = buildConfig(activeLayer, weekdayWeekendMode, stations, weekday, weekend, odFlows, hour, odTopN, catchmentRadius)
  if (!config) return null

  const { title, insight, rows, accentColor } = config
  const topOffset = activeLayer === 'weekdayWeekend' ? 80 : 16

  // Filter rows by search term
  const term = search.trim().toLowerCase()
  const filteredRows = term
    ? rows.filter(r => {
        const lbl = typeof r.label === 'string' ? r.label : (r.origin + ' ' + r.dest || '')
        return lbl.toLowerCase().includes(term)
      })
    : rows

  // Click handler: find the station in data and call onStationClick
  function handleRowClick(row) {
    if (!onStationClick || !row.stationId) return
    const station = stations.find(s => s.properties.id === row.stationId)
    if (station) onStationClick(station)
  }

  const selectedId = selectedStation?.properties?.id

  return (
    <div
      className="absolute right-4 z-10 flex flex-col overflow-hidden"
      style={{
        backdropFilter: 'blur(28px) saturate(1.6)',
        WebkitBackdropFilter: 'blur(28px) saturate(1.6)',
        background: 'var(--panel-bg)',
        boxShadow: 'var(--panel-shadow-sm)',
        borderRadius: 20,
        top: topOffset,
        width: 'calc(100vw - 32px)',
        maxWidth: 370,
        maxHeight: 'calc(100vh - 180px)',
        fontFamily: IOS_FONT,
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between cursor-pointer select-none flex-shrink-0"
        style={{ padding: '14px 18px', borderBottom: '0.5px solid var(--border)' }}
        onClick={() => setCollapsed(v => !v)}
      >
        <div className="flex items-center gap-2.5">
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: accentColor, flexShrink: 0 }} />
          <span style={{ fontSize: 14, fontWeight: 600, letterSpacing: '0.07em', color: 'var(--text-label)', textTransform: 'uppercase' }}>
            {title}
          </span>
        </div>
        <svg
          viewBox="0 0 10 6" width={13} height={13}
          style={{
            fill: 'none', stroke: 'var(--text-muted)', strokeWidth: 1.6, strokeLinecap: 'round',
            transform: collapsed ? 'rotate(180deg)' : 'none',
            transition: 'transform 200ms ease',
          }}
        >
          <path d="M1 1l4 4 4-4" />
        </svg>
      </div>

      {!collapsed && (
        <>
          {/* Selected station card — replaces insight when a station is picked */}
          {selectedStation ? (
            <SelectedCard
              station={selectedStation}
              accentColor={accentColor}
              onClose={() => onStationClick(selectedStation)}
              weekday={weekday}
              weekend={weekend}
              hour={hour}
              activeLayer={activeLayer}
              weekdayWeekendMode={weekdayWeekendMode}
            />
          ) : insight && (
            <div className="flex-shrink-0" style={{ padding: '12px 18px', borderBottom: '0.5px solid var(--border)' }}>
              <p style={{ fontSize: 17, lineHeight: 1.55, color: 'var(--text-secondary)', margin: 0 }}>{insight}</p>
            </div>
          )}

          {/* Search box */}
          <div className="flex-shrink-0" style={{ padding: '10px 18px', borderBottom: '0.5px solid var(--border)' }}>
            <div
              className="flex items-center gap-2"
              style={{
                background: 'var(--input-bg)',
                borderRadius: 10,
                padding: '7px 12px',
              }}
            >
              <span style={{ color: 'var(--input-icon)', lineHeight: 0 }}><SearchIcon /></span>
              <input
                type="text"
                placeholder="Filter stations..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                onClick={e => e.stopPropagation()}
                style={{
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  flex: 1,
                  fontSize: 16,
                  color: 'var(--input-text)',
                  fontFamily: IOS_FONT,
                }}
              />
              {search && (
                <button
                  onClick={e => { e.stopPropagation(); setSearch('') }}
                  style={{ color: 'var(--input-icon)', lineHeight: 0, cursor: 'pointer', background: 'none', border: 'none', padding: 0 }}
                >
                  <svg viewBox="0 0 12 12" width={12} height={12} fill="currentColor">
                    <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" fill="none"/>
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* Rows - scrollable */}
          <div className="overflow-y-auto overflow-x-hidden flex-1" style={{ minHeight: 0 }}>
            {filteredRows.length === 0 ? (
              <div style={{ padding: '24px 18px', textAlign: 'center', fontSize: 16, color: 'var(--text-muted)' }}>
                No results for "{search}"
              </div>
            ) : (
              filteredRows.map((row, i) => (
                <Row
                  key={i}
                  rank={i + 1}
                  {...row}
                  accentColor={accentColor}
                  isSelected={row.stationId && row.stationId === selectedId}
                  isClickable={!!row.stationId && !!onStationClick}
                  onClick={() => handleRowClick(row)}
                />
              ))
            )}
          </div>
        </>
      )}
    </div>
  )
}

// ── Row component ─────────────────────────────────────────────────────────────

function Row({ rank, label, sub, value, value2, barPct, accentColor, labelColor, dot, badge, isSelected, isClickable, onClick }) {
  const [hovered, setHovered] = useState(false)

  // Use CSS vars for selection/hover; keep the bar gradient with the accent colour
  const bg = isSelected
    ? 'var(--row-selected)'
    : hovered && isClickable
      ? 'var(--row-hover)'
      : barPct > 0
        ? `linear-gradient(to right, ${accentColor}14 ${barPct}%, transparent ${barPct}%)`
        : 'transparent'

  return (
    <div
      className="relative flex items-center gap-2.5"
      style={{
        padding: '10px 18px',
        borderBottom: '0.5px solid var(--border-row)',
        background: bg,
        cursor: isClickable ? 'pointer' : 'default',
        transition: 'background 120ms ease',
        borderLeft: isSelected ? `3px solid ${accentColor}` : '3px solid transparent',
      }}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Rank */}
      <span
        className="tabular-nums text-right flex-shrink-0"
        style={{ fontSize: 14, color: 'var(--text-muted)', width: 20 }}
      >
        {rank}
      </span>

      {/* Line dot */}
      {dot && (
        <span
          className="flex-shrink-0"
          style={{ width: 9, height: 9, borderRadius: '50%', background: dot, display: 'inline-block' }}
        />
      )}

      {/* Name + sub */}
      <div className="flex-1 min-w-0">
        <div
          className="truncate"
          style={{
            fontSize: 17,
            fontWeight: 500,
            letterSpacing: '-0.01em',
            color: labelColor || 'var(--text-primary)',
            lineHeight: 1.3,
          }}
          title={typeof label === 'string' ? label : undefined}
        >
          {label}
        </div>
        {(sub || badge) && (
          <div className="flex items-center gap-1.5 mt-0.5">
            {badge && (
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  padding: '2px 7px',
                  borderRadius: 6,
                  lineHeight: 1.4,
                  color: badge.color,
                  background: badge.color + '22',
                  letterSpacing: '0.01em',
                }}
              >
                {badge.label}
              </span>
            )}
            {sub && (
              <span style={{ fontSize: 14, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {sub}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Value */}
      <div className="flex flex-col items-end flex-shrink-0">
        <span style={{ fontSize: 17, fontWeight: 600, letterSpacing: '-0.01em', color: 'var(--text-primary)' }} className="tabular-nums">
          {value}
        </span>
        {value2 && (
          <span style={{ fontSize: 14, color: 'var(--text-label)' }} className="tabular-nums">
            {value2}
          </span>
        )}
      </div>
    </div>
  )
}

// ── Config builders ───────────────────────────────────────────────────────────

// Haversine distance in metres between two [lon, lat] points
function haverDist([lon1, lat1], [lon2, lat2]) {
  const R = 6371000
  const dφ = (lat2 - lat1) * Math.PI / 180
  const dλ = (lon2 - lon1) * Math.PI / 180
  const φ1 = lat1 * Math.PI / 180
  const φ2 = lat2 * Math.PI / 180
  const a = Math.sin(dφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(dλ / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function buildConfig(activeLayer, mode, stations, weekday, weekend, odFlows, hour, odTopN, catchmentRadius = 500) {

  // ── Volume ──────────────────────────────────────────────────────────────────
  if (activeLayer === 'volume') {
    const sorted = stations
      .map(s => {
        const { entries, exits, total } = getRidershipAtHour(s, hour)
        const type  = stationType(s)
        const peak  = peakHour(s)
        return { id: s.properties.id, s, name: s.properties.name, line: s.properties.line, entries, exits, total, type, peak }
      })
      .sort((a, b) => b.total - a.total)
      .slice(0, 15)

    const max         = sorted[0]?.total || 1
    const top         = sorted[0]
    const totalSystem = sorted.reduce((sum, r) => sum + r.total, 0)
    const topShare    = totalSystem > 0 ? Math.round((top?.total / totalSystem) * 100) : 0

    const hourMood =
      hour >= 7  && hour <= 10 ? "Bengaluru's suburbs are draining into the centre. Whitefield, Banashankari, Yelahanka, all emptying in sync. This is what a 9 AM commuter tide looks like when you map it." :
      hour >= 17 && hour <= 20 ? "The city is running in reverse. Every person who flooded in this morning is now flowing back out. The CBD empties, the suburbs refill. Watch the direction flip." :
      hour >= 21 || hour <= 5  ? "Ghost hours. Bengaluru has gone home. Whatever is still on the network is a night-shift worker, an airport run, or someone who badly miscalculated the traffic." :
      hour >= 11 && hour <= 14 ? "The lunchtime plateau. Office workers are at their desks, not their seats. The network coasts at maybe 30% of peak capacity. This is what breathing room looks like on a transit system." :
                                 "The irregular crowd. Late starters, bank errands, doctor appointments, flex workers with no alarm. No commute wave here, just a city doing things at its own pace."

    return {
      title:       `Ridership · ${fmtHour(hour)}`,
      accentColor: '#ff8c00',
      insight:     top?.total > 0
        ? `${hourMood} ${top.name} is absorbing ${fmtN(top.total)} riders right now. That's ${topShare}% of the top-15 load concentrated at one stop.`
        : `Nothing moving at ${fmtHour(hour)}. The metro is basically a scheduled ghost train.`,
      rows: sorted.map(r => ({
        stationId: r.id,
        label:  r.name,
        dot:    LINE_COLOR[r.line?.toLowerCase()],
        badge:  r.type,
        sub:    r.peak !== null ? `peaks ${fmtHour(r.peak)}` : null,
        value:  fmtN(r.total),
        value2: `${fmtN(r.entries)}↑ ${fmtN(r.exits)}↓`,
        barPct: Math.round((r.total / max) * 68),
      })),
    }
  }

  // ── Entry / Exit ─────────────────────────────────────────────────────────────
  if (activeLayer === 'entryExit') {
    const sorted = stations
      .map(s => {
        const { entries, exits } = getRidershipAtHour(s, hour)
        const ratio = entries > 0 ? exits / entries : 1
        return { id: s.properties.id, name: s.properties.name, line: s.properties.line, entries, exits, ratio }
      })
      .filter(r => r.entries + r.exits > 10)
      .sort((a, b) => b.ratio - a.ratio)
      .slice(0, 15)

    const top    = sorted[0]
    const bottom = sorted[sorted.length - 1]
    const maxR   = sorted[0]?.ratio || 1

    return {
      title:       `Entry / Exit · ${fmtHour(hour)}`,
      accentColor: '#f87171',
      insight:     top && bottom
        ? `${top.name} has a ${top.ratio.toFixed(1)}x exit ratio, meaning far more people arriving than leaving. Not a transit stop, an office magnet. ${bottom.name} (${bottom.ratio.toFixed(2)}x) sits at the other end: a pure origin zone where residents leave in the morning and the station stays quiet until evening.`
        : `Not enough movement at ${fmtHour(hour)} yet to read the pattern.`,
      rows: sorted.map(r => ({
        stationId:  r.id,
        label:      r.name,
        dot:        LINE_COLOR[r.line?.toLowerCase()],
        value:      `${r.ratio.toFixed(2)}×`,
        value2:     `${fmtN(r.entries)}↑ ${fmtN(r.exits)}↓`,
        barPct:     Math.round((r.ratio / maxR) * 68),
        labelColor: r.ratio > 1.35 ? '#fca5a5' : r.ratio < 0.72 ? '#93c5fd' : undefined,
      })),
    }
  }

  // ── OD Flow ──────────────────────────────────────────────────────────────────
  if (activeLayer === 'odFlow') {
    const topN    = odTopN ?? 15
    const nameMap = {}
    for (const s of stations) nameMap[s.properties.id] = s.properties.name

    const flows     = odFlows.slice(0, topN)
    const max       = flows[0]?.volume || 1
    const total     = flows.reduce((s, f) => s + f.volume, 0)
    const top       = flows[0]
    const top3share = flows.length >= 3
      ? Math.round((flows.slice(0, 3).reduce((s, f) => s + f.volume, 0) / total) * 100)
      : 100

    return {
      title:       `Top ${topN} flows`,
      accentColor: '#fde047',
      insight:     top
        ? `${shorten(nameMap[top.from])} to ${shorten(nameMap[top.to])} is the single busiest route: ${fmtN(top.volume)} trips. Think of it as a packed bus that runs all day. The top 3 routes between them handle ${top3share}% of everything shown here. Every other route on this map moves significantly fewer people.`
        : 'No flow data.',
      rows: flows.map((f, i) => ({
        label:      `${shorten(nameMap[f.from] || f.from)} → ${shorten(nameMap[f.to] || f.to)}`,
        value:      fmtN(f.volume),
        barPct:     Math.round((f.volume / max) * 68),
        labelColor: i < 3 ? '#fde047' : undefined,
      })),
    }
  }

  // ── Weekday / Weekend ────────────────────────────────────────────────────────
  if (activeLayer === 'weekdayWeekend') {

    if (mode === 'delta') {
      const sorted = stations
        .map(s => {
          const wd    = getDailyRidership(weekday, s.properties.id)
          const we    = getDailyRidership(weekend, s.properties.id)
          const delta = wd.total - we.total
          return { id: s.properties.id, name: s.properties.name, wd: wd.total, we: we.total, delta }
        })
        .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
        .slice(0, 15)

      const top      = sorted[0]
      const maxAbs   = Math.abs(sorted[0]?.delta) || 1
      const commuter = sorted.filter(r => r.delta > 0).length

      return {
        title:       'Weekday vs Weekend Δ',
        accentColor: '#60a5fa',
        insight:     top
          ? `Commuter stations that roar on Monday go completely silent on Saturday. Strip away the office gravity and what's left looks like a ghost network. ${top.name} has the starkest split: a ${top.delta > 0 ? '+' : ''}${fmtN(top.delta)}-rider weekly gap that maps almost exactly where Bengaluru goes to clock in.`
          : '',
        rows: sorted.map(r => ({
          stationId:  r.id,
          label:      r.name,
          value:      (r.delta > 0 ? '+' : '') + fmtN(r.delta),
          value2:     `${fmtN(r.wd)} wk · ${fmtN(r.we)} wknd`,
          barPct:     Math.round((Math.abs(r.delta) / maxAbs) * 68),
          labelColor: r.delta > 0 ? '#93c5fd' : '#d8b4fe',
        })),
      }
    }

    if (mode === 'compare') {
      const sorted = stations
        .map(s => {
          const wd = getDailyRidership(weekday, s.properties.id)
          const we = getDailyRidership(weekend, s.properties.id)
          return { id: s.properties.id, name: s.properties.name, wd: wd.total, we: we.total }
        })
        .sort((a, b) => b.wd - a.wd)
        .slice(0, 15)

      const max      = sorted[0]?.wd || 1
      const top      = sorted[0]
      const shrinkBy = top ? Math.round((1 - top.we / top.wd) * 100) : 0

      return {
        title:       'Weekday vs Weekend',
        accentColor: '#60a5fa',
        insight:     top
          ? `${top.name} drops ${shrinkBy}% the moment Friday ends. Not a metro hub, a corporate shuttle stop that happens to have a BMRCL logo. The weekend crowd went to MG Road. Saturday's riders are mostly catching onward autos.`
          : '',
        rows: sorted.map(r => ({
          stationId: r.id,
          label:  r.name,
          value:  fmtN(r.wd),
          value2: `${fmtN(r.we)} wknd`,
          barPct: Math.round((r.wd / max) * 68),
        })),
      }
    }

    // Single mode (weekday or weekend)
    const isWeekday = mode !== 'weekend'
    const modeData  = isWeekday ? weekday : weekend
    const sorted = stations
      .map(s => {
        const dot   = LINE_COLOR[s.properties.line?.toLowerCase()]
        const type  = stationType(s)
        const { total } = getDailyRidership(modeData, s.properties.id)
        return { id: s.properties.id, name: s.properties.name, dot, total, type }
      })
      .sort((a, b) => b.total - a.total)
      .slice(0, 15)

    const max  = sorted[0]?.total || 1
    const top  = sorted[0]
    const hubs = sorted.filter(r => r.type?.label === 'Job Hub').length

    return {
      title:       isWeekday ? 'Top weekday stations' : 'Top weekend stations',
      accentColor: isWeekday ? '#3b82f6' : '#a855f7',
      insight:     top
        ? isWeekday
          ? hubs > 0
            ? `${hubs} of the top 15 stations are job-destination hubs — the network is an office-delivery system. ${top.name} leads at ${fmtN(top.total)} daily riders.`
            : `${top.name} leads at ${fmtN(top.total)} daily riders. The top stations are mostly interchange hubs where people transfer between lines, not single employment destinations. The network is a connector, not a commuter funnel.`
          : `The weekend rankings show a different city entirely. ${top.name} leads at ${fmtN(top.total)}, but watch which stations climb the list. Leisure geography has replaced commuter geography. Bengaluru on Saturday means brunch, shopping, and an inexplicable trip to Lulu Mall.`
        : '',
      rows: sorted.map(r => ({
        stationId: r.id,
        label:  r.name,
        dot:    r.dot,
        badge:  r.type,
        value:  fmtN(r.total),
        barPct: Math.round((r.total / max) * 68),
      })),
    }
  }

  // ── Coverage Gap ─────────────────────────────────────────────────────────────
  if (activeLayer === 'coverageGap') {
    const sorted = stations
      .map(s => {
        const dot  = LINE_COLOR[s.properties.line?.toLowerCase()]
        const { total } = getDailyRidership(weekday, s.properties.id)
        return { id: s.properties.id, name: s.properties.name, dot, total, coords: s.geometry.coordinates }
      })
      .sort((a, b) => a.total - b.total)
      .slice(0, 15)

    // Count station pairs whose catchment circles overlap (dist < 2 * radius)
    const allCoords = stations.map(s => s.geometry.coordinates)
    let overlappingPairs = 0
    for (let i = 0; i < allCoords.length; i++) {
      for (let j = i + 1; j < allCoords.length; j++) {
        if (haverDist(allCoords[i], allCoords[j]) < 2 * catchmentRadius) overlappingPairs++
      }
    }

    // Rough coverage area (naive circles, no dedup — gives a feel for scale)
    const coverageKm2 = Math.round(stations.length * Math.PI * (catchmentRadius / 1000) ** 2)

    const mood =
      catchmentRadius <= 250 ? "Three minutes on foot. You'd need the station in your backyard, and knowing Bengaluru traffic, you'd still be late." :
      catchmentRadius <= 350 ? "Fit-commuter territory. Fast walkers with good shoes and no groceries. Half the city simply does not operate at this pace." :
      catchmentRadius <= 450 ? "Just under the planning standard. Technically walkable. Practically, most people are already eyeing the nearest auto." :
      catchmentRadius <= 550 ? "The 500m planning benchmark, roughly 6 minutes at a normal pace. The number every transit planner defends and every Bengalurean quietly ignores." :
      catchmentRadius <= 700 ? "Getting generous. Most of the neighbourhood technically qualifies. Some of these people are definitely taking an auto and just saying they walked." :
      catchmentRadius <= 850 ? "Auto-rickshaw range now counts as walkable. Bengaluru rewrites the definition of accessibility one trip at a time." :
                               "A full kilometre. Half the city calls this nearby. The other half calls an Ola. Both end up at the same station."

    const bottom = sorted[0]

    return {
      title:       'Least-served stations',
      accentColor: '#34d399',
      insight:     bottom
        ? `${mood} At ${catchmentRadius}m, ${overlappingPairs} station pairs share catchment. Rings cover roughly ${coverageKm2} km², tightly overlapping in the core and thinning out fast where the network has not reached yet.`
        : '',
      rows: sorted.map(r => ({
        stationId:  r.id,
        label:      r.name,
        dot:        r.dot,
        value:      fmtN(r.total),
        sub:        r.total < 1000 ? 'low ridership' : null,
        barPct:     0,
        labelColor: r.total < 1000 ? 'rgba(52,211,153,0.75)' : undefined,
      })),
    }
  }

  return null
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtN(n) {
  if (n === null || n === undefined) return '-'
  const abs = Math.abs(n)
  const sign = n < 0 ? '-' : ''
  if (abs >= 1000) return `${sign}${(abs / 1000).toFixed(1)}k`
  return String(n)
}

function fmtHour(h) {
  if (h === 0)  return '12 AM'
  if (h < 12)   return `${h} AM`
  if (h === 12) return '12 PM'
  return `${h - 12} PM`
}

function shorten(name) {
  if (!name) return '-'
  if (name.length <= 13) return name
  const parts = name.split(' ')
  if (parts.length > 1) {
    const abbrev = parts.map((p, i) => i < parts.length - 1 ? p[0] + '.' : p).join(' ')
    if (abbrev.length <= 15) return abbrev
  }
  return name.slice(0, 12) + '…'
}

function capitalize(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : ''
}
