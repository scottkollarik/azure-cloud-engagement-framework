import { Link } from 'react-router-dom'

const ENTRY_POINTS = [
  {
    to: '/engagement-tiers',
    label: 'Engagement Tiers',
    description: 'Land · Scale · Govern — scope the engagement depth by workload complexity and regulatory posture.',
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
    label: 'WAF Patterns',
    description: 'Reusable implementation patterns indexed by WAF pillar, tier, and compliance overlay.',
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
    to: '/application-patterns',
    label: 'Application Patterns',
    description: 'Modular monolith, microservices, event-driven, CQRS, API gateway — a Step 01 decision that determines the identity and security surface area Step 02 must secure.',
    accent: 'border-waf-reliability text-waf-reliability',
    tag: 'Design Guide',
  },
  {
    to: '/microservices-design',
    label: 'Microservices Design',
    description: 'Service boundary decomposition, AKS vs Container Apps, inter-service auth, communication patterns, and the prerequisite check before committing to the pattern.',
    accent: 'border-waf-reliability text-waf-reliability',
    tag: 'Design Guide',
  },
  {
    to: '/identity-design',
    label: 'Identity Design',
    description: 'Managed identities, Workload Identity Federation, RBAC scoping, PIM, and Conditional Access — designed in Step 02 before a line of application code is written.',
    accent: 'border-waf-security text-waf-security',
    tag: 'Design Guide',
  },
  {
    to: '/network-design',
    label: 'Network Design',
    description: 'VNet topology, CIDR planning, NSG design, Private Endpoints, and hub-spoke vs flat vs Virtual WAN — the topology that follows identity boundary design.',
    accent: 'border-waf-operations text-waf-operations',
    tag: 'Design Guide',
  },
  {
    to: '/observability-design',
    label: 'Observability Design',
    description: 'Logs, metrics, and traces as security controls — Sentinel integration, alerting severity tiers, log retention by compliance overlay, and why observability is a Step 02 concern.',
    accent: 'border-waf-security text-waf-security',
    tag: 'Design Guide',
  },
  {
    to: '/tradeoffs',
    label: 'Tradeoffs',
    description: 'Competing objectives framed as business conversations — reliability vs cost, security vs performance, and more.',
    accent: 'border-waf-cost text-waf-cost',
    tag: 'Reference',
  },
  {
    to: '/iac',
    label: 'IaC Reference',
    description: 'Bicep vs Terraform decision matrix, module structure, state management, pipeline patterns, and testing.',
    accent: 'border-waf-operations text-waf-operations',
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
  { label: 'Reliability',            color: 'bg-waf-reliability',  cls: 'text-waf-reliability border-waf-reliability/40',  desc: 'Uptime, fault isolation, recovery objectives' },
  { label: 'Security',               color: 'bg-waf-security',     cls: 'text-waf-security border-waf-security/40',         desc: 'Identity, data protection, threat detection' },
  { label: 'Cost Optimization',      color: 'bg-waf-cost',         cls: 'text-waf-cost border-waf-cost/40',                 desc: 'Right-sizing, reserved capacity, waste elimination' },
  { label: 'Operational Excellence', color: 'bg-waf-operations',   cls: 'text-waf-operations border-waf-operations/40',     desc: 'Observability, deployment safety, runbooks' },
  { label: 'Performance Efficiency', color: 'bg-waf-performance',  cls: 'text-waf-performance border-waf-performance/40',   desc: 'Latency, throughput, scaling architecture' },
]


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
      </div>

      {/* WAF definition */}
      <section className="mb-16">
        <SectionHeader label="Foundation" title="Azure Well-Architected Framework (WAF)" />
        <p className="text-sm text-text-secondary font-body leading-relaxed mb-4 max-w-2xl">
          The WAF is Microsoft's five-pillar evaluation framework for Azure workloads. Every pattern,
          reference architecture, and framework step in this tool is tagged against one or more pillars.
          Pillar colors appear consistently throughout.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-px bg-border border border-border">
          {WAF_PILLARS.map(p => (
            <div key={p.label} className="bg-surface px-4 py-4">
              <div className="flex items-center gap-2 mb-2">
                <span className={`w-2.5 h-2.5 rounded-full ${p.color} shrink-0`} />
                <span className={`pillar-badge text-2xs ${p.cls}`}>{p.label}</span>
              </div>
              <p className="text-xs text-text-secondary font-body leading-relaxed">{p.desc}</p>
            </div>
          ))}
        </div>
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
                Open →
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


