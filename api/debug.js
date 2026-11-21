import { GRAPH } from "../lib/ig.js";

// Gated diagnostics: token permissions + whether DMs are readable via the API. Never returns the token.
export async function GET(request) {
  if (new URL(request.url).searchParams.get("key") !== process.env.VERIFY_TOKEN) return new Response("Forbidden", { status: 403 });
  const token = process.env.IG_ACCESS_TOKEN;
  const appToken = `${process.env.META_APP_ID}|${process.env.META_APP_SECRET}`;
  const j = (u, h) => fetch(u, h).then((r) => r.json());

  const dbg = await j(`${GRAPH}/debug_token?input_token=${encodeURIComponent(token)}&access_token=${encodeURIComponent(appToken)}`);
  const { data: accounts = [] } = await j(`${GRAPH}/me/assigned_instagram_accounts?fields=id,username`, { headers: { Authorization: `Bearer ${token}` } });
  const ig = accounts[0]?.id;
  const convos = ig
    ? await j(`${GRAPH}/${ig}/conversations?platform=instagram&fields=updated_time,participants,messages.limit(3){from,created_time}`, { headers: { Authorization: `Bearer ${token}` } })
    : null;
  const convosNoPlatform = ig
    ? await j(`${GRAPH}/${ig}/conversations?fields=updated_time,messages.limit(3){from,created_time}`, { headers: { Authorization: `Bearer ${token}` } })
    : null;
  const subs = ig ? await j(`${GRAPH}/${ig}/subscribed_apps`, { headers: { Authorization: `Bearer ${token}` } }) : null;

  return Response.json({
    scopes: dbg.data?.scopes,
    type: dbg.data?.type,
    expires_at: dbg.data?.expires_at,
    valid: dbg.data?.is_valid,
    conversations: convos?.data?.slice(0, 3) ?? convos,
    convosNoPlatform: convosNoPlatform?.data?.slice(0, 3) ?? convosNoPlatform,
    accountSubscriptions: subs,
  });
}
