/**
 * Move notes so their folder matches their frontmatter `domain`.
 *
 * Frontmatter is the source of truth and the folder tree is derived from it, so
 * reclassifying a note is: edit one line, run this. No URL changes and no link
 * breaks, because the route slug is the filename, not the path.
 *
 * A child domain's notes live inside its parent's folder, so `domain: hadoop`
 * lands in `data-engineering/hadoop/`.
 *
 * Pass --dry to see what would move.
 */
import { mkdirSync, renameSync, rmdirSync, readdirSync, lstatSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { getNoteIndex } from '../src/lib/note-index.mjs';
import { domainPath } from '../src/lib/domains.mjs';

const dry = process.argv.includes('--dry');

const dim = (s) => `\x1b[2m${s}\x1b[0m`;
const green = (s) => `\x1b[32m${s}\x1b[0m`;

const NOTES_DIR = join(process.cwd(), 'src', 'content', 'notes');
const { notes } = getNoteIndex();

const moves = notes
  .filter((n) => n.domain && n.dir !== domainPath(n.domain))
  .map((n) => {
    const target = domainPath(n.domain);
    return {
      from: n.file,
      to: join(NOTES_DIR, target, basename(n.file)),
      label: `${n.path} → ${target}/${basename(n.file)}`,
    };
  });

/**
 * Remove directories the moves emptied, depth first.
 *
 * Has to be post-order: a parent holding only empty children is not itself
 * empty until those children are gone, so a single top-level pass would leave
 * the whole branch behind.
 */
function prune(dir) {
  let empty = true;

  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (lstatSync(full).isDirectory()) {
      if (!prune(full)) empty = false;
    } else {
      empty = false;
    }
  }

  // _inbox is a fixture, not a by-product — it should survive being emptied.
  if (empty && dir !== NOTES_DIR && basename(dir) !== '_inbox') {
    rmdirSync(dir);
    return true;
  }
  return false;
}

if (moves.length === 0) {
  console.log(`${dim('[tidy]')} every note is already in its domain's folder`);
  if (!dry) prune(NOTES_DIR);
  process.exit(0);
}

for (const m of moves) {
  console.log(`${dry ? dim('would move') : green('moved')} ${m.label}`);
  if (dry) continue;
  mkdirSync(dirname(m.to), { recursive: true });
  renameSync(m.from, m.to);
}

if (!dry) prune(NOTES_DIR);

console.log(
  `${dim('[tidy]')} ${moves.length} note${moves.length === 1 ? '' : 's'} ${dry ? 'to move' : 'moved'}`,
);
