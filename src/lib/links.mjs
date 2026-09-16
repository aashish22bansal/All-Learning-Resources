import { readFileSync } from 'node:fs';
import { getNoteIndex, resolveWikilink } from './note-index.mjs';

const WIKILINK = /\[\[([^\]|#]+?)(?:#[^\]|]+?)?(?:\|([^\]]+?))?\]\]/g;

function body(file) {
  const raw = readFileSync(file, 'utf8');
  return raw.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '');
}

/** One sentence of context around a mention, so a backlink says something. */
function excerpt(text, at) {
  const start = text.lastIndexOf('.', at);
  const end = text.indexOf('.', at);
  const slice = text
    .slice(start === -1 ? 0 : start + 1, end === -1 ? text.length : end + 1)
    .replace(/\[\[([^\]|#]+?)(?:#[^\]|]+?)?(?:\|([^\]]+?))?\]\]/g, (_, t, label) => label ?? t)
    .replace(/[*_`>#]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return slice.length > 220 ? `${slice.slice(0, 217)}…` : slice;
}

let cache = null;

/**
 * Walk every note body once, resolve its wikilinks, and build both directions
 * of the link graph plus the unresolved-target report.
 */
export function getLinkGraph() {
  if (cache) return cache;

  const { notes } = getNoteIndex();
  const edges = [];
  const backlinks = new Map(notes.map((n) => [n.slug, []]));
  const broken = [];

  for (const note of notes) {
    const text = body(note.file);
    const seen = new Set();

    for (const match of text.matchAll(WIKILINK)) {
      const target = match[1].trim();
      const resolved = resolveWikilink(target);

      if (!resolved) {
        broken.push({ from: note.slug, target });
        continue;
      }
      if (resolved.slug === note.slug) continue;

      if (!seen.has(resolved.slug)) {
        seen.add(resolved.slug);
        edges.push({ source: note.slug, target: resolved.slug, type: 'mention' });
        backlinks.get(resolved.slug)?.push({
          slug: note.slug,
          title: note.title,
          url: note.url,
          domain: note.domain,
          context: excerpt(text, match.index ?? 0),
        });
      }
    }

    // Prerequisites are declared, directed edges — a different relationship.
    for (const prereq of note.prereqs ?? []) {
      const resolved = resolveWikilink(prereq);
      if (resolved) edges.push({ source: resolved.slug, target: note.slug, type: 'prereq' });
      else broken.push({ from: note.slug, target: prereq, kind: 'prereq' });
    }
  }

  cache = { edges, backlinks, broken };
  return cache;
}

export function getBacklinks(slug) {
  return getLinkGraph().backlinks.get(slug) ?? [];
}

/** Notes nothing links to — reachable only by search or luck. */
export function getOrphans() {
  const { notes } = getNoteIndex();
  const { edges } = getLinkGraph();
  const linkedTo = new Set(edges.map((e) => e.target));
  return notes.filter((n) => !linkedTo.has(n.slug));
}

/** Notes that link nowhere — they never earn a backlink for anything else. */
export function getDeadEnds() {
  const { notes } = getNoteIndex();
  const { edges } = getLinkGraph();
  const linkedFrom = new Set(edges.map((e) => e.source));
  return notes.filter((n) => !linkedFrom.has(n.slug));
}

/**
 * Edges joining two different domains. With one domain these are noise; with
 * twenty they are the most interesting thing in the repository, because they
 * are the connections no filing system would have suggested.
 */
export function getCrossDomainEdges() {
  const { bySlug } = getNoteIndex();
  const { edges } = getLinkGraph();
  const seen = new Set();
  const out = [];

  for (const edge of edges) {
    const from = bySlug.get(edge.source);
    const to = bySlug.get(edge.target);
    if (!from?.domain || !to?.domain || from.domain === to.domain) continue;

    const key = [from.slug, to.slug].sort().join('|');
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ from, to });
  }

  return out;
}
