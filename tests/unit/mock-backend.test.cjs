const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const {
  normalizePort,
  createMockBackend,
  DEFAULT_PORT,
} = require("../../scripts/mock-backend");

// --- normalizePort ---

test("normalizePort returns the configured mock backend port", () => {
  assert.equal(normalizePort("4500"), 4500);
});

test("normalizePort rejects an invalid mock backend port", () => {
  assert.throws(
    () => normalizePort("not-a-port"),
    /MOCK_BACKEND_PORT must be an integer/
  );
});

test("normalizePort uses DEFAULT_PORT when no value is provided", () => {
  assert.equal(normalizePort(undefined), DEFAULT_PORT);
});

test("normalizePort uses DEFAULT_PORT for empty string", () => {
  assert.equal(normalizePort(""), DEFAULT_PORT);
});

// --- Server helpers ---

/**
 * Fetch JSON from the mock backend.
 * Uses agent: false to disable keep-alive so connections close immediately.
 */
function fetchJson(port, method, path) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      { hostname: "localhost", port, method, path, agent: false },
      (res) => {
        let data = "";
        res.on("data", (chunk) => {
          data += chunk;
        });
        res.on("end", () => {
          try {
            const body = data ? JSON.parse(data) : null;
            resolve({ status: res.statusCode, headers: res.headers, body });
          } catch (err) {
            reject(err);
          }
        });
      }
    );
    req.on("error", reject);
    req.end();
  });
}

/**
 * Start a mock backend server on a random port, run the test body,
 * then cleanly shut down the server.
 */
async function withServer(testBody) {
  const server = createMockBackend();
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;

  try {
    await testBody(port, server);
  } finally {
    // Forcefully destroy all sockets so the server can close cleanly.
    // server.closeAllConnections() is only available in Node 18.2+.
    if (typeof server.closeAllConnections === "function") {
      server.closeAllConnections();
    }
    server.unref();
    await new Promise((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  }
}

// --- Server integration tests ---

test("mock backend responds to GET /api/health with 200", async () => {
  await withServer(async (port) => {
    const res = await fetchJson(port, "GET", "/api/health");
    assert.equal(res.status, 200);
    assert.equal(res.body.status, "ok");
    assert.equal(res.body.database.mode, "mock");
  });
});

test("mock backend responds to GET /api/dashboard with 200 and balances", async () => {
  await withServer(async (port) => {
    const res = await fetchJson(port, "GET", "/api/dashboard");
    assert.equal(res.status, 200);
    assert.ok(typeof res.body.balances.availableMinor === "number");
    assert.equal(res.body.meta.source, "mock");
  });
});

test("mock backend returns 404 for unknown endpoints", async () => {
  await withServer(async (port) => {
    const res = await fetchJson(port, "GET", "/api/unknown");
    assert.equal(res.status, 404);
    assert.equal(res.body.error, "NOT_FOUND");
  });
});

test("mock backend handles CORS preflight (OPTIONS)", async () => {
  await withServer(async (port) => {
    const res = await fetchJson(port, "OPTIONS", "/api/health");
    assert.equal(res.status, 204);
    assert.equal(res.headers["access-control-allow-origin"], "*");
  });
});

test("POST /api/auth/nonce returns a valid nonce", async () => {
  await withServer(async (port) => {
    const res = await fetchJson(port, "POST", "/api/auth/nonce");
    assert.equal(res.status, 200);
    assert.ok(typeof res.body.nonce === "string");
    assert.ok(res.body.nonce.length > 0);
  });
});

test("POST /api/auth/login returns a mock token", async () => {
  await withServer(async (port) => {
    const res = await fetchJson(port, "POST", "/api/auth/login");
    assert.equal(res.status, 200);
    assert.equal(res.body.token, "mock-session-token");
    assert.ok(typeof res.body.address === "string");
  });
});

test("POST /api/auth/logout returns success", async () => {
  await withServer(async (port) => {
    const res = await fetchJson(port, "POST", "/api/auth/logout");
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
  });
});

test("GET /api/transactions returns paginated list", async () => {
  await withServer(async (port) => {
    const res = await fetchJson(port, "GET", "/api/transactions");
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.data));
    assert.ok(res.body.data.length > 0);
  });
});

test("GET /api/split returns allocations", async () => {
  await withServer(async (port) => {
    const res = await fetchJson(port, "GET", "/api/split");
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.allocations));
    assert.equal(res.body.source, "mock");
  });
});

test("GET /api/goals returns savings goals", async () => {
  await withServer(async (port) => {
    const res = await fetchJson(port, "GET", "/api/goals");
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.data));
    assert.ok(res.body.data.length > 0);
  });
});

test("GET /api/bills returns bills list", async () => {
  await withServer(async (port) => {
    const res = await fetchJson(port, "GET", "/api/bills");
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.data));
    assert.ok(res.body.data.length > 0);
  });
});

test("GET /api/insurance returns policies", async () => {
  await withServer(async (port) => {
    const res = await fetchJson(port, "GET", "/api/insurance");
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.data));
    assert.ok(res.body.data.length > 0);
  });
});

test("GET /api/family returns family members", async () => {
  await withServer(async (port) => {
    const res = await fetchJson(port, "GET", "/api/family");
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.data));
    assert.ok(res.body.data.length > 0);
  });
});

test("GET /api/remittance/quote returns valid quote for valid amount", async () => {
  await withServer(async (port) => {
    const res = await fetchJson(
      port,
      "GET",
      "/api/remittance/quote?amountMinor=10000&currency=USD&toCurrency=NGN"
    );
    assert.equal(res.status, 200);
    assert.ok(typeof res.body.receiveAmountMinor === "number");
    assert.ok(res.body.receiveAmountMinor > 0);
    assert.equal(res.body.source, "mock");
  });
});

test("GET /api/remittance/quote returns 400 for invalid amountMinor", async () => {
  await withServer(async (port) => {
    const res = await fetchJson(
      port,
      "GET",
      "/api/remittance/quote?amountMinor=-1"
    );
    assert.equal(res.status, 400);
    assert.equal(res.body.error, "INVALID_AMOUNT");
  });
});
