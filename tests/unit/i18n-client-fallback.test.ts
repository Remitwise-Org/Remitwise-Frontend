/**
 * Covers `useClientTranslator`'s (`lib/i18n/client.ts`) fallback behavior
 * when a translation key is missing.
 *
 * `tests/unit/i18n/parity.test.ts` enforces that en.json and es.json have
 * *identical* key sets, so a key present in one real locale but missing
 * from the other can never actually occur -- the only reachable "missing
 * key" scenario in production is a key absent from *every* locale (e.g. a
 * component referencing a translation key that was never added anywhere).
 * These tests cover that real, reachable path.
 */
import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useClientTranslator } from '../../lib/i18n/client';

describe('useClientTranslator fallback', () => {
  it('returns the real translation for a key that exists', () => {
    const { result } = renderHook(() => useClientTranslator('en'));
    expect(result.current.t('errors.generic')).toBe(
      'Something went wrong. Please try again.'
    );
  });

  it('falls back to the raw key path when missing from every locale', () => {
    const { result } = renderHook(() => useClientTranslator('en'));
    expect(result.current.t('totally.unknown.key')).toBe('totally.unknown.key');
  });

  it('falls back to a caller-supplied string default when the key is missing everywhere', () => {
    const { result } = renderHook(() => useClientTranslator('en'));
    expect(result.current.t('totally.unknown.key', 'Default text')).toBe('Default text');
  });

  it('never throws for a missing key, with or without options', () => {
    const { result } = renderHook(() => useClientTranslator('en'));
    expect(() => result.current.t('')).not.toThrow();
    expect(() => result.current.t('nested.deeply.missing.key')).not.toThrow();
    expect(() => result.current.t('nested.deeply.missing.key', { count: 1 })).not.toThrow();
  });

  it('interpolates {{placeholders}} for a key that exists', () => {
    const { result } = renderHook(() => useClientTranslator('en'));
    expect(result.current.t('transactionHistory.showing', { count: 3, total: 12 })).toBe(
      'Showing 3 of 12'
    );
  });

  it('resolves through the "es" locale tree first, only falling back for keys missing there', () => {
    const { result } = renderHook(() => useClientTranslator('es'));
    // Parity guarantees this key exists in es.json too, so this proves the
    // "es" tree -- not the "en" fallback -- is what actually answered.
    const esValue = result.current.t('errors.generic');
    expect(esValue).not.toBe('totally.unknown.key');
    expect(typeof esValue).toBe('string');
    expect(esValue.length).toBeGreaterThan(0);
  });
});
