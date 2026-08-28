import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ContentScanner } from '../interfaces/content-scanner.interface';
import * as net from 'net';
import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class ClamAvScanner implements ContentScanner {
  private readonly logger = new Logger(ClamAvScanner.name);

  constructor(private readonly configService: ConfigService) {}

  async scan(file: Express.Multer.File): Promise<void> {
    const host = this.configService.get<string>('CLAMAV_HOST');
    const port = this.configService.get<number>('CLAMAV_PORT') || 3310;
    const preferTcp = this.configService.get<boolean>('CLAMAV_PREFER_TCP', true);

    if (preferTcp && host) {
      try {
        await this.scanTcp(file.buffer, host, port);
        return;
      } catch (err) {
        if (err instanceof BadRequestException) {
          throw err;
        }
        this.logger.warn(`ClamAV TCP scan failed, falling back to clamscan spawn: ${err.message}`);
      }
    }

    // Fallback: spawn clamscan
    await this.scanSpawn(file.buffer);
  }

  private scanTcp(buffer: Buffer, host: string, port: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const socket = net.createConnection({ host, port });
      let response = '';

      socket.on('connect', () => {
        // Send INSTREAM command
        socket.write('zINSTREAM\0');

        // Send buffer in chunks
        const chunkSize = 2048;
        for (let i = 0; i < buffer.length; i += chunkSize) {
          const chunk = buffer.subarray(i, i + chunkSize);
          const sizeBuf = Buffer.alloc(4);
          sizeBuf.writeUInt32BE(chunk.length, 0);
          socket.write(sizeBuf);
          socket.write(chunk);
        }

        // Terminate stream with zero-size chunk
        const zeroSize = Buffer.alloc(4);
        zeroSize.writeUInt32BE(0, 0);
        socket.write(zeroSize);
      });

      socket.on('data', (chunk) => {
        response += chunk.toString();
      });

      socket.on('end', () => {
        if (response.includes('FOUND')) {
          reject(new BadRequestException('Virus detected in uploaded file'));
        } else if (response.includes('OK') || response.includes('stream: OK')) {
          resolve();
        } else {
          reject(new Error(`Unexpected ClamAV response: ${response}`));
        }
      });

      socket.on('error', (err) => {
        reject(err);
      });
    });
  }

  private scanSpawn(buffer: Buffer): Promise<void> {
    return new Promise((resolve, reject) => {
      // Create a temporary file in the workspace
      const tempDir = path.join(process.cwd(), 'temp');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      const tempFilePath = path.join(tempDir, `scan-${Date.now()}-${Math.random().toString(36).substring(7)}`);
      
      try {
        fs.writeFileSync(tempFilePath, buffer);
      } catch (err) {
        return reject(new Error(`Failed to write temp file for clamscan: ${err.message}`));
      }

      const child = spawn('clamscan', [tempFilePath]);

      child.on('error', (err) => {
        try { fs.unlinkSync(tempFilePath); } catch {}
        reject(new Error(`Failed to spawn clamscan: ${err.message}`));
      });

      child.on('close', (code) => {
        try { fs.unlinkSync(tempFilePath); } catch {}

        if (code === 0) {
          resolve();
        } else if (code === 1) {
          reject(new BadRequestException('Virus detected in uploaded file'));
        } else {
          reject(new Error(`clamscan exited with code ${code}`));
        }
      });
    });
  }
}
