import { createHmac, timingSafeEqual } from "node:crypto";

export const GRAPH = "https://graph.facebook.com/v27.0"; // Unified login tokens only work on graph.facebook.com

// Meta signs the raw body with the app secret: header is "sha256=<hex>".
export function validSignature(rawBody, header, appSecret) {
  if (!header || !appSecret) return false;
  const expected = "sha256=" + createHmac("sha256", appSecret).update(rawBody).digest("hex");
  const a = Buffer.from(header);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

// Pull new top-level comments from a webhook payload, skipping our own (prevents reply loops).
export function commentsToAnswer(payload) {
  const out = [];
  for (const entry of payload?.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const v = change.value;
      const id = v?.comment_id ?? v?.id; // Unified login sends comment_id
      if (change.field !== "comments" || !id) continue;
      if (v.from?.id === entry.id) continue; // our own reply
      if (v.parent_id) continue; // shortcut: only top-level comments; also means our own replies never trigger a reply
      out.push({ id, text: v.text ?? "", username: v.from?.username ?? "" });
    }
  }
  return out;
}

export function replyText({ username }) {
  const template = process.env.REPLY_TEXT || "Thanks for the comment, @{username}! 🙌";
  return template.replaceAll("{username}", username);
}

export async function reply(commentId, message, token) {
  const res = await fetch(`${GRAPH}/${commentId}/replies`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ message }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(`reply ${commentId} failed: ${JSON.stringify(body)}`);
  return body;
}

// Pull incoming text DMs from a webhook payload. Skips echoes (messages we sent, by bot or by hand),
// reactions/read receipts (no text), and anything sent by our own account.
export function messagesToAnswer(payload) {
  const out = [];
  for (const entry of payload?.entry ?? []) {
    for (const m of entry.messaging ?? []) {
      if (!m.message?.text || m.message.is_echo) continue;
      if (m.sender?.id === entry.id) continue;
      out.push({ igId: entry.id, senderId: m.sender.id, text: m.message.text });
    }
  }
  return out;
}

export function dmText() {
  return process.env.DM_REPLY_TEXT || "Hi! Thanks for your message 🙌 We'll get back to you soon.";
}

// True if our account sent this person anything (bot or human) in the last `hours`,
// so the bot greets once instead of answering every message in a live chat.
export async function talkedRecently(igId, senderId, token, hours = 24) {
  const url = `${GRAPH}/${igId}/conversations?platform=instagram&user_id=${senderId}&fields=messages.limit(20){from,created_time}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const body = await res.json();
  if (!res.ok) throw new Error(`conversations failed: ${JSON.stringify(body)}`);
  const since = Date.now() - hours * 3600e3;
  return (body.data?.[0]?.messages?.data ?? []).some(
    (msg) => msg.from?.id === igId && Date.parse(msg.created_time) > since
  );
}

export async function sendDM(igId, recipientId, text, token) {
  const res = await fetch(`${GRAPH}/${igId}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ recipient: { id: recipientId }, message: { text } }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(`dm to ${recipientId} failed: ${JSON.stringify(body)}`);
  return body;
}
