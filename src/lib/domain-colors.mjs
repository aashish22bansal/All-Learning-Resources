import { DOMAINS, DOMAIN_IDS } from './domains.mjs';

// Fixed lightness and chroma per theme, hue varies. OKLCH keeps perceived
// lightness constant across hues, so every domain reads with the same weight
// against the page — which plain HSL does not do.
const DARK = { l: 0.78, c: 0.13 };
const LIGHT = { l: 0.52, c: 0.15 };

/**
 * Place a new hue in the middle of the widest unused arc.
 *
 * The obvious approach — hash the id to a hue, rotate on collision — fails
 * silently at exactly the scale this repository is built for. Keeping hues 22°
 * apart means each one excludes a 44° arc, so twelve domains already exclude
 * 528° of a 360° circle: every candidate collides, the rotation gives up, and
 * you get a near-duplicate colour with no warning.
 *
 * Largest-gap placement has no such cliff. It always yields the best hue still
 * available, and separation shrinks smoothly as domains are added rather than
 * collapsing once the circle saturates.
 */
function widestGapMidpoint(taken) {
  if (taken.length === 0) return 0;

  const sorted = [...taken].sort((a, b) => a - b);
  let best = sorted[0] + 180;
  let widest = -1;

  for (let i = 0; i < sorted.length; i++) {
    const from = sorted[i];
    const to = i === sorted.length - 1 ? sorted[0] + 360 : sorted[i + 1];
    const gap = to - from;
    if (gap > widest) {
      widest = gap;
      best = from + gap / 2;
    }
  }

  return Math.round(best) % 360;
}

/**
 * Pinned hues are authored intent and never move. Everything else is placed
 * around them.
 *
 * Derived hues depend on which other domains exist, so adding a domain can shift
 * another's colour. Pin a `hue:` in the registry once a domain matters enough
 * for its colour to be stable.
 */
function assignHues() {
  const hues = new Map();
  const taken = [];

  for (const d of DOMAINS) {
    if (typeof d.hue === 'number') {
      const hue = ((d.hue % 360) + 360) % 360;
      hues.set(d.id, hue);
      taken.push(hue);
    }
  }

  // Sorted order, so the result does not depend on where in the file a domain
  // was added.
  for (const id of DOMAIN_IDS) {
    if (hues.has(id)) continue;
    const hue = widestGapMidpoint(taken);
    hues.set(id, hue);
    taken.push(hue);
  }

  return hues;
}

const HUES = assignHues();

export function domainHue(id) {
  return HUES.get(id) ?? 0;
}

function swatch(id, { l, c }) {
  const override = DOMAINS.find((d) => d.id === id)?.color;
  return override ?? `oklch(${l} ${c} ${domainHue(id)})`;
}

/**
 * The stylesheet is generated rather than authored, and inlined in <head>:
 * roughly 60 bytes per domain, which beats a second request and can never be
 * stale relative to the registry.
 */
export function domainColorCss() {
  const dark = DOMAIN_IDS.map((id) => `--domain-${id}:${swatch(id, DARK)};`).join('');
  const light = DOMAIN_IDS.map((id) => `--domain-${id}:${swatch(id, LIGHT)};`).join('');
  return `:root{${dark}}:root[data-theme='light']{${light}}`;
}
