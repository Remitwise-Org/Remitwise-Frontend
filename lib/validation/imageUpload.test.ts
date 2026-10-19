import { describe, it, expect } from 'vitest';
import { validateImageMimeType, ACCEPTED_IMAGE_MIME_TYPES } from './imageUpload';

describe('validateImageMimeType', () => {
  it.each(ACCEPTED_IMAGE_MIME_TYPES)('accepts %s', (mimeType) => {
    expect(validateImageMimeType({ type: mimeType })).toEqual({ ok: true });
  });

  it('rejects a PDF', () => {
    expect(validateImageMimeType({ type: 'application/pdf' })).toEqual({
      ok: false,
      error: 'unsupported_mime_type',
      mimeType: 'application/pdf',
    });
  });

  it('rejects an executable', () => {
    expect(validateImageMimeType({ type: 'application/x-msdownload' })).toEqual({
      ok: false,
      error: 'unsupported_mime_type',
      mimeType: 'application/x-msdownload',
    });
  });

  it('rejects a missing/empty MIME type rather than treating it as accepted', () => {
    expect(validateImageMimeType({ type: '' })).toEqual({
      ok: false,
      error: 'missing_mime_type',
      mimeType: '',
    });
  });

  it('rejects an SVG (can embed script content, not treated as a safe raster image here)', () => {
    expect(validateImageMimeType({ type: 'image/svg+xml' })).toEqual({
      ok: false,
      error: 'unsupported_mime_type',
      mimeType: 'image/svg+xml',
    });
  });
});
