#!/usr/bin/env bash
# Fusionne tous les shards exportés (jusqu'à 560 sites) via finaliser_cryofm_560.py
# et synchronise directement /scratch/tofunori/maslov_olmo/map_export/ -> Cloudflare R2 (r2:cryofm).
set -euo pipefail

ssh -o BatchMode=yes narval '
set -euo pipefail
source /scratch/tofunori/olmoearth_ft/env.sh >/dev/null 2>&1
python -u /scratch/tofunori/maslov_olmo/code_v3/finaliser_cryofm_560.py

rclone copy /scratch/tofunori/maslov_olmo/map_export/items/ r2:cryofm/items/ \
  --exclude "*.npy" \
  --transfers 24 \
  --checkers 24 \
  --header-upload "Cache-Control: public, max-age=86400" \
  --stats-one-line

rclone copyto /scratch/tofunori/maslov_olmo/map_export/manifest.json r2:cryofm/manifest.json \
  --header-upload "Cache-Control: public, max-age=30" \
  --header-upload "Content-Type: application/json"

echo "R2 SYNC OK -> https://cryofm-data.thierrystpierre.com/manifest.json"
'
