import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { parse as parseYaml } from "yaml";

const ROOT = process.cwd();
const API_ROOT = path.join(ROOT, "app", "api");
const HTTP_METHODS = new Set([
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "HEAD",
  "OPTIONS",
]);

/**
 * Exceptions must be deliberate, temporary where possible, and explain why
 * a route is not represented in the public OpenAPI document.
 */
const ROUTE_ALLOWLIST: Record<string, string> = {
  "app/api/remittance/qoute/route.ts":
    "Deprecated misspelled compatibility alias; /remittance/quote is the canonical documented endpoint.",
};

function findRouteFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) return findRouteFiles(absolutePath);
    return entry.isFile() && entry.name === "route.ts" ? [absolutePath] : [];
  });
}

function exportedMethods(source: string): Set<string> {
  const methods = new Set<string>();
  const declaration =
    /\bexport\s+(?:async\s+)?(?:function|const|let|var)\s+(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\b/g;

  for (const match of source.matchAll(declaration)) methods.add(match[1]);

  // Also cover both local exports and re-exports, including aliased exports.
  const exportList = /\bexport\s*\{([^}]+)\}/g;
  for (const match of source.matchAll(exportList)) {
    for (const item of match[1].split(",")) {
      const [original, alias] = item.trim().split(/\s+as\s+/);
      const exported = (alias || original).trim();
      if (HTTP_METHODS.has(exported)) methods.add(exported);
    }
  }

  return methods;
}

function openApiPathFor(file: string): string {
  const relativeDirectory = path
    .relative(API_ROOT, path.dirname(file))
    .split(path.sep)
    .join("/");
  return `/${relativeDirectory}`.replace(/\[([^\]]+)\]/g, "{$1}");
}

describe("OpenAPI route drift", () => {
  const spec = parseYaml(
    readFileSync(path.join(ROOT, "openapi.yaml"), "utf8"),
  ) as { paths?: Record<string, Record<string, unknown>> };
  const docsSpec = JSON.parse(
    readFileSync(path.join(ROOT, "docs", "openapi.json"), "utf8"),
  ) as { paths?: Record<string, Record<string, unknown>> };

  it("documents every exported HTTP method or gives an explicit reason", () => {
    const missing: string[] = [];

    for (const file of findRouteFiles(API_ROOT)) {
      const relativeFile = path.relative(ROOT, file).split(path.sep).join("/");
      const reason = ROUTE_ALLOWLIST[relativeFile];
      if (reason) continue;

      const routePath = openApiPathFor(file);
      const methods = exportedMethods(readFileSync(file, "utf8"));

      if (methods.size === 0) {
        missing.push(`${relativeFile}: no exported HTTP method was detected`);
        continue;
      }

      for (const method of methods) {
        if (!spec.paths?.[routePath]?.[method.toLowerCase()]) {
          missing.push(`${relativeFile}: ${method} ${routePath} is missing from openapi.yaml`);
        }
        if (!docsSpec.paths?.[routePath]?.[method.toLowerCase()]) {
          missing.push(`${relativeFile}: ${method} ${routePath} is missing from docs/openapi.json`);
        }
      }
    }

    expect(
      missing,
      [
        "Every app/api/**/route.ts handler must be represented in openapi.yaml.",
        "Add the missing path/method, or add a reasoned entry to ROUTE_ALLOWLIST.",
        ...missing,
      ].join("\n"),
    ).toEqual([]);
  });

  it("keeps every allowlist entry explicit and tied to a real route", () => {
    for (const [file, reason] of Object.entries(ROUTE_ALLOWLIST)) {
      expect(reason.trim(), `${file} needs an allowlist reason`).not.toBe("");
      expect(
        readFileSync(path.join(ROOT, file), "utf8"),
        `${file} should exist while it is allowlisted`,
      ).toBeTruthy();
    }
  });
});
