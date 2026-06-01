import { useState, Fragment } from 'react'
import { hl } from '../utils/hl'

const PRIMITIVES = [
  {
    term: 'Virtual Network',
    abbr: 'VNet',
    color: 'border-waf-operations text-waf-operations',
    def: 'Isolated network boundary in Azure. Every workload gets at least one VNet. Address space is defined once and cannot overlap with peered networks or on-premises ranges — CIDR allocation is a one-way door.',
  },
  {
    term: 'Subnet',
    abbr: 'Sub',
    color: 'border-waf-operations text-waf-operations',
    def: 'Logical subdivision of a VNet. NSGs and Private Endpoints attach at subnet level. Each subnet requires a dedicated address range; Azure reserves 5 IPs per subnet.',
  },
  {
    term: 'Network Security Group',
    abbr: 'NSG',
    color: 'border-waf-security text-waf-security',
    def: 'Stateful L4 firewall rules attached to subnets or NICs. Deny all by default; allow only what is documented. Prefer subnet-level attachment over NIC-level for manageability.',
  },
  {
    term: 'Private Endpoint',
    abbr: 'PE',
    color: 'border-waf-security text-waf-security',
    def: 'Projects a PaaS service (Key Vault, Service Bus, Storage, SQL) into a VNet with a private IP. Requires a matching Private DNS Zone — without it, the client resolves to the public IP and bypasses the private endpoint entirely.',
  },
  {
    term: 'Azure Private DNS',
    abbr: 'DNS',
    color: 'border-waf-reliability text-waf-reliability',
    def: 'Resolves Private Endpoint hostnames to private IPs within the VNet. One zone per service type (privatelink.vaultcore.azure.net, privatelink.servicebus.windows.net, etc.). Must be linked to every VNet that needs resolution.',
  },
  {
    term: 'User-Defined Route',
    abbr: 'UDR',
    color: 'border-waf-operations text-waf-operations',
    def: 'Overrides Azure default routing. Used to force egress traffic through Azure Firewall in a hub-spoke topology. Required whenever a centralized firewall inspects spoke-to-internet or spoke-to-spoke traffic.',
  },
  {
    term: 'VNet Peering',
    abbr: 'Peer',
    color: 'border-waf-reliability text-waf-reliability',
    def: 'Connects two VNets at low latency. Non-transitive by default — hub-spoke requires explicit peering from each spoke to the hub. Peering is not a substitute for a firewall; it is transport, not security.',
  },
  {
    term: 'Azure Firewall',
    abbr: 'AFW',
    color: 'border-waf-security text-waf-security',
    def: 'Managed stateful L4/L7 firewall. Central egress and east-west control in hub-spoke topologies. FQDN filtering, threat intelligence feed, TLS inspection on Premium SKU. Required at Scale tier and above for regulated workloads.',
  },
]

const TOPOLOGY_PATTERNS = [
  {
    id: 'flat-vnet',
    label: 'Flat VNet',
    tagline: 'Single VNet, segmented by subnet',
    tiers: ['land'],
    when: 'Single workload, single team, no on-premises connectivity requirement. The correct default at Land tier — adds zero operational overhead and can be extended to hub-spoke when the team topology warrants it.',
    how: [
      'Allocate a /16 address space per region minimum — resizing a VNet later requires recreating all resources',
      'Create 3–4 subnets: app tier (/24), data tier (/24), management (/27), private-endpoints (/27)',
      'Attach NSG to each subnet; define deny-all inbound as the base rule',
      'Private Endpoints for Key Vault and SQL in the private-endpoints subnet with matching DNS zones',
      'No peering required; no firewall required at Land tier unless compliance mandates it',
    ],
    notes: 'Flat does not mean unstructured. Subnet boundaries with NSGs provide meaningful segmentation without the hub operational overhead.',
  },
  {
    id: 'hub-spoke',
    label: 'Hub-Spoke',
    tagline: 'Shared services hub, isolated workload spokes',
    tiers: ['scale', 'govern'],
    when: 'Multiple workloads or teams requiring network isolation, shared connectivity (VPN/ExpressRoute), or centralized egress inspection. The standard topology at Scale tier.',
    how: [
      'Hub VNet: Azure Firewall, VPN/ExpressRoute Gateway, Azure Bastion, shared DNS resolvers',
      'Spoke VNets: one per workload or environment; peered to hub with Use Remote Gateway and Allow Gateway Transit enabled',
      'UDRs in each spoke route 0.0.0.0/0 to Azure Firewall private IP',
      'No direct spoke-to-spoke peering — all spoke-to-spoke traffic transits hub firewall for inspection',
      'Private DNS zones linked to hub VNet; DNS queries from spokes resolve via hub',
    ],
    notes: 'Hub-spoke is a topology, not a security boundary. The Firewall policy is the security boundary — an empty or permissive firewall policy provides no protection.',
  },
  {
    id: 'virtual-wan',
    label: 'Azure Virtual WAN',
    tagline: 'Microsoft-managed hub with automated routing at enterprise scale',
    tiers: ['govern'],
    when: 'Large enterprise with 10+ branch offices, multiple Azure regions, SD-WAN integration, or a requirement for any-to-any connectivity without manually managing peering and UDRs.',
    how: [
      'Create a Virtual WAN and one Virtual Hub per region',
      'Connect branch offices via VPN sites or ExpressRoute circuits — routing is automated by the hub',
      'Deploy Azure Firewall inside the Virtual Hub (Secured Virtual Hub) for centralized policy',
      'Spoke VNets connect to the Virtual Hub, not to each other',
      'Routing Intent policies enforce that all traffic (private + internet) transits the hub firewall',
    ],
    notes: 'Virtual WAN removes the manual peering and UDR management burden that hub-spoke accumulates at scale. The tradeoff is less granular control over routing — evaluate carefully before committing.',
  },
  {
    id: 'paas-only',
    label: 'PaaS-Only (No VNet)',
    tagline: 'Serverless and PaaS workloads with no VNet requirement',
    tiers: ['land'],
    when: 'Proof-of-concept, internal tooling, or workloads where all services are PaaS and no compliance requirement mandates network isolation. Acceptable only at Land tier and only for non-regulated data.',
    how: [
      'Use Azure service firewalls (allow specific IPs/service tags) rather than open public endpoints',
      'Enforce Managed Identity for all service-to-service authentication — no shared keys on public endpoints',
      'Enable Microsoft Defender for Cloud for all PaaS resources',
      'Document explicitly that this workload has no VNet and why — make the decision visible',
    ],
    notes: 'PaaS-only is not inherently insecure, but it is not an acceptable default for regulated workloads. The moment compliance is in scope, add a VNet and Private Endpoints before data is loaded.',
  },
]

const CIDR_RULES = [
  'Reserve /16 per region minimum — resizing requires resource recreation, not reconfiguration; get it right before provisioning',
  'Azure reserves 5 IPs per subnet (network address, gateway, broadcast, and 2 Azure platform addresses) — account for this in all subnet calculations',
  'App tier: /24 (251 usable). Data tier: /24. Management: /27 (27 usable). Gateway subnet: /27 minimum, /26 recommended for VPN Gateway with multiple connections',
  'Private Endpoint subnet: /27 minimum — each PE uses 1 IP but reserve room; a /27 supports 27 endpoints before readdressing',
  'Never overlap with on-premises address space — get the IPAM team involved before any allocation; overlapping ranges cannot be peered or connected via VPN/ExpressRoute',
  'Document the full address plan in the ADR before any IaC is written — CIDR is a one-way decision',
]

const NSG_PRINCIPLES = [
  'Start with deny-all inbound; allow only documented traffic — undocumented open ports are undocumented attack surface',
  'Use Service Tags instead of IP ranges for Azure service traffic (AzureCloud, Storage, Sql, AzureMonitor, ApplicationGateway) — IP ranges change; Service Tags track those changes automatically',
  'Application Security Groups for micro-segmentation within a subnet — group VMs or containers by role, not IP; rules read as "allow AppServers to reach DataServers on 1433"',
  'Define outbound rules — the default "allow all outbound" is an exfiltration risk; constrain egress to known destinations and ports',
  'Enable NSG Flow Logs → Log Analytics — traffic visibility is a security requirement, not an optional diagnostic; flow logs are how you detect anomalous east-west traffic',
  'Never use NSGs as a substitute for Private Endpoints — NSGs control traffic; Private Endpoints remove public exposure. Both are required for regulated workloads.',
]

const PRIVATE_ENDPOINTS = [
  { service: 'Azure Key Vault',          zone: 'privatelink.vaultcore.azure.net',         notes: 'Required in all production workloads; secrets, certificates, and keys must not traverse the public internet' },
  { service: 'Azure Service Bus',        zone: 'privatelink.servicebus.windows.net',       notes: 'Required for regulated messaging workloads; one PE per namespace' },
  { service: 'Azure Event Hubs',         zone: 'privatelink.servicebus.windows.net',       notes: 'Shares the Service Bus DNS zone; one PE per namespace' },
  { service: 'Azure Storage (Blob)',     zone: 'privatelink.blob.core.windows.net',        notes: 'Separate PE per storage service subtype (blob, table, queue, file each have distinct zones)' },
  { service: 'Azure SQL Database',       zone: 'privatelink.database.windows.net',         notes: 'Always Private Endpoint in production; SQL public endpoint should be disabled after PE is validated' },
  { service: 'Azure Cosmos DB',          zone: 'privatelink.documents.azure.com',          notes: 'One PE per account; additional zones required if using Table, Gremlin, or Cassandra APIs' },
  { service: 'Azure OpenAI',             zone: 'privatelink.openai.azure.com',             notes: 'Required for AI workloads processing sensitive or regulated data' },
  { service: 'Azure Container Registry', zone: 'privatelink.azurecr.io',                   notes: 'Required when AKS pulls images in a locked-down network — public pull is blocked by NSG egress rules' },
]

const TIER_TOPOLOGY = [
  {
    tier: 'land',
    cls: 'text-tier-land border-tier-land',
    dot: 'bg-tier-land',
    items: [
      'Single VNet /16 address space',
      '3–4 subnets: app, data, management, private-endpoints',
      'NSGs on every subnet; deny-all inbound baseline',
      'Private Endpoints: Key Vault + SQL minimum',
      'No hub, no peering, no firewall required',
    ],
  },
  {
    tier: 'scale',
    cls: 'text-tier-scale border-tier-scale',
    dot: 'bg-tier-scale',
    items: [
      'Hub-Spoke topology; Azure Firewall in hub',
      'Spoke per workload or environment; UDRs force egress through hub Firewall',
      'Private Endpoints for all PaaS services in production spokes',
      'VPN Gateway or ExpressRoute in hub for on-premises connectivity',
      'Azure Bastion in hub for secure VM access (no public SSH/RDP)',
    ],
  },
  {
    tier: 'govern',
    cls: 'text-tier-govern border-tier-govern',
    dot: 'bg-tier-govern',
    items: [
      'Azure Virtual WAN or mature hub-spoke with multiple regional hubs',
      'Azure Firewall Premium with TLS inspection and IDPS',
      'DDoS Protection Standard on all public-facing VNets',
      'ExpressRoute with Private Peering for on-premises; no public internet path for regulated data',
      'Private DNS Resolver for hybrid DNS resolution',
    ],
  },
]

const ANTI_PATTERNS = [
  'Overlapping CIDR with on-premises address space — discovered at VPN/ExpressRoute provisioning time when readdressing is the only fix',
  'NSG allow-all inbound rules left over from development — the most common prod network misconfiguration; audit NSGs before every go-live',
  'No outbound NSG rules — the default allow-all outbound permits exfiltration; document and restrict all egress to known destinations',
  'Public endpoints on PaaS services in regulated workloads — compliance frameworks treat public PaaS endpoints as control failures, not acceptable architecture',
  'Missing Private DNS Zone linkage — Private Endpoint is provisioned, DNS zone is not linked to the VNet; clients resolve to public IP and traffic bypasses the endpoint silently',
  'VNet peering without hub Firewall — spoke-to-spoke traffic is uncontrolled; peering is transport, not security',
  '/29 or /30 subnets for application workloads — exhausted immediately under scaling; Azure service delegation requirements often mandate minimum /28 or /27',
]

const TIER_LABELS = { land: 'Land', scale: 'Scale', govern: 'Govern' }
const TIER_CLASSES = {
  land:   'border-tier-land text-tier-land',
  scale:  'border-tier-scale text-tier-scale',
  govern: 'border-tier-govern text-tier-govern',
}

export default function NetworkDesign() {
  const [open, setOpen] = useState(null)

  return (
    <div className="max-w-6xl mx-auto px-8 py-12">

      {/* Header */}
      <div className="mb-10">
        <p className="text-2xs font-semibold tracking-widest uppercase text-text-secondary font-display mb-1">Design Guide</p>
        <h1 className="font-display text-3xl font-bold text-text-primary mb-4">Network Design</h1>
        <div className="border border-waf-operations/30 bg-surface px-6 py-5 max-w-3xl">
          <p className="text-2xs font-semibold uppercase tracking-widest text-waf-operations font-display mb-2">Step 04 · Follows Identity Design</p>
          <p className="text-sm font-body text-text-primary leading-relaxed">
            {hl('Network topology is designed after identity boundaries are established in Step 02. The VNet shape determines Private Endpoint placement, NSG rule sets, and DNS resolution. Changing the topology after PaaS resources are provisioned requires resource recreation, not reconfiguration.')}
          </p>
        </div>
      </div>

      {/* Network Primitives */}
      <section className="mb-10">
        <SectionHeader label="Building Blocks" title="Network Primitives" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-border border border-border">
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

      {/* Topology Patterns */}
      <section className="mb-10">
        <SectionHeader label="Implementation" title="Topology Patterns" />
        <div className="flex flex-col gap-px bg-border border border-border">
          {TOPOLOGY_PATTERNS.map(p => (
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
                            <span className="mt-1.5 w-1 h-1 rounded-full bg-waf-operations shrink-0" />
                            {hl(step)}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="border-l-2 border-waf-operations/30 pl-4">
                      <p className="text-2xs font-semibold uppercase tracking-widest text-waf-operations font-display mb-2">Notes</p>
                      <p className="text-xs font-body text-text-secondary leading-relaxed">{hl(p.notes)}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* CIDR Planning */}
      <section className="mb-10">
        <div className="border border-border bg-surface px-6 py-5 max-w-3xl">
          <SectionHeader label="Address Space" title="CIDR Planning Rules" />
          <ul className="space-y-2.5">
            {CIDR_RULES.map((rule, i) => (
              <li key={i} className="flex items-start gap-2 text-xs font-body text-text-secondary leading-snug">
                <span className="mt-1.5 w-1 h-1 rounded-full bg-waf-operations shrink-0" />
                {hl(rule)}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* NSG Design */}
      <section className="mb-10">
        <div className="border border-border bg-surface px-6 py-5 max-w-3xl">
          <SectionHeader label="Segmentation" title="NSG Design Principles" />
          <ul className="space-y-2.5">
            {NSG_PRINCIPLES.map((principle, i) => (
              <li key={i} className="flex items-start gap-2 text-xs font-body text-text-secondary leading-snug">
                <span className="mt-1.5 w-1 h-1 rounded-full bg-waf-security shrink-0" />
                {hl(principle)}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Private Endpoint Reference */}
      <section className="mb-10">
        <SectionHeader label="Private Connectivity" title="Private Endpoint Reference" />
        <p className="text-xs text-text-secondary font-body mb-3 max-w-2xl leading-relaxed">
          Every PaaS service with a private-link-enabled endpoint should have one in production. The DNS zone name is as important as the endpoint itself — without the correct zone linked to the VNet, clients resolve to the public IP and bypass the private endpoint.
        </p>
        <div className="border border-border overflow-x-auto">
          <div className="grid grid-cols-[1.5fr_1.5fr_2fr] min-w-[600px]">
            {['Service', 'DNS Zone', 'Notes'].map(h => (
              <div key={h} className="bg-surface border-b border-border px-4 py-2.5">
                <span className="text-2xs font-semibold uppercase tracking-widest text-text-primary font-display">{h}</span>
              </div>
            ))}
            {PRIVATE_ENDPOINTS.map((row, idx) => (
              <Fragment key={idx}>
                <div className={`px-4 py-3 ${idx < PRIVATE_ENDPOINTS.length - 1 ? 'border-b border-border' : ''} ${idx % 2 === 0 ? 'bg-surface' : 'bg-canvas/40'}`}>
                  <span className="text-xs font-body text-text-primary">{row.service}</span>
                </div>
                <div className={`px-4 py-3 ${idx < PRIVATE_ENDPOINTS.length - 1 ? 'border-b border-border' : ''} ${idx % 2 === 0 ? 'bg-surface' : 'bg-canvas/40'}`}>
                  <span className="text-xs font-mono text-text-secondary leading-snug">{row.zone}</span>
                </div>
                <div className={`px-4 py-3 ${idx < PRIVATE_ENDPOINTS.length - 1 ? 'border-b border-border' : ''} ${idx % 2 === 0 ? 'bg-surface' : 'bg-canvas/40'}`}>
                  <span className="text-xs font-body text-text-secondary leading-snug">{row.notes}</span>
                </div>
              </Fragment>
            ))}
          </div>
        </div>
      </section>

      {/* Tier Topology */}
      <section className="mb-10">
        <SectionHeader label="Tier Topology" title="Network Complexity by Engagement Tier" />
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
        <SectionHeader label="Anti-Patterns" title="Network Design Failures" />
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
