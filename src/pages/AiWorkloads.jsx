import { useState } from 'react'
import pillarsData from '../data/waf-pillars.json'

// ─── Static data ──────────────────────────────────────────────────────────────

const PILLAR_META = Object.fromEntries(pillarsData.map(p => [p.id, p]))

const TIER_LABEL = { land: 'Land', scale: 'Scale', govern: 'Govern' }
const TIER_COLOR = {
  land:   'text-tier-land   border-tier-land/50',
  scale:  'text-tier-scale  border-tier-scale/50',
  govern: 'text-tier-govern border-tier-govern/50',
}

const AI_PATTERNS = [
  {
    id: 'rag',
    title: 'Retrieval-Augmented Generation (RAG)',
    subtitle: 'Ground LLM responses in enterprise documents using Azure AI Search + Azure OpenAI',
    wafPrimary: 'performance-efficiency',
    wafSecondary: ['security', 'cost-optimization'],
    tiers: ['scale', 'govern'],
    summary: 'Enterprise documents are chunked, embedded into vector representations using Azure OpenAI Embeddings, and indexed in Azure AI Search. At query time the user\'s question is embedded and a hybrid search (vector + keyword) retrieves the most relevant chunks. Those chunks are injected into the prompt as grounding context, producing answers that cite source documents. No fine-tuning required — the model never sees training data, only the retrieved context.',
    whenToUse: 'Any enterprise AI application where the LLM must answer questions from internal documents, knowledge bases, or proprietary data. RAG is the right starting point before considering fine-tuning: it handles dynamic data (documents updated without retraining) and provides auditable source citations.',
    keyDesignDecisions: [
      'Chunking strategy: 512–1024 token chunks with 10–15% overlap preserves context at chunk boundaries — test with your actual documents before committing',
      'Hybrid search (vector + BM25 + semantic reranker) outperforms pure vector search for most enterprise document corpora — enable all three layers',
      'Azure OpenAI private endpoint required in production, especially for regulated data — no public endpoints',
      'Content Safety API in the request pipeline screens both user inputs and model outputs — do not rely on the model to self-censor',
      'Document-level security trimming: Azure AI Search supports AAD group-based access filters so users only retrieve documents they are authorized to see',
      'Cache embeddings for static document corpora — re-embedding on every query is wasteful; use incremental indexer runs instead'
    ],
    layers: [
      {
        name: 'Ingestion Pipeline',
        role: 'Document extraction, chunking, embedding generation, and index population — runs offline or on a schedule',
        services: ['Azure Blob Storage (document corpus)', 'Azure AI Document Intelligence (PDF/Office extraction)', 'Azure OpenAI (text-embedding-3-large / small)', 'Azure AI Search (indexer + integrated vectorization skillset)']
      },
      {
        name: 'Search & Retrieval',
        role: 'Hybrid vector + keyword query at request time with semantic reranking of top-k results',
        services: ['Azure AI Search (hybrid query: RRF-fused vector + BM25)', 'Azure AI Search Semantic Ranker (L2 reranking)', 'Azure AI Search (document-level security trimming via AAD OBO)']
      },
      {
        name: 'LLM Orchestration',
        role: 'Prompt construction, grounding context injection, streaming response generation',
        services: ['Azure OpenAI (GPT-4o or GPT-4o-mini)', 'Azure AI Foundry (prompt flow / evaluation)', 'Semantic Kernel or LangChain (SDK orchestration)', 'Azure API Management (token quota, rate limiting, semantic caching)']
      },
      {
        name: 'Safety & Responsible AI',
        role: 'Input and output content moderation, PII detection, and groundedness verification',
        services: ['Azure AI Content Safety (hate / violence / sexual / self-harm)', 'Azure AI Language (PII entity detection)', 'Azure AI Foundry (groundedness evaluation runs)', 'Azure Monitor (safety block rate alerts)']
      },
      {
        name: 'Identity & Network Security',
        role: 'Private network deployment, managed identity authentication, user identity propagation',
        services: ['Azure OpenAI (Private Endpoint)', 'Azure AI Search (Private Endpoint)', 'Managed Identity (orchestration app → AOAI + Search)', 'Microsoft Entra ID (user auth → On-Behalf-Of for security trimming)']
      },
      {
        name: 'Application & Observability',
        role: 'Chat UI hosting, end-to-end distributed traces, token usage monitoring, and quality evaluation',
        services: ['Azure App Service / Container Apps (chat UI)', 'Application Insights (OpenTelemetry traces + correlation IDs)', 'Azure Monitor (P95 latency, TTFT, token consumption)', 'Azure AI Foundry (offline evaluation: relevance, groundedness, fluency)']
      }
    ]
  },
  {
    id: 'ai-gateway',
    title: 'AI Gateway with Azure API Management',
    subtitle: 'Centralize all Azure OpenAI traffic for token governance, load balancing, and per-team metering',
    wafPrimary: 'cost-optimization',
    wafSecondary: ['security', 'operational-excellence'],
    tiers: ['scale', 'govern'],
    summary: 'All Azure OpenAI traffic from all application teams routes through a single APIM instance. APIM enforces per-team token quotas, load balances across PTU (provisioned throughput) and PAYG deployments, applies semantic caching for near-duplicate prompts, and emits per-request token usage logs for FinOps attribution — without requiring any change to application code.',
    whenToUse: 'Any organization with multiple teams consuming Azure OpenAI, or any production AI workload where token cost control, rate limiting, and audit logging are requirements. The AI Gateway pattern is nearly always the right choice at Scale and Govern tiers — the operational visibility it provides pays for the APIM cost quickly.',
    keyDesignDecisions: [
      'Semantic caching in Redis: near-duplicate prompts (cosine similarity > 0.97) are served from cache — significant cost reduction for FAQ or support-style workloads',
      'Load balance across PTU deployment (low latency, fixed cost) and PAYG overflow deployment — circuit breaker on 429 responses from PTU',
      'Per-subscription token quotas enforce team-level cost governance without application code changes',
      'Managed identity from APIM to AOAI — no API keys anywhere; APIM authenticates via its system-assigned managed identity',
      'Token usage logging to Event Hubs enables real-time FinOps dashboards and per-team chargebacks',
      'Streaming: APIM supports SSE passthrough for streaming completions — use chunked transfer, not buffered response'
    ],
    layers: [
      {
        name: 'API Gateway',
        role: 'APIM instance with token budget policies, load balancing rules, and per-subscription quota enforcement',
        services: ['Azure API Management (Standard v2 or Premium)', 'APIM Policies (token quota, load balance, retry)', 'APIM Developer Portal (team onboarding + subscription keys)']
      },
      {
        name: 'Backend Pools',
        role: 'Azure OpenAI deployments organized by SKU — PTU for steady-state, PAYG for burst overflow',
        services: ['Azure OpenAI (PTU deployment — primary)', 'Azure OpenAI (PAYG deployment — overflow)', 'Azure OpenAI (multi-region backends for HA, optional)']
      },
      {
        name: 'Semantic Cache',
        role: 'Redis-based semantic cache layer — embeddings of recent prompts matched at request time',
        services: ['Azure Cache for Redis (Premium, vector search extension)', 'Azure OpenAI (text-embedding-3-small for cache key generation)']
      },
      {
        name: 'Token Logging & Metering',
        role: 'Per-request token consumption emitted to Event Hubs for FinOps attribution and alerting',
        services: ['Azure Event Hubs (token usage stream)', 'Azure Monitor (token spend dashboards)', 'Log Analytics Workspace (audit trail)', 'Azure Cost Management (per-team chargeback exports)']
      },
      {
        name: 'Identity & Security',
        role: 'Managed identity for APIM-to-AOAI authentication, no API keys in policy configuration',
        services: ['Managed Identity (APIM system-assigned → AOAI)', 'Azure Key Vault (APIM named values — no inline secrets)', 'Microsoft Entra ID (caller authentication to APIM)', 'Private Endpoint (APIM → AOAI, internal mode)']
      }
    ]
  }
]

const CONSIDERATIONS = [
  {
    title: 'Latency & Streaming',
    body: 'LLMs are fundamentally different from standard APIs. Expect 1–5s TTFT (time to first token) and 5–30s total completion time at P95. Design UX for streaming (SSE) — never buffer the full response before displaying. Configure APIM, App Service, and upstream load balancers with at least 60s timeouts. Do not put LLM calls on synchronous request paths without explicit user expectation management.'
  },
  {
    title: 'Token Cost Modeling',
    body: 'Token cost is not infrastructure cost. Input tokens and output tokens are priced separately — output is typically 3x more expensive. Model selection matters: GPT-4o-mini is ~15x cheaper than GPT-4o for simple tasks. Use PTU (Provisioned Throughput Units) for steady-state predictable workloads; PAYG for burst. Budget for semantic caching — even 20% cache hit rate meaningfully reduces spend at scale.'
  },
  {
    title: 'Content Safety',
    body: 'Never rely on the model\'s built-in guardrails alone. Azure AI Content Safety provides a separate API that screens both input and output across four harm categories (hate, violence, sexual, self-harm) with configurable severity thresholds. Add a groundedness detection pass in RAG workloads to catch hallucinated citations. Log safety block events to Azure Monitor — unexpectedly high block rates indicate either adversarial inputs or an over-tuned policy.'
  },
  {
    title: 'Private Deployment',
    body: 'Azure OpenAI and Azure AI Search both support Private Endpoints. For regulated data (HIPAA, PCI, FedRAMP), private endpoints are not optional. The orchestration app must reach AOAI via Private Endpoint — this requires VNet integration for App Service or a private AKS cluster. DNS for private AOAI endpoints resolves via the hub\'s DNS Private Resolver; do not use public DNS for private endpoint addresses.'
  }
]

const MODELS = [
  { name: 'GPT-4o',              context: '128K', strengths: 'Multimodal, complex reasoning, function calling', use: 'Default for production RAG, agents, and complex tasks' },
  { name: 'GPT-4o-mini',         context: '128K', strengths: 'Fast, cost-efficient, strong at structured output', use: 'High-volume applications, classification, simple extraction' },
  { name: 'o3',                  context: '200K', strengths: 'Extended chain-of-thought, mathematical reasoning',  use: 'Complex analysis, code generation, audit reasoning' },
  { name: 'text-embedding-3-large', context: '8K', strengths: 'Highest retrieval accuracy',                       use: 'Production RAG where retrieval quality is critical' },
  { name: 'text-embedding-3-small', context: '8K', strengths: '5x cheaper than large, still strong',              use: 'Cost-sensitive RAG, high-volume embedding workloads' },
]

const STEP_IMPLICATIONS = [
  { step: '01', label: 'Deconstruct Constraints',    note: 'Latency SLA is different for AI — define P95 TTFT and total response time targets, not just uptime. "Response in < 500ms" is not achievable for LLM inference.' },
  { step: '02', label: 'Identity & Security Boundary', note: 'Azure OpenAI and AI Search must be in the governance boundary with Private Endpoints. AOAI regional availability varies — check quota availability in target regions early.' },
  { step: '03', label: 'Data Flow & Storage',          note: 'Document corpus (Blob Storage) and embedding index (AI Search) are first-class data stores. Define retention, access control, and re-indexing cadence alongside traditional data stores.' },
  { step: '04', label: 'Compute & Network',            note: 'No GPU procurement for inference (managed by Azure OpenAI). Orchestration layer (App Service or Container Apps) needs VNet integration to reach private AOAI endpoint.' },
  { step: '05', label: 'Blast Radius & Reliability',   note: 'Standard framework guidance applies. AI-specific note: AOAI service outages affect all tenants in a region simultaneously — multi-region AOAI deployment with APIM load balancing is the mitigation at Govern tier.' },
  { step: '06', label: 'Cost Modeling',                note: 'Token costs are separate from infrastructure costs. Model both PTU commitment cost and PAYG overflow. Include semantic cache hit rate assumptions in the cost model.' },
  { step: '07', label: 'Deployment & Operations',      note: 'Model version changes are breaking changes — pin API versions in code. Include content safety evaluation in CI pipeline. Define a model deprecation runbook.' },
]

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

function TierBadge({ tier }) {
  return (
    <span className={`pillar-badge text-2xs ${TIER_COLOR[tier] ?? ''}`}>
      {TIER_LABEL[tier] ?? tier}
    </span>
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

function ServiceChip({ label }) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 border border-border bg-canvas text-2xs font-mono text-text-mono">
      {label}
    </span>
  )
}

function SectionLabel({ children }) {
  return (
    <p className="text-2xs font-semibold tracking-widest uppercase text-text-secondary font-display mb-2">
      {children}
    </p>
  )
}

function LayerGrid({ layers }) {
  return (
    <div className="space-y-2">
      {layers.map((layer, i) => (
        <div key={i} className="border border-border/60 bg-canvas">
          <div className="px-4 py-2 border-b border-border/60 bg-surface/60">
            <p className="text-xs font-semibold font-display text-text-primary">{layer.name}</p>
            <p className="text-2xs text-text-secondary font-body leading-relaxed mt-0.5">{layer.role}</p>
          </div>
          <div className="px-4 py-3 flex flex-wrap gap-1.5">
            {layer.services.map(svc => <ServiceChip key={svc} label={svc} />)}
          </div>
        </div>
      ))}
    </div>
  )
}

function PatternDetail({ pattern }) {
  return (
    <div className="border-t border-border bg-canvas/60 px-5 pb-6 pt-5 space-y-6">

      {pattern.whenToUse && (
        <div>
          <SectionLabel>When to Use</SectionLabel>
          <p className="text-sm text-text-secondary font-body leading-relaxed">{pattern.whenToUse}</p>
        </div>
      )}

      {pattern.layers?.length > 0 && (
        <div>
          <SectionLabel>Component Layers</SectionLabel>
          <LayerGrid layers={pattern.layers} />
        </div>
      )}

      {pattern.keyDesignDecisions?.length > 0 && (
        <div>
          <SectionLabel>Key Design Decisions</SectionLabel>
          <ul className="space-y-2">
            {pattern.keyDesignDecisions.map((d, i) => (
              <li key={i} className="flex gap-3 text-sm">
                <span className="font-mono text-text-secondary/50 shrink-0 pt-px select-none">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className="text-text-secondary font-body leading-relaxed">{d}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {pattern.wafSecondary?.length > 0 && (
        <div>
          <SectionLabel>Secondary WAF Pillars</SectionLabel>
          <div className="flex flex-wrap gap-1.5">
            {pattern.wafSecondary.map(pid => <PillarBadge key={pid} id={pid} />)}
          </div>
        </div>
      )}
    </div>
  )
}

function PatternCard({ pattern }) {
  const [open, setOpen] = useState(false)
  const primaryMeta = PILLAR_META[pattern.wafPrimary]

  return (
    <div className={`border bg-surface transition-colors ${open ? 'border-accent/40' : 'border-border hover:border-border/80'}`}>
      <button onClick={() => setOpen(o => !o)} className="w-full text-left px-5 py-4">
        <div className="flex items-start gap-3">
          <div
            className="w-0.5 self-stretch shrink-0 mt-0.5"
            style={{ backgroundColor: primaryMeta?.color ?? '#1e2d40' }}
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-1">
              <span className={`font-display text-sm font-semibold leading-snug ${open ? 'text-accent' : 'text-text-primary'} transition-colors`}>
                {pattern.title}
              </span>
            </div>
            {pattern.subtitle && (
              <p className="text-2xs text-text-secondary font-body mb-2 leading-relaxed">{pattern.subtitle}</p>
            )}
            <div className="flex flex-wrap gap-1.5 mb-2">
              {pattern.tiers.map(t => <TierBadge key={t} tier={t} />)}
              {pattern.wafPrimary && <PillarBadge id={pattern.wafPrimary} />}
            </div>
            {!open && (
              <p className="text-xs text-text-secondary font-body leading-relaxed">{pattern.summary}</p>
            )}
          </div>
          <ChevronIcon open={open} />
        </div>
      </button>

      {open && (
        <>
          <div className="px-5 pb-4 border-t border-border/30 pt-4">
            <p className="text-sm text-text-secondary font-body leading-relaxed">{pattern.summary}</p>
          </div>
          <PatternDetail pattern={pattern} />
        </>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AiWorkloads() {
  return (
    <div className="max-w-5xl mx-auto px-8 py-12 space-y-14">

      {/* ── Header ── */}
      <div>
        <p className="text-2xs font-semibold tracking-widest uppercase text-text-secondary font-display mb-1">
          Specialization
        </p>
        <h1 className="font-display text-3xl font-bold text-text-primary mb-3">
          AI Workloads on Azure
        </h1>
        <p className="text-text-secondary font-body text-sm leading-relaxed max-w-2xl">
          AI workloads on Azure have fundamentally different latency profiles, cost models, and
          operational concerns than traditional workloads. This section covers the dominant enterprise
          AI architecture patterns, cross-cutting design guidance, and a model reference for
          the most common enterprise AI workload scenarios.
        </p>
      </div>

      {/* ── Architecture patterns ── */}
      <section>
        <h2 className="font-display text-lg font-semibold text-text-primary mb-1">
          Architecture Patterns
        </h2>
        <p className="text-sm text-text-secondary font-body mb-5">
          The two patterns below cover the majority of enterprise AI workloads on Azure. RAG is
          the right starting point for document Q&amp;A and knowledge retrieval. The AI Gateway
          is the right governance layer as soon as multiple teams share Azure OpenAI capacity.
        </p>
        <div className="space-y-3">
          {AI_PATTERNS.map(p => <PatternCard key={p.id} pattern={p} />)}
        </div>
      </section>

      {/* ── Cross-cutting considerations ── */}
      <section>
        <h2 className="font-display text-lg font-semibold text-text-primary mb-1">
          Cross-Cutting Considerations
        </h2>
        <p className="text-sm text-text-secondary font-body mb-5">
          These concerns apply to every AI workload regardless of pattern.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-start">
          {CONSIDERATIONS.map(c => (
            <div key={c.title} className="border border-border bg-surface px-5 py-4">
              <p className="text-xs font-semibold font-display text-text-primary mb-2">{c.title}</p>
              <p className="text-xs text-text-secondary font-body leading-relaxed">{c.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Model reference ── */}
      <section>
        <h2 className="font-display text-lg font-semibold text-text-primary mb-1">
          Model Quick Reference
        </h2>
        <p className="text-sm text-text-secondary font-body mb-5">
          Azure OpenAI model selection affects latency, cost, and capability. Choose the smallest
          model that satisfies the task requirements.
        </p>
        <div className="border border-border overflow-hidden">
          <table className="w-full text-xs font-body">
            <thead>
              <tr className="bg-surface border-b border-border">
                <th className="px-4 py-2.5 text-left font-semibold font-display text-text-primary text-2xs tracking-wide">Model</th>
                <th className="px-4 py-2.5 text-left font-semibold font-display text-text-primary text-2xs tracking-wide">Context</th>
                <th className="px-4 py-2.5 text-left font-semibold font-display text-text-primary text-2xs tracking-wide hidden md:table-cell">Strengths</th>
                <th className="px-4 py-2.5 text-left font-semibold font-display text-text-primary text-2xs tracking-wide">Typical Use</th>
              </tr>
            </thead>
            <tbody>
              {MODELS.map((m, i) => (
                <tr key={m.name} className={`border-b border-border/50 ${i % 2 === 0 ? 'bg-canvas' : 'bg-surface/30'}`}>
                  <td className="px-4 py-3 font-mono text-accent text-2xs whitespace-nowrap">{m.name}</td>
                  <td className="px-4 py-3 text-text-secondary font-mono text-2xs whitespace-nowrap">{m.context}</td>
                  <td className="px-4 py-3 text-text-secondary hidden md:table-cell leading-relaxed">{m.strengths}</td>
                  <td className="px-4 py-3 text-text-secondary leading-relaxed">{m.use}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Framework step implications ── */}
      <section>
        <h2 className="font-display text-lg font-semibold text-text-primary mb-1">
          7-Step Framework Implications
        </h2>
        <p className="text-sm text-text-secondary font-body mb-5">
          AI workloads change the inputs to several framework steps. The steps not listed here
          follow the standard framework guidance without AI-specific adjustments.
        </p>
        <div className="space-y-2">
          {STEP_IMPLICATIONS.map(s => (
            <div key={s.step} className="border border-border bg-surface px-5 py-3 flex gap-4">
              <span className="font-mono text-text-secondary/50 text-xs shrink-0 pt-0.5 select-none w-6">
                {s.step}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold font-display text-text-primary mb-1">{s.label}</p>
                <p className="text-xs text-text-secondary font-body leading-relaxed">{s.note}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

    </div>
  )
}
