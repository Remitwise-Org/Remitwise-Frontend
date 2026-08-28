import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { DataResponseInterceptor } from './common/interceptors/data-response.interceptor';
import { ConfigService } from '@nestjs/config';
import { validationExceptionFactory } from './common/exceptions/validation.exception';
import { SanitizePipe } from './common/pipes/sanitize.pipe';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // Apply baseline security headers (Closes #448).
  // CSP is disabled to avoid breaking the @nestjs/swagger UI at /api,
  // which requires inline scripts/styles. Other helmet defaults (HSTS,
  // X-Frame-Options, X-Content-Type-Options, Referrer-Policy, etc.) remain on.
  app.use(helmet({ contentSecurityPolicy: false }));

  // CORS Configuration
  const nodeEnv = configService.get<string>('NODE_ENV') || 'development';
  const allowedOriginsString = configService.get<string>('ALLOWED_ORIGINS');
  const allowedOrigins = allowedOriginsString
    ? allowedOriginsString.split(',').map((origin) => origin.trim())
    : [];

  // In development, we can allow all origins if no ALLOWED_ORIGINS is set
  // In production, we strictly enforce allowed origins
  let corsOrigin:
    | boolean
    | string
    | string[]
    | ((
        origin: string,
        callback: (err: Error | null, allow?: boolean) => void,
      ) => void);
  if (nodeEnv === 'development' && allowedOrigins.length === 0) {
    corsOrigin = true;
  } else {
    corsOrigin = (
      origin: string,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    };
  }

  app.enableCors({
    origin: corsOrigin,
    credentials: true,
  });

  // Sanitize all request body strings before validation to prevent XSS (issue #453).
  app.useGlobalPipes(new SanitizePipe());
  // Enable URI-based API versioning (issue #454).
  // All existing routes remain accessible at their current paths.
  // New routes should declare a @Version('1') decorator and be mounted
  // under /api/v1/... for forward compatibility.
  app.enableVersioning({
    type: VersioningType.URI,
    prefix: 'v',
    defaultVersion: '1',
  });

  // Set global validation pipes. The custom `exceptionFactory` reshapes
  // class-validator's flat `message: string[]` response into a structured
  // `{ errors: [{ field, message, constraint }] }` shape that the frontend
  // can pin directly to specific form fields.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
      exceptionFactory: validationExceptionFactory,
    }),
  );

  // Swagger configuration
  const config = new DocumentBuilder()
    .setTitle('Meridian API') // Add a title
    .setDescription(
      'Productivity-powered on-chain economy built on the Stellar blockchain.',
    ) // Add a description
    .setTermsOfService('http://localhost:3000/terms of service')
    .setVersion('1.0') // Set the API version
    .addBearerAuth()
    .addApiKey(
      {
        type: 'apiKey',
        name: 'X-Correlation-ID',
        in: 'header',
        description:
          'Optional request correlation ID. Generated if omitted. Echoed on every response as X-Correlation-ID.',
      },
      'correlation-id',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document); // Serve Swagger at '/api'

  //making intwerceptor global
  app.useGlobalInterceptors(new DataResponseInterceptor());

  await app.listen(process.env.PORT ?? 3000);
}

bootstrap();
