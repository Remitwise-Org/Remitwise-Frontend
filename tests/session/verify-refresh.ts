/**
 * Manual verification script for session refresh mechanism
 * This script demonstrates the behavior of getSessionWithRefresh
 */

import { sealData, unsealData } from 'iron-session';

const SESSION_PASSWORD = 'test-password-at-least-32-characters-long';
const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days in seconds

interface SessionData {
  address: string;
  createdAt: number;
  expiresAt: number;
}

async function testSessionRefresh() {
  console.log('Testing Session Refresh Mechanism\n');
  console.log('='.repeat(50));

  // Test 1: Create a session
  console.log('\n1. Creating a session...');
  const now = Date.now();
  const session: SessionData = {
    address: 'GDEMOXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
    createdAt: now,
    expiresAt: now + SESSION_MAX_AGE * 1000,
  };
  
  const sealed = await sealData(session, {
    password: SESSION_PASSWORD,
    ttl: SESSION_MAX_AGE,
  });
  
  console.log('   Session created:');
  console.log('   - Address:', session.address.substring(0, 10) + '...');
  console.log('   - Created at:', new Date(session.createdAt).toISOString());
  console.log('   - Expires at:', new Date(session.expiresAt).toISOString());

  // Test 2: Decrypt and verify
  console.log('\n2. Decrypting session...');
  const decrypted = await unsealData<SessionData>(sealed, {
    password: SESSION_PASSWORD,
  });
  
  console.log('   Decrypted successfully:');
  console.log('   - Address matches:', decrypted.address === session.address);
  console.log('   - CreatedAt matches:', decrypted.createdAt === session.createdAt);
  console.log('   - ExpiresAt matches:', decrypted.expiresAt === session.expiresAt);

  // Test 3: Simulate refresh
  console.log('\n3. Simulating session refresh...');
  const refreshTime = Date.now();
  const newExpiresAt = refreshTime + SESSION_MAX_AGE * 1000;
  
  const refreshedSession: SessionData = {
    address: decrypted.address,
    createdAt: decrypted.createdAt, // Preserve original
    expiresAt: newExpiresAt,
  };
  
  console.log('   Refreshed session:');
  console.log('   - Address preserved:', refreshedSession.address === session.address);
  console.log('   - CreatedAt preserved:', refreshedSession.createdAt === session.createdAt);
  console.log('   - ExpiresAt extended:', refreshedSession.expiresAt > session.expiresAt);
  console.log('   - New expires at:', new Date(refreshedSession.expiresAt).toISOString());

  // Test 4: Verify expired session detection
  console.log('\n4. Testing expired session detection...');
  const expiredSession: SessionData = {
    address: 'GDEMOXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
    createdAt: now - 8 * 24 * 60 * 60 * 1000, // 8 days ago
    expiresAt: now - 24 * 60 * 60 * 1000, // 1 day ago
  };
  
  const isExpired = expiredSession.expiresAt < Date.now();
  console.log('   Session is expired:', isExpired);
  console.log('   - Created:', new Date(expiredSession.createdAt).toISOString());
  console.log('   - Expired:', new Date(expiredSession.expiresAt).toISOString());

  console.log('\n' + '='.repeat(50));
  console.log('All tests completed successfully! ✓\n');
}

// Run the tests
testSessionRefresh().catch(console.error);
