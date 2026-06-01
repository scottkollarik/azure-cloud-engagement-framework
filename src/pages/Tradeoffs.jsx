import { useState } from 'react'

// ─── Data ─────────────────────────────────────────────────────────────────────

const TRADEOFFS = [
  {
    tension: 'Reliability ↔ Cost Optimization',
    pillars: ['reliability', 'cost'],
    summary: 'Every additional nine of availability has a non-linear cost. The question is never "how reliable?" — it\'s "what is the cost of this specific failure?"',
    sides: {
      left: {
        label: 'Maximize reliability',
        description: 'Active-active multi-region, zone-redundant every service tier, synchronous geo-replication, automated failover with < 60s RTO, continuous failover testing.',
        whenToAccept: [
          'Compliance mandates it (FedRAMP High, HIPAA BIA requires documented RTO/RPO at system boundary)',
          'Revenue loss during downtime exceeds the annual cost of the redundant infrastructure',
          'Customer SLA contractually commits to 99.99%+',
          'Life-safety or financial settlement systems where downtime = liability',
        ],
        cost: 'Roughly 1.8–2.5× baseline infrastructure cost. Active-active doubles compute and data egress. Failover testing requires dedicated engineering time quarterly.',
      },
      right: {
        label: 'Accept lower redundancy',
        description: 'Single-region with zone redundancy, asynchronous geo-backup (not geo-replication), active-passive with manual failover, RTO measured in minutes to hours.',
        whenToAccept: [
          'Internal tooling, dev/test, or workloads with documented tolerance for 15–60 min outages',
          'Business has no contractual SLA commitment to end users',
          'Workload can tolerate data loss to the last backup (RPO = hours)',
          'Cost of redundancy exceeds annual expected loss from downtime',
        ],
        cost: 'Baseline. Zone-redundant single-region adds ~15–25% over single-zone.',
      },
    },
    businessConversation: 'Ask: "What is the cost to the business of being down for 15 minutes? For 4 hours? For a day?" Then price the gap between passive and active-active. Most clients have never done this math. When they see that active-active costs $180k/year and a day of downtime costs $40k in lost revenue, the answer becomes obvious — unless compliance forces the issue.',
    complianceNote: 'FedRAMP High and HIPAA both require a documented Business Impact Analysis with RTO/RPO. The BIA output, not the architecture preference, must drive the redundancy level. An auditor will ask for test evidence of failover — an active-passive environment that has never been failed over fails the audit.',
    tier: 'govern',
  },
  {
    tension: 'Security ↔ Performance Efficiency',
    pillars: ['security', 'performance'],
    summary: 'Every security control on the data path adds latency. TLS inspection, WAF rule evaluation, Private Endpoint DNS resolution — each adds overhead that compounds in high-throughput or latency-sensitive workloads.',
    sides: {
      left: {
        label: 'Full inspection and zero-trust path',
        description: 'Azure Firewall Premium with IDPS, Application Gateway WAF v2, TLS inspection on all east-west traffic, Private Endpoints for all PaaS, APIM in front of all APIs.',
        whenToAccept: [
          'Regulated workload (FedRAMP, HIPAA, PCI DSS) — IDPS and WAF are required controls',
          'Data exfiltration is a material risk (healthcare PII, financial records, CUI)',
          'Workload is not latency-sensitive — batch processing, async pipelines, back-office',
          'P99 latency SLA is > 500ms, leaving room for inspection overhead',
        ],
        cost: 'Azure Firewall Premium adds ~$2.7/hr for the SKU + data processing fees. WAF v2 adds ~$0.008/RCU/hr. TLS inspection requires certificate management overhead.',
      },
      right: {
        label: 'Selective controls, minimize path overhead',
        description: 'WAF at the perimeter only, no TLS re-inspection east-west, Private Endpoints for sensitive data services only, APIM for external APIs only.',
        whenToAccept: [
          'Interactive latency SLA < 200ms P99 — inspection overhead is meaningful',
          'Internal workload with no direct internet exposure and no regulated data',
          'Dev/test or innovation environments where developer velocity > security rigor',
          'Threat model concludes east-west lateral movement risk is low',
        ],
        cost: 'Lower infrastructure cost. Accepts higher breach detection latency for east-west threats.',
      },
    },
    businessConversation: '"Your WAF and firewall will add 15–40ms to every user request. For your public-facing app with a 2s page load budget, that\'s invisible. For your trading API with a 50ms SLA, it\'s a 30–80% latency hit." Walk the client through the data path and price each control individually. Never present security controls as a flat "on/off" — present them as path decisions with measured overhead.',
    complianceNote: 'PCI DSS 4.0 and FedRAMP High require network-level intrusion detection on cardholder and CUI data environments. Turning off IDPS to hit a latency target is not a valid tradeoff when the workload is in scope — it is a compliance gap.',
    tier: 'scale',
  },
  {
    tension: 'Security ↔ Operational Simplicity',
    pillars: ['security', 'operations'],
    summary: 'Zero-trust access models (PIM, JIT, Conditional Access, MFA) reduce standing access and lateral movement surface — but they add friction for engineers who need to move quickly during incidents.',
    sides: {
      left: {
        label: 'Full zero-trust, no standing access',
        description: 'PIM with approval workflow for all privileged roles, JIT VM access via Azure Bastion, no persistent service principal secrets (OIDC only), Conditional Access requiring compliant device + MFA for all Azure portal access.',
        whenToAccept: [
          'Regulated workload — FedRAMP, CMMC, and HIPAA all require least-privilege and access logging',
          'Platform team is mature and has runbooks for JIT escalation during incidents',
          'Audit logging of all privileged access is a contractual or regulatory requirement',
          'Insider threat is a documented risk in the threat model',
        ],
        cost: 'Higher operational overhead. Incident response is slower when privileged access requires an approval workflow. Requires trained platform team.',
      },
      right: {
        label: 'Pragmatic access, MFA minimum',
        description: 'RBAC with least-privilege built-in roles, MFA enforced via Conditional Access, no PIM for non-privileged roles, service principals with short-lived certificates rather than OIDC.',
        whenToAccept: [
          'Small team where PIM approval workflow would be self-approving anyway',
          'Land-tier engagement where governance overhead outweighs risk profile',
          'Non-regulated workload with low data classification',
          'Early-stage build where access model will be hardened at Scale/Govern',
        ],
        cost: 'Accepts higher standing access risk. Standing Owner/Contributor assignments are a common audit finding at Govern tier.',
      },
    },
    businessConversation: '"If one of your engineers gets phished and their credentials are compromised, how far can an attacker get? With standing Contributor access, the answer is: everything in the subscription. With PIM, the answer is: nothing until they socially engineer an approval, which creates an audit trail." Frame it as blast radius, not bureaucracy.',
    complianceNote: 'CMMC Level 2/3 and FedRAMP require access control enforcement and audit logging. Entra ID PIM activation logs satisfy the access review requirement. A workload that reaches Govern tier without PIM will require a significant remediation effort at the first compliance assessment.',
    tier: 'govern',
  },
  {
    tension: 'Managed PaaS ↔ Infrastructure Control (IaaS)',
    pillars: ['operations', 'cost'],
    summary: 'Managed services trade control for operational simplicity. The right choice depends on whether the client\'s engineering team has the capacity to own what they\'re buying.',
    sides: {
      left: {
        label: 'PaaS-first (managed services)',
        description: 'App Service, Azure SQL, Azure Cache for Redis, Azure Service Bus — Microsoft manages patching, HA, failover, and capacity for the underlying infrastructure.',
        whenToAccept: [
          'Team lacks the capacity to manage OS patching, container orchestration, or database failover',
          'Time-to-value matters more than customization — PaaS deployments are days, not weeks',
          'Workload does not have custom OS or runtime requirements that PaaS cannot satisfy',
          'Compliance requires current patching — PaaS eliminates the patch compliance burden',
        ],
        cost: 'Higher per-unit cost than equivalent IaaS. Accepts constraints on runtime configuration and scaling behavior.',
      },
      right: {
        label: 'IaaS / self-managed (VMs, AKS, custom)',
        description: 'VMs, AKS (self-managed node pools), self-hosted databases — full control over OS, runtime, configuration, and scaling policy.',
        whenToAccept: [
          'Existing application requires a specific OS version, runtime, or dependency that PaaS cannot provide',
          'Platform engineering team has the capacity to own patching, upgrades, and incident response',
          'Multi-cloud portability is a hard requirement — PaaS creates Azure coupling',
          'Workload has custom scheduling, GPU, or hardware affinity requirements',
        ],
        cost: 'Lower infrastructure unit cost, much higher operational cost (engineering time). OS vulnerability management is now the client\'s responsibility.',
      },
    },
    businessConversation: '"App Service costs $200/month more than running the same app on a VM. But your team spends 8 hours a month on OS patching, vulnerability scanning, and failover testing for that VM. At $150/hour blended engineering cost, the VM is $1,200/month more expensive in engineering time alone." Total cost of ownership, not just compute cost, drives this decision.',
    complianceNote: 'FedRAMP and HIPAA require documented patch management processes with SLA. PaaS services carry Microsoft\'s FedRAMP authorization (check the FedRAMP Marketplace). IaaS VMs require the client to maintain their own patch compliance evidence.',
    tier: 'land',
  },
  {
    tension: 'Data Residency ↔ Performance (CDN / Edge)',
    pillars: ['security', 'performance'],
    summary: 'Regulations requiring data to remain in a specific geography conflict with performance architectures that distribute data and compute to edge locations closer to users.',
    sides: {
      left: {
        label: 'Strict data residency',
        description: 'Data stays in designated regions only. No CDN caching of dynamic or personalized content. Azure Front Door used for routing and DDoS only, not caching. Storage geo-replication disabled or constrained to paired region within same data boundary.',
        whenToAccept: [
          'GDPR Article 46 — personal data cannot leave the EU without adequate safeguards',
          'ITAR — controlled technical data cannot be stored or processed outside the US',
          'Sovereign cloud requirements (Azure Government, Azure China) — data must remain on isolated infrastructure',
          'Contractual data processing agreements specify a single region',
        ],
        cost: 'Higher latency for geographically distributed users. Users in regions far from the data residency zone experience 100–300ms additional round-trip time.',
      },
      right: {
        label: 'Global distribution, edge caching',
        description: 'Azure Front Door with global CDN caching, Cosmos DB multi-region writes, Azure Static Web Apps global distribution, Redis Cache regional replicas.',
        whenToAccept: [
          'Public-facing content with global user base and no PII in cached responses',
          'No regulatory data residency requirement',
          'Static or semi-static content that can be safely cached at edge without sovereignty risk',
          'Latency SLA requires sub-100ms globally',
        ],
        cost: 'Higher data egress cost across regions. Cosmos DB multi-region writes are charged per RU per region.',
      },
    },
    businessConversation: '"Your EU users are 180ms away from East US. With Azure Front Door caching static content in Frankfurt, that\'s 12ms. But your user profile API returns PII — if that response gets cached in Frankfurt, you\'ve violated GDPR Article 5(1)(f). We can cache everything except the authenticated API calls." Segment the content types. Edge performance and data residency are not mutually exclusive — they just require careful routing rules.',
    complianceNote: 'GDPR and ITAR are hard constraints, not tradeoffs. No performance argument justifies violating data residency requirements. The architecture must be designed around the constraint, not the constraint relaxed for the architecture.',
    tier: 'govern',
  },
  {
    tension: 'Consistency ↔ Availability (Distributed Data)',
    pillars: ['reliability', 'performance'],
    summary: 'In distributed databases, stronger consistency guarantees require synchronous coordination across replicas — adding latency and reducing throughput. Weaker consistency is faster but accepts the possibility of stale reads.',
    sides: {
      left: {
        label: 'Strong consistency',
        description: 'Cosmos DB: Strong consistency level — reads always return the most recent committed write. All replicas must acknowledge before write completes. Azure SQL: synchronous geo-replication (Business Critical tier).',
        whenToAccept: [
          'Financial transactions, inventory, or any data where stale reads create business errors',
          'Audit and compliance logs — a log entry that disappears due to eventual consistency is a compliance failure',
          'Multi-tenant SaaS where one tenant\'s write must be visible to all nodes before the next read',
          'Healthcare records — a clinician reading stale medication data is a patient safety issue',
        ],
        cost: 'Higher RU cost (Cosmos DB charges more per operation for Strong/Bounded-Staleness). Higher write latency as replica count increases.',
      },
      right: {
        label: 'Eventual / session consistency',
        description: 'Cosmos DB: Session consistency (default) or Eventual. Session guarantees read-your-own-writes within a session. Eventual is fastest but allows different clients to see different states temporarily.',
        whenToAccept: [
          'Content feeds, notification counts, leaderboards — stale by seconds is acceptable',
          'Read-heavy workloads where the majority of operations are non-critical reads',
          'High-throughput ingestion pipelines where write latency is the bottleneck',
          'Global workloads where network round-trip for Strong consistency adds 100–400ms',
        ],
        cost: 'Lower RU cost, lower latency. Accepts temporary divergence between replicas — application must handle stale reads gracefully.',
      },
    },
    businessConversation: '"Your shopping cart needs to know the exact inventory count before confirming a purchase — that\'s Strong consistency. Your product catalog showing 4.2 stars vs 4.3 stars because a review hasn\'t replicated yet — that\'s fine with Eventual. Design consistency at the data entity level, not the database level."',
    complianceNote: 'HIPAA and PCI DSS do not specify consistency models by name, but they require data integrity. An audit finding that a payment record was temporarily unavailable due to replication lag would need to be documented and mitigated.',
    tier: 'scale',
  },
  {
    tension: 'Horizontal Scale-Out ↔ Vertical Scale-Up',
    pillars: ['reliability', 'cost'],
    summary: 'Scale-out (more instances) provides fault isolation and linear cost scaling but adds orchestration complexity. Scale-up (bigger instances) is simpler but creates a single point of failure and hits hard resource limits.',
    sides: {
      left: {
        label: 'Horizontal scale-out',
        description: 'AKS with Horizontal Pod Autoscaler + Cluster Autoscaler, App Service with auto-scale rules, stateless application design with shared session state (Redis), VMSS for compute-intensive workloads.',
        whenToAccept: [
          'Workload is stateless or can be made stateless — sticky sessions are the enemy of horizontal scale',
          'Traffic is variable and bursty — scale-out provides cost efficiency during low traffic',
          'High availability is required — losing one of 10 pods is graceful, losing the one big VM is an outage',
          'Workload has been profiled and the bottleneck is parallelizable',
        ],
        cost: 'Orchestration complexity (AKS, VMSS, load balancer). Application must be designed for stateless operation.',
      },
      right: {
        label: 'Vertical scale-up',
        description: 'Larger VM SKU, higher-tier App Service Plan, Premium Cosmos DB RU provisioning — more resources per instance.',
        whenToAccept: [
          'Monolithic application that cannot be made stateless without significant refactoring',
          'Lift-and-shift migration where the application was designed for a single server',
          'Database bottleneck — SQL elastic pools and DTU scaling are vertical',
          'Short-term fix while stateless refactor is planned',
        ],
        cost: 'Simple to operate. Hits hard limits (VM SKU maximum). Not fault-tolerant — scale-up does not eliminate the single instance as a failure domain.',
      },
    },
    businessConversation: '"Your application can handle 500 concurrent users on one $400/month VM. On two $200/month VMs behind a load balancer it handles the same load and survives a single VM failure. But your session state is stored in memory — the moment we add a second server, sessions break. Which is the real project: right-sizing the VM or refactoring session state?" Often the correct answer is scale-up now, refactor to scale-out later.',
    complianceNote: null,
    tier: 'scale',
  },
]

const PILLAR_COLORS = {
  reliability:  'text-waf-reliability border-waf-reliability/40',
  security:     'text-waf-security border-waf-security/40',
  cost:         'text-waf-cost border-waf-cost/40',
  operations:   'text-waf-operations border-waf-operations/40',
  performance:  'text-waf-performance border-waf-performance/40',
}

const PILLAR_LABELS = {
  reliability:  'Reliability',
  security:     'Security',
  cost:         'Cost Optimization',
  operations:   'Operational Excellence',
  performance:  'Performance Efficiency',
}

const TIER_CLASSES = {
  land:   'border-tier-land text-tier-land',
  scale:  'border-tier-scale text-tier-scale',
  govern: 'border-tier-govern text-tier-govern',
}

const TIER_LABELS = { land: 'Land+', scale: 'Scale+', govern: 'Govern' }

// ─── Sub-components ───────────────────────────────────────────────────────────

function ChevronIcon({ open }) {
  return (
    <svg
      className={`w-4 h-4 text-text-secondary transition-transform duration-150 shrink-0 ${open ? 'rotate-180' : ''}`}
      fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
    >
      <path strokeLinecap="square" d="M6 9l6 6 6-6" />
    </svg>
  )
}

function SectionLabel({ children }) {
  return (
    <p className="text-2xs font-semibold tracking-widest uppercase text-text-secondary font-display mb-2">
      {children}
    </p>
  )
}

function TradeoffCard({ item }) {
  const [open, setOpen] = useState(false)

  return (
    <div className={`border bg-surface transition-colors ${open ? 'border-accent/30' : 'border-border hover:border-border/80'}`}>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full text-left px-5 py-4 flex items-start gap-3"
      >
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <span className={`font-display text-sm font-semibold transition-colors ${open ? 'text-accent' : 'text-text-primary'}`}>
              {item.tension}
            </span>
            <span className={`pillar-badge text-2xs ${TIER_CLASSES[item.tier]}`}>
              {TIER_LABELS[item.tier]}
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {item.pillars.map(p => (
              <span key={p} className={`pillar-badge text-2xs ${PILLAR_COLORS[p]}`}>
                {PILLAR_LABELS[p]}
              </span>
            ))}
          </div>
        </div>
        <ChevronIcon open={open} />
      </button>

      {open && (
        <div className="border-t border-border bg-canvas/60 px-5 pb-6 pt-5 space-y-6">

          {/* Summary */}
          <p className="text-sm text-text-secondary font-body leading-relaxed">{item.summary}</p>

          {/* Two sides */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[item.sides.left, item.sides.right].map(side => (
              <div key={side.label} className="border border-border bg-surface p-4 space-y-3">
                <p className="text-xs font-semibold font-display text-text-primary">{side.label}</p>
                <p className="text-xs text-text-secondary font-body leading-relaxed">{side.description}</p>
                <div>
                  <SectionLabel>Accept when</SectionLabel>
                  <ul className="space-y-1.5">
                    {side.whenToAccept.map((w, i) => (
                      <li key={i} className="flex gap-2 text-xs text-text-secondary font-body leading-relaxed">
                        <span className="text-tier-govern shrink-0 font-mono pt-px select-none">→</span>
                        {w}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="border-l-2 border-border pl-3 py-0.5">
                  <p className="text-2xs font-mono text-text-secondary leading-relaxed">{side.cost}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Business conversation */}
          <div>
            <SectionLabel>Business Conversation</SectionLabel>
            <div className="border-l-2 border-accent/50 pl-4 py-1">
              <p className="text-xs text-text-secondary font-body leading-relaxed italic">{item.businessConversation}</p>
            </div>
          </div>

          {/* Compliance note */}
          {item.complianceNote && (
            <div>
              <SectionLabel>Compliance Forcing Function</SectionLabel>
              <div className="border-l-2 border-waf-security/50 pl-4 py-1">
                <p className="text-xs text-text-secondary font-body leading-relaxed">{item.complianceNote}</p>
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Tradeoffs() {
  return (
    <div className="max-w-5xl mx-auto px-8 py-12 space-y-14">

      {/* Header */}
      <div>
        <p className="text-2xs font-semibold tracking-widest uppercase text-text-secondary font-display mb-1">
          Reference
        </p>
        <h1 className="font-display text-3xl font-bold text-text-primary mb-3">
          Architecture Tradeoffs
        </h1>
        <p className="text-text-secondary font-body text-sm leading-relaxed max-w-2xl">
          Real architectural decisions involve competing objectives. This reference covers the tensions
          that come up in every engagement — framed as business conversations, not just technical comparisons.
          Compliance forcing functions are called out separately where they override the tradeoff.
        </p>
      </div>

      <section>
        <div className="space-y-2">
          {TRADEOFFS.map(item => (
            <TradeoffCard key={item.tension} item={item} />
          ))}
        </div>
      </section>

    </div>
  )
}
