import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StorageProvider } from './storage-provider.interface';
import { Upload } from './upload.entity';
import { ContentScanner } from './interfaces/content-scanner.interface';
import * as crypto from 'crypto';
import * as path from 'path';

/**
 * Magic-byte signatures for allowed file types.
 *
 * Each entry maps a MIME type to one or more byte sequences that should appear
 * at the start of a valid file of that type.  Checking magic bytes prevents
 * attackers from bypassing the MIME-type filter by renaming a file.
 */
const MAGIC_BYTES: Record<string, Buffer[]> = {
  'image/jpeg': [Buffer.from([0xff, 0xd8, 0xff])],
  'image/png': [Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])],
  'image/gif': [
    Buffer.from([0x47, 0x49, 0x46, 0x38, 0x37, 0x61]), // GIF87a
    Buffer.from([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]), // GIF89a
  ],
  'application/pdf': [Buffer.from([0x25, 0x50, 0x44, 0x46])], // %PDF
};

/** MIME types accepted by this service (mirrors the controller's FileTypeValidator). */
export const ALLOWED_MIME_TYPES = Object.keys(MAGIC_BYTES);

/** Maximum file size in bytes (5 MB). Also enforced at the controller layer. */
export const MAX_FILE_SIZE = 5 * 1024 * 1024;

const MIME_TO_EXTENSIONS: Record<string, string[]> = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/gif': ['.gif'],
  'application/pdf': ['.pdf'],
};

@Injectable()
export class UploadService {
  constructor(
    @Inject('STORAGE_PROVIDER')
    private readonly storageProvider: StorageProvider,
    @Inject('CONTENT_SCANNERS')
    private readonly scanners: ContentScanner[],
    @InjectRepository(Upload)
    private readonly uploadRepository: Repository<Upload>,
  ) {}

  async uploadFile(
    file: Express.Multer.File,
  ): Promise<{ url: string; originalName: string }> {
    if (!file) {
      throw new BadRequestException('No file uploaded or file is invalid');
    }

    // Compute SHA-256 hash of the buffer
    const hash = crypto.createHash('sha256').update(file.buffer).digest('hex');

    // Check if the hash exists for deduplication
    const existingUpload = await this.uploadRepository.findOne({
      where: { contentHash: hash },
    });

    if (existingUpload) {
      return {
        url: existingUpload.url,
        originalName: existingUpload.originalName,
      };
    }

    this.validateMimeType(file);
    this.validateMagicBytes(file);

    // Execute scanners (image dimension check & antivirus scan)
    for (const scanner of this.scanners) {
      await scanner.scan(file);
    }

    // Sanitize/normalize originalName
    const sanitizedName = this.sanitizeOriginalName(
      file.originalname,
      file.mimetype,
    );

    // Update file originalname before storing, so the stored file has the safe name
    file.originalname = sanitizedName;

    const url = await this.storageProvider.uploadFile(file);

    // Save metadata in database
    const upload = this.uploadRepository.create({
      contentHash: hash,
      url,
      originalName: sanitizedName,
      mimeType: file.mimetype,
      size: file.size,
    });
    await this.uploadRepository.save(upload);

    return { url, originalName: sanitizedName };
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private validateMimeType(file: Express.Multer.File): void {
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        `File type "${file.mimetype}" is not allowed. ` +
          `Accepted types: ${ALLOWED_MIME_TYPES.join(', ')}`,
      );
    }
  }

  /**
   * Validates the file buffer against known magic bytes for its declared MIME
   * type.  This prevents simple MIME-spoofing attacks (e.g. an .exe renamed
   * to .png with a faked Content-Type header).
   */
  private validateMagicBytes(file: Express.Multer.File): void {
    const signatures = MAGIC_BYTES[file.mimetype];
    if (!signatures) return; // guarded already by validateMimeType

    const isValid = signatures.some((sig) =>
      file.buffer.slice(0, sig.length).equals(sig),
    );

    if (!isValid) {
      throw new BadRequestException(
        'File content does not match its declared type (magic byte mismatch)',
      );
    }
  }

  private sanitizeOriginalName(originalname: string, mimetype: string): string {
    if (!originalname) {
      originalname = 'unnamed';
    }

    // 1. Strip path separators
    const base = path.basename(originalname);

    // 2. Extract extension and stem
    const ext = path.extname(base).toLowerCase();
    const stem = path.basename(base, ext);

    // 3. Enforce extension matches MIME
    const allowedExtensions = MIME_TO_EXTENSIONS[mimetype] || [];
    let targetExt = ext;
    if (!allowedExtensions.includes(ext)) {
      targetExt = allowedExtensions[0] || '';
    }

    // 4. HTML-escape stem and extension
    const escapedStem = this.htmlEscape(stem);
    const escapedExt = this.htmlEscape(targetExt);

    return `${escapedStem}${escapedExt}`;
  }

  private htmlEscape(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }
}
