import { GRAPH } from "../lib/ig.js";

// One-off: registers this server as the app's Instagram webhook (same as the dashboard's "Configure webhooks").
// Gated by VERIFY_TOKEN so only we can trigger it.
export async function GET(request) {
  const url = new URL(request.url);
  if (url.searchParams.get("key") !== process.env.VERIFY_TOKEN) return new Response("Forbidden", { status: 403 });

  const appToken = `${process.env.META_APP_ID}|${process.env.META_APP_SECRET}`;
  const subUrl = `${GRAPH}/${process.env.META_APP_ID}/subscriptions`;
  const set = await fetch(subUrl, {
    method: "POST",
    body: new URLSearchParams({
      object: "instagram",
      callback_url: `${url.origin}/api/webhook`,
      verify_token: process.env.VERIFY_TOKEN,
      fields: "comments,messages",
      include_values: "true",
      access_token: appToken,
    }),
  }).then((r) => r.json());
  const current = await fetch(`${subUrl}?access_token=${encodeURIComponent(appToken)}`).then((r) => r.json());

  // Subscribe each connected Instagram account to the same fields, using the stored token.
  const auth = { Authorization: `Bearer ${process.env.IG_ACCESS_TOKEN}` };
  const { data: accounts = [] } = await fetch(`${GRAPH}/me/assigned_instagram_accounts?fields=id,username`, { headers: auth }).then((r) => r.json());
  const accountSubs = [];
  for (const a of accounts) {
    const sub = await fetch(`${GRAPH}/${a.id}/subscribed_apps?subscribed_fields=comments,messages`, { method: "POST", headers: auth }).then((r) => r.json());
    accountSubs.push({ username: a.username, ...sub });
  }
  return Response.json({ set, current, accountSubs });
}
