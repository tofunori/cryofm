#!/usr/bin/env bash
# Pousse directement /scratch/tofunori/maslov_olmo/map_export/ -> Cloudflare R2 (r2:cryofm)
# depuis le nœud de connexion Narval, en excluant les .npy et en mettant à jour manifest.json.
set -euo pipefail

ssh -o BatchMode=yes narval '
set -euo pipefail
python3 - << "PY"
import json, os, glob

root = "/scratch/tofunori/maslov_olmo/map_export"
man_p = os.path.join(root, "manifest.json")
man_g = os.path.join(root, "manifest_glavitu.json")

man = json.load(open(man_p)) if os.path.exists(man_p) else {"items": {}}
if os.path.exists(man_g):
    mg = json.load(open(man_g))
    for k, v in mg.get("items", {}).items():
        if k in man["items"]:
            man["items"][k].setdefault("metrics", {}).update(v.get("metrics", {}))
        else:
            man["items"][k] = v

# Indexer les fichiers PNG/JPG réellement présents pour éviter les probes HEAD côté navigateur
for k, item in man["items"].items():
    d = os.path.join(root, "items", k)
    if os.path.isdir(d):
        item["files"] = sorted(
            fn for fn in os.listdir(d)
            if fn.endswith((".png", ".jpg"))
        )

json.dump(man, open(man_p, "w"), indent=1)
n_items = len(man["items"])
print(f"manifest.json prêt : {n_items} items")
PY

rclone copy /scratch/tofunori/maslov_olmo/map_export/items/ r2:cryofm/items/ \
  --exclude "*.npy" \
  --transfers 16 \
  --header-upload "Cache-Control: public, max-age=86400" \
  --stats-one-line -v

rclone copyto /scratch/tofunori/maslov_olmo/map_export/manifest.json r2:cryofm/manifest.json \
  --header-upload "Cache-Control: public, max-age=60" \
  --header-upload "Content-Type: application/json"

echo "R2 SYNC OK -> https://cryofm-data.thierrystpierre.com/manifest.json"
'
