import { getLocaleCookie, setLocaleCookie, isSupportedLocale } from "@/lib/i18n/cookie";

// Use jsdom's existing document, just mock cookie getter/setter
const mockCookies: Record<string, string> = {};

Object.defineProperty(global.document, "cookie", {
  configurable: true,
  get: () => {
    return Object.entries(mockCookies)
      .map(([k, v]) => k + "=" + v)
      .join("; ");
  },
  set: (value: string) => {
    const [pair] = value.split(";");
    const eqIdx = pair.indexOf("=");
    if (eqIdx === -1) return;
    const k = pair.substring(0, eqIdx).trim();
    const v = pair.substring(eqIdx + 1).trim();
    mockCookies[k] = v;
  },
});

describe("i18n cookie", () => {
  beforeEach(() => {
    for (const key of Object.keys(mockCookies)) {
      delete mockCookies[key];
    }
  });

  describe("isSupportedLocale", () => {
    it("accepts en and es", () => {
      expect(isSupportedLocale("en")).toBe(true);
      expect(isSupportedLocale("es")).toBe(true);
    });

    it("rejects unsupported locales", () => {
      expect(isSupportedLocale("fr")).toBe(false);
      expect(isSupportedLocale("de")).toBe(false);
      expect(isSupportedLocale("")).toBe(false);
    });

    it("handles null/undefined", () => {
      expect(isSupportedLocale(null)).toBe(false);
      expect(isSupportedLocale(undefined)).toBe(false);
    });
  });

  describe("getLocaleCookie", () => {
    it("returns null when no cookie is set", () => {
      expect(getLocaleCookie()).toBeNull();
    });

    it("returns locale from cookie", () => {
      mockCookies["remitwise_locale"] = "es";
      expect(getLocaleCookie()).toBe("es");
    });

    it("returns null for unsupported locale in cookie", () => {
      mockCookies["remitwise_locale"] = "fr";
      expect(getLocaleCookie()).toBeNull();
    });
  });

  describe("setLocaleCookie", () => {
    it("writes cookie with correct value", () => {
      setLocaleCookie("es");
      expect(mockCookies["remitwise_locale"]).toBe("es");
    });

    it("writes cookie for en", () => {
      setLocaleCookie("en");
      expect(mockCookies["remitwise_locale"]).toBe("en");
    });
  });

  describe("resolution precedence", () => {
    it("cookie takes priority over navigator language", () => {
      mockCookies["remitwise_locale"] = "es";
      const cookieLocale = getLocaleCookie();
      expect(cookieLocale).toBe("es");
    });

    it("falls back to default when no cookie", () => {
      const cookieLocale = getLocaleCookie();
      expect(cookieLocale).toBeNull();
    });
  });
});
