import { z } from 'zod';
import { canonicalMapCode, FACTION_COLORS, type FactionKey } from '@/features/map/maps';

export interface ExtractData {
  /** Stable per-map id. */
  readonly key: string;
  readonly name: string;
  /** Multi-faction = one physical exit usable by several sides. */
  readonly factions: ReadonlyArray<FactionKey>;
  readonly position: { readonly x: number; readonly y: number; readonly z: number };
}

const FACTION_KEYS = Object.keys(FACTION_COLORS) as [FactionKey, ...FactionKey[]];
const extractDataSchema = z.object({
  key: z.string().min(1),
  name: z.string().min(1),
  factions: z.array(z.enum(FACTION_KEYS)).min(1),
  position: z.object({ x: z.number(), y: z.number(), z: z.number() }),
});

// One file per canonical map; a malformed file is dropped loudly instead of
// placing markers at NaN.
const modules = import.meta.glob<{ default: unknown }>('./extracts/*.json', { eager: true });

const EXTRACTS_BY_CODE: Record<string, ReadonlyArray<ExtractData>> = {};
for (const [path, mod] of Object.entries(modules)) {
  const code = /\/([^/]+)\.json$/.exec(path)?.[1];
  if (!code) continue;
  const parsed = z.array(extractDataSchema).safeParse(mod.default);
  if (!parsed.success) {
    console.error(`[extracts] Invalid dataset ${path}:`, parsed.error.issues);
    continue;
  }
  EXTRACTS_BY_CODE[code] = parsed.data;
}

export function extractsForMap(rawCode: string): ReadonlyArray<ExtractData> {
  return EXTRACTS_BY_CODE[canonicalMapCode(rawCode)] ?? [];
}

/** Factions with at least one exit on the map — the filter only offers these. */
export function factionsForMap(rawCode: string): FactionKey[] {
  const present = new Set(extractsForMap(rawCode).flatMap((ex) => ex.factions));
  return FACTION_KEYS.filter((f) => present.has(f));
}
