export interface TarkovMapInfo {
  readonly displayName: string;
  readonly svgFile: string;
  /**
   * In-game (x, z) bounds, in the same format tarkov-dev keeps them
   * (`[[x1, z1], [x2, z2]]`, not normalized to min/max). Consumers should
   * normalize when building Leaflet latLngBounds.
   */
  readonly bounds: readonly [readonly [number, number], readonly [number, number]];
  /** `[scaleX, offsetX, scaleY, offsetY]` — feed to L.Transformation with -scaleY. */
  readonly transform: readonly [number, number, number, number];
  /** Degrees, counter-clockwise; applied during CRS projection. */
  readonly rotation: number;
  /**
   * Optional per-map offset (degrees) added to the player-yaw arrow on top of
   * `rotation`. Use when in-game position calibration is correct but the
   * screenshot-derived yaw is rotated relative to the rendered map (e.g. BSG
   * re-oriented the level's world axes without changing extract coordinates,
   * as happened for Factory in patch 1.0.5.0). Defaults to 0.
   */
  readonly yawOffset?: number;
  /**
   * Ordered top-to-bottom list of floors for the floor switcher. Each `id`
   * matches a top-level <g> element in the SVG; `label` is the numeric tag
   * shown in the UI (e.g. "-1", "0", "1"). Empty array means the map is
   * single-level and the switcher should be hidden.
   */
  readonly floors: ReadonlyArray<{ readonly id: string; readonly label: string }>;
  /** Floor id to show on first render. Null only when `floors` is empty. */
  readonly defaultFloor: string | null;
}

export const TARKOV_MAPS = {
  bigmap: {
    displayName: 'Таможня',
    svgFile: 'Customs.svg',
    bounds: [
      [698, -307],
      [-372, 237],
    ],
    transform: [0.239, 168.65, 0.239, 136.35],
    rotation: 180,
    floors: [
      { id: 'Third_Floor', label: '3' },
      { id: 'Second_Floor', label: '2' },
      { id: 'First_Floor', label: '1' },
      { id: 'Ground_Level', label: '0' },
      { id: 'Underground_Level', label: '-1' },
    ],
    defaultFloor: 'Ground_Level',
  },
  factory4_day: {
    displayName: 'Завод',
    svgFile: 'Factory.svg',
    bounds: [
      [77, -64.5],
      [-65.5, 67.4],
    ],
    transform: [1.629, 119.9, 1.629, 139.3],
    rotation: 90,
    // Patch 1.0.5.0 re-oriented the in-game world axes on Factory by 180°
    // without changing extract coordinates: marker positions stayed correct
    // but the screenshot quaternion's yaw started pointing in the opposite
    // direction. Compensate per-map without touching `rotation` (which would
    // also shift positions). Confirmed live 2026-05-30 on PvE practice.
    yawOffset: 180,
    floors: [
      { id: 'Third_Floor', label: '2' },
      { id: 'Second_Floor', label: '1' },
      { id: 'Ground_Floor', label: '0' },
      { id: 'Basement', label: '-1' },
    ],
    defaultFloor: 'Ground_Floor',
  },
  woods: {
    displayName: 'Лес',
    svgFile: 'Woods.svg',
    bounds: [
      [646, -914],
      [-761, 442],
    ],
    transform: [0.1855, 112.95, 0.1855, 167.85],
    rotation: 180,
    floors: [],
    defaultFloor: null,
  },
  shoreline: {
    displayName: 'Берег',
    svgFile: 'Shoreline.svg',
    bounds: [
      [504, -415],
      [-1056, 618],
    ],
    transform: [0.16, 83.2, 0.16, 111.1],
    rotation: 180,
    floors: [
      { id: 'Third_Floor', label: '3' },
      { id: 'Second_Floor', label: '2' },
      { id: 'First_Floor', label: '1' },
      { id: 'Ground_Level', label: '0' },
      { id: 'Underground_Level', label: '-1' },
    ],
    defaultFloor: 'Ground_Level',
  },
  rezervbase: {
    displayName: 'Резерв',
    svgFile: 'Reserve.svg',
    bounds: [
      [289, -293],
      [-303, 244],
    ],
    transform: [0.395, 122, 0.395, 137.65],
    rotation: 180,
    floors: [
      { id: 'Ground_Level', label: '0' },
      { id: 'Bunkers', label: '-1' },
    ],
    defaultFloor: 'Ground_Level',
  },
  interchange: {
    displayName: 'Развязка',
    svgFile: 'Interchange.svg',
    bounds: [
      [598, -442],
      [-433, 426],
    ],
    transform: [0.265, 150.6, 0.265, 134.6],
    rotation: 180,
    floors: [
      { id: 'Second_Floor', label: '2' },
      { id: 'First_Floor', label: '1' },
      { id: 'Ground_Level', label: '0' },
    ],
    defaultFloor: 'Ground_Level',
  },
  lighthouse: {
    displayName: 'Маяк',
    svgFile: 'Lighthouse.svg',
    bounds: [
      [515, -998],
      [-545, 725],
    ],
    transform: [0.2, 0, 0.2, 0],
    rotation: 180,
    floors: [],
    defaultFloor: null,
  },
  tarkovstreets: {
    displayName: 'Улицы Таркова',
    svgFile: 'StreetsOfTarkov.svg',
    bounds: [
      [323, -295],
      [-280, 532],
    ],
    transform: [0.38, 0, 0.38, 0],
    rotation: 180,
    floors: [
      { id: 'Fifth_Floor', label: '5' },
      { id: 'Fourth_Floor', label: '4' },
      { id: 'Third_Floor', label: '3' },
      { id: 'Second_Floor', label: '2' },
      { id: 'First_Floor', label: '1' },
      { id: 'Ground_Level', label: '0' },
      { id: 'Underground_Level', label: '-1' },
    ],
    defaultFloor: 'Ground_Level',
  },
  laboratory: {
    displayName: 'Лаборатория',
    svgFile: 'Labs.svg',
    bounds: [
      [-80, -477],
      [-287, -193],
    ],
    transform: [0.575, 281.2, 0.575, 193.7],
    rotation: 270,
    floors: [
      { id: 'Second_Level', label: '1' },
      { id: 'First_Level', label: '0' },
      { id: 'Technical_Level', label: '-1' },
    ],
    defaultFloor: 'First_Level',
  },
  sandbox: {
    displayName: 'Эпицентр',
    svgFile: 'GroundZero.svg',
    bounds: [
      [249, -124],
      [-99, 364],
    ],
    transform: [0.524, 167.3, 0.524, 65.1],
    rotation: 180,
    floors: [
      { id: 'Third_Floor', label: '3' },
      { id: 'Second_Floor', label: '2' },
      { id: 'First_Floor', label: '1' },
      { id: 'Ground_Level', label: '0' },
      { id: 'Underground_Level', label: '-1' },
    ],
    defaultFloor: 'Ground_Level',
  },
} as const satisfies Record<string, TarkovMapInfo>;

export type TarkovMapCode = keyof typeof TARKOV_MAPS;

/**
 * Raw log ids that render as another map. The parser lowercases ids, so keys
 * are lowercase. Patch 1.0.5.0 renamed the scene-preset bundles (`rcid:` line)
 * while `[Transit] Locations:` kept the legacy ids — both spellings land here.
 */
export const MAP_ALIASES: Readonly<Record<string, TarkovMapCode>> = {
  factory4_night: 'factory4_day',
  factory_day: 'factory4_day',
  // Predicted from the factory_day rename; not yet observed live.
  factory_night: 'factory4_day',
  rezerv_base: 'rezervbase',
  shopping_mall: 'interchange',
  city: 'tarkovstreets',
  sandbox_high: 'sandbox',
};

export function isKnownMapCode(code: string): boolean {
  return Object.hasOwn(TARKOV_MAPS, code) || Object.hasOwn(MAP_ALIASES, code);
}

/** Resolve a raw log id to the map it renders as; unknown ids pass through. */
export function canonicalMapCode(code: string): TarkovMapCode | string {
  return Object.hasOwn(MAP_ALIASES, code) ? MAP_ALIASES[code]! : code;
}

export function mapInfo(code: TarkovMapCode): TarkovMapInfo {
  return TARKOV_MAPS[code];
}

export function mapSvgPath(code: TarkovMapCode, basePath = '/maps'): string {
  return `${basePath}/${TARKOV_MAPS[code].svgFile}`;
}

export const MAP_CODES = Object.keys(TARKOV_MAPS) as TarkovMapCode[];

export const FACTION_COLORS = {
  pmc: '#22c55e',
  scav: '#eab308',
  shared: '#22d3ee',
  // Map-to-map transit points: not a real faction (PMC-only mechanic), but
  // riding the faction pipeline gives icons/tooltips/filtering for free.
  transit: '#f97316',
} as const satisfies Record<string, string>;

export type FactionKey = keyof typeof FACTION_COLORS;

export const FACTION_LABELS: Readonly<Record<FactionKey, string>> = {
  pmc: 'ЧВК',
  scav: 'Дикие',
  shared: 'Общие',
  transit: 'Переходы',
};
