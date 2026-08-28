import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { UploadController } from './upload.controller';
import { UploadService } from './upload.service';

// Valid PNG magic bytes
const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function makeFile(
  overrides?: Partial<Express.Multer.File>,
): Express.Multer.File {
  return {
    originalname: 'test.png',
    mimetype: 'image/png',
    buffer: PNG_MAGIC,
    size: PNG_MAGIC.length,
    ...overrides,
  } as Express.Multer.File;
}

describe('UploadController', () => {
  let controller: UploadController;
  let service: jest.Mocked<Pick<UploadService, 'uploadFile'>>;

  beforeEach(async () => {
    service = {
      uploadFile: jest.fn().mockResolvedValue({
        url: '/uploads/test.png',
        originalName: 'test.png',
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UploadController],
      providers: [{ provide: UploadService, useValue: service }],
    }).compile();

    controller = module.get<UploadController>(UploadController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('delegates to uploadService.uploadFile and returns the result', async () => {
    const file = makeFile();
    const result = await controller.uploadFile(file);

    expect(service.uploadFile).toHaveBeenCalledWith(file);
    expect(result).toEqual({
      url: '/uploads/test.png',
      originalName: 'test.png',
    });
  });

  it('propagates BadRequestException from the service', async () => {
    service.uploadFile.mockRejectedValueOnce(
      new BadRequestException(
        'File type "application/javascript" is not allowed',
      ),
    );

    await expect(controller.uploadFile(makeFile())).rejects.toThrow(
      BadRequestException,
    );
  });

  it('propagates BadRequestException for magic byte mismatch', async () => {
    service.uploadFile.mockRejectedValueOnce(
      new BadRequestException('File content does not match its declared type'),
    );

    await expect(controller.uploadFile(makeFile())).rejects.toThrow(
      BadRequestException,
    );
  });
});
