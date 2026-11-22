# Chinese / English bilingual blog

Status: agreed with Eric on 2026-11-22, in progress.

## Decisions (Eric, 2026-11-22)

1. **The reader picks the language, not the author.** A visitor with no explicit choice gets the
   language their browser prefers (`Accept-Language`); a choice made with the switch is remembered.
2. **Every post exists in both languages, or not at all.** No single-language posts on the site and
   no "Chinese only" badges. This is guaranteed at the source: a post is published only when both
   versions are written, and the site lists a slug only when both versions are published.
3. **Translations are drafted by an agent and read by Eric** before he ticks `Published`.
4. **One English UI.** The interface has little text, so it stays English in both languages; there
   is no UI string dictionary. Diagrams we produce and code blocks contain no Chinese, in either
   version. The only Chinese in the chrome is the language switch's own label `中文` (a language is
   named in its own language so readers can find it).

## Content model (Notion `Blog Articles`)

- One Notion page per language. The two pages share the same `Slug`; `Lang` is `zh` or `en`.
- A slug is **live** only when one `zh` page and one `en` page with that slug both have
  `Published` ticked. Anything else (one side only, `ja`, duplicates) is not listed and its URLs 404.
- Each page keeps its own title, date, tags and body. Images may be the same files; captions are
  translated with the page.

## URLs

| URL | Behaviour |
|---|---|
| `/en`, `/zh` | Home in that language: live posts, newest first |
| `/en/<slug>`, `/zh/<slug>` | The post in that language. Never redirects, so a shared link shows what was shared |
| `/` and `/<slug>` | 307 to `/<lang>` or `/<lang>/<slug>`, `lang` from the `lang` cookie, else `Accept-Language` (first `zh*` before any `en*` → `zh`, otherwise `en`). Old links keep working |

The negotiation runs in `proxy.ts` (Next 16's name for middleware).

## UI

- Header: `Eric's Blog` on the left; on the right the language switch `EN · 中文`, current one in the
  heading colour, the other a link. On a post it links to the same slug in the other language; on
  home, to the other home. Clicking sets the `lang` cookie (1 year).
- All UI text English: `Back`, `Read more`, `Contents`, `← Previous`, `Next →`, `N min read`.
- `<html lang>` is `en` or `zh-CN` from the URL, so fonts and screen readers follow the page.
- Previous / next stay inside the current language.

## Typography

System fonts only, as now. Chinese pages keep line-height 1.8; English body text uses 1.65.
`text-autospace: normal` on Chinese pages adds the gap between CJK and Latin text where supported.

## SEO

Each page's metadata has `alternates.languages`: `en` → `/en/...`, `zh-CN` → `/zh/...`,
`x-default` → `/...`, and `alternates.canonical` → its own URL.

## Checks

- Unit tests (`npm test`) for the pairing rule, the language negotiation, and CJK detection in code.
- `npm run check:content` reads the live database and fails when a published page has no published
  partner, or a code block in any published page contains CJK characters. Run it before publishing.
  Diagrams are images and cannot be checked by code; the writing workflow draws them in English.

## Out of scope

Dark mode, RSS, sitemap, a "translation is stale" banner (both versions are edited together).
