// Supported currencies (ISO 4217)
export const SUPPORTED_CURRENCIES = [
  'USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY', 'INR', 'BRL',
  'MXN', 'ZAR', 'NGN', 'KES', 'GHS', 'UGX', 'TZS', 'RWF', 'BIF', 'XOF'
] as const;

// Supported languages (ISO 639-1)
export const SUPPORTED_LANGUAGES = [
  'en', 'es', 'fr', 'de', 'it', 'pt', 'zh', 'ja', 'ko', 'ar',
  'hi', 'sw', 'yo', 'ig', 'ha', 'zu', 'xh', 'af', 'nl', 'ru'
] as const;

// Default values
export const DEFAULT_PREFERENCES = {
  currency: 'USD',
  language: 'en',
  notifications_enabled: true,
} as const;

// Common timezones
export const COMMON_TIMEZONES = [
  'UTC', 'America/New_York', 'America/Los_Angeles', 'America/Chicago',
  'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Asia/Tokyo',
  'Asia/Shanghai', 'Asia/Dubai', 'Africa/Lagos', 'Africa/Nairobi'
] as const;
