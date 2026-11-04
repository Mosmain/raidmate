import { describe, it, expect } from 'vitest';
import { parseScreenshotFilename, quaternionToYawDegrees } from '@/features/game/parse-screenshot';
import cases from '@/features/game/__fixtures__/parse-screenshot-cases.json';

// The fixture JSON is the cross-language contract for any future port.
describe('parseScreenshotFilename (fixture-driven)', () => {
  for (const c of cases) {
    it(c.name, () => {
      expect(parseScreenshotFilename(c.filename)).toEqual(c.expected);
    });
  }
});

describe('quaternionToYawDegrees', () => {
  it('identity quaternion yields 0°', () => {
    expect(quaternionToYawDegrees({ qx: 0, qy: 0, qz: 0, qw: 1 })).toBeCloseTo(0, 6);
  });

  it('90° around Y axis yields 90°', () => {
    const s = Math.sin(Math.PI / 4);
    const c = Math.cos(Math.PI / 4);
    expect(quaternionToYawDegrees({ qx: 0, qy: s, qz: 0, qw: c })).toBeCloseTo(90, 4);
  });

  it('180° around Y axis yields 180°', () => {
    expect(quaternionToYawDegrees({ qx: 0, qy: 1, qz: 0, qw: 0 })).toBeCloseTo(180, 4);
  });
});
