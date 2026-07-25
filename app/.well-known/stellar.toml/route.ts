import { NextResponse } from "next/server";
import { getSorobanNetworkPassphrase } from "@/lib/contracts/network-resolution";

export async function GET() {
  const {
    STELLAR_TOML_REDIRECT,
    STELLAR_DOCUMENTATION_URL,
    STELLAR_SIGNING_KEY,
    STELLAR_TRANSFER_SERVER,
    STELLAR_WEB_AUTH_ENDPOINT,
    STELLAR_KYC_SERVER,
    STELLAR_ORG_NAME = "RemitWise",
    STELLAR_ORG_URL = "https://remitwise.app",
    STELLAR_ORG_DESCRIPTION = "Stellar-based cross-border remittance platform",
  } = process.env;

  if (STELLAR_TOML_REDIRECT) {
    return NextResponse.redirect(STELLAR_TOML_REDIRECT, 307);
  }

  const networkPassphrase = process.env.STELLAR_NETWORK_PASSPHRASE || getSorobanNetworkPassphrase();

  const lines = [
    `VERSION="2.0.0"`,
    `NETWORK_PASSPHRASE="${networkPassphrase}"`,
    `SIGNING_KEY="${STELLAR_SIGNING_KEY ?? "REPLACE_WITH_PROJECT_PUBLIC_KEY"}"`,
  ];

  if (STELLAR_TRANSFER_SERVER) {
    lines.push(`TRANSFER_SERVER="${STELLAR_TRANSFER_SERVER}"`);
  }
  if (STELLAR_WEB_AUTH_ENDPOINT) {
    lines.push(`WEB_AUTH_ENDPOINT="${STELLAR_WEB_AUTH_ENDPOINT}"`);
  }
  if (STELLAR_KYC_SERVER) {
    lines.push(`KYC_SERVER="${STELLAR_KYC_SERVER}"`);
  }

  // Organization info goes under [DOCUMENTATION] table as per SEP-1
  lines.push("");
  lines.push("[DOCUMENTATION]");
  lines.push(`ORG_NAME="${STELLAR_ORG_NAME}"`);
  lines.push(`ORG_URL="${STELLAR_ORG_URL}"`);
  lines.push(`ORG_DESCRIPTION="${STELLAR_ORG_DESCRIPTION}"`);
  lines.push(`DOCUMENTATION="${STELLAR_DOCUMENTATION_URL ?? "https://remitwise.app/.well-known/stellar.toml"}"`);

  return new Response(`${lines.join("\n")}\n`, {
    headers: {
      "Content-Type": "text/plain",
      "Access-Control-Allow-Origin": "*",
    },
  });
}

