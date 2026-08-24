import { ClamAvScanner } from './clam-av.scanner';
import { ConfigService } from '@nestjs/config';
import { BadRequestException } from '@nestjs/common';
import * as net from 'net';
import * as child_process from 'child_process';
import { EventEmitter } from 'events';
import * as fs from 'fs';

describe('ClamAvScanner', () => {
  let scanner: ClamAvScanner;
  let configService: jest.Mocked<ConfigService>;

  beforeEach(() => {
    configService = {
      get: jest.fn().mockImplementation((key: string) => {
        if (key === 'CLAMAV_HOST') return 'localhost';
        if (key === 'CLAMAV_PORT') return 3310;
        if (key === 'CLAMAV_PREFER_TCP') return true;
        return undefined;
      }),
    } as unknown as jest.Mocked<ConfigService>;

    scanner = new ClamAvScanner(configService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  function makeFile(buffer: Buffer): Express.Multer.File {
    return {
      buffer,
      originalname: 'virus-test.txt',
    } as Express.Multer.File;
  }

  describe('scanTcp', () => {
    it('successfully scans clean file', async () => {
      const mockSocket = new EventEmitter() as any;
      mockSocket.write = jest.fn();
      mockSocket.end = jest.fn();

      jest.spyOn(net, 'createConnection').mockReturnValue(mockSocket);

      const scanPromise = scanner.scan(makeFile(Buffer.from('clean')));

      // Simulate connection established
      mockSocket.emit('connect');

      // Simulate clamd response: stream: OK
      setTimeout(() => {
        mockSocket.emit('data', Buffer.from('stream: OK\n'));
        mockSocket.emit('end');
      }, 10);

      await expect(scanPromise).resolves.toBeUndefined();
    });

    it('rejects infected file with BadRequestException', async () => {
      const mockSocket = new EventEmitter() as any;
      mockSocket.write = jest.fn();
      mockSocket.end = jest.fn();

      jest.spyOn(net, 'createConnection').mockReturnValue(mockSocket);

      const scanPromise = scanner.scan(makeFile(Buffer.from('virus')));

      mockSocket.emit('connect');

      // Simulate clamd response: stream: Eicar-Test-Signature FOUND
      setTimeout(() => {
        mockSocket.emit('data', Buffer.from('stream: Eicar-Test-Signature FOUND\n'));
        mockSocket.emit('end');
      }, 10);

      await expect(scanPromise).rejects.toThrow(BadRequestException);
      await expect(scanPromise).rejects.toThrow(/Virus detected in uploaded file/i);
    });
  });

  describe('scanSpawn (fallback)', () => {
    beforeEach(() => {
      // Disable TCP so it falls back to spawn
      configService.get.mockImplementation((key: string) => {
        if (key === 'CLAMAV_PREFER_TCP') return false;
        return undefined;
      });
    });

    it('successfully scans clean file using clamscan spawn', async () => {
      jest.spyOn(fs, 'existsSync').mockReturnValue(true);
      jest.spyOn(fs, 'writeFileSync').mockImplementation(() => {});
      jest.spyOn(fs, 'unlinkSync').mockImplementation(() => {});

      const mockChild = new EventEmitter() as any;
      mockChild.stdout = new EventEmitter();
      mockChild.stderr = new EventEmitter();

      jest.spyOn(child_process, 'spawn').mockReturnValue(mockChild);

      const scanPromise = scanner.scan(makeFile(Buffer.from('clean')));

      // Simulate exit code 0
      setTimeout(() => {
        mockChild.emit('close', 0);
      }, 10);

      await expect(scanPromise).resolves.toBeUndefined();
    });

    it('rejects infected file using clamscan spawn', async () => {
      jest.spyOn(fs, 'existsSync').mockReturnValue(true);
      jest.spyOn(fs, 'writeFileSync').mockImplementation(() => {});
      jest.spyOn(fs, 'unlinkSync').mockImplementation(() => {});

      const mockChild = new EventEmitter() as any;
      mockChild.stdout = new EventEmitter();
      mockChild.stderr = new EventEmitter();

      jest.spyOn(child_process, 'spawn').mockReturnValue(mockChild);

      const scanPromise = scanner.scan(makeFile(Buffer.from('virus')));

      // Simulate exit code 1 (Virus found)
      setTimeout(() => {
        mockChild.emit('close', 1);
      }, 10);

      await expect(scanPromise).rejects.toThrow(BadRequestException);
      await expect(scanPromise).rejects.toThrow(/Virus detected in uploaded file/i);
    });
  });
});
