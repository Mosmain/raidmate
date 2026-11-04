import { onBeforeUnmount, onMounted, ref, shallowRef, type Ref, type ShallowRef } from 'vue';
import L, { type Map as LeafletMap, type CRS } from 'leaflet';
import { mapInfo, mapSvgPath, type TarkovMapCode } from '@/features/map/maps';
import { useFloorSwitcher, type UseFloorSwitcher, type LoadedMap } from './useFloorSwitcher';

interface UseLeafletMapResult extends UseFloorSwitcher {
  map: ShallowRef<LeafletMap | null>;
  mapError: Ref<string | null>;
  reload: () => void;
}

// Generous panning room beyond the map edges + soft (not rigid) bounds, so
// dragging the map around doesn't hit a hard wall.
const PAN_PAD = 0.5;
const MIN_ZOOM_FLOOR = -5;

// Panes sit between Leaflet's overlayPane (400) and tooltipPane (650), so
// tooltips always render above markers.
const PANE_Z: Readonly<Record<string, number>> = { extracts: 510, player: 540 };

function applyRotation(latLng: L.LatLng, rotationDeg: number): L.LatLng {
  if (rotationDeg === 0) return latLng;
  if (latLng.lat === 0 && latLng.lng === 0) return L.latLng(0, 0);
  const rad = (rotationDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const { lng: x, lat: y } = latLng;
  const rotatedX = x * cos - y * sin;
  const rotatedY = x * sin + y * cos;
  return L.latLng(rotatedY, rotatedX);
}

// Direct port of tarkov-dev's map CRS so their calibration values apply verbatim.
function buildCRS(transform: readonly [number, number, number, number], rotation: number): CRS {
  const [scaleX, marginX, scaleYRaw, marginY] = transform;
  const scaleY = scaleYRaw * -1;
  return L.extend({}, L.CRS.Simple, {
    transformation: new L.Transformation(scaleX, marginX, scaleY, marginY),
    projection: L.extend({}, L.Projection.LonLat, {
      project(latLng: L.LatLng): L.Point {
        return L.Projection.LonLat.project(applyRotation(latLng, rotation));
      },
      unproject(point: L.Point): L.LatLng {
        return applyRotation(L.Projection.LonLat.unproject(point), -rotation);
      },
    }),
  }) as CRS;
}

function mapLatLngBounds(
  bounds: readonly [readonly [number, number], readonly [number, number]],
): L.LatLngBounds {
  const [[x1, z1], [x2, z2]] = bounds;
  return L.latLngBounds(L.latLng(z1, x1), L.latLng(z2, x2));
}

async function fetchSvg(url: string): Promise<{ svg: SVGSVGElement } & LoadedMap> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to load ${url}: HTTP ${response.status}`);
  const doc = new DOMParser().parseFromString(await response.text(), 'image/svg+xml');
  const parseError = doc.querySelector('parsererror');
  if (parseError) {
    throw new Error(`SVG parse error in ${url}: ${parseError.textContent ?? 'unknown'}`);
  }
  const svg = doc.documentElement as unknown as SVGSVGElement;
  const floors = new Map<string, SVGGElement>();
  for (const child of Array.from(svg.children)) {
    if (child.tagName.toLowerCase() === 'g' && child.id) floors.set(child.id, child as SVGGElement);
  }
  return { svg, floors };
}

export function useLeafletMap(
  containerRef: Ref<HTMLElement | null>,
  mapCode: TarkovMapCode,
): UseLeafletMapResult {
  const info = mapInfo(mapCode);
  const map = shallowRef<LeafletMap | null>(null);
  const loaded = shallowRef<LoadedMap | null>(null);
  const mapError = ref<string | null>(null);
  const bounds = mapLatLngBounds(info.bounds);
  const floor = useFloorSwitcher(loaded, info.floors, info.defaultFloor);
  let resizeObserver: ResizeObserver | null = null;

  onMounted(async () => {
    if (!containerRef.value) return;
    const instance = L.map(containerRef.value, {
      crs: buildCRS(info.transform, info.rotation),
      attributionControl: false,
      zoomControl: false,
      minZoom: MIN_ZOOM_FLOOR,
      maxZoom: 4,
      zoomSnap: 0.25,
      maxBoundsViscosity: 0.5,
    });
    map.value = instance;
    for (const [name, z] of Object.entries(PANE_Z)) {
      instance.createPane(name).style.zIndex = String(z);
    }

    // Min zoom = "whole map fits"; stay at fit when the window resizes.
    let fitZoom = 0;
    function applyFitZoom(): void {
      instance.setMinZoom(MIN_ZOOM_FLOOR);
      const newFitZoom = instance.getBoundsZoom(bounds);
      const wasAtFit = Math.abs(instance.getZoom() - fitZoom) < 0.05;
      fitZoom = newFitZoom;
      instance.setMinZoom(newFitZoom);
      if (wasAtFit) instance.setZoom(newFitZoom);
    }
    instance.fitBounds(bounds);
    applyFitZoom();
    instance.setMaxBounds(bounds.pad(PAN_PAD));

    resizeObserver = new ResizeObserver(() => {
      instance.invalidateSize({ animate: false, pan: false });
      applyFitZoom();
    });
    resizeObserver.observe(containerRef.value);

    await loadSvgIntoMap(instance);
  });

  async function loadSvgIntoMap(instance: LeafletMap): Promise<void> {
    try {
      mapError.value = null;
      const { svg, floors } = await fetchSvg(
        mapSvgPath(mapCode, `${import.meta.env.BASE_URL}maps`),
      );
      L.svgOverlay(svg, bounds, { interactive: false }).addTo(instance);
      loaded.value = { floors };
      const initialFloor = floor.currentFloor.value ?? info.defaultFloor;
      if (initialFloor) floor.setActiveFloor(initialFloor);
    } catch (err) {
      mapError.value = err instanceof Error ? err.message : String(err);
    }
  }

  function reload(): void {
    if (map.value) void loadSvgIntoMap(map.value);
  }

  onBeforeUnmount(() => {
    resizeObserver?.disconnect();
    map.value?.remove();
    map.value = null;
  });

  return { map, mapError, reload, ...floor };
}
