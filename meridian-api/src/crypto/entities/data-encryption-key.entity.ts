import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * Envelope-encryption key registry (issue #631).
 *
 * Each row holds a per-user (or per-row) Data Encryption Key (DEK) that has
 * been wrapped ("enveloped") under the master Key Encryption Key (KEK). The
 * raw DEK is never persisted — only the wrapped form. Because the DEK lives
 * in its own table, rotating the KEK only requires re-wrapping these rows
 * (KeyRotationService) instead of re-encrypting every user data row.
 *
 * `kekVersion` records which KEK generation wrapped this DEK so decryption
 * can prefer the right key and rotation can be audited.
 */
@Entity('data_encryption_keys')
export class DataEncryptionKey {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Owner (when a DEK is shared per user). Null for standalone DEKs. */
  @Index()
  @Column('int', { nullable: true })
  userId: number | null;

  /** The DEK wrapped under the KEK — an AES-256-GCM envelope, base64 JSON. */
  @Column('text')
  wrappedKey: string;

  /** KEK generation that produced `wrappedKey` (bumped on rotation). */
  @Column('int', { default: 1 })
  kekVersion: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
