import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ContentScanner } from '../interfaces/content-scanner.interface';

@Injectable()
export class ImageDimensionsScanner implements ContentScanner {
  constructor(private readonly configService: ConfigService) {}

  async scan(file: Express.Multer.File): Promise<void> {
    if (!['image/jpeg', 'image/png', 'image/gif'].includes(file.mimetype)) {
      return;
    }

    const maxWidth = this.configService.get<number>('MAX_IMAGE_WIDTH') || 4096;
    const maxHeight = this.configService.get<number>('MAX_IMAGE_HEIGHT') || 4096;

    let dimensions: { width: number; height: number };
    try {
      dimensions = this.getImageDimensions(file.buffer, file.mimetype);
    } catch (err) {
      throw new BadRequestException(`Invalid image or unable to parse dimensions: ${err.message}`);
    }

    if (dimensions.width > maxWidth || dimensions.height > maxHeight) {
      throw new BadRequestException(
        `Image dimensions (${dimensions.width}x${dimensions.height}) exceed the maximum allowed limit of ${maxWidth}x${maxHeight}`,
      );
    }
  }

  private getImageDimensions(buffer: Buffer, mimetype: string): { width: number; height: number } {
    if (mimetype === 'image/png') {
      return this.parsePng(buffer);
    } else if (mimetype === 'image/gif') {
      return this.parseGif(buffer);
    } else if (mimetype === 'image/jpeg') {
      return this.parseJpeg(buffer);
    }
    throw new Error('Unsupported image mimetype');
  }

  private parsePng(buffer: Buffer): { width: number; height: number } {
    // PNG signature is 8 bytes. IHDR starts at offset 8.
    // Length: 4 bytes (offset 8-11)
    // Marker: 'IHDR' (offset 12-15)
    // Width: 4 bytes (offset 16-19)
    // Height: 4 bytes (offset 20-23)
    if (buffer.length < 24) {
      throw new Error('Buffer too small for PNG header');
    }
    const width = buffer.readUInt32BE(16);
    const height = buffer.readUInt32BE(20);
    return { width, height };
  }

  private parseGif(buffer: Buffer): { width: number; height: number } {
    // GIF header: signature 'GIF87a' or 'GIF89a' (6 bytes)
    // Logical screen width: 2 bytes (offset 6)
    // Logical screen height: 2 bytes (offset 8)
    if (buffer.length < 10) {
      throw new Error('Buffer too small for GIF header');
    }
    const width = buffer.readUInt16LE(6);
    const height = buffer.readUInt16LE(8);
    return { width, height };
  }

  private parseJpeg(buffer: Buffer): { width: number; height: number } {
    let offset = 2; // skip SOI (0xFFD8)
    while (offset < buffer.length) {
      if (buffer[offset] !== 0xff) {
        throw new Error('Invalid JPEG marker structure');
      }

      // Skip padding 0xFF bytes
      while (buffer[offset] === 0xff && offset < buffer.length) {
        offset++;
      }

      if (offset >= buffer.length) {
        throw new Error('Invalid JPEG structure: unexpected EOF');
      }

      const marker = buffer[offset];
      offset++;

      // Markers with no payload length
      if (marker === 0xd9 || marker === 0xd8) {
        continue;
      }

      // SOF0 through SOF15 (except SOF4, SOF8, SOF12 which are not standard frame markers)
      const isSof = (marker >= 0xc0 && marker <= 0xcf) && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;

      if (isSof) {
        if (offset + 7 > buffer.length) {
          throw new Error('Invalid JPEG structure: SOF segment truncated');
        }
        const height = buffer.readUInt16BE(offset + 3);
        const width = buffer.readUInt16BE(offset + 5);
        return { width, height };
      }

      // Skip segment
      if (offset + 2 > buffer.length) {
        throw new Error('Invalid JPEG segment length');
      }
      const segmentLength = buffer.readUInt16BE(offset);
      offset += segmentLength;
    }
    throw new Error('SOF marker not found in JPEG');
  }
}
