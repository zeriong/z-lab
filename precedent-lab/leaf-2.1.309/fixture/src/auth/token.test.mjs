import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveToken } from "./token.mjs";

test("returns the explicit token", () => {
  assert.equal(resolveToken({ token: "abc" }), "abc");
});
