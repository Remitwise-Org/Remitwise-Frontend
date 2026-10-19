#!/usr/bin/env node
// One-command helper for exercising POST /api/bills against a running
// `npm run dev` locally, without hand-crafting a curl request each time.
//
// The route only *builds* the create-bill transaction (buildCreateBillTx)
// and returns unsigned XDR -- it never submits to the network -- so this
// script needs a StrKey-valid caller but not a funded testnet account.
// `Keypair.random()` gives us a real, validly-checksummed Ed25519 public
// key for that; nothing here is signed or broadcast.
import { Keypair } from "@stellar/stellar-sdk";

const baseUrl = process.env.APP_URL || `http://localhost:${process.env.PORT || 3000}`;
const caller = Keypair.random().publicKey();

const bill = {
  name: "Seeded electricity bill",
  amount: 42.5,
  dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
  recurring: false,
};

console.log(`Seeding a demo bill via ${baseUrl}/api/bills as ${caller}...`);

let response;
try {
  response = await fetch(`${baseUrl}/api/bills`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-user": caller },
    body: JSON.stringify(bill),
  });
} catch (err) {
  console.error(`Could not reach ${baseUrl}. Is \`npm run dev\` running?`);
  console.error(String(err));
  process.exit(1);
}

const rawBody = await response.text();
let body;
try {
  body = JSON.parse(rawBody);
} catch {
  console.error(`Request failed with status ${response.status} and a non-JSON body:`);
  console.error(rawBody.slice(0, 500));
  process.exit(1);
}

if (!response.ok) {
  console.error(`Request failed with status ${response.status}:`, body);
  process.exit(1);
}

console.log("Bill-creation transaction built. Unsigned XDR:\n");
console.log(body.xdr);
