import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { StorageProvider } from '../storage-provider.interface';
import { sanitizeFilename } from '../utils/sanitize-filename';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Stores uploaded files on the local filesystem under <cwd>/uploads/.
 *
 * Security measures:
 *  - Filenames are sanitized via sanitizeFilename() (path traversal, double
 *    extensions, special characters).
 *  - The resolved destination path is verified to remain inside the uploads
 *    directory before writing (belt-and-suspenders path traversal check).
 *  - The uploads directory is created with mode 0o755 if it does not yet exist.
 */
@Injectable()
export class LocalStorageProvider implements StorageProvider {
  async uploadFile(file: Express.Multer.File): Promise<string> {
    try {
      const uploadDir = path.join(process.cwd(), 'uploads');

      // Ensure directory exists with safe permissions (not world-writable).
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true, mode: 0o755 });
      }

      const uniqueName = sanitizeFilename(file.originalname);
      const filePath = path.join(uploadDir, uniqueName);

      // Final path-traversal guard: resolved path must stay inside uploadDir.
      const resolvedPath = path.resolve(filePath);
      const resolvedUploadDir = path.resolve(uploadDir);

      if (
        !resolvedPath.startsWith(resolvedUploadDir + path.sep) &&
        resolvedPath !== resolvedUploadDir
      ) {
        throw new InternalServerErrorException(
          'Invalid file path detected (potential path traversal)',
        );
      }

      await fs.promises.writeFile(filePath, file.buffer);

      return `/uploads/${uniqueName}`;
    } catch (error) {
      if (error instanceof InternalServerErrorException) throw error;
      throw new InternalServerErrorException(
        `Local file storage failed: ${(error as Error).message}`,
      );
    }
  }
}
