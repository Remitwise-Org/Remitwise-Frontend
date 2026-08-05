import { describe, it, expect } from "vitest";
import { createServer } from "node:http";
import { once } from "node:events";
// @ts-expect-error -- plain JS script, no type declarations
import { handleRequest } from "../../../scripts/mock-anchor-server.mjs";

// Exercises the real HTTP handler used by `npm run mock:anchor` (not a
// re-implementation of its logic) by spinning up the server on an
// ephemeral port.
async function startServer() {
  const server = createServer((req, res) => {
    handleRequest(req, res).catch((err: unknown) => {
      res.writeHead(500);
      res.end(String(err));
    });
  });
  server.listen(0);
  await once(server, "listening");
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 0;
  return { server, baseUrl: `http://localhost:${port}` };
}

describe("mock anchor server", () => {
  it("serves exchange rates", async () => {
    const { server, baseUrl } = await startServer();
    const res = await fetch(`${baseUrl}/rates`);
    const body = await res.json();
    server.close();

    expect(res.status).toBe(200);
    expect(body).toEqual([{ sell_asset: "USDC", buy_asset: "XLM", price: "9.5" }]);
  });

  it("computes a quote from the requested amount", async () => {
    const { server, baseUrl } = await startServer();
    const res = await fetch(`${baseUrl}/quote?from=USDC&to=XLM&amount=200`);
    const body = await res.json();
    server.close();

    expect(body.sell_amount).toBe("200");
    expect(body.buy_amount).toBe("1900.00");
  });

  it("returns a deposit flow response for the interactive deposit path", async () => {
    const { server, baseUrl } = await startServer();
    const res = await fetch(`${baseUrl}/transactions/deposit/interactive`, {
      method: "POST",
      body: JSON.stringify({ amount: "100" }),
    });
    const body = await res.json();
    server.close();

    expect(res.status).toBe(200);
    expect(body.interactive_url).toContain("mock-deposit-flow");
  });

  it("404s on an unknown path", async () => {
    const { server, baseUrl } = await startServer();
    const res = await fetch(`${baseUrl}/nope`);
    server.close();

    expect(res.status).toBe(404);
  });
});
