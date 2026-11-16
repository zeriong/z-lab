import { test } from "node:test";
import assert from "node:assert/strict";
import { closeTab, createTabs, openTab, toQuery } from "./tab-keys.mjs";

test("open assigns increasing keys", () => {
  const s = openTab(openTab(createTabs(), "a"), "b");
  assert.equal(toQuery(s), "t1,t2");
});

test("close keeps keys", () => {
  let s = createTabs();
  for (const t of ["a", "b", "c"]) s = openTab(s, t);
  assert.equal(toQuery(closeTab(s, "t2")), "t1,t3");
});
