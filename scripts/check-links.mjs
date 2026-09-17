/**
 * Pre-build integrity report.
 *
 * Runs independently of the render pipeline, because Sätteri's plugin
 * diagnostics do not surface through Astro's build output.
 *
 * Hard errors (always fail): duplicate slugs. The slug is a note's permanent
 * identity — two notes claiming one means every link to it is a coin flip.
 *
 * Warnings (fail only with --strict): unresolved links, folder/domain drift,
 * orphans. Linking to a note you have not written yet is a legitimate way to
 * record what to write next, so it must never block a build.
 */
import { getNoteIndex } from '../src/lib/note-index.mjs';
import { domainPath } from '../src/lib/domains.mjs';
import { getLinkGraph, getOrphans } from '../src/lib/links.mjs';

const strict = process.argv.includes('--strict');

const dim = (s) => `\x1b[2m${s}\x1b[0m`;
const bold = (s) => `\x1b[1m${s}\x1b[0m`;
const red = (s) => `\x1b[31m${s}\x1b[0m`;
const yellow = (s) => `\x1b[33m${s}\x1b[0m`;
const green = (s) => `\x1b[32m${s}\x1b[0m`;
const tag = dim('[links]');

const { notes, collisions } = getNoteIndex();
const { edges, broken } = getLinkGraph();

console.log(`${tag} ${notes.length} notes, ${edges.length} edges, ${broken.length} unresolved`);

// ---- hard error: duplicate slugs -------------------------------------------

if (collisions.length > 0) {
  console.error(`${tag} ${red('duplicate slugs')} ${dim('— a slug is a permanent identity')}`);
  for (const c of collisions) {
    console.error(`  ${bold(c.slug)}`);
    for (const p of c.paths) console.error(`    ${p}`);
    console.error(dim(`    rename one, or set a distinct "slug:" in its frontmatter`));
  }
  process.exit(1);
}

let warned = false;

// ---- warning: folder does not match domain ---------------------------------

// The folder tree mirrors the registry, so a note's directory must equal its
// domain's parent chain. A tree that lies is worse than no tree.
const drift = notes.filter(
  (n) => n.domain && n.root !== '_inbox' && n.dir !== domainPath(n.domain) && !n.draft,
);

if (drift.length > 0) {
  warned = true;
  console.log(`${tag} ${yellow('folder does not match domain')} ${dim('(run `npm run tidy`)')}`);
  for (const n of drift) console.log(`  ${n.path} ${dim(`→ should be in ${domainPath(n.domain)}/`)}`);
}

// ---- warning: unresolved link targets --------------------------------------

if (broken.length > 0) {
  warned = true;
  const byTarget = new Map();
  for (const b of broken) {
    if (!byTarget.has(b.target)) byTarget.set(b.target, []);
    byTarget.get(b.target).push(b);
  }

  console.log(`${tag} ${yellow('unresolved targets')} ${dim('(each is a note to write)')}`);
  for (const [target, refs] of [...byTarget].sort((a, b) => b[1].length - a[1].length)) {
    console.log(`  ${bold(target)} ${dim(`← ${refs.length} reference${refs.length > 1 ? 's' : ''}`)}`);
    for (const ref of refs) {
      console.log(`    ${dim(ref.kind === 'prereq' ? 'prereq from' : 'linked from')} ${ref.from}`);
    }
  }
}

// ---- warning: orphans ------------------------------------------------------

const orphans = getOrphans().filter((n) => !n.draft);
if (orphans.length > 0) {
  warned = true;
  console.log(`${tag} ${yellow('orphans')} ${dim('(nothing links here)')}`);
  for (const o of orphans) console.log(`  ${o.slug}`);
}

if (!warned) console.log(`${tag} ${green('all links resolve, all folders match')}`);

process.exit(strict && warned ? 1 : 0);
