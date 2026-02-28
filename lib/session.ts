/**
 * Wallet-based session: encrypted cookie (iron-session) tying the session to a Stellar address.
 * Env: SESSION_PASSWORD — must be at least 32 characters (e.g. `openssl rand -base64 32`).
 * 
 * @example Protected Route with requireAuth
 * ```typescript
 * import { requireAuth } from '@/lib/session';
 * 
 * export async function GET() {
 *   try {
 *     const { address } = await requireAuth();
 *     // Process authenticated request
 *     return Response.json({ data: 'protected data', user: address });
 *   } catch (res) {
 *     if (res instanceof Response) return res;
 *     throw res;
 *   }
 * }
 * ```
 * 
 * @example Protected Route with manual validation
 * ```typescript
 * import { getSessionWithRefresh, clearSessionCookie } from '@/lib/session';
 * 
 * export async function GET() {
 *   const session = await getSessionWithRefresh();
 *   
 *   if (!session?.address) {
 *     return Response.json(
 *       { error: 'Unauthorized', message: 'Session expired' },
 *       { 
 *         status: 401,
 *         headers: { 'Set-Cookie': clearSessionCookie() }
 *       }
 *     );
 *   }
 *   
 *   // Process authenticated request
 *   return Response.json({ data: 'protected data', user: session.address });
 * }
 * ```
 */

import { sealData, unsealData } from 'iron-session';
import { cookies } from 'next/headers';

const SESSION_COOKIE = 'remitwise_session';
const DEFAULT_SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days in seconds

export interface SessionData {
  address: string;
  createdAt: number;
  expiresAt: number;
}

/**
 * Validate session configuration at startup
 * Checks SESSION_PASSWORD, SESSION_MAX_AGE, and SESSION_REFRESH_ENABLED
 * Logs warnings for invalid values and uses defaults where appropriate
 * @throws Error if SESSION_PASSWORD is missing or too short
 */
export function validateSessionConfig(): void {
  // Validate SESSION_PASSWORD
  const password = process.env.SESSION_PASSWORD;
  if (!password || password.length < 32) {
    throw new Error(
      'SESSION_PASSWORD must be set and at least 32 characters (e.g. openssl rand -base64 32)'
    );
  }
  
  // Validate and log SESSION_MAX_AGE
  const envMaxAge = process.env.SESSION_MAX_AGE;
  if (envMaxAge) {
    const parsed = parseInt(envMaxAge, 10);
    if (isNaN(parsed) || parsed <= 0) {
      console.warn(`Invalid SESSION_MAX_AGE value: ${envMaxAge}, using default 7 days (604800 seconds)`);
    }
  }
  
  // Log SESSION_REFRESH_ENABLED status
  const refreshEnabled = process.env.SESSION_REFRESH_ENABLED === 'true';
  if (refreshEnabled) {
    console.info('Session refresh enabled: sliding window refresh is active');
  } else {
    console.info('Session refresh disabled: sessions will not auto-extend');
  }
}

function getPassword(): string {
  const password = process.env.SESSION_PASSWORD;
  if (!password || password.length < 32) {
    throw new Error(
      'SESSION_PASSWORD must be set and at least 32 characters (e.g. openssl rand -base64 32)'
    );
  }
  return password;
}

/**
 * Get the configured session max age in seconds
 * Reads from SESSION_MAX_AGE environment variable, defaults to 7 days
 * Falls back to default for invalid values
 * @returns Session max age in seconds
 */
function getSessionMaxAge(): number {
  const envMaxAge = process.env.SESSION_MAX_AGE;
  if (envMaxAge) {
    const parsed = parseInt(envMaxAge, 10);
    if (!isNaN(parsed) && parsed > 0) {
      return parsed;
    }
    // Invalid value, fall back to default (warning logged at startup)
  }
  return DEFAULT_SESSION_MAX_AGE;
}

/**
 * Helper function to check if a session is valid based on expiry timestamp
 * @param session - The session data to validate
 * @returns true if current time is before expiresAt, false otherwise
 */
function isSessionValid(session: SessionData): boolean {
  return session.expiresAt > Date.now();
}

/**
 * Truncate wallet address for privacy in logs
 * Shows first 6 and last 4 characters (e.g., "GDEMOX...XXXX")
 * @param address - Full Stellar wallet address
 * @returns Truncated address for logging
 */
function truncateAddress(address: string): string {
  if (address.length <= 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/**
 * Log session expiry event with structured data
 * Includes truncated wallet address and timestamp, no sensitive data
 * @param address - Wallet address
 * @param expiresAt - Expiry timestamp
 */
function logSessionExpiry(address: string, expiresAt: number): void {
  console.info({
    event: 'session_expired',
    address: truncateAddress(address),
    expiresAt: new Date(expiresAt).toISOString(),
    timestamp: new Date().toISOString(),
  });
}

/**
 * Log session refresh event with structured data
 * Includes truncated wallet address and new expiry, no sensitive data
 * @param address - Wallet address
 * @param newExpiresAt - New expiry timestamp after refresh
 */
function logSessionRefresh(address: string, newExpiresAt: number): void {
  console.info({
    event: 'session_refreshed',
    address: truncateAddress(address),
    expiresAt: new Date(newExpiresAt).toISOString(),
    timestamp: new Date().toISOString(),
  });
}

/**
 * Clear the session cookie by setting Max-Age to 0
 * @returns Set-Cookie header string to clear the session
 */
export function clearSessionCookie(): string {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`;
}

export async function getSession(): Promise<SessionData | null> {
  const cookieStore = await cookies();
  const encrypted = cookieStore.get(SESSION_COOKIE)?.value;

  if (!encrypted) return null;

  try {
    const data = await unsealData<SessionData>(encrypted, {
      password: getPassword(),
    });
    
    // Validate session data structure
    if (!data || !data.address || !data.expiresAt) {
      return null;
    }
    
    // Check if session is expired using helper function
    if (!isSessionValid(data)) {
      // Log session expiry event
      logSessionExpiry(data.address, data.expiresAt);
      // Session is expired - return null
      // Note: Cookie clearing is handled by the caller via clearSessionCookie()
      return null;
    }
    
    return data;
  } catch {
    return null;
  }
}

/**
 * Get session with optional refresh mechanism
 * If SESSION_REFRESH_ENABLED is true and session is valid, extends expiresAt
 * @returns SessionData if valid, null if expired or invalid
 */
export async function getSessionWithRefresh(): Promise<SessionData | null> {
  const cookieStore = await cookies();
  const encrypted = cookieStore.get(SESSION_COOKIE)?.value;

  if (!encrypted) return null;

  try {
    const data = await unsealData<SessionData>(encrypted, {
      password: getPassword(),
    });
    
    // Validate session data structure
    if (!data || !data.address || !data.expiresAt) {
      return null;
    }
    
    // Check if session is expired
    if (!isSessionValid(data)) {
      // Log session expiry event
      logSessionExpiry(data.address, data.expiresAt);
      return null;
    }
    
    // Check if refresh is enabled
    const refreshEnabled = process.env.SESSION_REFRESH_ENABLED === 'true';
    
    if (refreshEnabled) {
      // Extend session expiry while preserving createdAt
      const now = Date.now();
      const sessionMaxAge = getSessionMaxAge();
      const newExpiresAt = now + sessionMaxAge * 1000;
      
      const refreshedSession: SessionData = {
        address: data.address,
        createdAt: data.createdAt, // Preserve original createdAt
        expiresAt: newExpiresAt,
      };
      
      // Log session refresh event
      logSessionRefresh(data.address, newExpiresAt);
      
      // Re-seal the session with new expiry
      const sealed = await sealData(refreshedSession, {
        password: getPassword(),
        ttl: sessionMaxAge,
      });
      
      // Update the cookie with new session data
      cookieStore.set({
        name: SESSION_COOKIE,
        value: sealed,
        path: '/',
        httpOnly: true,
        sameSite: 'lax',
        maxAge: sessionMaxAge,
        secure: process.env.NODE_ENV === 'production',
      });
      
      return refreshedSession;
    }
    
    // Refresh disabled, return session as-is
    return data;
  } catch {
    return null;
  }
}

/**
 * Require authentication or throw 401 Response
 * Validates session and returns authenticated user data on success
 * Throws Response with 401 status if session is invalid or expired
 * Throws Response with 410 status if user account is deactivated
 * @returns Object containing the authenticated user's wallet address
 * @throws Response with 401 status and appropriate error message
 */
export async function requireAuth(): Promise<{ address: string }> {
  const cookieStore = await cookies();
  const encrypted = cookieStore.get(SESSION_COOKIE)?.value;

  // No session cookie present
  if (!encrypted) {
    throw new Response(
      JSON.stringify({ error: 'Unauthorized', message: 'Not authenticated' }),
      { 
        status: 401, 
        headers: { 
          'Content-Type': 'application/json',
          'Set-Cookie': clearSessionCookie()
        } 
      }
    );
  }

  try {
    const data = await unsealData<SessionData>(encrypted, {
      password: getPassword(),
    });
    
    // Validate session data structure
    if (!data || !data.address || !data.expiresAt) {
      throw new Response(
        JSON.stringify({ error: 'Unauthorized', message: 'Invalid session' }),
        { 
          status: 401, 
          headers: { 
            'Content-Type': 'application/json',
            'Set-Cookie': clearSessionCookie()
          } 
        }
      );
    }
    
    // Check if session is expired
    if (!isSessionValid(data)) {
      // Log session expiry event
      logSessionExpiry(data.address, data.expiresAt);
      throw new Response(
        JSON.stringify({ error: 'Unauthorized', message: 'Session expired' }),
        { 
          status: 401, 
          headers: { 
            'Content-Type': 'application/json',
            'Set-Cookie': clearSessionCookie()
          } 
        }
      );
    }
    
    // Check if user account is deactivated (soft-deleted)
    // Import prisma dynamically to avoid circular dependencies
    const { prisma } = await import('@/lib/prisma');
    const user = await prisma.user.findUnique({
      where: { stellar_address: data.address },
      select: { deletedAt: true },
    });
    
    if (user?.deletedAt) {
      throw new Response(
        JSON.stringify({ error: 'USER_DEACTIVATED', message: 'User account has been deactivated' }),
        { 
          status: 410, 
          headers: { 
            'Content-Type': 'application/json',
            'Set-Cookie': clearSessionCookie()
          } 
        }
      );
    }
    
    return { address: data.address };
  } catch (error) {
    // If error is already a Response, re-throw it
    if (error instanceof Response) {
      throw error;
    }
    
    // Decryption or other error - treat as invalid session
    throw new Response(
      JSON.stringify({ error: 'Unauthorized', message: 'Invalid session' }),
      { 
        status: 401, 
        headers: { 
          'Content-Type': 'application/json',
          'Set-Cookie': clearSessionCookie()
        } 
      }
    );
  }
}

export async function createSession(address: string): Promise<string> {
  const now = Date.now();
  const sessionMaxAge = getSessionMaxAge();
  const expiresAt = now + sessionMaxAge * 1000;
  const session: SessionData = { address, createdAt: now, expiresAt };
  const sealed = await sealData(session, {
    password: getPassword(),
    ttl: sessionMaxAge,
  });
  return sealed;
}

export function getSessionCookieHeader(sealed: string): string {
  const sessionMaxAge = getSessionMaxAge();
  return `${SESSION_COOKIE}=${sealed}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${sessionMaxAge}${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`;
}
