process.env.NODE_ENV = 'test';
process.env.POSTGRES_HOST = process.env.POSTGRES_HOST || 'localhost';
process.env.POSTGRES_PORT = process.env.POSTGRES_PORT || '5432';
process.env.POSTGRES_USER = process.env.POSTGRES_USER || 'postgres';
process.env.POSTGRES_PASSWORD = process.env.POSTGRES_PASSWORD || 'password';
process.env.POSTGRES_DB = process.env.POSTGRES_DB || 'meridian';
process.env.JWT_SECRET =
  process.env.JWT_SECRET || 'supersecretjwtkeywithmorethan16characters';
process.env.JWT_TOKEN_AUDIENCE =
  process.env.JWT_TOKEN_AUDIENCE || 'test-audience';
process.env.JWT_TOKEN_ISSUER = process.env.JWT_TOKEN_ISSUER || 'test-issuer';

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import * as net from 'net';

function checkPostgresPort(host: string, port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host, port, timeout: 1000 });
    socket.on('connect', () => {
      socket.end();
      resolve(true);
    });
    socket.on('error', () => {
      resolve(false);
    });
    socket.on('timeout', () => {
      socket.destroy();
      resolve(false);
    });
  });
}

describe('AppController (e2e)', () => {
  let app: INestApplication;
  let isDbConnected = false;

  beforeAll(async () => {
    const host = process.env.POSTGRES_HOST;
    const port = parseInt(process.env.POSTGRES_PORT || '5432', 10);
    isDbConnected = await checkPostgresPort(host, port);

    if (isDbConnected) {
      // Only import and compile if database is up
      const { AppModule } = await import('./../src/app.module');
      const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: [AppModule],
      }).compile();

      app = moduleFixture.createNestApplication();
      await app.init();
    } else {
      console.warn('Postgres is not running. Skipping AppController E2E test.');
    }
  }, 20000);

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('/ (GET)', async () => {
    if (!isDbConnected) {
      return; // Skip assertion
    }
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Hello World!');
  });
});
