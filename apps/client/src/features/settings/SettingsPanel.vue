<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import {
  FACTION_COLORS,
  FACTION_LABELS,
  MAP_CODES,
  TARKOV_MAPS,
  type FactionKey,
} from '@/features/map/maps';
import { factionsForMap } from '@/features/map/data/extracts';
import {
  autoMapSwitch,
  extractFactions,
  extractsVisible,
  mapCode,
  playerFollow,
  playerVisible,
} from '@/features/map/store';
import GameFoldersSection from '@/features/game/GameFoldersSection.vue';

const open = defineModel<boolean>('open', { required: true });
const dialog = ref<HTMLDialogElement | null>(null);

watch(open, (v) => (v ? dialog.value?.showModal() : dialog.value?.close()));

const factions = computed(() => factionsForMap(mapCode.value));

function toggleFaction(f: FactionKey, on: boolean): void {
  extractFactions.value = on
    ? [...extractFactions.value, f]
    : extractFactions.value.filter((x) => x !== f);
}
</script>

<template>
  <dialog ref="dialog" class="settings panel" @close="open = false">
    <header>
      <h2>Настройки</h2>
      <button type="button" class="icon-btn" aria-label="Закрыть" @click="open = false">✕</button>
    </header>

    <section>
      <h3>Папки игры</h3>
      <GameFoldersSection />
    </section>

    <section>
      <h3>Карта</h3>
      <select v-model="mapCode" aria-label="Карта">
        <option v-for="code in MAP_CODES" :key="code" :value="code">
          {{ TARKOV_MAPS[code].displayName }}
        </option>
      </select>
      <label class="check"
        ><input v-model="autoMapSwitch" type="checkbox" /> Менять карту по рейду</label
      >
    </section>

    <section>
      <h3>Выходы</h3>
      <label class="check"
        ><input v-model="extractsVisible" type="checkbox" /> Показывать выходы</label
      >
      <label v-for="f in factions" :key="f" class="check">
        <input
          type="checkbox"
          :style="{ accentColor: FACTION_COLORS[f] }"
          :checked="extractFactions.includes(f)"
          @change="toggleFaction(f, ($event.target as HTMLInputElement).checked)"
        />
        {{ FACTION_LABELS[f] }}
      </label>
    </section>

    <section>
      <h3>Игрок</h3>
      <label class="check"
        ><input v-model="playerVisible" type="checkbox" /> Показывать игрока</label
      >
      <label class="check"
        ><input v-model="playerFollow" type="checkbox" /> Следовать за игроком</label
      >
    </section>
  </dialog>
</template>
