// Session authentication utilities

import { Session } from '@/lib/types/savings-goals';
import { NextRequest } from 'next/server';

/**
 * Extract session from request
 * For now, this is a simplified implementation that reads from headers
 * In production, this would integrate with your actual auth system
 */
export function getSessionFromRequest(request: NextRequest): Session | null {
  // Try to get public key from Authorization header
  const authHeader = request.headers.get('authorization');
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const publicKey = authHeader.substring(7);
    if (publicKey && publicKey.length === 56 && publicKey.startsWith('G')) {
      return { publicKey };
    }
  }
  
  // Try to get from custom header
  const publicKeyHeader = request.headers.get('x-stellar-public-key');
  if (publicKeyHeader && publicKeyHeader.length === 56 && publicKeyHeader.startsWith('G')) {
    return { publicKey: publicKeyHeader };
  }
  
  // Try to get from cookie
  const cookies = request.cookies;
  const publicKeyCookie = cookies.get('stellar_public_key');
  if (publicKeyCookie?.value && publicKeyCookie.value.length === 56 && publicKeyCookie.value.startsWith('G')) {
    return { publicKey: publicKeyCookie.value };
  }
  
  return null;
}

/**
 * Validate that a session exists and is valid
 */
export function validateSession(session: Session | null): boolean {
  if (!session) {
    return false;
  }
  
  if (!session.publicKey) {
    return false;
  }
  
  // Validate Stellar public key format
  if (session.publicKey.length !== 56 || !session.publicKey.startsWith('G')) {
    return false;
  }
  
  return true;
}

/**
 * Extract public key from session
 * Throws error if session is invalid
 */
export function getPublicKeyFromSession(session: Session | null): string {
  if (!validateSession(session)) {
    throw new Error('Invalid or missing session');
  }
  
  return session!.publicKey;
}

/**
 * Get session with authentication status
 * @param request NextRequest
 * @returns Session object with authenticated status or null
 */
export async function getSession(request: NextRequest): Promise<{ address: string, authenticated: boolean } | null> {
  const session = getSessionFromRequest(request);
  if (session && session.publicKey) {
    return { address: session.publicKey, authenticated: true };
  }
  return null;
}
