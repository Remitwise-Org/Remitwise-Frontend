/**
 * Unit tests for request-id generation and header extraction.
 * Locks: valid format, header preference order, fallback generation.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  generateRequestId,
  isValidRequestId,
  getOrGenerateRequestId,
} from '@/lib/requestId';

describe('generateRequestId', () => {
  beforeEach(() => {
    vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000);
    vi.spyOn(Math, 'random').mockReturnValue(0.123456789);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns_timestamp_random_format', () => {
    const id = generateRequestId();
    // Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 8)
    expect(id).toMatch(/^[a-z0-9]+-[a-z0-9]+$/);
    expect(id.includes('-')).toBe(true);
    expect(id.length).toBeLessThan(50);
  });

  it('produces_stable_value_when_clock_and_rng_are_fixed', () => {
    const a = generateRequestId();
    const b = generateRequestId();
    expect(a).toBe(b);
  });
});

describe('isValidRequestId', () => {
  it('accepts_well_formed_ids', () => {
    expect(isValidRequestId('abc123-def456')).toBe(true);
    expect(isValidRequestId('lz0k0-abc123')).toBe(true);
  });

  it('rejects_non_string_values', () => {
    expect(isValidRequestId(null as unknown as string)).toBe(false);
    expect(isValidRequestId(undefined as unknown as string)).toBe(false);
    expect(isValidRequestId(123 as unknown as string)).toBe(false);
  });

  it('rejects_ids_without_dash_or_with_invalid_chars', () => {
    expect(isValidRequestId('nodash')).toBe(false);
    expect(isValidRequestId('ABC-DEF')).toBe(false); // uppercase
    expect(isValidRequestId('has spaces-here')).toBe(false);
    expect(isValidRequestId('special!@#-chars')).toBe(false);
  });

  it('rejects_ids_that_are_too_long', () => {
    const long = 'a'.repeat(30) + '-' + 'b'.repeat(30);
    expect(isValidRequestId(long)).toBe(false);
  });
});

describe('getOrGenerateRequestId', () => {
  beforeEach(() => {
    vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000);
    vi.spyOn(Math, 'random').mockReturnValue(0.123456789);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns_existing_x_request_id_when_valid', () => {
    const headers = { 'x-request-id': 'incoming-reqid1' };
    expect(getOrGenerateRequestId(headers)).toBe('incoming-reqid1');
  });

  it('prefers_x_request_id_over_other_header_names', () => {
    const headers = {
      'x-request-id': 'first-choice',
      'x-correlation-id': 'second-choice',
      'request-id': 'third-choice',
    };
    expect(getOrGenerateRequestId(headers)).toBe('first-choice');
  });

  it('falls_back_to_x_correlation_id_when_x_request_id_missing', () => {
    const headers = { 'x-correlation-id': 'corr-id123' };
    expect(getOrGenerateRequestId(headers)).toBe('corr-id123');
  });

  it('accepts_array_header_values_and_uses_first_entry', () => {
    const headers = { 'x-request-id': ['array-id01', 'ignored'] };
    expect(getOrGenerateRequestId(headers)).toBe('array-id01');
  });

  it('generates_new_id_when_headers_absent', () => {
    const id = getOrGenerateRequestId(undefined);
    expect(isValidRequestId(id)).toBe(true);
  });

  it('generates_new_id_when_present_header_is_invalid', () => {
    const headers = { 'x-request-id': 'INVALID UPPERCASE' };
    const id = getOrGenerateRequestId(headers);
    expect(id).not.toBe('INVALID UPPERCASE');
    expect(isValidRequestId(id)).toBe(true);
  });

  it('generates_new_id_when_header_value_empty', () => {
    const headers = { 'x-request-id': '' };
    const id = getOrGenerateRequestId(headers);
    expect(isValidRequestId(id)).toBe(true);
  });
});