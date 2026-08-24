import { Express } from 'express';

export interface ContentScanner {
  scan(file: Express.Multer.File): Promise<void>;
}
