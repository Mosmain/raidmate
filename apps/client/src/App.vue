<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { TARKOV_MAPS } from '@/features/map/maps';
import { startGameFolders } from '@/features/game/folders';
import MapView from '@/features/map/components/MapView.vue';
import { useAutoMapSwitch } from '@/features/map/composables/useAutoMapSwitch';
import { mapCode } from '@/features/map/store';
import SettingsPanel from '@/features/settings/SettingsPanel.vue';
import TarkovTimeChip from '@/features/tarkov-time/TarkovTimeChip.vue';

const mapName = computed(() => TARKOV_MAPS[mapCode.value].displayName);
watch(mapName, (name) => (document.title = `RaidMate — ${name}`), { immediate: true });

const mapView = ref<InstanceType<typeof MapView> | null>(null);
const mapError = ref<string | null>(null);
const settingsOpen = ref(false);

useAutoMapSwitch();
// After mount, so the map's event subscribers exist before the log seed fires.
onMounted(() => void startGameFolders());
</script>

<template>
  <MapView ref="mapView" :key="mapCode" :map-code="mapCode" @map-error="mapError = $event" />
  <TarkovTimeChip :map-name="mapName" />
  <div v-if="mapError" class="map-error panel" role="alert">
    Ошибка загрузки карты: {{ mapError }}
    <button type="button" class="btn" @click="mapView?.reload()">Повторить</button>
  </div>
  <button
    type="button"
    class="icon-btn panel settings-btn"
    aria-label="Настройки"
    @click="settingsOpen = true"
  >
    ⚙
  </button>
  <SettingsPanel v-model:open="settingsOpen" />
</template>
