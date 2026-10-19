# User Preferences API Documentation

## Overview

This document describes the user preferences API endpoints for managing user settings including currency, language, notifications, and timezone preferences.

## Endpoints

### GET /api/user/profile

Returns the user's profile including preferences with default values applied for any missing settings.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "user_123",
    "email": "user@example.com",
    "name": "John Doe",
    "preferences": {
      "currency": "USD",
      "language": "en",
      "notifications_enabled": true,
      "timezone": "America/New_York"
    }
  }
}
```

### PATCH /api/user/preferences

Updates user preferences with validation.

**Request Body:**
```json
{
  "currency": "EUR",
  "language": "fr",
  "notifications_enabled": false,
  "timezone": "Europe/Paris"
}
```

**Success Response:**
```json
{
  "success": true,
  "data": {
    "currency": "EUR",
    "language": "fr",
    "notifications_enabled": false,
    "timezone": "Europe/Paris"
  }
}
```

**Error Response (400):**
```json
{
  "success": false,
  "error": "Invalid currency: INVALID. Supported currencies: USD, EUR, GBP, JPY, CAD, AUD, CHF, CNY, INR, BRL, MXN, ZAR, NGN, KES, GHS, UGX, TZS, RWF, BIF, XOF"
}
```

## Schema

### UserPreferences

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| currency | string | Yes | USD | ISO 4217 currency code |
| language | string | Yes | en | ISO 639-1 language code |
| notifications_enabled | boolean | Yes | true | Whether notifications are enabled |
| timezone | string | No | - | IANA timezone identifier |

## Supported Values

### Currencies (ISO 4217)

The following currencies are supported:

- **USD** - US Dollar
- **EUR** - Euro
- **GBP** - British Pound
- **JPY** - Japanese Yen
- **CAD** - Canadian Dollar
- **AUD** - Australian Dollar
- **CHF** - Swiss Franc
- **CNY** - Chinese Yuan
- **INR** - Indian Rupee
- **BRL** - Brazilian Real
- **MXN** - Mexican Peso
- **ZAR** - South African Rand
- **NGN** - Nigerian Naira
- **KES** - Kenyan Shilling
- **GHS** - Ghanaian Cedi
- **UGX** - Ugandan Shilling
- **TZS** - Tanzanian Shilling
- **RWF** - Rwandan Franc
- **BIF** - Burundian Franc
- **XOF** - West African CFA Franc

### Languages (ISO 639-1)

The following languages are supported:

- **en** - English
- **es** - Spanish
- **fr** - French
- **de** - German
- **it** - Italian
- **pt** - Portuguese
- **zh** - Chinese
- **ja** - Japanese
- **ko** - Korean
- **ar** - Arabic
- **hi** - Hindi
- **sw** - Swahili
- **yo** - Yoruba
- **ig** - Igbo
- **ha** - Hausa
- **zu** - Zulu
- **xh** - Xhosa
- **af** - Afrikaans
- **nl** - Dutch
- **ru** - Russian

### Timezones

Common timezones include (but not limited to):

- **UTC** - Coordinated Universal Time
- **America/New_York** - Eastern Time
- **America/Los_Angeles** - Pacific Time
- **America/Chicago** - Central Time
- **Europe/London** - GMT/BST
- **Europe/Paris** - Central European Time
- **Europe/Berlin** - Central European Time
- **Asia/Tokyo** - Japan Standard Time
- **Asia/Shanghai** - China Standard Time
- **Asia/Dubai** - Gulf Standard Time
- **Africa/Lagos** - West Africa Time
- **Africa/Nairobi** - East Africa Time

## Validation Rules

1. **Currency**: Must be one of the supported ISO 4217 currency codes
2. **Language**: Must be one of the supported ISO 639-1 language codes
3. **Notifications Enabled**: Must be a boolean value
4. **Timezone**: Optional, must be a string if provided

## Default Values

When a user profile is created or when preferences are missing, the following defaults are applied:

- **currency**: USD
- **language**: en
- **notifications_enabled**: true
- **timezone**: undefined (optional)

## Error Handling

- **400 Bad Request**: Returned when validation fails for any field
- **500 Internal Server Error**: Returned for unexpected server errors

All error responses include a descriptive error message explaining what went wrong.
