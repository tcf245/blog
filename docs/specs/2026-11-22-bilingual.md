# Chinese / English bilingual blog

Status: agreed with Eric on 2026-11-22, in progress.

## Decisions (Eric, 2026-11-22)

1. **The reader picks the language, not the author.** A visitor with no explicit choice gets the
   language their browser prefers (`Accept-Language`); a choice made with the switch is remembered.
2. **Never mix languages on a page.** Each language's list shows only posts in that language; no
   "Chinese only" badges, no Chinese post in the English list. The two lists may differ for a while:
   Eric publishes the translation soon after, to keep the gap short (clarified 2026-11-22; an earlier
   reading, "list a slug only when both are published", was wrong).
3. **Translations are drafted by an agent and read by Eric** before he ticks `Published`.
4. **One English UI.** The interface has little text, so it stays English in both languages; there
   is no UI string dictionary. Diagrams we produce and code blocks contain no Chinese, in either
   version. The only Chinese in the chrome is the language switch's own label `中文` (a language is
   named in its own language so readers can find it).

## Content model (Notion `Blog Articles`)

- One Notion page per language. The two pages share the same `Slug`; `Lang` is `zh` or `en`.
- `/<lang>` lists the Published pages with that `Lang`. A slug repeated within one language shows
  the newest row; `ja` and pages without a Slug are not listed.
- Each page keeps its own title, date, tags and body. Images may be the same files; captions are
  translated with the page.

## URLs

| URL | Behaviour |
|---|---|
| `/en`, `/zh` | Home in that language: live posts, newest first |
| `/en/<slug>`, `/zh/<slug>` | The post in that language. If only the other language exists yet, 307 to it (an old link or the switch can land here); if neither, 404 |
| `/` and `/<slug>` | 307 to `/<lang>` or `/<lang>/<slug>`, `lang` from the `lang` cookie, else `Accept-Language` (first `zh*` before any `en*` → `zh`, otherwise `en`). Old links keep working |

The negotiation runs in `proxy.ts` (Next 16's name for middleware).

## UI

- Header: `Eric's Blog` on the left; on the right the language switch `EN · 中文`, current one in the
  heading colour, the other a link. On a post it links to the same slug in the other language, or
  to the other home when there is no translation yet; on home, to the other home. An empty list
  says "No posts in this language yet." Clicking sets the `lang` cookie (1 year).
- All UI text English: `Back`, `Read more`, `Contents`, `← Previous`, `Next →`, `N min read`.
- `<html lang>` is `en` or `zh-CN` from the URL, so fonts and screen readers follow the page.
- Previous / next stay inside the current language.

## Typography

System fonts only, no web fonts. Chinese pages keep line-height 1.8 and
`text-autospace: normal` (gap between CJK and Latin text where supported).

English pages follow how cory.news actually renders (Eric chose it 2026-11-23 after trying
JetBrains Mono NL, Google Sans Code and IBM Plex; monospace read too slowly in long paragraphs):
16.5px on phones and 17.5px from 641px, line-height 1.75, text #172229, 1em between consecutive
paragraphs (lists keep the base spacing), bold headings tracked -0.01em, monospace meta line.

## SEO

Each page's metadata has `alternates.canonical` → its own URL and `alternates.languages`: `en` →
`/en/...`, `zh-CN` → `/zh/...`, `x-default` → `/...` when both versions exist; only its own
language otherwise.

## Checks

- Unit tests (`npm test`) for the list rule, the language negotiation, and CJK detection in code.
- `npm run check:content` reads the live database; it lists slugs not yet published in the other
  language (information), and fails on broken rows (no Slug, unsupported Lang, a slug repeated in one
  language) or CJK characters in a code block. Run it before publishing.
  Diagrams are images and cannot be checked by code; the writing workflow draws them in English.

## Out of scope

Dark mode, RSS, sitemap, a "translation is stale" banner (both versions are edited in the same session).
