import { createHash } from 'crypto';
import { DataSource } from 'typeorm';
import { AuditLog } from '../src/audit/audit-log.entity';

async function main() {
  const dataSource = new DataSource({
    type: 'postgres',
    url: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : undefined,
    host: process.env.POSTGRES_HOST,
    port: Number(process.env.POSTGRES_PORT) || 5432,
    username: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    database: process.env.POSTGRES_DB,
    entities: [AuditLog],
  });

  await dataSource.initialize();
  const repo = dataSource.getRepository(AuditLog);

  const entries = await repo.find({
    where: { action: 'CONTRACT_EVENT' as any },
    order: { id: 'ASC' },
  });

  console.log(`Found ${entries.length} contract event entries in audit log.\n`);

  let allValid = true;

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const payload = `${entry.txHash}:${entry.contract}:${entry.contractAction}:${entry.blockNumber}:${JSON.stringify(entry.rawEvent || {})}`;
    const expectedHash = createHash('sha256').update(payload).digest('hex');

    const hashOk = entry.chainHash === expectedHash;
    const prevHashOk =
      i === 0
        ? entry.previousHash === null
        : entry.previousHash === entries[i - 1].chainHash;

    const status = hashOk && prevHashOk ? 'OK' : 'TAMPERED';
    if (!hashOk || !prevHashOk) {
      allValid = false;
      console.log(
        `  [${status}] id=${entry.id} tx=${entry.txHash?.substring(0, 16)}... ` +
          `hash=${hashOk ? 'match' : 'MISMATCH'} ` +
          `prevHash=${prevHashOk ? 'chain-ok' : 'BROKEN-CHAIN'}`,
      );
    }
  }

  if (allValid) {
    console.log('\n✓ Hash-chain verification PASSED — all entries are intact.');
    console.log(`  Total entries verified: ${entries.length}`);
    process.exit(0);
  } else {
    console.log('\n✗ Hash-chain verification FAILED — tampering detected!');
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Verification script failed:', err);
  process.exit(1);
});
