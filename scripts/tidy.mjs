/**
 * Move notes so their folder matches their frontmatter `domain`.
 *
 * Frontmatter is the source of truth and the folder tree is derived from it, so
 * reclassifying a note is: edit one line, run this. No URL changes and no link
 * breaks, because the route slug is the filename, not the path.
 *
 * Pass --dry to see what would move.
 */
import { mkdirSync, renameSync, rmdirSync, readdirSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { getNoteIndex } from '../src/lib/note-index.mjs';

const dry = process.argv.includes('--dry');

const dim = (s) => `\x1b[2m${s}\x1b[0m`;
const green = (s) => `\x1b[32m${s}\x1b[0m`;

const NOTES_DIR = join(process.cwd(), 'src', 'content', 'notes');
const { notes } = getNoteIndex();

const moves = notes
  .filter((n) => n.domain && n.folder !== n.domain)
  .map((n) => ({
    from: n.file,
    to: join(NOTES_DIR, n.domain, `${basename(n.file)}`),
    label: `${n.path} → ${n.domain}/${basename(n.file)}`,
  }));

if (moves.length === 0) {
  console.log(`${dim('[tidy]')} every note is already in its domain's folder`);
  process.exit(0);
}

for (const m of moves) {
  console.log(`${dry ? dim('would move') : green('moved')} ${m.label}`);
  if (dry) continue;
  mkdirSync(dirname(m.to), { recursive: true });
  renameSync(m.from, m.to);
}

if (!dry) {
  // Clean up folders the moves emptied.
  for (const entry of readdirSync(NOTES_DIR)) {
    const dir = join(NOTES_DIR, entry);
    try {
      if (readdirSync(dir).length === 0) rmdirSync(dir);
    } catch {
      /* not a directory */
    }
  }
}

console.log(`${dim('[tidy]')} ${moves.length} note${moves.length === 1 ? '' : 's'} ${dry ? 'to move' : 'moved'}`);
