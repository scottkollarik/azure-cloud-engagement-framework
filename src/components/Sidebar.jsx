import { NavLink } from 'react-router-dom'

const NAV = [
  {
    label: 'Framework',
    items: [
      { to: '/',                  label: 'Overview',         abbr: 'OV' },
      { to: '/engagement-tiers',  label: 'Engagement Tiers', abbr: 'ET' },
      { to: '/framework',         label: '7-Step Framework', abbr: 'FW' },
    ],
  },
  {
    label: 'Reference',
    items: [
      { to: '/patterns',                label: 'Patterns Library',        abbr: 'PL' },
      { to: '/reference-architectures', label: 'Reference Architectures', abbr: 'RA' },
      { to: '/ai-workloads',            label: 'AI Workloads',            abbr: 'AI' },
      { to: '/tradeoffs',               label: 'Tradeoffs',               abbr: 'TR' },
      { to: '/troubleshooting',         label: 'Troubleshooting',         abbr: 'TS' },
      { to: '/iac',                     label: 'IaC Reference',           abbr: 'IC' },
    ],
  },
  {
    label: 'Tools',
    items: [
      { to: '/calculator', label: 'Cost Calculator', abbr: 'CC' },
      { to: '/adr',        label: 'ADR Generator',   abbr: 'AD' },
      { to: '/timeline',   label: 'Timeline',         abbr: 'TL' },
    ],
  },
]

const PILLAR_COLORS = {
  'Reliability':            'text-waf-reliability  border-waf-reliability/30',
  'Security':               'text-waf-security     border-waf-security/30',
  'Cost Optimization':      'text-waf-cost         border-waf-cost/30',
  'Operational Excellence': 'text-waf-operations   border-waf-operations/30',
  'Performance Efficiency': 'text-waf-performance  border-waf-performance/30',
}

function HamburgerIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <line x1="2" y1="4"  x2="14" y2="4"  strokeLinecap="square" />
      <line x1="2" y1="8"  x2="14" y2="8"  strokeLinecap="square" />
      <line x1="2" y1="12" x2="14" y2="12" strokeLinecap="square" />
    </svg>
  )
}

export default function Sidebar({ open, onToggle }) {
  return (
    <aside
      className={`fixed top-0 left-0 h-full z-30 flex flex-col border-r border-border bg-surface transition-all duration-150 ${
        open ? 'w-64' : 'w-12'
      }`}
    >
      {/* Header */}
      <div className="flex items-center h-14 px-3 border-b border-border shrink-0 gap-2">
        <button
          onClick={onToggle}
          className="p-1.5 text-text-secondary hover:text-text-primary hover:bg-border/50 rounded transition-colors shrink-0"
          aria-label={open ? 'Collapse sidebar' : 'Expand sidebar'}
        >
          <HamburgerIcon />
        </button>
        {open && (
          <div className="flex items-center gap-2 overflow-hidden">
            <AzureIcon />
            <span className="font-display font-semibold text-sm text-text-primary whitespace-nowrap tracking-tight">
              Cloud Framework
            </span>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-2">
        {open ? (
          NAV.map(group => (
            <div key={group.label} className="mb-6">
              <p className="px-2 mb-1 text-2xs font-semibold tracking-widest uppercase text-text-secondary font-display">
                {group.label}
              </p>
              {group.items.map(item => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  className={({ isActive }) =>
                    `flex items-center gap-2 px-2 py-1.5 text-sm rounded transition-colors font-body ${
                      isActive
                        ? 'text-accent bg-accent/10 border-l-2 border-accent pl-[6px]'
                        : 'text-text-secondary hover:text-text-primary hover:bg-border/40'
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </div>
          ))
        ) : (
          /* Collapsed — 2-letter abbreviations, stays navigable */
          <div className="flex flex-col items-center gap-1 pt-1">
            {NAV.flatMap(g => g.items).map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                title={item.label}
                className={({ isActive }) =>
                  `w-8 h-7 flex items-center justify-center rounded transition-colors font-mono text-2xs font-semibold tracking-wider ${
                    isActive
                      ? 'bg-accent/20 text-accent'
                      : 'text-text-secondary hover:text-text-primary hover:bg-border/40'
                  }`
                }
              >
                {item.abbr}
              </NavLink>
            ))}
          </div>
        )}
      </nav>

      {/* Footer — WAF pillar legend (expanded only) */}
      {open && (
        <div className="px-3 pb-4 border-t border-border pt-3 shrink-0">
          <p className="text-2xs font-semibold tracking-widest uppercase text-text-secondary font-display mb-2">
            WAF Pillars
          </p>
          <div className="flex flex-col gap-1">
            {Object.entries(PILLAR_COLORS).map(([name, cls]) => (
              <span key={name} className={`pillar-badge w-fit ${cls}`}>
                {name}
              </span>
            ))}
          </div>
        </div>
      )}
    </aside>
  )
}

function AzureIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path
        d="M13.05 4.24L6.56 18.05 2 18l4.09-6.65L13.05 4.24zM13.84 5.67l5.67 12.07L4.69 20l9.15-14.33z"
        fill="#2563eb"
      />
    </svg>
  )
}
