/**
 * Verify every internal link in the built site resolves to a file that exists.
 *
 * This is the guard for the class of bug where a route and a link are computed
 * by two different rules: the build succeeds, the pages render, and the links
 * quietly 404. Run it after any change to how slugs or URLs are derived.
 */
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const DIST = join(process.cwd(), 'dist');

const dim = (s) => `\x1b[2m${s}\x1b[0m`;
const red = (s) => `\x1b[31m${s}\x1b[0m`;
const green = (s) => `\x1b[32m${s}\x1b[0m`;

if (!existsSync(DIST)) {
  console.error(red('dist/ does not exist — run the build first.'));
  process.exit(1);
}

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

const files = walk(DIST);
const pages = files.filter((f) => f.endsWith('.html'));
const served = new Set(files.map((f) => '/' + relative(DIST, f).replaceAll(sep, '/')));

/** A request for /notes/x/ is served by dist/notes/x/index.html. */
function resolves(href) {
  const path = href.split(/[?#]/)[0];
  if (served.has(path)) return true;
  const withIndex = path.endsWith('/') ? `${path}index.html` : `${path}/index.html`;
  return served.has(withIndex) || served.has(`${path}.html`);
}

const HREF = /(?:href|src)="(\/[^"]*)"/g;
const failures = [];
let checked = 0;

for (const page of pages) {
  const html = readFileSync(page, 'utf8');
  const from = '/' + relative(DIST, page).replaceAll(sep, '/');

  for (const match of html.matchAll(HREF)) {
    const href = match[1];
    // Pagefind emits its own assets at build time; they are real files, but the
    // component UI also references paths that only exist at runtime.
    if (href.startsWith('//') || href.startsWith('/pagefind/')) continue;
    checked++;
    if (!resolves(href)) failures.push({ from, href });
  }
}

console.log(`${dim('[crawl]')} ${pages.length} pages, ${checked} internal links checked`);

if (failures.length > 0) {
  console.error(`${dim('[crawl]')} ${red(`${failures.length} dead link(s)`)}`);
  for (const f of failures) console.error(`  ${f.href} ${dim(`← ${f.from}`)}`);
  process.exit(1);
}

console.log(`${dim('[crawl]')} ${green('every internal link resolves')}`);
