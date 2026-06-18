# Frontend Session Handling

This document describes the frontend session expiry handling implementation for the Remitwise application.

## Overview

The frontend session handling system provides:

1. **Automatic session expiry detection** - Intercepts 401 responses from API calls
2. **User-friendly notifications** - Displays clear messages when sessions expire
3. **Seamless redirects** - Preserves user's intended destination for post-auth redirect
4. **Logout flow** - Handles logout with state clearing and navigation

## Components

### Session Handler (`lib/client/sessionHandler.ts`)

Core module for detecting and handling session expiry.

**Key Functions:**

- `isSessionExpired(response)` - Checks if a response indicates session expiry (401 with "Session expired" message)
- `handleSessionExpiry(intendedPath)` - Orchestrates the expiry flow: clears state, triggers notification, redirects after 15s safety timeout
- `dispatchSessionExpiring(countdown?, message?)` - Dispatches a `session-expiring` event to show the proactive warning with countdown
- `clearAuthState()` - Removes local authentication data from localStorage

**Usage:**

```typescript
import { sessionHandler } from '@/lib/client/sessionHandler';

const response = await fetch('/api/protected/resource');

if (await sessionHandler.isSessionExpired(response)) {
  sessionHandler.handleSessionExpiry(window.location.pathname);
  return;
}
```

### API Client (`lib/client/apiClient.ts`)

Wrapper around fetch that automatically handles session expiry.

**Usage:**

```typescript
import { apiClient } from '@/lib/client/apiClient';

// GET request
const response = await apiClient.get('/api/protected/resource');
if (response) {
  const data = await response.json();
}

// POST request
const response = await apiClient.post('/api/protected/action', {
  body: JSON.stringify({ key: 'value' }),
  headers: { 'Content-Type': 'application/json' }
});
```

**Note:** The API client returns `null` if the session has expired and the user is being redirected.

### Logout Helper (`lib/client/logout.ts`)

Handles the logout flow with API call, state clearing, and redirect.

**Usage:**

```typescript
import { logout, getPostAuthRedirect } from '@/lib/client/logout';

// Logout with default redirect to home
await logout();

// Logout with custom redirect
await logout({ redirectTo: '/login' });

// Check for post-auth redirect
const redirectPath = getPostAuthRedirect();
if (redirectPath) {
  router.push(redirectPath);
}
```

### Session Expiry Hook (`lib/client/useSessionExpiry.ts`)

React hook for listening to session expiry events.

**Usage:**

```typescript
import { useSessionExpiry } from '@/lib/client/useSessionExpiry';
import SessionExpiryNotification from '@/components/SessionExpiryNotification';

export default function MyComponent() {
  const { isExpired, message, clearExpiry } = useSessionExpiry();
  
  return (
    <>
      <SessionExpiryNotification 
        show={isExpired} 
        onClose={clearExpiry}
      />
      {/* rest of component */}
    </>
  );
}
```

### Session Expiry Notification (`components/SessionExpiryNotification.tsx`)

UI component that displays the session expiry message.

**Props:**

- `show: boolean` - Whether to show the notification
- `onClose: () => void` - Callback when notification is closed

### Session Expiry Provider (`components/SessionExpiryProvider.tsx`)

Global provider component that wraps the application to show session expiry notifications.

**Usage in Layout:**

```typescript
import SessionExpiryProvider from '@/components/SessionExpiryProvider';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <SessionExpiryProvider>
          {children}
        </SessionExpiryProvider>
      </body>
    </html>
  );
}
```

## Integration Guide

### Step 1: Add Session Expiry Provider to Layout

Update your root layout to include the session expiry provider:

```typescript
// app/layout.tsx
import SessionExpiryProvider from '@/components/SessionExpiryProvider';

export default function RootLayout({ children }: { children: React.ReactNode }) {
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

### Step 2: Use API Client for Protected Requests

Replace direct fetch calls with the API client:

```typescript
// Before
const response = await fetch('/api/protected/resource');
const data = await response.json();

// After
import { apiClient } from '@/lib/client/apiClient';

const response = await apiClient.get('/api/protected/resource');
if (response) {
  const data = await response.json();
}
```

### Step 3: Implement Logout

Update logout buttons to use the logout helper:

```typescript
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

### Step 4: Handle Post-Auth Redirect

After successful authentication, check for stored redirect path:

```typescript
import { getPostAuthRedirect } from '@/lib/client/logout';
import { useRouter } from 'next/navigation';

function LoginComponent() {
  const router = useRouter();
  
  const handleLoginSuccess = () => {
    // Check if user should be redirected to their intended destination
    const redirectPath = getPostAuthRedirect();
    if (redirectPath) {
      router.push(redirectPath);
    } else {
      router.push('/dashboard');
    }
  };
  
  // ... rest of component
}
```

## Session Expiry — Warning Flow (Proactive)

1. Backend or idle timer signals the session is about to expire
2. `sessionHandler.dispatchSessionExpiring(countdown)` dispatches a `session-expiring` custom event
3. Session expiry provider listens for the event and shows the **warning** notification with countdown
4. If user clicks **"Stay signed in"**: a `session-refresh` event is dispatched; the provider should call the session refresh API; the warning clears
5. If countdown reaches 0: the notification auto-transitions to the **expired** state
6. If an API call returns 401 during the warning period: the `session-expired` event is dispatched, transitioning to expired

## Session Expiry — Expired Flow

1. User makes a request to a protected API endpoint
2. Backend detects expired session and returns 401 with `{ error: 'Unauthorized', message: 'Session expired' }`
3. API client intercepts the response and detects session expiry
4. Session handler clears local authentication state
5. Session handler stores the current path for post-auth redirect
6. Session handler triggers a `session-expired` custom event
7. Session expiry provider listens for the event and shows **expired** notification
8. User clicks **"Reconnect wallet"** (or auto-redirect fires after 15s safety timeout)
9. User is redirected to the home/login page
10. User reconnects their wallet
11. After successful authentication via `getPostAuthRedirect()`, user is redirected back to their intended destination

## Logout Flow

1. User clicks logout button
2. Logout helper calls `/api/auth/logout` endpoint
3. Backend clears session cookie
4. Frontend clears local authentication state
5. User is redirected to home page

## Local Storage Keys

The session handling system uses the following localStorage keys:

- `wallet_address` - Stored wallet address (cleared on expiry/logout)
- `wallet_connected` - Connection status (cleared on expiry/logout)
- `auth_state` - General auth state (cleared on expiry/logout)
- `redirect_after_auth` - Intended destination for post-auth redirect (temporary)

## Custom Events

### `session-expiring`

Dispatched when the session is about to expire (proactive warning).

**Event Detail:**

```typescript
{
  message: 'Your session will expire in 120 seconds...',
  countdown: 120  // seconds remaining
}
```

**Dispatching the Event:**

```typescript
import { sessionHandler } from '@/lib/client/sessionHandler';

// Default 120s countdown
sessionHandler.dispatchSessionExpiring();

// Custom countdown and message
sessionHandler.dispatchSessionExpiring(60, 'Custom warning message');
```

### `session-expired`

Dispatched when a session expiry is detected.

**Event Detail:**

```typescript
{
  message: 'Your session has expired. Please reconnect your wallet.'
}
```

**Listening for the Event:**

```typescript
window.addEventListener('session-expired', (event: CustomEvent) => {
  console.log(event.detail.message);
});
```

### `session-refresh`

Dispatched when the user clicks "Stay signed in". A handler should call the session refresh API.

```typescript
window.addEventListener('session-refresh', async () => {
  await fetch('/api/auth/refresh', { method: 'POST' });
});
```

## Error Handling

### Network Errors

Network errors (connection failures, timeouts) do NOT clear session state. Only explicit 401 responses with "Session expired" message trigger the expiry flow.

```typescript
try {
  const response = await apiClient.get('/api/protected/resource');
  if (response) {
    // Process response
  }
} catch (error) {
  // Network error - session state is preserved
  console.error('Network error:', error);
}
```

### API Errors

Non-401 errors are passed through normally and should be handled by the calling code:

```typescript
const response = await apiClient.get('/api/protected/resource');
if (response) {
  if (!response.ok) {
    // Handle API error (not session expiry)
    const error = await response.json();
    console.error('API error:', error);
  }
}
```

## Testing

### Manual Testing Checklist

- [ ] Session expiry notification displays when session expires
- [ ] User is redirected to home page after session expiry
- [ ] Intended destination is preserved and restored after re-authentication
- [ ] Logout clears local state and redirects to home page
- [ ] Network errors don't trigger session expiry flow
- [ ] Multiple tabs handle session expiry consistently

### Testing Session Expiry

To test session expiry in development:

1. Set a short session duration in `.env`:
   ```
   SESSION_MAX_AGE=60  # 1 minute
   SESSION_REFRESH_ENABLED=false
   ```

2. Login and wait for session to expire

3. Make a request to a protected endpoint

4. Verify notification appears and redirect occurs

### Testing Logout

1. Login to the application
2. Click logout button
3. Verify you're redirected to home page
4. Verify local storage is cleared
5. Verify subsequent requests to protected endpoints return 401

## Best Practices

1. **Always use the API client** for authenticated requests instead of raw fetch
2. **Don't clear session state on network errors** - only on explicit session expiry
3. **Preserve user context** - always pass the current path to `handleSessionExpiry`
4. **Handle post-auth redirects** - check for stored redirect path after authentication
5. **Test across multiple tabs** - ensure session expiry is handled consistently

## Troubleshooting

### Notification not showing

- Verify `SessionExpiryProvider` is added to your root layout
- Check browser console for JavaScript errors
- Verify the `session-expired` event is being dispatched

### Redirect not working

- Check that `window.location.href` is being set correctly
- Verify the redirect path is valid
- Check for JavaScript errors that might prevent redirect

### Post-auth redirect not working

- Verify `redirect_after_auth` is being stored in localStorage
- Check that `getPostAuthRedirect()` is called after authentication
- Ensure the stored path is cleared after use

### Local state not clearing

- Verify `clearAuthState()` is being called
- Check localStorage in browser DevTools
- Ensure the correct keys are being removed
