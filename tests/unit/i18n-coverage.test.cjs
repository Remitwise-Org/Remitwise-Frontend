const test = require("node:test");
const assert = require("node:assert/strict");
const {
  flattenKeys,
  computeCoverage,
  badgeColor,
  buildBadgeUrl,
} = require("../../scripts/i18n-coverage.js");

test("flattenKeys flattens a nested tree into dot-path keys", () => {
  const tree = { errors: { generic: "x", network: "y" }, title: "z" };
  assert.deepEqual(flattenKeys(tree).sort(), ["errors.generic", "errors.network", "title"]);
});

test("computeCoverage reports 100% when every English key has a translation", () => {
  const en = { a: "1", b: { c: "2" } };
  const es = { a: "1", b: { c: "2" } };
  assert.deepEqual(computeCoverage(en, es), { total: 2, translated: 2, percentage: 100 });
});

test("computeCoverage reports the correct percentage when keys are missing", () => {
  const en = { a: "1", b: "2", c: "3", d: "4" };
  const es = { a: "1", b: "2" };
  assert.deepEqual(computeCoverage(en, es), { total: 4, translated: 2, percentage: 50 });
});

test("computeCoverage rounds to the nearest whole percent", () => {
  const en = { a: "1", b: "2", c: "3" };
  const es = { a: "1" };
  assert.equal(computeCoverage(en, es).percentage, 33);
});

test("badgeColor thresholds: brightgreen at 100, yellow at 80-99, red below 80", () => {
  assert.equal(badgeColor(100), "brightgreen");
  assert.equal(badgeColor(80), "yellow");
  assert.equal(badgeColor(99), "yellow");
  assert.equal(badgeColor(79), "red");
});

test("buildBadgeUrl embeds the percentage and matching color", () => {
  assert.equal(
    buildBadgeUrl(100),
    "https://img.shields.io/badge/i18n%20coverage-100%25-brightgreen"
  );
  assert.equal(
    buildBadgeUrl(50),
    "https://img.shields.io/badge/i18n%20coverage-50%25-red"
  );
});
