import { useState } from 'react'

// ─── Data ─────────────────────────────────────────────────────────────────────

const DECISION_MATRIX = [
  {
    dimension: 'Primary toolchain',
    bicep: 'Azure-native, first-class ARM support. No state file.',
    terraform: 'Multi-cloud capable, large module registry (Terraform Registry). Requires state management.',
    guidance: 'If the engagement is Azure-only, Bicep is architecturally cleaner. Terraform earns its weight when the client manages GCP or AWS alongside Azure, or already has a Terraform-first platform team.',
  },
  {
    dimension: 'ALZ (Azure Landing Zone) compatibility',
    bicep: 'First-party support — Microsoft publishes the ALZ Bicep accelerator. All reference modules track ARM schema directly.',
    terraform: 'Azure/caf-enterprise-scale Terraform module is well-maintained but lags ALZ Bicep by 1–2 release cycles.',
    guidance: 'For greenfield ALZ deployments, prefer Bicep unless the client has an existing Terraform pipeline. The ALZ Bicep accelerator is the reference implementation.',
  },
  {
    dimension: 'State management overhead',
    bicep: 'Stateless — ARM is the source of truth. Deployment Stacks add lifecycle grouping without a state file.',
    terraform: 'Remote state required. Must provision Azure Storage account + blob container + lease locking before any other deployment.',
    guidance: 'Bicep eliminates the "chicken and egg" bootstrap problem. For Terraform, the storage account for state is typically deployed via Azure CLI or a separate minimal Bicep template.',
  },
  {
    dimension: 'Existing client toolchain',
    bicep: 'Best when client team is Azure-centric or has no prior IaC investment.',
    terraform: 'Preferred when client platform team already uses Terraform Cloud/Enterprise or has existing module library.',
    guidance: 'Never refactor a working Terraform codebase to Bicep mid-engagement. The switching cost is rarely justified by the architectural improvement.',
  },
  {
    dimension: 'GitHub Actions / ADO integration',
    bicep: 'az deployment what-if as PR gate. Managed identity with az login --federated-token for OIDC auth.',
    terraform: 'terraform plan output as PR gate. azurerm backend with managed identity or OIDC via azurerm_backend service_principal_use_oidc.',
    guidance: 'Both integrate cleanly with GitHub Actions OIDC and Azure Workload Identity Federation. Avoid long-lived service principal secrets in either toolchain.',
  },
  {
    dimension: 'Policy and governance integration',
    bicep: 'DeployIfNotExists and Modify policy effects evaluate directly against ARM resource IDs emitted by Bicep deployments.',
    terraform: 'azurerm_policy_assignment works but terraform plan does not surface DINE/Modify policy effects — drift is invisible until apply.',
    guidance: 'At Govern tier, where Azure Policy is extensive, Bicep surfaces policy compliance more transparently. Run Compliance Scan in the pipeline for both toolchains.',
  },
]

const BICEP_STRUCTURE = {
  title: 'Bicep',
  description: 'Canonical module layout for a hub-spoke workload. main.bicep is the orchestration entry point; modules are single-responsibility.',
  files: [
    { path: 'main.bicep',                           role: 'Orchestration entry — calls all modules, passes parameters' },
    { path: 'parameters/dev.bicepparam',             role: 'Dev environment parameter values' },
    { path: 'parameters/prod.bicepparam',            role: 'Prod environment parameter values' },
    { path: 'modules/network/hub-vnet.bicep',        role: 'Hub VNet, subnets, NSG associations, DDoS plan association' },
    { path: 'modules/network/spoke-vnet.bicep',      role: 'Spoke VNet, peering to hub, Private DNS Zone links' },
    { path: 'modules/network/firewall.bicep',        role: 'Azure Firewall, policy, route tables' },
    { path: 'modules/identity/key-vault.bicep',      role: 'Key Vault, RBAC role assignments, diagnostic settings' },
    { path: 'modules/identity/managed-identity.bicep', role: 'User-assigned managed identities with federated credentials' },
    { path: 'modules/compute/app-service.bicep',     role: 'App Service Plan + Web App, VNet integration, identity binding' },
    { path: 'modules/compute/aks.bicep',             role: 'AKS cluster, node pools, OIDC issuer, workload identity' },
    { path: 'modules/data/sql-database.bicep',       role: 'Azure SQL server + database, Private Endpoint, AAD admin' },
    { path: 'modules/data/storage.bicep',            role: 'Storage account, lifecycle policy, Private Endpoint, RBAC' },
    { path: 'modules/governance/policy.bicep',       role: 'Policy assignments at subscription or resource group scope' },
    { path: 'modules/governance/monitoring.bicep',   role: 'Log Analytics workspace, DCR, diagnostic settings wiring' },
  ],
  notes: [
    'Each module declares its own outputs — main.bicep wires them together via module references, never hard-codes resource IDs.',
    'Use .bicepparam files (Bicep 0.18+) over JSON parameter files — they support expressions and comments.',
    'Deployment Stacks (az stack group create) group related modules into a lifecycle unit — delete the stack to cleanly remove all resources in dependency order.',
    'Run az deployment group what-if --confirm-with-what-if in CI before any apply — surface plan diffs as a PR check.',
  ],
}

const TERRAFORM_STRUCTURE = {
  title: 'Terraform',
  description: 'Canonical layout for an azurerm workload using local modules. State is remote in Azure Storage per environment.',
  files: [
    { path: 'main.tf',                               role: 'Root module — calls all child modules, wires outputs to inputs' },
    { path: 'variables.tf',                          role: 'Input variable declarations with type constraints and descriptions' },
    { path: 'outputs.tf',                            role: 'Root module outputs (resource IDs, connection strings for downstream)' },
    { path: 'providers.tf',                          role: 'azurerm provider config, version constraints, features block' },
    { path: 'backend.tf',                            role: 'azurerm backend — storage account, container, state key per env' },
    { path: 'environments/dev.tfvars',               role: 'Dev variable values' },
    { path: 'environments/prod.tfvars',              role: 'Prod variable values' },
    { path: 'modules/networking/main.tf',            role: 'Hub/spoke VNets, peering, NSGs, route tables' },
    { path: 'modules/networking/variables.tf',       role: 'Network module inputs' },
    { path: 'modules/networking/outputs.tf',         role: 'Subnet IDs, VNet IDs exported to callers' },
    { path: 'modules/compute/main.tf',               role: 'AKS, App Service, or VM depending on workload' },
    { path: 'modules/data/main.tf',                  role: 'SQL, Storage, Key Vault, Cosmos' },
    { path: 'modules/governance/main.tf',            role: 'Policy assignments, role assignments, diagnostic settings' },
    { path: 'scripts/bootstrap-state.sh',            role: 'One-time: creates storage account for Terraform state (run via az CLI)' },
  ],
  notes: [
    'Bootstrap problem: the storage account that holds Terraform state cannot itself be managed by that same Terraform config. Provision it separately via az CLI or a minimal Bicep template.',
    'Use separate state keys per environment: key = "dev/terraform.tfstate". Never share a single state file across environments.',
    'Enable blob versioning on the state storage account — accidental state corruption is recoverable if you can roll back.',
    'azurerm provider: always pin to a minor version constraint (e.g., ~> 4.0) in providers.tf — major versions contain breaking changes to resource schemas.',
    'Use terraform plan -out=tfplan in CI and terraform apply tfplan in CD — the plan file is cryptographically bound, preventing drift between plan and apply.',
  ],
}

const STATE_MGMT = [
  {
    heading: 'Bicep — Stateless ARM',
    body: 'Bicep deployments are idempotent by default. ARM tracks resource state directly; there is no local or remote state file. Re-running a deployment with the same parameters is safe. Incremental mode (the default) only touches resources declared in the template — existing resources not in the template are left untouched. Complete mode deletes resources not in the template and should be used only on isolated resource groups.',
    callouts: [
      { label: 'Deployment Stacks', text: 'az stack group create wraps a deployment into a managed lifecycle unit. The stack tracks which resources it owns. Deleting the stack deletes all owned resources in dependency order — no orphaned resources. Use at resource group or subscription scope.' },
      { label: 'Drift detection', text: 'ARM always reflects current resource state. az deployment group what-if compares the template against live ARM state and surfaces diffs without applying them. Run in CI on every PR targeting infrastructure branches.' },
      { label: 'Rollback', text: 'There is no native rollback in ARM deployments. Rollback = re-deploy the previous parameter file version from git. For databases and stateful resources, ensure deletion lock is set on the resource, not the resource group, to prevent accidental teardown.' },
    ],
  },
  {
    heading: 'Terraform — Remote State in Azure Storage',
    body: 'Terraform maintains a state file that maps resource addresses in configuration to real resource IDs in Azure. Remote state stored in Azure Blob Storage with lease-based locking prevents concurrent applies from corrupting the state file.',
    callouts: [
      { label: 'Backend config', text: 'resource_group_name, storage_account_name, container_name, and key are required. Use a separate storage account for Terraform state — do not co-locate with workload data. Enable soft delete and blob versioning.' },
      { label: 'State locking', text: 'azurerm backend acquires a blob lease before apply and releases it after. If a pipeline crashes mid-apply, the lease may remain. Run terraform force-unlock <lock-id> to release. Always investigate before unlocking — a concurrent apply may still be running.' },
      { label: 'State isolation', text: 'Each environment (dev/prod) must use a separate state key and ideally a separate storage container. Mixing environments in one state file creates blast radius — a botched prod apply can corrupt dev state and vice versa.' },
      { label: 'Import and drift', text: 'Resources created outside Terraform (portal, az CLI, ARM) must be imported before Terraform manages them: terraform import azurerm_resource_group.main /subscriptions/.../resourceGroups/rg-name. Unimported resources cause terraform plan to show them as "will be created," leading to duplicate or conflicting resources.' },
    ],
  },
]

const PIPELINE_PATTERNS = [
  {
    pattern: 'PR gate: plan/what-if as required check',
    description: 'Every pull request to an infrastructure branch runs a non-destructive plan pass. Reviewers see exactly what will change before merge.',
    bicep: 'az deployment group what-if --resource-group $RG --template-file main.bicep --parameters parameters/dev.bicepparam',
    terraform: 'terraform plan -var-file=environments/dev.tfvars -out=tfplan → post plan output as PR comment via actions/github-script',
    note: 'Gate the merge on a successful plan exit code. A plan that exits 0 but shows destructive changes (e.g., "will destroy") requires manual approval — configure branch protection to require a human reviewer for infrastructure changes.',
  },
  {
    pattern: 'Managed identity authentication (OIDC)',
    description: 'Replace service principal client secrets with Workload Identity Federation. The GitHub Actions runner exchanges a short-lived OIDC token for an Azure access token — no secret stored in GitHub.',
    bicep: 'az login --federated-token ${{ steps.github_token.outputs.token }} --service-principal -u $CLIENT_ID --tenant $TENANT_ID',
    terraform: 'provider "azurerm" { use_oidc = true } with ARM_CLIENT_ID, ARM_SUBSCRIPTION_ID, ARM_TENANT_ID env vars set from GitHub OIDC exchange',
    note: 'Assign the managed identity Contributor + User Access Administrator at the subscription scope for deployments that manage RBAC. Scope down to resource group for workload-only deployments.',
  },
  {
    pattern: 'Environment promotion: dev → prod',
    description: 'Dev deploys automatically on merge to main. Prod deployment requires a manual approval gate.',
    bicep: 'GitHub Actions: environment: production with required_reviewers. Runs: az deployment group create --parameters parameters/prod.bicepparam',
    terraform: 'Separate workflow job with environment: production approval gate. Uses -var-file=environments/prod.tfvars. Apply uses the plan artifact from the plan job.',
    note: 'Never parameterize environment by a string passed at runtime without validation — an accidental --parameters @prod.bicepparam on a dev pipeline can deploy production infrastructure. Use separate workflow triggers (workflow_dispatch with explicit env input) for prod.',
  },
  {
    pattern: 'Compliance scan in CI',
    description: 'Run PSRule for Azure (Bicep) or checkov (both) on every push to detect policy violations before deployment.',
    bicep: 'Invoke-PSRule -InputPath . -Module PSRule.Rules.Azure — runs against all *.bicep and *.bicepparam files in the repo',
    terraform: 'checkov -d . --framework terraform_plan -o junitxml > checkov-results.xml — run against the plan JSON output',
    note: 'PSRule rules align to Azure Well-Architected Framework and Azure Security Benchmark. Start with the WAF ruleset (Azure.WAF/All) and suppress rules that conflict with explicit architecture decisions rather than disabling the entire scan.',
  },
]

const TESTING = [
  {
    tool: 'PSRule for Azure',
    scope: 'Bicep (primary), ARM JSON',
    when: 'Every push to an infrastructure branch',
    what: 'Validates templates against Azure Security Benchmark, Azure Well-Architected Framework, and Microsoft Cloud Security Benchmark rules. Catches misconfigurations before deployment (e.g., storage account with public blob access, Key Vault without soft delete, NSG rule allowing 0.0.0.0/0).',
    install: 'Install-Module -Name PSRule.Rules.Azure -Repository PSGallery',
    run: 'Invoke-PSRule -InputPath . -Module PSRule.Rules.Azure -Outcome Fail,Error',
  },
  {
    tool: 'checkov',
    scope: 'Terraform, Bicep, ARM JSON, Kubernetes',
    when: 'Every push; can also run against terraform plan JSON output',
    what: 'Static analysis across IaC frameworks. 1000+ rules covering CIS benchmarks, NIST, SOC 2, PCI DSS, HIPAA. Unlike PSRule, checkov supports Terraform plan output — catches drift between configuration and applied state.',
    install: 'pip install checkov',
    run: 'checkov -d . --framework bicep  |  checkov -d . --framework terraform_plan --file tfplan.json',
  },
  {
    tool: 'Terratest',
    scope: 'Terraform (Go-based integration tests)',
    when: 'Nightly or pre-release; not on every PR (deploys real resources)',
    what: 'Go test library that deploys real Terraform configurations to Azure, asserts against live resources, and tears down. Validates that a module actually provisions what the plan claims — catches ARM API behavior mismatches that static analysis misses (e.g., subnet delegation conflicts, availability zone SKU restrictions).',
    install: 'go get github.com/gruntwork-io/terratest/modules/azure',
    run: 'go test -v -run TestAksCluster -timeout 30m',
  },
  {
    tool: 'az deployment validate',
    scope: 'Bicep, ARM JSON',
    when: 'Every PR (fast, no cost)',
    what: 'ARM pre-flight validation — catches schema errors, missing required parameters, circular dependencies, and resource provider registration issues before what-if runs. Zero cost since nothing is deployed.',
    install: 'Built into Azure CLI',
    run: 'az deployment group validate --resource-group $RG --template-file main.bicep --parameters parameters/dev.bicepparam',
  },
]

const STEP2_HANDOFF = [
  {
    decision: 'Management group hierarchy',
    why: 'Policy assignments, RBAC inheritance, and budget scopes are bound to the MG hierarchy. Templates that target a subscription must know which MG it lives under — you cannot retrofit MG structure after resources are deployed without re-deploying everything below that scope.',
    mustKnowBefore: 'Which MG receives the landing zone subscription? What policy initiatives (e.g., Azure Security Benchmark, FedRAMP HIGH) are assigned at which scope?',
  },
  {
    decision: 'Naming convention and tagging taxonomy',
    why: 'Resource names are immutable for most Azure services. Changing a Key Vault or Storage account name after creation requires destroy + recreate. The naming convention must be finalized before the first template is committed.',
    mustKnowBefore: 'Abbreviation map for all resource types, environment suffixes, region abbreviations, sequence numbering scheme. Tag schema: environment, costCenter, owner, criticality, dataClassification.',
  },
  {
    decision: 'IP address plan',
    why: 'VNet address spaces cannot overlap with on-premises ranges or peered VNets. Subnets are sized once — resizing requires recreating the subnet, which destroys any resources attached to it. The hub VNet and all spoke VNets must have non-overlapping RFC 1918 ranges agreed before network module authoring begins.',
    mustKnowBefore: 'Hub VNet CIDR, spoke VNet CIDRs per environment, gateway subnet (/27 minimum), Azure Firewall subnet (/26 required), Private Endpoint subnet, compute subnets. On-premises ranges to be excluded.',
  },
  {
    decision: 'RBAC model and custom roles',
    why: 'Managed identity role assignments are wired inside modules. If the RBAC model changes after modules are written, every role assignment must be updated. Custom roles must be defined at a scope that covers all subscriptions where they will be assigned.',
    mustKnowBefore: 'Which managed identities need which built-in roles on which resources? Are custom roles required (e.g., Key Vault Secrets User is built-in; a custom "read-only Data Factory operator" is not)? Who has Owner at the subscription — this is a deployment prerequisite.',
  },
  {
    decision: 'Policy exceptions and exemptions',
    why: 'Policies inherited from the MG hierarchy may block template deployments by design (e.g., "deny public IP creation" blocks App Service with inbound public IP). Exemptions must be created at the resource or resource group scope before deployment, not after.',
    mustKnowBefore: 'Which inherited policies will block this deployment? Which resources need policy exemptions and at what scope? Who has the authority to grant exemptions (Policy Contributor at MG)?',
  },
  {
    decision: 'Secret and certificate bootstrapping',
    why: 'Key Vault cannot store secrets until it exists, but managed identities need Key Vault access to run the app. The bootstrapping sequence matters: create Key Vault → assign RBAC → populate secrets → deploy compute. This sequence must be codified in the deployment order, not left to manual steps.',
    mustKnowBefore: 'Which secrets exist at deployment time (connection strings, API keys) vs. are generated during deployment (storage account keys, managed identity credentials)? Who populates the initial secret values — pipeline or human?',
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

function Callout({ label, text }) {
  return (
    <div className="border-l-2 border-accent/40 pl-3 py-0.5">
      <span className="text-2xs font-mono font-semibold text-accent uppercase tracking-wider">{label} </span>
      <span className="text-xs text-text-secondary font-body leading-relaxed">{text}</span>
    </div>
  )
}

function DecisionMatrixRow({ row }) {
  return (
    <div className="border-b border-border last:border-0 grid grid-cols-[1fr_1fr_1fr] divide-x divide-border">
      <div className="px-4 py-3">
        <p className="text-xs font-semibold text-text-primary font-display">{row.dimension}</p>
      </div>
      <div className="px-4 py-3">
        <p className="text-xs text-text-secondary font-body leading-relaxed">{row.bicep}</p>
      </div>
      <div className="px-4 py-3">
        <p className="text-xs text-text-secondary font-body leading-relaxed">{row.terraform}</p>
      </div>
    </div>
  )
}

function ModuleStructureCard({ data }) {
  const [open, setOpen] = useState(false)

  return (
    <div className={`border bg-surface transition-colors ${open ? 'border-accent/30' : 'border-border hover:border-border/80'}`}>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full text-left px-5 py-4 flex items-center gap-3"
      >
        <span className="font-mono text-2xs font-semibold text-accent uppercase tracking-wider bg-accent/10 border border-accent/30 px-2 py-0.5 shrink-0">
          {data.title}
        </span>
        <p className="text-sm text-text-secondary font-body flex-1 min-w-0 text-left leading-snug">
          {data.description}
        </p>
        <ChevronIcon open={open} />
      </button>

      {open && (
        <div className="border-t border-border bg-canvas/60 px-5 pb-6 pt-5 space-y-5">
          <div>
            <SectionLabel>File Layout</SectionLabel>
            <div className="border border-border divide-y divide-border">
              {data.files.map(f => (
                <div key={f.path} className="grid grid-cols-[220px_1fr] divide-x divide-border">
                  <div className="px-3 py-2 font-mono text-2xs text-accent break-all">{f.path}</div>
                  <div className="px-3 py-2 text-xs text-text-secondary font-body leading-relaxed">{f.role}</div>
                </div>
              ))}
            </div>
          </div>
          <div>
            <SectionLabel>Design Notes</SectionLabel>
            <ul className="space-y-2">
              {data.notes.map((n, i) => (
                <li key={i} className="flex gap-2 text-xs text-text-secondary font-body leading-relaxed">
                  <span className="text-tier-govern shrink-0 font-mono pt-px select-none">→</span>
                  {n}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}

function StateMgmtCard({ item }) {
  const [open, setOpen] = useState(false)

  return (
    <div className={`border bg-surface transition-colors ${open ? 'border-accent/30' : 'border-border hover:border-border/80'}`}>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full text-left px-5 py-4 flex items-center gap-3"
      >
        <p className={`text-sm font-semibold font-display flex-1 leading-snug transition-colors ${open ? 'text-accent' : 'text-text-primary'}`}>
          {item.heading}
        </p>
        <ChevronIcon open={open} />
      </button>

      {open && (
        <div className="border-t border-border bg-canvas/60 px-5 pb-6 pt-5 space-y-4">
          <p className="text-xs text-text-secondary font-body leading-relaxed">{item.body}</p>
          <div className="space-y-3">
            {item.callouts.map(c => (
              <Callout key={c.label} label={c.label} text={c.text} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function PipelineCard({ item }) {
  const [open, setOpen] = useState(false)

  return (
    <div className={`border bg-surface transition-colors ${open ? 'border-accent/30' : 'border-border hover:border-border/80'}`}>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full text-left px-5 py-4 flex items-center gap-3"
      >
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-semibold font-display leading-snug transition-colors ${open ? 'text-accent' : 'text-text-primary'}`}>
            {item.pattern}
          </p>
          {!open && <p className="text-xs text-text-secondary font-body mt-0.5 leading-snug">{item.description}</p>}
        </div>
        <ChevronIcon open={open} />
      </button>

      {open && (
        <div className="border-t border-border bg-canvas/60 px-5 pb-6 pt-5 space-y-4">
          <p className="text-xs text-text-secondary font-body leading-relaxed">{item.description}</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <SectionLabel>Bicep</SectionLabel>
              <code className="block text-2xs font-mono text-accent bg-canvas border border-border px-3 py-2 leading-relaxed whitespace-pre-wrap break-all">
                {item.bicep}
              </code>
            </div>
            <div>
              <SectionLabel>Terraform</SectionLabel>
              <code className="block text-2xs font-mono text-accent bg-canvas border border-border px-3 py-2 leading-relaxed whitespace-pre-wrap break-all">
                {item.terraform}
              </code>
            </div>
          </div>
          {item.note && (
            <div className="border-l-2 border-warning/40 pl-3 py-0.5">
              <p className="text-xs text-text-secondary font-body leading-relaxed">{item.note}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function TestingCard({ item }) {
  const [open, setOpen] = useState(false)

  return (
    <div className={`border bg-surface transition-colors ${open ? 'border-accent/30' : 'border-border hover:border-border/80'}`}>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full text-left px-5 py-4 flex items-center gap-3"
      >
        <div className="flex-1 min-w-0 flex items-center gap-3">
          <span className="font-mono text-2xs font-semibold text-text-primary shrink-0">{item.tool}</span>
          <span className="text-2xs text-text-secondary font-body hidden sm:block">{item.scope}</span>
        </div>
        <span className="text-2xs font-mono text-text-secondary shrink-0 hidden md:block">{item.when}</span>
        <ChevronIcon open={open} />
      </button>

      {open && (
        <div className="border-t border-border bg-canvas/60 px-5 pb-6 pt-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <SectionLabel>Scope</SectionLabel>
              <p className="text-xs text-text-secondary font-body leading-relaxed">{item.scope}</p>
              <div className="mt-3">
                <SectionLabel>Run When</SectionLabel>
                <p className="text-xs text-text-secondary font-body leading-relaxed">{item.when}</p>
              </div>
            </div>
            <div>
              <SectionLabel>What It Validates</SectionLabel>
              <p className="text-xs text-text-secondary font-body leading-relaxed">{item.what}</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <SectionLabel>Install</SectionLabel>
              <code className="block text-2xs font-mono text-accent bg-canvas border border-border px-3 py-2">{item.install}</code>
            </div>
            <div>
              <SectionLabel>Run</SectionLabel>
              <code className="block text-2xs font-mono text-accent bg-canvas border border-border px-3 py-2 whitespace-pre-wrap break-all">{item.run}</code>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function HandoffCard({ item }) {
  const [open, setOpen] = useState(false)

  return (
    <div className={`border bg-surface transition-colors ${open ? 'border-accent/30' : 'border-border hover:border-border/80'}`}>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full text-left px-5 py-4 flex items-center gap-3"
      >
        <p className={`text-sm font-semibold font-display flex-1 leading-snug transition-colors ${open ? 'text-accent' : 'text-text-primary'}`}>
          {item.decision}
        </p>
        <ChevronIcon open={open} />
      </button>

      {open && (
        <div className="border-t border-border bg-canvas/60 px-5 pb-6 pt-5 space-y-4">
          <div>
            <SectionLabel>Why this must be decided first</SectionLabel>
            <p className="text-xs text-text-secondary font-body leading-relaxed">{item.why}</p>
          </div>
          <div className="border-l-2 border-accent/40 pl-3 py-0.5">
            <p className="text-2xs font-mono font-semibold text-accent uppercase tracking-wider mb-1">Must know before authoring templates</p>
            <p className="text-xs text-text-secondary font-body leading-relaxed">{item.mustKnowBefore}</p>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function IacReference() {
  return (
    <div className="max-w-5xl mx-auto px-8 py-12 space-y-14">

      {/* ── Header ── */}
      <div>
        <p className="text-2xs font-semibold tracking-widest uppercase text-text-secondary font-display mb-1">
          Reference
        </p>
        <h1 className="font-display text-3xl font-bold text-text-primary mb-3">
          Infrastructure as Code
        </h1>
        <p className="text-text-secondary font-body text-sm leading-relaxed max-w-2xl">
          Bicep and Terraform guidance for Azure engagement deployments. Covers the Bicep vs Terraform
          decision, canonical module structure, state management, pipeline integration, and testing.
          Step 02 governance decisions that must precede template authoring are listed at the bottom.
        </p>
      </div>

      {/* ── Bicep vs Terraform ── */}
      <section>
        <h2 className="font-display text-lg font-semibold text-text-primary mb-1">Bicep vs Terraform</h2>
        <p className="text-sm text-text-secondary font-body mb-4">
          Decision matrix across the dimensions that actually differ in practice. When the client has no prior IaC investment,
          default to Bicep for Azure-only workloads.
        </p>
        <div className="border border-border">
          <div className="grid grid-cols-[1fr_1fr_1fr] border-b border-border bg-canvas divide-x divide-border">
            <div className="px-4 py-2.5 text-2xs font-semibold text-text-secondary uppercase tracking-wider font-display">Dimension</div>
            <div className="px-4 py-2.5 text-2xs font-semibold text-text-secondary uppercase tracking-wider font-display">Bicep</div>
            <div className="px-4 py-2.5 text-2xs font-semibold text-text-secondary uppercase tracking-wider font-display">Terraform</div>
          </div>
          {DECISION_MATRIX.map(row => (
            <DecisionMatrixRow key={row.dimension} row={row} />
          ))}
        </div>
        <div className="mt-3 space-y-2">
          {DECISION_MATRIX.map(row => (
            <div key={row.dimension} className="border-l-2 border-border pl-3 py-0.5">
              <span className="text-2xs font-mono text-text-secondary/60 uppercase tracking-wider">{row.dimension} — </span>
              <span className="text-xs text-text-secondary font-body leading-relaxed">{row.guidance}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Module Structure ── */}
      <section>
        <h2 className="font-display text-lg font-semibold text-text-primary mb-1">Module Structure</h2>
        <p className="text-sm text-text-secondary font-body mb-4">
          Canonical layouts for hub-spoke workloads. Expand each to see the file tree and design rationale.
        </p>
        <div className="space-y-2">
          <ModuleStructureCard data={BICEP_STRUCTURE} />
          <ModuleStructureCard data={TERRAFORM_STRUCTURE} />
        </div>
      </section>

      {/* ── State Management ── */}
      <section>
        <h2 className="font-display text-lg font-semibold text-text-primary mb-1">State and Lifecycle Management</h2>
        <p className="text-sm text-text-secondary font-body mb-4">
          Bicep and Terraform have fundamentally different state models. Understanding the model
          determines how drift detection, rollback, and resource lifecycle work in practice.
        </p>
        <div className="space-y-2">
          {STATE_MGMT.map(item => (
            <StateMgmtCard key={item.heading} item={item} />
          ))}
        </div>
      </section>

      {/* ── Pipeline Patterns ── */}
      <section>
        <h2 className="font-display text-lg font-semibold text-text-primary mb-1">Pipeline Integration Patterns</h2>
        <p className="text-sm text-text-secondary font-body mb-4">
          Deployment pipeline patterns that apply to both GitHub Actions and Azure DevOps.
          Expand each pattern for Bicep and Terraform specifics.
        </p>
        <div className="space-y-2">
          {PIPELINE_PATTERNS.map(item => (
            <PipelineCard key={item.pattern} item={item} />
          ))}
        </div>
      </section>

      {/* ── IaC Testing ── */}
      <section>
        <h2 className="font-display text-lg font-semibold text-text-primary mb-1">IaC Testing</h2>
        <p className="text-sm text-text-secondary font-body mb-4">
          Three layers: static validation (fast, free, on every PR), compliance scanning
          (catches policy violations before deployment), and integration testing (slow, real resources, nightly).
        </p>
        <div className="space-y-2">
          {TESTING.map(item => (
            <TestingCard key={item.tool} item={item} />
          ))}
        </div>
      </section>

      {/* ── Step 02 Handoff ── */}
      <section>
        <h2 className="font-display text-lg font-semibold text-text-primary mb-1">Step 02 Handoff — Decisions That Gate Template Authoring</h2>
        <p className="text-sm text-text-secondary font-body mb-4">
          These decisions must be resolved in Step 02 before anyone writes a template. Retrofitting any
          of these after initial deployment is expensive, destructive, or impossible without a full
          redeploy. Treat each as a blocking dependency.
        </p>
        <div className="space-y-2">
          {STEP2_HANDOFF.map(item => (
            <HandoffCard key={item.decision} item={item} />
          ))}
        </div>
      </section>

    </div>
  )
}
