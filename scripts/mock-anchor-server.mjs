#!/usr/bin/env node
// Standalone stand-in for the external Anchor API (see lib/anchor/client.ts)
// so a contributor can exercise deposit/withdraw/quote flows locally
// without real ANCHOR_API_BASE_URL/ANCHOR_API_KEY credentials. Point the
// app at it with ANCHOR_API_BASE_URL=http://localhost:4100 in .env.local.
import { createServer } from "node:http";

const RATES = [{ sell_asset: "USDC", buy_asset: "XLM", price: "9.5" }];

function quoteFor(url) {
  const amount = url.searchParams.get("amount") || "0";
  return {
    price: "9.5",
    sell_amount: amount,
    buy_amount: (Number(amount) * 9.5).toFixed(2),
    fee: { total: "0.50", asset: "USDC" },
  };
}

function flowResponse(kind) {
  return {
    id: `mock-${kind}-${Date.now()}`,
    transaction_id: `mock-txn-${Date.now()}`,
    interactive_url: `http://localhost:4100/mock-${kind}-flow`,
  };
}

function readBody(req) {
  return new Promise((resolve) => {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => resolve(body));
  });
}

export async function handleRequest(req, res) {
  const url = new URL(req.url ?? "/", "http://localhost");
  res.setHeader("Content-Type", "application/json");

  if (req.method === "GET" && url.pathname === "/rates") {
    res.writeHead(200);
    res.end(JSON.stringify(RATES));
    return;
  }

  if (req.method === "GET" && url.pathname === "/quote") {
    res.writeHead(200);
    res.end(JSON.stringify(quoteFor(url)));
    return;
  }

  if (req.method === "POST" && url.pathname === "/transactions/deposit/interactive") {
    await readBody(req);
    res.writeHead(200);
    res.end(JSON.stringify(flowResponse("deposit")));
    return;
  }

  if (req.method === "POST" && url.pathname === "/transactions/withdraw/interactive") {
    await readBody(req);
    res.writeHead(200);
    res.end(JSON.stringify(flowResponse("withdraw")));
    return;
  }

  res.writeHead(404);
  res.end(JSON.stringify({ error: "not found" }));
}

const isMain = process.argv[1] && import.meta.url === `file://${process.argv[1]}`;

if (isMain) {
  const port = process.env.MOCK_ANCHOR_PORT ? Number(process.env.MOCK_ANCHOR_PORT) : 4100;
  createServer((req, res) => {
    handleRequest(req, res).catch((err) => {
      res.writeHead(500);
      res.end(JSON.stringify({ error: String(err) }));
    });
  }).listen(port, () => {
    console.log(`Mock Anchor API listening on http://localhost:${port}`);
    console.log(`Set ANCHOR_API_BASE_URL=http://localhost:${port} in .env.local to use it.`);
  });
}
