import 'reflect-metadata';
import { config as loadDotenv } from 'dotenv';
import { DataSource } from 'typeorm';

// Load the same env file the Nest app uses so the CLI (migration:run etc.)
// sees identical configuration.
loadDotenv({ path: `.env.${process.env.NODE_ENV || 'development'}` });

const databaseUrl = process.env.DATABASE_URL;

export default new DataSource({
  type: 'postgres',
  ...(databaseUrl
    ? { url: databaseUrl }
    : {
        host: process.env.POSTGRES_HOST || 'localhost',
        port: Number(process.env.POSTGRES_PORT || 5432),
        username: process.env.POSTGRES_USER,
        password: process.env.POSTGRES_PASSWORD,
        database: process.env.POSTGRES_DB,
      }),
  entities: ['src/**/*.entity.ts'],
  migrations: ['src/database/migrations/*.ts'],
  ssl: databaseUrl ? { rejectUnauthorized: false } : undefined,
});
