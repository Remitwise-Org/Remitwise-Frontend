// @ts-ignore
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export function logError(context: string, error: unknown, extra?: Record<string, unknown>): void {
  console.error(`[${context}]`, error, extra);
}

export function logInfo(context: string, message: string, extra?: Record<string, unknown>): void {
  console.info(`[${context}] ${message}`, extra);
}

export const logger = {
  debug: (msg: string, ...args: unknown[]) => console.debug(msg, ...args),
  info: (msg: string, ...args: unknown[]) => console.info(msg, ...args),
  warn: (msg: string, ...args: unknown[]) => console.warn(msg, ...args),
  error: (msg: string, ...args: unknown[]) => console.error(msg, ...args),
};
