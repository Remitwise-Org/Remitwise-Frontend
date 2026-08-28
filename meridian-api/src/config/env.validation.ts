import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),

  PORT: Joi.number().integer().min(1).max(65535).default(3000),

  ALLOWED_ORIGINS: Joi.string().optional().allow(''),

  // Railway-style single connection URL (optional; takes precedence over individual vars)
  DATABASE_URL: Joi.string().uri().optional(),

  // Individual Postgres vars (required when DATABASE_URL is absent)
  POSTGRES_HOST: Joi.string().when('DATABASE_URL', {
    is: Joi.exist(),
    then: Joi.optional(),
    otherwise: Joi.string().required(),
  }),
  POSTGRES_PORT: Joi.number().integer().min(1).max(65535).default(5432),
  POSTGRES_USER: Joi.string().when('DATABASE_URL', {
    is: Joi.exist(),
    then: Joi.optional(),
    otherwise: Joi.string().required(),
  }),
  POSTGRES_PASSWORD: Joi.string().when('DATABASE_URL', {
    is: Joi.exist(),
    then: Joi.optional(),
    otherwise: Joi.string().required(),
  }),
  POSTGRES_DB: Joi.string().when('DATABASE_URL', {
    is: Joi.exist(),
    then: Joi.optional(),
    otherwise: Joi.string().required(),
  }),
  POSTGRES_SYNC: Joi.string().valid('true', 'false').default('false'),
  POSTGRES_LOAD: Joi.string().valid('true', 'false').default('true'),

  // JWT
  JWT_SECRET: Joi.string().min(16).required(),
  JWT_TOKEN_AUDIENCE: Joi.string().required(),
  JWT_TOKEN_ISSUER: Joi.string().required(),
  JWT_ACCESS_TOKEN_TTL: Joi.number().integer().positive().default(360),
  JWT_REFRESH_TOKEN_TTL: Joi.number().integer().positive().default(7776000),

  // Email verification
  VERIFICATION_TOKEN_TTL_HOURS: Joi.number().integer().positive().default(24),

  // RBAC (issue #632): global kill-switch for the RbacGuard. When set to
  // `false` every route behaves as public (legacy posture) — useful for a
  // staged rollout / rollback without code changes. Defaults to enabled.
  RBAC_ENABLED: Joi.boolean().default(true),

  // Application
  APP_URL: Joi.string().uri().default('http://localhost:3000'),

  // File upload
  STORAGE_PROVIDER: Joi.string().valid('local', 's3').default('local'),
  UPLOAD_MAX_SIZE_MB: Joi.number().positive().default(5),
  UPLOAD_S3_BUCKET: Joi.string().optional().allow(''),
  UPLOAD_S3_REGION: Joi.string().optional().allow(''),
  UPLOAD_S3_ACCESS_KEY_ID: Joi.string().optional().allow(''),
  UPLOAD_S3_SECRET_ACCESS_KEY: Joi.string().optional().allow(''),

  // Redis (issue #647): sliding-window rate limiter. Empty REDIS_URL uses
  // in-process memory so tests and local boots still work.
  REDIS_URL: Joi.string().uri().optional().allow(''),
  RATE_LIMIT_ENABLED: Joi.boolean().default(true),
  RATE_LIMIT_WINDOW_MS: Joi.number().integer().positive().default(60000),
  RATE_LIMIT_READ_LIMIT: Joi.number().integer().positive().default(100),
  RATE_LIMIT_WRITE_LIMIT: Joi.number().integer().positive().default(20),
  RATE_LIMIT_AUTH_MULTIPLIER: Joi.number().positive().default(3),
  RATE_LIMIT_ABUSE_THRESHOLD: Joi.number().integer().positive().default(5),
  RATE_LIMIT_ABUSE_WINDOW_MS: Joi.number().integer().positive().default(60000),
  RATE_LIMIT_ABUSE_FACTOR: Joi.number().min(0.1).max(1).default(0.5),

  // Envelope encryption (issue #631): the master Key Encryption Key (KEK)
  // that wraps per-user Data Encryption Keys. Provide either the raw
  // base64-encoded 32-byte key or a URL that returns { "key": "<base64>" }.
  // ENCRYPTION_KEK_PREVIOUS_BASE64 is the decrypt-only fallback used during
  // key rotation. Production boots require a KEK; development/test may omit
  // it (CryptoProvider falls back to transparent plaintext mode).
  ENCRYPTION_KEK_BASE64: Joi.string().optional().allow(''),
  ENCRYPTION_KEK_PREVIOUS_BASE64: Joi.string().optional().allow(''),
  ENCRYPTION_KEK_URL: Joi.string().uri().optional().allow(''),
}).custom(
  (value, helpers) => {
    const hasKek =
      Boolean(value.ENCRYPTION_KEK_BASE64) || Boolean(value.ENCRYPTION_KEK_URL);
    if (value.NODE_ENV === 'production' && !hasKek) {
      return helpers.error('any.custom', {
        message:
          'ENCRYPTION_KEK_BASE64 or ENCRYPTION_KEK_URL is required in production (envelope encryption, issue #631)',
      });
    }
    return value;
  },
  'envelope-encryption-kek-required',
);
