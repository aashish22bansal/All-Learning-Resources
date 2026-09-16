import { basename } from 'node:path';
import { normalizeKey } from './note-index.mjs';

/**
 * The single definition of a note's slug for Astro collection entries.
 *
 * Must stay identical to the rule in `note-index.mjs`, which computes the same
 * thing from the filesystem for wikilink resolution. If these two drift, links
 * resolve to URLs that were never generated and the build still succeeds.
 */
export function noteSlug(entry) {
  return normalizeKey(entry.data.slug ?? basename(entry.id));
}

export function noteUrl(entry) {
  return `/notes/${noteSlug(entry)}/`;
}
