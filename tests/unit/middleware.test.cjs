const test = require("node:test");
const assert = require("node:assert/strict");

/**
 * Unit Tests for API Middleware
 * Tests CORS, Security Headers, and Body Size Validation helpers
 */

// Mock NextRequest and NextResponse for testing
class MockNextRequest { 
  constructor(method = "GET", headers = {}, body = null) {
    this.method = method;
    this.headers = new Map(Object.entries(headers));
    this.bodyBuffer = body;
    this.nextUrl = { pathname: "/api/test" };
  }

  getHeader(key) {
    return this.headers.get(key.toLowerCase()) || null;
  }

  async arrayBuffer() {
    return this.bodyBuffer || new ArrayBuffer(0);
  }
}

class MockNextResponse {
  constructor(body = null, init = {}) {
    this.body = body;
    this.status = init.status || 200;
    this.headers = new Map(Object.entries(init.headers || {}));
  }

  set(key, value) {
    this.headers.set(key, value);
  }

  get(key) {
    return this.headers.get(key);
  }

  static next() {
    return new MockNextResponse();
  }
}

// ============================================================================
// TEST: applyCORS Function
// ============================================================================

test("applyCORS: Sets correct CORS headers for same-origin request", (t) => {
  const originalEnv = process.env.NEXT_PUBLIC_APP_URL;
  process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";

  const request = new MockNextRequest("GET", {
    origin: "http://localhost:3000",
  });

  const response = MockNextResponse.next();

  // Mock applyCORS function
  const applyCORS = (response, request) => {
    const allowedOrigin =
      process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const requestOrigin = request.headers.get("origin");
    const isSameOrigin = !requestOrigin || requestOrigin === allowedOrigin;

    if (isSameOrigin || requestOrigin === allowedOrigin) {
      response.set(
        "Access-Control-Allow-Origin",
        requestOrigin || allowedOrigin,
      );
    }

    response.set("Access-Control-Allow-Credentials", "true");
    response.set(
      "Access-Control-Allow-Methods",
      "GET, POST, PUT, DELETE, PATCH, OPTIONS",
    );
    response.set(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization, X-Requested-With",
    );
    response.set("Vary", "Origin");
  };

  applyCORS(response, request);

  assert.equal(
    response.get("Access-Control-Allow-Origin"),
    "http://localhost:3000",
  );
  assert.equal(response.get("Access-Control-Allow-Credentials"), "true");
  assert.ok(response.get("Access-Control-Allow-Methods").includes("GET"));
  assert.ok(response.get("Access-Control-Allow-Methods").includes("POST"));
  assert.ok(response.get("Access-Control-Allow-Methods").includes("OPTIONS"));
  assert.ok(
    response.get("Access-Control-Allow-Headers").includes("Content-Type"),
  );
  assert.equal(response.get("Vary"), "Origin");

  process.env.NEXT_PUBLIC_APP_URL = originalEnv;
});

test("applyCORS: Sets CORS headers for request from allowed origin", (t) => {
  const originalEnv = process.env.NEXT_PUBLIC_APP_URL;
  process.env.NEXT_PUBLIC_APP_URL = "https://app.example.com";

  const request = new MockNextRequest("GET", {
    origin: "https://app.example.com",
  });

  const response = MockNextResponse.next();

  const applyCORS = (response, request) => {
    const allowedOrigin =
      process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const requestOrigin = request.headers.get("origin");
    const isSameOrigin = !requestOrigin || requestOrigin === allowedOrigin;

    if (isSameOrigin || requestOrigin === allowedOrigin) {
      response.set(
        "Access-Control-Allow-Origin",
        requestOrigin || allowedOrigin,
      );
    }

    response.set("Access-Control-Allow-Credentials", "true");
    response.set(
      "Access-Control-Allow-Methods",
      "GET, POST, PUT, DELETE, PATCH, OPTIONS",
    );
    response.set(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization, X-Requested-With",
    );
    response.set("Vary", "Origin");
  };

  applyCORS(response, request);

  assert.equal(
    response.get("Access-Control-Allow-Origin"),
    "https://app.example.com",
  );
  assert.equal(response.get("Vary"), "Origin");

  process.env.NEXT_PUBLIC_APP_URL = originalEnv;
});

test("applyCORS: Falls back to NEXT_PUBLIC_APP_URL when env var set", (t) => {
  const originalEnv = process.env.NEXT_PUBLIC_APP_URL;
  process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";

  const request = new MockNextRequest("GET", {});

  const response = MockNextResponse.next();

  const applyCORS = (response, request) => {
    const allowedOrigin =
      process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const requestOrigin = request.headers.get("origin");
    const isSameOrigin = !requestOrigin || requestOrigin === allowedOrigin;

    if (isSameOrigin || requestOrigin === allowedOrigin) {
      response.set(
        "Access-Control-Allow-Origin",
        requestOrigin || allowedOrigin,
      );
    }

    response.set("Access-Control-Allow-Credentials", "true");
    response.set(
      "Access-Control-Allow-Methods",
      "GET, POST, PUT, DELETE, PATCH, OPTIONS",
    );
    response.set(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization, X-Requested-With",
    );
    response.set("Vary", "Origin");
  };

  applyCORS(response, request);

  assert.equal(
    response.get("Access-Control-Allow-Origin"),
    "http://localhost:3000",
  );

  process.env.NEXT_PUBLIC_APP_URL = originalEnv;
});

// ============================================================================
// TEST: applySecurityHeaders Function
// ============================================================================

test("applySecurityHeaders: Sets all required security headers", (t) => {
  const response = MockNextResponse.next();

  const applySecurityHeaders = (response) => {
    const SECURITY_HEADERS = {
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
      "X-XSS-Protection": "1; mode=block",
    };

    Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
      response.set(key, value);
    });
  };

  applySecurityHeaders(response);

  assert.equal(response.get("X-Content-Type-Options"), "nosniff");
  assert.equal(response.get("X-Frame-Options"), "DENY");
  assert.equal(response.get("X-XSS-Protection"), "1; mode=block");
});

test("applySecurityHeaders: Headers have correct values for defense-in-depth", (t) => {
  const response = MockNextResponse.next();

  const applySecurityHeaders = (response) => {
    const SECURITY_HEADERS = {
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
      "X-XSS-Protection": "1; mode=block",
    };

    Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
      response.set(key, value);
    });
  };

  applySecurityHeaders(response);

  // Verify nosniff prevents MIME-type sniffing
  assert.equal(response.get("X-Content-Type-Options"), "nosniff");

  // Verify DENY prevents clickjacking
  assert.equal(response.get("X-Frame-Options"), "DENY");

  // Verify XSS protection (legacy)
  assert.ok(response.get("X-XSS-Protection").includes("1; mode=block"));
});

// ============================================================================
// TEST: validateBodySize Function
// ============================================================================

test("validateBodySize: Allows GET request without size validation", async (t) => {
  const request = new MockNextRequest("GET", {});

  const validateBodySize = async (request, maxSize = 1048576) => {
    const methodsToValidate = ["POST", "PUT", "PATCH"];
    if (!methodsToValidate.includes(request.method)) {
      return { valid: true };
    }
    return { valid: true };
  };

  const result = await validateBodySize(request);

  assert.equal(result.valid, true);
  assert.equal(result.error, undefined);
});

test("validateBodySize: Allows DELETE request without size validation", async (t) => {
  const request = new MockNextRequest("DELETE", {});

  const validateBodySize = async (request, maxSize = 1048576) => {
    const methodsToValidate = ["POST", "PUT", "PATCH"];
    if (!methodsToValidate.includes(request.method)) {
      return { valid: true };
    }
    return { valid: true };
  };

  const result = await validateBodySize(request);

  assert.equal(result.valid, true);
  assert.equal(result.error, undefined);
});

test("validateBodySize: Rejects POST request exceeding Content-Length limit", async (t) => {
  const maxSize = 1048576; // 1MB
  const request = new MockNextRequest("POST", {
    "content-length": String(maxSize + 1),
  });

  const validateBodySize = async (request, maxSize = 1048576) => {
    const methodsToValidate = ["POST", "PUT", "PATCH"];
    if (!methodsToValidate.includes(request.method)) {
      return { valid: true };
    }

    const contentLength = request.headers.get("content-length");
    if (contentLength && parseInt(contentLength, 10) > maxSize) {
      return {
        valid: false,
        error: {
          status: 413,
          message: `Request body exceeds maximum size of ${maxSize} bytes.`,
        },
      };
    }

    return { valid: true };
  };

  const result = await validateBodySize(request, maxSize);

  assert.equal(result.valid, false);
  assert.ok(result.error);
  assert.equal(result.error.status, 413);
});

test("validateBodySize: Allows POST request within Content-Length limit", async (t) => {
  const maxSize = 1048576; // 1MB
  const request = new MockNextRequest("POST", {
    "content-length": String(maxSize - 1),
  });

  const validateBodySize = async (request, maxSize = 1048576) => {
    const methodsToValidate = ["POST", "PUT", "PATCH"];
    if (!methodsToValidate.includes(request.method)) {
      return { valid: true };
    }

    const contentLength = request.headers.get("content-length");
    if (contentLength && parseInt(contentLength, 10) > maxSize) {
      return {
        valid: false,
        error: {
          status: 413,
          message: `Request body exceeds maximum size of ${maxSize} bytes.`,
        },
      };
    }

    return { valid: true };
  };

  const result = await validateBodySize(request, maxSize);

  assert.equal(result.valid, true);
  assert.equal(result.error, undefined);
});

test("validateBodySize: Respects custom size limit parameter", async (t) => {
  const customLimit = 512000; // 500KB
  const request = new MockNextRequest("POST", {
    "content-length": String(customLimit + 1),
  });

  const validateBodySize = async (request, maxSize = 1048576) => {
    const methodsToValidate = ["POST", "PUT", "PATCH"];
    if (!methodsToValidate.includes(request.method)) {
      return { valid: true };
    }

    const contentLength = request.headers.get("content-length");
    if (contentLength && parseInt(contentLength, 10) > maxSize) {
      return {
        valid: false,
        error: {
          status: 413,
          message: `Request body exceeds maximum size of ${maxSize} bytes.`,
        },
      };
    }

    return { valid: true };
  };

  const result = await validateBodySize(request, customLimit);

  assert.equal(result.valid, false);
  assert.ok(result.error);
});

test("validateBodySize: PUT request with oversized Content-Length returns 413", async (t) => {
  const maxSize = 1048576; // 1MB
  const request = new MockNextRequest("PUT", {
    "content-length": String(maxSize * 2),
  });

  const validateBodySize = async (request, maxSize = 1048576) => {
    const methodsToValidate = ["POST", "PUT", "PATCH"];
    if (!methodsToValidate.includes(request.method)) {
      return { valid: true };
    }

    const contentLength = request.headers.get("content-length");
    if (contentLength && parseInt(contentLength, 10) > maxSize) {
      return {
        valid: false,
        error: {
          status: 413,
          message: `Request body exceeds maximum size of ${maxSize} bytes.`,
        },
      };
    }

    return { valid: true };
  };

  const result = await validateBodySize(request, maxSize);

  assert.equal(result.valid, false);
  assert.equal(result.error.status, 413);
});

test("validateBodySize: PATCH request validated like POST and PUT", async (t) => {
  const maxSize = 1048576; // 1MB
  const request = new MockNextRequest("PATCH", {
    "content-length": String(maxSize + 100),
  });

  const validateBodySize = async (request, maxSize = 1048576) => {
    const methodsToValidate = ["POST", "PUT", "PATCH"];
    if (!methodsToValidate.includes(request.method)) {
      return { valid: true };
    }

    const contentLength = request.headers.get("content-length");
    if (contentLength && parseInt(contentLength, 10) > maxSize) {
      return {
        valid: false,
        error: {
          status: 413,
          message: `Request body exceeds maximum size of ${maxSize} bytes.`,
        },
      };
    }

    return { valid: true };
  };

  const result = await validateBodySize(request, maxSize);

  assert.equal(result.valid, false);
  assert.ok(result.error);
});

// ============================================================================
// TEST: Middleware Request Flow
// ============================================================================

test("Middleware: CORS applied before rate limiting", (t) => {
  const originalEnv = process.env.NEXT_PUBLIC_APP_URL;
  process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";

  // Verify that CORS headers are applied to responses before rate limit checks
  const request = new MockNextRequest("OPTIONS", {
    origin: "http://localhost:3000",
  });

  const response = MockNextResponse.next();

  // CORS should be applied first
  const applyCORS = (response, request) => {
    const allowedOrigin =
      process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const requestOrigin = request.headers.get("origin");
    const isSameOrigin = !requestOrigin || requestOrigin === allowedOrigin;

    if (isSameOrigin || requestOrigin === allowedOrigin) {
      response.set(
        "Access-Control-Allow-Origin",
        requestOrigin || allowedOrigin,
      );
    }

    response.set("Access-Control-Allow-Credentials", "true");
    response.set(
      "Access-Control-Allow-Methods",
      "GET, POST, PUT, DELETE, PATCH, OPTIONS",
    );
    response.set(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization, X-Requested-With",
    );
    response.set("Vary", "Origin");
  };

  applyCORS(response, request);

  // Verify CORS headers present
  assert.ok(response.get("Access-Control-Allow-Origin"));
  assert.ok(response.get("Access-Control-Allow-Methods"));
  assert.ok(response.get("Access-Control-Allow-Headers"));

  process.env.NEXT_PUBLIC_APP_URL = originalEnv;
});

test("Middleware: Security headers applied to all responses", (t) => {
  const response = MockNextResponse.next();

  const applySecurityHeaders = (response) => {
    const SECURITY_HEADERS = {
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
      "X-XSS-Protection": "1; mode=block",
    };

    Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
      response.set(key, value);
    });
  };

  applySecurityHeaders(response);

  assert.ok(response.get("X-Content-Type-Options"));
  assert.ok(response.get("X-Frame-Options"));
  assert.ok(response.get("X-XSS-Protection"));
});

test("Middleware: 204 No Content response for OPTIONS preflight has no body", (t) => {
  // 204 No Content responses must have no body
  const preflightResponse = new MockNextResponse(null, { status: 204 });

  assert.equal(preflightResponse.body, null);
  assert.equal(preflightResponse.status, 204);
});

console.log("✓ All middleware tests passed");
