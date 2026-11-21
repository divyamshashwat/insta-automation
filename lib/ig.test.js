import { test } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { validSignature, commentsToAnswer, replyText } from "./ig.js";

test("signature", () => {
  const sig = "sha256=" + createHmac("sha256", "s3cret").update("{}").digest("hex");
  assert.ok(validSignature("{}", sig, "s3cret"));
  assert.ok(!validSignature("{}", sig, "wrong"));
  assert.ok(!validSignature("{}", null, "s3cret"));
});

test("filters own comments and thread replies", () => {
  const payload = {
    entry: [{ id: "ME", changes: [
      { field: "comments", value: { comment_id: "1", text: "hi", from: { id: "U", username: "ann" } } },
      { field: "comments", value: { id: "2", text: "thanks", from: { id: "ME", username: "me" } } },
      { field: "comments", value: { id: "3", text: "re", parent_id: "1", from: { id: "U", username: "ann" } } },
    ] }],
  };
  assert.deepEqual(commentsToAnswer(payload), [{ id: "1", text: "hi", username: "ann" }]);
});

test("reply template", () => {
  assert.equal(replyText({ username: "ann" }), "Thanks for the comment, @ann! 🙌");
});

test("DMs: skips echoes, non-text and own messages", async () => {
  const { messagesToAnswer } = await import("./ig.js");
  const payload = {
    entry: [{ id: "ME", messaging: [
      { sender: { id: "U" }, recipient: { id: "ME" }, message: { mid: "a", text: "hello" } },
      { sender: { id: "ME" }, recipient: { id: "U" }, message: { mid: "b", text: "hi back", is_echo: true } },
      { sender: { id: "U" }, recipient: { id: "ME" }, reaction: { reaction: "love" } },
      { sender: { id: "U" }, recipient: { id: "ME" }, read: { mid: "b" } },
    ] }],
  };
  assert.deepEqual(messagesToAnswer(payload), [{ igId: "ME", senderId: "U", text: "hello" }]);
});
