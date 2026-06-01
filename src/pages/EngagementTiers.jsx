import { useState } from 'react'
import { Link } from 'react-router-dom'
import tiersData from '../data/engagement-tiers.json'
import stepsData from '../data/framework-steps.json'

const STEP_TITLES = Object.fromEntries(stepsData.map(s => [s.id, { number: s.number, title: s.title }]))

const TIER_CLASSES = {
  land:   { text: 'text-tier-land',   border: 'border-tier-land',   bg: 'bg-tier-land',   badge: 'border-tier-land text-tier-land' },
  scale:  { text: 'text-tier-scale',  border: 'border-tier-scale',  bg: 'bg-tier-scale',  badge: 'border-tier-scale text-tier-scale' },
  govern: { text: 'text-tier-govern', border: 'border-tier-govern', bg: 'bg-tier-govern', badge: 'border-tier-govern text-tier-govern' },
}

const PILLAR_LABELS = {
  'reliability':          { label: 'Reliability',            cls: 'border-waf-reliability text-waf-reliability' },
  'security':             { label: 'Security',               cls: 'border-waf-security text-waf-security' },
  'cost-optimization':    { label: 'Cost Optimization',      cls: 'border-waf-cost text-waf-cost' },
  'operational-excellence':{ label: 'Operational Excellence', cls: 'border-waf-operations text-waf-operations' },
  'performance-efficiency':{ label: 'Performance Efficiency', cls: 'border-waf-performance text-waf-performance' },
}

export default function EngagementTiers() {
  const [activeTab, setActiveTab] = useState(null)

  return (
    <div className="max-w-6xl mx-auto px-8 py-12">

      {/* Header */}
      <div className="mb-10">
        <p className="text-2xs font-semibold tracking-widest uppercase text-text-secondary font-display mb-1">Engagement Tiers</p>
        <h1 className="font-display text-3xl font-bold text-text-primary mb-4">
          Land · Scale · Govern
        </h1>

        {/* Philosophy callout */}
        <div className="border border-border bg-surface px-6 py-5 mb-6 max-w-3xl">
          <p className="text-2xs font-semibold uppercase tracking-widest text-text-secondary font-display mb-3">Why tiers exist</p>
          <p className="text-text-primary font-body text-sm leading-relaxed mb-3">
            Not every Azure engagement needs management groups, custom Policy initiatives, ExpressRoute circuits,
            or a dedicated platform team. A regional law firm standing up a web app and SharePoint replacement
            has fundamentally different needs than a defense contractor running regulated workloads across
            multiple Azure regions. Applying enterprise-scale governance to the first scenario adds months of
            delay and complexity that delivers no value.
          </p>
          <p className="text-text-secondary font-body text-sm leading-relaxed">
            The tiers calibrate how much of the framework to engage. <span className="text-text-primary">Land</span> scopes
            down to what a single-workload deployment actually requires.{' '}
            <span className="text-text-primary">Scale</span> adds platform engineering patterns as the estate grows.{' '}
            <span className="text-text-primary">Govern</span> brings the full ALZ reference architecture, compliance
            policy stacks, and formal change management. The same 7-step framework runs at all three tiers —
            the depth and duration at each step changes.
          </p>
        </div>

      </div>

      {/* Tier header comparison strip */}
      <div className="grid grid-cols-3 gap-px bg-border border border-border mb-8">
        {tiersData.map(tier => {
          const tc = TIER_CLASSES[tier.id]
          return (
            <button
              key={tier.id}
              onClick={() => setActiveTab(activeTab === tier.id ? null : tier.id)}
              className={`bg-surface px-5 py-4 text-left transition-colors hover:bg-border/20 ${activeTab === tier.id ? 'bg-border/30' : ''}`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className={`pillar-badge ${tc.badge} text-2xs`}>Tier {tier.number}</span>
                <span className="text-text-secondary text-2xs font-mono">{tier.typicalDuration}</span>
              </div>
              <h2 className={`font-display text-xl font-bold ${tc.text} mb-0.5`}>{tier.label}</h2>
              <p className="text-text-secondary text-xs font-body">{tier.tagline}</p>
            </button>
          )
        })}
      </div>

      {/* Active tier detail panel */}
      {activeTab && (() => {
        const tier = tiersData.find(t => t.id === activeTab)
        const tc = TIER_CLASSES[tier.id]
        return (
          <div className={`border ${tc.border} border-opacity-40 bg-surface mb-8`}>
            <div className={`border-b border-border px-6 py-4 flex items-center justify-between`}>
              <div className="flex items-center gap-3">
                <span className={`font-display text-lg font-bold ${tc.text}`}>{tier.label}</span>
                <span className="text-text-secondary font-mono text-xs">·</span>
                <span className="text-text-secondary font-body text-sm">{tier.posture}</span>
              </div>
              <button onClick={() => setActiveTab(null)} className="text-text-secondary hover:text-text-primary text-xs font-mono">close ×</button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-0 divide-y lg:divide-y-0 lg:divide-x divide-border">

              {/* Col 1: Description + scope */}
              <div className="px-6 py-5">
                <p className="text-text-secondary font-body text-sm leading-relaxed mb-4">{tier.description}</p>
                <div className="mb-4">
                  <p className="text-2xs font-semibold uppercase tracking-widest text-text-secondary font-display mb-1.5">Scope</p>
                  <p className="text-xs font-mono text-text-primary">{tier.scope}</p>
                </div>
                <div className="mb-4">
                  <p className="text-2xs font-semibold uppercase tracking-widest text-text-secondary font-display mb-1.5">WAF Focus</p>
                  <div className="flex flex-wrap gap-1">
                    {tier.wafFocus.map(p => {
                      const def = PILLAR_LABELS[p]
                      return def ? (
                        <span key={p} className={`pillar-badge ${def.cls} text-2xs`}>{def.label}</span>
                      ) : null
                    })}
                  </div>
                </div>
                <div>
                  <p className="text-2xs font-semibold uppercase tracking-widest text-text-secondary font-display mb-1.5">IaC Readiness</p>
                  <p className="text-2xs font-mono text-text-secondary leading-relaxed">{tier.iacReadiness}</p>
                </div>
              </div>

              {/* Col 2: Key patterns */}
              <div className="px-6 py-5">
                <p className="text-2xs font-semibold uppercase tracking-widest text-text-secondary font-display mb-3">Key Patterns</p>
                <ul className="space-y-1.5">
                  {tier.keyPatterns.map((p, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className={`mt-1.5 w-1 h-1 rounded-full ${tc.bg} shrink-0`} />
                      <span className="text-xs font-body text-text-primary leading-snug">{p}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Col 3: Key services */}
              <div className="px-6 py-5">
                <p className="text-2xs font-semibold uppercase tracking-widest text-text-secondary font-display mb-3">Key Azure Services</p>
                <div className="flex flex-wrap gap-1.5 mb-5">
                  {tier.keyServices.map(s => (
                    <span key={s} className="pillar-badge border-border text-text-secondary text-2xs">{s}</span>
                  ))}
                </div>
                <p className="text-2xs font-semibold uppercase tracking-widest text-text-secondary font-display mb-2">Typical Duration</p>
                <p className={`font-display text-2xl font-bold ${tc.text}`}>{tier.typicalDuration}</p>
                <p className="text-2xs font-mono text-text-secondary mt-1">End-to-end engagement estimate. Regulatory overlays multiply this.</p>
              </div>
            </div>
          </div>
        )
      })()}

      {/* Step duration comparison table */}
      <section className="mb-10">
        <div className="mb-3">
          <p className="text-2xs font-semibold tracking-widest uppercase text-text-secondary font-display mb-0.5">Per-Step Breakdown</p>
          <h2 className="font-display text-base font-semibold text-text-primary">Duration by Tier — All 7 Steps</h2>
        </div>
        <div className="border border-border overflow-hidden">
          {/* Table header */}
          <div className="grid grid-cols-[2fr_1fr_1fr_1fr] bg-surface border-b border-border">
            <div className="px-4 py-2.5 text-2xs font-semibold uppercase tracking-widest text-text-secondary font-display">Step</div>
            {tiersData.map(tier => (
              <div key={tier.id} className={`px-4 py-2.5 text-2xs font-semibold uppercase tracking-widest font-display ${TIER_CLASSES[tier.id].text}`}>
                {tier.label}
              </div>
            ))}
          </div>
          {/* Rows */}
          {stepsData.map((step, idx) => {
            const rowSteps = tiersData.map(tier => tier.steps.find(s => s.stepId === step.id))
            const hasCritical = rowSteps.some(s => s?.criticalPath)
            return (
              <div
                key={step.id}
                className={`grid grid-cols-[2fr_1fr_1fr_1fr] gap-0 border-b border-border last:border-b-0 ${idx % 2 === 0 ? 'bg-surface' : 'bg-canvas/40'} ${hasCritical ? 'ring-inset ring-1 ring-warning/20' : ''}`}
              >
                {/* Step label */}
                <div className="px-4 py-3 flex items-start gap-3">
                  <span className="font-mono text-text-secondary text-xs w-6 shrink-0 pt-0.5">{step.number}</span>
                  <div>
                    <span className="font-display text-xs font-semibold text-text-primary leading-snug block">{step.title}</span>
                    {hasCritical && (
                      <span className="pillar-badge border-warning/60 text-warning text-2xs mt-0.5">Critical path</span>
                    )}
                  </div>
                </div>
                {/* Duration cells per tier */}
                {tiersData.map(tier => {
                  const stepEntry = tier.steps.find(s => s.stepId === step.id)
                  const tc = TIER_CLASSES[tier.id]
                  return (
                    <div key={tier.id} className="px-4 py-3 group relative">
                      <span className={`font-mono text-xs ${tc.text} block`}>
                        {stepEntry?.duration ?? '—'}
                      </span>
                      {stepEntry?.notes && (
                        <span className="text-2xs font-body text-text-secondary leading-snug mt-0.5 block">{stepEntry.notes}</span>
                      )}
                    </div>
                  )
                })}
              </div>
            )
          })}
          {/* Footer totals row */}
          <div className="grid grid-cols-[2fr_1fr_1fr_1fr] bg-canvas border-t border-border">
            <div className="px-4 py-3 font-display text-xs font-semibold text-text-secondary">Total engagement</div>
            {tiersData.map(tier => (
              <div key={tier.id} className="px-4 py-3">
                <span className={`font-display text-sm font-bold ${TIER_CLASSES[tier.id].text}`}>{tier.typicalDuration}</span>
              </div>
            ))}
          </div>
        </div>
        <p className="mt-2 text-2xs text-text-secondary font-mono">
          Durations are elapsed calendar time, not engineering hours. Regulatory overlays (FedRAMP High: ×1.6, CMMC: ×1.5) multiply the total.
          Step 02 is the critical path at Tier 2+ — all downstream IaC depends on its outputs.
        </p>
      </section>

      {/* Regulatory forcing function */}
      <section className="mb-8">
        <div className="mb-3">
          <p className="text-2xs font-semibold tracking-widest uppercase text-text-secondary font-display mb-0.5">Overlays</p>
          <h2 className="font-display text-base font-semibold text-text-primary">Regulatory Overlays Force a Minimum Tier</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-border border border-border">
          <div className="bg-surface px-5 py-4">
            <p className="text-2xs font-semibold uppercase tracking-widest text-tier-land font-display mb-2">Forces Land+</p>
            <p className="text-xs font-body text-text-secondary leading-relaxed">
              No regulatory overlay forces Land-only. Any framework with a compliance mandate escalates to at least Scale.
            </p>
          </div>
          <div className="bg-surface px-5 py-4">
            <p className="text-2xs font-semibold uppercase tracking-widest text-tier-scale font-display mb-2">Forces Scale minimum</p>
            <div className="flex flex-wrap gap-1">
              {['NIST 800-53', 'HIPAA', 'PCI DSS v4', 'SOC 2 Type II', 'PCAOB', 'GDPR', 'ISO 27001'].map(f => (
                <span key={f} className="pillar-badge border-tier-scale/60 text-tier-scale text-2xs">{f}</span>
              ))}
            </div>
          </div>
          <div className="bg-surface px-5 py-4">
            <p className="text-2xs font-semibold uppercase tracking-widest text-tier-govern font-display mb-2">Forces Govern minimum</p>
            <div className="flex flex-wrap gap-1">
              {['FedRAMP High', 'FedRAMP Moderate', 'CMMC Level 2/3'].map(f => (
                <span key={f} className="pillar-badge border-tier-govern/60 text-tier-govern text-2xs">{f}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <div className="flex items-center gap-4">
        <Link
          to="/framework"
          className="inline-flex items-center gap-2 px-4 py-2 bg-accent text-white text-sm font-display font-semibold rounded transition-colors hover:bg-blue-500"
        >
          Proceed to Framework Steps
          <ArrowRight />
        </Link>
        <Link
          to="/patterns"
          className="inline-flex items-center gap-2 px-4 py-2 border border-border text-text-secondary text-sm font-display hover:text-text-primary hover:border-accent/50 rounded transition-colors"
        >
          Browse Patterns Library
        </Link>
      </div>

    </div>
  )
}

function ArrowRight({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="square" strokeLinejoin="miter" d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  )
}
