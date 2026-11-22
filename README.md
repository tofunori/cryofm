# CryoFM — Atlas 10 m OlmoEarth v1.3 vs GlaViTU Global

Application cartographique interactive (Vite + TypeScript + MapLibre GL 3D Globe) hébergée sur **GitHub Pages** avec rasters 10 m servis depuis **Cloudflare R2** (`https://cryofm-data.thierrystpierre.com`).

- **Site en ligne** : https://tofunori.github.io/cryofm/
- **Données 10 m (R2 CDN)** : https://cryofm-data.thierrystpierre.com/manifest.json

## Contenu

- **556 tuiles de test globales** (Maslov et al., *Nature Communications* 2025) sur globe 3D, colorées par `Δ v3 − GlaViTU`, `v3 − v2`, `IoU v3`, `IoU Débris` ou `InSAR`.
- **29 sites géoréférencés à 10 m** (25 tuiles réparties sur les 11 régions glaciaires + 4 scènes indépendantes de la Table 1 : *Alpes suisses 1998*, *Sud Canada 2005*, *Alaska 2009*, *Norvège SC1 2019*) avec **rideau swipe pixel-à-pixel synchronisé** :
  - **OlmoEarth v1.3 (`p=4` et `p=2`)** : glace propre (cyan) + glace couverte de débris (orange)
  - **GlaViTU Global** : inféré avec les poids officiels `glavitu_global_weights.h5`
  - **OlmoEarth v2**, **Vérité terrain**, **Erreurs TP/FP/FN**, **Désaccord v3 vs GlaViTU** et **Incertitude FlexiViT (`|p=2 − p=4|`)**

## Développement & publication des données R2

```bash
# Développement local (lit directement les rasters depuis R2)
npm install
npm run dev

# Mettre à jour les rasters 10 m sur Cloudflare R2 depuis Narval (sans rebuild GitHub Pages)
./publish_r2_from_narval.sh
```

## Raccourcis clavier

- `1` à `5` : préréglages rapides (`v3 ↔ GlaViTU`, `v3 ↔ Vérité`, `Désaccord`, `Erreurs v3`, `v3 ↔ v2`)
- `Espace` : activer / désactiver le rideau swipe
- `←` / `→` : site 10 m précédent / suivant
- `Esc` : retour à la vue Globe 3D
