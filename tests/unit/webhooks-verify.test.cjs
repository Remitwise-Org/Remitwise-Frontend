const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
let ts;
try {
  ts = require('typescript');
} catch (error) {
  test('webhook verify tests skipped (typescript not installed)', { skip: true }, () => {});
}

function loadVerifyModule() {
  if (!ts) {
    return null;
  }
  const file = path.resolve(__dirname, '../../lib/webhooks/verify.ts');
  const source = fs.readFileSync(file, 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
    },
  });

  const module = { exports: {} };
  const context = {
    module,
    exports: module.exports,
    require,
    __dirname: path.dirname(file),
    __filename: file,
    Buffer,
    console,
    process,
    global,
    setTimeout,
    clearTimeout,
  };

  vm.runInNewContext(outputText, context, { filename: 'verify.js' });
  return module.exports;
}

const loaded = loadVerifyModule();
if (loaded) {
  const { verifySignature } = loaded;

  test('hmac-sha256 verifies hex signature', () => {
    const payload = 'hello world';
    const secret = 'test-secret';
    const signature = crypto.createHmac('sha256', secret).update(payload).digest('hex');

    assert.equal(verifySignature(payload, signature, secret, 'hmac-sha256'), true);
    assert.equal(verifySignature(payload, `sha256=${signature}`, secret, 'hmac-sha256'), true);
    assert.equal(verifySignature(payload, 'deadbeef', secret, 'hmac-sha256'), false);
  });

  test('stripe-v1 verifies timestamped signature', () => {
    const payload = 'payload';
    const secret = 'stripe-secret';
    const timestamp = '1700000000';
    const signedPayload = `${timestamp}.${payload}`;
    const signature = crypto.createHmac('sha256', secret).update(signedPayload).digest('hex');
    const header = `t=${timestamp},v1=${signature}`;

    assert.equal(verifySignature(payload, header, secret, 'stripe-v1'), true);
    assert.equal(verifySignature(payload, `t=${timestamp},v1=deadbeef`, secret, 'stripe-v1'), false);
  });

  test('ed25519 verifies signature', () => {
    const payload = Buffer.from('signed payload');
    const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
    const signature = crypto.sign(null, payload, privateKey).toString('base64');
    const publicKeyPem = publicKey.export({ type: 'spki', format: 'pem' }).toString();

    assert.equal(verifySignature(payload, signature, publicKeyPem, 'ed25519'), true);
    assert.equal(verifySignature(payload, signature, 'not-a-key', 'ed25519'), false);
  });
}
