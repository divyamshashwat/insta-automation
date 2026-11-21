import { GRAPH } from "../lib/ig.js";

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);
const page = (html, status = 200) =>
  new Response(`<!doctype html><meta charset="utf-8"><meta name="robots" content="noindex"><body style="font:16px system-ui;max-width:720px;margin:40px auto;padding:0 16px">${html}`, {
    status,
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
  });

async function graph(url, init) {
  const res = await fetch(url, init);
  const body = await res.json();
  if (!res.ok) throw new Error(JSON.stringify(body.error ?? body));
  return body;
}

// Facebook Login for Business redirects here with ?code=... after you connect the Instagram account.
export async function GET(request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  if (url.searchParams.get("state") !== process.env.VERIFY_TOKEN) return page("Bad state", 403);
  if (!code) return page(`Login failed: ${esc(url.searchParams.get("error_description") ?? "no code")}`, 400);

  try {
    const redirect = `${url.origin}${url.pathname}`;
    const { access_token: token } = await graph(
      `${GRAPH}/oauth/access_token?` +
        new URLSearchParams({ client_id: process.env.META_APP_ID, client_secret: process.env.META_APP_SECRET, redirect_uri: redirect, code })
    );
    const auth = { Authorization: `Bearer ${token}` };
    const { data: accounts } = await graph(`${GRAPH}/me/assigned_instagram_accounts?fields=id,username`, { headers: auth });

    const rows = [];
    for (const a of accounts) {
      const sub = await graph(`${GRAPH}/${a.id}/subscribed_apps?subscribed_fields=comments,messages`, { method: "POST", headers: auth });
      rows.push(`<li>@${esc(a.username)} (id ${esc(a.id)}): comments + messages webhooks ${sub.success ? "subscribed ✅" : "NOT subscribed ❌"}</li>`);
    }
    return page(`<h2>Connected</h2><ul>${rows.join("") || "<li>No Instagram accounts were assigned. Log in again and pick your account.</li>"}</ul>
      <p>Copy this token into Vercel as <b>IG_ACCESS_TOKEN</b>, then close this tab. It is shown once and not stored here.</p>
      <textarea readonly rows="5" style="width:100%" onclick="this.select()">${esc(token)}</textarea>`);
  } catch (e) {
    return page(`<h2>Error</h2><pre style="white-space:pre-wrap">${esc(e.message)}</pre>`, 500);
  }
}
