import { useState, Fragment } from 'react'
import { hl } from '../utils/hl'

const TIER_CLASSES = {
  land:   'border-tier-land text-tier-land',
  scale:  'border-tier-scale text-tier-scale',
  govern: 'border-tier-govern text-tier-govern',
}
const TIER_LABELS = { land: 'Land', scale: 'Scale', govern: 'Govern' }

const WAF_CLASSES = {
  'reliability':            'border-waf-reliability text-waf-reliability',
  'security':               'border-waf-security text-waf-security',
  'cost-optimization':      'border-waf-cost text-waf-cost',
  'operational-excellence': 'border-waf-operations text-waf-operations',
  'performance-efficiency': 'border-waf-performance text-waf-performance',
}
const WAF_LABELS = {
  'reliability':            'Reliability',
  'security':               'Security',
  'cost-optimization':      'Cost Optimization',
  'operational-excellence': 'Operational Excellence',
  'performance-efficiency': 'Performance Efficiency',
}

const PATTERNS = [
  {
    id: 'modular-monolith',
    label: 'Modular Monolith',
    tagline: 'Single deployable unit, internally structured by domain module',
    tiers: ['land'],
    wafPrimary: 'cost-optimization',
    summary: 'A single deployable unit that enforces module boundaries internally. Each module owns its logic and communicates through defined interfaces rather than direct coupling. The system deploys together but does not think together. This is the architecturally correct default at Land tier and remains valid well into Scale for teams that have not yet hit the coordination limits of shared deployment.',
    editorial: 'The modular monolith is underrepresented in Azure architecture content. It is the right answer far more often than the microservices bias in the industry acknowledges.',
    whenToUse: [
      'Team under 15 engineers where independent deployment cadence is not required',
      'Business logic is cohesive and benefits from being understood as a single system',
      'Land tier — single subscription, single primary workload',
      'Domain boundaries are not yet clear — extract services when they are, not before',
      'Deployment frequency of once a week or less is acceptable',
    ],
    antiPatterns: [
      '"We will decompose into microservices later" — this rarely happens; if microservices are the destination, start with DDD-based decomposition now rather than accumulating rewrite debt',
      'No internal module boundaries — a monolith without enforced structure is a big ball of mud, not a modular monolith; establish boundaries from day one',
      'Deploying a monolith on AKS — paying microservices operational overhead for monolith complexity delivers nothing',
    ],
    azureServices: ['Azure App Service', 'Azure Container Apps (single env)', 'Azure SQL Database', 'Azure Cache for Redis', 'Azure Key Vault', 'Azure Service Bus (background jobs)'],
    step2: [
      'One managed identity for the entire application — simpler to configure, but blast radius is the full application if that identity is compromised',
      'Single app registration in Entra ID',
      'Smaller NSG footprint — one inbound rule set, one outbound rule set to PaaS dependencies',
      'Blast radius mitigation: strict least-privilege RBAC on the single identity, PIM for any elevated access, no standing Owner/Contributor assignments',
      'Observability: single Application Insights instance — no distributed tracing complexity, straightforward request correlation',
    ],
  },
  {
    id: 'event-driven',
    label: 'Event-Driven',
    tagline: 'Producers and consumers decoupled through a durable event backbone',
    tiers: ['land', 'scale'],
    wafPrimary: 'reliability',
    summary: 'Producers publish events without knowledge of consumers. Consumers subscribe independently and process at their own pace. The event backbone becomes the system of record for what happened. Temporal decoupling is the primary benefit: producer and consumer do not need to be available simultaneously. Applicable at Land tier for async background workflows; most naturally paired with microservices at Scale tier.',
    whenToUse: [
      'Workflows are inherently asynchronous — order placed, payment processed, notification sent are not a function call chain',
      'Multiple consumers react to the same event independently',
      'The event log has compliance value as an audit trail',
      'Downstream consumers may be added in the future without modifying producers',
      'Peak load absorption — producer fires and forgets; consumer processes at a sustainable rate',
    ],
    antiPatterns: [
      'Request-response workflows forced into events — if you need a synchronous answer, use HTTP; events that immediately wait for a reply are not event-driven',
      'Events as remote procedure calls — if your "event" has a required consumer and a timeout, it is an RPC in disguise',
      'Skipping dead letter queue design — unprocessed messages need a documented destination and a runbook; this is not optional',
    ],
    azureServices: ['Azure Service Bus', 'Azure Event Grid', 'Azure Event Hubs', 'Azure Functions', 'Azure Container Apps (KEDA)'],
    step2: [
      'Managed identity per producer and per consumer group — not one shared identity across all producers and consumers',
      'RBAC per topic or queue: producers get Send, consumers get Listen — never both on the same identity',
      'Dead letter queues as a security signal: unexpected poison messages or replay attempts may indicate injection; route DLQ alerts to Sentinel',
      'For regulated workloads: message signing verifies integrity and non-repudiation — design this in Step 02, not after data classification in Step 03',
      'Private Endpoints for Service Bus and Event Hubs namespaces in production — do not leave messaging endpoints on the public internet',
    ],
  },
  {
    id: 'microservices',
    label: 'Microservices',
    tagline: 'Independently deployable services, each owning its data and domain',
    tiers: ['scale', 'govern'],
    wafPrimary: 'reliability',
    summary: "Each service is an independently deployable unit that owns its data store, exposes a defined API, and is developed by a team that releases without coordinating with other teams. Conway's Law is the primary justification: microservices make sense when multiple teams need independent deployment cadence. Complexity without team-size justification produces a distributed monolith — all the operational overhead, none of the independence.",
    whenToUse: [
      "Multiple teams need independent deployment cadence — Conway's Law made explicit",
      'Services have genuinely different scaling requirements today, not hypothetically',
      'Polyglot persistence is needed — each service owns the storage model that fits its data',
      'Fault isolation is a priority — a failure in one service must not cascade to unrelated services',
      'Scale tier or above — the operational overhead requires a platform engineering layer to be sustainable',
    ],
    antiPatterns: [
      'Distributed monolith: microservices that share a database or call each other synchronously for every request — all the operational cost, none of the independence benefit',
      'Nano-services: decomposition so fine-grained that every operation crosses a network boundary — latency replaces the coupling you were trying to eliminate',
      'Microservices before you understand the domain — run an Event Storming session first; bounded context analysis drives boundaries, not guesswork',
      'Skipping distributed tracing — without OpenTelemetry and W3C TraceContext propagated by every service, production debugging becomes guesswork',
    ],
    azureServices: ['AKS', 'Azure Container Apps', 'Azure API Management', 'Azure Service Bus', 'Azure Container Registry', 'Cosmos DB (per service)', 'Azure SQL (per service)', 'Application Insights + OpenTelemetry'],
    step2: [
      'Managed identity per service — not one shared identity; each service gets only the RBAC permissions for its own data store and downstream dependencies',
      'Workload identity federation for service-to-service calls — no client secrets in environment variables or config maps',
      'Per-service NSG rules — significantly larger attack surface than a monolith; document the full matrix of allowed ingress and egress per service before writing IaC',
      'Distributed tracing is a Step 02 design decision, not an afterthought: Application Insights + OpenTelemetry, W3C TraceContext (traceparent header) must be propagated by all services — missing it silently breaks the trace graph',
      'Sentinel: more log sources produce more alert noise — budget time for analytics rule tuning before go-live or Sentinel becomes a distraction',
    ],
  },
  {
    id: 'cqrs',
    label: 'CQRS',
    tagline: 'Separate read and write models, each optimized independently',
    tiers: ['scale', 'govern'],
    wafPrimary: 'performance-efficiency',
    summary: 'Command Query Responsibility Segregation separates the write model (commands that change state) from the read model (queries that return data). The write model is normalized and optimized for correctness. The read model is denormalized and optimized for the specific queries consumers need. Often paired with event-driven architecture — commands produce domain events that project into read models asynchronously.',
    whenToUse: [
      'Reads vastly outnumber writes and have different performance or shape requirements',
      'Multiple read models are needed from the same underlying data — dashboard, operational view, reporting',
      'The write model is complex and should be protected from read-optimized schema pressures',
      'Paired with Event Sourcing when a complete immutable audit trail of all state changes is required',
    ],
    antiPatterns: [
      'CQRS for simple CRUD — the pattern adds meaningful complexity that only pays off when read and write concerns genuinely diverge',
      'Ignoring eventual consistency — consumers of the read model may see slightly stale data; this must be documented and accepted by the business before implementation',
      'Synchronous read model updates — projection from event to read model should be async; synchronizing them re-couples the two models',
    ],
    azureServices: ['Azure SQL (write model)', 'Azure Cosmos DB (read projections)', 'Azure Cache for Redis (hot read)', 'Azure AI Search (full-text read)', 'Azure Service Bus (projection events)'],
    step2: [
      'Two distinct managed identities: write service (SQL Contributor) and read service (Cosmos DB Reader, Redis Cache Reader) — permissions split at the Azure resource level',
      'Read model projections may contain denormalized PII — confirm data classification applies to projected stores, not only the write store',
      'Projection pipeline is a separate operational surface: instrument it independently and alert on projection lag — lag is a data correctness issue, not just a performance metric',
    ],
  },
  {
    id: 'api-gateway',
    label: 'API Gateway / API-First',
    tagline: 'Single managed entry point for all API consumers',
    tiers: ['scale', 'govern'],
    wafPrimary: 'security',
    summary: 'Azure API Management provides a single entry point for internal and external consumers. Authentication, rate limiting, versioning, request transformation, and analytics are handled at the gateway — not reimplemented in each backend service. This pattern is the foundation for B2B integrations, multi-channel architectures, and the Strangler Fig migration pattern.',
    whenToUse: [
      'Multiple consumer channels need a unified API surface — web, mobile, partner integration',
      'API versioning is needed — consumers on v1 while v2 is rolled out independently',
      'Rate limiting, throttling, or quota management per consumer or subscription key',
      'Backend service URLs must not be exposed to external consumers',
      'Acting as the routing layer in a Strangler Fig migration',
    ],
    antiPatterns: [
      'Using APIM as a microservices service mesh — APIM is for north-south (external-facing) traffic; Dapr or a service mesh handles east-west (service-to-service) communication',
      'Business logic in APIM policies — transformation policies should transform, not implement domain rules',
      'Skipping APIM in front of AI backends — token rate limiting and content safety enforcement belong at the gateway, not per model',
    ],
    azureServices: ['Azure API Management', 'Microsoft Entra ID (OAuth2/OIDC)', 'Azure Key Vault (subscription key storage)', 'Azure Monitor (APIM diagnostics)', 'Application Insights (APIM traces)'],
    step2: [
      'OAuth2/OIDC token validation at the gateway — backends trust gateway-validated tokens, eliminating duplicated token validation logic in every service',
      'APIM managed identity for backend calls — no credentials in APIM policy XML',
      'Subscription keys are credentials: rotate them, store in Key Vault, and audit usage patterns in Sentinel for anomaly detection',
      'Rate limiting protects backends from credential stuffing — configure before go-live, not after the first incident',
    ],
  },
  {
    id: 'strangler-fig',
    label: 'Strangler Fig',
    tagline: 'Incrementally replace a legacy system without a big-bang migration',
    tiers: ['land', 'scale', 'govern'],
    wafPrimary: 'operational-excellence',
    summary: 'Named after the fig tree that grows around a host tree and eventually replaces it. New functionality is built in the new architecture; the legacy system handles what remains. A routing layer directs traffic to the appropriate backend. The legacy system is decommissioned one feature at a time — risk is bounded to each increment rather than accumulated until a final cutover.',
    whenToUse: [
      'Migrating a legacy system to Azure where a full rewrite is too risky or too slow',
      'Business continuity requires the system to remain operational throughout the migration',
      'Risk reduction is the priority — each migrated feature is validated independently before the next begins',
      'Legacy and new systems need to coexist for months or years during the transition',
    ],
    antiPatterns: [
      'Strangling without a decommission plan — if the legacy system never shrinks, you are running two systems indefinitely at double the operational cost',
      'Routing logic in application code instead of the gateway — puts migration state in business logic and creates coupling that outlasts the migration',
      'Skipping parallel-run validation — running both systems simultaneously to compare outputs is how data integrity issues are caught before they reach users',
    ],
    azureServices: ['Azure API Management (routing)', 'Azure Front Door (routing)', 'Azure App Service (new services)', 'Azure VMs or App Service (legacy)'],
    step2: [
      'Dual identity systems during migration: legacy AD and Entra ID coexist — define which system is authoritative at each migration phase before writing IaC',
      'Separate managed identities for legacy and new services — do not share identities across the migration boundary',
      'Observability must span both systems — correlate traces across legacy and new to identify where requests fail during the transition period',
      'Define a rollback signal for each migration increment before starting it: what metric or Sentinel alert triggers traffic reversion to legacy?',
    ],
  },
]

const MESSAGING_ROWS = [
  { label: 'Protocol',         sb: 'AMQP / HTTP',                          eg: 'HTTPS (push)',                          eh: 'AMQP / Kafka / HTTP',                     k: 'Kafka binary protocol' },
  { label: 'Delivery',         sb: 'At-least-once; dead-letter queue',      eg: 'At-least-once; retry up to 24 hours',   eh: 'At-least-once within retention window',   k: 'At-least-once; configurable acks' },
  { label: 'Max message',      sb: '100 MB (Premium tier)',                  eg: '1 MB',                                  eh: '1 MB standard · 100 MB Premium',          k: '1 MB default; configurable' },
  { label: 'Ordering',         sb: 'Per session (sessions required)',         eg: 'No guarantee',                          eh: 'Per partition (partition key required)',   k: 'Per partition (partition key required)' },
  { label: 'Managed options',  sb: 'Azure fully managed',                   eg: 'Azure fully managed',                   eh: 'Azure fully managed',                      k: 'Confluent Cloud (Azure Marketplace) · Strimzi on AKS · HDInsight Kafka (deprecated)' },
  { label: 'Use when',         sb: 'Transactional workflows, ordered processing, competing consumers, financial transactions', eg: 'Reactive fan-out, Azure resource events (blob created, VM stopped), webhook delivery', eh: 'High-throughput telemetry, IoT, log streaming, data pipeline ingestion; Event Hubs Kafka API lets existing Kafka clients connect without code changes', k: 'Existing Kafka producers/consumers that cannot be repointed; Kafka Streams or Kafka Connect ecosystem dependency; team has deep Kafka expertise and operational maturity' },
  { label: 'Not when',         sb: 'High-throughput streaming; fan-out to many independent handlers', eg: 'Guaranteed delivery beyond 24h; large payloads; ordered processing', eh: 'Transactional workflows; guaranteed delivery beyond retention window', k: 'Greenfield — Event Hubs with Kafka API gives 90% of the benefit with no cluster to operate; avoid unless you have a specific Kafka-ecosystem dependency' },
]

const TIER_DEFAULTS = [
  {
    tier: 'land', cls: 'text-tier-land border-tier-land',
    patterns: ['Modular Monolith (default)', 'Event-Driven (if async workflow)', 'Strangler Fig (if migration)'],
  },
  {
    tier: 'scale', cls: 'text-tier-scale border-tier-scale',
    patterns: ['Microservices (if team topology warrants)', 'Event-Driven', 'API Gateway', 'Strangler Fig', 'CQRS (if read/write diverge)'],
  },
  {
    tier: 'govern', cls: 'text-tier-govern border-tier-govern',
    patterns: ['Microservices + DDD decomposition', 'Event-Driven at platform scale', 'CQRS + Event Sourcing', 'API Gateway (enterprise)', 'Strangler Fig (legacy migration)'],
  },
]

export default function ApplicationPatterns() {
  const [open, setOpen] = useState(null)

  return (
    <div className="max-w-6xl mx-auto px-8 py-12">

      {/* Header */}
      <div className="mb-10">
        <p className="text-2xs font-semibold tracking-widest uppercase text-text-secondary font-display mb-1">Reference</p>
        <h1 className="font-display text-3xl font-bold text-text-primary mb-4">Application Patterns</h1>
        <div className="border border-waf-security/30 bg-surface px-6 py-5 max-w-3xl">
          <p className="text-2xs font-semibold uppercase tracking-widest text-waf-security font-display mb-2">Step 01 Deliverable</p>
          <p className="text-sm font-body text-text-primary leading-relaxed">
            {hl('Pattern selection happens in Step 01, before identity boundary design in Step 02. The pattern determines the security surface area — number of managed identities, NSG rule sets, distributed tracing requirements, and Sentinel alert volume all flow from this decision. Changing the pattern after Step 02 is complete means redesigning the boundary.')}
          </p>
        </div>
      </div>

      {/* Tier defaults */}
      <section className="mb-10">
        <SectionHeader label="Quick Reference" title="Pattern Defaults by Tier" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-border border border-border">
          {TIER_DEFAULTS.map(t => (
            <div key={t.tier} className="bg-surface px-5 py-4">
              <p className={`text-2xs font-semibold uppercase tracking-widest font-display mb-3 ${t.cls}`}>{TIER_LABELS[t.tier]}</p>
              <ul className="space-y-1.5">
                {t.patterns.map((p, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs font-body text-text-secondary leading-snug">
                    <span className={`mt-1.5 w-1 h-1 rounded-full shrink-0 ${
                      t.tier === 'land' ? 'bg-tier-land' : t.tier === 'scale' ? 'bg-tier-scale' : 'bg-tier-govern'
                    }`} />
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* DDD Primer */}
      <section className="mb-10">
        <SectionHeader label="Decomposition Lens" title="Domain-Driven Design Before Azure Boxes" />
        <div className="border border-border bg-surface px-6 py-5 max-w-3xl mb-3">
          <p className="text-sm font-body text-text-secondary leading-relaxed mb-3">
            Before selecting a pattern, run an <span className="text-text-primary">Event Storming</span> session
            with domain experts. Map the events (things that happen), commands (things that trigger them), and
            aggregates (clusters of state that change together). The natural groupings that emerge are
            your <span className="text-text-primary">Bounded Contexts</span> — the correct unit of decomposition.
          </p>
          <p className="text-sm font-body text-text-secondary leading-relaxed mb-4">
            A Bounded Context maps to a microservice at <span className="text-tier-scale font-semibold">Scale</span>,
            a module within a modular monolith at <span className="text-tier-land font-semibold">Land</span>,
            and a subscription boundary at <span className="text-tier-govern font-semibold">Govern</span>.
            Drawing Azure boxes before Event Storming produces services aligned to technical layers rather than domain realities.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-border border border-border">
            {[
              { term: 'Bounded Context', def: 'The boundary within which a domain model is internally consistent — maps to a service, module, or subscription' },
              { term: 'Aggregate',       def: 'A cluster of objects treated as a single unit for state changes — the natural transaction boundary' },
              { term: 'Domain Event',    def: 'Something meaningful that happened in the domain — the payload on your event bus' },
              { term: 'Ubiquitous Language', def: 'Shared vocabulary between engineers and domain experts — eliminates translation overhead and naming inconsistencies' },
            ].map(item => (
              <div key={item.term} className="bg-canvas px-4 py-3">
                <p className="text-2xs font-semibold text-text-primary font-display mb-1">{item.term}</p>
                <p className="text-2xs text-text-secondary font-body leading-relaxed">{item.def}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pattern Cards */}
      <section className="mb-12">
        <SectionHeader label="Patterns" title="Select the Right Pattern for Tier and Team Topology" />
        <div className="flex flex-col gap-px bg-border border border-border">
          {PATTERNS.map(p => (
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
                  <div className="flex flex-col items-end gap-1">
                    <div className="flex gap-1.5">
                      {p.tiers.map(t => (
                        <span key={t} className={`pillar-badge text-2xs ${TIER_CLASSES[t]}`}>{TIER_LABELS[t]}</span>
                      ))}
                    </div>
                    <div>
                      <span className={`pillar-badge text-2xs ${WAF_CLASSES[p.wafPrimary]}`}>{WAF_LABELS[p.wafPrimary]}</span>
                    </div>
                  </div>
                  <span className="text-text-secondary font-mono text-xs w-3 text-right">{open === p.id ? '−' : '+'}</span>
                </div>
              </button>

              {open === p.id && (
                <div className="border-t border-border">
                  <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-border">

                    {/* Left: summary + when to use + anti-patterns + services */}
                    <div className="px-6 py-5 space-y-5">
                      <div>
                        <p className="text-sm font-body text-text-secondary leading-relaxed">{hl(p.summary)}</p>
                        {p.editorial && (
                          <p className="mt-3 text-xs font-body text-text-secondary italic border-l-2 border-accent/40 pl-3 leading-relaxed">{hl(p.editorial)}</p>
                        )}
                      </div>

                      <div>
                        <p className="text-2xs font-semibold uppercase tracking-widest text-text-secondary font-display mb-2">When to use</p>
                        <ul className="space-y-1.5">
                          {p.whenToUse.map((w, i) => (
                            <li key={i} className="flex items-start gap-2 text-xs font-body text-text-primary leading-snug">
                              <span className="mt-1.5 w-1 h-1 rounded-full bg-waf-reliability shrink-0" />
                              {hl(w)}
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div>
                        <p className="text-2xs font-semibold uppercase tracking-widest text-text-secondary font-display mb-2">Anti-patterns</p>
                        <ul className="space-y-1.5">
                          {p.antiPatterns.map((a, i) => (
                            <li key={i} className="flex items-start gap-2 text-xs font-body text-text-secondary leading-snug">
                              <span className="mt-1.5 w-1 h-1 rounded-full bg-waf-security shrink-0" />
                              {hl(a)}
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div>
                        <p className="text-2xs font-semibold uppercase tracking-widest text-text-secondary font-display mb-2">Azure Services</p>
                        <div className="flex flex-wrap gap-1.5">
                          {p.azureServices.map(s => (
                            <span key={s} className="pillar-badge border-border text-text-secondary text-2xs">{s}</span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Right: Step 02 implications */}
                    <div className="px-6 py-5">
                      <div className="border-l-2 border-waf-security/40 pl-4 h-full">
                        <div className="flex items-center gap-2 mb-3">
                          <span className="pillar-badge border-waf-security/60 text-waf-security text-2xs">Step 02</span>
                          <p className="text-2xs font-semibold uppercase tracking-widest text-text-secondary font-display">
                            Identity, Security &amp; Observability Implications
                          </p>
                        </div>
                        <ul className="space-y-3">
                          {p.step2.map((s, i) => (
                            <li key={i} className="flex items-start gap-2 text-xs font-body text-text-primary leading-snug">
                              <span className="mt-1.5 w-1 h-1 rounded-full bg-waf-security shrink-0" />
                              {hl(s)}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                  </div>

                  {p.id === 'event-driven' && (
                    <div className="border-t border-border px-6 py-5">
                      <p className="text-2xs font-semibold uppercase tracking-widest text-text-secondary font-display mb-1">Messaging Backbone Selection</p>
                      <p className="text-sm font-body text-text-secondary leading-relaxed mb-4">
                        {hl('Once you have committed to an event-driven pattern, the next decision is which Azure messaging service to use as the backbone. Choosing the wrong one is a Step 03 data architecture problem that surfaces as a Step 05 failure mode — the three services are not interchangeable.')}
                      </p>
                      <div className="border border-border overflow-x-auto">
                        <div className="grid grid-cols-[1.2fr_1fr_1fr_1fr_1fr] min-w-[800px]">
                          <div className="bg-surface border-b border-border px-4 py-2.5" />
                          {['Azure Service Bus', 'Azure Event Grid', 'Azure Event Hubs', 'Apache Kafka (on Azure)'].map(h => (
                            <div key={h} className="bg-surface border-b border-border px-4 py-2.5">
                              <span className="text-2xs font-semibold uppercase tracking-widest text-text-primary font-display">{h}</span>
                            </div>
                          ))}
                          {MESSAGING_ROWS.map((row, idx) => (
                            <Fragment key={idx}>
                              <div className={`px-4 py-3 ${idx < MESSAGING_ROWS.length - 1 ? 'border-b border-border' : ''} ${idx % 2 === 0 ? 'bg-surface' : 'bg-canvas/40'}`}>
                                <span className="text-2xs font-semibold uppercase tracking-widest text-text-secondary font-display">{row.label}</span>
                              </div>
                              {[row.sb, row.eg, row.eh, row.k].map((val, ci) => (
                                <div key={ci} className={`px-4 py-3 ${idx < MESSAGING_ROWS.length - 1 ? 'border-b border-border' : ''} ${idx % 2 === 0 ? 'bg-surface' : 'bg-canvas/40'}`}>
                                  <span className="text-xs font-body text-text-secondary leading-snug">{val}</span>
                                </div>
                              ))}
                            </Fragment>
                          ))}
                        </div>
                      </div>
                      <p className="mt-2 text-2xs text-text-secondary font-mono">
                        Service Bus and Event Hubs can coexist — Service Bus for transactional workflows, Event Hubs for telemetry pipelines. Event Grid is most useful as a fan-out layer on top of the other two. If migrating from Kafka, Event Hubs is the Azure-native landing zone.
                      </p>
                    </div>
                  )}

                </div>
              )}
            </div>
          ))}
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
