import { describe, it, expect } from 'vitest';
import {
  canonicalMapCode,
  isKnownMapCode,
  MAP_ALIASES,
  MAP_CODES,
  TARKOV_MAPS,
} from '@/features/map/maps';

describe('canonicalMapCode', () => {
  it('returns canonical codes unchanged', () => {
    for (const code of MAP_CODES) expect(canonicalMapCode(code)).toBe(code);
  });

  it('resolves pre-1.0.5.0 night/high aliases', () => {
    expect(canonicalMapCode('factory4_night')).toBe('factory4_day');
    expect(canonicalMapCode('sandbox_high')).toBe('sandbox');
  });

  it('resolves the 1.0.5.0 bundle-rename aliases captured live on 2026-05-30', () => {
    expect(canonicalMapCode('factory_day')).toBe('factory4_day');
    expect(canonicalMapCode('factory_night')).toBe('factory4_day');
    expect(canonicalMapCode('city')).toBe('tarkovstreets');
    expect(canonicalMapCode('rezerv_base')).toBe('rezervbase');
    expect(canonicalMapCode('shopping_mall')).toBe('interchange');
  });

  it('passes unknown codes through verbatim (caller filters)', () => {
    expect(canonicalMapCode('icebreaker')).toBe('icebreaker');
    expect(canonicalMapCode('')).toBe('');
  });

  it('every alias points at a real map', () => {
    for (const target of Object.values(MAP_ALIASES)) expect(TARKOV_MAPS[target]).toBeDefined();
  });
});

describe('isKnownMapCode', () => {
  it('accepts canonical and alias keys alike', () => {
    expect(isKnownMapCode('bigmap')).toBe(true);
    expect(isKnownMapCode('factory_day')).toBe(true);
    expect(isKnownMapCode('city')).toBe(true);
    expect(isKnownMapCode('rezerv_base')).toBe(true);
  });

  it('rejects unknown codes', () => {
    expect(isKnownMapCode('icebreaker')).toBe(false);
    expect(isKnownMapCode('toString')).toBe(false);
    // Case-sensitive: the log parser lowercases before any lookup happens.
    expect(isKnownMapCode('Rezerv_Base')).toBe(false);
    expect(isKnownMapCode('TarkovStreets')).toBe(false);
  });
});

describe('MAP_CODES', () => {
  it('excludes aliases from the picker', () => {
    for (const alias of Object.keys(MAP_ALIASES)) expect(MAP_CODES).not.toContain(alias);
  });
});
