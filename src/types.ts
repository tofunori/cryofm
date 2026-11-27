export interface ModelMetric {
  iou: number;
  prec: number;
  rec: number;
  gl_kpx: number;
  deb_iou?: number;
}

export interface ExportedItem {
  id: string;
  kind: 'test_tile' | 'independent_scene';
  label: string;
  region: string;
  subregion: string;
  bounds: [number, number, number, number]; // [xmin, ymin, xmax, ymax] WGS84
  shape: [number, number]; // [H, W] native 10m
  has_insar: boolean;
  metrics: {
    v9_p4?: ModelMetric;
    v8_p4?: ModelMetric;
    v31_p4?: ModelMetric;
    v3_p4?: ModelMetric;
    v3_p2?: ModelMetric;
    v2?: ModelMetric;
    glavitu?: ModelMetric;
  };
  files?: string[];
}

export interface ManifestData {
  items: Record<string, ExportedItem>;
}

// Tuple format from tiles_556.json:
// [id, reg, subreg, lon, lat, iou_v3, iou_v2, prec, rec, deb_iou, gl_kpx, has_insar]
export type RawTileTuple = [
  string,
  string,
  string,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
];

export interface Tile556 {
  id: string;
  region: string;
  subregion: string;
  lon: number;
  lat: number;
  iou_v3: number;
  iou_v2: number;
  prec: number;
  rec: number;
  deb_iou: number;
  gl_kpx: number;
  has_insar: boolean;
}

export interface Tiles556Payload {
  has_tta4: boolean;
  v3_summary: Record<string, unknown>;
  v2_summary: Record<string, unknown>;
  tiles: RawTileTuple[];
}

export interface RegionBenchmark {
  code: string;
  name: string;
  v9_p4: number;
  v8_p4: number;
  v3_p4: number;
  v2: number;
  glavitu: number;
  glavitu_sar?: number;
  center: [number, number];
  zoom: number;
}

export type BaseLayerKey = 'rgb' | 'swir' | 'dem' | 'sat';

export type OverlayLayerKey =
  | 'none'
  | 'v9_p4'
  | 'v8_p4'
  | 'v31_p4'
  | 'v3_p4'
  | 'v3_p2'
  | 'glavitu'
  | 'v2'
  | 'truth'
  | 'v9_p4_err'
  | 'v8_p4_err'
  | 'v31_p4_err'
  | 'v3_p4_err'
  | 'v3_p2_err'
  | 'glavitu_err'
  | 'diff_v9_p4_glav'
  | 'diff_v8_p4_glav'
  | 'diff_v31_p4_glav'
  | 'diff_v3_p4_glav'
  | 'diff_v3_p2_glav'
  | 'flexivit_uncert';

export type GlobeMetricKey = 'v3_vs_glav' | 'v3_vs_v2' | 'iou_v3' | 'deb_v3' | 'insar';
