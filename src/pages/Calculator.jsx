import { useState, useMemo, useEffect } from 'react'
import { useProject } from '../context/ProjectContext'

// ─── Pricing catalog ──────────────────────────────────────────────────────────

const CATALOG = {
  compute: [
    {
      id: 'app-service',
      name: 'App Service',
      skus: [
        { id: 'B1',   label: 'B1',    unitPrice: 13 },
        { id: 'B3',   label: 'B3',    unitPrice: 73 },
        { id: 'P1v3', label: 'P1v3',  unitPrice: 138 },
        { id: 'P2v3', label: 'P2v3',  unitPrice: 276 },
      ],
      unit: 'instance',
    },
    {
      id: 'container-apps',
      name: 'Container Apps',
      skus: [
        { id: 'small',  label: 'Small (~1 vCPU)',  unitPrice: 50 },
        { id: 'medium', label: 'Medium (~4 vCPU)', unitPrice: 200 },
        { id: 'large',  label: 'Large (~16 vCPU)', unitPrice: 600 },
      ],
      unit: 'workload',
    },
    {
      id: 'aks',
      name: 'Azure Kubernetes Service',
      skus: [
        { id: 'D2s_v3', label: 'D2s_v3', unitPrice: 70 },
        { id: 'D4s_v3', label: 'D4s_v3', unitPrice: 140 },
      ],
      unit: 'node',
    },
    {
      id: 'vm',
      name: 'Virtual Machines',
      skus: [
        { id: 'D2s_v3', label: 'D2s_v3', unitPrice: 70 },
        { id: 'D4s_v3', label: 'D4s_v3', unitPrice: 140 },
        { id: 'D8s_v3', label: 'D8s_v3', unitPrice: 280 },
      ],
      unit: 'VM',
    },
  ],
  data: [
    {
      id: 'azure-sql',
      name: 'Azure SQL Database',
      skus: [
        { id: 'GP_Gen5_2',    label: 'GP Gen5 2 vCore',         unitPrice: 370 },
        { id: 'GP_Gen5_4',    label: 'GP Gen5 4 vCore',         unitPrice: 740 },
        { id: 'BC_Gen5_4',    label: 'Business Critical 4 vCore', unitPrice: 1850 },
      ],
      unit: 'database',
    },
    {
      id: 'cosmos-db',
      name: 'Cosmos DB',
      skus: [
        { id: 'serverless-400',   label: '400 RU/s Serverless',      unitPrice: 25 },
        { id: 'provisioned-1000', label: '1000 RU/s Provisioned',    unitPrice: 58 },
      ],
      unit: 'account',
    },
    {
      id: 'blob-storage',
      name: 'Azure Blob Storage',
      skus: [
        { id: 'LRS', label: 'LRS ($0.018/GB)', unitPrice: 0.018 },
        { id: 'GRS', label: 'GRS ($0.036/GB)', unitPrice: 0.036 },
      ],
      unit: 'GB',
    },
    {
      id: 'redis',
      name: 'Azure Cache for Redis',
      skus: [
        { id: 'C1', label: 'C1 Basic', unitPrice: 55 },
        { id: 'C2', label: 'C2 Basic', unitPrice: 110 },
        { id: 'P1', label: 'P1 Premium', unitPrice: 320 },
      ],
      unit: 'instance',
    },
  ],
  networking: [
    {
      id: 'firewall',
      name: 'Azure Firewall',
      skus: [
        { id: 'standard', label: 'Standard (~$912/mo)',  unitPrice: 912 },
        { id: 'premium',  label: 'Premium (~$1,138/mo)', unitPrice: 1138 },
      ],
      unit: 'instance',
    },
    {
      id: 'app-gateway',
      name: 'Application Gateway',
      skus: [
        { id: 'WAF_v2', label: 'WAF v2 (~$263/mo)', unitPrice: 263 },
      ],
      unit: 'instance',
    },
    {
      id: 'expressroute',
      name: 'ExpressRoute',
      skus: [
        { id: '50mbps',  label: '50 Mbps',  unitPrice: 55 },
        { id: '200mbps', label: '200 Mbps', unitPrice: 138 },
        { id: '1gbps',   label: '1 Gbps',   unitPrice: 521 },
      ],
      unit: 'circuit',
    },
    {
      id: 'front-door',
      name: 'Azure Front Door',
      skus: [
        { id: 'standard', label: 'Standard (~$35/mo)',  unitPrice: 35 },
        { id: 'premium',  label: 'Premium (~$330/mo)', unitPrice: 330 },
      ],
      unit: 'profile',
    },
  ],
  security: [
    {
      id: 'defender',
      name: 'Defender for Cloud Plan 2',
      skus: [
        { id: 'plan2', label: '$15/server/mo', unitPrice: 15 },
      ],
      unit: 'server',
    },
    {
      id: 'sentinel',
      name: 'Microsoft Sentinel',
      skus: [
        { id: 'ingestion', label: '$2.46/GB ingested', unitPrice: 2.46 },
      ],
      unit: 'GB/mo',
    },
    {
      id: 'log-analytics',
      name: 'Log Analytics',
      skus: [
        { id: 'ingestion', label: '$2.76/GB (first 5GB free)', unitPrice: 2.76 },
      ],
      unit: 'GB/mo',
    },
    {
      id: 'key-vault',
      name: 'Azure Key Vault',
      skus: [
        { id: 'standard', label: 'Standard (~$5/mo light use)', unitPrice: 5 },
      ],
      unit: 'vault',
    },
  ],
  identity: [
    {
      id: 'entra-p1',
      name: 'Entra ID P1',
      skus: [
        { id: 'p1', label: '$6/user/mo', unitPrice: 6 },
      ],
      unit: 'user',
    },
    {
      id: 'entra-p2',
      name: 'Entra ID P2',
      skus: [
        { id: 'p2', label: '$9/user/mo', unitPrice: 9 },
      ],
      unit: 'user',
    },
    {
      id: 'entra-external',
      name: 'Entra External ID',
      skus: [
        { id: 'mau', label: '$0.0165/MAU (50k free)', unitPrice: 0.0165 },
      ],
      unit: 'MAU',
    },
  ],
}

const CATEGORY_LABELS = {
  compute:    'Compute',
  data:       'Data',
  networking: 'Networking',
  security:   'Security & Observability',
  identity:   'Identity',
}

// Log Analytics: first 5 GB free
const FREE_LOG_ANALYTICS_GB = 5

// ─── Tier presets ─────────────────────────────────────────────────────────────

// Each preset entry: { serviceId, skuId, qty }
const TIER_PRESETS = {
  land: [
    { serviceId: 'app-service',   skuId: 'P1v3',        qty: 1 },
    { serviceId: 'azure-sql',     skuId: 'GP_Gen5_2',   qty: 1 },
    { serviceId: 'blob-storage',  skuId: 'LRS',         qty: 100 },
    { serviceId: 'key-vault',     skuId: 'standard',    qty: 1 },
    { serviceId: 'entra-p1',      skuId: 'p1',          qty: 10 },
    { serviceId: 'log-analytics', skuId: 'ingestion',   qty: 5 },
  ],
  scale: [
    { serviceId: 'app-service',   skuId: 'P2v3',        qty: 2 },
    { serviceId: 'azure-sql',     skuId: 'GP_Gen5_4',   qty: 1 },
    { serviceId: 'cosmos-db',     skuId: 'serverless-400', qty: 1 },
    { serviceId: 'blob-storage',  skuId: 'GRS',         qty: 500 },
    { serviceId: 'firewall',      skuId: 'standard',    qty: 1 },
    { serviceId: 'key-vault',     skuId: 'standard',    qty: 1 },
    { serviceId: 'entra-p1',      skuId: 'p1',          qty: 50 },
    { serviceId: 'defender',      skuId: 'plan2',       qty: 5 },
    { serviceId: 'log-analytics', skuId: 'ingestion',   qty: 20 },
    { serviceId: 'sentinel',      skuId: 'ingestion',   qty: 10 },
  ],
  govern: [
    { serviceId: 'aks',           skuId: 'D4s_v3',      qty: 3 },
    { serviceId: 'azure-sql',     skuId: 'BC_Gen5_4',   qty: 1 },
    { serviceId: 'cosmos-db',     skuId: 'provisioned-1000', qty: 1 },
    { serviceId: 'blob-storage',  skuId: 'GRS',         qty: 2000 },
    { serviceId: 'firewall',      skuId: 'premium',     qty: 1 },
    { serviceId: 'app-gateway',   skuId: 'WAF_v2',      qty: 1 },
    { serviceId: 'expressroute',  skuId: '200mbps',     qty: 1 },
    { serviceId: 'front-door',    skuId: 'premium',     qty: 1 },
    { serviceId: 'entra-p2',      skuId: 'p2',          qty: 100 },
    { serviceId: 'defender',      skuId: 'plan2',       qty: 20 },
    { serviceId: 'log-analytics', skuId: 'ingestion',   qty: 100 },
    { serviceId: 'sentinel',      skuId: 'ingestion',   qty: 50 },
    { serviceId: 'key-vault',     skuId: 'standard',    qty: 2 },
  ],
}

// ─── Helper: build initial line-items from a preset ──────────────────────────

function buildLinesFromPreset(preset) {
  return preset.map((entry, idx) => {
    const service = findService(entry.serviceId)
    const sku = service.skus.find(s => s.id === entry.skuId) ?? service.skus[0]
    return {
      id: `${entry.serviceId}-${idx}`,
      serviceId: entry.serviceId,
      skuId: sku.id,
      qty: entry.qty,
    }
  })
}

function findService(serviceId) {
  for (const services of Object.values(CATALOG)) {
    const match = services.find(s => s.id === serviceId)
    if (match) return match
  }
  return null
}

function categoryOf(serviceId) {
  for (const [cat, services] of Object.entries(CATALOG)) {
    if (services.some(s => s.id === serviceId)) return cat
  }
  return null
}

function computeLineTotal(line) {
  const service = findService(line.serviceId)
  if (!service) return 0
  const sku = service.skus.find(s => s.id === line.skuId)
  if (!sku) return 0

  // Log Analytics: first 5 GB free
  if (line.serviceId === 'log-analytics') {
    const billableGb = Math.max(0, line.qty - FREE_LOG_ANALYTICS_GB)
    return billableGb * sku.unitPrice
  }

  return line.qty * sku.unitPrice
}

function fmt(n) {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionLabel({ children }) {
  return (
    <p className="text-2xs font-semibold tracking-widest uppercase text-text-secondary font-display mb-2">
      {children}
    </p>
  )
}

function TierButton({ tier, label, active, onClick }) {
  const colors = {
    land:   active ? 'bg-tier-land/20 border-tier-land text-tier-land' : 'border-tier-land/30 text-tier-land/60 hover:border-tier-land/60 hover:text-tier-land',
    scale:  active ? 'bg-tier-scale/20 border-tier-scale text-tier-scale' : 'border-tier-scale/30 text-tier-scale/60 hover:border-tier-scale/60 hover:text-tier-scale',
    govern: active ? 'bg-tier-govern/20 border-tier-govern text-tier-govern' : 'border-tier-govern/30 text-tier-govern/60 hover:border-tier-govern/60 hover:text-tier-govern',
  }
  return (
    <button
      onClick={onClick}
      className={`pillar-badge px-4 py-1.5 text-xs font-display font-semibold transition-colors border ${colors[tier]}`}
    >
      {label}
    </button>
  )
}

function LineRow({ line, onSkuChange, onQtyChange, onRemove }) {
  const service = findService(line.serviceId)
  if (!service) return null
  const sku = service.skus.find(s => s.id === line.skuId) ?? service.skus[0]
  const total = computeLineTotal(line)
  const isPerGb = service.unit === 'GB' || service.unit === 'GB/mo' || service.unit === 'MAU'

  return (
    <tr className="border-b border-border/40 hover:bg-border/10 group">
      {/* Service name */}
      <td className="py-2 pl-0 pr-3 align-middle">
        <span className="font-body text-xs text-text-primary">{service.name}</span>
      </td>

      {/* SKU selector */}
      <td className="py-2 pr-3 align-middle">
        <select
          value={line.skuId}
          onChange={e => onSkuChange(line.id, e.target.value)}
          className="bg-canvas border border-border text-text-mono font-mono text-xs px-2 py-1 w-full focus:outline-none focus:border-accent"
        >
          {service.skus.map(s => (
            <option key={s.id} value={s.id}>{s.label}</option>
          ))}
        </select>
      </td>

      {/* Quantity */}
      <td className="py-2 pr-3 align-middle w-24">
        <div className="flex items-center gap-1">
          <input
            type="number"
            min={0}
            step={isPerGb ? 10 : 1}
            value={line.qty}
            onChange={e => onQtyChange(line.id, Number(e.target.value))}
            className="bg-canvas border border-border text-text-mono font-mono text-xs px-2 py-1 w-16 text-right focus:outline-none focus:border-accent"
          />
          <span className="text-2xs text-text-secondary font-mono whitespace-nowrap">{service.unit}</span>
        </div>
      </td>

      {/* Unit price */}
      <td className="py-2 pr-3 align-middle text-right">
        <span className="font-mono text-xs text-text-secondary">{fmt(sku.unitPrice)}</span>
        <span className="text-2xs text-text-secondary font-mono">/{service.unit}</span>
      </td>

      {/* Monthly total */}
      <td className="py-2 pr-2 align-middle text-right">
        <span className="font-mono text-sm text-text-mono">{fmt(total)}</span>
      </td>

      {/* Remove */}
      <td className="py-2 pl-2 align-middle w-6">
        <button
          onClick={() => onRemove(line.id)}
          className="text-text-secondary/30 hover:text-critical text-xs font-mono leading-none opacity-0 group-hover:opacity-100 transition-opacity"
          title="Remove"
        >
          ✕
        </button>
      </td>
    </tr>
  )
}

function AddServiceDropdown({ onAdd }) {
  const [cat, setCat] = useState('compute')
  const [svcId, setSvcId] = useState(CATALOG.compute[0].id)

  const handleCatChange = (newCat) => {
    setCat(newCat)
    setSvcId(CATALOG[newCat][0].id)
  }

  const handleAdd = () => {
    const service = findService(svcId)
    if (!service) return
    onAdd(svcId, service.skus[0].id)
  }

  return (
    <div className="flex items-center gap-2 pt-2">
      <select
        value={cat}
        onChange={e => handleCatChange(e.target.value)}
        className="bg-canvas border border-border text-text-secondary font-mono text-xs px-2 py-1.5 focus:outline-none focus:border-accent"
      >
        {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
          <option key={k} value={k}>{v}</option>
        ))}
      </select>
      <select
        value={svcId}
        onChange={e => setSvcId(e.target.value)}
        className="bg-canvas border border-border text-text-secondary font-mono text-xs px-2 py-1.5 flex-1 focus:outline-none focus:border-accent"
      >
        {CATALOG[cat].map(s => (
          <option key={s.id} value={s.id}>{s.name}</option>
        ))}
      </select>
      <button
        onClick={handleAdd}
        className="pillar-badge border-accent/60 text-accent hover:bg-accent/10 text-xs px-3 py-1.5 font-mono transition-colors"
      >
        + Add
      </button>
    </div>
  )
}

// ─── WAF Cost notes ───────────────────────────────────────────────────────────

const WAF_NOTES = [
  {
    heading: 'Reserved Instances',
    body: '1-year reservations save ~30% over pay-as-you-go for stable workloads. 3-year reservations save ~50%. Reserve VMs, AKS nodes, and SQL after the workload has been right-sized in production for at least 30 days.',
  },
  {
    heading: 'Right-Sizing Cadence',
    body: 'Schedule a right-sizing review every 90 days using Azure Advisor + Cost Management recommendations. Downsizing a D4s_v3 → D2s_v3 cuts node cost 50%. Over-provisioned App Service Plans are the most common waste vector at Land tier.',
  },
  {
    heading: 'FinOps Tagging Taxonomy',
    body: 'Tag every resource: CostCenter, Environment (prod/staging/dev), WorkloadOwner, TierLevel (land/scale/govern). Without tags, Cost Management cannot allocate spend to a business unit. Enforce tags via Azure Policy at subscription scope.',
  },
  {
    heading: 'Storage Lifecycle Policies',
    body: 'Blob Storage lifecycle policies auto-tier cold data from Hot → Cool → Archive. Hot→Archive delta is ~96% cost reduction. Apply at Govern tier for any blob container older than 30 days with decreasing read frequency.',
  },
  {
    heading: 'Dev/Test Subscriptions',
    body: 'Non-production workloads running on DevTest subscription pricing eliminate Windows VM licensing costs (~38% savings on Windows workloads). Use separate subscriptions per environment — never comingle prod and dev billing.',
  },
]

// ─── Main page ────────────────────────────────────────────────────────────────

export default function Calculator() {
  const { calculator: saved, setCalculatorState } = useProject()
  const [activeTier, setActiveTier] = useState(saved?.activeTier ?? null)
  const [lines, setLines] = useState(saved?.lines ?? [])
  const [nextId, setNextId] = useState(saved?.nextId ?? 1)

  useEffect(() => {
    setCalculatorState({ activeTier, lines, nextId })
  }, [activeTier, lines, nextId, setCalculatorState])

  const applyPreset = (tier) => {
    const preset = TIER_PRESETS[tier]
    const newLines = buildLinesFromPreset(preset).map((line, i) => ({
      ...line,
      id: `preset-${tier}-${i}`,
    }))
    setLines(newLines)
    setActiveTier(tier)
  }

  const handleSkuChange = (lineId, newSkuId) => {
    setLines(prev => prev.map(l =>
      l.id === lineId ? { ...l, skuId: newSkuId } : l
    ))
  }

  const handleQtyChange = (lineId, newQty) => {
    setLines(prev => prev.map(l =>
      l.id === lineId ? { ...l, qty: Math.max(0, newQty) } : l
    ))
  }

  const handleRemove = (lineId) => {
    setLines(prev => prev.filter(l => l.id !== lineId))
  }

  const handleAdd = (serviceId, skuId) => {
    const newLine = {
      id: `custom-${nextId}`,
      serviceId,
      skuId,
      qty: 1,
    }
    setNextId(n => n + 1)
    setLines(prev => [...prev, newLine])
    setActiveTier(null)
  }

  // Group lines by category
  const byCategory = useMemo(() => {
    const groups = {}
    for (const line of lines) {
      const cat = categoryOf(line.serviceId)
      if (!cat) continue
      if (!groups[cat]) groups[cat] = []
      groups[cat].push(line)
    }
    return groups
  }, [lines])

  // Subtotals
  const subtotals = useMemo(() => {
    const result = {}
    for (const [cat, catLines] of Object.entries(byCategory)) {
      result[cat] = catLines.reduce((sum, l) => sum + computeLineTotal(l), 0)
    }
    return result
  }, [byCategory])

  const grandMonthly = useMemo(
    () => Object.values(subtotals).reduce((a, b) => a + b, 0),
    [subtotals]
  )
  const grandAnnual = grandMonthly * 12

  const hasLines = lines.length > 0

  return (
    <div className="max-w-5xl mx-auto px-8 py-12">

      {/* ── Header ── */}
      <div className="mb-8">
        <p className="text-2xs font-semibold tracking-widest uppercase text-text-secondary font-display mb-1">
          WAF · Cost Pillar
        </p>
        <h1 className="font-display text-3xl font-bold text-text-primary mb-3">Cost Estimator</h1>
        <p className="text-text-secondary font-body text-sm leading-relaxed max-w-2xl">
          Architectural scoping tool for Azure spend composition. Figures are list-price estimates based on public Azure pricing — not a binding quote.
          Use this to size engagements, set budget guardrails, and guide Reserved Instance strategy.
        </p>
      </div>

      {/* ── Tier selector ── */}
      <div className="card px-5 py-4 mb-6">
        <SectionLabel>Preset Baseline — select a tier to pre-populate</SectionLabel>
        <div className="flex gap-3 flex-wrap">
          <TierButton
            tier="land"
            label="Land — Entry"
            active={activeTier === 'land'}
            onClick={() => applyPreset('land')}
          />
          <TierButton
            tier="scale"
            label="Scale — Growing"
            active={activeTier === 'scale'}
            onClick={() => applyPreset('scale')}
          />
          <TierButton
            tier="govern"
            label="Govern — Enterprise"
            active={activeTier === 'govern'}
            onClick={() => applyPreset('govern')}
          />
          {hasLines && (
            <button
              onClick={() => { setLines([]); setActiveTier(null) }}
              className="pillar-badge border-border text-text-secondary/50 hover:text-critical hover:border-critical/40 text-xs px-3 py-1.5 font-mono transition-colors ml-auto"
            >
              Clear all
            </button>
          )}
        </div>
        {activeTier && (
          <p className="text-2xs text-text-secondary font-mono mt-3">
            Loaded <span className="text-text-mono capitalize">{activeTier}</span> preset —
            adjust quantities and SKUs below to match your actual architecture.
          </p>
        )}
      </div>

      {/* ── Empty state ── */}
      {!hasLines && (
        <div className="border border-border bg-surface px-6 py-10 text-center mb-6">
          <p className="text-text-secondary font-body text-sm mb-1">No line items yet.</p>
          <p className="text-text-secondary/60 font-mono text-xs">Select a tier preset above or add individual services below.</p>
        </div>
      )}

      {/* ── Line-item table ── */}
      {hasLines && (
        <div className="mb-6 space-y-6">
          {Object.entries(CATEGORY_LABELS).map(([cat, catLabel]) => {
            const catLines = byCategory[cat]
            if (!catLines || catLines.length === 0) return null

            return (
              <div key={cat} className="border border-border bg-surface">
                {/* Category header */}
                <div className="px-5 py-2.5 border-b border-border bg-canvas/60 flex items-center justify-between">
                  <span className="font-display text-xs font-semibold text-text-secondary uppercase tracking-widest">
                    {catLabel}
                  </span>
                  <span className="font-display text-sm font-semibold text-text-primary">
                    {fmt(subtotals[cat] ?? 0)}
                    <span className="text-2xs text-text-secondary font-mono ml-1">/mo</span>
                  </span>
                </div>

                {/* Table */}
                <div className="px-5 pb-3">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-2 pr-3 font-display font-semibold text-2xs tracking-wider uppercase text-text-secondary">
                          Service
                        </th>
                        <th className="text-left py-2 pr-3 font-display font-semibold text-2xs tracking-wider uppercase text-text-secondary">
                          SKU / Tier
                        </th>
                        <th className="text-left py-2 pr-3 font-display font-semibold text-2xs tracking-wider uppercase text-text-secondary">
                          Qty
                        </th>
                        <th className="text-right py-2 pr-3 font-display font-semibold text-2xs tracking-wider uppercase text-text-secondary">
                          Unit Price
                        </th>
                        <th className="text-right py-2 pr-2 font-display font-semibold text-2xs tracking-wider uppercase text-text-secondary">
                          Monthly
                        </th>
                        <th className="w-6" />
                      </tr>
                    </thead>
                    <tbody>
                      {catLines.map(line => (
                        <LineRow
                          key={line.id}
                          line={line}
                          onSkuChange={handleSkuChange}
                          onQtyChange={handleQtyChange}
                          onRemove={handleRemove}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Add service ── */}
      <div className="border border-dashed border-border/60 bg-canvas px-5 py-3 mb-8">
        <SectionLabel>Add Service</SectionLabel>
        <AddServiceDropdown onAdd={handleAdd} />
      </div>

      {/* ── Totals ── */}
      <div className="border border-border bg-surface px-5 py-5 mb-8">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <SectionLabel>Estimated Monthly Spend</SectionLabel>
            <div className="flex items-baseline gap-3">
              <span className="font-display text-4xl font-bold text-waf-cost">
                {fmt(grandMonthly)}
              </span>
              <span className="font-mono text-xs text-text-secondary">/month</span>
            </div>
            <p className="font-mono text-sm text-text-secondary mt-1">
              <span className="text-text-mono">{fmt(grandAnnual)}</span>
              <span className="text-text-secondary font-mono text-xs ml-1">/ year (×12)</span>
            </p>
          </div>

          <div className="text-right">
            <div className="flex items-center justify-end gap-2 mb-3">
              <span
                className="pillar-badge text-2xs"
                style={{ color: '#10b981', borderColor: '#10b98150' }}
              >
                WAF · Cost
              </span>
            </div>
            {Object.entries(subtotals).filter(([, v]) => v > 0).map(([cat, val]) => (
              <div key={cat} className="flex items-center justify-between gap-8 text-xs mb-0.5">
                <span className="text-text-secondary font-body">{CATEGORY_LABELS[cat]}</span>
                <span className="font-mono text-text-mono">{fmt(val)}</span>
              </div>
            ))}
            {!hasLines && (
              <p className="text-2xs text-text-secondary/40 font-mono">No services configured</p>
            )}
          </div>
        </div>

        {grandMonthly > 0 && (
          <div className="border-t border-border mt-4 pt-4 grid grid-cols-3 gap-4">
            <div className="border border-border/60 px-3 py-2.5 bg-canvas/40">
              <p className="text-2xs text-text-secondary font-mono mb-1">Pay-as-you-go</p>
              <p className="font-mono text-sm text-text-primary">{fmt(grandAnnual)}</p>
              <p className="text-2xs text-text-secondary font-mono">annual list price</p>
            </div>
            <div className="border border-waf-cost/30 px-3 py-2.5 bg-waf-cost/5">
              <p className="text-2xs text-waf-cost font-mono mb-1">1-yr Reserved (~30% off)</p>
              <p className="font-mono text-sm text-waf-cost">{fmt(grandAnnual * 0.70)}</p>
              <p className="text-2xs text-waf-cost/60 font-mono">saves {fmt(grandAnnual * 0.30)}/yr</p>
            </div>
            <div className="border border-waf-cost/50 px-3 py-2.5 bg-waf-cost/10">
              <p className="text-2xs text-waf-cost font-mono mb-1">3-yr Reserved (~50% off)</p>
              <p className="font-mono text-sm text-waf-cost font-semibold">{fmt(grandAnnual * 0.50)}</p>
              <p className="text-2xs text-waf-cost/60 font-mono">saves {fmt(grandAnnual * 0.50)}/yr</p>
            </div>
          </div>
        )}
      </div>

      {/* ── WAF Cost pillar notes ── */}
      <div className="border border-border bg-surface">
        <div className="px-5 py-3 border-b border-border bg-canvas/60 flex items-center gap-3">
          <span
            className="pillar-badge text-2xs"
            style={{ color: '#10b981', borderColor: '#10b98150' }}
          >
            WAF · Cost
          </span>
          <span className="font-display text-xs font-semibold text-text-secondary uppercase tracking-widest">
            Cost Optimization Guidance
          </span>
        </div>
        <div className="px-5 py-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          {WAF_NOTES.map((note) => (
            <div key={note.heading} className="border border-border/60 px-4 py-3 bg-canvas/40">
              <p className="font-display text-xs font-semibold text-text-primary mb-1.5">
                {note.heading}
              </p>
              <p className="text-xs text-text-secondary font-body leading-relaxed">
                {note.body}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Footer note ── */}
      <p className="text-2xs text-text-secondary/40 font-mono mt-6 text-center">
        Prices are East US region list rates as of mid-2024. Actual spend varies by region, commitment, EA discount, and consumption pattern.
        Always validate against the{' '}
        <span className="text-text-secondary/60">Azure Pricing Calculator</span> before presenting to a customer.
      </p>
    </div>
  )
}
