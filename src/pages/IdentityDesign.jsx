import { useState, Fragment } from 'react'
import { Link } from 'react-router-dom'
import { hl } from '../utils/hl'

const PRIMITIVES = [
  {
    term: 'Managed Identity',
    abbr: 'MI',
    color: 'border-waf-security text-waf-security',
    def: 'Azure-managed credential for Azure resources. No secret to store, rotate, or leak. System-assigned (tied to resource lifecycle) or user-assigned (shared across resources, survives resource deletion).',
  },
  {
    term: 'App Registration',
    abbr: 'AR',
    color: 'border-waf-security text-waf-security',
    def: 'Identity for an application or automation script in Entra ID. Produces a Service Principal in each tenant where it operates. Use certificates over passwords; prefer Workload Identity Federation over both.',
  },
  {
    term: 'Azure RBAC',
    abbr: 'RB',
    color: 'border-waf-operations text-waf-operations',
    def: 'Role assignments at subscription, resource group, or resource scope. Assign at the narrowest scope. No standing Owner or Contributor in production — use PIM for elevation.',
  },
  {
    term: 'Entra ID Groups',
    abbr: 'GR',
    color: 'border-waf-operations text-waf-operations',
    def: 'Assign RBAC to groups, not individuals. Eliminates per-person role assignment sprawl and makes access reviews auditable. Use security groups, not Microsoft 365 groups, for RBAC assignments.',
  },
  {
    term: 'Privileged Identity Management',
    abbr: 'PIM',
    color: 'border-waf-security text-waf-security',
    def: 'Just-in-time elevation for privileged roles. Requires justification, triggers approval workflows, and produces a full audit trail. No standing Owner or Contributor on production subscriptions.',
  },
  {
    term: 'Conditional Access',
    abbr: 'CA',
    color: 'border-waf-reliability text-waf-reliability',
    def: 'Policy-based access enforcement: MFA, device compliance, location, sign-in risk score. Designed in Step 02 — adding it post-launch disrupts users and creates pressure to leave exceptions in place.',
  },
]

const PATTERN_MATRIX = [
  {
    pattern: 'Modular Monolith',
    identityCount: '1',
    types: 'System-assigned MI',
    complexity: 'Low',
    notes: 'One MI for the process, but RBAC assignments should reflect module boundaries — scope each module\'s data store access independently on the same identity. Blast radius is still the full application if the MI is compromised.',
  },
  {
    pattern: 'Event-Driven',
    identityCount: '1 per producer + 1 per consumer group',
    types: 'User-assigned MI',
    complexity: 'Medium',
    notes: 'RBAC split: producers get Send, consumers get Listen — never both on the same identity.',
  },
  {
    pattern: 'Microservices',
    identityCount: '1 per service',
    types: 'User-assigned MI + WIF',
    complexity: 'High',
    notes: 'Workload Identity Federation for service-to-service. Per-service NSG matrix must be fully documented before writing IaC.',
  },
  {
    pattern: 'CQRS',
    identityCount: '2 (write + read)',
    types: 'User-assigned MI',
    complexity: 'Medium',
    notes: 'Write service: Contributor on write store only. Read service: Reader on read projections only — split at the Azure resource level.',
  },
  {
    pattern: 'API Gateway',
    identityCount: '1 (APIM) + 1 per backend',
    types: 'MI + OAuth2/OIDC',
    complexity: 'Medium',
    notes: 'APIM validates external tokens; backends trust APIM-forwarded claims. Backends are never directly reachable by external consumers.',
  },
  {
    pattern: 'Strangler Fig',
    identityCount: 'Dual (legacy + new)',
    types: 'SP (legacy) + MI (new)',
    complexity: 'High',
    notes: 'Define which system is authoritative at each migration phase before writing IaC. Never share identities across the migration boundary.',
  },
]

const WORKLOAD_PATTERNS = [
  {
    id: 'mi-resource',
    label: 'Managed Identity → Azure Resource',
    tagline: 'Service authenticates to PaaS without credentials',
    tiers: ['land', 'scale', 'govern'],
    when: 'App Service, Functions, Container Apps, or AKS pods accessing Key Vault, Service Bus, Storage, SQL, or Cosmos DB. The default pattern for any Azure compute accessing any Azure PaaS resource.',
    how: [
      'Assign system-assigned or user-assigned MI to the compute resource',
      'Grant the MI a scoped RBAC role on the target resource (e.g., Key Vault Secrets User, Service Bus Data Sender)',
      'Use DefaultAzureCredential in the Azure SDK — resolves MI automatically in Azure, falls back to developer credential locally',
      'No connection strings, access keys, or passwords in application config or Key Vault',
    ],
    never: 'Use connection strings or access keys as an alternative to MI — they require rotation, can be leaked, and cannot be tied to an identity in Entra audit logs.',
  },
  {
    id: 'wif',
    label: 'Workload Identity Federation',
    tagline: 'No long-lived secrets in CI/CD pipelines or container workloads',
    tiers: ['land', 'scale', 'govern'],
    when: 'GitHub Actions deploying to Azure, Azure DevOps pipelines, AKS pod workloads (Azure AD Workload Identity), or any external OIDC provider that needs Azure access without storing credentials.',
    how: [
      'Create an App Registration in Entra ID',
      'Add a Federated Credential that trusts the external OIDC issuer (GitHub, Azure DevOps, Kubernetes API server)',
      'The external system presents its OIDC token; Azure exchanges it for an access token — no secret stored anywhere',
      'AKS: use the Azure AD Workload Identity mutating webhook to project tokens into pods at runtime',
    ],
    never: 'Long-lived client secrets in pipeline environment variables — they expire silently, appear in logs, and cannot be scoped to a specific pipeline run in audit trails.',
  },
  {
    id: 'oauth-apim',
    label: 'OAuth2 / OIDC via API Management',
    tagline: 'External consumers authenticate once at the gateway',
    tiers: ['scale', 'govern'],
    when: 'Web, mobile, or B2B partner consumers calling Azure-hosted APIs. Any scenario where external traffic must be authenticated and authorized before reaching backend services.',
    how: [
      'Configure APIM to validate JWT tokens issued by Entra ID (validate-jwt policy)',
      'APIM forwards validated identity claims to backends via request headers',
      'Backend services trust APIM-forwarded claims — no token validation logic duplicated in backend code',
      'Rate limiting, quota, and content safety enforcement at the gateway per consumer subscription key',
    ],
    never: 'Expose backend service URLs directly to external consumers — APIM is the only entry point for north-south traffic.',
  },
  {
    id: 'sp-cert',
    label: 'Service Principal with Certificate',
    tagline: 'Last-resort credential for automation that cannot use Managed Identity',
    tiers: ['land', 'scale', 'govern'],
    when: 'On-premises automation agents, cross-cloud scenarios, or legacy tooling that cannot use MI. Prefer MI everywhere Azure compute is involved — this pattern is the fallback, not the default.',
    how: [
      'Generate X.509 certificate; store private key in Key Vault',
      'Upload public certificate to the App Registration — no client secret created',
      'Automation retrieves the cert from Key Vault at runtime; no credential lives in config files or pipelines',
      'Set Key Vault certificate expiry alerts; treat approaching expiry as an incident, not a maintenance task',
    ],
    never: 'Client secret (password) credentials on service principals — no certificate means no hardware-bound trust, and rotation discipline is rarely maintained under delivery pressure.',
  },
]

const RBAC_ROLES = [
  { role: 'Key Vault Secrets User',       scope: 'Key Vault',        use: 'Application reads secrets at runtime' },
  { role: 'Key Vault Secrets Officer',    scope: 'Key Vault',        use: 'Operations team manages secret lifecycle' },
  { role: 'Service Bus Data Sender',      scope: 'Namespace / Queue',use: 'Producer managed identity' },
  { role: 'Service Bus Data Receiver',    scope: 'Namespace / Queue',use: 'Consumer managed identity' },
  { role: 'Storage Blob Data Reader',     scope: 'Container',        use: 'Read-only blob access' },
  { role: 'Storage Blob Data Contributor',scope: 'Container',        use: 'Read/write blob access' },
  { role: 'Cognitive Services OpenAI User',scope: 'Resource',        use: 'AI workload access to Azure OpenAI' },
  { role: 'Monitoring Metrics Publisher', scope: 'Resource',         use: 'Custom metrics writer (telemetry)' },
  { role: 'SQL DB Contributor',           scope: 'Database',         use: 'Application read/write to Azure SQL' },
  { role: 'Cosmos DB Account Reader',     scope: 'Account',          use: 'Read-model service (CQRS read side)' },
]

const TIER_TOPOLOGY = [
  {
    tier: 'land',
    cls: 'text-tier-land border-tier-land',
    dot: 'bg-tier-land',
    items: [
      'Single subscription; 1–2 MIs; 1 app registration',
      'PIM on Owner role only',
      'Conditional Access: MFA required for all users',
      'Single Entra ID tenant',
      'Manual access reviews quarterly',
    ],
  },
  {
    tier: 'scale',
    cls: 'text-tier-scale border-tier-scale',
    dot: 'bg-tier-scale',
    items: [
      'Multiple subscriptions; RBAC assigned to Entra ID security groups',
      'PIM on Owner and Contributor',
      'Conditional Access: MFA + device compliance + sign-in risk policy',
      'Access reviews automated via Entra ID Governance',
      'Workload Identity Federation for all CI/CD pipelines — no service principal secrets',
    ],
  },
  {
    tier: 'govern',
    cls: 'text-tier-govern border-tier-govern',
    dot: 'bg-tier-govern',
    items: [
      'Management group hierarchy; Azure Policy enforces RBAC constraints at scale',
      'Entra ID Governance: access packages, entitlement management, SCIM provisioning',
      'Cross-tenant federation for multi-entity or ISV scenarios',
      'Privileged Access Workstations (PAW) for all Owner-level operations',
      'Identity logs → Microsoft Sentinel: anomaly detection on all elevated access events',
    ],
  },
]

const ANTI_PATTERNS = [
  'Shared managed identity across multiple services — a single compromise covers the entire blast radius of all services sharing it',
  'Client secrets in app config, environment variables, or Key Vault when Workload Identity Federation is available — secrets expire, appear in logs, and cannot be scoped to a deploy',
  'Standing Owner or Contributor on production subscriptions — PIM exists for exactly this scenario; there is no legitimate reason for standing privileged access',
  'One app registration for multiple services — revoking one credential revokes access for every service sharing it',
  'Skipping Conditional Access — unmanaged or non-compliant devices reaching production APIs is an unmonitored, unmitigated risk vector',
  'Identity design deferred to Step 04 or Step 05 — the pattern chosen in Step 01 determines the identity topology; late design means rework, not refinement',
]

const TIER_LABELS = { land: 'Land', scale: 'Scale', govern: 'Govern' }
const TIER_CLASSES = {
  land:   'border-tier-land text-tier-land',
  scale:  'border-tier-scale text-tier-scale',
  govern: 'border-tier-govern text-tier-govern',
}

export default function IdentityDesign() {
  const [open, setOpen] = useState(null)

  return (
    <div className="max-w-6xl mx-auto px-8 py-12">

      {/* Header */}
      <div className="mb-10">
        <p className="text-2xs font-semibold tracking-widest uppercase text-text-secondary font-display mb-1">Design Guide</p>
        <h1 className="font-display text-3xl font-bold text-text-primary mb-4">Identity Design</h1>
        <div className="border border-waf-security/30 bg-surface px-6 py-5 max-w-3xl">
          <p className="text-2xs font-semibold uppercase tracking-widest text-waf-security font-display mb-2">Step 02 · Critical Path</p>
          <p className="text-sm font-body text-text-primary leading-relaxed">
            {hl('Identity is not bolted on before go-live. The application pattern chosen in Step 01 directly determines the identity topology — number of managed identities, RBAC scope, and Sentinel alert surface all flow from that decision. Design the identity boundary in Step 02, before a line of application code is written.')}
          </p>
        </div>
      </div>

      {/* Identity Primitives */}
      <section className="mb-10">
        <SectionHeader label="Building Blocks" title="Identity Primitives" />
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

      {/* Pattern × Identity Matrix */}
      <section className="mb-10">
        <SectionHeader label="Step 01 → Step 02" title="Pattern × Identity Matrix" />
        <p className="text-xs text-text-secondary font-body mb-3 max-w-2xl leading-relaxed">
          {hl('The application pattern selected in Step 01 determines your identity topology. Use this matrix to scope Step 02 before the design session begins.')}
        </p>
        <div className="border border-border overflow-x-auto">
          <div className="grid grid-cols-[1.4fr_1fr_1fr_0.7fr_1.8fr] min-w-[700px]">
            {['Pattern', 'Identities', 'Types', 'Complexity', 'Notes'].map(h => (
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
                  <span className="text-xs font-body text-text-secondary leading-snug">{row.identityCount}</span>
                </div>
                <div className={`px-4 py-3 ${idx < PATTERN_MATRIX.length - 1 ? 'border-b border-border' : ''} ${idx % 2 === 0 ? 'bg-surface' : 'bg-canvas/40'}`}>
                  <span className="text-xs font-mono text-text-secondary leading-snug">{row.types}</span>
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

      {/* Workload Identity Patterns */}
      <section className="mb-10">
        <SectionHeader label="Implementation" title="Workload Identity Patterns" />
        <div className="flex flex-col gap-px bg-border border border-border">
          {WORKLOAD_PATTERNS.map(p => (
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

      {/* RBAC Quick Reference */}
      <section className="mb-10">
        <SectionHeader label="RBAC" title="Built-In Role Quick Reference" />
        <p className="text-xs text-text-secondary font-body mb-3 max-w-2xl leading-relaxed">
          Assign at the narrowest scope — resource over resource group over subscription. If a built-in role grants more than the workload needs, define a custom role. No standing Owner or Contributor in production.
        </p>
        <div className="border border-border overflow-x-auto">
          <div className="grid grid-cols-[2fr_1.2fr_2fr] min-w-[500px]">
            {['Role', 'Scope', 'Use'].map(h => (
              <div key={h} className="bg-surface border-b border-border px-4 py-2.5">
                <span className="text-2xs font-semibold uppercase tracking-widest text-text-primary font-display">{h}</span>
              </div>
            ))}
            {RBAC_ROLES.map((row, idx) => (
              <Fragment key={idx}>
                <div className={`px-4 py-3 ${idx < RBAC_ROLES.length - 1 ? 'border-b border-border' : ''} ${idx % 2 === 0 ? 'bg-surface' : 'bg-canvas/40'}`}>
                  <span className="text-xs font-mono text-text-primary">{row.role}</span>
                </div>
                <div className={`px-4 py-3 ${idx < RBAC_ROLES.length - 1 ? 'border-b border-border' : ''} ${idx % 2 === 0 ? 'bg-surface' : 'bg-canvas/40'}`}>
                  <span className="text-xs font-body text-text-secondary">{row.scope}</span>
                </div>
                <div className={`px-4 py-3 ${idx < RBAC_ROLES.length - 1 ? 'border-b border-border' : ''} ${idx % 2 === 0 ? 'bg-surface' : 'bg-canvas/40'}`}>
                  <span className="text-xs font-body text-text-secondary">{row.use}</span>
                </div>
              </Fragment>
            ))}
          </div>
        </div>
      </section>

      {/* Tier Topology */}
      <section className="mb-10">
        <SectionHeader label="Tier Topology" title="Identity Complexity by Engagement Tier" />
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
        <SectionHeader label="Anti-Patterns" title="Identity Design Failures" />
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
