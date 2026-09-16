/**
 * Scaffold a note.
 *
 *   npm run new -- "Context engineering" --domain llms --via "arXiv 2509.01234" --tags agents,rag
 *
 * A new note is always a stub, because the schema asks a stub for nothing but a
 * title. Anything more at capture time is friction, and friction is why notes
 * do not get written.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { getNoteIndex, normalizeKey } from '../src/lib/note-index.mjs';
import { DOMAIN_IDS, getDomain } from '../src/lib/domains.mjs';

const dim = (s) => `\x1b[2m${s}\x1b[0m`;
const bold = (s) => `\x1b[1m${s}\x1b[0m`;
const red = (s) => `\x1b[31m${s}\x1b[0m`;
const green = (s) => `\x1b[32m${s}\x1b[0m`;

function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.startsWith('--')) out[arg.slice(2)] = argv[++i] ?? '';
    else out._.push(arg);
  }
  return out;
}

const args = parseArgs(process.argv.slice(2));

let title = args._.join(' ').trim();
if (!title) {
  const rl = createInterface({ input: stdin, output: stdout });
  title = (await rl.question('Title: ')).trim();
  rl.close();
}
if (!title) {
  console.error(red('A title is required.'));
  process.exit(1);
}

const domain = args.domain?.trim() || null;
if (domain && !DOMAIN_IDS.includes(domain)) {
  console.error(`${red(`Unknown domain "${domain}".`)}`);
  console.error(dim(`Known: ${DOMAIN_IDS.join(', ')}`));
  console.error(dim('Add it to src/content/domains.yaml, or leave it off to file in the inbox.'));
  process.exit(1);
}

const slug = normalizeKey(args.slug || title);
if (!slug) {
  console.error(red(`"${title}" does not reduce to a usable slug.`));
  process.exit(1);
}

// A slug is a permanent identity, so a collision is a decision for you to make,
// not something to paper over by appending a number.
const { byKey } = getNoteIndex();
const clash = byKey.get(slug);
if (clash) {
  console.error(red(`"${slug}" is already taken by ${clash.path}`));
  console.error(dim('Pick a more specific title, or pass --slug to choose a different one.'));
  process.exit(1);
}

const tags = (args.tags ?? '')
  .split(',')
  .map((t) => normalizeKey(t))
  .filter(Boolean);

// Local date, not toISOString(): in IST an early-morning capture would
// otherwise be stamped with the previous day.
const now = new Date();
const today = [
  now.getFullYear(),
  String(now.getMonth() + 1).padStart(2, '0'),
  String(now.getDate()).padStart(2, '0'),
].join('-');
const escape = (s) => String(s).replace(/'/g, "''");

const lines = [
  '---',
  `title: '${escape(title)}'`,
  domain ? `domain: ${domain}` : null,
  args.via ? `via: '${escape(args.via)}'` : null,
  tags.length ? `tags: [${tags.map((t) => `'${t}'`).join(', ')}]` : null,
  'mastery: stub',
  `updated: ${today}`,
  '---',
  '',
  '',
].filter((l) => l !== null);

const folder = domain ?? '_inbox';
const dir = join(process.cwd(), 'src', 'content', 'notes', folder);
const file = join(dir, `${slug}.md`);

mkdirSync(dir, { recursive: true });
writeFileSync(file, lines.join('\n'), 'utf8');

const rel = `src/content/notes/${folder}/${slug}.md`;
console.log(`${green('created')} ${bold(rel)}`);
console.log(dim(`  url    /notes/${slug}/`));
console.log(dim(`  link   [[${slug}]]`));
if (domain) console.log(dim(`  domain ${getDomain(domain).name}`));
else console.log(dim('  domain none yet — it will show up in /inbox/'));
