import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataEncryptionKey } from './entities/data-encryption-key.entity';
import { CryptoProvider } from './providers/crypto.provider';
import { KeyRotationService } from './providers/key-rotation.service';

/**
 * Envelope-encryption module (issue #631).
 *
 * Provides CryptoProvider (AES-256-GCM with per-user DEKs wrapped by a
 * master KEK) and KeyRotationService (re-wrap DEKs under a new KEK). Import
 * this module wherever sensitive values need to be encrypted at rest.
 */
@Module({
  imports: [TypeOrmModule.forFeature([DataEncryptionKey])],
  providers: [CryptoProvider, KeyRotationService],
  exports: [CryptoProvider, KeyRotationService],
})
export class CryptoModule {}
