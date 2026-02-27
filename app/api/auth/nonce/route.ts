import { NextRequest, NextResponse } from "next/server";
import { setNonce } from "@/lib/auth-cache";
import { randomBytes } from "crypto";
import { auditLog, createAuditEvent, extractIp, AuditAction } from '@/lib/audit';

export async function POST(request: NextRequest) {
  const { publicKey } = await request.json();

  if (!publicKey) {
    return NextResponse.json(
      { error: "publicKey is required" },
      { status: 400 },
    );
  }

  // Generate a random nonce (32 bytes) and convert to hex
  const nonceBuffer = randomBytes(32);
  const nonce = nonceBuffer.toString("hex");

  // Store nonce in cache for later verification
  setNonce(publicKey, nonce);

  // Log nonce request (optional - can be high volume)
  // Uncomment if you want to track authentication attempts
  await auditLog(
    createAuditEvent(AuditAction.NONCE_REQUESTED, 'success', {
      address: publicKey,
      ip: extractIp(request),
    })
  );

  return NextResponse.json({ nonce });
}
