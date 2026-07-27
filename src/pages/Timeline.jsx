import { useState, useMemo, useEffect } from 'react'
import { useProject } from '../context/useProject'
import steps from '../data/framework-steps.json'
import tiers from '../data/engagement-tiers.json'
import overlays from '../data/compliance-overlays.json'

// ─── Constants ────────────────────────────────────────────────────────────────

const TIER_IDS = ['land', 'scale', 'govern']

const TIER_META = Object.fromEntries(tiers.map(t => [t.id, t]))

const TIER_BUTTON = {
  land:   { active: 'bg-tier-land   text-white border-tier-land',   inactive: 'text-tier-land   border-tier-land/40   hover:border-tier-land/80' },
  scale:  { active: 'bg-tier-scale  text-white border-tier-scale',  inactive: 'text-tier-scale  border-tier-scale/40  hover:border-tier-scale/80' },
  govern: { active: 'bg-tier-govern text-white border-tier-govern', inactive: 'text-tier-govern border-tier-govern/40 hover:border-tier-govern/80' },
}

// WAF primary pillar → bar color (hex, for inline style)
const PILLAR_COLOR = {
  reliability:              '#3b82f6',
  security:                 '#7c3aed',
  'cost-optimization':      '#10b981',
  'operational-excellence': '#f59e0b',
  'performance-efficiency': '#06b6d4',
}

const PILLAR_LABEL = {
  reliability:              'Reliability',
  security:                 'Security',
  'cost-optimization':      'Cost',
  'operational-excellence': 'Operations',
  'performance-efficiency': 'Performance',
}

// Duration string → decimal weeks (midpoint per spec)
const DURATION_WEEK_MAP = {
  '2–4 hours':  0.1,
  '4–8 hours':  0.2,
  '1–2 days':   0.3,
  '2–4 days':   0.5,
  '3–5 days':   0.8,
  '1–2 weeks':  1.5,
  '2–3 weeks':  2.5,
  '2–4 weeks':  3.0,
}

function parseDurationWeeks(str) {
  if (!str) return 0
  const normalized = str.trim()
  if (Object.prototype.hasOwnProperty.call(DURATION_WEEK_MAP, normalized)) {
    return DURATION_WEEK_MAP[normalized]
  }
  // Fallback: extract numbers and average
  const nums = normalized.match(/[\d.]+/g)
  if (!nums) return 0
  const vals = nums.map(Number)
  const avg = vals.reduce((a, b) => a + b, 0) / vals.length
  if (normalized.includes('hour')) return avg / 40
  if (normalized.includes('day'))  return avg / 5
  return avg
}

function todayIso() {
  const d = new Date()
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-')
}

function addWeeks(date, weeks) {
  const ms = weeks * 7 * 24 * 60 * 60 * 1000
  return new Date(date.getTime() + ms)
}

function fmtDate(date) {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function TierButton({ tierId, active, onClick }) {
  const tier = TIER_META[tierId]
  const cls = TIER_BUTTON[tierId]
  return (
    <button
      onClick={onClick}
      className={`px-4 py-1.5 text-xs font-display font-semibold tracking-wide border transition-colors ${active ? cls.active : cls.inactive}`}
    >
      {tier.label}
    </button>
  )
}

function ComplianceSelector({ value, onChange }) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="bg-surface border border-border text-text-secondary text-xs font-mono px-3 py-1.5 focus:outline-none focus:border-accent/60"
      style={{ minWidth: '180px' }}
    >
      <option value="">No compliance overlay</option>
      {overlays.map(o => (
        <option key={o.id} value={o.id}>{o.shortName}</option>
      ))}
    </select>
  )
}

function WeekAxis({ totalWeeks, startDate }) {
  const tickStep = totalWeeks <= 8 ? 1 : totalWeeks <= 16 ? 2 : totalWeeks <= 32 ? 4 : 8
  const ticks = []
  for (let w = 0; w <= Math.ceil(totalWeeks); w += tickStep) {
    ticks.push(w)
  }
  return (
    <div className="relative h-7 border-b border-border/60" style={{ marginLeft: '228px', marginRight: '116px' }}>
      {ticks.map(w => {
        const leftPct = (w / totalWeeks) * 100
        const d = addWeeks(startDate, w)
        return (
          <div
            key={w}
            className="absolute flex flex-col items-center"
            style={{ left: `${leftPct}%`, transform: 'translateX(-50%)' }}
          >
            <span className="text-2xs font-mono text-text-secondary/60 whitespace-nowrap">
              W{w} · {fmtDate(d)}
            </span>
            <div className="w-px h-2 bg-border/60 mt-0.5" />
          </div>
        )
      })}
    </div>
  )
}

function GanttBar({ step, tierStepData, startWeek, totalWeeks, startDate, multiplier, isCritical }) {
  const rawDur = tierStepData?.duration ?? ''
  const baseWeeks = parseDurationWeeks(rawDur)
  const adjWeeks = baseWeeks * multiplier
  const barLeftPct = (startWeek / totalWeeks) * 100
  const barWidthPct = Math.max((adjWeeks / totalWeeks) * 100, 1.2)
  const pillarId = step.wafPillars?.primary?.[0] ?? 'reliability'
  const barColor = PILLAR_COLOR[pillarId] ?? '#3b82f6'
  const projStart = addWeeks(startDate, startWeek)
  const projEnd   = addWeeks(startDate, startWeek + adjWeeks)

  return (
    <div
      className={`relative flex items-center border-b border-border/30 py-1.5 ${isCritical ? 'bg-warning/5' : ''}`}
      style={{
        borderLeft: isCritical ? '3px solid #f59e0b' : '3px solid transparent',
        paddingLeft: '6px',
      }}
    >
      {/* Left label column */}
      <div className="shrink-0 flex items-center gap-2" style={{ width: '222px' }}>
        <span className="font-mono text-2xs text-text-secondary w-5 shrink-0">{step.number}</span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-display font-semibold text-text-primary leading-tight">{step.title}</span>
            {isCritical && (
              <span className="pillar-badge border-warning/60 text-warning text-2xs shrink-0">CRITICAL PATH</span>
            )}
          </div>
        </div>
      </div>

      {/* Bar track */}
      <div className="relative flex-1 h-7 mx-2">
        <div
          className="absolute top-0.5 h-6 flex items-center overflow-hidden"
          style={{
            left: `${barLeftPct}%`,
            width: `${barWidthPct}%`,
            backgroundColor: barColor,
            opacity: isCritical ? 1 : 0.78,
          }}
          title={`${rawDur}${multiplier !== 1 ? ` × ${multiplier} = ${adjWeeks.toFixed(1)}w adjusted` : ''}`}
        >
          <span className="px-2 text-2xs font-mono text-white/90 truncate whitespace-nowrap select-none">
            {multiplier !== 1 ? `${adjWeeks.toFixed(1)}w` : rawDur}
          </span>
        </div>
      </div>

      {/* Date range */}
      <div className="shrink-0 text-right" style={{ width: '112px' }}>
        <span className="font-mono text-2xs text-text-secondary whitespace-nowrap">
          {fmtDate(projStart)} – {fmtDate(projEnd)}
        </span>
      </div>
    </div>
  )
}

function DetailTable({ tierId, tierStepsMap, multiplier }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="border-b border-border">
            {['Step', 'Duration', 'Adj. Duration', 'Notes', 'Deliverables', 'Critical Path'].map(col => (
              <th
                key={col}
                className="text-left py-2 pr-4 font-display font-semibold text-text-secondary text-2xs tracking-wider uppercase whitespace-nowrap"
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {steps.map(step => {
            const tierStep = tierStepsMap[step.id]
            const rawDur = tierStep?.duration ?? step.duration?.[tierId] ?? '—'
            const baseWeeks = parseDurationWeeks(rawDur)
            const adjWeeks = baseWeeks * multiplier
            const isCritical = step.criticalPath === true

            return (
              <tr
                key={step.id}
                className={`border-b border-border/40 hover:bg-border/10 ${isCritical ? 'bg-warning/5' : ''}`}
              >
                {/* Step name */}
                <td className="py-2 pr-4 align-top">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-2xs text-text-secondary">{step.number}</span>
                    <span className="font-display font-semibold text-text-primary">{step.title}</span>
                    {isCritical && (
                      <span className="pillar-badge border-warning/60 text-warning text-2xs shrink-0">CRITICAL PATH</span>
                    )}
                  </div>
                </td>

                {/* Base duration */}
                <td className="py-2 pr-4 align-top font-mono text-text-mono whitespace-nowrap">
                  {rawDur}
                </td>

                {/* Adjusted duration */}
                <td className="py-2 pr-4 align-top font-mono whitespace-nowrap">
                  {multiplier !== 1
                    ? <span className="text-warning">{adjWeeks.toFixed(1)}w</span>
                    : <span className="text-text-secondary/30">—</span>
                  }
                </td>

                {/* Notes */}
                <td className="py-2 pr-4 align-top text-text-secondary font-body leading-relaxed" style={{ maxWidth: '260px' }}>
                  {tierStep?.notes ?? '—'}
                </td>

                {/* Deliverables */}
                <td className="py-2 pr-4 align-top text-text-secondary font-body leading-relaxed" style={{ maxWidth: '280px' }}>
                  <ul className="space-y-0.5">
                    {(step.deliverables ?? []).map((d, i) => (
                      <li key={i} className="flex gap-1.5">
                        <span className="text-positive shrink-0">✓</span>
                        <span>{d}</span>
                      </li>
                    ))}
                  </ul>
                </td>

                {/* Critical path */}
                <td className="py-2 pr-4 align-top whitespace-nowrap">
                  {isCritical
                    ? <span className="font-mono text-warning">Yes</span>
                    : <span className="font-mono text-text-secondary/30">—</span>
                  }
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ─── Main export ──────────────────────────────────────────────────────────────

export default function Timeline() {
  const { timeline: saved, setTimelineState } = useProject()
  const [tierId, setTierId] = useState(saved?.tierId ?? 'scale')
  const [overlayId, setOverlayId] = useState(saved?.overlayId ?? '')
  const [startDateStr, setStartDateStr] = useState(saved?.startDateStr ?? todayIso)

  useEffect(() => {
    setTimelineState({ tierId, overlayId, startDateStr })
  }, [tierId, overlayId, startDateStr, setTimelineState])

  const overlay = overlays.find(o => o.id === overlayId) ?? null
  const multiplier = overlay?.timelineMultiplier ?? 1

  const startDate = useMemo(() => {
    const d = new Date(startDateStr + 'T00:00:00')
    return isNaN(d.getTime()) ? new Date() : d
  }, [startDateStr])

  const tierObj = TIER_META[tierId]

  // stepId → tier step object (duration + notes)
  const tierStepsMap = useMemo(
    () => Object.fromEntries((tierObj?.steps ?? []).map(s => [s.stepId, s])),
    [tierObj]
  )

  // Per-step computed segments: base weeks, adjusted weeks, cumulative start
  const stepSegments = useMemo(() => {
    let cursor = 0
    return steps.map(step => {
      const tierStep = tierStepsMap[step.id]
      const rawDur = tierStep?.duration ?? step.duration?.[tierId] ?? ''
      const baseWeeks = parseDurationWeeks(rawDur)
      const adjWeeks = baseWeeks * multiplier
      const startWeek = cursor
      cursor += adjWeeks
      return { step, tierStep, rawDur, baseWeeks, adjWeeks, startWeek }
    })
  }, [tierId, tierStepsMap, multiplier])

  const totalAdjWeeks = stepSegments.reduce((sum, s) => sum + s.adjWeeks, 0)
  // 5% right padding on chart
  const chartWeeks = Math.max(totalAdjWeeks * 1.05, 1)
  const endDate = addWeeks(startDate, totalAdjWeeks)

  return (
    <div className="max-w-7xl mx-auto px-8 py-12">

      {/* ── Header ── */}
      <div className="mb-8">
        <p className="text-2xs font-semibold tracking-widest uppercase text-text-secondary font-display mb-1">
          Project Management
        </p>
        <h1 className="font-display text-3xl font-bold text-text-primary mb-3">Engagement Timeline</h1>
        <p className="text-text-secondary font-body text-sm leading-relaxed max-w-2xl">
          Gantt-style duration estimates for the 7-step engagement framework by tier.
          Select a tier and optional compliance overlay to scope project duration and projected calendar dates.
          Step 02 is the critical path — it gates IaC design and all downstream technical work at Tier 2+.
        </p>
      </div>

      {/* ── Controls ── */}
      <div className="card px-5 py-4 mb-6">
        <div className="flex flex-wrap gap-6 items-end">

          {/* Tier selector */}
          <div>
            <p className="text-2xs font-semibold tracking-widest uppercase text-text-secondary font-display mb-2">
              Engagement Tier
            </p>
            <div className="flex">
              {TIER_IDS.map(id => (
                <TierButton key={id} tierId={id} active={tierId === id} onClick={() => setTierId(id)} />
              ))}
            </div>
          </div>

          {/* Compliance overlay */}
          <div>
            <p className="text-2xs font-semibold tracking-widest uppercase text-text-secondary font-display mb-2">
              Compliance Overlay
            </p>
            <ComplianceSelector value={overlayId} onChange={setOverlayId} />
          </div>

          {/* Start date */}
          <div>
            <p className="text-2xs font-semibold tracking-widest uppercase text-text-secondary font-display mb-2">
              Start Date
            </p>
            <input
              type="date"
              value={startDateStr}
              onChange={e => setStartDateStr(e.target.value)}
              className="bg-surface border border-border text-text-secondary text-xs font-mono px-3 py-1.5 focus:outline-none focus:border-accent/60"
            />
          </div>

          {/* Summary */}
          <div className="ml-auto text-right">
            <p className="text-2xs font-semibold tracking-widest uppercase text-text-secondary font-display mb-1">
              Estimated Total
            </p>
            <p className="font-mono text-text-mono text-sm">{tierObj?.typicalDuration ?? '—'}</p>
            {multiplier !== 1 && (
              <p className="text-2xs text-warning font-mono mt-0.5">
                ×{multiplier} = {totalAdjWeeks.toFixed(1)}w adjusted
              </p>
            )}
            <p className="text-2xs text-text-secondary/60 font-mono mt-0.5">
              Completes ~{fmtDate(endDate)}
            </p>
          </div>
        </div>
      </div>

      {/* ── Compliance callout ── */}
      {overlay && (
        <div className="mb-6 border-l-2 border-accent px-4 py-3 bg-accent/5 flex items-start gap-3">
          <div className="flex-1">
            <p className="text-xs font-display font-semibold text-text-primary mb-0.5">
              {overlay.name} ×{overlay.timelineMultiplier} applied — total adjusted to {totalAdjWeeks.toFixed(1)} weeks
            </p>
            <p className="text-xs text-text-secondary font-body leading-relaxed">
              All step durations multiplied by <span className="font-mono text-text-mono">{overlay.timelineMultiplier}</span>.
              Projected completion: <span className="font-mono text-text-mono">{fmtDate(endDate)}</span>.
              {overlay.azureGovernmentRequired && (
                <span className="ml-2 font-mono text-warning text-2xs">
                  ⚠ Azure Government regions required for this overlay.
                </span>
              )}
            </p>
          </div>
          <button
            onClick={() => setOverlayId('')}
            className="text-text-secondary/40 hover:text-text-secondary text-xs font-mono shrink-0 transition-colors"
            title="Remove overlay"
          >
            ✕
          </button>
        </div>
      )}

      {/* ── Gantt chart ── */}
      <div className="card mb-8">
        {/* Chart header */}
        <div className="px-5 pt-4 pb-3 border-b border-border flex items-center justify-between flex-wrap gap-3">
          <p className="text-2xs font-semibold tracking-widest uppercase text-text-secondary font-display">
            Gantt Chart — {tierObj?.label} Tier{overlay ? ` · ${overlay.shortName} ×${multiplier}` : ''}
          </p>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 border-l-2 border-warning" style={{ backgroundColor: 'rgba(245,158,11,0.12)' }} />
              <span className="text-2xs text-text-secondary font-mono">Critical path</span>
            </div>
            {Object.entries(PILLAR_COLOR).map(([pid, color]) => (
              <div key={pid} className="flex items-center gap-1">
                <div className="w-3 h-3 opacity-80" style={{ backgroundColor: color }} />
                <span className="text-2xs text-text-secondary font-mono">{PILLAR_LABEL[pid]}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Chart body */}
        <div className="px-5 pt-3 pb-4 overflow-x-auto" style={{ minWidth: '600px' }}>
          <WeekAxis totalWeeks={chartWeeks} startDate={startDate} />
          <div className="mt-1">
            {stepSegments.map(({ step, tierStep, startWeek }) => (
              <GanttBar
                key={step.id}
                step={step}
                tierStepData={tierStep}
                startWeek={startWeek}
                totalWeeks={chartWeeks}
                startDate={startDate}
                multiplier={multiplier}
                isCritical={step.criticalPath === true}
              />
            ))}
          </div>

          {/* ExpressRoute note */}
          <div className="mt-4 border-t border-border/40 pt-3">
            <p className="text-2xs font-mono text-warning/80">
              ⚠ ExpressRoute carrier provisioning: <span className="font-semibold">4–8 weeks external dependency</span> — runs parallel to Steps 1–2.
              Must be initiated on Day 1 if hybrid connectivity is required. Track separately from framework step durations.
            </p>
          </div>
        </div>
      </div>

      {/* ── Step detail table ── */}
      <div className="card mb-8">
        <div className="px-5 pt-4 pb-3 border-b border-border">
          <p className="text-2xs font-semibold tracking-widest uppercase text-text-secondary font-display">
            Step Detail — {tierObj?.label} Tier
            {multiplier !== 1 && (
              <span className="ml-3 text-warning normal-case">
                {overlay?.shortName} ×{multiplier} applied
              </span>
            )}
          </p>
        </div>
        <div className="px-5 pt-3 pb-5">
          <DetailTable tierId={tierId} tierStepsMap={tierStepsMap} multiplier={multiplier} />
        </div>
      </div>

      {/* ── Engagement summary ── */}
      <div className="card px-5 py-5">
        <p className="text-2xs font-semibold tracking-widest uppercase text-text-secondary font-display mb-4">
          Engagement Summary
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-5">
          {/* Tier */}
          <div>
            <p className="text-2xs text-text-secondary font-display uppercase tracking-wider mb-1">Selected Tier</p>
            <p className="font-display font-bold text-lg text-text-primary">{tierObj?.label}</p>
            <p className="text-xs font-mono text-text-secondary mt-0.5">{tierObj?.tagline}</p>
            <p className="text-xs font-mono text-text-mono mt-1">{tierObj?.typicalDuration}</p>
          </div>

          {/* Compliance */}
          <div>
            <p className="text-2xs text-text-secondary font-display uppercase tracking-wider mb-1">Compliance Overlay</p>
            {overlay
              ? <>
                  <p className="font-display font-bold text-lg text-text-primary">{overlay.shortName}</p>
                  <p className="text-xs font-mono text-warning mt-0.5">×{overlay.timelineMultiplier} duration multiplier</p>
                  <p className="text-xs font-mono text-text-mono mt-1">{totalAdjWeeks.toFixed(1)} weeks adjusted total</p>
                </>
              : <p className="text-xs font-mono text-text-secondary/40 mt-1">None selected</p>
            }
          </div>

          {/* Projected completion */}
          <div>
            <p className="text-2xs text-text-secondary font-display uppercase tracking-wider mb-1">Projected Completion</p>
            <p className="font-display font-bold text-lg text-text-primary">{fmtDate(endDate)}</p>
            <p className="text-xs font-mono text-text-secondary mt-0.5">Starting {fmtDate(startDate)}</p>
            <p className="text-xs font-mono text-text-mono mt-1">{totalAdjWeeks.toFixed(1)} total weeks</p>
          </div>
        </div>

        {/* External dependency callout */}
        <div className="border-t border-border pt-4">
          <p className="text-2xs font-semibold tracking-widest uppercase text-text-secondary font-display mb-2">
            External Dependency — Not Included Above
          </p>
          <div className="border-l-2 border-warning/60 pl-3 py-1">
            <p className="text-xs font-mono text-warning/80 font-semibold mb-0.5">
              ExpressRoute Lead Time: 4–8 weeks (carrier provisioning)
            </p>
            <p className="text-xs text-text-secondary font-body leading-relaxed">
              This is an external dependency outside Azure control. It does not block Steps 1–2 but
              blocks Steps 4–7 if hybrid connectivity is required.
              Initiate on Day 1 of the engagement if ExpressRoute is in scope.
              Budget as a parallel workstream separate from the framework step durations shown above.
            </p>
          </div>
        </div>
      </div>

    </div>
  )
}
