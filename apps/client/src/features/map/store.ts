import { z } from 'zod';
import {
  FACTION_COLORS,
  TARKOV_MAPS,
  type FactionKey,
  type TarkovMapCode,
} from '@/features/map/maps';
import { persistedRef } from '@/shared/persisted-store';

const FACTION_KEYS = Object.keys(FACTION_COLORS) as [FactionKey, ...FactionKey[]];
const mapCodeSchema = z.string().refine((s): s is TarkovMapCode => Object.hasOwn(TARKOV_MAPS, s));

export const mapCode = persistedRef('rm.map.code', mapCodeSchema, 'bigmap' as TarkovMapCode);
export const autoMapSwitch = persistedRef('rm.map.autoMapSwitch', z.boolean(), true);
export const extractFactions = persistedRef(
  'rm.map.extractFactions',
  z.array(z.enum(FACTION_KEYS)),
  [...FACTION_KEYS],
);
export const extractsVisible = persistedRef('rm.layer.extracts.visible', z.boolean(), true);
export const playerVisible = persistedRef('rm.layer.player.visible', z.boolean(), true);
export const playerFollow = persistedRef('rm.map.follow', z.boolean(), false);
