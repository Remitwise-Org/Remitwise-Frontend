const test = require("node:test");
const assert = require("node:assert/strict");
const { normalizePort } = require("../../scripts/mock-backend");

test("normalizePort returns the configured mock backend port", () => {
  assert.equal(normalizePort("4500"), 4500);
});

test("normalizePort rejects an invalid mock backend port", () => {
  assert.throws(
    () => normalizePort("not-a-port"),
    /MOCK_BACKEND_PORT must be an integer/
  );
});
