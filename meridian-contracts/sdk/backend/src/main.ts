import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  const app = await NestFactory.create(AppModule);

  // Enable global input validation via class-validator DTOs
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // strip unknown properties
      forbidNonWhitelisted: true, // reject requests with unknown fields
      transform: true, // auto-transform payloads to DTO instances
      enableDebugMessages: process.env.NODE_ENV !== 'production',
    }),
  );

  const port = process.env.PORT || 3000;
  await app.listen(port);

  logger.log(`Storage service running on http://localhost:${port}`);
  logger.log(`Storage API available at http://localhost:${port}/storage`);
}

bootstrap().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error('Failed to start storage service:', message);
  process.exit(1);
});
