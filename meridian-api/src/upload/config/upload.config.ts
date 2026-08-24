import { registerAs } from '@nestjs/config';

/**
 * Upload configuration namespace.
 *
 * Env vars consumed:
 *   STORAGE_PROVIDER   – 'local' (default) | 's3'
 *   UPLOAD_MAX_SIZE_MB – maximum file size in MB (default: 5)
 *   UPLOAD_S3_BUCKET   – S3 bucket name (required when STORAGE_PROVIDER=s3)
 *   UPLOAD_S3_REGION   – AWS region       (required when STORAGE_PROVIDER=s3)
 *   UPLOAD_S3_ACCESS_KEY_ID     – AWS access key (optional; falls back to SDK default chain)
 *   UPLOAD_S3_SECRET_ACCESS_KEY – AWS secret key (optional; falls back to SDK default chain)
 */
export default registerAs('upload', () => ({
  storageProvider: process.env.STORAGE_PROVIDER || 'local',
  maxFileSizeMb: Number(process.env.UPLOAD_MAX_SIZE_MB) || 5,
  s3: {
    bucket: process.env.UPLOAD_S3_BUCKET || '',
    region: process.env.UPLOAD_S3_REGION || '',
    accessKeyId: process.env.UPLOAD_S3_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.UPLOAD_S3_SECRET_ACCESS_KEY || '',
  },
}));
