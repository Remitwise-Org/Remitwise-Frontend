import { sanitizeFilename } from './sanitize-filename';

describe('sanitizeFilename', () => {
  it('preserves simple alphanumeric names', () => {
    const result = sanitizeFilename('photo.png');
    expect(result).toMatch(/^\d+-photo\.png$/);
  });

  it('strips path traversal sequences', () => {
    const result = sanitizeFilename('../../etc/passwd');
    expect(result).not.toContain('..');
    expect(result).not.toContain('/');
    expect(result).not.toContain('\\');
  });

  it('replaces special characters with underscores', () => {
    const result = sanitizeFilename('my file #1 (final)$.png');
    expect(result).not.toMatch(/[#$()\s]/);
    expect(result).toMatch(/\.png$/);
  });

  it('strips double extensions – keeps only the last one', () => {
    const result = sanitizeFilename('malware.php.png');
    // stem "malware.php" → "malware_php", ext kept is ".png"
    expect(result).toMatch(/\.png$/);
    expect(result).not.toContain('.php.');
  });

  it('lowercases the extension', () => {
    const result = sanitizeFilename('IMAGE.JPEG');
    expect(result).toMatch(/\.jpeg$/);
  });

  it('adds a timestamp prefix for uniqueness', () => {
    const before = Date.now();
    const result = sanitizeFilename('test.pdf');
    const after = Date.now();
    const ts = parseInt(result.split('-')[0], 10);
    expect(ts).toBeGreaterThanOrEqual(before);
    expect(ts).toBeLessThanOrEqual(after);
  });

  it('handles filenames with no extension', () => {
    const result = sanitizeFilename('Makefile');
    // No extension → result ends with just the sanitized stem
    expect(result).toMatch(/^\d+-Makefile$/);
  });

  it('handles filenames that are only special characters', () => {
    const result = sanitizeFilename('###.png');
    expect(result).toMatch(/\.png$/);
    // stem becomes underscores – still a valid string
    expect(result.length).toBeGreaterThan(0);
  });
});
