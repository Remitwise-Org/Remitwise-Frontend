import { describe, it } from "node:test";
import assert from "node:assert";
import {
  resolveLocale,
  parseLanguageTag,
  DEFAULT_RESOLVED,
  type ResolutionSource,
} from "@/lib/i18n/resolve-locale";

// ---------------------------------------------------------------------------
// parseLanguageTag
// ---------------------------------------------------------------------------

describe("parseLanguageTag", () => {
  it("parses simple 'en' as 'en'", () => {
    assert.strictEqual(parseLanguageTag("en"), "en");
  });

  it("parses 'es' as 'es'", () => {
    assert.strictEqual(parseLanguageTag("es"), "es");
  });

  it("parses 'en-US' → 'en'", () => {
    assert.strictEqual(parseLanguageTag("en-US"), "en");
  });

  it("parses 'es-ES' → 'es'", () => {
    assert.strictEqual(parseLanguageTag("es-ES"), "es");
  });

  it("returns null for unsupported language 'fr'", () => {
    assert.strictEqual(parseLanguageTag("fr"), null);
  });

  it("parses first language from Accept-Language header 'es,en;q=0.9'", () => {
    assert.strictEqual(parseLanguageTag("es,en;q=0.9"), "es");
  });

  it("returns null for null input", () => {
    assert.strictEqual(parseLanguageTag(null), null);
  });

  it("returns null for empty string", () => {
    assert.strictEqual(parseLanguageTag(""), null);
  });
});

// ---------------------------------------------------------------------------
// resolveLocale — precedence
// ---------------------------------------------------------------------------

describe("resolveLocale — precedence", () => {
  it("cookie > all", () => {
    const result = resolveLocale({
      cookieLocale: "es",
      preferenceLocale: "en",
      headerLocale: "en-US,en;q=0.9",
      navigatorLocale: "en",
    });
    assert.deepStrictEqual(result, { locale: "es", source: "cookie" });
  });

  it("preference > header/navigator (no cookie)", () => {
    const result = resolveLocale({
      cookieLocale: null,
      preferenceLocale: "es",
      headerLocale: "en-US",
      navigatorLocale: "en",
    });
    assert.deepStrictEqual(result, { locale: "es", source: "preference" });
  });

  it("header > navigator (no cookie, no preference)", () => {
    const result = resolveLocale({
      cookieLocale: null,
      preferenceLocale: null,
      headerLocale: "es-ES,en;q=0.9",
      navigatorLocale: "en",
    });
    assert.deepStrictEqual(result, { locale: "es", source: "header" });
  });

  it("navigator > default (no cookie, preference, header)", () => {
    const result = resolveLocale({
      cookieLocale: null,
      preferenceLocale: null,
      headerLocale: "fr-FR",
      navigatorLocale: "es",
    });
    assert.deepStrictEqual(result, { locale: "es", source: "navigator" });
  });

  it("defaults to 'en' when nothing matches", () => {
    const result = resolveLocale({
      cookieLocale: null,
      preferenceLocale: null,
      headerLocale: "fr-FR",
      navigatorLocale: "de-DE",
    });
    assert.deepStrictEqual(result, { locale: "en", source: "default" });
  });

  it("defaults when all inputs are null", () => {
    const result = resolveLocale({
      cookieLocale: null,
      preferenceLocale: null,
      headerLocale: null,
      navigatorLocale: null,
    });
    assert.deepStrictEqual(result, DEFAULT_RESOLVED);
  });
});

// ---------------------------------------------------------------------------
// resolveLocale — edge cases
// ---------------------------------------------------------------------------

describe("resolveLocale — edge cases", () => {
  it("unsupported cookie value → falls back to preference", () => {
    const result = resolveLocale({
      cookieLocale: "fr",
      preferenceLocale: "es",
      headerLocale: "en-US",
      navigatorLocale: "en",
    });
    assert.deepStrictEqual(result, { locale: "es", source: "preference" });
  });

  it("unsupported cookie + unsupported preference → header", () => {
    const result = resolveLocale({
      cookieLocale: "fr",
      preferenceLocale: "de",
      headerLocale: "es-ES",
      navigatorLocale: "en",
    });
    assert.deepStrictEqual(result, { locale: "es", source: "header" });
  });

  it("'en' cookie → en with cookie source", () => {
    const result = resolveLocale({
      cookieLocale: "en",
      headerLocale: "es-ES",
      navigatorLocale: "es",
    });
    assert.deepStrictEqual(result, { locale: "en", source: "cookie" });
  });

  it("'es' cookie wins over everything", () => {
    const result = resolveLocale({
      cookieLocale: "es",
      preferenceLocale: "en",
      headerLocale: "en-US",
      navigatorLocale: "en",
    });
    assert.deepStrictEqual(result, { locale: "es", source: "cookie" });
  });

  it("navigatorLocale 'es-ES' → 'es' with navigator source", () => {
    const result = resolveLocale({
      cookieLocale: null,
      preferenceLocale: null,
      headerLocale: null,
      navigatorLocale: "es-ES",
    });
    assert.deepStrictEqual(result, { locale: "es", source: "navigator" });
  });

  it("server/client agreement: same locale resolved from header and navigator", () => {
    // Simulate: cookie is set → server reads cookie, client reads same cookie
    const serverResult = resolveLocale({
      cookieLocale: "es",
      headerLocale: "en-US",
    });
    const clientResult = resolveLocale({
      cookieLocale: "es",
      navigatorLocale: "en",
    });
    assert.strictEqual(serverResult.locale, clientResult.locale);
  });

  it("no hydration mismatch: missing cookie falls back consistently", () => {
    // Server has Accept-Language: es, client has navigator: es → same result
    const serverResult = resolveLocale({
      cookieLocale: null,
      headerLocale: "es-ES",
    });
    const clientResult = resolveLocale({
      cookieLocale: null,
      navigatorLocale: "es",
    });
    assert.strictEqual(serverResult.locale, clientResult.locale);
  });
});

// ---------------------------------------------------------------------------
// DEFAULT_RESOLVED
// ---------------------------------------------------------------------------

describe("DEFAULT_RESOLVED", () => {
  it("has locale 'en' and source 'default'", () => {
    assert.deepStrictEqual(DEFAULT_RESOLVED, { locale: "en", source: "default" });
  });
});
