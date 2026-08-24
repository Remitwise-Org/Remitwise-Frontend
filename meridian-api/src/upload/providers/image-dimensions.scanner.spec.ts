import { ImageDimensionsScanner } from './image-dimensions.scanner';
import { ConfigService } from '@nestjs/config';
import { BadRequestException } from '@nestjs/common';

describe('ImageDimensionsScanner', () => {
  let scanner: ImageDimensionsScanner;
  let configService: jest.Mocked<ConfigService>;

  beforeEach(() => {
    configService = {
      get: jest.fn().mockImplementation((key: string) => {
        if (key === 'MAX_IMAGE_WIDTH') return 4096;
        if (key === 'MAX_IMAGE_HEIGHT') return 4096;
        return undefined;
      }),
    } as unknown as jest.Mocked<ConfigService>;

    scanner = new ImageDimensionsScanner(configService);
  });

  function makeFile(mimetype: string, buffer: Buffer): Express.Multer.File {
    return {
      mimetype,
      buffer,
      originalname: 'test.img',
    } as Express.Multer.File;
  }

  // 100x100 PNG
  const validPngBuffer = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, // Signature
    0x00, 0x00, 0x00, 0x0d, // Length of IHDR
    0x49, 0x48, 0x44, 0x52, // 'IHDR'
    0x00, 0x00, 0x00, 0x64, // Width: 100
    0x00, 0x00, 0x00, 0x64, // Height: 100
  ]);

  // 5000x100 PNG (oversized width)
  const oversizedPngBuffer = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    0x00, 0x00, 0x00, 0x0d,
    0x49, 0x48, 0x44, 0x52,
    0x00, 0x00, 0x13, 0x88, // Width: 5000
    0x00, 0x00, 0x00, 0x64, // Height: 100
  ]);

  // 100x100 GIF
  const validGifBuffer = Buffer.from([
    0x47, 0x49, 0x46, 0x38, 0x39, 0x61, // GIF89a
    0x64, 0x00, // Logical width: 100
    0x64, 0x00, // Logical height: 100
  ]);

  // 100x5000 GIF (oversized height)
  const oversizedGifBuffer = Buffer.from([
    0x47, 0x49, 0x46, 0x38, 0x39, 0x61,
    0x64, 0x00, // Logical width: 100
    0x88, 0x13, // Logical height: 5000
  ]);

  // 100x100 JPEG SOF0
  const validJpegBuffer = Buffer.from([
    0xff, 0xd8, // SOI
    0xff, 0xc0, // SOF0
    0x00, 0x0b, // Segment length: 11
    0x08, // Precision
    0x00, 0x64, // Height: 100
    0x00, 0x64, // Width: 100
  ]);

  // 6000x100 JPEG SOF0
  const oversizedJpegBuffer = Buffer.from([
    0xff, 0xd8,
    0xff, 0xc0,
    0x00, 0x0b,
    0x08,
    0x00, 0x64, // Height: 100
    0x17, 0x70, // Width: 6000
  ]);

  it('accepts valid PNG image', async () => {
    const file = makeFile('image/png', validPngBuffer);
    await expect(scanner.scan(file)).resolves.toBeUndefined();
  });

  it('rejects oversized PNG image', async () => {
    const file = makeFile('image/png', oversizedPngBuffer);
    await expect(scanner.scan(file)).rejects.toThrow(BadRequestException);
    await expect(scanner.scan(file)).rejects.toThrow(/exceed the maximum/i);
  });

  it('accepts valid GIF image', async () => {
    const file = makeFile('image/gif', validGifBuffer);
    await expect(scanner.scan(file)).resolves.toBeUndefined();
  });

  it('rejects oversized GIF image', async () => {
    const file = makeFile('image/gif', oversizedGifBuffer);
    await expect(scanner.scan(file)).rejects.toThrow(BadRequestException);
  });

  it('accepts valid JPEG image', async () => {
    const file = makeFile('image/jpeg', validJpegBuffer);
    await expect(scanner.scan(file)).resolves.toBeUndefined();
  });

  it('rejects oversized JPEG image', async () => {
    const file = makeFile('image/jpeg', oversizedJpegBuffer);
    await expect(scanner.scan(file)).rejects.toThrow(BadRequestException);
  });

  it('skips scanning for non-image MIME types', async () => {
    const file = makeFile('application/pdf', Buffer.from('%PDF-1.4'));
    await expect(scanner.scan(file)).resolves.toBeUndefined();
  });

  it('throws BadRequestException for corrupted/invalid images', async () => {
    const file = makeFile('image/png', Buffer.from([0x00, 0x01, 0x02]));
    await expect(scanner.scan(file)).rejects.toThrow(BadRequestException);
    await expect(scanner.scan(file)).rejects.toThrow(/invalid image/i);
  });
});
