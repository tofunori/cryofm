import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import './style.css';
import {
  OVERLAY_BY_KEY,
  OVERLAY_CATALOG,
  REGION_BENCHMARKS,
  REGION_MAP,
  TABLE1_PUBLISHED_NOTES,
  boundsToMapLibreCoords,
  itemImageUrl,
  loadManifest,
  loadTiles556,
  probeAvailableFiles,
} from './data';
import type {
  BaseLayerKey,
  ExportedItem,
  GlobeMetricKey,
  OverlayLayerKey,
  Tile556,
} from './types';

interface AppState {
  tiles556: Tile556[];
  items: ExportedItem[];
  itemsById: Map<string, ExportedItem>;
  activeItem: ExportedItem | null;
  activeFiles: Set<string>;
  regionFilter: string;
  searchQuery: string;
  globeMetric: GlobeMetricKey;
  baseLayer: BaseLayerKey;
  leftOverlay: OverlayLayerKey;
  rightOverlay: OverlayLayerKey;
  opacity: number;
  swipeEnabled: boolean;
  swipePct: number;
  truthTop: boolean;
}

const state: AppState = {
  tiles556: [],
  items: [],
  itemsById: new Map(),
  activeItem: null,
  activeFiles: new Set(),
  regionFilter: 'ALL',
  searchQuery: '',
  globeMetric: 'v3_vs_glav',
  baseLayer: 'rgb',
  leftOverlay: 'v3_p4',
  rightOverlay: 'glavitu',
  opacity: 0.78,
  swipeEnabled: true,
  swipePct: 50,
  truthTop: false,
};

function buildBaseStyle(): maplibregl.StyleSpecification {
  return {
    version: 8,
    projection: { type: 'globe' },
    sources: {
      esri_sat: {
        type: 'raster',
        tiles: [
          'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        ],
        tileSize: 256,
        maxzoom: 18,
        attribution: 'Esri World Imagery · Maslov et al. (2025) · OlmoEarth v1.3',
      },
      esri_labels: {
        type: 'raster',
        tiles: [
          'https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
        ],
        tileSize: 256,
        maxzoom: 18,
      },
    },
    layers: [
      {
        id: 'esri-sat-layer',
        type: 'raster',
        source: 'esri_sat',
        paint: {
          'raster-brightness-max': 0.88,
          'raster-saturation': -0.1,
        },
      },
      {
        id: 'carto-labels-layer',
        type: 'raster',
        source: 'esri_labels',
        paint: {
          'raster-opacity': 0.65,
        },
      },
    ],
  };
}

// ── DOM references ───────────────────────────────────────────────────
const elMapRight = document.getElementById('map-right') as HTMLDivElement;
const elSwipeDivider = document.getElementById('swipe-divider') as HTMLDivElement;
const elSwipeHandle = elSwipeDivider.querySelector('.swipe-handle') as HTMLDivElement;
const elSwipeLabelL = document.getElementById('swipe-label-left') as HTMLDivElement;
const elSwipeLabelR = document.getElementById('swipe-label-right') as HTMLDivElement;

const elLeftDrawer = document.getElementById('left-drawer') as HTMLElement;
const elRightDrawer = document.getElementById('right-drawer') as HTMLElement;
const elSiteList = document.getElementById('site-list') as HTMLDivElement;
const elSiteSearch = document.getElementById('site-search') as HTMLInputElement;
const elRegionPills = document.getElementById('region-pills') as HTMLDivElement;
const elGlobeMetric = document.getElementById('globe-metric') as HTMLSelectElement;
const elCountSites = document.getElementById('count-sites') as HTMLSpanElement;
const elRegionsTable = document.getElementById('regions-table') as HTMLDivElement;
const elIndepTable = document.getElementById('indep-table') as HTMLDivElement;

const elInspBadges = document.getElementById('insp-badges') as HTMLDivElement;
const elInspTitle = document.getElementById('insp-title') as HTMLHeadingElement;
const elInspSub = document.getElementById('insp-sub') as HTMLParagraphElement;
const elInspMetrics = document.getElementById('insp-metrics') as HTMLDivElement;
const elRasterControls = document.getElementById('raster-controls') as HTMLDivElement;
const elNoExportNote = document.getElementById('no-export-note') as HTMLDivElement;

const elSelLeft = document.getElementById('sel-left') as HTMLSelectElement;
const elSelRight = document.getElementById('sel-right') as HTMLSelectElement;
const elOpacitySlider = document.getElementById('opacity-slider') as HTMLInputElement;
const elOpacityVal = document.getElementById('opacity-val') as HTMLSpanElement;
const elChkSwipe = document.getElementById('chk-swipe') as HTMLInputElement;
const elChkTruthTop = document.getElementById('chk-truth-top') as HTMLInputElement;
const elActiveLegend = document.getElementById('active-legend') as HTMLDivElement;
const elBtnPresetP2 = document.getElementById('btn-preset-p2') as HTMLButtonElement;

const elHudCoords = document.getElementById('hud-coords') as HTMLSpanElement;
const elHudZoom = document.getElementById('hud-zoom') as HTMLSpanElement;
const elHudStatus = document.getElementById('hud-status') as HTMLSpanElement;
const elBtnGlobe = document.getElementById('btn-globe') as HTMLButtonElement;
const elBtnToggleLeft = document.getElementById('btn-toggle-left') as HTMLButtonElement;

// ── Initialize synchronized dual MapLibre GL 3D maps ─────────────────
const mapLeft = new maplibregl.Map({
  container: 'map-left',
  style: buildBaseStyle(),
  center: [28, 34],
  zoom: 2.1,
  maxZoom: 17.5,
  pitch: 0,
  attributionControl: false,
});
mapLeft.addControl(new maplibregl.NavigationControl({ showCompass: true }), 'bottom-right');
mapLeft.addControl(new maplibregl.ScaleControl({ maxWidth: 120, unit: 'metric' }), 'bottom-right');

const mapRight = new maplibregl.Map({
  container: 'map-right',
  style: buildBaseStyle(),
  center: [28, 34],
  zoom: 2.1,
  maxZoom: 17.5,
  pitch: 0,
  interactive: false,
  attributionControl: false,
});

function syncRightMap() {
  mapRight.jumpTo({
    center: mapLeft.getCenter(),
    zoom: mapLeft.getZoom(),
    bearing: mapLeft.getBearing(),
    pitch: mapLeft.getPitch(),
  });
}

mapLeft.on('move', () => {
  syncRightMap();
  const c = mapLeft.getCenter();
  const latStr = `${Math.abs(c.lat).toFixed(4)}° ${c.lat >= 0 ? 'N' : 'S'}`;
  const lonStr = `${Math.abs(c.lng).toFixed(4)}° ${c.lng >= 0 ? 'E' : 'W'}`;
  elHudCoords.textContent = `${latStr}, ${lonStr}`;
  elHudZoom.textContent = `z ${mapLeft.getZoom().toFixed(2)}`;
});

mapLeft.on('mousemove', (e) => {
  const { lat, lng } = e.lngLat;
  elHudCoords.textContent = `${Math.abs(lat).toFixed(4)}° ${lat >= 0 ? 'N' : 'S'}, ${Math.abs(lng).toFixed(4)}° ${lng >= 0 ? 'E' : 'W'}`;
});

// ── Swipe curtain interaction ────────────────────────────────────────
function applySwipeClip() {
  const showSwipe = Boolean(state.activeItem) && state.swipeEnabled;
  elSwipeDivider.classList.toggle('hidden', !showSwipe);
  elMapRight.classList.toggle('hidden', !showSwipe);
  if (showSwipe) {
    const pct = Math.max(2, Math.min(98, state.swipePct));
    elSwipeDivider.style.left = `${pct}%`;
    elMapRight.style.clipPath = `inset(0 0 0 ${pct}%)`;
    elSwipeLabelL.textContent = OVERLAY_BY_KEY[state.leftOverlay]?.shortLabel ?? state.leftOverlay;
    elSwipeLabelR.textContent = OVERLAY_BY_KEY[state.rightOverlay]?.shortLabel ?? state.rightOverlay;
  }
}

let draggingSwipe = false;
elSwipeHandle.addEventListener('pointerdown', (ev) => {
  draggingSwipe = true;
  elSwipeHandle.classList.add('dragging');
  elSwipeHandle.setPointerCapture(ev.pointerId);
});

window.addEventListener('pointermove', (ev) => {
  if (!draggingSwipe) return;
  const rect = document.getElementById('map-stage')!.getBoundingClientRect();
  state.swipePct = ((ev.clientX - rect.left) / rect.width) * 100;
  applySwipeClip();
});

window.addEventListener('pointerup', () => {
  if (!draggingSwipe) return;
  draggingSwipe = false;
  elSwipeHandle.classList.remove('dragging');
});

// ── Globe GeoJSON sources & styling ──────────────────────────────────
function buildTiles556GeoJSON(): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: state.tiles556.map((t) => {
      const bench = REGION_MAP[t.region];
      const dGlav = bench ? t.iou_v3 - bench.glavitu : 0;
      const dV2 = t.iou_v3 - t.iou_v2;
      return {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [t.lon, t.lat] },
        properties: {
          id: t.id,
          region: t.region,
          subregion: t.subregion,
          iou_v3: t.iou_v3,
          iou_v2: t.iou_v2,
          prec: t.prec,
          rec: t.rec,
          deb_iou: t.deb_iou,
          gl_kpx: t.gl_kpx,
          has_insar: t.has_insar ? 1 : 0,
          d_glav: Number(dGlav.toFixed(4)),
          d_v2: Number(dV2.toFixed(4)),
          exported: state.itemsById.has(t.id) ? 1 : 0,
        },
      };
    }),
  };
}

function buildExportedBoxesGeoJSON(): {
  polys: GeoJSON.FeatureCollection;
  pins: GeoJSON.FeatureCollection;
} {
  const polys: GeoJSON.Feature[] = [];
  const pins: GeoJSON.Feature[] = [];
  for (const item of state.items) {
    const [xmin, ymin, xmax, ymax] = item.bounds;
    polys.push({
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [xmin, ymin],
            [xmax, ymin],
            [xmax, ymax],
            [xmin, ymax],
            [xmin, ymin],
          ],
        ],
      },
      properties: {
        id: item.id,
        label: item.label,
        kind: item.kind,
        region: item.region,
      },
    });
    pins.push({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [(xmin + xmax) / 2, (ymin + ymax) / 2],
      },
      properties: {
        id: item.id,
        label: item.label,
        kind: item.kind,
        region: item.region,
      },
    });
  }
  return {
    polys: { type: 'FeatureCollection', features: polys },
    pins: { type: 'FeatureCollection', features: pins },
  };
}

function circleColorExpr(metric: GlobeMetricKey): maplibregl.ExpressionSpecification {
  switch (metric) {
    case 'v3_vs_glav':
      return [
        'interpolate',
        ['linear'],
        ['get', 'd_glav'],
        -0.12, '#f43f5e',
        -0.02, '#fb923c',
        0.0, '#e5e7eb',
        0.03, '#22d3ee',
        0.10, '#10b981',
      ];
    case 'v3_vs_v2':
      return [
        'interpolate',
        ['linear'],
        ['get', 'd_v2'],
        -0.04, '#f43f5e',
        0.0, '#94a3b8',
        0.03, '#38bdf8',
        0.10, '#10b981',
      ];
    case 'iou_v3':
      return [
        'interpolate',
        ['linear'],
        ['get', 'iou_v3'],
        0.55, '#f43f5e',
        0.75, '#f59e0b',
        0.88, '#06b6d4',
        0.95, '#10b981',
      ];
    case 'deb_v3':
      return [
        'case',
        ['<', ['get', 'deb_iou'], 0],
        '#52525b',
        [
          'interpolate',
          ['linear'],
          ['get', 'deb_iou'],
          0.25, '#f43f5e',
          0.55, '#f97316',
          0.75, '#10b981',
        ],
      ];
    case 'insar':
      return ['case', ['==', ['get', 'has_insar'], 1], '#10b981', '#64748b'];
  }
}

function addGlobeLayers(map: maplibregl.Map, interactive: boolean) {
  const fc556 = buildTiles556GeoJSON();
  const { polys, pins } = buildExportedBoxesGeoJSON();

  map.addSource('tiles-556', { type: 'geojson', data: fc556 });
  map.addSource('exported-polys', { type: 'geojson', data: polys });
  map.addSource('exported-pins', { type: 'geojson', data: pins });

  map.addLayer({
    id: 'exported-polys-fill',
    type: 'fill',
    source: 'exported-polys',
    paint: {
      'fill-color': ['case', ['==', ['get', 'kind'], 'independent_scene'], '#f59e0b', '#06b6d4'],
      'fill-opacity': ['interpolate', ['linear'], ['zoom'], 2, 0.16, 10, 0.04, 12, 0.0],
    },
  });

  map.addLayer({
    id: 'exported-polys-line',
    type: 'line',
    source: 'exported-polys',
    paint: {
      'line-color': ['case', ['==', ['get', 'kind'], 'independent_scene'], '#fbbf24', '#22d3ee'],
      'line-width': ['interpolate', ['linear'], ['zoom'], 2, 1.5, 10, 2.2],
      'line-opacity': 0.9,
    },
  });

  map.addLayer({
    id: 'tiles-556-dots',
    type: 'circle',
    source: 'tiles-556',
    paint: {
      'circle-radius': ['interpolate', ['linear'], ['zoom'], 2, 3.2, 6, 5.5, 10, 6.5, 12, 0],
      'circle-color': circleColorExpr(state.globeMetric),
      'circle-opacity': ['interpolate', ['linear'], ['zoom'], 2, 0.85, 11, 0.55, 12.2, 0],
      'circle-stroke-width': 0.8,
      'circle-stroke-color': '#0b0908',
    },
  });

  map.addLayer({
    id: 'exported-pins-ring',
    type: 'circle',
    source: 'exported-pins',
    paint: {
      'circle-radius': [
        'interpolate',
        ['linear'],
        ['zoom'],
        2,
        ['case', ['==', ['get', 'kind'], 'independent_scene'], 8.5, 6.2],
        9,
        10,
        11.5,
        0,
      ],
      'circle-color': 'rgba(0,0,0,0)',
      'circle-stroke-width': 2.2,
      'circle-stroke-color': [
        'case',
        ['==', ['get', 'kind'], 'independent_scene'],
        '#fbbf24',
        '#22d3ee',
      ],
      'circle-stroke-opacity': ['interpolate', ['linear'], ['zoom'], 2, 0.95, 10.5, 0.6, 11.5, 0],
    },
  });

  if (!interactive) return;

  const popup = new maplibregl.Popup({ closeButton: false, closeOnClick: false, offset: 12 });

  map.on('mouseenter', 'exported-pins-ring', () => {
    map.getCanvas().style.cursor = 'pointer';
  });
  map.on('mouseleave', 'exported-pins-ring', () => {
    map.getCanvas().style.cursor = '';
    popup.remove();
  });
  map.on('mousemove', 'exported-pins-ring', (e) => {
    const f = e.features?.[0];
    if (!f) return;
    const id = String(f.properties?.id ?? '');
    const item = state.itemsById.get(id);
    if (!item) return;
    const m3 = item.metrics.v3_p4;
    const mg = item.metrics.glavitu;
    const gTxt = mg ? `GlaViTU <b>${mg.iou.toFixed(4)}</b>` : 'GlaViTU <i>en attente</i>';
    const v3Txt = m3 ? `v3 <b>${m3.iou.toFixed(4)}</b>` : '';
    popup
      .setLngLat(e.lngLat)
      .setHTML(
        `<div><strong>${item.label}</strong> <span style="color:#22d3ee">★ 10 m</span></div>
         <div class="mono" style="margin-top:3px;font-size:11px">${v3Txt} · ${gTxt}</div>
         <div style="color:#a69c92;font-size:10px;margin-top:2px">Cliquer pour ouvrir le rideau pixel-à-pixel</div>`,
      )
      .addTo(map);
  });

  map.on('click', 'exported-pins-ring', (e) => {
    const id = String(e.features?.[0]?.properties?.id ?? '');
    const item = state.itemsById.get(id);
    if (item) selectExportedItem(item);
  });

  map.on('mouseenter', 'tiles-556-dots', () => {
    map.getCanvas().style.cursor = 'pointer';
  });
  map.on('mouseleave', 'tiles-556-dots', () => {
    map.getCanvas().style.cursor = '';
    popup.remove();
  });
  map.on('mousemove', 'tiles-556-dots', (e) => {
    const f = e.features?.[0];
    if (!f || !f.properties) return;
    const p = f.properties;
    const exp = Number(p.exported) === 1;
    const deb = Number(p.deb_iou) >= 0 ? ` · Débris ${Number(p.deb_iou).toFixed(3)}` : '';
    popup
      .setLngLat(e.lngLat)
      .setHTML(
        `<div><strong>${p.id}</strong> (${p.subregion}) ${exp ? '<span style="color:#22d3ee">★ 10 m</span>' : ''}</div>
         <div class="mono" style="margin-top:3px;font-size:11px">v3 <b>${Number(p.iou_v3).toFixed(4)}</b> · v2 ${Number(p.iou_v2).toFixed(4)}${deb}</div>`,
      )
      .addTo(map);
  });

  map.on('click', 'tiles-556-dots', (e) => {
    const f = e.features?.[0];
    if (!f || !f.properties) return;
    const id = String(f.properties.id);
    const exp = state.itemsById.get(id);
    if (exp) {
      selectExportedItem(exp);
      return;
    }
    const tile = state.tiles556.find((t) => t.id === id);
    if (tile) showNonExportedTile(tile);
  });
}

// ── 10 m Raster overlay mounting on both synchronized maps ───────────
const RASTER_IDS = ['active-truth-top', 'active-overlay', 'active-base'] as const;

function clearActiveRasters(map: maplibregl.Map) {
  for (const id of RASTER_IDS) {
    if (map.getLayer(id)) map.removeLayer(id);
    if (map.getSource(id)) map.removeSource(id);
  }
}

function mountImageLayer(
  map: maplibregl.Map,
  id: string,
  url: string,
  coords: [[number, number], [number, number], [number, number], [number, number]],
  opacity: number,
  nearest: boolean,
) {
  map.addSource(id, {
    type: 'image',
    url,
    coordinates: coords,
  });
  map.addLayer({
    id,
    type: 'raster',
    source: id,
    paint: {
      'raster-opacity': opacity,
      'raster-resampling': nearest ? 'nearest' : 'linear',
      'raster-fade-duration': 0,
    },
  });
}

function renderActiveRasters() {
  clearActiveRasters(mapLeft);
  clearActiveRasters(mapRight);

  const item = state.activeItem;
  if (!item) {
    mapLeft.setPaintProperty('carto-labels-layer', 'raster-opacity', 0.65);
    mapRight.setPaintProperty('carto-labels-layer', 'raster-opacity', 0.65);
    applySwipeClip();
    return;
  }

  const coords = boundsToMapLibreCoords(item.bounds);
  mapLeft.setPaintProperty('carto-labels-layer', 'raster-opacity', 0.18);
  mapRight.setPaintProperty('carto-labels-layer', 'raster-opacity', 0.18);

  // 1. Base 10 m image (RGB / SWIR / DEM) on both maps
  if (state.baseLayer !== 'sat') {
    const baseFile = `${state.baseLayer}.jpg`;
    if (state.activeFiles.has(baseFile)) {
      const url = itemImageUrl(item.id, baseFile);
      mountImageLayer(mapLeft, 'active-base', url, coords, 1.0, false);
      mountImageLayer(mapRight, 'active-base', url, coords, 1.0, false);
    }
  }

  // 2. Left overlay on mapLeft
  const leftMeta = OVERLAY_BY_KEY[state.leftOverlay];
  if (leftMeta?.file && state.activeFiles.has(leftMeta.file)) {
    mountImageLayer(
      mapLeft,
      'active-overlay',
      itemImageUrl(item.id, leftMeta.file),
      coords,
      state.opacity,
      true,
    );
  }

  // 3. Right overlay on mapRight
  const rightMeta = OVERLAY_BY_KEY[state.rightOverlay];
  if (rightMeta?.file && state.activeFiles.has(rightMeta.file)) {
    mountImageLayer(
      mapRight,
      'active-overlay',
      itemImageUrl(item.id, rightMeta.file),
      coords,
      state.opacity,
      true,
    );
  }

  // 4. Optional Truth contour overlay on top of both sides
  if (state.truthTop && state.activeFiles.has('truth.png')) {
    const url = itemImageUrl(item.id, 'truth.png');
    mountImageLayer(mapLeft, 'active-truth-top', url, coords, 0.75, true);
    mountImageLayer(mapRight, 'active-truth-top', url, coords, 0.75, true);
  }

  applySwipeClip();
  renderLegend();
}

function updateRasterOpacity() {
  for (const map of [mapLeft, mapRight]) {
    if (map.getLayer('active-overlay')) {
      map.setPaintProperty('active-overlay', 'raster-opacity', state.opacity);
    }
  }
}

// ── Selection & Inspector UI ─────────────────────────────────────────
function populateOverlaySelects() {
  const makeOpts = (sel: HTMLSelectElement, current: OverlayLayerKey) => {
    sel.innerHTML = '';
    for (const meta of OVERLAY_CATALOG) {
      const available = meta.key === 'none' || (meta.file ? state.activeFiles.has(meta.file) : false);
      const opt = document.createElement('option');
      opt.value = meta.key;
      opt.textContent = available ? meta.label : `${meta.shortLabel} (indisponible)`;
      opt.disabled = !available;
      if (meta.key === current) opt.selected = true;
      sel.appendChild(opt);
    }
  };
  // Fallback if selected overlay is not available for this item
  const fallback = (k: OverlayLayerKey, order: OverlayLayerKey[]): OverlayLayerKey => {
    const m = OVERLAY_BY_KEY[k];
    if (k === 'none' || (m?.file && state.activeFiles.has(m.file))) return k;
    for (const cand of order) {
      const cm = OVERLAY_BY_KEY[cand];
      if (cand === 'none' || (cm?.file && state.activeFiles.has(cm.file))) return cand;
    }
    return 'none';
  };
  state.leftOverlay = fallback(state.leftOverlay, ['v3_p2', 'v3_p4', 'truth', 'none']);
  state.rightOverlay = fallback(state.rightOverlay, ['glavitu', 'truth', 'v2', 'none']);

  makeOpts(elSelLeft, state.leftOverlay);
  makeOpts(elSelRight, state.rightOverlay);

  const hasP2 = state.activeFiles.has('v3_p2.png');
  const hasGlav = state.activeFiles.has('glavitu.png');
  elBtnPresetP2.disabled = !hasP2;
  const glavBtn = document.querySelector('[data-preset="v3_glav"]') as HTMLButtonElement | null;
  if (glavBtn) {
    glavBtn.disabled = !hasGlav;
  }
  const diffBtn = document.querySelector('[data-preset="diff"]') as HTMLButtonElement | null;
  if (diffBtn) {
    diffBtn.disabled = !(state.activeFiles.has('diff_v3_p4_glav.png') || state.activeFiles.has('diff_v3_p2_glav.png'));
  }
}

function renderItemMetrics(item: ExportedItem) {
  const m = item.metrics;
  const boxes: string[] = [];

  if (m.v3_p2) {
    boxes.push(`
      <div class="mbox">
        <div class="mbox-lbl">OlmoEarth v3 (p=2)</div>
        <div class="mbox-val" style="color:var(--emerald)">${m.v3_p2.iou.toFixed(4)}</div>
        <div class="mbox-sub">P ${m.v3_p2.prec.toFixed(3)} · R ${m.v3_p2.rec.toFixed(3)}</div>
      </div>`);
  }
  if (m.v3_p4) {
    const deb = m.v3_p4.deb_iou !== undefined && m.v3_p4.deb_iou >= 0 ? ` · Déb ${m.v3_p4.deb_iou.toFixed(3)}` : '';
    boxes.push(`
      <div class="mbox">
        <div class="mbox-lbl">OlmoEarth v3 (p=4)</div>
        <div class="mbox-val" style="color:var(--cyan)">${m.v3_p4.iou.toFixed(4)}</div>
        <div class="mbox-sub">P ${m.v3_p4.prec.toFixed(3)} · R ${m.v3_p4.rec.toFixed(3)}${deb}</div>
      </div>`);
  }
  if (m.glavitu) {
    const refV3 = m.v3_p2?.iou ?? m.v3_p4?.iou;
    const diff = refV3 !== undefined ? refV3 - m.glavitu.iou : null;
    const diffHtml =
      diff !== null
        ? `<span style="color:${diff >= 0 ? 'var(--emerald)' : 'var(--rose)'}"> (${diff >= 0 ? '+' : ''}${(diff * 100).toFixed(2)} pts)</span>`
        : '';
    boxes.push(`
      <div class="mbox">
        <div class="mbox-lbl">GlaViTU Global (réel)</div>
        <div class="mbox-val" style="color:#c084fc">${m.glavitu.iou.toFixed(4)}</div>
        <div class="mbox-sub">P ${m.glavitu.prec.toFixed(3)} · R ${m.glavitu.rec.toFixed(3)}${diffHtml}</div>
      </div>`);
  } else {
    const bench = REGION_MAP[item.region];
    boxes.push(`
      <div class="mbox">
        <div class="mbox-lbl">GlaViTU Global</div>
        <div class="mbox-val" style="color:var(--dim)">en attente</div>
        <div class="mbox-sub">Réf. région ${item.region}: ${bench ? bench.glavitu.toFixed(3) : '—'}</div>
      </div>`);
  }
  if (m.v2) {
    boxes.push(`
      <div class="mbox">
        <div class="mbox-lbl">OlmoEarth v2 (p=4)</div>
        <div class="mbox-val" style="color:var(--muted)">${m.v2.iou.toFixed(4)}</div>
        <div class="mbox-sub">P ${m.v2.prec.toFixed(3)} · R ${m.v2.rec.toFixed(3)}</div>
      </div>`);
  }
  elInspMetrics.innerHTML = boxes.join('');
}

function renderLegend() {
  const seen = new Set<string>();
  const rows: Array<{ color: string; text: string }> = [];
  for (const key of [state.leftOverlay, state.rightOverlay]) {
    const meta = OVERLAY_BY_KEY[key];
    if (!meta) continue;
    for (const item of meta.legend) {
      const sig = `${item.color}|${item.text}`;
      if (!seen.has(sig)) {
        seen.add(sig);
        rows.push(item);
      }
    }
  }
  if (rows.length === 0) {
    elActiveLegend.innerHTML = `<div class="leg-item" style="color:var(--muted)">Image optique / relief seule (aucun masque actif)</div>`;
    return;
  }
  elActiveLegend.innerHTML = rows
    .map(
      (r) =>
        `<div class="leg-item"><span class="leg-swatch" style="background:${r.color}"></span><span>${r.text}</span></div>`,
    )
    .join('');
}

async function selectExportedItem(item: ExportedItem) {
  state.activeItem = item;
  elRightDrawer.classList.remove('hidden');
  elRasterControls.classList.remove('hidden');
  elNoExportNote.classList.add('hidden');
  elBtnGlobe.classList.remove('active');

  elInspBadges.innerHTML = `
    <span class="tag ${item.kind === 'independent_scene' ? 'tag-indep' : 'tag-reg'}">${item.kind === 'independent_scene' ? 'Indép. Table 1' : item.region}</span>
    ${item.has_insar ? '<span class="tag tag-insar">InSAR</span>' : ''}
    ${item.metrics.v3_p2 ? '<span class="tag tag-p2">p=2 prêt</span>' : ''}
  `;
  elInspTitle.textContent = item.label;
  const note = TABLE1_PUBLISHED_NOTES[item.id];
  const pxDim = `${item.shape[1]} × ${item.shape[0]} px (10 m)`;
  elInspSub.textContent = note ? `${note} · ${pxDim}` : `${item.subregion} · ${pxDim}`;
  renderItemMetrics(item);

  // Highlight active site card
  document.querySelectorAll('.site-card').forEach((el) => {
    el.classList.toggle('active', el.getAttribute('data-id') === item.id);
  });

  // Fit map cleanly to the exact 10 m WGS84 bounds
  const [xmin, ymin, xmax, ymax] = item.bounds;
  mapLeft.fitBounds(
    [
      [xmin, ymin],
      [xmax, ymax],
    ],
    {
      padding: { top: 88, bottom: 64, left: 344, right: 370 },
      duration: 950,
      maxZoom: 13.8,
    },
  );

  elHudStatus.textContent = `Chargement des rasters 10 m (${item.id})…`;
  state.activeFiles = await probeAvailableFiles(item);
  populateOverlaySelects();
  renderActiveRasters();
  elHudStatus.textContent = `${item.id} · ${state.activeFiles.size} couches 10 m prêtes · Zoomez jusqu'au pixel`;
}

function showNonExportedTile(tile: Tile556) {
  state.activeItem = null;
  clearActiveRasters(mapLeft);
  clearActiveRasters(mapRight);
  applySwipeClip();

  elRightDrawer.classList.remove('hidden');
  elRasterControls.classList.add('hidden');
  elNoExportNote.classList.remove('hidden');

  elInspBadges.innerHTML = `
    <span class="tag tag-reg">${tile.region}</span>
    ${tile.has_insar ? '<span class="tag tag-insar">InSAR</span>' : ''}
  `;
  elInspTitle.textContent = tile.id;
  elInspSub.textContent = `${tile.subregion} · ${tile.gl_kpx.toFixed(1)} kpx de glace`;
  const bench = REGION_MAP[tile.region];
  elInspMetrics.innerHTML = `
    <div class="mbox">
      <div class="mbox-lbl">OlmoEarth v3 (TTA4)</div>
      <div class="mbox-val" style="color:var(--cyan)">${tile.iou_v3.toFixed(4)}</div>
      <div class="mbox-sub">P ${tile.prec.toFixed(3)} · R ${tile.rec.toFixed(3)}</div>
    </div>
    <div class="mbox">
      <div class="mbox-lbl">OlmoEarth v2</div>
      <div class="mbox-val" style="color:var(--muted)">${tile.iou_v2.toFixed(4)}</div>
      <div class="mbox-sub">Gain ${(tile.iou_v3 - tile.iou_v2) >= 0 ? '+' : ''}${((tile.iou_v3 - tile.iou_v2) * 100).toFixed(2)} pts</div>
    </div>
    <div class="mbox">
      <div class="mbox-lbl">Débris (v3)</div>
      <div class="mbox-val" style="color:var(--orange)">${tile.deb_iou >= 0 ? tile.deb_iou.toFixed(4) : '—'}</div>
      <div class="mbox-sub">Classe glace sombre</div>
    </div>
    <div class="mbox">
      <div class="mbox-lbl">Réf. GlaViTU (${tile.region})</div>
      <div class="mbox-val" style="color:#c084fc">${bench ? bench.glavitu.toFixed(3) : '—'}</div>
      <div class="mbox-sub">Moyenne régionale publiée</div>
    </div>
  `;
  mapLeft.flyTo({ center: [tile.lon, tile.lat], zoom: 9.5, duration: 800 });
}

function returnToGlobe() {
  state.activeItem = null;
  clearActiveRasters(mapLeft);
  clearActiveRasters(mapRight);
  applySwipeClip();
  elRightDrawer.classList.add('hidden');
  elBtnGlobe.classList.add('active');
  document.querySelectorAll('.site-card').forEach((el) => el.classList.remove('active'));
  mapLeft.flyTo({ center: [24, 32], zoom: 2.1, pitch: 0, bearing: 0, duration: 1000 });
  elHudStatus.textContent = `${state.tiles556.length} tuiles globales · ${state.items.length} sites 10 m inspectables`;
}

// ── Left drawer lists & tables ───────────────────────────────────────
function renderRegionPills() {
  const pills = ['ALL', 'INDEP', 'HMA', 'ALP', 'NZ', 'CAU', 'SC', 'SVAL', 'LL', 'SA', 'AWA', 'GR', 'AN'];
  elRegionPills.innerHTML = pills
    .map(
      (code) =>
        `<button class="rpill ${state.regionFilter === code ? 'active' : ''}" data-reg="${code}">${code === 'ALL' ? 'Tous' : code === 'INDEP' ? 'Indép. (4)' : code}</button>`,
    )
    .join('');
  elRegionPills.querySelectorAll('.rpill').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.regionFilter = btn.getAttribute('data-reg') || 'ALL';
      renderRegionPills();
      renderSiteList();
    });
  });
}

function filteredItems(): ExportedItem[] {
  const q = state.searchQuery.trim().toLowerCase();
  return state.items.filter((it) => {
    if (state.regionFilter === 'INDEP' && it.kind !== 'independent_scene') return false;
    if (state.regionFilter !== 'ALL' && state.regionFilter !== 'INDEP' && it.region !== state.regionFilter)
      return false;
    if (q) {
      const hay = `${it.id} ${it.label} ${it.region} ${it.subregion}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

function renderSiteList() {
  const list = filteredItems();
  elCountSites.textContent = String(state.items.length);
  if (state.items.length === 0) {
    elSiteList.innerHTML = `<div class="pane-note">Aucun export 10 m dans <code>public/data/manifest.json</code> pour l'instant — les 556 tuiles globales restent navigables sur le globe.</div>`;
    return;
  }
  elSiteList.innerHTML = list
    .map((it) => {
      const m3 = it.metrics.v3_p2 ?? it.metrics.v3_p4;
      const mg = it.metrics.glavitu;
      const diff = m3 && mg ? m3.iou - mg.iou : null;
      const diffSpan =
        diff !== null
          ? `<span class="${diff >= 0 ? 'm-pos' : 'm-neg'}">${diff >= 0 ? '+' : ''}${(diff * 100).toFixed(1)}</span>`
          : '';
      return `
        <div class="site-card ${state.activeItem?.id === it.id ? 'active' : ''}" data-id="${it.id}">
          <div class="site-card-top">
            <span class="site-id">${it.label}</span>
            <span class="tag ${it.kind === 'independent_scene' ? 'tag-indep' : 'tag-reg'}">${it.kind === 'independent_scene' ? 'Table 1' : it.region}</span>
          </div>
          <div class="site-card-metrics">
            <span class="m-v3">v3 ${m3 ? m3.iou.toFixed(4) : '—'}</span>
            <span class="m-glav">GlaV ${mg ? mg.iou.toFixed(4) : '…'}</span>
            ${diffSpan}
          </div>
        </div>
      `;
    })
    .join('');

  elSiteList.querySelectorAll('.site-card').forEach((card) => {
    card.addEventListener('click', () => {
      const id = card.getAttribute('data-id')!;
      const item = state.itemsById.get(id);
      if (item) selectExportedItem(item);
    });
  });
}

function renderRegionsTable() {
  const header = `<div class="reg-row hdr"><span>Région</span><span>v3 p=4</span><span>GlaViTU</span><span>Δ</span></div>`;
  const rows = REGION_BENCHMARKS.map((r) => {
    const d = r.v3_p4 - r.glavitu;
    const cls = d >= 0 ? 'm-pos' : 'm-neg';
    return `
      <div class="reg-row" data-reg="${r.code}">
        <span><strong>${r.code}</strong> · ${r.name}</span>
        <span class="mono m-v3">${r.v3_p4.toFixed(4)}</span>
        <span class="mono m-glav">${r.glavitu.toFixed(3)}</span>
        <span class="mono ${cls}">${d >= 0 ? '+' : ''}${(d * 100).toFixed(2)}</span>
      </div>`;
  }).join('');
  elRegionsTable.innerHTML = header + rows;
  elRegionsTable.querySelectorAll('.reg-row[data-reg]').forEach((row) => {
    row.addEventListener('click', () => {
      const code = row.getAttribute('data-reg')!;
      const r = REGION_MAP[code];
      if (r) {
        mapLeft.flyTo({ center: r.center, zoom: r.zoom, duration: 900 });
      }
    });
  });
}

function renderIndepTable() {
  const indeps = state.items.filter((it) => it.kind === 'independent_scene');
  if (indeps.length === 0) {
    elIndepTable.innerHTML = `<div class="pane-note">En attente de l'export des 4 scènes indépendantes depuis Narval…</div>`;
    return;
  }
  elIndepTable.innerHTML = indeps
    .map((it) => {
      const m3 = it.metrics.v3_p4?.iou;
      const mg = it.metrics.glavitu?.iou;
      const m2 = it.metrics.v2?.iou;
      const diff = m3 !== undefined && mg !== undefined ? m3 - mg : null;
      return `
        <div class="indep-card" data-id="${it.id}">
          <h4>${it.label}</h4>
          <div class="note">${TABLE1_PUBLISHED_NOTES[it.id] ?? ''}</div>
          <div class="indep-grid">
            <div class="indep-cell"><span>OlmoEarth v3</span><strong class="m-v3">${m3 !== undefined ? m3.toFixed(4) : '—'}</strong></div>
            <div class="indep-cell"><span>GlaViTU Global</span><strong class="m-glav">${mg !== undefined ? mg.toFixed(4) : '…'}</strong></div>
            <div class="indep-cell"><span>v2 / Δ GlaV</span><strong class="${diff !== null ? (diff >= 0 ? 'm-pos' : 'm-neg') : 'm-v2'}">${diff !== null ? `${diff >= 0 ? '+' : ''}${(diff * 100).toFixed(2)} pts` : m2 !== undefined ? m2.toFixed(4) : '—'}</strong></div>
          </div>
        </div>
      `;
    })
    .join('');

  elIndepTable.querySelectorAll('.indep-card').forEach((card) => {
    card.addEventListener('click', () => {
      const it = state.itemsById.get(card.getAttribute('data-id')!);
      if (it) selectExportedItem(it);
    });
  });
}

// ── Presets & Controls wiring ────────────────────────────────────────
function applyPreset(preset: string) {
  const hasP2 = state.activeFiles.has('v3_p2.png');
  const mainV3: OverlayLayerKey = hasP2 ? 'v3_p2' : 'v3_p4';
  const mainDiff: OverlayLayerKey = state.activeFiles.has('diff_v3_p2_glav.png')
    ? 'diff_v3_p2_glav'
    : 'diff_v3_p4_glav';

  switch (preset) {
    case 'v3_glav':
      if (!state.activeFiles.has('glavitu.png')) return;
      state.leftOverlay = mainV3;
      state.rightOverlay = 'glavitu';
      state.swipeEnabled = true;
      break;
    case 'v3_truth':
      state.leftOverlay = mainV3;
      state.rightOverlay = 'truth';
      state.swipeEnabled = true;
      break;
    case 'diff':
      state.leftOverlay = mainDiff;
      state.rightOverlay = 'none';
      state.swipeEnabled = true;
      break;
    case 'err':
      state.leftOverlay = hasP2 ? 'v3_p2_err' : 'v3_p4_err';
      state.rightOverlay = state.activeFiles.has('glavitu_err.png') ? 'glavitu_err' : 'truth';
      state.swipeEnabled = true;
      break;
    case 'v3_v2':
      state.leftOverlay = mainV3;
      state.rightOverlay = 'v2';
      state.swipeEnabled = true;
      break;
    case 'p2_p4':
      if (!hasP2) return;
      state.leftOverlay = 'v3_p2';
      state.rightOverlay = 'v3_p4';
      state.swipeEnabled = true;
      break;
  }
  elChkSwipe.checked = state.swipeEnabled;
  elSelLeft.value = state.leftOverlay;
  elSelRight.value = state.rightOverlay;
  document.querySelectorAll('.preset-btn').forEach((b) => {
    b.classList.toggle('active', b.getAttribute('data-preset') === preset);
  });
  renderActiveRasters();
}

function wireUI() {
  // Left drawer tabs
  document.querySelectorAll('.dtab').forEach((btn) => {
    btn.addEventListener('click', () => {
      const target = btn.getAttribute('data-tab')!;
      document.querySelectorAll('.dtab').forEach((b) => b.classList.toggle('active', b === btn));
      document.querySelectorAll('.tab-pane').forEach((p) => {
        p.classList.toggle('active', p.id === `tab-${target}`);
      });
    });
  });

  elSiteSearch.addEventListener('input', () => {
    state.searchQuery = elSiteSearch.value;
    renderSiteList();
  });

  elGlobeMetric.addEventListener('change', () => {
    state.globeMetric = elGlobeMetric.value as GlobeMetricKey;
    for (const m of [mapLeft, mapRight]) {
      if (m.getLayer('tiles-556-dots')) {
        m.setPaintProperty('tiles-556-dots', 'circle-color', circleColorExpr(state.globeMetric));
      }
    }
  });

  elBtnGlobe.addEventListener('click', returnToGlobe);
  elBtnToggleLeft.addEventListener('click', () => {
    elLeftDrawer.classList.toggle('hidden');
  });

  document.getElementById('btn-close-insp')!.addEventListener('click', returnToGlobe);

  const stepSite = (delta: number) => {
    if (state.items.length === 0) return;
    const idx = state.activeItem ? state.items.findIndex((i) => i.id === state.activeItem!.id) : -1;
    const nextIdx = (idx + delta + state.items.length) % state.items.length;
    selectExportedItem(state.items[nextIdx]);
  };
  document.getElementById('btn-prev-site')!.addEventListener('click', () => stepSite(-1));
  document.getElementById('btn-next-site')!.addEventListener('click', () => stepSite(1));

  document.querySelectorAll('.preset-btn').forEach((btn) => {
    btn.addEventListener('click', () => applyPreset(btn.getAttribute('data-preset')!));
  });

  document.querySelectorAll('.seg-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.baseLayer = btn.getAttribute('data-base') as BaseLayerKey;
      document.querySelectorAll('.seg-btn').forEach((b) => b.classList.toggle('active', b === btn));
      renderActiveRasters();
    });
  });

  elSelLeft.addEventListener('change', () => {
    state.leftOverlay = elSelLeft.value as OverlayLayerKey;
    document.querySelectorAll('.preset-btn').forEach((b) => b.classList.remove('active'));
    renderActiveRasters();
  });

  elSelRight.addEventListener('change', () => {
    state.rightOverlay = elSelRight.value as OverlayLayerKey;
    document.querySelectorAll('.preset-btn').forEach((b) => b.classList.remove('active'));
    renderActiveRasters();
  });

  elOpacitySlider.addEventListener('input', () => {
    const val = Number(elOpacitySlider.value);
    state.opacity = val / 100;
    elOpacityVal.textContent = `${val}%`;
    updateRasterOpacity();
  });

  elChkSwipe.addEventListener('change', () => {
    state.swipeEnabled = elChkSwipe.checked;
    applySwipeClip();
  });

  elChkTruthTop.addEventListener('change', () => {
    state.truthTop = elChkTruthTop.checked;
    renderActiveRasters();
  });

  // Keyboard shortcuts
  window.addEventListener('keydown', (e) => {
    if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'SELECT') return;
    if (e.key === 'Escape') {
      returnToGlobe();
    } else if (e.key === ' ' && state.activeItem) {
      e.preventDefault();
      state.swipeEnabled = !state.swipeEnabled;
      elChkSwipe.checked = state.swipeEnabled;
      applySwipeClip();
    } else if (e.key === 'ArrowRight') {
      stepSite(1);
    } else if (e.key === 'ArrowLeft') {
      stepSite(-1);
    } else if (state.activeItem && ['1', '2', '3', '4', '5'].includes(e.key)) {
      const mapKeys = ['v3_glav', 'v3_truth', 'diff', 'err', 'v3_v2'];
      applyPreset(mapKeys[Number(e.key) - 1]);
    }
  });
}

// ── Boot sequence ────────────────────────────────────────────────────
async function boot() {
  wireUI();
  renderRegionPills();
  renderRegionsTable();

  const [tiles, manifestItems] = await Promise.all([loadTiles556(), loadManifest()]);
  state.tiles556 = tiles;
  state.items = manifestItems;
  state.itemsById = new Map(manifestItems.map((it) => [it.id, it]));

  renderSiteList();
  renderIndepTable();

  // Wait for both MapLibre styles to finish loading
  await Promise.all([
    new Promise<void>((res) => (mapLeft.isStyleLoaded() ? res() : mapLeft.once('load', () => res()))),
    new Promise<void>((res) => (mapRight.isStyleLoaded() ? res() : mapRight.once('load', () => res()))),
  ]);

  addGlobeLayers(mapLeft, true);
  addGlobeLayers(mapRight, false);
  syncRightMap();

  elHudStatus.textContent = `${state.tiles556.length} tuiles globales · ${state.items.length} sites 10 m prêts`;
}

boot().catch((err) => {
  console.error(err);
  elHudStatus.textContent = `Erreur d'initialisation : ${String(err)}`;
});
