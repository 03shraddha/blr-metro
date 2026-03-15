import { useTheme } from '../context/ThemeContext'

const LAYERS = [
  { id: 'volume',         label: 'Where people move',      sub: 'Hourly ridership by station' },
  { id: 'entryExit',      label: 'Job hubs vs home zones',  sub: 'Entry vs exit ratio per station' },
  { id: 'odFlow',         label: 'Passenger flows',         sub: 'Top origin-destination pairs' },
  { id: 'weekdayWeekend', label: 'Weekday vs weekend',      sub: 'How Saturday differs from Monday' },
  { id: 'coverageGap',    label: 'Coverage gaps',           sub: 'Who lives outside 500m access' },
]

const IOS_FONT = "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', Arial, sans-serif"

export default function LayerTabs({ activeLayer, setActiveLayer }) {
  const { theme, toggleTheme } = useTheme()

  return (
    <div
      className="absolute top-4 left-4 z-10 rounded-2xl overflow-hidden"
      style={{
        backdropFilter: 'blur(28px) saturate(1.6)',
        WebkitBackdropFilter: 'blur(28px) saturate(1.6)',
        background: 'var(--panel-bg)',
        boxShadow: 'var(--panel-shadow-sm)',
        fontFamily: IOS_FONT,
        minWidth: 240,
      }}
    >
      {LAYERS.map(({ id, label, sub }, idx) => (
        <button
          key={id}
          onClick={() => setActiveLayer(id)}
          className="relative w-full text-left transition-all duration-150 cursor-pointer flex items-center gap-3"
          style={{
            padding: '13px 20px',
            borderTop: idx > 0 ? `0.5px solid var(--tab-divider)` : 'none',
            background: activeLayer === id ? 'var(--tab-active-bg)' : 'transparent',
            outline: 'none',
            border: 'none',
          }}
        >
          {activeLayer === id && (
            <div
              className="absolute left-0 top-2.5 bottom-2.5 rounded-full"
              style={{ width: 3, background: 'var(--tab-active-bar)' }}
            />
          )}
          <div>
            <span
              style={{
                fontSize: 17,
                fontWeight: activeLayer === id ? 600 : 400,
                letterSpacing: '-0.01em',
                color: activeLayer === id ? 'var(--tab-active-text)' : 'var(--tab-inactive-text)',
                display: 'block',
                transition: 'color 150ms ease',
              }}
            >
              {label}
            </span>
            <span
              style={{
                fontSize: 13,
                color: activeLayer === id ? 'var(--text-muted)' : 'var(--text-micro)',
                display: 'block',
                marginTop: 1,
                transition: 'color 150ms ease',
              }}
            >
              {sub}
            </span>
          </div>
        </button>
      ))}

      {/* Theme toggle */}
      <button
        onClick={toggleTheme}
        className="w-full flex items-center gap-3 cursor-pointer transition-all duration-150"
        style={{
          padding: '11px 20px',
          borderTop: `0.5px solid var(--tab-divider)`,
          background: 'transparent',
          outline: 'none',
          border: 'none',
        }}
      >
        <span style={{ fontSize: 14, lineHeight: 1 }}>{theme === 'dark' ? '☀' : '☾'}</span>
        <span style={{ fontSize: 17, color: 'var(--text-muted)', letterSpacing: '-0.01em' }}>
          {theme === 'dark' ? 'Light mode' : 'Dark mode'}
        </span>
      </button>
    </div>
  )
}
