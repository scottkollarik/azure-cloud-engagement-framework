import { useState, Fragment } from 'react'
import { Link } from 'react-router-dom'
import { hl } from '../utils/hl'

const CONCEPTS = [
  {
    term: 'Bounded Context',
    abbr: 'BC',
    color: 'border-waf-operations text-waf-operations',
    def: 'The boundary within which a domain model is internally consistent. The primary unit of decomposition — one bounded context maps to one service. Derived from Event Storming, not from technical layer analysis. See App Patterns for DDD primer.',
  },
  {
    term: 'Saga Pattern',
    abbr: 'Saga',
    color: 'border-waf-reliability text-waf-reliability',
    def: 'Manages distributed transactions across services without two-phase commit. Choreography-based (services react to events) or orchestration-based (a coordinator issues commands). Choose choreography for loose coupling; orchestration when visibility into the transaction state is required.',
  },
  {
    term: 'Service Mesh',
    abbr: 'Mesh',
    color: 'border-waf-security text-waf-security',
    def: 'Infrastructure layer for service-to-service communication — mTLS encryption, retries, circuit breaking, observability — without application code changes. Dapr is the Azure-native option; Istio/Linkerd for AKS if the team has existing expertise.',
  },
  {
    term: 'API Gateway',
    abbr: 'APIM',
    color: 'border-waf-security text-waf-security',
    def: 'North-south entry point for external consumers. Handles auth, rate limiting, versioning, and routing. Does not replace a service mesh — APIM is for external traffic; the mesh handles east-west (service-to-service) traffic.',
  },
  {
    term: 'Distributed Tracing',
    abbr: 'OTel',
    color: 'border-waf-performance text-waf-performance',
    def: 'OpenTelemetry with W3C TraceContext (traceparent header) propagated by every service. One service missing traceparent silently breaks the trace graph. Non-negotiable at Scale and Govern — see Observability Design for full instrumentation strategy.',
  },
  {
    term: 'Workload Identity',
    abbr: 'WIF',
    color: 'border-waf-security text-waf-security',
    def: 'One managed identity per service — never a shared identity. Workload Identity Federation for service-to-service calls; no client secrets in environment variables or config maps. See Identity Design for full identity pattern reference.',
  },
]

const PLATFORM_TABLE = [
  { dimension: 'Control plane',         aks: 'You manage',                                          aca: 'Microsoft managed' },
  { dimension: 'Scaling',               aks: 'HPA + KEDA + custom',                                 aca: 'KEDA built-in, automatic' },
  { dimension: 'Networking',            aks: 'Full VNet integration, custom CNI',                    aca: 'VNet integration, limited CNI choice' },
  { dimension: 'Service mesh',          aks: 'Istio add-on, Linkerd, Dapr',                         aca: 'Dapr built-in' },
  { dimension: 'Workload Identity',     aks: 'Azure AD Workload Identity (webhook)',                 aca: 'Built-in managed identity per app' },
  { dimension: 'GPU / specialized nodes', aks: 'Supported',                                         aca: 'Not supported' },
  { dimension: 'Multi-tenancy',         aks: 'Namespace isolation',                                  aca: 'Environment isolation' },
  { dimension: 'Operational overhead',  aks: 'High — platform engineering required',                 aca: 'Low — focus on application' },
  { dimension: 'Choose when',           aks: 'Advanced networking, custom admission controllers, GPU workloads, existing AKS investment', aca: 'Greenfield microservices, event-driven scale, team without platform engineering capacity' },
]

const COMM_PATTERNS = [
  {
    id: 'sync',
    label: 'Synchronous (HTTP/gRPC)',
    tagline: 'Request-response for queries and commands requiring immediate acknowledgment',
    tiers: ['scale', 'govern'],
    when: 'A service needs an immediate response — read operations, real-time validation, user-facing API calls where latency matters. gRPC preferred for internal service-to-service over HTTP/1.1 for efficiency and strong typing.',
    how: [
      'Use a service mesh (Dapr, Istio) for mTLS, retries, and circuit breaking — do not reimplement these in application code',
      'Propagate W3C TraceContext (traceparent header) on every outbound call — missing this breaks distributed trace correlation',
      'Circuit breaker pattern: fail fast when a downstream service is degraded rather than cascading the failure upstream',
      'Health endpoints on every service: /health/live (is the process running) and /health/ready (is it ready to serve traffic)',
    ],
    never: 'Chain more than 2–3 synchronous hops for a single user request — each hop adds latency and a failure point; redesign as async if the chain is longer.',
  },
  {
    id: 'async',
    label: 'Asynchronous (Events / Messages)',
    tagline: 'Decoupled communication for workflows that do not require immediate response',
    tiers: ['scale', 'govern'],
    when: 'Background processing, fan-out to multiple consumers, workflows where producer and consumer do not need to be simultaneously available. Service Bus for transactional workflows; Event Hubs for high-throughput streaming. See App Patterns for messaging backbone selection.',
    how: [
      'Each service owns its own producer identity (Service Bus Data Sender role) and its own consumer identity (Service Bus Data Receiver role) — never shared',
      'Design dead letter queue handling before go-live — unprocessed messages need a documented destination and a runbook',
      'Idempotent consumers: at-least-once delivery means the same message may arrive twice; consumers must handle duplicates without side effects',
      'Outbox pattern for transactional consistency: write the event to a local outbox table in the same database transaction as the state change, then relay to the message bus',
    ],
    never: 'Use async messaging as a workaround for a synchronous design that has latency problems — fix the latency problem; don\'t hide it behind a queue.',
  },
  {
    id: 'dapr',
    label: 'Dapr (Distributed Application Runtime)',
    tagline: 'Azure-native sidecar abstraction for service mesh, state, pub/sub, and bindings',
    tiers: ['scale', 'govern'],
    when: 'Greenfield microservices on AKS or Container Apps where you want service mesh capabilities (mTLS, retries, distributed tracing) without managing Istio or Linkerd. Dapr is built into Container Apps; on AKS it is a cluster add-on.',
    how: [
      'Dapr sidecar handles service-to-service invocation, state management, pub/sub, and secret retrieval — application code calls the Dapr API on localhost',
      'mTLS between all Dapr sidecars by default — no application-level TLS configuration required',
      'Dapr state stores: Azure Cosmos DB and Azure Cache for Redis are the recommended backends',
      'Dapr secret store: Azure Key Vault component eliminates direct Key Vault SDK calls from application code',
    ],
    never: 'Use Dapr and a separate service mesh simultaneously — double sidecar injection creates network complexity with no benefit.',
  },
]

const TIER_TOPOLOGY = [
  {
    tier: 'land',
    cls: 'text-tier-land border-tier-land',
    dot: 'bg-tier-land',
    items: [
      'Microservices is rarely the right choice at Land tier',
      'If required: 2–3 services maximum; Container Apps over AKS; no service mesh yet',
      'Shared Log Analytics Workspace; single App Insights instance per service',
      'Accept higher coupling at Land — refactor to proper boundaries at Scale',
    ],
  },
  {
    tier: 'scale',
    cls: 'text-tier-scale border-tier-scale',
    dot: 'bg-tier-scale',
    items: [
      '3–15 services; AKS or Container Apps with Dapr',
      'One managed identity per service; Workload Identity Federation for all CI/CD',
      'Hub-Spoke network topology; Private Endpoints for all data stores',
      'OpenTelemetry instrumentation on every service; Sentinel connected',
      'Per-service CI/CD pipelines; independent deployment cadence enforced',
    ],
  },
  {
    tier: 'govern',
    cls: 'text-tier-govern border-tier-govern',
    dot: 'bg-tier-govern',
    items: [
      '15+ services; dedicated platform engineering team',
      'AKS with full GitOps (Flux or ArgoCD); Dapr or Istio service mesh',
      'Azure Virtual WAN or mature Hub-Spoke; Azure Firewall Premium',
      'Dedicated Sentinel workspace; SOAR playbooks for automated response',
      'Service catalog (Azure API Center or internal); dependency matrix documented',
    ],
  },
]

const ANTI_PATTERNS = [
  'Distributed monolith — services that share a database or call each other synchronously for every operation; all the operational cost of microservices, none of the independence benefit',
  'Nano-services — decomposition so fine-grained that every operation crosses a network boundary; latency and operational overhead replace the coupling you were trying to eliminate',
  'Microservices before domain clarity — service boundaries drawn before Event Storming produces services aligned to technical layers; the result is a rewrite when the domain becomes clear',
  'Skipping distributed tracing — without OpenTelemetry and W3C TraceContext propagated by every service, production debugging requires log archaeology across N separate log streams',
  'Shared database between services — the most reliable indicator of a distributed monolith; schema changes in the shared database require coordinating all teams simultaneously, eliminating independent deployment',
  'One CI/CD pipeline for all services — negates independent deployability; a failing test in one service blocks the release of all others',
  'No platform engineering investment — microservices operational overhead (cluster management, service mesh, observability stack, certificate rotation) must be owned by someone; teams that absorb this on top of feature delivery slow to a halt',
]

const TIER_LABELS = { land: 'Land', scale: 'Scale', govern: 'Govern' }
const TIER_CLASSES = {
  land:   'border-tier-land text-tier-land',
  scale:  'border-tier-scale text-tier-scale',
  govern: 'border-tier-govern text-tier-govern',
}

const DECOMP_RULES = [
  'A service owns its data — no shared databases between services. If two services need the same data, one publishes events the other subscribes to, or one exposes an API the other calls.',
  'A service is the size of a team — not a function, not a microfunction. If one engineer can hold the entire service in their head, the boundary is probably right.',
  'Break boundaries on pain, not prediction — start with fewer, larger services and split when you feel the coordination friction. Premature decomposition is as damaging as no decomposition.',
  'Version APIs explicitly — consumers on v1 should not break when v2 ships. API Management versioning handles this at the gateway; semantic versioning in the service contract handles it internally.',
]

export default function MicroservicesDesign() {
  const [open, setOpen] = useState(null)

  return (
    <div className="max-w-6xl mx-auto px-8 py-12">

      {/* Header */}
      <div className="mb-10">
        <p className="text-2xs font-semibold tracking-widest uppercase text-text-secondary font-display mb-1">Design Guide</p>
        <h1 className="font-display text-3xl font-bold text-text-primary mb-4">Microservices Design</h1>
        <div className="border border-waf-reliability/30 bg-surface px-6 py-5 max-w-3xl">
          <p className="text-2xs font-semibold uppercase tracking-widest text-waf-reliability font-display mb-2">Step 01 · Scale and Govern Tiers</p>
          <p className="text-sm font-body text-text-primary leading-relaxed">
            {hl('Microservices is a Step 01 architectural decision with the highest operational overhead of any pattern. It is the right answer when Conway\'s Law demands it — multiple teams needing independent deployment cadence — and the wrong answer when it is chosen for technical ambition rather than organizational necessity. Every complexity described on this page is cost paid continuously, not once.')}
          </p>
        </div>
      </div>

      {/* Section 1: Prerequisite Check */}
      <div className="border border-waf-cost/30 bg-surface px-6 py-5 max-w-3xl mb-10">
        <p className="text-2xs font-semibold uppercase tracking-widest text-waf-cost font-display mb-3">Prerequisite Check</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <p className="text-xs font-semibold font-display text-waf-reliability mb-2">Proceed with microservices if...</p>
            <ul className="space-y-2">
              {[
                'More than one team needs to ship independently without coordinating releases',
                'Services have genuinely different scaling requirements today, not hypothetically',
                'You have a platform engineering function to own the container platform and observability stack',
                'Domain boundaries are clear from Event Storming — bounded contexts are identifiable',
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-xs font-body text-text-secondary leading-snug">
                  <span className="mt-1.5 w-1 h-1 rounded-full bg-waf-reliability shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-xs font-semibold font-display text-waf-security mb-2">Use a modular monolith instead if...</p>
            <ul className="space-y-2">
              {[
                'Single team or team under ~15 engineers',
                'Domain boundaries are unclear — extract services when they crystallize, not before',
                'No dedicated platform engineering capacity — microservices operational overhead will consume the feature team',
                'Microservices is the destination but requirements are still evolving — start with a well-structured monolith and migrate',
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-xs font-body text-text-secondary leading-snug">
                  <span className="mt-1.5 w-1 h-1 rounded-full bg-waf-security shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
        <p className="mt-4 text-xs font-body text-text-secondary">
          <Link to="/application-patterns" className="text-accent hover:underline">See App Patterns for full pattern comparison →</Link>
        </p>
      </div>

      {/* Section 2: Core Concepts */}
      <section className="mb-10">
        <SectionHeader label="Building Blocks" title="Core Concepts" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-border border border-border">
          {CONCEPTS.map(c => (
            <div key={c.term} className="bg-surface px-5 py-4">
              <div className="flex items-center gap-2 mb-2">
                <span className={`pillar-badge text-2xs ${c.color}`}>{c.abbr}</span>
                <span className="font-display text-sm font-semibold text-text-primary">{c.term}</span>
              </div>
              <p className="text-xs font-body text-text-secondary leading-relaxed">{c.def}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Section 3: AKS vs Container Apps */}
      <section className="mb-10">
        <SectionHeader label="Platform Decision" title="AKS vs Azure Container Apps" />
        <p className="text-xs text-text-secondary font-body mb-3 max-w-2xl leading-relaxed">
          The container platform decision is made in Step 01 and is difficult to reverse. AKS gives full control and full operational responsibility. Container Apps abstracts the cluster and is the right default unless AKS-specific capabilities are required.
        </p>
        <div className="border border-border overflow-x-auto">
          <div className="grid grid-cols-[1.5fr_1fr_1fr] min-w-[500px]">
            {['Dimension', 'AKS', 'Container Apps'].map(h => (
              <div key={h} className="bg-surface border-b border-border px-4 py-2.5">
                <span className="text-2xs font-semibold uppercase tracking-widest text-text-primary font-display">{h}</span>
              </div>
            ))}
            {PLATFORM_TABLE.map((row, idx) => (
              <Fragment key={idx}>
                <div className={`px-4 py-3 ${idx < PLATFORM_TABLE.length - 1 ? 'border-b border-border' : ''} ${idx % 2 === 0 ? 'bg-surface' : 'bg-canvas/40'}`}>
                  <span className="text-xs font-body text-text-primary">{row.dimension}</span>
                </div>
                <div className={`px-4 py-3 ${idx < PLATFORM_TABLE.length - 1 ? 'border-b border-border' : ''} ${idx % 2 === 0 ? 'bg-surface' : 'bg-canvas/40'}`}>
                  <span className="text-xs font-body text-text-secondary leading-snug">{row.aks}</span>
                </div>
                <div className={`px-4 py-3 ${idx < PLATFORM_TABLE.length - 1 ? 'border-b border-border' : ''} ${idx % 2 === 0 ? 'bg-surface' : 'bg-canvas/40'}`}>
                  <span className="text-xs font-body text-text-secondary leading-snug">{row.aca}</span>
                </div>
              </Fragment>
            ))}
          </div>
        </div>
      </section>

      {/* Section 4: Communication Patterns */}
      <section className="mb-10">
        <SectionHeader label="Implementation" title="Communication Patterns" />
        <div className="flex flex-col gap-px bg-border border border-border">
          {COMM_PATTERNS.map(p => (
            <div key={p.id} className="bg-canvas">
              <button
                onClick={() => setOpen(open === p.id ? null : p.id)}
                className="w-full bg-surface px-5 py-4 flex items-start sm:items-center justify-between gap-4 text-left hover:bg-border/20 transition-colors"
              >
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 min-w-0">
                  <span className="font-display text-sm font-semibold text-text-primary shrink-0">{p.label}</span>
                  <span className="text-xs text-text-secondary font-body leading-snug">{p.tagline}</span>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="flex gap-1.5">
                    {p.tiers.map(t => (
                      <span key={t} className={`pillar-badge text-2xs ${TIER_CLASSES[t]}`}>{TIER_LABELS[t]}</span>
                    ))}
                  </div>
                  <span className="text-text-secondary font-mono text-xs w-3 text-right">{open === p.id ? '−' : '+'}</span>
                </div>
              </button>

              {open === p.id && (
                <div className="border-t border-border px-6 py-5">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div>
                      <p className="text-2xs font-semibold uppercase tracking-widest text-text-secondary font-display mb-2">When to use</p>
                      <p className="text-xs font-body text-text-secondary leading-relaxed mb-4">{hl(p.when)}</p>
                      <p className="text-2xs font-semibold uppercase tracking-widest text-text-secondary font-display mb-2">How</p>
                      <ul className="space-y-1.5">
                        {p.how.map((step, i) => (
                          <li key={i} className="flex items-start gap-2 text-xs font-body text-text-primary leading-snug">
                            <span className="mt-1.5 w-1 h-1 rounded-full bg-waf-reliability shrink-0" />
                            {hl(step)}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="border-l-2 border-waf-reliability/30 pl-4">
                      <p className="text-2xs font-semibold uppercase tracking-widest text-waf-reliability font-display mb-2">Never</p>
                      <p className="text-xs font-body text-text-secondary leading-relaxed">{hl(p.never)}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Section 5: Decomposition Guidance */}
      <section className="mb-10">
        <SectionHeader label="Service Boundaries" title="How to Draw the Lines" />
        <div className="border border-border bg-surface px-6 py-5 max-w-3xl">
          <p className="text-xs font-body text-text-secondary leading-relaxed mb-4">
            {hl('Run an Event Storming session before drawing any Azure boxes. Map domain events (things that happened), commands (things that trigger them), and aggregates (clusters of state that change together). Natural groupings that emerge are your bounded contexts — one bounded context maps to one service at Scale tier. Drawing service boundaries from technical layers (UI service, business logic service, data service) produces a distributed monolith, not microservices.')}
          </p>
          <ol className="space-y-2.5">
            {DECOMP_RULES.map((rule, i) => (
              <li key={i} className="flex items-start gap-3 text-xs font-body text-text-secondary leading-snug">
                <span className="mt-0.5 font-mono text-2xs text-text-secondary shrink-0 w-4">{i + 1}.</span>
                {hl(rule)}
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Section 6: Tier Topology */}
      <section className="mb-10">
        <SectionHeader label="Tier Topology" title="Microservices Complexity by Engagement Tier" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-border border border-border">
          {TIER_TOPOLOGY.map(t => (
            <div key={t.tier} className="bg-surface px-5 py-4">
              <p className={`text-2xs font-semibold uppercase tracking-widest font-display mb-3 ${t.cls}`}>{TIER_LABELS[t.tier]}</p>
              <ul className="space-y-1.5">
                {t.items.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs font-body text-text-secondary leading-snug">
                    <span className={`mt-1.5 w-1 h-1 rounded-full shrink-0 ${t.dot}`} />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* Section 7: Anti-patterns */}
      <section className="mb-8">
        <SectionHeader label="Anti-Patterns" title="Microservices Design Failures" />
        <div className="border border-border bg-surface px-6 py-5">
          <ul className="space-y-2.5">
            {ANTI_PATTERNS.map((a, i) => (
              <li key={i} className="flex items-start gap-2 text-xs font-body text-text-secondary leading-snug">
                <span className="mt-1.5 w-1 h-1 rounded-full bg-waf-reliability shrink-0" />
                {hl(a)}
              </li>
            ))}
          </ul>
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
