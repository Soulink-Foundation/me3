import test from "node:test";
import assert from "node:assert/strict";

import { parseMe3Json } from "../dist/index.js";

test("parseMe3Json accepts more than three CTA buttons", () => {
  const profile = {
    version: "0.1",
    name: "Kieran Butler",
    buttons: [
      { text: "One", url: "https://example.com/1" },
      { text: "Two", url: "https://example.com/2" },
      { text: "Three", url: "https://example.com/3" },
      { text: "Four", url: "https://example.com/4" },
    ],
  };

  const result = parseMe3Json(JSON.stringify(profile));

  assert.equal(result.valid, true);
  assert.deepEqual(result.errors, []);
  assert.equal(result.profile?.buttons?.length, 4);
});
