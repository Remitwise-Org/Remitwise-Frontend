import { S3StorageProvider } from './s3-storage.provider';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

// Mock the entire AWS SDK S3 client so tests run without real credentials.
jest.mock('@aws-sdk/client-s3', () => {
  const sendMock = jest.fn().mockResolvedValue({});
  return {
    S3Client: jest.fn().mockImplementation(() => ({ send: sendMock })),
    PutObjectCommand: jest.fn().mockImplementation((input) => input),
    __sendMock: sendMock,
  };
});

function makeConfigService(
  overrides: Record<string, string> = {},
): ConfigService {
  return {
    get: jest.fn((key: string) => {
      const defaults: Record<string, string> = {
        UPLOAD_S3_BUCKET: 'my-test-bucket',
        UPLOAD_S3_REGION: 'us-west-2',
        UPLOAD_S3_ACCESS_KEY_ID: '',
        UPLOAD_S3_SECRET_ACCESS_KEY: '',
      };
      return overrides[key] ?? defaults[key] ?? null;
    }),
  } as unknown as ConfigService;
}

function makeFile(originalname: string): Express.Multer.File {
  return {
    originalname,
    mimetype: 'image/png',
    buffer: Buffer.from('fake png data'),
    size: 13,
  } as Express.Multer.File;
}

describe('S3StorageProvider', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    const provider = new S3StorageProvider(makeConfigService());
    expect(provider).toBeDefined();
  });

  it('returns a correctly formatted S3 URL with a sanitized filename', async () => {
    const provider = new S3StorageProvider(makeConfigService());
    const result = await provider.uploadFile(makeFile('hello world!.png'));

    expect(result).toMatch(
      /^https:\/\/my-test-bucket\.s3\.us-west-2\.amazonaws\.com\/.+\.png$/,
    );
    expect(result).not.toContain(' ');
    expect(result).not.toContain('!');
  });

  it('calls PutObjectCommand with correct Bucket, Key, Body, and ContentType', async () => {
    const provider = new S3StorageProvider(makeConfigService());
    await provider.uploadFile(makeFile('document.pdf'));

    expect(PutObjectCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        Bucket: 'my-test-bucket',
        ContentType: 'image/png',
        Body: expect.any(Buffer),
        Key: expect.stringMatching(/\.pdf$/),
      }),
    );
  });

  it('throws InternalServerErrorException when bucket is missing', async () => {
    const provider = new S3StorageProvider(
      makeConfigService({
        UPLOAD_S3_BUCKET: '',
        UPLOAD_S3_REGION: 'us-east-1',
      }),
    );
    await expect(provider.uploadFile(makeFile('test.png'))).rejects.toThrow(
      'S3 storage is not properly configured (missing bucket or region)',
    );
  });

  it('throws InternalServerErrorException when region is missing', async () => {
    const provider = new S3StorageProvider(
      makeConfigService({ UPLOAD_S3_BUCKET: 'bucket', UPLOAD_S3_REGION: '' }),
    );
    await expect(provider.uploadFile(makeFile('test.png'))).rejects.toThrow(
      'S3 storage is not properly configured (missing bucket or region)',
    );
  });

  it('wraps SDK errors in InternalServerErrorException', async () => {
    // Make the mocked send() throw on the next call.
    const { __sendMock } = jest.requireMock('@aws-sdk/client-s3') as {
      __sendMock: jest.Mock;
    };
    __sendMock.mockRejectedValueOnce(new Error('Network timeout'));

    const provider = new S3StorageProvider(makeConfigService());
    await expect(provider.uploadFile(makeFile('test.png'))).rejects.toThrow(
      'S3 file storage failed: Network timeout',
    );
  });

  it('strips double extensions from the S3 key', async () => {
    const provider = new S3StorageProvider(makeConfigService());
    const result = await provider.uploadFile(makeFile('malware.php.png'));

    expect(result).toMatch(/\.png$/);
    expect(result).not.toContain('.php.');
  });
});
