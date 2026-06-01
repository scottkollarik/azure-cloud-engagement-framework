# Azure Cloud Engagement Framework

[![Deploy to Azure Static Web Apps](https://github.com/scottkollarik/azure-cloud-engagement-framework/actions/workflows/deploy.yml/badge.svg)](https://github.com/scottkollarik/azure-cloud-engagement-framework/actions/workflows/deploy.yml)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white&labelColor=20232a)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-7-646CFF?logo=vite&logoColor=white&labelColor=1a1a2e)](https://vite.dev)
[![TailwindCSS](https://img.shields.io/badge/Tailwind-3-06B6D4?logo=tailwindcss&logoColor=white&labelColor=0f172a)](https://tailwindcss.com)
[![Azure Static Web Apps](https://img.shields.io/badge/Hosted_on-Azure_Static_Web_Apps-0078D4?logo=microsoftazure&logoColor=white)](https://cloudframework.technologoo.io)

A structured methodology for Azure architects — reference tool for live client engagements. Answers one question: *what is the architecturally correct way to engage with Azure for this workload, at this scale, under this regulatory posture?*

**Live:** [cloudframework.technologoo.io](https://cloudframework.technologoo.io)

---

## What's inside

| Section | Description |
|---|---|
| **7-Step Framework** | Sequential engagement methodology from constraint extraction to operational model |
| **Engagement Tiers** | Land · Scale · Govern — maturity posture and scope guidance |
| **Patterns Library** | Reusable architecture patterns indexed by WAF pillar, tier, and compliance overlay |
| **Reference Architectures** | Complete workload blueprints — hub-spoke, AKS microservices, regulated workloads, and more |
| **AI Workloads** | RAG, AI Gateway, and inference patterns — how AI changes every framework step |
| **IaC Reference** | Bicep vs Terraform decision matrix, module structure, pipeline patterns, and testing |
| **Troubleshooting** | Common failure modes for Azure and AI workloads — causes and mitigations |
| **Cost Calculator** | Itemized Azure spend estimator from architectural decisions |
| **ADR Generator** | Structured Architectural Decision Record capture |
| **Timeline** | Gantt-style engagement timeline by tier and compliance overlay |

Compliance overlays: FedRAMP · HIPAA · PCI DSS · NIST 800-53 · SOC 2 · CMMC · GDPR · ISO 27001 · ITAR

---

## Stack

- **React 18** + **Vite** — SPA, no backend
- **TailwindCSS v3** — dark theme design system with WAF pillar semantic colors
- **React Router v6** — client-side routing
- **Azure Static Web Apps** — hosting, SSL, custom domain
- File-based project persistence (`.acef.json`) — engagement state survives browser cache clears

---

## Run locally

```bash
npm install
npm run dev
```

Opens at `http://localhost:5173`.

## Build

```bash
npm run build   # outputs to dist/
```

---

## Deployment

Deployed automatically to Azure Static Web Apps on every push to `main` via GitHub Actions.

Infrastructure is in [`infra/main.bicep`](infra/main.bicep). To provision from scratch:

```bash
az group create -n rg-cloudframework -l eastus2
az deployment group create -g rg-cloudframework --template-file infra/main.bicep
```

The GitHub Actions secret `AZURE_STATIC_WEB_APPS_API_TOKEN` must be set to the Static Web App deployment token.

---

## WAF Pillar color system

The app uses a consistent semantic color mapping across all pages:

| Pillar | Color |
|---|---|
| Reliability | Blue |
| Security | Red/rose |
| Cost Optimization | Amber |
| Operational Excellence | Purple |
| Performance Efficiency | Teal |

---

## License

MIT
