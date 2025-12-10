# Minimalist Notion Blog

A clean, minimalist blog build with Next.js (App Router), Tailwind CSS, and Notion as the CMS.

## Features

- 🚀 **Next.js 14** App Router
- 🎨 **Tailwind CSS** for styling
- 📝 **Notion as CMS** (write posts in Notion, publish automatically)
- ⚡ **Fast & SEO Friendly** (Server-side rendering / Static generation)
- 📱 **Responsive Design**

## Getting Started

### 1. Environment Setup

Rename `.env.example` to `.env` (or create one) and add your Notion credentials:

```env
NOTION_TOKEN=secret_xxxxxxxxxxxxxxxxx
NOTION_DATABASE_ID=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

- **NOTION_TOKEN**: Your Notion Integration Token (create one at [Notion Developers](https://www.notion.so/my-integrations)).
- **NOTION_DATABASE_ID**: The ID of your Notion database.

### 2. Run Locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser.

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
