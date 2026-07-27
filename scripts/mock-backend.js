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
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, Idempotency-Key",
    "Cache-Control": "no-store",
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(payload),
  });
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

function routeRequest(req, res) {
  if (req.method === "OPTIONS") {
    json(res, 204, {});
    return;
  }

  const url = new URL(req.url, "http://localhost");

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

  if (req.method === "GET" && url.pathname === "/api/remittance/quote") {
    const { status, body } = getQuote(url);
    json(res, status, body);
    return;
  }

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
