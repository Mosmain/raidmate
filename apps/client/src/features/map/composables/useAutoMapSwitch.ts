import { canonicalMapCode, isKnownMapCode, type TarkovMapCode } from '@/features/map/maps';
import { onHostEvent } from '@/shared/host';
import { autoMapSwitch, mapCode } from '../store';

/** Follows `map-change` from the log watcher. Mount once at the app root. */
export function useAutoMapSwitch(): void {
  onHostEvent('map-change', (msg) => {
    if (!autoMapSwitch.value) return;
    if (!isKnownMapCode(msg.rawMapId)) {
      // A brand-new BSG map not yet in TARKOV_MAPS: keep showing the old one.
      console.warn(`[auto-map-switch] unknown rawMapId "${msg.rawMapId}"`);
      return;
    }
    mapCode.value = canonicalMapCode(msg.rawMapId) as TarkovMapCode;
  });
}
