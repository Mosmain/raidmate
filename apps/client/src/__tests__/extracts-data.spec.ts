import { describe, it, expect } from 'vitest';
import { MAP_CODES } from '@/features/map/maps';
import { extractsForMap } from '@/features/map/data/extracts';

// Hand-curated data: one exit = one record. Two records on the same spot
// would draw as one marker hiding the other.
const MIN_DISTANCE_M = 1;

describe.each(MAP_CODES)('extracts %s', (code) => {
  const extracts = extractsForMap(code);

  it('has unique keys', () => {
    const keys = extracts.map((e) => e.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('has no overlapping records', () => {
    const overlaps: string[] = [];
    extracts.forEach((a, i) => {
      for (const b of extracts.slice(i + 1)) {
        const d = Math.hypot(a.position.x - b.position.x, a.position.z - b.position.z);
        if (d < MIN_DISTANCE_M) overlaps.push(`${a.key} <-> ${b.key} (${d.toFixed(2)} m)`);
      }
    });
    expect(overlaps).toEqual([]);
  });
});
