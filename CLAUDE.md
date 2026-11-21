# Instagram auto-reply (@smokeandsilver.in)

Webhook server on Vercel that auto-replies to Instagram comments and DMs.
Production: https://insta-automation-beryl.vercel.app (Vercel project `insta-automation`).

## Files
- `api/webhook.js`: Meta webhook (GET verify handshake, POST signed events → comment replies + DM greeting).
- `lib/ig.js`: signature check, payload parsing, Graph API calls. Tests: `npm test`.
- `api/callback.js`: Facebook Login for Business redirect; exchanges code for token, subscribes account, shows token once.
- `api/setup.js`: one-off, registers app webhook (comments,messages) + subscribes account. Gated by `?key=VERIFY_TOKEN`.
- `api/debug.js`: token scopes, conversations, subscriptions. Gated the same way.
- `privacy.html`: privacy policy URL used for publishing the app.

## Env vars (Vercel, production, all "Secret" so `vercel env pull` can't read them)
`VERIFY_TOKEN`, `META_APP_ID`, `META_APP_SECRET`, `IG_ACCESS_TOKEN`; optional `REPLY_TEXT` (`{username}` placeholder), `DM_REPLY_TEXT`.
Locally only `.env.local` holds `VERIFY_TOKEN` (copy it over privately; not in git). Deploy: `vercel deploy --prod --yes`.

## Meta setup facts
- Meta app "smokeandsilver-autoreply", id 2229352077935854. Unified login config id 1518906250297882.
- New apps can only use "API setup with Unified login": host graph.facebook.com v27.0, token is a never-expiring system-user token (SUAT), comment id arrives as `comment_id`.
- Webhook signature = HMAC-SHA256 with the Meta app secret.
- IG account @smokeandsilver.in id 17841463814032260, owned by portfolio "Smoke And Silver" (capital A, 265126906865633). The app belongs to a different portfolio "Smoke and Silver" (lowercase, 517164800717209). Pick the capital-A one in the login dialog.
- Webhooks only arrive while the app is Published/Live.

## Status (2026-11-21)
- Comment auto-reply: working (top-level comments only; own replies ignored).
- DM auto-reply: code deployed, but Meta delivers no DM events and `/conversations` returns empty. Cause: Standard Access only covers people with a role on the app. Fix in progress: Business Verification + App Review for Advanced Access on `instagram_manage_messages` (also `instagram_basic`, `instagram_manage_comments`). Screencast for review needs a tester account to demo a DM reply.
- The current IG_ACCESS_TOKEN appeared in a screenshot once; rotate it (re-run login link, update Vercel env).

## Working with the user
Non-developer, uses Brave and Meta's dashboards. Give one step at a time with direct links; don't ask them to paste secrets into chat.
