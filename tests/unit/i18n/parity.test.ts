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
  it('should ensure fr.json contains every translation key in en.json', () => {
    const enPath = path.resolve(process.cwd(), 'lib/i18n/locales/en.json');
    const frPath = path.resolve(process.cwd(), 'lib/i18n/locales/fr.json');
    const enCatalog = JSON.parse(fs.readFileSync(enPath, 'utf8'));
    const frCatalog = JSON.parse(fs.readFileSync(frPath, 'utf8'));
    const enKeys = getAllKeys(enCatalog);
    assert.deepStrictEqual(
      getAllKeys(frCatalog),
      enKeys,
      'The French translation catalog must contain every English translation key.',
    );
  });
});
