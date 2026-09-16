import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse as parseYaml } from 'yaml';

// Plain .mjs, not .ts, and resolved from the project root: this module is
// imported both by `src/content.config.ts` and by `note-index.mjs`, which runs
// inside the markdown plugin where `getCollection` is unavailable and where the
// bundled module's own URL no longer points at the source tree.
const REGISTRY_PATH = join(process.cwd(), 'src', 'content', 'domains.yaml');

function load() {
  const raw = parseYaml(readFileSync(REGISTRY_PATH, 'utf8')) ?? {};

  return Object.entries(raw).map(([id, entry]) => {
    if (!entry?.name) throw new Error(`domains.yaml: "${id}" is missing a name.`);
    if (!entry?.short) throw new Error(`domains.yaml: "${id}" is missing a short code.`);
    if (entry.short.length > 4) {
      throw new Error(`domains.yaml: "${id}" short code "${entry.short}" is longer than 4 characters.`);
    }
    return {
      id,
      name: entry.name,
      short: entry.short,
      blurb: entry.blurb ?? '',
      hue: entry.hue,
      color: entry.color,
      parent: entry.parent,
    };
  });
}

export const DOMAINS = load();

for (const d of DOMAINS) {
  if (d.parent && !DOMAINS.some((p) => p.id === d.parent)) {
    throw new Error(`domains.yaml: "${d.id}" has parent "${d.parent}", which is not a domain.`);
  }
}

/** Sorted so the colour generator's collision repair is deterministic. */
export const DOMAIN_IDS = DOMAINS.map((d) => d.id).sort();

const byId = new Map(DOMAINS.map((d) => [d.id, d]));

export function getDomain(id) {
  return byId.get(id) ?? null;
}

/** Registry order, which is authored order — not alphabetical. */
export function listDomains() {
  return DOMAINS;
}
