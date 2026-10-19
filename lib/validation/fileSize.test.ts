import { describe, it, expect } from 'vitest';
import { validateFileSize, MAX_UPLOAD_SIZE_BYTES } from './fileSize';

describe('validateFileSize', () => {
  it('accepts a file exactly at the 25 MiB limit (inclusive boundary)', () => {
    expect(validateFileSize({ size: MAX_UPLOAD_SIZE_BYTES })).toEqual({ ok: true });
  });

  it('accepts a small file', () => {
    expect(validateFileSize({ size: 1024 })).toEqual({ ok: true });
  });

  it('rejects a file one byte over the limit', () => {
    expect(validateFileSize({ size: MAX_UPLOAD_SIZE_BYTES + 1 })).toEqual({
      ok: false,
      error: 'file_too_large',
      sizeBytes: MAX_UPLOAD_SIZE_BYTES + 1,
      maxSizeBytes: MAX_UPLOAD_SIZE_BYTES,
    });
  });

  it('rejects a file far over the limit', () => {
    const oversized = 100 * 1024 * 1024; // 100 MiB
    expect(validateFileSize({ size: oversized })).toEqual({
      ok: false,
      error: 'file_too_large',
      sizeBytes: oversized,
      maxSizeBytes: MAX_UPLOAD_SIZE_BYTES,
    });
  });

  it('accepts a zero-byte file (empty-file handling is a separate concern)', () => {
    expect(validateFileSize({ size: 0 })).toEqual({ ok: true });
  });

  it('honors a custom max size override', () => {
    const oneKb = 1024;
    expect(validateFileSize({ size: 2048 }, oneKb)).toEqual({
      ok: false,
      error: 'file_too_large',
      sizeBytes: 2048,
      maxSizeBytes: oneKb,
    });
  });
});
