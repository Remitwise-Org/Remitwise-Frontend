import { Express } from 'express';

export interface StorageProvider {
  uploadFile(file: Express.Multer.File): Promise<string>;
}
