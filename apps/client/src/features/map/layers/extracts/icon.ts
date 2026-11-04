import L from 'leaflet';
import { FACTION_COLORS, type FactionKey } from '@/features/map/maps';

export const EXTRACT_ICON_SIZE = 26;

/** Canonical render order — keeps the two-faction split stable. */
const FACTION_ORDER: ReadonlyArray<FactionKey> = ['pmc', 'scav', 'shared', 'transit'];

/**
 * One hand-drawn shape, four colours. Inline SVG (not an <img>) so the faction
 * colour comes straight from FACTION_COLORS. Shield outline drawn once, reused
 * at three scales (white rim, dark ring, coloured interior), runner glyph on top.
 */
const SHIELD =
  'm3.01 0.996v23.5a1.61 1.61 58.3 0 0 0.891 1.44l11.2 5.61a1.99 1.99 0 0 0 1.78 0l11.2-5.61a1.61 1.61 122 0 0 0.891-1.44v-23.5a0.996 0.996 45 0 0-0.996-0.996h-24a0.996 0.996 135 0 0-0.996 0.996z';

const RUNNER_HEAD =
  'm3325 1240c-31 147-176 242-323 211-147-31-242-176-211-323 31-147 176-242 323-211s242 176 211 323z';
const RUNNER_BODY =
  'm1806 3054h-552c-103 0-186 83.3-186 186s83.3 186 186 186h664c27.1 0 54.8-6.37 79.4-17.8 37.2-17.3 67.6-46.4 86.6-82.8l247-474 226 433v618c0 103 83.3 186 186 186s186-83.3 186-186v-664c0-29.9-7.22-59.4-21-86l-283-544 228-450 59.4 224c17.3 65.3 76.4 111 144 111l528-0.05c82.2 0 149-66.6 149-149 0-82.2-66.7-149-149-149l-413 0.05-140-528c-17.6-70.9-64.5-134-135-170-37.6-19-77.5-28-117-28-17.1-0.01-677 0.12-677 0.12-56.9 0.14-109 33.5-133 83.8l-238 469c-37.2 73.3-7.8 163 65.5 200 21.6 10.9 44.5 16.1 67.1 16.1 54.3 0 107-29.8 133-81.6l197-390h273l-660 1286z';

const DARK = '#000';

function iconSvg(color: string, extraAttrs = ''): string {
  return (
    `<svg viewBox="0 0 32 32" width="${EXTRACT_ICON_SIZE}" height="${EXTRACT_ICON_SIZE}"${extraAttrs}>` +
    `<path d="${SHIELD}" fill="#fff"/>` +
    `<path d="${SHIELD}" transform="matrix(.866 0 0 .872 2.15 2.17)" fill="${DARK}"/>` +
    `<path d="${SHIELD}" transform="matrix(.771 0 0 .776 3.67 3.59)" fill="${color}"/>` +
    `<g transform="translate(.684 -1.01) scale(.00638)" fill="${DARK}">` +
    `<path d="${RUNNER_HEAD}"/><path d="${RUNNER_BODY}"/></g>` +
    `</svg>`
  );
}

// Two factions share one icon split along the `/` diagonal.
const SLICES = ['polygon(0% 0%, 100% 0%, 0% 100%)', 'polygon(100% 0%, 100% 100%, 0% 100%)'];

export function makeIcon(factions: ReadonlyArray<FactionKey>): L.DivIcon {
  const shown = FACTION_ORDER.filter((f) => factions.includes(f)).slice(0, SLICES.length);
  const html =
    shown.length === 1
      ? iconSvg(FACTION_COLORS[shown[0]!])
      : shown
          .map((f, i) =>
            iconSvg(
              FACTION_COLORS[f],
              ` class="extract-icon-slice" style="clip-path: ${SLICES[i]}"`,
            ),
          )
          .join('');
  return L.divIcon({
    html,
    className: 'extract-icon-divicon',
    iconSize: [EXTRACT_ICON_SIZE, EXTRACT_ICON_SIZE],
    iconAnchor: [EXTRACT_ICON_SIZE / 2, EXTRACT_ICON_SIZE / 2],
    // Slightly inside the top edge so the tooltip overlaps the icon a little.
    tooltipAnchor: [0, -EXTRACT_ICON_SIZE / 2 + 6],
  });
}
