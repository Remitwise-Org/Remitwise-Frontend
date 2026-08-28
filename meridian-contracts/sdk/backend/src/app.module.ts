import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { StorageModule } from './storage/storage.module';
import configuration from './config/configuration';

/**
 * Root application module integrating the StorageModule.
 *
 * The ConfigModule is loaded globally so all feature modules
 * can access environment-based configuration via ConfigService.
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: ['.env'],
    }),
    StorageModule,
  ],
})
export class AppModule {}
