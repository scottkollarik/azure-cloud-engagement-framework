@description('Azure region for all resources')
param location string = 'eastus2'

@description('Environment name — used in resource naming')
@allowed(['prod'])
param environment string = 'prod'

// ─── Static Web App ───────────────────────────────────────────────────────────
// Custom domain binding is a separate step — run infra/bind-domain.sh after
// the CNAME record is live in DNS.

resource staticWebApp 'Microsoft.Web/staticSites@2023-01-01' = {
  name: 'swa-cloudframework-${environment}'
  location: location
  sku: {
    name: 'Free'
    tier: 'Free'
  }
  properties: {
    buildProperties: {
      skipGithubActionWorkflowGeneration: true
    }
  }
}

// ─── Outputs ─────────────────────────────────────────────────────────────────

@description('Default hostname assigned by Azure Static Web Apps — use this as the CNAME target')
output defaultHostname string = staticWebApp.properties.defaultHostname

@description('Static Web App resource ID')
output staticWebAppId string = staticWebApp.id
