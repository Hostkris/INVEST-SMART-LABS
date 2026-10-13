import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { SYMBOLS } from "../src/catalog.js";

test("catalog contains 90 companies and 12 ETFs", () => {
  assert.equal(SYMBOLS.length, 102);
  assert.equal(new Set(SYMBOLS).size, 102);
});

test("deployed frontend connects to its same-origin API automatically", async () => {
  const html = await readFile(new URL("../public/index.html", import.meta.url), "utf8");
  assert.match(html, /feedBase=location\.origin/);
  assert.match(html, /\/api\/quotes/);
  assert.match(html, /\/api\/rates/);
});

test("the backend is configured for a two-hour cron", async () => {
  const config = await readFile(new URL("../wrangler.jsonc", import.meta.url), "utf8");
  assert.match(config, /"0 \*\/2 \* \* \*"/);
});
