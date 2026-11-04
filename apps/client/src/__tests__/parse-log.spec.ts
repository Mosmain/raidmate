import { describe, it, expect } from 'vitest';
import { parseLogLine } from '@/features/game/parse-log';
import cases from '@/features/game/__fixtures__/parse-log-cases.json';

// The fixture JSON is the cross-language contract for any future port.
describe('parseLogLine (fixture-driven)', () => {
  for (const c of cases) {
    it(c.name, () => {
      expect(parseLogLine(c.line)).toEqual(c.expected);
    });
  }
});

// ---------------------------------------------------------------------------
// Non-fixture tests — cases that need programmatic logic or are specific to
// the TS implementation details rather than shared parity.
// ---------------------------------------------------------------------------
describe('parseLogLine (TS-specific)', () => {
  describe('source priority', () => {
    it('prefers scene preset rcid over Transit when both are on the same line (defensive)', () => {
      // This is already covered in the fixture, but kept here as a named
      // documentation test so the priority contract is explicit in the TS suite.
      const line =
        'scene preset path:maps/customs_preset.bundle rcid:bigmap.scenespreset.asset [Transit] Flag:None, Locations:woods -> ';
      expect(parseLogLine(line)).toEqual({ rawMapId: 'bigmap' });
    });
  });
});
