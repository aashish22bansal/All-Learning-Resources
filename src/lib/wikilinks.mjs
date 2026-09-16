import { defineMdastPlugin } from 'satteri';
import { resolveWikilink } from './note-index.mjs';

/**
 * Sätteri renders `[[target]]` as an ordinary link node whose url is the raw
 * target, so a wikilink is only distinguishable by its shape: a bare reference
 * with no path, protocol, anchor prefix or file extension.
 */
function isBareReference(url) {
  if (!url) return false;
  if (/^[a-z][a-z0-9+.-]*:/i.test(url)) return false; // http:, mailto:, …
  if (url.startsWith('/') || url.startsWith('#') || url.startsWith('.')) return false;
  if (/\.[a-z0-9]{2,5}$/i.test(url)) return false; // looks like a filename
  return true;
}

export function wikilinks() {
  return defineMdastPlugin({
    name: 'knowledge-wikilinks',

    link(node, ctx) {
      if (!isBareReference(node.url)) return;

      const [target, anchor] = node.url.split('#');
      const note = resolveWikilink(target);

      // `[[some-slug]]` arrives with the raw slug as its only text child;
      // `[[some-slug|label]]` carries the label instead.
      const text =
        node.children?.length === 1 && node.children[0].type === 'text'
          ? node.children[0].value
          : null;
      const unlabelled = text === node.url;

      // Mutate through the context rather than returning a replacement node:
      // Astro compiles with positions tracked, and on that path a returned node
      // only contributes its scalar fields — children are re-read from source.
      if (!note) {
        ctx.setProperty(node, 'url', '#');
        ctx.setProperty(node, 'data', {
          hProperties: {
            class: 'wikilink wikilink--broken',
            'data-target': target,
            title: `Unresolved link: ${target}`,
          },
        });
        ctx.report({
          message: `Unresolved wikilink: [[${target}]]`,
          node,
          severity: 'warning',
        });
        return;
      }

      ctx.setProperty(node, 'url', anchor ? `${note.url}#${anchor}` : note.url);
      ctx.setProperty(node, 'data', {
        hProperties: {
          class: 'wikilink',
          'data-slug': note.slug,
          'data-domain': note.domain ?? '',
        },
      });

      if (unlabelled) {
        ctx.setProperty(node, 'children', [{ type: 'text', value: note.title }]);
      }
    },
  });
}
