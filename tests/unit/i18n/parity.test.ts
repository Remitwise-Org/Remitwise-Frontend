import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';

function getAllKeys(obj: any, prefix = ''): string[] {
  let keys: string[] = [];
  for (const key in obj) {
    if (typeof obj[key] === 'object' && obj[key] !== null) {
      keys = keys.concat(getAllKeys(obj[key], `${prefix}${key}.`));
    } else {
      keys.push(`${prefix}${key}`);
    }
  }
  return keys.sort();
}

describe('i18n Locale Key Parity Verification', () => {
  it('should ensure en.json and es.json contain the exact same translation keys', () => {
    const enPath = path.resolve(process.cwd(), 'lib/i18n/locales/en.json');
    const esPath = path.resolve(process.cwd(), 'lib/i18n/locales/es.json');

    const enCatalog = JSON.parse(fs.readFileSync(enPath, 'utf8'));
    const esCatalog = JSON.parse(fs.readFileSync(esPath, 'utf8'));

    const enKeys = getAllKeys(enCatalog);
    const esKeys = getAllKeys(esCatalog);

    assert.deepStrictEqual(enKeys, esKeys, 'The English and Spanish translation catalog keys must be identical.');
  });
});
