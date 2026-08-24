import {
  IsString,
  IsNumber,
  IsEnum,
  IsBoolean,
  IsOptional,
  IsNotEmpty,
  MaxLength,
  Min,
} from 'class-validator';
import { DocumentType } from '../interfaces/ipfs.interface';

export class RegisterDocumentDto {
  @IsNumber({}, { message: 'property_id must be a number' })
  @Min(1, { message: 'property_id must be a positive number' })
  property_id: number;

  @IsString({ message: 'ipfs_cid must be a string' })
  @IsNotEmpty({ message: 'ipfs_cid is required' })
  @MaxLength(100, { message: 'ipfs_cid must not exceed 100 characters' })
  ipfs_cid: string;

  @IsEnum(DocumentType, {
    message: 'document_type must be a valid DocumentType value',
  })
  document_type: DocumentType;

  @IsString({ message: 'content_hash must be a hex string' })
  @IsNotEmpty({ message: 'content_hash is required' })
  @MaxLength(64, { message: 'content_hash must not exceed 64 characters' })
  content_hash: string;

  @IsNumber({}, { message: 'file_size must be a number' })
  @Min(1, { message: 'file_size must be a positive number' })
  file_size: number;

  @IsString({ message: 'mime_type must be a string' })
  @IsNotEmpty({ message: 'mime_type is required' })
  @MaxLength(100, { message: 'mime_type must not exceed 100 characters' })
  mime_type: string;

  @IsBoolean({ message: 'is_encrypted must be a boolean' })
  @IsOptional()
  is_encrypted?: boolean;
}

export class PinDocumentDto {
  @IsNumber({}, { message: 'document_id must be a number' })
  @Min(1, { message: 'document_id must be a positive number' })
  document_id: number;
}

export class VerifyHashDto {
  @IsNumber({}, { message: 'document_id must be a number' })
  @Min(1, { message: 'document_id must be a positive number' })
  document_id: number;

  @IsString({ message: 'content_hash must be a hex string' })
  @IsNotEmpty({ message: 'content_hash is required' })
  @MaxLength(64, { message: 'content_hash must not exceed 64 characters' })
  content_hash: string;
}

export class UploadImageDto {
  @IsNumber({}, { message: 'property_id must be a number' })
  @Min(1, { message: 'property_id must be a positive number' })
  property_id: number;

  @IsEnum(DocumentType, {
    message: 'document_type must be a valid DocumentType value',
  })
  @IsOptional()
  document_type?: DocumentType;
}
