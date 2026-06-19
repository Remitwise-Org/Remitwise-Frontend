export async function logout(): Promise<void> {
  try {
    await fetch('/api/auth/logout', { method: 'POST' });
  } catch (e) { /* ignore */ }
  window.location.href = '/';
}
