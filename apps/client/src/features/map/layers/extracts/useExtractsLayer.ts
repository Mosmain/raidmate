import { onBeforeUnmount, watch, type ShallowRef } from 'vue';
import L, { type Map as LeafletMap } from 'leaflet';
import { FACTION_COLORS, type FactionKey, type TarkovMapCode } from '@/features/map/maps';
import { extractsForMap } from '@/features/map/data/extracts';
import { extractFactions, extractsVisible } from '@/features/map/store';
import { makeIcon } from './icon';

// Label positions tried in order; offsets clear the 26px icon (the anchor sits
// 7px above its centre, leaflet.css adds a 6px margin on the arrow side).
const PLACEMENTS: ReadonlyArray<Pick<L.TooltipOptions, 'direction' | 'offset'>> = [
  { direction: 'top', offset: [0, -4] },
  { direction: 'bottom', offset: [0, 16] },
  { direction: 'right', offset: [9, 7] },
  { direction: 'left', offset: [-9, 7] },
  { direction: 'right', offset: [9, -18] },
  { direction: 'left', offset: [-9, -18] },
  { direction: 'right', offset: [9, 32] },
  { direction: 'left', offset: [-9, 32] },
];

function label(name: string, factions: ReadonlyArray<FactionKey>): HTMLElement {
  const el = document.createElement('div');
  el.className = 'extract-tooltip-row';
  el.textContent = name;
  if (factions.length === 1) el.style.borderLeftColor = FACTION_COLORS[factions[0]!];
  return el;
}

const GAP_PX = 3;

function overlap(a: DOMRect, b: DOMRect): number {
  const w = Math.min(a.right, b.right) - Math.max(a.left, b.left) + GAP_PX;
  const h = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) + GAP_PX;
  return w > 0 && h > 0 ? w * h : 0;
}

type Placement = (typeof PLACEMENTS)[number];

interface LabelItem {
  tooltip: L.Tooltip;
  el: HTMLElement;
  icon: DOMRect;
  placement: Placement;
  rect: DOMRect;
}

function place(item: Pick<LabelItem, 'tooltip' | 'el'>, placement: Placement): DOMRect {
  Object.assign(item.tooltip.options, placement);
  item.tooltip.update();
  return item.el.getBoundingClientRect();
}

export function useExtractsLayer(map: ShallowRef<LeafletMap | null>, mapCode: TarkovMapCode): void {
  const layer = L.layerGroup();
  const extracts = extractsForMap(mapCode);
  let markers: L.Marker[] = [];

  function render(): void {
    layer.clearLayers();
    const shown = new Set(extractFactions.value);
    markers = [];
    for (const ex of extracts) {
      const factions = ex.factions.filter((f) => shown.has(f));
      if (factions.length === 0) continue;
      const marker = L.marker([ex.position.z, ex.position.x], {
        icon: makeIcon(factions),
        pane: 'extracts',
        interactive: false,
        keyboard: false,
      })
        .bindTooltip(label(ex.name, factions), {
          ...PLACEMENTS[0],
          permanent: true,
          opacity: 0.95,
          className: 'extract-tooltip',
        })
        .addTo(layer);
      markers.push(marker);
    }
    declutter();
  }

  // Start every label on top, then let each one move to the first side that
  // clears the other icons and labels (or the least crowded one). A few passes
  // settle it: a label that moved can free the side a neighbour needed.
  function declutter(): void {
    const items: LabelItem[] = markers.flatMap((marker) => {
      const tooltip = marker.getTooltip();
      const el = tooltip?.getElement();
      const icon = marker.getElement()?.getBoundingClientRect();
      if (!tooltip || !el || !icon) return [];
      const placement = PLACEMENTS[0]!;
      return [{ tooltip, el, icon, placement, rect: place({ tooltip, el }, placement) }];
    });
    for (let pass = 0; pass < 4; pass++) {
      let moved = false;
      for (const item of items) {
        let best = { placement: item.placement, rect: item.rect, cost: Infinity };
        for (const placement of PLACEMENTS) {
          const rect = place(item, placement);
          let cost = 0;
          for (const other of items) {
            if (other !== item) cost += overlap(rect, other.icon) + overlap(rect, other.rect);
          }
          if (cost < best.cost) best = { placement, rect, cost };
          if (cost === 0) break;
        }
        place(item, best.placement);
        moved ||= best.placement !== item.placement;
        item.placement = best.placement;
        item.rect = best.rect;
      }
      if (!moved) break;
    }
  }

  function syncVisible(): void {
    const m = map.value;
    if (!m) return;
    if (extractsVisible.value) {
      layer.addTo(m);
      declutter();
    } else layer.remove();
  }

  watch(
    map,
    (m, _prev, onCleanup) => {
      if (!m) return;
      render();
      syncVisible();
      // Panning keeps relative positions; only a zoom changes the layout.
      m.on('zoomend', declutter);
      onCleanup(() => m.off('zoomend', declutter));
    },
    { immediate: true },
  );
  watch(extractFactions, render, { deep: true });
  watch(extractsVisible, syncVisible);
  onBeforeUnmount(() => layer.remove());
}
