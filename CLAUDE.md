# CLAUDE.md

RaidMate — Escape from Tarkov map. Single developer, Russian-only UI.

Direction: the map (this Vue app) ships two ways — inside an Xbox Game Bar
widget (C# UWP + WebView2, with a full-trust companion that watches the
game's screenshot and log folders), and as a plain web page for players
who don't use Game Bar. Neither exists yet; today the repo is the map
itself, run in a browser. The old Tauri/Rust backend was removed — it is
in git history (`17f5a09`) if a reference is ever needed.

## Packages

- `apps/client` — the whole app: Vue 3 + Leaflet, plain Vue (no router,
  no store library, no UI kit, no i18n). Settings are module-level
  `persistedRef`s. Map calibration lives in `features/map/maps.ts`, game
  event schemas in `shared/messages.ts`, screenshot/log parsers in
  `features/game/`. The pnpm workspace stays so a future `widget/` (C#)
  can sit next to it; root scripts just forward to the client.
- `apps/client/public/maps/` — git submodule
  ([the-hideout/tarkov-dev-svg-maps](https://github.com/the-hideout/tarkov-dev-svg-maps),
  CC BY-NC-SA 4.0). Don't copy SVGs out of it — keeps the license isolated.
- `apps/client/public/fonts/` — Bender 400/700; `BENDER-LICENSE.txt` must stay.

## Commands

```
pnpm dev                                    # Vite on :5173
pnpm test | pnpm typecheck | pnpm lint      # vitest / vue-tsc / eslint
pnpm format                                 # prettier --check (CI runs it)
```

## Game events

`apps/client/src/shared/host.ts` is the single entry for game events:
`position` `{t, x, y, z, yaw|null}` and `map-change` `{t, rawMapId}`,
validated against `shared/messages.ts`. Subscribers: the player layer and
`useAutoMapSwitch`.

Today's source is the browser itself (`features/game/`): the File System
Access API (Chrome/Edge only) reads the screenshots and Logs folders the
user picks in Settings. Handles live in IndexedDB (`raidmate`/`folders`);
on reload only `queryPermission` is allowed, so a folder can come back as
"needs permission" and wait for a click. `watchers.ts` holds the polling
logic (1 s) over a minimal `DirLike` interface and is unit-tested with
in-memory fakes. To test end-to-end without the native picker, put Origin
Private File System handles (`navigator.storage.getDirectory()`) into that
IndexedDB store. No recycle-bin delete from the browser.

## Map rendering

`useLeafletMap.ts` is a direct port of tarkov-dev's custom CRS (rotation in
`projection`, affine in `transformation`) so their calibration values in
`maps.ts` apply verbatim: `L.marker([z, x])` lands on the right pixel, and a
click's `e.latlng` is already game space (`lat = z`, `lng = x`). Don't "fix"
the formulas. `transform: [scaleX, offsetX, scaleY, offsetY]` feeds
`L.Transformation(scaleX, offsetX, -scaleY, offsetY)`; `bounds` are in-game
`[[x1, z1], [x2, z2]]`.

- `MAP_ALIASES` maps raw log ids (`factory4_night`, `city`, `rezerv_base`,
  `shopping_mall`, `sandbox_high`, …) to a `TARKOV_MAPS` key. A new BSG
  rename = one alias + one case in `parse-log.spec.ts`.
- Floors: top-level `<g>` ids listed in each map's `floors` (top-to-bottom).
  Single-level maps have feature layers as top-level groups, so only toggle
  ids from that allowlist. The default floor stays dimmed under the active
  one (`useFloorSwitcher.ts`).
- Layers are called directly from `MapView.vue`; no registry. Panes
  `extracts` (510) and `player` (540) sit below Leaflet's tooltip pane.
- Extract icons are inline SVG recoloured from `FACTION_COLORS`; one record
  with two factions (PMC+Scav) is drawn as two diagonally clipped copies.
  Two records never share a spot — `extracts-data.spec.ts` fails on records
  closer than 1 m. Labels are always shown (a pinned click-through Game Bar
  widget can't hover).
- `yawOffset` per map corrects the player arrow where BSG re-oriented axes
  without moving coordinates (Factory, patch 1.0.5.0).

## Extracts dataset

`apps/client/src/features/map/data/extracts/<canonicalCode>.json` — flat
array of `{key, name, factions[], position}`, validated by zod on load.
Curated by hand. `name` is Russian; `key` is a stable per-map id.
`factions`: `pmc` / `scav` / `shared` (co-op) / `transit` (map-to-map
transit; a pseudo-faction riding the same pipeline). The initial data came
from the English EFT wiki (which exits exist, factions) joined with
json.tarkov.dev coordinates and Russian names; tarkov.dev's own exit list
carries disabled legacy exits, so don't trust it as a list.

## Reading the game (spec for the future watcher)

The parsers in `features/game/parse-screenshot.ts` / `parse-log.ts` and their
JSON fixtures in `features/game/__fixtures__/` are the executable spec.
Hard-won behaviour any watcher (C# companion, browser) must keep:

- **Paths:** game dir from env `TARKOV_GAME_DIR` > manual > registry
  `InstallLocation` of the EFT uninstall key (HKLM WOW6432Node, HKLM, HKCU;
  set the registry view explicitly). Screenshots: env `TARKOV_SCREENSHOT_DIR`
  > manual > `<Documents>\Escape from Tarkov\Screenshots`, with Documents
  read from `User Shell Folders\Personal` (OneDrive redirection, Cyrillic
  paths). Logs are always `<gameDir>\Logs`. Reject UNC paths. EFT creates
  the Screenshots folder on the first screenshot — poll for it.
- **Screenshots:** react to created/renamed (new name) files only, ~250 ms
  debounce (EFT writes PNGs in chunks), never replay existing files.
  Numbers use `.` regardless of locale; `\d` in .NET also matches non-ASCII
  digits. Yaw = `atan2(2(qw·qy + qz·qx), 1 − 2(qx² + qy²))` in degrees,
  null without a quaternion. Optional "send to recycle bin" deletes only
  files that parsed as Tarkov screenshots, after the position was emitted,
  without UI on failure (file may still be locked).
- **Logs:** follow the newest `log_*` session folder, sorted by a numeric
  tuple — BSG writes the hour without a leading zero, so string sort is
  wrong. Inside it, the highest `… application_NNN.log`. On start, scan the
  last 64 KB backwards for the current map (seed), then tail from EOF: check
  rotation before reading, reset on truncation, carry partial lines, strip
  `\r`, open with full sharing (EFT holds a write handle). Check for a new
  session folder periodically, not only on FS events. Suppress repeated
  identical map ids. Cache the last map-change/position and replay them to a
  client that connects later.

  | Line shape                     | Sample id                       | Note                                   |
  | ------------------------------ | ------------------------------- | -------------------------------------- |
  | `rcid:<id>.scenespreset.asset` | `factory_day`, `city`           | fires ~30 s before raid; needs aliases |
  | `[Transit] Locations:<id>`     | `factory4_day`, `TarkovStreets` | legacy canonical id, no alias needed   |
  | `Location: <id>, Sid:`         | `bigmap`                        | pre-1.0.5.0 logs only                  |

## CI

`checks.yml` (ubuntu): prettier, eslint, typecheck, build, test. Nothing is
released right now. `pnpm/action-setup@v4` reads the pnpm version from
`packageManager`; don't also pass `version:`.

## Conventions

- Terse comments: none, or one short line when the WHY is non-obvious.
- Cross-feature imports go through `@/…`; same-feature stays relative (eslint enforces).
- `persistedRef(key, zodSchema, default)` for anything that should survive a reload.
- Bash (msys2) on this machine flakes on process spawn — prefer PowerShell,
  and just retry an `Exit code 5` / "Отказано в доступе".
