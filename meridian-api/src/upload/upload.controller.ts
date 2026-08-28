import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { UploadService, MAX_FILE_SIZE } from './upload.service';
import { RequirePermissions } from 'src/auth/decorators/permissions/permissions.decorator';
import { Permission } from 'src/auth/enums/permission.enum';

@ApiTags('Upload')
@Controller('upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload a file asset' })
  @ApiResponse({ status: 201, description: 'File successfully uploaded' })
  @ApiResponse({ status: 401, description: 'Unauthorized — a valid token is required' })
  @RequirePermissions(Permission.UPLOAD_CREATE)
  @ApiBearerAuth()
  @ApiResponse({
    status: 400,
    description: 'Bad request – invalid file type, size, or content',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Allowed types: JPEG, PNG, GIF, PDF. Max size: 5 MB.',
        },
      },
    },
  })
  async uploadFile(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          // Layer 1 – size guard (fast-fail before reading the whole buffer).
          new MaxFileSizeValidator({
            maxSize: MAX_FILE_SIZE,
            message: 'File size exceeds the 5 MB limit',
          }),
          // Layer 2 – MIME-type guard (header-level).
          // Deep content validation (magic bytes) is done inside UploadService.
          new FileTypeValidator({
            fileType: /^(image\/jpeg|image\/png|image\/gif|application\/pdf)$/,
          }),
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    return this.uploadService.uploadFile(file);
  }
}
