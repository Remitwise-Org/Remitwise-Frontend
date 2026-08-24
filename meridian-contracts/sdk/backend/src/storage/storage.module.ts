import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { StorageService } from './storage.service';
import { StorageController } from './storage.controller';
import configuration from '../config/configuration';

/**
 * StorageModule provides IPFS-based decentralized storage functionality.
 *
 * Exports:
 *  - StorageService: available for injection in other modules
 *
 * Imports:
 *  - ConfigModule: for environment-based configuration
 */
@Module({
  imports: [ConfigModule.forFeature(configuration)],
  controllers: [StorageController],
  providers: [StorageService],
  exports: [StorageService],
})
export class StorageModule {}
