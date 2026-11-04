import { computed, ref, type ComputedRef, type Ref, type ShallowRef } from 'vue';

export interface LoadedMap {
  floors: Map<string, SVGGElement>;
}

export interface UseFloorSwitcher {
  currentFloor: Ref<string | null>;
  setActiveFloor: (id: string) => void;
  canFloorUp: ComputedRef<boolean>;
  canFloorDown: ComputedRef<boolean>;
  floorUp: () => void;
  floorDown: () => void;
}

/**
 * Shows one floor group of a multi-floor SVG at a time, keeping the default
 * (ground) floor dimmed underneath as context. Single-floor maps pass an empty
 * `floors` list and every call is a no-op.
 */
export function useFloorSwitcher(
  loaded: ShallowRef<LoadedMap | null>,
  floors: ReadonlyArray<{ id: string }>,
  defaultFloor: string | null,
): UseFloorSwitcher {
  const floorIds = floors.map((f) => f.id);
  const currentFloor = ref<string | null>(null);

  function setActiveFloor(id: string): void {
    if (!floorIds.includes(id)) return;
    currentFloor.value = id;
    const groups = loaded.value?.floors;
    // Not loaded yet: the loader applies currentFloor once the SVG arrives.
    if (!groups) return;
    for (const fid of floorIds) {
      const group = groups.get(fid);
      if (!group) continue;
      const active = fid === id;
      group.style.display = active || fid === defaultFloor ? '' : 'none';
      group.style.opacity = !active && fid === defaultFloor ? '0.15' : '';
    }
    // Later siblings paint on top; lift the active floor above ground.
    const activeGroup = groups.get(id);
    activeGroup?.parentNode?.appendChild(activeGroup);
  }

  // Floors are listed top-to-bottom, so "up" is a lower index. No wrap-around.
  const index = computed(() => floorIds.indexOf(currentFloor.value ?? defaultFloor ?? ''));
  const canFloorUp = computed(() => index.value > 0);
  const canFloorDown = computed(() => index.value >= 0 && index.value < floorIds.length - 1);

  function floorUp(): void {
    if (canFloorUp.value) setActiveFloor(floorIds[index.value - 1]!);
  }

  function floorDown(): void {
    if (canFloorDown.value) setActiveFloor(floorIds[index.value + 1]!);
  }

  return { currentFloor, setActiveFloor, canFloorUp, canFloorDown, floorUp, floorDown };
}
