<script setup lang="ts">
import { ref } from 'vue';
import {
  folders,
  foldersSupported,
  grantFolder,
  pickFolder,
  type FolderKind,
  type FolderStatus,
} from './folders';

const ROWS: ReadonlyArray<{ kind: FolderKind; title: string; hint: string }> = [
  {
    kind: 'screenshots',
    title: 'Скриншоты',
    hint: 'Документы\\Escape from Tarkov\\Screenshots',
  },
  { kind: 'logs', title: 'Логи', hint: 'папка игры или её Logs' },
];

const STATUS: Record<FolderStatus, string> = {
  empty: 'не выбрана',
  'needs-permission': 'нужно разрешение',
  watching: 'читается',
  error: 'ошибка',
};

const error = ref<string | null>(null);

async function run(action: () => Promise<void>): Promise<void> {
  error.value = null;
  try {
    await action();
  } catch (err) {
    // Closing the picker is not an error.
    if (err instanceof DOMException && err.name === 'AbortError') return;
    error.value = err instanceof Error ? err.message : String(err);
  }
}
</script>

<template>
  <p v-if="!foldersSupported" class="note">Чтение папок игры работает в Chrome и Edge.</p>
  <template v-else>
    <div v-for="row in ROWS" :key="row.kind" class="folder-row">
      <div>
        <div>
          {{ row.title }}:
          <span :class="['folder-status', folders[row.kind].status]">
            {{ STATUS[folders[row.kind].status] }}
          </span>
        </div>
        <small class="note">{{ folders[row.kind].name ?? row.hint }}</small>
        <small v-if="folders[row.kind].error" class="error">{{ folders[row.kind].error }}</small>
      </div>
      <button
        v-if="folders[row.kind].status === 'needs-permission'"
        type="button"
        class="btn"
        @click="run(() => grantFolder(row.kind))"
      >
        Разрешить
      </button>
      <button v-else type="button" class="btn ghost" @click="run(() => pickFolder(row.kind))">
        Выбрать
      </button>
    </div>
    <p v-if="error" class="error">{{ error }}</p>
  </template>
</template>
