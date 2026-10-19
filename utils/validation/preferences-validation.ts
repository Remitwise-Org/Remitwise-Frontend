import { SUPPORTED_CURRENCIES, SUPPORTED_LANGUAGES } from '../constants/supported-values';
import { PreferencesUpdateRequest } from '../types/user.types';

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export function validateCurrency(currency: string): void {
  if (!SUPPORTED_CURRENCIES.includes(currency as any)) {
    throw new ValidationError(`Invalid currency: ${currency}. Supported currencies: ${SUPPORTED_CURRENCIES.join(', ')}`);
  }
}

export function validateLanguage(language: string): void {
  if (!SUPPORTED_LANGUAGES.includes(language as any)) {
    throw new ValidationError(`Invalid language: ${language}. Supported languages: ${SUPPORTED_LANGUAGES.join(', ')}`);
  }
}

export function validateNotificationsEnabled(value: any): void {
  if (typeof value !== 'boolean') {
    throw new ValidationError(`notifications_enabled must be a boolean, got ${typeof value}`);
  }
}

export function validateTimezone(timezone?: string): void {
  if (timezone && typeof timezone !== 'string') {
    throw new ValidationError(`timezone must be a string, got ${typeof timezone}`);
  }
}

export function validatePreferencesUpdate(data: PreferencesUpdateRequest): void {
  if (data.currency !== undefined) {
    validateCurrency(data.currency);
  }
  
  if (data.language !== undefined) {
    validateLanguage(data.language);
  }
  
  if (data.notifications_enabled !== undefined) {
    validateNotificationsEnabled(data.notifications_enabled);
  }
  
  if (data.timezone !== undefined) {
    validateTimezone(data.timezone);
  }
}
