/**
 * Structured logging utilities for API requests and responses
 * Provides sanitization and request tracking
 */

import { sanitizeObject, sanitizeString } from './sanitize';
import { generateRequestId, isValidRequestId } from './requestId';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  requestId: string;
  timestamp: string;
  level: LogLevel;
  method?: string;
  path?: string;
  statusCode?: number;
  durationMs?: number;
  message?: string;
  error?: string;
  [key: string]: any;
}

/**
 * Gets the current log level from environment
 * Defaults to 'info' if not set
 */
function getLogLevel(): LogLevel {
  const level = process.env.LOG_LEVEL?.toLowerCase();
  if (level === 'debug' || level === 'info' || level === 'warn' || level === 'error') {
    return level;
  }
  return 'info';
}

/**
 * Checks if a log level should be output
 */
function shouldLog(level: LogLevel): boolean {
  const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
  const currentLevel = getLogLevel();
  return levels.indexOf(level) >= levels.indexOf(currentLevel);
}

/**
 * Logs a structured API request
 * Does NOT log request body to prevent sensitive data exposure
 */
export function logRequest(
  requestId: string,
  method: string,
  path: string,
  headers?: Record<string, string | string[] | undefined>,
): void {
  if (!shouldLog('info')) return;

  const entry: LogEntry = {
    requestId,
    timestamp: new Date().toISOString(),
    level: 'info',
    method,
    path,
    type: 'request',
  };

  // Add user agent if available (safe to log)
  if (headers?.['user-agent']) {
    const ua = headers['user-agent'];
    entry.userAgent = Array.isArray(ua) ? ua[0] : ua;
  }

  console.log(JSON.stringify(entry));
}

/**
 * Logs a structured API response
 * Sanitizes any response data to prevent sensitive information leakage
 */
export function logResponse(
  requestId: string,
  method: string,
  path: string,
  statusCode: number,
  durationMs: number,
  responseData?: any,
): void {
  if (!shouldLog('info')) return;

  const entry: LogEntry = {
    requestId,
    timestamp: new Date().toISOString(),
    level: statusCode >= 400 ? 'warn' : 'info',
    method,
    path,
    statusCode,
    durationMs,
    type: 'response',
  };

  // Sanitize response data if provided
  if (responseData) {
    entry.data = sanitizeObject(responseData);
  }

  console.log(JSON.stringify(entry));
}

/**
 * Logs an error
 */
export function logError(
  requestId: string,
  method: string,
  path: string,
  error: Error | string,
  statusCode?: number,
  durationMs?: number,
): void {
  if (!shouldLog('error')) return;

  const entry: LogEntry = {
    requestId,
    timestamp: new Date().toISOString(),
    level: 'error',
    method,
    path,
    type: 'error',
  };

  if (statusCode) entry.statusCode = statusCode;
  if (durationMs) entry.durationMs = durationMs;

  if (error instanceof Error) {
    entry.error = error.message;
    entry.stack = error.stack;
  } else {
    entry.error = String(error);
  }

  console.log(JSON.stringify(entry));
}

/**
 * Logs a debug message
 */
export function logDebug(
  requestId: string,
  message: string,
  data?: any,
): void {
  if (!shouldLog('debug')) return;

  const entry: LogEntry = {
    requestId,
    timestamp: new Date().toISOString(),
    level: 'debug',
    message: sanitizeString(message),
    type: 'debug',
  };

  if (data) {
    entry.data = sanitizeObject(data);
  }

  console.log(JSON.stringify(entry));
}

/**
 * Validates and normalizes a request ID
 */
export function normalizeRequestId(id: string | undefined): string {
  if (id && isValidRequestId(id)) {
    return id;
  }
  return generateRequestId();
}
