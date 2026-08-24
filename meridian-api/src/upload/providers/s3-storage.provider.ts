import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  PutObjectCommandInput,
} from '@aws-sdk/client-s3';
import { StorageProvider } from '../storage-provider.interface';
import { sanitizeFilename } from '../utils/sanitize-filename';

/**
 * Uploads files to an S3-compatible bucket.
 *
 * Required env vars:
 *   UPLOAD_S3_BUCKET   – target bucket name
 *   UPLOAD_S3_REGION   – AWS region
 *
 * Optional env vars (fall back to the AWS SDK default credential chain):
 *   UPLOAD_S3_ACCESS_KEY_ID
 *   UPLOAD_S3_SECRET_ACCESS_KEY
 *
 * The provider is compatible with any S3-compatible service (MinIO, Cloudflare
 * R2, etc.) as long as the standard AWS SDK credential/config env vars are set.
 */
@Injectable()
export class S3StorageProvider implements StorageProvider {
  private readonly s3Client: S3Client;
  private readonly bucket: string;
  private readonly region: string;

  constructor(private readonly configService: ConfigService) {
    this.bucket = this.configService.get<string>('UPLOAD_S3_BUCKET') ?? '';
    this.region = this.configService.get<string>('UPLOAD_S3_REGION') ?? '';

    const accessKeyId =
      this.configService.get<string>('UPLOAD_S3_ACCESS_KEY_ID') ?? '';
    const secretAccessKey =
      this.configService.get<string>('UPLOAD_S3_SECRET_ACCESS_KEY') ?? '';

    const clientConfig: ConstructorParameters<typeof S3Client>[0] = {
      region: this.region || 'us-east-1',
    };

    // Only supply explicit credentials when both values are present; otherwise
    // fall back to the SDK's default credential provider chain (env vars, ~/.aws
    // config, IAM role, etc.).
    if (accessKeyId && secretAccessKey) {
      clientConfig.credentials = { accessKeyId, secretAccessKey };
    }

    this.s3Client = new S3Client(clientConfig);
  }

  async uploadFile(file: Express.Multer.File): Promise<string> {
    if (!this.bucket || !this.region) {
      throw new InternalServerErrorException(
        'S3 storage is not properly configured (missing bucket or region)',
      );
    }

    try {
      const key = sanitizeFilename(file.originalname);

      const params: PutObjectCommandInput = {
        Bucket: this.bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
        // Do NOT set ACL here — bucket policies are the recommended approach.
      };

      await this.s3Client.send(new PutObjectCommand(params));

      return `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`;
    } catch (error) {
      if (error instanceof InternalServerErrorException) throw error;
      throw new InternalServerErrorException(
        `S3 file storage failed: ${(error as Error).message}`,
      );
    }
  }
}
