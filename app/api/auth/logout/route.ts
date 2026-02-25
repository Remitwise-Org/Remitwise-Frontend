import { withApiLogger } from '@/lib/api-logger-middleware';

export const dynamic = 'force-dynamic';

export const POST = withApiLogger(async () => {
  const cookieHeader =
    'remitwise_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0';
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': cookieHeader,
    },
  });
});
