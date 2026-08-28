import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  UploadService,
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE,
} from './upload.service';
import { StorageProvider } from './storage-provider.interface';
import { Upload } from './upload.entity';
import { ContentScanner } from './interfaces/content-scanner.interface';

// Valid magic-byte headers for each allowed type
const MAGIC: Record<string, Buffer> = {
  'image/jpeg': Buffer.from([0xff, 0xd8, 0xff, 0x00]),
  'image/png': Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  'image/gif': Buffer.from([0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x00]),
  'application/pdf': Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2d]),
};

const EXTENSIONS: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/gif': '.gif',
  'application/pdf': '.pdf',
};

function makeFile(
  overrides: Partial<Express.Multer.File> & { mimetype: string },
): Express.Multer.File {
  const magic = MAGIC[overrides.mimetype] ?? Buffer.alloc(0);
  return {
    originalname: 'test.png',
    size: magic.length,
    buffer: magic,
    ...overrides,
  } as Express.Multer.File;
}

describe('UploadService', () => {
  let service: UploadService;
  let storageProvider: jest.Mocked<StorageProvider>;
  let mockUploadRepository: any;
  let mockImageDimensionsScanner: jest.Mocked<ContentScanner>;
  let mockClamAvScanner: jest.Mocked<ContentScanner>;

  beforeEach(async () => {
    storageProvider = {
      uploadFile: jest.fn().mockResolvedValue('/uploads/test.png'),
    };

    mockUploadRepository = {
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockImplementation((dto) => dto),
      save: jest.fn().mockImplementation((entity) => Promise.resolve(entity)),
    };

    mockImageDimensionsScanner = {
      scan: jest.fn().mockResolvedValue(undefined),
    };

    mockClamAvScanner = {
      scan: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UploadService,
        { provide: 'STORAGE_PROVIDER', useValue: storageProvider },
        {
          provide: 'CONTENT_SCANNERS',
          useValue: [mockImageDimensionsScanner, mockClamAvScanner],
        },
        {
          provide: getRepositoryToken(Upload),
          useValue: mockUploadRepository,
        },
      ],
    }).compile();

    service = module.get<UploadService>(UploadService);
  });

  // ── happy path ─────────────────────────────────────────────────────────────

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it.each(ALLOWED_MIME_TYPES)(
    'accepts valid %s files and delegates to the storage provider',
    async (mime) => {
      const ext = EXTENSIONS[mime];
      const filename = `file${ext}`;
      const file = makeFile({ mimetype: mime, originalname: filename });
      storageProvider.uploadFile.mockResolvedValueOnce(`/uploads/${filename}`);

      const result = await service.uploadFile(file);
      expect(storageProvider.uploadFile).toHaveBeenCalledWith(file);
      expect(result).toEqual({ url: `/uploads/${filename}`, originalName: filename });
    },
  );

  // ── missing file ────────────────────────────────────────────────────────────

  it('throws BadRequestException when file is undefined', async () => {
    await expect(
      service.uploadFile(undefined as unknown as Express.Multer.File),
    ).rejects.toThrow(BadRequestException);
  });

  // ── MIME-type validation ────────────────────────────────────────────────────

  it('throws BadRequestException for a disallowed MIME type', async () => {
    const file = makeFile({
      mimetype: 'application/javascript',
      buffer: Buffer.from('alert(1)'),
    });

    await expect(service.uploadFile(file)).rejects.toThrow(BadRequestException);
    await expect(service.uploadFile(file)).rejects.toThrow(/not allowed/i);
  });

  it('throws BadRequestException for application/octet-stream', async () => {
    const file = makeFile({
      mimetype: 'application/octet-stream',
      buffer: Buffer.from([0x4d, 0x5a]), // PE header (Windows exe)
    });
    await expect(service.uploadFile(file)).rejects.toThrow(BadRequestException);
  });

  // ── magic-byte validation ───────────────────────────────────────────────────

  it('throws BadRequestException when buffer does not match declared MIME (jpeg spoofed as png)', async () => {
    const file = makeFile({
      mimetype: 'image/png',
      // JPEG magic bytes, not PNG
      buffer: Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00]),
    });
    await expect(service.uploadFile(file)).rejects.toThrow(BadRequestException);
    await expect(service.uploadFile(file)).rejects.toThrow(/magic byte/i);
  });

  it('throws BadRequestException when an exe is disguised as a PDF', async () => {
    const file = makeFile({
      mimetype: 'application/pdf',
      originalname: 'invoice.pdf',
      // MZ (Windows executable) magic bytes instead of %PDF
      buffer: Buffer.from([0x4d, 0x5a, 0x90, 0x00]),
    });
    await expect(service.uploadFile(file)).rejects.toThrow(BadRequestException);
  });

  it('accepts GIF87a magic bytes for image/gif', async () => {
    const gif87aBuffer = Buffer.from([
      0x47, 0x49, 0x46, 0x38, 0x37, 0x61, 0x01, 0x00,
    ]);
    const file = makeFile({
      mimetype: 'image/gif',
      originalname: 'anim.gif',
      buffer: gif87aBuffer,
    });
    storageProvider.uploadFile.mockResolvedValueOnce('/uploads/anim.gif');
    const result = await service.uploadFile(file);
    expect(result.url).toBe('/uploads/anim.gif');
  });

  // ── size constant ───────────────────────────────────────────────────────────

  it('exports MAX_FILE_SIZE of 5 MB', () => {
    expect(MAX_FILE_SIZE).toBe(5 * 1024 * 1024);
  });

  it('exports the expected ALLOWED_MIME_TYPES', () => {
    expect(ALLOWED_MIME_TYPES).toEqual(
      expect.arrayContaining([
        'image/jpeg',
        'image/png',
        'image/gif',
        'application/pdf',
      ]),
    );
  });

  // ── new pipeline features ───────────────────────────────────────────────────

  it('deduplicates uploads: returns existing URL without re-uploading if file hash exists', async () => {
    const file = makeFile({ mimetype: 'image/png', originalname: 'duplicate.png' });
    const existingRecord = {
      url: '/uploads/existing-duplicate.png',
      originalName: 'sanitized-duplicate.png',
      contentHash: 'hash123',
    };

    mockUploadRepository.findOne.mockResolvedValueOnce(existingRecord);

    const result = await service.uploadFile(file);

    expect(mockUploadRepository.findOne).toHaveBeenCalled();
    expect(storageProvider.uploadFile).not.toHaveBeenCalled();
    expect(result).toEqual({
      url: existingRecord.url,
      originalName: existingRecord.originalName,
    });
  });

  it('sanitizes and HTML-escapes originalName, and enforces extension matching MIME type', async () => {
    const file = makeFile({
      mimetype: 'image/png',
      originalname: '../../path/to/<img src=x onerror=alert(1)>.jpg', // mismatch ext + XSS payload + path traversal
    });

    storageProvider.uploadFile.mockResolvedValueOnce('/uploads/sanitized.png');

    const result = await service.uploadFile(file);

    // .jpg is mismatched for image/png MIME, so it gets corrected to .png
    // The path separators/traversal is stripped: only basename is kept.
    // HTML tags in the basename are escaped.
    const expectedName = '&lt;img src=x onerror=alert(1)&gt;.png';
    expect(result.originalName).toBe(expectedName);
    expect(storageProvider.uploadFile).toHaveBeenCalled();
    expect(mockUploadRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        originalName: expectedName,
      }),
    );
  });

  it('rejects upload when ImageDimensionsScanner throws error (decompression bomb)', async () => {
    const file = makeFile({ mimetype: 'image/png', originalname: 'bomb.png' });
    mockImageDimensionsScanner.scan.mockRejectedValueOnce(
      new BadRequestException('Image dimensions exceed the maximum allowed limit'),
    );

    await expect(service.uploadFile(file)).rejects.toThrow('Image dimensions exceed the maximum allowed limit');
    expect(storageProvider.uploadFile).not.toHaveBeenCalled();
  });

  it('rejects upload when ClamAvScanner throws error (virus found)', async () => {
    const file = makeFile({ mimetype: 'image/png', originalname: 'virus.png' });
    mockClamAvScanner.scan.mockRejectedValueOnce(
      new BadRequestException('Virus detected in uploaded file'),
    );

    await expect(service.uploadFile(file)).rejects.toThrow('Virus detected in uploaded file');
    expect(storageProvider.uploadFile).not.toHaveBeenCalled();
  });
});
