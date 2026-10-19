import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { buildCanonicalHeadingUrl } from '@/lib/client/pageHeadingLink';

describe('pageHeadingLink Properties - Property-Based Tests', () => {
  // Helper to generate pathname strings that resemble actual browser location pathnames (no '?' or '#')
  const pathnameArb = fc.string({ minLength: 1, maxLength: 50 })
    .map(p => '/' + p.replace(/[^a-zA-Z0-9/]/g, '').replace(/\/+/g, '/'));

  // Helper to generate safe heading IDs
  const headingIdArb = fc.string({ minLength: 1, maxLength: 30 })
    .map(h => h.replace(/[^a-zA-Z0-9-]/g, '') || 'heading');

  it('Property 1: Canonical URL always starts with the origin', () => {
    fc.assert(
      fc.property(
        fc.webUrl().map(url => new URL(url).origin),
        pathnameArb,
        headingIdArb,
        (origin, pathname, headingId) => {
          const canonical = buildCanonicalHeadingUrl({ origin, pathname }, headingId);
          return canonical.startsWith(origin);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 2: The only hash in the output is the heading ID prefix, and no query params are present', () => {
    fc.assert(
      fc.property(
        fc.webUrl().map(url => new URL(url).origin),
        pathnameArb,
        headingIdArb,
        (origin, pathname, headingId) => {
          // In a real browser window.location.pathname never contains ? or #
          const canonical = buildCanonicalHeadingUrl({ origin, pathname }, headingId);
          const hashCount = (canonical.match(/#/g) || []).length;
          return hashCount === 1 && !canonical.includes('?') && canonical.endsWith(`#${headingId}`);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 3: Legacy paths (/insights and /financial-insight) resolve to /financial-insights and financial-insights-page-heading', () => {
    fc.assert(
      fc.property(
        fc.webUrl().map(url => new URL(url).origin),
        fc.constantFrom(
          '/insights',
          '/insights/',
          '/financial-insight',
          '/financial-insight/'
        ),
        headingIdArb,
        (origin, pathname, headingId) => {
          const canonical = buildCanonicalHeadingUrl({ origin, pathname }, headingId);
          const expected = `${origin}/financial-insights#financial-insights-page-heading`;
          return canonical === expected;
        }
      ),
      { numRuns: 50 }
    );
  });

  it('Property 4: Trailing slashes are stripped from other paths', () => {
    fc.assert(
      fc.property(
        fc.webUrl().map(url => new URL(url).origin),
        pathnameArb.map(p => p.endsWith('/') ? p : p + '/'),
        headingIdArb,
        (origin, pathname, headingId) => {
          const canonical = buildCanonicalHeadingUrl({ origin, pathname }, headingId);
          const pathnameWithoutOrigin = canonical.substring(origin.length).split('#')[0];
          return pathnameWithoutOrigin === '/' || !pathnameWithoutOrigin.endsWith('/');
        }
      ),
      { numRuns: 100 }
    );
  });
});
