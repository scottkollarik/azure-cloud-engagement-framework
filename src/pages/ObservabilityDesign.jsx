import { useState, Fragment } from 'react'
import { Link } from 'react-router-dom'
import { hl } from '../utils/hl'

const PRIMITIVES = [
  {
    term: 'Azure Monitor',
    abbr: 'AM',
    color: 'border-waf-operations text-waf-operations',
    def: 'The unified observability platform for Azure. Collects metrics, logs, and traces from all Azure resources, VMs, containers, and custom applications. Every other Azure observability service is built on or feeds into Azure Monitor.',
  },
  {
    term: 'Log Analytics Workspace',
    abbr: 'LAW',
    color: 'border-waf-operations text-waf-operations',
    def: 'Centralized log storage and query engine powered by KQL. The backbone of both operational observability and Microsoft Sentinel. One workspace per environment in production; never share prod and non-prod in the same workspace.',
  },
  {
    term: 'Application Insights',
    abbr: 'AI',
    color: 'border-waf-performance text-waf-performance',
    def: 'APM layer on top of Azure Monitor. Distributed tracing, request telemetry, dependency tracking, exceptions, custom events, and live metrics. Instrumented via OpenTelemetry SDK or Application Insights SDK.',
  },
  {
    term: 'OpenTelemetry',
    abbr: 'OTel',
    color: 'border-waf-performance text-waf-performance',
    def: 'Vendor-neutral instrumentation standard for traces, metrics, and logs. W3C TraceContext (traceparent header) enables distributed trace correlation across services. Required for microservices — missing it silently breaks the trace graph at every service boundary it does not traverse.',
  },
  {
    term: 'Microsoft Sentinel',
    abbr: 'Sentinel',
    color: 'border-waf-security text-waf-security',
    def: 'Cloud-native SIEM/SOAR built on Log Analytics. Security analytics, threat detection, incident management, and automated response. Not an optional add-on for regulated workloads — it is the security observability layer.',
  },
  {
    term: 'Azure Monitor Alerts',
    abbr: 'Alerts',
    color: 'border-waf-reliability text-waf-reliability',
    def: 'Rule-based alerting on metrics, logs, or Activity Log events. Routes to Action Groups (email, webhook, Logic App, ITSM). Alert severity tiers must be defined in Step 02, not discovered during the first incident.',
  },
]

const THREE_SIGNALS = [
  {
    id: 'logs',
    name: 'Logs',
    color: 'text-waf-operations',
    borderColor: 'border-waf-operations/40',
    what: 'Structured and unstructured event records — what happened, when, and to what.',
    details: [
      { label: 'Latency', value: 'Near-real-time ingestion into Log Analytics; queryable via KQL' },
      { label: 'Retention', value: '30 days default; extend to 90+ days for regulated workloads; Sentinel requires minimum 90 days' },
      { label: 'Example signals', value: 'Application errors, auth events, deployment events, NSG flow logs, Key Vault access audit' },
      { label: 'Alert on', value: 'Error rate spikes, auth failure bursts, unexpected admin operations' },
    ],
  },
  {
    id: 'metrics',
    name: 'Metrics',
    color: 'text-waf-performance',
    borderColor: 'border-waf-performance/40',
    what: 'Numeric time-series data — how much, how fast, how many.',
    details: [
      { label: 'Latency', value: 'Near-real-time (1-minute granularity); 93-day default retention in Azure Monitor' },
      { label: 'Ideal for', value: 'Threshold-based alerting on known failure modes; low-cost high-frequency collection' },
      { label: 'Example signals', value: 'CPU/memory utilization, request rate, latency P50/P95/P99, queue depth, token consumption' },
      { label: 'Alert on', value: 'Latency SLO breach, queue depth growth rate, resource saturation' },
    ],
  },
  {
    id: 'traces',
    name: 'Traces',
    color: 'text-waf-reliability',
    borderColor: 'border-waf-reliability/40',
    what: 'Distributed request flows across services — where did this request go and how long did each hop take.',
    details: [
      { label: 'Requires', value: 'OpenTelemetry instrumentation with W3C TraceContext (traceparent) propagated by every service in the call chain' },
      { label: 'Stored in', value: 'Application Insights (sampled); full fidelity requires adjusting sampling rate for high-traffic services' },
      { label: 'Example signals', value: 'End-to-end request latency, which service introduced the bottleneck, which dependency call failed' },
      { label: 'Alert on', value: 'Trace anomalies (missing spans, unexpected service calls); latency regression on critical paths' },
    ],
  },
]

const PATTERN_MATRIX = [
  {
    pattern: 'Modular Monolith',
    complexity: 'Low',
    notes: 'Single App Insights instance; no distributed tracing complexity; straightforward request correlation; one dashboard; one set of alert rules',
  },
  {
    pattern: 'Event-Driven',
    complexity: 'Medium',
    notes: 'Trace must span producer → message bus → consumer; DLQ depth is both an operational and security metric; message processing lag as an SLO; route DLQ poison message alerts to Sentinel',
  },
  {
    pattern: 'Microservices',
    complexity: 'High',
    notes: 'OpenTelemetry + W3C TraceContext mandatory on every service — one service missing traceparent silently breaks the trace graph; per-service dashboards; Sentinel analytics rule tuning required before go-live to avoid alert fatigue',
  },
  {
    pattern: 'CQRS',
    complexity: 'Medium',
    notes: 'Projection lag is a data correctness metric, not just performance — alert on lag, not only on errors; separate instrumentation for write and read pipelines; read model staleness must be visible',
  },
  {
    pattern: 'API Gateway',
    complexity: 'Medium',
    notes: 'APIM diagnostics → App Insights; gateway-level request rate, error rate, latency percentiles; per-consumer subscription key usage patterns → Sentinel anomaly detection',
  },
  {
    pattern: 'Strangler Fig',
    complexity: 'High',
    notes: 'Traces must span legacy and new systems; correlation across both is how data integrity issues surface during migration; define trace correlation strategy before migration begins, not after the first discrepancy',
  },
]

const SENTINEL_PATTERNS = [
  {
    id: 'log-source',
    label: 'Log Source Connectivity',
    tagline: 'What to connect first and why',
    tiers: ['land', 'scale', 'govern'],
    when: 'Any workload handling authentication, sensitive data, or subject to a compliance overlay. Connect Sentinel data sources at the beginning of Step 02, not after go-live.',
    how: [
      'Microsoft Entra ID connector: sign-in logs, audit logs, identity protection risk events — first connector to enable',
      'Azure Activity Log: all control-plane operations (resource create/delete/modify, RBAC changes, policy assignments)',
      'Azure Key Vault: diagnostic logs for all secret and key access operations',
      'NSG Flow Logs: east-west and north-south traffic patterns — required for network threat detection',
      'Azure Monitor (via Log Analytics connector): application logs, App Insights telemetry, custom tables',
      'App Gateway / APIM WAF logs: web application attack patterns, DDoS signals',
    ],
    never: 'Connect every available data source on day one — ingestion cost scales with volume; start with identity and control plane, expand as analytics rules are written for each new source.',
  },
  {
    id: 'analytics-rules',
    label: 'Analytics Rules',
    tagline: 'Detection logic that turns logs into incidents',
    tiers: ['scale', 'govern'],
    when: 'Any workload where a security event would not be visible without active detection. Rule quality determines whether Sentinel is a security tool or an expensive log archive.',
    how: [
      'Enable Microsoft Security Incident Creation rules first — free signal from Defender for Cloud, Entra ID Protection, Defender for Endpoint',
      'Impossible travel: Entra ID sign-in from two geographically impossible locations within a time window',
      'Password spray: many failed sign-ins across many accounts from the same IP in a short window',
      'Privilege escalation: PIM activation outside business hours or from an unmanaged device',
      'Anomalous Key Vault access: access to secrets by identities that have never previously accessed them',
      'Mass data download: Storage or Cosmos DB read volume spike from a single identity',
    ],
    never: 'Enable all Fusion and ML-based analytics rules immediately — they generate high false-positive volume until tuned; budget time for rule tuning in the Step 02 timeline estimate.',
  },
  {
    id: 'alert-severity',
    label: 'Alerting Severity Tiers',
    tagline: 'Define response expectations before the first alert fires',
    tiers: ['land', 'scale', 'govern'],
    when: 'Before go-live. An alert with no defined response is noise. Define severity, owner, and expected response time for every alert category in Step 02 — not after the first on-call page.',
    how: [
      'Severity 0 (Critical): service unavailable, authentication failures above threshold, DLQ spike, active Sentinel incident — page on-call immediately, 15-minute response SLA',
      'Severity 1 (Error): elevated error rate, latency P99 breach, certificate expiry within 30 days — page during business hours, 2-hour response',
      'Severity 2 (Warning): approaching quota limits, slow query threshold exceeded, projection lag above SLO — create ticket, 24-hour response',
      'Severity 3 (Info): deployment events, autoscale events, scheduled maintenance completion — log only, no response required',
    ],
    never: 'Use a single severity level for all alerts — undifferentiated alerting trains responders to ignore pages.',
  },
  {
    id: 'soar',
    label: 'Automated Response (SOAR)',
    tagline: 'Logic App playbooks that act on Sentinel incidents automatically',
    tiers: ['scale', 'govern'],
    when: 'Repeated incident response actions that are low-risk to automate: disabling compromised accounts, blocking IPs, revoking active sessions. Automation reduces mean-time-to-respond (MTTR) and removes human latency from high-confidence detections.',
    how: [
      'Sentinel Automation Rules trigger Logic App playbooks on incident creation or status change',
      'Common automations: disable Entra ID user on identity compromise incident, add IP to Azure Firewall block list, revoke all active refresh tokens for a compromised account',
      'All automated actions must be logged with the triggering incident — full audit trail is a compliance requirement',
      'Test playbooks in staging environment before enabling in production; an incorrect automated disable can lock out legitimate users',
    ],
    never: 'Automate destructive or irreversible actions (data deletion, subscription cancellation) without human approval gate — automate containment, not remediation.',
  },
]

const RETENTION_ROWS = [
  {
    overlay: 'No compliance overlay',
    minimum: '30 days (default)',
    notes: 'Acceptable for dev/test; extend to 90 days for any production workload for incident response adequacy',
  },
  {
    overlay: 'SOC 2',
    minimum: '90 days',
    notes: 'Evidence of security controls must be available for the audit period',
  },
  {
    overlay: 'PCI DSS',
    minimum: '1 year',
    notes: '3 months immediately accessible; remainder archived; card data environment logs require separate workspace',
  },
  {
    overlay: 'HIPAA',
    minimum: '6 years',
    notes: 'PHI-adjacent logs; workspace must have customer-managed keys if PHI appears in log fields',
  },
  {
    overlay: 'FedRAMP / NIST 800-53',
    minimum: '3 years',
    notes: 'Audit logs from all system components; Log Analytics + Azure Storage archive tier combination',
  },
  {
    overlay: 'CMMC Level 2+',
    minimum: '3 years',
    notes: 'CUI system activity logs; restrict workspace access to US-only personnel',
  },
  {
    overlay: 'GDPR',
    minimum: 'Duration of processing + limitation period',
    notes: 'Right-to-erasure applies to log data if it contains personal data — design log schema to avoid PII in indexed fields',
  },
]

const TIER_TOPOLOGY = [
  {
    tier: 'land',
    cls: 'text-tier-land border-tier-land',
    dot: 'bg-tier-land',
    items: [
      'Single Log Analytics Workspace; single App Insights instance',
      'Azure Monitor metric alerts on CPU, memory, error rate, latency',
      'Entra ID sign-in logs → Sentinel (if compliance overlay present)',
      'Manual dashboard review; no automated response',
      'Alert Action Group: email to team lead',
    ],
  },
  {
    tier: 'scale',
    cls: 'text-tier-scale border-tier-scale',
    dot: 'bg-tier-scale',
    items: [
      'Separate workspaces for prod and non-prod environments',
      'App Insights per service; OpenTelemetry instrumentation for all services',
      'Sentinel with Entra ID + Activity Log + Key Vault connectors enabled',
      'Analytics rules: impossible travel, password spray, privilege escalation',
      'Alert severity tiers defined; Action Groups route to on-call rotation',
    ],
  },
  {
    tier: 'govern',
    cls: 'text-tier-govern border-tier-govern',
    dot: 'bg-tier-govern',
    items: [
      'Dedicated Sentinel workspace with 90-day minimum retention',
      'All log sources connected; custom analytics rules tuned per workload',
      'SOAR playbooks for high-confidence automated response (account disable, IP block)',
      'Workbooks for compliance evidence generation (SOC 2, FedRAMP audit support)',
      'Defender for Cloud + Defender for Servers/Containers/SQL integrated',
    ],
  },
]

const ANTI_PATTERNS = [
  'No distributed tracing in a microservices architecture — W3C TraceContext not propagated means the trace graph is silently broken at every uninstrumented boundary; production debugging becomes log archaeology',
  'Alerts without runbooks — an alert that fires with no documented response procedure trains responders to ignore it; every Severity 0 and Severity 1 alert must have a linked runbook before go-live',
  'Single Log Analytics Workspace for prod and non-prod — alert noise from non-prod pollutes prod alerting; cost attribution is impossible; potential for dev queries to scan prod data',
  'No DLQ monitoring in event-driven architectures — dead letter queue depth is a silent data loss indicator; an unmonitored DLQ means messages are failing without anyone knowing',
  'Treating Sentinel as optional until after an incident — reactive security observability provides post-mortem context, not prevention; Sentinel must be connected at deployment, not remediation',
  'PII in structured log fields — Step 03 data classification applies to telemetry data, not only application data; personally identifiable information in log fields creates a compliance scope that cannot be easily removed retroactively',
  'Deferring observability design to Step 06 — the application pattern chosen in Step 01 determines instrumentation complexity; designing observability after code is written means retrofitting telemetry into an uninstrumented codebase, which is significantly more expensive than building it in from the start',
]

const TIER_LABELS = { land: 'Land', scale: 'Scale', govern: 'Govern' }
const TIER_CLASSES = {
  land:   'border-tier-land text-tier-land',
  scale:  'border-tier-scale text-tier-scale',
  govern: 'border-tier-govern text-tier-govern',
}

export default function ObservabilityDesign() {
  const [open, setOpen] = useState(null)

  return (
    <div className="max-w-6xl mx-auto px-8 py-12">

      {/* Header */}
      <div className="mb-10">
        <p className="text-2xs font-semibold tracking-widest uppercase text-text-secondary font-display mb-1">Design Guide</p>
        <h1 className="font-display text-3xl font-bold text-text-primary mb-4">Observability Design</h1>
        <div className="border border-waf-security/30 bg-surface px-6 py-5 max-w-3xl">
          <p className="text-2xs font-semibold uppercase tracking-widest text-waf-security font-display mb-2">Step 02 · Observability is Security</p>
          <p className="text-sm font-body text-text-primary leading-relaxed">
            {hl('Observability is not operational polish added in Step 06 — it is a security control designed in Step 02. If you cannot observe what your system is doing, you cannot detect a breach, prove compliance, or respond to an incident. The application pattern chosen in Step 01 determines observability complexity: a modular monolith requires one instrumented service; a microservices mesh requires W3C TraceContext propagated by every service or the trace graph is silently broken.')}
          </p>
        </div>
      </div>

      {/* Observability Primitives */}
      <section className="mb-10">
        <SectionHeader label="Building Blocks" title="Observability Primitives" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-border border border-border">
          {PRIMITIVES.map(p => (
            <div key={p.term} className="bg-surface px-5 py-4">
              <div className="flex items-center gap-2 mb-2">
                <span className={`pillar-badge text-2xs ${p.color}`}>{p.abbr}</span>
                <span className="font-display text-sm font-semibold text-text-primary">{p.term}</span>
              </div>
              <p className="text-xs font-body text-text-secondary leading-relaxed">{p.def}</p>
            </div>
          ))}
        </div>
      </section>

      {/* The Three Signals */}
      <section className="mb-10">
        <SectionHeader label="Signal Types" title="Logs · Metrics · Traces" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-px bg-border border border-border">
          {THREE_SIGNALS.map(signal => (
            <div key={signal.id} className="bg-surface px-5 py-4">
              <p className={`font-display text-sm font-semibold mb-1 ${signal.color}`}>{signal.name}</p>
              <p className="text-xs font-body text-text-primary leading-relaxed mb-3">{signal.what}</p>
              <ul className="space-y-2">
                {signal.details.map((d, i) => (
                  <li key={i} className="text-xs font-body text-text-secondary leading-snug">
                    <span className="font-semibold text-text-primary">{d.label}:</span> {d.value}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* Pattern × Observability Matrix */}
      <section className="mb-10">
        <SectionHeader label="Step 01 → Step 02" title="Pattern × Observability Matrix" />
        <p className="text-xs text-text-secondary font-body mb-3 max-w-2xl leading-relaxed">
          {hl('The application pattern determines observability complexity. Design the instrumentation strategy in Step 02 alongside identity — both are security controls, not afterthoughts.')}
        </p>
        <div className="border border-border overflow-x-auto">
          <div className="grid grid-cols-[1.4fr_0.9fr_2.2fr] min-w-[600px]">
            {['Pattern', 'Complexity', 'Observability Implications'].map(h => (
              <div key={h} className="bg-surface border-b border-border px-4 py-2.5">
                <span className="text-2xs font-semibold uppercase tracking-widest text-text-primary font-display">{h}</span>
              </div>
            ))}
            {PATTERN_MATRIX.map((row, idx) => (
              <Fragment key={idx}>
                <div className={`px-4 py-3 ${idx < PATTERN_MATRIX.length - 1 ? 'border-b border-border' : ''} ${idx % 2 === 0 ? 'bg-surface' : 'bg-canvas/40'}`}>
                  <Link to="/application-patterns" className="text-xs font-body text-accent hover:underline">{row.pattern}</Link>
                </div>
                <div className={`px-4 py-3 ${idx < PATTERN_MATRIX.length - 1 ? 'border-b border-border' : ''} ${idx % 2 === 0 ? 'bg-surface' : 'bg-canvas/40'}`}>
                  <span className={`pillar-badge text-2xs ${
                    row.complexity === 'Low'    ? 'border-waf-reliability text-waf-reliability' :
                    row.complexity === 'Medium' ? 'border-waf-cost text-waf-cost' :
                                                  'border-waf-security text-waf-security'
                  }`}>{row.complexity}</span>
                </div>
                <div className={`px-4 py-3 ${idx < PATTERN_MATRIX.length - 1 ? 'border-b border-border' : ''} ${idx % 2 === 0 ? 'bg-surface' : 'bg-canvas/40'}`}>
                  <span className="text-xs font-body text-text-secondary leading-snug">{row.notes}</span>
                </div>
              </Fragment>
            ))}
          </div>
        </div>
      </section>

      {/* Sentinel Integration */}
      <section className="mb-10">
        <SectionHeader label="Implementation" title="Sentinel Integration" />
        <div className="flex flex-col gap-px bg-border border border-border">
          {SENTINEL_PATTERNS.map(p => (
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
                            <span className="mt-1.5 w-1 h-1 rounded-full bg-waf-security shrink-0" />
                            {hl(step)}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="border-l-2 border-waf-security/30 pl-4">
                      <p className="text-2xs font-semibold uppercase tracking-widest text-waf-security font-display mb-2">Never</p>
                      <p className="text-xs font-body text-text-secondary leading-relaxed">{hl(p.never)}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Log Retention Reference */}
      <section className="mb-10">
        <SectionHeader label="Retention" title="Log Retention by Compliance Overlay" />
        <p className="text-xs text-text-secondary font-body mb-3 max-w-2xl leading-relaxed">
          {hl('Log retention is a compliance requirement, not a cost optimization lever. Define retention periods in Step 02 and provision the workspace accordingly — retroactive retention extension cannot recover already-purged data.')}
        </p>
        <div className="border border-border overflow-x-auto">
          <div className="grid grid-cols-[1.5fr_1fr_1.5fr] min-w-[500px]">
            {['Overlay', 'Minimum Retention', 'Notes'].map(h => (
              <div key={h} className="bg-surface border-b border-border px-4 py-2.5">
                <span className="text-2xs font-semibold uppercase tracking-widest text-text-primary font-display">{h}</span>
              </div>
            ))}
            {RETENTION_ROWS.map((row, idx) => (
              <Fragment key={idx}>
                <div className={`px-4 py-3 ${idx < RETENTION_ROWS.length - 1 ? 'border-b border-border' : ''} ${idx % 2 === 0 ? 'bg-surface' : 'bg-canvas/40'}`}>
                  <span className="text-xs font-body text-text-primary font-semibold">{row.overlay}</span>
                </div>
                <div className={`px-4 py-3 ${idx < RETENTION_ROWS.length - 1 ? 'border-b border-border' : ''} ${idx % 2 === 0 ? 'bg-surface' : 'bg-canvas/40'}`}>
                  <span className="text-xs font-mono text-text-secondary">{row.minimum}</span>
                </div>
                <div className={`px-4 py-3 ${idx < RETENTION_ROWS.length - 1 ? 'border-b border-border' : ''} ${idx % 2 === 0 ? 'bg-surface' : 'bg-canvas/40'}`}>
                  <span className="text-xs font-body text-text-secondary leading-snug">{row.notes}</span>
                </div>
              </Fragment>
            ))}
          </div>
        </div>
      </section>

      {/* Tier Topology */}
      <section className="mb-10">
        <SectionHeader label="Tier Topology" title="Observability Complexity by Engagement Tier" />
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

      {/* Anti-patterns */}
      <section className="mb-8">
        <SectionHeader label="Anti-Patterns" title="Observability Design Failures" />
        <div className="border border-border bg-surface px-6 py-5">
          <ul className="space-y-2.5">
            {ANTI_PATTERNS.map((a, i) => (
              <li key={i} className="flex items-start gap-2 text-xs font-body text-text-secondary leading-snug">
                <span className="mt-1.5 w-1 h-1 rounded-full bg-waf-security shrink-0" />
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
