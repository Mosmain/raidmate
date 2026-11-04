import { onBeforeUnmount, watch, type ShallowRef } from 'vue';
import L, { type Map as LeafletMap } from 'leaflet';
import type { TarkovMapInfo } from '@/features/map/maps';
import { onHostEvent } from '@/shared/host';
import { playerFollow, playerVisible } from '@/features/map/store';

function playerIcon(displayYaw: number | null): L.DivIcon {
  const shape =
    displayYaw === null
      ? '<circle class="player-marker" cx="0" cy="0" r="7" />'
      : `<path class="player-marker" d="M 0,-13 L 9,9 L 0,4 L -9,9 Z" transform="rotate(${displayYaw})" />`;
  return L.divIcon({
    html: `<svg viewBox="-18 -18 36 36" xmlns="http://www.w3.org/2000/svg">${shape}</svg>`,
    className: 'player-icon-wrapper',
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  });
}

export function usePlayerLayer(map: ShallowRef<LeafletMap | null>, info: TarkovMapInfo): void {
  const layer = L.layerGroup();
  let marker: L.Marker | null = null;
  let lastKey = '';

  function syncVisible(): void {
    const m = map.value;
    if (!m) return;
    if (playerVisible.value) layer.addTo(m);
    else layer.remove();
  }

  onHostEvent('position', (msg) => {
    const m = map.value;
    if (!m) return;
    const latLng: L.LatLngExpression = [msg.z, msg.x];
    const yaw = msg.yaw ?? null;
    const icon = playerIcon(yaw === null ? null : yaw + info.rotation + (info.yawOffset ?? 0));
    if (marker) marker.setLatLng(latLng).setIcon(icon);
    else
      marker = L.marker(latLng, {
        icon,
        interactive: false,
        keyboard: false,
        pane: 'player',
      }).addTo(layer);
    syncVisible();

    // Recenter only on a real move; zoom stays where the user left it.
    const key = `${msg.x},${msg.z},${yaw}`;
    if (playerFollow.value && key !== lastKey) m.panTo(latLng, { animate: true, duration: 0.4 });
    lastKey = key;
  });

  watch(playerVisible, syncVisible);
  onBeforeUnmount(() => layer.remove());
}
