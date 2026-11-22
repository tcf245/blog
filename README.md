# Minimalist Notion Blog

A clean, minimalist blog build with Next.js (App Router), Tailwind CSS, and Notion as the CMS.

## Features

- 🚀 **Next.js 16** App Router (React 19)
- 🎨 **Tailwind CSS** for styling
- 📝 **Notion as CMS** (write posts in Notion, publish automatically)
- ⚡ **Fast & SEO Friendly** (Server-side rendering / Static generation)
- 📱 **Responsive Design**

## Getting Started

### 1. Environment Setup

Values live in macOS Keychain, not in a `.env` file. `.env.keychain` (committed, no values) maps each name to a Keychain item; start the dev server through `keychain-secret` (from `tcf245/agent-skills/tools`):

```bash
keychain-secret run .env.keychain -- npm run dev
```

On a new machine, store the two values first: `keychain-secret add blog/local/NOTION_TOKEN eric` and `keychain-secret add blog/local/NOTION_DATABASE_ID eric`. Deployments read the same names from the hosting provider's env settings.

- **NOTION_TOKEN**: Your Notion Integration Token (create one at [Notion Developers](https://www.notion.so/my-integrations)).
- **NOTION_DATABASE_ID**: The ID of your Notion database.

### 2. Run Locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser.

## Languages

Posts are bilingual (`en` and `zh`) under `/en/<slug>` and `/zh/<slug>`; `/` and bare `/<slug>` redirect using the `lang` cookie or `Accept-Language`. In Notion `Blog Articles`, create two pages per post sharing the same `Slug` with `Lang` set to `zh` and `en`; each language's list shows only the posts published in that language, so publish the translation soon after the original. Before publishing, run `keychain-secret run .env.keychain -- npm run check:content`: it lists posts not yet in the other language and fails on broken rows or CJK text in code blocks.

## Deployment on Vercel

1. Push your code to a Git repository (GitHub/GitLab/Bitbucket).
2. Import the project into **Vercel**.
3. **IMPORTANT**: In the Vercel Project Settings > **Environment Variables**, add:
   - `NOTION_TOKEN`
   - `NOTION_DATABASE_ID`
4. Deploy!

### Troubleshooting Vercel 404s

If your deployed site returns **404** errors (especially on blog post pages or the home page):

1. **Check Environment Variables**: Ensure `NOTION_TOKEN` and `NOTION_DATABASE_ID` are correctly set in Vercel Project Settings.
2. **Check Notion Permissions**: Ensure your specific Notion Database is **shared** with your Notion Integration (click the `...` menu on the database page -> `Add connections` -> select your integration).
3. **Check Build Logs**: Look at the Vercel build logs. If the token is missing, the build might succeed but generate empty pages or fail to fetch routes.
4. **Check Runtime Logs**: If using dynamic rendering, check the "Functions" logs in Vercel dashboard for errors like "API Response Error".
