import { test } from "node:test";
import assert from "node:assert/strict";
import { localDate, money } from "./format.ts";
test("calendar dates use the caller's local calendar, including month boundaries", () => {
  assert.equal(localDate(new Date(2026, 0, 1, 0, 1)), "2026-01-01");
  assert.equal(localDate(new Date(2024, 1, 29, 23, 59)), "2024-02-29");
});
test("money display keeps Brazilian currency and rounds without changing the amount", () => {
  const value = 80.355;
  assert.equal(money.format(value).replace(/\s/g, " "), "R$ 80,36");
  assert.equal(value, 80.355);
});
