import { registerAs } from '@nestjs/config';

export default registerAs('jwt', () => {
  const secret = process.env.JWT_SECRET || '';
  const audience = process.env.JWT_TOKEN_AUDIENCE || '';
  const issuer = process.env.JWT_TOKEN_ISSUER || '';
  const ttl = parseInt(process.env.JWT_ACCESS_TOKEN_TTL ?? '360');
  const Rttl = parseInt(process.env.JWT_REFRESH_TOKEN_TTL ?? '7776000', 10);

  return {
    secret,
    audience,
    issuer,
    ttl,
    Rttl,
  };
});
