import { useState, Fragment } from 'react'
import { hl } from '../utils/hl'

const PRIMITIVES = [
  {
    term: 'Azure Cache for Redis',
    abbr: 'Redis',
    color: 'border-waf-performance text-waf-performance',
    def: 'Managed in-memory data store for distributed caching, session state, pub/sub, and leaderboards. Basic/Standard/Premium tiers — Premium adds clustering, geo-replication, and VNet injection. The default choice for application-level distributed cache in Azure.',
  },
  {
    term: 'Azure Front Door / CDN',
    abbr: 'CDN',
    color: 'border-waf-performance text-waf-performance',
    def: 'Edge caching for static assets and cacheable HTTP responses. Azure Front Door combines CDN, WAF, and global load balancing. Cache rules defined by URL pattern, query string behavior, and TTL. Reduces origin load for read-heavy public workloads.',
  },
  {
    term: 'APIM Response Cache',
    abbr: 'APIM',
    color: 'border-waf-cost text-waf-cost',
    def: 'Azure API Management can cache API responses at the gateway — internal cache (in-memory) or external cache (Redis). Eliminates repeated calls to backend for identical requests within the TTL window. Configurable per operation via cache-lookup and cache-store policies.',
  },
  {
    term: 'In-Process Memory Cache',
    abbr: 'Mem',
    color: 'border-waf-performance text-waf-performance',
    def: 'IMemoryCache (.NET) or equivalent in-process cache. Zero network latency; invalidated on restart or scale-out. Only appropriate for data that is expensive to compute, rarely changes, and is safe to be inconsistent across instances.',
  },
  {
    term: 'Azure SQL Query Cache',
    abbr: 'SQL',
    color: 'border-waf-performance text-waf-performance',
    def: 'Azure SQL and Cosmos DB have internal query result caching and buffer pool management. Not directly configurable by the application — influenced by query patterns, indexing strategy, and DTU/RU allocation. Understand this layer before adding Redis on top.',
  },
  {
    term: 'Azure AI Search',
    abbr: 'Search',
    color: 'border-waf-performance text-waf-performance',
    def: 'Semantic and full-text search index that effectively acts as a read cache for complex query patterns. Used as the read projection in CQRS for full-text and faceted queries that would be expensive against a transactional store.',
  },
]

const CACHING_PATTERNS = [
  {
    id: 'cache-aside',
    label: 'Cache-Aside (Lazy Loading)',
    tagline: 'Application manages cache population on miss',
    tiers: ['land', 'scale', 'govern'],
    when: 'The most common and safest caching pattern. Application checks cache first; on miss, loads from the data store, populates the cache, and returns the result. Cache is never stale beyond its TTL — it simply may not exist yet.',
    how: [
      'Check Redis for the cache key; if hit, return immediately',
      'On miss, query the data store, serialize the result, write to Redis with an explicit TTL',
      'TTL is the primary consistency control — shorter TTL means fresher data at higher origin load; tune per entity type, not globally',
      'Use a consistent key naming scheme: entity type + identifier + version (e.g., product:42:v1) — arbitrary key names cause collisions and silent overwrites',
      'On write, invalidate or update the cache key immediately rather than waiting for TTL expiry when consistency matters',
    ],
    never: 'Use a single global TTL for all cached entities — session tokens, product catalog, and user preferences have fundamentally different staleness tolerances.',
  },
  {
    id: 'write-through',
    label: 'Write-Through',
    tagline: 'Cache is updated synchronously on every write',
    tiers: ['scale', 'govern'],
    when: 'Workloads where cache misses are expensive and data freshness is critical. Writes go to both the cache and the data store in the same operation — the cache is always current, eliminating the cold-start miss problem of cache-aside.',
    how: [
      'On every write, update the data store first, then update the cache',
      'If the cache update fails, log and continue — the data store is the source of truth; the cache will be repopulated on the next miss',
      'Pair with a background job that pre-warms cache keys for high-traffic entities at deployment time',
      'Use Redis transactions (MULTI/EXEC) when updating multiple related keys atomically',
    ],
    never: 'Write to cache before the data store — a failed data store write with a successful cache write produces phantom data that expires silently, leaving no trace of the inconsistency.',
  },
  {
    id: 'read-through',
    label: 'Read-Through',
    tagline: 'Cache layer transparently loads from data store on miss',
    tiers: ['scale', 'govern'],
    when: 'The cache provider handles miss resolution rather than the application. The application always reads from cache; the cache fetches from the data store when a key is missing. Reduces application complexity when the cache provider supports this model (Redis with a backing store plugin, or a caching library that wraps the data store client).',
    how: [
      'Configure the cache client with a loader function that fetches from the data store on miss',
      'The application code has no knowledge of whether the result came from cache or origin — one read path',
      'Combine with write-through for full read/write transparency',
      'Monitor cache hit rate — a sustained hit rate below 70% suggests TTL is too short or the working set is too large for the allocated cache memory',
    ],
    never: 'Use read-through for data that requires post-fetch transformation before caching — the loader function should return the exact bytes to cache; transformation logic belongs in the application layer.',
  },
  {
    id: 'stampede',
    label: 'Cache Stampede Prevention',
    tagline: 'Prevent thundering herd on cache expiry',
    tiers: ['scale', 'govern'],
    when: 'High-traffic workloads where many concurrent requests hit a cache miss simultaneously — all rush to the data store, overwhelming it. Particularly dangerous at startup, after a cache flush, or when a popular key expires under heavy load.',
    how: [
      'Probabilistic early expiration: refresh a cache key slightly before it expires (using a random jitter), rather than waiting for the exact TTL moment',
      'Mutex/lock pattern: when a miss occurs, one request acquires a lock and populates the cache; other requests wait on the lock rather than all hitting the data store simultaneously',
      'Stale-while-revalidate: serve the expired (stale) cached value immediately while a background process refreshes it — eliminates user-visible latency at the cost of brief staleness',
      'Redis SETNX (set if not exists) is the primitive for distributed lock implementation',
    ],
    never: 'Rely on TTL alone for cache management under high concurrency — stampede behavior is predictable and should be designed around, not discovered in production.',
  },
  {
    id: 'session',
    label: 'Distributed Session State',
    tagline: 'Externalizing session from in-process memory for horizontal scale',
    tiers: ['land', 'scale', 'govern'],
    when: 'Any workload that scales horizontally (multiple instances) and needs to maintain user session state across requests. In-process session breaks sticky sessions; Redis provides a shared session store that any instance can read.',
    how: [
      'Use the Azure Cache for Redis session provider (ASP.NET Core: AddStackExchangeRedisCache + AddSession)',
      'Session keys must be unique per user and per session — use a cryptographically random session ID, not a predictable value',
      'Set session TTL to match your application\'s idle timeout policy — abandoned sessions consume Redis memory indefinitely if TTL is not set',
      'Store only the minimum data in session — user ID and role claims; reload full profile from the data store on demand rather than caching it in session',
    ],
    never: 'Store sensitive data (tokens, PII, payment data) in session state — Redis session is application-layer storage, not a secrets store; use Key Vault and token validation for sensitive material.',
  },
]

const REDIS_TIERS = [
  {
    tier: 'Basic',
    memory: '250 MB – 53 GB',
    clustering: 'No',
    vnet: 'No',
    use: 'Dev/test only — no SLA, no replication',
  },
  {
    tier: 'Standard',
    memory: '250 MB – 53 GB',
    clustering: 'No',
    vnet: 'No',
    use: 'Single-region production with replication; no compliance overlay',
  },
  {
    tier: 'Premium',
    memory: '6 GB – 1.2 TB',
    clustering: 'Yes (up to 10 shards)',
    vnet: 'Yes',
    use: 'Production with compliance overlay; required for Private Endpoint',
  },
  {
    tier: 'Enterprise',
    memory: '12 GB – 2 TB',
    clustering: 'Yes (Redis Enterprise)',
    vnet: 'Yes',
    use: 'Active geo-replication, RediSearch, RedisBloom; financial/regulated workloads',
  },
  {
    tier: 'Enterprise Flash',
    memory: '384 GB – 13 TB',
    clustering: 'Yes',
    vnet: 'Yes',
    use: 'Very large working sets where DRAM cost is prohibitive; NVMe-backed',
  },
]

const TIER_TOPOLOGY = [
  {
    tier: 'land',
    cls: 'text-tier-land border-tier-land',
    dot: 'bg-tier-land',
    items: [
      'In-process memory cache for expensive computations (IMemoryCache)',
      'Azure Cache for Redis Basic/Standard for session state and simple cache-aside',
      'No VNet injection required at Land tier unless compliance overlay present',
      'Single Redis instance; no clustering or geo-replication',
      'APIM response caching for read-heavy API operations',
    ],
  },
  {
    tier: 'scale',
    cls: 'text-tier-scale border-tier-scale',
    dot: 'bg-tier-scale',
    items: [
      'Azure Cache for Redis Premium with VNet injection; Private Endpoint',
      'Cache-aside pattern for entity data; write-through for high-read entities',
      'Separate Redis instances for session state and application cache — different TTL profiles and eviction policies',
      'CDN / Azure Front Door for static assets and cacheable public API responses',
      'Monitor hit rate, eviction rate, and memory usage; alert on eviction spikes',
    ],
  },
  {
    tier: 'govern',
    cls: 'text-tier-govern border-tier-govern',
    dot: 'bg-tier-govern',
    items: [
      'Redis Enterprise for active geo-replication across regions (active-active)',
      'Cache stampede prevention designed explicitly for high-traffic key classes',
      'Right-to-erasure workflow includes cache invalidation across all regions',
      'Compliance overlay: all cache data encrypted at rest and in transit; customer-managed keys for Enterprise tier',
      'Cache topology documented in ADR; TTL and consistency decisions reviewed as part of data classification in Step 03',
    ],
  },
]

const ANTI_PATTERNS = [
  'Caching as a fix for slow queries — a cache hit on a result that took 8 seconds to compute is a performance patch, not a solution; fix the underlying query or schema before adding a cache layer on top',
  'No TTL defined — Redis without TTL retains keys indefinitely; memory fills, eviction policy activates, and seemingly random data disappears; every cached key must have an explicit TTL',
  'Global TTL applied uniformly — session tokens, product catalog pages, and user permissions have fundamentally different staleness tolerances; one TTL value for all entities is a design smell',
  'Cache on public endpoint without Private Endpoint in regulated workloads — Basic and Standard Redis tiers do not support VNet injection; this is discovered at compliance review, not architecture design',
  'Storing too much in session — session state is not a general-purpose data store; large session objects increase Redis memory consumption and serialization overhead on every request',
  'No cache invalidation strategy for write paths — a cache that is never explicitly invalidated on write is eventually a stale data generator; invalidation must be designed alongside population',
  'Treating cache availability as guaranteed — Redis is highly available but not infinitely so; application code must handle cache misses gracefully and fall through to the data store; a cache outage must not take down the application',
]

const NO_CACHE_ITEMS = [
  'Authorization decisions — cached "user X has role Y" decisions may survive a role revocation; if your security model requires immediate revocation, do not cache authorization results beyond a very short TTL (30–60 seconds maximum)',
  'Financial balances and inventory counts — stale counts lead to overselling or overdrawing; accept eventual consistency only if the business has explicitly approved it with a compensating transaction design',
  'Compliance-sensitive data — data subject to right-to-erasure (GDPR) must be purgeable from all cache layers, not just the primary store; design cache invalidation as part of the erasure workflow',
  'Frequently mutated state — a cache with a 5-minute TTL on data that changes every 30 seconds provides almost no hit rate benefit and guarantees staleness; profile write frequency before caching',
  'Large binary payloads — Redis is an in-memory store; caching large blobs or documents displaces small, frequently-accessed keys; use Azure CDN or Blob Storage with CDN for binary assets',
  'Secrets and tokens — application secrets and access tokens belong in Key Vault and the token cache of the Azure SDK respectively; do not hand-roll secret caching in Redis',
]

const TIER_LABELS = { land: 'Land', scale: 'Scale', govern: 'Govern' }
const TIER_CLASSES = {
  land:   'border-tier-land text-tier-land',
  scale:  'border-tier-scale text-tier-scale',
  govern: 'border-tier-govern text-tier-govern',
}

export default function CachingDesign() {
  const [open, setOpen] = useState(null)

  return (
    <div className="max-w-6xl mx-auto px-8 py-12">

      {/* Header */}
      <div className="mb-10">
        <p className="text-2xs font-semibold tracking-widest uppercase text-text-secondary font-display mb-1">Design Guide</p>
        <h1 className="font-display text-3xl font-bold text-text-primary mb-4">Caching Design</h1>
        <div className="border border-waf-performance/30 bg-surface px-6 py-5 max-w-3xl">
          <p className="text-2xs font-semibold uppercase tracking-widest text-waf-performance font-display mb-2">Performance Efficiency · Reliability · Cost</p>
          <p className="text-sm font-body text-text-primary leading-relaxed">
            {hl('Caching decisions span multiple framework steps — the strategy is scoped in Step 03 alongside data architecture, but the identity and network implications are designed in Step 02. The wrong caching layer for a workload does not just affect performance; it introduces consistency risks that surface as data correctness incidents in production.')}
          </p>
        </div>
      </div>

      {/* Caching Primitives */}
      <section className="mb-10">
        <SectionHeader label="Building Blocks" title="Caching Primitives" />
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

      {/* Caching Patterns */}
      <section className="mb-10">
        <SectionHeader label="Implementation" title="Caching Patterns" />
        <div className="flex flex-col gap-px bg-border border border-border">
          {CACHING_PATTERNS.map(p => (
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
                            <span className="mt-1.5 w-1 h-1 rounded-full bg-waf-performance shrink-0" />
                            {hl(step)}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="border-l-2 border-waf-performance/30 pl-4">
                      <p className="text-2xs font-semibold uppercase tracking-widest text-waf-performance font-display mb-2">Never</p>
                      <p className="text-xs font-body text-text-secondary leading-relaxed">{hl(p.never)}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Redis Tier Reference */}
      <section className="mb-10">
        <SectionHeader label="Redis Tiers" title="Azure Cache for Redis — Tier Selection" />
        <p className="text-xs text-text-secondary font-body mb-3 max-w-2xl leading-relaxed">
          {hl('Tier selection is a Step 03 decision with Step 02 implications — only Premium tier supports VNet injection, which is required for Private Endpoint connectivity in regulated workloads.')}
        </p>
        <div className="border border-border overflow-x-auto">
          <div className="grid grid-cols-[1fr_1fr_1fr_1fr_1.5fr] min-w-[700px]">
            {['Tier', 'Memory', 'Clustering', 'VNet / PE', 'Use'].map(h => (
              <div key={h} className="bg-surface border-b border-border px-4 py-2.5">
                <span className="text-2xs font-semibold uppercase tracking-widest text-text-primary font-display">{h}</span>
              </div>
            ))}
            {REDIS_TIERS.map((row, idx) => (
              <Fragment key={idx}>
                <div className={`px-4 py-3 ${idx < REDIS_TIERS.length - 1 ? 'border-b border-border' : ''} ${idx % 2 === 0 ? 'bg-surface' : 'bg-canvas/40'}`}>
                  <span className="text-xs font-mono text-text-primary">{row.tier}</span>
                </div>
                <div className={`px-4 py-3 ${idx < REDIS_TIERS.length - 1 ? 'border-b border-border' : ''} ${idx % 2 === 0 ? 'bg-surface' : 'bg-canvas/40'}`}>
                  <span className="text-xs font-body text-text-secondary leading-snug">{row.memory}</span>
                </div>
                <div className={`px-4 py-3 ${idx < REDIS_TIERS.length - 1 ? 'border-b border-border' : ''} ${idx % 2 === 0 ? 'bg-surface' : 'bg-canvas/40'}`}>
                  <span className="text-xs font-body text-text-secondary leading-snug">{row.clustering}</span>
                </div>
                <div className={`px-4 py-3 ${idx < REDIS_TIERS.length - 1 ? 'border-b border-border' : ''} ${idx % 2 === 0 ? 'bg-surface' : 'bg-canvas/40'}`}>
                  <span className={`pillar-badge text-2xs ${row.vnet === 'Yes' ? 'border-waf-reliability text-waf-reliability' : 'border-waf-security text-waf-security'}`}>{row.vnet}</span>
                </div>
                <div className={`px-4 py-3 ${idx < REDIS_TIERS.length - 1 ? 'border-b border-border' : ''} ${idx % 2 === 0 ? 'bg-surface' : 'bg-canvas/40'}`}>
                  <span className="text-xs font-body text-text-secondary leading-snug">{row.use}</span>
                </div>
              </Fragment>
            ))}
          </div>
        </div>
      </section>

      {/* What NOT to Cache */}
      <section className="mb-10">
        <SectionHeader label="Consistency Boundaries" title="What Not to Cache" />
        <div className="border border-waf-security/30 bg-surface px-6 py-5 max-w-3xl">
          <p className="text-xs font-body text-text-secondary leading-relaxed mb-4">
            {hl('Caching introduces eventual consistency by design. The following categories of data require careful evaluation before caching — in many cases, caching them is the correct decision, but the consistency implications must be explicitly accepted and documented in Step 03.')}
          </p>
          <ul className="space-y-2.5">
            {NO_CACHE_ITEMS.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-xs font-body text-text-secondary leading-snug">
                <span className="mt-1.5 w-1 h-1 rounded-full bg-waf-security shrink-0" />
                {hl(item)}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Tier Topology */}
      <section className="mb-10">
        <SectionHeader label="Tier Topology" title="Caching Complexity by Engagement Tier" />
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
        <SectionHeader label="Anti-Patterns" title="Caching Design Failures" />
        <div className="border border-border bg-surface px-6 py-5">
          <ul className="space-y-2.5">
            {ANTI_PATTERNS.map((a, i) => (
              <li key={i} className="flex items-start gap-2 text-xs font-body text-text-secondary leading-snug">
                <span className="mt-1.5 w-1 h-1 rounded-full bg-waf-performance shrink-0" />
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
