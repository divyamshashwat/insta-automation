# Instagram Auto-Reply Bot (@smokeandsilver.in)

Automatically replies to Instagram **comments** and **DMs** for @smokeandsilver.in.

- **Comments:** every new top-level comment gets a reply: *"Thanks for the comment, @username! 🙌"*
- **DMs:** a person who messages gets one greeting per 24 hours: *"Hi! Thanks for your message 🙌 We'll get back to you soon."* (Waiting on Meta App Review before it works for everyone. See [CLAUDE.md](CLAUDE.md).)

## How it works

```
Someone comments / DMs on Instagram
        → Meta sends a webhook to  https://insta-automation-beryl.vercel.app/api/webhook
        → the server checks Meta's signature, then replies via the Instagram Graph API
```

It runs on **Vercel** (serverless, free plan). No computer needs to stay on.

| File | What it does |
|---|---|
| `api/webhook.js` | Receives Meta webhooks and sends replies |
| `lib/ig.js` | Signature check, payload parsing, Instagram API calls |
| `lib/ig.test.js` | Tests (`npm test`) |
| `api/callback.js` | Login redirect: connects the Instagram account, shows a new access token once |
| `api/setup.js`, `api/debug.js` | One-off setup and diagnostics, locked behind `?key=<VERIFY_TOKEN>` |
| `privacy.html` | Privacy policy page Meta requires |

## Setup on a new computer

```bash
gh repo clone divyamshashwat/insta-automation && cd insta-automation
npm i -g vercel && vercel login && vercel link --project insta-automation
```

Then create `.env.local` with the `VERIFY_TOKEN=...` line copied privately from the old computer. All other secrets live in Vercel (Project → Settings → Environment Variables).

## Common tasks

- **Change reply text:** set `REPLY_TEXT` (comments, `{username}` is replaced) or `DM_REPLY_TEXT` in Vercel, then `vercel deploy --prod --yes`.
- **Deploy code changes:** `npm test && vercel deploy --prod --yes`
- **See what's happening:** `vercel logs --environment production`
- **New access token:** open the login link (see CLAUDE.md), pick the "Smoke And Silver" portfolio (capital A) and the Instagram account, then update `IG_ACCESS_TOKEN` in Vercel and redeploy.

## For Claude Code

Read [CLAUDE.md](CLAUDE.md) first: Meta app IDs, portfolio gotchas, current status and how to guide the user.
