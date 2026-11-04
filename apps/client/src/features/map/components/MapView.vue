<script setup lang="ts">
import { ref, watch } from 'vue';
import { mapInfo, type TarkovMapCode } from '@/features/map/maps';
import { useLeafletMap } from '../composables/useLeafletMap';
import { useDevCoordsCopy } from '../composables/useDevCoordsCopy';
import { useExtractsLayer } from '../layers/extracts/useExtractsLayer';
import { usePlayerLayer } from '../layers/player/usePlayerLayer';

const props = defineProps<{ mapCode: TarkovMapCode }>();
const emit = defineEmits<{ mapError: [err: string | null] }>();

const info = mapInfo(props.mapCode);
const container = ref<HTMLElement | null>(null);
const { map, mapError, reload, currentFloor, canFloorUp, canFloorDown, floorUp, floorDown } =
  useLeafletMap(container, props.mapCode);

useExtractsLayer(map, props.mapCode);
usePlayerLayer(map, info);
useDevCoordsCopy(map);

watch(mapError, (err) => emit('mapError', err));

const floorLabel = (id: string | null): string =>
  info.floors.find((f) => f.id === (id ?? info.defaultFloor))?.label ?? '';

defineExpose({ reload });
</script>

<template>
  <div ref="container" class="map" :aria-label="`Карта: ${info.displayName}`" />
  <div v-if="info.floors.length > 1" class="floor-stepper panel">
    <button
      type="button"
      class="icon-btn"
      :disabled="!canFloorUp"
      aria-label="Этаж выше"
      @click="floorUp"
    >
      ▲
    </button>
    <span class="floor-label" title="Этаж">{{ floorLabel(currentFloor) }}</span>
    <button
      type="button"
      class="icon-btn"
      :disabled="!canFloorDown"
      aria-label="Этаж ниже"
      @click="floorDown"
    >
      ▼
    </button>
  </div>
</template>
