/**
 * lib/logger.ts
 *
 * Centralised structured JSON logger built on pino.
 *
 * Key guarantees:
 *  - Output is structured JSON written to stdout (never console.log)
 *  - Sensitive fields are redacted at the logger level as a defence-in-depth
 *  - Child loggers carry request-scoped context (requestId)
 */

import pino from "pino";

/**
 * Defence-in-depth: even if a developer accidentally attaches one of these
 * paths to a log entry it will be replaced with "[REDACTED]".
 */
const REDACT_PATHS: string[] = [
  "password",
  "token",
  "secret",
  "authorization",
  "cookie",
  "cookies",
  "signature",
  "req.headers.authorization",
  "req.headers.cookie",
  "res.headers.set-cookie",
];

const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  // Structured JSON by default (pino's default transport)
  timestamp: pino.stdTimeFunctions.isoTime,
  redact: {
    paths: REDACT_PATHS,
    censor: "[REDACTED]",
  },
  // We intentionally do NOT attach a serializer for req/res
  // because our middleware only logs safe, pre-selected fields.
  formatters: {
    level(label: string) {
      return { level: label };
    },
  },
});

export default logger;
