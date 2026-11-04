import { parseLogLine } from '@/features/game/parse-log';
import { parseScreenshotFilename, quaternionToYawDegrees } from '@/features/game/parse-screenshot';
import type { MapChangeMessage, PositionMessage } from '@/shared/messages';

// Minimal slice of the File System Access handles, so tests can pass fakes.
interface BlobLike {
  readonly size: number;
  slice(start?: number): BlobLike;
  text(): Promise<string>;
  arrayBuffer(): Promise<ArrayBuffer>;
}
export interface FileLike {
  readonly kind: 'file';
  getFile(): Promise<BlobLike>;
}
export interface DirLike {
  readonly kind: 'directory';
  entries(): AsyncIterable<[string, FileLike | DirLike]>;
}

export interface Watcher {
  tick(): Promise<void>;
}

async function list(dir: DirLike): Promise<Array<[string, FileLike | DirLike]>> {
  const out: Array<[string, FileLike | DirLike]> = [];
  for await (const entry of dir.entries()) out.push(entry);
  return out;
}

/** New screenshot files → positions. Files present on the first scan are never replayed. */
export function screenshotWatcher(dir: DirLike, emit: (msg: PositionMessage) => void): Watcher {
  let seen: Set<string> | null = null;
  return {
    async tick() {
      const names = (await list(dir)).filter(([, h]) => h.kind === 'file').map(([n]) => n);
      const first = seen === null;
      seen ??= new Set();
      for (const name of names.sort()) {
        if (seen.has(name)) continue;
        seen.add(name);
        if (first) continue;
        // The filename is all we need, so there's no waiting for EFT to finish writing.
        const parsed = parseScreenshotFilename(name);
        if (!parsed) continue;
        const { x, y, z } = parsed.position;
        const yaw = parsed.orientation ? quaternionToYawDegrees(parsed.orientation) : null;
        emit({ t: Date.now(), x, y, z, yaw });
      }
    },
  };
}

/** `log_2026.5.30_3-12-45_…`: BSG writes the hour without a leading zero, so compare numerically. */
export function sessionSortKey(name: string): number[] {
  const m = /^log_(\d+)\.(\d+)\.(\d+)_(\d+)-(\d+)-(\d+)/.exec(name);
  return m ? m.slice(1).map(Number) : [0, 0, 0, 0, 0, 0];
}

function compareKeys(a: number[], b: number[]): number {
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i]! - b[i]!;
  return 0;
}

function newest<T>(items: T[], key: (item: T) => number[]): T | undefined {
  return items.reduce<T | undefined>(
    (best, item) => (best === undefined || compareKeys(key(item), key(best)) > 0 ? item : best),
    undefined,
  );
}

const APP_LOG_RE = /^.+ application_(\d+)\.log$/;
const SEED_BYTES = 64 * 1024;

/**
 * Tails the newest session's newest `… application_NNN.log` for map changes.
 * On the very first file it seeds the current map from the last 64 KB, then
 * follows from EOF; files appearing later (new session, rotation) are read
 * from the start.
 */
export function logWatcher(logsDir: DirLike, emit: (msg: MapChangeMessage) => void): Watcher {
  let fileKey: string | null = null;
  let offset = 0;
  let carry = '';
  let decoder = new TextDecoder();
  let lastMap: string | null = null;

  function report(rawMapId: string): void {
    if (rawMapId === lastMap) return;
    lastMap = rawMapId;
    emit({ t: Date.now(), rawMapId });
  }

  return {
    async tick() {
      const sessions = (await list(logsDir)).filter(
        (e): e is [string, DirLike] => e[1].kind === 'directory' && e[0].startsWith('log_'),
      );
      const session = newest(sessions, ([name]) => sessionSortKey(name));
      if (!session) return;
      const logs = (await list(session[1])).filter(
        (e): e is [string, FileLike] => e[1].kind === 'file' && APP_LOG_RE.test(e[0]),
      );
      const log = newest(logs, ([name]) => [Number(APP_LOG_RE.exec(name)![1])]);
      if (!log) return;

      const file = await log[1].getFile();
      const key = `${session[0]}/${log[0]}`;
      if (key !== fileKey) {
        const firstAttach = fileKey === null;
        fileKey = key;
        carry = '';
        decoder = new TextDecoder();
        offset = 0;
        if (firstAttach) {
          const tail = await file.slice(Math.max(0, file.size - SEED_BYTES)).text();
          const hit = tail
            .split('\n')
            .reverse()
            .map((line) => parseLogLine(line))
            .find(Boolean);
          if (hit) report(hit.rawMapId);
          offset = file.size;
        }
      }
      if (file.size < offset) {
        offset = 0;
        carry = '';
        decoder = new TextDecoder();
      }
      if (file.size === offset) return;

      const chunk = decoder.decode(await file.slice(offset).arrayBuffer(), { stream: true });
      offset = file.size;
      const lines = (carry + chunk).split('\n');
      carry = lines.pop() ?? '';
      for (const line of lines) {
        const hit = parseLogLine(line.replace(/\r$/, ''));
        if (hit) report(hit.rawMapId);
      }
    },
  };
}
