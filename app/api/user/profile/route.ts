import { NextResponse } from 'next/server';
import { DEFAULT_PREFERENCES } from '@/utils/constants/supported-values';
import { UserProfile, UserPreferences } from '@/utils/types/user.types';
import { withApiLogger } from '@/lib/api-logger-middleware';

// In-memory storage for demo purposes (replace with actual database in production)
let userProfile: UserProfile = {
  id: 'user_123',
  email: 'user@example.com',
  name: 'John Doe',
  preferences: { ...DEFAULT_PREFERENCES },
};

export const GET = withApiLogger(async () => {
  // Ensure preferences always have default values for missing keys
  const preferencesWithDefaults: UserPreferences = {
    currency: userProfile.preferences.currency || DEFAULT_PREFERENCES.currency,
    language: userProfile.preferences.language || DEFAULT_PREFERENCES.language,
    notifications_enabled: userProfile.preferences.notifications_enabled ?? DEFAULT_PREFERENCES.notifications_enabled,
    timezone: userProfile.preferences.timezone,
  };

  const responseProfile: UserProfile = {
    ...userProfile,
    preferences: preferencesWithDefaults,
  };

  return NextResponse.json({
    success: true,
    data: responseProfile,
  });
});
