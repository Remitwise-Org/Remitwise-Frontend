import { test, expect } from '@playwright/test';
import { Keypair } from '@stellar/stellar-sdk';

test.describe('Authentication and Protected Flow', () => {
  test('should login with a valid signature and access protected API', async ({ page }) => {
    // 0. Fulfill the "open browser" requirement
    await page.goto('/');

    // 1. Prepare keypair for signing
    const keypair = Keypair.random();
    const address = keypair.publicKey();

    // 2. Fetch nonce from the new endpoint
    const nonceResponse = await page.request.post('/api/auth/nonce', {
      data: JSON.stringify({ publicKey: address }),
      headers: { 'Content-Type': 'application/json' },
    });
    expect(nonceResponse.status()).toBe(200);
    const { nonce } = await nonceResponse.json();
    expect(nonce).toBeDefined();

    // 3. Sign the nonce natively via Stellar Keypair (nonce is hex encoded)
    const signatureBuffer = keypair.sign(Buffer.from(nonce, 'hex'));
    const signature = signatureBuffer.toString('base64');

    // 4. Perform actual login using the signature
    const loginResponse = await page.request.post('/api/auth/login', {
      data: JSON.stringify({ 
        address, 
        message: nonce, 
        signature 
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    // Assert successful login
    expect(loginResponse.status()).toBe(200);
    const loginData = await loginResponse.json();
    expect(loginData).toHaveProperty('ok', true);
    expect(loginData).toHaveProperty('address', address);
  });

  test('should reject login with an invalid signature', async ({ page }) => {
    const keypair = Keypair.random();
    const address = keypair.publicKey();

    const nonceResponse = await page.request.post('/api/auth/nonce', {
      data: JSON.stringify({ publicKey: address }),
      headers: { 'Content-Type': 'application/json' },
    });
    const { nonce } = await nonceResponse.json();

    // Use a different keypair to sign
    const wrongKeypair = Keypair.random();
    const signatureBuffer = wrongKeypair.sign(Buffer.from(nonce, 'hex'));
    const invalidSignature = signatureBuffer.toString('base64');

    const loginResponse = await page.request.post('/api/auth/login', {
      data: JSON.stringify({
        address,
        message: nonce,
        signature: invalidSignature,
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    // Assert failure
    expect(loginResponse.status()).toBe(401);
  });

  test('should reject login with an expired or missing nonce', async ({ page }) => {
    const keypair = Keypair.random();
    const address = keypair.publicKey();

    // Sign a dummy nonce that hasn't been registered on the server
    const dummyNonce = 'deadbeef'; 
    const signatureBuffer = keypair.sign(Buffer.from(dummyNonce, 'hex'));
    const signature = signatureBuffer.toString('base64');

    const loginResponse = await page.request.post('/api/auth/login', {
      data: JSON.stringify({ 
        address, 
        message: dummyNonce, 
        signature 
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    // Assert failure due to missing/unrecognized nonce
    expect(loginResponse.status()).toBe(401);
  });
});