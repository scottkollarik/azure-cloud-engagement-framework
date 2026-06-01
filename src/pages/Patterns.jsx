import { useState, useMemo } from 'react'
import patternsData from '../data/patterns.json'
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

// Collect every overlay id that appears in any pattern
const ALL_OVERLAY_IDS = [...new Set(patternsData.flatMap(p => p.complianceRelevance ?? []))]

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

function PillarBadge({ id }) {
  const p = PILLAR_META[id]
  if (!p) return null
  return (
    <span
      className="pillar-badge text-2xs"
      style={{ color: p.color, borderColor: `${p.color}50` }}
    >
      {p.label}
    </span>
  )
}

function TierBadge({ tier }) {
  return (
    <span className={`pillar-badge text-2xs ${TIER_COLOR[tier] ?? ''}`}>
      {TIER_LABEL[tier] ?? tier}
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
      className={`pillar-badge text-2xs transition-colors cursor-pointer ${
        active
          ? 'opacity-100'
          : 'opacity-40 hover:opacity-70'
      }`}
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
    : `text-text-secondary border-border opacity-50 hover:opacity-70`
  return (
    <button
      onClick={onClick}
      className={`pillar-badge text-2xs transition-colors cursor-pointer ${colorClass}`}
    >
      {TIER_LABEL[tier]}
    </button>
  )
}

// ─── Expanded pattern detail ──────────────────────────────────────────────────

function PatternDetail({ pattern }) {
  const overlayEntries = (pattern.complianceRelevance ?? []).map(id => ({
    id,
    meta: OVERLAY_META[id],
  }))

  return (
    <div className="border-t border-border bg-canvas/60 px-5 pb-6 pt-5 space-y-6">

      {/* When to use */}
      {pattern.whenToUse && (
        <div>
          <p className="text-2xs font-semibold tracking-widest uppercase text-text-secondary font-display mb-2">
            When to Use
          </p>
          <p className="text-sm text-text-secondary font-body leading-relaxed">
            {pattern.whenToUse}
          </p>
        </div>
      )}

      {/* Key design decisions */}
      {pattern.keyDesignDecisions?.length > 0 && (
        <div>
          <p className="text-2xs font-semibold tracking-widest uppercase text-text-secondary font-display mb-2">
            Key Design Decisions
          </p>
          <ul className="space-y-2">
            {pattern.keyDesignDecisions.map((decision, i) => (
              <li key={i} className="flex gap-3 text-sm">
                <span className="font-mono text-text-secondary/50 shrink-0 pt-px select-none">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className="text-text-secondary font-body leading-relaxed">{decision}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Tiers */}
      <div>
        <p className="text-2xs font-semibold tracking-widest uppercase text-text-secondary font-display mb-2">
          Applicable Tiers
        </p>
        <div className="flex gap-2 flex-wrap">
          {(pattern.tiers ?? []).map(tier => (
            <TierBadge key={tier} tier={tier} />
          ))}
        </div>
      </div>

      {/* Azure services */}
      {pattern.azureServices?.length > 0 && (
        <div>
          <p className="text-2xs font-semibold tracking-widest uppercase text-text-secondary font-display mb-2">
            Azure Services
          </p>
          <div className="flex flex-wrap gap-1.5">
            {pattern.azureServices.map(svc => (
              <ServiceChip key={svc} label={svc} />
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

      {/* Tags */}
      {pattern.tags?.length > 0 && (
        <div>
          <p className="text-2xs font-semibold tracking-widest uppercase text-text-secondary font-display mb-2">
            Tags
          </p>
          <div className="flex flex-wrap gap-1.5">
            {pattern.tags.map(tag => (
              <span key={tag} className="pillar-badge text-2xs text-text-secondary border-border">
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Pattern card with inline accordion ──────────────────────────────────────

function PatternCard({ pattern, expanded, onToggle }) {
  const primaryPillar = pattern.wafPillars?.[0]
  const primaryPillarMeta = PILLAR_META[primaryPillar]

  return (
    <div
      className={`border bg-surface transition-colors ${
        expanded ? 'border-accent/40' : 'border-border hover:border-border/80'
      }`}
    >
      {/* Card header / click target */}
      <button
        onClick={onToggle}
        className="w-full text-left px-5 py-4"
      >
        <div className="flex items-start gap-3">
          {/* Left accent bar keyed to primary pillar */}
          <div
            className="w-0.5 self-stretch shrink-0 mt-0.5"
            style={{ backgroundColor: primaryPillarMeta?.color ?? '#1e2d40' }}
          />

          <div className="flex-1 min-w-0">
            {/* Title row */}
            <div className="flex items-center gap-2 flex-wrap mb-1.5">
              <span className={`font-display text-sm font-semibold ${expanded ? 'text-accent' : 'text-text-primary'} transition-colors`}>
                {pattern.title}
              </span>
            </div>

            {/* Badge row */}
            <div className="flex flex-wrap gap-1.5 mb-2">
              {(pattern.tiers ?? []).map(tier => (
                <TierBadge key={tier} tier={tier} />
              ))}
              {(pattern.wafPillars ?? []).map(pid => (
                <PillarBadge key={pid} id={pid} />
              ))}
            </div>

            {/* Summary */}
            <p className="text-xs text-text-secondary font-body leading-relaxed">
              {pattern.summary}
            </p>

            {/* Service chips (top 3 shown in collapsed state) */}
            {!expanded && pattern.azureServices?.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {pattern.azureServices.slice(0, 3).map(svc => (
                  <ServiceChip key={svc} label={svc} />
                ))}
                {pattern.azureServices.length > 3 && (
                  <span className="inline-flex items-center px-2 py-0.5 text-2xs font-mono text-text-secondary/60">
                    +{pattern.azureServices.length - 3} more
                  </span>
                )}
              </div>
            )}
          </div>

          <ChevronIcon open={expanded} />
        </div>
      </button>

      {/* Expanded detail */}
      {expanded && <PatternDetail pattern={pattern} />}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Patterns() {
  const [expandedId, setExpandedId] = useState(null)
  const [activePillars, setActivePillars] = useState(new Set())
  const [activeTiers, setActiveTiers] = useState(new Set())
  const [activeOverlays, setActiveOverlays] = useState(new Set())

  const toggleSet = (setter, value) => {
    setter(prev => {
      const next = new Set(prev)
      if (next.has(value)) {
        next.delete(value)
      } else {
        next.add(value)
      }
      return next
    })
  }

  const clearAll = () => {
    setActivePillars(new Set())
    setActiveTiers(new Set())
    setActiveOverlays(new Set())
  }

  const filtered = useMemo(() => {
    return patternsData.filter(pattern => {
      const pillarMatch =
        activePillars.size === 0 ||
        (pattern.wafPillars ?? []).some(p => activePillars.has(p))

      const tierMatch =
        activeTiers.size === 0 ||
        (pattern.tiers ?? []).some(t => activeTiers.has(t))

      const overlayMatch =
        activeOverlays.size === 0 ||
        (pattern.complianceRelevance ?? []).some(o => activeOverlays.has(o))

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
          Reference Architecture
        </p>
        <h1 className="font-display text-3xl font-bold text-text-primary mb-3">
          Patterns Library
        </h1>
        <p className="text-text-secondary font-body text-sm leading-relaxed max-w-2xl">
          Reusable architecture patterns mapped to WAF pillars, engagement tiers, and compliance overlays.
          Each pattern captures the key design decisions and Azure services required to implement it correctly.
        </p>
      </div>

      {/* ── Filter bar ── */}
      <div className="card px-4 py-4 mb-6 space-y-3">

        {/* WAF pillars */}
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

        {/* Tiers */}
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

        {/* Compliance overlays */}
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

        {/* Results count + clear */}
        <div className="flex items-center justify-between pt-1 border-t border-border/60">
          <p className="text-2xs font-mono text-text-secondary">
            <span className="text-text-primary font-semibold">{filtered.length}</span>
            {' '}of{' '}
            <span>{patternsData.length}</span>
            {' '}patterns
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

      {/* ── Patterns grid ── */}
      {filtered.length === 0 ? (
        <div className="border border-border bg-surface px-8 py-12 text-center">
          <p className="text-text-secondary font-body text-sm">
            No patterns match the active filters.
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
          {filtered.map(pattern => (
            <PatternCard
              key={pattern.id}
              pattern={pattern}
              expanded={expandedId === pattern.id}
              onToggle={() => setExpandedId(prev => prev === pattern.id ? null : pattern.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
