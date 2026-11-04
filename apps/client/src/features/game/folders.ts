import { reactive } from 'vue';
import { emitHostEvent } from '@/shared/host';
import { logWatcher, screenshotWatcher, type DirLike, type Watcher } from './watchers';

// Game folders read straight from the browser (File System Access API,
// Chrome/Edge). The user picks each folder once; the handle is kept in
// IndexedDB and polled every second.

export type FolderKind = 'screenshots' | 'logs';
export type FolderStatus = 'empty' | 'needs-permission' | 'watching' | 'error';

interface FolderState {
  name: string | null;
  status: FolderStatus;
  error: string | null;
}

const KINDS: readonly FolderKind[] = ['screenshots', 'logs'];
const POLL_MS = 1000;

export const foldersSupported = typeof window !== 'undefined' && 'showDirectoryPicker' in window;

export const folders = reactive<Record<FolderKind, FolderState>>({
  screenshots: { name: null, status: 'empty', error: null },
  logs: { name: null, status: 'empty', error: null },
});

const handles: Partial<Record<FolderKind, FileSystemDirectoryHandle>> = {};
const watchers: Partial<Record<FolderKind, Watcher>> = {};

// Directory handles are structured-cloneable, so IndexedDB can keep them; localStorage can't.
function idb<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const open = indexedDB.open('raidmate', 1);
    open.onupgradeneeded = () => open.result.createObjectStore('folders');
    open.onerror = () => reject(open.error);
    open.onsuccess = () => {
      const db = open.result;
      const tx = db.transaction('folders', mode);
      const req = run(tx.objectStore('folders'));
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
      tx.oncomplete = tx.onabort = () => db.close();
    };
  });
}

function makeWatcher(kind: FolderKind, handle: FileSystemDirectoryHandle): Watcher {
  const dir = handle as unknown as DirLike;
  return kind === 'screenshots'
    ? screenshotWatcher(dir, (msg) => emitHostEvent('position', msg))
    : logWatcher(dir, (msg) => emitHostEvent('map-change', msg));
}

async function activate(
  kind: FolderKind,
  handle: FileSystemDirectoryHandle,
  ask: boolean,
): Promise<void> {
  handles[kind] = handle;
  folders[kind].name = handle.name;
  // requestPermission needs a click; on page load we can only query.
  const permission = ask
    ? await handle.requestPermission({ mode: 'read' })
    : await handle.queryPermission({ mode: 'read' });
  if (permission !== 'granted') {
    delete watchers[kind];
    folders[kind].status = 'needs-permission';
    return;
  }
  watchers[kind] = makeWatcher(kind, handle);
  folders[kind].status = 'watching';
  folders[kind].error = null;
}

export async function pickFolder(kind: FolderKind): Promise<void> {
  let handle = await window.showDirectoryPicker!({
    id: `raidmate-${kind}`,
    mode: 'read',
    startIn: 'documents',
  });
  // Picking the game folder itself is fine too: step into its Logs.
  if (kind === 'logs') handle = await handle.getDirectoryHandle('Logs').catch(() => handle);
  await idb('readwrite', (store) => store.put(handle, kind));
  await activate(kind, handle, true);
}

export async function grantFolder(kind: FolderKind): Promise<void> {
  const handle = handles[kind];
  if (handle) await activate(kind, handle, true);
}

async function poll(): Promise<void> {
  for (const kind of KINDS) {
    const watcher = watchers[kind];
    if (!watcher) continue;
    try {
      await watcher.tick();
      folders[kind].status = 'watching';
      folders[kind].error = null;
    } catch (err) {
      folders[kind].status = 'error';
      folders[kind].error = err instanceof Error ? err.message : String(err);
    }
  }
  window.setTimeout(() => void poll(), POLL_MS);
}

let started = false;

/** Restore saved folders and start polling. Call once at app start. */
export async function startGameFolders(): Promise<void> {
  if (!foldersSupported || started) return;
  started = true;
  for (const kind of KINDS) {
    const handle = await idb<FileSystemDirectoryHandle | undefined>('readonly', (store) =>
      store.get(kind),
    ).catch(() => undefined);
    if (handle) await activate(kind, handle, false);
  }
  void poll();
}
