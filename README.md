# All-Learning-Resources

A knowledge repository built from linked markdown notes, on whatever I happen to be learning — databases, networking, language models, strategy, management, and whatever comes next.

Notes carry one **domain** from an open registry plus free-form tags. Every note above `stub` must cite its sources. The links between notes matter more than the folders they sit in.

## Commands

| Command | What it does |
| --- | --- |
| `npm run new -- "Some title"` | Scaffold a note. `--domain`, `--tags`, `--via`, `--slug` all optional |
| `npm run dev` | Dev server on `localhost:4321` |
| `npm run build` | Integrity report, then build to `dist/` |
| `npm run rebuild` | Clear caches and build — **after any change under `src/lib/`** |
| `npm run verify` | Rebuild, then crawl `dist/` for dead internal links |
| `npm run tidy` | Move notes so their folder matches their `domain` |
| `npm run check:links` | Integrity report that fails on warnings (for CI) |
| `npm run preview` | Serve `dist/` |

`npm run build` does not pick up changes to `src/lib/`, because Astro caches rendered markdown in `node_modules/.astro/data-store.json`. Content edits invalidate it; code edits do not. Use `npm run rebuild`.

## Capturing a note

```
npm run new -- "Context engineering" --domain llms --via "arXiv 2509.01234" --tags agents,prompting
```

A new note is a **stub**, and a stub needs a title and nothing else. No domain, no summary, no sources — capture is never allowed to block on tidiness. Leave off `--domain` and it lands in `_inbox/` and shows up on `/inbox/`.

The rules arrive when you promote it. At `learning` or above, a note must have a summary, a domain, an `updated` date, and at least one source, or **the build fails**. That gate is the whole point: it is what keeps this a repository of things that are actually true rather than a pile of half-remembered claims.

```yaml
---
title: BULK COLLECT and the context switch
summary: One sentence, shown in listings and search results.
domain: databases          # must exist in src/content/domains.yaml
via: 'Oracle docs'         # where you came across it
aliases: ['bulk collect']  # extra wikilink targets
tags: ['plsql', 'performance']
mastery: solid             # stub | learning | solid | teachable
difficulty: 3              # 1-5
prereqs: ['gradient-descent']
estMinutes: 6
hub: false                 # true pins it to the top of its domain page
sources:
  - title: 'Oracle 19c PL/SQL Language Reference'
    url: 'https://docs.oracle.com/...'
updated: 2026-09-17
---
```

## Domains

Add a line to `src/content/domains.yaml` and you have a new domain — with a colour, a page, a filter and schema validation. It is never a code change.

```yaml
robotics:
  name: Robotics
  short: ROB
  blurb: Kinematics, control, perception.
```

Keep them coarse, roughly 8–20. Tags do the fine-grained work: `agents` and `rag` are tags under `llms`, not domains of their own. `/inbox/` flags domains holding fewer than three notes.

Colours are generated, not chosen — each domain takes the widest unused arc of the hue circle, at fixed lightness and chroma per theme. Pin `hue:` to make one permanent. **Colour stops being a reliable identifier somewhere past a dozen domains**, which is why every domain has a `short` code: the text carries the identity, the colour is atmosphere.

## Filing and URLs

Notes live in `src/content/notes/<domain>/<slug>.md`, but **the URL is the filename, not the path**. `notes/llms/context-engineering.md` serves at `/notes/context-engineering/`.

So reclassifying a note is: change its `domain`, run `npm run tidy`. The file moves, the URL does not, and no wikilink breaks. Frontmatter is the source of truth; the folder is derived from it, and drift is reported.

The cost is that **filenames must be globally unique** — a duplicate fails the build. That is a feature: if two notes both want to be `indexes.md`, the name is ambiguous to you as well as to the resolver. Use `b-tree-index` and `inverted-index`, or set an explicit `slug:`.

## Linking

- `[[bulk-collect]]` — renders the target's title
- `[[bulk-collect|BULK COLLECT]]` — renders your label, usually what prose needs
- `[[bulk-collect#limit-is-not-optional]]` — links to a heading

Targets resolve against the slug, the title, and any `aliases`. Unresolved links render in red and are listed by the integrity report — a warning, not an error, because linking to a note you have not written yet is how you record what to write next. `/inbox/` turns each one into a ready-to-paste `npm run new` command.

## Finding things

`Ctrl`/`Cmd` + `K` anywhere opens full-text search over every note, filterable by domain and confidence. `/notes/` has facets for domain, tag and confidence. `/domains/` is the coarse map, `/inbox/` is everything unfinished.

## Stack

Astro 7 with the Sätteri markdown processor, a custom design system, Pagefind 1.5 Component UI for search. Wikilink resolution is a Sätteri mdast plugin in `src/lib/wikilinks.mjs`; the link graph, backlinks, orphans and cross-domain edges come from `src/lib/links.mjs`.

## Status

Foundations complete: open taxonomy, capture pipeline, search, inbox, domain pages, wikilinks with backlinks. Still to come — the force-directed graph, the progress and retention system, learning paths, KaTeX and Mermaid, and runnable SQL/Python cells.
