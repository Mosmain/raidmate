<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { tarkovTime } from '@/features/tarkov-time/tarkov-time';

defineProps<{ mapName: string }>();

// In-game time runs 7× real time, so a fixed interval visibly stutters the
// seconds. Sample every frame, swap the ref only when the shown value changes.
const clock = ref(tarkovTime(Date.now()));
let raf: number | undefined;
function tick(): void {
  const next = tarkovTime(Date.now());
  const cur = clock.value;
  if (next.left !== cur.left || next.right !== cur.right || next.seconds !== cur.seconds) {
    clock.value = next;
  }
  raf = requestAnimationFrame(tick);
}
onMounted(() => (raf = requestAnimationFrame(tick)));
onBeforeUnmount(() => raf !== undefined && cancelAnimationFrame(raf));
</script>

<template>
  <div class="clock-chip panel" aria-hidden="true">
    <span
      >{{ clock.left }}<span class="dim">:{{ clock.seconds }}</span></span
    >
    <span class="dimmer">/</span>
    <span
      >{{ clock.right }}<span class="dim">:{{ clock.seconds }}</span></span
    >
    <span class="dimmer">|</span>
    <span class="map-name">{{ mapName }}</span>
  </div>
</template>
