#!/usr/bin/env node

const http = require("node:http");
const { URL } = require("node:url");

const DEFAULT_PORT = 4010;

function normalizePort(value = process.env.MOCK_BACKEND_PORT) {
  if (value === undefined || value === "") {
    return DEFAULT_PORT;
  }

  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("MOCK_BACKEND_PORT must be an integer between 1 and 65535.");
  }

  return port;
}

function json(res, status, body) {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, Idempotency-Key",
  };

  if (status === 204) {
    res.writeHead(status, headers);
    res.end();
    return;
  }

  const payload = JSON.stringify(body);
  headers["Cache-Control"] = "no-store";
  headers["Content-Type"] = "application/json; charset=utf-8";
  headers["Content-Length"] = Buffer.byteLength(payload);
  res.writeHead(status, headers);
  res.end(payload);
}


function getQuote(url) {
  const amountMinor = Number(url.searchParams.get("amountMinor"));
  const currency = (url.searchParams.get("currency") || "USD").toUpperCase();
  const toCurrency = (url.searchParams.get("toCurrency") || "NGN").toUpperCase();

  if (!Number.isInteger(amountMinor) || amountMinor <= 0) {
    return {
      status: 400,
      body: {
        error: "INVALID_AMOUNT",
        message: "amountMinor must be a positive integer minor-unit amount.",
      },
    };
  }

  const feeMinor = Math.max(100, Math.round(amountMinor * 0.015));
  const rateBps = 1582500;
  const receiveAmountMinor = Math.round(((amountMinor - feeMinor) * rateBps) / 10000);

  return {
    status: 200,
    body: {
      sendAmountMinor: amountMinor,
      receiveAmountMinor,
      feeMinor,
      rateBps,
      currency,
      toCurrency,
      quoteId: `mock-${amountMinor}-${currency}-${toCurrency}`,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      source: "mock",
    },
  };
}

function handleAuthNonce() {
  const nonce = Buffer.from(
    Array.from({ length: 32 }, () => Math.floor(Math.random() * 256))
  ).toString("hex");
  return {
    status: 200,
    body: { nonce, expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString() },
  };
}

function handleAuthLogin() {
  return {
    status: 200,
    body: {
      token: "mock-session-token",
      address: "GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    },
  };
}

function handleAuthLogout() {
  return { status: 200, body: { success: true } };
}

function handleTransactions(url) {
  const limit = Math.min(Number(url.searchParams.get("limit")) || 20, 100);
  const items = Array.from({ length: limit }, (_, i) => ({
    id: `mock-tx-${i + 1}`,
    type: i % 3 === 0 ? "send" : i % 3 === 1 ? "split" : "bill",
    amountMinor: 25000 + i * 10000,
    currency: "USD",
    status: "completed",
    recipientName: `Recipient ${i + 1}`,
    createdAt: new Date(Date.now() - i * 86400000).toISOString(),
  }));

  return {
    status: 200,
    body: { data: items, hasMore: limit === 20 },
  };
}

function handleSplit() {
  return {
    status: 200,
    body: {
      allocations: [
        { recipient: "GXXX…SAVE", label: "Savings", percentBps: 2000 },
        { recipient: "GXXX…BILL", label: "Bills", percentBps: 3000 },
        { recipient: "GXXX…FAM", label: "Family", percentBps: 5000 },
      ],
      source: "mock",
    },
  };
}

function handleGoals() {
  return {
    status: 200,
    body: {
      data: [
        {
          id: "mock-goal-1",
          name: "Emergency Fund",
          targetMinor: 500000,
          currentMinor: 125000,
          currency: "USD",
          deadline: new Date(Date.now() + 180 * 86400000).toISOString(),
        },
        {
          id: "mock-goal-2",
          name: "Education",
          targetMinor: 2000000,
          currentMinor: 450000,
          currency: "USD",
          deadline: new Date(Date.now() + 365 * 86400000).toISOString(),
        },
      ],
      hasMore: false,
      source: "mock",
    },
  };
}

function handleBills() {
  return {
    status: 200,
    body: {
      data: [
        {
          id: "mock-bill-1",
          name: "Electricity",
          amountMinor: 8500,
          currency: "USD",
          dueDate: new Date(Date.now() + 15 * 86400000).toISOString(),
          status: "pending",
          recurring: true,
          frequencyDays: 30,
        },
        {
          id: "mock-bill-2",
          name: "Internet",
          amountMinor: 5999,
          currency: "USD",
          dueDate: new Date(Date.now() + 7 * 86400000).toISOString(),
          status: "pending",
          recurring: true,
          frequencyDays: 30,
        },
      ],
      hasMore: false,
      source: "mock",
    },
  };
}

function handleInsurance() {
  return {
    status: 200,
    body: {
      data: [
        {
          id: "mock-policy-1",
          name: "Health Cover",
          coverageType: "health",
          monthlyPremiumMinor: 15000,
          coverageAmountMinor: 5000000,
          currency: "USD",
          status: "active",
        },
      ],
      hasMore: false,
      source: "mock",
    },
  };
}

function handleFamily() {
  return {
    status: 200,
    body: {
      data: [
        {
          id: "mock-member-1",
          name: "Jane Doe",
          role: "spouse",
          spendingLimitMinor: 100000,
          currency: "USD",
          status: "active",
        },
      ],
      hasMore: false,
      source: "mock",
    },
  };
}

async function routeRequest(req, res) {
  if (req.method === "OPTIONS") {
    json(res, 204, {});
    return;
  }

  const url = new URL(req.url, "http://localhost");

  // Health
  if (req.method === "GET" && url.pathname === "/api/health") {
    json(res, 200, {
      status: "ok",
      database: { reachable: true, mode: "mock" },
      rpc: { reachable: true, network: "testnet", latestLedger: 123456 },
      anchor: { reachable: true, mode: "mock" },
      timestamp: new Date().toISOString(),
    });
    return;
  }

  // Dashboard
  if (req.method === "GET" && url.pathname === "/api/dashboard") {
    json(res, 200, {
      balances: {
        availableMinor: 250000,
        pendingMinor: 37500,
        currency: "USD",
      },
      recentTransfers: [
        {
          id: "mock-transfer-1",
          recipientName: "Ada Okafor",
          amountMinor: 75000,
          currency: "USD",
          status: "completed",
        },
      ],
      meta: { source: "mock", fromCache: false },
    });
    return;
  }

  // Remittance quote
  if (req.method === "GET" && url.pathname === "/api/remittance/quote") {
    const { status, body } = getQuote(url);
    json(res, status, body);
    return;
  }

  // Auth — nonce
  if (req.method === "POST" && url.pathname === "/api/auth/nonce") {
    const { status, body } = handleAuthNonce();
    json(res, status, body);
    return;
  }

  // Auth — login
  if (req.method === "POST" && url.pathname === "/api/auth/login") {
    const { status, body } = handleAuthLogin();
    json(res, status, body);
    return;
  }

  // Auth — logout
  if (req.method === "POST" && url.pathname === "/api/auth/logout") {
    const { status, body } = handleAuthLogout();
    json(res, status, body);
    return;
  }

  // Transactions
  if (req.method === "GET" && url.pathname === "/api/transactions") {
    const { status, body } = handleTransactions(url);
    json(res, status, body);
    return;
  }

  // Split
  if (req.method === "GET" && url.pathname === "/api/split") {
    const { status, body } = handleSplit();
    json(res, status, body);
    return;
  }

  // Goals
  if (req.method === "GET" && url.pathname === "/api/goals") {
    const { status, body } = handleGoals();
    json(res, status, body);
    return;
  }

  // Bills
  if (req.method === "GET" && url.pathname === "/api/bills") {
    const { status, body } = handleBills();
    json(res, status, body);
    return;
  }

  // Insurance
  if (req.method === "GET" && url.pathname === "/api/insurance") {
    const { status, body } = handleInsurance();
    json(res, status, body);
    return;
  }

  // Family
  if (req.method === "GET" && url.pathname === "/api/family") {
    const { status, body } = handleFamily();
    json(res, status, body);
    return;
  }

  json(res, 404, {
    error: "NOT_FOUND",
    message: `No mock route is configured for ${req.method} ${url.pathname}.`,
  });
}

function createMockBackend() {
  return http.createServer(routeRequest);
}

function start() {
  const port = normalizePort();
  const server = createMockBackend();

  server.listen(port, () => {
    console.log(`RemitWise mock backend listening on http://localhost:${port}`);
  });

  return server;
}

if (require.main === module) {
  try {
    start();
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

module.exports = {
  DEFAULT_PORT,
  createMockBackend,
  normalizePort,
};
