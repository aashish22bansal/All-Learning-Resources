/**
 * Assert every generated domain colour is inside sRGB, and that family members
 * stay far enough apart in lightness to be told apart.
 *
 * This exists because the first palette asserted a fixed chroma per theme and
 * eight of twelve light-theme colours fell outside the gamut — the browser
 * silently mapped them, so the rendered palette was never the authored one.
 * Nothing in the build caught it.
 */
import { DOMAINS } from '../src/lib/domains.mjs';
import { swatch, maxChroma, familyOf, familyStep, domainHue } from '../src/lib/domain-colors.mjs';

const dim = (s) => `\x1b[2m${s}\x1b[0m`;
const red = (s) => `\x1b[31m${s}\x1b[0m`;
const yellow = (s) => `\x1b[33m${s}\x1b[0m`;
const green = (s) => `\x1b[32m${s}\x1b[0m`;
const tag = dim('[colors]');

// A five-member family steps 0.05 and is comfortable; six steps 0.04 and is
// marginal. Warn at six rather than pretend the ladder still works.
const MIN_STEP = 0.045;

let failed = false;
let warned = false;

for (const theme of ['dark', 'light']) {
  for (const d of DOMAINS) {
    const value = swatch(d.id, theme);
    const m = /^oklch\(([\d.]+) ([\d.]+) ([\d.]+)\)$/.exec(value);
    if (!m) continue; // an explicit `color:` override

    const [, L, C, H] = m.map(Number);
    const limit = maxChroma(L, H);
    if (C > limit + 1e-4) {
      failed = true;
      console.error(
        `${tag} ${red('out of gamut')} ${d.id} (${theme}) chroma ${C.toFixed(4)} > max ${limit.toFixed(4)}`,
      );
    }
  }
}

const roots = DOMAINS.filter((d) => !d.parent);
for (const root of roots) {
  const size = familyOf(root.id).length;
  if (size <= 1) continue;
  const step = familyStep(size);
  if (step < MIN_STEP) {
    warned = true;
    console.log(
      `${tag} ${yellow('family at its limit')} ${root.id}: ${size} members, lightness step ${step.toFixed(3)} ${dim('— short codes are carrying the identity here')}`,
    );
  }
}

// Roots still need separable hues from each other; children inherit, so only
// roots are checked.
const hues = roots.map((d) => ({ id: d.id, h: domainHue(d.id) })).sort((a, b) => a.h - b.h);
for (let i = 1; i < hues.length; i++) {
  const gap = hues[i].h - hues[i - 1].h;
  if (gap < 22) {
    warned = true;
    console.log(`${tag} ${yellow('close hues')} ${hues[i - 1].id} and ${hues[i].id} are ${gap}° apart`);
  }
}

if (failed) process.exit(1);
if (!warned) console.log(`${tag} ${green(`${DOMAINS.length} domains, all in gamut, all families separable`)}`);
else console.log(`${tag} ${DOMAINS.length} domains, all in gamut`);
