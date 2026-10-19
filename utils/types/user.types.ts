export interface UserPreferences {
  currency: string; // ISO 4217 currency code
  language: string; // ISO 639-1 language code
  notifications_enabled: boolean;
  timezone?: string; // Optional timezone
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  preferences: UserPreferences;
}

export interface PreferencesUpdateRequest {
  currency?: string;
  language?: string;
  notifications_enabled?: boolean;
  timezone?: string;
}
