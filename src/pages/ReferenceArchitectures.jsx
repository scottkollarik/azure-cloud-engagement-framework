import { useState, useMemo } from 'react'
import refArchData from '../data/reference-architectures.json'
import overlaysData from '../data/compliance-overlays.json'
import pillarsData from '../data/waf-pillars.json'

// ─── Static lookup maps ───────────────────────────────────────────────────────

const PILLAR_META = Object.fromEntries(pillarsData.map(p => [p.id, p]))
const OVERLAY_META = Object.fromEntries(overlaysData.map(o => [o.id, o]))

const TIER_LABEL = { land: 'Land', scale: 'Scale', govern: 'Govern' }
const TIER_COLOR = {
  land:   'text-tier-land   border-tier-land/50',
  scale:  'text-tier-scale  border-tier-scale/50',
  govern: 'text-tier-govern border-tier-govern/50',
}
const TIER_BG = {
  land:   'bg-tier-land/10',
  scale:  'bg-tier-scale/10',
  govern: 'bg-tier-govern/10',
}

const ALL_OVERLAY_IDS = [
  ...new Set(refArchData.flatMap(a => a.complianceRelevance ?? [])),
]

// ─── Sub-components ───────────────────────────────────────────────────────────

function ChevronIcon({ open }) {
  return (
    <svg
      className={`w-4 h-4 text-text-secondary transition-transform duration-150 shrink-0 ${open ? 'rotate-180' : ''}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="square" d="M6 9l6 6 6-6" />
    </svg>
  )
}

function ExternalLinkIcon() {
  return (
    <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="square" d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6m0 0v6m0-6L10 14" />
    </svg>
  )
}

function TierBadge({ tier }) {
  return (
    <span className={`pillar-badge text-2xs ${TIER_COLOR[tier] ?? ''}`}>
      {TIER_LABEL[tier] ?? tier}
    </span>
  )
}

function PillarBadge({ id, dim }) {
  const p = PILLAR_META[id]
  if (!p) return null
  return (
    <span
      className={`pillar-badge text-2xs transition-opacity ${dim ? 'opacity-40' : ''}`}
      style={{ color: p.color, borderColor: `${p.color}50` }}
    >
      {p.label}
    </span>
  )
}

function ServiceChip({ label }) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 border border-border bg-canvas text-2xs font-mono text-text-mono">
      {label}
    </span>
  )
}

function FilterButton({ label, active, color, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`pillar-badge text-2xs transition-colors cursor-pointer ${active ? 'opacity-100' : 'opacity-40 hover:opacity-70'}`}
      style={
        active
          ? { color, borderColor: `${color}60`, backgroundColor: `${color}18` }
          : { color, borderColor: `${color}40` }
      }
    >
      {label}
    </button>
  )
}

function TierFilterButton({ tier, active, onClick }) {
  const colorClass = active
    ? `${TIER_COLOR[tier]} ${TIER_BG[tier]}`
    : 'text-text-secondary border-border opacity-50 hover:opacity-70'
  return (
    <button
      onClick={onClick}
      className={`pillar-badge text-2xs transition-colors cursor-pointer ${colorClass}`}
    >
      {TIER_LABEL[tier]}
    </button>
  )
}

// ─── Layer grid (the "B" part of B+C) ────────────────────────────────────────

function LayerGrid({ layers }) {
  return (
    <div className="space-y-3">
      {layers.map((layer, i) => (
        <div key={i} className="border border-border/60 bg-canvas">
          {/* Layer header */}
          <div className="px-4 py-2 border-b border-border/60 bg-surface/60">
            <p className="text-xs font-semibold font-display text-text-primary">
              {layer.name}
            </p>
            <p className="text-2xs text-text-secondary font-body leading-relaxed mt-0.5">
              {layer.role}
            </p>
          </div>
          {/* Services */}
          <div className="px-4 py-3">
            <div className="flex flex-wrap gap-1.5">
              {layer.services.map(svc => (
                <ServiceChip key={svc} label={svc} />
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Expanded architecture detail ────────────────────────────────────────────

function ArchDetail({ arch }) {
  const overlayEntries = (arch.complianceRelevance ?? []).map(id => ({
    id,
    meta: OVERLAY_META[id],
  }))

  return (
    <div className="border-t border-border bg-canvas/60 px-5 pb-6 pt-5 space-y-6">

      {/* When to use */}
      {arch.whenToUse?.length > 0 && (
        <div>
          <p className="text-2xs font-semibold tracking-widest uppercase text-text-secondary font-display mb-2">
            When to Use
          </p>
          <ul className="space-y-1.5">
            {arch.whenToUse.map((point, i) => (
              <li key={i} className="flex gap-2 text-sm">
                <span className="text-accent shrink-0">›</span>
                <span className="text-text-secondary font-body leading-relaxed">{point}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Component layers */}
      {arch.layers?.length > 0 && (
        <div>
          <p className="text-2xs font-semibold tracking-widest uppercase text-text-secondary font-display mb-3">
            Component Layers
          </p>
          <LayerGrid layers={arch.layers} />
        </div>
      )}

      {/* Key design decisions */}
      {arch.keyDesignDecisions?.length > 0 && (
        <div>
          <p className="text-2xs font-semibold tracking-widest uppercase text-text-secondary font-display mb-2">
            Key Design Decisions
          </p>
          <ul className="space-y-2">
            {arch.keyDesignDecisions.map((decision, i) => (
              <li key={i} className="flex gap-3 text-sm">
                <span className="font-mono text-text-secondary/50 shrink-0 pt-px select-none">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className="text-text-secondary font-body leading-relaxed">
                  {decision}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Secondary pillars */}
      {arch.wafSecondary?.length > 0 && (
        <div>
          <p className="text-2xs font-semibold tracking-widest uppercase text-text-secondary font-display mb-2">
            Secondary WAF Pillars
          </p>
          <div className="flex flex-wrap gap-1.5">
            {arch.wafSecondary.map(pid => (
              <PillarBadge key={pid} id={pid} />
            ))}
          </div>
        </div>
      )}

      {/* Compliance relevance */}
      {overlayEntries.length > 0 && (
        <div>
          <p className="text-2xs font-semibold tracking-widest uppercase text-text-secondary font-display mb-2">
            Compliance Relevance
          </p>
          <div className="flex flex-wrap gap-1.5">
            {overlayEntries.map(({ id, meta }) => (
              <span
                key={id}
                className="pillar-badge text-2xs"
                style={
                  meta
                    ? { color: meta.color, borderColor: `${meta.color}50` }
                    : { color: '#94a3b8', borderColor: '#1e2d40' }
                }
              >
                {meta?.shortName ?? id}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Architecture Center link */}
      {arch.architectureCenterUrl && (
        <div className="pt-2 border-t border-border/60">
          <a
            href={arch.architectureCenterUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 border border-accent/60 bg-accent/15 text-accent text-xs font-semibold font-display tracking-wide hover:bg-accent/25 hover:border-accent transition-colors"
          >
            View on Azure Architecture Center
            <ExternalLinkIcon />
          </a>
          <p className="text-2xs text-text-secondary/50 font-mono mt-2">
            Official Microsoft documentation and reference diagram
          </p>
        </div>
      )}
    </div>
  )
}

// ─── Architecture card with accordion ────────────────────────────────────────

function ArchCard({ arch, expanded, onToggle }) {
  const primaryMeta = PILLAR_META[arch.wafPrimary]

  return (
    <div
      className={`border bg-surface transition-colors ${
        expanded ? 'border-accent/40' : 'border-border hover:border-border/80'
      }`}
    >
      <button onClick={onToggle} className="w-full text-left px-5 py-4">
        <div className="flex items-start gap-3">
          {/* Left accent bar keyed to primary WAF pillar */}
          <div
            className="w-0.5 self-stretch shrink-0 mt-0.5"
            style={{ backgroundColor: primaryMeta?.color ?? '#1e2d40' }}
          />

          <div className="flex-1 min-w-0">
            {/* Title */}
            <div className="flex items-start justify-between gap-2 mb-1">
              <span
                className={`font-display text-sm font-semibold leading-snug ${
                  expanded ? 'text-accent' : 'text-text-primary'
                } transition-colors`}
              >
                {arch.title}
              </span>
            </div>

            {/* Subtitle */}
            {arch.subtitle && (
              <p className="text-2xs text-text-secondary font-body mb-2 leading-relaxed">
                {arch.subtitle}
              </p>
            )}

            {/* Badges */}
            <div className="flex flex-wrap gap-1.5 mb-2">
              {(arch.tiers ?? []).map(tier => (
                <TierBadge key={tier} tier={tier} />
              ))}
              {arch.wafPrimary && (
                <PillarBadge id={arch.wafPrimary} />
              )}
            </div>

            {/* Summary (collapsed) */}
            {!expanded && (
              <p className="text-xs text-text-secondary font-body leading-relaxed">
                {arch.summary}
              </p>
            )}
          </div>

          <ChevronIcon open={expanded} />
        </div>
      </button>

      {/* Expanded detail */}
      {expanded && (
        <>
          {/* Summary visible in expanded state at top */}
          <div className="px-5 pb-4 border-t border-border/30 pt-4">
            <p className="text-sm text-text-secondary font-body leading-relaxed">
              {arch.summary}
            </p>
          </div>
          <ArchDetail arch={arch} />
        </>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ReferenceArchitectures() {
  const [expandedId, setExpandedId] = useState(null)
  const [activePillars, setActivePillars] = useState(new Set())
  const [activeTiers, setActiveTiers] = useState(new Set())
  const [activeOverlays, setActiveOverlays] = useState(new Set())

  const toggleSet = (setter, value) => {
    setter(prev => {
      const next = new Set(prev)
      if (next.has(value)) next.delete(value)
      else next.add(value)
      return next
    })
  }

  const clearAll = () => {
    setActivePillars(new Set())
    setActiveTiers(new Set())
    setActiveOverlays(new Set())
  }

  const filtered = useMemo(() => {
    return refArchData.filter(arch => {
      const pillarMatch =
        activePillars.size === 0 ||
        activePillars.has(arch.wafPrimary) ||
        (arch.wafSecondary ?? []).some(p => activePillars.has(p))

      const tierMatch =
        activeTiers.size === 0 ||
        (arch.tiers ?? []).some(t => activeTiers.has(t))

      const overlayMatch =
        activeOverlays.size === 0 ||
        (arch.complianceRelevance ?? []).some(o => activeOverlays.has(o))

      return pillarMatch && tierMatch && overlayMatch
    })
  }, [activePillars, activeTiers, activeOverlays])

  const hasActiveFilters =
    activePillars.size > 0 || activeTiers.size > 0 || activeOverlays.size > 0

  return (
    <div className="max-w-5xl mx-auto px-8 py-12">

      {/* ── Page header ── */}
      <div className="mb-10">
        <p className="text-2xs font-semibold tracking-widest uppercase text-text-secondary font-display mb-1">
          Architecture Catalog
        </p>
        <h1 className="font-display text-3xl font-bold text-text-primary mb-3">
          Reference Architectures
        </h1>
        <p className="text-text-secondary font-body text-sm leading-relaxed max-w-2xl">
          Structured component layer breakdowns for the most common Azure workload patterns.
          Each entry shows the layers, key services, and critical design decisions for a real engagement scenario.
          Links to the official Azure Architecture Center provide authoritative diagrams.
        </p>
      </div>

      {/* ── Filter bar ── */}
      <div className="card px-4 py-4 mb-6 space-y-3">

        <div>
          <p className="text-2xs font-semibold tracking-widest uppercase text-text-secondary font-display mb-2">
            WAF Pillar
          </p>
          <div className="flex flex-wrap gap-1.5">
            {pillarsData.map(p => (
              <FilterButton
                key={p.id}
                label={p.label}
                active={activePillars.has(p.id)}
                color={p.color}
                onClick={() => toggleSet(setActivePillars, p.id)}
              />
            ))}
          </div>
        </div>

        <div>
          <p className="text-2xs font-semibold tracking-widest uppercase text-text-secondary font-display mb-2">
            Engagement Tier
          </p>
          <div className="flex flex-wrap gap-1.5">
            {['land', 'scale', 'govern'].map(tier => (
              <TierFilterButton
                key={tier}
                tier={tier}
                active={activeTiers.has(tier)}
                onClick={() => toggleSet(setActiveTiers, tier)}
              />
            ))}
          </div>
        </div>

        {ALL_OVERLAY_IDS.length > 0 && (
          <div>
            <p className="text-2xs font-semibold tracking-widest uppercase text-text-secondary font-display mb-2">
              Compliance Overlay
            </p>
            <div className="flex flex-wrap gap-1.5">
              {ALL_OVERLAY_IDS.map(id => {
                const meta = OVERLAY_META[id]
                return (
                  <FilterButton
                    key={id}
                    label={meta?.shortName ?? id}
                    active={activeOverlays.has(id)}
                    color={meta?.color ?? '#94a3b8'}
                    onClick={() => toggleSet(setActiveOverlays, id)}
                  />
                )
              })}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between pt-1 border-t border-border/60">
          <p className="text-2xs font-mono text-text-secondary">
            <span className="text-text-primary font-semibold">{filtered.length}</span>
            {' '}of{' '}
            <span>{refArchData.length}</span>
            {' '}architectures
          </p>
          {hasActiveFilters && (
            <button
              onClick={clearAll}
              className="text-2xs font-mono text-text-secondary hover:text-text-primary transition-colors"
            >
              Clear filters ×
            </button>
          )}
        </div>
      </div>

      {/* ── Architecture list ── */}
      {filtered.length === 0 ? (
        <div className="border border-border bg-surface px-8 py-12 text-center">
          <p className="text-text-secondary font-body text-sm">
            No architectures match the active filters.
          </p>
          <button
            onClick={clearAll}
            className="mt-3 text-xs font-mono text-accent hover:underline"
          >
            Clear all filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-start">
          {filtered.map(arch => (
            <ArchCard
              key={arch.id}
              arch={arch}
              expanded={expandedId === arch.id}
              onToggle={() => setExpandedId(prev => prev === arch.id ? null : arch.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
