import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  CONSENT_COOKIE_NAME,
  getConsentState,
  isAnalyticsAllowed,
  isEuLocale,
  isGpcEnabled,
  readConsentCookie,
  setConsent,
  writeConsentCookie,
} from "@/lib/consent/consent";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Set `document.cookie` to a known state. */
function setCookie(value: string) {
  document.cookie = value;
}

/** Reset document.cookie to empty. */
function clearCookie() {
  // Clear consent cookie by expiring it
  document.cookie = `${CONSENT_COOKIE_NAME}=; max-age=0; path=/`;
}

/** Mock `navigator.globalPrivacyControl`. */
function mockGpc(value: boolean | undefined) {
  Object.defineProperty(navigator, "globalPrivacyControl", {
    value,
    writable: true,
    configurable: true,
  });
}

/** Mock `navigator.languages` and `navigator.language`. */
function mockLocale(languages: string[], language?: string) {
  Object.defineProperty(navigator, "languages", {
    value: languages,
    writable: true,
    configurable: true,
  });
  Object.defineProperty(navigator, "language", {
    value: language ?? languages[0] ?? "en",
    writable: true,
    configurable: true,
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("lib/consent/consent", () => {
  beforeEach(() => {
    clearCookie();
    mockGpc(undefined);
    mockLocale(["en-US"], "en-US");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // -----------------------------------------------------------------------
  // isGpcEnabled
  // -----------------------------------------------------------------------
  describe("isGpcEnabled()", () => {
    it("returns false when GPC is not set", () => {
      mockGpc(undefined);
      expect(isGpcEnabled()).toBe(false);
    });

    it("returns false when GPC is explicitly false", () => {
      mockGpc(false);
      expect(isGpcEnabled()).toBe(false);
    });

    it("returns true when GPC is true", () => {
      mockGpc(true);
      expect(isGpcEnabled()).toBe(true);
    });
  });

  // -----------------------------------------------------------------------
  // isEuLocale
  // -----------------------------------------------------------------------
  describe("isEuLocale()", () => {
    it("returns true for de-DE (Germany)", () => {
      mockLocale(["de-DE"]);
      expect(isEuLocale()).toBe(true);
    });

    it("returns true for fr-FR (France)", () => {
      mockLocale(["fr-FR"]);
      expect(isEuLocale()).toBe(true);
    });

    it("returns true for en-GB (United Kingdom)", () => {
      mockLocale(["en-GB"]);
      expect(isEuLocale()).toBe(true);
    });

    it("returns true for pt-PT (Portugal)", () => {
      mockLocale(["pt-PT"]);
      expect(isEuLocale()).toBe(true);
    });

    it("returns true for nb-NO (Norway — EEA)", () => {
      mockLocale(["nb-NO"]);
      expect(isEuLocale()).toBe(true);
    });

    it("returns true for de-CH (Switzerland)", () => {
      mockLocale(["de-CH"]);
      expect(isEuLocale()).toBe(true);
    });

    it("returns false for en-US (United States)", () => {
      mockLocale(["en-US"]);
      expect(isEuLocale()).toBe(false);
    });

    it("returns false for bare locale without region (en)", () => {
      mockLocale(["en"]);
      expect(isEuLocale()).toBe(false);
    });

    it("returns false for pt-BR (Brazil)", () => {
      mockLocale(["pt-BR"]);
      expect(isEuLocale()).toBe(false);
    });

    it("detects EU from secondary language preference", () => {
      mockLocale(["en-US", "de-DE"]);
      expect(isEuLocale()).toBe(true);
    });
  });

  // -----------------------------------------------------------------------
  // readConsentCookie / writeConsentCookie
  // -----------------------------------------------------------------------
  describe("readConsentCookie()", () => {
    it("returns null when no consent cookie is set", () => {
      clearCookie();
      expect(readConsentCookie()).toBeNull();
    });

    it('returns "granted" when cookie is set to granted', () => {
      setCookie(`${CONSENT_COOKIE_NAME}=granted`);
      expect(readConsentCookie()).toBe("granted");
    });

    it('returns "denied" when cookie is set to denied', () => {
      setCookie(`${CONSENT_COOKIE_NAME}=denied`);
      expect(readConsentCookie()).toBe("denied");
    });

    it("returns null for an invalid cookie value", () => {
      setCookie(`${CONSENT_COOKIE_NAME}=maybe`);
      expect(readConsentCookie()).toBeNull();
    });

    it("ignores unrelated cookies", () => {
      setCookie("other=value; another=thing");
      expect(readConsentCookie()).toBeNull();
    });
  });

  describe("writeConsentCookie()", () => {
    it("writes a cookie string to document.cookie", () => {
      writeConsentCookie("granted");
      expect(readConsentCookie()).toBe("granted");
    });
  });

  // -----------------------------------------------------------------------
  // getConsentState — the core resolution logic
  // -----------------------------------------------------------------------
  describe("getConsentState()", () => {
    it('returns "granted" for non-EU locale with no cookie and no GPC', () => {
      mockLocale(["en-US"]);
      clearCookie();
      mockGpc(undefined);
      expect(getConsentState()).toBe("granted");
    });

    it('returns "undecided" for EU locale with no cookie and no GPC', () => {
      mockLocale(["de-DE"]);
      clearCookie();
      mockGpc(undefined);
      expect(getConsentState()).toBe("undecided");
    });

    it('returns "granted" when cookie is granted (EU locale)', () => {
      mockLocale(["de-DE"]);
      setCookie(`${CONSENT_COOKIE_NAME}=granted`);
      mockGpc(undefined);
      expect(getConsentState()).toBe("granted");
    });

    it('returns "denied" when cookie is denied (non-EU locale)', () => {
      mockLocale(["en-US"]);
      setCookie(`${CONSENT_COOKIE_NAME}=denied`);
      mockGpc(undefined);
      expect(getConsentState()).toBe("denied");
    });

    // === NEGATIVE TEST: GPC overrides everything ===
    it("NEGATIVE: GPC overrides granted cookie — returns denied", () => {
      mockLocale(["en-US"]);
      setCookie(`${CONSENT_COOKIE_NAME}=granted`);
      mockGpc(true);
      expect(getConsentState()).toBe("denied");
    });

    it("NEGATIVE: GPC overrides non-EU default — returns denied", () => {
      mockLocale(["en-US"]);
      clearCookie();
      mockGpc(true);
      expect(getConsentState()).toBe("denied");
    });

    it("NEGATIVE: GPC overrides EU undecided — returns denied (not undecided)", () => {
      mockLocale(["de-DE"]);
      clearCookie();
      mockGpc(true);
      expect(getConsentState()).toBe("denied");
    });
  });

  // -----------------------------------------------------------------------
  // setConsent
  // -----------------------------------------------------------------------
  describe("setConsent()", () => {
    it("writes the consent cookie for a normal user", () => {
      mockGpc(undefined);
      setConsent("granted");
      expect(readConsentCookie()).toBe("granted");
    });

    it("NEGATIVE: is a no-op when GPC is active", () => {
      mockGpc(true);
      setConsent("granted");
      expect(readConsentCookie()).toBeNull();
    });
  });

  // -----------------------------------------------------------------------
  // isAnalyticsAllowed
  // -----------------------------------------------------------------------
  describe("isAnalyticsAllowed()", () => {
    it("returns true when consent is granted", () => {
      mockLocale(["en-US"]);
      clearCookie();
      mockGpc(undefined);
      expect(isAnalyticsAllowed()).toBe(true);
    });

    it("returns false when consent is denied", () => {
      setCookie(`${CONSENT_COOKIE_NAME}=denied`);
      mockGpc(undefined);
      expect(isAnalyticsAllowed()).toBe(false);
    });

    it("returns false when consent is undecided (EU)", () => {
      mockLocale(["de-DE"]);
      clearCookie();
      mockGpc(undefined);
      expect(isAnalyticsAllowed()).toBe(false);
    });

    it("NEGATIVE: returns false when GPC is active, even with granted cookie", () => {
      setCookie(`${CONSENT_COOKIE_NAME}=granted`);
      mockGpc(true);
      expect(isAnalyticsAllowed()).toBe(false);
    });
  });
});
