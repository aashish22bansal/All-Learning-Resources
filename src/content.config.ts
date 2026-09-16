import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';
import { DOMAIN_IDS } from './lib/domains.mjs';

export const MASTERY = ['stub', 'learning', 'solid', 'teachable'] as const;

const source = z.object({
  title: z.string(),
  url: z.string().url(),
});

const notes = defineCollection({
  loader: glob({ base: './src/content/notes', pattern: '**/*.md' }),
  schema: z
    .object({
      title: z.string(),
      summary: z.string().optional(),

      // Validated against domains.yaml even while optional, so a typo in a
      // one-line stub still fails the build.
      domain: z.enum(DOMAIN_IDS as [string, ...string[]]).optional(),

      /** Where you came across this — a video, a paper, a post, a person. */
      via: z.string().optional(),

      /** Overrides the filename as the route slug and wikilink key. */
      slug: z.string().optional(),

      /** A note that curates an area, pinned to the top of its domain page. */
      hub: z.boolean().default(false),

      aliases: z.array(z.string()).default([]),
      mastery: z.enum(MASTERY).default('stub'),
      difficulty: z.number().int().min(1).max(5).default(2),
      prereqs: z.array(z.string()).default([]),
      tags: z.array(z.string()).default([]),
      estMinutes: z.number().int().positive().default(5),
      sources: z.array(source).default([]),
      updated: z.coerce.date().optional(),
      draft: z.boolean().default(false),
    })
    .superRefine((data, ctx) => {
      // A stub is a capture, not a claim. It needs a title and nothing else —
      // anything stricter turns "write this down" into a chore and the note
      // never gets written.
      if (data.mastery === 'stub') return;

      const required = [
        ['summary', 'needs a one-line summary'],
        ['domain', 'needs a domain'],
        ['updated', 'needs an updated date'],
      ] as const;

      for (const [field, why] of required) {
        if (data[field] === undefined) {
          ctx.addIssue({
            code: 'custom',
            path: [field],
            message: `"${data.title}" has mastery "${data.mastery}" but ${why}.`,
          });
        }
      }

      // The gate that keeps the repository verifiable.
      if (data.sources.length === 0) {
        ctx.addIssue({
          code: 'custom',
          path: ['sources'],
          message: `"${data.title}" has mastery "${data.mastery}" but no sources. Any note above "stub" must cite at least one source.`,
        });
      }
    }),
});

export const collections = { notes };
