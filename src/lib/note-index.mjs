import { readdirSync, readFileSync, statSync } from 'node:fs';
import { basename, join, relative, sep } from 'node:path';
import { parse as parseYaml } from 'yaml';

// Resolved from the project root, not `import.meta.url`: this module gets
// bundled into the build output, where a URL relative to the module would no
// longer point at the source tree.
const NOTES_DIR = join(process.cwd(), 'src', 'content', 'notes');

/** Turn free text into a comparable lookup key: lowercase, non-alphanumerics to hyphens. */
export function normalizeKey(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (entry.endsWith('.md')) out.push(full);
  }
  return out;
}

function readFrontmatter(file) {
  const raw = readFileSync(file, 'utf8');
  const match = /^---\r?\n([\s\S]*?)\r?\n---/.exec(raw);
  if (!match) return {};
  return parseYaml(match[1]) ?? {};
}

let cache = null;

/**
 * Scan the notes directory and build the wikilink resolution index.
 *
 * Read straight from disk rather than through `getCollection`, because the
 * markdown plugin that consumes this runs *during* collection rendering and
 * cannot call back into it.
 *
 * The slug is the filename, not the path, so moving a note between domain
 * folders changes no URL and breaks no link. That makes the filename the note's
 * permanent identity, which is why duplicates are a hard error.
 */
export function getNoteIndex() {
  if (cache) return cache;

  let files = [];
  try {
    files = walk(NOTES_DIR);
  } catch {
    files = []; // no notes yet
  }

  const notes = [];
  const byKey = new Map();
  const bySlug = new Map();
  const collisions = [];

  for (const file of files) {
    const path = relative(NOTES_DIR, file).replaceAll(sep, '/');
    const data = readFrontmatter(file);
    const slug = normalizeKey(data.slug ?? basename(file, '.md'));

    const existing = bySlug.get(slug);
    if (existing) {
      collisions.push({ slug, paths: [existing.path, path] });
      continue;
    }

    const note = {
      slug,
      path,
      folder: path.includes('/') ? path.split('/')[0] : null,
      file,
      url: `/notes/${slug}/`,
      title: data.title ?? slug,
      domain: data.domain ?? null,
      aliases: data.aliases ?? [],
      prereqs: data.prereqs ?? [],
      tags: data.tags ?? [],
      mastery: data.mastery ?? 'stub',
      draft: data.draft ?? false,
    };

    notes.push(note);
    bySlug.set(slug, note);

    // Every way a note may be referred to in a [[wikilink]]. First write wins,
    // which is only safe because slugs are unique and titles/aliases are checked.
    for (const key of [slug, note.title, ...note.aliases]) {
      const norm = normalizeKey(key);
      if (norm && !byKey.has(norm)) byKey.set(norm, note);
    }
  }

  cache = { notes, byKey, bySlug, collisions };
  return cache;
}

export function resolveWikilink(target) {
  return getNoteIndex().byKey.get(normalizeKey(target)) ?? null;
}
