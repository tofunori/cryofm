import type {
  ExportedItem,
  ManifestData,
  OverlayLayerKey,
  RegionBenchmark,
  Tile556,
  Tiles556Payload,
} from './types';

// Exact 11-region benchmarks: OlmoEarth v3 (p=4 TTA4), OlmoEarth v2, and Maslov et al. (2025) GlaViTU Global Opt+DEM
export const REGION_BENCHMARKS: RegionBenchmark[] = [
  { code: 'SC', name: 'Scandinavie', v3_p4: 0.9328, v2: 0.9167, glavitu: 0.908, center: [13.5, 65.0], zoom: 4.3 },
  { code: 'ALP', name: 'Alpes', v3_p4: 0.8630, v2: 0.8315, glavitu: 0.844, center: [9.0, 46.5], zoom: 5.8 },
  { code: 'NZ', name: 'Nouvelle-Zélande', v3_p4: 0.8628, v2: 0.8226, glavitu: 0.860, center: [170.2, -43.6], zoom: 6.0 },
  { code: 'CAU', name: 'Caucase', v3_p4: 0.8619, v2: 0.8337, glavitu: 0.862, center: [43.2, 43.1], zoom: 6.2 },
  { code: 'SVAL', name: 'Svalbard', v3_p4: 0.9326, v2: 0.9225, glavitu: 0.936, center: [18.0, 78.5], zoom: 4.5 },
  { code: 'SA', name: 'Andes Sud', v3_p4: 0.9473, v2: 0.9430, glavitu: 0.952, center: [-73.2, -49.5], zoom: 4.2 },
  { code: 'GR', name: 'Groenland', v3_p4: 0.9312, v2: 0.9234, glavitu: 0.937, center: [-44.0, 68.0], zoom: 3.3 },
  { code: 'AN', name: 'Antarctique', v3_p4: 0.9401, v2: 0.9375, glavitu: 0.949, center: [-62.0, -64.5], zoom: 3.8 },
  { code: 'AWA', name: 'Alaska & Ouest Am.', v3_p4: 0.9009, v2: 0.8854, glavitu: 0.912, center: [-138.0, 58.5], zoom: 3.6 },
  { code: 'HMA', name: 'Haute-Asie (débris)', v3_p4: 0.7566, v2: 0.6869, glavitu: 0.774, center: [82.0, 34.5], zoom: 3.8 },
  { code: 'LL', name: 'Basses latitudes', v3_p4: 0.8845, v2: 0.8706, glavitu: 0.903, center: [-77.0, -10.5], zoom: 4.2 },
];

export const REGION_MAP: Record<string, RegionBenchmark> = Object.fromEntries(
  REGION_BENCHMARKS.map((r) => [r.code, r]),
);

// Published Table 1 scores for GlaViTU Global Opt+DEM (Maslov et al. 2025) for reference alongside live measured scores
export const TABLE1_PUBLISHED_NOTES: Record<string, string> = {
  swiss_alps: 'Landsat-5 TM · 1998 · Généralisation temporelle & capteur',
  southern_canada: 'Landsat-5 TM · 2005 · Montagnes Côtières C.-B.',
  alaska: 'Landsat-5 TM · 2009 · Grands glaciers couverts de débris',
  sc1: 'Sentinel-2 · 2019 · Sud-Ouest Norvège (Jostedalsbreen)',
};

export interface OverlayMeta {
  key: OverlayLayerKey;
  label: string;
  shortLabel: string;
  file?: string;
  legend: Array<{ color: string; text: string }>;
}

export const OVERLAY_CATALOG: OverlayMeta[] = [
  {
    key: 'v31_p4',
    label: 'OlmoEarth v3.1 (p=4, τ*=0.54 · 0.8964)',
    shortLabel: 'OlmoEarth v3.1',
    file: 'v31_p4.png',
    legend: [
      { color: '#06b6d4', text: 'Glace propre (v3.1)' },
      { color: '#f97316', text: 'Glace sombre / débris (v3.1)' },
      { color: '#e0f2fe', text: 'Contour prédit (τ*=0.54)' },
    ],
  },
  {
    key: 'v3_p4',
    label: 'OlmoEarth v3 (p=4, 3 classes · 0.8921)',
    shortLabel: 'OlmoEarth v3 (p=4)',
    file: 'v3_p4.png',
    legend: [
      { color: '#06b6d4', text: 'Glace propre (v3)' },
      { color: '#f97316', text: 'Glace couverte de débris (v3)' },
      { color: '#e0f2fe', text: 'Contour prédit' },
    ],
  },
  {
    key: 'v3_p2',
    label: 'OlmoEarth v3 (p=2 · 20 m tokens)',
    shortLabel: 'OlmoEarth v3 (p=2)',
    file: 'v3_p2.png',
    legend: [
      { color: '#06b6d4', text: 'Glace propre (v3 p=2)' },
      { color: '#f97316', text: 'Glace débris (v3 p=2)' },
      { color: '#e0f2fe', text: 'Contour prédit' },
    ],
  },
  {
    key: 'glavitu',
    label: 'GlaViTU Global (poids officiels)',
    shortLabel: 'GlaViTU Global',
    file: 'glavitu.png',
    legend: [
      { color: '#a855f7', text: 'Glacier prédit (GlaViTU Global)' },
      { color: '#f5d0fe', text: 'Contour GlaViTU' },
    ],
  },
  {
    key: 'v2',
    label: 'OlmoEarth v2 (p=4, binaire)',
    shortLabel: 'OlmoEarth v2',
    file: 'v2.png',
    legend: [
      { color: '#3b82f6', text: 'Glacier prédit (v2)' },
      { color: '#ffffff', text: 'Contour v2' },
    ],
  },
  {
    key: 'truth',
    label: 'Vérité terrain (Maslov / RGI)',
    shortLabel: 'Vérité terrain',
    file: 'truth.png',
    legend: [
      { color: '#06b6d4', text: 'Vérité : glace propre' },
      { color: '#f97316', text: 'Vérité : glace débris' },
      { color: '#ffffff', text: 'Contour de référence' },
    ],
  },
  {
    key: 'diff_v31_p4_glav',
    label: 'Désaccord v3.1 vs GlaViTU',
    shortLabel: 'Désaccord v3.1 vs GlaViTU',
    file: 'diff_v31_p4_glav.png',
    legend: [
      { color: '#10b981', text: 'Seul OlmoEarth v3.1 a raison' },
      { color: '#a855f7', text: 'Seul GlaViTU Global a raison' },
      { color: '#f43f5e', text: 'Erreur commune aux 2 modèles' },
    ],
  },
  {
    key: 'diff_v3_p4_glav',
    label: 'Désaccord v3 (p=4) vs GlaViTU',
    shortLabel: 'Désaccord v3 vs GlaViTU',
    file: 'diff_v3_p4_glav.png',
    legend: [
      { color: '#10b981', text: 'Seul OlmoEarth v3 a raison' },
      { color: '#a855f7', text: 'Seul GlaViTU Global a raison' },
      { color: '#f43f5e', text: 'Erreur commune aux 2 modèles' },
    ],
  },
  {
    key: 'diff_v3_p2_glav',
    label: 'Désaccord v3 (p=2) vs GlaViTU',
    shortLabel: 'Désaccord p=2 vs GlaViTU',
    file: 'diff_v3_p2_glav.png',
    legend: [
      { color: '#10b981', text: 'Seul OlmoEarth v3 (p=2) a raison' },
      { color: '#a855f7', text: 'Seul GlaViTU Global a raison' },
      { color: '#f43f5e', text: 'Erreur commune' },
    ],
  },
  {
    key: 'v31_p4_err',
    label: 'Erreurs OlmoEarth v3.1 (TP/FP/FN)',
    shortLabel: 'Erreurs v3.1',
    file: 'v31_p4_err.png',
    legend: [
      { color: '#10b981', text: 'Vrai positif (TP)' },
      { color: '#f43f5e', text: 'Faux positif (FP · sur-détection)' },
      { color: '#facc15', text: 'Faux négatif (FN · oublié)' },
    ],
  },
  {
    key: 'v3_p4_err',
    label: 'Erreurs OlmoEarth v3 (TP/FP/FN)',
    shortLabel: 'Erreurs v3 (p=4)',
    file: 'v3_p4_err.png',
    legend: [
      { color: '#10b981', text: 'Vrai positif (TP)' },
      { color: '#f43f5e', text: 'Faux positif (FP · sur-détection)' },
      { color: '#facc15', text: 'Faux négatif (FN · oublié)' },
    ],
  },
  {
    key: 'v3_p2_err',
    label: 'Erreurs OlmoEarth v3 p=2 (TP/FP/FN)',
    shortLabel: 'Erreurs v3 (p=2)',
    file: 'v3_p2_err.png',
    legend: [
      { color: '#10b981', text: 'Vrai positif (TP)' },
      { color: '#f43f5e', text: 'Faux positif (FP)' },
      { color: '#facc15', text: 'Faux négatif (FN)' },
    ],
  },
  {
    key: 'glavitu_err',
    label: 'Erreurs GlaViTU Global (TP/FP/FN)',
    shortLabel: 'Erreurs GlaViTU',
    file: 'glavitu_err.png',
    legend: [
      { color: '#10b981', text: 'Vrai positif (TP)' },
      { color: '#f43f5e', text: 'Faux positif (FP)' },
      { color: '#facc15', text: 'Faux négatif (FN)' },
    ],
  },
  {
    key: 'flexivit_uncert',
    label: 'Incertitude multi-échelles FlexiViT (|p=2−p=4|)',
    shortLabel: 'Incertitude FlexiViT',
    file: 'flexivit_uncert.png',
    legend: [
      { color: '#f59e0b', text: 'Désaccord modéré entre échelles' },
      { color: '#ef4444', text: 'Forte divergence p=2 vs p=4' },
    ],
  },
  {
    key: 'none',
    label: 'Aucun masque (image seule)',
    shortLabel: 'Image seule',
    legend: [],
  },
];

export const OVERLAY_BY_KEY: Record<OverlayLayerKey, OverlayMeta> = Object.fromEntries(
  OVERLAY_CATALOG.map((o) => [o.key, o]),
) as Record<OverlayLayerKey, OverlayMeta>;

export const DATA_BASE_URL: string = (
  (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_DATA_BASE_URL ||
  'https://cryofm-data.thierrystpierre.com'
).replace(/\/$/, '');

export async function loadTiles556(): Promise<Tile556[]> {
  const res = await fetch('./data/tiles_556.json');
  if (!res.ok) throw new Error(`tiles_556.json HTTP ${res.status}`);
  const raw = (await res.json()) as Tiles556Payload;
  return raw.tiles.map((t) => ({
    id: t[0],
    region: t[1],
    subregion: t[2],
    lon: t[3],
    lat: t[4],
    iou_v3: t[5],
    iou_v2: t[6],
    prec: t[7],
    rec: t[8],
    deb_iou: t[9],
    gl_kpx: t[10],
    has_insar: Boolean(t[11]),
  }));
}

export async function loadManifest(): Promise<ExportedItem[]> {
  try {
    const res = await fetch(`${DATA_BASE_URL}/manifest.json`, { cache: 'no-store' });
    if (!res.ok) return [];
    const data = (await res.json()) as ManifestData;
    const list = Object.values(data.items || {});
    // Independent scenes first, then HMA debris, then ALP, then others alphabetically
    const orderReg = ['HMA', 'ALP', 'NZ', 'CAU', 'SC', 'SVAL', 'LL', 'SA', 'AWA', 'GR', 'AN'];
    list.sort((a, b) => {
      if (a.kind !== b.kind) return a.kind === 'independent_scene' ? -1 : 1;
      const ra = orderReg.indexOf(a.region);
      const rb = orderReg.indexOf(b.region);
      if (ra !== rb) return (ra === -1 ? 99 : ra) - (rb === -1 ? 99 : rb);
      return a.id.localeCompare(b.id);
    });
    return list;
  } catch {
    return [];
  }
}

export async function probeAvailableFiles(item: ExportedItem): Promise<Set<string>> {
  if (item.files && item.files.length > 0) {
    return new Set(item.files);
  }
  const candidates = [
    'rgb.jpg',
    'swir.jpg',
    'dem.jpg',
    'truth.png',
    'v31_p4.png',
    'v3_p4.png',
    'v3_p2.png',
    'v2.png',
    'glavitu.png',
    'v31_p4_err.png',
    'v3_p4_err.png',
    'v3_p2_err.png',
    'glavitu_err.png',
    'diff_v31_p4_glav.png',
    'diff_v3_p4_glav.png',
    'diff_v3_p2_glav.png',
    'flexivit_uncert.png',
  ];
  const results = await Promise.all(
    candidates.map(async (f) => {
      try {
        const r = await fetch(`${DATA_BASE_URL}/items/${item.id}/${f}`, { method: 'HEAD' });
        return r.ok ? f : null;
      } catch {
        return null;
      }
    }),
  );
  return new Set(results.filter((x): x is string => x !== null));
}

export function itemImageUrl(itemId: string, filename: string): string {
  const v = filename.endsWith('.jpg') ? '?v=2' : '';
  return `${DATA_BASE_URL}/items/${itemId}/${filename}${v}`;
}

export function boundsToMapLibreCoords(
  b: [number, number, number, number],
): [[number, number], [number, number], [number, number], [number, number]] {
  const [xmin, ymin, xmax, ymax] = b;
  return [
    [xmin, ymax], // top-left
    [xmax, ymax], // top-right
    [xmax, ymin], // bottom-right
    [xmin, ymin], // bottom-left
  ];
}
