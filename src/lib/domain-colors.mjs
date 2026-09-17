import { DOMAINS, DOMAIN_IDS, getDomain, childrenOf, rootOf } from './domains.mjs';

/*
  Colour carries two signals: hue is the family, lightness is the member.

  Twenty-odd distinguishable hues do not exist — adjacent hues stop separating
  around 22° apart, and a full circle only holds a dozen or so. But the registry
  is a hierarchy, so hue can identify the *family* while lightness distinguishes
  members within it. Every data-engineering child reads as the same blue at a
  different weight.

  Chroma is not a free parameter. It is clamped to what sRGB can actually show
  at that lightness and hue, because asserting a constant silently hands the
  browser an out-of-gamut colour to map however it likes.
*/

// `from` is the high-contrast end of each band — bright against a dark ground,
// dark against a light one. The root sits there and children step away from it,
// so the most prominent domain always reads strongest in both themes.
const BAND = {
  dark: { from: 0.86, to: 0.66, anchor: 0.78, cmax: 0.13 },
  light: { from: 0.38, to: 0.6, anchor: 0.52, cmax: 0.15 },
};

const MAX_STEP = 0.055; // ~5.5 L*, comfortably above a just-noticeable difference
const FAMILY_HUE_SPREAD = 16; // total degrees across siblings; stays well inside one hue identity

// ---------- sRGB gamut ----------

function inGamut(L, C, H) {
  const h = (H * Math.PI) / 180;
  const a = C * Math.cos(h);
  const b = C * Math.sin(h);

  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;
  const l = l_ ** 3;
  const m = m_ ** 3;
  const s = s_ ** 3;

  const r = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  const g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const bl = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s;

  const eps = 1e-6;
  return [r, g, bl].every((v) => v >= -eps && v <= 1 + eps);
}

/** Largest chroma sRGB can show at this lightness and hue. */
export function maxChroma(L, H) {
  let lo = 0;
  let hi = 0.5;
  for (let i = 0; i < 32; i++) {
    const mid = (lo + hi) / 2;
    if (inGamut(L, mid, H)) lo = mid;
    else hi = mid;
  }
  return lo;
}

// ---------- Hue: one per family ----------

function assignHues() {
  const hues = new Map();

  // Roots first: a pinned hue is authored intent, an unpinned one takes the
  // widest arc still free. Largest-gap placement has no cliff — unlike
  // hash-and-rotate, which silently returns a near-duplicate once the circle
  // saturates.
  const roots = DOMAINS.filter((d) => !d.parent);
  const taken = [];

  for (const d of roots) {
    if (typeof d.hue === 'number') {
      const hue = ((d.hue % 360) + 360) % 360;
      hues.set(d.id, hue);
      taken.push(hue);
    }
  }

  for (const id of DOMAIN_IDS) {
    const d = getDomain(id);
    if (d.parent || hues.has(id)) continue;
    const hue = widestGapMidpoint(taken);
    hues.set(id, hue);
    taken.push(hue);
  }

  // Children sit around their parent's hue, spread just enough to add a second
  // cue without reading as a different colour.
  for (const root of roots) {
    const kids = childrenOf(root.id);
    const base = hues.get(root.id);

    kids.forEach((kid, i) => {
      if (typeof kid.hue === 'number') {
        hues.set(kid.id, ((kid.hue % 360) + 360) % 360);
        return;
      }
      const offset =
        kids.length === 1 ? 0 : -FAMILY_HUE_SPREAD / 2 + (FAMILY_HUE_SPREAD * i) / (kids.length - 1);
      hues.set(kid.id, (((base + offset) % 360) + 360) % 360);
    });
  }

  return hues;
}

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

const HUES = assignHues();

export function domainHue(id) {
  return HUES.get(id) ?? 0;
}

// ---------- Lightness: one per member ----------

/** Root first, then children in registry order. */
export function familyOf(id) {
  const root = rootOf(id);
  return [root, ...childrenOf(root).map((d) => d.id)];
}

function memberLightness(band, index, size) {
  if (size <= 1) return band.anchor;

  const direction = Math.sign(band.to - band.from);
  const available = Math.abs(band.to - band.from);
  const step = Math.min(MAX_STEP, available / (size - 1));

  return +(band.from + direction * step * index).toFixed(4);
}

/** Smallest lightness gap between siblings, for the ladder check. */
export function familyStep(size) {
  if (size <= 1) return Infinity;
  return Math.min(MAX_STEP, Math.abs(BAND.dark.to - BAND.dark.from) / (size - 1));
}

export function swatch(id, theme) {
  const d = getDomain(id);
  if (d?.color) return d.color;

  const band = BAND[theme];
  const family = familyOf(id);
  const L = memberLightness(band, Math.max(0, family.indexOf(id)), family.length);
  const H = domainHue(id);
  const C = Math.min(band.cmax, 0.92 * maxChroma(L, H));

  return `oklch(${L} ${+C.toFixed(4)} ${H})`;
}

/**
 * Inlined in <head> rather than shipped as a stylesheet: ~60 bytes per domain,
 * which beats a second request and can never be stale relative to the registry.
 */
export function domainColorCss() {
  const dark = DOMAIN_IDS.map((id) => `--domain-${id}:${swatch(id, 'dark')};`).join('');
  const light = DOMAIN_IDS.map((id) => `--domain-${id}:${swatch(id, 'light')};`).join('');
  return `:root{${dark}}:root[data-theme='light']{${light}}`;
}
