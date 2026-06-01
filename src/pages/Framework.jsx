import { useState } from 'react'
import steps from '../data/framework-steps.json'
import pillars from '../data/waf-pillars.json'

const PILLAR_META = Object.fromEntries(pillars.map(p => [p.id, p]))

const TIER_LABEL = { land: 'Land', scale: 'Scale', govern: 'Govern' }
const TIER_COLOR = {
  land:   'text-tier-land   border-tier-land/40',
  scale:  'text-tier-scale  border-tier-scale/40',
  govern: 'text-tier-govern border-tier-govern/40',
}

function PillarDot({ id, size = 'sm' }) {
  const p = PILLAR_META[id]
  if (!p) return null
  const sz = size === 'sm' ? 'w-2 h-2' : 'w-3 h-3'
  return (
    <span
      className={`${sz} rounded-full inline-block shrink-0`}
      style={{ backgroundColor: p.color }}
      title={p.label}
    />
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

function WafHeatmap({ primary = [], secondary = [] }) {
  const allPillars = pillars.map(p => {
    const isPrimary = primary.includes(p.id)
    const isSecondary = secondary.includes(p.id)
    return { ...p, coverage: isPrimary ? 'primary' : isSecondary ? 'secondary' : 'none' }
  })
  return (
    <div className="flex gap-1">
      {allPillars.map(p => (
        <div
          key={p.id}
          className="flex-1 h-1.5 rounded-sm transition-opacity"
          style={{
            backgroundColor: p.color,
            opacity: p.coverage === 'primary' ? 1 : p.coverage === 'secondary' ? 0.4 : 0.1,
          }}
          title={`${p.label}: ${p.coverage}`}
        />
      ))}
    </div>
  )
}

function DurationRow({ duration }) {
  return (
    <div className="flex gap-2">
      {Object.entries(duration).map(([tier, dur]) => (
        <span key={tier} className={`pillar-badge text-2xs ${TIER_COLOR[tier]}`}>
          {TIER_LABEL[tier]}: <span className="font-mono">{dur}</span>
        </span>
      ))}
    </div>
  )
}

function SubStepCard({ subStep }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="border border-border bg-canvas/60">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-border/20 transition-colors"
      >
        <span className="font-mono text-2xs text-text-secondary pt-0.5 shrink-0 w-5">{subStep.id}</span>
        <div className="flex-1 min-w-0">
          <p className="font-display text-sm font-semibold text-text-primary">{subStep.title}</p>
          {subStep.question && (
            <p className="text-xs text-text-secondary font-mono mt-0.5 italic">{subStep.question}</p>
          )}
        </div>
        <ChevronIcon open={open} />
      </button>

      {open && (
        <div className="px-4 pb-4 border-t border-border/60 pt-3 space-y-4">
          {subStep.summary && (
            <p className="text-sm text-text-secondary font-body leading-relaxed">{subStep.summary}</p>
          )}

          {subStep.keyPoints && (
            <ul className="space-y-1">
              {subStep.keyPoints.map((pt, i) => (
                <li key={i} className="flex gap-2 text-xs text-text-secondary">
                  <span className="text-accent mt-0.5 shrink-0">›</span>
                  <span className="font-body leading-relaxed">{pt}</span>
                </li>
              ))}
            </ul>
          )}

          {subStep.serviceMapping && (
            <DataTable
              columns={['RPO Target', 'Azure Service', 'Mechanism']}
              rows={subStep.serviceMapping.map(r => [r.rpo, r.service, r.mechanism])}
            />
          )}

          {subStep.comparisonTable && Array.isArray(subStep.comparisonTable) && subStep.comparisonTable[0]?.frontDoor !== undefined && (
            <DataTable
              columns={['Dimension', 'Azure Front Door', 'Traffic Manager']}
              rows={subStep.comparisonTable.map(r => [r.dimension, r.frontDoor, r.trafficManager])}
            />
          )}

          {subStep.conditionalAccessPolicies && (
            <DataTable
              columns={['Policy', 'Condition', 'Control']}
              rows={subStep.conditionalAccessPolicies.map(r => [r.policy, r.condition, r.control])}
            />
          )}

          {subStep.builtInInitiatives && (
            <DataTable
              columns={['Initiative', 'Purpose']}
              rows={subStep.builtInInitiatives.map(r => [r.name, r.purpose])}
            />
          )}

          {subStep.observabilityStack && (
            <DataTable
              columns={['Layer', 'Azure Service', 'Captures']}
              rows={subStep.observabilityStack.map(r => [r.layer, r.service, r.captures])}
            />
          )}

          {subStep.dataModels && (
            <DataTable
              columns={['Model', 'Characteristics', 'Azure Services']}
              rows={subStep.dataModels.map(r => [r.model, r.characteristics, Array.isArray(r.azureServices) ? r.azureServices.join(', ') : r.azureServices])}
            />
          )}

          {subStep.replicationOptions && (
            <DataTable
              columns={['RPO', 'Service', 'Mode', 'Auto-failover']}
              rows={subStep.replicationOptions.map(r => [r.rpo, r.service, r.mode, r.autoFailover ? 'Yes' : 'No'])}
            />
          )}

          {subStep.storageTiers && (
            <DataTable
              columns={['Tier', 'Latency', 'Use Case', 'Cost Profile']}
              rows={subStep.storageTiers.map(r => [r.tier, r.latency, r.useCase, r.costProfile])}
            />
          )}

          {subStep.computeOptions && (
            <DataTable
              columns={['Platform', 'State', 'Scale', 'Overhead', 'When to Use']}
              rows={subStep.computeOptions.map(r => [r.platform, r.state, r.scale, r.overhead, r.whenToUse])}
            />
          )}

          {subStep.cachingLayers && (
            <DataTable
              columns={['Layer', 'Service', 'What to Cache', 'TTL']}
              rows={subStep.cachingLayers.map(r => [r.layer, r.service, r.whatToCache, r.ttl])}
            />
          )}

          {subStep.slaTable && (
            <DataTable
              columns={['SLA', 'Annual Downtime', 'Monthly Downtime']}
              rows={subStep.slaTable.map(r => [r.sla, r.annualDowntime, r.monthlyDowntime])}
            />
          )}

          {subStep.residencyTable && (
            <DataTable
              columns={['Framework', 'Constraint', 'Azure Region Pair']}
              rows={subStep.residencyTable.map(r => [r.framework, r.constraint, r.azureRegionPair])}
            />
          )}

          {subStep.failureMatrix && (
            <DataTable
              columns={['Component', 'What Fails', 'Auto-Recovery', 'RTO', 'Manual Action']}
              rows={subStep.failureMatrix.map(r => [r.component, r.whatFails, r.autoRecovery ? 'Yes' : 'No', r.rtoContribution, r.manualAction])}
            />
          )}

          {subStep.spofPatterns && (
            <div>
              <p className="text-2xs font-semibold tracking-widest uppercase text-text-secondary font-display mb-2">SPOF Patterns to Look For</p>
              <ul className="space-y-1">
                {subStep.spofPatterns.map((s, i) => (
                  <li key={i} className="flex gap-2 text-xs text-critical">
                    <span className="shrink-0">⚠</span>
                    <span className="font-mono">{s}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {subStep.keyChecks && (
            <DataTable
              columns={['Question', 'Good Answer', 'Bad Answer']}
              rows={subStep.keyChecks.map(r => [r.question, r.goodAnswer, r.badAnswer])}
            />
          )}

          {subStep.commitmentTypes && (
            <DataTable
              columns={['Type', 'Discount', 'Flexibility', 'Best For']}
              rows={subStep.commitmentTypes.map(r => [r.type, r.discount, r.flexibility, r.bestFor])}
            />
          )}

          {subStep.maturityLevels && (
            <DataTable
              columns={['Level', 'Characteristics', 'Azure Tooling']}
              rows={subStep.maturityLevels.map(r => [r.level, r.characteristics, r.azureTooling])}
            />
          )}

          {subStep.iacOptions && (
            <DataTable
              columns={['Tool', 'Language', 'State', 'When to Use']}
              rows={subStep.iacOptions.map(r => [r.tool, r.language, r.stateManagement, r.whenToUse])}
            />
          )}

          {subStep.patterns && (
            <DataTable
              columns={['Pattern', 'Traffic Shift', 'Rollback Speed', 'When to Use']}
              rows={subStep.patterns.map(r => [r.pattern, r.trafficShift, r.rollbackSpeed, r.whenToUse])}
            />
          )}

          {subStep.minimumRunbooks && (
            <DataTable
              columns={['Runbook', 'Trigger', 'Key Steps']}
              rows={subStep.minimumRunbooks.map(r => [r.runbook, r.trigger, r.keySteps])}
            />
          )}

          {subStep.pirStructure && (
            <ol className="space-y-1">
              {subStep.pirStructure.map((item, i) => (
                <li key={i} className="flex gap-2 text-xs text-text-secondary">
                  <span className="font-mono text-accent shrink-0">{i + 1}.</span>
                  <span className="font-body">{item}</span>
                </li>
              ))}
            </ol>
          )}

          {subStep.requiredTags && (
            <DataTable
              columns={['Tag Key', 'Example Value', 'Purpose']}
              rows={subStep.requiredTags.map(r => [r.key, r.example, r.purpose])}
            />
          )}

          {subStep.criticalConnectors && (
            <ul className="space-y-1">
              {subStep.criticalConnectors.map((c, i) => (
                <li key={i} className="flex gap-2 text-xs text-text-secondary">
                  <span className="text-accent shrink-0">›</span>
                  <span className="font-mono">{c}</span>
                </li>
              ))}
            </ul>
          )}

          {subStep.egressCosts && (
            <DataTable
              columns={['Transfer Type', 'Approx. Cost']}
              rows={subStep.egressCosts.map(r => [r.transferType, r.approxCost])}
            />
          )}

          {subStep.retryPattern && (
            <div className="bg-canvas border border-border px-3 py-3">
              <p className="text-2xs font-semibold tracking-widest uppercase text-text-secondary font-display mb-2">Retry Pattern</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                {Object.entries(subStep.retryPattern).map(([k, v]) => (
                  <div key={k} className="flex gap-2 text-xs">
                    <span className="text-text-secondary capitalize">{k.replace(/([A-Z])/g, ' $1').toLowerCase()}:</span>
                    <span className="font-mono text-text-mono">{v}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {subStep.detectionMechanisms && (
            <DataTable
              columns={['Signal', 'Azure Tooling']}
              rows={subStep.detectionMechanisms.map(r => [r.signal, r.tooling])}
            />
          )}

          {subStep.hierarchyPattern && (
            <HierarchyTree node={subStep.hierarchyPattern} />
          )}
        </div>
      )}
    </div>
  )
}

function HierarchyTree({ node }) {
  const render = (n, depth = 0) => (
    <div key={n.name || n.root} className={`${depth > 0 ? 'ml-4 border-l border-border pl-3' : ''}`}>
      <p className="text-xs font-mono text-text-secondary py-0.5">
        {depth === 0 ? n.root : n.name}
      </p>
      {(n.children || []).map(child =>
        typeof child === 'string'
          ? <p key={child} className="ml-4 border-l border-border pl-3 text-xs font-mono text-text-secondary py-0.5">{child}</p>
          : render(child, depth + 1)
      )}
    </div>
  )
  return <div className="bg-canvas border border-border px-3 py-2">{render(node)}</div>
}

function DataTable({ columns, rows }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="border-b border-border">
            {columns.map(col => (
              <th key={col} className="text-left py-1.5 pr-4 font-display font-semibold text-text-secondary text-2xs tracking-wider uppercase">
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-border/40 hover:bg-border/10">
              {row.map((cell, j) => (
                <td key={j} className={`py-2 pr-4 align-top leading-relaxed ${j === 0 ? 'font-mono text-text-mono' : 'text-text-secondary font-body'}`}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function ChevronIcon({ open }) {
  return (
    <svg
      className={`w-4 h-4 text-text-secondary transition-transform duration-150 shrink-0 mt-0.5 ${open ? 'rotate-180' : ''}`}
      fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
    >
      <path strokeLinecap="square" d="M6 9l6 6 6-6" />
    </svg>
  )
}

export default function Framework() {
  const [activeStep, setActiveStep] = useState(null)

  return (
    <div className="max-w-5xl mx-auto px-8 py-12">
      <div className="mb-10">
        <p className="text-2xs font-semibold tracking-widest uppercase text-text-secondary font-display mb-1">Core Method</p>
        <h1 className="font-display text-3xl font-bold text-text-primary mb-3">7-Step Engagement Framework</h1>
        <p className="text-text-secondary font-body text-sm leading-relaxed max-w-2xl">
          A sequential methodology for structuring Azure cloud engagements. Each step produces concrete deliverables and gates downstream work.
          Step 02 is the critical path — it must complete before IaC design begins at Tier 2+.
        </p>
      </div>

      {/* WAF pillar legend */}
      <div className="card px-4 py-3 mb-8">
        <p className="text-2xs font-semibold tracking-widest uppercase text-text-secondary font-display mb-2">
          WAF Pillar Coverage — how to read the bars
        </p>
        <div className="flex gap-4 mb-2 flex-wrap">
          {pillars.map(p => (
            <div key={p.id} className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
              <span className="text-xs text-text-secondary font-body">{p.label}</span>
            </div>
          ))}
        </div>
        <div className="flex gap-6 pt-2 border-t border-border">
          <div className="flex items-center gap-2">
            <div className="w-8 h-1.5 rounded-sm bg-accent" />
            <span className="text-2xs text-text-secondary font-mono">Primary — main focus of this step</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-1.5 rounded-sm bg-accent opacity-40" />
            <span className="text-2xs text-text-secondary font-mono">Secondary — addressed but not the focus</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-1.5 rounded-sm bg-accent opacity-10" />
            <span className="text-2xs text-text-secondary font-mono">Not covered in this step</span>
          </div>
        </div>
      </div>

      {/* Steps */}
      <div className="space-y-3">
        <div className="flex justify-end">
          {activeStep && (
            <button
              onClick={() => setActiveStep(null)}
              className="text-2xs font-mono text-text-secondary hover:text-text-primary transition-colors"
            >
              Collapse all ×
            </button>
          )}
        </div>
        {steps.map((step) => {
          const isActive = activeStep === step.id
          const allPillarIds = [...(step.wafPillars.primary || []), ...(step.wafPillars.secondary || [])]

          return (
            <div key={step.id} className={`border transition-colors ${isActive ? 'border-accent/50' : 'border-border hover:border-border/80'} bg-surface`}>

              {/* Step header */}
              <button
                onClick={() => setActiveStep(isActive ? null : step.id)}
                className="w-full text-left px-5 py-4"
              >
                <div className="flex items-start gap-4">
                  <span className="font-mono text-text-secondary text-sm w-7 shrink-0 pt-0.5">{step.number}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className={`font-display text-sm font-semibold ${isActive ? 'text-accent' : 'text-text-primary'} transition-colors`}>
                        {step.title}
                      </span>
                      {step.criticalPath && (
                        <span className="pillar-badge border-warning/60 text-warning text-2xs">Critical path</span>
                      )}
                    </div>
                    <p className="text-xs text-text-secondary font-mono leading-relaxed">{step.subtitle}</p>
                    <div className="flex items-center gap-4 mt-2">
                      <div className="flex-1">
                        <WafHeatmap primary={step.wafPillars.primary} secondary={step.wafPillars.secondary} />
                      </div>
                      <div className="flex gap-3 shrink-0">
                        <span className="text-2xs font-mono text-tier-land">
                          Land <span className="text-text-secondary">{step.duration.land}</span>
                        </span>
                        <span className="text-2xs font-mono text-tier-scale">
                          Scale <span className="text-text-secondary">{step.duration.scale}</span>
                        </span>
                        <span className="text-2xs font-mono text-tier-govern">
                          Govern <span className="text-text-secondary">{step.duration.govern}</span>
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="shrink-0 flex items-center gap-3 pt-0.5">
                    <div className="flex gap-1">
                      {allPillarIds.map(pid => <PillarDot key={pid} id={pid} />)}
                    </div>
                    <ChevronIcon open={isActive} />
                  </div>
                </div>
              </button>

              {/* Expanded content */}
              {isActive && (
                <div className="border-t border-border px-5 pb-6 pt-5 space-y-6">

                  {/* Duration + metadata row */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <p className="text-2xs font-semibold tracking-widest uppercase text-text-secondary font-display mb-2">Duration by Tier</p>
                      <DurationRow duration={step.duration} />
                    </div>
                    <div>
                      <p className="text-2xs font-semibold tracking-widest uppercase text-text-secondary font-display mb-2">WAF Coverage</p>
                      <div className="flex gap-1.5 flex-wrap">
                        {step.wafPillars.primary.map(pid => <PillarBadge key={pid} id={pid} />)}
                        {step.wafPillars.secondary.map(pid => (
                          <span key={pid} className="pillar-badge text-2xs" style={{ color: PILLAR_META[pid]?.color + '99', borderColor: PILLAR_META[pid]?.color + '30' }}>
                            {PILLAR_META[pid]?.label}<span className="opacity-60 ml-1">(secondary)</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Critical path note */}
                  {step.criticalPathNote && (
                    <div className="border-l-2 border-warning px-4 py-3 bg-warning/5">
                      <p className="text-xs text-warning font-body leading-relaxed">{step.criticalPathNote}</p>
                    </div>
                  )}

                  {/* Deliverables */}
                  <div>
                    <p className="text-2xs font-semibold tracking-widest uppercase text-text-secondary font-display mb-2">Deliverables</p>
                    <ul className="space-y-1">
                      {step.deliverables.map((d, i) => (
                        <li key={i} className="flex gap-2 text-xs text-text-secondary">
                          <span className="text-positive shrink-0 mt-0.5">✓</span>
                          <span className="font-body">{d}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Complexity drivers */}
                  <div>
                    <p className="text-2xs font-semibold tracking-widest uppercase text-text-secondary font-display mb-2">Complexity Drivers</p>
                    <ul className="space-y-1">
                      {step.complexityDrivers.map((d, i) => (
                        <li key={i} className="flex gap-2 text-xs text-text-secondary">
                          <span className="text-text-secondary/50 shrink-0">—</span>
                          <span className="font-mono">{d}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Stakeholders */}
                  <div>
                    <p className="text-2xs font-semibold tracking-widest uppercase text-text-secondary font-display mb-2">Stakeholders</p>
                    <div className="flex flex-wrap gap-1.5">
                      {step.stakeholders.map(s => (
                        <span key={s} className="pillar-badge border-border text-text-secondary text-2xs">{s}</span>
                      ))}
                    </div>
                  </div>

                  {/* Sub-steps */}
                  {step.subSteps && step.subSteps.length > 0 && (
                    <div>
                      <p className="text-2xs font-semibold tracking-widest uppercase text-text-secondary font-display mb-2">Sub-Steps</p>
                      <div className="space-y-1">
                        {step.subSteps.map(sub => (
                          <SubStepCard key={sub.id} subStep={sub} />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
