import { useState, useCallback } from 'react'
import { useProject } from '../context/ProjectContext'

// ─── Constants ────────────────────────────────────────────────────────────────

const WAF_PILLARS = [
  { id: 'reliability',  label: 'Reliability',  color: '#3b82f6' },
  { id: 'security',     label: 'Security',     color: '#7c3aed' },
  { id: 'cost',         label: 'Cost',         color: '#10b981' },
  { id: 'operations',   label: 'Operations',   color: '#f59e0b' },
  { id: 'performance',  label: 'Performance',  color: '#06b6d4' },
]

const TIER_OPTIONS = [
  { id: 'Land',   color: '#0f766e' },
  { id: 'Scale',  color: '#0d9488' },
  { id: 'Govern', color: '#2dd4bf' },
]

const STATUS_OPTIONS = ['Proposed', 'Accepted', 'Deprecated', 'Superseded']

const FRAMEWORK_STEPS = [
  { value: '1', label: '01 — Deconstruct Constraints and Targets' },
  { value: '2', label: '02 — Establish the Identity, Security, and Observability Boundary' },
  { value: '3', label: '03 — Map the Data Flow and Storage Tiers' },
  { value: '4', label: '04 — Design the Network Routing and Compute Abstraction' },
  { value: '5', label: '05 — Conduct a Blast Radius Failure Analysis' },
  { value: '6', label: '06 — Apply FinOps Optimizations' },
  { value: '7', label: '07 — Establish the Operational Model' },
]

const TODAY = new Date().toISOString().slice(0, 10)

// ─── Helpers ──────────────────────────────────────────────────────────────────

function slugify(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function uid() {
  return Math.random().toString(36).slice(2, 9)
}

function makeItem(value = '') {
  return { id: uid(), value }
}

function makeOption() {
  return {
    id: uid(),
    name: '',
    description: '',
    pros: [makeItem()],
    cons: [makeItem()],
  }
}

function makeRelatedAdr() {
  return { id: uid(), number: '', title: '' }
}

// ─── Initial form state ───────────────────────────────────────────────────────

const INITIAL_STATE = {
  adrNumber: '001',
  title: '',
  date: TODAY,
  status: 'Proposed',
  deciders: '',
  wafPillars: [],
  tier: 'Land',
  frameworkStep: '',
  context: '',
  drivers: [makeItem()],
  options: [makeOption(), makeOption()],
  decisionStatement: '',
  decisionRationale: '',
  positives: [makeItem()],
  negatives: [makeItem()],
  risks: [makeItem()],
  complianceNotes: '',
  relatedAdrs: [],
}

// ─── Markdown generator ───────────────────────────────────────────────────────

function buildMarkdown(form) {
  const pillarLabels = form.wafPillars.map(id => {
    const found = WAF_PILLARS.find(p => p.id === id)
    return found ? found.label : id
  }).join(', ') || '—'

  const stepLabel = FRAMEWORK_STEPS.find(s => s.value === form.frameworkStep)?.label || '—'

  const listItems = items => items
    .filter(item => item.value.trim())
    .map(item => `- ${item.value}`)
    .join('\n') || '- —'

  const optionsSection = form.options.map((opt, idx) => {
    const letter = String.fromCharCode(65 + idx)
    const pros = opt.pros.filter(p => p.value.trim()).map(p => `  - ${p.value}`).join('\n') || '  - —'
    const cons = opt.cons.filter(c => c.value.trim()).map(c => `  - ${c.value}`).join('\n') || '  - —'
    return `### Option ${letter}: ${opt.name || '(unnamed)'}
${opt.description || '(no description)'}

**Pros:**
${pros}

**Cons:**
${cons}`
  }).join('\n\n')

  const relatedSection = form.relatedAdrs.length > 0
    ? form.relatedAdrs
        .filter(r => r.number || r.title)
        .map(r => `- ADR-${r.number}: ${r.title}`)
        .join('\n')
    : '—'

  return `# ADR-${form.adrNumber}: ${form.title || '(untitled)'}

**Date:** ${form.date}
**Status:** ${form.status}
**Deciders:** ${form.deciders || '—'}
**WAF Pillars:** ${pillarLabels}
**Engagement Tier:** ${form.tier}
**Framework Step:** ${stepLabel}

## Context
${form.context || '—'}

## Decision Drivers
${listItems(form.drivers)}

## Options Considered

${optionsSection}

## Decision
**We will ${form.decisionStatement || '…'}**

${form.decisionRationale || '—'}

## Consequences

### Positive
${listItems(form.positives)}

### Negative / Trade-offs
${listItems(form.negatives)}

### Risks
${listItems(form.risks)}

## Compliance Notes
${form.complianceNotes || '—'}

## Related ADRs
${relatedSection}
`
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionLabel({ children }) {
  return (
    <p className="text-2xs font-semibold tracking-widest uppercase text-text-secondary font-display mb-2">
      {children}
    </p>
  )
}

function TextInput({ value, onChange, placeholder, className = '' }) {
  return (
    <input
      type="text"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className={`w-full bg-canvas border border-border text-text-primary font-mono text-xs focus:border-accent outline-none px-3 py-2 placeholder:text-text-secondary/40 ${className}`}
    />
  )
}

function Textarea({ value, onChange, placeholder, rows = 4 }) {
  return (
    <textarea
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="w-full bg-canvas border border-border text-text-primary font-mono text-xs focus:border-accent outline-none px-3 py-2 placeholder:text-text-secondary/40 resize-y"
    />
  )
}

function Select({ value, onChange, children }) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="w-full bg-canvas border border-border text-text-primary font-mono text-xs focus:border-accent outline-none px-3 py-2 appearance-none"
    >
      {children}
    </select>
  )
}

function DynamicList({ items, onChange, placeholder }) {
  const update = useCallback((id, value) => {
    onChange(items.map(item => item.id === id ? { ...item, value } : item))
  }, [items, onChange])

  const add = useCallback(() => {
    onChange([...items, makeItem()])
  }, [items, onChange])

  const remove = useCallback(id => {
    if (items.length <= 1) return
    onChange(items.filter(item => item.id !== id))
  }, [items, onChange])

  return (
    <div className="space-y-1.5">
      {items.map((item, idx) => (
        <div key={item.id} className="flex gap-1.5">
          <span className="font-mono text-2xs text-text-secondary/50 pt-2 w-4 shrink-0 text-right">{idx + 1}</span>
          <TextInput value={item.value} onChange={val => update(item.id, val)} placeholder={placeholder} />
          <button
            onClick={() => remove(item.id)}
            disabled={items.length <= 1}
            className="shrink-0 px-2 text-text-secondary/40 hover:text-critical transition-colors disabled:opacity-20 font-mono text-xs"
          >
            ×
          </button>
        </div>
      ))}
      <button
        onClick={add}
        className="text-2xs font-mono text-accent hover:text-accent/80 transition-colors flex items-center gap-1 mt-1"
      >
        + add item
      </button>
    </div>
  )
}

function OptionBlock({ option, idx, onChange, onRemove, canRemove }) {
  const letter = String.fromCharCode(65 + idx)
  const set = field => val => onChange({ ...option, [field]: val })

  return (
    <div className="border border-border bg-canvas/60 p-3 space-y-3">
      <div className="flex items-center justify-between mb-1">
        <span className="font-display text-xs font-semibold text-text-secondary uppercase tracking-wider">
          Option {letter}
        </span>
        {canRemove && (
          <button
            onClick={onRemove}
            className="text-2xs font-mono text-text-secondary/40 hover:text-critical transition-colors"
          >
            remove
          </button>
        )}
      </div>

      <div>
        <SectionLabel>Name</SectionLabel>
        <TextInput value={option.name} onChange={set('name')} placeholder="Option name" />
      </div>

      <div>
        <SectionLabel>Description</SectionLabel>
        <Textarea value={option.description} onChange={set('description')} placeholder="Describe this option..." rows={3} />
      </div>

      <div>
        <SectionLabel>Pros</SectionLabel>
        <DynamicList items={option.pros} onChange={set('pros')} placeholder="Pro..." />
      </div>

      <div>
        <SectionLabel>Cons</SectionLabel>
        <DynamicList items={option.cons} onChange={set('cons')} placeholder="Con..." />
      </div>
    </div>
  )
}

// ─── Markdown preview renderer ────────────────────────────────────────────────

function MarkdownPreview({ markdown }) {
  const lines = markdown.split('\n')
  const rendered = []
  let key = 0

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const k = key++

    if (line.startsWith('# ')) {
      rendered.push(
        <h1 key={k} className="font-display text-lg font-bold text-text-primary mb-3 mt-1">
          {line.slice(2)}
        </h1>
      )
    } else if (line.startsWith('## ')) {
      rendered.push(
        <h2 key={k} className="font-display text-sm font-semibold text-text-primary mt-5 mb-1.5 border-b border-border pb-1">
          {line.slice(3)}
        </h2>
      )
    } else if (line.startsWith('### ')) {
      rendered.push(
        <h3 key={k} className="font-display text-xs font-semibold text-text-mono mt-3 mb-1">
          {line.slice(4)}
        </h3>
      )
    } else if (/^\*\*[^*]+:\*\* /.test(line) || /^\*\*[^*]+:\*\*$/.test(line)) {
      const match = line.match(/^\*\*([^*]+)\*\*(.*)$/)
      if (match) {
        rendered.push(
          <p key={k} className="text-2xs font-mono text-text-secondary my-0.5">
            <span className="text-text-primary font-semibold">{match[1]}</span>
            {match[2]}
          </p>
        )
      }
    } else if (/^\*\*We will /.test(line)) {
      rendered.push(
        <p key={k} className="text-xs font-mono font-semibold text-text-primary my-1 border-l-2 border-accent pl-3 py-1">
          {line.replace(/\*\*/g, '')}
        </p>
      )
    } else if (line.startsWith('**') && line.endsWith('**') && line.length > 4) {
      rendered.push(
        <p key={k} className="text-xs font-mono font-semibold text-text-secondary my-0.5">
          {line.slice(2, -2)}
        </p>
      )
    } else if (line.startsWith('- ')) {
      rendered.push(
        <div key={k} className="flex gap-1.5 text-xs text-text-secondary font-mono my-0.5">
          <span className="text-accent shrink-0">›</span>
          <span>{line.slice(2)}</span>
        </div>
      )
    } else if (line.trim() === '') {
      rendered.push(<div key={k} className="h-1.5" />)
    } else {
      rendered.push(
        <p key={k} className="text-xs text-text-secondary font-mono my-0.5 leading-relaxed">
          {line}
        </p>
      )
    }
  }

  return <div className="space-y-0">{rendered}</div>
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function Adr() {
  const { adrs, saveAdr, deleteAdr } = useProject()
  const [form, setForm] = useState(INITIAL_STATE)
  const [copied, setCopied] = useState(false)
  const [savedToProject, setSavedToProject] = useState(false)

  const nextAdrNumber = String(
    Math.max(0, ...adrs.map(a => parseInt(a.adrNumber, 10) || 0)) + 1
  ).padStart(3, '0')

  const handleNewAdr = () => {
    setForm({ ...INITIAL_STATE, adrNumber: nextAdrNumber })
    setSavedToProject(false)
  }

  const handleLoadAdr = (adr) => {
    setForm(adr)
    setSavedToProject(true)
  }

  const handleSaveToProject = () => {
    saveAdr(form)
    setSavedToProject(true)
    setTimeout(() => setSavedToProject(false), 2000)
  }

  const set = field => value => setForm(prev => ({ ...prev, [field]: value }))

  const togglePillar = id => {
    setForm(prev => ({
      ...prev,
      wafPillars: prev.wafPillars.includes(id)
        ? prev.wafPillars.filter(p => p !== id)
        : [...prev.wafPillars, id],
    }))
  }

  const updateOption = (id, updated) => {
    setForm(prev => ({
      ...prev,
      options: prev.options.map(opt => opt.id === id ? updated : opt),
    }))
  }

  const removeOption = id => {
    setForm(prev => ({
      ...prev,
      options: prev.options.filter(opt => opt.id !== id),
    }))
  }

  const addOption = () => {
    if (form.options.length >= 4) return
    setForm(prev => ({ ...prev, options: [...prev.options, makeOption()] }))
  }

  const updateRelated = (id, field, value) => {
    setForm(prev => ({
      ...prev,
      relatedAdrs: prev.relatedAdrs.map(r => r.id === id ? { ...r, [field]: value } : r),
    }))
  }

  const addRelated = () => setForm(prev => ({ ...prev, relatedAdrs: [...prev.relatedAdrs, makeRelatedAdr()] }))
  const removeRelated = id => setForm(prev => ({ ...prev, relatedAdrs: prev.relatedAdrs.filter(r => r.id !== id) }))

  const markdown = buildMarkdown(form)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(markdown)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDownload = () => {
    const slug = slugify(form.title) || 'untitled'
    const filename = `ADR-${form.adrNumber}-${slug}.md`
    const blob = new Blob([markdown], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = filename
    anchor.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="max-w-screen-xl mx-auto px-6 py-10">

      {/* Page header */}
      <div className="mb-6">
        <p className="text-2xs font-semibold tracking-widest uppercase text-text-secondary font-display mb-1">Architecture Decision Record</p>
        <h1 className="font-display text-3xl font-bold text-text-primary mb-3">ADR Generator</h1>
        <p className="text-text-secondary font-body text-sm leading-relaxed max-w-2xl">
          Fill in the structured form to produce a formatted ADR document. The preview updates in real time.
          Based on Michael Nygard&#39;s template, extended for Azure engagements.
        </p>
      </div>

      {/* Project ADR list */}
      <div className="mb-6 border border-border bg-surface">
        <div className="px-4 py-2.5 border-b border-border flex items-center justify-between">
          <p className="text-2xs font-semibold uppercase tracking-widest text-text-secondary font-display">
            Project ADRs ({adrs.length})
          </p>
          <button
            onClick={handleNewAdr}
            className="text-2xs font-mono text-accent hover:text-blue-400 transition-colors"
          >
            + New ADR
          </button>
        </div>
        {adrs.length === 0 ? (
          <p className="px-4 py-3 text-xs font-mono text-text-secondary">
            No ADRs saved to this project yet. Complete the form below and click "Save to Project".
          </p>
        ) : (
          <div className="divide-y divide-border">
            {adrs.map(adr => (
              <div key={adr.adrNumber} className="flex items-center gap-3 px-4 py-2.5 hover:bg-border/20 group">
                <span className="font-mono text-text-secondary text-xs w-12 shrink-0">ADR-{adr.adrNumber}</span>
                <span className="font-display text-xs text-text-primary flex-1 truncate">{adr.title || '(untitled)'}</span>
                <span className="pillar-badge border-border text-text-secondary text-2xs shrink-0">{adr.status}</span>
                <button
                  onClick={() => handleLoadAdr(adr)}
                  className="text-2xs font-mono text-accent opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                >
                  Open
                </button>
                <button
                  onClick={() => deleteAdr(adr.adrNumber)}
                  className="text-2xs font-mono text-critical opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Two-column layout */}
      <div className="flex gap-6 items-start">

        {/* ── Left: form panel ── */}
        <div className="flex-1 min-w-0 space-y-6">

          {/* Metadata block */}
          <div className="border border-border bg-surface p-4 space-y-4">
            <SectionLabel>Identity</SectionLabel>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-2xs font-mono text-text-secondary mb-1">ADR Number</label>
                <TextInput value={form.adrNumber} onChange={set('adrNumber')} placeholder="001" />
              </div>
              <div>
                <label className="block text-2xs font-mono text-text-secondary mb-1">Date</label>
                <input
                  type="date"
                  value={form.date}
                  onChange={e => set('date')(e.target.value)}
                  className="w-full bg-canvas border border-border text-text-primary font-mono text-xs focus:border-accent outline-none px-3 py-2"
                />
              </div>
            </div>

            <div>
              <label className="block text-2xs font-mono text-text-secondary mb-1">Title</label>
              <TextInput value={form.title} onChange={set('title')} placeholder="Brief decision title" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-2xs font-mono text-text-secondary mb-1">Status</label>
                <Select value={form.status} onChange={set('status')}>
                  {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                </Select>
              </div>
              <div>
                <label className="block text-2xs font-mono text-text-secondary mb-1">Framework Step</label>
                <Select value={form.frameworkStep} onChange={set('frameworkStep')}>
                  <option value="">— select step —</option>
                  {FRAMEWORK_STEPS.map(s => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </Select>
              </div>
            </div>

            <div>
              <label className="block text-2xs font-mono text-text-secondary mb-1">Deciders (comma-separated)</label>
              <TextInput value={form.deciders} onChange={set('deciders')} placeholder="e.g. Cloud Architect, CISO, App Team Lead" />
            </div>
          </div>

          {/* WAF Pillars */}
          <div className="border border-border bg-surface p-4">
            <SectionLabel>WAF Pillars</SectionLabel>
            <div className="flex flex-wrap gap-4">
              {WAF_PILLARS.map(pillar => {
                const active = form.wafPillars.includes(pillar.id)
                return (
                  <label
                    key={pillar.id}
                    className="flex items-center gap-2 cursor-pointer select-none"
                  >
                    <div
                      className="w-3.5 h-3.5 border flex items-center justify-center shrink-0 transition-colors cursor-pointer"
                      style={{
                        borderColor: active ? pillar.color : '#1e2d40',
                        backgroundColor: active ? `${pillar.color}20` : 'transparent',
                      }}
                      onClick={() => togglePillar(pillar.id)}
                    >
                      {active && (
                        <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 10 10" style={{ color: pillar.color }}>
                          <path d="M1.5 5l2.5 2.5 4.5-4.5" stroke="currentColor" strokeWidth={1.5} strokeLinecap="square" />
                        </svg>
                      )}
                    </div>
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={active}
                      onChange={() => togglePillar(pillar.id)}
                    />
                    <span
                      className="text-xs font-mono transition-colors"
                      style={{ color: active ? pillar.color : '#94a3b8' }}
                    >
                      {pillar.label}
                    </span>
                  </label>
                )
              })}
            </div>
          </div>

          {/* Engagement Tier */}
          <div className="border border-border bg-surface p-4">
            <SectionLabel>Engagement Tier</SectionLabel>
            <div className="flex gap-6">
              {TIER_OPTIONS.map(tier => {
                const active = form.tier === tier.id
                return (
                  <label key={tier.id} className="flex items-center gap-2 cursor-pointer select-none">
                    <div
                      className="w-3.5 h-3.5 border rounded-full flex items-center justify-center shrink-0 transition-colors cursor-pointer"
                      style={{
                        borderColor: active ? tier.color : '#1e2d40',
                        backgroundColor: active ? `${tier.color}20` : 'transparent',
                      }}
                      onClick={() => set('tier')(tier.id)}
                    >
                      {active && (
                        <div
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ backgroundColor: tier.color }}
                        />
                      )}
                    </div>
                    <input
                      type="radio"
                      className="sr-only"
                      name="tier"
                      checked={active}
                      onChange={() => set('tier')(tier.id)}
                    />
                    <span
                      className="text-xs font-mono transition-colors"
                      style={{ color: active ? tier.color : '#94a3b8' }}
                    >
                      {tier.id}
                    </span>
                  </label>
                )
              })}
            </div>
          </div>

          {/* Context */}
          <div className="border border-border bg-surface p-4">
            <SectionLabel>Context</SectionLabel>
            <Textarea
              value={form.context}
              onChange={set('context')}
              placeholder="What is the issue that motivates this decision? What forces are at play?"
              rows={5}
            />
          </div>

          {/* Decision Drivers */}
          <div className="border border-border bg-surface p-4">
            <SectionLabel>Decision Drivers</SectionLabel>
            <DynamicList items={form.drivers} onChange={set('drivers')} placeholder="Driver..." />
          </div>

          {/* Options Considered */}
          <div className="border border-border bg-surface p-4 space-y-3">
            <div className="flex items-center justify-between">
              <SectionLabel>Options Considered</SectionLabel>
              {form.options.length < 4 && (
                <button
                  onClick={addOption}
                  className="text-2xs font-mono text-accent hover:text-accent/80 transition-colors"
                >
                  + add option
                </button>
              )}
            </div>
            {form.options.map((opt, idx) => (
              <OptionBlock
                key={opt.id}
                option={opt}
                idx={idx}
                onChange={updated => updateOption(opt.id, updated)}
                onRemove={() => removeOption(opt.id)}
                canRemove={form.options.length > 2}
              />
            ))}
          </div>

          {/* Decision */}
          <div className="border border-border bg-surface p-4 space-y-3">
            <SectionLabel>Decision</SectionLabel>
            <div>
              <label className="block text-2xs font-mono text-text-secondary mb-1">
                We will&#8230; (decision statement)
              </label>
              <TextInput
                value={form.decisionStatement}
                onChange={set('decisionStatement')}
                placeholder="adopt Azure API Management as the API gateway"
              />
            </div>
            <div>
              <label className="block text-2xs font-mono text-text-secondary mb-1">Rationale</label>
              <Textarea
                value={form.decisionRationale}
                onChange={set('decisionRationale')}
                placeholder="Explain why this option was chosen over the alternatives..."
                rows={4}
              />
            </div>
          </div>

          {/* Consequences */}
          <div className="border border-border bg-surface p-4 space-y-4">
            <SectionLabel>Consequences</SectionLabel>

            <div>
              <label className="block text-2xs font-mono text-text-secondary mb-1.5">Positive</label>
              <DynamicList items={form.positives} onChange={set('positives')} placeholder="Positive consequence..." />
            </div>

            <div>
              <label className="block text-2xs font-mono text-text-secondary mb-1.5">Negative / Trade-offs</label>
              <DynamicList items={form.negatives} onChange={set('negatives')} placeholder="Trade-off or negative consequence..." />
            </div>

            <div>
              <label className="block text-2xs font-mono text-text-secondary mb-1.5">Risks</label>
              <DynamicList items={form.risks} onChange={set('risks')} placeholder="Risk..." />
            </div>
          </div>

          {/* Compliance Notes */}
          <div className="border border-border bg-surface p-4">
            <SectionLabel>Compliance Notes</SectionLabel>
            <Textarea
              value={form.complianceNotes}
              onChange={set('complianceNotes')}
              placeholder="Any regulatory or compliance implications — FedRAMP, HIPAA, PCI DSS, SOC 2..."
              rows={3}
            />
          </div>

          {/* Related ADRs */}
          <div className="border border-border bg-surface p-4 space-y-2">
            <div className="flex items-center justify-between">
              <SectionLabel>Related ADRs</SectionLabel>
              <button
                onClick={addRelated}
                className="text-2xs font-mono text-accent hover:text-accent/80 transition-colors"
              >
                + add
              </button>
            </div>
            {form.relatedAdrs.length === 0 && (
              <p className="text-2xs font-mono text-text-secondary/40 italic">No related ADRs.</p>
            )}
            {form.relatedAdrs.map(r => (
              <div key={r.id} className="flex gap-1.5 items-center">
                <span className="text-2xs font-mono text-text-secondary/60 shrink-0">ADR-</span>
                <input
                  type="text"
                  value={r.number}
                  onChange={e => updateRelated(r.id, 'number', e.target.value)}
                  placeholder="002"
                  className="w-14 bg-canvas border border-border text-text-primary font-mono text-xs focus:border-accent outline-none px-2 py-2"
                />
                <TextInput
                  value={r.title}
                  onChange={val => updateRelated(r.id, 'title', val)}
                  placeholder="Related decision title"
                />
                <button
                  onClick={() => removeRelated(r.id)}
                  className="shrink-0 px-2 text-text-secondary/40 hover:text-critical transition-colors font-mono text-xs"
                >
                  ×
                </button>
              </div>
            ))}
          </div>

        </div>

        {/* ── Right: sticky preview panel ── */}
        <div className="w-[45%] shrink-0 sticky top-6">
          <div className="border border-border bg-surface">

            {/* Preview toolbar */}
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
              <p className="text-2xs font-semibold tracking-widest uppercase text-text-secondary font-display">
                Live Preview
              </p>
              <div className="flex gap-2">
                <button
                  onClick={handleSaveToProject}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-2xs font-mono border transition-colors"
                  style={{
                    borderColor: savedToProject ? '#10b981' : '#2563eb',
                    color: savedToProject ? '#10b981' : '#2563eb',
                  }}
                >
                  {savedToProject ? '✓ saved' : 'save to project'}
                </button>
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-2xs font-mono border transition-colors"
                  style={{
                    borderColor: copied ? '#10b981' : '#1e2d40',
                    color: copied ? '#10b981' : '#94a3b8',
                  }}
                >
                  {copied ? '✓ copied' : 'copy markdown'}
                </button>
                <button
                  onClick={handleDownload}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-2xs font-mono border border-border text-text-secondary hover:border-accent hover:text-accent transition-colors"
                >
                  download .md
                </button>
              </div>
            </div>

            {/* Scrollable preview body */}
            <div className="overflow-y-auto max-h-[calc(100vh-12rem)] p-5 bg-canvas">
              <MarkdownPreview markdown={markdown} />
            </div>

          </div>

          {/* Filename hint */}
          <p className="mt-2 text-2xs font-mono text-text-secondary/40 text-right">
            ADR-{form.adrNumber}-{slugify(form.title) || 'untitled'}.md
          </p>
        </div>

      </div>
    </div>
  )
}
