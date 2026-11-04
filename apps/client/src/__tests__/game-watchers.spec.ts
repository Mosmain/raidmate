import { describe, it, expect } from 'vitest';
import {
  logWatcher,
  screenshotWatcher,
  sessionSortKey,
  type DirLike,
  type FileLike,
} from '@/features/game/watchers';

// In-memory stand-ins for File System Access handles.
type Tree = { [name: string]: Tree | string };

type Bytes = Uint8Array<ArrayBuffer>;

function blob(bytes: Bytes): Awaited<ReturnType<FileLike['getFile']>> {
  return {
    size: bytes.length,
    slice: (start = 0) => blob(bytes.slice(start)),
    text: async () => new TextDecoder().decode(bytes),
    arrayBuffer: async () => bytes.slice().buffer,
  };
}

function file(text: () => string): FileLike {
  return { kind: 'file', getFile: async () => blob(new TextEncoder().encode(text()) as Bytes) };
}

function dir(tree: Tree): DirLike {
  return {
    kind: 'directory',
    async *entries() {
      for (const [name, node] of Object.entries(tree)) {
        yield [name, typeof node === 'string' ? file(() => tree[name] as string) : dir(node)];
      }
    },
  };
}

const SHOT = '2026-05-30[12-00-00]_-15.4, 1.5, -23.8_0, 0, 0, 1_75 (0).png';
const RCID = 'scene preset path:maps/x.bundle rcid:Factory_Day.scenespreset.asset\n';
const TRANSIT = '[Transit] Flag:None, RaidId:1, Count:0, Locations:RezervBase -> x\n';

describe('screenshotWatcher', () => {
  it('ignores files present on the first scan and emits new ones', async () => {
    const tree: Tree = { 'old.png': '', [SHOT.replace('(0)', '(9)')]: '' };
    const out: unknown[] = [];
    const w = screenshotWatcher(dir(tree), (m) => out.push(m));
    await w.tick();
    expect(out).toEqual([]);

    tree[SHOT] = '';
    tree['notes.txt'] = '';
    await w.tick();
    expect(out).toEqual([expect.objectContaining({ x: -15.4, y: 1.5, z: -23.8, yaw: 0 })]);

    await w.tick();
    expect(out).toHaveLength(1);
  });
});

describe('sessionSortKey', () => {
  it('orders hours numerically, not as strings', () => {
    const names = ['log_2026.5.30_14-00-00_1.0', 'log_2026.5.30_3-00-00_1.0'];
    const [a, b] = names.map(sessionSortKey);
    expect(a![3]).toBe(14);
    expect(b![3]).toBe(3);
  });

  it('puts unparseable names first', () => {
    expect(sessionSortKey('log_weird')).toEqual([0, 0, 0, 0, 0, 0]);
  });
});

describe('logWatcher', () => {
  it('seeds the current map from the tail, then follows appended lines', async () => {
    const session: Tree = { 'x application_000.log': `noise\n${RCID}noise\n` };
    const tree: Tree = {
      'log_2026.5.30_3-00-00_1.0': { 'x application_000.log': TRANSIT },
      'log_2026.5.30_14-00-00_1.0': session,
      'not-a-session': {},
    };
    const out: string[] = [];
    const w = logWatcher(dir(tree), (m) => out.push(m.rawMapId));
    await w.tick();
    expect(out).toEqual(['factory_day']);

    // A line split across two reads is joined before parsing.
    session['x application_000.log'] += '[Transit] a Locations:Woo';
    await w.tick();
    expect(out).toEqual(['factory_day']);

    session['x application_000.log'] += 'ds\r\n' + RCID;
    await w.tick();
    expect(out).toEqual(['factory_day', 'woods', 'factory_day']);
  });

  it('reads a rotated log from the start and suppresses repeats', async () => {
    const session: Tree = { 'x application_000.log': RCID };
    const out: string[] = [];
    const w = logWatcher(dir({ 'log_2026.5.30_3-00-00_1.0': session }), (m) =>
      out.push(m.rawMapId),
    );
    await w.tick();
    session['x application_001.log'] = TRANSIT + TRANSIT;
    await w.tick();
    expect(out).toEqual(['factory_day', 'rezervbase']);
  });
});
