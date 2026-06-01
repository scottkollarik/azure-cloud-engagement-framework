import { useState } from 'react'

// ─── Data ─────────────────────────────────────────────────────────────────────

const GENERAL = [
  {
    symptom: 'Private Endpoint / PaaS service unreachable after deployment',
    causes: [
      'Private DNS Zone not linked to the VNet where compute is running',
      'DNS query routing to public DNS instead of the hub DNS Private Resolver',
      'Private DNS Zone A record not created (requires DeployIfNotExists policy or manual creation)',
      'Public endpoint not disabled — app is accidentally resolving and connecting over public internet',
      'NSG on the Private Endpoint subnet blocking inbound port 443',
    ],
    mitigations: [
      'Run: nslookup <service>.privatelink.<region>.database.windows.net from inside the VNet — must resolve to a private IP (10.x.x.x), not a public Azure IP',
      'Verify Private DNS Zone is linked to the correct VNet (hub VNet in hub-spoke; or spoke directly in flat topology)',
      'Confirm DNS Private Resolver inbound endpoint is in the hub and spoke VNets are pointing to it as their DNS server',
      'Check Private Endpoint NIC is in the correct subnet and NSG rules allow inbound 443 from the compute subnet',
      'Use Azure Network Watcher Connection Monitor to validate reachability end-to-end',
    ]
  },
  {
    symptom: 'Application Gateway or Front Door returning 502 / 503',
    causes: [
      'Origin (backend pool member) health probe failing — most common cause of 502',
      'Health probe path returning non-200 status (e.g., /healthz returning 404)',
      'Backend App Service or VM is stopped, restarting, or in a deployment slot swap',
      'App Service outbound IP changed after plan migration — WAF IP restriction list stale',
      'TLS certificate mismatch between Application Gateway and backend (end-to-end TLS mode)',
    ],
    mitigations: [
      'Check Application Gateway backend health blade — unhealthy members show reason (DNS resolution, TCP, HTTP status)',
      'Verify health probe path exists and returns exactly HTTP 200 — do not reuse the app homepage',
      'For App Service: confirm the service plan is running and the correct slot is in the production pool',
      'Review App Service access restrictions — Application Gateway outbound IPs must be allowed',
      'In end-to-end TLS mode: confirm backend certificate CN matches the FQDN Application Gateway uses for the probe',
    ]
  },
  {
    symptom: 'AKS pod OOM kill or eviction (OutOfMemory / Evicted)',
    causes: [
      'Container memory limit set too low — kernel OOM killer terminates the process',
      'Memory request not set — scheduler places pod on a node without adequate headroom',
      'Memory leak in application code — usage grows unbounded until limit is hit',
      'Node memory pressure — DaemonSet or system pods consuming excess memory on small nodes',
      'Java heap not bounded by JVM flags — JVM defaults to 25% of system RAM, ignoring cgroup limits',
    ],
    mitigations: [
      'Set both requests and limits on every container — requests drive scheduling, limits trigger OOM kill',
      'Start with limit = 2× average observed usage (kubectl top pod), then tune based on P99',
      'Enable Vertical Pod Autoscaler (VPA) in recommendation mode to get right-sizing suggestions without automatic changes',
      'For Java: set -XX:MaxRAMPercentage=75 to bound heap within the container cgroup limit',
      'Check kubectl describe node for memory pressure condition and identify which pods are consuming the most via kubectl top pod --all-namespaces',
    ]
  },
  {
    symptom: 'Unexpected Azure cost spike',
    causes: [
      'Data egress charges — large volumes of data leaving Azure to the internet or across regions',
      'Storage lifecycle policy missing — blobs accumulating in Hot tier instead of moving to Cool/Archive',
      'Oversized SKU provisioned during testing and never right-sized for production',
      'Dev/test resources left running overnight or over weekends',
      'Azure Cognitive Services / OpenAI token usage spike from a misbehaving consumer',
    ],
    mitigations: [
      'Open Azure Cost Management → Cost Analysis → filter by Meter Category "Bandwidth" — egress charges surface immediately',
      'Add Blob Storage lifecycle policies: move to Cool after 30 days, Archive after 90, delete after retention period',
      'Set budget alerts at 80% and 100% of monthly budget — Cost Management → Budgets',
      'Enable Azure Advisor cost recommendations — identifies idle resources, right-sizing opportunities, and Reserved Instance candidates',
      'Tag all resources with environment=dev and use Azure Policy to enforce auto-shutdown schedules on dev VMs',
      'For OpenAI: set per-subscription token quotas in APIM; alert on token-per-minute utilization exceeding threshold',
    ]
  },
  {
    symptom: 'Distributed tracing gaps — requests invisible in Application Insights end-to-end view',
    causes: [
      'Service not instrumented with OpenTelemetry or Application Insights SDK',
      'HTTP client not propagating W3C TraceContext headers (traceparent / tracestate) to downstream services',
      'Azure Function or Logic App in the call chain breaking the trace context (no auto-propagation by default)',
      'Service Bus / Event Hubs consumers not extracting trace context from message properties',
      'Multiple Application Insights resources — correlated traces require all services to use the same resource or linked workspaces',
    ],
    mitigations: [
      'Add OpenTelemetry auto-instrumentation for the language runtime — .NET, Python, Java, Node.js all have zero-code options',
      'Verify traceparent header is present in outbound HTTP calls via browser DevTools Network tab or Fiddler',
      'For Service Bus / Event Hubs: use Diagnostic.Activity.SetIdFormat(ActivityIdFormat.W3C) and propagate via message ApplicationProperties',
      'In AKS: deploy Istio with distributed tracing enabled — it auto-propagates trace headers for all inter-pod HTTP without code changes',
      'Check Application Insights → Transaction Search → filter by operation_Id to confirm cross-service correlation is working',
    ]
  },
  {
    symptom: 'ExpressRoute or VPN failover not working as expected',
    causes: [
      'VPN Gateway SKU is not ErGw1AZ or higher — lower SKUs cannot coexist with ExpressRoute',
      'BGP AS path mismatch — VPN and ExpressRoute routes advertised with different BGP communities or weights',
      'Local Network Gateway address space not updated after on-premises network change',
      'IKE policy mismatch between Azure VPN Gateway and on-premises firewall',
      'ExpressRoute circuit in "Not Provisioned" state — carrier provisioning not complete',
    ],
    mitigations: [
      'Verify VPN Gateway SKU in portal: must be VpnGw1AZ or higher (or ErGw1AZ for coexistence SKU)',
      'Use Azure Network Watcher → VPN Diagnostics to capture IKE negotiation logs',
      'Run Get-AzVirtualNetworkGatewayLearnedRoute to confirm BGP route table includes both ExpressRoute and VPN paths',
      'Check ExpressRoute circuit status: both Provider Status and Circuit Status must be "Enabled" / "Provisioned"',
      'Test failover in a maintenance window — never rely on theoretical BGP failover without a real failover drill',
    ]
  },
]

const AI_SPECIFIC = [
  {
    symptom: 'High P95 / P99 latency spikes on LLM completions',
    causes: [
      'PTU (provisioned throughput) capacity exhausted — requests spill to shared PAYG capacity with higher queuing latency',
      'Large context windows: 128K token prompts take significantly longer to process than 4K prompts',
      'Cold start on first request to a deployment idle for > 5 minutes',
      'AI Search semantic reranker adds 200–500ms — this stacks with LLM latency on the same request path',
      'Application not streaming — buffering the full completion before responding adds the full generation time to perceived latency',
    ],
    mitigations: [
      'Monitor TPM (tokens per minute) utilization on the PTU deployment — provision at 70% of peak load to leave headroom before spillover',
      'Trim retrieved context: inject only the top-3 chunks unless P99 latency budget allows more',
      'Enable streaming (stream: true) in the OpenAI API call — display tokens as they arrive rather than waiting for the full response',
      'Use Azure API Management retry + circuit breaker to route overflow to PAYG faster than the default timeout',
      'Disable semantic reranker on interactive paths (≤ 3s budget) — enable it only for async or batch queries',
    ]
  },
  {
    symptom: 'Azure OpenAI 429 — rate limit exceeded / throttling',
    causes: [
      'TPM (tokens per minute) quota exhausted on the deployment',
      'RPM (requests per minute) quota hit independently of token count — many small requests can exhaust RPM before TPM',
      'Multiple application teams sharing a single deployment without quota enforcement',
      'Retry logic using fixed sleep instead of exponential backoff — retries amplify the quota exhaustion',
    ],
    mitigations: [
      'Route all traffic through APIM with per-subscription token quotas — prevents any single team from exhausting shared capacity',
      'Implement exponential backoff with jitter on 429 responses — never retry immediately',
      'Request quota increase in Azure portal: OpenAI → Quotas → select deployment → request increase',
      'Deploy an additional PAYG deployment as overflow backend behind APIM — PTU for steady state, PAYG for burst',
      'Check if RPM is the binding constraint (not TPM) — small but frequent requests hit RPM limits even at low token usage',
    ]
  },
  {
    symptom: 'Context window exhausted (400: context_length_exceeded)',
    causes: [
      'Conversation history stored as raw messages — grows without bound across multi-turn sessions',
      'Retrieved RAG chunks too large relative to the model context budget after accounting for system prompt and history',
      'System prompt + few-shot examples consuming a fixed large slice of the context window on every request',
    ],
    mitigations: [
      'Calculate token budget explicitly: available_for_chunks = max_context − system_prompt_tokens − history_tokens − max_completion_tokens',
      'Use tiktoken with cl100k_base encoding to count tokens precisely — never estimate by character count or word count',
      'Implement sliding window for conversation history: keep the last N turns, summarize older turns into a single compressed message',
      'Consider a summarization pass: when history exceeds a threshold, call GPT-4o-mini to compress it before the main completion call',
    ]
  },
  {
    symptom: 'Hallucinated or ungrounded answers in RAG responses',
    causes: [
      'Retrieved chunks do not contain the answer — the model hallucinates to fill the gap rather than stating it does not know',
      'Chunk overlap too low — answers that span chunk boundaries are split across two non-adjacent chunks',
      'Pure vector search used — misses keyword-heavy technical terms that vector similarity does not capture well',
      'Semantic reranker not enabled — low-relevance chunks occupy top-k slots, diluting the grounding context',
    ],
    mitigations: [
      'Instruct the model explicitly in the system prompt: "If the provided context does not contain enough information to answer, say so. Do not speculate."',
      'Enable hybrid search (BM25 + vector) and verify semantic reranker is active on the Azure AI Search index',
      'Increase chunk overlap to 15–20% for dense technical or regulatory documents',
      'Add a groundedness evaluation step using Azure AI Foundry evaluation or the Content Safety groundedness detection API',
      'Log retrieval results alongside responses — if retrieved chunks consistently miss the answer, the issue is in the index, not the model',
    ]
  },
  {
    symptom: 'Distributed tracing gaps between application and Azure OpenAI / AI Search',
    causes: [
      'OpenAI SDK calls not wrapped in an OpenTelemetry span — LLM calls appear as blank spots in the trace',
      'APIM not forwarding traceparent header to the AOAI backend',
      'Azure AI Search queries not correlated to the parent request operation_Id',
      'Multiple Application Insights resources used — cross-service correlation requires a shared resource or linked workspace',
    ],
    mitigations: [
      'Use the Azure OpenAI + OpenTelemetry integration (semantic-kernel or langchain-azure-openai) — emits spans for prompt, completion, and token counts',
      'Add APIM inbound policy: <set-header name="traceparent" exists-action="skip"><value>@(context.Request.Headers.GetValueOrDefault("traceparent",""))</value></set-header>',
      'Log the x-ms-client-request-id from AOAI response headers alongside Application Insights operation_Id for cross-service lookup',
      'Confirm all services write to the same Application Insights resource (same instrumentation key / connection string)',
    ]
  },
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

function SectionLabel({ children }) {
  return (
    <p className="text-2xs font-semibold tracking-widest uppercase text-text-secondary font-display mb-2">
      {children}
    </p>
  )
}

function TroubleshootingCard({ item }) {
  const [open, setOpen] = useState(false)

  return (
    <div className={`border bg-surface transition-colors ${open ? 'border-accent/30' : 'border-border hover:border-border/80'}`}>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full text-left px-5 py-4 flex items-center gap-3"
      >
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-semibold font-display leading-snug ${open ? 'text-accent' : 'text-text-primary'} transition-colors`}>
            {item.symptom}
          </p>
        </div>
        <ChevronIcon open={open} />
      </button>

      {open && (
        <div className="border-t border-border bg-canvas/60 px-5 pb-6 pt-5 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <SectionLabel>Likely Causes</SectionLabel>
            <ul className="space-y-2">
              {item.causes.map((c, i) => (
                <li key={i} className="flex gap-2 text-xs text-text-secondary font-body leading-relaxed">
                  <span className="text-text-secondary/40 shrink-0 font-mono pt-px select-none">—</span>
                  {c}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <SectionLabel>Mitigations</SectionLabel>
            <ul className="space-y-2">
              {item.mitigations.map((m, i) => (
                <li key={i} className="flex gap-2 text-xs text-text-secondary font-body leading-relaxed">
                  <span className="text-tier-govern shrink-0 font-mono pt-px select-none">→</span>
                  {m}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}

function TroubleshootingSection({ title, description, items }) {
  return (
    <section>
      <h2 className="font-display text-lg font-semibold text-text-primary mb-1">{title}</h2>
      <p className="text-sm text-text-secondary font-body mb-5">{description}</p>
      <div className="space-y-2">
        {items.map(item => (
          <TroubleshootingCard key={item.symptom} item={item} />
        ))}
      </div>
    </section>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Troubleshooting() {
  return (
    <div className="max-w-5xl mx-auto px-8 py-12 space-y-14">

      {/* ── Header ── */}
      <div>
        <p className="text-2xs font-semibold tracking-widest uppercase text-text-secondary font-display mb-1">
          Operations
        </p>
        <h1 className="font-display text-3xl font-bold text-text-primary mb-3">
          Troubleshooting
        </h1>
        <p className="text-text-secondary font-body text-sm leading-relaxed max-w-2xl">
          Common failure modes in Azure workloads, organized by symptom. Each entry pairs likely
          root causes with concrete diagnostic steps and mitigations. General Azure workload issues
          are covered first, followed by AI-specific failure modes.
        </p>
      </div>

      <TroubleshootingSection
        title="General Azure Workloads"
        description="Networking, compute, cost, and observability issues that apply across workload types and engagement tiers."
        items={GENERAL}
      />

      <TroubleshootingSection
        title="AI Workloads"
        description="Failure modes specific to LLM-based workloads on Azure OpenAI, Azure AI Search, and the RAG pattern."
        items={AI_SPECIFIC}
      />

    </div>
  )
}
