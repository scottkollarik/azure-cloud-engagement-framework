#!/usr/bin/env bash
# Run this AFTER the CNAME record is live in DNS.
# CNAME: cloudframework.technologoo.io → white-bush-0d9a0160f.7.azurestaticapps.net
set -euo pipefail

az staticwebapp hostname set \
  --name swa-cloudframework-prod \
  --resource-group rg-cloudframework \
  --hostname cloudframework.technologoo.io
