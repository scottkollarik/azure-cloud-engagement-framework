import { Link } from 'react-router-dom'
import stepsData from '../data/framework-steps.json'

const ENTRY_POINTS = [
  {
    to: '/engagement-tiers',
    label: 'Engagement Tiers',
    description: 'Land · Scale · Govern — choose your maturity posture and scope the engagement.',
    accent: 'border-tier-land text-tier-land',
    tag: 'Start here',
  },
  {
    to: '/framework',
    label: '7-Step Framework',
    description: '7 sequential steps from constraint extraction to operational model.',
    accent: 'border-accent text-accent',
    tag: 'Core method',
  },
  {
    to: '/patterns',
    label: 'Patterns Library',
    description: 'Reusable architecture patterns indexed by WAF pillar, tier, and compliance overlay.',
    accent: 'border-waf-security text-waf-security',
    tag: 'Reference',
  },
  {
    to: '/reference-architectures',
    label: 'Reference Architectures',
    description: 'Complete workload blueprints with component layer breakdowns and Architecture Center links.',
    accent: 'border-waf-reliability text-waf-reliability',
    tag: 'Reference',
  },
  {
    to: '/ai-workloads',
    label: 'AI Workloads',
    description: 'RAG, AI Gateway, and inference patterns — how AI changes every framework step.',
    accent: 'border-waf-performance text-waf-performance',
    tag: 'Reference',
  },
  {
    to: '/troubleshooting',
    label: 'Troubleshooting',
    description: 'Common failure modes for Azure and AI workloads — causes and mitigations.',
    accent: 'border-tier-govern text-tier-govern',
    tag: 'Reference',
  },
  {
    to: '/calculator',
    label: 'Cost Calculator',
    description: 'Build an itemized Azure spend estimate from architectural decisions.',
    accent: 'border-waf-cost text-waf-cost',
    tag: 'Tool',
  },
  {
    to: '/adr',
    label: 'ADR Generator',
    description: 'Capture decisions as a structured Architectural Decision Record.',
    accent: 'border-waf-operations text-waf-operations',
    tag: 'Tool',
  },
  {
    to: '/timeline',
    label: 'Timeline',
    description: 'Generate a Gantt-style engagement timeline by tier and compliance overlay.',
    accent: 'border-tier-scale text-tier-scale',
    tag: 'Tool',
  },
]

const WAF_PILLARS = [
  { label: 'Reliability',            color: 'bg-waf-reliability' },
  { label: 'Security',               color: 'bg-waf-security' },
  { label: 'Cost Optimization',      color: 'bg-waf-cost' },
  { label: 'Operational Excellence', color: 'bg-waf-operations' },
  { label: 'Performance Efficiency', color: 'bg-waf-performance' },
]

const FRAMEWORK_STEPS = stepsData.map(s => ({
  n:        s.number,
  label:    s.title,
  subtitle: s.subtitle,
  pillars:  [...(s.wafPillars.primary ?? []), ...(s.wafPillars.secondary ?? [])].map(p =>
    p.replace('cost-optimization', 'cost').replace('operational-excellence', 'operations').replace('performance-efficiency', 'performance')
  ),
  critical: s.criticalPath ?? false,
  duration: s.duration,
}))

const PILLAR_DOT = {
  reliability:  'bg-waf-reliability',
  security:     'bg-waf-security',
  cost:         'bg-waf-cost',
  operations:   'bg-waf-operations',
  performance:  'bg-waf-performance',
}

export default function Landing() {
  return (
    <div className="max-w-6xl mx-auto px-8 py-12">

      {/* Hero */}
      <div className="mb-16">
        <div className="flex items-center gap-3 mb-6">
          <span className="pillar-badge border-accent text-accent">cloudframework.technologoo.io</span>
        </div>
        <h1 className="font-display text-4xl font-bold text-text-primary mb-4 leading-tight">
          Azure Cloud<br />
          <span className="text-accent">Engagement Framework</span>
        </h1>
        <p className="text-text-secondary text-lg max-w-2xl leading-relaxed font-body">
          A structured methodology for Azure architects. Answer one question:
          <em className="text-text-primary not-italic"> what is the architecturally correct way to engage with Azure
          for this workload, at this scale, under this regulatory posture?</em>
        </p>
        <div className="flex items-center gap-4 mt-6">
          <Link
            to="/engagement-tiers"
            className="inline-flex items-center gap-2 px-4 py-2 bg-accent text-white text-sm font-display font-semibold rounded transition-colors hover:bg-blue-500"
          >
            Start: Choose a Tier
            <ArrowRight />
          </Link>
          <Link
            to="/framework"
            className="inline-flex items-center gap-2 px-4 py-2 border border-border text-text-secondary text-sm font-display hover:text-text-primary hover:border-accent/50 rounded transition-colors"
          >
            View 7-Step Framework
          </Link>
        </div>
      </div>

      {/* Framework step sequence */}
      <section className="mb-16">
        <SectionHeader label="Framework" title="7-Step Engagement Sequence" />
        <div className="grid grid-cols-1 gap-px bg-border border border-border">
          {FRAMEWORK_STEPS.map((step) => (
            <Link
              key={step.n}
              to="/framework"
              className="flex items-start gap-4 bg-surface px-5 py-4 hover:bg-border/30 transition-colors group"
            >
              <span className="font-mono text-text-secondary text-sm w-6 shrink-0 pt-0.5">{step.n}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="font-display text-sm font-semibold text-text-primary group-hover:text-accent transition-colors">
                    {step.label}
                  </span>
                  {step.critical && (
                    <span className="pillar-badge border-warning/60 text-warning text-2xs">Critical path</span>
                  )}
                </div>
                <p className="text-xs text-text-secondary font-mono leading-relaxed">
                  {step.subtitle}
                </p>
                {step.duration && (
                  <div className="flex gap-3 mt-1.5">
                    <span className="text-2xs font-mono text-tier-land">Land <span className="text-text-secondary">{step.duration.land}</span></span>
                    <span className="text-2xs font-mono text-tier-scale">Scale <span className="text-text-secondary">{step.duration.scale}</span></span>
                    <span className="text-2xs font-mono text-tier-govern">Govern <span className="text-text-secondary">{step.duration.govern}</span></span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1 pt-1 shrink-0">
                {step.pillars.map(p => (
                  <span key={p} className={`w-2 h-2 rounded-full ${PILLAR_DOT[p]}`} title={p} />
                ))}
              </div>
            </Link>
          ))}
        </div>
        <p className="mt-2 text-2xs text-text-secondary font-mono">
          Colored dots = WAF pillars covered per step. Full opacity = primary focus · Faded = secondary.
          Step 02 gates IaC design and all downstream steps at Tier 2+.
        </p>
      </section>

      {/* Entry point cards */}
      <section className="mb-16">
        <SectionHeader label="Navigation" title="Where to Go" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-border border border-border">
          {ENTRY_POINTS.map(ep => (
            <Link
              key={ep.to}
              to={ep.to}
              className={`card-hover bg-surface px-5 py-5 flex flex-col gap-3 group border-0 border-t border-border first:border-t-0`}
            >
              <div className="flex items-center justify-between">
                <span className={`pillar-badge ${ep.accent} text-2xs`}>{ep.tag}</span>
              </div>
              <div>
                <h3 className={`font-display text-sm font-semibold mb-1 group-hover:text-accent transition-colors text-text-primary`}>
                  {ep.label}
                </h3>
                <p className="text-xs text-text-secondary font-body leading-relaxed">
                  {ep.description}
                </p>
              </div>
              <span className={`text-xs font-mono flex items-center gap-1 ${ep.accent.split(' ')[1]}`}>
                Open <ArrowRight size={12} />
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Overlays */}
      <section className="mb-8">
        <SectionHeader label="Overlays" title="Applicable to All Framework Steps" />
        <div className="grid grid-cols-2 gap-px bg-border border border-border">
          <div className="bg-surface px-5 py-4">
            <h3 className="font-display text-sm font-semibold text-text-primary mb-1">Regulatory Compliance</h3>
            <p className="text-xs text-text-secondary font-body leading-relaxed mb-3">
              FedRAMP · NIST 800-53 · HIPAA · PCI DSS · SOC 2 · PCAOB · GDPR · CMMC · ISO 27001 · ITAR
            </p>
            <p className="text-2xs font-mono text-text-secondary">
              Each overlay specifies affected Azure regions, required Policy initiatives, step implications, and timeline multiplier by tier.
            </p>
          </div>
          <div className="bg-surface px-5 py-4">
            <h3 className="font-display text-sm font-semibold text-text-primary mb-1">AI Workloads</h3>
            <p className="text-xs text-text-secondary font-body leading-relaxed mb-3">
              RAG · Agentic · Fine-tuning · Batch inference · EU AI Act · LLMOps · Token FinOps
            </p>
            <p className="text-2xs font-mono text-text-secondary">
              AI modifies decisions across all 7 steps. Inference latency, token cost model, and prompt data privacy have no analogues in traditional workloads.
            </p>
          </div>
        </div>
      </section>

    </div>
  )
}

function SectionHeader({ label, title }) {
  return (
    <div className="mb-3">
      <p className="text-2xs font-semibold tracking-widest uppercase text-text-secondary font-display mb-0.5">{label}</p>
      <h2 className="font-display text-base font-semibold text-text-primary">{title}</h2>
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

