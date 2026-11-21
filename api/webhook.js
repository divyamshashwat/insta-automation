import { validSignature, commentsToAnswer, replyText, reply, messagesToAnswer, dmText, talkedRecently, sendDM } from "../lib/ig.js";

// Meta's one-time verification handshake when you save the callback URL.
export function GET(request) {
  const p = new URL(request.url).searchParams;
  if (p.get("hub.mode") === "subscribe" && p.get("hub.verify_token") === process.env.VERIFY_TOKEN) {
    return new Response(p.get("hub.challenge"));
  }
  return new Response("Forbidden", { status: 403 });
}

export async function POST(request) {
  const raw = await request.text();
  if (!validSignature(raw, request.headers.get("x-hub-signature-256"), process.env.META_APP_SECRET)) {
    console.warn("bad signature", raw.slice(0, 300));
    return new Response("Bad signature", { status: 401 });
  }
  const payload = JSON.parse(raw);
  console.log("webhook", raw);

  for (const c of commentsToAnswer(payload)) {
    try {
      const r = await reply(c.id, replyText(c), process.env.IG_ACCESS_TOKEN);
      console.log("replied", c.id, r.id);
    } catch (e) {
      console.error(e.message); // still 200 so Meta doesn't retry for 36h
    }
  }

  const token = process.env.IG_ACCESS_TOKEN;
  for (const m of messagesToAnswer(payload)) {
    try {
      let recent = false;
      try {
        recent = await talkedRecently(m.igId, m.senderId, token);
      } catch (e) {
        console.error(e.message); // can't check history: greet anyway rather than stay silent
      }
      if (recent) {
        console.log("dm skipped, already talked in last 24h", m.senderId);
        continue;
      }
      const r = await sendDM(m.igId, m.senderId, dmText(), token);
      console.log("dm sent", m.senderId, r.message_id);
    } catch (e) {
      console.error(e.message);
    }
  }
  return new Response("ok");
}
