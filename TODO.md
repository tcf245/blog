# Blog TODO

Planned work that is agreed but not started. Newest decisions first.

## Planned

- **Dark mode.** Warm dark palette (roughly `#1C1B19` background, `#D6D3CC` text), following
  `prefers-color-scheme`. All colours already live as tokens in `app/globals.css` `@theme`, so this is
  mostly a second set of values plus react-notion-x's `darkMode` / `--fg-color` overrides.
- **Chinese / English bilingual posts.** Each post in both languages, with a switch between them. To
  decide: one Notion page per language linked by a shared key vs. one page with both; URL shape
  (`/en/slug` vs `?lang=en`); `hreflang` alternates. The `Lang` property and the `lang` attribute on
  `<article>` are already in place.

## Low priority

- **Self-host post images.** Images load from Notion (`img.notionusercontent.com`, signed URLs that
  expire after an hour, 180 KB PNGs). Copy them to our own storage (e.g. R2) at build time and serve
  resized WebP.
