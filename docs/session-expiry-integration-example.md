# Session Expiry Integration Example

For the current canonical guide, use [docs/client-api.md](./client-api.md). This file remains as a worked example.

This document provides a quick integration example for adding session expiry handling to your application.

## Quick Start

### 1. Add Session Expiry Provider to Root Layout

```typescript
// app/layout.tsx
import SessionExpiryProvider from '@/components/SessionExpiryProvider';
import './globals.css';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <SessionExpiryProvider>
          {children}
        </SessionExpiryProvider>
      </body>
    </html>
  );
}
```

### 2. Use API Client in Your Components

```typescript
// app/dashboard/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/client/apiClient';

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await apiClient.get('/api/protected/dashboard');
        
        if (response) {
          const result = await response.json();
          setData(result);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  if (loading) return <div>Loading...</div>;
  if (!data) return <div>No data</div>;

  return (
    <div>
      <h1>Dashboard</h1>
      {/* Render your data */}
    </div>
  );
}
```

### 3. Update Logout Button

```typescript
// components/WalletButton.tsx (already updated)
import { logout } from '@/lib/client/logout';

function LogoutButton() {
  const handleLogout = async () => {
    await logout();
  };

  return (
    <button onClick={handleLogout}>
      Logout
    </button>
  );
}
```

### 4. Handle Post-Auth Redirect

```typescript
// app/page.tsx (or your login/wallet connection page)
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getPostAuthRedirect } from '@/lib/client/logout';

export default function HomePage() {
  const router = useRouter();

  const handleWalletConnect = async () => {
    // Your wallet connection logic here
    const connected = await connectWallet();
    
    if (connected) {
      // Check if user should be redirected to their intended destination
      const redirectPath = getPostAuthRedirect();
      if (redirectPath) {
        router.push(redirectPath);
      } else {
        router.push('/dashboard');
      }
    }
  };

  return (
    <div>
      <button onClick={handleWalletConnect}>
        Connect Wallet
      </button>
    </div>
  );
}
```

## What Happens When Session Expires

### Passive detection (current)

1. User is on `/dashboard` and their session expires
2. They click a button that makes an API request
3. API returns 401 with "Session expired" message
4. **Expired** notification appears at top-right with "Reconnect wallet" button
5. User clicks "Reconnect wallet" (or auto-redirect after 15s)
6. User is redirected to `/` (home page)
7. `/dashboard` is stored in localStorage as `redirect_after_auth`
8. User reconnects their wallet
9. After successful connection, they're redirected back to `/dashboard`

### Proactive warning (with backend support)

1. Backend signals session is about to expire
2. **Warning** notification appears with countdown timer
3. User clicks "Stay signed in" to refresh the session
4. Warning clears and session is extended
5. If countdown reaches 0, the notification transitions to the expired state

## Testing

To test the session expiry flow:

1. Set a short session duration in `.env.local`:
   ```
   SESSION_MAX_AGE=60
   SESSION_REFRESH_ENABLED=false
   ```

2. Restart your development server

3. Connect your wallet and navigate to a protected page

4. Wait 60 seconds

5. Make an API request (click a button, refresh data, etc.)

6. You should see the session expiry notification and be redirected to home

## Customization

### Custom Notification Style

Edit `components/SessionExpiryNotification.tsx` to match your design system.

The notification supports two phases — `warning` (amber countdown bar) and `expired` (red reconnect bar) — via the `phase` prop.

### Triggering a Proactive Warning

To show the countdown warning before the session actually expires:

```typescript
import { sessionHandler } from '@/lib/client/sessionHandler';

// Show warning with 120s countdown
sessionHandler.dispatchSessionExpiring(120);
```

### Handling "Stay Signed In"

Listen for the `session-refresh` event to call the session refresh API:

```typescript
window.addEventListener('session-refresh', async () => {
  await fetch('/api/auth/refresh', { method: 'POST' });
});
```

### Custom Redirect Path

Change the redirect path in `lib/client/sessionHandler.ts`:

```typescript
// Default: redirects to home page
window.location.href = '/';

// Custom: redirect to login page
window.location.href = '/login';
```

### Custom Logout Redirect

Pass a custom redirect path to the logout function:

```typescript
await logout({ redirectTo: '/goodbye' });
```

## Environment Variables

Add these to your `.env.local`:

```env
# Session duration in seconds (default: 604800 = 7 days)
SESSION_MAX_AGE=604800

# Enable session refresh (default: false)
SESSION_REFRESH_ENABLED=false

# Session encryption password (required, min 32 chars)
SESSION_PASSWORD=your-secret-password-here-min-32-chars
```

## Troubleshooting

### "Session expired" notification not showing

- Check that `SessionExpiryProvider` is in your root layout
- Open browser console and look for errors
- Verify the API is returning the correct 401 response format

### Redirect not working after re-authentication

- Check localStorage for `redirect_after_auth` key
- Verify `getPostAuthRedirect()` is called after wallet connection
- Ensure the path is valid and accessible

### Logout not clearing session

- Check browser DevTools > Application > Cookies
- Verify the logout API endpoint is being called
- Check for JavaScript errors in console
