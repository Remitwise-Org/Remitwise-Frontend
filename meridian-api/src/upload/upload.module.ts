import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UploadController } from './upload.controller';
import { UploadService } from './upload.service';
import { LocalStorageProvider } from './providers/local-storage.provider';
import { S3StorageProvider } from './providers/s3-storage.provider';
import { Upload } from './upload.entity';
import { ImageDimensionsScanner } from './providers/image-dimensions.scanner';
import { ClamAvScanner } from './providers/clam-av.scanner';
import uploadConfig from './config/upload.config';

@Module({
  imports: [
    ConfigModule.forFeature(uploadConfig),
    TypeOrmModule.forFeature([Upload]),
  ],
  controllers: [UploadController],
  providers: [
    UploadService,
    LocalStorageProvider,
    S3StorageProvider,
    ImageDimensionsScanner,
    ClamAvScanner,
    {
      provide: 'STORAGE_PROVIDER',
      inject: [ConfigService, LocalStorageProvider, S3StorageProvider],
      useFactory: (
        configService: ConfigService,
        local: LocalStorageProvider,
        s3: S3StorageProvider,
      ) => {
        const providerType =
          configService.get<string>('STORAGE_PROVIDER') || 'local';
        return providerType.toLowerCase() === 's3' ? s3 : local;
      },
    },
    {
      provide: 'CONTENT_SCANNERS',
      inject: [ImageDimensionsScanner, ClamAvScanner],
      useFactory: (
        imageScanner: ImageDimensionsScanner,
        clamScanner: ClamAvScanner,
      ) => [imageScanner, clamScanner],
    },
  ],
  exports: [UploadService],
})
export class UploadModule {}
